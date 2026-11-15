// Interface de « Ma carte de Paris ».
import { distanceM, walkMinutes, normalizeRings, groupByRings, mapsUrl } from './geo.js';
import {
  KEY, PALETTE, ICONS, FAV_COLORS, newPoint, loadState, saveState, exportJSON, mergeImport,
  addCategory, updateCategory, deleteCategory, setFavStyle, setDone, exportFileName, suggestedPresets, backupDue,
} from './store.js';
import { timeAgo, formatDate, todoSummary, categoryCounts, nearestStation } from './stats.js';
import { searchAddress, reverseAddress } from './adresse.js';
import { searchPlaces } from './annuaire.js';
import { searchPoints, fold } from './search.js';
import {
  bearing, relativeAngle, compassLabel, bestFix, onTheWay, MAX_DETOUR_M,
  orderRoute, routeLength, routeUrl, MAX_ROUTE, newlyNear, directionWord, spokenDistance,
} from './move.js';

const L = window.L;
const VERSION = '15 novembre 2026 (9)';
const PARIS = [48.8566, 2.3522];
const FRESH_MS = 10 * 60 * 1000; // une position de moins de 10 min sert encore aux distances
const COLOR_NAMES = ['Rouge orangé', 'Bleu', 'Violet', 'Vert', 'Marron', 'Framboise', 'Turquoise', 'Gris'];
const FAV_COLOR_NAMES = ['Doré', ...COLOR_NAMES];

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

const catOf = (id) => state.categories.find((c) => c.id === id) ?? { id, name: '?', color: '#495057', icon: '📍' };

/* ---------- Stations de métro et RER ---------- */

let stations = [];
let stationsSource = '';
fetch('data/stations.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (!Array.isArray(j?.stations)) return;
    stations = j.stations.filter((x) => typeof x.n === 'string' && Number.isFinite(x.lat) && Number.isFinite(x.lng));
    stationsSource = typeof j.source === 'string' ? j.source : '';
    if (view === 'near' && origin) renderNear();
  })
  .catch(() => { /* pas encore de données : la fonction reste discrète */ });

/** « Ⓜ Opéra (3, 7, 8) · ≈ 4 min » pour la station la plus proche, ou null. */
function stationLine(p) {
  const r = nearestStation(stations, p);
  if (!r || r.d > 2000) return null;
  const { station: st, d } = r;
  const parts = [Array.isArray(st.l) ? st.l.join(', ') : '', Array.isArray(st.rer) && st.rer.length ? `RER ${st.rer.join(', ')}` : '']
    .filter(Boolean).join(' · ');
  return `Ⓜ ${st.n}${parts ? ` (${parts})` : ''} · ≈ ${walkMinutes(d)} min`;
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

const fmtDist = (m) => (m < 15 ? 'à côté' : m < 1000 ? `${Math.ceil(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
const fmtRing = (m) => (m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString('fr-FR')} km`);
const fmtWalk = (m) => `≈ ${walkMinutes(m)} min à pied`;
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
/** Pastille de catégorie : son icône sur sa couleur. */
function catDot(catId) {
  const c = catOf(catId);
  const d = el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, c.icon);
  d.style.background = c.color;
  return d;
}
const favMark = (p) => (p.fav ? el('span', { class: 'fav-mark', 'aria-label': 'Favori' }, `${state.fav.icon} `) : null);

/** Grille de choix (icônes ou couleurs) à boutons pressés. */
function picker(values, selected, onPick, { colors = false, names = [] } = {}) {
  const box = el('div', { class: colors ? 'swatches' : 'icon-grid', role: 'group' });
  const draw = (cur) => box.replaceChildren(...values.map((v, i) => {
    const b = el('button', {
      type: 'button', class: colors ? 'swatch' : 'icon-choice', 'aria-pressed': String(v === cur),
      'aria-label': names[i] ?? v, onclick: () => { onPick(v); draw(v); },
    }, colors ? null : v);
    if (colors) b.style.background = v;
    return b;
  }));
  draw(selected);
  return box;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 6000 : 3000);
}
const hideToast = () => { document.getElementById('toast').hidden = true; };

/* ---------- Carte ---------- */

const map = L.map('map', { zoomControl: false, attributionControl: true }).setView(PARIS, 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const pointsLayer = L.layerGroup().addTo(map);
const nearLayer = L.layerGroup().addTo(map);
const draftLayer = L.layerGroup().addTo(map);

let filterCat = 'all';
let favOnly = false;
const visible = () => state.points.filter((p) =>
  (filterCat === 'all' || p.cat === filterCat) && (!favOnly || p.fav));

function renderMarkers() {
  pointsLayer.clearLayers();
  for (const p of visible()) {
    if (moving && moving.id === p.id) continue; // le viseur le remplace pendant le déplacement
    const c = catOf(p.cat);
    // Icônes et couleurs viennent de listes fixes : pas de texte saisi dans ce HTML.
    const ring = p.fav ? `box-shadow:0 0 0 3px ${state.fav.color},0 2px 6px rgba(0,0,0,.35);` : '';
    const html = `<span class="pin${p.done ? ' done' : ''}" style="background:${c.color};${ring}">${c.icon}${p.fav ? `<span class="pin-fav">${state.fav.icon}</span>` : ''}</span>`;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'pin-wrap', html, iconSize: [32, 32], iconAnchor: [16, 16] }),
      zIndexOffset: p.fav ? 500 : 0,
    })
      .bindTooltip(p.name, { direction: 'top', offset: [0, -16] })
      .on('click', () => { if (!moving) openDetail(p.id); })
      .addTo(pointsLayer);
  }
}

/** Centre la carte sur une position, au milieu de la partie visible au-dessus de la feuille. */
function centerOn(lat, lng, zoom = map.getZoom()) {
  const h = sheet.hidden ? 0 : sheet.offsetHeight;
  map.setView([lat, lng], zoom, { animate: false });
  if (h) map.panBy([0, h / 2], { animate: false });
}

function showDraft(lat, lng) {
  draftLayer.clearLayers();
  L.circleMarker([lat, lng], { radius: 11, color: '#1f2a44', weight: 3, fillColor: '#ffffff', fillOpacity: 1, interactive: false }).addTo(draftLayer);
  centerOn(lat, lng, Math.max(map.getZoom(), 17));
}

/* ---------- Barre de filtres ---------- */

function renderChips() {
  if (filterCat !== 'all' && !state.categories.some((c) => c.id === filterCat)) filterCat = 'all';
  const chip = (label, pressed, onclick, extra = {}) =>
    el('button', { type: 'button', class: `chip ${extra.class ?? ''}`, 'aria-pressed': String(pressed), onclick, 'aria-label': extra.aria }, label);
  document.getElementById('chips').replaceChildren(
    chip('Tout', filterCat === 'all', () => setFilter('all')),
    chip(state.fav.icon, favOnly, () => { favOnly = !favOnly; refresh(); }, { class: 'star', aria: 'Seulement les favoris' }),
    ...state.categories.map((c) => chip([catDot(c.id), c.name], filterCat === c.id, () => setFilter(c.id))),
  );
  const star = document.querySelector('#chips .star');
  if (favOnly) { star.style.background = state.fav.color; star.style.borderColor = state.fav.color; }
}

function setFilter(id) {
  filterCat = id;
  refresh();
}

