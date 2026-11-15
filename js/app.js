// Interface de « Ma carte de Paris ».
import { distanceM, walkMinutes, normalizeRings, groupByRings, mapsUrl } from './geo.js';
import { CATEGORIES, KEY, newPoint, loadState, saveState, exportJSON, mergeImport } from './store.js';
import { searchAddress, reverseAddress } from './adresse.js';

const L = window.L;
const PARIS = [48.8566, 2.3522];
const FRESH_MS = 10 * 60 * 1000; // une position de moins de 10 min sert encore aux distances

/* ---------- Stockage ---------- */

const failingStorage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
let storage;
try { storage = window.localStorage; storage.getItem('test'); } catch { storage = failingStorage; }

let state = loadState(storage);
if (!state.ok) {
  // Données illisibles : on en garde une copie avant de réécrire par-dessus.
  try {
    const raw = storage.getItem(KEY);
    if (raw) storage.setItem(`${KEY}.illisible-${Date.now()}`, raw);
  } catch { /* stockage indisponible */ }
}
try { navigator.storage?.persist?.(); } catch { /* facultatif */ }

function persist() {
  if (!saveState(storage, state)) {
    toast('Attention : ce téléphone n\'a pas pu enregistrer. Fais un export dans les réglages.', true);
    return false;
  }
  return true;
}

/* ---------- Petits outils ---------- */

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}

const fmtDist = (m) => (m < 15 ? 'à côté' : m < 1000 ? `${Math.round(m / 10) * 10 || Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
const fmtRing = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString('fr-FR')} km`);
const catDot = (cat) => el('span', { class: `dot ${cat}`, 'aria-hidden': 'true' });

let toastTimer;
function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 6000 : 3000);
}

/* ---------- Carte ---------- */

const map = L.map('map', { zoomControl: false, attributionControl: true }).setView(PARIS, 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const pointsLayer = L.layerGroup().addTo(map);
const nearLayer = L.layerGroup().addTo(map);
const draftLayer = L.layerGroup().addTo(map);

let filter = 'all';
const visible = () => state.points.filter((p) => filter === 'all' || p.cat === filter);

function renderMarkers() {
  pointsLayer.clearLayers();
  for (const p of visible()) {
    const color = CATEGORIES[p.cat].color;
    L.circleMarker([p.lat, p.lng], {
      radius: 9, color, weight: 3, fillColor: color, fillOpacity: p.done ? 0.2 : 0.9,
    })
      .bindTooltip(p.name, { direction: 'top', offset: [0, -8] })
      .on('click', () => openDetail(p.id))
      .addTo(pointsLayer);
  }
}

/** Centre la carte sur une position en tenant compte de la feuille du bas. */
function centerOn(lat, lng, zoom = map.getZoom()) {
  const sheet = document.getElementById('sheet');
  const h = sheet.hidden ? 0 : sheet.offsetHeight;
  map.setView([lat, lng], zoom, { animate: false });
  if (h) map.panBy([0, h / 2], { animate: false });
}

function showDraft(lat, lng) {
  draftLayer.clearLayers();
  L.circleMarker([lat, lng], { radius: 11, color: '#1f2a44', weight: 3, fillColor: '#ffffff', fillOpacity: 1 }).addTo(draftLayer);
  centerOn(lat, lng, Math.max(map.getZoom(), 17));
}

/* ---------- Feuille du bas (avec retour Android) ---------- */

const sheet = document.getElementById('sheet');
const sheetTitle = document.getElementById('sheetTitle');
const sheetBody = document.getElementById('sheetBody');
let onSheetClose = null;
let historyPushed = false;
let view = null; // 'near' quand la liste « Autour de moi » est affichée

function openSheet(title, body, { onClose = null, tall = false, name = null } = {}) {
  view = name;
  sheetTitle.textContent = title;
  sheetBody.replaceChildren(...[body].flat());
  sheet.classList.toggle('tall', tall);
  sheet.hidden = false;
  sheetBody.scrollTop = 0;
  onSheetClose = onClose;
  if (!historyPushed) {
    history.pushState({ sheet: true }, '');
    historyPushed = true;
  }
}

function closeSheet(fromHistory = false) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  view = null;
  sheetBody.replaceChildren();
  draftLayer.clearLayers();
  nearLayer.clearLayers();
  const cb = onSheetClose;
  onSheetClose = null;
  if (cb) cb();
  if (historyPushed && !fromHistory) {
    historyPushed = false;
    history.back();
  } else {
    historyPushed = false;
  }
}

