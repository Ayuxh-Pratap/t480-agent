// Minimal static server for the task-list app. Serves only an explicit
// allowlist of files from ./public and binds to 127.0.0.1.
import { createServer as createHttpServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const HOST = '127.0.0.1';
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const ASSETS = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/tasks.js': ['tasks.js', 'text/javascript; charset=utf-8'],
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, ...extra });
  res.end(res.req.method === 'HEAD' ? undefined : body);
}

export function createServer() {
  return createHttpServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed\n', undefined, { Allow: 'GET, HEAD' });
      return;
    }
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      send(res, 400, 'Bad Request\n');
      return;
    }
    const asset = Object.hasOwn(ASSETS, pathname) ? ASSETS[pathname] : null;
    if (!asset) {
      send(res, 404, 'Not Found\n');
      return;
    }
    try {
      const body = await readFile(path.join(PUBLIC_DIR, asset[0]));
      send(res, 200, body, asset[1]);
    } catch {
      send(res, 500, 'Internal Server Error\n');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 0);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`Invalid PORT: ${process.env.PORT}`);
    process.exit(1);
  }
  const server = createServer();
  server.on('error', (err) => {
    console.error(`Could not start server: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, HOST, () => {
    console.log(`Task list running at http://${HOST}:${server.address().port}/`);
  });
  const stop = () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
