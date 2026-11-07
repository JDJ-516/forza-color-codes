import { FINISH_TYPES,needsSecondLayer,personalColor,nextFeaturedColor,FEATURE_INTERVAL_MS,paintTextColor } from './color-tools.js';
import { hsvToHex,hexToHsv } from './calculators.js';
import { catalogueMetadata } from './data.js';
import { recipeLayers, recipeText, displaySetting } from './recipe.js';
let catalogue = [], loaded = false, page = 1;
const PAGE_SIZE = 48;
const $ = (s) => document.querySelector(s);
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collectionStatus=c=>c.source?(c.source.historical?'HISTORICAL ALTERNATIVE':c.issues?.length?'NEEDS REVIEW':''):'PERSONAL RECIPE';
const validColor = c => c && typeof c.id === 'string' && ['name','manufacturer','notes'].every(k => typeof c[k] === 'string') && /^#[0-9a-f]{6}$/i.test(c.hex) && typeof c.finish === 'string' && c.finish.trim().length > 0 && c.finish.length <= 80 && ['Green','Red','Blue','Yellow','Pink','Purple','Orange','Neutral'].includes(c.family) && ['h','s','b'].every(k => Number.isFinite(c[k]) && c[k]>=0 && c[k]<=1) && (!c.layers || Array.isArray(c.layers) && c.layers.length >= 1 && c.layers.length <= 2 && c.layers.every(l => l && typeof l.label === 'string' && Array.isArray(l.raw) && l.raw.length === 3 && l.raw.every(v => typeof v === 'string' || typeof v === 'number') && Array.isArray(l.values) && l.values.length === 3 && l.values.every(v => Number.isFinite(v) && v >= 0 && v <= 1)));
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
let customs = read('fcc-colors', []); customs = Array.isArray(customs) ? customs.filter(validColor).map(c => ({...c, sample:false})) : [];
let saved = read('fcc-favorites', []); const favorites = new Set(Array.isArray(saved) ? saved.filter(x => typeof x === 'string') : []);
let family = '', onlyFavorites = false, current = null, toastTimer;
const all = () => [...catalogue, ...customs.map(c => ({...c,category:"Personal"}))];
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
function persist() { try { localStorage.setItem('fcc-colors', JSON.stringify(customs)); localStorage.setItem('fcc-favorites', JSON.stringify([...favorites])); return true; } catch { toast('Browser storage is unavailable. Changes will last for this session only.'); return false; } }
function manufacturers() {
 const list=[...new Set(all().map(c=>c.manufacturer).filter(Boolean))].sort();
 for(const [selector,blank,custom] of [['#manufacturer','All manufacturers',false],['#color-manufacturer','No manufacturer',true],['#lab-make','No manufacturer',false]]){
  const select=$(selector),previous=select.value;
  select.innerHTML=`<option value="">${blank}</option>`+list.map(m=>`<option>${escape(m)}</option>`).join('')+(custom?'<option value="__custom__">Other / custom…</option>':'');
  if(previous&&previous!=='__custom__'&&!list.includes(previous))select.add(new Option(previous,previous));
  select.value=previous;
 }
}
function finishes(){
 const list=[...new Set([...FINISH_TYPES,...all().map(c=>c.finish).filter(f=>f!=='N/A')])].sort();
 for(const selector of ['#color-finish','#lab-finish']){
  const select=$(selector),previous=select.value;
  select.innerHTML=list.map(f=>`<option>${escape(f)}</option>`).join('')+(selector==='#color-finish'?'<option value="__custom_finish__">Other / custom finish…</option>':'');select.value=list.includes(previous)||previous==='__custom_finish__'?previous:'Normal';
 }
}
function modalLayers(){
 const custom=$('#color-finish').value==='__custom_finish__',customInput=$('#color-form [name=customFinish]');$('#custom-finish-wrap').hidden=!custom;customInput.disabled=!custom;customInput.required=custom;
 const required=needsSecondLayer(custom?customInput.value:$('#color-finish').value),toggle=$('#color-second-layer');
 if(required)toggle.checked=true;toggle.disabled=required;
 $('#color-layer-2').hidden=!toggle.checked;
 $('#color-layer-2').querySelectorAll('input,select').forEach(el=>el.disabled=!toggle.checked);
 $('#color-layer-help').textContent=required?'This finish uses both Color 1 (X) and Color 2 (Y).':'Add a second HSB group if your paint recipe needs one. L/R slider-side markers are optional.';
}
$('#color-finish').addEventListener('change',modalLayers);$('#color-form [name=customFinish]').addEventListener('input',modalLayers);$('#color-second-layer').addEventListener('change',modalLayers);
$('#color-manufacturer').addEventListener('change',()=>{const custom=$('#color-manufacturer').value==='__custom__',input=$('#color-form [name=customManufacturer]');$('#custom-manufacturer-wrap').hidden=!custom;input.disabled=!custom;input.required=custom;});
$('#color-form').addEventListener('input',e=>{
 const form=e.currentTarget;
 if(['h','s','b'].includes(e.target.name)){const n=['h','s','b'].map(k=>form.elements[k].value===''?NaN:Number(form.elements[k].value));if(n.every(v=>Number.isFinite(v)&&v>=0&&v<=1))form.elements.hex.value=hsvToHex(...n);}
 if(e.target.name==='hex')hexToHsv(e.target.value).forEach((v,i)=>form.elements[['h','s','b'][i]].value=v.toFixed(2));
});
finishes();modalLayers();

