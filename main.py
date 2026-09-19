from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import warnings
warnings.filterwarnings('ignore')

ml_model = {} #{"model":"credit_risk_model.pkl"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ml_model['model'] = joblib.load('credit_risk_model.pkl')
        ml_model['threshold'] = joblib.load('best_threshold.pkl')
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Model loading error: {e}")
        print("📝 Using fallback prediction logic...")
        ml_model['model'] = None
        ml_model['threshold'] = 0.5
    yield
    ml_model.clear()

app = FastAPI(lifespan=lifespan)

#The only columns that user will see and provide inputs.
class LoanApplication(BaseModel): #Pydantic Model (Validation)
    person_age: int
    person_income: float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade: str
    loan_amnt: float
    loan_int_rate: float
    loan_percent_income: float
    cb_person_default_on_file: str
    cb_person_cred_hist_length: int

def fallback_prediction(data: dict) -> dict:
    """Simple rule-based fallback prediction when model fails"""
    risk_score = 0.0
    
    # Risk factors with weights
    if data['loan_percent_income'] > 0.4:
        risk_score += 0.3
    if data['cb_person_default_on_file'] == 'Y':
        risk_score += 0.25
    if data['loan_grade'] in ['E', 'F', 'G']:
        risk_score += 0.2
    if data['person_emp_length'] < 2:
        risk_score += 0.15
    if data['loan_int_rate'] > 15:
        risk_score += 0.1
        
    risk_score = min(risk_score, 1.0)
    prediction = int(risk_score > 0.5)
    
    return {
        "default_probability": risk_score,
        "default_prediction": prediction,
        "threshold": 0.5,
        "Result": "High Risk" if prediction == 1 else "Low Risk"
    }

@app.post('/predict')
def predict(data : LoanApplication):
    input_data = data.dict()
    
    if ml_model['model'] is None:
        # Use fallback prediction
        return fallback_prediction(input_data)
    
    try:
        input_df = pd.DataFrame([input_data])
        probability = ml_model['model'].predict_proba(input_df)[:, 1][0]
        prediction = int(probability >= ml_model["threshold"])
        
        return {
            "default_probability": probability,
            "default_prediction": prediction,
            "threshold": ml_model["threshold"],
            "Result": "High Risk" if prediction == 1 else "Low Risk"
        }
    except Exception as e:
        print(f"Model prediction failed: {e}")
        return fallback_prediction(input_data)

app.mount("/", StaticFiles(directory="static", html=True), name="static")
