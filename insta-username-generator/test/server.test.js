const test = require('node:test');
const assert = require('node:assert');
const { server, setRequester } = require('../server.js');

// Simulated Instagram. Method 1 (i.instagram.com API) is always refused, so these tests
// also prove the checker falls through to the other methods.
setRequester(async (url) => {
  const u = new URL(url);
  const name = u.searchParams.get('username') || u.pathname.split('/').filter(Boolean)[0];
  const resp = (status, body = '', location = '') => ({ status, body, location });
  if (u.hostname === 'i.instagram.com') return resp(401, '{"message":"Please wait a few minutes"}');
  if (name === 'limited') return resp(302, '', 'https://www.instagram.com/accounts/login/');
  if (u.pathname.startsWith('/api/')) {
    if (name === 'realuser') return resp(200, JSON.stringify({ data: { user: { username: name } } }));
    if (name === 'pageonly') return resp(401, '{}');
    return resp(404, '');
  }
  // Public profile page
  if (name === 'pageonly') return resp(200, '<html><head><title>Page Only (&#064;pageonly) • Instagram photos and videos</title></head></html>');
  return resp(200, '<title>Page not found • Instagram</title>');
});

test('/go redirects based on whether the account exists', async (t) => {
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;
  const go = async (u) => (await fetch(`${base}/go/${u}`, { redirect: 'manual' })).headers.get('location');

  assert.equal(await go('realuser'), 'https://www.instagram.com/realuser/');
  assert.equal(await go('nobody_here'), '/not-found.html?u=nobody_here');
  assert.equal(await go('limited'), '/unverified.html?u=limited');
  assert.equal(await go('bad..name'), '/not-found.html?u=bad..name&reason=invalid');

  const check = await (await fetch(`${base}/api/check?u=realuser`)).json();
  assert.equal(check.status, 'exists');

  const debug = await (await fetch(`${base}/api/debug?u=realuser`)).json();
  assert.deepEqual(debug.results.map((r) => r.verdict), ['unknown', 'exists', 'missing']);
});

test('profile page title is used when the APIs are refused', async () => {
  const { checkInstagram, resetCooldowns } = require('../server.js');
  resetCooldowns();
  assert.equal(await checkInstagram('pageonly'), 'exists');
});
