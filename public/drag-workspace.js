import {attachSetupSheet} from './setup-sheet-view.js';
import {readSI,writeSI,mph,usError} from './units.js';
import {tireDiameterFromSize} from './drag-power-fit.js';
import {sessionGearingEvidence} from './fh6-setup.js';
import {attachDragCapture,showImportedEngineData,clearCapturedEngine,captureMatchesCurrent} from './drag-capture-view.js';
import {captureKey} from './competition.js';
import {analyzeDragSession,FH6_STRIPS} from './drag.js';
import {analyzeSession} from './telemetry-analysis.js';
const $=s=>document.querySelector(s),form=$('#drag-form'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=name=>form.elements.namedItem(name),notice=text=>document.dispatchEvent(new CustomEvent('garage:notice',{detail:text}));
let run=null,loadedSession=null,loadedSessionLive=false,activeCurve=[];
function read(key){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a:[];}catch{return [];}}
function store(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{notice('Browser storage unavailable. Export a backup before closing this session.');return false;}}
function inputs(){
 const i={};for(const c of form.elements){if(!c.name)continue;i[c.name]=c.type==='number'?(c.value===''?NaN:readSI(c)):c.name==='setupGearCount'?(c.value===''?NaN:Number(c.value)):c.value.trim();}
 i.distanceM=field('distanceM').value===''?NaN:readSI(field('distanceM'));
 const captured=loadedSession?sessionGearingEvidence(loadedSession):null;
 if(!Number.isFinite(i.engineLimitRpm)&&captured?.engineLimitRpm)i.engineLimitRpm=captured.engineLimitRpm;
 if(!Number.isFinite(i.tireDiameterIn)&&captured?.tireDiameterIn)i.tireDiameterIn=captured.tireDiameterIn;
 return i;
}
function syncTireSize(){
 const c=field('tireSize'),target=field('tireDiameterIn');
 try{
  const diameter=tireDiameterFromSize(c.value);c.setCustomValidity('');c.removeAttribute('aria-invalid');$('#drag-tire-error').textContent='';
  if(diameter!==null){writeSI(target,diameter);target.dataset.tireSizeSource='1';target.dataset.telemetryManual='1';delete target.dataset.telemetryValue;$('#drag-gearing-source').textContent='Diameter calculated automatically from your installed tire size.';}
  else if(target.dataset.tireSizeSource==='1'){writeSI(target,null);delete target.dataset.tireSizeSource;}
 }catch(e){writeSI(target,null);c.setCustomValidity(e.message);c.setAttribute('aria-invalid','true');$('#drag-tire-error').textContent=e.message;}
}
field('tireSize').addEventListener('input',syncTireSize);
field('tireDiameterIn').addEventListener('input',e=>{if(e.isTrusted){field('tireSize').value='';field('tireSize').setCustomValidity('');field('tireSize').removeAttribute('aria-invalid');$('#drag-tire-error').textContent='';delete field('tireDiameterIn').dataset.tireSizeSource;}});
const stripSelect=$('#drag-strip');
const venueGroup=document.createElement('optgroup');venueGroup.label='FH6 drag strips';
for(const strip of FH6_STRIPS){
 const short={'irakawa-space-centre':'Irakawa Space Centre','ito-airfield':'Ito Airfield','horizon-festival':'Horizon Festival'}[strip.id]||strip.name;
 const option=new Option(`${short} · ${strip.miles} mi`,`fh6:${strip.id}:${strip.meters}`);option.dataset.fh6Id=strip.id;option.dataset.venueName=strip.name;venueGroup.append(option);
}
stripSelect.insertBefore(venueGroup,stripSelect.querySelector('[value=custom]'));
function syncStrip(resetCustom=true){
 const custom=stripSelect.value==='custom',option=stripSelect.selectedOptions[0];
 $('#custom-distance-field').hidden=!custom;field('distanceM').disabled=!custom;field('distanceM').required=custom;
 if(custom){if(resetCustom)field('distanceM').value='';$('#drag-strip-name').value=field('distanceM').value?`Custom strip (${field('distanceM').value} ft)`:'Custom strip';}
 else{writeSI(field('distanceM'),stripSelect.value?Number(stripSelect.value.split(':').at(-1)):null);$('#drag-strip-name').value=option?.dataset.venueName||option?.textContent||'';}

}
const curve=()=>activeCurve;
function calculate(){
 const i=inputs();$('#drag-error').textContent='';
 $('#drag-validation').hidden=!run?.completed;
 $('#drag-quick-result').textContent=run?.completed?`Measured ${run.seconds.toFixed(3)} s · ${mph(run.trapKph).toFixed(1)} mph`:'Complete Powertrain details to generate a starting tune. Capture a run to measure performance.';
 if(run?.completed)$('#drag-validation').textContent=`Measured run: ${run.seconds.toFixed(3)} s · ${mph(run.trapKph).toFixed(1)} mph. ${run.launchSlipPercent===null?'No launch-slip channel.':`Launch slip exposure: ${run.launchSlipPercent.toFixed(1)}%.`} ${run.brakingSeconds>.05?'Braking occurred before the finish; repeat a clean run.':''} Compare the same car, strip and conditions. No simulated ET is substituted for a real result.`;
 return {input:i};
}
form.addEventListener('input',e=>{if(e.target===field('distanceM')){$('#drag-strip-name').value=field('distanceM').value?`Custom strip (${field('distanceM').value} ft)`:'Custom strip';const chosen=FH6_STRIPS.find(s=>s.id===stripSelect.selectedOptions[0]?.dataset.fh6Id);if(chosen&&Math.abs(readSI(field('distanceM'))-chosen.meters)>.0005)stripSelect.value='custom';}if(e.target===field('distanceM')&&loadedSession){try{renderRun(loadedSession);}catch(error){clearRun();$('#drag-run-status').textContent=error.message;}}else calculate();});form.addEventListener('change',()=>{calculate();});
$('#drag-strip').addEventListener('change',()=>{syncStrip();if(loadedSession){try{renderRun(loadedSession);}catch(error){clearRun();$('#drag-run-status').textContent=error.message;}}else calculate();if(stripSelect.value==='custom')field('distanceM').focus();});
let strips=read('fcc-drag-strips').filter(s=>s&&typeof s.name==='string'&&s.name.length<=100&&Number.isFinite(s.meters)&&s.meters>=18.288&&s.meters<=5000);
function renderStrips(){$('#drag-saved-strips')?.remove();if(!strips.length)return;const group=document.createElement('optgroup');group.id='drag-saved-strips';group.label='Saved custom strips';strips.forEach((s,i)=>{const option=new Option(s.name,`saved:${i}:${s.meters}`);option.dataset.savedStrip='1';group.append(option);});stripSelect.append(group);}

