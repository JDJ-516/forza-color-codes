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

test('decoded captures export actual received samples, reject foreign reset requests, and reset on car changes',async t=>{
 const {packet}=await import('../test-support/telemetry-fixtures.js');
 let time=100000;const telemetry=createTelemetryReceiver({port:0,now:()=>time});assert.equal(await telemetry.start(),true);t.after(()=>telemetry.close());
 const sender=dgram.createSocket('udp4');t.after(()=>sender.close());
 const server=createServer({telemetry});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/api/telemetry/session')).status,409);
 for(let i=1;i<=3;i++){
  time+=100;await new Promise((resolve,reject)=>sender.send(packet({timestamp:i*100}),telemetry.address().port,'127.0.0.1',e=>e?reject(e):resolve()));
  for(let j=0;j<50&&telemetry.snapshot().decodedPackets<i;j++)await delay(5);
 }
 assert.equal(telemetry.snapshot().recordedSamples,3);assert.equal(telemetry.snapshot().latest.speedKph,72);assert.equal(telemetry.snapshot().decodedAgeMs,0);time+=3500;assert.equal(telemetry.snapshot().decodedAgeMs,3500);
 const capture=await (await fetch(base+'/api/telemetry/session')).json();assert.equal(capture.schema,'forza-garage-telemetry/v1');assert.equal(capture.samples.length,3);assert.equal(capture.samples[0].powerW,200000);
 assert.equal((await fetch(base+'/api/telemetry/reset',{method:'POST'})).status,403);
 assert.equal((await fetch(base+'/api/telemetry/reset',{method:'POST',headers:{'X-Forza-Garage':'1',Origin:'https://foreign.example'}})).status,403);
 time+=100;await new Promise(resolve=>sender.send(packet({car:99}),telemetry.address().port,'127.0.0.1',resolve));
 for(let j=0;j<50&&telemetry.snapshot().decodedPackets<4;j++)await delay(5);
 assert.equal(telemetry.snapshot().recordedSamples,1);assert.equal(telemetry.session().samples[0].carOrdinal,99);
 assert.equal((await fetch(base+'/api/telemetry/reset',{method:'POST',headers:{'X-Forza-Garage':'1',Origin:base}})).status,200);assert.equal(telemetry.snapshot().recordedSamples,0);
});
