export const SEASONAL_WINDOW_MS=7*86400000;
export function weeklySeasonalCars(cars,now=Date.now()){
 const seen=new Set();return cars.filter(car=>{
  if(car.category!=='Seasonal')return false;
  const age=now-Date.parse(car.addedAt);if(!Number.isFinite(age)||age<0||age>=SEASONAL_WINDOW_MS)return false;
  if(/yet to be released|unreleased/i.test([car.classification||'',...(car.details||[]).map(d=>d.value)].join(' ')))return false;
  const key=JSON.stringify([car.year,car.brand,car.model]);if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>Date.parse(b.addedAt)-Date.parse(a.addedAt));
}

// Date-only Car Pass releases are separate from first-detected Seasonal edits.
// Neither source supplies a complete official Festival Playlist schedule.
export function weeklyCarHighlights(cars,now=Date.now()){
 const today=new Date(now),day=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()),earliest=day-6*86400000,items=new Map();
 const key=car=>JSON.stringify([car.year,car.brand.trim().toLowerCase(),car.model.trim().toLowerCase()]);
 for(const car of cars){
  if(car.category!=='Car Pass DLC'||/yet to be released|unreleased/i.test([car.classification||'',...(car.details||[]).map(d=>d.value)].join(' ')))continue;
  let date=car.details.find(d=>/^(DD\/MM\/YYYY|Release Date)$/i.test(d.label.trim()))?.value.trim();
  const slash=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date||'');if(slash)date=`${slash[3]}-${slash[2].padStart(2,'0')}-${slash[1].padStart(2,'0')}`;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))continue;const stamp=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==date||stamp<earliest||stamp>day)continue;
  items.set(key(car),{...car,highlightKind:'release-date',highlightDate:date});
 }
 for(const car of weeklySeasonalCars(cars,now))if(!items.has(key(car)))items.set(key(car),{...car,highlightKind:'sheet-addition',highlightDate:car.addedAt});
 return [...items.values()].sort((a,b)=>Date.parse(b.highlightDate)-Date.parse(a.highlightDate));
}
