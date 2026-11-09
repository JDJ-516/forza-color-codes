import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toDisplay,fromDisplay,readSI,writeSI,HP_PER_KW,LBFT_PER_NM,usError} from '../public/units.js';
import {suggestDragGearing,gearingSpeedMph} from '../public/drag-gearing.js';
import {optimizeDrag} from '../public/drag-optimizer.js';
const car={mass:1400,powerKw:350,torqueNm:550,torquePeakRpm:5000,lowTorquePercent:60,lossPercent:15,mu:1.1,cda:.65,rolling:.015,frontPercent:55,wheelbase:2.7,cgHeight:.5,gradePercent:0,width:265,aspect:35,rim:19,finalDrive:3.7,gears:[3.2,2.4,1.8,1.4,1.1,.9],shiftRpm:8000,shiftSeconds:.15,distanceM:402.336,launchControl:'enabled',launchRpm:4500,manualRpm:1800,throttleRamp:.2,drive:'RWD'};
test('US displays round-trip canonical saved inputs without changing physics units',()=>{
 for(const [kind,value] of Object.entries({hp:350,lbft:550,lb:1400,ft:402.336,in:2.7,inchWidth:265,sqft:.65,cuin:3,mph:300})){
  const control={value:'',dataset:{siDisplay:kind}};writeSI(control,value);assert.ok(Math.abs(readSI(control)-value)<1e-7,kind);assert.ok(Math.abs(fromDisplay(toDisplay(value,kind),kind)-value)<1e-8);
 }
 assert.ok(Math.abs(HP_PER_KW*350-469.35773136)<1e-7);assert.ok(Math.abs(LBFT_PER_NM*550-405.6591821)<1e-6);
 assert.match(usError('Peak torque (Nm) must be between 30 and 4000.'),/ft-lb.*22.13.*2950.25/);
 assert.equal(readSI({value:'',dataset:{siDisplay:'hp'}}),NaN);
});
test('goal gearing hits mph near peak power, preserves launch ratio and reports post-shift torque-band coverage',()=>{
 const suggested=suggestDragGearing({...car,powerPeakRpm:7000},200);
 assert.ok(Math.abs(suggested.theoreticalMph-200)<.1);assert.ok(Math.abs(suggested.launchRatioChange)<.002);
 assert.equal(suggested.gears.length,6);assert.equal(suggested.staysAboveTorquePeak,true);assert.match(suggested.source,/entered power/);
 const measured=suggestDragGearing(car,200,[{rpm:5000,powerW:250000},{rpm:5500,powerW:300000},{rpm:6000,powerW:350000},{rpm:6500,powerW:330000}]);assert.equal(measured.rpm,6000);assert.match(measured.source,/measured/);
 assert.throws(()=>suggestDragGearing(car,0),/top-speed goal/);assert.throws(()=>suggestDragGearing(car,20),/outside/);assert.throws(()=>suggestDragGearing({...car,powerPeakRpm:9000},200),/Power-peak/);
});
test('model search respects the optional theoretical gearing-speed floor',async()=>{
 const report=await optimizeDrag(car,[],{fdMin:2,fdMax:5,launchMin:3000,launchMax:4500,shiftMin:7000,shiftMax:8000,topSpeedGoalMph:220});
 assert.ok(report.candidates.length>0);for(const c of report.candidates)assert.ok(gearingSpeedMph(c.input)>=220);
});
