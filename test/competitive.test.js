import {test} from 'node:test';
import assert from 'node:assert/strict';
import {optimizeDrag} from '../public/drag-optimizer.js';
import {summarizeAttempts,compareAttempts,validateAttempt,captureKey} from '../public/competition.js';
const base={mass:1400,powerKw:350,torqueNm:550,torquePeakRpm:5000,lowTorquePercent:60,lossPercent:15,mu:1.1,cda:.65,rolling:.015,frontPercent:55,wheelbase:2.7,cgHeight:.5,gradePercent:0,width:265,aspect:35,rim:19,finalDrive:3.7,gears:[3.2,2.4,1.8,1.4,1.1,.9],shiftRpm:8000,shiftSeconds:.15,distanceM:402.336,launchControl:'enabled',launchRpm:4500,manualRpm:1800,throttleRamp:.2,drive:'RWD'};
test('multi-variable search respects adjustment bounds, retains baseline and never invents grip or power',async()=>{
 const report=await optimizeDrag(base,[],{fdMin:3,fdMax:4,launchMin:2000,launchMax:5000,shiftMin:6000,shiftMax:8000,gearSpacing:true});
 assert.ok(report.tested>500);assert.equal(report.candidates.length,5);assert.ok(report.candidates[0].result.seconds<=report.baseline.seconds);
 for(const {input:i} of report.candidates){assert.ok(i.finalDrive>=3&&i.finalDrive<=4);assert.ok(i.launchRpm>=2000&&i.launchRpm<=5000);assert.ok(i.launchRpm<=i.shiftRpm);assert.ok(i.shiftRpm>=6000&&i.shiftRpm<=8000);for(const key of ['powerKw','mu','mass','cda','launchControl'])assert.equal(i[key],base[key]);assert.ok(i.gears.every((g,n)=>!n||g<i.gears[n-1]));}
 assert.equal(base.finalDrive,3.7);assert.equal(base.gears[1],2.4);
});
test('search handles low redline, manual launch, invalid constraints and cancellation',async()=>{
 const r=await optimizeDrag({...base,launchControl:'disabled',shiftRpm:2000,manualRpm:1200},[],{fdMin:3.7,fdMax:3.7,launchMin:1000,launchMax:1800,shiftMin:1500,shiftMax:2000});
 assert.ok(r.candidates.every(c=>c.input.manualRpm<=c.input.shiftRpm&&c.input.launchRpm===4500));
 await assert.rejects(optimizeDrag(base,[],{fdMin:8,fdMax:2}),/bounds/);
 await assert.rejects(optimizeDrag(base,[],{},()=>{},()=>true),/cancelled/);
});
const context={mode:'drag',event:'Irakawa',car:'Car A stock',className:'S1 900',conditions:'Dry',assists:'ABS off',distance:321.869,launchControl:'enabled'};
const attempt=(setup,value,extras={})=>({...context,setup,value,clean:true,...extras});
test('competition compares repeated clean attempts only in the identical context',()=>{
 const rows=[...['A','B'].flatMap((setup,i)=>[10,10.1,10.2].map(t=>attempt(setup,t-i*.5))),attempt('B',1,{clean:false}),attempt('B',1,{distance:402.336}),attempt('B',1,{car:'Car B'}),attempt('B',1,{launchControl:'disabled'})];
 const g=summarizeAttempts(rows,context,9.5);assert.equal(g.length,2);assert.equal(g[0].setup,'B');assert.equal(g[0].count,3);assert.equal(g[0].median,9.6);assert.ok(Math.abs(g[0].targetGap-.1)<1e-9);
 assert.ok(Math.abs(compareAttempts(g,'A','B','drag').improvement-.5)<1e-9);assert.equal(compareAttempts(g,'A','B','drag').overlapsSpread,false);
 assert.throws(()=>compareAttempts(summarizeAttempts([attempt('A',10),attempt('B',9)],context),'A','B','drag'),/three/);
 assert.throws(()=>validateAttempt(attempt('A',NaN)),/positive/);
});
test('drift maximizes points and reports a positive target gap for points still needed',()=>{
 const c={...context,mode:'drift',distance:null,launchControl:null},rows=[100,110,120].map(v=>({...c,setup:'A',value:v,clean:true}));
 const g=summarizeAttempts(rows,c,130);assert.equal(g[0].best,120);assert.equal(g[0].median,110);assert.equal(g[0].targetGap,20);
});

test('capture identity is independent of labels and changes with the underlying samples',()=>{
 const a={samples:[{timestampMs:100,speedKph:40}],source:'one'},b={...a,source:'another'};assert.equal(captureKey(a),captureKey(b));assert.notEqual(captureKey(a),captureKey({samples:[{timestampMs:100,speedKph:41}]}));
});

test('optimizer preserves unchanged gear precision and keeps rounded candidates within exact user bounds',async()=>{
 const input={...base,finalDrive:3.7004,gears:[3.23456,2.45678,1.87654,1.43219,1.12345,.91234]};
 const report=await optimizeDrag(input,[],{fdMin:3.7004,fdMax:3.9004,launchMin:4500,launchMax:4500,shiftMin:8000,shiftMax:8000});
 assert.ok(report.candidates.length>0);assert.ok(report.candidates[0].result.seconds<=report.baseline.seconds);
 for(const c of report.candidates){assert.ok(c.input.finalDrive>=3.7004&&c.input.finalDrive<=3.9004);assert.deepEqual(c.input.gears,input.gears);}
});
