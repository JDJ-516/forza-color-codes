import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tireDiameterFromSize,learnLaunchReduction,powerModel,rollingWorkCost} from '../public/drag-power-fit.js';
import {generateFH6Gearing} from '../public/fh6-setup.js';
const i={mass:1400,drive:'RWD',engineLimitRpm:8000,tireDiameterIn:27.5,topSpeedGoalMph:200,setupGearCount:6,powerKw:350,torqueNm:550,distanceM:321.869};
test('tire designations convert automatically without user math and reject ambiguous input',()=>{
 assert.ok(Math.abs(tireDiameterFromSize('295/45R20')-30.45275590551181)<1e-12);
 assert.ok(Math.abs(tireDiameterFromSize(' P275/40 ZR20 ')-(20+220/25.4))<1e-12);
 assert.equal(tireDiameterFromSize('28x10.5R15'),28);assert.equal(tireDiameterFromSize('31×10.5-15'),31);assert.equal(tireDiameterFromSize(''),null);
 for(const value of ['20','295/45','900/90R20','10x30R35','banana','295/0R20','30/20R10'])assert.throws(()=>tireDiameterFromSize(value));
});
test('rolling power-work integration matches the independent kinetic-energy result',()=>{
 const model={peakW:200000,at:()=>200000};const options={diameterIn:28,mass:1400,startMph:20,endMph:60,shiftSeconds:.15};
 const result=rollingWorkCost([10],model,options),expected=.5*1400*((60*.44704)**2-(20*.44704)**2)/200000;
 assert.ok(Math.abs(result.seconds-expected)<1e-12);assert.equal(result.shifts,0);assert.ok(Math.abs(result.powerUtilization-1)<1e-12);
 const constrained={peakW:200000,at:rpm=>rpm>=2000&&rpm<=8000?200000:null};
 const zero=rollingWorkCost([12,6],constrained,{...options,startMph:30,endMph:100,shiftSeconds:0}),slow=rollingWorkCost([12,6],constrained,{...options,startMph:30,endMph:100,shiftSeconds:.3});
 assert.ok(zero&&slow);assert.equal(slow.shifts,1);assert.ok(Math.abs(slow.seconds-zero.seconds-.3)<1e-10);
});
function session(overall=12){return {schema:'forza-garage-telemetry/v1',samples:Array.from({length:40},(_,j)=>{const speedKph=30+j;return {timestampMs:j*50,isRaceOn:true,carOrdinal:42,gear:1,speedKph,rpm:speedKph/3.6/(Math.PI*i.tireDiameterIn*.0254)*60*overall,throttle:1,brake:0,steer:0,tireSlipRatio:[0,0,0,0]};})};}
test('stable loaded first gear is retained while clutch/slip/build changes are excluded',()=>{
 const learned=learnLaunchReduction(session(),27.5,'RWD');assert.ok(Math.abs(learned.overall-12)<1e-12);
 const generated=generateFH6Gearing(i,[],session());assert.ok(Math.abs(generated.finalDrive*generated.gears[0]/12-1)<.01);assert.equal(generated.fit.launch.source,'captured first-gear reduction');
 const slipping=session();slipping.samples.forEach(s=>s.tireSlipRatio[2]=.3);assert.equal(learnLaunchReduction(slipping,27.5,'RWD'),null);
 const clutch=session();clutch.samples.forEach((s,j)=>s.rpm*=1+j*.02);assert.equal(learnLaunchReduction(clutch,27.5,'RWD'),null);
 const mixed=session();mixed.samples.forEach((s,j)=>s.engineMaxRpm=j<20?7000:8000);assert.equal(learnLaunchReduction(mixed,27.5,'RWD'),null);
});
test('power fitting ranks rounded ratios, is no worse than neutral spacing and respects actual strip finish',()=>{
 const curve=Array.from({length:25},(_,j)=>({rpm:2000+j*250,powerW:400000-Math.abs(5500-(2000+j*250))*90}));
 const g=generateFH6Gearing(i,curve,session(),{completed:true,distanceM:i.distanceM,trapKph:160,brakingSeconds:0});
 assert.equal(g.fit.mode,'measured power curve');assert.ok(g.fit.shapesTested>=30);assert.ok(g.fit.candidateCost<=g.fit.referenceCost+1e-10);assert.ok(Math.abs(g.fit.endMph-160/1.609344)<1e-10);
 assert.ok(g.gears.every((r,n)=>n===0||r<g.gears[n-1]));assert.ok(generateFH6Gearing(i,curve).gears[0]*generateFH6Gearing(i,curve).finalDrive>10,'narrow high-power band must not make launch gearing excessively tall');assert.ok(Math.abs(g.theoreticalMph-200)<4);
 const offline=generateFH6Gearing(i);assert.equal(offline.fit.mode,'rated power/torque envelope');assert.match(offline.fit.assumptions.join(' '),/optimistic envelope/);
 assert.equal(generateFH6Gearing({...i,powerKw:NaN}).fit.mode,'RPM reference');
 const model=powerModel(i,[{rpm:2000,powerW:100000},{rpm:2250,powerW:120000},{rpm:6000,powerW:300000},{rpm:6250,powerW:290000}]);assert.equal(model.at(4000),null);assert.equal(model.at(6500),null);
});