function render(resetPage = false) {
  if (resetPage) page = 1;
  const q = $('#search').value.toLowerCase().trim();
  let colors = all().filter(c => (!onlyFavorites || favorites.has(c.id)) && (!family || c.family === family) && (!$('#manufacturer').value || c.manufacturer === $('#manufacturer').value) && (!$('#finish').value || c.finish === $('#finish').value) && (!$('#category').value || c.category === $('#category').value) && (!$('#quality').value || ($('#quality').value === 'historical' ? c.source?.historical : c.issues?.length)) && `${c.name} ${c.manufacturer} ${c.family} ${c.notes}`.toLowerCase().includes(q));
  $('#favorites-filter option[value=favorites]').textContent = `Favorites (${all().filter(c=>favorites.has(c.id)).length})`;
  $('#result-count').textContent = `${colors.length} color${colors.length === 1 ? '' : 's'}`;
  $('#library-title').innerHTML = `${onlyFavorites ? 'Your favorites' : 'The color library'}<span>.</span>`;
  $('#library-nav').classList.toggle('active', document.body.dataset.workspace === 'library');
  const pages = Math.max(1, Math.ceil(colors.length / PAGE_SIZE));
  page = Math.min(page, pages);
  $('#pagination').hidden = colors.length <= PAGE_SIZE;
  $('#page-info').textContent = `Page ${page} of ${pages} · ${colors.length.toLocaleString()} results`;
  $('#previous-page').disabled = page === 1; $('#next-page').disabled = page === pages;
  $('#grid').innerHTML = colors.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(c => `<article class="card"><div class="swatch" style="--paint:${c.hex}"><button class="swatch-open" data-open="${escape(c.id)}" aria-label="View ${escape(c.name)} recipe"><span class="paint-sheen"></span><span class="swatch-hex">${c.hex.toUpperCase()}</span><span class="view-recipe">VIEW RECIPE ›</span></button><button class="favorite ${favorites.has(c.id) ? 'is-saved' : ''}" data-favorite="${escape(c.id)}" aria-label="${favorites.has(c.id) ? 'Unsave' : 'Save'} ${escape(c.name)}" aria-pressed="${favorites.has(c.id)}">${favorites.has(c.id) ? '♥' : '♡'}</button></div><div class="card-info"><div class="card-meta"><span>${escape(c.manufacturer || 'Independent color')}</span><span class="finish">${escape(c.finish)}</span></div><button class="color-title" data-open="${escape(c.id)}">${escape(c.name)} <span>›</span></button>${collectionStatus(c)?`<div class="card-bottom"><span>${collectionStatus(c)}</span><span class="mini-dot" style="background:${c.hex}"></span></div>`:''}</div></article>`).join('');
  $('#empty').hidden = !loaded || colors.length !== 0;
  document.querySelectorAll('[data-family]').forEach(b => { b.classList.toggle('selected', b.dataset.family === family); b.setAttribute('aria-pressed', b.dataset.family === family); });
}
function toggleFavorite(id) { if(favorites.has(id)) favorites.delete(id); else favorites.add(id); persist(); render(); if(current?.id === id) detail(current); }
function detail(c) {
  if(!c)return;
  current = c;
  document.dispatchEvent(new CustomEvent('garage:navigate',{detail:'library'}));
  const url=new URL(location.href);url.searchParams.set('recipe',c.id);url.hash='library';history.replaceState(null,'',url);
  $('#detail-content').innerHTML = `<div class="detail-swatch" style="--paint:${c.hex}"><span class="paint-sheen"></span><span class="detail-hex">${c.hex.toUpperCase()}</span><button class="icon-button close-detail" aria-label="Close recipe">×</button></div><div class="detail-body"><div class="eyebrow">${escape(c.manufacturer || 'Independent color')} / ${escape(c.finish)}</div><h2>${escape(c.name)}</h2><p class="muted">${c.source ? `${escape(c.category)} recipe · ${c.source.historical ? 'Historical alternative' : 'Imported community settings'}` : 'Your personal paint recipe'}</p>${c.issues?.length ? '<p class="review-warning">Needs review: this source row contains malformed or missing settings. The original values are shown below without correction.</p>' : ''}${c.source?.historical ? `<p class="review-warning">${escape(c.source.warning)}</p>` : ''}${recipeLayers(c).map(layer => `<h3 class="layer-heading">${escape(layer.label)}</h3><div class="recipe-values">${['Hue','Saturation','Brightness'].map((label,i) => `<div><span>${label}</span><strong>${escape(displaySetting(layer.raw[i]))}</strong></div>`).join('')}</div>`).join('')}<p class="recipe-help">${c.source ? 'Paint type: '+escape(c.finish)+'. Preserve the L/R markers exactly as supplied in the source. Preview swatches approximate Color 1 using standard HSV; they do not simulate Forza’s lighting, material, or second layer. Game compatibility has not been independently verified.' : 'Use these HSB values as a starting point in the paint editor.'}</p>${c.notes ? `<p class="notes">${escape(c.notes)}</p>` : ''}${c.source ? `<p class="source-note">Source: <a href="${escape(c.source.url || catalogueMetadata.url)}" target="_blank" rel="noopener noreferrer">${escape(c.source.title || catalogueMetadata.title)}</a> · ${escape(c.source.sheet)} · Row ${c.source.row}</p>` : ''}<div class="detail-actions"><button class="button outline" id="experiment-color" ${recipeLayers(c).some(l=>l.values.some(v=>!Number.isFinite(v))) ? 'disabled title="Review malformed or missing source settings first"' : ''}>Experiment in color lab</button><button class="button dark" id="copy-recipe">Copy recipe ›</button><button class="button outline" data-favorite="${escape(c.id)}">${favorites.has(c.id) ? '♥ Saved' : '♡ Save color'}</button>${!c.source ? '<button class="delete-button" id="delete-color">Delete</button>' : ''}</div></div>`;
  if(!$('#detail').open) $('#detail').showModal();
}
$('#families').innerHTML = [['','All colors'],['Green','Green'],['Red','Red'],['Blue','Blue'],['Yellow','Yellow'],['Purple','Purple'],['Pink','Pink'],['Orange','Orange'],['Neutral','Neutral'],['Unknown','Unknown']].map(([value,label]) => `<button data-family="${value}" aria-pressed="${!value}">${label}</button>`).join('');
document.addEventListener('click', async e => {
  const open = e.target.closest('[data-open]'); if(open){if(open.tagName==='A'){if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();}detail(all().find(c => c.id === open.dataset.open));}
  const favorite = e.target.closest('[data-favorite]'); if(favorite) toggleFavorite(favorite.dataset.favorite);
  const filter = e.target.closest('[data-family]'); if(filter) { family = filter.dataset.family; render(true); }
  if(e.target.closest('.close-detail')) closeDetail();
  if(e.target.closest('.close-create')) $('#create').close();
  if(e.target.closest('#copy-recipe')) {
    const text = recipeText(current);
    try { await navigator.clipboard.writeText(text); toast('Recipe copied. See you in the paint booth.'); } catch { toast('Clipboard unavailable. You can read the recipe values above.'); }
  }
  if(e.target.closest('#experiment-color')) { closeDetail(); document.dispatchEvent(new CustomEvent('garage:experiment',{detail:current})); }
  if(e.target.closest('#delete-color')) { customs = customs.filter(c => c.id !== current.id); favorites.delete(current.id); persist(); closeDetail(); manufacturers(); render();updateFeatured();toast('Personal recipe deleted.'); }
});
for(const selector of ['#add-color','#add-bottom']) $(selector).addEventListener('click', () => $('#create').showModal());
for(const selector of ['#search','#manufacturer','#finish','#category','#quality']) $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => render(true));
function scrollLibrary() { document.dispatchEvent(new CustomEvent('garage:navigate',{detail:'library'})); $('#library').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }
$('#explore').addEventListener('click', scrollLibrary);
$('#library-nav').addEventListener('click',()=>{render(true);scrollLibrary();});
$('#favorites-filter').addEventListener('change',()=>{onlyFavorites=$('#favorites-filter').value==='favorites';render(true);});
$('#reset').addEventListener('click', () => { family = ''; $('#search').value = ''; $('#manufacturer').value = ''; $('#finish').value = ''; onlyFavorites=false;$('#favorites-filter').value='all';$('#category').value=''; $('#quality').value=''; render(true); });
$('#color-form').addEventListener('submit', e => {
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 try{
  const c=personalColor(Object.fromEntries(new FormData(form)),{id:crypto.randomUUID(),secondary:$('#color-second-layer').checked});
  if(!validColor(c))throw new Error('Check the color settings.');
  customs.push(c);const stored=persist();manufacturers();finishes();family='';onlyFavorites=false;$('#favorites-filter').value='all';
  for(const selector of ['#search','#manufacturer','#finish','#category','#quality'])$(selector).value='';
  render(true);updateFeatured();$('#create').close();form.reset();form.elements.finish.value='Normal';$('#custom-manufacturer-wrap').hidden=true;form.elements.customManufacturer.disabled=true;form.elements.customManufacturer.required=false;modalLayers();detail(c);if(stored)toast('Your color has joined the collection.');
 }catch(error){toast(error.message);}
});
function clearRecipeURL(){const url=new URL(location.href);url.searchParams.delete('recipe');history.replaceState(null,'',url);}
function closeDetail(){clearRecipeURL();$('#detail').close();}
$('#detail').addEventListener('close',()=>{if(!$('#detail').open)clearRecipeURL();});
$('#detail').addEventListener('cancel',clearRecipeURL);