/** Redessine ce qui dépend des lieux et des filtres. */
function refresh() {
  renderChips();
  renderMarkers();
  if (view === 'near' && origin) renderNear();
}

/* ---------- Feuille du bas (avec retour Android) ---------- */

const sheet = document.getElementById('sheet');
const sheetTitle = document.getElementById('sheetTitle');
const sheetBody = document.getElementById('sheetBody');
let onSheetClose = null;
let historyPushed = false;
let view = null; // 'near' quand la liste « Autour de moi » est affichée

function openSheet(title, body, { onClose = null, tall = false, name = null } = {}) {
  if (moving && name !== 'move') stopMove();
  view = name;
  sheetTitle.replaceChildren(...[title].flat().filter(Boolean));
  sheetBody.replaceChildren(...[body].flat().filter(Boolean));
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
  if (moving) stopMove();
  stopFollow();
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
  if (compassOpen) return; // le retour ferme d'abord la boussole
  if (!sheet.hidden) { historyPushed = false; closeSheet(true); }
});
document.getElementById('sheetClose').addEventListener('click', () => closeSheet());

/* ---------- Localisation ---------- */

let here = null; // dernière position GPS : { lat, lng, acc, time }
const LAST_KEY = 'carte-paris.derniere-position'; // reste sur le téléphone, jamais envoyée
try {
  const last = JSON.parse(storage.getItem(LAST_KEY) ?? 'null');
  if (last && Number.isFinite(last.lat) && Number.isFinite(last.lng) && Number.isFinite(last.time)) here = last;
} catch { /* rien */ }
const GEO_ERRORS = {
  1: 'Localisation refusée. Autorise-la pour ce site : touche le cadenas à gauche de l\'adresse dans Chrome, puis Autorisations.',
  2: 'Position introuvable pour le moment (dans le métro ou un bâtiment, le GPS passe mal).',
  3: 'La position met trop de temps à arriver.',
};

function remember(fix) {
  here = fix;
  try { storage.setItem(LAST_KEY, JSON.stringify(fix)); } catch { /* facultatif */ }
}

/**
 * Position la plus précise obtenue en quelques secondes : on s'arrête dès qu'elle est à 25 m près,
 * sinon on garde la meilleure au bout de 6 s (15 s au plus si rien n'arrive).
 */
function locate({ wait = 6000, good = 25 } = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Ce téléphone ne donne pas sa position à l\'appli.')); return; }
    const samples = [];
    let lastErr = null;
    let finished = false;
    let id = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (id != null) navigator.geolocation.clearWatch(id);
      clearTimeout(t1); clearTimeout(t2);
      const best = bestFix(samples);
      if (best) { remember(best); resolve(best); } else reject(lastErr ?? new Error(GEO_ERRORS[3]));
    };
    id = navigator.geolocation.watchPosition(
      (pos) => {
        samples.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() });
        if (pos.coords.accuracy <= good) finish();
      },
      (err) => { lastErr = new Error(GEO_ERRORS[err.code] ?? 'Position indisponible.'); lastErr.code = err.code; if (err.code === 1) finish(); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    const t1 = setTimeout(() => { if (samples.length) finish(); }, wait);
    const t2 = setTimeout(finish, 15000);
  });
}

const freshHere = () => (here && Date.now() - here.time < FRESH_MS ? here : null);

/* ---------- Ajouter ---------- */

function openAddChoice() {
  openSheet('Ajouter un lieu', el('div', { class: 'stack' },
    el('button', { type: 'button', class: 'btn big primary', onclick: addAtPosition }, '📍  À ma position'),
    el('button', { type: 'button', class: 'btn big', onclick: () => openPlaceSearch() }, '🔎  Avec un nom ou une adresse'),
    el('p', { class: 'help' }, 'Astuce : tu peux aussi laisser le doigt appuyé sur la carte, à l\'endroit voulu.'),
  ));
}

/** Ouvre le formulaire à une position et cherche l'adresse en arrière-plan. */
function addAt(lat, lng, acc = null) {
  const draft = { lat, lng, address: '', acc };
  openForm(draft);
  reverseAddress(lat, lng).then((label) => {
    if (label && draft.onAddress) draft.onAddress(label);
  });
}

async function addAtPosition() {
  toast('Recherche de ta position…');
  try {
    const pos = await locate();
    hideToast();
    addAt(pos.lat, pos.lng, pos.acc);
  } catch (e) {
    toast(e.message, true);
  }
}

// Appui long sur la carte (ou clic droit sur ordinateur).
map.on('contextmenu', (e) => {
  if (moving) return;
  addAt(e.latlng.lat, e.latlng.lng);
});

// Résultats d'adresse imprécis : le point serait au milieu d'une rue ou d'une ville.
const ROUGH = {
  street: 'Sans numéro : le point sera au milieu de la rue',
  locality: 'Lieu-dit entier : position approximative',
  municipality: 'Ville entière : position approximative',
};

/** Chercher un lieu de l'annuaire (OpenStreetMap) ou une adresse, puis l'ajouter. */
function openPlaceSearch(initial = '', autoRun = false) {
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', value: initial, placeholder: 'Ex. : Uniqlo Opéra, 12 rue de Rivoli', 'aria-describedby': 'placeHelp' });
  const info = el('p', { class: 'help', id: 'placeHelp' }, 'Tape un nom de lieu ou une adresse, puis appuie sur « Chercher ».');
  const out = el('div', { class: 'stack' });
  let ctrl;

  const row = (title, sub, onclick) => el('li', {}, el('button', { type: 'button', onclick },
    el('span', { class: 'res-title' }, title), sub ? el('span', { class: 'res-sub' }, sub) : null));

  const run = async () => {
    const q = input.value.trim();
    if (q.length < 3) { info.textContent = 'Tape au moins 3 caractères.'; return; }
    ctrl?.abort();
    ctrl = new AbortController();
    info.textContent = 'Recherche…';
    out.replaceChildren();
    const [places, addrs] = await Promise.allSettled([searchPlaces(q, ctrl.signal), searchAddress(q, ctrl.signal)]);
    if (ctrl.signal.aborted) return;
    const P = places.status === 'fulfilled' ? places.value : [];
    const A = addrs.status === 'fulfilled' ? addrs.value : [];
    if (P.length) {
      out.append(el('h3', { class: 'ring-title' }, el('span', {}, 'Lieux'), el('span', {}, String(P.length))),
        el('ul', { class: 'results' }, P.map((r) => row(r.name, [r.kind, r.address].filter(Boolean).join(' · '),
          () => openForm({ lat: r.lat, lng: r.lng, address: r.address, name: r.name })))));
    }
    if (A.length) {
      out.append(el('h3', { class: 'ring-title' }, el('span', {}, 'Adresses'), el('span', {}, String(A.length))),
        el('ul', { class: 'results' }, A.map((r) => row(r.label, ROUGH[r.type] ?? null,
          () => openForm({ lat: r.lat, lng: r.lng, address: r.label, rough: ROUGH[r.type] ?? null })))));
    }
    const failed = places.status === 'rejected' || addrs.status === 'rejected';
    if (P.length || A.length) {
      info.textContent = failed ? 'Une partie de la recherche n\'a pas répondu, les résultats peuvent être incomplets.' : 'Choisis un résultat :';
    } else {
      info.textContent = failed
        ? 'La recherche ne répond pas. Vérifie ta connexion internet, puis réessaie.'
        : 'Rien trouvé. Essaie avec moins de mots, ou ajoute le quartier (ex. : « Uniqlo Opéra »).';
    }
    if (P.length) out.append(el('p', { class: 'help' }, 'Lieux : données © OpenStreetMap. Un petit commerce récent peut manquer.'));
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });

  openSheet('Nom ou adresse', el('div', { class: 'stack' },
    el('label', { class: 'field' }, 'Lieu ou adresse', input),
    el('button', { type: 'button', class: 'btn primary', onclick: run }, 'Chercher'),
    info, out), { tall: true, onClose: () => ctrl?.abort() });
  if (autoRun) run(); else input.focus();
}

