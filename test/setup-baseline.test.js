import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dragChassisBaseline} from '../public/setup-baseline.js';
import {generateDragGearset} from '../public/drag-gearing.js';
const car={mass:1400,frontPercent:55,drive:'RWD',tireCompound:'Drag',setupFrontHz:2.7,setupRearHz:2.7,setupDamperMin:0,setupDamperMax:20};
test('reference setup gives explicit US spring, damper, tire and driven-axle settings',()=>{
 const r=dragChassisBaseline(car);assert.ok(Math.abs(r.springs.front-(2.7**2*1400*2.2046226218487757*.55/19.56))<.05);
 assert.equal(r.dampers.frontRebound,7.7);assert.equal(r.dampers.frontBump,4.6);assert.equal(r.dampers.inRange,true);assert.equal(r.tires.front,29.5);assert.equal(r.tires.rear,29.5);
 assert.equal(r.differential.front,null);assert.equal(r.differential.rear.accel,68);assert.equal(r.differential.center,null);assert.equal(r.arb.front,28.5);assert.equal(r.arb.rear,21.5);
 assert.equal(r.brakes.balance,50);assert.match(r.assumptions.join(' '),/not.*calibration/);
});
test('user-provided ranges flag infeasible settings instead of silently clamping them',()=>{
 const r=dragChassisBaseline({...car,setupDamperMax:5,setupSpringMax:200});assert.equal(r.dampers.inRange,false);assert.equal(r.dampers.frontRebound,7.7);assert.equal(r.springs.frontInRange,false);
 assert.throws(()=>dragChassisBaseline({...car,setupDamperMin:20}),/ordered/);assert.throws(()=>dragChassisBaseline({...car,mass:NaN}),/weight/);assert.throws(()=>dragChassisBaseline({...car,tireCompound:'unknown'}),/compound/);
 const fwd=dragChassisBaseline({...car,drive:'FWD',tireCompound:'Stock'});assert.equal(fwd.tires.front,26);assert.equal(fwd.tires.rear,30);assert.equal(fwd.differential.rear,null);
});
test('full gear ratios can be generated without a pre-existing ratio list',()=>{
 const input={width:265,aspect:35,rim:19,shiftRpm:8000,torquePeakRpm:5000,powerPeakRpm:7000,setupGearCount:6,setupFirstGear:3,setupTopGear:.9};
 const r=generateDragGearset(input,200);assert.equal(r.gears.length,6);assert.equal(r.gears[0],3);assert.ok(Math.abs(r.theoreticalMph-200)<.1);assert.ok(r.gears.every((g,i)=>i===0||g<r.gears[i-1]));assert.equal(r.generatedFromReferences,true);
 assert.throws(()=>generateDragGearset({...input,setupGearCount:NaN},200),/number of gears/);assert.throws(()=>generateDragGearset({...input,setupFirstGear:.5},200),/First-gear/);
});
