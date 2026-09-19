(() => {
  // Elements
  const form = document.getElementById("riskForm");
  const formSlider = document.getElementById("formSlider");
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
    // Handle prev/next buttons using event delegation
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('prev-btn')) {
        goToPrevStep();
      } else if (e.target.classList.contains('next-btn')) {
        goToNextStep();
      }
    });
    
    if (newAssessmentBtn) {
      newAssessmentBtn.addEventListener('click', resetAssessment);
    }
    
    // Auto-calculate loan to income ratio
    if (incomeInput) incomeInput.addEventListener('input', recalculatePercent);
    if (amountInput) amountInput.addEventListener('input', recalculatePercent);

    // Form validation on input change
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('input', clearFieldError);
      input.addEventListener('change', clearFieldError);
    });
  }

  function checkServiceStatus() {
    if (apiDot) apiDot.style.background = '#f59e0b';
    if (apiStatusText) apiStatusText.textContent = 'checking service...';
    
    fetch("/openapi.json", { method: "GET" })
      .then((res) => {
        if (res.ok) {
          if (apiDot) apiDot.style.background = 'var(--success)';
          if (apiStatusText) apiStatusText.textContent = 'service ready';
        } else {
          throw new Error('service unavailable');
        }
      })
      .catch(() => {
        if (apiDot) apiDot.style.background = 'var(--danger)';
        if (apiStatusText) apiStatusText.textContent = 'service unavailable';
      });
  }

  function recalculatePercent() {
    const income = parseFloat(incomeInput?.value) || 0;
    const amount = parseFloat(amountInput?.value) || 0;
    if (income > 0 && amount >= 0 && percentInput) {
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
    if (formSlider) {
      const translateX = -((currentStep - 1) * 33.333);
      formSlider.style.transform = `translateX(${translateX}%)`;
    }

    // Update navigation buttons visibility in each step
    const allPrevBtns = document.querySelectorAll('.prev-btn');
    const allNextBtns = document.querySelectorAll('.next-btn');
    
    allPrevBtns.forEach((btn) => {
      if (currentStep === 1) {
        btn.style.visibility = 'hidden';
      } else {
        btn.style.visibility = 'visible';
      }
    });
    
    allNextBtns.forEach((btn) => {
      if (currentStep === totalSteps) {
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
    if (!currentStepElement) return true;
    
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
    if (errorNote) {
      errorNote.textContent = message;
      errorNote.classList.add('show');
      setTimeout(() => {
        errorNote.classList.remove('show');
      }, 5000);
    }
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
    if (form) form.reset();
    if (resultsContainer) resultsContainer.classList.remove('show');
    
    // Show form elements again
    const formContainer = document.querySelector('.form-container');
    const stepProgress = document.querySelector('.step-progress');
    const stepNavigation = document.querySelector('.step-navigation');
    
    if (formContainer) formContainer.style.display = 'block';
    if (stepProgress) stepProgress.style.display = 'flex';
    if (stepNavigation) stepNavigation.style.display = 'flex';
    
    updateStepDisplay();
    recalculatePercent();
    
    // Reset form values to defaults
    const ageInput = document.getElementById('person_age');
    const incomeInputReset = document.getElementById('person_income');
    const empLengthInput = document.getElementById('person_emp_length');
    const loanAmtInput = document.getElementById('loan_amnt');
    const intRateInput = document.getElementById('loan_int_rate');
    const credHistInput = document.getElementById('cb_person_cred_hist_length');
    
    if (ageInput) ageInput.value = '30';
    if (incomeInputReset) incomeInputReset.value = '600000';
    if (empLengthInput) empLengthInput.value = '5';
    if (loanAmtInput) loanAmtInput.value = '100000';
    if (intRateInput) intRateInput.value = '11.5';
    if (credHistInput) credHistInput.value = '6';
    
    recalculatePercent();
  }

  async function submitAssessment() {
    if (!validateCurrentStep()) {
      return;
    }

    // Show loading state on current step's next button
    const currentNextBtn = document.querySelector(`.form-step[data-step="${currentStep}"] .next-btn`);
    if (currentNextBtn) {
      currentNextBtn.classList.add('loading');
      currentNextBtn.disabled = true;
    }

    const payload = {
      person_age: parseInt(document.getElementById("person_age")?.value || 30, 10),
      person_income: parseFloat(incomeInput?.value || 600000),
      person_home_ownership: document.getElementById("person_home_ownership")?.value || "RENT",
      person_emp_length: parseFloat(document.getElementById("person_emp_length")?.value || 5),
      loan_intent: document.getElementById("loan_intent")?.value || "PERSONAL",
      loan_grade: document.getElementById("loan_grade")?.value || "B",
      loan_amnt: parseFloat(amountInput?.value || 100000),
      loan_int_rate: parseFloat(document.getElementById("loan_int_rate")?.value || 11.5),
      loan_percent_income: parseFloat(percentInput?.value || 0.17),
      cb_person_default_on_file: document.getElementById("cb_person_default_on_file")?.value || "N",
      cb_person_cred_hist_length: parseInt(document.getElementById("cb_person_cred_hist_length")?.value || 6, 10),
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
      if (currentNextBtn) {
        currentNextBtn.classList.remove('loading');
        currentNextBtn.disabled = false;
      }
    }
  }

  function showResults(data) {
    const probabilityPct = (data.default_probability * 100).toFixed(1);
    const thresholdPct = (data.threshold * 100).toFixed(1);
    const isHighRisk = data.default_prediction === 1;

    // Hide form and show results
    const formContainer = document.querySelector('.form-container');
    const stepProgress = document.querySelector('.step-progress');
    const stepNavigation = document.querySelector('.step-navigation');
    
    if (formContainer) formContainer.style.display = 'none';
    if (stepProgress) stepProgress.style.display = 'none';
    if (stepNavigation) stepNavigation.style.display = 'none';
    if (resultsContainer) resultsContainer.classList.add('show');

    // Update result card with icons
    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIconFeather');
    const resultTitle = document.getElementById('resultTitle');
    const resultPercentage = document.getElementById('resultPercentage');
    const resultSubtitle = document.getElementById('resultSubtitle');

    if (resultCard && resultIcon && resultTitle && resultPercentage && resultSubtitle) {
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
    }

    // Update details
    const factProb = document.getElementById('factProb');
    const factThreshold = document.getElementById('factThreshold');
    const factResult = document.getElementById('factResult');
    const factRecommendation = document.getElementById('factRecommendation');
    
    if (factProb) factProb.textContent = `${probabilityPct}%`;
    if (factThreshold) factThreshold.textContent = `${thresholdPct}%`;
    if (factResult) factResult.textContent = data.Result;
    if (factRecommendation) factRecommendation.textContent = isHighRisk ? 'REJECT' : 'APPROVE';

    // Update recommendation icon
    if (factRecommendation) {
      const recommendationBox = factRecommendation.closest('.detail-box');
      if (recommendationBox) {
        const recommendationIcon = recommendationBox.querySelector('.detail-icon');
        if (recommendationIcon) {
          if (isHighRisk) {
            recommendationIcon.setAttribute('data-feather', 'x-circle');
            recommendationIcon.style.color = 'var(--danger)';
          } else {
            recommendationIcon.setAttribute('data-feather', 'check-circle');
            recommendationIcon.style.color = 'var(--success)';
          }
        }
      }
    }

    // Re-initialize feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    // Scroll to results
    if (resultsContainer) {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
})();