/** Formulaire de création (draft) ou de modification (existing). */
function openForm(draft, existing = null) {
  const firstCat = filterCat !== 'all' ? filterCat : state.categories[0].id;
  const v = existing ?? { name: draft.name ?? '', cat: firstCat, note: '', done: false, fav: favOnly, address: draft.address };
  let cat = v.cat;
  let done = v.done;
  let fav = v.fav;

  const name = el('input', { type: 'text', value: v.name, maxlength: '80', autocomplete: 'off', enterkeyhint: 'next', required: true });
  const note = el('textarea', { maxlength: '1000', placeholder: 'Pourquoi tu l\'as gardé, quoi y prendre…' });
  note.value = v.note;
  const err = el('p', { class: 'error', role: 'alert' });

  const segBtn = (label, pressed, onPick) => el('button', { type: 'button', 'aria-pressed': String(pressed), onclick: onPick }, label);
  const catSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Catégorie' });
  const drawCats = () => catSeg.replaceChildren(...state.categories.map((c) =>
    segBtn([catDot(c.id), c.name], c.id === cat, () => { cat = c.id; drawCats(); })));
  drawCats();
  const doneSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'État' });
  const drawDone = () => doneSeg.replaceChildren(
    segBtn('À faire', !done, () => { done = false; drawDone(); }),
    segBtn('Déjà visité', done, () => { done = true; drawDone(); }),
    segBtn(`${state.fav.icon} Favori`, fav, () => { fav = !fav; drawDone(); }));
  drawDone();

  const whereText = el('span', {}, v.address || (draft.acc != null ? `Ta position (à ${Math.round(draft.acc)} m près)` : 'Endroit choisi sur la carte'));
  draft.onAddress = (label) => {
    draft.address = label;
    if (!v.address && whereText.isConnected) whereText.textContent = label;
  };
  const accWarn = draft.acc > 100
    ? el('p', { class: 'warn' }, `Position peu précise (à ${Math.round(draft.acc)} m près). Le point peut être mal placé : tu pourras le déplacer depuis sa fiche.`)
    : draft.rough
      ? el('p', { class: 'warn' }, `${draft.rough}. Vérifie sur la carte ; tu pourras le déplacer depuis sa fiche (⋯ Plus → Déplacer).`)
      : null;

  const save = () => {
    const n = name.value.trim();
    if (!n) { err.textContent = 'Donne un nom à ce lieu.'; name.focus(); return; }
    if (existing) {
      Object.assign(existing, { name: n, cat, note: note.value, fav });
      setDone(existing, done);
    } else {
      state.points.push(newPoint({ name: n, cat, note: note.value, done, fav, lat: draft.lat, lng: draft.lng, address: draft.address || '' }));
    }
    const ok = persist();
    renderMarkers();
    if (existing) openDetail(existing.id); else closeSheet();
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

  showDraft(existing ? existing.lat : draft.lat, existing ? existing.lng : draft.lng);
  if (!existing && !v.name) name.focus({ preventScroll: true });
}

/* ---------- Fiche d'un lieu ---------- */

function openDetail(id, back = null) {
  const p = state.points.find((x) => x.id === id);
  if (!p) { closeSheet(); return; }
  const pos = freshHere();
  const d = pos ? distanceM(pos, p) : null;
  const actions = el('div', { class: 'stack' });
  const update = (fn) => { fn(); persist(); renderMarkers(); openDetail(id, back); };

  const more = el('div', { class: 'stack' });
  const toggleMore = (btn) => {
    const open = more.hasChildNodes();
    btn.setAttribute('aria-expanded', String(!open));
    btn.textContent = open ? '⋯ Plus' : '⋯ Moins';
    if (open) { more.replaceChildren(); return; }
    more.replaceChildren(
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => openForm({ lat: p.lat, lng: p.lng, address: p.address }, p) }, 'Modifier'),
        el('button', { type: 'button', class: 'btn', onclick: () => startMove(p, back) }, 'Déplacer')),
      el('button', { type: 'button', class: 'btn danger', onclick: askDelete }, 'Supprimer'));
  };
  const showActions = () => {
    more.replaceChildren();
    const moreBtn = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', onclick: () => toggleMore(moreBtn) }, '⋯ Plus');
    actions.replaceChildren(
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn primary', onclick: () => openCompass(p) }, '🧭 Boussole'),
        el('a', { class: 'btn primary', href: mapsUrl(p, d ?? 1000), target: '_blank', rel: 'noopener' }, 'Y aller')),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => update(() => { setDone(p, !p.done); }) }, p.done ? 'Remettre à faire' : 'Déjà visité'),
        el('button', { type: 'button', class: 'btn', onclick: () => update(() => { p.fav = !p.fav; }) }, p.fav ? `Retirer ${state.fav.icon}` : `${state.fav.icon} Favori`)),
      el('div', { class: 'row' },
        back ? el('button', { type: 'button', class: 'btn', onclick: back }, '← Retour') : null,
        moreBtn),
      more,
    );
  };
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

  openSheet([favMark(p), p.name], el('div', { class: 'stack' },
    el('div', { class: 'badge' }, catDot(p.cat), catOf(p.cat).name, ' · ', p.done ? 'Déjà visité' : 'À faire'),
    d != null ? el('div', { class: 'badge' }, `${fmtDist(d)} · ${fmtWalk(d)}`) : null,
    stationLine(p) ? el('div', { class: 'badge' }, stationLine(p)) : null,
    el('div', { class: 'badge' }, ageLine(p)),
    p.note ? el('p', { class: 'note' }, p.note) : null,
    p.address ? el('p', { class: 'where' }, el('span', { 'aria-hidden': 'true' }, '📍'), p.address) : null,
    actions,
  ));
  if (!back) centerOn(p.lat, p.lng, Math.max(map.getZoom(), 16));
}

/** « Ajouté il y a 8 mois, jamais visité » ou « Visité le 3 mars 2026 ». */
function ageLine(p) {
  if (p.done) return p.visited ? `Visité le ${formatDate(p.visited)}` : 'Visité (date non notée)';
  if (!(p.created > Date.UTC(2025, 0, 1))) return 'Jamais visité';
  const old = Date.now() - p.created > 30 * 86_400_000;
  return `Ajouté ${timeAgo(p.created)}${old ? ', jamais visité' : ''}`;
}

/* ---------- Déplacer un lieu (viseur fixe) ---------- */

let moving = null; // { id }
const crosshair = document.getElementById('crosshair');

function crosshairY() {
  const h = sheet.hidden ? 0 : sheet.offsetHeight;
  return (window.innerHeight - h) / 2;
}

