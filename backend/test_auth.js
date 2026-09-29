const http = require('http');
const app = require('./src/index');

async function runAuthVerification() {
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
      console.log('\n--- Running Backend Authentication Checks ---');

      // 1. Health check
      const res1 = await request('/api/health');
      assert(res1.status === 200 && res1.body.status === 'ok', 'Health check returns 200 OK');

      // 2. Registration with valid payload
      const testEmail = `operator_${Date.now()}@jalrakshak.org`;
      const regRes = await request('/api/auth/register', { method: 'POST' }, {
        email: testEmail,
        password: 'securePassword123',
        full_name: 'Jal Operator',
        role: 'operator',
      });
      assert(regRes.status === 201, 'User registration returns 201 Created');
      assert(!!regRes.body.token, 'Registration returns JWT token');
      assert(regRes.body.user && regRes.body.user.email === testEmail, 'Returned user has correct email');
      assert(regRes.body.user.password_hash === undefined, 'Returned user NEVER contains password_hash');

      const authToken = regRes.body.token;

      // 3. Duplicate registration
      const dupRes = await request('/api/auth/register', { method: 'POST' }, {
        email: testEmail,
        password: 'securePassword123',
        full_name: 'Duplicate Operator',
      });
      assert(dupRes.status === 409, 'Duplicate registration returns 409 Conflict');

      // 4. Invalid registration payload
      const invRes = await request('/api/auth/register', { method: 'POST' }, {
        email: 'invalid-email',
        password: '123',
        full_name: '',
      });
      assert(invRes.status === 400 && invRes.body.error.code === 'VALIDATION_ERROR', 'Validation error returns 400 Bad Request');

      // 5. Successful Login
      const loginRes = await request('/api/auth/login', { method: 'POST' }, {
        email: testEmail,
        password: 'securePassword123',
      });
      assert(loginRes.status === 200, 'Login with correct credentials returns 200 OK');
      assert(!!loginRes.body.token, 'Login returns JWT token');
      assert(loginRes.body.user.password_hash === undefined, 'Login user response NEVER contains password_hash');

      // 6. Invalid password Login
      const wrongPassRes = await request('/api/auth/login', { method: 'POST' }, {
        email: testEmail,
        password: 'wrongPassword',
      });
      assert(wrongPassRes.status === 401, 'Login with incorrect password returns 401 Unauthorized');

      // 7. Current User /me endpoint with valid token
      const meRes = await request('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      assert(meRes.status === 200, 'GET /api/auth/me with valid Bearer token returns 200 OK');
      assert(meRes.body.user.email === testEmail, 'GET /api/auth/me returns current user profile');
      assert(meRes.body.user.password_hash === undefined, 'GET /api/auth/me NEVER returns password_hash');

      // 8. Current User /me endpoint without token
      const noAuthRes = await request('/api/auth/me');
      assert(noAuthRes.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

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

runAuthVerification();
