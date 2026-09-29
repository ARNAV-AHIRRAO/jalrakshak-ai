const http = require('http');
const app = require('./src/index');

async function runAiVerification() {
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
      console.log('\n--- Running Server-Side Gemini AI Analysis Backend Checks ---');

      // Setup User 1 & User 2
      const reg1 = await request('/api/auth/register', { method: 'POST' }, {
        email: `ai_user1_${Date.now()}@jalrakshak.org`,
        password: 'password123',
        full_name: 'AI Operator 1',
      });
      const token1 = reg1.body.token;

      const reg2 = await request('/api/auth/register', { method: 'POST' }, {
        email: `ai_user2_${Date.now()}@jalrakshak.org`,
        password: 'password123',
        full_name: 'AI Operator 2',
      });
      const token2 = reg2.body.token;

      // 1. Unauthenticated request
      const unauthRes = await request('/api/ai/analyze-anomaly/00000000-0000-0000-0000-000000000000', { method: 'POST' });
      assert(unauthRes.status === 401, 'POST /api/ai/analyze-anomaly without token returns 401');

      // 2. Invalid UUID check
      const invalidUuidRes = await request(
        '/api/ai/analyze-anomaly/invalid-uuid-format',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } }
      );
      assert(invalidUuidRes.status === 400, 'Invalid UUID parameter returns 400 Bad Request');

      // 3. Create readings & generate anomaly for User 1
      for (let i = 1; i <= 3; i++) {
        await request(
          '/api/water-readings',
          { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
          { location_name: 'Indus Basin', flow_rate_lps: 100, recorded_at: `2026-09-0${i}T10:00:00Z` }
        );
      }

      const spikeReading = await request(
        '/api/water-readings',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { location_name: 'Indus Basin', flow_rate_lps: 200, recorded_at: '2026-09-04T10:00:00Z' }
      );

      const anomalyRes = await request(
        '/api/anomalies/analyze',
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } },
        { reading_id: spikeReading.body.data.id }
      );
      const anomalyId = anomalyRes.body.anomaly.id;

      // 4. Trigger AI analysis for User 1
      const aiRes = await request(
        `/api/ai/analyze-anomaly/${anomalyId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } }
      );

      assert(aiRes.status === 200, 'POST /api/ai/analyze-anomaly/:id returns 200 OK');
      assert(aiRes.body.cached === false, 'Fresh AI analysis generated and stored');
      assert(aiRes.body.data.risk_score >= 0 && aiRes.body.data.risk_score <= 100, 'Valid risk_score generated');
      assert(Array.isArray(aiRes.body.data.recommendations) && aiRes.body.data.recommendations.length > 0, 'Contains practical recommendations');
      assert(aiRes.body.data.summary.length > 0, 'Contains non-empty summary');
      assert(JSON.stringify(aiRes.body).includes('GEMINI_API_KEY') === false, 'NEVER exposes GEMINI_API_KEY in API output');

      // 5. Deduplication / Caching check
      const cachedAiRes = await request(
        `/api/ai/analyze-anomaly/${anomalyId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token1}` } }
      );
      assert(cachedAiRes.status === 200 && cachedAiRes.body.cached === true, 'Returns cached analysis to avoid duplicate API calls');

      // 6. GET /api/ai/analyses/:anomalyId
      const getAiRes = await request(`/api/ai/analyses/${anomalyId}`, {
        headers: { Authorization: `Bearer ${token1}` },
      });
      assert(getAiRes.status === 200 && getAiRes.body.data.anomaly_id === anomalyId, 'GET /api/ai/analyses/:id retrieves stored analysis');

      // 7. User Isolation Checks
      const user2AnalyzeRes = await request(
        `/api/ai/analyze-anomaly/${anomalyId}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token2}` } }
      );
      assert(user2AnalyzeRes.status === 404, 'User isolation: User 2 cannot trigger AI analysis on User 1 anomaly (returns 404)');

      const user2GetRes = await request(`/api/ai/analyses/${anomalyId}`, {
        headers: { Authorization: `Bearer ${token2}` },
      });
      assert(user2GetRes.status === 404, 'User isolation: User 2 cannot view AI analysis for User 1 anomaly (returns 404)');

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

runAiVerification();