const validCurve=c=>Array.isArray(c)&&c.length<=200&&c.every((v,i)=>v&&Number.isFinite(v.rpm)&&v.rpm>=0&&v.rpm<=25000&&Number.isFinite(v.powerW)&&v.powerW>0&&v.powerW<=5000000&&(!i||v.rpm>c[i-1].rpm));
let builds=read('fcc-drag-builds').filter(b=>b&&typeof b.id==='string'&&typeof b.name==='string'&&typeof b.car==='string'&&typeof b.strip==='string'&&b.input&&typeof b.input==='object'&&validCurve(b.powerCurve||[]));
function renderBuilds(){$('#drag-builds').innerHTML=builds.length?builds.map(b=>`<article class="saved-tune"><div><strong>${esc(b.name)}</strong><span>${esc(b.car)} · ${esc(b.strip)} · LC ${b.input.launchControl==='enabled'?'On':b.input.launchControl==='disabled'?'Off':'Unknown'}</span></div><div><button class="button outline" data-drag-load="${esc(b.id)}">Load</button><button class="button outline" data-drag-export="${esc(b.id)}">Export</button><button class="delete-button" data-drag-delete="${esc(b.id)}">Delete</button></div></article>`).join(''):'<p class="muted">No saved drag builds yet.</p>';}
function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
form.addEventListener('submit',e=>{e.preventDefault();const data=calculate();if(!data||!form.reportValidity()||!data.input.name||!data.input.car)return;builds.unshift({id:crypto.randomUUID(),name:data.input.name,car:data.input.car,strip:$('#drag-strip-name').value,stripId:stripSelect.selectedOptions[0]?.dataset.fh6Id||null,stripValue:stripSelect.value,input:data.input,powerCurve:structuredClone(curve()),telemetryEvidence:loadedSession?{source:typeof loadedSession.source==='string'?loadedSession.source:'Imported session',samples:loadedSession.samples.length,carOrdinal:loadedSession.samples[0]?.carOrdinal??null,launchControl:$('#drag-run-lc').value,measuredEtS:run?.seconds??null,distanceM:run?.distanceM??null}:null});if(store('fcc-drag-builds',builds))notice('Drag build saved.');renderBuilds();});
$('#drag-builds').addEventListener('click',e=>{const load=e.target.closest('[data-drag-load]'),exp=e.target.closest('[data-drag-export]'),del=e.target.closest('[data-drag-delete]'),id=load?.dataset.dragLoad||exp?.dataset.dragExport||del?.dataset.dragDelete,b=builds.find(b=>b.id===id);if(!b)return;if(del){builds=builds.filter(x=>x.id!==id);store('fcc-drag-builds',builds);renderBuilds();return;}if(exp){download({schema:'forza-ingenium-drag-build/v2',...b},'forza-drag-build.json');return;}for(const c of form.elements){if(c.name){c.value='';delete c.dataset.siText;delete c.dataset.siValue;delete c.dataset.tireSizeSource;if(c.name==='tireSize'){c.setCustomValidity('');c.removeAttribute('aria-invalid');}}}
 for(const [key,v] of Object.entries(b.input)){if(field(key)){if(field(key).type==='number')writeSI(field(key),v);else field(key).value=v??'';}}
 if(!field('setupGearCount').value&&Array.isArray(b.input.gears))field('setupGearCount').value=b.input.gears.length;
 syncTireSize();if(!field('tireDiameterIn').value&&b.input.rim&&b.input.width&&b.input.aspect)field('tireDiameterIn').value=String(b.input.rim+2*b.input.width*b.input.aspect/100/25.4);
 $('#drag-strip-name').value=b.strip;const previousOption=[...stripSelect.options].find(o=>o.value&&o.value!=='custom'&&(o.value===b.stripValue||(o.textContent===b.strip&&Number(o.value.split(':').at(-1))===b.input.distanceM)));stripSelect.value=previousOption?.value||(b.stripId?`fh6:${b.stripId}:${b.input.distanceM}`:'custom');if(!stripSelect.value)stripSelect.value='custom';syncStrip(false);$('#drag-strip-name').value=b.strip;clearCapturedEngine();activeCurve=b.powerCurve||[];run=null;loadedSession=null;document.dispatchEvent(new CustomEvent('ingenium:drag-run',{detail:null}));$('#drag-run-status').textContent=activeCurve.length?'Saved measured power-curve snapshot loaded. No raw session is loaded.':'Manual build loaded without a power curve.';$('#drag-run-results').innerHTML='';$('#drag-save-run').disabled=true;calculate();});
