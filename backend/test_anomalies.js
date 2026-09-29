const http = require('http');
const app = require('./src/index');

async function runAnomaliesVerification() {
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`Test server running on port ${port}`);

    let passed = 0;
    let failed = 0;

    async function request(path, options = {}, body = null) {
      return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const reqOpts = {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        };

        const req = http.request(url, reqOpts, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body: json });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });

        req.on('error', reject);
        if (body) {
          req.write(JSON.stringify(body));
        }
        req.end();
      });
    }

    function assert(condition, message) {
      if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
      } else {
        console.error(`  ✗ ${message}`);
        failed++;
      }
    }

    try {
      console.log('\n--- Running Deterministic Anomaly Detection Backend Checks ---');

      // Setup User 1 & User 2
      const reg1 = await request('/api/auth/register', { method: 'POST' }, {
        email: `analyst1_${Date.now()}@jalrakshak.org`,
        password: 'password123',
        full_name: 'Water Analyst 1',
      });
      const token1 = reg1.body.token;

      const reg2 = await request('/api/auth/register', { method: 'POST' }, {
        email: `analyst2_${Date.now()}@jalrakshak.org`,
        password: 'password123',
        full_name: 'Water Analyst 2',
      });
      const token2 = reg2.body.token;

      // 1. Unauthenticated request
      const unauthRes = await request('/api/anomalies/analyze', { method: 'POST' });
      assert(unauthRes.status === 401, 'POST /api/anomalies/analyze without token returns 401');

      // 2. Missing parameter check
      const missingRes = await request(
        '/api/anomalies/analyze',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        {}
      );
      assert(missingRes.status === 400, 'Analyze without reading_id or location_name returns 400 Bad Request');

      // 3. Create 2 historical readings (Insufficient baseline)
      await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Kaveri Station', flow_rate_lps: 100, recorded_at: '2026-09-01T10:00:00Z' }
      );
      const r2 = await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Kaveri Station', flow_rate_lps: 100, recorded_at: '2026-09-02T10:00:00Z' }
      );

      const insufficientRes = await request(
        '/api/anomalies/analyze',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { reading_id: r2.body.data.id }
      );
      assert(
        insufficientRes.status === 200 && insufficientRes.body.anomalyDetected === false,
        'Requires at least 3 historical readings (returns anomalyDetected: false for 1 prior reading)'
      );

      // 4. Create 3rd reading (completes 3 baseline readings: 100, 100, 100 => Avg 100)
      await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Kaveri Station', flow_rate_lps: 100, recorded_at: '2026-09-03T10:00:00Z' }
      );

      // 5. Create 4th reading with +80% spike (180 LPS vs baseline 100 LPS)
      const r4 = await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Kaveri Station', flow_rate_lps: 180, recorded_at: '2026-09-04T10:00:00Z' }
      );

      const spikeRes = await request(
        '/api/anomalies/analyze',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { reading_id: r4.body.data.id }
      );

      assert(spikeRes.status === 200, 'Analyze endpoint returns 200 OK');
      assert(spikeRes.body.anomalyDetected === true, 'Flags reading at least 25% above baseline (+80% spike)');
      assert(spikeRes.body.metrics.excessLitres === 80, 'Calculates correct excess litres (80 LPS)');
      assert(spikeRes.body.metrics.deviationPercentage === 80, 'Calculates correct deviation percentage (80%)');
      assert(spikeRes.body.anomaly.severity === 'high', 'Assigns high severity for 50-100% deviation');

      const firstAnomalyId = spikeRes.body.anomaly.id;

      // 6. Deduplication check (re-analyze same reading)
      const dupRes = await request(
        '/api/anomalies/analyze',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { reading_id: r4.body.data.id }
      );
      assert(dupRes.body.isDuplicate === true, 'Prevents duplicate anomaly generation for same reading');

      // 7. Create 5th reading with critical spike (300 LPS)
      const r5 = await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Kaveri Station', flow_rate_lps: 300, recorded_at: '2026-09-05T10:00:00Z' }
      );

      const criticalRes = await request(
        '/api/anomalies/analyze',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { reading_id: r5.body.data.id }
      );
      assert(criticalRes.body.anomaly.severity === 'critical', 'Assigns critical severity for >= 100% deviation');

      // 8. List anomalies endpoint
      const listRes = await request('/api/anomalies', {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(listRes.status === 200 && listRes.body.data.length === 2, 'GET /api/anomalies lists user anomalies');
      assert(listRes.body.pagination.total === 2, 'Returns accurate pagination metadata');

      // 9. Get single anomaly detail endpoint
      const getRes = await request(`/api/anomalies/${firstAnomalyId}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(getRes.status === 200 && getRes.body.data.id === firstAnomalyId, 'GET /api/anomalies/:id returns anomaly detail');
      assert(!!getRes.body.data.reading, 'Anomaly detail includes associated water reading');

      // 10. User Isolation Check
      const isolationRes = await request(`/api/anomalies/${firstAnomalyId}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      assert(isolationRes.status === 404, 'User isolation enforced: User 2 cannot access User 1 anomaly');

      console.log(`\nResults: ${passed} passed, ${failed} failed.`);
      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    } catch (err) {
      console.error('Test execution failed:', err);
      server.close(() => process.exit(1));
    }
  });
}

runAnomaliesVerification();