function startMove(p, back) {
  moving = { id: p.id };
  openSheet(`Déplacer « ${p.name} »`, el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Fais glisser la carte pour mettre le viseur à la bonne place.'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, 'Annuler'),
      el('button', { type: 'button', class: 'btn primary', onclick: () => confirmMove(p, back) }, 'Valider ici')),
  ), { name: 'move' });
  renderMarkers();
  centerOn(p.lat, p.lng, Math.max(map.getZoom(), 17));
  crosshair.style.top = `${crosshairY()}px`;
  crosshair.hidden = false;
}

function stopMove() {
  moving = null;
  crosshair.hidden = true;
  renderMarkers();
}

function confirmMove(p, back) {
  const ll = map.containerPointToLatLng([map.getSize().x / 2, crosshairY()]);
  p.lat = Math.round(ll.lat * 1e6) / 1e6;
  p.lng = Math.round(ll.lng * 1e6) / 1e6;
  p.address = '';
  stopMove();
  const ok = persist();
  openDetail(p.id, back);
  if (ok) toast('Lieu déplacé');
  reverseAddress(p.lat, p.lng).then((label) => {
    if (!label || !state.points.includes(p) || p.address) return;
    p.address = label;
    persist();
  });
}

/* ---------- Chercher dans mes lieux ---------- */

function openSearch(initial = '') {
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Nom, note, adresse, catégorie…', value: initial, 'aria-label': 'Chercher' });
  const list = el('ul', { class: 'items' });
  const info = el('p', { class: 'help' });

  const run = () => {
    const pos = freshHere();
    const res = searchPoints(state.points, state.categories, input.value, pos);
    info.textContent = !state.points.length
      ? 'Tu n\'as encore aucun lieu.'
      : res.length ? `${plural(res.length, 'lieu', 'lieux')}${pos ? ', du plus proche au plus loin' : ''}` : 'Aucun lieu ne correspond.';
    list.replaceChildren(...res.slice(0, 100).map(({ point: p, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, () => openSearch(input.value)) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, [catOf(p.cat).name, d != null ? fmtDist(d) : null, p.done ? null : 'À faire'].filter(Boolean).join(' · ')))))));
  };
  const toDirectory = el('button', { type: 'button', class: 'btn', onclick: () => openPlaceSearch(input.value, true) });
  const updateDir = () => {
    const q = input.value.trim();
    toDirectory.hidden = q.length < 3;
    toDirectory.textContent = `🔎 Chercher « ${q} » dans l'annuaire`;
  };
  input.addEventListener('input', () => { run(); updateDir(); });
  run(); updateDir();
  openSheet('Chercher dans mes lieux', el('div', { class: 'stack' }, input, info, list, toDirectory), { tall: true });
  input.focus();
}

/* ---------- Autour de moi (ou autour d'une station) ---------- */

// Centre des cercles : ma position GPS, ma dernière position connue ou une station choisie.
let origin = null; // { lat, lng, acc, time, kind: 'gps' | 'last' | 'station', label }

async function openNear() {
  stopFollow();
  toast('Recherche de ta position… (quelques secondes pour plus de précision)');
  try {
    const fix = await locate();
    hideToast();
    origin = { ...fix, kind: 'gps' };
    renderNear(true);
  } catch (e) {
    hideToast();
    offerFallback(e);
  }
}

/** Pas de GPS : proposer la dernière position connue ou une station. */
function offerFallback(e) {
  const age = here ? Date.now() - here.time : Infinity;
  openSheet('Position introuvable', el('div', { class: 'stack' },
    el('p', {}, e.message),
    here && age < 2 * 3600 * 1000
      ? el('button', { type: 'button', class: 'btn primary', onclick: () => { origin = { ...here, kind: 'last' }; renderNear(true); } },
        `Utiliser ma dernière position (${timeAgoShort(here.time)})`)
      : null,
    el('button', { type: 'button', class: 'btn', onclick: () => openStationPicker() }, 'Ⓜ Choisir une station de métro'),
    el('button', { type: 'button', class: 'btn', onclick: openNear }, '↻ Réessayer'),
  ));
}

function timeAgoShort(t) {
  const min = Math.round((Date.now() - t) / 60000);
  return min < 1 ? 'à l\'instant' : min < 60 ? `il y a ${min} min` : `il y a ${Math.round(min / 60)} h`;
}

/** Choisir une station pour voir ce qu'il y a autour en sortant (sans GPS). */
function openStationPicker(onPick = (st) => { stopFollow(); origin = { lat: st.lat, lng: st.lng, acc: 0, time: Date.now(), kind: 'station', label: st.n }; renderNear(true); }) {
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Ex. : Opéra, Bastille…', 'aria-label': 'Nom de la station' });
  const list = el('ul', { class: 'results' });
  const run = () => {
    const q = fold(input.value);
    const res = q.length < 2 ? [] : stations.filter((st) => fold(st.n).includes(q)).slice(0, 12);
    list.replaceChildren(...res.map((st) => el('li', {}, el('button', { type: 'button', onclick: () => onPick(st) },
      el('span', { class: 'res-title' }, `Ⓜ ${st.n}`),
      el('span', { class: 'res-sub' }, [st.l?.length ? `Ligne${st.l.length > 1 ? 's' : ''} ${st.l.join(', ')}` : '', st.rer?.length ? `RER ${st.rer.join(', ')}` : ''].filter(Boolean).join(' · '))))));
    if (q.length >= 2 && !res.length) list.replaceChildren(el('li', { class: 'empty' }, stations.length ? 'Aucune station de ce nom.' : 'Liste des stations pas encore chargée : réessaie dans un instant.'));
  };
  input.addEventListener('input', run);
  openSheet('Choisir une station', el('div', { class: 'stack' }, input, list), { tall: true });
  input.focus();
}

