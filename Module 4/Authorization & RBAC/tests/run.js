require('dotenv').config();
process.env.ACCESS_SECRET = process.env.ACCESS_SECRET || 'test-access-secret-32-chars-long-or-more';

const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const data = require('../src/data');

const SECRET = process.env.ACCESS_SECRET;

const server = http.createServer(app);

function request(server, options, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const port = addr ? addr.port : 0;
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: options.path || '/',
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = http.request(opts, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseData) });
        } catch {
          resolve({ status: res.statusCode, body: responseData });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function tokenFor(id, role) {
  return jwt.sign({ sub: id, role }, SECRET, { expiresIn: '1h' });
}

async function run() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`PASS: ${description}`);
      passed++;
    } else {
      console.error(`FAIL: ${description}`);
      failed++;
    }
  }

  const tokenA = tokenFor('u-A', 'member');
  const tokenB = tokenFor('u-B', 'member');
  const tokenMod = tokenFor('u-mod', 'moderator');
  const tokenAdmin = tokenFor('u-admin', 'admin');

  try {
    data.resetData();

    // 1. Owner (member A) edits their own post
    const res1 = await request(
      server,
      {
        path: '/posts/1',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
      },
      { title: 'Updated Title by Member A' }
    );
    assert(res1.status === 200, 'Owner (member A) edits their own post — expect 200');
    assert(
      res1.body?.post?.title === 'Updated Title by Member A',
      'Post title is updated successfully by owner'
    );

    // 2. Member B edits member A\'s post (IDOR closed)
    const res2 = await request(
      server,
      {
        path: '/posts/1',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`,
        },
      },
      { title: 'Hacked by Member B' }
    );
    assert(
      res2.status === 403,
      "Member B edits member A's post — expect 403 FORBIDDEN (IDOR closed)"
    );
    assert(
      res2.body?.error?.code === 'FORBIDDEN',
      'Response returns error code FORBIDDEN'
    );

    // 3. Moderator deletes any post (privileged bypass)
    const res3 = await request(server, {
      path: '/posts/1',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenMod}` },
    });
    assert(
      res3.status === 200,
      'Moderator deletes any post — expect 200 (privileged role bypasses ownership)'
    );

    // 4. Member tries to hide a post (moderator/admin only)
    const res4 = await request(server, {
      path: '/posts/2/hide',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      res4.status === 403,
      'A member tries to hide a post — expect 403 FORBIDDEN'
    );
    assert(
      res4.body?.error?.code === 'FORBIDDEN',
      'Hide route returns error code FORBIDDEN for member'
    );

    // 5. Moderator hides a post
    const res5 = await request(server, {
      path: '/posts/2/hide',
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenMod}` },
    });
    assert(res5.status === 200, 'A moderator hides a post — expect 200');

    // 6. Member calls admin-only DELETE /users/:id
    const res6 = await request(server, {
      path: '/users/u-A',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(
      res6.status === 403,
      'A member calls the admin-only DELETE /users/:id — expect 403 FORBIDDEN'
    );

    // 7. Admin calls DELETE /users/:id
    const res7 = await request(server, {
      path: '/users/u-A',
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert(res7.status === 200, 'An admin calls DELETE /users/:id — expect 200');

    // 8. Anyone edits a post that does not exist (PATCH /posts/999)
    const res8 = await request(
      server,
      {
        path: '/posts/999',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
      },
      { title: 'Nonexistent' }
    );
    assert(
      res8.status === 404,
      'Anyone edits a post that does not exist (PATCH /posts/999) — expect 404 before ownership check'
    );

    // 9. Any protected route with no token
    const res9 = await request(server, {
      path: '/posts',
      method: 'GET',
    });
    assert(
      res9.status === 401,
      'Any protected route with no token — expect 401 from requireAuth'
    );
  } finally {
    server.close();
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
