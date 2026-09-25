'use strict';

const http = require('http');
const { createApp, resetData } = require('../src/app');

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
      port: 3105,
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
  console.log('\n── LU34 API Design Best Practices — Test Suite ──\n');

  resetData();
  const app = createApp();
  const server = app.listen(3105);

  try {
    // ── Test 1: List posts with default pagination envelope ─────────────────
    console.log('Test 1: GET /posts returns standardized data envelope and pagination meta');
    const r1 = await request('GET', '/posts');
    assert('status is 200', r1.status === 200);
    assert('response has data array', Array.isArray(r1.body.data));
    assert('default limit is 2', r1.body.data.length === 2);
    assert('meta.page is 1', r1.body.meta && r1.body.meta.page === 1);
    assert('meta.limit is 2', r1.body.meta && r1.body.meta.limit === 2);
    assert('meta.total is 5', r1.body.meta && r1.body.meta.total === 5);
    assert('meta.pages is 3', r1.body.meta && r1.body.meta.pages === 3);

    // ── Test 2: List posts page 2 ──────────────────────────────────────────
    console.log('\nTest 2: GET /posts with page and limit parameters');
    const r2 = await request('GET', '/posts?page=2&limit=2');
    assert('status is 200', r2.status === 200);
    assert('page 2 returns 2 items', r2.body.data.length === 2);
    assert('first item on page 2 has id 3', r2.body.data[0].id === 3);
    assert('second item on page 2 has id 4', r2.body.data[1].id === 4);
    assert('meta shows page 2', r2.body.meta.page === 2);

    // ── Test 3: Server-side limit capping ──────────────────────────────────
    console.log('\nTest 3: Server-side limit capping on GET /posts');
    const r3 = await request('GET', '/posts?limit=1000');
    assert('status is 200', r3.status === 200);
    assert('limit is capped at 50', r3.body.meta.limit <= 50);

    // ── Test 4: Single resource GET /posts/:id ─────────────────────────────
    console.log('\nTest 4: GET /posts/:id returns { data } envelope');
    const r4 = await request('GET', '/posts/1');
    assert('status is 200', r4.status === 200);
    assert('data contains post object', r4.body.data && r4.body.data.id === 1);
    assert('post title is correct', r4.body.data.title === 'Caching 101');

    // ── Test 5: Missing resource GET /posts/999 returns 404 ────────────────
    console.log('\nTest 5: GET /posts/:id not found returns consistent error envelope');
    const r5 = await request('GET', '/posts/999');
    assert('status is 404', r5.status === 404);
    assert('error.code is NOT_FOUND', r5.body.error && r5.body.error.code === 'NOT_FOUND');
    assert('error.message is descriptive', r5.body.error && r5.body.error.message === 'Post not found');

    // ── Test 6: Create post POST /posts ────────────────────────────────────
    console.log('\nTest 6: POST /posts returns 201 with created post in data envelope');
    const r6 = await request('POST', '/posts', { title: 'Clean Architecture', author: 'anurag' });
    assert('status is 201', r6.status === 201);
    assert('created post returned inside data', r6.body.data && r6.body.data.id === 6);
    assert('created post title matches', r6.body.data.title === 'Clean Architecture');
    assert('created post author matches', r6.body.data.author === 'anurag');

    // ── Test 7: Validation error on create POST /posts ─────────────────────
    console.log('\nTest 7: POST /posts validation error returns 400 with VALIDATION_ERROR');
    const r7 = await request('POST', '/posts', { title: '' });
    assert('status is 400', r7.status === 400);
    assert('error.code is VALIDATION_ERROR', r7.body.error && r7.body.error.code === 'VALIDATION_ERROR');

    // ── Test 8: Like post POST /posts/:id/likes ────────────────────────────
    console.log('\nTest 8: POST /posts/:id/likes increments like and returns { data }');
    const r8 = await request('POST', '/posts/1/likes');
    assert('status is 200', r8.status === 200);
    assert('returns updated post in data', r8.body.data && r8.body.data.id === 1);
    assert('likes count incremented to 1', r8.body.data.likes === 1);

    // ── Test 9: Like non-existent post POST /posts/999/likes ───────────────
    console.log('\nTest 9: POST /posts/999/likes on missing post returns 404');
    const r9 = await request('POST', '/posts/999/likes');
    assert('status is 404', r9.status === 404);
    assert('error.code is NOT_FOUND', r9.body.error && r9.body.error.code === 'NOT_FOUND');

    // ── Test 10: Safe internal failure GET /explode ────────────────────────
    console.log('\nTest 10: Safe internal failure GET /explode returns 500 without leakage');
    const r10 = await request('GET', '/explode');
    assert('status is 500', r10.status === 500);
    assert('error.code is INTERNAL_ERROR', r10.body.error && r10.body.error.code === 'INTERNAL_ERROR');
    assert('stack is NOT leaked in response', r10.body.stack === undefined);
    assert('raw body does not leak FakeStack', !r10.rawBody.includes('FakeStack'));
    assert('raw body does not leak SQLITE_CONSTRAINT', !r10.rawBody.includes('SQLITE_CONSTRAINT'));

    // ── Test 11: Deprecation of old verb routes ────────────────────────────
    console.log('\nTest 11: Old verb routes are no longer exposed on public contract');
    const v1 = await request('GET', '/getPosts');
    const v2 = await request('GET', '/getPost/1');
    const v3 = await request('POST', '/createPost', { title: 't', author: 'a' });
    const v4 = await request('POST', '/likePost/1');
    assert('/getPosts returns 404', v1.status === 404);
    assert('/getPost/1 returns 404', v2.status === 404);
    assert('/createPost returns 404', v3.status === 404);
    assert('/likePost/1 returns 404', v4.status === 404);

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed === 0) console.log('All tests passed! ✓\n');
  } catch (err) {
    console.error('Test runner failure:', err);
    failed++;
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
