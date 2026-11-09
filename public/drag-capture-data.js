import {emptyEngineMeasurements,observeEngine} from './engine-observations.js';
export function observedShift(previous,sample){
 if(!previous||sample.timestampMs<=previous.timestampMs||sample.timestampMs-previous.timestampMs>250)return null;
 return previous.gear>=1&&sample.gear===previous.gear+1&&previous.throttle>=.8&&previous.brake<=.02&&sample.brake<=.02&&previous.rpm>=1000?previous.rpm:null;
}
export const medianShift=values=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
export function summarizeCapture(samples){
 let measurements=emptyEngineMeasurements(),previous=null;const shifts=[];
 for(const sample of samples){measurements=observeEngine(measurements,sample);const shift=observedShift(previous,sample);if(shift!==null)shifts.push(shift);previous=sample;}
 return {...measurements,shiftRpm:medianShift(shifts),observedShifts:shifts.length};
}
