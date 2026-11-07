export const SEASONAL_WINDOW_MS=7*86400000;
export function weeklySeasonalCars(cars,now=Date.now()){
 const seen=new Set();return cars.filter(car=>{
  if(car.category!=='Seasonal')return false;
  const age=now-Date.parse(car.addedAt);if(!Number.isFinite(age)||age<0||age>=SEASONAL_WINDOW_MS)return false;
  if(/yet to be released|unreleased/i.test([car.classification||'',...(car.details||[]).map(d=>d.value)].join(' ')))return false;
  const key=JSON.stringify([car.year,car.brand,car.model]);if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>Date.parse(b.addedAt)-Date.parse(a.addedAt));
}
