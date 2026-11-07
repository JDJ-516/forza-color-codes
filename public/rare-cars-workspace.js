const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data=null,page=1,busy=false,lastLoaded=0,newOnly=false;const SIZE=24,NEW_MS=30*86400000;
const time=value=>value?new Date(value).toLocaleString():'Not available';
const isNew=c=>{const age=Date.now()-Date.parse(c.addedAt);return Number.isFinite(age)&&age>=0&&age<NEW_MS;};
const colors=['#8bbcff','#c1a5ff','#ffc18b','#93cfe0','#e5a8cf'];
function card(c){return `<article class="rare-car"><div class="rare-car-labels"><span class="eyebrow">${esc(c.category)}</span>${isNew(c)?'<span class="new-badge">New</span>':''}</div><h3>${esc(c.year)} ${esc(c.brand)}<br>${esc(c.model)}</h3>${c.details.map(d=>`<p><strong>${esc(d.label)}</strong><span>${esc(d.value)}</span></p>`).join('')}${c.classification?`<p class="source-classification">${esc(c.classification)}</p>`:''}${isNew(c)?`<p class="first-seen">First seen ${esc(new Date(c.addedAt).toLocaleDateString())}</p>`:''}<button class="button outline" data-rare-car="${esc(c.id)}">Use car in Tune Calculator ›</button></article>`;}
function categories(){const selected=$('#rare-cars-category').value;$('#rare-cars-category').innerHTML='<option value="">All categories</option>'+data.categories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)} (${c.count})</option>`).join('');$('#rare-cars-category').value=data.categories.some(c=>c.name===selected)?selected:'';}
function render(){
 if(!data)return;const query=$('#rare-cars-search').value.trim().toLocaleLowerCase(),category=$('#rare-cars-category').value;
 const cars=data.cars.filter(c=>(!category||c.category===category)&&(!newOnly||isNew(c))&&[c.year,c.brand,c.model,c.category,c.classification,...c.details.map(d=>d.value)].join(' ').toLocaleLowerCase().includes(query));
 if(newOnly)cars.sort((a,b)=>Date.parse(b.addedAt)-Date.parse(a.addedAt));
 const pages=Math.max(1,Math.ceil(cars.length/SIZE));page=Math.min(page,pages);
 $('#rare-cars-count').textContent=`${cars.length.toLocaleString()} matching entries · ${data.cars.length.toLocaleString()} total across ${data.categories.length} categories.`;
 const newCount=data.cars.filter(isNew).length;
 $('#rare-cars-tabs').innerHTML=`<button class="category-tab ${!category&&!newOnly?'selected':''}" data-car-tab="all" aria-pressed="${!category&&!newOnly}">All categories <span>${data.cars.length}</span></button><button class="category-tab new-tab ${newOnly?'selected':''}" data-car-tab="new" aria-pressed="${newOnly}">New <span>${newCount}</span></button>`+data.categories.map(c=>`<button class="category-tab ${category===c.name&&!newOnly?'selected':''}" data-car-tab="category" data-category="${esc(c.name)}" aria-pressed="${category===c.name&&!newOnly}">${esc(c.name)} <span>${c.count}</span></button>`).join('');
 $('#rare-cars-new-note').hidden=!newOnly;
 if(!category){
  $('#rare-cars-results').innerHTML=data.categories.map((group,index)=>{const matches=cars.filter(c=>c.category===group.name);if(!matches.length)return '';return `<section class="rare-category-group" style="--category-accent:${colors[index%colors.length]}"><div class="rare-group-heading"><h3>${esc(group.name)} <span>${matches.length}</span></h3>${matches.length>3?`<button class="button outline" data-view-category="${esc(group.name)}">View all ${matches.length} ›</button>`:''}</div><div class="rare-car-grid">${matches.slice(0,3).map(card).join('')}</div></section>`;}).join('')||`<p class="muted">${newOnly?'No new entries have been detected in the last 30 days.':'No cars match these filters.'}</p>`;
 }else $('#rare-cars-results').innerHTML=`<div class="rare-car-grid">${cars.slice((page-1)*SIZE,page*SIZE).map(card).join('')}</div>`;
 $('#rare-cars-pagination').hidden=!category;$('#rare-cars-page').textContent=`Page ${page} of ${pages}`;$('#rare-cars-prev').disabled=page<=1;$('#rare-cars-next').disabled=page>=pages;
 const info=data.categories.find(c=>c.name===category);$('#rare-cars-notes').hidden=!info;$('#rare-cars-category-notes').innerHTML=info?info.notes.map(n=>`<p>${esc(n)}</p>`).join(''):'';
}
async function load(force=false){
 if(busy)return;busy=true;$('#rare-cars-refresh').disabled=true;$('#rare-cars-sync').textContent=`Last updated: ${time(data?.sync?.checkedAt)}`;
 try{
  if(!data){const bundled=await fetch('/rare-cars.json');if(bundled.ok){data=await bundled.json();categories();render();}}
  const response=await fetch('/api/rare-cars',{method:force?'POST':'GET',headers:force?{'X-Forza-Garage':'1'}:{},cache:'no-store'}),next=await response.json();if(!response.ok||!Array.isArray(next.cars)||!next.sync)throw new Error(next.error||'The data service is unavailable.');
  data=next;lastLoaded=Date.now();categories();$('#rare-cars-sync').textContent=`Last updated: ${time(data.sync.checkedAt)}`;$('#rare-cars-sync').dataset.state=data.sync.error?'cached':data.sync.origin;render();
 }catch{$('#rare-cars-sync').textContent=`Last updated: ${time(data?.sync?.checkedAt)}`;$('#rare-cars-sync').dataset.state='unavailable';}
 finally{busy=false;$('#rare-cars-refresh').disabled=false;}
}
$('#rare-cars-search').addEventListener('input',()=>{page=1;render();});$('#rare-cars-category').addEventListener('change',()=>{page=1;render();});$('#rare-cars-refresh').addEventListener('click',()=>load(true));$('#rare-cars-prev').addEventListener('click',()=>{page--;render();});$('#rare-cars-next').addEventListener('click',()=>{page++;render();});
$('#rare-cars-tabs').addEventListener('click',e=>{const button=e.target.closest('[data-car-tab]');if(!button)return;newOnly=button.dataset.carTab==='new';$('#rare-cars-category').value=button.dataset.category||'';page=1;render();});
$('#rare-cars-results').addEventListener('click',e=>{
 const group=e.target.closest('[data-view-category]');if(group){$('#rare-cars-category').value=group.dataset.viewCategory;page=1;render();$('#rare-cars-category').focus();return;}
 const id=e.target.closest('[data-rare-car]')?.dataset.rareCar,c=data?.cars.find(c=>c.id===id);if(!c)return;const label=`${c.year} ${c.brand} ${c.model}`.slice(0,100);for(const selector of ['#drag-form [name=car]','#drift-form [name=car]','#tune-car']){const input=$(selector);if(input){input.value=label;input.dispatchEvent(new Event('input',{bubbles:true}));}}document.dispatchEvent(new CustomEvent('garage:navigate',{detail:'tuning'}));document.dispatchEvent(new CustomEvent('garage:notice',{detail:'Car name selected. Enter its actual build specifications.'}));
});
function open(){if(document.body.dataset.workspace==='cars'&&(!data||Date.now()-lastLoaded>=600000))load();}
new MutationObserver(open).observe(document.body,{attributes:true,attributeFilter:['data-workspace']});open();setInterval(()=>{if(!document.hidden&&data)load();},600000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&data&&Date.now()-lastLoaded>=600000)load();});
