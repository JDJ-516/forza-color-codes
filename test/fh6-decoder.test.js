import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeHorizonPacket} from '../fh6-decoder.js';
import {packet} from '../test-support/telemetry-fixtures.js';
test('community Horizon layout reads the independently checked byte offsets and converts units',()=>{
 const s=decodeHorizonPacket(packet());assert.equal(s.speedKph,72);assert.equal(s.rpm,4000);assert.equal(s.engineMaxRpm,8000);assert.equal(s.powerW,200000);assert.equal(s.gear,2);assert.equal(s.throttle,1);assert.deepEqual(s.tireTempC,[100,100,100,100]);assert.deepEqual(s.suspensionTravel,[.5,.5,.5,.5]);assert.equal(s.carOrdinal,42);
});
test('decoder rejects wrong layouts, nonfinite values and mismatched velocity',()=>{
 assert.throws(()=>decodeHorizonPacket(Buffer.alloc(311)),/packet size/);
 const b=packet();b.writeFloatLE(NaN,16);assert.throws(()=>decodeHorizonPacket(b),/plausibility/);
 const c=packet();c.writeFloatLE(100,256);assert.throws(()=>decodeHorizonPacket(c),/velocity/);
 const d=packet();d.writeFloatLE(4,68);assert.throws(()=>decodeHorizonPacket(d),/suspension/);
});

test('inactive zero-engine frames are connected data but active frames still need a plausible engine limit',()=>{
 const inactive=decodeHorizonPacket(Buffer.alloc(324));assert.equal(inactive.isRaceOn,false);assert.equal(inactive.engineMaxRpm,null);assert.equal(inactive.rpm,0);assert.equal(inactive.speedKph,0);
 const active=packet();active.writeFloatLE(0,8);assert.throws(()=>decodeHorizonPacket(active),error=>error.message.includes('Maximum engine RPM at byte 8: 0')&&error.inspection.failures.some(c=>c.offset===8));
});
test('rejections report the exact bad field and signed full-left steering is normalized',()=>{
 const b=packet();b.writeFloatLE(NaN,16);assert.throws(()=>decodeHorizonPacket(b),error=>{assert.equal(error.inspection.checks.find(c=>c.offset===16).value,'NaN');assert.match(error.message,/Current engine RPM at byte 16/);return true;});
 const left=packet();left.writeInt8(-128,320);assert.equal(decodeHorizonPacket(left).steer,-1);
});

test('full packet exposes all known channels, Horizon insertion, signed controls and final byte',async()=>{
 const {fullPacket}=await import('../test-support/telemetry-fixtures.js');
 const s=decodeHorizonPacket(fullPacket());
 const expected={engineIdleRpm:950,engineMaxRpmRaw:8000,torqueNm:500,carClass:4,carPerformanceIndex:850,drivetrain:2,cylinders:8,carGroup:37,smashableVelocityDifference:12.5,smashableMass:9,acceleration:[.125,-2.5,9.75],velocity:[12,3,4],angularVelocity:[.125,.25,-.5],yaw:.25,pitch:-.125,roll:.5,position:[1234.5,25,-678.25],boostPsi:14.5,fuelFraction:.75,distanceTraveledM:12345.5,bestLapS:61.25,lastLapS:62.5,currentLapS:10.25,raceTimeS:135.75,lapNumber:123,racePosition:4,clutch:192/255,handbrake:1,steer:-64/127,drivingLine:-127,aiBrakeDifference:127,reservedByte:7,onRumbleStrip:[false,true,false,true]};
 for(const [key,value] of Object.entries(expected))assert.deepEqual(s[key],value,key);
 for(const [key,start] of [['suspensionTravel',.25],['tireSlipRatio',.125],['wheelRotationSpeed',10],['puddleDepth',.125],['surfaceRumble',.25],['tireSlipAngle',.125],['tireCombinedSlip',.25],['suspensionTravelM',.125]])assert.deepEqual(s[key],[start,start+.125,start+.25,start+.375],key);
 assert.deepEqual(s.tireTempC,[180,180.125,180.25,180.375].map(f=>(f-32)*5/9));
 assert.equal(s.speedKph,46.800000000000004);
});

test('unverified packet readings are separate from capture authorization and do not guess other lengths',async()=>{
 const {readHorizonChannels}=await import('../fh6-decoder.js');
 const bad=packet();bad.writeFloatLE(NaN,16);
 assert.throws(()=>decodeHorizonPacket(bad));
 assert.equal(readHorizonChannels(bad).rpm,null);
 assert.equal(readHorizonChannels(bad).speedKph,72);
 assert.equal(readHorizonChannels(Buffer.alloc(311)),null);
 const extra=packet();extra.writeFloatLE(Infinity,264);assert.equal(readHorizonChannels(extra).torqueNm,null);
});
