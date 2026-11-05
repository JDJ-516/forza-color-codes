import { catalogueMetadata } from './data.js';
import { recipeLayers, recipeText, displaySetting } from './recipe.js';
let catalogue = [], loaded = false, page = 1;
const PAGE_SIZE = 48;
const $ = (s) => document.querySelector(s);
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validColor = c => c && typeof c.id === 'string' && ['name','manufacturer','notes'].every(k => typeof c[k] === 'string') && /^#[0-9a-f]{6}$/i.test(c.hex) && ['Solid','Metallic'].includes(c.finish) && ['Green','Red','Blue','Yellow','Pink','Purple','Orange','Neutral'].includes(c.family) && ['h','s','b'].every(k => Number.isFinite(c[k]) && c[k]>=0 && c[k]<=1);
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
let customs = read('fcc-colors', []); customs = Array.isArray(customs) ? customs.filter(validColor).map(c => ({...c, sample:false})) : [];
let saved = read('fcc-favorites', []); const favorites = new Set(Array.isArray(saved) ? saved.filter(x => typeof x === 'string') : []);
let family = '', onlyFavorites = false, current = null, toastTimer;
const all = () => [...catalogue, ...customs.map(c => ({...c,category:"Personal"}))];
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
function persist() { try { localStorage.setItem('fcc-colors', JSON.stringify(customs)); localStorage.setItem('fcc-favorites', JSON.stringify([...favorites])); return true; } catch { toast('Browser storage is unavailable. Changes will last for this session only.'); return false; } }
function manufacturers() { const previous = $('#manufacturer').value; $('#manufacturer').innerHTML = '<option value="">All manufacturers</option>' + [...new Set(all().map(c => c.manufacturer))].sort().map(m => `<option>${escape(m)}</option>`).join(''); $('#manufacturer').value = previous; }
function render(resetPage = false) {
  if (resetPage) page = 1;
  const q = $('#search').value.toLowerCase().trim();
  let colors = all().filter(c => (!onlyFavorites || favorites.has(c.id)) && (!family || c.family === family) && (!$('#manufacturer').value || c.manufacturer === $('#manufacturer').value) && (!$('#finish').value || c.finish === $('#finish').value) && (!$('#category').value || c.category === $('#category').value) && (!$('#quality').value || ($('#quality').value === 'historical' ? c.source?.historical : c.issues?.length)) && `${c.name} ${c.manufacturer} ${c.family} ${c.notes}`.toLowerCase().includes(q));
  const sort = $('#sort').value; if(sort !== 'featured') colors.sort((a,b) => a[sort].localeCompare(b[sort]));
  $('#favorite-count').textContent = all().filter(c => favorites.has(c.id)).length;
  $('#result-count').textContent = `${colors.length} color${colors.length === 1 ? '' : 's'}`;
  $('#library-title').innerHTML = `${onlyFavorites ? 'Your favorites' : 'The color library'}<span>.</span>`;
  $('#library-nav').classList.toggle('active', !onlyFavorites); $('#favorites-nav').classList.toggle('active', onlyFavorites);
  const pages = Math.max(1, Math.ceil(colors.length / PAGE_SIZE));
  page = Math.min(page, pages);
  $('#pagination').hidden = colors.length <= PAGE_SIZE;
  $('#page-info').textContent = `Page ${page} of ${pages} · ${colors.length.toLocaleString()} results`;
  $('#previous-page').disabled = page === 1; $('#next-page').disabled = page === pages;
  $('#grid').innerHTML = colors.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(c => `<article class="card"><div class="swatch" style="--paint:${c.hex}"><button class="swatch-open" data-open="${escape(c.id)}" aria-label="View ${escape(c.name)} recipe"><span class="paint-sheen"></span><span class="swatch-hex">${c.hex.toUpperCase()}</span><span class="view-recipe">VIEW RECIPE ›</span></button><button class="favorite ${favorites.has(c.id) ? 'is-saved' : ''}" data-favorite="${escape(c.id)}" aria-label="${favorites.has(c.id) ? 'Unsave' : 'Save'} ${escape(c.name)}" aria-pressed="${favorites.has(c.id)}">${favorites.has(c.id) ? '♥' : '♡'}</button></div><div class="card-info"><div class="card-meta"><span>${escape(c.manufacturer)}</span><span class="finish">${escape(c.finish)}</span></div><button class="color-title" data-open="${escape(c.id)}">${escape(c.name)} <span>›</span></button><div class="card-bottom"><span>${c.source ? `${c.category.toUpperCase()} · ${c.source.historical ? 'HISTORICAL ALTERNATIVE' : c.issues.length ? 'NEEDS REVIEW' : 'SPREADSHEET'}` : 'PERSONAL RECIPE'}</span><span class="mini-dot" style="background:${c.hex}"></span></div></div></article>`).join('');
  $('#empty').hidden = !loaded || colors.length !== 0;
  document.querySelectorAll('[data-family]').forEach(b => { b.classList.toggle('selected', b.dataset.family === family); b.setAttribute('aria-pressed', b.dataset.family === family); });
}
function toggleFavorite(id) { if(favorites.has(id)) favorites.delete(id); else favorites.add(id); persist(); render(); if(current?.id === id) detail(current); }
function detail(c) {
  current = c;
  $('#detail-content').innerHTML = `<div class="detail-swatch" style="--paint:${c.hex}"><span class="paint-sheen"></span><span class="detail-hex">${c.hex.toUpperCase()}</span><button class="icon-button close-detail" aria-label="Close recipe">×</button></div><div class="detail-body"><div class="eyebrow">${escape(c.manufacturer)} / ${escape(c.finish)}</div><h2>${escape(c.name)}</h2><p class="muted">${c.source ? `${escape(c.category)} recipe · ${c.source.historical ? 'Historical alternative' : 'Imported community settings'}` : 'Your personal paint recipe'}</p>${c.issues?.length ? '<p class="review-warning">Needs review: this source row contains malformed or missing settings. The original values are shown below without correction.</p>' : ''}${c.source?.historical ? `<p class="review-warning">${escape(c.source.warning)}</p>` : ''}${recipeLayers(c).map(layer => `<h3 class="layer-heading">${escape(layer.label)}</h3><div class="recipe-values">${['Hue','Saturation','Brightness'].map((label,i) => `<div><span>${label}</span><strong>${escape(displaySetting(layer.raw[i]))}</strong></div>`).join('')}</div>`).join('')}<p class="recipe-help">${c.source ? 'Paint type: '+escape(c.finish)+'. Preserve the L/R markers exactly as supplied in the source. Preview swatches approximate Color 1 using standard HSV; they do not simulate Forza’s lighting, material, or second layer. Game compatibility has not been independently verified.' : 'Use these HSB values as a starting point in the paint editor.'}</p>${c.notes ? `<p class="notes">${escape(c.notes)}</p>` : ''}${c.source ? `<p class="source-note">Source: <a href="${escape(c.source.url || catalogueMetadata.url)}" target="_blank" rel="noopener noreferrer">${escape(c.source.title || catalogueMetadata.title)}</a> · ${escape(c.source.sheet)} · Row ${c.source.row}</p>` : ''}<div class="detail-actions"><button class="button dark" id="copy-recipe">Copy recipe ›</button><button class="button outline" data-favorite="${escape(c.id)}">${favorites.has(c.id) ? '♥ Saved' : '♡ Save color'}</button>${!c.source ? '<button class="delete-button" id="delete-color">Delete</button>' : ''}</div></div>`;
  if(!$('#detail').open) $('#detail').showModal();
}
$('#families').innerHTML = [['','All colors'],['Green','Green'],['Red','Red'],['Blue','Blue'],['Yellow','Yellow'],['Purple','Purple'],['Pink','Pink'],['Orange','Orange'],['Neutral','Neutral'],['Unknown','Unknown']].map(([value,label]) => `<button data-family="${value}" aria-pressed="${!value}">${label}</button>`).join('');
document.addEventListener('click', async e => {
  const open = e.target.closest('[data-open]'); if(open) detail(all().find(c => c.id === open.dataset.open));
  const favorite = e.target.closest('[data-favorite]'); if(favorite) toggleFavorite(favorite.dataset.favorite);
  const filter = e.target.closest('[data-family]'); if(filter) { family = filter.dataset.family; render(true); }
  if(e.target.closest('.close-detail')) $('#detail').close();
  if(e.target.closest('.close-create')) $('#create').close();
  if(e.target.closest('#copy-recipe')) {
    const text = recipeText(current);
    try { await navigator.clipboard.writeText(text); toast('Recipe copied. See you in the paint booth.'); } catch { toast('Clipboard unavailable. You can read the recipe values above.'); }
  }
  if(e.target.closest('#delete-color')) { customs = customs.filter(c => c.id !== current.id); favorites.delete(current.id); persist(); $('#detail').close(); manufacturers(); render(); toast('Personal recipe deleted.'); }
});
for(const selector of ['#add-color','#add-bottom']) $(selector).addEventListener('click', () => $('#create').showModal());
for(const selector of ['#search','#manufacturer','#finish','#sort','#category','#quality']) $(selector).addEventListener(selector === '#search' ? 'input' : 'change', () => render(true));
function scrollLibrary() { $('#library').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }
$('#explore').addEventListener('click', scrollLibrary);
for(const [selector,mode] of [['#library-nav',false],['#favorites-nav',true]]) $(selector).addEventListener('click', () => { onlyFavorites = mode; render(true); scrollLibrary(); });
$('#reset').addEventListener('click', () => { family = ''; $('#search').value = ''; $('#manufacturer').value = ''; $('#finish').value = ''; $('#sort').value = 'featured'; $('#category').value=''; $('#quality').value=''; render(true); });
$('#color-form').addEventListener('submit', e => {
  e.preventDefault(); const form = e.currentTarget; const values = Object.fromEntries(new FormData(form));
  const c = {...values, name: values.name.trim(), manufacturer: values.manufacturer.trim(), id: crypto.randomUUID(), h: Number(values.h), s: Number(values.s), b: Number(values.b), sample: false};
  if(!c.name || !c.manufacturer || !validColor(c)) { toast('Enter a color name, manufacturer, and HSB values between 0 and 1.'); return; }
  customs.push(c); const stored = persist(); manufacturers(); family=''; onlyFavorites=false; $('#search').value=''; $('#manufacturer').value=''; $('#finish').value=''; $('#category').value=''; $('#quality').value=''; render(true); $('#create').close(); form.reset(); detail(c); if(stored) toast('Your color has joined the collection.');
});
for(const d of document.querySelectorAll('dialog')) d.addEventListener('click', e => { if(e.target === d) {const r=d.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) d.close();} });
document.addEventListener('keydown', e => { if(e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); scrollLibrary(); $('#search').focus(); } });
manufacturers(); render();

