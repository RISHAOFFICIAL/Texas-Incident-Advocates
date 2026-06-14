const fs = require('fs');
const path = require('path');

// Target CSV and Mailers assets path
const TARGET_CSV_PATH = '/home/team/shared/wave1_direct_mail_targets.csv';
const MAILERS_DIR = '/home/team/shared/brand_assets/production/mailers';
const CONFIG_PATH = path.join(__dirname, 'partner_config.json');

// Helper to parse CSV robustly handling quotes and commas
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue; // Skip incomplete lines

    const record = {};
    headers.forEach((header, index) => {
      // Remove surrounding quotes if they exist
      let val = values[index] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      record[header] = val;
    });
    records.push(record);
  }

  return records;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Map commodity to specific mailer variant
function getMailerVariant(commodity) {
  const comm = (commodity || '').toLowerCase();
  if (comm.includes('h2s') || comm.includes('sour') || comm.includes('support') || comm.includes('services')) {
    return {
      variant: '03_h2s_advisory',
      front: '03_h2s_advisory_front.svg',
      back: '03_h2s_advisory_back.svg',
      title: 'Hydrogen Sulfide (H2S) Sour Gas / Chemical Exposure Advisory'
    };
  } else if (comm.includes('water') || comm.includes('oil') || comm.includes('saltwater') || comm.includes('spill') || comm.includes('crude')) {
    return {
      variant: '01_spill_advisory',
      front: '01_spill_advisory_front.svg',
      back: '01_spill_advisory_back.svg',
      title: 'Produced Water / Crude Oil Spill Advisory'
    };
  } else if (comm.includes('gas') || comm.includes('transmission') || comm.includes('rupture') || comm.includes('natural') || comm.includes('petroleum')) {
    return {
      variant: '02_explosion_advisory',
      front: '02_explosion_advisory_front.svg',
      back: '02_explosion_advisory_back.svg',
      title: 'High-Pressure Transmission Line Rupture / Blast Advisory'
    };
  } else {
    // Fallback/Default
    return {
      variant: '03_h2s_advisory',
      front: '03_h2s_advisory_front.svg',
      back: '03_h2s_advisory_back.svg',
      title: 'Hydrogen Sulfide (H2S) Sour Gas / Chemical Exposure Advisory'
    };
  }
}

// Perform merge replacements in the SVG template content
function compileTemplate(svgContent, row, partnerConfig) {
  let compiled = svgContent;

  // Replace standard merge variables
  const mergeVars = {
    'owner_name': row.owner_name || 'Landowner / Resident',
    'parcel_id': row.parcel_id || 'N/A',
    'operator': row.operator || 'Unknown Operator',
    'incident_date': row.incident_date || 'Recent Date',
    'volume': row.volume || 'N/A',
    'commodity': row.commodity || 'N/A',
    'mailing_address': row.mailing_address || 'Current Address',
    'mailing_city': row.mailing_city || 'City',
    'mailing_state': row.mailing_state || 'TX',
    'mailing_zip': row.mailing_zip || 'ZIP',
    'county': row.county || 'County'
  };

  for (const [key, value] of Object.entries(mergeVars)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    compiled = compiled.replace(placeholder, value);
  }

  // Replace Partner Placeholders per PARTNER_PIVOT_ADVISORY.md and configuration
  const partnerName = partnerConfig.partner_name || '[PARTNER_FIRM_NAME]';
  const partnerCity = partnerConfig.partner_city || 'San Antonio';
  const partnerAttorney = partnerConfig.partner_managing_attorney || '[PARTNER_MANAGING_ATTORNEY]';

  compiled = compiled.replace(/\[PARTNER_FIRM_NAME\]/g, partnerName);
  compiled = compiled.replace(/\[PARTNER_CITY\]/g, partnerCity);
  compiled = compiled.replace(/\[PARTNER_MANAGING_ATTORNEY\]/g, partnerAttorney);

  // Wrap in simple HTML block for PostGrid rendering support
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;">${compiled}</body></html>`;
}