for(const d of document.querySelectorAll('dialog')) d.addEventListener('click', e => { if(e.target === d) {const r=d.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) {if(d.id==='detail')closeDetail();else d.close();}} });
document.addEventListener('keydown', e => { if(e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); scrollLibrary(); $('#search').focus(); } });
manufacturers(); render();

async function pollTelemetry() {
  try {
    const response = await fetch('/api/telemetry', {cache:'no-store'});
    if (!response.ok) throw new Error('Receiver unavailable');
    const data = await response.json();
    const labels = {disabled:'Receiver disabled', stopped:'Receiver stopped', waiting:'Waiting for packets', receiving:'Receiving UDP packets', stale:'Signal lost', error:'Receiver error'};
    $('#telemetry-state').textContent = labels[data.state] || 'Unknown receiver state';
    const fresh=data.latest&&(data.decodedAgeMs!=null?data.decodedAgeMs<3000:data.decodedAt&&Date.now()-data.decodedAt<3000);
    const state=fresh?(data.latest.isRaceOn?'Live driving data':'Connected · game inactive'):({disabled:'Receiver disabled',waiting:'Waiting for game',stopped:'Receiver stopped',stale:'Signal lost',error:'Receiver error',receiving:'UDP received · decoder needs attention'}[data.state]||'Unknown connection');
    $('#home-telemetry-state').textContent=state;$('#home-telemetry-state').classList.toggle('live',!!fresh&&data.latest.isRaceOn);
    $('#home-telemetry-count').textContent=`${data.packets??0} packets · ${data.recordedSamples??0} captured frames`;
    $('#home-telemetry-message').textContent=fresh?`${data.latest.speedKph.toFixed(1)} km/h · ${Math.round(data.latest.rpm)} RPM · gear ${data.latest.gear}`:data.state==='disabled'?'Start the app with telemetry enabled, then direct game Data Out to this PC.':data.error?`Receiver error: ${data.error}`:data.decodeError||`Data Out ${data.receiver?.port?'UDP '+data.receiver.port:'receiver'} · last packet ${data.lastReceivedAt?new Date(data.lastReceivedAt).toLocaleTimeString():'not received yet'}`;

    $('#telemetry-state').classList.toggle('live', data.state === 'receiving');
    $('#decoded-telemetry').textContent = data.latest ? `${fresh ? (data.latest.isRaceOn ? 'Decoded driving data' : 'Decoded · game inactive') : 'Last decoded data (stale)'}: ${data.latest.speedKph.toFixed(1)} km/h · ${Math.round(data.latest.rpm)} RPM · gear ${data.latest.gear} · ${data.recordedSamples} captured samples. Decoder: community-cross-checked; validate against your game.` : `No plausible decoded data yet. ${data.decodeError || 'Waiting for Horizon 324-byte packets.'}`;
    $('#packet-count').textContent = String(data.packets ?? 0);
    $('#packet-size').textContent = data.lastPacket ? `${data.lastPacket.bytes} bytes` : '—';
    $('#packet-age').textContent = data.lastReceivedAt != null ? new Date(data.lastReceivedAt).toLocaleTimeString() : '—';
    $('#packet-preview').textContent = data.lastPacket?.previewHex || (data.error ? `Receiver error: ${data.error}. Check the configured UDP host and port.` : 'No packet received.');
  } catch {
    $('#telemetry-state').textContent = 'App connection lost';$('#home-telemetry-state').textContent='App disconnected';$('#home-telemetry-state').classList.remove('live');$('#home-telemetry-message').textContent='Cannot reach the local app server. Connection readings are unavailable.';
    $('#telemetry-state').classList.remove('live');
  } finally { setTimeout(pollTelemetry, document.hidden ? 5000 : 1000); }
}
pollTelemetry();

