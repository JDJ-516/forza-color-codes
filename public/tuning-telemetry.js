import {readSI,writeSI} from './units.js';
import {rollingDiameterIn} from './fh6-setup.js';
const $=s=>document.querySelector(s);
let currentKey=null,writing=false,diameters=[],lastDiameterTimestamp=null;
const profiles=new Map();
const forms=['drag-form','tune-form','drift-form'];
function controls(){return forms.flatMap(id=>[...document.querySelectorAll(`#${id} input,#${id} select,#${id} textarea`)]).filter(c=>!['drag-strip','drag-strip-name'].includes(c.id)&&c.name!=='distanceM'&&c.type!=='file');}
const controlKey=c=>c.id||`${c.form.id}:${c.name||'gear-'+c.dataset.gear}`;
function changed(form){form?.dispatchEvent(new Event('input',{bubbles:true}));}
function saveProfile(){
 if(!currentKey)return;
 profiles.set(currentKey,controls().map(c=>({key:controlKey(c),value:c.value,si:c.type==='number'&&c.dataset.siDisplay?readSI(c):null,checked:c.checked,manual:c.dataset.telemetryManual==='1',auto:c.dataset.telemetryValue===c.value})));
 if(profiles.size>20)profiles.delete(profiles.keys().next().value);
}
function restoreProfile(key){
 const profile=profiles.get(key)||[];
 writing=true;
 for(const c of controls()){c.value='';if(c.type==='checkbox')c.checked=false;delete c.dataset.telemetryValue;delete c.dataset.telemetryManual;delete c.dataset.siText;delete c.dataset.siValue;delete c.dataset.tireSizeSource;if(c.name==='tireSize'){c.setCustomValidity('');c.removeAttribute('aria-invalid');}}
 const count=$('#gear-count'),countValue=profile.find(p=>p.key==='gear-count');
 if(count){count.value=countValue?.value||'';count.dispatchEvent(new Event('change',{bubbles:true}));}
 for(const c of controls()){
  const saved=profile.find(p=>p.key===controlKey(c));
  if(saved&&!saved.auto){if(c.type==='number'&&c.dataset.siDisplay&&Number.isFinite(saved.si))writeSI(c,saved.si);else c.value=saved.value;if(c.type==='checkbox')c.checked=saved.checked;if(saved.manual)c.dataset.telemetryManual='1';}
 }
 for(const id of forms)changed($('#'+id));
 writing=false;
 document.dispatchEvent(new CustomEvent('ingenium:car-changed'));
}
function fill(selector,value,source){
 const c=$(selector);if(!c||value==null||c.dataset.telemetryManual==='1')return;
 if(c.value!==''&&c.dataset.telemetryValue!==c.value)return;
 if(c.type==='number'&&(!Number.isFinite(Number(value))||(c.min!==''&&Number(value)<Number(c.min))||(c.max!==''&&Number(value)>Number(c.max))))return;
 const next=String(value);if(c.value===next)return;
 writing=true;c.value=next;c.dataset.telemetryValue=next;c.title=source;
 // Change handles selects; input recalculates numeric/car fields.
 if(c.tagName==='SELECT')c.dispatchEvent(new Event('change',{bubbles:true}));
 c.dispatchEvent(new Event('input',{bubbles:true}));writing=false;
}
document.addEventListener('input',e=>{
 if(writing||e.detail?.telemetry||!e.target.matches('input,select,textarea'))return;
 if(forms.includes(e.target.form?.id)){
  e.target.dataset.telemetryManual='1';delete e.target.dataset.telemetryValue;
 }
});
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-drag-load],[data-load-tune],[data-drift-load]');if(!button)return;
 const id=button.hasAttribute('data-drag-load')?'drag-form':button.hasAttribute('data-load-tune')?'tune-form':'drift-form';
 for(const c of controls().filter(c=>c.form?.id===id)){c.dataset.telemetryManual='1';delete c.dataset.telemetryValue;}
});
export function updateTuningTelemetry(data,fresh){
 const title=$('#current-car-title'),status=$('#tuning-car-status'),link=$('#tuning-setup-link'),evidence=$('#tuning-car-evidence');
 const s=fresh?data.latest:null,active=s?.isRaceOn&&Number.isInteger(s.carOrdinal)&&s.carOrdinal>=0;
 link.hidden=!!fresh;
 if(!active){
  title.textContent=fresh?'Game connected · enter driving':'Telemetry not connected';
  for(const id of ['year','make','model'])$('#tuning-car-'+id).textContent='—';
  status.textContent=fresh?'Enter driving to identify the current car. Existing inputs are retained.':'Connect telemetry to identify the current car. Existing inputs remain available for manual tuning.';
  evidence.textContent='';return;
 }
 const key=[s.carOrdinal,s.carPerformanceIndex,s.drivetrain,s.engineMaxRpm].join(':');
 if(currentKey&&currentKey!==key){saveProfile();restoreProfile(key);}
 else if(!currentKey)document.dispatchEvent(new CustomEvent('ingenium:car-changed'));
 if(currentKey!==key){diameters=[];lastDiameterTimestamp=null;}currentKey=key;
 const identity=data.car?.ordinal===s.carOrdinal?data.car:null;
 title.textContent=identity?.name||`Car ID ${s.carOrdinal} · name unavailable`;
 for(const id of ['year','make','model'])$('#tuning-car-'+id).textContent=identity?.[id]??'—';
 const drive=['FWD','RWD','AWD'][s.drivetrain],className=['D','C','B','A','S1','S2','X'][s.carClass];
 status.textContent=[`Live · car ID ${s.carOrdinal}`,className&&Number.isFinite(s.carPerformanceIndex)?`${className} ${s.carPerformanceIndex} PI`:null,drive,identity?.name?'Supported inputs fill automatically; your edits take priority.':'This ID is absent from the FH6 catalogue. Enter the name manually.'].filter(Boolean).join(' · ');
 for(const selector of ['#drag-form [name=car]','#tune-car','#drift-form [name=car]'])fill(selector,identity?.name,'Current car identified from FH6 telemetry ID');
 fill('#drag-form [name=drive]',drive,'Reported drivetrain');
 fill('#drag-form [name=engineLimitRpm]',s.engineMaxRpm==null?null:Math.round(s.engineMaxRpm),'Reported engine RPM limit');
 const diameter=rollingDiameterIn(s);
 if(diameter!==null&&s.timestampMs!==lastDiameterTimestamp){lastDiameterTimestamp=s.timestampMs;diameters.push(diameter);diameters=diameters.slice(-31);}
 if(diameters.length>=5){const sorted=[...diameters].sort((a,b)=>a-b),middle=sorted[Math.floor(sorted.length/2)];const c=$('#drag-form [name=tireDiameterIn]');if(sorted.every(v=>Math.abs(v-middle)/middle<.03)&&(c.value===''||Math.abs(Number(c.value)-middle)/middle>.005))fill('#drag-form [name=tireDiameterIn]',Number(middle.toFixed(2)),'Effective rolling diameter measured from low-slip, straight coasting');}
 if(!$('#drag-tire-size').value)$('#drag-gearing-source').textContent='Engine limit comes from telemetry. Tire diameter fills after five low-slip, straight coasting samples above 25 mph, or enter your tire size above for automatic conversion.';
 for(const selector of ['#shift-rpm','#drift-form [name=rpm]'])fill(selector,s.engineMaxRpm==null?null:Math.round(s.engineMaxRpm),'Starting RPM from reported engine limit; adjust for your shift/target RPM');
 evidence.textContent='Drivetrain and car labels come from live telemetry. Use a real drag run to fill the captured engine section. Manual power, torque, weight and other unreported build specifications stay under your control.';
}
