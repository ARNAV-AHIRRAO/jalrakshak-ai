const http = require('http');
const app = require('./src/index');

async function runReadingsVerification() {
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
      console.log('\n--- Running Water Readings CRUD Backend Checks ---');

      // Setup User 1 & User 2
      const email1 = `user1_${Date.now()}@jalrakshak.org`;
      const email2 = `user2_${Date.now()}@jalrakshak.org`;

      const reg1 = await request('/api/auth/register', { method: 'POST' }, {
        email: email1,
        password: 'password123',
        full_name: 'Water Operator 1',
      });
      const token1 = reg1.body.token;

      const reg2 = await request('/api/auth/register', { method: 'POST' }, {
        email: email2,
        password: 'password123',
        full_name: 'Water Operator 2',
      });
      const token2 = reg2.body.token;

      // 1. Unauthenticated request
      const unauthRes = await request('/api/water-readings', { method: 'POST' }, {
        location_name: 'Ganga Reservoir',
      });
      assert(unauthRes.status === 401, 'POST /api/water-readings without token returns 401');

      // 2. Validation error (pH > 14 or negative flow_rate)
      const invalidRes = await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        {
          location_name: 'Ganga Reservoir',
          ph_level: 18.5, // Invalid > 14
          flow_rate_lps: -50, // Invalid negative flow rate
        }
      );
      assert(invalidRes.status === 400 && invalidRes.body.error.code === 'VALIDATION_ERROR', 'Validation failure returns 400 Bad Request');

      // 3. Successful Reading Creation
      const createRes = await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        {
          location_name: 'Yamuna Treatment Facility',
          ph_level: 7.2,
          turbidity_ntu: 3.5,
          dissolved_oxygen_mg_l: 6.8,
          temperature_celsius: 24.5,
          contaminant_ppm: 12.0,
          flow_rate_lps: 150.0, // positive litres per second
          recorded_at: '2026-09-29T10:00:00Z',
        }
      );
      assert(createRes.status === 201, 'Create reading returns 201 Created');
      assert(createRes.body.data.location_name === 'Yamuna Treatment Facility', 'Created reading has location name');
      assert(createRes.body.data.user_id === reg1.body.user.id, 'Reading is scoped to logged-in user');

      const readingId = createRes.body.data.id;

      // 4. List readings with pagination
      const listRes = await request('/api/water-readings?page=1&limit=5', {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(listRes.status === 200, 'List readings returns 200 OK');
      assert(listRes.body.data.length === 1, 'Returns array containing user1 readings');
      assert(listRes.body.pagination.total === 1, 'Returns accurate pagination total');

      // 5. Filter by location
      const filterLocRes = await request('/api/water-readings?location_name=Yamuna', {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(filterLocRes.body.data.length === 1, 'Location filter matches query');

      const emptyLocRes = await request('/api/water-readings?location_name=NonExistent', {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(emptyLocRes.body.data.length === 0, 'Unmatched location filter returns empty data');

      // 6. Filter by date
      const dateRes = await request('/api/water-readings?start_date=2026-01-01&end_date=2026-12-31', {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(dateRes.body.data.length === 1, 'Date range filter returns matching readings');

      // 7. Get single reading
      const getRes = await request(`/api/water-readings/${readingId}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(getRes.status === 200 && getRes.body.data.id === readingId, 'GET /api/water-readings/:id returns reading');

      // 8. User Isolation Check (User 2 attempts to fetch User 1's reading)
      const isolationGetRes = await request(`/api/water-readings/${readingId}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      assert(isolationGetRes.status === 404, 'User isolation enforced: User 2 cannot view User 1 reading (returns 404)');

      // 9. Update reading
      const updateRes = await request(
        `/api/water-readings/${readingId}`,
        { method: 'PUT', headers: { Authorization: `Bearer ${token1}` } },
        { ph_level: 7.4, flow_rate_lps: 175.5 }
      );
      assert(updateRes.status === 200 && updateRes.body.data.ph_level === 7.4, 'PUT /api/water-readings/:id updates reading');

      // 10. Delete reading
      const deleteRes = await request(`/api/water-readings/${readingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(deleteRes.status === 200, 'DELETE /api/water-readings/:id returns 200 OK');

      // 11. Verify deleted reading is gone
      const verifyDeleted = await request(`/api/water-readings/${readingId}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(verifyDeleted.status === 404, 'Reading is removed after deletion');

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

runReadingsVerification();
