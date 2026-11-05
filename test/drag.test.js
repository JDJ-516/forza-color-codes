import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulateDrag,analyzeDragSession,DRAG_DISTANCES,FH6_STRIPS} from '../public/drag.js';
import {analyzeSession,validateSession,estimateShiftPoints} from '../public/telemetry-analysis.js';
import {dragSession} from '../test-support/telemetry-fixtures.js';
const base={mass:1400,powerKw:350,torqueNm:550,torquePeakRpm:5000,lowTorquePercent:60,lossPercent:15,mu:1.1,cda:.65,rolling:.015,frontPercent:55,wheelbase:2.7,cgHeight:.5,gradePercent:0,width:265,aspect:35,rim:19,finalDrive:3.7,gears:[3.2,2.4,1.8,1.4,1.1,.9],shiftRpm:8000,shiftSeconds:.15,distanceM:402.336,launchControl:'enabled',launchRpm:4500,manualRpm:1800,throttleRamp:.2,drive:'RWD'};
test('manual drag model reaches exact standard distances and reports finite ordered splits',()=>{
 assert.deepEqual(DRAG_DISTANCES.map(d=>d.meters),[201.168,402.336,804.672,1609.344]);
 let previous=0;
 for(const d of DRAG_DISTANCES){const r=simulateDrag({...base,distanceM:d.meters});assert.equal(r.completed,true);assert.ok(r.seconds>previous);previous=r.seconds;assert.ok(r.trapKph>0);assert.equal(r.splits.at(-1).meters,d.meters);assert.equal(r.measuredPowerFraction,0);}
 assert.throws(()=>simulateDrag({...base,gears:[1,2,3,4]}),/descending/);
 assert.throws(()=>simulateDrag({...base,launchRpm:9000}),/launch RPM/);
});
test('LC selects declared launch RPM without adding hidden grip, and shift interruptions cost time',()=>{
 const enabled=simulateDrag({...base,drive:'AWD',mu:2});
 const disabled=simulateDrag({...base,drive:'AWD',mu:2,launchControl:'disabled'});
 assert.ok(enabled.seconds<disabled.seconds);
 const same=simulateDrag({...base,drive:'AWD',mu:2,launchControl:'disabled',manualRpm:4500});assert.equal(same.seconds,enabled.seconds);
 assert.ok(simulateDrag({...base,shiftSeconds:.5}).seconds>simulateDrag({...base,shiftSeconds:0}).seconds);
});
test('measured drag splits integrate speed from a stationary launch with matching units',()=>{
 const report=analyzeDragSession(dragSession(),402.336),initialSpeed=1/3.6,expected=(-initialSpeed+Math.sqrt(initialSpeed**2+2*4*402.336))/4;
 assert.equal(report.completed,true);assert.ok(Math.abs(report.seconds-expected)<.01);assert.equal(report.launchControl,'unknown');assert.equal(report.carOrdinal,42);assert.equal(report.launchSlipPercent,0);assert.equal(report.splits.at(-1).meters,402.336);
 const partial=analyzeDragSession(dragSession({seconds:4}),402.336);assert.equal(partial.completed,false);assert.equal(partial.seconds,null);
 const sparse=dragSession();sparse.samples=[sparse.samples[0],...sparse.samples.slice(11)];assert.throws(()=>analyzeDragSession(sparse,402.336),/stationary/);
 const rolling=dragSession();rolling.samples=rolling.samples.filter(s=>s.speedKph>20);assert.throws(()=>analyzeDragSession(rolling,402.336),/stationary/);
 const gap=dragSession();gap.samples.splice(30,5);assert.throws(()=>analyzeDragSession(gap,402.336),/gap over 250/);
});
test('telemetry validation rejects mixed cars, ambiguous units, nonfinite values and reversed timestamps',()=>{
 const mixed=dragSession();mixed.samples[10].carOrdinal=99;assert.throws(()=>validateSession(mixed),/Mixed-car/);
 const bad=dragSession();bad.samples[3].throttle=255;assert.throws(()=>validateSession(bad),/throttle/);
 bad.samples[3].throttle=1;bad.samples[3].rpm=NaN;assert.throws(()=>validateSession(bad),/rpm/);
 const reversed=dragSession();reversed.samples[3].timestampMs=0;assert.throws(()=>validateSession(reversed),/increasing/);
});
test('missing channels do not produce fabricated tuning evidence or extrapolated shifts',()=>{
 const session=dragSession();for(const s of session.samples){delete s.powerW;delete s.tireSlipRatio;delete s.suspensionTravel;delete s.onRumbleStrip;}
 const report=analyzeSession(session);assert.equal(report.powerCurve.length,0);assert.ok(report.missing.some(x=>x.includes('slip')));assert.equal(report.findings.some(f=>f.kind==='grip'),false);
 assert.deepEqual(estimateShiftPoints([],base.gears,8000),[]);
 const curve=[3000,3250,3500,3750].map(rpm=>({rpm,powerW:rpm*100,samples:10}));assert.ok(estimateShiftPoints(curve,[4,3,2,1],8000).every(x=>x.rpm===null));
});

test('user-confirmed FH6 venue distances remain distinct from generic quarter-mile and kilometer presets',()=>{
 assert.deepEqual(FH6_STRIPS.map(s=>s.meters),[321.869,804.672,965.606]);
 assert.notEqual(FH6_STRIPS[0].meters,DRAG_DISTANCES[1].meters);assert.notEqual(FH6_STRIPS[2].meters,1000);
 assert.match(FH6_STRIPS[0].unlock,/Pink/);assert.match(FH6_STRIPS[1].unlock,/Orange/);
 for(const strip of FH6_STRIPS){assert.match(strip.source,/User-provided/);assert.equal(simulateDrag({...base,distanceM:strip.meters}).completed,true);}
});
