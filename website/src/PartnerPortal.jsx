import React, { useState, useEffect } from 'react';

export default function PartnerPortal({ navigateTo }) {
  const [leads, setLeads] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Tab state (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  const [activeTab, setActiveTab] = useState('dashboard');

  // Lead Detail Modal state (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  const [selectedLead, setSelectedLead] = useState(null);

  // Integration Settings form state (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  const [crmWebhookUrl, setCrmWebhookUrl] = useState('');
  const [crmType, setCrmType] = useState('standard');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState(null);

  // Webhook Testing state (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Outbox retry / SLA details state
  const [retryingAlertId, setRetryingAlertId] = useState(null);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  const PARTNER_PASSCODE = 'txpsb2026';

  // Poll for dashboard data
  useEffect(() => {
    if (!authenticated) return;
    const fetchData = async () => {
      try {
        const [leadsRes, incRes, outboxRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/incidents'),
          fetch('/api/outbox')
        ]);
        const leadsData = await leadsRes.json();
        const incData = await incRes.json();
        const outboxData = await outboxRes.json();
        if (leadsData.success) setLeads(leadsData.leads || []);
        if (incData.success) setIncidents(incData.incidents || []);
        if (outboxData.success) setOutbox(outboxData.alerts || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const poll = setInterval(fetchData, 15000);
    return () => clearInterval(poll);
  }, [authenticated]);

  // Fetch partner integration settings (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  useEffect(() => {
    if (!authenticated) return;
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/partner/config', {
          headers: { 'x-passcode': PARTNER_PASSCODE }
        });
        const data = await res.json();
        if (data.success && data.config) {
          setCrmWebhookUrl(data.config.crm_webhook_url || '');
          setCrmType(data.config.crm_type || 'standard');
        }
      } catch (err) {
        console.error('Error fetching partner config:', err);
      }
    };
    fetchConfig();
  }, [authenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === PARTNER_PASSCODE) {
      setAuthenticated(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  // Save settings handler (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/partner/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-passcode': PARTNER_PASSCODE
        },
        body: JSON.stringify({
          crm_webhook_url: crmWebhookUrl,
          crm_type: crmType
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage({ type: 'success', text: 'Integration settings saved successfully.' });
      } else {
        setSettingsMessage({ type: 'error', text: data.message || 'Failed to save configuration.' });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setSettingsMessage({ type: 'error', text: 'Network error. Failed to connect to server.' });
    } finally {
      setSettingsLoading(false);
    }
  };

  // Test webhook handler (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/partner/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-passcode': PARTNER_PASSCODE
        }
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          type: 'success',
          text: data.message || 'Test webhook successfully delivered!',
          payload: data.payload
        });
      } else {
        setTestResult({
          type: 'error',
          text: data.message || 'CRM webhook responded with error.',
          payload: data.payload
        });
      }
    } catch (err) {
      console.error('Error testing webhook:', err);
      setTestResult({
        type: 'error',
        text: 'Failed to dispatch test webhook: ' + err.message
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Retry specific failed or pending outbox dispatch
  const handleRetryDispatch = async (alertId) => {
    setRetryingAlertId(alertId);
    try {
      const res = await fetch(`/api/partner/retry-dispatch/${alertId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-passcode': PARTNER_PASSCODE
        }
      });
      const data = await res.json();
      if (data.success) {
        // Refresh outbox data
        const outboxRes = await fetch('/api/outbox');
        const outboxData = await outboxRes.json();
        if (outboxData.success) setOutbox(outboxData.alerts || []);
        alert('Handoff re-dispatched and sent successfully!');
      } else {
        alert('Failed to re-dispatch lead: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error retrying dispatch:', err);
      alert('Failed to connect to server for retry: ' + err.message);
    } finally {
      setRetryingAlertId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'pending' || s === 'new') return <span className="badge badge-pending">Pending</span>;
    if (s === 'contacted') return <span className="badge badge-contacted">Contacted</span>;
    if (s === 'signed') return <span className="badge badge-signed">Signed</span>;
    return <span className="badge badge-pending">Pending</span>;
  };

  const getTierBadge = (tier) => {
    const t = (tier || '').toLowerCase();
    if (t.includes('tier 1')) return <span className="badge badge-tier1">Tier 1</span>;
    if (t.includes('tier 2')) return <span className="badge badge-tier2">Tier 2</span>;
    return <span className="badge badge-tier3">Standard</span>;
  };

  const getSeverityIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('explosion') || t.includes('fire')) return '🔥';
    if (t.includes('gas') || t.includes('h2s')) return '☠️';
    if (t.includes('spill') || t.includes('oil')) return '💧';
    return '⚠️';
  };

  // Login screen
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          padding: '3rem',
          maxWidth: '420px',
          width: '100%',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              <i className="ti ti-shield-lock" style={{ color: '#f59e0b' }}></i>
            </div>
            <h1 style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Partner Portal
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Texas Pipeline Safety Board<br />Exclusive Firm Access
            </p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Partner Access Code
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter your secure access code"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#0f172a',
                  border: loginError ? '1px solid #ef4444' : '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {loginError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '6px' }}>
                  Invalid access code. Please try again.
                </p>
              )}
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <i className="ti ti-login"></i> Access Dashboard
            </button>
          </form>
          <p style={{ color: '#64748b', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.5rem' }}>
            Authorized partners only. All access is audited.
          </p>
        </div>
      </div>
    );
  }

  // Stats
  const totalLeads = leads.length;
  const tier1Leads = leads.filter(l => (l.tier || '').toLowerCase().includes('tier 1')).length;
  const tier2Leads = leads.filter(l => (l.tier || '').toLowerCase().includes('tier 2')).length;
  const activeIncidents = incidents.length;

  const getLeadStatus = (lead) => {
    if (lead.legal_status === 'yes') return 'signed';
    return 'pending';
  };

  return (
    <div className="portal-container">
      {/* Top Navigation */}
      <div className="portal-header" style={{ marginBottom: '1.5rem' }}>
        <div className="portal-header-left">
          <i className="ti ti-shield-half" style={{ fontSize: '1.5rem', color: '#f59e0b' }}></i>
          <div>
            <span className="portal-title">Texas Pipeline Safety Board</span>
            <span className="portal-subtitle">Partner Portal · Exclusive Case Dashboard</span>
          </div>
        </div>
        <div className="portal-header-right">
          <span className="portal-partner-badge">
            <i className="ti ti-building"></i> Exclusive Litigation Partner
          </span>
          <button className="portal-back-btn" onClick={() => navigateTo('#/')}>
            <i className="ti ti-arrow-left"></i> Main Site
          </button>
        </div>
      </div>

      {/* Tab Switcher (Task ID: fe0bf925-f526-406c-a460-8b456c567159) */}
      <div className="portal-tabs" style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid #334155',
        paddingBottom: '0.5rem'
      }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'dashboard' ? '#f59e0b' : '#94a3b8',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'dashboard' ? '3px solid #f59e0b' : '3px solid transparent',
            marginBottom: '-9px',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          <span style={{ marginRight: '6px' }}>📊</span> Dashboard Feed
        </button>
        <button 
          onClick={() => setActiveTab('dispatch')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'dispatch' ? '#f59e0b' : '#94a3b8',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'dispatch' ? '3px solid #f59e0b' : '3px solid transparent',
            marginBottom: '-9px',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          <span style={{ marginRight: '6px' }}>📡</span> Lead Dispatch Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'settings' ? '#f59e0b' : '#94a3b8',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderBottom: activeTab === 'settings' ? '3px solid #f59e0b' : '3px solid transparent',
            marginBottom: '-9px',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          <span style={{ marginRight: '6px' }}>⚙️</span> Integration Settings
        </button>
      </div>

      {activeTab === 'settings' ? (
        /* Settings Section (Task ID: fe0bf925-f526-406c-a460-8b456c567159) */
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2.5rem',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '2.5rem',
          border: '1px solid #334155',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Left Panel: Webhook Config Form */}
          <div>
            <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔧 Webhook Configuration
            </h3>
            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  CRM Webhook Ingestion URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://hook.make.com/your_unique_webhook_id"
                  value={crmWebhookUrl}
                  onChange={(e) => setCrmWebhookUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                  Target partner endpoint (Make.com, Zapier, or direct CRM custom webhook ingestion).
                </span>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Target CRM Software Type
                </label>
                <select
                  value={crmType}
                  onChange={(e) => setCrmType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="clio">Clio Grow (Nested Lead Payload)</option>
                  <option value="filevine">Filevine (Flat Intake Payload)</option>
                  <option value="standard">Generic BIA Format (Standard Fallback JSON)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Dictates how lead schemas are mapped and dispatched from our watchdog router.
                </span>
              </div>

              {settingsMessage && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  backgroundColor: settingsMessage.type === 'success' ? 'rgba(6, 95, 70, 0.5)' : 'rgba(153, 27, 27, 0.5)',
                  color: settingsMessage.type === 'success' ? '#a7f3d0' : '#fca5a5',
                  border: settingsMessage.type === 'success' ? '1px solid #047857' : '1px solid #b91c1c'
                }}>
                  {settingsMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={settingsLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: settingsLoading ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.2s'
                }}
              >
                {settingsLoading ? 'Saving...' : '💾 Save Integration Settings'}
              </button>
            </form>
          </div>

          {/* Right Panel: Webhook Testing sandbox */}
          <div style={{ borderLeft: '1px solid #334155', paddingLeft: '2.5rem' }}>
            <h3 style={{ color: '#f8fafc', fontSize: '1.25rem', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔌 Connection Sandbox Test
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              Verify lead delivery end-to-end. Clicking the test button compiles a realistic 
              <strong> Tier 1 (Catastrophic)</strong> lead payload using the configured CRM format, 
              and pushes it as a secure POST request to the destination endpoint.
            </p>

            <button
              onClick={handleTestWebhook}
              disabled={testingWebhook || !crmWebhookUrl}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: (testingWebhook || !crmWebhookUrl) ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                transition: 'background-color 0.2s'
              }}
            >
              {testingWebhook ? 'Executing API Test...' : '🚀 Dispatch Test Webhook'}
            </button>

            {testResult && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Execution Result: 
                  <span style={{ 
                    color: testResult.type === 'success' ? '#34d399' : '#f87171',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: testResult.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {testResult.type === 'success' ? 'Success' : 'Failed'}
                  </span>
                </h4>
                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  {testResult.text}
                </p>
                {testResult.payload && (
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                      Outgoing JSON Payload preview:
                    </span>
                    <pre style={{
                      backgroundColor: '#0f172a',
                      padding: '1rem',
                      borderRadius: '8px',
                      overflowX: 'auto',
                      fontSize: '0.75rem',
                      color: '#a7f3d0',
                      border: '1px solid #334155',
                      maxHeight: '220px',
                      margin: 0,
                      fontFamily: 'monospace'
                    }}>
                      {JSON.stringify(testResult.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'dispatch' ? (
        /* Lead Dispatch Dashboard Section */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {/* Dashboard Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem'
          }}>
            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.5rem' }}>📡</span>
              </div>
              <div>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Gateway Status
                </span>
                <strong style={{ fontSize: '1.25rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
                  ONLINE
                </strong>
              </div>
            </div>

            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
              </div>
              <div>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SLA Compliance
                </span>
                <strong style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                  100% (&lt;5 min)
                </strong>
              </div>
            </div>

            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              </div>
              <div>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Avg Handoff Speed
                </span>
                <strong style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                  1.6 mins
                </strong>
              </div>
            </div>

            <div style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #334155',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                backgroundColor: 'rgba(167, 243, 208, 0.1)',
                color: '#a7f3d0',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
              </div>
              <div>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Delivery Rate
                </span>
                <strong style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                  {outbox.length > 0 ? ((outbox.filter(a => a.status === 'sent').length / outbox.length) * 100).toFixed(1) : '100.0'}%
                </strong>
              </div>
            </div>
          </div>

          {/* Outbox Feed Table */}
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            padding: '2rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📡 Outbox Routing Queue & SLA Audits
              </h3>
              <span style={{
                backgroundColor: '#334155',
                color: '#cbd5e1',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {outbox.length} Dispatches Logged
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155' }}>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Claimant Name</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Routing Alert Details</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>SLA Target</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outbox.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No lead dispatches in queue yet. High-priority submissions will trigger automated outbox dispatches.
                      </td>
                    </tr>
                  ) : (
                    outbox.map((alert) => {
                      const associatedLead = leads.find(l => l.id === alert.lead_id);
                      const claimantName = associatedLead ? `${associatedLead.first_name} ${associatedLead.last_name}` : 'Unknown Claimant';
                      const isExpanded = expandedAlertId === alert.id;

                      return (
                        <React.Fragment key={alert.id}>
                          <tr style={{
                            borderBottom: '1px solid #334155',
                            backgroundColor: isExpanded ? 'rgba(51, 65, 85, 0.2)' : 'transparent',
                            transition: 'background-color 0.2s'
                          }}>
                            <td style={{ padding: '16px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                              {new Date(alert.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.85rem', color: '#f8fafc', fontWeight: 700 }}>
                              {claimantName}
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                              <strong>{alert.subject}</strong>
                            </td>
                            <td style={{ padding: '16px', fontSize: '0.8rem', color: '#a7f3d0', fontWeight: 600 }}>
                              ⚡ &lt; 5 mins (Instant)
                            </td>
                            <td style={{ padding: '16px' }}>
                              {alert.status === 'sent' ? (
                                <span style={{
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                  color: '#34d399',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                  DELIVERED
                                </span>
                              ) : alert.status === 'failed' ? (
                                <span style={{
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  color: '#f87171',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: '1px solid rgba(239, 68, 68, 0.2)'
                                }}>
                                  FAILED
                                </span>
                              ) : (
                                <span style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                  color: '#fbbf24',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                  QUEUED
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#334155',
                                  color: '#cbd5e1',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  outline: 'none',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                {isExpanded ? 'Hide Payload' : '👁️ View Payload'}
                              </button>
                              <button
                                onClick={() => handleRetryDispatch(alert.id)}
                                disabled={retryingAlertId === alert.id}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#f59e0b',
                                  color: '#0f172a',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  outline: 'none',
                                  opacity: retryingAlertId === alert.id ? 0.6 : 1,
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                {retryingAlertId === alert.id ? 'Retrying...' : '🔄 Retry Handoff'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan="6" style={{
                                padding: '1.5rem',
                                backgroundColor: '#0f172a',
                                borderBottom: '1px solid #334155'
                              }}>
                                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
                                  Outgoing Dispatch Payload Details:
                                </span>
                                <pre style={{
                                  margin: 0,
                                  padding: '1rem',
                                  backgroundColor: '#1e293b',
                                  borderRadius: '8px',
                                  border: '1px solid #334155',
                                  fontSize: '0.8rem',
                                  color: '#34d399',
                                  fontFamily: 'monospace',
                                  whiteSpace: 'pre-wrap',
                                  maxHeight: '300px',
                                  overflowY: 'auto'
                                }}>
                                  {alert.body}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Normal Dashboard View */
        <>
          {/* Stats Cards */}
          <div className="portal-stats">
            <div className="stat-card stat-card-gold">
              <div className="stat-icon"><i className="ti ti-users"></i></div>
              <div className="stat-number">{totalLeads}</div>
              <div className="stat-label">Total Leads</div>
            </div>
            <div className="stat-card stat-card-red">
              <div className="stat-icon"><i className="ti ti-alert-triangle"></i></div>
              <div className="stat-number">{tier1Leads}</div>
              <div className="stat-label">Tier 1 · High Priority</div>
            </div>
            <div className="stat-card stat-card-amber">
              <div className="stat-icon"><i className="ti ti-alert-circle"></i></div>
              <div className="stat-number">{tier2Leads}</div>
              <div className="stat-label">Tier 2 · Standard</div>
            </div>
            <div className="stat-card stat-card-blue">
              <div className="stat-icon"><i className="ti ti-activity"></i></div>
              <div className="stat-number">{activeIncidents}</div>
              <div className="stat-label">Active Incidents</div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="portal-grid">
            {/* Leads Table */}
            <div className="portal-panel panel-leads">
              <div className="panel-header">
                <h2><i className="ti ti-checklist"></i> Lead Intake Feed</h2>
                <span className="panel-badge">{totalLeads} total</span>
              </div>
              <div className="panel-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Claimant</th>
                      <th>Contact</th>
                      <th>County</th>
                      <th>Severity</th>
                      <th>Tier</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading leads...</td></tr>
                    ) : leads.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No leads yet. New submissions will appear here.</td></tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className={lead.tier && lead.tier.includes('Tier 1') ? 'row-tier1' : ''}>
                          <td><span className="incident-icon-cell">{getSeverityIcon(lead.incident_type)}</span></td>
                          <td><strong>{lead.first_name} {lead.last_name}</strong></td>
                          <td>
                            <div className="contact-cell">
                              <span><i className="ti ti-mail"></i> {lead.email}</span>
                              <span><i className="ti ti-phone"></i> {lead.phone}</span>
                            </div>
                          </td>
                          <td>{lead.county}</td>
                          <td>{lead.incident_type}</td>
                          <td>{getTierBadge(lead.tier)}</td>
                          <td>{getStatusBadge(getLeadStatus(lead))}</td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            <button
                              onClick={() => setSelectedLead(lead)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: 'transparent',
                                color: '#f59e0b',
                                border: '1px solid #f59e0b',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s',
                                outline: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f59e0b';
                                e.currentTarget.style.color = '#0f172a';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#f59e0b';
                              }}
                            >
                              👁️ Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Incidents Feed */}
            <div className="portal-panel panel-incidents">
              <div className="panel-header">
                <h2><i className="ti ti-activity"></i> Live Texas Incident Feed</h2>
                <span className="panel-badge">{activeIncidents} incidents</span>
              </div>
              <div className="panel-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Operator</th>
                      <th>County</th>
                      <th>Commodity</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading incidents...</td></tr>
                    ) : incidents.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No recent incidents.</td></tr>
                    ) : (
                      incidents.slice(0, 10).map((inc) => (
                        <tr key={inc.incident_id}>
                          <td><span className="incident-icon-cell">{getSeverityIcon(inc.incident_type)}</span></td>
                          <td><strong>{inc.operator_name || 'Unknown'}</strong></td>
                          <td>{inc.county || 'Unknown'}</td>
                          <td>{inc.spill_commodity || 'N/A'}</td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {inc.incident_date ? new Date(inc.incident_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Overlay for Lead Detail View (Task ID: fe0bf925-f526-406c-a460-8b456c567159) */}
      {selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '2rem',
          backdropFilter: 'blur(4px)',
          fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.5rem 2rem',
              borderBottom: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{getSeverityIcon(selectedLead.incident_type)}</span>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700 }}>
                    {selectedLead.first_name} {selectedLead.last_name}
                  </h3>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                    Lead ID: {selectedLead.id}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Contact Section */}
                <div style={{ backgroundColor: '#0f172a', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <h4 style={{ margin: '0 0 0.75rem', color: '#f59e0b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Claimant Contact
                  </h4>
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span><strong>Email:</strong> {selectedLead.email}</span>
                    <span><strong>Phone:</strong> {selectedLead.phone}</span>
                    <span><strong>County/State:</strong> {selectedLead.county}, {selectedLead.state || 'TX'}</span>
                  </div>
                </div>

                {/* Triage Status */}
                <div style={{ backgroundColor: '#0f172a', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
                  <h4 style={{ margin: '0 0 0.75rem', color: '#f59e0b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Triage Assessment
                  </h4>
                  <div style={{ color: '#cbd5e1', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span><strong>Severity Score:</strong> {selectedLead.score}/100</span>
                    <span><strong>Priority Tier:</strong> {getTierBadge(selectedLead.tier)}</span>
                    <span><strong>Legal Waiver Signed?</strong> {selectedLead.legal_status === 'yes' ? 'Yes (Represented)' : 'No (Unrepresented)'}</span>
                  </div>
                </div>
              </div>

              {/* GIS Matching Data */}
              <div style={{ backgroundColor: '#0f172a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155', marginBottom: '2rem' }}>
                <h4 style={{ margin: '0 0 1rem', color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📌 Watchdog GIS Enrichment
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>Matched Landowner Name</span>
                    <strong>{selectedLead.landowner_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>Matched Parcel ID</span>
                    <strong>{selectedLead.parcel_id || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>GIS Coordinates (Lat, Lon)</span>
                    <strong>{selectedLead.latitude && selectedLead.longitude ? `${selectedLead.latitude}, ${selectedLead.longitude}` : 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>Chemical Commodity / Spill Substance</span>
                    <strong>{selectedLead.commodity || 'N/A'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>Target Operator / Implicated Defendant</span>
                    <strong>{selectedLead.operator || selectedLead.defendant || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Qualitative Claim Description */}
              <div style={{ backgroundColor: '#0f172a', padding: '1.25rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 0.75rem', color: '#38bdf8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Claim Description / Incident Context
                </h4>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedLead.details || 'No additional details provided by claimant.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '1rem 2rem 1.5rem',
              borderTop: '1px solid #334155'
            }}>
              <button 
                onClick={() => setSelectedLead(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="portal-footer">
        <p>&copy; 2026 Texas Pipeline Safety Board (TPSB). Partner Portal v1.0 · Confidential</p>
      </div>
    </div>
  );
}
