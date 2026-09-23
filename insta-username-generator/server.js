// Zero-dependency server: serves the UI and checks whether an Instagram account exists.
// Browsers can't ask Instagram directly (CORS), so the check happens here.
const http = require('http');
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

// Returns 'exists', 'missing', or 'unknown' (Instagram rate-limited us or was unreachable).
async function checkInstagram(username) {
  const hit = cache.get(username);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.status;

  let status = 'unknown';
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          'x-ig-app-id': '936619743392459', // Instagram web app's public id
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.status === 404) {
      status = 'missing';
    } else if (res.ok) {
      const body = await res.json().catch(() => null);
      if (body && body.data) status = body.data.user ? 'exists' : 'missing';
    }
    // 401/429 = rate limited / login wall: leave as 'unknown'.
  } catch {
    status = 'unknown';
  }

  if (status !== 'unknown') cache.set(username, { status, at: Date.now() });
  return status;
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

module.exports = { server, checkInstagram };
