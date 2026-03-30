import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import "../styles/theme.css";
import { registerPatient } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationalId: '',
    
    // Address
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    
    // Medical Information
    bloodType: '',
    allergies: '',
    currentMedications: '',
    preExistingConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    
    // Account Information
    password: '',
    confirmPassword: '',
    
    // Terms
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMedicalData: false
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Personal, 2: Medical, 3: Account, 4: Review

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.email || 
            !formData.phone || !formData.dateOfBirth || !formData.gender || !formData.nationalId) {
          alert('Please fill all required personal information fields');
          return false;
        }
        if (!isValidEmail(formData.email)) {
          alert('Please enter a valid email address');
          return false;
        }
        return true;
      
      case 2:
        if (!formData.bloodType || !formData.emergencyContactName || !formData.emergencyContactPhone) {
          alert('Please fill all required medical information fields');
          return false;
        }
        return true;
      
      case 3:
        if (!formData.password || !formData.confirmPassword) {
          alert('Please enter and confirm your password');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match');
          return false;
        }
        if (formData.password.length < 8) {
          alert('Password must be at least 8 characters long');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  // Validate terms agreement
  if (!formData.agreeToTerms || !formData.agreeToPrivacy || !formData.agreeToMedicalData) {
    alert('Please agree to all terms and conditions');
    setLoading(false);
    return;
  }

  try {
    console.log('🔄 Starting registration process...');
    
    // Prepare registration data
    const registrationData = {
      username: `${formData.firstName}.${formData.lastName}`.toLowerCase().replace(/\s+/g, ''),
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      userType: 'patient',
      
      // Personal information
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      nationalId: formData.nationalId,
      
      // Address
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zipCode: formData.zipCode || '',
      country: formData.country || '',
      
      // Medical information
      bloodType: formData.bloodType || '',
      allergies: formData.allergies || '',
      currentMedications: formData.currentMedications || '',
      preExistingConditions: formData.preExistingConditions || '',
      emergencyContactName: formData.emergencyContactName || '',
      emergencyContactPhone: formData.emergencyContactPhone || ''
    };

    console.log('📤 Registration data prepared:', registrationData);

    // 🔥 استدعاء API حقيقي بدلاً من setTimeout
    const result = await registerPatient(registrationData);
    
    console.log('📥 API Response:', result);

    if (result.success) {
      console.log('✅ Registration successful!');
      
      // عرض رسالة نجاح
      alert('✅ Registration submitted successfully.');
      
      // Redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } else {
      console.error('❌ Registration failed:', result.error);
      alert(`Registration failed: ${result.error || 'Unknown error. Please try again.'}`);
    }
    
  } catch (error) {
    console.error('🚨 Registration error:', error);
    alert(`Registration error: ${error.message}. Please check your connection.`);
  } finally {
    setLoading(false);
  }
};

  const renderStepIndicator = () => (
    <div className="registration-steps">
      <div className={`step ${step >= 1 ? 'active' : ''}`}>
        <span className="step-number">1</span>
        <span className="step-label">Personal Info</span>
      </div>
      <div className="step-divider"></div>
      <div className={`step ${step >= 2 ? 'active' : ''}`}>
        <span className="step-number">2</span>
        <span className="step-label">Medical Info</span>
      </div>
      <div className="step-divider"></div>
      <div className={`step ${step >= 3 ? 'active' : ''}`}>
        <span className="step-number">3</span>
        <span className="step-label">Account Setup</span>
      </div>
      <div className="step-divider"></div>
      <div className={`step ${step >= 4 ? 'active' : ''}`}>
        <span className="step-number">4</span>
        <span className="step-label">Review</span>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <h3>Personal Information</h3>
            <p className="step-description">Please provide your personal details</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <i className="fas fa-user"></i> First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-user"></i> Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-envelope"></i> Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-phone"></i> Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-birthday-cake"></i> Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-venus-mars"></i> Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                 
                </select>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-id-card"></i> National ID/Passport *
                </label>
                <input
                  type="text"
                  name="nationalId"
                  placeholder="Enter your ID number"
                  value={formData.nationalId}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h3>Medical Information</h3>
            <p className="step-description">Help us provide better care with your medical history</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <i className="fas fa-tint"></i> Blood Type *
                </label>
                <select
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-allergies"></i> Allergies
                </label>
                <textarea
                  name="allergies"
                  placeholder="List any allergies (e.g., penicillin, peanuts, etc.)"
                  value={formData.allergies}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-pills"></i> Current Medications
                </label>
                <textarea
                  name="currentMedications"
                  placeholder="List current medications and dosages"
                  value={formData.currentMedications}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-file-medical-alt"></i> Pre-existing Conditions
                </label>
                <textarea
                  name="preExistingConditions"
                  placeholder="List any chronic conditions (e.g., diabetes, hypertension)"
                  value={formData.preExistingConditions}
                  onChange={handleChange}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-user-md"></i> Emergency Contact Name *
                </label>
                <input
                  type="text"
                  name="emergencyContactName"
                  placeholder="Full name of emergency contact"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-phone-alt"></i> Emergency Contact Phone *
                </label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  placeholder="Emergency contact phone number"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h3>Account Setup</h3>
            <p className="step-description">Create your secure account credentials</p>
            
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <i className="fas fa-lock"></i> Password *
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <div className="password-requirements">
                  <p>Password must contain:</p>
                  <ul>
                    <li className={formData.password.length >= 8 ? 'valid' : ''}>
                      <i className={`fas fa-${formData.password.length >= 8 ? 'check' : 'times'}`}></i>
                      At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? 'valid' : ''}>
                      <i className={`fas fa-${/[A-Z]/.test(formData.password) ? 'check' : 'times'}`}></i>
                      One uppercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? 'valid' : ''}>
                      <i className={`fas fa-${/[0-9]/.test(formData.password) ? 'check' : 'times'}`}></i>
                      One number
                    </li>
                  </ul>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <i className="fas fa-lock"></i> Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {formData.password && formData.confirmPassword && (
                  <p className={`password-match ${formData.password === formData.confirmPassword ? 'valid' : 'invalid'}`}>
                    <i className={`fas fa-${formData.password === formData.confirmPassword ? 'check' : 'times'}`}></i>
                    {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>
            </div>

            <div className="terms-section">
              <h4>Terms & Conditions</h4>
              
              <div className="term-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  <span>I agree to the <a href="#" className="term-link">Terms of Service</a> *</span>
                </label>
              </div>

              <div className="term-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeToPrivacy"
                    checked={formData.agreeToPrivacy}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  <span>I agree to the <a href="#" className="term-link">Privacy Policy</a> *</span>
                </label>
              </div>

              <div className="term-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeToMedicalData"
                    checked={formData.agreeToMedicalData}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  <span>I consent to share my medical data for treatment purposes *</span>
                </label>
              </div>

              <div className="term-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleChange}
                  />
                  <span className="checkmark"></span>
                  <span>Subscribe to health tips and updates (optional)</span>
                </label>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content review-step">
            <h3>Review Your Information</h3>
            <p className="step-description">Please review all information before submitting</p>
            
            <div className="review-sections">
              <div className="review-section">
                <h4>
                  <i className="fas fa-user"></i> Personal Information
                  <button 
                    type="button" 
                    className="edit-btn"
                    onClick={() => setStep(1)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </h4>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Full Name:</span>
                    <span className="review-value">{formData.firstName} {formData.lastName}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Email:</span>
                    <span className="review-value">{formData.email}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Phone:</span>
                    <span className="review-value">{formData.phone}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Date of Birth:</span>
                    <span className="review-value">{formData.dateOfBirth}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Gender:</span>
                    <span className="review-value">{formData.gender}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">National ID:</span>
                    <span className="review-value">{formData.nationalId}</span>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <h4>
                  <i className="fas fa-heartbeat"></i> Medical Information
                  <button 
                    type="button" 
                    className="edit-btn"
                    onClick={() => setStep(2)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </h4>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Blood Type:</span>
                    <span className="review-value">{formData.bloodType}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Allergies:</span>
                    <span className="review-value">{formData.allergies || 'None listed'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Current Medications:</span>
                    <span className="review-value">{formData.currentMedications || 'None listed'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Pre-existing Conditions:</span>
                    <span className="review-value">{formData.preExistingConditions || 'None listed'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Emergency Contact:</span>
                    <span className="review-value">{formData.emergencyContactName} ({formData.emergencyContactPhone})</span>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <h4>
                  <i className="fas fa-shield-alt"></i> Account Information
                  <button 
                    type="button" 
                    className="edit-btn"
                    onClick={() => setStep(3)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </h4>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Account Type:</span>
                    <span className="review-value">Patient Account</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Registration Status:</span>
                    <span className="review-value status-pending">Pending Admin Approval</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Terms Accepted:</span>
                    <span className="review-value">{formData.agreeToTerms ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Privacy Policy:</span>
                    <span className="review-value">{formData.agreeToPrivacy ? 'Accepted' : 'Not Accepted'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Medical Data Consent:</span>
                    <span className="review-value">{formData.agreeToMedicalData ? 'Granted' : 'Not Granted'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="final-note">
              <div className="note-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <div className="note-content">
                <h5>Important Information</h5>
                <p>
                  Your registration will be reviewed by our admin team. 
                  You will receive an email notification once your account is approved. 
                  Approval typically takes 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h2>
            <i className="fas fa-user-plus"></i> Patient Registration
          </h2>
          <p>Join Smart Healthcare System - Complete the form below to create your account</p>
          <p className="registration-note">
            <i className="fas fa-info-circle"></i> 
            <strong>Note:</strong> Doctor registration is managed by administrators only. 
            If you are a doctor, please contact the hospital administration.
          </p>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit} className="register-form">
          {renderStepContent()}

          <div className="form-navigation">
            {step > 1 && (
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={loading}
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
            )}
            
            <div className="step-indicator">
              <span className="current-step">Step {step} of 4</span>
            </div>

            {step < 4 ? (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleNext}
                disabled={loading}
              >
                Continue <i className="fas fa-arrow-right"></i>
              </button>
            ) : (
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Submitting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i> Submit Registration
                  </>
                )}
              </button>
            )}
          </div>

          <div className="form-footer">
            <p>
              Already have an account? 
              <Link to="/login" className="login-link">
                <i className="fas fa-sign-in-alt"></i> Login here
              </Link>
            </p>
            <p>
              Need help? 
              <a href="mailto:support@smarthealthcare.com" className="help-link">
                <i className="fas fa-envelope"></i> Contact Support
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;