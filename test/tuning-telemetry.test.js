import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveCar} from '../car-identities.js';
import {emptyEngineMeasurements,observeEngine,engineKey} from '../telemetry-engine.js';
import {packet} from '../test-support/telemetry-fixtures.js';
import {decodeHorizonPacket} from '../fh6-decoder.js';

test('FH6 identities prefer community-confirmed model/trim and leave unknown IDs unnamed',()=>{
 const car=resolveCar(3726);assert.equal(car.year,2023);assert.equal(car.make,'Acura');assert.equal(car.model,'Integra A-Spec');assert.equal(car.name,'2023 Acura Integra A-Spec');
 assert.equal(resolveCar(368).name,'2001 Acura Integra R');assert.equal(resolveCar(2542).year,2017);
 assert.equal(resolveCar(999999).name,null);assert.equal(resolveCar(-1),null);assert.equal(resolveCar('3726'),null);
});
test('observed engine maxima only use eligible loaded samples and reset on car/build changes',()=>{
 const s={...decodeHorizonPacket(packet({car:3726})),torqueNm:500};let m=emptyEngineMeasurements();
 for(const change of [{throttle:.1},{brake:.1},{gear:1},{speedKph:10},{steer:.5},{tireSlipRatio:[.3,0,0,0]},{torqueNm:NaN}])m=observeEngine(m,{...s,...change});
 assert.equal(m.eligibleSamples,0);
 for(let i=0;i<5;i++)m=observeEngine(m,{...s,powerW:200000+i*1000,torqueNm:500+i,rpm:4000+i*100});
 assert.equal(m.eligibleSamples,5);assert.equal(m.peakPowerW,204000);assert.equal(m.peakTorqueNm,504);assert.equal(m.torquePeakRpm,4400);assert.equal(m.key,engineKey(s));
 m=observeEngine(m,{...s,isRaceOn:false,powerW:300000});assert.equal(m.peakPowerW,204000);
 m=observeEngine(m,{...s,carPerformanceIndex:900,throttle:0});assert.equal(m.eligibleSamples,0);assert.equal(m.peakPowerW,null);
 m=observeEngine(m,{...s,carOrdinal:3928,torqueNm:300});assert.equal(m.peakTorqueNm,300);assert.equal(m.eligibleSamples,1);
});
