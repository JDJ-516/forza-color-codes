import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogueMetadata} from '../public/data.js';
import {recipeText} from '../public/recipe.js';
const colors=JSON.parse(await readFile(new URL('../public/catalogue.json',import.meta.url)));
const report=JSON.parse(await readFile(new URL('../public/import-report.json',import.meta.url)));

test('all source recipes are retained with unique identities and traceable source rows',()=>{
 assert.equal(colors.length,11008);
 assert.equal(colors.filter(c=>c.category==='Vehicle').length,10940);
 assert.equal(colors.filter(c=>!c.source.historical).length,11004);
 assert.equal(colors.filter(c=>c.category==='Wheel').length,68);
 assert.equal(new Set(colors.map(c=>c.id)).size,colors.length);
 assert.deepEqual(catalogueMetadata,report.metadata);
 const rows=new Set();
 for(const c of colors){
  const row=`${c.source.url || "workbook"}:${c.source.sheet}:${c.source.row}`;
  assert.ok(!rows.has(row)); rows.add(row);
  assert.ok(c.name && c.manufacturer && c.finish);
  assert.match(c.hex,/^#[0-9a-f]{6}$/);
  assert.ok(c.layers.length>=1 && c.layers.length<=2);
  for(const layer of c.layers) for(const v of layer.values) assert.ok(v===null || v>=0 && v<=1);
 }
 assert.equal(colors.filter(c=>c.issues.length).length,7);
 assert.equal(colors.reduce((n,c)=>n+c.issues.length,0),12);
 for(const issue of report.issues){
  const c=colors.find(c=>c.id===issue.id);
  assert.deepEqual(c.issues,issue.cells);
 }
});

test('two-layer recipes copy exact slider values and source notes',()=>{
 const first=colors[0];
 assert.equal(first.name,'Gloss Atomic Teal');
 assert.equal(first.finish,'Metal Flake');
 const text=recipeText(first);
 assert.match(text,/Color 1 \(X\): H: 0\.53 L \| S: 0\.99 R \| B: 0\.57 L/);
 assert.match(text,/Color 2 \(Y\): H: 0\.53 L \| S: 0\.98 R \| B: 0\.76 L/);
 assert.match(text,/Vehicle Colours, row 3/);
 const withNotes=colors.find(c=>c.notes==='176/A');
 assert.match(recipeText(withNotes),/Notes: 176\/A/);
 assert.equal(withNotes.layers.length,1);
});

test('malformed and absent source values are visible without guessed repairs',()=>{
 const malformed=colors.find(c=>c.name==='Luci di Bosco');
 assert.equal(malformed.h,null);
 assert.match(recipeText(malformed),/0\.0\.0 L/);
 assert.match(recipeText(malformed),/REVIEW REQUIRED/);
 const missing=colors.find(c=>c.name==='Borealis Black' && c.manufacturer==='McLaren');
 assert.equal(missing.layers[1].raw[2],null);
 assert.match(recipeText(missing),/B: Not provided/);
});

test('historical additions preserve source provenance and never replace current workbook alternatives',()=>{
 const added=colors.filter(c=>c.source.historical);
 assert.equal(added.length,4);
 assert.equal(report.externalSources[0].rowsCompared,10899);
 assert.equal(report.externalSources[0].duplicateRecipesSkipped,10895);
 assert.equal(report.externalSources[0].sameNameConflicts,3);
 assert.equal(report.externalSources[0].newNameIdentities,1);
 for(const c of added){
  assert.match(c.source.url,/github.com\/nickdupuis\/forza-paint-code-picker\/blob\/[a-f0-9]{40}\//);
  assert.ok(c.source.warning.length>40);
  const copy=recipeText(c);
  assert.ok(copy.includes(c.source.url));
  assert.match(copy,/HISTORICAL ALTERNATIVE/);
  for(const id of c.source.conflictsWith){
   const current=colors.find(row=>row.id===id);
   assert.equal(current.source.historical,undefined);
   assert.equal(current.name,c.name);
   assert.notDeepEqual(current.layers,c.layers);
  }
 }
 const lunar=added.find(c=>c.name==='Lunar Rock Pearl');
 assert.equal(lunar.finish,'Metal Flake');
 assert.equal(lunar.layers.length,2);
 assert.ok(colors.some(c=>c.name==='Lunar Rock' && c.manufacturer==='Toyota' && !c.source.historical));
});
