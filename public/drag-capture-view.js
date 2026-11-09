import {HP_PER_KW,LBFT_PER_NM,readSI,writeSI} from './units.js';
import {summarizeCapture} from './drag-capture-data.js';
import {engineKey} from './engine-observations.js';
const $=s=>document.querySelector(s);
let lastData={},current=null,updatedAt=0,callbacks=null,source=null,seenId=null,analyzed=null,engine=null,statusKey=null;
const reasons={stationary:'Car stopped · drag capture complete',manual:'Capture stopped manually','early-launch':'Moved before GO · start again','car-changed':'Car/build changed · capture stopped','signal-lost':'Telemetry signal lost · capture stopped','game-inactive':'Game inactive · capture stopped','sample-limit':'Capture limit reached · recording stopped'};
function active(){return current&&['countdown','recording'].includes(current.state);}
function setIndicator(state,text,description){const box=$('#drag-capture-indicator');if(!box)return;box.hidden=state==='idle';if(box.dataset.state!==state)box.dataset.state=state;if($('#drag-capture-countdown').textContent!==text)$('#drag-capture-countdown').textContent=text;if($('#drag-capture-state').textContent!==description)$('#drag-capture-state').textContent=description;}
function paint(){
 if(!$('#drag-capture-indicator'))return;
 if(lastData.state==='offline'){setIndicator('offline','OFFLINE','App disconnected · capture status unavailable');return;}
 if(active()&&performance.now()-updatedAt>3000){setIndicator('offline','WAIT','Waiting for capture status');return;}
 if(current?.state==='countdown'){
  const remaining=Math.max(0,current.remainingMs-(performance.now()-updatedAt));
  setIndicator(remaining>0?'countdown':'recording',remaining>0?String(Math.ceil(remaining/1000)):'GO',remaining>0?'Hold still · launch on green GO':'GO · launch now');
 }else if(current?.state==='recording')setIndicator('recording',current.waitingForTelemetry?'ARMED':current.launched?'LIVE':'GO',current.waitingForTelemetry?'Waiting for driving telemetry; capture will begin when data arrives.':current.launched?`Recording · ${current.recordedSamples} frames · stops when the car returns to 0 mph`:'GO · launch now');
 else if(current?.state==='stopped')setIndicator(['signal-lost','early-launch','car-changed','game-inactive'].includes(current.reason)?'error':'stopped','STOPPED',reasons[current.reason]||'Capture stopped');
 else setIndicator('idle','READY','Start now at any speed, or choose the optional countdown');
}
function supported(m,key){return Number.isFinite(m?.[key])&&(key==='peakPowerW'?(m.powerSamples??m.eligibleSamples):(m.torqueSamples??m.eligibleSamples))>=5;}
function target(name,value){const c=$(`#drag-form [name=${name}]`);if(!c||!Number.isFinite(value)||c.dataset.telemetryManual==='1'||(c.value!==''&&c.dataset.telemetryValue!==c.value))return;if(value<Number(c.min)||value>Number(c.max))return;const next=String(Math.round(value));if(c.value===next)return;c.value=next;c.dataset.telemetryValue=next;c.dispatchEvent(new CustomEvent('input',{bubbles:true,detail:{telemetry:true}}));}
function clearAutoTargets(){for(const name of ['torquePeakRpm','shiftRpm']){const c=$(`#drag-form [name=${name}]`);if(c.dataset.telemetryManual!=='1'&&c.dataset.telemetryValue===c.value){c.value='';delete c.dataset.telemetryValue;c.dispatchEvent(new CustomEvent('input',{bubbles:true,detail:{telemetry:true}}));}}}
function showEngine(){
 if(!$('#drag-measured-power'))return;
 const power=supported(engine,'peakPowerW'),torque=supported(engine,'peakTorqueNm');
 $('#drag-measured-power').textContent=power?(engine.peakPowerW/1000*HP_PER_KW).toFixed(1)+' HP':'—';
 $('#drag-measured-torque').textContent=torque?(engine.peakTorqueNm*LBFT_PER_NM).toFixed(1)+' ft-lb':'—';
 const matching=source==='import'||!lastData.latest?.isRaceOn||!engine?.key||engine.key===engineKey(lastData.latest);
 $('#drag-apply-measured').disabled=!(power||torque)||!matching;
 if(matching){if(torque)target('torquePeakRpm',engine.torquePeakRpm);if(engine?.observedShifts)target('shiftRpm',engine.shiftRpm);}
 $('#drag-engine-source').textContent=engine?(matching?`${source==='import'?'Imported run':'Drag capture'} · ${engine.eligibleSamples??0} eligible engine samples · ${engine.observedShifts??0} observed upshifts. `+(engine.observedShifts?`Observed median shift: ${Math.round(engine.shiftRpm)} RPM.`:'No observed shift RPM yet.'): 'This captured run belongs to a different car/build. Start a new capture for the current car.'):'No captured engine measurements yet. Power and torque remain manual model inputs.';
}
async function post(action){const response=await fetch('/api/telemetry/drag/'+action,{method:'POST',headers:{'X-Forza-Garage':'1'}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Drag capture is unavailable.');return data;}
async function analyzeStopped(capture){
 const token=`${capture.id}:${capture.stoppedAt}`;if(analyzed===token||capture.recordedSamples<2||['car-changed','early-launch'].includes(capture.reason))return;
 analyzed=token;
 try{const response=await fetch('/api/telemetry/drag/session',{cache:'no-store'}),session=await response.json();if(!response.ok)throw new Error(session.error);if(current?.id!==capture.id||current.state!=='stopped'||source==='import')return;callbacks?.renderRun(session,true);}
 catch(error){$('#drag-run-status').textContent=error.message;}
}
export function updateDragCapture(data){
 lastData=data;current=data.dragCapture??null;updatedAt=performance.now();
 if(current&&current.id!==seenId){seenId=current.id;if(current.id>0)source='live';}
 if(current&&source==='live'){engine=current.measurements;showEngine();}
 if(!current&&source==='live'){engine=null;showEngine();}
 if($('#drag-reset-capture')){
  const unavailable=['disabled','stopped','error','offline'].includes(data.state);$('#drag-reset-capture').disabled=!!active()||unavailable;$('#drag-start-now').disabled=!!active()||unavailable;
  $('#drag-stop-capture').disabled=!active()||data.state==='offline';
 }
 if(current?.id>0&&source!=='import'){
  const token=`${current.id}:${current.state}:${current.stoppedAt??''}`;
  if(statusKey!==token){statusKey=token;if(current.state==='stopped')$('#drag-run-status').textContent=(reasons[current.reason]||'Capture stopped')+` · ${current.recordedSamples} frames retained.`;else if(current.state==='recording')$('#drag-run-status').textContent='Recording your drag run. Braking keeps recording; coming to a complete stop after launch ends the capture.';}
 }
 paint();if(current?.state==='stopped'&&callbacks)analyzeStopped(current);
}
export function showImportedEngineData(session,live=false){source=live?'live':'import';engine=summarizeCapture(session.samples);showEngine();}
function powerWeight(){const form=$('#drag-form');if(!form)return;const power=Number(form.elements.powerKw.value),mass=Number(form.elements.mass.value);$('#drag-pwr').textContent=power>0&&mass>0?(power/mass).toFixed(4)+' HP/lb':'—';}
export function attachDragCapture(handlers){
 callbacks=handlers;
 async function begin(countdown){
  try{
   $('#drag-reset-capture').disabled=true;$('#drag-start-now').disabled=true;
   const capture=await post(countdown?'start?countdown=1':'start');callbacks.clearRun();source='live';engine=null;clearAutoTargets();showEngine();analyzed=null;
   $('#drag-run-status').textContent=countdown?'Optional countdown started. A standing-start ET needs a captured stationary launch.':'Capture started. Moving captures provide engine evidence; a standing-start ET needs a captured stationary launch.';
   updateDragCapture({...lastData,dragCapture:capture});
  }catch(error){$('#drag-run-status').textContent=error.message;updateDragCapture(lastData);}
 }
 $('#drag-reset-capture').addEventListener('click',()=>begin(true));
 $('#drag-start-now').addEventListener('click',()=>begin(false));
 $('#drag-stop-capture').addEventListener('click',async()=>{try{updateDragCapture({...lastData,dragCapture:await post('stop')});}catch(error){$('#drag-run-status').textContent=error.message;}});
 $('#drag-apply-measured').addEventListener('click',()=>{
  for(const [name,key,factor] of [['powerKw','peakPowerW',.001],['torqueNm','peakTorqueNm',1]])if(supported(engine,key)){const c=$(`#drag-form [name=${name}]`),value=engine[key]*factor;if(value>=readSI({value:c.min,dataset:c.dataset})&&value<=readSI({value:c.max,dataset:c.dataset})){writeSI(c,value);c.dispatchEvent(new Event('input',{bubbles:true}));}}
 });
 $('#drag-form').addEventListener('input',powerWeight);$('#drag-builds').addEventListener('click',()=>queueMicrotask(powerWeight));
 document.addEventListener('ingenium:car-changed',()=>{clearAutoTargets();showEngine();powerWeight();});
 setInterval(paint,100);powerWeight();showEngine();updateDragCapture(lastData);
}
