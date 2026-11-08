import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weeklySeasonalCars,weeklyCarHighlights,SEASONAL_WINDOW_MS} from '../public/seasonal-cars.js';
const now=Date.UTC(2026,10,7),car={id:'a',year:2026,brand:'Brand',model:'Car',category:'Seasonal',details:[],classification:'',addedAt:new Date(now-1000).toISOString()};
test('weekly carousel includes only newly detected Seasonal entries and skips unreleased/other/expired/future items',()=>{
 const rows=[car,{...car,id:'duplicate'}, {...car,id:'newest',model:'Newer',addedAt:new Date(now).toISOString()}, {...car,id:'dlc',category:'Car Pass DLC'}, {...car,id:'old',addedAt:new Date(now-SEASONAL_WINDOW_MS).toISOString()}, {...car,id:'future',addedAt:new Date(now+1000).toISOString()}, {...car,id:'unreleased',model:'Future car',classification:'Cars Highlighted like this are yet to be released'}, {...car,id:'notes',model:'Future note',details:[{label:'Notes',value:'Unreleased'}]}, {...car,id:'unknown',addedAt:null}];
 assert.deepEqual(weeklySeasonalCars(rows,now).map(c=>c.id),['newest','a']);
});
test('a car leaves the weekly carousel after seven days without changing its stored first-seen date',()=>{const before=car.addedAt;assert.equal(weeklySeasonalCars([car],now).length,1);assert.equal(weeklySeasonalCars([car],now+SEASONAL_WINDOW_MS).length,0);assert.equal(car.addedAt,before);});

test('dated Car Pass releases appear even when already present in the baseline, while future/expired dates and unconfirmed releases do not',()=>{
 const time=new Date(2026,10,7,12).getTime(),dated={...car,id:'dated',model:'Dated car',category:'Car Pass DLC',addedAt:null,details:[{label:'DD/MM/YYYY',value:'2026-11-05'}]};
 const list=weeklyCarHighlights([dated,{...dated,id:'future',model:'Future',details:[{label:'DD/MM/YYYY',value:'2026-11-12'}]},{...dated,id:'old',model:'Old',details:[{label:'DD/MM/YYYY',value:'2026-10-29'}]},{...dated,id:'blocked',model:'Unreleased',classification:'Unreleased'},{...dated,id:'wrong-date',model:'Invalid date',details:[{label:'DD/MM/YYYY',value:'2026-11-31'}]}],time);
 assert.equal(list.length,1);assert.equal(list[0].highlightKind,'release-date');assert.equal(list[0].highlightDate,'2026-11-05');
 const slash=weeklyCarHighlights([{...dated,details:[{label:'DD/MM/YYYY',value:'05/11/2026'}]}],time);assert.equal(slash[0].highlightDate,'2026-11-05');
});

test('the uploaded sheet provides the dated Mustang GTD Car Pass release even without first-seen timestamps',async()=>{
 const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(new URL('../public/rare-cars.json',import.meta.url),'utf8'));
 const highlights=weeklyCarHighlights(data.cars,new Date(2026,10,7,12).getTime());const mustang=highlights.find(c=>c.year===2025&&c.brand==='Ford'&&c.model==='Mustang GTD');assert.ok(mustang);assert.equal(mustang.category,'Car Pass DLC');assert.equal(mustang.highlightKind,'release-date');assert.equal(mustang.highlightDate,'2026-11-05');assert.equal(highlights.some(c=>c.model==='GT 63 4Matic+'),false);
});
