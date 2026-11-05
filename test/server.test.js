import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server.js';
import { starterColors } from '../public/data.js';

test('serves the application and assets, rejects unknown routes and write methods', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/', '/app.js', '/styles.css', '/data.js']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).length > 100);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/', {method:'POST'})).status, 405);
  const head = await fetch(base, {method:'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('starter recipes are uniquely identified, bounded, and explicitly illustrative', () => {
  assert.equal(new Set(starterColors.map(c => c.id)).size, starterColors.length);
  for (const c of starterColors) {
    assert.equal(c.sample, true);
    assert.match(c.hex, /^#[0-9a-f]{6}$/i);
    for (const key of ['h','s','b']) assert.ok(c[key] >= 0 && c[key] <= 1);
  }
});
