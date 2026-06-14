const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built static assets from Vite
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize Local SQLite Database for Lead Logging
const dbPath = path.join(__dirname, 'leads.db');
const db = new Database(dbPath);

// Force clean, full production schema for leads and outbox
db.exec(`
  DROP TABLE IF EXISTS outbox;
  DROP TABLE IF EXISTS leads;

  CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    incident_type TEXT NOT NULL,
    role TEXT NOT NULL,
    severity TEXT NOT NULL,
    defendant TEXT,
    legal_status TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    county TEXT NOT NULL,
    state TEXT NOT NULL,
    details TEXT,
    score INTEGER NOT NULL,
    tier TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    commodity TEXT,
    operator TEXT,
    parcel_id TEXT,
    landowner_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE outbox (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
`);

// Simple custom ID generator in case crypto fails
function generateId() {
  try {
    return randomUUID();
  } catch (err) {
    return 'bia_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }
}

// Lead Scoring and Triage Algorithm
function calculateLeadScore(lead) {
  let score = 0;
  
  // 1. Evaluate Incident Type (Max: 30)
  switch (lead.incidentType) {
    case 'explosion':
      score += 30; // High immediate danger, catastrophic potential
      break;
    case 'leak':
      score += 25; // Silent killer, sour H2S gas high medical risk
      break;
    case 'spill':
      score += 20; // Major landowner property damage / saltwater soil sterilizing
      break;
    case 'water':
      score += 15; // Slow-burn toxic groundwater contamination
      break;
    default:
      score += 5;
  }

  // 2. Evaluate Role (Max: 20)
  switch (lead.role) {
    case 'worker':
      score += 20; // Direct workplace liability / high OSHA coverage
      break;
    case 'landowner':
      score += 15; // Direct property title damage, long-term high-value claimant
      break;
    case 'resident':
      score += 12; // Environmental neighborhood exposure
      break;
    case 'responder':
      score += 10; // First responder toxic inhalation
      break;
    default:
      score += 5;
  }

  // 3. Evaluate Injury / Severity (Max: 40)
  switch (lead.severity) {
    case 'fatality':
      score += 40; // Max value: Wrongful death claims ($1M to $10M+)
      break;
    case 'burns':
      score += 35; // High value: Severe physical trauma / thermal burns
      break;
    case 'hospital':
      score += 25; // Moderate-High value: ICU and clinical respiratory admissions
      break;
    case 'property':
      score += 15; // Medium value: Farmland sterilization, dead cattle, water well benzene
      break;
    default:
      score += 0;
  }

  // 4. Evaluate Legal Hurdles (Disqualification Factor)
  // If represented or signed waiver, lead utility is severely damaged (scored to 0-19 range)
  if (lead.legalStatus === 'yes') {
    return {
      score: Math.min(score, 15),
      tier: 'Tier 4 (Disqualified)'
    };
  }

  // 5. Assign Priority Tiers based on finalized score
  let tier = 'Tier 3 (Moderate Property)';
  if (score >= 80) {
    tier = 'Tier 1 (Catastrophic)';
  } else if (score >= 50) {
    tier = 'Tier 2 (Severe)';
  } else if (score < 20) {
    tier = 'Tier 4 (Disqualified)';
  }

  return { score, tier };
}

// Function to dynamically load partner config (Task ID: 3efe8f4a-793a-4f6a-8d67-c1613c081ba7)
function getPartnerConfig() {
  const configPath = path.join(__dirname, 'partner_config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.error('[CONFIG ERROR] Failed to load partner_config.json:', err.message);
  }
  return {
    partner_name: "[PARTNER_FIRM_NAME]",
    crm_type: "clio",
    crm_webhook_url: "https://hook.make.com/your_unique_webhook_id"
  };
}

// API Route for Lead Triage & Submission
app.post('/api/submit', (req, res) => {
  const {
    incidentType,
    role,
    severity,
    defendant,
    legalStatus,
    firstName,
    lastName,
    email,
    phone,
    county,
    state,
    details,
    // GIS matching & Enrichment parameters (Onboarding requirement)
    latitude,
    longitude,
    commodity,
    operator,
    parcelId,
    landownerName
  } = req.body;

  // Basic Server-Side Validation
  if (!incidentType || !role || !severity || !legalStatus || !firstName || !lastName || !email || !phone || !county || !state) {
    return res.status(400).json({
      success: false,
      message: 'Missing required triage fields. Please complete all required form sections.'
    });
  }

  try {
    const leadId = generateId();
    const { score, tier } = calculateLeadScore(req.body);

    // Insert lead with full GIS match & enrichment parameters into SQLite Leads table
    const stmt = db.prepare(`
      INSERT INTO leads (
        id, incident_type, role, severity, defendant, legal_status,
        first_name, last_name, email, phone, county, state, details, score, tier,
        latitude, longitude, commodity, operator, parcel_id, landowner_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      leadId,
      incidentType,
      role,
      severity,
      defendant || '',
      legalStatus,
      firstName,
      lastName,
      email,
      phone,
      county,
      state,
      details || '',
      score,
      tier,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      commodity || '',
      operator || defendant || '',
      parcelId || '',
      landownerName || ''
    );

    console.log(`[LEAD LOGGED] ID: ${leadId} | Name: ${firstName} ${lastName} | Tier: ${tier} | Score: ${score}`);

    // Lead hand-off and alert automation
    if (tier === 'Tier 1 (Catastrophic)' || tier === 'Tier 2 (Severe)') {
      const alertId = generateId();
      const recipient = 'intake@basinincident.com';
      const subject = `[BIA ALERT] High-Priority ${tier} Lead - ${county}, ${state}`;
      const body = `
============================================================
BIA TRIACTOR NOTIFICATION GATEWAY (AUTOMATED HANDOFF)
============================================================
Priority Triage Bracket: ${tier}
Incident Score: ${score}/100
Timestamp: ${new Date().toISOString()}

CLAIMANT DETAILS:
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Location: ${county}, ${state}

INCIDENT DETAILS:
Incident Type: ${incidentType.toUpperCase()}
Role / Relationship: ${role.toUpperCase()}
Severity: ${severity.toUpperCase()}
Target Operator: ${operator || defendant || 'UNKNOWN'}
Legal Status: ${legalStatus === 'yes' ? 'HAS ATTORNEY / SIGNED RELEASE' : 'NO ATTORNEY / NO RELEASES SIGNED'}

GIS MATCH & ENRICHMENT DATA:
Parcel ID: ${parcelId || 'N/A'}
Landowner Name: ${landownerName || 'N/A'}
Coordinates: ${latitude || 'N/A'}, ${longitude || 'N/A'}
Chemical Commodity: ${commodity || 'N/A'}

Description:
${details || 'No description provided.'}

============================================================
This lead has been durably logged and queued for instant push
to exclusive territory attorney retainers.
============================================================
      `.trim();

      const outboxStmt = db.prepare(`
        INSERT INTO outbox (id, lead_id, recipient_email, subject, body, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      outboxStmt.run(alertId, leadId, recipient, subject, body, 'pending');
      console.log(`[ALERT QUEUED] Outbox Alert ID: ${alertId} | Recipient: ${recipient} | Subject: ${subject}`);

      // Dynamic CRM Webhook Selection (Task ID: 3efe8f4a-793a-4f6a-8d67-c1613c081ba7)
      const config = getPartnerConfig();
      const webhookUrl = process.env.PARTNER_CRM_WEBHOOK_URL || config.crm_webhook_url;
      const crmType = (process.env.PARTNER_CRM_TYPE || config.crm_type || 'standard').toLowerCase();

      let payload = {};

      if (crmType === 'clio') {
        payload = {
          lead: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            message: `Landowner reports pipeline incident. Details: ${details || 'No description provided.'}`,
            custom_fields: {
              "Incident County": county + (state ? `, ${state}` : ''),
              "Incident State": state || 'TX',
              "Incident Latitude": latitude ? parseFloat(latitude) : null,
              "Incident Longitude": longitude ? parseFloat(longitude) : null,
              "Chemical Commodity": commodity || incidentType,
              "Target Operator": operator || defendant || 'UNKNOWN',
              "Incident Severity": tier,
              "Triage Score": score,
              "GIS Parcel ID": parcelId || 'N/A',
              "Registered Landowner": landownerName || `${firstName} ${lastName}`,
              "Landowner Relationship": role,
              "Legal Status": legalStatus === 'yes' ? 'HAS ATTORNEY / SIGNED RELEASE' : 'NO ATTORNEY / NO RELEASES SIGNED'
            }
          }
        };
      } else if (crmType === 'filevine') {
        payload = {
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          notes: `Rupture/Spill reported. Details: ${details || 'No description provided.'}`,
          county: county,
          state: state || 'TX',
          customFields: {
            parcelId: parcelId || 'N/A',
            landownerName: landownerName || `${firstName} ${lastName}`,
            relationship: role,
            incidentLatitude: latitude ? parseFloat(latitude) : null,
            incidentLongitude: longitude ? parseFloat(longitude) : null,
            spilledCommodity: commodity || incidentType,
            targetOperator: operator || defendant || 'UNKNOWN',
            triageScore: score,
            triageTier: tier,
            legalStatus: legalStatus === 'yes' ? 'HAS ATTORNEY / SIGNED RELEASE' : 'NO ATTORNEY / NO RELEASES SIGNED',
            incidentDetails: details || 'No description provided.'
          }
        };
      } else {
        // Standard white-label fallback format
        payload = {
          alertId,
          leadId,
          tier,
          score,
          firstName,
          lastName,
          email,
          phone,
          county,
          state,
          incidentType,
          role,
          severity,
          defendant: operator || defendant || 'UNKNOWN',
          legalStatus,
          details,
          gisMatch: {
            parcelId: parcelId || 'N/A',
            landownerName: landownerName || 'N/A',
            latitude: latitude || null,
            longitude: longitude || null,
            commodity: commodity || 'N/A'
          },
          timestamp: new Date().toISOString()
        };
      }

      console.log(`[CRM PUSH] Dispatching formatted payload for [${crmType.toUpperCase()}] to CRM Webhook...`);

      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(response => {
        console.log(`[WEBHOOK SENT] CRM Webhook responded with status: ${response.status}`);
        if (response.ok) {
          const updateStmt = db.prepare("UPDATE outbox SET status = 'sent' WHERE id = ?");
          updateStmt.run(alertId);
          console.log(`[OUTBOX UPDATED] Alert ID: ${alertId} status set to 'sent'`);
        } else {
          const updateStmt = db.prepare("UPDATE outbox SET status = 'failed' WHERE id = ?");
          updateStmt.run(alertId);
          console.log(`[OUTBOX UPDATED] Alert ID: ${alertId} status set to 'failed' (response status: ${response.status})`);
        }
      })
      .catch(webhookErr => {
        console.error(`[WEBHOOK ERROR] Failed to push to CRM Webhook:`, webhookErr.message);
        const updateStmt = db.prepare("UPDATE outbox SET status = 'failed' WHERE id = ?");
        updateStmt.run(alertId);
        console.log(`[OUTBOX UPDATED] Alert ID: ${alertId} status set to 'failed' due to network error`);
      });
    }

    res.json({
      success: true,
      leadId,
      score,
      tier,
      message: 'Claim triage evaluation completed successfully.'
    });

  } catch (err) {
    console.error('Database write error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal safety gateway error. Unable to register lead in durable storage.'
    });
  }
});

