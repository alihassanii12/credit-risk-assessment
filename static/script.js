(() => {
  // Elements
  const form = document.getElementById("riskForm");
  const formSlider = document.getElementById("formSlider");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const errorNote = document.getElementById("errorNote");
  const resultsContainer = document.getElementById("resultsContainer");
  const newAssessmentBtn = document.getElementById("newAssessmentBtn");

  const incomeInput = document.getElementById("person_income");
  const amountInput = document.getElementById("loan_amnt");
  const percentInput = document.getElementById("loan_percent_income");

  const apiDot = document.getElementById("apiDot");
  const apiStatusText = document.getElementById("apiStatusText");

  // State
  let currentStep = 1;
  const totalSteps = 3;

  // Initialize
  init();

  function init() {
    updateStepDisplay();
    setupEventListeners();
    checkServiceStatus();
    recalculatePercent();
  }

  function setupEventListeners() {
    // Handle multiple prev/next buttons (one in each card)
    const prevBtns = document.querySelectorAll('#prevBtn');
    const nextBtns = document.querySelectorAll('#nextBtn');
    
    prevBtns.forEach(btn => btn.addEventListener('click', goToPrevStep));
    nextBtns.forEach(btn => btn.addEventListener('click', goToNextStep));
    
    newAssessmentBtn.addEventListener('click', resetAssessment);
    
    // Auto-calculate loan to income ratio
    incomeInput.addEventListener('input', recalculatePercent);
    amountInput.addEventListener('input', recalculatePercent);

    // Form validation on input change
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('input', clearFieldError);
      input.addEventListener('change', clearFieldError);
    });
  }

  function checkServiceStatus() {
    apiDot.style.background = '#f59e0b';
    apiStatusText.textContent = 'checking service...';
    
    fetch("/openapi.json", { method: "GET" })
      .then((res) => {
        if (res.ok) {
          apiDot.style.background = 'var(--success)';
          apiStatusText.textContent = 'service ready';
        } else {
          throw new Error('service unavailable');
        }
      })
      .catch(() => {
        apiDot.style.background = 'var(--danger)';
        apiStatusText.textContent = 'service unavailable';
      });
  }

  function recalculatePercent() {
    const income = parseFloat(incomeInput.value) || 0;
    const amount = parseFloat(amountInput.value) || 0;
    if (income > 0 && amount >= 0) {
      percentInput.value = (amount / income).toFixed(2);
    }
  }

  function updateStepDisplay() {
    // Update progress indicators
    const steps = document.querySelectorAll('.step');
    const stepLines = document.querySelectorAll('.step-line');
    
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNumber < currentStep) {
        step.classList.add('completed');
      } else if (stepNumber === currentStep) {
        step.classList.add('active');
      }
    });

    stepLines.forEach((line, index) => {
      line.classList.toggle('completed', index + 1 < currentStep);
    });

    // Update slider position
    const translateX = -((currentStep - 1) * 33.333);
    formSlider.style.transform = `translateX(${translateX}%)`;

    // Update navigation buttons visibility in each step
    const allPrevBtns = document.querySelectorAll('#prevBtn');
    const allNextBtns = document.querySelectorAll('#nextBtn');
    
    allPrevBtns.forEach((btn, index) => {
      const stepNum = index + 1;
      if (stepNum === 1) {
        btn.style.visibility = 'hidden';
      } else {
        btn.style.visibility = 'visible';
      }
    });
    
    allNextBtns.forEach((btn, index) => {
      const stepNum = index + 1;
      if (stepNum === totalSteps) {
        btn.innerHTML = `Assess Risk <i data-feather="check" class="btn-icon"></i>`;
      } else {
        btn.innerHTML = `Next <i data-feather="chevron-right" class="btn-icon"></i>`;
      }
    });
    
    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }

  function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
      if (!input.value.trim()) {
        showFieldError(input, 'This field is required');
        isValid = false;
      } else if (input.type === 'number') {
        const value = parseFloat(input.value);
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        
        if (min && value < min) {
          showFieldError(input, `Minimum value is ${min}`);
          isValid = false;
        } else if (max && value > max) {
          showFieldError(input, `Maximum value is ${max}`);
          isValid = false;
        }
      }
    });

    return isValid;
  }

  function showFieldError(input, message) {
    input.style.borderColor = 'var(--danger)';
    input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
    
    // Remove existing error message
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.color = 'var(--danger)';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
  }

  function clearFieldError(event) {
    const input = event.target;
    input.style.borderColor = '';
    input.style.boxShadow = '';
    
    const errorDiv = input.parentNode.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  function showError(message) {
    errorNote.textContent = message;
    errorNote.classList.add('show');
    setTimeout(() => {
      errorNote.classList.remove('show');
    }, 5000);
  }

  function goToPrevStep() {
    if (currentStep > 1) {
      currentStep--;
      updateStepDisplay();
    }
  }

  function goToNextStep() {
    if (currentStep < totalSteps) {
      if (validateCurrentStep()) {
        currentStep++;
        updateStepDisplay();
      }
    } else {
      // Final step - submit form
      submitAssessment();
    }
  }

  function resetAssessment() {
    currentStep = 1;
    form.reset();
    resultsContainer.classList.remove('show');
    
    // Show form elements again
    document.querySelector('.form-container').style.display = 'block';
    document.querySelector('.step-progress').style.display = 'flex';
    document.querySelector('.step-navigation').style.display = 'flex';
    
    updateStepDisplay();
    recalculatePercent();
    
    // Reset form values to defaults
    document.getElementById('person_age').value = '30';
    document.getElementById('person_income').value = '600000';
    document.getElementById('person_emp_length').value = '5';
    document.getElementById('loan_amnt').value = '100000';
    document.getElementById('loan_int_rate').value = '11.5';
    document.getElementById('cb_person_cred_hist_length').value = '6';
    recalculatePercent();
  }

  async function submitAssessment() {
    if (!validateCurrentStep()) {
      return;
    }

    // Show loading state on current step's next button
    const currentNextBtn = document.querySelector(`.form-step[data-step="${currentStep}"] #nextBtn`);
    currentNextBtn.classList.add('loading');
    currentNextBtn.disabled = true;

    const payload = {
      person_age: parseInt(document.getElementById("person_age").value, 10),
      person_income: parseFloat(incomeInput.value),
      person_home_ownership: document.getElementById("person_home_ownership").value,
      person_emp_length: parseFloat(document.getElementById("person_emp_length").value),
      loan_intent: document.getElementById("loan_intent").value,
      loan_grade: document.getElementById("loan_grade").value,
      loan_amnt: parseFloat(amountInput.value),
      loan_int_rate: parseFloat(document.getElementById("loan_int_rate").value),
      loan_percent_income: parseFloat(percentInput.value),
      cb_person_default_on_file: document.getElementById("cb_person_default_on_file").value,
      cb_person_cred_hist_length: parseInt(document.getElementById("cb_person_cred_hist_length").value, 10),
    };

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const detail = body && body.detail ? JSON.stringify(body.detail) : `HTTP ${res.status}`;
        throw new Error(detail);
      }

      const data = await res.json();
      showResults(data);
      
    } catch (err) {
      showError(`Assessment failed: ${err.message || "Please check if the service is running."}`);
    } finally {
      const currentNextBtn = document.querySelector(`.form-step[data-step="${currentStep}"] #nextBtn`);
      currentNextBtn.classList.remove('loading');
      currentNextBtn.disabled = false;
    }
  }

  function showResults(data) {
    const probabilityPct = (data.default_probability * 100).toFixed(1);
    const thresholdPct = (data.threshold * 100).toFixed(1);
    const isHighRisk = data.default_prediction === 1;

    // Hide form and show results
    document.querySelector('.form-container').style.display = 'none';
    document.querySelector('.step-progress').style.display = 'none';
    document.querySelector('.step-navigation').style.display = 'none';
    resultsContainer.classList.add('show');

    // Update result card with icons
    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIconFeather');
    const resultTitle = document.getElementById('resultTitle');
    const resultPercentage = document.getElementById('resultPercentage');
    const resultSubtitle = document.getElementById('resultSubtitle');

    if (isHighRisk) {
      resultCard.className = 'result-card high-risk';
      resultIcon.setAttribute('data-feather', 'alert-triangle');
      resultIcon.classList.add('danger');
      resultTitle.textContent = 'HIGH RISK';
      resultSubtitle.textContent = 'Not Recommended for Approval';
    } else {
      resultCard.className = 'result-card low-risk';
      resultIcon.setAttribute('data-feather', 'shield-check');
      resultIcon.classList.add('success');
      resultTitle.textContent = 'LOW RISK';
      resultSubtitle.textContent = 'Suitable for Approval';
    }

    resultPercentage.textContent = `${probabilityPct}%`;

    // Update details
    document.getElementById('factProb').textContent = `${probabilityPct}%`;
    document.getElementById('factThreshold').textContent = `${thresholdPct}%`;
    document.getElementById('factResult').textContent = data.Result;
    document.getElementById('factRecommendation').textContent = isHighRisk ? 'REJECT' : 'APPROVE';

    // Update recommendation icon
    const recommendationBox = document.querySelector('#factRecommendation').closest('.detail-box');
    const recommendationIcon = recommendationBox.querySelector('.detail-icon');
    if (isHighRisk) {
      recommendationIcon.setAttribute('data-feather', 'x-circle');
      recommendationIcon.style.color = 'var(--danger)';
    } else {
      recommendationIcon.setAttribute('data-feather', 'check-circle');
      recommendationIcon.style.color = 'var(--success)';
    }

    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
