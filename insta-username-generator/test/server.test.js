const test = require('node:test');
const assert = require('node:assert');
const { server } = require('../server.js');

// Simulate Instagram's lookup API: 200 + user for real accounts, 404 for missing, 401 when rate limited.
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (!String(url).includes('instagram.com')) return realFetch(url, opts);
  const u = new URL(url).searchParams.get('username');
  if (u === 'realuser') return new Response(JSON.stringify({ data: { user: { username: u } } }), { status: 200 });
  if (u === 'limited') return new Response('{}', { status: 401 });
  return new Response('not found', { status: 404 });
};

test('/go redirects based on whether the account exists', async (t) => {
  await new Promise((r) => server.listen(0, r));
  t.after(() => server.close());
  const base = `http://localhost:${server.address().port}`;
  const go = async (u) => (await realFetch(`${base}/go/${u}`, { redirect: 'manual' })).headers.get('location');

  assert.equal(await go('realuser'), 'https://www.instagram.com/realuser/');
  assert.equal(await go('nobody_here'), '/not-found.html?u=nobody_here');
  assert.equal(await go('limited'), '/unverified.html?u=limited');
  assert.equal(await go('bad..name'), '/not-found.html?u=bad..name&reason=invalid');

  const check = await (await realFetch(`${base}/api/check?u=realuser`)).json();
  assert.equal(check.status, 'exists');
});
