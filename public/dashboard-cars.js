import {weeklyCarHighlights} from './seasonal-cars.js';
const $=s=>document.querySelector(s);let rows=[],index=0,loaded=false,busy=false,lastLoad=0,sourceError=false,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function render(){
 const previous=rows[index]?.id;const eligible=weeklyCarHighlights(rows);if(eligible.length!==rows.length){rows=eligible;index=Math.max(0,rows.findIndex(car=>car.id===previous));}
 const car=rows[index];$('#seasonal-car-name').textContent=car?car.model:loaded?(sourceError?'Sheet refresh unavailable':'No recent spreadsheet additions'):'Checking spreadsheet additions…';
 $('#seasonal-car-info').textContent=car?`${car.year} ${car.brand} · ${car.highlightKind==='release-date'?'sheet release date '+new Date(car.highlightDate+'T12:00:00').toLocaleDateString()+' · Car Pass DLC':'sheet addition detected '+new Date(car.addedAt).toLocaleDateString()}${sourceError?' · saved copy':''}`:sourceError?'Showing the saved car collection. The complete Thursday playlist is not connected.':'No dated Car Pass releases or new Seasonal-sheet entries found in seven days. This is not the full Thursday playlist.';
 $('#seasonal-view').textContent=car?.category==='Car Pass DLC'?'View Car Pass cars ›':'View seasonal cars ›';
 $('#seasonal-car-count').textContent=car?`${index+1} of ${rows.length}`:'';
 $('#seasonal-controls').hidden=rows.length<2;$('#seasonal-pause').textContent=playing?'Pause':'Play';$('#seasonal-pause').setAttribute('aria-pressed',String(!playing));
}
function accept(data){if(!Array.isArray(data?.cars))return;const id=rows[index]?.id;rows=weeklyCarHighlights(data.cars);index=Math.max(0,rows.findIndex(c=>c.id===id));loaded=true;sourceError=!!data.sync?.error;lastLoad=Date.now();render();}
async function load(){if(busy)return;busy=true;try{const response=await fetch('/api/rare-cars',{cache:'no-store'});if(!response.ok)throw new Error('Sheet unavailable');accept(await response.json());}catch{sourceError=true;loaded=true;render();}finally{busy=false;}}
function move(step){if(!rows.length)return;index=(index+step+rows.length)%rows.length;render();}
$('#seasonal-prev').addEventListener('click',()=>move(-1));$('#seasonal-next').addEventListener('click',()=>move(1));$('#seasonal-pause').addEventListener('click',()=>{playing=!playing;render();});
$('#seasonal-view').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('garage:navigate',{detail:'cars'}));document.dispatchEvent(new CustomEvent('ingenium:show-car-category',{detail:rows[index]?.category||'Seasonal'}));});
document.addEventListener('ingenium:rare-cars-updated',e=>accept(e.detail));
function check(){if(!document.hidden&&document.body.dataset.workspace==='garage'){if(loaded)render();if(Date.now()-lastLoad>=600000)load();}}
new MutationObserver(check).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});document.addEventListener('visibilitychange',check);setInterval(check,600000);setInterval(()=>{if(!document.hidden&&document.body.dataset.workspace==='garage'){if(playing&&rows.length>1)move(1);else render();}},8000);
render();check();
