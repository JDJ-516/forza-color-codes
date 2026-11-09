import {engineKey,emptyEngineMeasurements,observeEngine} from './telemetry-engine.js';
import {observedShift,medianShift} from './public/drag-capture-data.js';
import {SESSION_SCHEMA} from './public/telemetry-analysis.js';

// A dedicated drag buffer: other telemetry disciplines keep receiving/recording.
export function createDragCapture({now=Date.now}={}){
 let state='idle',id=0,key=null,startedAt=null,startsAt=null,stoppedAt=null,reason=null,lastFrameAt=null;
 let samples=[],lastStored=null,launched=false,stationarySince=null,measurements=emptyEngineMeasurements(),previous=null,shifts=[];
 const active=()=>state==='countdown'||state==='recording';
 function stop(why='manual'){if(active()){state='stopped';reason=why;stoppedAt=now();}return snapshot();}
 function advance(){
  if(active()&&lastFrameAt!==null&&now()-lastFrameAt>=3000){state='stopped';reason='signal-lost';stoppedAt=now();return;}
  if(state==='countdown'&&now()>=startsAt)state='recording';
 }
 function snapshot(){
  advance();
  return {id,state,key,startedAt,startsAt,stoppedAt,reason,remainingMs:state==='countdown'?Math.max(0,startsAt-now()):0,recordedSamples:samples.length,launched,measurements:{...measurements,shiftRpm:medianShift(shifts),observedShifts:shifts.length}};
 }
 function start(sample){
  if(active())throw new Error('A drag capture is already in progress. Stop it before starting another.');
  if(!sample?.isRaceOn||sample.carOrdinal<0||!Number.isFinite(sample.speedKph)||sample.speedKph>=1)throw new Error('Enter driving and stop the car before starting a drag capture.');
  id++;state='countdown';key=engineKey(sample);startedAt=now();startsAt=now()+3000;stoppedAt=null;reason=null;lastFrameAt=now();samples=[];lastStored=null;launched=false;stationarySince=null;measurements=emptyEngineMeasurements(key);previous=null;shifts=[];
  return snapshot();
 }
 function ingest(sample){
  advance();if(!active())return;
  lastFrameAt=now();
  if(!sample.isRaceOn){stop('game-inactive');return;}
  if(engineKey(sample)!==key){stop('car-changed');return;}
  if(state==='countdown'&&sample.speedKph>=1){stop('early-launch');return;}
  const frame={...sample,gameTimestampMs:sample.timestampMs,timestampMs:now()};
  if(state==='countdown'){
   // Keep the final stationary second so the run can launch on GO immediately.
   if(now()<startsAt-1000)return;
  }else{
   if(sample.speedKph>=1)launched=true;
   if(launched&&sample.speedKph<=.1){stationarySince??=now();}else stationarySince=null;
   measurements=observeEngine(measurements,frame);
  }
  if(lastStored===null||now()-lastStored>=15){
   const shift=observedShift(previous,frame);if(shift!==null)shifts.push(shift);previous=frame;
   samples.push(frame);lastStored=now();
   if(samples.length>=18000){stop('sample-limit');return;}
  }
  if(launched&&stationarySince!==null&&now()-stationarySince>=250)stop('stationary');
 }
 return {start,stop,ingest,snapshot,session(){return {schema:SESSION_SCHEMA,source:'Dedicated live drag capture',timestampBasis:'receiver UTC milliseconds',sampling:'Minimum 15 ms; maximum 18,000 samples; stationary countdown lead-in',capture:snapshot(),samples:samples.map(s=>({...s}))};}};
}
