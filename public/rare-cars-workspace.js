const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,page=1,busy=false,lastLoaded=0;const SIZE=24;
const time=value=>value?new Date(value).toLocaleString():'Not available';
function render(){
 if(!data)return;const query=$('#rare-cars-search').value.trim().toLocaleLowerCase(),category=$('#rare-cars-category').value;
 const cars=data.cars.filter(c=>(!category||c.category===category)&&[c.year,c.brand,c.model,c.category,c.classification,...c.details.map(d=>d.value)].join(' ').toLocaleLowerCase().includes(query));
 const pages=Math.max(1,Math.ceil(cars.length/SIZE));page=Math.min(page,pages);
 $('#rare-cars-count').textContent=`${cars.length.toLocaleString()} matching entries · ${data.cars.length.toLocaleString()} total across ${data.categories.length} categories. A car may appear in more than one category.`;
 $('#rare-cars-results').innerHTML=cars.slice((page-1)*SIZE,page*SIZE).map(c=>`<article class="rare-car"><span class="eyebrow">${esc(c.category)}</span><h3>${esc(c.year)} ${esc(c.brand)}<br>${esc(c.model)}</h3>${c.details.map(d=>`<p><strong>${esc(d.label)}</strong><span>${esc(d.value)}</span></p>`).join('')}${c.classification?`<p class="source-classification">${esc(c.classification)}</p>`:''}<span class="muted small">Source row ${c.sourceRow}</span><button class="button outline" data-rare-car="${esc(c.id)}">Use car in Tune Calculator ›</button></article>`).join('')||'<p class="muted">No cars match these filters.</p>';
 $('#rare-cars-page').textContent=`Page ${page} of ${pages}`;$('#rare-cars-prev').disabled=page<=1;$('#rare-cars-next').disabled=page>=pages;
 const info=data.categories.find(c=>c.name===category);$('#rare-cars-notes').hidden=!info;$('#rare-cars-category-notes').innerHTML=info?info.notes.map(n=>`<p>${esc(n)}</p>`).join(''):'';
}
async function load(force=false){
 if(busy)return;busy=true;$('#rare-cars-refresh').disabled=true;$('#rare-cars-sync').textContent=`Last updated: ${time(data?.sync?.checkedAt)}`;
 try{if(!data){const bundled=await fetch('/rare-cars.json');if(bundled.ok){data=await bundled.json();const selected=$('#rare-cars-category').value;$('#rare-cars-category').innerHTML='<option value="">All categories</option>'+data.categories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)} (${c.count})</option>`).join('');$('#rare-cars-category').value=selected;render();}}const r=await fetch('/api/rare-cars',{method:force?'POST':'GET',headers:force?{'X-Forza-Garage':'1'}:{},cache:'no-store'});const next=await r.json();if(!r.ok||!Array.isArray(next.cars)||!next.sync)throw new Error(next.error||'The data service is unavailable.');data=next;lastLoaded=Date.now();const selected=$('#rare-cars-category').value;$('#rare-cars-category').innerHTML='<option value="">All categories</option>'+data.categories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)} (${c.count})</option>`).join('');$('#rare-cars-category').value=selected;
  const s=data.sync;$('#rare-cars-sync').textContent=`Last updated: ${time(s.checkedAt)}`;$('#rare-cars-sync').dataset.state=s.error?'cached':s.origin;render();
 }catch(e){$('#rare-cars-sync').textContent=`Last updated: ${time(data?.sync?.checkedAt)}`;$('#rare-cars-sync').dataset.state='unavailable';}
 finally{busy=false;$('#rare-cars-refresh').disabled=false;}
}
$('#rare-cars-search').addEventListener('input',()=>{page=1;render();});$('#rare-cars-category').addEventListener('change',()=>{page=1;render();});$('#rare-cars-refresh').addEventListener('click',()=>load(true));$('#rare-cars-prev').addEventListener('click',()=>{page--;render();});$('#rare-cars-next').addEventListener('click',()=>{page++;render();});
$('#rare-cars-results').addEventListener('click',e=>{const id=e.target.closest('[data-rare-car]')?.dataset.rareCar,c=data?.cars.find(c=>c.id===id);if(!c)return;const label=`${c.year} ${c.brand} ${c.model}`.slice(0,100);for(const selector of ['#drag-form [name=car]','#drift-form [name=car]','#tune-car']){const input=$(selector);if(input){input.value=label;input.dispatchEvent(new Event('input',{bubbles:true}));}}document.dispatchEvent(new CustomEvent('garage:navigate',{detail:'tuning'}));document.dispatchEvent(new CustomEvent('garage:notice',{detail:'Car name selected. Enter its actual build specifications; this acquisition guide contains no tuning physics data.'}));});
function open(){if(document.body.dataset.workspace==='cars'&&(!data||Date.now()-lastLoaded>=600000))load();}
new MutationObserver(open).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});open();setInterval(()=>{if(!document.hidden&&data)load();},600000);

document.addEventListener('visibilitychange',()=>{if(!document.hidden&&data&&Date.now()-lastLoaded>=600000)load();});
