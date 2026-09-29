const http = require('http');
const app = require('./src/index');

async function runInterventionsVerification() {
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
      console.log('\n--- Running Intervention CRUD & Savings Measurement Backend Checks ---');

      // Setup User 1 & User 2
      const reg1 = await request('/api/auth/register', { method: 'POST' }, {
        email: `op_int1_${Date.now()}@jalrakshak.org`,
        password: 'password123',
        full_name: 'Intervention Specialist 1',
      });
      const token1 = reg1.body.token;

      const reg2 = await request('/api/auth/register', { method: 'POST' }, {
        email: `op_int2_${Date.now()}@jalrakshak.org`,
        password: 'password123',
        full_name: 'Intervention Specialist 2',
      });
      const token2 = reg2.body.token;

      // 1. Unauthenticated request
      const unauthRes = await request('/api/interventions', { method: 'POST' }, { location_name: 'Godavari', action_type: 'repair' });
      assert(unauthRes.status === 401, 'POST /api/interventions without token returns 401');

      // 2. Validation error (missing action_type)
      const invalidRes = await request(
        '/api/interventions',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Godavari Pumping Station' }
      );
      assert(invalidRes.status === 400, 'Missing required fields returns 400 Bad Request');

      // 3. Create intervention
      const createRes = await request(
        '/api/interventions',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        {
          location_name: 'Godavari Pumping Station',
          action_type: 'valve_seal_replacement',
          description: 'Replaced degraded main butterfly valve gaskets',
          status: 'completed',
          start_date: '2026-09-10T00:00:00Z',
          completion_date: '2026-09-12T00:00:00Z',
          notes: 'Tested post-completion at 150 PSI',
        }
      );

      assert(createRes.status === 201, 'Create intervention returns 201 Created');
      assert(createRes.body.data.location_name === 'Godavari Pumping Station', 'Intervention stores location_name');

      const interventionId = createRes.body.data.id;

      // 4. Measure impact with INSUFFICIENT data
      const insufficientImpact = await request(`/api/interventions/${interventionId}/impact`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(
        insufficientImpact.status === 200 && insufficientImpact.body.measured === false,
        'Reports measured: false when insufficient pre/post readings exist'
      );

      // 5. Add pre-intervention readings (Before Sept 10)
      await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Godavari Pumping Station', flow_rate_lps: 200, recorded_at: '2026-09-08T10:00:00Z' }
      );
      await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Godavari Pumping Station', flow_rate_lps: 200, recorded_at: '2026-09-09T10:00:00Z' }
      );

      // 6. Add post-intervention readings (After Sept 12)
      await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Godavari Pumping Station', flow_rate_lps: 120, recorded_at: '2026-09-13T10:00:00Z' }
      );
      await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Godavari Pumping Station', flow_rate_lps: 120, recorded_at: '2026-09-14T10:00:00Z' }
      );

      // 7. Measure impact with SUFFICIENT data
      const impactRes = await request(`/api/interventions/${interventionId}/impact`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(impactRes.status === 200 && impactRes.body.measured === true, 'Impact endpoint returns measured: true');
      assert(impactRes.body.metrics.preBaselineAvgLps === 200, 'Calculates pre-intervention baseline (200 LPS)');
      assert(impactRes.body.metrics.postAvgLps === 120, 'Calculates post-intervention average (120 LPS)');
      assert(impactRes.body.metrics.lpsReduced === 80, 'Calculates LPS reduced (80 LPS)');
      assert(impactRes.body.metrics.estimatedLitresSavedPerDay === 6912000, 'Calculates estimated litres saved per day (6,912,000 L/day)');
      assert(impactRes.body.metrics.percentageReduction === 40, 'Calculates percentage reduction (40%)');

      // 8. List interventions
      const listRes = await request('/api/interventions', {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(listRes.status === 200 && listRes.body.data.length === 1, 'GET /api/interventions lists user interventions');

      // 9. Update intervention
      const updateRes = await request(
        `/api/interventions/${interventionId}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token1}` } },
        { notes: 'Updated inspection notes: Verified zero leakage' }
      );
      assert(updateRes.status === 200 && updateRes.body.data.notes.includes('Verified zero leakage'), 'PUT /api/interventions/:id updates intervention');

      // 10. User Isolation Checks
      const user2GetRes = await request(`/api/interventions/${interventionId}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      assert(user2GetRes.status === 404, 'User isolation: User 2 cannot view User 1 intervention');

      const user2ImpactRes = await request(`/api/interventions/${interventionId}/impact`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      assert(user2ImpactRes.status === 404, 'User isolation: User 2 cannot access impact report for User 1 intervention');

      // 11. Delete intervention
      const deleteRes = await request(`/api/interventions/${interventionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(deleteRes.status === 200, 'DELETE /api/interventions/:id deletes intervention');

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

runInterventionsVerification();
