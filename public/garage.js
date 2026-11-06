import {catalogueMetadata} from './data.js';
import {hsvToHex,hexToHsv,colorFamily,gearingEstimate,suspensionEstimate,driftEstimate} from './calculators.js';
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function notice(text){document.dispatchEvent(new CustomEvent('garage:notice',{detail:text}));}
function show(view){
  if(!['garage','library','lab','tuning','telemetry','cars'].includes(view))view='garage';
  document.body.dataset.workspace=view;
  document.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==view);
  document.querySelectorAll('button[data-workspace]').forEach(el=>{el.classList.toggle('active',el.dataset.workspace===view);el.setAttribute('aria-current',el.dataset.workspace===view?'page':'false');});
  $('#library-nav').classList.toggle('active',view==='library');
  history.replaceState(null,'',`#${view}`);
}
document.addEventListener('click',e=>{const button=e.target.closest('button[data-workspace]');if(button){if(button.dataset.workspace==='library')$('#library-nav').click();else show(button.dataset.workspace);}});
for(const selector of ['#library-nav','#explore'])$(selector).addEventListener('click',()=>show('library'));
document.addEventListener('garage:navigate',e=>show(e.detail));
window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
show(location.hash.slice(1)||'garage');

const initialLab=()=>({values:[[.4,.56,.3],[.12,.4,.7]],secondary:false,finish:'Solid',name:'My racing green',manufacturer:'',notes:'',origin:''});
let lab=initialLab(),originalLab=initialLab();
function labControls(){
 $('#lab-layer-controls').innerHTML=lab.values.map((v,i)=>`<fieldset class="lab-layer" ${i===1&&!lab.secondary?'hidden':''}><legend>Color ${i+1} (${i?'Y':'X'})</legend><div class="layer-controls">${['Hue','Saturation','Brightness'].map((label,j)=>`<label>${label}<div class="slider-pair"><input aria-label="Color ${i+1} ${label} slider" type="range" min="0" max="1" step="0.01" value="${v[j]}" data-layer="${i}" data-component="${j}"><input aria-label="Color ${i+1} ${label}" type="number" min="0" max="1" step="0.01" required value="${v[j].toFixed(2)}" data-layer="${i}" data-component="${j}"></div></label>`).join('')}<label>Preview color<input type="color" aria-label="Color ${i+1} preview color" value="${hsvToHex(...v)}" data-layer-hex="${i}"></label></div></fieldset>`).join('');
 preview();
}
function preview(){
 const first=hsvToHex(...lab.values[0]),second=hsvToHex(...lab.values[1]);
 $('#lab-stop-one').setAttribute('stop-color',first);$('#lab-stop-two').setAttribute('stop-color',lab.secondary?second:first);
 $('#lab-preview').style.setProperty('--experiment-paint',first);
 $('#lab-hex-one').textContent=`Color 1 / ${first.toUpperCase()}`;$('#lab-hex-two').textContent=lab.secondary?`Color 2 / ${second.toUpperCase()}`:'Single layer';
 $('#lab-origin').textContent=lab.origin||'A fresh experiment. Start from a library recipe using “Experiment in color lab”.';
}
function fillLab(){
 $('#lab-name').value=lab.name;$('#lab-make').value=lab.manufacturer;$('#lab-notes').value=lab.notes;
 if(![...$('#lab-finish').options].some(o=>o.value===lab.finish))$('#lab-finish').add(new Option(lab.finish,lab.finish));
 if(lab.manufacturer&&![...$('#lab-make').options].some(o=>o.value===lab.manufacturer))$('#lab-make').add(new Option(lab.manufacturer,lab.manufacturer));$('#lab-make').value=lab.manufacturer;
 $('#lab-finish').value=lab.finish;$('#lab-secondary').checked=lab.secondary;labControls();
}
$('#lab-layer-controls').addEventListener('input',e=>{
 const input=e.target;
 if(input.dataset.layer!==undefined){
  if(!input.validity.valid||input.value==='')return;
  const i=Number(input.dataset.layer),j=Number(input.dataset.component),value=Number(input.value);lab.values[i][j]=value;
  document.querySelectorAll(`[data-layer="${i}"][data-component="${j}"]`).forEach(el=>{if(el!==input)el.value=el.type==='number'?value.toFixed(2):value;});
  $(`[data-layer-hex="${i}"]`).value=hsvToHex(...lab.values[i]);preview();
 }
 if(input.dataset.layerHex!==undefined){lab.values[Number(input.dataset.layerHex)]=hexToHsv(input.value).map(n=>Math.round(n*100)/100);labControls();}
});
$('#lab-secondary').addEventListener('change',()=>{lab.secondary=$('#lab-secondary').checked;labControls();});
$('#lab-reset').addEventListener('click',()=>{lab=structuredClone(originalLab);fillLab();});
document.addEventListener('garage:experiment',e=>{
 const c=e.detail,first=c.layers?.[0]?.values||[c.h,c.s,c.b],second=c.layers?.[1]?.values;
 if([...first,...(second||[])].some(n=>!Number.isFinite(n)||n<0||n>1)){notice('This recipe has missing or malformed values. Review the source settings before experimenting.');return;}
 lab={values:[first.slice(),second?second.slice():[.12,.4,.7]],secondary:!!second,finish:c.finish,name:`${c.name} experiment`.slice(0,70),manufacturer:c.manufacturer,notes:'',origin:`Based on ${c.manufacturer?c.manufacturer+' — ':''}${c.name}. Original L/R settings remain in the library; experimenting uses numeric values and does not preserve slider-side markers. ${c.source ? `${c.source.url || catalogueMetadata.url} (${c.source.sheet}, row ${c.source.row})` : 'Personal recipe'}`};
 originalLab=structuredClone(lab);fillLab();show('lab');window.scrollTo(0,0);
});
$('#lab-form').addEventListener('submit',e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const hsb=lab.values[0],active=lab.secondary?lab.values:[hsb];
 const color={id:crypto.randomUUID(),name:$('#lab-name').value.trim(),manufacturer:$('#lab-make').value.trim(),notes:[$('#lab-notes').value.trim(),lab.origin].filter(Boolean).join('\n'),finish:$('#lab-finish').value,family:colorFamily(hsb),hex:hsvToHex(...hsb),h:hsb[0],s:hsb[1],b:hsb[2],layers:active.map((values,i)=>({label:`Color ${i+1} (${i?'Y':'X'})`,raw:values.map(v=>v.toFixed(2)),values:[...values]}))};
 if(!color.name){notice('Enter an experiment name.');return;}
 document.dispatchEvent(new CustomEvent('garage:save-color',{detail:color}));
});
fillLab();

