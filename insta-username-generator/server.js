// Zero-dependency server: serves the UI and checks whether an Instagram account exists.
// Browsers can't ask Instagram directly (CORS), so the check happens here.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { validate } = require('./public/generator.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map(); // username -> { status, at }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const APP_ID = '936619743392459'; // Instagram web app's public id

// Plain HTTPS GET via Node's https module: it sends only the headers we give it (like curl),
// which Instagram accepts more readily than the built-in fetch. Follows no redirects.
function httpGet(url, headers) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers, timeout: 8000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { if (body.length < 3e6) body += c; });
      res.on('end', () => resolve({ status: res.statusCode, location: res.headers.location || '', body }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (e) => resolve({ status: 0, location: '', body: '', error: e.message }));
  });
}
let request = httpGet; // swapped out in tests

const apiVerdict = (r) => {
  if (r.status === 404) return 'missing';
  if (r.status === 200) {
    try {
      const body = JSON.parse(r.body);
      if (body && body.data) return body.data.user ? 'exists' : 'missing';
    } catch { /* not JSON */ }
  }
  return 'unknown';
};

// Each method answers 'exists', 'missing' or 'unknown'. They're tried in order until one is sure.
const METHODS = [
  {
    name: 'Profile API (i.instagram.com)',
    url: (u) => `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(u)}`,
    headers: () => ({ 'User-Agent': UA, 'x-ig-app-id': APP_ID, Accept: '*/*' }),
    verdict: apiVerdict,
  },
  {
    name: 'Profile API (www.instagram.com)',
    url: (u) => `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(u)}`,
    headers: (u) => ({
      'User-Agent': UA, 'x-ig-app-id': APP_ID, Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest',
      Referer: `https://www.instagram.com/${u}/`,
    }),
    verdict: apiVerdict,
  },
  {
    name: 'Public profile page',
    url: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/`,
    headers: () => ({ 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }),
    verdict: (r, u) => {
      if (r.status === 404) return 'missing';
      if (r.status !== 200) return 'unknown'; // 302 to the login page tells us nothing
      // Judge only by the page title: the rest of the page carries lots of built-in text.
      const m = r.body.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = m ? m[1].toLowerCase() : '';
      if (title.includes(`(@${u})`) || title.includes(`(&#064;${u})`)) return 'exists';
      if (title.includes('page not found')) return 'missing';
      return 'unknown';
    },
  },
];

// After a method is refused (rate limit / login wall), rest it for a while instead of hammering it.
const COOLDOWN_MS = 30 * 1000;
const restingUntil = new Map(); // method name -> timestamp

async function runMethod(m, username) {
  const r = await request(m.url(username), m.headers(username));
  const verdict = m.verdict(r, username);
  if (verdict === 'unknown') restingUntil.set(m.name, Date.now() + COOLDOWN_MS);
  return { method: m.name, httpStatus: r.status, redirect: r.location, error: r.error, verdict, snippet: r.body.slice(0, 300) };
}

// Returns 'exists', 'missing', or 'unknown' (every method was refused or unreachable).
async function checkInstagram(username) {
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.status;

  let status = 'unknown';
  for (const m of METHODS) {
    if ((restingUntil.get(m.name) || 0) > Date.now()) continue;
    const { verdict } = await runMethod(m, username);
    if (verdict !== 'unknown') { status = verdict; break; }
  }

  if (status !== 'unknown') cache.set(username, { status, at: Date.now() });
  return status;
}

// Runs every method (ignoring cooldowns) and reports exactly what Instagram answered.
async function diagnose(username) {
  const results = [];
  for (const m of METHODS) results.push(await runMethod(m, username));
  return results;
}

function send(res, code, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
}

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, data, MIME[path.extname(file)] || 'application/octet-stream');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // JSON check used by the UI's "Check" button.
  if (url.pathname === '/api/check') {
    const u = (url.searchParams.get('u') || '').toLowerCase();
    const error = validate(u);
    if (error) return send(res, 400, JSON.stringify({ username: u, error }));
    const status = await checkInstagram(u);
    return send(res, 200, JSON.stringify({ username: u, status }));
  }

  // What each lookup method gets back from Instagram, for troubleshooting (see debug.html).
  if (url.pathname === '/api/debug') {
    const u = (url.searchParams.get('u') || 'instagram').toLowerCase();
    if (validate(u)) return send(res, 400, JSON.stringify({ username: u, error: validate(u) }));
    return send(res, 200, JSON.stringify({ username: u, results: await diagnose(u) }));
  }

  // "Go to Instagram": profile if it exists, error page if it doesn't.
  const go = url.pathname.match(/^\/go\/([^/]+)\/?$/);
  if (go) {
    const u = decodeURIComponent(go[1]).toLowerCase();
    const q = `?u=${encodeURIComponent(u)}`;
    if (validate(u)) return redirect(res, `/not-found.html${q}&reason=invalid`);
    const status = await checkInstagram(u);
    if (status === 'exists') return redirect(res, `https://www.instagram.com/${u}/`);
    if (status === 'missing') return redirect(res, `/not-found.html${q}`);
    return redirect(res, `/unverified.html${q}`);
  }

  serveStatic(res, url.pathname);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Instagram username generator on http://localhost:${PORT}`));
}

module.exports = { server, checkInstagram, diagnose, setRequester: (fn) => { request = fn; }, resetCooldowns: () => restingUntil.clear() };
