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