function drawNear() {
  nearLayer.clearLayers();
  const { lat, lng, acc, kind } = origin;
  if (kind !== 'station' && acc > 30) L.circle([lat, lng], { radius: acc, stroke: false, fillColor: '#4c6ef5', fillOpacity: 0.12, interactive: false }).addTo(nearLayer);
  for (const r of state.rings) {
    L.circle([lat, lng], { radius: r, color: '#1f2a44', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(nearLayer);
    L.marker([lat + r / 111195, lng], {
      interactive: false, keyboard: false,
      icon: L.divIcon({ className: '', html: `<span class="ring-label">${fmtRing(r)}</span>`, iconSize: [0, 0] }),
    }).addTo(nearLayer);
  }
  if (kind === 'station') {
    L.marker([lat, lng], { interactive: false, keyboard: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'pin-wrap', html: '<span class="metro-pin">M</span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(nearLayer);
  } else {
    L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: kind === 'last' ? '#868e96' : '#4c6ef5', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  }
}

function nearTitle() {
  if (origin.kind === 'station') return `Autour de Ⓜ ${origin.label}`;
  if (origin.kind === 'last') return `Autour de moi (${timeAgoShort(origin.time)})`;
  return following ? 'Autour de moi · en direct' : 'Autour de moi';
}

function renderNear(fit = false) {
  const pts = visible();
  const groups = groupByRings(pts, origin, state.rings);
  const inside = groups.reduce((n, g) => n + g.items.length, 0);
  const farther = pts.length - inside;
  const maxRing = state.rings[state.rings.length - 1];

  const body = [];
  if (pts.length) {
    const t = todoSummary(groups);
    const msg = !t.last.n
      ? `Aucun lieu à faire à moins de ${fmtRing(t.last.ring)}.`
      : t.first.ring === t.last.ring
        ? `${plural(t.last.n, 'lieu', 'lieux')} à faire à moins de ${fmtRing(t.last.ring)}.`
        : `${plural(t.first.n, 'lieu', 'lieux')} à faire à moins de ${fmtRing(t.first.ring)}, ${t.last.n} à moins de ${fmtRing(t.last.ring)}.`;
    body.push(el('p', { class: 'summary' }, msg));
  }
  if (origin.kind !== 'station' && origin.acc > 100) {
    body.push(el('p', { class: 'warn' }, `Position approximative (à ${Math.round(origin.acc)} m près) : les petits cercles ne sont pas fiables.`));
  }
  if (origin.kind === 'last') {
    body.push(el('p', { class: 'warn' }, `Position d'${timeAgoShort(origin.time)} : si tu as bougé depuis, actualise.`));
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
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${fmtWalk(d)}${p.done ? '' : ' · À faire'}`),
          origin.kind === 'station' ? null : (stationLine(p) ? el('span', { class: 'item-sub small' }, stationLine(p)) : null))),
      el('a', { class: 'go', href: mapsUrl(p, d), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${p.name}` }, 'Y aller')))));
  }
  if (!inside) {
    const what = [filterCat === 'all' ? 'lieu' : `lieu « ${catOf(filterCat).name} »`, favOnly ? 'favori' : null].filter(Boolean).join(' ');
    body.push(el('p', { class: 'empty' }, state.points.length
      ? `Aucun ${what} à moins de ${fmtRing(maxRing)}.`
      : 'Tu n\'as encore aucun lieu. Appuie sur « + Ajouter » pour commencer.'));
  }
  if (farther > 0 && inside) {
    body.push(el('p', { class: 'help' }, `${plural(farther, 'autre', 'autres')} plus loin que ${fmtRing(maxRing)}.`));
  }
  if (inside) body.push(el('p', { class: 'help' }, 'Temps à pied estimés, détours compris. Le trajet exact est dans « Y aller ».'));

  // Outils pour se déplacer
  body.push(el('h3', { class: 'ring-title', style: 'margin-top:16px' }, el('span', {}, 'Se déplacer'), el('span', {}, '')));
  body.push(el('div', { class: 'stack' },
    origin.kind === 'gps'
      ? el('button', { type: 'button', class: `btn ${following ? 'primary' : ''}`, 'aria-pressed': String(following), onclick: () => (following ? stopFollow(true) : startFollow()) },
        following ? '📡 Suivi en direct : activé (appuie pour arrêter)' : '📡 Suivre ma position en marchant')
      : null,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openWayPicker() }, '🚶 Sur mon chemin'),
      el('button', { type: 'button', class: 'btn', onclick: () => openRoutePicker() }, '🗺️ Parcours')),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: openNear }, '↻ Ma position'),
      el('button', { type: 'button', class: 'btn', onclick: () => openStationPicker() }, 'Ⓜ Une station')),
  ));

  openSheet(nearTitle(), body, { name: 'near' });
  drawNear();
  if (fit) {
    const bounds = L.latLng(origin.lat, origin.lng).toBounds(maxRing * 2);
    map.fitBounds(bounds, { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
  }
}

/* ---------- Voix (désactivable dans les réglages) ---------- */

function speak(text) {
  if (state.voice === false || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 1;
    speechSynthesis.speak(u);
  } catch { /* pas de voix sur ce téléphone */ }
}
function silence() { try { speechSynthesis?.cancel(); } catch { /* rien */ } }

/* ---------- Suivi en direct (seulement appli ouverte) ---------- */

let following = false;
let followId = null;
let lastRender = { t: 0, lat: 0, lng: 0 };
const signaled = new Set();
let wakeLock = null;

async function keepScreenOn(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* refusé : pas grave */ }
}

function startFollow() {
  if (!('geolocation' in navigator)) return;
  following = true;
  signaled.clear();
  for (const p of newlyNear(visible(), origin, signaled, 100)) signaled.add(p.id); // déjà proches : pas d'alerte
  keepScreenOn(true);
  followId = navigator.geolocation.watchPosition((pos) => {
    const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() };
    if (fix.acc > 150) return; // trop imprécis pour suivre
    remember(fix);
    origin = { ...fix, kind: 'gps' };
    const alerts = newlyNear(visible(), fix, signaled, 100);
    for (const p of alerts) signaled.add(p.id);
    if (alerts.length) {
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* pas de vibreur */ }
      toast(`À moins de 100 m : ${alerts.map((p) => p.name).join(', ')}`);
      speak(alerts.map((p) => `${p.name}, à ${spokenDistance(distanceM(fix, p))}`).join('. '));
    }
    const moved = distanceM(fix, lastRender);
    if (view === 'near' && (moved > 15 || Date.now() - lastRender.t > 15000)) {
      lastRender = { t: Date.now(), lat: fix.lat, lng: fix.lng };
      const keep = sheetBody.scrollTop;
      renderNear();
      sheetBody.scrollTop = keep;
      map.panTo([fix.lat, fix.lng], { animate: true });
    }
  }, () => {}, { enableHighAccuracy: true, maximumAge: 3000 });
  renderNear();
  toast('Suivi activé : écran allumé, vibration à 100 m d\'un lieu à faire.');
  speak('Suivi activé. Je te préviens à 100 mètres d\'un lieu à faire.');
}

function stopFollow(rerender = false) {
  if (followId != null) navigator.geolocation.clearWatch(followId);
  followId = null;
  if (!following) return;
  following = false;
  keepScreenOn(false);
  silence();
  if (rerender && view === 'near') renderNear();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (following || compassOpen)) keepScreenOn(true);
});

/* ---------- Choisir une destination (lieu à moi ou station) ---------- */

function openDestinationPicker(title, onPick) {
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Un de mes lieux ou une station', 'aria-label': 'Destination' });
  const list = el('ul', { class: 'results' });
  const run = () => {
    const q = input.value.trim();
    const mine = q ? searchPoints(state.points, state.categories, q).slice(0, 8) : [];
    const sts = fold(q).length >= 2 ? stations.filter((st) => fold(st.n).includes(fold(q))).slice(0, 6) : [];
    list.replaceChildren(
      ...mine.map(({ point: p }) => el('li', {}, el('button', { type: 'button', onclick: () => onPick({ lat: p.lat, lng: p.lng, label: p.name }) },
        el('span', { class: 'res-title' }, p.name), el('span', { class: 'res-sub' }, catOf(p.cat).name)))),
      ...sts.map((st) => el('li', {}, el('button', { type: 'button', onclick: () => onPick({ lat: st.lat, lng: st.lng, label: `Ⓜ ${st.n}` }) },
        el('span', { class: 'res-title' }, `Ⓜ ${st.n}`), el('span', { class: 'res-sub' }, 'Station de métro')))),
    );
    if (q && !mine.length && !sts.length) list.replaceChildren(el('li', { class: 'empty' }, 'Rien trouvé parmi tes lieux et les stations.'));
  };
  input.addEventListener('input', run);
  openSheet(title, el('div', { class: 'stack' }, el('p', { class: 'help' }, 'Tape le nom d\'un de tes lieux ou d\'une station de métro.'), input, list), { tall: true });
  input.focus();
}

