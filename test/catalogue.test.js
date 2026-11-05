import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {catalogueMetadata} from '../public/data.js';
import {recipeText} from '../public/recipe.js';
const colors=JSON.parse(await readFile(new URL('../public/catalogue.json',import.meta.url)));
const report=JSON.parse(await readFile(new URL('../public/import-report.json',import.meta.url)));

test('all source recipes are retained with unique identities and traceable source rows',()=>{
 assert.equal(colors.length,11004);
 assert.equal(colors.filter(c=>c.category==='Vehicle').length,10936);
 assert.equal(colors.filter(c=>c.category==='Wheel').length,68);
 assert.equal(new Set(colors.map(c=>c.id)).size,colors.length);
 assert.deepEqual(catalogueMetadata,report.metadata);
 const rows=new Set();
 for(const c of colors){
  const row=`${c.source.sheet}:${c.source.row}`;
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
