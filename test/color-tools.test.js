import {test} from 'node:test';
import assert from 'node:assert/strict';
import {personalColor,nextFeaturedColor,FEATURE_INTERVAL_MS,needsSecondLayer,FINISH_TYPES,paintTextColor} from '../public/color-tools.js';
const fields={name:'My paint',manufacturer:'',finish:'Normal',h:'.12',s:'.3',b:'.7',hSide:'L',sSide:'R',notes:''};
test('personal recipes allow no manufacturer and preserve both raw HSB groups and L/R markers',()=>{
 const c=personalColor(fields,{id:'personal'});assert.equal(c.manufacturer,'');assert.equal(c.layers.length,1);assert.deepEqual(c.layers[0].raw,['0.12 L','0.30 R','0.70']);
 const two=personalColor({...fields,finish:'Metal Flake',h2:'.8',s2:'.5',b2:'.6',h2Side:'R',s2Side:'L',b2Side:'R'},{id:'two',secondary:true});assert.equal(two.layers.length,2);assert.deepEqual(two.layers[1].raw,['0.80 R','0.50 L','0.60 R']);
 assert.throws(()=>personalColor({...fields,finish:'Metal Flake'},{id:'no'}),/both paint layers/);
 assert.throws(()=>personalColor({...fields,h:''},{id:'no'}),/between 0 and 1/);
 const customFinish=personalColor({...fields,finish:'__custom_finish__',customFinish:'My custom material'},{id:'finish'});assert.equal(customFinish.finish,'My custom material');
 const custom=personalColor({...fields,manufacturer:'__custom__',customManufacturer:' Custom Works '},{id:'custom'});assert.equal(custom.manufacturer,'Custom Works');
 assert.throws(()=>personalColor({...fields,manufacturer:'__custom__'},{id:'no'}),/custom manufacturer/);
});
test('finish types cover library materials and require secondary settings for layered paints',()=>{
 for(const finish of ['Chrome','Metal Flake','Two-Tone Matte','Aluminum Brushed','Carbon Fiber Polished','Prismacolor White'])assert.ok(FINISH_TYPES.includes(finish));
 assert.equal(paintTextColor('#00aa00'),'#000000');assert.equal(paintTextColor('#224c3d'),'#ffffff');
 assert.equal(needsSecondLayer('Two-Tone Semigloss'),true);assert.equal(needsSecondLayer('Prismacolor White'),true);assert.equal(needsSecondLayer('Normal'),false);
});
test('featured color remains stable for ten minutes, then rotates without immediately repeating',()=>{
 const pool=[{id:'a',hex:'#123456'},{id:'b',hex:'#abcdef'},{id:'bad',hex:'#123456',issues:[{}]},{id:'old',hex:'#123456',source:{historical:true}}];
 const initial=nextFeaturedColor(pool,null,1000,()=>0);assert.deepEqual(initial,{id:'a',changedAt:1000});
 assert.deepEqual(nextFeaturedColor(pool,initial,1000+FEATURE_INTERVAL_MS-1,()=>.9),initial);
 assert.deepEqual(nextFeaturedColor(pool,initial,1000+FEATURE_INTERVAL_MS,()=>0),{id:'b',changedAt:1000+FEATURE_INTERVAL_MS});
 assert.equal(nextFeaturedColor([pool[1]],initial,1100,()=>0).id,'b');assert.equal(nextFeaturedColor([],null),null);
 assert.equal(nextFeaturedColor(pool,{id:'a',changedAt:10000000},1000,()=>.9).changedAt,1000);
});
