import {test} from 'node:test';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import {setTimeout as delay} from 'node:timers/promises';
import {createTelemetryReceiver} from '../telemetry.js';
import {createServer} from '../server.js';

test('receives UDP, exposes real packet metadata, detects lost signal, and bounds the preview', async t => {
  let time = 10000;
  const telemetry = createTelemetryReceiver({port:0, now:()=>time});
  assert.equal(await telemetry.start(), true);
  t.after(()=>telemetry.close());
  assert.equal(telemetry.snapshot().state, 'waiting');
  const sender = dgram.createSocket('udp4'); t.after(()=>sender.close());
  const payload = Buffer.alloc(324, 0xab);
  await new Promise((resolve,reject)=>sender.send(payload, telemetry.address().port, '127.0.0.1', e=>e?reject(e):resolve()));
  for (let i=0;i<50 && telemetry.snapshot().packets===0;i++) await delay(10);
  const received = telemetry.snapshot();
  assert.equal(received.state,'receiving');
  assert.equal(received.packets,1);
  assert.equal(received.lastPacket.bytes,324);
  assert.equal(received.lastPacket.previewHex.split(' ').length,64);
  assert.equal(received.format,'unverified');
  assert.equal(received.speed,undefined);
  const server = createServer({telemetry});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/telemetry`);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).packets,1);
  time += 3001;
  assert.equal(telemetry.snapshot().state,'stale');
});

test('disabled receiver is explicit rather than simulated live readings', async t => {
 const server=createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const data=await (await fetch(`http://127.0.0.1:${server.address().port}/api/telemetry`)).json();
 assert.equal(data.state,'disabled');
 assert.equal(data.packets,0);
});
