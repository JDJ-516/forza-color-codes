import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weeklySeasonalCars,SEASONAL_WINDOW_MS} from '../public/seasonal-cars.js';
const now=Date.UTC(2026,10,7),car={id:'a',year:2026,brand:'Brand',model:'Car',category:'Seasonal',details:[],classification:'',addedAt:new Date(now-1000).toISOString()};
test('weekly carousel includes only newly detected Seasonal entries and skips unreleased/other/expired/future items',()=>{
 const rows=[car,{...car,id:'duplicate'}, {...car,id:'newest',model:'Newer',addedAt:new Date(now).toISOString()}, {...car,id:'dlc',category:'Car Pass DLC'}, {...car,id:'old',addedAt:new Date(now-SEASONAL_WINDOW_MS).toISOString()}, {...car,id:'future',addedAt:new Date(now+1000).toISOString()}, {...car,id:'unreleased',model:'Future car',classification:'Cars Highlighted like this are yet to be released'}, {...car,id:'notes',model:'Future note',details:[{label:'Notes',value:'Unreleased'}]}, {...car,id:'unknown',addedAt:null}];
 assert.deepEqual(weeklySeasonalCars(rows,now).map(c=>c.id),['newest','a']);
});
test('a car leaves the weekly carousel after seven days without changing its stored first-seen date',()=>{const before=car.addedAt;assert.equal(weeklySeasonalCars([car],now).length,1);assert.equal(weeklySeasonalCars([car],now+SEASONAL_WINDOW_MS).length,0);assert.equal(car.addedAt,before);});
