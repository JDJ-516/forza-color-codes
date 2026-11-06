import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseRareCars,createRareCarSource,REFRESH_MS} from '../rare-cars.js';
import {createServer} from '../server.js';
const source=await readFile(new URL('../data/rare-cars-source.xlsx',import.meta.url));
test('all workbook categories and acquisition details survive import, including source legends and dates',async()=>{
 const data=parseRareCars(source),bundled=JSON.parse(await readFile(new URL('../public/rare-cars.json',import.meta.url),'utf8'));
 assert.equal(data.cars.length,284);assert.equal(data.categories.length,10);assert.deepEqual(data.cars,bundled.cars);
 assert.deepEqual(data.categories.map(c=>c.count),[61,46,4,69,5,25,19,28,23,4]);
 const spawn=data.cars.find(c=>c.category==='Special Aftermarket Car Spawns'&&c.model.includes('#43 Dodge'));assert.ok(spawn.details.some(d=>d.value.includes('Shimanoyama')));assert.match(spawn.classification,/Wheelspins/);
 const barn=data.cars.find(c=>c.category==='Barn Finds & Treasure Cars'&&c.model==='Sierra Cosworth RS500');assert.match(barn.classification,/Barn Finds/);
 const carPass=data.cars.find(c=>c.category==='Car Pass DLC'&&c.model==='Mustang GTD');assert.ok(carPass.details.some(d=>d.value==='2026-11-05'));
 assert.ok(data.cars.some(c=>c.year===2554));assert.ok(data.cars.some(c=>c.model==='XJ-S Forza Edition'&&c.details.some(d=>d.value.trim()==='Unreleased')));
 assert.throws(()=>parseRareCars(Buffer.from('<html>Sign in</html>')),/workbook/);
});
test('refresh is coalesced, rate limited and durable; failed/invalid exports retain the last good copy',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rare-sync-'));t.after(()=>rm(dir,{recursive:true,force:true}));let now=Date.UTC(2026,10,6),calls=0,mode='ok';
 const fetcher=async()=>{calls++;await new Promise(r=>setTimeout(r,5));return mode==='ok'?new Response(source):mode==='denied'?new Response('denied',{status:403}):new Response('<html>sign in</html>');};
 const options={cachePath:join(dir,'cache.json'),fetcher,now:()=>now};const service=createRareCarSource(options);
 const [a,b]=await Promise.all([service.snapshot(),service.snapshot()]);assert.equal(calls,1);assert.equal(a.sync.origin,'live');assert.equal(a.sha256,b.sha256);
 await service.snapshot({force:true});assert.equal(calls,1);now+=30001;await service.snapshot({force:true});assert.equal(calls,2);
 mode='denied';now+=REFRESH_MS;const stale=await service.snapshot();assert.equal(stale.cars.length,284);assert.match(stale.sync.error,/403/);assert.equal(stale.sync.checkedAt,a.sync.checkedAt===null?null:new Date(now-REFRESH_MS).toISOString());
 mode='invalid';now+=REFRESH_MS;const invalid=await service.snapshot();assert.equal(invalid.sha256,a.sha256);assert.match(invalid.sync.error,/workbook/);
 const restored=await createRareCarSource(options).snapshot();assert.equal(restored.sync.origin,'cached');assert.equal(restored.sha256,a.sha256);
 mode='ok';now+=REFRESH_MS;const recovered=await service.snapshot();assert.equal(recovered.sync.origin,'live');assert.equal(recovered.sync.error,null);assert.equal(recovered.cars.length,284);
});
test('first offline launch uses uploaded workbook, reports unknown age, and API protects manual refresh',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'rare-offline-'));t.after(()=>rm(dir,{recursive:true,force:true}));const rareCars=createRareCarSource({cachePath:join(dir,'cache.json'),fetcher:async()=>{throw Error('offline');}});
 const server=createServer({rareCars});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(base+'/api/rare-cars'),data=await response.json();assert.equal(response.status,200);assert.equal(data.sync.origin,'bundled');assert.equal(data.sync.checkedAt,null);assert.equal(data.sync.error,'offline');assert.equal(data.cars.length,284);
 assert.equal((await fetch(base+'/api/rare-cars',{method:'POST',headers:{Origin:'https://other.example','X-Forza-Garage':'1'}})).status,403);
 assert.equal((await fetch(base+'/api/rare-cars',{method:'POST',headers:{'X-Forza-Garage':'1'}})).status,200);
});