const gearDefaults=[3.2,2.4,1.8,1.4,1.1,.9,.78,.68,.60,.54];
const tuneFields={width:'tire-width',aspect:'tire-aspect',rim:'tire-rim',rpm:'shift-rpm',finalDrive:'final-drive',targetKph:'target-speed'};
const suspensionFields={mass:'vehicle-mass',frontPercent:'front-weight',frontUnsprung:'front-unsprung',rearUnsprung:'rear-unsprung',frontHz:'front-frequency',rearHz:'rear-frequency',frontMotion:'front-motion',rearMotion:'rear-motion',dampingRatio:'damping-ratio'};
function readFields(map){return Object.fromEntries(Object.entries(map).map(([key,id])=>[key,$('#'+id).value===''?NaN:Number($('#'+id).value)]));}
function tuneData(){return {name:$('#tune-name').value.trim(),car:$('#tune-car').value.trim(),notes:$('#tune-notes').value.trim(),gearing:{...readFields(tuneFields),gears:[...document.querySelectorAll('[data-gear]')].map(el=>el.value===''?NaN:Number(el.value))},suspension:readFields(suspensionFields)};}
function gearControls(values){
 const existing=[...document.querySelectorAll('[data-gear]')].map(el=>el.value);
 $('#gear-inputs').innerHTML=Array.from({length:Number($('#gear-count').value)},(_,i)=>`<label>Gear ${i+1}<input data-gear="${i}" type="number" min="0.1" max="10" step="0.001" required value="${escape(values?.[i]??existing[i]??gearDefaults[i])}"></label>`).join('');
}
function calculate(){
 try{
  const data=tuneData(),result=gearingEstimate(data.gearing),suspension=suspensionEstimate(data.suspension);
  $('#tune-error').textContent='';
  $('#tune-summary').innerHTML=`<div><span>Calculated tire diameter</span><strong>${result.diameterMm.toFixed(1)} <small>mm</small></strong></div><div><span>Final drive for target speed</span><strong>${result.suggestedFinalDrive.toFixed(3)}</strong><span>${result.suggestedFinalDrive<.5||result.suggestedFinalDrive>10?'Outside this worksheet’s final-drive input range. ':''}Check your in-game adjustment range.</span></div>`;
  $('#gear-results').innerHTML=result.gears.map(row=>`<tr><th>${row.gear}</th><td>${row.ratio.toFixed(3)}</td><td>${row.kph.toFixed(1)}</td><td>${row.mph.toFixed(1)}</td><td>${row.nextRpm===null?'—':Math.round(row.nextRpm).toLocaleString()}</td></tr>`).join('');
  const max=result.gears.at(-1).kph;
  $('#gear-chart').innerHTML=result.gears.map(row=>`<div class="gear-bar"><span>G${row.gear}</span><div><i style="width:${100*row.kph/max}%"></i></div><strong>${row.kph.toFixed(0)} km/h</strong></div>`).join('');
  $('#suspension-results').innerHTML=suspension.map(axle=>`<div class="suspension-card"><h4>${axle.axle}</h4><strong>${axle.springNmm.toFixed(1)} <small>N/mm</small></strong><p>${axle.springLbIn.toFixed(1)} lb/in at spring</p><p>${axle.sprungMass.toFixed(1)} kg sprung corner mass</p><p>${axle.wheelRateNmm.toFixed(1)} N/mm at wheel</p><p>${axle.damperCoefficient.toFixed(0)} N·s/m at damper</p></div>`).join('');
  return data;
 }catch(error){$('#tune-error').textContent=error.message;$('#tune-summary').textContent='Check the inputs to calculate a baseline.';$('#gear-results').innerHTML='';$('#gear-chart').innerHTML='';$('#suspension-results').innerHTML='';return null;}
}
function validTune(t){try{if(!t||typeof t.id!=='string'||typeof t.name!=='string'||typeof t.car!=='string'||typeof t.notes!=='string')return false;gearingEstimate(t.gearing);suspensionEstimate(t.suspension);return true;}catch{return false;}}
let tunes=[];try{const stored=JSON.parse(localStorage.getItem('fcc-tunes')||'[]');tunes=Array.isArray(stored)?stored.filter(validTune):[];}catch{}
function saveTunes(){try{localStorage.setItem('fcc-tunes',JSON.stringify(tunes));return true;}catch{notice('Browser storage is unavailable. Export setups before closing this session.');return false;}}
function renderTunes(){
 $('#saved-tunes').innerHTML=tunes.length?tunes.map(t=>`<article class="saved-tune"><div><strong>${escape(t.name)}</strong><span>${escape(t.car)} · ${t.gearing.gears.length} gears · ${escape(t.gearing.finalDrive)}</span></div><div><button class="button outline" data-load-tune="${escape(t.id)}">Load</button><button class="button outline" data-export-tune="${escape(t.id)}">Export JSON</button><button class="delete-button" data-delete-tune="${escape(t.id)}">Delete</button></div></article>`).join(''):'<p class="muted">No saved setups yet. Adjust the inputs above and save your first build.</p>';
}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#saved-tunes').addEventListener('click',e=>{
 const load=e.target.closest('[data-load-tune]'),exp=e.target.closest('[data-export-tune]'),del=e.target.closest('[data-delete-tune]');
 const id=load?.dataset.loadTune||exp?.dataset.exportTune||del?.dataset.deleteTune,t=tunes.find(t=>t.id===id);if(!t)return;
 if(del){tunes=tunes.filter(x=>x.id!==id);saveTunes();renderTunes();return;}
 if(exp){download({version:1,assumptions:'Theoretical gearing and idealized suspension frequency model; not an optimized Forza tune.',...t},'forza-garage-setup.json');return;}
 $('#tune-name').value=t.name;$('#tune-car').value=t.car;$('#tune-notes').value=t.notes;$('#gear-count').value=t.gearing.gears.length;
 for(const [key,field] of Object.entries(tuneFields))$('#'+field).value=t.gearing[key];
 for(const [key,field] of Object.entries(suspensionFields))$('#'+field).value=t.suspension[key];
 gearControls(t.gearing.gears);calculate();$('#tune-form').scrollIntoView({block:'start'});
});
$('#gear-count').addEventListener('change',()=>{gearControls();calculate();});
$('#tune-form').addEventListener('input',calculate);
$('#tune-form').addEventListener('submit',e=>{e.preventDefault();const data=calculate();if(!data||!data.name||!data.car||!e.currentTarget.reportValidity())return;tunes.unshift({id:crypto.randomUUID(),...data});const stored=saveTunes();renderTunes();if(stored)notice('Setup saved to your garage.');});
gearControls();calculate();renderTunes();

