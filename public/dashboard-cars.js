import {weeklySeasonalCars} from './seasonal-cars.js';
const $=s=>document.querySelector(s);let rows=[],index=0,loaded=false,busy=false,lastLoad=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function render(){
 const previous=rows[index]?.id;const eligible=weeklySeasonalCars(rows);if(eligible.length!==rows.length){rows=eligible;index=Math.max(0,rows.findIndex(car=>car.id===previous));}
 const car=rows[index];$('#seasonal-car-name').textContent=car?car.model:loaded?'No new seasonal arrivals yet':'Checking seasonal arrivals…';
 $('#seasonal-car-info').textContent=car?`${car.year} ${car.brand} · first seen ${new Date(car.addedAt).toLocaleDateString()}`:'New Seasonal-sheet entries detected in the last seven days appear here automatically.';
 $('#seasonal-car-count').textContent=car?`${index+1} of ${rows.length}`:'';
 $('#seasonal-controls').hidden=rows.length<2;$('#seasonal-pause').textContent=playing?'Pause':'Play';$('#seasonal-pause').setAttribute('aria-pressed',String(!playing));
}
function accept(data){if(!Array.isArray(data?.cars))return;const id=rows[index]?.id;rows=weeklySeasonalCars(data.cars);index=Math.max(0,rows.findIndex(c=>c.id===id));loaded=true;lastLoad=Date.now();render();}
async function load(){if(busy)return;busy=true;try{const r=await fetch('/api/rare-cars',{cache:'no-store'});if(r.ok)accept(await r.json());else if(!loaded){loaded=true;$('#seasonal-car-name').textContent='Seasonal arrivals unavailable';$('#seasonal-car-info').textContent='Open Rare Cars to view the saved collection.';}}catch{if(!loaded){loaded=true;$('#seasonal-car-name').textContent='Seasonal arrivals unavailable';$('#seasonal-car-info').textContent='Open Rare Cars to view the saved collection.';}}finally{busy=false;}}
function move(step){if(!rows.length)return;index=(index+step+rows.length)%rows.length;render();}
$('#seasonal-prev').addEventListener('click',()=>move(-1));$('#seasonal-next').addEventListener('click',()=>move(1));$('#seasonal-pause').addEventListener('click',()=>{playing=!playing;render();});
$('#seasonal-view').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('garage:navigate',{detail:'cars'}));document.dispatchEvent(new CustomEvent('ingenium:show-seasonal'));});
document.addEventListener('ingenium:rare-cars-updated',e=>accept(e.detail));
function check(){if(!document.hidden&&document.body.dataset.workspace==='garage'){if(loaded)render();if(Date.now()-lastLoad>=600000)load();}}
new MutationObserver(check).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});document.addEventListener('visibilitychange',check);setInterval(check,600000);setInterval(()=>{if(!document.hidden&&document.body.dataset.workspace==='garage'){if(playing&&rows.length>1)move(1);else render();}},8000);
render();check();