/* ---------- Sur mon chemin ---------- */

function openWayPicker() {
  const from = origin;
  openDestinationPicker('Où vas-tu ?', (dest) => renderWay(from, dest));
}

function renderWay(from, dest) {
  const found = onTheWay(visible(), from, dest).filter((x) => distanceM(x.point, dest) > 30);
  const total = distanceM(from, dest);
  const body = [
    el('p', { class: 'summary' }, found.length
      ? `${plural(found.length, 'lieu', 'lieux')} à faire sur ton chemin, à moins de 5 min de détour.`
      : 'Aucun lieu à faire sur ton chemin (moins de 5 min de détour).'),
    el('p', { class: 'help' }, `Trajet : ${fmtDist(total)} · ${fmtWalk(total)}.`),
    el('ul', { class: 'items' }, found.map(({ point: p, detour }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, () => renderWay(from, dest)) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, detour < 30 ? 'Pile sur ton chemin' : `Détour ≈ ${walkMinutes(detour)} min`))),
      el('a', { class: 'go', href: mapsUrl(p, distanceM(from, p)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${p.name}` }, 'Y aller')))),
    found.length
      ? el('a', { class: 'btn primary', href: routeUrl([...found.slice(0, MAX_ROUTE - 1).map((x) => x.point), dest]), target: '_blank', rel: 'noopener' },
        found.length > MAX_ROUTE - 1 ? `Itinéraire avec les ${MAX_ROUTE - 1} premiers arrêts` : 'Itinéraire avec ces arrêts')
      : el('a', { class: 'btn primary', href: routeUrl([dest]), target: '_blank', rel: 'noopener' }, 'Itinéraire direct'),
    el('button', { type: 'button', class: 'btn', onclick: () => renderNear(true) }, '← Retour'),
  ];
  openSheet(`Vers ${dest.label}`, el('div', { class: 'stack' }, body), { tall: true });
  nearLayer.clearLayers();
  L.polyline([[from.lat, from.lng], [dest.lat, dest.lng]], { color: '#1f2a44', weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
  L.circleMarker([from.lat, from.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#4c6ef5', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  L.circleMarker([dest.lat, dest.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#1f2a44', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  const b = L.latLngBounds([[from.lat, from.lng], [dest.lat, dest.lng]]).pad(0.25);
  map.fitBounds(b, { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
}

/* ---------- Parcours du jour ---------- */

function openRoutePicker(selected = new Set()) {
  const start = origin ?? freshHere();
  const pts = visible()
    .map((p) => ({ p, d: start ? distanceM(start, p) : 0 }))
    .sort((a, b) => (start ? a.d - b.d : a.p.name.localeCompare(b.p.name, 'fr')));
  const go = el('button', { type: 'button', class: 'btn primary', onclick: () => renderRoute(start, pts.filter((x) => selected.has(x.p.id)).map((x) => x.p)) });
  const info = el('p', { class: 'help' });
  const update = () => {
    go.disabled = selected.size < 2;
    go.textContent = selected.size < 2 ? 'Choisis au moins 2 lieux' : `Calculer le parcours (${selected.size} lieux)`;
    info.textContent = `Jusqu'à ${MAX_ROUTE} lieux (limite de Google Maps sur téléphone).`;
  };
  const list = el('ul', { class: 'items' }, pts.slice(0, 60).map(({ p, d }) => {
    const box = el('input', { type: 'checkbox', class: 'check', 'aria-label': p.name });
    box.checked = selected.has(p.id);
    box.addEventListener('change', () => {
      if (box.checked && selected.size >= MAX_ROUTE) { box.checked = false; toast(`${MAX_ROUTE} lieux au plus.`); return; }
      if (box.checked) selected.add(p.id); else selected.delete(p.id);
      update();
    });
    return el('li', {}, el('label', { class: 'item-main check-row' }, box, catDot(p.cat),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, favMark(p), p.name),
        el('span', { class: 'item-sub' }, [start ? fmtDist(d) : null, p.done ? 'Déjà visité' : 'À faire'].filter(Boolean).join(' · ')))));
  }));
  update();
  openSheet('Parcours du jour', el('div', { class: 'stack' }, info, list, go), { tall: true });
}

