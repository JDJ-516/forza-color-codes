import {readFileSync} from 'node:fs';
const catalogue=JSON.parse(readFileSync(new URL('./public/car-identities.json',import.meta.url),'utf8'));
export function resolveCar(ordinal){
 if(!Number.isInteger(ordinal)||ordinal<0)return null;
 const entry=catalogue.cars[String(ordinal)];
 return entry?{ordinal,...entry,name:`${entry.year} ${entry.make} ${entry.model}`}:{ordinal,year:null,make:null,model:null,name:null,source:null};
}