async function pollTelemetry() {
  try {
    const response = await fetch('/api/telemetry', {cache:'no-store'});
    if (!response.ok) throw new Error('Receiver unavailable');
    const data = await response.json();
    const labels = {disabled:'Receiver disabled', stopped:'Receiver stopped', waiting:'Waiting for packets', receiving:'Receiving UDP packets', stale:'Signal lost', error:'Receiver error'};
    $('#telemetry-state').textContent = labels[data.state] || 'Unknown receiver state';
    $('#telemetry-state').classList.toggle('live', data.state === 'receiving');
    $('#packet-count').textContent = String(data.packets ?? 0);
    $('#packet-size').textContent = data.lastPacket ? `${data.lastPacket.bytes} bytes` : '—';
    $('#packet-age').textContent = data.lastReceivedAt != null ? new Date(data.lastReceivedAt).toLocaleTimeString() : '—';
    $('#packet-preview').textContent = data.lastPacket?.previewHex || (data.error ? `Receiver error: ${data.error}. Check the configured UDP host and port.` : 'No packet received.');
  } catch {
    $('#telemetry-state').textContent = 'App connection lost';
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
    const previousFinish = $('#finish').value;
    $('#finish').innerHTML = '<option value="">All finishes</option>' + [...new Set([...catalogue.map(c=>c.finish),'Solid','Metallic'])].sort().map(f=>`<option>${escape(f)}</option>`).join('');
    $('#finish').value = previousFinish;
    $('#catalogue-status').innerHTML = `${catalogueMetadata.total.toLocaleString()} recipes:  ${catalogueMetadata.sheets['Vehicle Colours'].toLocaleString()} vehicle + ${catalogueMetadata.sheets['Wheel Colours']} wheel + ${catalogueMetadata.historicalTotal} historical alternatives. <a href="${catalogueMetadata.url}" target="_blank" rel="noopener noreferrer">Spreadsheet source</a> · <a href="/import-report.json" target="_blank">${catalogueMetadata.rowsNeedingReview} rows need review</a>. Game compatibility, including FH6, is unverified.`;
    manufacturers(); render(true);
  } catch {
    $('#catalogue-status').textContent = 'The spreadsheet collection could not load. Reload the page to retry. Personal recipes remain available.';
    loaded = true; render(true);
  }
}
loadCatalogue();
