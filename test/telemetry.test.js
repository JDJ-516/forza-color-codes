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
  assert.equal(received.readings.rpm,payload.readFloatLE(16));
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

test('packet diagnostics expose exact rejection values, bound raw data and recover without capturing inactive frames',async t=>{
 const {packet}=await import('../test-support/telemetry-fixtures.js');let time=200000;const telemetry=createTelemetryReceiver({port:0,now:()=>time});assert.equal(await telemetry.start(),true);t.after(()=>telemetry.close());
 const sender=dgram.createSocket('udp4');t.after(()=>sender.close());const server=createServer({telemetry});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await fetch(base+'/api/telemetry/diagnostics')).status,409);
 async function send(b){const count=telemetry.snapshot().packets;time+=100;await new Promise((r,reject)=>sender.send(b,telemetry.address().port,'127.0.0.1',e=>e?reject(e):r()));for(let i=0;i<50&&telemetry.snapshot().packets===count;i++)await delay(5);assert.equal(telemetry.snapshot().packets,count+1);}
 const bad=packet();bad.writeFloatLE(NaN,16);await send(bad);assert.equal(telemetry.snapshot().recordedSamples,0);assert.equal(telemetry.snapshot().readings.rpm,null);assert.equal(telemetry.snapshot().readings.speedKph,72);assert.ok(telemetry.snapshot().decodeChecks.some(c=>c.offset===16&&!c.valid));
 let response=await fetch(base+'/api/telemetry/diagnostics'),data=await response.json();assert.match(response.headers.get('content-disposition'),/packet-diagnostics.json/);assert.equal(data.latestPacket.hex,bad.toString('hex'));assert.equal(data.lastRejected.inspection.failures.find(c=>c.offset===16).value,'NaN');assert.equal(data.latestPacket.truncated,false);
 await send(Buffer.alloc(324));assert.equal(telemetry.snapshot().decodedPackets,1);assert.equal(telemetry.snapshot().latest.isRaceOn,false);assert.equal(telemetry.snapshot().decodeError,null);assert.equal(telemetry.snapshot().decodeChecks,null);assert.equal(telemetry.snapshot().recordedSamples,0);
 await send(packet());assert.equal(telemetry.snapshot().recordedSamples,1);assert.equal(telemetry.snapshot().latest.isRaceOn,true);
 await send(Buffer.alloc(2048,0xab));data=await (await fetch(base+'/api/telemetry/diagnostics')).json();assert.equal(data.latestPacket.bytes,2048);assert.equal(data.latestPacket.hex.length,2048);assert.equal(data.latestPacket.truncated,true);assert.equal(data.latestPacket.inspection.bytes,2048);assert.equal(telemetry.snapshot().recordedSamples,1);assert.equal(telemetry.snapshot().readings,null);
});

test('live car identity and eligible engine measurements follow the current build and reset together',async t=>{
 const {packet}=await import('../test-support/telemetry-fixtures.js');let time=300000;
 const telemetry=createTelemetryReceiver({port:0,now:()=>time});assert.equal(await telemetry.start(),true);t.after(()=>telemetry.close());
 const sender=dgram.createSocket('udp4');t.after(()=>sender.close());
 async function send({car=3726,pi=800,power=350000}={}){
  const b=packet({car});b.writeInt32LE(pi,220);b.writeFloatLE(power,260);b.writeFloatLE(550,264);
  const count=telemetry.snapshot().packets;time+=100;await new Promise((resolve,reject)=>sender.send(b,telemetry.address().port,'127.0.0.1',error=>error?reject(error):resolve()));
  for(let i=0;i<50&&telemetry.snapshot().packets===count;i++)await delay(5);
 }
 for(let i=0;i<5;i++)await send();
 assert.equal(telemetry.snapshot().car.name,'2023 Acura Integra A-Spec');assert.equal(telemetry.snapshot().engineMeasurements.eligibleSamples,5);assert.equal(telemetry.snapshot().engineMeasurements.peakPowerW,350000);
 await send({pi:900,power:300000});assert.equal(telemetry.snapshot().recordedSamples,1);assert.equal(telemetry.snapshot().engineMeasurements.eligibleSamples,1);assert.equal(telemetry.snapshot().engineMeasurements.peakPowerW,300000);
 await send({car:3928});assert.equal(telemetry.snapshot().car.name,'2021 Hyundai i20 N');assert.equal(telemetry.snapshot().recordedSamples,1);
 telemetry.reset();assert.equal(telemetry.snapshot().engineMeasurements.eligibleSamples,0);assert.equal(telemetry.snapshot().recordedSamples,0);
});

test('dedicated drag API counts down, keeps recording through braking, freezes at zero, and leaves general telemetry running',async t=>{
 const {packet}=await import('../test-support/telemetry-fixtures.js');let time=10000;
 const telemetry=createTelemetryReceiver({port:0,now:()=>time});assert.equal(await telemetry.start(),true);t.after(()=>telemetry.close());
 const sender=dgram.createSocket('udp4');t.after(()=>sender.close());const server=createServer({telemetry});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 async function send(speed=0,brake=0){const b=packet({speed});b[316]=brake;b.writeFloatLE(500,264);const count=telemetry.snapshot().packets;time+=50;await new Promise((r,reject)=>sender.send(b,telemetry.address().port,'127.0.0.1',e=>e?reject(e):r()));for(let i=0;i<50&&telemetry.snapshot().packets===count;i++)await delay(2);}
 const post=(action,headers={'X-Forza-Garage':'1'})=>fetch(base+'/api/telemetry/drag/'+action,{method:'POST',headers});
 assert.equal((await post('start')).status,200);assert.equal(telemetry.snapshot().dragCapture.waitingForTelemetry,true);await post('stop');await send();assert.equal((await post('start',{})).status,403);
 assert.equal((await post('start?countdown=1')).status,200);
 for(let i=0;i<100;i++)await send(0,255);
 assert.equal(telemetry.snapshot().dragCapture.state,'recording');
 for(let i=0;i<8;i++)await send(20+i);
 await send(25,255);assert.equal(telemetry.snapshot().dragCapture.state,'recording');assert.equal((await post('stop',{'X-Forza-Garage':'1',Origin:'https://foreign.example'})).status,403);
 for(let i=0;i<6;i++)await send(0,255);
 assert.equal(telemetry.snapshot().dragCapture.reason,'stationary');const frozen=telemetry.dragSession(),count=telemetry.snapshot().recordedSamples;
 await send(30);assert.deepEqual(telemetry.dragSession(),frozen);assert.ok(telemetry.snapshot().recordedSamples>count);assert.equal(telemetry.snapshot().latest.speedKph,108);
 const response=await fetch(base+'/api/telemetry/drag/session');assert.equal(response.status,200);assert.equal((await response.json()).capture.state,'stopped');
 await send();assert.equal((await post('start')).status,200);const stopped=await (await post('stop')).json();assert.equal(stopped.reason,'manual');
});