window.addEventListener('popstate', () => {
  if (!sheet.hidden) { historyPushed = false; closeSheet(true); }
});
document.getElementById('sheetClose').addEventListener('click', () => closeSheet());

/* ---------- Localisation ---------- */

let here = null; // { lat, lng, acc, time }

function locate() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Ce téléphone ne donne pas sa position à l\'appli.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        here = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() };
        resolve(here);
      },
      (err) => {
        const msg = {
          1: 'Localisation refusée. Autorise-la pour ce site : touche le cadenas à gauche de l\'adresse dans Chrome, puis Autorisations.',
          2: 'Position introuvable pour le moment. Vérifie que la localisation du téléphone est activée.',
          3: 'La position met trop de temps à arriver. Réessaie, si possible près d\'une fenêtre ou dehors.',
        }[err.code] ?? 'Position indisponible.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

const freshHere = () => (here && Date.now() - here.time < FRESH_MS ? here : null);

/* ---------- Ajouter ---------- */

function openAddChoice() {
  openSheet('Ajouter un lieu', el('div', { class: 'stack' },
    el('button', { type: 'button', class: 'btn big primary', onclick: addAtPosition }, '📍  À ma position'),
    el('button', { type: 'button', class: 'btn big', onclick: openAddressSearch }, '🔎  Avec une adresse'),
  ));
}

async function addAtPosition() {
  toast('Recherche de ta position…');
  let pos;
  try {
    pos = await locate();
  } catch (e) {
    toast(e.message, true);
    return;
  }
  document.getElementById('toast').hidden = true;
  const draft = { lat: pos.lat, lng: pos.lng, address: '', acc: pos.acc };
  openForm(draft);
  reverseAddress(pos.lat, pos.lng).then((label) => {
    if (label && !sheet.hidden && draft.onAddress) draft.onAddress(label);
  });
}

function openAddressSearch() {
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Ex. : 12 rue de Rivoli', 'aria-describedby': 'addrHelp' });
  const info = el('p', { class: 'help', id: 'addrHelp' }, 'Tape au moins 3 caractères, puis choisis l\'adresse dans la liste.');
  const list = el('ul', { class: 'results' });
  let timer;
  let ctrl;

  const run = async () => {
    const q = input.value.trim();
    ctrl?.abort();
    if (q.length < 3) { list.replaceChildren(); info.textContent = 'Tape au moins 3 caractères, puis choisis l\'adresse dans la liste.'; return; }
    ctrl = new AbortController();
    info.textContent = 'Recherche…';
    try {
      const res = await searchAddress(q, ctrl.signal);
      list.replaceChildren(...res.map((r) => el('li', {},
        el('button', { type: 'button', onclick: () => openForm({ lat: r.lat, lng: r.lng, address: r.label }) }, r.label))));
      info.textContent = res.length ? 'Choisis l\'adresse :' : 'Aucune adresse trouvée. Vérifie l\'orthographe ou ajoute le code postal.';
    } catch (e) {
      if (e.name === 'AbortError') return;
      list.replaceChildren();
      info.textContent = 'Le service d\'adresses ne répond pas. Vérifie ta connexion internet.';
    }
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(); } });

  openSheet('Avec une adresse', el('div', { class: 'stack' },
    el('label', { class: 'field' }, 'Adresse', input), info, list), { tall: true, onClose: () => { clearTimeout(timer); ctrl?.abort(); } });
  input.focus();
}

