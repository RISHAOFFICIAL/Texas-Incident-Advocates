const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Starting Partner Portal API Integration Tests...');

  // Test 1: GET config with no passcode
  try {
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/partner/config',
      method: 'GET'
    });
    console.log('Test 1 (GET config, no passcode) statusCode:', res1.statusCode);
    if (res1.statusCode === 401) {
      console.log('✅ Test 1 Passed: Unauthorized access blocked successfully.');
    } else {
      console.log('❌ Test 1 Failed: Expected 401, got', res1.statusCode);
    }
  } catch (err) {
    console.error('Test 1 Error:', err.message);
  }

  // Test 2: GET config with correct passcode
  try {
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/partner/config',
      method: 'GET',
      headers: {
        'x-passcode': 'txpsb2026'
      }
    });
    console.log('Test 2 (GET config, with passcode) statusCode:', res2.statusCode);
    console.log('Test 2 body:', res2.body);
    if (res2.statusCode === 200 && res2.body.success) {
      console.log('✅ Test 2 Passed: Configuration retrieved successfully.');
    } else {
      console.log('❌ Test 2 Failed: Expected 200 and success, got', res2.statusCode, res2.body);
    }
  } catch (err) {
    console.error('Test 2 Error:', err.message);
  }

  // Test 3: POST config to update to a test endpoint
  try {
    const testConfig = {
      crm_webhook_url: 'https://httpbin.org/post',
      crm_type: 'clio'
    };
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/partner/config',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-passcode': 'txpsb2026'
      }
    }, testConfig);
    console.log('Test 3 (POST config update) statusCode:', res3.statusCode);
    console.log('Test 3 body:', res3.body);
    if (res3.statusCode === 200 && res3.body.success) {
      console.log('✅ Test 3 Passed: Configuration updated successfully.');
    } else {
      console.log('❌ Test 3 Failed: Expected 200 and success, got', res3.statusCode, res3.body);
    }
  } catch (err) {
    console.error('Test 3 Error:', err.message);
  }

  // Test 4: POST test-webhook dispatching mock lead
  try {
    console.log('Dispatching Test Webhook to https://httpbin.org/post (Clio mode)...');
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/partner/test-webhook',
      method: 'POST',
      headers: {
        'x-passcode': 'txpsb2026'
      }
    });
    console.log('Test 4 (POST test-webhook) statusCode:', res4.statusCode);
    console.log('Test 4 body response message:', res4.body.message);
    if (res4.statusCode === 200 && res4.body.success) {
      console.log('✅ Test 4 Passed: Webhook successfully delivered to test receiver.');
    } else {
      console.log('❌ Test 4 Failed: Expected 200 and success, got', res4.statusCode, res4.body);
    }
  } catch (err) {
    console.error('Test 4 Error:', err.message);
  }
}

runTests();
