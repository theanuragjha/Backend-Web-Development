'use strict';

// tests/run.js — Authentication Fundamentals Automated Test Suite
process.env.NODE_ENV = 'test';
process.env.PORT = '3099';

const http = require('http');
const bcrypt = require('bcryptjs');
const prisma = require('../src/db/prisma');
const app = require('../src/app');

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3099,
      method,
      path,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, body: parsed, rawBody: raw });
      });
    });

    req.on('error', (err) => resolve({ status: 0, body: err.message, rawBody: err.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('\n── Authentication Fundamentals — Test Suite ──\n');

  const server = app.listen(3099);

  try {
    // Clean test database
    await prisma.user.deleteMany();

    // ── Test 1: Register validation — 400 for missing/empty fields ─────────
    console.log('Test 1: Input validation on POST /auth/register');
    const r1a = await request('POST', '/auth/register', {});
    assert('missing all fields returns 400', r1a.status === 400);

    const r1b = await request('POST', '/auth/register', { name: '', email: 'sam@example.com', password: 'pass' });
    assert('empty name returns 400', r1b.status === 400);

    const r1c = await request('POST', '/auth/register', { name: 'Sam', email: '   ', password: 'pass' });
    assert('empty/whitespace email returns 400', r1c.status === 400);

    const r1d = await request('POST', '/auth/register', { name: 'Sam', email: 'sam@example.com', password: '' });
    assert('empty password returns 400', r1d.status === 400);

    // ── Test 2: Successful registration ────────────────────────────────────
    console.log('\nTest 2: Valid registration returns 201 with safe user shape');
    const registerPayload = {
      name: 'Sam',
      email: 'sam@example.com',
      password: 'correct horse battery staple',
    };
    const r2 = await request('POST', '/auth/register', registerPayload);
    assert('status is 201', r2.status === 201);
    assert('response contains id', typeof r2.body.id === 'number');
    assert('response contains correct name', r2.body.name === 'Sam');
    assert('response contains normalized email', r2.body.email === 'sam@example.com');

    // ── Test 3: Safe shape check — no credential leaks ─────────────────────
    console.log('\nTest 3: Response strictly strips password and hash (safe allowlist)');
    assert('password field is not present in response', r2.body.password === undefined);
    assert('passwordHash field is not present in response', r2.body.passwordHash === undefined);

    // ── Test 4: Database verification — hash stored, not plaintext ─────────
    console.log('\nTest 4: Database persistence verification');
    const storedUser = await prisma.user.findUnique({ where: { email: 'sam@example.com' } });
    assert('user is found in database', storedUser !== null);
    assert('passwordHash is a valid bcrypt hash string', storedUser && storedUser.passwordHash.startsWith('$2'));
    assert('stored hash is not plaintext password', storedUser && storedUser.passwordHash !== registerPayload.password);
    const isBcryptValid = await bcrypt.compare(registerPayload.password, storedUser.passwordHash);
    assert('bcrypt.compare validates password against stored hash', isBcryptValid === true);

    // ── Test 5: Duplicate registration returns 409 ─────────────────────────
    console.log('\nTest 5: Duplicate registration rejection');
    const r5a = await request('POST', '/auth/register', registerPayload);
    assert('identical duplicate email returns 409', r5a.status === 409);
    assert('returns error code EMAIL_EXISTS', r5a.body.error && r5a.body.error.code === 'EMAIL_EXISTS');

    const r5b = await request('POST', '/auth/register', {
      name: 'Sam Other',
      email: '  SAM@EXAMPLE.COM  ',
      password: 'another password',
    });
    assert('case-insensitive/untrimmed duplicate email returns 409', r5b.status === 409);

    // ── Test 6: Login validation — 400 for missing/empty fields ────────────
    console.log('\nTest 6: Input validation on POST /auth/login');
    const r6a = await request('POST', '/auth/login', {});
    assert('missing all fields returns 400', r6a.status === 400);

    const r6b = await request('POST', '/auth/login', { email: '', password: 'pass' });
    assert('empty email returns 400', r6b.status === 400);

    const r6c = await request('POST', '/auth/login', { email: 'sam@example.com', password: '' });
    assert('empty password returns 400', r6c.status === 400);

    // ── Test 7: Successful login ───────────────────────────────────────────
    console.log('\nTest 7: Valid login returns 200 with safe user object');
    const r7 = await request('POST', '/auth/login', {
      email: 'sam@example.com',
      password: 'correct horse battery staple',
    });
    assert('status is 200', r7.status === 200);
    assert('response contains id', typeof r7.body.id === 'number');
    assert('response contains name', r7.body.name === 'Sam');
    assert('response contains email', r7.body.email === 'sam@example.com');
    assert('no password or hash in login response', r7.body.password === undefined && r7.body.passwordHash === undefined);

    // ── Test 8: Case-insensitive login email normalization ─────────────────
    console.log('\nTest 8: Normalized email on login');
    const r8 = await request('POST', '/auth/login', {
      email: '  SAM@Example.Com  ',
      password: 'correct horse battery staple',
    });
    assert('login with uppercase/whitespace email succeeds (200)', r8.status === 200);

    // ── Test 9: Unknown email returns generic 401 ──────────────────────────
    console.log('\nTest 9: Unknown email credential failure');
    const r9 = await request('POST', '/auth/login', {
      email: 'unknown@example.com',
      password: 'any password',
    });
    assert('unknown email returns 401', r9.status === 401);
    assert('code is INVALID_CREDENTIALS', r9.body.error && r9.body.error.code === 'INVALID_CREDENTIALS');
    assert('message is "Invalid email or password"', r9.body.error && r9.body.error.message === 'Invalid email or password');

    // ── Test 10: Wrong password returns generic 401 ────────────────────────
    console.log('\nTest 10: Wrong password credential failure');
    const r10 = await request('POST', '/auth/login', {
      email: 'sam@example.com',
      password: 'wrong-password',
    });
    assert('wrong password returns 401', r10.status === 401);
    assert('code is INVALID_CREDENTIALS', r10.body.error && r10.body.error.code === 'INVALID_CREDENTIALS');
    assert('message is "Invalid email or password"', r10.body.error && r10.body.error.message === 'Invalid email or password');

    // ── Test 11: Generic error body byte-for-byte identity ─────────────────
    console.log('\nTest 11: Resistance to enumeration (generic failure identity)');
    assert('both 401 failure response bodies are byte-for-byte identical', r9.rawBody === r10.rawBody);

    // Cleanup
    await prisma.user.deleteMany();

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed === 0) console.log('All tests passed! ✓\n');
  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
