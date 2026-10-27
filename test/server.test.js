import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createServer, HOST } from '../server.js';

let server;
let port;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, HOST, resolve));
  port = server.address().port;
});

after(() => new Promise((resolve) => server.close(resolve)));

// Raw request so paths like /../ are sent unnormalized.
function get(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ host: HOST, port, path, method }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('binds to 127.0.0.1 on an OS-chosen port', () => {
  assert.equal(server.address().address, '127.0.0.1');
  assert.ok(port > 0);
});

test('serves each app asset with the right content type', async () => {
  const cases = [
    ['/', 'index.html', 'text/html'],
    ['/index.html', 'index.html', 'text/html'],
    ['/styles.css', 'styles.css', 'text/css'],
    ['/app.js', 'app.js', 'text/javascript'],
    ['/tasks.js', 'tasks.js', 'text/javascript'],
  ];
  for (const [path, file, type] of cases) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    assert.ok(res.headers['content-type'].startsWith(type), path);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.match(res.headers['content-security-policy'], /default-src 'none'/);
    const expected = await readFile(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.equal(res.body, expected, path);
  }
});

test('ignores query strings when matching assets', async () => {
  assert.equal((await get('/app.js?v=1')).status, 200);
});

test('returns 404 for anything outside the allowlist', async () => {
  for (const path of [
    '/server.js',
    '/package.json',
    '/public/index.html',
    '/../server.js',
    '/%2e%2e/server.js',
    '/..%2fserver.js',
    '/.git/config',
    '/favicon.ico',
    '/constructor',
    '/__proto__',
    '/index.html/',
  ]) {
    const res = await get(path);
    assert.equal(res.status, 404, path);
    assert.doesNotMatch(res.body, /import|"name"/, path);
  }
});

test('rejects non-GET methods with 405', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = await get('/', method);
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.allow, 'GET, HEAD');
  }
});

test('HEAD returns headers without a body', async () => {
  const res = await get('/', 'HEAD');
  assert.equal(res.status, 200);
  assert.equal(res.body, '');
});

test('answers 400 to an unparsable request target and keeps serving', { timeout: 2000 }, async () => {
  const res = await get('http://[');
  assert.equal(res.status, 400);
  assert.equal((await get('/')).status, 200);
});