function renderRun(session,live=session===loadedSession&&loadedSessionLive){
 document.dispatchEvent(new CustomEvent('ingenium:drag-evidence-changed'));

 document.dispatchEvent(new CustomEvent('ingenium:drag-run',{detail:null}));
 const base=analyzeSession(session);if(!captureMatchesCurrent(session))throw new Error('Capture belongs to a different car/build. Switch to that car or disconnect telemetry before using this run.');$('#drag-measured-details').open=true;showImportedEngineData(session,live);loadedSessionLive=live;loadedSession=session;activeCurve=base.powerCurve;
 const specs=sessionGearingEvidence(session);for(const name of ['engineLimitRpm','tireDiameterIn'])if(!field(name).value&&Number.isFinite(specs[name])){writeSI(field(name),specs[name]);field(name).dataset.telemetryValue=field(name).value;field(name).title='From imported/captured telemetry';}
 if(['enabled','disabled','unknown'].includes(session.context?.launchControl))$('#drag-run-lc').value=session.context.launchControl;
 try{run=analyzeDragSession(session,readSI(field('distanceM')));}
 catch(error){run=null;$('#drag-save-run').disabled=true;$('#drag-run-results').innerHTML='';$('#drag-run-status').textContent=`Driving session loaded, but no usable standing-start run: ${usError(error.message)} ${activeCurve.length} eligible power bins available.`;calculate();return;}
 run.launchControl=$('#drag-run-lc').value;
 $('#drag-save-run').disabled=false;document.dispatchEvent(new CustomEvent('ingenium:drag-run',{detail:{captureKey:captureKey(session),seconds:run.seconds,completed:run.completed,distanceM:run.distanceM,carOrdinal:run.carOrdinal,car:field('car').value,strip:$('#drag-strip-name').value,launchControl:$('#drag-run-lc').value}}));
 $('#drag-run-status').textContent=`${run.completed?'Completed measured run':'Partial capture — selected finish not reached'} · car ordinal ${run.carOrdinal??'not provided'} · LC ${$('#drag-run-lc').value}. ${session.samples.length.toLocaleString()} samples.`;
 $('#drag-run-results').innerHTML=`<div class="notes"><strong>${run.completed?run.seconds.toFixed(3)+' s ET · '+mph(run.trapKph).toFixed(1)+' mph trap':'Captured '+(run.coveredDistanceM/.3048).toFixed(1)+' ft'}</strong><p>Reported engine limit ${loadedSession?.samples?.find(s=>s.engineMaxRpm)?.engineMaxRpm ? Math.round(loadedSession.samples.find(s=>s.engineMaxRpm).engineMaxRpm)+' RPM' : 'not provided'}. Shift references are generated from the engine limit and supported power-curve coverage.</p><p>Launch RPM ${Math.round(run.launchRpm)} · launch slip exposure ${run.launchSlipPercent===null?'unavailable':run.launchSlipPercent.toFixed(1)+'%'} · braking ${run.brakingSeconds.toFixed(2)} s</p><p>Observed upshifts: ${run.shifts.length?run.shifts.map(s=>`${s.from} → ${s.to} near ${Math.round(s.rpm)} RPM`).join('; '):'none captured'}.</p><p>${esc(usError(run.notes))}</p></div><div class="table-scroll"><table class="gear-table"><caption>Measured splits</caption><thead><tr><th>Distance</th><th>ET (s)</th><th>mph</th></tr></thead><tbody>${run.splits.map(s=>`<tr><th>${esc(s.name)}</th><td>${s.seconds.toFixed(3)}</td><td>${mph(s.trapKph).toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`;
 calculate();
}
function clearRun(){clearCapturedEngine();$('#drag-measured-details').open=false;document.dispatchEvent(new CustomEvent('ingenium:drag-evidence-changed'));document.dispatchEvent(new CustomEvent('ingenium:drag-run',{detail:null}));run=null;loadedSession=null;loadedSessionLive=false;activeCurve=[];$('#drag-save-run').disabled=true;$('#drag-run-results').innerHTML='';$('#drag-shift-evidence').innerHTML='';calculate();}
$('#drag-session-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;clearRun();try{if(file.size>64*1024*1024)throw new Error('Capture must be smaller than 64 MB.');renderRun(JSON.parse(await file.text()));}catch(error){clearRun();$('#drag-run-status').textContent=error.message;}finally{e.target.value='';}});

$('#drag-export-capture').addEventListener('click',async()=>{try{const response=await fetch('/api/telemetry/drag/session',{cache:'no-store'}),session=await response.json();if(!response.ok)throw new Error(session.error||'No usable capture available.');analyzeSession(session);session.context={launchControl:$('#drag-run-lc').value,stripName:$('#drag-strip-name').value,distanceM:readSI(field('distanceM')),contextSource:'User-supplied labels; not decoded from packet'};download(session,'forza-telemetry-session.json');}catch(e){notice(e.message);}});
$('#drag-analyze-live').addEventListener('click',async()=>{clearRun();try{const r=await fetch('/api/telemetry/drag/session',{cache:'no-store'});const session=await r.json();if(!r.ok)throw new Error(session.error||'No capture available.');renderRun(session,true);}catch(e){clearRun();$('#drag-run-status').textContent=e.message;}});
$('#drag-run-lc').addEventListener('change',()=>{if(run){run.launchControl=$('#drag-run-lc').value;$('#drag-run-status').textContent=`Measured run launch-control label: ${run.launchControl}. User supplied; not inferred from telemetry.`;}});
let history=read('fcc-drag-runs').filter(r=>r&&typeof r.id==='string'&&typeof r.strip==='string'&&typeof r.car==='string'&&Number.isFinite(r.distanceM)&&Number.isFinite(r.seconds)&&Number.isFinite(r.trapKph));
function renderHistory(){$('#drag-run-history').innerHTML=history.map(r=>`<article class="saved-tune"><div><strong>${r.seconds.toFixed(3)} s · ${mph(r.trapKph).toFixed(1)} mph</strong><span>${esc(r.car)} · ${esc(r.strip)} · LC ${esc(r.launchControl)}</span></div><div><button class="button outline" data-run-compare="${esc(r.id)}">Compare current</button><button class="delete-button" data-run-delete="${esc(r.id)}">Delete</button></div></article>`).join('')+'<p class="muted small" id="drag-compare-note"></p>';}
$('#drag-save-run').addEventListener('click',()=>{if(!run?.completed){notice('A completed run is required to save a measured ET.');return;}history.unshift({id:crypto.randomUUID(),strip:$('#drag-strip-name').value,car:field('car').value,carOrdinal:run.carOrdinal,distanceM:run.distanceM,seconds:run.seconds,trapKph:run.trapKph,splits:run.splits,launchRpm:run.launchRpm,launchSlipPercent:run.launchSlipPercent,zeroTo60Mph:run.zeroTo60Mph,launchControl:$('#drag-run-lc').value});history=history.slice(0,30);store('fcc-drag-runs',history);renderHistory();});
$('#drag-run-history').addEventListener('click',e=>{const compare=e.target.closest('[data-run-compare]'),del=e.target.closest('[data-run-delete]');if(del){history=history.filter(r=>r.id!==del.dataset.runDelete);store('fcc-drag-runs',history);renderHistory();return;}if(!compare)return;const prior=history.find(r=>r.id===compare.dataset.runCompare);if(!run?.completed||run.carOrdinal===null||run.carOrdinal!==prior.carOrdinal||Math.abs(run.distanceM-prior.distanceM)>.001){$('#drag-compare-note').textContent='Compare completed runs with the same known car ordinal and distance.';return;}$('#drag-compare-note').textContent=`Current vs saved: ET ${(run.seconds-prior.seconds)>=0?'+':''}${(run.seconds-prior.seconds).toFixed(3)} s, trap ${mph(run.trapKph-prior.trapKph).toFixed(1)} mph. LC ${$('#drag-run-lc').value} vs ${prior.launchControl}. ${run.splits.find(s=>s.name==='60 ft')&&prior.splits?.find(s=>s.name==='60 ft')?'60-ft delta '+(run.splits.find(s=>s.name==='60 ft').seconds-prior.splits.find(s=>s.name==='60 ft').seconds).toFixed(3)+' s. ':''}Confirm the same strip, build, weather and assists; this difference alone does not prove the tune caused it.`;});
renderStrips();renderBuilds();renderHistory();stripSelect.value='';syncStrip();calculate();

document.addEventListener('ingenium:car-changed',()=>{clearRun();syncTireSize();});
attachDragCapture({clearRun,renderRun});
attachSetupSheet({inputs,curve,session:()=>loadedSession,run:()=>run,evidence:()=>loadedSession?`${loadedSession.samples.length} captured samples, ${activeCurve.length} eligible power bins. ${run?.completed?'Measured finish '+run.seconds.toFixed(3)+' s.':'No completed standing-start finish.'}`:activeCurve.length?`${activeCurve.length} saved power bins; raw capture is not loaded.`:'No measured run loaded.'});
