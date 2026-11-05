import http from 'node:http';
import { createTelemetryReceiver } from './telemetry.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/data.js', ['data.js', 'text/javascript; charset=utf-8']],
]);

export function createServer({telemetry} = {}) {
  return http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/telemetry') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(telemetry?.snapshot() || { state: 'disabled', packets: 0, format: 'unverified' }));
    }
    const entry = files.get(path);
    if (!entry) { res.writeHead(404); return res.end('Not found'); }
    try {
      const body = await readFile(fileURLToPath(new URL(`./public/${entry[0]}`, import.meta.url)));
      res.writeHead(200, {
        'Content-Type': entry[1],
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(500); res.end('Unable to load application'); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const telemetry = process.env.TELEMETRY_ENABLED === '1' ? createTelemetryReceiver({
    host: process.env.TELEMETRY_HOST || '127.0.0.1',
    port: Number(process.env.TELEMETRY_PORT || 5300),
  }) : undefined;
  if (telemetry) {
    await telemetry.start();
    console.log(`Telemetry receiver: ${telemetry.snapshot().state}`);
  }
  const server = createServer({telemetry});
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Forza Color Codes listening on port ${port}`));
  async function stop() { if (telemetry) await telemetry.close(); server.close(() => process.exit(0)); }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
