import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateFH6Chassis,generateFH6Gearing,rollingDiameterIn,sessionGearingEvidence,dragSetupFeedback,SCREEN_REFERENCE,TRACKHAWK_OBSERVATIONS} from '../public/fh6-setup.js';
const car={mass:2404.04,frontPercent:55,drive:'AWD',car:'2018 Jeep Grand Cherokee Trackhawk',launchControl:'enabled',tireCompound:'Drag',engineLimitRpm:8000,tireDiameterIn:29,topSpeedGoalMph:200,setupGearCount:6};
test('FH6 chassis follows photographed scales and driven-axle controls, without copying extreme settings',()=>{
 for(const drive of ['FWD','RWD','AWD'])for(const tireCompound of ['Stock','Drag','Slick']){
  const c=generateFH6Chassis({...car,drive,tireCompound});
  for(const p of [c.tires.front,c.tires.rear])assert.ok(p>=15&&p<=55);
  for(const v of ['frontRebound','rearRebound','frontBump','rearBump'].map(k=>c.dampers[k]))assert.ok(v>=1&&v<=20);
  assert.ok(c.arb.front>=1&&c.arb.front<=65);assert.ok(c.arb.rear>=1&&c.arb.rear<=65);
  assert.equal(c.alignment.frontCamber,0);assert.equal(c.alignment.rearToe,0);assert.equal(c.brakes.pressure,100);assert.equal(c.brakes.balance,50);
  assert.equal(c.differential.front===null,drive==='RWD');assert.equal(c.differential.rear===null,drive==='FWD');assert.equal(c.differential.center===null,drive!=='AWD');
  if(drive==='AWD')assert.ok(c.differential.center>50&&c.differential.center<100);
 }
 assert.deepEqual(SCREEN_REFERENCE.damping,[1,20]);
 assert.throws(()=>generateFH6Chassis({...car,tireCompound:''}),/tire package/);
 assert.throws(()=>generateFH6Chassis({...car,mass:NaN}),/weight/);
 assert.throws(()=>generateFH6Chassis({...car,launchControl:''}),/On or Off/);
});
test('Trackhawk evidence is axle-specific and never applied to another car',()=>{
 const light={...car,mass:600,frontPercent:55};
 const known=generateFH6Chassis(light),other=generateFH6Chassis({...light,car:'Unknown car'});
 assert.equal(known.springs.rear,429.7);assert.ok(other.springs.rear<429.7);assert.equal(known.springs.rangeKnown,false);
 assert.equal(Object.hasOwn(TRACKHAWK_OBSERVATIONS,'frontSpringMin'),false);assert.equal(Object.hasOwn(TRACKHAWK_OBSERVATIONS,'rearSpringMax'),false);
 const heavy=generateFH6Chassis({...car,mass:4800});assert.ok(heavy.springs.front>known.springs.front);
 assert.equal(typeof known.rideHeight.front,'string');assert.match(known.assumptions.join(' '),/Opposite endpoints are unknown/);
});
test('US gearing geometry is correct after hundredth rounding for 2–10 gears and several speed goals',()=>{
 for(const setupGearCount of [2,4,6,8,10])for(const topSpeedGoalMph of [100,150,200,275]){
  const g=generateFH6Gearing({...car,setupGearCount,topSpeedGoalMph});assert.equal(g.gears.length,setupGearCount);
  assert.ok(g.gears.every((v,n)=>v>=.48&&v<=5&&(!n||v<g.gears[n-1])));assert.ok(g.finalDrive<=6.1);
  const mph=g.rpm*Math.PI*29*60/(g.gears.at(-1)*g.finalDrive*63360);assert.ok(Math.abs(mph/topSpeedGoalMph-1)<.02);
  assert.ok(g.gears.every(v=>Math.abs(v*100-Math.round(v*100))<1e-8));
  assert.match(g.source,/power peak unknown/);assert.ok(g.shifts.every(s=>s.source==='engine-limit reference'));
 }
 assert.throws(()=>generateFH6Gearing({...car,engineLimitRpm:NaN}),/Engine RPM limit/);
 assert.throws(()=>generateFH6Gearing({...car,tireDiameterIn:NaN}),/tire size/);
 assert.throws(()=>generateFH6Gearing({...car,setupGearCount:NaN}),/number of gears/);
});
test('gearing only calls an interior measured peak a power peak, and does not extrapolate shift support',()=>{
 const curve=Array.from({length:17},(_,j)=>({rpm:4000+j*250,powerW:400000-Math.abs(6000-(4000+j*250))*80}));
 const measured=generateFH6Gearing(car,curve);assert.equal(measured.rpm,6000);assert.match(measured.source,/measured power/);
 const truncated=generateFH6Gearing(car,curve.slice(0,8));assert.match(truncated.source,/power peak unknown/);assert.ok(truncated.shifts.every(s=>s.source==='engine-limit reference'));
 const empty=generateFH6Gearing(car,[]);assert.equal(empty.rpm,7840);
});
const coast={isRaceOn:true,speedKph:100,gear:4,throttle:0,brake:0,steer:0,drivetrain:2,tireSlipRatio:[0,0,0,0],wheelRotationSpeed:Array(4).fill(2*(100/3.6)/(.0254*29))};
test('rolling diameter requires coherent low-slip coasting and five session samples',()=>{
 assert.ok(Math.abs(rollingDiameterIn(coast)-29)<1e-9);
 for(const change of [{throttle:1},{brake:.2},{steer:.5},{speedKph:0},{drivetrain:9},{tireSlipRatio:[.5,0,0,0]},{wheelRotationSpeed:[1,2,3,4]},{wheelRotationSpeed:[NaN,NaN,NaN,NaN]}])assert.equal(rollingDiameterIn({...coast,...change}),null);
 const samples=Array.from({length:5},()=>({...coast,engineMaxRpm:8000}));assert.equal(sessionGearingEvidence({samples}).tireDiameterIn,29);assert.equal(sessionGearingEvidence({samples:samples.slice(0,4)}).tireDiameterIn,null);assert.equal(sessionGearingEvidence({samples:[]}).engineLimitRpm,null);
});
test('launch feedback separates driven-wheel spin from free-wheel behavior and rejects missing coverage',()=>{
 const samples=Array.from({length:30},(_,j)=>({...coast,timestampMs:j*100,speedKph:40,rpm:4000,throttle:1,tireSlipRatio:[.8,.8,0,0],suspensionTravel:[.5,.5,.5,.5],onRumbleStrip:[false,false,false,false]}));
 const session={schema:'forza-garage-telemetry/v1',samples};
 const r=dragSetupFeedback(session,{drive:'RWD'}).join(' '),f=dragSetupFeedback(session,{drive:'FWD'}).join(' ');
 assert.match(r,/0.0%/);assert.match(f,/100.0%/);assert.match(f,/taller first gear/);
 assert.match(dragSetupFeedback(null,car).join(' '),/Capture a real run/);
 assert.throws(()=>dragSetupFeedback({samples:[]},car),/Expected/);
});
