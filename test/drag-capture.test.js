import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDragCapture} from '../drag-capture.js';
import {decodeHorizonPacket} from '../fh6-decoder.js';
import {packet} from '../test-support/telemetry-fixtures.js';
const frame=(speedKph=0,extra={})=>({...decodeHorizonPacket(packet({speed:speedKph/3.6})),torqueNm:500,...extra});
function finishCountdown({at}){at(11000,frame());at(12000,frame());at(13000,frame());at(14000,frame());at(14500,frame());return at(15000,frame());}
function rig(){let time=10000;const capture=createDragCapture({now:()=>time});return {capture,at(t,s){time=t;if(s)capture.ingest(s);return capture.snapshot();}};}
test('drag countdown permits staging brakes, records a stationary lead-in, and goes live on GO',()=>{
 const {capture,at}=rig();assert.equal(capture.start(frame(),{countdown:true}).remainingMs,5000);
 assert.equal(at(11000,frame(0,{brake:1})).state,'countdown');
 at(12000,frame(0,{brake:1}));at(13000,frame(0,{brake:1}));at(14000,frame(0,{brake:1}));at(14500,frame(0,{brake:1}));const go=at(15000,frame(0));
 assert.equal(go.state,'recording');assert.equal(go.recordedSamples,3);assert.equal(go.launched,false);
 assert.equal(capture.session().samples[0].timestampMs,14000);
});
test('braking after launch keeps recording; returning to zero stops and freezes only the drag run',()=>{
 const {capture,at}=rig();capture.start(frame(),{countdown:true});finishCountdown({at});
 at(15100,frame(20));assert.equal(at(15200,frame(80,{brake:1})).state,'recording');
 assert.equal(at(15300,frame(0,{brake:1})).state,'recording');assert.equal(at(15550,frame(0,{brake:1})).reason,'stationary');
 const before=capture.session();at(16000,frame(100));assert.deepEqual(capture.session(),before);
 assert.equal(before.samples.at(-1).brake,1);
});
test('manual stop cancels countdown and a new start clears the old dedicated run',()=>{
 const {capture,at}=rig();capture.start(frame(),{countdown:true});at(12000,frame());assert.equal(capture.stop().reason,'manual');
 assert.equal(capture.start(frame(),{countdown:true}).state,'countdown');assert.equal(capture.session().samples.length,0);
 assert.throws(()=>capture.start(frame(),{countdown:true}),/already/);
});
test('capture can start while moving, be armed without data, and still guards car changes/signal loss',()=>{
 const a=rig();assert.equal(a.capture.start(frame(60)).state,'recording');assert.equal(a.at(10050,frame(80)).recordedSamples,1);
 const armed=rig();assert.equal(armed.capture.start(null).waitingForTelemetry,true);assert.equal(armed.at(15000).state,'recording');assert.equal(armed.at(15100,frame(40)).waitingForTelemetry,false);
 const countdown=rig();countdown.capture.start(frame(60),{countdown:true});assert.equal(countdown.at(11000,frame(80)).state,'countdown');
 const b=rig();b.capture.start(frame());assert.equal(b.at(11000,frame(0,{carOrdinal:99})).reason,'car-changed');
 const c=rig();c.capture.start(frame());assert.equal(c.at(13000).reason,'signal-lost');
});
test('capture measures power/torque separately and records actual upshift RPM',()=>{
 const {capture,at}=rig();capture.start(frame(),{countdown:true});finishCountdown({at});
 for(let i=0;i<5;i++)at(15100+i*20,frame(80,{gear:2,rpm:5000+i*100}));
 const state=at(15200,frame(85,{gear:3,rpm:4000}));assert.equal(state.measurements.peakPowerW,200000);assert.equal(state.measurements.peakTorqueNm,500);assert.equal(state.measurements.shiftRpm,5400);
});

test('imported power remains available when torque was not provided',async()=>{
 const {summarizeCapture}=await import('../public/drag-capture-data.js');const samples=Array.from({length:6},(_,i)=>frame(80,{timestampMs:1000+i*20,torqueNm:null}));
 const measured=summarizeCapture(samples);assert.equal(measured.powerSamples,6);assert.equal(measured.peakPowerW,200000);assert.equal(measured.torqueSamples,0);assert.equal(measured.peakTorqueNm,null);assert.equal(measured.shiftRpm,null);
});

test('a moving capture preserves engine evidence without inventing a standing-start ET',async()=>{
 const {analyzeDragSession}=await import('../public/drag.js');const {capture,at}=rig();capture.start(frame(80));
 for(let i=1;i<=8;i++)at(10000+i*50,frame(80+i));at(10500,frame());at(10750,frame());
 assert.equal(capture.snapshot().reason,'stationary');assert.ok(capture.snapshot().measurements.powerSamples>=5);assert.throws(()=>analyzeDragSession(capture.session(),321.869),/stationary|standing/);
});
