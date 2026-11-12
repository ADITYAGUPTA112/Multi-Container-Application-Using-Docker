const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

const app = require('../src/app');

// Helper to start and close test server
let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// Helper for making HTTP requests
const makeRequest = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
};

test('GET / returns 200 and service metadata', async () => {
  const res = await makeRequest('/');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'online');
  assert.equal(res.body.version, '1.0.0');
});

test('GET /health returns valid diagnostic schema', async () => {
  const res = await makeRequest('/health');
  // If DB is disconnected, status is 503 DEGRADED; if connected, 200 UP
  assert.ok([200, 503].includes(res.status));
  assert.ok(res.body.timestamp);
  assert.ok(res.body.services);
  assert.ok(res.body.services.api);
  assert.ok(res.body.services.database);
});

test('POST /todos rejects missing title with 400 and VALIDATION_ERROR', async () => {
  const res = await makeRequest('/todos', {
    method: 'POST',
    body: { description: 'Missing title' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /todos rejects empty whitespace title with 400', async () => {
  const res = await makeRequest('/todos', {
    method: 'POST',
    body: { title: '    ' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /todos/:id with malformed ObjectId returns 400 and INVALID_ID_FORMAT', async () => {
  const res = await makeRequest('/todos/123-not-an-id');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'INVALID_ID_FORMAT');
});

test('PUT /todos/:id with empty payload returns 400', async () => {
  const res = await makeRequest('/todos/6640abcde123456789012345', {
    method: 'PUT',
    body: {},
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /unknown-route returns 404 ROUTE_NOT_FOUND', async () => {
  const res = await makeRequest('/non-existent-endpoint');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
});
