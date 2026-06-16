import React, { useState } from 'react';

export default function WorkerIntake({ navigateTo }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    injuryType: '',
    employer: '',
    siteLocation: '',
    operator: '',
    severity: '',
    legalStatus: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    county: '',
    state: 'TX',
    details: ''
  });

  const handleOptionSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 1 && !formData.injuryType) return alert('Please select your injury type.');
    if (step === 2 && (!formData.employer || !formData.siteLocation)) return alert('Please provide employer and location details.');
    if (step === 3 && !formData.operator) return alert('Please identify the site operator/company.');
    if (step === 4 && !formData.severity) return alert('Please select the severity of your injuries.');
    if (step === 5 && !formData.legalStatus) return alert('Please verify your legal representation status.');
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.county || !formData.state) {
      return alert('Please complete all contact fields.');
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'worker', incidentType: formData.injuryType })
      });
      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || 'Submission error. Please try again.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit confirmation view
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '2rem' }}>
        <div style={{ maxWidth: '520px', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '16px', padding: '3rem', border: '1px solid #334155' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ color: '#f8fafc', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Your Report Has Been Received</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Your confidential worker safety report has been securely logged. Our exclusive trial partners will review your case within 24 hours.
          </p>
          <button onClick={() => navigateTo('#/')} style={{ marginTop: '1.5rem', padding: '12px 32px', backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = (step / 6) * 100;

  return (
    <div className="worker-intake-container">
      {/* Hero Header */}
      <div className="worker-intake-hero">
        <div className="worker-intake-hero-content">
          <div className="worker-badge">💪 OILFIELD WORKER & FIRST RESPONDER SAFETY PORTAL</div>
          <h1 className="worker-hero-title">You Survived the Incident.<br />Now Secure the Compensation You Deserve.</h1>
          <p className="worker-hero-subtitle">
            If you were injured in a pipeline explosion, toxic gas leak, or chemical exposure while working in the Texas oilfield,<br />
            you may be entitled to <strong>third-party compensation beyond workers' compensation</strong>.
          </p>
          <div className="worker-rights-bar">
            <span>⚖ You are NOT limited to Workers' Comp</span>
            <span>🛡 Third-Party Negligence Claims Available</span>
            <span>🔒 100% Confidential</span>
          </div>
        </div>
      </div>

      {/* Intake Form */}
      <div className="worker-form-section" id="worker-intake-form">
        <div className="worker-form-card">
          <div className="worker-form-header">
            <h2><i className="ti ti-clipboard-list"></i> Free Worker Safety & Legal Assessment</h2>
            <span className="worker-step-indicator">Step {step} of 6</span>
          </div>

          <div className="worker-progress-bar"><div className="worker-progress-fill" style={{ width: `${progressPercent}%` }}></div></div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Injury Type */}
            {step === 1 && (
              <div className="worker-step-content">
                <h3 className="worker-step-title"><span className="worker-step-num">1</span> What type of injury did you suffer?</h3>
                <div className="worker-option-grid">
                  <div className={`worker-option-card ${formData.injuryType === 'blast' ? 'selected' : ''}`} onClick={() => handleOptionSelect('injuryType', 'blast')}>
                    <div className="worker-option-icon" style={{ color: '#ef4444' }}>🔥</div>
                    <h4>Blast / Burn Injury</h4>
                    <p>Pipeline explosion, thermal burns, flash fire, shrapnel wounds</p>
                  </div>
                  <div className={`worker-option-card ${formData.injuryType === 'h2s' ? 'selected' : ''}`} onClick={() => handleOptionSelect('injuryType', 'h2s')}>
                    <div className="worker-option-icon" style={{ color: '#f97316' }}>💨</div>
                    <h4>Toxic Gas Exposure (H₂S)</h4>
                    <p>Sour gas inhalation, chemical asphyxiation, neurological symptoms</p>
                  </div>
                  <div className={`worker-option-card ${formData.injuryType === 'chemical' ? 'selected' : ''}`} onClick={() => handleOptionSelect('injuryType', 'chemical')}>
                    <div className="worker-option-icon" style={{ color: '#a855f7' }}>🧪</div>
                    <h4>Chemical Burn / Exposure</h4>
                    <p>Acid, fracturing fluid, methanol, or other toxic chemical contact</p>
                  </div>
                  <div className={`worker-option-card ${formData.injuryType === 'crush' ? 'selected' : ''}`} onClick={() => handleOptionSelect('injuryType', 'crush')}>
                    <div className="worker-option-icon" style={{ color: '#3b82f6' }}>⚙️</div>
                    <h4>Crush / Impact Injury</h4>
                    <p>Equipment failure, structural collapse, struck-by incidents</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Employer & Site */}
            {step === 2 && (
              <div className="worker-step-content">
                <h3 className="worker-step-title"><span className="worker-step-num">2</span> Employer & Incident Location</h3>
                <div className="worker-form-group">
                  <label>Employer / Contractor Name</label>
                  <input type="text" name="employer" placeholder="e.g., Roustabout Services LLC" value={formData.employer} onChange={handleInputChange} className="worker-input" />
                </div>
                <div className="worker-form-group">
                  <label>Site / Lease Location</label>
                  <input type="text" name="siteLocation" placeholder="e.g., Section 13, Block 43, T&P RR Co Survey" value={formData.siteLocation} onChange={handleInputChange} className="worker-input" />
                </div>
                <div className="worker-form-group">
                  <label>County Where Incident Occurred</label>
                  <input type="text" name="county" placeholder="e.g., Midland, Ector, Webb" value={formData.county} onChange={handleInputChange} className="worker-input" />
                </div>
              </div>
            )}

            {/* Step 3: Operator */}
            {step === 3 && (
              <div className="worker-step-content">
                <h3 className="worker-step-title"><span className="worker-step-num">3</span> Site Operator / Third Party</h3>
                <p className="worker-step-desc">Who operates the pipeline or wellsite where you were injured?</p>
                <div className="worker-form-group">
                  <select name="operator" className="worker-input" value={formData.operator} onChange={handleInputChange}>
                    <option value="">-- Select Operator --</option>
                    <option value="Energy Transfer">Energy Transfer</option>
                    <option value="Enterprise Products">Enterprise Products</option>
                    <option value="Kinder Morgan">Kinder Morgan</option>
                    <option value="Plains All American">Plains All American</option>
                    <option value="DCP Midstream">DCP Midstream</option>
                    <option value="Chevron">Chevron</option>
                    <option value="ExxonMobil">ExxonMobil</option>
                    <option value="Other">Other (type below)</option>
                    <option value="Unknown">I don't know</option>
                  </select>
                  {(formData.operator === 'Other' || !formData.operator) && (
                    <input type="text" name="operator" placeholder="Or enter operator name..." value={formData.operator === 'Other' ? '' : formData.operator} onChange={handleInputChange} className="worker-input" style={{ marginTop: '12px' }} />
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Severity */}
            {step === 4 && (
              <div className="worker-step-content">
                <h3 className="worker-step-title"><span className="worker-step-num">4</span> Severity of Injuries</h3>
                <div className="worker-option-grid">
                  <div className={`worker-option-card ${formData.severity === 'fatality' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'fatality')}>
                    <div className="worker-option-icon" style={{ color: '#ef4444' }}>💔</div>
                    <h4>Wrongful Death</h4>
                    <p>Loss of a family member due to the incident</p>
                  </div>
                  <div className={`worker-option-card ${formData.severity === 'icu' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'icu')}>
                    <div className="worker-option-icon" style={{ color: '#ef4444' }}>🏥</div>
                    <h4>ICU / Catastrophic</h4>
                    <p>Third-degree burns, major trauma, life-threatening injuries</p>
                  </div>
                  <div className={`worker-option-card ${formData.severity === 'hospital' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'hospital')}>
                    <div className="worker-option-icon" style={{ color: '#f97316' }}>🩺</div>
                    <h4>Hospitalization</h4>
                    <p>Admitted for treatment of burns, inhalation, or chemical exposure</p>
                  </div>
                  <div className={`worker-option-card ${formData.severity === 'outpatient' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'outpatient')}>
                    <div className="worker-option-icon" style={{ color: '#3b82f6' }}>💊</div>
                    <h4>Outpatient / Minor</h4>
                    <p>Emergency room visit, follow-up care, observation</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Legal Status */}
            {step === 5 && (
              <div className="worker-step-content">
                <h3 className="worker-step-title"><span className="worker-step-num">5</span> Legal & Representation Status</h3>
                <div className="worker-option-grid">
                  <div className={`worker-option-card ${formData.legalStatus === 'no' ? 'selected' : ''}`} onClick={() => handleOptionSelect('legalStatus', 'no')}>
                    <div className="worker-option-icon" style={{ color: '#22c55e' }}>✅</div>
                    <h4>No Lawyer Yet</h4>
                    <p>I have not signed any agreements or releases</p>
                  </div>
                  <div className={`worker-option-card ${formData.legalStatus === 'workers-comp' ? 'selected' : ''}`} onClick={() => handleOptionSelect('legalStatus', 'workers-comp')}>
                    <div className="worker-option-icon" style={{ color: '#f59e0b' }}>⚠️</div>
                    <h4>Only Workers' Comp Filed</h4>
                    <p>I filed workers' comp but want to explore third-party claims</p>
                  </div>
                  <div className={`worker-option-card ${formData.legalStatus === 'signed' ? 'selected' : ''}`} onClick={() => handleOptionSelect('legalStatus', 'signed')}>
                    <div className="worker-option-icon" style={{ color: '#ef4444' }}>⛔</div>
                    <h4>Settlement Signed</h4>
                    <p>I have already signed a release or settlement with the operator</p>
                  </div>
                </div>
                <div className="worker-info-box" style={{ marginTop: '1rem' }}>
                  <strong>Did you know?</strong> Under Texas law, workers' compensation does NOT prevent you from suing negligent third-party companies who caused your injuries on the worksite.
                </div>
              </div>
            )}

            {/* Step 6: Contact Info */}
            {step === 6 && (
              <div className="worker-step-content">
                <h3 className="worker-step-title"><span className="worker-step-num">6</span> Your Contact Information</h3>
                <div className="worker-form-row">
                  <div className="worker-form-group"><label>First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="worker-input" /></div>
                  <div className="worker-form-group"><label>Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="worker-input" /></div>
                </div>
                <div className="worker-form-row">
                  <div className="worker-form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="worker-input" /></div>
                  <div className="worker-form-group"><label>Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="worker-input" /></div>
                </div>
                <div className="worker-form-group"><label>Additional Details</label><textarea name="details" rows="3" value={formData.details} onChange={handleInputChange} className="worker-input" placeholder="Describe your injuries, medical treatment received, and any communications with the operator..." /></div>
                <p className="worker-consent">By submitting, you consent to be contacted regarding your case. Your information is confidential.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="worker-form-nav">
              {step > 1 && <button type="button" className="worker-btn worker-btn-back" onClick={prevStep}><i className="ti ti-arrow-left"></i> Back</button>}
              {step < 6 ? (
                <button type="button" className="worker-btn worker-btn-next" onClick={nextStep}>Continue <i className="ti ti-arrow-right"></i></button>
              ) : (
                <button type="submit" className="worker-btn worker-btn-submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Secure Report <i className="ti ti-lock"></i>'}</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
