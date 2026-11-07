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
