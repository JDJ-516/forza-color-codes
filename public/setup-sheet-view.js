import {dragChassisBaseline} from './setup-baseline.js';
import {generateDragGearset} from './drag-gearing.js';
import {writeSI,usError} from './units.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let callbacks=null,report=null,writing=false;
const form=()=>$('#drag-form');
function populate(name,value){const c=form().elements.namedItem(name);if(!c||c.value!=='')return;if(c.type==='number')writeSI(c,value);else c.value=value;}
const row=(name,value)=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
function card(title,body,note){return `<article class="generated-setting-card"><h4>${esc(title)}</h4><dl>${body}</dl><p>${esc(note)}</p></article>`;}
export function renderGearingResult(result){
 const box=$('#drag-goal-result');box.hidden=false;
 box.innerHTML=`<h4>Gear ratios · enter in Gearing</h4><p><strong>Final drive: ${result.finalDrive.toFixed(3)}</strong> · ${result.theoreticalMph.toFixed(1)} mph at ${Math.round(result.rpm)} RPM (${esc(result.source)}).</p><div class="table-scroll"><table class="gear-table"><thead><tr><th>Setting</th><th>Ratio to enter</th><th>RPM after shift</th></tr></thead><tbody><tr><th>Final drive</th><td>${result.finalDrive.toFixed(3)}</td><td>—</td></tr>${result.gears.map((ratio,i)=>`<tr><th>Gear ${i+1}</th><td>${ratio.toFixed(3)}</td><td>${result.postShiftRpm[i]==null?'—':Math.round(result.postShiftRpm[i])}</td></tr>`).join('')}</tbody></table></div><p>Post-shift RPM ${result.staysAboveTorquePeak?'stays at or above':'can fall below'} the entered torque peak. ${result.generatedFromReferences?'Ratio spacing uses your first/top references.':'First-gear overall ratio is preserved within rounding.'} These are RPM-limited settings; available power and resistance determine attainable speed.</p>`;
}
function renderChassis(c){
 let html=card('Springs',row('Front',`${c.springs.front.toFixed(1)} lb/in${c.springs.frontInRange?'':' · OUTSIDE ENTERED RANGE'}`)+row('Rear',`${c.springs.rear.toFixed(1)} lb/in${c.springs.rearInRange?'':' · OUTSIDE ENTERED RANGE'}`),'Calculated ride-frequency baseline. Check your installed spring range; do not silently clamp a rate.');
 html+=card('Dampers',row('Front rebound',c.dampers.frontRebound.toFixed(1))+row('Rear rebound',c.dampers.rearRebound.toFixed(1))+row('Front bump',c.dampers.frontBump.toFixed(1))+row('Rear bump',c.dampers.rearBump.toFixed(1)),c.dampers.inRange?`Reference starting values on your entered ${c.dampers.min}–${c.dampers.max} scale. Not a calibrated slider optimum.`:'OUTSIDE ENTERED DAMPER RANGE. Revise the target frequency or confirm the scale before use.');
 html+=card('Tire pressure',row('Front',`${c.tires.front.toFixed(1)} PSI`)+row('Rear',`${c.tires.rear.toFixed(1)} PSI`),`${c.tires.compound} compound reference. Telemetry does not report pressure or the installed compound; verify the selection and test repeatable runs.`);
 html+=card('Alignment',row('Front camber',`${c.alignment.frontCamber.toFixed(1)}°`)+row('Rear camber',`${c.alignment.rearCamber.toFixed(1)}°`)+row('Front / rear toe','0.0° / 0.0°')+row('Caster',`${c.alignment.caster.toFixed(1)}°`),'Drag reference profile, not measured alignment.');
 html+=card('Anti-roll bars',row('Front',c.arb.front.toFixed(1))+row('Rear',c.arb.rear.toFixed(1)),'Weight-bias reference formula on a 1–65 scale. Check installed adjustability.');
 const diff=axle=>axle?`${axle.accel}% accel / ${axle.decel}% decel`:'Not driven';
 html+=card('Differential',row('Front',diff(c.differential.front))+row('Rear',diff(c.differential.rear))+row('AWD center','Not generated'),'Source-profile lock percentages. AWD center balance needs separate testing.');
 html+=card('Brakes & car-specific limits',row('Brake pressure',`${c.brakes.pressure}%`)+row('Balance',`${c.brakes.balance}% neutral reference`)+row('Ride height / aero','Manual · car-specific'),'Neutral brake reference. Ride-height and aero values are not inferred from missing dimensions or ranges.');
 $('#drag-setup-chassis').innerHTML='<div class="generated-setting-grid">'+html+'</div>';
 $('#drag-setup-assumptions').innerHTML=c.assumptions.map(a=>`<p>${esc(a)}</p>`).join('')+'<p>Source: MIT-licensed ClickClickMedia FH6 tune_calc.py reference; pinned provenance and formula details are in docs/setup-baseline.md. These settings are a starting point for repeated real-run testing.</p>';
}
function invalidate(){if(writing||!report)return;report=null;$('#drag-setup-export').disabled=true;$('#drag-settings-result').dataset.current='false';$('#drag-setup-status').textContent='Inputs or evidence changed. Generate again before treating these settings as current.';}
export function attachSetupSheet(handlers){
 callbacks=handlers;
 $('#drag-setup-generate').addEventListener('click',()=>{
  writing=true;
  const assumed=[];
  for(const [name,value] of Object.entries({setupFrontHz:2.7,setupRearHz:2.7,setupDamperMin:0,setupDamperMax:20,tireCompound:'Drag'})){if(form().elements.namedItem(name).value==='')assumed.push(`${name}: ${value}`);populate(name,value);}
  const before=callbacks.inputs(),existing=Array.isArray(before.gears)&&before.gears.length>=4&&before.gears.every(g=>g>0)?before.gears:null;
  if(existing)populate('setupGearCount',existing.length);populate('setupFirstGear',existing?.[0]??3);populate('setupTopGear',existing?.at(-1)??.9);
  const i=callbacks.inputs();let gearing=null,chassis=null;const messages=[];
  try{gearing=generateDragGearset(i,i.topSpeedGoalMph,callbacks.curve());renderGearingResult(gearing);$('#drag-goal-apply').hidden=false;document.dispatchEvent(new CustomEvent('ingenium:setup-gearing',{detail:gearing}));}catch(e){$('#drag-goal-result').hidden=false;$('#drag-goal-result').textContent='Gearing: '+usError(e.message);$('#drag-goal-apply').hidden=true;messages.push('Gearing needs more input.');}
  try{chassis=dragChassisBaseline(i);renderChassis(chassis);}catch(e){$('#drag-setup-chassis').textContent='Chassis: '+usError(e.message);messages.push('Chassis needs more input.');}
  report={schema:'forza-ingenium-starting-setup/v1',car:i.car,mode:'drag',inputs:i,gearing,chassis,referenceDefaultsApplied:assumed,units:{springRates:'lb/in',tirePressure:'PSI',alignment:'degrees',dampers:'reference slider units',gearing:'ratios',modelInputs:'canonical SI where specified by the build schema'},generatedAt:new Date().toISOString(),validation:'Starting reference only; not game-verified or optimized.'};
  $('#drag-setup-export').disabled=!(gearing||chassis);
  $('#drag-setup-status').textContent=messages.length?messages.join(' ')+' Available sections appear below.':'Starting setup generated. Enter these values in the matching in-game tuning tabs, check their ranges, then compare real runs.';
  $('#drag-settings-result').dataset.current='true';writing=false;$('#drag-settings-result').scrollIntoView({block:'start'});
 });
 $('#drag-setup-export').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='forza-starting-setup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 form().addEventListener('input',invalidate);document.addEventListener('ingenium:car-changed',()=>{invalidate();$('#drag-setup-chassis').replaceChildren();});document.addEventListener('ingenium:drag-evidence-changed',invalidate);
 document.addEventListener('ingenium:setup-gearing-applying',()=>{writing=true;});
 document.addEventListener('ingenium:setup-gearing-applied',event=>{writing=false;if(!report)return;report.inputs=callbacks.inputs();report.gearing=event.detail;$('#drag-settings-result').dataset.current='true';$('#drag-setup-export').disabled=false;$('#drag-setup-status').textContent='Generated gearing applied to the worksheet. The configuration remains a starting baseline to verify in-game.';});
 document.addEventListener('click',e=>{if(e.target.closest('[data-drag-load]'))invalidate();});
}