/** Formulaire de création (draft) ou de modification (existing). */
function openForm(draft, existing = null) {
  const v = existing ?? { name: '', cat: filter !== 'all' ? filter : 'resto', note: '', done: false, address: draft.address };
  let cat = v.cat;
  let done = v.done;

  const name = el('input', { type: 'text', value: v.name, maxlength: '80', autocomplete: 'off', enterkeyhint: 'next', required: true });
  const note = el('textarea', { maxlength: '1000', placeholder: 'Pourquoi tu l\'as gardé, quoi y prendre…' });
  note.value = v.note;
  const err = el('p', { class: 'error', role: 'alert' });

  const segBtn = (label, pressed, onPick, dot) => el('button', { type: 'button', 'aria-pressed': String(pressed), onclick: onPick }, dot, label);
  const catSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Catégorie' });
  const drawCats = () => catSeg.replaceChildren(...Object.entries(CATEGORIES).map(([k, c]) =>
    segBtn(c.short, k === cat, () => { cat = k; drawCats(); }, catDot(k))));
  drawCats();
  const doneSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'État' });
  const drawDone = () => doneSeg.replaceChildren(
    segBtn('À faire', !done, () => { done = false; drawDone(); }),
    segBtn('Déjà visité', done, () => { done = true; drawDone(); }));
  drawDone();

  const whereText = el('span', {}, v.address || (draft.acc != null ? `Ta position (à ${Math.round(draft.acc)} m près)` : 'Position choisie'));
  draft.onAddress = (label) => { if (!v.address) whereText.textContent = label; draft.address = label; };
  const accWarn = draft.acc > 100
    ? el('p', { class: 'warn' }, `Position peu précise (à ${Math.round(draft.acc)} m près). Le point peut être mal placé : vérifie sur la carte, ou utilise plutôt l'adresse.`)
    : null;

  const save = () => {
    const n = name.value.trim();
    if (!n) { err.textContent = 'Donne un nom à ce lieu.'; name.focus(); return; }
    if (existing) {
      Object.assign(existing, { name: n, cat, note: note.value, done });
    } else {
      state.points.push(newPoint({ name: n, cat, note: note.value, done, lat: draft.lat, lng: draft.lng, address: draft.address || '' }));
    }
    const ok = persist();
    renderMarkers();
    if (existing) { openDetail(existing.id); } else { closeSheet(); }
    if (ok) toast(existing ? 'Modifications enregistrées' : `« ${n} » est sur ta carte`);
  };

  openSheet(existing ? 'Modifier le lieu' : 'Nouveau lieu', el('div', { class: 'stack' },
    el('p', { class: 'where' }, el('span', { 'aria-hidden': 'true' }, '📍'), whereText),
    accWarn,
    el('label', { class: 'field' }, 'Nom', name),
    el('div', {}, el('div', { class: 'legend' }, 'Catégorie'), catSeg),
    el('label', { class: 'field' }, 'Note (facultatif)', note),
    el('div', {}, el('div', { class: 'legend' }, 'État'), doneSeg),
    err,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => (existing ? openDetail(existing.id) : closeSheet()) }, 'Annuler'),
      el('button', { type: 'button', class: 'btn primary', onclick: save }, 'Enregistrer')),
  ), { tall: true });

  const lat = existing ? existing.lat : draft.lat;
  const lng = existing ? existing.lng : draft.lng;
  showDraft(lat, lng);
  if (!existing) name.focus({ preventScroll: true });
}

/* ---------- Fiche d'un lieu ---------- */

