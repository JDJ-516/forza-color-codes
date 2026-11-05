import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hsvToHex,hexToHsv,gearingEstimate,suspensionEstimate} from '../public/calculators.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('color conversion handles hue wrap, black/white, and reversible RGB values',()=>{
 assert.equal(hsvToHex(0,1,1),'#ff0000');assert.equal(hsvToHex(1,1,1),'#ff0000');
 assert.equal(hsvToHex(.5,1,1),'#00ffff');assert.equal(hsvToHex(.8,0,1),'#ffffff');assert.equal(hsvToHex(.5,1,0),'#000000');
 for(const hex of ['#336699','#cc8822','#00ff00','#000000','#ffffff'])assert.equal(hsvToHex(...hexToHsv(hex)),hex);
 assert.throws(()=>hexToHsv('bad'),/six-digit/);assert.throws(()=>hsvToHex(NaN,1,1),/Hue/);
});
const gearing={width:200,aspect:50,rim:20,rpm:6000,finalDrive:3,gears:[4,3,2,1]};
test('gearing uses correct dimensions and solves final drive as the inverse of speed',()=>{
 const r=gearingEstimate(gearing);close(r.diameterMm,708);close(r.circumferenceM,Math.PI*.708);
 close(r.gears[3].kph,6000/3*Math.PI*.708*60/1000);close(r.gears[0].nextRpm,4500);
 close(r.gears[3].mph,r.gears[3].kph/1.609344);assert.equal(r.gears[3].nextRpm,null);
 const target=gearingEstimate({...gearing,targetKph:r.gears[3].kph});close(target.suggestedFinalDrive,3);
 const short=gearingEstimate({...gearing,finalDrive:6});close(short.gears[3].kph,r.gears[3].kph/2);
 assert.throws(()=>gearingEstimate({...gearing,gears:[4,3,3,1]}),/decrease/);
 assert.throws(()=>gearingEstimate({...gearing,width:NaN}),/Tire width/);
 assert.throws(()=>gearingEstimate({...gearing,targetKph:0}),/Target speed/);
});
const suspension={mass:1000,frontPercent:50,frontUnsprung:0,rearUnsprung:0,frontHz:1,rearHz:1,frontMotion:1,rearMotion:1,dampingRatio:1};
test('suspension computes sprung corner mass, frequency rate, motion ratio squared, and damping',()=>{
 const r=suspensionEstimate(suspension);close(r[0].sprungMass,250);close(r[0].springNmm,Math.pow(2*Math.PI,2)*250/1000);
 close(r[0].damperCoefficient,4*Math.PI*250);close(r[1].springNmm,r[0].springNmm);
 const m=suspensionEstimate({...suspension,frontMotion:.5});close(m[0].springNmm,4*r[0].springNmm);close(m[0].damperCoefficient,4*r[0].damperCoefficient);
 close(r[0].springLbIn,r[0].springNmm*5.71014716277);
 const higher=suspensionEstimate({...suspension,frontHz:2});close(higher[0].springNmm,4*r[0].springNmm);
 assert.throws(()=>suspensionEstimate({...suspension,mass:500,frontPercent:20,frontUnsprung:150}),/sprung corner mass/);
 assert.throws(()=>suspensionEstimate({...suspension,frontHz:NaN}),/frequency/);
});