function renderRoute(start, chosen) {
  const route = start ? orderRoute(start, chosen) : chosen;
  const total = start ? routeLength(start, route) : routeLength(route[0], route.slice(1));
  let prev = start ?? route[0];
  const steps = route.map((p, i) => {
    const leg = distanceM(prev, p);
    prev = p;
    return el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, () => renderRoute(start, chosen)) },
      el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, p.name),
        el('span', { class: 'item-sub' }, i === 0 && !start ? 'Départ' : `${fmtDist(leg)} · ${fmtWalk(leg)}`))));
  });
  openSheet('Ton parcours', el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${fmtDist(total)} au total · ${fmtWalk(total)} (sans les arrêts).`),
    el('ol', { class: 'items' }, steps),
    el('a', { class: 'btn primary', href: routeUrl(route), target: '_blank', rel: 'noopener' }, 'Ouvrir le parcours dans Google Maps'),
    el('button', { type: 'button', class: 'btn', onclick: () => openRoutePicker(new Set(chosen.map((p) => p.id))) }, 'Changer les lieux'),
  ), { tall: true });
  nearLayer.clearLayers();
  const line = [...(start ? [start] : []), ...route].map((p) => [p.lat, p.lng]);
  L.polyline(line, { color: '#1f2a44', weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
  route.forEach((p, i) => L.marker([p.lat, p.lng], { interactive: false, keyboard: false, zIndexOffset: 1000,
    icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }) }).addTo(nearLayer));
  map.fitBounds(L.latLngBounds(line).pad(0.2), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
}

/* ---------- Boussole « Vers ce lieu » ---------- */

let compassOpen = false;
let compassStop = null;
const compassEl = document.getElementById('compass');

function openCompass(p) {
  if (compassOpen) return;
  compassOpen = true;
  let pos = freshHere();
  let heading = null;
  const arrow = compassEl.querySelector('.compass-arrow');
  const dist = compassEl.querySelector('.compass-dist');
  const hint = compassEl.querySelector('.compass-hint');
  compassEl.querySelector('.compass-name').textContent = p.name;
  compassEl.querySelector('.compass-go').href = mapsUrl(p, pos ? distanceM(pos, p) : 1000);
  compassEl.hidden = false;
  history.pushState({ compass: true }, '');
  keepScreenOn(true);

  // Ce qui a déjà été dit, pour ne pas répéter sans arrêt.
  const said = { first: false, step: null, dir: null, dirAt: 0, arrived: false };
  const talk = (d, rel) => {
    if (d < 20) { if (!said.arrived) { said.arrived = true; speak(`Tu y es. ${p.name}.`); } return; }
    const dir = rel == null ? null : directionWord(rel);
    if (!said.first) {
      said.first = true; said.step = Math.floor(d / 100); said.dir = dir; said.dirAt = Date.now();
      speak(`Direction ${p.name}. ${spokenDistance(d)}${dir ? `, ${dir}` : ''}.`);
      return;
    }
    const step = Math.floor(d / 100);
    if (step < said.step) { said.step = step; speak(`Encore ${spokenDistance(d)}${dir ? `, ${dir}` : ''}.`); said.dir = dir; said.dirAt = Date.now(); return; }
    if (dir && dir !== said.dir && Date.now() - said.dirAt > 8000) { said.dir = dir; said.dirAt = Date.now(); speak(dir); }
  };

  const draw = () => {
    if (!pos) { dist.textContent = 'Recherche de ta position…'; arrow.style.opacity = '0.25'; return; }
    const d = distanceM(pos, p);
    const b = bearing(pos, p);
    talk(d, heading == null ? null : relativeAngle(b, heading));
    if (d < 20) {
      dist.textContent = 'Tu y es !';
      hint.textContent = '';
      arrow.style.opacity = '0.25';
      return;
    }
    dist.textContent = `${fmtDist(d)} · ${fmtWalk(d)}`;
    arrow.style.opacity = '1';
    if (heading == null) {
      arrow.style.transform = `rotate(${b}deg)`;
      hint.textContent = `Boussole indisponible : la flèche montre la direction avec le nord en haut (vers le ${compassLabel(b)}).`;
    } else {
      arrow.style.transform = `rotate(${relativeAngle(b, heading)}deg)`;
      hint.textContent = pos.acc > 50 ? `Position à ${Math.round(pos.acc)} m près : la direction peut varier.` : 'Tiens le téléphone à plat devant toi.';
    }
  };

  const onOrient = (e) => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
    if (h == null) return;
    h = (h + (screen.orientation?.angle ?? 0)) % 360;
    heading = h;
    draw();
  };
  const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(evt, onOrient);
  const watch = 'geolocation' in navigator
    ? navigator.geolocation.watchPosition((g) => {
      pos = { lat: g.coords.latitude, lng: g.coords.longitude, acc: g.coords.accuracy, time: Date.now() };
      remember(pos);
      if (distanceM(pos, p) < 20) { try { navigator.vibrate?.(300); } catch { /* rien */ } }
      draw();
    }, (err) => { hint.textContent = GEO_ERRORS[err.code] ?? 'Position indisponible.'; }, { enableHighAccuracy: true, maximumAge: 3000 })
    : null;
  draw();

  const mute = compassEl.querySelector('.compass-mute');
  const drawMute = () => { mute.textContent = state.voice === false ? '🔇 Voix coupée' : '🔊 Voix'; mute.setAttribute('aria-pressed', String(state.voice !== false)); };
  mute.onclick = () => { state.voice = state.voice === false; persist(); if (state.voice === false) silence(); drawMute(); };
  drawMute();

  compassStop = () => {
    silence();
    window.removeEventListener(evt, onOrient);
    if (watch != null) navigator.geolocation.clearWatch(watch);
    compassEl.hidden = true;
    compassOpen = false;
    compassStop = null;
    if (!following) keepScreenOn(false);
  };
}

function closeCompass(fromHistory = false) {
  if (!compassStop) return;
  compassStop();
  if (!fromHistory) history.back();
}
compassEl.querySelector('.compass-close').addEventListener('click', () => closeCompass());
window.addEventListener('popstate', () => { if (compassOpen) closeCompass(true); });

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
      persist(); refresh();
      openSettings();
      toast(`${plural(r.added, 'lieu ajouté', 'lieux ajoutés')}${r.skipped ? `, ${plural(r.skipped, 'illisible ignoré', 'illisibles ignorés')}` : ''}.`);
    } catch (e) {
      toast(e.message || 'Import impossible.', true);
    }
  });

  const exportFile = () => new File([exportJSON(state)], exportFileName(new Date(), state.points.length), { type: 'application/json' });
  const markExported = () => { state.lastExport = Date.now(); persist(); };
  const download = () => {
    const f = exportFile();
    markExported();
    const url = URL.createObjectURL(f);
    const a = el('a', { href: url, download: f.name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(`« ${f.name} » enregistré dans tes Téléchargements`);
  };
  const canShareFile = (() => {
    try { return Boolean(navigator.canShare?.({ files: [exportFile()] })); } catch { return false; }
  })();
  const share = async () => {
    try { await navigator.share({ files: [exportFile()], title: 'Ma carte de Paris' }); markExported(); } catch { /* annulé */ }
  };
  const section = (title) => el('h3', { class: 'ring-title', style: 'margin-top:18px' }, el('span', {}, title), el('span', {}, ''));

  openSheet('Réglages', el('div', { class: 'stack' },
    !state.ok ? el('p', { class: 'warn' }, 'Le stockage de ce téléphone n\'a pas pu être lu. Fais un export régulier pour ne rien perdre.') : null,

    section('Catégories'),
    el('div', {}, state.categories.map((c) => {
      const k = categoryCounts(state.points, c.id);
      return el('div', { class: 'cat-row' }, catDot(c.id),
        el('span', { class: 'cat-name' }, c.name, el('br'),
          el('span', { class: 'cat-count' }, k.total ? `${plural(k.total, 'lieu', 'lieux')} · ${k.todo} à faire` : 'aucun lieu')),
        el('button', { type: 'button', class: 'btn', onclick: () => openCategory(c.id), 'aria-label': `Modifier ${c.name}` }, 'Modifier'));
    })),
    el('button', { type: 'button', class: 'btn', onclick: () => openCategory(null) }, '+ Nouvelle catégorie'),
    state.categories.length > 6 ? el('p', { class: 'help' }, 'Au-delà de 6 catégories, la barre du haut défile : pense à regrouper.') : null,

    section('Favoris'),
    el('div', { class: 'cat-row' }, favBadge(),
      el('span', { class: 'cat-name' }, 'Icône et couleur des favoris'),
      el('button', { type: 'button', class: 'btn', onclick: openFavStyle }, 'Modifier')),

    section('Cercles autour de moi'),
    el('label', { class: 'field' }, 'Taille des cercles (en mètres)', rings),
    el('p', { class: 'help', id: 'ringsHelp' }, 'Sépare-les par des virgules. 100 m au minimum. Exemple : 100, 300, 500, 1000'),
    el('button', { type: 'button', class: 'btn primary', onclick: () => {
      state.rings = normalizeRings(rings.value);
      rings.value = state.rings.join(', ');
      if (persist()) toast(`Cercles : ${state.rings.map(fmtRing).join(', ')}`);
    } }, 'Enregistrer les cercles'),

    section('Sauvegarde'),
    el('p', { class: 'help' }, `${plural(count, 'lieu', 'lieux')} sur ce téléphone. Exporte-les de temps en temps : si tu changes de téléphone ou vides Chrome, ils seraient perdus.`),
    el('p', { class: backupDue(state) ? 'warn' : 'help' }, state.lastExport ? `Dernière sauvegarde : ${timeAgo(state.lastExport)}.` : 'Aucune sauvegarde faite pour l\'instant.'),
    el('button', { type: 'button', class: 'btn', onclick: download, disabled: count === 0 }, '⬇  Exporter mes lieux'),
    canShareFile ? el('button', { type: 'button', class: 'btn', onclick: share, disabled: count === 0 }, '✉  Envoyer le fichier (mail, Drive…)') : null,
    el('button', { type: 'button', class: 'btn', onclick: () => file.click() }, '⬆  Importer une sauvegarde'),
    el('p', { class: 'help' }, 'L\'import ajoute les lieux du fichier sans effacer ceux déjà présents.'),
    file,
    section('Voix'),
    el('button', { type: 'button', class: 'btn', 'aria-pressed': String(state.voice !== false), onclick: () => {
      state.voice = state.voice === false; persist(); if (state.voice === false) silence(); openSettings();
      toast(state.voice ? 'Voix activée' : 'Voix désactivée');
    } }, state.voice === false ? '🔇 Voix désactivée (appuie pour l\'activer)' : '🔊 Voix activée (appuie pour la couper)'),
    el('p', { class: 'help' }, 'La voix parle pendant la boussole et le suivi en direct. Elle utilise la voix du téléphone, sans internet.'),

    section('Confidentialité'),
    el('p', { class: 'help' }, 'Tes lieux et ta position restent sur ce téléphone. GitHub ne fait qu\'envoyer l\'appli : il ne reçoit ni ta position ni tes lieux. L\'appli ne peut parler qu\'à 3 services, et seulement pour ce que tu demandes : la carte (OpenStreetMap), les adresses (IGN) et l\'annuaire (OpenStreetMap). Comme tout site, ces services voient l\'adresse internet du téléphone et, pour la carte, le quartier affiché.'),
    el('p', { class: 'help', style: 'margin-top:18px' }, `Version du ${VERSION}. Carte © OpenStreetMap.${stationsSource ? ` Stations ${stationsSource}.` : ''}`),
  ), { tall: true });
}

function favBadge(icon = state.fav.icon, color = state.fav.color) {
  const b = el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, icon);
  b.style.background = '#fff';
  b.style.boxShadow = `0 0 0 3px ${color}`;
  return b;
}

function openFavStyle() {
  let { icon, color } = state.fav;
  const preview = el('div', { class: 'where' });
  const drawPreview = () => preview.replaceChildren(favBadge(icon, color), ' Aperçu sur la carte');
  drawPreview();
  openSheet('Favoris', el('div', { class: 'stack' },
    preview,
    el('div', {}, el('div', { class: 'legend' }, 'Icône'), picker(ICONS, icon, (v) => { icon = v; drawPreview(); })),
    el('div', {}, el('div', { class: 'legend' }, 'Couleur du contour'), picker(FAV_COLORS, color, (v) => { color = v; drawPreview(); }, { colors: true, names: FAV_COLOR_NAMES })),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: openSettings }, 'Annuler'),
      el('button', { type: 'button', class: 'btn primary', onclick: () => {
        state = setFavStyle(state, { icon, color });
        persist(); refresh(); openSettings();
        toast('Favoris modifiés');
      } }, 'Enregistrer')),
  ), { tall: true });
}

/** Création (id null) ou modification d'une catégorie. */
function openCategory(id) {
  const c = id ? catOf(id) : null;
  let color = c?.color ?? PALETTE.find((col) => !state.categories.some((x) => x.color === col)) ?? PALETTE[0];
  let icon = c?.icon ?? '📍';
  const name = el('input', { type: 'text', value: c?.name ?? '', maxlength: '20', autocomplete: 'off' });
  const err = el('p', { class: 'error', role: 'alert' });
  const swatches = picker(PALETTE, color, (v) => { color = v; }, { colors: true, names: COLOR_NAMES });
  const icons = picker(ICONS, icon, (v) => { icon = v; });
  const zone = el('div', { class: 'stack' });

  const save = () => {
    try {
      state = id ? updateCategory(state, id, { name: name.value, color, icon }) : addCategory(state, { name: name.value, color, icon });
    } catch (e) { err.textContent = e.message; return; }
    persist(); refresh(); openSettings();
    toast(id ? 'Catégorie modifiée' : 'Catégorie ajoutée');
  };

  const n = id ? state.points.filter((p) => p.cat === id).length : 0;
  const others = state.categories.filter((x) => x.id !== id);
  const doDelete = (moveTo) => {
    try { state = deleteCategory(state, id, moveTo); } catch (e) { err.textContent = e.message; return; }
    persist(); refresh(); openSettings();
    toast('Catégorie supprimée');
  };
  const showButtons = () => zone.replaceChildren(
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: openSettings }, 'Annuler'),
      el('button', { type: 'button', class: 'btn primary', onclick: save }, 'Enregistrer')),
    id && others.length ? el('button', { type: 'button', class: 'btn danger', onclick: askDelete }, 'Supprimer cette catégorie') : null,
    id && !others.length ? el('p', { class: 'help' }, 'C\'est ta seule catégorie : elle ne peut pas être supprimée.') : null,
  );
  const askDelete = () => {
    if (!n) {
      zone.replaceChildren(
        el('p', { class: 'warn', role: 'alert' }, `Supprimer la catégorie « ${c.name} » ? Elle ne contient aucun lieu.`),
        el('div', { class: 'row' },
          el('button', { type: 'button', class: 'btn', onclick: showButtons }, 'Annuler'),
          el('button', { type: 'button', class: 'btn danger solid', onclick: () => doDelete(null) }, 'Oui, supprimer')));
      return;
    }
    zone.replaceChildren(
      el('p', { class: 'warn', role: 'alert' }, `« ${c.name} » contient ${plural(n, 'lieu', 'lieux')}. Dans quelle catégorie les ranger ?`),
      el('div', { class: 'stack' }, others.map((o) => el('button', { type: 'button', class: 'btn', onclick: () => doDelete(o.id) },
        catDot(o.id), `Ranger dans « ${o.name} » et supprimer`))),
      el('button', { type: 'button', class: 'btn', onclick: showButtons }, 'Annuler'));
  };
  showButtons();

  const presets = id ? [] : suggestedPresets(state.categories);
  const presetBox = presets.length ? el('div', {},
    el('div', { class: 'legend' }, 'Toutes prêtes (un appui suffit)'),
    el('div', { class: 'presets' }, presets.map((pr) => {
      const b = el('button', { type: 'button', class: 'preset', onclick: () => {
        state = addCategory(state, pr);
        persist(); refresh(); openSettings();
        toast(`Catégorie « ${pr.name} » ajoutée`);
      } }, el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, pr.icon), pr.name);
      b.firstChild.style.background = pr.color;
      return b;
    })),
    el('div', { class: 'legend', style: 'margin-top:14px' }, 'Ou sur mesure')) : null;

  openSheet(id ? 'Modifier la catégorie' : 'Nouvelle catégorie', el('div', { class: 'stack' },
    presetBox,
    el('label', { class: 'field' }, 'Nom', name),
    el('div', {}, el('div', { class: 'legend' }, 'Icône'), icons),
    el('div', {}, el('div', { class: 'legend' }, 'Couleur'), swatches),
    err, zone,
  ), { tall: true });
}

/* ---------- Démarrage ---------- */

document.getElementById('btnAdd').addEventListener('click', openAddChoice);
document.getElementById('btnNear').addEventListener('click', openNear);
document.getElementById('btnSettings').addEventListener('click', openSettings);
document.getElementById('btnSearch').addEventListener('click', () => openSearch());

renderChips();
renderMarkers();
if (state.points.length) {
  map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 15, animate: false });
} else {
  toast('Appuie sur « + Ajouter », ou laisse le doigt appuyé sur la carte, pour enregistrer ton premier lieu.');
}
if (!state.ok) toast('Le stockage de ce téléphone n\'est pas lisible : pense à exporter tes lieux.', true);
else if (backupDue(state)) toast('Pense à sauvegarder tes lieux : ⚙ Réglages → Exporter mes lieux.');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