for (const [selector, step] of [['#previous-page',-1],['#next-page',1]]) $(selector).addEventListener('click', () => { page += step; render(); $('#grid').scrollIntoView({block:'start'}); });
async function loadCatalogue() {
  try {
    const response = await fetch('/catalogue.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== catalogueMetadata.total) throw new Error('Catalogue is incomplete');
    catalogue = rows; loaded = true;
    $('#garage-catalogue-count').textContent = `${catalogueMetadata.total.toLocaleString()} community recipes`;
    const previousFinish = $('#finish').value;
    $('#finish').innerHTML = '<option value="">All finishes</option>' + [...new Set([...catalogue.map(c=>c.finish),'Solid','Metallic'])].sort().map(f=>`<option>${escape(f)}</option>`).join('');
    $('#finish').value = previousFinish;
    $('#catalogue-status').textContent = `${catalogueMetadata.total.toLocaleString()} recipes: ${catalogueMetadata.sheets['Vehicle Colours'].toLocaleString()} vehicle + ${catalogueMetadata.sheets['Wheel Colours']} wheel + ${catalogueMetadata.historicalTotal} historical alternatives.`;
    manufacturers();finishes();modalLayers();render(true);updateFeatured();
    const id=new URL(location.href).searchParams.get('recipe');if(id){const color=all().find(c=>c.id===id);if(color)detail(color);else toast('That recipe is no longer in this collection.');}
  } catch {
    $('#catalogue-status').textContent = 'The spreadsheet collection could not load. Reload the page to retry. Personal recipes remain available.';
    loaded = true;render(true);updateFeatured();
  }
}
loadCatalogue();

document.addEventListener('garage:notice', e => toast(e.detail));
document.addEventListener('garage:save-color', e => {
  const c = e.detail;
  if (!validColor(c)) { toast('This experiment has invalid settings. Check both layers.'); return; }
  customs.push(c);
  const stored = persist(); manufacturers();finishes();
  if (![...$('#finish').options].some(o=>o.value===c.finish)) $('#finish').add(new Option(c.finish,c.finish));
  render(true);updateFeatured();
  if(stored) toast('Personal color saved to your library.');
});

let featuredRecord=read('fcc-featured-color',null),featuredTimer;
function updateFeatured(){
 clearTimeout(featuredTimer);featuredRecord=nextFeaturedColor(all(),featuredRecord);
 if(!featuredRecord){$('#featured-name').textContent='No recipes available';$('#featured-make').textContent='COLOR LIBRARY';$('#featured-refresh').textContent='Load the collection or add a personal color to display a recipe.';$('#featured-recipe').hidden=true;return;}
 try{localStorage.setItem('fcc-featured-color',JSON.stringify(featuredRecord));}catch{}
 const c=all().find(c=>c.id===featuredRecord.id);if(!c)return;
 $('#featured-swatch').style.background=c.hex;
 $('#featured-swatch').style.color=paintTextColor(c.hex);
 $('#featured-hex').textContent=c.hex.toUpperCase();$('#featured-make').textContent=`${c.manufacturer||'Independent color'} / ${c.finish}`;$('#featured-name').textContent=c.name;
 $('#featured-code').innerHTML=recipeLayers(c).map(layer=>`<div class="featured-layer"><span>${escape(layer.label)}</span><code>${['H','S','B'].map((key,i)=>`${key} ${escape(displaySetting(layer.raw[i]))}`).join(' · ')}</code></div>`).join('');
 const link=$('#featured-recipe');link.href=`?recipe=${encodeURIComponent(c.id)}#library`;link.dataset.open=c.id;link.hidden=false;
 $('#featured-refresh').textContent=`Next color at ${new Date(featuredRecord.changedAt+FEATURE_INTERVAL_MS).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}.`;
 featuredTimer=setTimeout(updateFeatured,Math.max(100,featuredRecord.changedAt+FEATURE_INTERVAL_MS-Date.now()));
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loaded)updateFeatured();});
