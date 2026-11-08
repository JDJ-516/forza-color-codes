import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TELEMETRY_GROUPS,telemetryValue} from '../public/telemetry-channels.js';
import {decodeHorizonPacket} from '../fh6-decoder.js';
import {fullPacket} from '../test-support/telemetry-fixtures.js';
test('all 89 displayed packet parameters have populated readings, including zero and false',()=>{
 const readings=decodeHorizonPacket(fullPacket()),fields=TELEMETRY_GROUPS.flatMap(g=>g.fields);
 assert.equal(fields.length,89);
 for(const descriptor of fields)assert.notEqual(telemetryValue(readings,descriptor),'—',descriptor.label);
 assert.equal(telemetryValue({onRumbleStrip:[false]},fields.find(f=>f.key==='onRumbleStrip')),'No');
 assert.equal(telemetryValue({rpm:0},fields.find(f=>f.key==='rpm')),'0 RPM');
});
test('missing and nonfinite values stay unavailable; enum IDs and control units retain meaning',()=>{
 const fields=TELEMETRY_GROUPS.flatMap(g=>g.fields),get=key=>fields.find(f=>f.key===key);
 assert.equal(telemetryValue({},get('rpm')),'—');assert.equal(telemetryValue({rpm:NaN},get('rpm')),'—');
 assert.equal(telemetryValue({gear:0},get('gear')),'R');assert.equal(telemetryValue({gear:11},get('gear')),'N');
 assert.equal(telemetryValue({carClass:4},get('carClass')),'S1');assert.equal(telemetryValue({carClass:99},get('carClass')),'99');
 assert.equal(telemetryValue({drivetrain:2},get('drivetrain')),'AWD');assert.match(telemetryValue({clutch:.5},get('clutch')),/50.*%/);
});
