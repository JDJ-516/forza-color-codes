import {simulateDrag} from './drag.js';
const round=v=>Math.round(v*1000)/1000;
const lin=(a,b,n)=>Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
export async function optimizeDrag(input,curve=[],options={},progress=()=>{},cancelled=()=>false){
 const bounds={fd:[options.fdMin??.5,options.fdMax??10],launch:[options.launchMin??1000,options.launchMax??Math.min(input.shiftRpm,9000)],shift:[options.shiftMin??Math.max(1000,input.shiftRpm*.75),options.shiftMax??input.shiftRpm]};
 for(const [key,[a,b]] of Object.entries(bounds))if(!Number.isFinite(a)||!Number.isFinite(b)||a>b||a<(key==='fd'?.5:1000)||b>(key==='fd'?10:20000))throw new Error('Use ordered search bounds within the stated adjustment limits.');
 const launchKey=input.launchControl==='enabled'?'launchRpm':'manualRpm',baseline=simulateDrag(input,curve);
 const seen=new Set(),leaders=[];let tested=0;
 function evaluate(fd,launch,shift,spacing){
  if(cancelled())throw new Error('Search cancelled after inputs changed.');
  const vector=[round(fd),Math.round(launch),Math.round(shift),round(spacing)],key=vector.join(':');if(seen.has(key))return;seen.add(key);
  if(vector[1]>vector[2])return;
  const gears=input.gears.map((g,i)=>round(g*Math.pow(vector[3],i)));
  if(gears.some((g,i)=>g<.1||g>10||(i&&g>=gears[i-1])))return;
  const value={...input,gears,finalDrive:vector[0],[launchKey]:vector[1],shiftRpm:vector[2]},result=simulateDrag(value,curve);tested++;
  if(result.completed){leaders.push({input:value,result,vector});leaders.sort((a,b)=>a.result.seconds-b.result.seconds);leaders.length=Math.min(leaders.length,5);}
 }
 const inside=(v,key)=>v>=bounds[key][0]&&v<=bounds[key][1];
 if(inside(input.finalDrive,'fd')&&inside(input[launchKey],'launch')&&inside(input.shiftRpm,'shift'))evaluate(input.finalDrive,input[launchKey],input.shiftRpm,1);
 const spacing=options.gearSpacing?[.94,1,1.06]:[1];
 for(const fd of lin(...bounds.fd,9)){
  for(const launch of lin(...bounds.launch,5))for(const shift of lin(...bounds.shift,4))for(const shape of spacing)evaluate(fd,launch,shift,shape);
  progress({tested,best:leaders[0]});await new Promise(r=>setTimeout(r,0));
 }
 for(let pass=0;pass<4&&leaders.length;pass++){
  const best=leaders[0].vector;
  for(let axis=0;axis<(options.gearSpacing?4:3);axis++)for(const direction of [-1,1]){
   const v=[...best],key=['fd','launch','shift'][axis],step=axis===3?.02/2**pass:(bounds[key][1]-bounds[key][0])/(axis===0?16:8)/2**pass;
   v[axis]=Math.max(axis===3?.9:bounds[key][0],Math.min(axis===3?1.1:bounds[key][1],v[axis]+direction*step));evaluate(...v);
  }
  progress({tested,best:leaders[0]});await new Promise(r=>setTimeout(r,0));
 }
 return {tested,baseline,candidates:leaders,bounds};
}