function openDetail(id, back = null) {
  const p = state.points.find((x) => x.id === id);
  if (!p) { closeSheet(); return; }
  const pos = freshHere();
  const d = pos ? distanceM(pos, p) : null;
  const c = CATEGORIES[p.cat];
  const actions = el('div', { class: 'stack' });

  const showActions = () => actions.replaceChildren(
    el('a', { class: 'btn primary', href: mapsUrl(p, d ?? 1000), target: '_blank', rel: 'noopener' }, 'Y aller avec Google Maps'),
    el('button', { type: 'button', class: 'btn', onclick: () => {
      p.done = !p.done;
      persist(); renderMarkers(); openDetail(id, back);
    } }, p.done ? 'Remettre en « À faire »' : 'Marquer comme déjà visité'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openForm({ lat: p.lat, lng: p.lng, address: p.address }, p) }, 'Modifier'),
      el('button', { type: 'button', class: 'btn danger', onclick: askDelete }, 'Supprimer')),
    back ? el('button', { type: 'button', class: 'btn', onclick: back }, '← Retour à la liste') : null,
  );
  const askDelete = () => actions.replaceChildren(
    el('p', { class: 'warn', role: 'alert' }, `Supprimer « ${p.name} » ? Ce n'est pas annulable.`),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: showActions }, 'Annuler'),
      el('button', { type: 'button', class: 'btn danger solid', onclick: () => {
        state.points = state.points.filter((x) => x.id !== id);
        persist(); renderMarkers();
        if (back) back(); else closeSheet();
        toast('Lieu supprimé');
      } }, 'Oui, supprimer')),
  );
  showActions();

  openSheet(p.name, el('div', { class: 'stack' },
    el('div', { class: 'badge' }, catDot(p.cat), c.label, ' · ', p.done ? 'Déjà visité' : 'À faire'),
    d != null ? el('div', { class: 'badge' }, `${fmtDist(d)} · environ ${walkMinutes(d)} min à pied`) : null,
    p.note ? el('p', { class: 'note' }, p.note) : null,
    p.address ? el('p', { class: 'where' }, el('span', { 'aria-hidden': 'true' }, '📍'), p.address) : null,
    actions,
  ));
  if (!back) centerOn(p.lat, p.lng, Math.max(map.getZoom(), 16));
}

/* ---------- Autour de moi ---------- */

async function openNear() {
  toast('Recherche de ta position…');
  try {
    await locate();
  } catch (e) {
    toast(e.message, true);
    return;
  }
  document.getElementById('toast').hidden = true;
  renderNear(true);
}

function drawNear() {
  nearLayer.clearLayers();
  const { lat, lng, acc } = here;
  if (acc > 30) L.circle([lat, lng], { radius: acc, stroke: false, fillColor: '#4c6ef5', fillOpacity: 0.12, interactive: false }).addTo(nearLayer);
  for (const r of state.rings) {
    L.circle([lat, lng], { radius: r, color: '#1f2a44', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(nearLayer);
    const labelLat = lat + r / 111195;
    L.marker([labelLat, lng], {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: '', html: `<span class="ring-label">${fmtRing(r)}</span>`, iconSize: [0, 0] }),
    }).addTo(nearLayer);
  }
  L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#4c6ef5', fillOpacity: 1, interactive: false }).addTo(nearLayer);
}