// Middleware to secure partner config endpoints (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
const verifyPasscode = (req, res, next) => {
  const passcode = req.headers['x-passcode'] || req.query.passcode || (req.body && req.body.passcode);
  if (passcode !== 'txpsb2026') {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid access passcode.' });
  }
  next();
};

// GET Route to fetch the partner configuration (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
app.get('/api/partner/config', verifyPasscode, (req, res) => {
  try {
    const config = getPartnerConfig();
    res.json({ success: true, config });
  } catch (err) {
    console.error('Error fetching partner config:', err);
    res.status(500).json({ success: false, message: 'Failed to read partner configuration.' });
  }
});

// POST Route to update partner configuration (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
app.post('/api/partner/config', verifyPasscode, (req, res) => {
  const { crm_webhook_url, crm_type, partner_name } = req.body;

  if (!crm_webhook_url || !crm_type) {
    return res.status(400).json({ success: false, message: 'Missing required configuration fields.' });
  }

  try {
    const configPath = path.join(__dirname, 'partner_config.json');
    let currentConfig = {};
    if (fs.existsSync(configPath)) {
      currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    const newConfig = {
      partner_name: partner_name || currentConfig.partner_name || "[PARTNER_FIRM_NAME]",
      crm_type: crm_type.toLowerCase(),
      crm_webhook_url: crm_webhook_url
    };

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf8');
    res.json({ success: true, message: 'Configuration saved successfully.', config: newConfig });
  } catch (err) {
    console.error('Error saving partner config:', err);
    res.status(500).json({ success: false, message: 'Failed to save partner configuration.' });
  }
});

// POST Route to test partner CRM Webhook with a sample payload (Task ID: fe0bf925-f526-406c-a460-8b456c567159)
app.post('/api/partner/test-webhook', verifyPasscode, async (req, res) => {
  try {
    const config = getPartnerConfig();
    const webhookUrl = config.crm_webhook_url;
    const crmType = (config.crm_type || 'standard').toLowerCase();

    if (!webhookUrl || webhookUrl.includes('your_unique_webhook_id') || webhookUrl === '') {
      return res.status(400).json({ success: false, message: 'Please configure a valid webhook URL before testing.' });
    }

    let payload = {};

    // Mock high-fidelity lead data for the test payload
    const testData = {
      firstName: "Marcus",
      lastName: "Reyes",
      email: "mreyes88@gmail.com",
      phone: "+14325550198",
      county: "Reeves County",
      state: "TX",
      incidentType: "explosion",
      role: "resident",
      severity: "burns",
      defendant: "Midstream Operator Corp",
      legalStatus: "no",
      details: "Gas line blast near home caused structural fire and severe thermal burns. Transported to ICU.",
      latitude: "31.4192",
      longitude: "-103.4932",
      commodity: "Natural Gas",
      operator: "Midstream Operator Corp",
      parcelId: "R000099882",
      landownerName: "Marcus Reyes Properties LLC",
      tier: "Tier 1 (Catastrophic)",
      score: 95,
      alertId: "test_alert_" + Math.random().toString(36).substr(2, 9),
      leadId: "test_lead_" + Math.random().toString(36).substr(2, 9)
    };

    if (crmType === 'clio') {
      payload = {
        lead: {
          first_name: testData.firstName,
          last_name: testData.lastName,
          email: testData.email,
          phone: testData.phone,
          message: `TEST WEBHOOK - Landowner reports pipeline incident. Details: ${testData.details}`,
          custom_fields: {
            "Incident County": testData.county + ", " + testData.state,
            "Incident State": testData.state,
            "Incident Latitude": parseFloat(testData.latitude),
            "Incident Longitude": parseFloat(testData.longitude),
            "Chemical Commodity": testData.commodity,
            "Target Operator": testData.operator,
            "Incident Severity": testData.tier,
            "Triage Score": testData.score,
            "GIS Parcel ID": testData.parcelId,
            "Registered Landowner": testData.landownerName,
            "Landowner Relationship": testData.role,
            "Legal Status": "NO ATTORNEY / NO RELEASES SIGNED"
          }
        }
      };
    } else if (crmType === 'filevine') {
      payload = {
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        phone: testData.phone,
        notes: `TEST WEBHOOK - Rupture/Spill reported. Details: ${testData.details}`,
        county: testData.county,
        state: testData.state,
        customFields: {
          parcelId: testData.parcelId,
          landownerName: testData.landownerName,
          relationship: testData.role,
          incidentLatitude: parseFloat(testData.latitude),
          incidentLongitude: parseFloat(testData.longitude),
          spilledCommodity: testData.commodity,
          targetOperator: testData.operator,
          triageScore: testData.score,
          triageTier: testData.tier,
          legalStatus: "NO ATTORNEY / NO RELEASES SIGNED",
          incidentDetails: testData.details
        }
      };
    } else {
      // Standard Generic BIA format (Standard fallback)
      payload = {
        alertId: testData.alertId,
        leadId: testData.leadId,
        tier: testData.tier,
        score: testData.score,
        firstName: testData.firstName,
        lastName: testData.lastName,
        email: testData.email,
        phone: testData.phone,
        county: testData.county,
        state: testData.state,
        incidentType: testData.incidentType,
        role: testData.role,
        severity: testData.severity,
        defendant: testData.defendant,
        legalStatus: testData.legalStatus,
        details: "TEST WEBHOOK - " + testData.details,
        gisMatch: {
          parcelId: testData.parcelId,
          landownerName: testData.landownerName,
          latitude: parseFloat(testData.latitude),
          longitude: parseFloat(testData.longitude),
          commodity: testData.commodity
        },
        timestamp: new Date().toISOString()
      };
    }

    console.log(`[TEST CRM PUSH] Sending test webhook for [${crmType.toUpperCase()}] to CRM Webhook: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      res.json({ success: true, message: `Test webhook successfully received with status ${response.status}`, payload });
    } else {
      res.status(response.status).json({ success: false, message: `CRM webhook responded with error status: ${response.status}`, payload });
    }
  } catch (err) {
    console.error('Error sending test webhook:', err);
    res.status(500).json({ success: false, message: 'Failed to dispatch test webhook payload: ' + err.message });
  }
});

// GET Route to list leads (for B2B attorney portal audits)
app.get('/api/leads', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
    const leads = stmt.all();
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    console.error('Database read error:', err);
    res.status(500).json({ success: false, message: 'Database read failure.' });
  }
});

// GET Route to list live scraper-fed incidents (Task ID: d2975342-5bdb-4453-add3-2ac1bfeaf4b7)
app.get('/api/incidents', (req, res) => {
  let incDb;
  try {
    const incidentsDbPath = '/home/team/shared/incidents.db';
    incDb = new Database(incidentsDbPath, { readonly: true });
    
    const stmt = incDb.prepare(`
      SELECT id, agency, operator, incident_date, location_raw, latitude, longitude, commodity, volume_released, unit, severity_score, raw_data_json 
      FROM incidents 
      ORDER BY incident_date DESC 
      LIMIT 100
    `);
    
    const rows = stmt.all();
    
    const mapped = rows.map(row => {
      let county = 'Unknown County';
      let state = 'TX';
      let nearest_roads = row.location_raw ? row.location_raw.trim() : 'N/A';
      
      try {
        if (row.raw_data_json) {
          const parsed = JSON.parse(row.raw_data_json);
          if (parsed.CountyName) {
            county = parsed.CountyName.trim();
          }
          if (parsed.State) {
            state = parsed.State.trim();
          }
          if (parsed.Remarks && (nearest_roads === 'N/A' || nearest_roads === '')) {
            nearest_roads = parsed.Remarks.trim();
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      // Determine user-friendly incident type
      let incident_type = 'Pipeline Incident';
      if (row.commodity) {
        const comm = row.commodity.toLowerCase();
        if (comm.includes('crude') || comm.includes('oil') || comm.includes('water') || comm.includes('condensate') || comm.includes('saltwater')) {
          incident_type = 'Oil & Saltwater Spill';
        } else if (comm.includes('gas') || comm.includes('h2s') || comm.includes('sour') || comm.includes('natural gas')) {
          incident_type = 'H₂S Gas Leak';
        } else {
          incident_type = 'Pipeline Rupture';
        }
      }
      
      if (row.agency === 'PHMSA') {
        if (row.severity_score >= 3) {
          incident_type = 'Pipeline Explosion';
        }
      }
      
      return {
        incident_id: row.id,
        county,
        state,
        incident_type,
        spill_commodity: row.commodity,
        spill_volume_raw: row.volume_released,
        spill_units: row.unit,
        operator_name: row.operator,
        nearest_roads,
        regulatory_ref: `${row.agency}-${row.id.substring(0, 8).toUpperCase()}`,
        source_agency: row.agency,
        incident_date: row.incident_date
      };
    });
    
    res.json({
      success: true,
      count: mapped.length,
      incidents: mapped
    });
  } catch (err) {
    console.error('Error fetching incidents from shared db:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve live incident logs from shared repository.'
    });
  } finally {
    if (incDb) {
      try {
        incDb.close();
      } catch (e) {
        console.error('Error closing incidents db connection:', e);
      }
    }
  }
});

// GET Route to list queued routing alerts (Task ID: 469c97b4-16b8-41d6-90b4-0617e2ea12a6)
app.get('/api/outbox', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM outbox ORDER BY created_at DESC');
    const alerts = stmt.all();
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    console.error('Database read error:', err);
    res.status(500).json({ success: false, message: 'Outbox read failure.' });
  }
});

// POST Route to retry a failed/pending outbox dispatch
app.post('/api/partner/retry-dispatch/:id', verifyPasscode, async (req, res) => {
  const alertId = req.params.id;
  try {
    const stmt = db.prepare('SELECT * FROM outbox WHERE id = ?');
    const alert = stmt.get(alertId);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert outbox record not found.' });
    }

    // Load current partner config
    const config = getPartnerConfig();
    const webhookUrl = config.crm_webhook_url;
    const crmType = (config.crm_type || 'standard').toLowerCase();

    if (!webhookUrl || webhookUrl.includes('your_unique_webhook_id') || webhookUrl === '') {
      return res.status(400).json({ success: false, message: 'Please configure a valid webhook URL before retrying.' });
    }

    // Fetch the lead associated with this outbox alert
    const leadStmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    const lead = leadStmt.get(alert.lead_id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Associated lead record not found.' });
    }

    // Construct payload based on crmType
    let payload = {};
    if (crmType === 'clio') {
      payload = {
        lead: {
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          phone: lead.phone,
          message: `RETRY DISPATCH - Landowner reports pipeline incident. Details: ${lead.details || 'No description provided.'}`,
          custom_fields: {
            "Incident County": lead.county + (lead.state ? `, ${lead.state}` : ''),
            "Incident State": lead.state || 'TX',
            "Incident Latitude": lead.latitude ? parseFloat(lead.latitude) : null,
            "Incident Longitude": lead.longitude ? parseFloat(lead.longitude) : null,
            "Chemical Commodity": lead.commodity || lead.incident_type,
            "Target Operator": lead.operator || lead.defendant || 'UNKNOWN',
            "Incident Severity": lead.tier,
            "Triage Score": lead.score,
            "GIS Parcel ID": lead.parcel_id || 'N/A',
            "Registered Landowner": lead.landowner_name || `${lead.first_name} ${lead.last_name}`,
            "Landowner Relationship": lead.role,
            "Legal Status": lead.legal_status === 'yes' ? 'HAS ATTORNEY / SIGNED RELEASE' : 'NO ATTORNEY / NO RELEASES SIGNED'
          }
        }
      };
    } else if (crmType === 'filevine') {
      payload = {
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        notes: `RETRY DISPATCH - Rupture/Spill reported. Details: ${lead.details || 'No description provided.'}`,
        county: lead.county,
        state: lead.state || 'TX',
        customFields: {
          parcelId: lead.parcel_id || 'N/A',
          landownerName: lead.landowner_name || `${lead.first_name} ${lead.last_name}`,
          relationship: lead.role,
          incidentLatitude: lead.latitude ? parseFloat(lead.latitude) : null,
          incidentLongitude: lead.longitude ? parseFloat(lead.longitude) : null,
          spilledCommodity: lead.commodity || lead.incident_type,
          targetOperator: lead.operator || lead.defendant || 'UNKNOWN',
          triageScore: lead.score,
          triageTier: lead.tier,
          legalStatus: lead.legal_status === 'yes' ? 'HAS ATTORNEY / SIGNED RELEASE' : 'NO ATTORNEY / NO RELEASES SIGNED',
          incidentDetails: lead.details || 'No description provided.'
        }
      };
    } else {
      payload = {
        alertId: alert.id,
        leadId: lead.id,
        tier: lead.tier,
        score: lead.score,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        county: lead.county,
        state: lead.state,
        incidentType: lead.incident_type,
        role: lead.role,
        severity: lead.severity,
        defendant: lead.operator || lead.defendant || 'UNKNOWN',
        legalStatus: lead.legal_status,
        details: "RETRY DISPATCH - " + lead.details,
        gisMatch: {
          parcelId: lead.parcel_id || 'N/A',
          landownerName: lead.landowner_name || 'N/A',
          latitude: lead.latitude || null,
          longitude: lead.longitude || null,
          commodity: lead.commodity || 'N/A'
        },
        timestamp: new Date().toISOString()
      };
    }

    console.log(`[CRM RETRY PUSH] Retrying dispatch for alert ${alertId} (${crmType.toUpperCase()}) to webhook...`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const updateStmt = db.prepare("UPDATE outbox SET status = 'sent' WHERE id = ?");
      updateStmt.run(alertId);
      console.log(`[CRM RETRY SUCCESS] Webhook sent successfully for alert ${alertId}`);
      return res.json({ success: true, message: 'Alert re-dispatched and sent successfully.' });
    } else {
      const updateStmt = db.prepare("UPDATE outbox SET status = 'failed' WHERE id = ?");
      updateStmt.run(alertId);
      console.log(`[CRM RETRY FAILED] Webhook responded with status: ${response.status} for alert ${alertId}`);
      return res.status(response.status).json({ success: false, message: `CRM webhook responded with error status: ${response.status}` });
    }
  } catch (err) {
    console.error('Error retrying outbox dispatch:', err);
    const updateStmt = db.prepare("UPDATE outbox SET status = 'failed' WHERE id = ?");
    updateStmt.run(alertId);
    res.status(500).json({ success: false, message: 'Failed to re-dispatch alert: ' + err.message });
  }
});

// POST Route to trigger automated direct-mail batch (Task ID: b9181271-e2b6-43dc-af0b-c0ac74804df5)
app.post('/api/partner/trigger-mailers-batch', verifyPasscode, async (req, res) => {
  const isMock = req.body.mock !== false; // Defaults to mock simulation mode
  try {
    const { sendMailersBatch } = require('./send_mailers');
    const results = await sendMailersBatch({ mock: isMock });
    res.json({
      success: true,
      message: `Direct mail batch job initiated successfully.`,
      results
    });
  } catch (err) {
    console.error('[MAILERS BATCH ERROR] Failed to run batch:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate direct-mail batch job: ' + err.message
    });
  }
});

// Mock CRM Webhook Receiver for Sandbox Testing / Offline Reliability
app.post('/api/partner/mock-webhook-receiver', (req, res) => {
  console.log('[MOCK CRM RECEIVER] Received CRM payload:', JSON.stringify(req.body, null, 2));
  res.json({
    success: true,
    message: 'Mock CRM successfully received and accepted the lead payload.',
    received_at: new Date().toISOString()
  });
});

// Fallback all other routes to served built React files (Client-Side routing support)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Bind server to all interfaces ('0.0.0.0' or '::') on port 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`  TEXAS PIPELINE SAFETY BOARD (TPSB) GATEWAY ACTIVE`);
  console.log(`  Server listening on port :${PORT}`);
  console.log(`  Bound to address: 0.0.0.0 (All Interfaces)`);
  console.log(`  Durable local lead log: ${dbPath}`);
  console.log(`===================================================`);
});
