import {generateFH6Chassis,generateFH6Gearing,dragSetupFeedback} from './fh6-setup.js';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=['Tires','Gearing','Alignment','Antiroll bars','Springs','Damping','Aero','Brake','Differential'];
let report=null;
const row=(name,value)=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`;
const card=(title,body,note)=>`<article class="generated-setting-card"><h4>${esc(title)}</h4><dl>${body}</dl><p>${esc(note)}</p></article>`;
const pair=(f,r,unit='')=>row('Front',f+unit)+row('Rear',r+unit);
const n=(value,d=1)=>value.toFixed(d);
function gearingBody(g,error){
 if(!g)return `<p class="notes">${esc(error)}</p>`;
 return `<div id="drag-goal-result"><p><strong>Final drive: ${n(g.finalDrive,2)}</strong> · ${n(g.theoreticalMph)} mph gearing ceiling at ${Math.round(g.rpm)} RPM.</p><p class="muted small">${esc(g.source)}. Actual speed depends on available power and resistance.</p><div class="table-scroll"><table class="gear-table"><thead><tr><th>Setting</th><th>Ratio to enter</th><th>Shift reference</th><th>RPM after shift</th></tr></thead><tbody><tr><th>Final drive</th><td>${n(g.finalDrive,2)}</td><td>—</td><td>—</td></tr>${g.gears.map((ratio,j)=>`<tr><th>Gear ${j+1}</th><td>${n(ratio,2)}</td><td>${g.shifts[j]?`${g.shifts[j].rpm} RPM · ${esc(g.shifts[j].source)}`:'Top gear'}</td><td>${g.shifts[j]?.afterRpm??'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function bodies(c,g,errors){
 const missing=`<p class="notes">${esc(errors.chassis)}</p>`,a=c?.alignment,d=c?.dampers;
 const diff=axle=>axle?row('Acceleration',axle.accel+'%')+row('Deceleration',axle.decel+'%'):row('Status','Not driven');
 return [
  c?card('Tire pressure',pair(n(c.tires.front),n(c.tires.rear),' PSI'),`${c.tires.compound} tires · cold starting pressure. Test 60-ft consistency and temperature before adjusting.`):missing,
  gearingBody(g,errors.gearing),
  c?card('Camber',pair(n(a.frontCamber),n(a.rearCamber),'°'),'Straight-line contact patch reference.')+card('Toe',pair('0.0','0.0','°'),'Neutral toe for straight-line stability.')+card('Front caster',row('Angle',n(a.caster)+'°'),'Conservative starting angle; check the installed range.'):missing,
  c?card('Antiroll bars',pair(n(c.arb.front,2),n(c.arb.rear,2)),'Drag reference: soft bars limit cross-axle load transfer; driven-axle behavior still needs testing. Screen scale 1.00–65.00.'):missing,
  c?card('Springs',pair(n(c.springs.front),n(c.springs.rear),' lb/in'),c.springs.limited.join(' ')||'Calculated wheel-rate starting estimate. Match the installed spring range before applying.')+card('Ride height',pair(c.rideHeight.front,c.rideHeight.rear),'Car-specific numeric ranges are not supplied by Data Out. Maintain travel and watch for bottoming.'):missing,
  c?card('Rebound stiffness',pair(n(d.frontRebound),n(d.rearRebound)),'Extension control. Screen reference scale 1.0–20.0.')+card('Bump stiffness',pair(n(d.frontBump),n(d.rearBump)),'Compression control. Screen reference scale 1.0–20.0; compare launch travel and wheel hop.'):missing,
  c?card('Downforce',pair(c.aero.front,c.aero.rear),'Where adjustable. No aero range was shown in the supplied photos. Increase only if high-speed stability needs it.'):missing,
  c?card('Braking force',row('Balance',c.brakes.balance+'% · center')+row('Pressure',c.brakes.pressure+'%'),'Neutral starting brakes. Screen references: balance 0–100%, pressure 0–200%.'):missing,
  c?card('Front differential',diff(c.differential.front),'Applies to the front driven axle only.')+card('Rear differential',diff(c.differential.rear),'Applies to the rear driven axle only.')+card('Center',row('Balance',c.differential.center===null?'Not applicable':c.differential.center+'% rear'),'AWD only. This is the Rear direction on the in-game Center balance slider.'):missing,
 ];
}
function select(index){
 for(const [j,button] of [...$('#drag-setup-tabs').children].entries()){const selected=j===index;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('#setup-panel-'+j).hidden=!selected;}
}
export function attachSetupSheet(callbacks){
 function invalidate(){if(!report)return;report=null;$('#drag-setup-export').disabled=true;$('#drag-settings-result').dataset.current='false';$('#drag-setup-status').textContent='Inputs or evidence changed. Generate again; the displayed settings are out of date.';}
 $('#drag-setup-generate').addEventListener('click',()=>{
  const i=callbacks.inputs();let gearing=null,chassis=null;const errors={};
  try{chassis=generateFH6Chassis(i);}catch(e){errors.chassis=e.message;}
  try{gearing=generateFH6Gearing(i,callbacks.curve());}catch(e){errors.gearing=e.message;}
  const first=$('#drag-setup-tabs').hidden?0:Number($('#drag-setup-tabs [aria-selected=true]')?.dataset.tab||0);
  $('#drag-setup-tabs').innerHTML=tabs.map((name,j)=>`<button type="button" id="setup-tab-${j}" role="tab" data-tab="${j}" aria-controls="setup-panel-${j}" aria-selected="false" tabindex="-1">${name}</button>`).join('');$('#drag-setup-tabs').hidden=false;
  const feedback=dragSetupFeedback(callbacks.session?.(),i);
  $('#drag-setup-feedback').innerHTML='<h4>From your run</h4>'+feedback.map(t=>`<p>${esc(t)}</p>`).join('');
  $('#drag-setup-panels').innerHTML=bodies(chassis,gearing,errors).map((html,j)=>`<section id="setup-panel-${j}" role="tabpanel" tabindex="0" aria-labelledby="setup-tab-${j}" hidden><div class="generated-setting-grid">${html}</div></section>`).join('');select(first);
  $('#drag-setup-assumptions').innerHTML=[...(chassis?.assumptions||[]),...(gearing?.assumptions||[]),'Launch control: '+(chassis?.launch.message||'Select On or Off. No launch-control state is sent by telemetry.'),'Capture evidence: '+(callbacks.evidence?.()||'No measured run loaded.')].map(t=>`<p>${esc(t)}</p>`).join('');
  report=gearing||chassis?{schema:'forza-ingenium-starting-setup/v2',car:i.car,mode:'drag',inputs:i,gearing,chassis,feedback,missing:errors,evidence:callbacks.evidence?.()??null,units:{springRates:'lb/in',tirePressure:'PSI',alignment:'degrees',damping:'game slider reference',speed:'mph',tireDiameter:'in',modelInputs:'SI where specified by input names'},generatedAt:new Date().toISOString(),validation:'Starting setup, not a verified optimum. Screen limits describe the pictured car; installed upgrades may differ.'}:null;
  $('#drag-setup-export').disabled=!report;$('#drag-settings-result').dataset.current=report?'true':'false';
  $('#drag-setup-status').textContent=gearing&&chassis?'Starting setup generated. Select a tuning tab for the values to enter in FH6.':chassis?'Chassis starting setup generated. Gearing: '+errors.gearing:gearing?'Gearing generated. Chassis: '+errors.chassis:errors.chassis+' '+errors.gearing;
  if(chassis)$('#drag-setup-status').textContent+=' Launch control '+(i.launchControl==='enabled'?'On. ':'Off. ')+chassis.launch.message;
 });
 $('#drag-setup-tabs').addEventListener('click',e=>{const button=e.target.closest('[role=tab]');if(button)select(Number(button.dataset.tab));});
 $('#drag-setup-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=Number(e.target.dataset.tab),j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(j);$('#setup-tab-'+j).focus();});
 $('#drag-setup-export').addEventListener('click',()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='forza-starting-setup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('#drag-form').addEventListener('input',invalidate);$('#drag-form').addEventListener('change',invalidate);
 document.addEventListener('ingenium:car-changed',()=>{invalidate();$('#drag-setup-panels').replaceChildren();$('#drag-setup-feedback').replaceChildren();$('#drag-setup-tabs').hidden=true;$('#drag-setup-assumptions').textContent='Generate for the current car.';});
 document.addEventListener('ingenium:drag-evidence-changed',invalidate);
 document.addEventListener('click',e=>{if(e.target.closest('[data-drag-load]'))invalidate();});
}
