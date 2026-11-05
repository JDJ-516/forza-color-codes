import { starterColors } from './data.js';
const $ = (s) => document.querySelector(s);
const escape = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validColor = c => c && typeof c.id === 'string' && ['name','manufacturer','notes'].every(k => typeof c[k] === 'string') && /^#[0-9a-f]{6}$/i.test(c.hex) && ['Solid','Metallic'].includes(c.finish) && ['Green','Red','Blue','Yellow','Pink','Purple','Orange','Neutral'].includes(c.family) && ['h','s','b'].every(k => Number.isFinite(c[k]) && c[k]>=0 && c[k]<=1);
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
let customs = read('fcc-colors', []); customs = Array.isArray(customs) ? customs.filter(validColor).map(c => ({...c, sample:false})) : [];
let saved = read('fcc-favorites', []); const favorites = new Set(Array.isArray(saved) ? saved.filter(x => typeof x === 'string') : []);
let family = '', onlyFavorites = false, current = null, toastTimer;
const all = () => [...starterColors, ...customs];
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3500); }
function persist() { try { localStorage.setItem('fcc-colors', JSON.stringify(customs)); localStorage.setItem('fcc-favorites', JSON.stringify([...favorites])); return true; } catch { toast('Browser storage is unavailable. Changes will last for this session only.'); return false; } }
function manufacturers() { const previous = $('#manufacturer').value; $('#manufacturer').innerHTML = '<option value="">All manufacturers</option>' + [...new Set(all().map(c => c.manufacturer))].sort().map(m => `<option>${escape(m)}</option>`).join(''); $('#manufacturer').value = previous; }
function render() {
  const q = $('#search').value.toLowerCase().trim();
  let colors = all().filter(c => (!onlyFavorites || favorites.has(c.id)) && (!family || c.family === family) && (!$('#manufacturer').value || c.manufacturer === $('#manufacturer').value) && (!$('#finish').value || c.finish === $('#finish').value) && `${c.name} ${c.manufacturer} ${c.family}`.toLowerCase().includes(q));
  const sort = $('#sort').value; if(sort !== 'featured') colors.sort((a,b) => a[sort].localeCompare(b[sort]));
  $('#favorite-count').textContent = all().filter(c => favorites.has(c.id)).length;
  $('#result-count').textContent = `${colors.length} color${colors.length === 1 ? '' : 's'}`;
  $('#library-title').innerHTML = `${onlyFavorites ? 'Your favorites' : 'The color library'}<span>.</span>`;
  $('#library-nav').classList.toggle('active', !onlyFavorites); $('#favorites-nav').classList.toggle('active', onlyFavorites);
  $('#grid').innerHTML = colors.map(c => `<article class="card"><div class="swatch" style="--paint:${c.hex}"><button class="swatch-open" data-open="${escape(c.id)}" aria-label="View ${escape(c.name)} recipe"><span class="paint-sheen"></span><span class="swatch-hex">${c.hex.toUpperCase()}</span><span class="view-recipe">VIEW RECIPE ›</span></button><button class="favorite ${favorites.has(c.id) ? 'is-saved' : ''}" data-favorite="${escape(c.id)}" aria-label="${favorites.has(c.id) ? 'Unsave' : 'Save'} ${escape(c.name)}" aria-pressed="${favorites.has(c.id)}">${favorites.has(c.id) ? '♥' : '♡'}</button></div><div class="card-info"><div class="card-meta"><span>${escape(c.manufacturer)}</span><span class="finish">${escape(c.finish)}</span></div><button class="color-title" data-open="${escape(c.id)}">${escape(c.name)} <span>›</span></button><div class="card-bottom"><span>${c.sample ? 'ILLUSTRATIVE RECIPE' : 'PERSONAL RECIPE'}</span><span class="mini-dot" style="background:${c.hex}"></span></div></div></article>`).join('');
  $('#empty').hidden = colors.length !== 0;
  document.querySelectorAll('[data-family]').forEach(b => { b.classList.toggle('selected', b.dataset.family === family); b.setAttribute('aria-pressed', b.dataset.family === family); });
}
function toggleFavorite(id) { if(favorites.has(id)) favorites.delete(id); else favorites.add(id); persist(); render(); if(current?.id === id) detail(current); }
function detail(c) {
  current = c;
  $('#detail-content').innerHTML = `<div class="detail-swatch" style="--paint:${c.hex}"><span class="paint-sheen"></span><span class="detail-hex">${c.hex.toUpperCase()}</span><button class="icon-button close-detail" aria-label="Close recipe">×</button></div><div class="detail-body"><div class="eyebrow">${escape(c.manufacturer)} / ${escape(c.finish)}</div><h2>${escape(c.name)}</h2><p class="muted">${c.sample ? 'Illustrative starter recipe · Not verified in-game' : 'Your personal paint recipe'}</p><div class="recipe-values">${[['h','Hue'],['s','Saturation'],['b','Brightness']].map(([key,label]) => `<div><span>${label}</span><strong>${c[key].toFixed(2)}</strong></div>`).join('')}</div><p class="recipe-help">In Forza’s paint editor, select ${escape(c.finish.toLowerCase())} paint and open color fine tuning. Use these HSB values as a starting point.${c.finish === 'Metallic' ? ' These values describe the base color; tune flake and secondary settings in-game.' : ''}</p>${c.notes ? `<p class="notes">${escape(c.notes)}</p>` : ''}<div class="detail-actions"><button class="button dark" id="copy-recipe">Copy recipe ›</button><button class="button outline" data-favorite="${escape(c.id)}">${favorites.has(c.id) ? '♥ Saved' : '♡ Save color'}</button>${!c.sample ? '<button class="delete-button" id="delete-color">Delete</button>' : ''}</div></div>`;
  if(!$('#detail').open) $('#detail').showModal();
}
$('#families').innerHTML = [['','All colors'],['Green','Green'],['Red','Red'],['Blue','Blue'],['Yellow','Yellow'],['Purple','Purple'],['Pink','Pink'],['Orange','Orange'],['Neutral','Neutral']].map(([value,label]) => `<button data-family="${value}" aria-pressed="${!value}">${label}</button>`).join('');
document.addEventListener('click', async e => {
  const open = e.target.closest('[data-open]'); if(open) detail(all().find(c => c.id === open.dataset.open));
  const favorite = e.target.closest('[data-favorite]'); if(favorite) toggleFavorite(favorite.dataset.favorite);
  const filter = e.target.closest('[data-family]'); if(filter) { family = filter.dataset.family; render(); }
  if(e.target.closest('.close-detail')) $('#detail').close();
  if(e.target.closest('.close-create')) $('#create').close();
  if(e.target.closest('#copy-recipe')) {
    const text = `${current.manufacturer} — ${current.name}\n${current.finish} | H: ${current.h.toFixed(2)} S: ${current.s.toFixed(2)} B: ${current.b.toFixed(2)}\n${current.sample ? 'Illustrative recipe; not verified in-game.' : current.notes}`;
    try { await navigator.clipboard.writeText(text); toast('Recipe copied. See you in the paint booth.'); } catch { toast('Clipboard unavailable. You can read the recipe values above.'); }
  }
  if(e.target.closest('#delete-color')) { customs = customs.filter(c => c.id !== current.id); favorites.delete(current.id); persist(); $('#detail').close(); manufacturers(); render(); toast('Personal recipe deleted.'); }
});
for(const selector of ['#add-color','#add-bottom']) $(selector).addEventListener('click', () => $('#create').showModal());
for(const selector of ['#search','#manufacturer','#finish','#sort']) $(selector).addEventListener(selector === '#search' ? 'input' : 'change', render);
function scrollLibrary() { $('#library').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); }
$('#explore').addEventListener('click', scrollLibrary);
for(const [selector,mode] of [['#library-nav',false],['#favorites-nav',true]]) $(selector).addEventListener('click', () => { onlyFavorites = mode; render(); scrollLibrary(); });
$('#reset').addEventListener('click', () => { family = ''; $('#search').value = ''; $('#manufacturer').value = ''; $('#finish').value = ''; $('#sort').value = 'featured'; render(); });
$('#color-form').addEventListener('submit', e => {
  e.preventDefault(); const form = e.currentTarget; const values = Object.fromEntries(new FormData(form));
  const c = {...values, name: values.name.trim(), manufacturer: values.manufacturer.trim(), id: crypto.randomUUID(), h: Number(values.h), s: Number(values.s), b: Number(values.b), sample: false};
  if(!c.name || !c.manufacturer || !validColor(c)) { toast('Enter a color name, manufacturer, and HSB values between 0 and 1.'); return; }
  customs.push(c); const stored = persist(); manufacturers(); family=''; onlyFavorites=false; $('#search').value=''; $('#manufacturer').value=''; $('#finish').value=''; render(); $('#create').close(); form.reset(); detail(c); if(stored) toast('Your color has joined the collection.');
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