// Core execution function
async function sendMailersBatch(options = {}) {
  const isMock = options.mock !== false; // Default to mock sandbox mode
  const apiKey = process.env.POSTGRID_API_KEY || 'pv_test_placeholder_key_txpsb2026';

  console.log(`===================================================`);
  console.log(`  TEXAS PIPELINE SAFETY BOARD DIRECT MAIL GATEWAY`);
  console.log(`  Target List: ${TARGET_CSV_PATH}`);
  console.log(`  PostGrid API Key: ${apiKey.substring(0, 12)}... (Mode: ${isMock ? 'SIMULATED/MOCK' : 'LIVE PRODUCTION'})`);
  console.log(`===================================================`);

  // 1. Load partner configuration
  let partnerConfig = {
    partner_name: '[PARTNER_FIRM_NAME]',
    partner_city: 'San Antonio',
    partner_managing_attorney: '[PARTNER_MANAGING_ATTORNEY]'
  };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      partnerConfig.partner_name = config.partner_name || partnerConfig.partner_name;
    }
  } catch (err) {
    console.error('Warning: Failed to load partner config:', err.message);
  }

  // 2. Load and parse target records
  if (!fs.existsSync(TARGET_CSV_PATH)) {
    throw new Error(`Target CSV file not found at: ${TARGET_CSV_PATH}`);
  }
  const targets = parseCSV(TARGET_CSV_PATH);
  console.log(`[LOADED] Captured ${targets.length} direct-mail targets from CSV.`);

  const results = {
    total: targets.length,
    processed: 0,
    success: 0,
    failed: 0,
    variants: {
      '01_spill_advisory': 0,
      '02_explosion_advisory': 0,
      '03_h2s_advisory': 0
    },
    dispatched: []
  };

  // 3. Process each target
  for (let i = 0; i < targets.length; i++) {
    const row = targets[i];
    const mapping = getMailerVariant(row.commodity);
    results.variants[mapping.variant]++;

    const frontPath = path.join(MAILERS_DIR, mapping.front);
    const backPath = path.join(MAILERS_DIR, mapping.back);

    if (!fs.existsSync(frontPath) || !fs.existsSync(backPath)) {
      console.error(`[ERROR] SVG Templates missing for ${mapping.variant}: ${frontPath} or ${backPath}`);
      results.failed++;
      continue;
    }

    const frontSvg = fs.readFileSync(frontPath, 'utf8');
    const backSvg = fs.readFileSync(backPath, 'utf8');

    const compiledFront = compileTemplate(frontSvg, row, partnerConfig);
    const compiledBack = compileTemplate(backSvg, row, partnerConfig);

    // Format address per PostGrid standard API parameters
    let toAddress = {
      addressLine1: row.mailing_address,
      city: row.mailing_city,
      provinceOrState: row.mailing_state || 'TX',
      postalOrZip: row.mailing_zip,
      country: 'US'
    };

    // Robust company/person address sorting
    const isCompany = /LLC|INC|CORP|LTD|PARTNERS|RANCH|ESTATES|GROUP|CO\b|COMPANY/i.test(row.owner_name);
    if (isCompany) {
      toAddress.companyName = row.owner_name;
      toAddress.firstName = 'Landowner';
      toAddress.lastName = 'Representative';
    } else {
      const nameParts = (row.owner_name || 'Landowner').trim().split(/\s+/);
      if (nameParts.length === 1) {
        toAddress.firstName = nameParts[0];
        toAddress.lastName = 'Landowner';
      } else {
        toAddress.firstName = nameParts[0];
        toAddress.lastName = nameParts.slice(1).join(' ');
      }
    }

    const payload = {
      to: toAddress,
      from: {
        companyName: "Texas Pipeline Safety Board",
        addressLine1: "300 N. Loraine St, Suite 500",
        city: "Midland",
        provinceOrState: "TX",
        postalOrZip: "79701",
        country: "US"
      },
      size: "6x9",
      front: compiledFront,
      back: compiledBack
    };

    results.processed++;

    if (isMock) {
      // Sandbox Simulation Mode
      results.success++;
      if (i < 2) {
        // Keep a couple of payloads for review and preview on UI
        results.dispatched.push({
          target_index: i,
          owner_name: row.owner_name,
          parcel_id: row.parcel_id,
          variant: mapping.variant,
          variant_title: mapping.title,
          status: 'simulated_success',
          to_address: toAddress,
          front_preview: compiledFront.substring(0, 300) + '...',
          back_preview: compiledBack.substring(0, 300) + '...'
        });
      } else {
        results.dispatched.push({
          target_index: i,
          owner_name: row.owner_name,
          parcel_id: row.parcel_id,
          variant: mapping.variant,
          variant_title: mapping.title,
          status: 'simulated_success'
        });
      }
    } else {
      // Live PostGrid API Dispatch Mode
      try {
        const response = await fetch('https://api.postgrid.com/v1/postcards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        const resData = await response.json();
        if (response.ok) {
          results.success++;
          results.dispatched.push({
            target_index: i,
            owner_name: row.owner_name,
            parcel_id: row.parcel_id,
            postcard_id: resData.id,
            status: 'sent',
            variant: mapping.variant
          });
        } else {
          results.failed++;
          console.error(`[POSTGRID ERROR] Target ${row.owner_name} failed:`, resData.error || resData);
          results.dispatched.push({
            target_index: i,
            owner_name: row.owner_name,
            parcel_id: row.parcel_id,
            status: 'failed',
            error: resData.error ? resData.error.message : JSON.stringify(resData)
          });
        }
      } catch (err) {
        results.failed++;
        console.error(`[NETWORK ERROR] Target ${row.owner_name} failed:`, err.message);
        results.dispatched.push({
          target_index: i,
          owner_name: row.owner_name,
          parcel_id: row.parcel_id,
          status: 'failed',
          error: err.message
        });
      }
    }
  }

  console.log(`===================================================`);
  console.log(`  BATCH DISPATCH COMPLETED`);
  console.log(`  Total Targets: ${results.total}`);
  console.log(`  Processed: ${results.processed}`);
  console.log(`  Successful: ${results.success}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Spill Advisory (01): ${results.variants['01_spill_advisory']}`);
  console.log(`  Explosion Advisory (02): ${results.variants['02_explosion_advisory']}`);
  console.log(`  H2S Advisory (03): ${results.variants['03_h2s_advisory']}`);
  console.log(`===================================================`);

  return results;
}

// Support CLI run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');

  sendMailersBatch({ mock: !isLive })
    .then(res => {
      console.log('Batch job finished successfully.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal batch job error:', err.message);
      process.exit(1);
    });
}

module.exports = { sendMailersBatch };