// Selecting a discipline reveals only its calculator; direct links preserve the choice.
function tuneMode(mode,writeUrl=true){
 const valid=['drag','track','drift'].includes(mode);
 document.querySelectorAll('[data-tune-panel]').forEach(el=>el.hidden=!valid||el.dataset.tunePanel!==mode);
 document.querySelectorAll('[data-tune-mode]').forEach(el=>el.setAttribute('aria-pressed',String(valid&&el.dataset.tuneMode===mode)));
 if(writeUrl&&valid){const url=new URL(location.href);url.searchParams.set('tune',mode);url.hash='tuning';history.replaceState(null,'',url);}
}
document.querySelectorAll('[data-tune-mode]').forEach(button=>button.addEventListener('click',()=>tuneMode(button.dataset.tuneMode)));
tuneMode(new URL(location.href).searchParams.get('tune'),false);

const driftForm=$('#drift-form');
function driftData(){const values=Object.fromEntries(new FormData(driftForm));const data={name:values.name.trim(),car:values.car.trim(),notes:values.notes.trim()};for(const [key,value] of Object.entries(values))if(!['name','car','notes','ratios'].includes(key))data[key]=value===''?NaN:Number(value);data.gears=values.ratios.trim().split(/[,\s]+/).map(Number);return data;}
function calculateDrift(){try{const data=driftData(),result=driftEstimate(data);$('#drift-error').textContent='';$('#drift-summary').innerHTML=`<div><span>Final drive for working gear ${data.gear}</span><strong>${result.suggestedFinalDrive.toFixed(3)}</strong><span>${result.suggestedFinalDrive<.5||result.suggestedFinalDrive>10?'Outside the worksheet range. ':''}Check actual in-game limits.</span></div><div><span>Target tire circumferential speed</span><strong>${result.wheelKph.toFixed(1)} <small>km/h</small></strong><span>${data.overrunPercent}% overrun at ${data.roadKph} km/h road speed</span></div>`;$('#drift-results').innerHTML=result.gears.map(row=>`<tr><th>${row.gear}</th><td>${row.roadKph.toFixed(1)}</td><td>${Math.round(row.rpmAtTarget).toLocaleString()}</td></tr>`).join('');return data;}catch(e){$('#drift-error').textContent=e.message;$('#drift-summary').textContent='Check inputs to calculate gearing.';$('#drift-results').innerHTML='';return null;}}
let driftSetups=[];try{const stored=JSON.parse(localStorage.getItem('fcc-drift-setups')||'[]');if(Array.isArray(stored))driftSetups=stored.filter(s=>{try{if(typeof s.id!=='string'||typeof s.name!=='string'||typeof s.car!=='string'||typeof s.notes!=='string')return false;driftEstimate(s);return true;}catch{return false;}});}catch{}
function persistDrift(){try{localStorage.setItem('fcc-drift-setups',JSON.stringify(driftSetups));return true;}catch{notice('Browser storage unavailable. Export this setup before closing.');return false;}}
function renderDrift(){$('#saved-drift-setups').innerHTML=driftSetups.length?driftSetups.map(s=>`<article class="saved-tune"><div><strong>${escape(s.name)}</strong><span>${escape(s.car)} · ${s.roadKph} km/h · gear ${s.gear}</span></div><div><button class="button outline" data-drift-load="${escape(s.id)}">Load</button><button class="button outline" data-drift-export="${escape(s.id)}">Export</button><button class="delete-button" data-drift-delete="${escape(s.id)}">Delete</button></div></article>`).join(''):'<p class="muted">No saved drift setups yet.</p>';}
driftForm.addEventListener('input',calculateDrift);
driftForm.addEventListener('submit',e=>{e.preventDefault();const data=calculateDrift();if(!data||!data.name||!data.car||!driftForm.reportValidity())return;driftSetups.unshift({id:crypto.randomUUID(),...data});if(persistDrift())notice('Drift setup saved.');renderDrift();});
$('#saved-drift-setups').addEventListener('click',e=>{const load=e.target.closest('[data-drift-load]'),exp=e.target.closest('[data-drift-export]'),del=e.target.closest('[data-drift-delete]'),id=load?.dataset.driftLoad||exp?.dataset.driftExport||del?.dataset.driftDelete,s=driftSetups.find(s=>s.id===id);if(!s)return;if(del){driftSetups=driftSetups.filter(x=>x.id!==id);persistDrift();renderDrift();return;}if(exp){download({schema:'forza-garage-drift/v1',...s},'forza-drift-setup.json');return;}for(const [key,value] of Object.entries(s)){if(key==='gears')driftForm.elements.ratios.value=value.join(', ');else if(driftForm.elements.namedItem(key))driftForm.elements.namedItem(key).value=value;}calculateDrift();});
calculateDrift();renderDrift();
