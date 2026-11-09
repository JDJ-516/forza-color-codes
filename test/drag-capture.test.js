import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDragCapture} from '../drag-capture.js';
import {decodeHorizonPacket} from '../fh6-decoder.js';
import {packet} from '../test-support/telemetry-fixtures.js';
const frame=(speedKph=0,extra={})=>({...decodeHorizonPacket(packet({speed:speedKph/3.6})),torqueNm:500,...extra});
function rig(){let time=10000;const capture=createDragCapture({now:()=>time});return {capture,at(t,s){time=t;if(s)capture.ingest(s);return capture.snapshot();}};}
test('drag countdown permits staging brakes, records a stationary lead-in, and goes live on GO',()=>{
 const {capture,at}=rig();assert.equal(capture.start(frame()).remainingMs,3000);
 assert.equal(at(11000,frame(0,{brake:1})).state,'countdown');
 at(12000,frame(0,{brake:1}));at(12500,frame(0,{brake:1}));const go=at(13000,frame(0));
 assert.equal(go.state,'recording');assert.equal(go.recordedSamples,3);assert.equal(go.launched,false);
 assert.equal(capture.session().samples[0].timestampMs,12000);
});
test('braking after launch keeps recording; returning to zero stops and freezes only the drag run',()=>{
 const {capture,at}=rig();capture.start(frame());at(11000,frame());at(12000,frame());at(12500,frame());at(13000,frame());
 at(13100,frame(20));assert.equal(at(13200,frame(80,{brake:1})).state,'recording');
 assert.equal(at(13300,frame(0,{brake:1})).state,'recording');assert.equal(at(13550,frame(0,{brake:1})).reason,'stationary');
 const before=capture.session();at(14000,frame(100));assert.deepEqual(capture.session(),before);
 assert.equal(before.samples.at(-1).brake,1);
});
test('manual stop cancels countdown and a new start clears the old dedicated run',()=>{
 const {capture,at}=rig();capture.start(frame());at(12000,frame());assert.equal(capture.stop().reason,'manual');
 assert.equal(capture.start(frame()).state,'countdown');assert.equal(capture.session().samples.length,0);
 assert.throws(()=>capture.start(frame()),/already/);
});
test('early launch, car changes and signal loss stop rather than mixing an invalid drag capture',()=>{
 const a=rig();assert.throws(()=>a.capture.start(frame(5)),/stop the car/);a.capture.start(frame());assert.equal(a.at(11000,frame(5)).reason,'early-launch');
 const b=rig();b.capture.start(frame());assert.equal(b.at(11000,frame(0,{carOrdinal:99})).reason,'car-changed');
 const c=rig();c.capture.start(frame());assert.equal(c.at(13000).reason,'signal-lost');
});
test('capture measures power/torque separately and records actual upshift RPM',()=>{
 const {capture,at}=rig();capture.start(frame());at(11000,frame());at(12000,frame());at(12500,frame());at(13000,frame());
 for(let i=0;i<5;i++)at(13100+i*20,frame(80,{gear:2,rpm:5000+i*100}));
 const state=at(13200,frame(85,{gear:3,rpm:4000}));assert.equal(state.measurements.peakPowerW,200000);assert.equal(state.measurements.peakTorqueNm,500);assert.equal(state.measurements.shiftRpm,5400);
});

test('imported power remains available when torque was not provided',async()=>{
 const {summarizeCapture}=await import('../public/drag-capture-data.js');const samples=Array.from({length:6},(_,i)=>frame(80,{timestampMs:1000+i*20,torqueNm:null}));
 const measured=summarizeCapture(samples);assert.equal(measured.powerSamples,6);assert.equal(measured.peakPowerW,200000);assert.equal(measured.torqueSamples,0);assert.equal(measured.peakTorqueNm,null);assert.equal(measured.shiftRpm,null);
});