function renderNear(fit = false) {
  const pts = visible();
  const groups = groupByRings(pts, here, state.rings);
  const inside = groups.reduce((n, g) => n + g.items.length, 0);
  const farther = pts.length - inside;
  const maxRing = state.rings[state.rings.length - 1];

  const body = [];
  if (here.acc > 100) {
    body.push(el('p', { class: 'warn' }, `Position approximative (à ${Math.round(here.acc)} m près) : les petits cercles ne sont pas fiables.`));
  }
  let prev = 0;
  for (const g of groups) {
    const from = prev;
    prev = g.ring;
    if (!g.items.length) continue;
    body.push(el('h3', { class: 'ring-title' },
      el('span', {}, from === 0 ? `Moins de ${fmtRing(g.ring)}` : `De ${fmtRing(from)} à ${fmtRing(g.ring)}`),
      el('span', {}, String(g.items.length))));
    body.push(el('ul', { class: 'items' }, g.items.map(({ point: p, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, () => renderNear()) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, p.name),
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min à pied${p.done ? '' : ' · À faire'}`))),
      el('a', { class: 'go', href: mapsUrl(p, d), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${p.name}` }, 'Y aller')))));
  }
  if (!inside) {
    const what = filter === 'all' ? 'lieu' : `lieu « ${CATEGORIES[filter].short} »`;
    body.push(el('p', { class: 'empty' }, state.points.length
      ? `Aucun ${what} à moins de ${fmtRing(maxRing)}.`
      : 'Tu n\'as encore aucun lieu. Appuie sur « + Ajouter » pour commencer.'));
  }
  if (farther > 0 && inside) {
    body.push(el('p', { class: 'help' }, `${farther} autre${farther > 1 ? 's' : ''} plus loin que ${fmtRing(maxRing)}.`));
  }
  body.push(el('div', { class: 'row', style: 'margin-top:14px' },
    el('button', { type: 'button', class: 'btn', onclick: openNear }, '↻ Actualiser ma position')));

  openSheet('Autour de moi', body, { name: 'near' });
  drawNear();
  if (fit) {
    const bounds = L.latLng(here.lat, here.lng).toBounds(maxRing * 2);
    map.fitBounds(bounds, { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
  }
}

/* ---------- Réglages ---------- */

function openSettings() {
  const rings = el('input', { type: 'text', inputmode: 'numeric', value: state.rings.join(', '), 'aria-describedby': 'ringsHelp' });
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const count = state.points.length;

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    try {
      const r = mergeImport(state, await f.text());
      state = { ...r.state, ok: state.ok };
      persist(); renderMarkers();
      openSettings();
      toast(`${r.added} lieu${r.added > 1 ? 'x' : ''} ajouté${r.added > 1 ? 's' : ''}${r.skipped ? `, ${r.skipped} illisible${r.skipped > 1 ? 's' : ''} ignoré${r.skipped > 1 ? 's' : ''}` : ''}.`);
    } catch (e) {
      toast(e.message || 'Import impossible.', true);
    }
  });

  const exportFile = () => new File([exportJSON(state)], `ma-carte-de-paris-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  const download = () => {
    const f = exportFile();
    const url = URL.createObjectURL(f);
    const a = el('a', { href: url, download: f.name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Fichier enregistré dans tes Téléchargements');
  };
  const canShareFile = (() => {
    try { return Boolean(navigator.canShare?.({ files: [exportFile()] })); } catch { return false; }
  })();
  const share = async () => {
    try { await navigator.share({ files: [exportFile()], title: 'Ma carte de Paris' }); } catch { /* annulé */ }
  };

  openSheet('Réglages', el('div', { class: 'stack' },
    !state.ok ? el('p', { class: 'warn' }, 'Le stockage de ce téléphone n\'a pas pu être lu. Fais un export régulier pour ne rien perdre.') : null,
    el('label', { class: 'field' }, 'Taille des cercles (en mètres)', rings),
    el('p', { class: 'help', id: 'ringsHelp' }, 'Sépare-les par des virgules. 100 m au minimum. Exemple : 100, 300, 500, 1000'),
    el('button', { type: 'button', class: 'btn primary', onclick: () => {
      state.rings = normalizeRings(rings.value);
      rings.value = state.rings.join(', ');
      if (persist()) toast(`Cercles : ${state.rings.map(fmtRing).join(', ')}`);
    } }, 'Enregistrer les cercles'),
    el('h3', { class: 'ring-title', style: 'margin-top:18px' }, el('span', {}, 'Sauvegarde'), el('span', {}, '')),
    el('p', { class: 'help' }, `${count} lieu${count > 1 ? 'x' : ''} sur ce téléphone. Exporte-les de temps en temps : si tu changes de téléphone ou vides Chrome, ils seraient perdus.`),
    el('button', { type: 'button', class: 'btn', onclick: download, disabled: count === 0 }, '⬇  Exporter mes lieux'),
    canShareFile ? el('button', { type: 'button', class: 'btn', onclick: share, disabled: count === 0 }, '✉  Envoyer le fichier (mail, Drive…)') : null,
    el('button', { type: 'button', class: 'btn', onclick: () => file.click() }, '⬆  Importer une sauvegarde'),
    el('p', { class: 'help' }, 'L\'import ajoute les lieux du fichier sans effacer ceux déjà présents.'),
    file,
  ), { tall: true });
}

/* ---------- Démarrage ---------- */

document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
  filter = chip.dataset.cat;
  document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  renderMarkers();
  if (view === 'near' && here) renderNear();
}));
document.getElementById('btnAdd').addEventListener('click', openAddChoice);
document.getElementById('btnNear').addEventListener('click', openNear);
document.getElementById('btnSettings').addEventListener('click', openSettings);

renderMarkers();
if (state.points.length) {
  map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 15, animate: false });
} else {
  toast('Appuie sur « + Ajouter » pour enregistrer ton premier lieu.');
}
if (!state.ok) toast('Le stockage de ce téléphone n\'est pas lisible : pense à exporter tes lieux.', true);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
