import React, { useState, useEffect } from 'react';
import './App.css';
import PartnerPortal from './PartnerPortal.jsx';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'explosions' | 'gas-leaks' | 'spills' | 'partner-portal'
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    incidentType: '',
    role: '',
    severity: '',
    defendant: '',
    legalStatus: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    county: '',
    state: '',
    details: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [activePin, setActivePin] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // Hash-based client-side routing for seamless SEO routes & bookmarking (Task ID: d2975342-5bdb-4453-add3-2ac1bfeaf4b7)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/partner-portal') {
        setView('partner-portal');
        window.scrollTo(0, 0);
      } else if (hash === '#/incidents/pipeline-explosions') {
        setView('explosions');
        window.scrollTo(0, 0);
      } else if (hash === '#/incidents/gas-leaks-h2s') {
        setView('gas-leaks');
        window.scrollTo(0, 0);
      } else if (hash === '#/incidents/oil-saltwater-spills') {
        setView('spills');
        window.scrollTo(0, 0);
      } else {
        setView('home');
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Execute on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch Live Pipeline Safety Watch & Incident Log from backend (reads from shared incidents.db)
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setLoadingIncidents(true);
        const res = await fetch('/api/incidents');
        const data = await res.json();
        if (data.success) {
          setIncidents(data.incidents || []);
        }
      } catch (err) {
        console.error('Error fetching incidents:', err);
      } finally {
        setLoadingIncidents(false);
      }
    };

    fetchIncidents();
    // Poll every 30 seconds for live scraper-fed updates
    const poll = setInterval(fetchIncidents, 30000);
    return () => clearInterval(poll);
  }, []);

  // Interactive map coordinates
  const mapPins = [
    { id: 1, label: 'Permian Basin Core (Midland/Odessa)', x: '45%', y: '65%' },
    { id: 2, label: 'Gulf Coast Petro-Corridor (Houston/Lake Charles)', x: '80%', y: '78%' },
    { id: 3, label: 'Eagle Ford Shale (South TX)', x: '88%', y: '35%' }
  ];

  // Rotate map pins automatically for dynamic UX feel
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePin((prev) => {
        if (prev === null) return 1;
        if (prev === 3) return null;
        return prev + 1;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleOptionSelect = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (step === 1 && !formData.incidentType) return alert('Please select an incident type to continue.');
    if (step === 2 && !formData.role) return alert('Please select your relationship to the incident.');
    if (step === 3 && !formData.severity) return alert('Please select the severity of the incident.');
    if (step === 5 && !formData.legalStatus) return alert('Please verify your current legal status.');
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setStep(prev => prev - 1);
  };

  const navigateTo = (path) => {
    window.location.hash = path;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.county || !formData.state) {
      return alert('Please complete all contact and location fields to register your assessment.');
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setSubmissionResult(data);
        setSubmitted(true);
      } else {
        alert(data.message || 'There was an error submitting your form. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('Network error. Unable to connect to the Basin safety gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  const getIncidentIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('explosion') || t.includes('fire')) return 'ti ti-flame';
    if (t.includes('gas') || t.includes('h2s') || t.includes('leak')) return 'ti ti-biohazard';
    if (t.includes('spill') || t.includes('oil')) return 'ti ti-droplet';
    return 'ti ti-alert-triangle';
  };

  const getIncidentBadgeClass = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('explosion') || t.includes('fire')) return 'tag-explosion';
    if (t.includes('gas') || t.includes('h2s') || t.includes('leak')) return 'tag-leak';
    if (t.includes('spill') || t.includes('oil')) return 'tag-spill';
    return 'tag-explosion';
  };

  return (
    <div className="app-container">
      {/* Persistant Navbar */}
      <nav className="navbar">
        <div className="logo-container" onClick={() => navigateTo('#/')}>
          <i className="ti ti-shield-half logo-icon"></i>
          <div>
            <span className="logo-text">Texas Pipeline Safety Board</span>
            <div className="logo-tag">Texas Independent Safety Watchdog</div>
          </div>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation menu">
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        </button>
        <ul className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <li><button onClick={() => { navigateTo('#/'); setMenuOpen(false); }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Home</button></li>
          <li><button onClick={() => { navigateTo('#/incidents/pipeline-explosions'); setMenuOpen(false); }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Pipeline Explosions</button></li>
          <li><button onClick={() => { navigateTo('#/incidents/gas-leaks-h2s'); setMenuOpen(false); }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>H₂S Gas Leaks</button></li>
          <li><button onClick={() => { navigateTo('#/incidents/oil-saltwater-spills'); setMenuOpen(false); }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Oil &amp; Saltwater Spills</button></li>
        </ul>
      </nav>      {/* RENDER VIEW 1: HOMEPAGE */}
      {view === 'home' && (
        <>
          <header className="hero">
            <div className="hero-content">
              <div className="badge-official">
                <i className="ti ti-shield-check"></i> INDEPENDENT SAFETY WATCHDOG &amp; ADVOCACY ALLIANCE
              </div>
              <h1 className="hero-title">
                You Survived the Disaster. We Secure the Justice and Recovery You Deserve.
              </h1>
              <p className="hero-subtitle">
                Texas Pipeline Safety Board is the premier independent safety watchdog for families, oilfield workers, and landowners devastated by pipeline failures. When multi-billion-dollar midstream energy conglomerates compromise safety, we step in to bridge the gap—connecting you directly with elite, board-certified trial attorneys who hold negligent operators accountable.
              </p>
              <div className="hero-ctas">
                <button className="btn btn-accent btn-primary" onClick={() => { document.getElementById('intake-form').scrollIntoView({ behavior: 'smooth' }); }}>
                  <i className="ti ti-checklist"></i> Start Free Assessment
                </button>
                <a href="tel:18005550199" className="btn btn-secondary" onClick={(e) => { e.preventDefault(); alert('Hotline Active: Call (800) 555-0199 for emergency landowner assistance.'); }}>
                  <i className="ti ti-phone-call"></i> Emergency Hotline
                </a>
              </div>

              <div className="trust-bar">
                <div className="trust-item">
                  <i className="ti ti-fingerprint"></i> SECURE &amp; COMPLIANT
                </div>
                <div className="trust-item">
                  <i className="ti ti-clock"></i> FAST TRIAGE ROUTING
                </div>
                <div className="trust-item">
                  <i className="ti ti-scale"></i> BOARD-CERTIFIED SPECIALISTS
                </div>
              </div>
            </div>
          </header>

          <main className="dashboard-grid">
            {/* Left: Map & Scraper-Fed Log */}
            <section className="info-panel" id="corridors">
              <div className="card-map">
                <h2 className="card-title">
                  <i className="ti ti-map-2" style={{ color: 'var(--color-primary)' }}></i> Active Energy Corridors under BIA Safety Watch
                </h2>
                <div className="map-container">
                  <div className="map-vector"></div>
                  <div className="map-corridors">
                    <div className="corridor-line" style={{ width: '130px', left: '46%', top: '66%', transform: 'rotate(12deg)' }}></div>
                    <div className="corridor-line" style={{ width: '50px', left: '33%', top: '63%', transform: 'rotate(-5deg)' }}></div>
                    <div className="corridor-line" style={{ width: '180px', left: '55%', top: '55%', transform: 'rotate(-42deg)' }}></div>
                  </div>

                  {mapPins.map(pin => (
                    <div 
                      key={pin.id} 
                      className="map-pin" 
                      style={{ left: pin.x, top: pin.y, color: activePin === pin.id ? 'var(--color-accent)' : '#38bdf8' }}
                      onClick={() => setActivePin(pin.id)}
                      title={pin.label}
                    >
                      <i className="ti ti-map-pin"></i>
                    </div>
                  ))}

                  <div className="map-overlay">
                    <span>
                      <i className="ti ti-activity" style={{ color: '#ef4444' }}></i> Live Tracking: {activePin ? mapPins.find(p => p.id === activePin).label : 'All Corridors Active'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>PHMSA &amp; RRC Regulated</span>
                  </div>
                </div>
              </div>

              {/* Scraper-fed Live Incident Log */}
              <div className="recent-incidents">
                <h2 className="card-title">
                  <i className="ti ti-alert-circle" style={{ color: 'var(--color-accent)' }}></i> Live Pipeline Safety Watch &amp; Incident Log
                </h2>
                <p className="option-description" style={{ marginBottom: '1rem', marginTop: '-0.5rem' }}>
                  Real-time scraper-fed monitoring of federal PHMSA logs and state Railroad Commission (RRC) spill and rupture filings.
                </p>
                {loadingIncidents ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-secondary)' }}>
                    <i className="ti ti-loader rotate" style={{ fontSize: '1.5rem', marginBottom: '8px' }}></i>
                    <p style={{ fontSize: '0.8rem' }}>Loading latest incident logs...</p>
                  </div>
                ) : incidents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-tertiary)', border: '1px dashed var(--color-border-primary)', borderRadius: 'var(--border-radius-md)' }}>
                    <i className="ti ti-database-off" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
                    <p style={{ fontSize: '0.8rem' }}>No recent incident entries registered. Monitoring in progress.</p>
                  </div>
                ) : (
                  <div className="incident-list">
                    {incidents.map((inc) => (
                      <article key={inc.incident_id} className="incident-item" style={{ borderLeftColor: inc.incident_type?.toLowerCase().includes('spill') ? '#10b981' : '#b91c1c' }}>
                        <div className="incident-header">
                          <span>{inc.county ? `${inc.county}, ${inc.state || 'TX'}` : inc.state || 'Corridor Area'}</span>
                          <span className={`incident-type-tag ${getIncidentBadgeClass(inc.incident_type)}`}>
                            <i className={getIncidentIcon(inc.incident_type)}></i> {inc.incident_type}
                          </span>
                        </div>
                        <div className="incident-body">
                          {inc.spill_commodity ? (
                            <p style={{ marginBottom: '4px' }}>Spill Details: <strong>{inc.spill_volume_raw} {inc.spill_units} of {inc.spill_commodity}</strong> leaked.</p>
                          ) : null}
                          <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                            Operator: <strong>{inc.operator_name || 'Unspecified'}</strong>. Nearest Roads: {inc.nearest_roads || 'N/A'}.
                          </p>
                        </div>
                        <div className="incident-footer">
                          <span>Ref: <strong>{inc.regulatory_ref || inc.source_agency || 'PHMSA/RRC'}</strong></span>
                          <span>{inc.incident_date || inc.generated_date}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Right: Lead Intake Wizard */}
            <section className="form-card" id="intake-form">
              {!submitted ? (
                <form onSubmit={handleSubmit}>
                  <header className="form-header">
                    <h2 className="form-title">
                      <i className="ti ti-clipboard-heart" style={{ color: 'var(--color-accent)' }}></i> Start Your Secure 60-Second Case &amp; Land Damage Triage
                    </h2>
                    <p className="form-subtitle">100% Confidential. No Fee. No Obligation.</p>
                  </header>

                  <div className="progress-container">
                    <div className="progress-line"></div>
                    <div className="progress-line-fill" style={{ width: `${((step - 1) / 5) * 100}%` }}></div>
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <div key={s} className={`progress-step ${s === step ? 'active' : s < step ? 'completed' : ''}`}>
                        {s < step ? <i className="ti ti-check" style={{ fontSize: '0.8rem' }}></i> : s}
                      </div>
                    ))}
                  </div>

                  {step === 1 && (
                    <div className="step-content">
                      <h3 className="form-label" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
                        1. Select the type of pipeline failure or chemical incident:
                      </h3>
                      <div className="option-grid">
                        <div className={`option-card ${formData.incidentType === 'explosion' ? 'selected' : ''}`} onClick={() => handleOptionSelect('incidentType', 'explosion')}>
                          <div className="option-header">
                            <i className="ti ti-flame option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Pipeline Explosion / Fire</h4>
                          <p className="option-description">High-pressure gas line ignition, thermal burns, shockwave blast injuries, structural collapse.</p>
                        </div>
                        <div className={`option-card ${formData.incidentType === 'leak' ? 'selected' : ''}`} onClick={() => handleOptionSelect('incidentType', 'leak')}>
                          <div className="option-header">
                            <i className="ti ti-biohazard option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">H₂S Toxic Gas Leak</h4>
                          <p className="option-description">Hydrogen Sulfide inhalation, sour gas venting, acute respiratory distress, emergency evacuation.</p>
                        </div>
                        <div className={`option-card ${formData.incidentType === 'spill' ? 'selected' : ''}`} onClick={() => handleOptionSelect('incidentType', 'spill')}>
                          <div className="option-header">
                            <i className="ti ti-droplet option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Crude Oil / Saltwater Spill</h4>
                          <p className="option-description">Produced saltwater leaks, landowner acreage contamination, dead livestock, soil sterilization.</p>
                        </div>
                        <div className={`option-card ${formData.incidentType === 'water' ? 'selected' : ''}`} onClick={() => handleOptionSelect('incidentType', 'water')}>
                          <div className="option-header">
                            <i className="ti ti-ripple option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Groundwater Contamination</h4>
                          <p className="option-description">Benzene seepage into water table, local water well toxicity, crop poisoning, long-term toxic illness.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="step-content">
                      <h3 className="form-label" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
                        2. What is your relationship or role in this incident?
                      </h3>
                      <div className="option-grid">
                        <div className={`option-card ${formData.role === 'landowner' ? 'selected' : ''}`} onClick={() => handleOptionSelect('role', 'landowner')}>
                          <div className="option-header">
                            <i className="ti ti-home-shield option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Affected Landowner</h4>
                          <p className="option-description">You own acreage, farm, ranch, or residential property directly damaged by a pipeline corridor failure.</p>
                        </div>
                        <div className={`option-card ${formData.role === 'worker' ? 'selected' : ''}`} onClick={() => handleOptionSelect('role', 'worker')}>
                          <div className="option-header">
                            <i className="ti ti-user-exclamation option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Industrial / Oilfield Worker</h4>
                          <p className="option-description">You were working on-site, at a compressor station, refining facility, gathering hub, or drilling corridor.</p>
                        </div>
                        <div className={`option-card ${formData.role === 'resident' ? 'selected' : ''}`} onClick={() => handleOptionSelect('role', 'resident')}>
                          <div className="option-header">
                            <i className="ti ti-users option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Local Resident</h4>
                          <p className="option-description">You live in a nearby community adjacent to the midstream pipeline easement and were evacuated or injured.</p>
                        </div>
                        <div className={`option-card ${formData.role === 'responder' ? 'selected' : ''}`} onClick={() => handleOptionSelect('role', 'responder')}>
                          <div className="option-header">
                            <i className="ti ti-ambulance option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">First Responder / Passerby</h4>
                          <p className="option-description">You were an emergency responder, medical worker, or traveling along a highway/corridor near the rupture.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="step-content">
                      <h3 className="form-label" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
                        3. What is the severity of the injuries or property damages?
                      </h3>
                      <div className="option-grid">
                        <div className={`option-card ${formData.severity === 'fatality' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'fatality')}>
                          <div className="option-header">
                            <i className="ti ti-coffin option-icon" style={{ color: 'var(--color-accent)' }}></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Fatality / Wrongful Death</h4>
                          <p className="option-description">The incident resulted in a loss of life of an immediate family member or worker on scene.</p>
                        </div>
                        <div className={`option-card ${formData.severity === 'burns' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'burns')}>
                          <div className="option-header">
                            <i className="ti ti-virus option-icon" style={{ color: 'var(--color-accent)' }}></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Catastrophic Burns / ICU Stay</h4>
                          <p className="option-description">Third-degree thermal burns, blast-induced trauma, or severe toxic gas inhalation requiring emergency care.</p>
                        </div>
                        <div className={`option-card ${formData.severity === 'hospital' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'hospital')}>
                          <div className="option-header">
                            <i className="ti ti-building-hospital option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Hospitalization</h4>
                          <p className="option-description">Temporary hospital admission, respiratory therapy, toxic exposure clinics, or chemical burns.</p>
                        </div>
                        <div className={`option-card ${formData.severity === 'property' ? 'selected' : ''}`} onClick={() => handleOptionSelect('severity', 'property')}>
                          <div className="option-header">
                            <i className="ti ti-fence option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Severe Property &amp; Land Sterilization</h4>
                          <p className="option-description">Crude oil spill, agricultural soil contamination, toxic produced water leak, poisoned crops/livestock.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="step-content">
                      <h3 className="form-label" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                        4. Identify the target pipeline operator or defendant (if known):
                      </h3>
                      <div className="form-group">
                        <label className="form-label" htmlFor="defendant-select">Pipeline Operator (Select or enter below):</label>
                        <select id="defendant-select" className="form-input" name="defendant" value={formData.defendant} onChange={handleInputChange} style={{ marginBottom: '15px' }}>
                          <option value="">-- Choose Operator --</option>
                          <option value="Energy Transfer Partners">Energy Transfer Partners</option>
                          <option value="Enterprise Products Partners">Enterprise Products Partners</option>
                          <option value="Plains All American">Plains All American</option>
                          <option value="Kinder Morgan">Kinder Morgan</option>
                          <option value="Chevron Midstream">Chevron Midstream</option>
                          <option value="Other">Other (Type below)</option>
                          <option value="Unknown">I am not sure / Operator unknown</option>
                        </select>
                        {(!formData.defendant || formData.defendant === 'Other') && (
                          <input type="text" name="defendant" className="form-input" placeholder="Or enter the operator name manually..." value={formData.defendant === 'Other' ? '' : formData.defendant} onChange={handleInputChange} />
                        )}
                      </div>
                    </div>
                  )}

                  {step === 5 && (
                    <div className="step-content">
                      <h3 className="form-label" style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>
                        5. Legal viability &amp; compensation audit:
                      </h3>
                      <div className="option-grid">
                        <div className={`option-card ${formData.legalStatus === 'no' ? 'selected' : ''}`} onClick={() => handleOptionSelect('legalStatus', 'no')}>
                          <div className="option-header">
                            <i className="ti ti-shield-x option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">No Lawyer / No Waivers Signed</h4>
                          <p className="option-description">You do not have active legal counsel representing you, and you have not signed any liability releases with the operator.</p>
                        </div>
                        <div className={`option-card ${formData.legalStatus === 'yes' ? 'selected' : ''}`} onClick={() => handleOptionSelect('legalStatus', 'yes')}>
                          <div className="option-header">
                            <i className="ti ti-gavel option-icon"></i>
                            <div className="option-radio"><div className="option-radio-dot"></div></div>
                          </div>
                          <h4 className="option-title">Represented / Waiver Signed</h4>
                          <p className="option-description">You have already signed a full settlement release with the pipeline company, or you are currently under contract with a legal firm.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 6 && (
                    <div className="step-content">
                      <h3 className="form-label" style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>
                        6. Submit Contact Details for Priority Advocate Review:
                      </h3>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">First Name *</label>
                          <input type="text" name="firstName" required className="form-input" value={formData.firstName} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last Name *</label>
                          <input type="text" name="lastName" required className="form-input" value={formData.lastName} onChange={handleInputChange} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Email Address *</label>
                          <input type="email" name="email" required className="form-input" value={formData.email} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Phone Number *</label>
                          <input type="tel" name="phone" required className="form-input" placeholder="(555) 555-5555" value={formData.phone} onChange={handleInputChange} />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Affected County *</label>
                          <input type="text" name="county" required className="form-input" placeholder="e.g. Midland County" value={formData.county} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">State *</label>
                          <input type="text" name="state" required className="form-input" placeholder="e.g. Texas" value={formData.state} onChange={handleInputChange} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Details / Description of Rupture or Injury</label>
                        <textarea name="details" className="form-input form-textarea" placeholder="Briefly describe what happened, any injuries, or land damage..." value={formData.details} onChange={handleInputChange}></textarea>
                      </div>
                      <p className="form-legal">
                        By submitting this form, you certify the information provided is accurate and consent to receive automated SMS text alerts and phone calls from Texas Pipeline Safety Board and its affiliated attorney referral network under the TCPA. You understand consent is not a required condition of service, and you may opt-out at any time by replying STOP.
                      </p>
                    </div>
                  )}

                  <div className="form-actions">
                    {step > 1 ? (
                      <button type="button" className="btn btn-secondary" onClick={prevStep}>
                        <i className="ti ti-arrow-narrow-left"></i> Back
                      </button>
                    ) : (
                      <div></div>
                    )}
                    {step < 6 ? (
                      <button type="button" className="btn btn-primary" onClick={nextStep}>
                        Next Step <i className="ti ti-arrow-narrow-right"></i>
                      </button>
                    ) : (
                      <button type="submit" className="btn btn-accent btn-primary" disabled={submitting}>
                        {submitting ? (
                          <span><i className="ti ti-loader rotate"></i> Triaging Case...</span>
                        ) : (
                          <span>Submit Secure Assessment <i className="ti ti-shield-check"></i></span>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="success-card">
                  <i className="ti ti-circle-check success-icon"></i>
                  <h2 className="success-title">Assessment Registered</h2>
                  <p className="success-desc">
                    Your pipeline failure claim has been securely submitted to the Basin Safety Watch database. An advocate from our board of experts is actively triaging your case.
                  </p>

                  <div className="success-tier-badge">
                    <i className="ti ti-alert-triangle"></i> DYNAMIC SCORE: {submissionResult?.score || 0} | {submissionResult?.tier || 'Review Needed'}
                  </div>

                  <div className="success-timeline">
                    <h3 className="timeline-title">BIA Safety Watch Tracking Timeline</h3>
                    <div className="timeline-step">
                      <div className="timeline-step-icon">1</div>
                      <div className="timeline-step-content">
                        <p className="timeline-step-label">Lead Triage Completed</p>
                        <p className="timeline-step-desc">Your claim classified under <strong>{submissionResult?.tier}</strong></p>
                      </div>
                    </div>
                    <div className="timeline-step">
                      <div className="timeline-step-icon">2</div>
                      <div className="timeline-step-content">
                        <p className="timeline-step-label">Security Entry Logged</p>
                        <p className="timeline-step-desc">Durable SQLite entry registered under ID: <code>{submissionResult?.leadId?.substring(0, 13)}...</code></p>
                      </div>
                    </div>
                    <div className="timeline-step">
                      <div className="timeline-step-icon">3</div>
                      <div className="timeline-step-content">
                        <p className="timeline-step-label">Affiliate Advocate Network Pushed</p>
                        <p className="timeline-step-desc">Routing coordinates: <strong>{formData.county}, {formData.state}</strong>. Connecting board-certified attorney... Expect contact in under 5 minutes.</p>
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-secondary" onClick={() => { setStep(1); setSubmitted(false); setFormData({
                    incidentType: '', role: '', severity: '', defendant: '', legalStatus: '', firstName: '', lastName: '', email: '', phone: '', county: '', state: '', details: ''
                  }); }}>
                    Register Another Assessment
                  </button>
                </div>
              )}
            </section>
          </main>

          {/* Three Pillars Section */}
          <section className="regions-section" style={{ backgroundColor: 'var(--color-background-primary)' }}>
            <div className="section-container">
              <header className="section-header">
                <span className="section-tag">WATCHDOG MISSION</span>
                <h2 className="section-title">The Three Pillars of Independent Advocacy</h2>
              </header>
              <div className="regions-grid">
                <div className="region-card">
                  <i className="ti ti-user-exclamation region-icon" style={{ color: 'var(--color-accent)' }}></i>
                  <h3 className="region-title">1. Catastrophic Personal Injury &amp; Wrongful Death</h3>
                  <p className="region-desc">
                    For workers and local residents caught in the path of a high-pressure line rupture, blast waves, or flash fires. We stand by you during your recovery from severe thermal burns and traumatic blast injuries, ensuring you are matched with elite trial lawyers who bypass the worker's comp shield to sue negligent third-party operators.
                  </p>
                </div>
                <div className="region-card">
                  <i className="ti ti-home-shield region-icon"></i>
                  <h3 className="region-title">2. Landowner Asset &amp; Property Protection</h3>
                  <p className="region-desc">
                    For farmers and ranchers whose multi-generational property has been ruined by high-salinity produced water or crude oil spills. We protect you from high-pressure corporate "landmen" pushing low-ball, cosmetic repair releases. We help you secure full excavation, soil restoration, and permanent aquifer decontamination costs.
                  </p>
                </div>
                <div className="region-card">
                  <i className="ti ti-biohazard region-icon" style={{ color: 'var(--color-accent)' }}></i>
                  <h3 className="region-title">3. Toxic Chemical &amp; Gas Inhalation Triage</h3>
                  <p className="region-desc">
                    For sour gas workers and fence-line communities exposed to lethal Hydrogen Sulfide (H₂S) or Benzene. We translate complex medical symptoms into technical legal frameworks, proving exposure through medical markers, local weather data, and regulatory infraction reports.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Watchdog Credential Panel */}
          <section className="regions-section" style={{ borderTop: '1px solid var(--color-border-secondary)' }}>
            <div className="section-container" style={{ textAlign: 'center' }}>
              <span className="section-tag">COMPLIANCE &amp; STATISTICS</span>
              <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>We Monitor the Infrastructure That Energy Giants Neglect</h2>
              <p className="hero-subtitle" style={{ marginBottom: '3rem' }}>
                Texas Pipeline Safety Board is not a predatory "ambulance chasing" law firm. We are an independent watchdog group compiling federal **PHMSA** incident logs, state **Texas Railroad Commission (RRC)** safety filings, and public environmental spill reports to protect local communities.
              </p>
              <div className="regions-grid">
                <div className="region-card">
                  <h3 className="hero-title" style={{ color: 'var(--color-accent)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>600+</h3>
                  <p className="region-title">Significant US Pipeline Incidents Logged Annually</p>
                </div>
                <div className="region-card">
                  <h3 className="hero-title" style={{ color: 'var(--color-primary)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>40,000+</h3>
                  <p className="region-title">Miles of Active Midstream Infrastructure Monitored</p>
                </div>
                <div className="region-card">
                  <h3 className="hero-title" style={{ color: '#16a34a', fontSize: '2.5rem', marginBottom: '0.5rem' }}>$100M+</h3>
                  <p className="region-title">In Defendant Corporate Liability Insurance Pools Unlocked</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* RENDER VIEW 2: PIPELINE EXPLOSIONS */}
      {view === 'explosions' && (
        <section className="regions-section" style={{ padding: '4rem 2rem' }}>
          <div className="section-container" style={{ maxWidth: '900px' }}>
            <span className="section-tag" style={{ color: 'var(--color-accent)' }}>STAND WITH FIRE AND BLAST SURVIVORS</span>
            <h1 className="hero-title" style={{ fontSize: '2.5rem', textAlign: 'left', marginBottom: '1rem' }}>
              Ruptured Pipelines Feed Uncontrollable Fires. We Hold the Operators Accountable.
            </h1>
            <p className="hero-subtitle" style={{ textAlign: 'left', margin: '0 0 2rem 0', fontSize: '1.1rem' }}>
              When high-pressure gas or crude transmission lines fail, they don't just leak—they explode. The resulting thermal radiation fields devour everything in their path, leaving workers and local residents with devastating, life-altering injuries. Texas Pipeline Safety Board connects catastrophically injured victims with elite trial attorneys who understand the technical complexities of **PHMSA CFR Part 192 &amp; 195** regulations to prove operator negligence and secure the compensation you need to heal.
            </p>

            <div className="card-map" style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--color-accent)' }}>
              <h3 className="region-title" style={{ marginBottom: '1rem' }}>The Excruciating Reality of Thermal &amp; Blast Trauma</h3>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                <li><strong>Third-Degree Thermal Burns:</strong> Destroys skin tissue, nerves, and muscle fibers, requiring extensive debridement, painful skin grafts, and months in specialized intensive burn units.</li>
                <li><strong>Blast Inhalation Injuries:</strong> Inhaling superheated gas or smoke causes severe pulmonary edema, swelling of the airway, and permanent respiratory impairment.</li>
                <li><strong>Traumatic Blast Wave Trauma:</strong> The physical shockwave of a pipeline rupture can throw workers or residents dozens of feet, resulting in traumatic brain injuries (TBI), severe orthopedic fractures, and internal organ lacerations.</li>
                <li><strong>Wrongful Death:</strong> When a pipeline failure ends in tragedy, families are left to pick up the pieces against massive corporate defense legal teams who seek to bury liability.</li>
              </ul>
            </div>

            <h3 className="region-title" style={{ marginBottom: '1rem' }}>The Legal Strategy: Proving Operator Negligence</h3>
            <p className="region-desc" style={{ marginBottom: '1.5rem' }}>
              Midstream operators like Energy Transfer, Enterprise Products, and Plains All American are legally mandated to maintain structural integrity, corrosion control, and automated pressure monitoring. When an explosion occurs, it is almost always the direct result of systemic corporate shortcuts:
            </p>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '2.5rem' }}>
              <li><strong>Failure to Control Corrosion:</strong> Severe metal loss on older transmission lines that should have been flagged by smart pigging runs.</li>
              <li><strong>Delayed Valve Shutdowns:</strong> Inadequate automated shutoff or check valves, allowing pressurized gas to feed a pipeline fire for hours after the initial rupture.</li>
              <li><strong>Pressure Over-Pressurization:</strong> Exceeding the Max Allowable Operating Pressure (MAOP) due to faulty control room communications.</li>
              <li><strong>Inadequate Right-of-Way Inspections:</strong> Ignoring soil erosion, external damage, or pipeline exposing washouts.</li>
            </ol>

            <div className="region-card" style={{ marginBottom: '3rem', backgroundColor: 'var(--color-background-primary)' }}>
              <h3 className="region-title" style={{ color: 'var(--color-text-primary)' }}>What Full Compensation Looks Like</h3>
              <p className="region-desc" style={{ marginBottom: '1rem' }}>Our partner firms target the multi-million-dollar primary and excess corporate insurance layers of midstream defendants, helping victims demand maximum compensation across all damage categories:</p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <li><strong>Comprehensive Burn Care:</strong> Lifetime medical coverage for scar revision surgeries, occupational therapy, specialized compression garments, and psychological support for PTSD.</li>
                <li><strong>Total Lost Earning Capacity:</strong> Replacing your past and future wages if you can never return to the oilfield or your previous trade.</li>
                <li><strong>Pain, Suffering, and Anguish:</strong> Full compensation for the profound physical pain and emotional trauma of surviving an industrial blast.</li>
                <li><strong>Punitive Damages:</strong> Demanding exemplary damages in court to punish the midstream operator for conscious indifference to public safety.</li>
              </ul>
            </div>

            <div className="faq-section" style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border-secondary)', paddingTop: '2.5rem' }}>
              <h3 className="region-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Frequently Asked Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: What if I was injured on an oilfield lease location, can I sue?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: Yes. While Texas workers' compensation laws generally protect your direct employer from personal injury lawsuits, they do not protect negligent third parties. If a midstream pipeline operator or a separate subcontractor owned or maintained the line that exploded, you have the absolute right to file a third-party personal injury lawsuit to recover full damages beyond standard workers' comp caps.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: How much does it cost to hire an attorney through your network?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: Nothing out of pocket. Every law firm in the Texas Pipeline Safety Board network operates on a strict contingency fee basis (100% risk-free). They cover all upfront costs of litigation, failure analysis experts, and medical consulting. You do not owe a single penny unless they secure a successful settlement or jury verdict in your favor.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: What is the statute of limitations for a pipeline injury claim?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: In Texas, the statute of limitations for personal injury and wrongful death claims is generally two (2) years from the date of the incident. Because midstream companies begin scraping evidence and cleaning the site immediately, securing specialized representation within the first 48 hours is critical to preserving key physical evidence and pipeline monitoring data.</p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--border-radius-lg)' }}>
              <h3 className="region-title" style={{ justifyContent: 'center', color: '#166534', marginBottom: '0.5rem' }}>Evaluate Your Pipeline Explosion Claim</h3>
              <p style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '1.5rem' }}>Get instant case and burn injury triage from our independent advocacy board.</p>
              <button className="btn btn-primary" style={{ backgroundColor: '#16a34a' }} onClick={() => navigateTo('#/')}>
                👉 Start Free Assessment Now
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RENDER VIEW 3: TOXIC GAS & H2S */}
      {view === 'gas-leaks' && (
        <section className="regions-section" style={{ padding: '4rem 2rem' }}>
          <div className="section-container" style={{ maxWidth: '900px' }}>
            <span className="section-tag" style={{ color: 'var(--color-accent)' }}>SOUR GAS TOXICOLOGY &amp; ADVOCACY WATCHDOG</span>
            <h1 className="hero-title" style={{ fontSize: '2.5rem', textAlign: 'left', marginBottom: '1rem' }}>
              Hydrogen Sulfide is a Lethal, Silent Killer. We Expose the Negligence that Unleashed It.
            </h1>
            <p className="hero-subtitle" style={{ textAlign: 'left', margin: '0 0 2rem 0', fontSize: '1.1rem' }}>
              In sour gas basins like the Permian, Hydrogen Sulfide (H₂S) gas is a constant, deadly hazard. At high concentrations, a single breath causes instant knockdown, permanent hypoxic brain damage, or immediate respiratory arrest. If you were exposed due to a sour gas pipeline leak, faulty wellhead, or lack of proper safety equipment, Texas Pipeline Safety Board connects you with specialized toxic tort attorneys who utilize **OSHA CFR 1910.134** and **RRC Statewide Rule 36** frameworks to prove operator liability and secure lifetime medical compensation.
            </p>

            <div className="card-map" style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--color-accent)' }}>
              <h3 className="region-title" style={{ marginBottom: '1rem' }}>The Insidious Pathology of Hydrogen Sulfide Poisoning</h3>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                <li><strong>The Olfactory Illusion (Lethal at 100+ ppm):</strong> While H₂S is famous for its "rotten egg" odor at low levels, high concentrations instantly paralyze the olfactory nerve. The smell disappears, tricking victims into believing they are safe right before they lose consciousness.</li>
                <li><strong>Acute Knockdown &amp; Hypoxic Brain Injury:</strong> Breathing concentrations above 500 ppm causes immediate loss of consciousness ("knockdown"). While the victim is unconscious, their brain is entirely starved of oxygen, frequently resulting in permanent, irreversible brain damage, cognitive decline, and memory loss.</li>
                <li><strong>Acute Respiratory Distress Syndrome (ARDS):</strong> High-level exposure causes severe chemical burns in the lung tissue, leading to fluid accumulation, coughing up blood, and chronic, irreversible pulmonary fibrosis.</li>
                <li><strong>Chronic Neurological Deficits:</strong> Survivors of sour gas leaks often suffer from permanent central nervous system damage, including chronic motor tremors, severe clinical depression, loss of balance, and persistent headaches.</li>
              </ul>
            </div>

            <h3 className="region-title" style={{ marginBottom: '1rem' }}>Corporate Violations of Industrial Safety Regulations</h3>
            <p className="region-desc" style={{ marginBottom: '1.5rem' }}>
              Because of its lethal nature, state and federal regulators hold operators to strict safety mandates. When an exposure occurs, it is almost always due to systemic corporate regulatory violations:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '2.5rem' }}>
              <li><strong>OSHA Personal Monitor Failures:</strong> Failing to provide workers with functional, calibrated personal H₂S gas clip monitors on sour gas leases.</li>
              <li><strong>Texas Railroad Commission Rule 36 Infractions:</strong> Operating a sour gas facility or pipeline without filing a proper H₂S Contingency Plan, neglecting public warning signs, or failing to maintain automated flare ignition systems.</li>
              <li><strong>Defective Breathing Air Equipment:</strong> Providing workers with expired, uninspected, or non-functional Self-Contained Breathing Apparatus (SCBA) packs or escape cylinders.</li>
              <li><strong>Failure to Alert Local Residents:</strong> Neglecting to monitor perimeter fence-line gas concentrations, leaving local landowners vulnerable to toxic plumes during night-time thermal inversions.</li>
            </ul>

            <div className="region-card" style={{ marginBottom: '3rem', backgroundColor: 'var(--color-background-primary)' }}>
              <h3 className="region-title" style={{ color: 'var(--color-text-primary)' }}>Toxic Tort Compensation: Securing Your Future</h3>
              <p className="region-desc" style={{ marginBottom: '1rem' }}>Proving an H₂S exposure case requires sophisticated toxicological and neurological experts. We align you with attorneys who know how to build a comprehensive damage model:</p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <li><strong>Lifetime Pulmonary &amp; Neurological Monitoring:</strong> Securing trusts to cover the cost of ongoing neurologist visits, cognitive therapies, and specialized pulmonologist care.</li>
                <li><strong>Permanent Disability &amp; Loss of Earning Capacity:</strong> Providing full financial security if H₂S-induced brain damage or lung scarring prevents you from ever working in the energy industry again.</li>
                <li><strong>Non-Economic Damages:</strong> Accounting for the severe, chronic cognitive changes, memory deficits, and behavioral shifts that tear families apart following toxic brain injuries.</li>
              </ul>
            </div>

            <div className="faq-section" style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border-secondary)', paddingTop: '2.5rem' }}>
              <h3 className="region-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Frequently Asked Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: What if the operator claims my symptoms are unrelated to the leak?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: This is the standard corporate defense. Midstream operators will claim your headaches, memory loss, or breathing difficulties are pre-existing or due to other factors. Our affiliate toxic tort attorneys counter this by immediately securing specialized testing—including quantitative EEG brain mapping, neuropsychological testing, and high-resolution lung function tests—to document the objective biological markers of toxic gas poisoning.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: I am an oilfield worker. Can I sue the lease owner if my employer didn't provide an H2S monitor?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: Yes. Under third-party liability laws, if the owner or operator of the lease location failed to maintain a safe working environment, failed to warn of sour gas production, or had a leaking line, you can file a major lawsuit against them. This is completely separate from your workers' compensation claim against your direct employer.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: What should I do immediately following an H2S exposure?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: 1. Seek emergency medical attention immediately and ensure they document "toxic chemical inhalation." 2. Request a blood gas test to measure oxygen levels and toxicology screens. 3. Save the clothing you were wearing in a sealed plastic bag. 4. Do not sign any statements, incident reports, or releases for safety managers before speaking to an independent advocate.</p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--border-radius-lg)' }}>
              <h3 className="region-title" style={{ justifyContent: 'center', color: '#166534', marginBottom: '0.5rem' }}>Begin Your Toxic Gas Exposure Triage</h3>
              <p style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '1.5rem' }}>Secure an independent clinical toxicology audit of your medical and legal rights.</p>
              <button className="btn btn-primary" style={{ backgroundColor: '#16a34a' }} onClick={() => navigateTo('#/')}>
                👉 Start Free H2S Assessment Now
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RENDER VIEW 4: CRUDE OIL & SALTWATER SPILLS */}
      {view === 'spills' && (
        <section className="regions-section" style={{ padding: '4rem 2rem' }}>
          <div className="section-container" style={{ maxWidth: '900px' }}>
            <span className="section-tag" style={{ color: 'var(--color-accent)' }}>INDEPENDENT LANDOWNER RIGHTS WATCHDOG</span>
            <h1 className="hero-title" style={{ fontSize: '2.5rem', textAlign: 'left', marginBottom: '1rem' }}>
              Energy Giants Contaminate Your Land. We Force Them to Pay for True Restoration.
            </h1>
            <p className="hero-subtitle" style={{ textAlign: 'left', margin: '0 0 2rem 0', fontSize: '1.1rem' }}>
              When a pipeline ruptures on your property, it releases two devastating pollutants: toxic crude oil and highly corrosive, hyper-saline "produced water" (saltwater). These toxins sterilize your soil for decades, poison livestock, and migrate into your drinking wells. Texas Pipeline Safety Board stands shoulder-to-shoulder with rural property owners. We connect you with elite environmental litigators who force operators to pay the actual millions required for total restoration—not just cosmetic quick-fixes.
            </p>

            <div className="card-map" style={{ marginBottom: '2.5rem', borderLeft: '4px solid var(--color-accent)' }}>
              <h3 className="region-title" style={{ marginBottom: '1rem' }}>The Real Science of Soil &amp; Water Destruction</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                <div>
                  <strong>1. The Produced Water "Dead Zone" (Hyper-Saline Sterilization):</strong>
                  <p style={{ marginTop: '4px', paddingLeft: '15px' }}>Oilfield produced water is highly toxic wastewater up to 10 times saltier than seawater. It spikes the Sodium Adsorption Ratio (SAR), permanently dispersing clay particles and preventing water penetration. Vegetation is dehydrated at a cellular level, sterilizing soil for decades.</p>
                </div>
                <div>
                  <strong>2. Crude Oil Contamination &amp; Toxic BTEX Migration:</strong>
                  <p style={{ marginTop: '4px', paddingLeft: '15px' }}>Crude oil leaches highly carcinogenic BTEX compounds (Benzene, Toluene, Ethylbenzene, Xylene) that migrate rapidly, infiltrating the drinking water aquifer, and poisoning livestock and humans.</p>
                </div>
              </div>
            </div>

            <h3 className="region-title" style={{ marginBottom: '1rem' }}>Exposing the "Cosmetic Remediation" Trap</h3>
            <p className="region-desc" style={{ marginBottom: '1.5rem' }}>
              Immediately following a pipeline spill, the operator's corporate landman will arrive at your ranch. They are highly trained negotiators whose sole objective is to protect the operator's bottom line:
            </p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '2.5rem' }}>
              <li><strong>The Low-Ball Offer:</strong> Offering a quick check (ranging from $5,000 to $25,000) and promising that their crews will "clean up the dirt and seed it."</li>
              <li><strong>The Hidden Release:</strong> Handing you a complex legal release. Signing it waives your right to ever sue the operator for future damages, even if your groundwater is found to be toxic years later.</li>
              <li><strong>The Cheap Patch:</strong> Cleanup crews performing a "scrape and paint" remediation—simply removing topsoil and dumping gypsum, leaving the rising underground salt plume ("salinity creep") to sterilize the land all over again.</li>
            </ul>

            <div className="region-card" style={{ marginBottom: '3rem', backgroundColor: 'var(--color-background-primary)' }}>
              <h3 className="region-title" style={{ color: 'var(--color-text-primary)' }}>What Landowners Can Recover Under Tort Law</h3>
              <p className="region-desc" style={{ marginBottom: '1rem' }}>Under Texas common law, you are entitled to hold the midstream operator fully liable. Our affiliate environmental attorneys demand maximum compensation for:</p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <li><strong>Actual Restoration &amp; Reclamation Costs:</strong> Forcing excavation, soil replacement, and Hydrogeological resistivity plume mapping.</li>
                <li><strong>Diminution of Property Value ("Stigma Damages"):</strong> Compensation for the permanent loss in overall market value of your multi-generational ranch.</li>
                <li><strong>Agricultural Interruption Losses:</strong> Recovering lost revenue from crop yields, livestock leasing, and agricultural production.</li>
                <li><strong>Water Well Replacement:</strong> Forcing the operator to drill new, deeper drinking water wells to bypass contaminated aquifers.</li>
              </ul>
            </div>

            <div className="faq-section" style={{ marginTop: '3rem', borderTop: '1px solid var(--color-border-secondary)', paddingTop: '2.5rem' }}>
              <h3 className="region-title" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Frequently Asked Questions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: Do I have to let the pipeline company on my land to clean up?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: Yes, under standard easement agreements, they have the right to access the property to maintain and repair their infrastructure. However, you do not have to sign any releases or liability waivers to allow them access. You should document everything they do and consult with an independent advocate immediately to protect your long-term property rights.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: How do we prove the extent of the saltwater or crude contamination?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: Our partner environmental attorneys hire independent, board-certified soil scientists and hydrogeologists. They conduct physical soil core drilling, install independent groundwater monitoring wells, and run electrical resistivity surveys to map the exact vertical and horizontal boundaries of the toxic plume.</p>
                </div>
                <div>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '6px' }}>Q: What should I do immediately if I discover a spill on my land?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>A: 1. Do not touch or walk through the spill—produced water and crude contain highly toxic carcinogens. 2. Take high-resolution photos/videos of the spill and dead vegetation. 3. Immediately report the spill to state regulators (Texas Railroad Commission). 4. Do not sign any document presented by a landman. 5. Contact Texas Pipeline Safety Board for an independent soil and damage assessment.</p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--border-radius-lg)' }}>
              <h3 className="region-title" style={{ justifyContent: 'center', color: '#166534', marginBottom: '0.5rem' }}>Register Your Land Damage Assessment</h3>
              <p style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '1.5rem' }}>Connect with environmental litigators who bypass low-ball landmen settlements.</p>
              <button className="btn btn-primary" style={{ backgroundColor: '#16a34a' }} onClick={() => navigateTo('#/')}>
                👉 Start Free Land Evaluation
              </button>
            </div>
          </div>
        </section>
      )}

      {/* RENDER VIEW 5: PARTNER PORTAL */}
      {view === 'partner-portal' && (
        <PartnerPortal navigateTo={navigateTo} />
      )}
      {/* Persistant Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="footer-logo">
              <i className="ti ti-shield-half"></i> Texas Pipeline Safety Board
            </span>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              TPSB is an independent safety advocacy watchdog dedicated to tracking environmental failures, protecting multi-generational landowner assets, and helping pipeline accident victims navigate legal options.
            </p>
          </div>
          <div className="footer-nav">
            <div className="footer-nav-col">
              <span className="footer-nav-title">Claimant Resources</span>
              <button onClick={() => navigateTo('#/incidents/pipeline-explosions')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left' }} className="footer-nav-link">Explosion Recovery Guide</button>
              <button onClick={() => navigateTo('#/incidents/oil-saltwater-spills')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left' }} className="footer-nav-link">Landowner Damage Rights</button>
            </div>
            <div className="footer-nav-col">
              <span className="footer-nav-title">Partner Firm</span>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px', lineHeight: '1.5' }}>
                <strong>Exclusive Texas Litigation Partner</strong>
                <p style={{ marginTop: '6px', fontSize: '0.75rem' }}>
                  [Firm Name &amp; Logo Placeholder]<br />
                  Board-Certified Trial Attorneys<br />
                  Texas Pipeline Litigation Division
                </p>
              </div>
              <button onClick={() => navigateTo('#/partner-portal')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left' }} className="footer-nav-link">Partner Portal Access</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-disclaimer">
            <strong>Legal Notice &amp; Disclaimer:</strong> Texas Pipeline Safety Board (TPSB) is an independent non-attorney safety watchdog and lead-generation portal. We do not provide legal advice, medical diagnoses, or direct legal representation. Texas Pipeline Safety Board is not a law firm, and utilizing this portal does not establish an attorney-client relationship. All legal evaluations, representation decisions, and litigation actions are completed independently by board-certified, third-party partner law firms within our exclusive affiliate network.
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
            &copy; 2026 Texas Pipeline Safety Board (TPSB). All Rights Reserved. TCPA Compliant.
          </p>
        </div>
      </footer>
    </div>
  );
}
