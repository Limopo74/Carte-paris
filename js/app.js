// Interface de « Ma carte de Paris ».
import { svgIcon, glyphHTML, ICON_SVG } from './icons.js';
const ICON_NAMES = new Set(Object.keys(ICON_SVG));
import { distanceM, walkMinutes, normalizeRings, groupByRings, mapsUrl, minutesToMeters, normalizeMinuteRings } from './geo.js';
import {
  KEY, PALETTE, ICONS, FAV_COLORS, newPoint, loadState, saveState, exportJSON, mergeImport,
  addCategory, updateCategory, deleteCategory, moveCategory, moveTool, normalizeTools, cleanHidden, addList, addMyStation, removeMyStation, saveMySettings, applyMySettings, sameAsMySettings, renameList, deleteList, setFavStyle, setDone, exportFileName, suggestedPresets, backupDue, unsavedCount,
  fileOwner, owners,
} from './store.js';
import { timeAgo, formatDate, todoSummary, categoryCounts, nearestStation, nearestStations } from './stats.js';
import { searchAddress, reverseAddress, reverseInfo } from './adresse.js';
import { searchPlaces } from './annuaire.js';
import { parseShared } from './share.js';
import { exportUrl, parseRecords, nearestOf } from './pratique.js';
import { openState } from './hours.js';
import { metroPlan } from './metroplan.js';
import { putPhoto, getPhoto, deletePhoto, compressImage, blobToDataUrl, dataUrlToBlob, MAX_PHOTOS } from './photos.js';
import { searchPoints, fold } from './search.js';
import { eventsUrl, parseEvents, nearbyEvents, whenText } from './events.js';
import qrcode from '../vendor/qrcode.mjs';
import { routeLink, readRouteLink, meetLink, readMeetLink, planLoopOpen, gpsFromJpeg } from './explore.js';
import { placeLink, readPlaceLink, planLoop, loopUrl, parseTakeout, findDuplicate, wikiUrl, parseWiki, wikiPage, arrFromText, arrFromCitycode, ARR_GRID, VELIB_INFO, VELIB_STATUS, mergeVelib, nearestVelib, meteoUrl, readMeteo } from './explore.js';
import {
  bearing, relativeAngle, compassLabel, bestFix, onTheWay, MAX_DETOUR_M,
  orderRoute, routeLength, routeUrl, MAX_ROUTE, newlyNear, directionWord, spokenDistance, walkSegment, stepsFor, dayKey,
} from './move.js';

const L = window.L;
const VERSION = '16 novembre 2026 (48)';
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
const stationsReady = fetch('data/stations.json')
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

/** Remplace le contenu d'un élément en ignorant les vides (null, false) : sinon le navigateur écrit « null ». */
function fill(node, ...kids) {
  node.replaceChildren(...kids.flat().filter((c) => c != null && c !== false));
}

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
// Cercles d'« Autour de moi » : en mètres, ou en minutes à pied (rayons calculés depuis les minutes).
const inMinutes = () => state.ringUnit === 'min';
const nearRings = () => (inMinutes() ? state.minuteRings.map(minutesToMeters) : state.rings);
const ringText = (m) => {
  if (!inMinutes()) return fmtRing(m);
  const i = nearRings().indexOf(m);
  return `${i >= 0 ? state.minuteRings[i] : walkMinutes(m)} min`;
};
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
/** Pastille de catégorie : son icône sur sa couleur. */
/** Icône dessinée (élément), à partir d'un nom de la liste fixe. */
function ico(name, opts = {}) {
  const s = el('span', { class: 'ico', 'aria-hidden': 'true' });
  s.innerHTML = svgIcon(name, opts);
  return s;
}
/** Icône de catégorie ou de favori : dessin moderne si disponible, sinon l'emoji. */
function glyph(emoji, opts = {}) {
  const s = el('span', { class: 'ico', 'aria-hidden': 'true' });
  s.innerHTML = glyphHTML(emoji, opts);
  return s;
}

function catDot(catId) {
  const c = catOf(catId);
  const d = el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, glyph(c.icon, { filled: true }));
  d.style.background = c.color;
  return d;
}
const favMark = (p) => {
  if (!p.fav) return null;
  const m = el('span', { class: 'fav-mark', 'aria-label': 'Favori' }, glyph(state.fav.icon, { filled: true }));
  m.style.color = state.fav.color;
  return m;
};

/** Grille de choix (icônes ou couleurs) à boutons pressés. */
function picker(values, selected, onPick, { colors = false, names = [] } = {}) {
  const box = el('div', { class: colors ? 'swatches' : 'icon-grid', role: 'group' });
  const draw = (cur) => fill(box, ...values.map((v, i) => {
    const b = el('button', {
      type: 'button', class: colors ? 'swatch' : 'icon-choice', 'aria-pressed': String(v === cur),
      'aria-label': names[i] ?? v, onclick: () => { onPick(v); draw(v); },
    }, colors ? null : glyph(v, { filled: true }));
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
const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
// Fonds de carte sans clé : OpenStreetMap, et les rendus d'OpenStreetMap France (« FR » et humanitaire).
// Pastel et Nuit sont des filtres de couleur appliqués sur le téléphone : aucun service de plus.
const STYLE_INFO = {
  classic: { name: 'Classique', sub: 'La carte OpenStreetMap habituelle', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: OSM_ATTR, maxZoom: 19 },
  fr: { name: 'Française', sub: 'Noms en français, couleurs plus vives (OSM France)', url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', attr: `${OSM_ATTR} — rendu <a href="https://www.openstreetmap.fr/">OSM France</a>`, maxZoom: 19 },
  hot: { name: 'Douce', sub: 'Couleurs pastel du rendu humanitaire (OSM France)', url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: `${OSM_ATTR} — tuiles <a href="https://www.hotosm.org/">HOT</a>, OSM France`, maxZoom: 19 },
  pastel: { name: 'Pastel', sub: 'La carte classique en tons doux et lumineux', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: OSM_ATTR, maxZoom: 19 },
  night: { name: 'Nuit', sub: 'Fond sombre, repose les yeux le soir', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: OSM_ATTR, maxZoom: 19 },
};
/* ---------- Mode sombre : suit le téléphone tant qu'on n'a pas choisi ---------- */
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (state.theme === 'dark' || (state.theme !== 'light' && darkQuery.matches));
/** Couleur des traits dessinés sur la carte (cercles, chemins), lisible sur le fond clair comme sombre. */
const ink = () => (isDark() ? '#e9edf5' : '#1f2a44');
function applyTheme() {
  document.documentElement.dataset.theme = isDark() ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark() ? '#151922' : '#1f2a44');
}
applyTheme();
darkQuery.addEventListener?.('change', () => { if (state.theme === 'auto' || !state.theme) { applyTheme(); refresh?.(); } });

let tiles = null;
function applyMapStyle() {
  const st = STYLE_INFO[state.mapStyle] ?? STYLE_INFO.classic;
  if (tiles) map.removeLayer(tiles);
  tiles = L.tileLayer(st.url, { maxZoom: st.maxZoom, subdomains: 'abc', attribution: st.attr }).addTo(map);
  document.getElementById('map').dataset.style = state.mapStyle ?? 'classic';
}
applyMapStyle();

// Pastilles plus petites quand on voit une grande partie de Paris, pour éviter qu'elles se chevauchent.
const mapEl = document.getElementById('map');
const scalePins = () => mapEl.classList.toggle('z-far', map.getZoom() < 15);
map.on('zoomend', scalePins);
map.on('zoomend', () => { if (view === 'near' && origin) drawNear(); if (meShown) drawMe(); });
scalePins();

/** Point « moi » toujours au-dessus des lieux. */
function meMarker(lat, lng, grey = false) {
  // Le cône (direction où tu regardes) apparaît dès que le téléphone donne son orientation.
  if (!grey) startHeading();
  const cone = grey ? '' : `<span class="me-cone"${mapHeading == null ? ' hidden' : ''} style="transform:rotate(${mapHeading ?? 0}deg)"><svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"><defs><radialGradient id="cg" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#4c6ef5" stop-opacity=".55"/><stop offset="1" stop-color="#4c6ef5" stop-opacity="0"/></radialGradient></defs><path d="M40 40 L18 4 A44 44 0 0 1 62 4 Z" fill="url(#cg)"/></svg></span>`;
  return L.marker([lat, lng], {
    interactive: false, keyboard: false, zIndexOffset: 3000,
    icon: L.divIcon({ className: 'pin-wrap me-wrap', html: `${cone}<span class="me-dot${grey ? ' grey' : ''}"></span>`, iconSize: [20, 20], iconAnchor: [10, 10] }),
  });
}

/* Orientation du téléphone pour le cône du point bleu (écoutée seulement quand un point bleu est affiché). */
let mapHeading = null;
let headingOn = false;
function startHeading() {
  if (headingOn) return;
  headingOn = true;
  const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  let last = 0;
  window.addEventListener(evt, (e) => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if ((e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null) h = 360 - e.alpha;
    if (h == null) return;
    h = (h + (screen.orientation?.angle ?? 0) + 360) % 360;
    const now = Date.now();
    if (now - last < 120 && mapHeading != null && Math.abs(h - mapHeading) < 4) return; // pas plus de 8 images/s
    last = now;
    mapHeading = h;
    for (const c of document.querySelectorAll('.me-cone')) { c.hidden = false; c.style.transform = `rotate(${h}deg)`; }
  });
}

const pointsLayer = L.layerGroup().addTo(map);
const meLayer = L.layerGroup().addTo(map);
const nearLayer = L.layerGroup().addTo(map);
const draftLayer = L.layerGroup().addTo(map);

let filterCats = new Set(); // catégories choisies en haut ; vide = « Tout »
let favOnly = false;
let personFilter = 'all'; // 'all', '' (moi) ou le prénom d'une autre personne
// Filtres (bouton « Filtres » en haut) : ouvert maintenant, mieux notés, abrités, listes, personne
const filt = { open: false, top: false, covered: false, lists: new Set() };
const activeFilters = () => [filt.open, filt.top, filt.covered, filt.lists.size > 0, personFilter !== 'all'].filter(Boolean).length;
const passFilters = (p) => (!filt.open || openState(p.hours)?.open === true) && (!filt.top || (p.stars ?? 0) >= 4)
  && (!filt.covered || p.covered) && (!filt.lists.size || (p.lists ?? []).some((l) => filt.lists.has(l)))
  && (personFilter === 'all' || p.owner === personFilter);
const visible = () => state.points.filter((p) =>
  (!filterCats.size || filterCats.has(p.cat)) && (!favOnly || p.fav) && passFilters(p));

function renderMarkers() {
  pointsLayer.clearLayers();
  for (const p of visible()) {
    if (moving && moving.id === p.id) continue; // le viseur le remplace pendant le déplacement
    const c = catOf(p.cat);
    // Icônes et couleurs viennent de listes fixes : pas de texte saisi dans ce HTML.
    const ring = p.fav ? `box-shadow:0 0 0 3px ${state.fav.color},0 2px 6px rgba(0,0,0,.35);` : '';
    const html = `<span class="pin${p.done ? ' done' : ''}" style="background:${c.color};${ring}">${glyphHTML(c.icon, { size: 17, filled: true, stroke: 2.2 })}${p.fav ? `<span class="pin-fav" style="color:${state.fav.color}">${glyphHTML(state.fav.icon, { size: 11, filled: true, stroke: 2.4 })}</span>` : ''}</span>`;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'pin-wrap', html, iconSize: [32, 32], iconAnchor: [16, 16] }),
      zIndexOffset: p.fav ? 500 : 0,
      alt: p.name,
    })
      .on('add', (e) => { const n = e.target.getElement(); if (n) { n.setAttribute('aria-label', `${p.name}, ${c.name}${p.done ? ', déjà visité' : ''}${p.fav ? ', favori' : ''}`); n.removeAttribute('alt'); } })
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
  L.circleMarker([lat, lng], { radius: 11, color: ink(), weight: 3, fillColor: '#ffffff', fillOpacity: 1, interactive: false }).addTo(draftLayer);
  centerOn(lat, lng, Math.max(map.getZoom(), 17));
}

/* ---------- Barre de filtres ---------- */

function renderChips() {
  for (const id of filterCats) if (!state.categories.some((c) => c.id === id)) filterCats.delete(id);
  const chip = (label, pressed, onclick, extra = {}) =>
    el('button', { type: 'button', class: `chip ${extra.class ?? ''}`, 'aria-pressed': String(pressed), onclick, 'aria-label': extra.aria, title: extra.aria }, label);
  // Toutes les catégories, dans l'ordre choisi, en faisant défiler. Appui long : modifier la catégorie.
  const catChip = (c) => {
    const b = chip(state.chipIcons ? catDot(c.id) : [catDot(c.id), c.name], filterCats.has(c.id), () => toggleCat(c.id), // plusieurs à la fois ; 2e appui : la retire
      { class: state.chipIcons ? 'icon-only' : '', aria: state.chipIcons ? c.name : null });
    b.dataset.cat = c.id;
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); openCategory(c.id); });
    return b;
  };
  const box = document.getElementById('chips');
  fill(box, ...[
    chip('Tout', !filterCats.size, () => { filterCats.clear(); refresh(); }),
    chip([ico('list-filter'), activeFilters() ? ` ${activeFilters()}` : ''], activeFilters() > 0, openFilters,
      { class: 'filters', aria: activeFilters() ? `Filtres : ${activeFilters()} actifs` : 'Filtres' }),
    chip(glyph(state.fav.icon, { filled: true, size: 20 }), favOnly, () => { favOnly = !favOnly; refresh(); }, { class: 'star', aria: 'Seulement les favoris' }),
    ...state.categories.map(catChip),
  ].filter(Boolean));
  const star = box.querySelector('.star');
  if (favOnly) { star.style.background = state.fav.color; star.style.borderColor = state.fav.color; star.style.color = '#fff'; } else star.style.color = state.fav.color;
  // La catégorie choisie reste visible dans la barre
  const on = lastToggled && box.querySelector(`.chip[data-cat="${lastToggled}"]`);
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  lastToggled = null;
}

/** De qui afficher les lieux : tous, moi, ou une personne dont j'ai importé les lieux. */
/** Les filtres en une feuille : chaque ligne s'allume ou s'éteint d'un appui, le nombre de lieux suit. */
function openFilters() {
  const count = (fn) => state.points.filter(fn).length;
  const sw = (on, icon, title, sub, toggle) => el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(on), onclick: () => { toggle(); refresh(); openFilters(); } },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(icon)),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)),
    el('span', { class: `switch${on ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));
  const withHours = count((p) => openState(p.hours) != null);
  const people = owners(state.points);
  const shown = visible().length;
  openSheet([ico('list-filter'), ' Filtres'], el('div', { class: 'menu' },
    el('p', { class: 'help' }, `${plural(shown, 'lieu affiché', 'lieux affichés')} sur ${state.points.length}.`),
    sw(filt.open, 'clock', 'Ouvert maintenant', withHours ? `${plural(count((p) => openState(p.hours)?.open === true), 'ouvert', 'ouverts')} sur ${withHours} avec horaires` : 'Aucun lieu n\'a encore d\'horaires', () => { filt.open = !filt.open; }),
    sw(filt.top, 'star', 'Mes mieux notés', `4 étoiles et plus · ${plural(count((p) => (p.stars ?? 0) >= 4), 'lieu', 'lieux')}`, () => { filt.top = !filt.top; }),
    sw(filt.covered, 'umbrella', 'Abrités (pluie)', plural(count((p) => p.covered), 'lieu coché « abrité »', 'lieux cochés « abrité »'), () => { filt.covered = !filt.covered; }),
    el('h3', { class: 'ring-title', style: 'margin-top:10px' }, el('span', {}, 'Mes listes'), el('span', {}, '')),
    (state.lists ?? []).length
      ? el('div', { class: 'list-chips' }, state.lists.map((l) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(filt.lists.has(l.id)), onclick: () => {
        if (filt.lists.has(l.id)) filt.lists.delete(l.id); else filt.lists.add(l.id); refresh(); openFilters();
      } }, ico('list'), ` ${l.name} `, el('span', { class: 'cat-count' }, String(count((p) => p.lists?.includes(l.id)))))))
      : el('p', { class: 'help' }, 'Aucune liste. Crée-en une en modifiant un lieu (« Mes listes »).'),
    people.length ? el('h3', { class: 'ring-title', style: 'margin-top:10px' }, el('span', {}, 'Lieux de'), el('span', {}, '')) : null,
    people.length ? el('div', { class: 'list-chips' },
      [['all', 'Tout le monde', state.points.length], ['', state.me ? `Moi (${state.me})` : 'Moi', count((p) => !p.owner)], ...people.map((o) => [o.name, o.name, o.n])]
        .map(([who, label, n]) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(personFilter === who), onclick: () => { personFilter = who; refresh(); openFilters(); } },
          ico(who === 'all' ? 'users' : 'map-pin'), ` ${label} `, el('span', { class: 'cat-count' }, String(n))))) : null,
    activeFilters() ? el('button', { type: 'button', class: 'btn', style: 'margin-top:8px', onclick: () => {
      filt.open = false; filt.top = false; filt.covered = false; filt.lists.clear(); personFilter = 'all'; refresh(); openFilters(); toast('Filtres effacés');
    } }, ico('x'), 'Effacer les filtres') : null,
  ), { name: 'filters', again: openFilters, tall: true });
}

function openPersonPicker() {
  const pick = (who) => {
    personFilter = who;
    refresh();
    if (navStack.length > 1) history.back(); else closeSheet();
  };
  const mine = state.points.filter((p) => !p.owner).length;
  const btn = (who, label, icon, count) => el('button', {
    type: 'button', class: 'cat-choice', 'aria-pressed': String(personFilter === who), onclick: () => pick(who),
  }, el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, icon), el('span', { class: 'cat-choice-name' }, label), el('span', { class: 'cat-count' }, String(count)));
  openSheet('Lieux de…', el('div', { class: 'cat-grid' },
    btn('all', 'Tout le monde', '👥', state.points.length),
    btn('', state.me ? `Moi (${state.me})` : 'Moi', '👤', mine),
    ...owners(state.points).map((o) => btn(o.name, o.name, '👤', o.n)),
  ), { name: 'personpick', again: openPersonPicker });
}

/** Ajoute ou retire une catégorie du filtre du haut. */
let lastToggled = null;
function toggleCat(id) {
  if (filterCats.has(id)) filterCats.delete(id); else filterCats.add(id);
  lastToggled = id;
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
let view = null; // nom de l'écran affiché ('near' pour « Autour de moi »…)
// Pile des écrans ouverts, pour que le retour d'Android revienne à l'écran précédent.
// Chaque écran a un nom et, s'il peut être rouvert, une fonction « again ».
let navStack = [];

let sheetOpener = null; // bouton qui a ouvert la feuille : il retrouve le focus à la fermeture
function openSheet(title, body, { onClose = null, tall = false, name = null, again = null } = {}) {
  if (moving && name !== 'move') stopMove();
  const focusOutside = !sheet.contains(document.activeElement);
  if (sheet.hidden && focusOutside && document.activeElement !== document.body) sheetOpener = document.activeElement;
  const prevClose = onSheetClose;
  if (prevClose && name !== view) { onSheetClose = null; prevClose(); }
  const key = name ?? `anon-${navStack.length}`;
  const at = navStack.findIndex((e) => e.name === key);
  if (at >= 0) navStack = navStack.slice(0, at); // on revient à un écran déjà ouvert : on oublie ceux d'après
  navStack.push({ name: key, again });
  view = name;
  fill(sheetTitle, ...[title].flat().filter(Boolean));
  fill(sheetBody, ...[body].flat().filter(Boolean));
  sheet.classList.toggle('tall', tall);
  sheet.hidden = false;
  sheetBody.scrollTop = 0;
  onSheetClose = onClose;
  if (!historyPushed) {
    history.pushState({ sheet: true }, '');
    historyPushed = true;
  }
  // Clavier et lecteur d'écran : le focus entre dans la feuille (sans le voler à un champ déjà dedans)
  if (focusOutside || !sheet.contains(document.activeElement)) sheetTitle.focus({ preventScroll: true });
}

/** Ferme la feuille puis lance `fn` une fois le retour arrière terminé (sinon il fermerait aussi la boussole). */
function closeSheetThen(fn) {
  if (sheet.hidden || !historyPushed) { closeSheet(); fn(); return; }
  window.addEventListener('popstate', () => setTimeout(fn, 0), { once: true });
  closeSheet();
}

function closeSheet(fromHistory = false) {
  if (sheet.hidden) return;
  sheet.hidden = true;
  view = null;
  navStack = [];
  fill(sheetBody, );
  draftLayer.clearLayers();
  nearLayer.clearLayers();
  if (moving) stopMove();
  stopFollow();
  const cb = onSheetClose;
  onSheetClose = null;
  if (cb) cb();
  if (sheetOpener && document.contains(sheetOpener) && (sheet.contains(document.activeElement) || document.activeElement === document.body)) sheetOpener.focus({ preventScroll: true });
  sheetOpener = null;
  if (historyPushed && !fromHistory) {
    historyPushed = false;
    history.back();
  } else {
    historyPushed = false;
  }
}

window.addEventListener('popstate', () => {
  if (compassOpen || viewerOpen) return; // le retour ferme d'abord la boussole ou la photo
  if (sheet.hidden) return;
  // Revenir à l'écran précédent qui sait se rouvrir, sinon fermer.
  navStack.pop();
  while (navStack.length && !navStack.at(-1).again) navStack.pop();
  if (navStack.length) {
    const prev = navStack.pop();
    history.pushState({ sheet: true }, '');
    prev.again();
  } else {
    historyPushed = false;
    closeSheet(true);
  }
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
  1: 'Localisation refusée. Dans Chrome : ⋮ → Paramètres → Paramètres des sites → Position, puis autorise limopo74.github.io. Appli installée : appui long sur son icône → Infos sur l\'appli → Autorisations → Position.',
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
    el('button', { type: 'button', class: 'btn big c-add solid', onclick: addAtPosition }, '📍  À ma position'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: () => openPlaceSearch() }, '🔎  Avec un nom ou une adresse'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: addFromPhoto }, ico('image'), ' Depuis une photo de ma galerie'),
    el('p', { class: 'help' }, 'Astuce : tu peux aussi laisser le doigt appuyé sur la carte, à l\'endroit voulu.'),
  ), { name: 'add', again: openAddChoice });
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
    fill(out, );
    const [places, addrs] = await Promise.allSettled([searchPlaces(q, ctrl.signal), searchAddress(q, ctrl.signal)]);
    if (ctrl.signal.aborted) return;
    const P = places.status === 'fulfilled' ? places.value : [];
    const A = addrs.status === 'fulfilled' ? addrs.value : [];
    if (P.length) {
      out.append(el('h3', { class: 'ring-title' }, el('span', {}, 'Lieux'), el('span', {}, String(P.length))),
        el('ul', { class: 'results' }, P.map((r) => row(r.name, [r.kind, r.address].filter(Boolean).join(' · '),
          () => openForm({ lat: r.lat, lng: r.lng, address: r.address, name: r.name, hours: r.hours })))));
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
    info, out), { tall: true, onClose: () => ctrl?.abort(), name: 'place', again: () => openPlaceSearch(input.value, Boolean(input.value.trim())) });
  if (autoRun) run(); else input.focus();
}

/* ---------- Raccourcis de l'icône et partage vers l'appli ---------- */

/** Ajouter ce qui a été partagé depuis une autre appli (Google Maps, site, message…). */
async function addShared(shared) {
  const s = parseShared(shared);
  if (s.lat != null) {
    addAtShared(s);
    return;
  }
  if (s.address) {
    toast('Recherche de l\'adresse…');
    try {
      const [first] = await searchAddress(s.address);
      if (first) {
        hideToast();
        openForm({ lat: first.lat, lng: first.lng, address: first.label, name: s.name, rough: ROUGH[first.type] ?? null });
        return;
      }
    } catch { /* on passe à la recherche par nom */ }
  }
  if (s.query) {
    openPlaceSearch(s.query, true);
    return;
  }
  openPlaceSearch('');
  toast('Le partage ne contient ni nom ni adresse : tape le nom du lieu.', true);
}

function addAtShared(s) {
  const draft = { lat: s.lat, lng: s.lng, address: s.address, name: s.name };
  openForm(draft);
  if (!s.address) reverseAddress(s.lat, s.lng).then((label) => { if (label && draft.onAddress) draft.onAddress(label); });
}

/** Lancé depuis un raccourci de l'icône ou un partage : l'adresse de la page dit quoi faire. */
function runLaunchAction() {
  const h = location.hash;
  const shared = readPlaceLink(h); const walk = readRouteLink(h); const meet = readMeetLink(h);
  if (/(lieu|balade|rdv)=/.test(h)) history.replaceState(null, '', location.pathname + location.search);
  if (shared) { receivePlace(shared); return; }
  if (walk) { stationsReady.then(() => receiveRoute(walk)); return; }
  if (meet) { receiveMeet(meet); return; }
  const q = new URLSearchParams(location.search);
  if (![...q.keys()].length) return;
  history.replaceState(null, '', location.pathname); // pour ne pas relancer l'action en rechargeant
  const action = q.get('action');
  if (action === 'metro') { nearestMetro(); return; }
  if (action === 'near') { openNear(); return; }
  if (action === 'add-here') { addAtPosition(); return; }
  if (action === 'pratique') { nearestPratique(); return; }
  if (q.has('title') || q.has('text') || q.has('url')) {
    addShared({ title: q.get('title') ?? '', text: q.get('text') ?? '', url: q.get('url') ?? '' });
  }
}

/** Formulaire de création (draft) ou de modification (existing). */
/** Étoiles en lecture seule (★★★☆☆), ou rien si le lieu n'est pas noté. */
function starsText(n) {
  return n ? el('span', { class: 'stars-ro', 'aria-label': `${n} étoile${n > 1 ? 's' : ''} sur 5`, role: 'img' }, '★'.repeat(n), el('span', { class: 'off' }, '☆'.repeat(5 - n))) : null;
}

/** Rangée de 5 étoiles à toucher. Toucher l'étoile déjà choisie retire la note. */
function starPicker(value, onPick) {
  const box = el('div', { class: 'star-pick', role: 'group', 'aria-label': 'Ma note' });
  const draw = (v) => fill(box, ...[1, 2, 3, 4, 5].map((i) => el('button', {
    type: 'button', class: i <= v ? 'on' : '', 'aria-label': `${i} étoile${i > 1 ? 's' : ''}`, 'aria-pressed': String(i === v),
    onclick: () => { const nv = i === v ? 0 : i; draw(nv); onPick(nv); },
  }, i <= v ? '★' : '☆')));
  draw(value);
  return box;
}

function openForm(draft, existing = null) {
  const firstCat = filterCats.size === 1 ? [...filterCats][0] : state.categories[0].id;
  const v = existing ?? { name: draft.name ?? '', cat: draft.cat ?? firstCat, note: draft.note ?? '', done: false, fav: favOnly, address: draft.address, stars: draft.stars ?? 0 };
  let cat = v.cat;
  let done = v.done;
  let fav = v.fav;
  let stars = v.stars ?? 0;
  let covered = Boolean(v.covered);
  const lists = new Set(v.lists ?? (filt.lists.size === 1 ? [...filt.lists] : []));
  let dupOk = false; // « Ajouter quand même » après l'alerte doublon

  // Mes listes : un appui pour mettre ou retirer, et un champ pour en créer une
  const listBox = el('div', { class: 'list-chips' });
  const newList = el('input', { type: 'text', maxlength: '30', placeholder: 'Nouvelle liste, ex. Sous la pluie', 'aria-label': 'Nom de la nouvelle liste', enterkeyhint: 'done' });
  const drawLists = () => fill(listBox, ...(state.lists ?? []).map((l) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(lists.has(l.id)), onclick: () => {
    if (lists.has(l.id)) lists.delete(l.id); else lists.add(l.id); drawLists();
  } }, lists.has(l.id) ? ico('check') : ico('list'), ` ${l.name}`)));
  const createList = () => {
    const n = newList.value.trim();
    if (!n) { newList.focus(); return; }
    try { const r = addList(state, n); state = r.state; lists.add(r.id); persist(); newList.value = ''; drawLists(); } catch (e) { toast(e.message, true); }
  };
  newList.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createList(); } });
  drawLists();
  const coveredBox = el('input', { type: 'checkbox', class: 'check', checked: covered });
  coveredBox.addEventListener('change', () => { covered = coveredBox.checked; });

  const name = el('input', { type: 'text', value: v.name, maxlength: '80', autocomplete: 'off', enterkeyhint: 'next', required: true });
  const note = el('textarea', { maxlength: '1000', placeholder: 'Pourquoi tu l\'as gardé, quoi y prendre…' });
  note.value = v.note;
  const err = el('div', { class: 'error', role: 'alert' });

  const segBtn = (label, pressed, onPick) => el('button', { type: 'button', 'aria-pressed': String(pressed), onclick: onPick }, label);
  const catSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Catégorie' });
  const drawCats = () => fill(catSeg, ...state.categories.map((c) =>
    segBtn([catDot(c.id), c.name], c.id === cat, () => { cat = c.id; drawCats(); })));
  drawCats();
  const doneSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'État' });
  const drawDone = () => fill(doneSeg, 
    segBtn('À faire', !done, () => { done = false; drawDone(); }),
    segBtn('Déjà visité', done, () => { done = true; drawDone(); }),
    segBtn([glyph(state.fav.icon, { filled: true }), ' Favori'], fav, () => { fav = !fav; drawDone(); }));
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
    if (!existing && !dupOk) {
      const dup = findDuplicate(state.points, { name: n, lat: draft.lat, lng: draft.lng });
      if (dup) {
        fill(err,
          `Tu as déjà « ${dup.point.name} » à ${Math.round(dup.d)} m. `,
          el('div', { class: 'row', style: 'margin-top:8px' },
            el('button', { type: 'button', class: 'btn', onclick: () => openDetail(dup.point.id) }, 'Voir ce lieu'),
            el('button', { type: 'button', class: 'btn c-add', onclick: () => { dupOk = true; save(); } }, 'Ajouter quand même')));
        err.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
    const listIds = [...lists].filter((id) => (state.lists ?? []).some((l) => l.id === id));
    if (existing) {
      Object.assign(existing, { name: n, cat, note: note.value, fav, stars, covered, lists: listIds });
      setDone(existing, done);
    } else {
      const np = newPoint({ name: n, cat, note: note.value, done, fav, lat: draft.lat, lng: draft.lng, address: draft.address || '', hours: draft.hours || '', stars, covered, lists: listIds });
      state.points.push(np);
      if (draft.photoFile) savePhotos(np, [draft.photoFile]);
    }
    const ok = persist();
    renderMarkers();
    if (existing) openDetail(existing.id); else closeSheet();
    if (ok) toast(existing ? 'Modifications enregistrées' : `« ${n} » est sur ta carte`);
    if (ok && !existing && unsavedCount(state) > 0 && unsavedCount(state) % 10 === 0) setTimeout(remindBackup, 1500);
  };

  openSheet(existing ? 'Modifier le lieu' : 'Nouveau lieu', el('div', { class: 'stack' },
    el('p', { class: 'where' }, el('span', { 'aria-hidden': 'true' }, '📍'), whereText),
    accWarn,
    el('label', { class: 'field' }, 'Nom', name),
    el('div', {}, el('div', { class: 'legend' }, 'Catégorie'), catSeg),
    el('label', { class: 'field' }, 'Note (facultatif)', note),
    el('div', {}, el('div', { class: 'legend' }, 'État'), doneSeg),
    el('div', {}, el('div', { class: 'legend' }, 'Ma note (facultatif)'), starPicker(stars, (n) => { stars = n; })),
    el('div', { class: 'stack', style: 'gap:8px' }, el('div', { class: 'legend' }, 'Mes listes (facultatif)'), listBox,
      el('div', { class: 'row' }, newList, el('button', { type: 'button', class: 'btn c-add', style: 'flex:none', onclick: createList }, ico('plus'), 'Créer'))),
    el('label', { class: 'item-main check-row' }, coveredBox,
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, 'Abrité de la pluie'), el('span', { class: 'item-sub' }, 'Musée, passage couvert, café avec salle…'))),
    err,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => (existing ? openDetail(existing.id) : closeSheet()) }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, 'Enregistrer')),
  ), { tall: true, name: 'form' });

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
    if (open) { fill(more, ); return; }
    fill(more, 
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn c-add', onclick: () => sharePlace(p) }, ico('share-2'), 'Partager'),
        el('button', { type: 'button', class: 'btn c-add', onclick: () => showQr(p, back) }, ico('qr-code'), 'QR code')),
      el('button', { type: 'button', class: 'btn', onclick: () => findHours(p, back) }, p.hours ? '🕐 Mettre à jour les horaires' : '🕐 Chercher les horaires'),
      p.hours ? el('p', { class: 'help' }, `Horaires OpenStreetMap : ${p.hours}`) : null,
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => startMove(p, back) }, 'Déplacer'),
        el('button', { type: 'button', class: 'btn danger', onclick: askDelete }, 'Supprimer')));
  };
  const showActions = () => {
    fill(more, );
    const moreBtn = el('button', { type: 'button', class: 'btn', 'aria-expanded': 'false', onclick: () => toggleMore(moreBtn) }, '⋯ Plus');
    fill(actions, 
      el('a', { class: 'btn primary go-bar', href: mapsUrl(p, d ?? 1000), target: '_blank', rel: 'noopener' },
        el('span', { 'aria-hidden': 'true' }, '→'), d != null ? `Y aller · ${fmtWalk(d)}` : 'Y aller'),
      el('div', { class: 'row3' },
        el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(p) }, ico('compass'), 'Boussole'),
        el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan(p, back), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
        el('button', { type: 'button', class: 'btn c-add', onclick: () => quickPhoto(p, back), 'aria-label': 'Prendre une photo' }, ico('camera'), 'Photo')),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: `btn ${p.done ? '' : 'c-add'}`, onclick: () => update(() => { setDone(p, !p.done); }) }, p.done ? 'Remettre à faire' : '✓ Déjà visité'),
        el('button', { type: 'button', class: `btn ${p.fav ? '' : 'c-fav'}`, onclick: () => update(() => { p.fav = !p.fav; }) }, p.fav ? ['Retirer ', glyph(state.fav.icon, { filled: true })] : [glyph(state.fav.icon, { filled: true }), ' Favori'])),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => openForm({ lat: p.lat, lng: p.lng, address: p.address }, p) }, 'Modifier'),
        moreBtn),
      more,
      back ? el('button', { type: 'button', class: 'btn', onclick: back }, '← Retour') : null,
    );
  };
  const askDelete = () => fill(actions, 
    el('p', { class: 'warn', role: 'alert' }, `Supprimer « ${p.name} » ? Ce n'est pas annulable.`),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: showActions }, 'Annuler'),
      el('button', { type: 'button', class: 'btn danger solid', onclick: () => {
        for (const ph of p.photos ?? []) deletePhoto(ph).catch(() => {});
        state.points = state.points.filter((x) => x.id !== id);
        persist(); renderMarkers();
        if (back) back(); else closeSheet();
        toast('Lieu supprimé');
      } }, 'Oui, supprimer')),
  );
  showActions();

  openSheet([favMark(p), p.name], el('div', { class: 'stack' },
    el('div', { class: 'detail-top' },
      photoThumb(p, back),
      el('div', { class: 'detail-info' },
        el('div', { class: 'badge' }, catDot(p.cat), catOf(p.cat).name, ' · ', p.done ? 'Déjà visité' : 'À faire'),
        d != null ? el('div', { class: 'badge' }, `${fmtDist(d)} · ${fmtWalk(d)}`) : null,
        p.owner || owners(state.points).length ? el('div', { class: 'badge' }, `👤 Ajouté par ${p.owner || (state.me ? `toi (${state.me})` : 'toi')}`) : null,
        hoursLine(p) ? el('div', { class: `badge hours ${openState(p.hours)?.open ? 'open' : 'closed'}` }, `🕐 ${hoursLine(p)}`) : null,
        stationLine(p) ? el('div', { class: 'badge' }, stationLine(p)) : null,
        (p.lists ?? []).length || p.covered ? el('div', { class: 'badge' }, [p.covered ? 'Abrité' : null, ...(p.lists ?? []).map((id) => state.lists?.find((l) => l.id === id)?.name)].filter(Boolean).join(' · ')) : null,
        el('div', { class: 'badge' }, ageLine(p)))),
    starPicker(p.stars ?? 0, (n) => { p.stars = n; persist(); toast(n ? `Note : ${n} étoile${n > 1 ? 's' : ''} sur 5` : 'Note retirée'); }),
    p.note ? el('p', { class: 'note' }, p.note) : null,
    p.address ? el('p', { class: 'where' }, el('span', { 'aria-hidden': 'true' }, '📍'), p.address) : null,
    actions,
  ), { name: `detail:${id}`, again: () => openDetail(id, back) });
  if (!back) centerOn(p.lat, p.lng, Math.max(map.getZoom(), 16));
}

/* ---------- Photos d'un lieu (gardées sur le téléphone) ---------- */

const photoUrls = new Map(); // id -> adresse locale de l'image, le temps de la session
async function photoUrl(id) {
  if (photoUrls.has(id)) return photoUrls.get(id);
  const blob = await getPhoto(id).catch(() => null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  photoUrls.set(id, url);
  return url;
}
const newPhotoId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/** Vignette de la fiche : la première photo (avec le nombre), ou une case « Ajouter une photo ». */
function photoThumb(p, back) {
  const photos = p.photos ?? [];
  if (!photos.length) return null; // le bouton « 📷 Photo » de la fiche suffit
  const img = el('img', { alt: `Photo de ${p.name}`, class: 'thumb-img' });
  photoUrl(photos[0]).then((u) => { if (u) img.src = u; });
  return el('button', { type: 'button', class: 'thumb', onclick: () => openPhotos(p, back), 'aria-label': `Voir les ${photos.length} photo${photos.length > 1 ? 's' : ''}` },
    img, photos.length > 1 ? el('span', { class: 'thumb-count' }, String(photos.length)) : null);
}

/** Écran des photos d'un lieu : prendre, choisir, voir en grand, supprimer. */
/** Réduit et range les photos choisies dans le lieu. Renvoie le nombre ajouté (0 si rien ou erreur). */
async function savePhotos(p, files) {
  p.photos = p.photos ?? [];
  const list = [...(files ?? [])].slice(0, MAX_PHOTOS - p.photos.length);
  if (!list.length) return 0;
  toast('Enregistrement de la photo…');
  try {
    for (const f of list) {
      const blob = await compressImage(f);
      const id = newPhotoId();
      await putPhoto(id, blob);
      p.photos.push(id);
    }
    persist();
    hideToast();
    toast(list.length > 1 ? `${list.length} photos ajoutées` : 'Photo ajoutée');
    return list.length;
  } catch (e) {
    toast(e.message || 'La photo n\'a pas pu être enregistrée.', true);
    return 0;
  }
}

/** Bouton « Photo » de la fiche : ouvre directement l'appareil photo, puis revient à la fiche. */
function quickPhoto(p, back) {
  if ((p.photos?.length ?? 0) >= MAX_PHOTOS) { openPhotos(p, back); toast(`${MAX_PHOTOS} photos au plus par lieu.`, true); return; }
  const camera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  camera.addEventListener('change', async () => {
    const n = await savePhotos(p, camera.files);
    camera.remove();
    if (n) openDetail(p.id, back);
  });
  document.body.append(camera);
  camera.click();
}

function openPhotos(p, back) {
  p.photos = p.photos ?? [];
  const camera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  const gallery = el('input', { type: 'file', accept: 'image/*', hidden: true, multiple: true });
  const add = async (files) => { if (await savePhotos(p, files)) openPhotos(p, back); };
  camera.addEventListener('change', () => { add(camera.files); camera.value = ''; });
  gallery.addEventListener('change', () => { add(gallery.files); gallery.value = ''; });

  const grid = el('div', { class: 'photo-grid' }, p.photos.map((id, i) => {
    const img = el('img', { alt: `Photo ${i + 1} de ${p.name}` });
    photoUrl(id).then((u) => { if (u) img.src = u; });
    return el('div', { class: 'photo-cell' },
      el('button', { type: 'button', class: 'photo-open', onclick: () => viewPhoto(id, p.name), 'aria-label': `Voir la photo ${i + 1} en grand` }, img),
      el('button', { type: 'button', class: 'photo-del', 'aria-label': `Supprimer la photo ${i + 1}`, onclick: () => askDeletePhoto(p, id, back) }, '✕'));
  }));
  const full = p.photos.length >= MAX_PHOTOS;
  openSheet(`Photos · ${p.name}`, el('div', { class: 'stack' },
    p.photos.length ? grid : el('p', { class: 'help' }, 'Aucune photo pour l\'instant.'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn c-add solid', disabled: full, onclick: () => camera.click() }, ico('camera'), 'Prendre une photo'),
      el('button', { type: 'button', class: 'btn c-add', disabled: full, onclick: () => gallery.click() }, ico('image-plus'), 'Galerie')),
    full ? el('p', { class: 'help' }, `${MAX_PHOTOS} photos au plus par lieu.`) : null,
    el('p', { class: 'help' }, 'Les photos sont réduites et restent sur ton téléphone. Leur position GPS est effacée.'),
    camera, gallery,
    el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, '← Retour à la fiche'),
  ), { name: `photos:${p.id}`, again: () => openPhotos(p, back), tall: true });
}

function askDeletePhoto(p, id, back) {
  openSheet('Supprimer la photo ?', el('div', { class: 'stack' },
    el('p', {}, 'Elle sera effacée de ton téléphone. Ce n\'est pas annulable.'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openPhotos(p, back) }, 'Annuler'),
      el('button', { type: 'button', class: 'btn danger solid', onclick: async () => {
        p.photos = p.photos.filter((x) => x !== id);
        persist();
        await deletePhoto(id).catch(() => {});
        photoUrls.delete(id);
        openPhotos(p, back);
        toast('Photo supprimée');
      } }, 'Oui, supprimer')),
  ), { name: 'photodel' });
}

/** Photo en plein écran ; le retour d'Android ou un appui la ferme. */
async function viewPhoto(id, name) {
  const u = await photoUrl(id);
  if (!u) { toast('Photo introuvable.', true); return; }
  const v = document.getElementById('viewer');
  v.querySelector('img').src = u;
  v.querySelector('img').alt = `Photo de ${name}`;
  v.hidden = false;
  viewerOpen = true;
  history.pushState({ viewer: true }, '');
}
let viewerOpen = false;
function closeViewer(fromHistory = false) {
  if (!viewerOpen) return;
  viewerOpen = false;
  document.getElementById('viewer').hidden = true;
  if (!fromHistory) history.back();
}
document.getElementById('viewer').addEventListener('click', () => closeViewer());
window.addEventListener('popstate', () => { if (viewerOpen) closeViewer(true); });

/** « Ouvert · ferme à 22:30 », « Fermé · ouvre à 19:00 », ou null si horaires inconnus. */
function hoursLine(p) {
  const st = openState(p.hours);
  if (!st) return null;
  if (st.open) return st.until ? `Ouvert · ferme à ${/^(24|00):00$/.test(st.until) ? 'minuit' : st.until.replace(':', 'h')}` : 'Ouvert toute la journée';
  return st.opensAt ? `Fermé · ouvre à ${st.opensAt.replace(':', 'h')}` : 'Fermé pour aujourd\'hui';
}
function hoursTag(p) {
  const st = openState(p.hours);
  if (!st) return null;
  return el('span', { class: `tag ${st.open ? 'open' : 'closed'}` }, st.open ? 'Ouvert' : 'Fermé');
}

/** Chercher dans OpenStreetMap les horaires d'un lieu déjà enregistré (même nom, à moins de 150 m). */
async function findHours(p, back) {
  toast('Recherche des horaires…');
  try {
    const res = await searchPlaces(p.name);
    const hit = res.filter((r) => r.hours && distanceM(r, p) < 150).sort((a, b) => distanceM(a, p) - distanceM(b, p))[0];
    if (!hit) { toast('Horaires introuvables pour ce lieu dans OpenStreetMap.', true); return; }
    p.hours = hit.hours;
    persist();
    openDetail(p.id, back);
    toast('Horaires ajoutés');
  } catch {
    toast('La recherche ne répond pas. Vérifie ta connexion.', true);
  }
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
    const res = searchPoints(visible(), state.categories, input.value, pos);
    info.textContent = !state.points.length
      ? 'Tu n\'as encore aucun lieu.'
      : res.length ? `${plural(res.length, 'lieu', 'lieux')}${pos ? ', du plus proche au plus loin' : ''}` : 'Aucun lieu ne correspond.';
    fill(list, ...res.slice(0, 100).map(({ point: p, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, () => openSearch(input.value)) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, [catOf(p.cat).name, d != null ? fmtDist(d) : null, p.done ? null : 'À faire'].filter(Boolean).join(' · '), p.stars ? ' ' : null, starsText(p.stars)))))));
  };
  const toDirectory = el('button', { type: 'button', class: 'btn', onclick: () => openPlaceSearch(input.value, true) });
  const updateDir = () => {
    const q = input.value.trim();
    toDirectory.hidden = q.length < 3;
    toDirectory.textContent = `🔎 Chercher « ${q} » dans l'annuaire`;
  };
  input.addEventListener('input', () => { run(); updateDir(); });
  run(); updateDir();
  openSheet('Chercher dans mes lieux', el('div', { class: 'stack' }, input, info, list, toDirectory), { tall: true, name: 'search', again: () => openSearch(input.value) });
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
    checkMeteo(fix);
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
  ), { name: 'fallback' });
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
    fill(list, ...res.map((st) => el('li', {}, el('button', { type: 'button', onclick: () => onPick(st) },
      el('span', { class: 'res-title' }, `Ⓜ ${st.n}`),
      el('span', { class: 'res-sub' }, [st.l?.length ? `Ligne${st.l.length > 1 ? 's' : ''} ${st.l.join(', ')}` : '', st.rer?.length ? `RER ${st.rer.join(', ')}` : ''].filter(Boolean).join(' · '))))));
    if (q.length >= 2 && !res.length) fill(list, el('li', { class: 'empty' }, stations.length ? 'Aucune station de ce nom.' : 'Liste des stations pas encore chargée : réessaie dans un instant.'));
  };
  input.addEventListener('input', run);
  openSheet('Choisir une station', el('div', { class: 'stack' }, input, list), { tall: true, name: 'station', again: () => openStationPicker(onPick) });
  input.focus();
}

/** Cercles (rayons en mètres) avec leurs étiquettes, sur un calque. */
function drawRings(layer, lat, lng, radii, label) {
  const c0 = map.latLngToContainerPoint([lat, lng]);
  for (const r of radii) {
    L.circle([lat, lng], { radius: r, color: ink(), weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(layer);
  }
  // Étiquettes en commençant par le plus grand cercle, une sur deux à gauche (ouest),
  // seulement celles qui ont la place, pour qu'elles ne se chevauchent pas.
  const last = { 1: Infinity, [-1]: Infinity };
  [...radii].reverse().forEach((r, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const pos = [lat, lng + side * r / (111195 * Math.cos((lat * Math.PI) / 180))];
    const px = Math.abs(map.latLngToContainerPoint(pos).x - c0.x);
    if (px < 30 || last[side] - px < 46) return;
    last[side] = px;
    L.marker(pos, {
      interactive: false, keyboard: false, zIndexOffset: 2500,
      icon: L.divIcon({ className: '', html: `<span class="ring-label">${label(r)}</span>`, iconSize: [0, 0] }),
    }).addTo(layer);
  });
}

function drawNear() {
  nearLayer.clearLayers();
  const { lat, lng, acc, kind } = origin;
  if (kind !== 'station' && acc > 30) L.circle([lat, lng], { radius: acc, stroke: false, fillColor: '#4c6ef5', fillOpacity: 0.12, interactive: false }).addTo(nearLayer);
  drawRings(nearLayer, lat, lng, nearRings(), ringText);
  if (kind === 'station') {
    L.marker([lat, lng], { interactive: false, keyboard: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'pin-wrap', html: '<span class="metro-pin">M</span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(nearLayer);
  } else {
    meMarker(lat, lng, kind === 'last').addTo(nearLayer);
  }
}

function nearTitle() {
  if (origin.kind === 'station') return `Autour de Ⓜ ${origin.label}`;
  if (origin.kind === 'last') return `Autour de moi (${timeAgoShort(origin.time)})`;
  return following ? 'Autour de moi · en direct' : 'Autour de moi';
}

function renderNear(fit = false) {
  const pts = visible();
  const groups = groupByRings(pts, origin, nearRings());
  const inside = groups.reduce((n, g) => n + g.items.length, 0);
  const farther = pts.length - inside;
  const maxRing = nearRings().at(-1);

  const body = [];
  // Outils pour se déplacer, en haut pour les voir tout de suite
  const tool = (icon, label, onclick, pressed = null, family = 'c-guide') => el('button', {
    type: 'button', class: `tool ${family}${pressed ? ' on' : ''}`, onclick, 'aria-pressed': pressed == null ? null : String(pressed),
  }, el('span', { class: 'tool-ico', 'aria-hidden': 'true' }, typeof icon === 'string' && ICON_NAMES.has(icon) ? ico(icon) : icon), label);
  body.push(el('div', { class: 'tools' },
    origin.kind === 'gps'
      ? tool('radio', following ? 'Suivi actif' : 'Suivre', () => (following ? stopFollow(true) : startFollow()), following)
      : tool('refresh-cw', 'Ma position', openNear),
    tool('hourglass', 'Temps libre', () => openFreeTime()),
    tool('footprints', 'Chemin', () => openWayPicker()),
    tool('route', 'Parcours', () => openRoutePicker()),
    tool('calendar-days', 'Sorties', () => openEvents(), null, 'c-fav'),
    tool('shuffle', 'Surprise', () => surprise(), null, 'c-fav'),
    tool('book-open-text', 'Curiosités', () => openCuriosities(), null, 'c-info'),
    tool('Ⓜ', 'Station', () => openStationPicker(), null, 'c-metro'),
  ));
  body.push(el('div', { class: 'near-bar' },
    origin.kind !== 'station' ? el('button', { type: 'button', class: 'btn where-btn', onclick: openWhereAmI }, ico('locate'), 'Où suis-je ?') : el('button', { type: 'button', class: 'btn where-btn c-metro', onclick: () => openStationPicker() }, 'Ⓜ Autre station'),
    el('div', { class: 'seg unit', role: 'group', 'aria-label': 'Cercles en' },
      ['m', 'min'].map((u) => el('button', { type: 'button', 'aria-pressed': String((inMinutes() ? 'min' : 'm') === u), onclick: () => { state.ringUnit = u; persist(); renderNear(true); } }, u === 'm' ? 'Mètres' : 'Minutes')))));
  if (pts.length) {
    const t = todoSummary(groups);
    const msg = !t.last.n
      ? `Aucun lieu à faire à moins de ${ringText(t.last.ring)}.`
      : t.first.ring === t.last.ring
        ? `${plural(t.last.n, 'lieu', 'lieux')} à faire à moins de ${ringText(t.last.ring)}.`
        : `${plural(t.first.n, 'lieu', 'lieux')} à faire à moins de ${ringText(t.first.ring)}, ${t.last.n} à moins de ${ringText(t.last.ring)}.`;
    body.push(el('p', { class: 'summary' }, msg));
  }
  if (meteo && !meteo.rain && meteo.temp >= 28 && origin.kind !== 'station') {
    body.push(el('div', { class: 'rain heat' }, ico('thermometer-sun'), el('span', {}, `Il fait chaud (${meteo.temp}°).`),
      el('button', { type: 'button', class: 'btn c-guide', onclick: nearestPratique }, 'Lieux frais')));
  }
  if (meteo?.rain && origin.kind !== 'station') {
    const n = pts.filter((p) => p.covered).length;
    body.push(el('div', { class: 'rain' }, ico('cloud-rain'),
      el('span', {}, `Il pleut${meteo.temp != null ? ` (${meteo.temp}°)` : ''}. ${n ? plural(n, 'lieu abrité', 'lieux abrités') : 'Aucun lieu coché « abrité »'}.`),
      n ? el('button', { type: 'button', class: 'btn c-guide', 'aria-pressed': String(filt.covered), onclick: () => { filt.covered = !filt.covered; refresh(); renderNear(); } }, filt.covered ? 'Tout voir' : 'Abrités') : null));
  }
  if (following) {
    body.push(el('p', { class: 'help' }, `🚶 Cette balade : ${walkText(walkSession)} · aujourd'hui : ${walkText(todayWalk())}`));
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
      el('span', {}, from === 0 ? `Moins de ${ringText(g.ring)}` : `De ${ringText(from)} à ${ringText(g.ring)}`),
      el('span', {}, String(g.items.length))));
    body.push(el('ul', { class: 'items' }, g.items.map(({ point: p, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, () => renderNear()) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min `, starsText(p.stars), hoursTag(p), p.done ? null : el('span', { class: 'tag' }, 'À faire')))),
      el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass(p), 'aria-label': `Boussole vers ${p.name}` }, ico('compass')),
      el('a', { class: 'go', href: mapsUrl(p, d), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${p.name}` }, 'Y aller')))));
  }
  if (!inside) {
    const what = [!filterCats.size ? 'lieu' : `lieu « ${[...filterCats].map((id) => catOf(id).name).join(' », « ')} »`, favOnly ? 'favori' : null].filter(Boolean).join(' ');
    body.push(el('p', { class: 'empty' }, state.points.length
      ? `Aucun ${what} à moins de ${ringText(maxRing)}.`
      : 'Tu n\'as encore aucun lieu. Appuie sur « + Ajouter » pour commencer.'));
  }
  if (farther > 0 && inside) {
    body.push(el('p', { class: 'help' }, `${plural(farther, 'autre', 'autres')} plus loin que ${ringText(maxRing)}.`));
  }
  if (inside) body.push(el('p', { class: 'help' }, 'Temps à pied estimés, détours compris. Le trajet exact est dans « Y aller ».'));
  body.push(el('button', { type: 'button', class: 'btn', style: 'margin-top:12px;width:100%', onclick: openNear }, ico('refresh-cw'), 'Actualiser ma position'));
  body.push(el('button', { type: 'button', class: 'btn c-guide', style: 'margin-top:8px;width:100%', onclick: () => openMyParis('near') }, ico('map'), 'Mon Paris : arrondissements explorés'));

  openSheet(nearTitle(), body, { name: 'near', again: () => renderNear() });
  if (fit) {
    const bounds = L.latLng(origin.lat, origin.lng).toBounds(maxRing * 2);
    map.fitBounds(bounds, { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
  }
  drawNear();
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

/* ---------- Compteur de balade (seulement appli ouverte, suivi ou boussole) ---------- */

let walkPrev = null;
let walkSession = 0;
let walkSavedAt = 0;

function countWalk(fix) {
  const today = dayKey();
  if (state.walk?.day !== today) state.walk = { day: today, m: 0 };
  const seg = walkSegment(walkPrev, fix);
  if (fix.acc <= 30) walkPrev = fix;
  if (!seg) return;
  state.walk.m += seg;
  walkSession += seg;
  if (Date.now() - walkSavedAt > 30000) { walkSavedAt = Date.now(); persist(); }
}
function walkText(m) {
  return `${fmtDist(m).replace('à côté', '0 m')} · ≈ ${stepsFor(m).toLocaleString('fr-FR')} pas`;
}
const todayWalk = () => (state.walk?.day === dayKey() ? state.walk.m : 0);

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
  walkPrev = null;
  walkSession = 0;
  signaled.clear();
  for (const p of newlyNear(visible(), origin, signaled, 100)) signaled.add(p.id); // déjà proches : pas d'alerte
  keepScreenOn(true);
  followId = navigator.geolocation.watchPosition((pos) => {
    const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() };
    if (fix.acc > 150) return; // trop imprécis pour suivre
    countWalk(fix);
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
  persist(); // garde le compteur de marche
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
    fill(list, 
      ...mine.map(({ point: p }) => el('li', {}, el('button', { type: 'button', onclick: () => onPick({ lat: p.lat, lng: p.lng, label: p.name }) },
        el('span', { class: 'res-title' }, p.name), el('span', { class: 'res-sub' }, catOf(p.cat).name)))),
      ...sts.map((st) => el('li', {}, el('button', { type: 'button', onclick: () => onPick({ lat: st.lat, lng: st.lng, label: `Ⓜ ${st.n}` }) },
        el('span', { class: 'res-title' }, `Ⓜ ${st.n}`), el('span', { class: 'res-sub' }, 'Station de métro')))),
    );
    if (q && !mine.length && !sts.length) fill(list, el('li', { class: 'empty' }, 'Rien trouvé parmi tes lieux et les stations.'));
  };
  input.addEventListener('input', run);
  openSheet(title, el('div', { class: 'stack' }, el('p', { class: 'help' }, 'Tape le nom d\'un de tes lieux ou d\'une station de métro.'), input, list), { tall: true, name: 'dest', again: () => openDestinationPicker(title, onPick) });
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
  openSheet(`Vers ${dest.label}`, el('div', { class: 'stack' }, body), { tall: true, name: 'way', again: () => renderWay(from, dest) });
  nearLayer.clearLayers();
  L.polyline([[from.lat, from.lng], [dest.lat, dest.lng]], { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
  L.circleMarker([from.lat, from.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#4c6ef5', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  L.circleMarker([dest.lat, dest.lng], { radius: 8, color: '#fff', weight: 3, fillColor: ink(), fillOpacity: 1, interactive: false }).addTo(nearLayer);
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
  openSheet('Parcours du jour', el('div', { class: 'stack' }, info, list, go), { tall: true, name: 'routepick', again: () => openRoutePicker(selected) });
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
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => startGuide(route, 'Parcours') }, ico('navigation'), 'Balade guidée'),
    el('div', { class: 'row' },
      el('a', { class: 'btn', href: routeUrl(route), target: '_blank', rel: 'noopener' }, 'Google Maps'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => shareRoute(route, 'Mon parcours') }, ico('share-2'), 'Partager')),
    el('button', { type: 'button', class: 'btn', onclick: () => openRoutePicker(new Set(chosen.map((p) => p.id))) }, 'Changer les lieux'),
  ), { tall: true, name: 'route', again: () => renderRoute(start, chosen) });
  nearLayer.clearLayers();
  const line = [...(start ? [start] : []), ...route].map((p) => [p.lat, p.lng]);
  L.polyline(line, { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
  route.forEach((p, i) => L.marker([p.lat, p.lng], { interactive: false, keyboard: false, zIndexOffset: 1000,
    icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }) }).addTo(nearLayer));
  map.fitBounds(L.latLngBounds(line).pad(0.2), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
}

/* ---------- Partager un lieu par un lien (tout est dans le #, rien ne passe par un serveur) ---------- */

async function sharePlace(p) {
  const c = catOf(p.cat);
  const url = placeLink(location.href, p, c.name, c.icon);
  const text = `${p.name}${p.address ? ` — ${p.address}` : ''}`;
  try {
    if (navigator.share) { await navigator.share({ title: p.name, text, url }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Lien copié : colle-le dans un message.'); } catch { prompt('Copie ce lien :', url); }
}

/** Un lien reçu : on montre le lieu et on propose de l'ajouter (catégorie du même nom si elle existe). */
function receivePlace(r) {
  const cat = state.categories.find((c) => fold(c.name) === fold(r.catName))?.id;
  openForm({ name: r.name, lat: r.lat, lng: r.lng, address: r.address, hours: r.hours, note: r.note, stars: r.stars, cat, acc: null });
  toast('Lieu reçu par un lien : vérifie et enregistre.');
}

/* ---------- Import des lieux Google Maps (Google Takeout) ---------- */

function openGoogleImport() {
  const file = el('input', { type: 'file', accept: '.json,.csv,.geojson,application/json,text/csv', hidden: true });
  file.addEventListener('change', async () => {
    const f = file.files?.[0]; file.value = '';
    if (!f) return;
    try { previewGoogleImport(parseTakeout(await f.text(), f.name)); } catch (e) { toast(e.message || 'Fichier illisible.', true); }
  });
  openSheet([ico('download'), ' Importer de Google Maps'], el('div', { class: 'stack' },
    el('ol', { class: 'steps' },
      el('li', {}, 'Sur takeout.google.com, clique « Tout désélectionner », puis coche « Enregistré » (tes listes) et « Maps (vos adresses) » (tes étoiles).'),
      el('li', {}, 'Exporte, puis ouvre le fichier .zip reçu sur ton téléphone.'),
      el('li', {}, 'Ici, choisis « Saved Places.json » ou une liste en .csv (par exemple « Envie d\'y aller.csv »).')),
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => file.click() }, ico('download'), 'Choisir le fichier'),
    el('p', { class: 'help' }, 'Les listes en .csv n\'ont pas de position : l\'appli cherche chaque lieu par son nom dans l\'annuaire OpenStreetMap, un par seconde. Vérifie ensuite ceux marqués « à vérifier ».'),
    file,
    el('button', { type: 'button', class: 'btn', onclick: () => openSettings('sauvegarde') }, '← Sauvegarde et partage'),
  ), { tall: true, name: 'gimport', again: openGoogleImport });
}

const inRegion = (x) => x.lat > 48.1 && x.lat < 49.3 && x.lng > 1.4 && x.lng < 3.6;
function previewGoogleImport({ list, items }) {
  let cat = state.categories[0].id;
  let makeList = Boolean(list);
  const located = items.filter((x) => x.lat != null);
  const toFind = items.filter((x) => x.lat == null).slice(0, 100);
  const outside = located.filter((x) => !inRegion(x)).length;
  const catSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Catégorie' });
  const drawCats = () => fill(catSeg, ...state.categories.map((c) => el('button', { type: 'button', 'aria-pressed': String(c.id === cat), onclick: () => { cat = c.id; drawCats(); } }, catDot(c.id), c.name)));
  drawCats();
  const listBox = el('input', { type: 'checkbox', class: 'check', checked: makeList });
  listBox.addEventListener('change', () => { makeList = listBox.checked; });
  openSheet([ico('download'), ' Importer de Google Maps'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${plural(items.length, 'lieu trouvé', 'lieux trouvés')}${list ? ` dans « ${list} »` : ''}.`),
    el('p', { class: 'help' }, [located.length - outside ? `${located.length - outside} avec leur position.` : null, toFind.length ? `${toFind.length} à chercher par leur nom (environ ${Math.ceil(toFind.length * 1.1 / 60)} min).` : null, outside ? `${outside} hors de l'Île-de-France, ignorés.` : null].filter(Boolean).join(' ')),
    el('div', {}, el('div', { class: 'legend' }, 'Ranger dans la catégorie'), catSeg),
    list ? el('label', { class: 'item-main check-row' }, listBox, el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, `Créer la liste « ${list} »`), el('span', { class: 'item-sub' }, 'Pour les retrouver ensemble avec le bouton Filtres'))) : null,
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => runGoogleImport([...located.filter(inRegion), ...toFind].slice(0, 500), cat, makeList ? list : '') }, ico('download'), 'Importer'),
    el('button', { type: 'button', class: 'btn', onclick: openGoogleImport }, 'Choisir un autre fichier'),
  ), { tall: true, name: 'gimport2' });
}

let importStop = false;
async function runGoogleImport(items, cat, listName) {
  let listId = null;
  if (listName) { const r = addList(state, listName); state = r.state; listId = r.id; }
  let added = 0; let dup = 0; let notFound = 0; let i = 0;
  importStop = false;
  const status = el('p', { class: 'summary', role: 'status' }, 'Import…');
  openSheet([ico('download'), ' Import en cours'], el('div', { class: 'stack' }, status,
    el('button', { type: 'button', class: 'btn', onclick: () => { importStop = true; } }, 'Arrêter (garder ceux déjà ajoutés)')), { name: 'gimport3' });
  for (const it of items) {
    if (importStop) break;
    i++;
    let { lat, lng } = it; let rough = false; let address = it.address;
    if (lat == null) {
      status.textContent = `Recherche ${i}/${items.length} : ${it.name}…`;
      try {
        const res = await searchPlaces([it.name, it.address].filter(Boolean).join(' '));
        const hit = res.find(inRegion);
        if (!hit) { notFound++; continue; }
        ({ lat, lng } = hit); address = address || hit.address; rough = true;
      } catch { notFound++; continue; }
    } else status.textContent = `Ajout ${i}/${items.length}…`;
    if (findDuplicate(state.points, { name: it.name, lat, lng })) { dup++; continue; }
    const p = newPoint({ name: it.name || it.address, cat, note: [it.note, rough ? 'Position trouvée par le nom : à vérifier.' : ''].filter(Boolean).join(' '), lat, lng, address, lists: listId ? [listId] : [] });
    p.arr = arrFromText(address);
    state.points.push(p);
    added++;
    if (added % 10 === 0) { persist(); renderMarkers(); }
  }
  persist(); refresh();
  openSheet([ico('download'), ' Import terminé'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${plural(added, 'lieu ajouté', 'lieux ajoutés')}.`),
    el('p', { class: 'help' }, [dup ? `${plural(dup, 'déjà présent', 'déjà présents')} (non ajoutés).` : null, notFound ? `${plural(notFound, 'introuvable', 'introuvables')} dans l'annuaire.` : null, importStop ? 'Import arrêté avant la fin.' : null].filter(Boolean).join(' ') || 'Tout est passé.'),
    listId ? el('button', { type: 'button', class: 'btn c-guide', onclick: () => { filt.lists = new Set([listId]); refresh(); closeSheet(); } }, ico('list'), `Voir la liste « ${listName} »`) : null,
    el('button', { type: 'button', class: 'btn', onclick: closeSheet }, 'Fermer'),
  ), { name: 'gimport4' });
  if (added) setTimeout(remindBackup, 1500);
}

/* ---------- Vélib' en temps réel ---------- */

const VELIB_KEY = 'carte-paris.velib';
let velibNeed = 'bike';
async function velibStations() {
  let info = null;
  try { const c = JSON.parse(localStorage.getItem(VELIB_KEY) ?? 'null'); if (c && Date.now() - c.t < 7 * 864e5) info = c.info; } catch { /* rien */ }
  const statusP = fetch(VELIB_STATUS).then((r) => r.json());
  if (!info) {
    const full = await (await fetch(VELIB_INFO)).json();
    info = { data: { stations: (full?.data?.stations ?? []).map((s) => ({ station_id: s.station_id, name: s.name, lat: s.lat, lon: s.lon })) } };
    try { localStorage.setItem(VELIB_KEY, JSON.stringify({ t: Date.now(), info })); } catch { /* stockage plein : tant pis */ }
  }
  return mergeVelib(info, await statusP);
}

async function showVelib(at = null) {
  toast('Recherche des Vélib\'…');
  let from = at;
  try {
    if (!from) from = freshHere() ?? await locate();
  } catch (e) { toast(e.message, true); return; }
  let stations;
  try { stations = await velibStations(); } catch { toast('Les données Vélib\' ne répondent pas. Réessaie dans un moment.', true); return; }
  hideToast();
  const list = nearestVelib(stations, from, velibNeed, 3);
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Je cherche' },
    el('button', { type: 'button', 'aria-pressed': String(velibNeed === 'bike'), onclick: () => { velibNeed = 'bike'; showVelib(from); } }, ico('bike'), ' Un vélo'),
    el('button', { type: 'button', 'aria-pressed': String(velibNeed === 'dock'), onclick: () => { velibNeed = 'dock'; showVelib(from); } }, ico('square-parking'), ' Une place'));
  openSheet([ico('bike'), ' Vélib\''], el('div', { class: 'stack' }, seg,
    list.length ? el('ul', { class: 'items' }, list.map((s) => el('li', { class: 'item' },
      el('div', { class: 'item-main' }, el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('bike', { size: 18 })),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, s.name),
          el('span', { class: 'item-sub' }, `${fmtDist(s.d)} · ${walkMinutes(s.d)} min · `,
            velibNeed === 'bike' ? `${plural(s.bikes, 'vélo', 'vélos')} (${s.mech} méca., ${s.ebike} élec.)` : plural(s.docks, 'place libre', 'places libres')))),
      el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: s.name, lat: s.lat, lng: s.lng }), 'aria-label': `Boussole vers ${s.name}` }, ico('compass')),
      el('a', { class: 'go', href: mapsUrl(s, s.d), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${s.name}` }, 'Y aller'))))
      : el('p', { class: 'empty' }, 'Aucune station disponible trouvée.'),
    el('p', { class: 'help' }, 'Données Vélib\' Métropole en temps réel, à quelques minutes près.'),
  ), { name: 'velib', again: () => showVelib(from) });
  nearLayer.clearLayers();
  meMarker(from.lat, from.lng).addTo(nearLayer);
  for (const s of list) L.circleMarker([s.lat, s.lng], { radius: 8, color: '#0b6f80', weight: 3, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  if (list.length) map.fitBounds(L.latLngBounds([[from.lat, from.lng], ...list.map((s) => [s.lat, s.lng])]).pad(0.4), { paddingTopLeft: [10, 60], paddingBottomRight: [70, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
}

/* ---------- Mon Paris : les arrondissements explorés ---------- */

let arrBusy = false;
async function findArrondissements() {
  if (arrBusy) return;
  arrBusy = true;
  let changed = false;
  for (const p of state.points) {
    if (p.arr) continue;
    const a = arrFromText(p.address);
    if (a) { p.arr = a; changed = true; }
  }
  // Les autres : demander l'adresse officielle (IGN), 20 au plus à la fois
  const todo = state.points.filter((p) => !p.arr && p.lat > 48.81 && p.lat < 48.91 && p.lng > 2.22 && p.lng < 2.47).slice(0, 20);
  for (const p of todo) {
    try { const r = await reverseInfo(p.lat, p.lng); const a = arrFromCitycode(r?.citycode) ?? arrFromText(r?.label); if (a) { p.arr = a; changed = true; } } catch { break; }
  }
  arrBusy = false;
  if (changed) { persist(); if (view === 'myparis') openMyParis(); }
}

let myParisBack = 'settings';
function openMyParis(from = null) {
  if (from) myParisBack = from;
  const by = new Map();
  for (const p of state.points) {
    if (!p.arr) continue;
    const e = by.get(p.arr) ?? { done: 0, all: 0 };
    e.all++; if (p.done) e.done++;
    by.set(p.arr, e);
  }
  const explored = [...by.values()].filter((e) => e.done).length;
  const unknown = state.points.filter((p) => !p.arr).length;
  const ord = (n) => (n === 1 ? '1er' : `${n}e`);
  const tiles = Object.entries(ARR_GRID).map(([n, [c, r]]) => {
    const e = by.get(Number(n)) ?? { done: 0, all: 0 };
    const level = e.done >= 5 ? 3 : e.done >= 2 ? 2 : e.done ? 1 : 0;
    return el('div', { class: `arr l${level}`, style: `grid-column:${c + 1};grid-row:${r + 1}`, role: 'img', 'aria-label': `${ord(Number(n))} : ${e.done} visité${e.done > 1 ? 's' : ''} sur ${e.all}` },
      el('b', {}, ord(Number(n))), el('span', {}, e.all ? `${e.done}/${e.all}` : '–'));
  });
  openSheet([ico('map'), ' Mon Paris'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${explored} arrondissement${explored > 1 ? 's' : ''} sur 20 où tu as visité au moins un lieu.`),
    el('div', { class: 'arr-grid' }, tiles),
    el('div', { class: 'arr-legend', 'aria-hidden': 'true' }, el('span', { class: 'arr l0' }), ' aucun', el('span', { class: 'arr l1' }), ' 1', el('span', { class: 'arr l2' }), ' 2 à 4', el('span', { class: 'arr l3' }), ' 5 et +'),
    el('p', { class: 'help' }, `Chaque case : lieux visités / lieux enregistrés. Plan schématique, à peu près à la place de chaque arrondissement.${unknown ? ` ${plural(unknown, 'lieu', 'lieux')} sans arrondissement connu (hors Paris ou en cours de recherche).` : ''}`),
    el('p', { class: 'help' }, `Marche aujourd'hui : ${walkText(todayWalk())}.`),
    myParisBack === 'near' && origin
      ? el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')
      : el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages'),
  ), { tall: true, name: 'myparis', again: openMyParis });
  findArrondissements();
}

/* ---------- Balade guidée : la boussole t'emmène d'étape en étape ---------- */

let guide = null; // { stops, i, title }
function startGuide(stops, title = 'Balade') {
  if (!stops.length) return;
  const go = () => {
    guide = { stops, i: 0, title };
    openCompass(stops[0], { label: `Étape 1 sur ${stops.length}`, last: stops.length === 1 });
    speak(`${title}. ${plural(stops.length, 'étape', 'étapes')}. Première étape : ${stops[0].name}.`);
  };
  closeSheetThen(go);
}
function guideNext() {
  if (!guide) return;
  if (guide.i >= guide.stops.length - 1) { guide = null; closeCompass(); toast('Balade terminée. Bravo !'); return; }
  guide.i++;
  const p = guide.stops[guide.i];
  compassStop?.();
  openCompass(p, { label: `Étape ${guide.i + 1} sur ${guide.stops.length}`, last: guide.i === guide.stops.length - 1, replace: true });
  speak(`Étape suivante : ${p.name}.`);
}

/* ---------- Partager une balade, rejoindre quelqu'un ---------- */

async function shareLink(title, text, url) {
  try { if (navigator.share) { await navigator.share({ title, text, url }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Lien copié : colle-le dans un message.'); } catch { prompt('Copie ce lien :', url); }
}
const shareRoute = (stops, title) => shareLink(title, `${title} : ${stops.map((s) => s.name).join(', ')}`, routeLink(location.href, stops, title));

/** Une balade reçue par lien : les étapes, la balade guidée, Google Maps, et ajouter ce qui manque. */
function receiveRoute(r) {
  const missing = r.stops.filter((s) => !findDuplicate(state.points, s));
  openSheet([ico('route'), ' Balade reçue'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${r.title || 'Balade'} · ${plural(r.stops.length, 'étape', 'étapes')}`),
    el('ol', { class: 'items' }, r.stops.map((s, i) => el('li', { class: 'item' }, el('span', { class: 'item-main' },
      el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)), el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, s.name)))))),
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => startGuide(r.stops, r.title || 'Balade') }, ico('navigation'), 'Balade guidée'),
    el('a', { class: 'btn', href: routeUrl(r.stops), target: '_blank', rel: 'noopener' }, 'Ouvrir dans Google Maps'),
    missing.length ? el('button', { type: 'button', class: 'btn c-add', onclick: () => {
      for (const s of missing) state.points.push(newPoint({ name: s.name, cat: state.categories[0].id, lat: s.lat, lng: s.lng, note: 'Reçu dans une balade partagée.' }));
      persist(); refresh(); toast(`${plural(missing.length, 'lieu ajouté', 'lieux ajoutés')} à ta carte`); receiveRoute(r);
    } }, ico('plus'), `Ajouter ${plural(missing.length, 'lieu', 'lieux')} à ma carte`) : el('p', { class: 'help' }, 'Toutes les étapes sont déjà sur ta carte.'),
  ), { tall: true, name: 'route-in' });
  nearLayer.clearLayers();
  L.polyline(r.stops.map((s) => [s.lat, s.lng]), { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
  r.stops.forEach((s, i) => L.marker([s.lat, s.lng], { interactive: false, keyboard: false, zIndexOffset: 1000,
    icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }) }).addTo(nearLayer));
  map.fitBounds(L.latLngBounds(r.stops.map((s) => [s.lat, s.lng])).pad(0.3), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
}

/** Quelqu'un t'a envoyé où il est : la boussole t'y emmène. */
function receiveMeet(m) {
  const ago = m.time ? Math.round((Date.now() - m.time) / 60000) : null;
  const target = { name: m.name ? `${m.name}` : 'Point de rendez-vous', lat: m.lat, lng: m.lng };
  openSheet([ico('send'), ' Rejoindre'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${m.name || 'Quelqu\'un'} t'attend ici${ago != null && ago >= 0 ? ` (position envoyée il y a ${ago < 1 ? 'moins d\'une minute' : ago < 120 ? `${ago} min` : `${Math.round(ago / 60)} h`})` : ''}.`),
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => closeSheetThen(() => openCompass(target)) }, ico('compass'), 'Y aller avec la boussole'),
    el('a', { class: 'btn', href: mapsUrl(target, 1000), target: '_blank', rel: 'noopener' }, 'Ouvrir dans Google Maps'),
    el('p', { class: 'help' }, 'La position a été envoyée une seule fois : elle ne bouge pas si la personne se déplace.'),
  ), { name: 'meet' });
  nearLayer.clearLayers();
  L.circleMarker([m.lat, m.lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#c2255c', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  centerOn(m.lat, m.lng, 17);
}

/* ---------- Où suis-je ? ---------- */

async function openWhereAmI() {
  let at = freshHere();
  if (!at) { toast('Recherche de ta position…'); try { at = await locate(); hideToast(); } catch (e) { toast(e.message, true); return; } }
  await stationsReady;
  const near = nearestStation(stations, at);
  const body = el('div', { class: 'stack' });
  const addr = el('p', { class: 'where-big' }, 'Recherche de l\'adresse…');
  const arrLine = el('p', { class: 'help' }, '');
  fill(body,
    addr, arrLine,
    near ? el('p', { class: 'badge' }, `Ⓜ ${near.station.n}${near.station.l?.length ? ` (${near.station.l.join(', ')})` : ''} · ${fmtWalk(near.d)}`) : null,
    el('p', { class: 'help' }, `Précision : environ ${Math.round(at.acc ?? 0)} m · ${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`),
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => shareLink('Où je suis', `Je suis ici${state.me ? ` (${state.me})` : ''} : `, meetLink(location.href, at, state.me)) }, ico('send'), 'Envoyer ma position à quelqu\'un'),
    el('button', { type: 'button', class: 'btn c-add', onclick: () => addAt(at.lat, at.lng, at.acc) }, ico('plus'), 'Enregistrer ce lieu'),
    el('p', { class: 'help' }, 'Ta position n\'est envoyée qu\'une fois, dans le lien, à la personne que tu choisis. L\'adresse vient de l\'IGN.'),
  );
  openSheet([ico('locate'), ' Où suis-je ?'], body, { name: 'where', again: openWhereAmI });
  try {
    const r = await reverseInfo(at.lat, at.lng);
    const a = arrFromCitycode(r?.citycode) ?? arrFromText(r?.label);
    addr.textContent = r?.label ?? 'Adresse introuvable';
    arrLine.textContent = a ? `${a === 1 ? '1er' : `${a}e`} arrondissement` : '';
  } catch { addr.textContent = 'Adresse indisponible (pas de connexion).'; }
}

/* ---------- Ce soir près de moi : agenda « Que faire à Paris ? » ---------- */

let eventsCache = null; // { day, items }
async function openEvents() {
  if (!origin) { openNear(); return; }
  const day = new Date().toDateString();
  if (!eventsCache || eventsCache.day !== day) {
    openSheet([ico('calendar-days'), ' Sorties du jour'], el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris…'), { name: 'events' });
    try {
      const r = await fetch(eventsUrl());
      if (!r.ok) throw new Error(String(r.status));
      eventsCache = { day, items: parseEvents(await r.json()) };
    } catch {
      openSheet([ico('calendar-days'), ' Sorties du jour'], el('div', { class: 'stack' },
        el('p', { class: 'warn' }, 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'),
        el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')), { name: 'events' });
      return;
    }
  }
  const list = nearbyEvents(eventsCache.items, origin, 2000).slice(0, 25);
  openSheet([ico('calendar-days'), ' Sorties du jour'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, list.length ? `${plural(list.length, 'sortie', 'sorties')} aujourd'hui à moins de 2 km.` : 'Aucune sortie trouvée aujourd\'hui à moins de 2 km.'),
    el('ul', { class: 'items' }, list.map((e) => el('li', { class: 'item' },
      el(e.url ? 'a' : 'span', { class: 'item-main', ...(e.url ? { href: e.url, target: '_blank', rel: 'noopener' } : {}) },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('calendar-days', { size: 18 })),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, e.title),
          el('span', { class: 'item-sub' }, [whenText(e), e.place, `${fmtDist(e.d)} · ${walkMinutes(e.d)} min`].filter(Boolean).join(' · '), e.free ? el('span', { class: 'tag open' }, 'Gratuit') : null))),
      el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: e.title, lat: e.lat, lng: e.lng }), 'aria-label': `Boussole vers ${e.title}` }, ico('compass'))))),
    el('p', { class: 'help' }, 'Source : « Que faire à Paris ? », Ville de Paris. Ta position n\'est pas envoyée : l\'appli trie sur le téléphone.'),
    el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'),
  ), { tall: true, name: 'events', again: openEvents });
  nearLayer.clearLayers();
  meMarker(origin.lat, origin.lng).addTo(nearLayer);
  for (const e of list) L.circleMarker([e.lat, e.lng], { radius: 6, color: '#c2255c', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
}

/* ---------- Ajouter un lieu depuis une photo (position lue dans la photo, sur le téléphone) ---------- */

function addFromPhoto() {
  const input = el('input', { type: 'file', accept: 'image/jpeg,image/*', hidden: true });
  input.addEventListener('change', async () => {
    const f = input.files?.[0]; input.remove();
    if (!f) return;
    let g = null;
    try { g = gpsFromJpeg(await f.slice(0, 256 * 1024).arrayBuffer()); } catch { g = null; }
    if (!g) { toast('Cette photo ne contient pas de position. Active « Position » dans l\'appareil photo, ou place le lieu sur la carte.', true); return; }
    const draft = { lat: g.lat, lng: g.lng, address: '', acc: null, photoFile: f };
    centerOn(g.lat, g.lng, 17);
    openForm(draft);
    reverseAddress(g.lat, g.lng).then((label) => { if (label && draft.onAddress) draft.onAddress(label); });
  });
  document.body.append(input);
  input.click();
}

/* ---------- QR code d'un lieu, à montrer à quelqu'un à côté de toi ---------- */

function showQr(p, back) {
  const c = catOf(p.cat);
  const url = placeLink(location.href, p, c.name, c.icon);
  const q = qrcode(0, 'M'); q.addData(url); q.make();
  const box = el('div', { class: 'qr-box', role: 'img', 'aria-label': `QR code du lieu ${p.name}` });
  box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  openSheet([ico('qr-code'), ' QR code'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, p.name), box,
    el('p', { class: 'help' }, 'Ton ami le scanne avec l\'appareil photo : le lieu s\'ouvre, prêt à être ajouté à sa carte.'),
    el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, '← Fiche'),
  ), { name: 'qr' });
}

/* ---------- Rentrer : mes stations (personnelles, comme mes lieux) ---------- */

const stationByName = (n) => stations.find((s) => s.n === n);
async function goHome() {
  await stationsReady;
  const mine = (state.myStations ?? []).map((s) => ({ ...s, st: stationByName(s.station) })).filter((s) => s.st);
  if (!mine.length) { pickMyStation(true); return; }
  if (mine.length === 1) { showMetroPlan({ name: `${mine[0].label} (${mine[0].st.n})`, lat: mine[0].st.lat, lng: mine[0].st.lng }); return; }
  openSheet([ico('house'), ' Rentrer'], el('div', { class: 'menu' }, mine.map((s) => el('button', { type: 'button', class: 'menu-row c-metro', onclick: () => showMetroPlan({ name: `${s.label} (${s.st.n})`, lat: s.st.lat, lng: s.st.lng }) },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('house')),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, s.label), el('span', { class: 'menu-sub' }, `Ⓜ ${s.st.n}`)),
    el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›')))), { name: 'home' });
}
function pickMyStation(thenGo = false) {
  openStationPicker((st) => {
    const label = prompt(`Nom pour la station ${st.n} (ex. Maison, Travail)`, (state.myStations ?? []).length ? 'Travail' : 'Maison');
    if (label == null) return;
    state = addMyStation(state, st.n, label || 'Ma station'); persist();
    toast(`${label || 'Ma station'} : ${st.n}`);
    if (thenGo) goHome(); else openMyStations();
  });
  toast('Choisis ta station (Maison, Travail…)');
}
function openMyStations() {
  const mine = state.myStations ?? [];
  openSheet([ico('house'), ' Mes stations'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Tes stations à toi (Maison, Travail…). Le bouton Maison sur la carte te dit quel métro prendre pour y aller. Elles partent dans ta sauvegarde, pas dans les lieux partagés.'),
    mine.length ? el('div', {}, mine.map((s) => el('div', { class: 'cat-row' },
      el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('house', { size: 18 })),
      el('span', { class: 'cat-name' }, s.label, el('br'), el('span', { class: 'cat-count' }, `Ⓜ ${s.station}`)),
      el('button', { type: 'button', class: 'btn danger move', 'aria-label': `Retirer ${s.label}`, onclick: () => { state = removeMyStation(state, s.id); persist(); openMyStations(); } }, ico('x'))))) : null,
    el('button', { type: 'button', class: 'btn c-metro', onclick: () => pickMyStation(false) }, ico('plus'), 'Ajouter une station'),
    el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages'),
  ), { tall: true, name: 'mystations', again: openMyStations });
}

/* ---------- Météo (Open-Meteo, position arrondie, une fois par demi-heure au plus) ---------- */

let meteo = null;
let meteoAt = 0;
async function checkMeteo(at) {
  if (Date.now() - meteoAt < 30 * 60 * 1000 || !navigator.onLine) return;
  meteoAt = Date.now();
  try {
    const r = await fetch(meteoUrl(at?.lat, at?.lng));
    const m = readMeteo(await r.json());
    if (m) { const changed = m.rain !== meteo?.rain; meteo = m; if (changed && view === 'near') renderNear(); }
  } catch { /* hors ligne : pas d'alerte pluie */ }
}

/* ---------- Temps libre : une boucle qui revient au point de départ ---------- */

let freeMin = 60;
let freeDwell = 15;
function openFreeTime() {
  if (!origin) { openNear(); return; }
  const todo = visible().filter((p) => !p.done);
  // Ouvert à l'heure d'arrivée ? (horaires inconnus : on garde)
  const isOpen = (p, t) => { const st = openState(p.hours, new Date(Date.now() + t * 60000)); return st ? st.open : null; };
  const plan = planLoopOpen(origin, todo, freeMin, isOpen, { dwell: freeDwell });
  const choice = (vals, cur, fmt, set) => el('div', { class: 'seg', role: 'group' }, vals.map((v) => el('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => { set(v); openFreeTime(); } }, fmt(v))));
  let prev = origin;
  const steps = plan.route.map((p, i) => {
    const leg = distanceM(prev, p); prev = p;
    return el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, openFreeTime) },
      el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, favMark(p), p.name),
        el('span', { class: 'item-sub' }, `${fmtWalk(leg)} `, starsText(p.stars), hoursTag(p)))));
  });
  openSheet([ico('hourglass'), ' Temps libre'], el('div', { class: 'stack' },
    el('div', {}, el('div', { class: 'legend' }, 'J\'ai devant moi'), choice([30, 60, 90, 120, 180], freeMin, (v) => (v < 60 ? `${v} min` : `${v / 60} h`.replace('.5', ' h 30').replace(' h h', ' h')), (v) => { freeMin = v; })),
    el('div', {}, el('div', { class: 'legend' }, 'Temps sur place, par lieu'), choice([5, 15, 30], freeDwell, (v) => `${v} min`, (v) => { freeDwell = v; })),
    plan.route.length
      ? el('p', { class: 'summary' }, `${plural(plan.route.length, 'lieu', 'lieux')} à faire, retour au départ : ${plan.walk} min de marche + ${plan.route.length * freeDwell} min sur place = ${plan.total} min.`)
      : el('p', { class: 'empty' }, todo.length ? 'Aucun lieu à faire assez proche pour ce temps. Essaie plus long ou moins de temps sur place.' : 'Aucun lieu « à faire » avec les filtres actuels.'),
    plan.route.length ? el('ol', { class: 'items' }, steps) : null,
    plan.closed ? el('p', { class: 'help' }, `${plural(plan.closed, 'lieu écarté', 'lieux écartés')} : fermé${plan.closed > 1 ? 's' : ''} à ton arrivée.`) : null,
    plan.route.length ? el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => startGuide([...plan.route, { name: 'Retour au départ', lat: origin.lat, lng: origin.lng }], 'Temps libre') }, ico('navigation'), 'Balade guidée') : null,
    plan.route.length ? el('div', { class: 'row' },
      el('a', { class: 'btn', href: loopUrl(origin, plan.route), target: '_blank', rel: 'noopener' }, 'Google Maps'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => shareRoute(plan.route, 'Ma balade') }, ico('share-2'), 'Partager')) : null,
    el('p', { class: 'help' }, 'Les lieux les mieux notés et les favoris passent en priorité. Les filtres en haut s\'appliquent.'),
    el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'),
  ), { tall: true, name: 'freetime', again: openFreeTime });
  nearLayer.clearLayers();
  meMarker(origin.lat, origin.lng).addTo(nearLayer);
  if (plan.route.length) {
    const line = [origin, ...plan.route, origin].map((p) => [p.lat, p.lng]);
    L.polyline(line, { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
    plan.route.forEach((p, i) => L.marker([p.lat, p.lng], { interactive: false, keyboard: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }) }).addTo(nearLayer));
    map.fitBounds(L.latLngBounds(line).pad(0.2), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
  }
}

/* ---------- Surprends-moi : un lieu à faire au hasard, à moins de 15 min ---------- */

function surprise() {
  if (!origin) { openNear(); return; }
  const max = minutesToMeters(15);
  const pool = visible().filter((p) => !p.done && distanceM(origin, p) <= max);
  if (!pool.length) { toast('Aucun lieu à faire à moins de 15 min (avec les filtres actuels).', true); return; }
  const p = pool[Math.floor(Math.random() * pool.length)];
  openDetail(p.id, () => renderNear());
  toast(`Surprise : ${p.name}, à ${walkMinutes(distanceM(origin, p))} min à pied`);
}

/* ---------- Curiosités : articles Wikipédia autour (position arrondie à 100 m environ) ---------- */

const wikiCache = new Map();
async function openCuriosities() {
  if (!origin) { openNear(); return; }
  const key = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`;
  let list = wikiCache.get(key);
  if (!list) {
    openSheet([ico('book-open-text'), ' Curiosités'], el('p', { class: 'help' }, 'Recherche dans Wikipédia…'), { name: 'wiki' });
    try {
      const r = await fetch(wikiUrl(origin.lat, origin.lng, 1000));
      list = parseWiki(await r.json());
      wikiCache.set(key, list);
    } catch {
      openSheet([ico('book-open-text'), ' Curiosités'], el('div', { class: 'stack' },
        el('p', { class: 'warn' }, 'Wikipédia ne répond pas. Vérifie ta connexion.'),
        el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')), { name: 'wiki' });
      return;
    }
  }
  const items = list.map((w) => ({ ...w, d: distanceM(origin, w) })).sort((a, b) => a.d - b.d);
  const have = (w) => findDuplicate(state.points, { name: w.title, lat: w.lat, lng: w.lng });
  openSheet([ico('book-open-text'), ' Curiosités'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `${plural(items.length, 'article', 'articles')} Wikipédia à moins de 1 km : monuments, rues, histoire. « + » pour en faire un lieu.`),
    el('ul', { class: 'items' }, items.map((w) => el('li', { class: 'item' },
      el('a', { class: 'item-main', href: wikiPage(w.title), target: '_blank', rel: 'noopener' },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('book-open-text', { size: 18 })),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, w.title), el('span', { class: 'item-sub' }, `${fmtDist(w.d)} · ${walkMinutes(w.d)} min · lire l'article`))),
      have(w) ? el('span', { class: 'tag' }, 'Déjà là')
        : el('button', { type: 'button', class: 'go-compass add', 'aria-label': `Ajouter ${w.title} à ma carte`, onclick: () => openForm({ name: w.title, lat: w.lat, lng: w.lng, acc: null }) }, ico('plus'))))),
    el('p', { class: 'help' }, 'Source : Wikipédia (CC BY-SA). Seule une position arrondie à 100 m est envoyée.'),
    el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'),
  ), { tall: true, name: 'wiki', again: openCuriosities });
  nearLayer.clearLayers();
  meMarker(origin.lat, origin.lng).addTo(nearLayer);
  for (const w of items) L.circleMarker([w.lat, w.lng], { radius: 6, color: '#5f3dc4', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
}

/* ---------- Boussole « Vers ce lieu » ---------- */

let compassOpen = false;
let compassStop = null;
const compassEl = document.getElementById('compass');

function openCompass(p, step = null) {
  if (compassOpen) return;
  compassOpen = true;
  if (!step) guide = null;
  const gbar = compassEl.querySelector('.compass-guide');
  gbar.hidden = !step;
  if (step) {
    gbar.querySelector('.compass-step').textContent = step.label;
    gbar.querySelector('.compass-next').textContent = step.last ? 'Terminer la balade ✓' : 'Étape suivante →';
  }
  let pos = freshHere();
  let heading = null;
  const arrow = compassEl.querySelector('.compass-arrow');
  const dist = compassEl.querySelector('.compass-dist');
  const hint = compassEl.querySelector('.compass-hint');
  const walkEl = compassEl.querySelector('.compass-walk');
  walkPrev = null;
  walkSession = 0;
  walkEl.textContent = '';
  compassEl.querySelector('.compass-name').textContent = p.name;
  compassEl.querySelector('.compass-go').href = mapsUrl(p, pos ? distanceM(pos, p) : 1000);
  compassEl.hidden = false;
  if (!step?.replace) history.pushState({ compass: true }, '');
  keepScreenOn(true);

  // Ce qui a déjà été dit, pour ne pas répéter sans arrêt.
  const said = { first: false, step: null, dir: null, dirAt: 0, arrived: false };
  const talk = (d, rel) => {
    if (d < 20) {
      if (!said.arrived) {
        said.arrived = true;
        speak(`Tu y es. ${p.name}.${step && !step.last ? ' Touche Étape suivante quand tu veux.' : ''}`);
        // Balade guidée : un de mes lieux atteint est noté « déjà visité »
        const mine = step && p.id && state.points.find((x) => x.id === p.id);
        if (mine && !mine.done) { setDone(mine, true); persist(); renderMarkers(); toast(`${mine.name} : noté « déjà visité »`); }
      }
      return;
    }
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
      countWalk(pos);
      walkEl.textContent = `🚶 ${walkText(walkSession)}`;
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
    persist();
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
compassEl.querySelector('.compass-close').addEventListener('click', () => { guide = null; closeCompass(); });
compassEl.querySelector('.compass-next').addEventListener('click', guideNext);
window.addEventListener('popstate', () => { if (compassOpen) closeCompass(true); });

/* ---------- Réglages ---------- */

/**
 * Réglages : un sommaire court (tout tient sur un écran), chaque rubrique s'ouvre à part.
 * `section` : null (sommaire), 'sauvegarde', 'categories', 'favoris', 'cercles', 'marche', 'appli'.
 */
function openSettings(section = null) {
  const rings = el('input', { type: 'text', inputmode: 'numeric', value: state.rings.join(', '), 'aria-describedby': 'ringsHelp' });
  const minRings = el('input', { type: 'text', inputmode: 'numeric', value: state.minuteRings.join(', ') });
  const meInput = el('input', { type: 'text', maxlength: '30', value: state.me ?? '', autocomplete: 'given-name' });
  const file = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const count = state.points.length;

  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    const text = await f.text();
    const doImport = (owner) => {
      try {
        const r = mergeImport(state, text, owner);
        state = { ...r.state, ok: state.ok };
        importPhotos(text, state);
        persist(); refresh();
        openSettings('sauvegarde');
        toast(`${plural(r.added, 'lieu ajouté', 'lieux ajoutés')}${owner ? ` (lieux de ${owner})` : ''}${r.skipped ? `, ${plural(r.skipped, 'illisible ignoré', 'illisibles ignorés')}` : ''}.`);
      } catch (e) {
        toast(e.message || 'Import impossible.', true);
      }
    };
    // À qui sont ces lieux ? Le prénom du fichier est proposé ; une sauvegarde à moi reste à moi.
    const from = fileOwner(text);
    if (from && from === state.me) { doImport(''); return; }
    const other = el('input', { type: 'text', maxlength: '30', value: from, placeholder: 'Prénom', 'aria-label': 'Prénom de la personne' });
    openSheet('À qui sont ces lieux ?', el('div', { class: 'stack' },
      el('button', { type: 'button', class: 'btn c-add', onclick: () => doImport('') }, 'Ce sont mes lieux (sauvegarde)'),
      el('label', { class: 'field' }, 'Lieux d\'une autre personne', other),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: () => {
        const name = other.value.trim();
        if (!name) { other.focus(); toast('Indique son prénom.', true); return; }
        doImport(name);
      } }, 'Ajouter comme ses lieux'),
      el('p', { class: 'help' }, 'Ses lieux s\'ajoutent aux tiens. Le bouton 👥 en haut permet ensuite d\'afficher les tiens, les siens ou tous.'),
    ), { name: 'importwho' });
  });

  const withPhotos = el('input', { type: 'checkbox', class: 'check' });
  const nbPhotos = state.points.reduce((n, p) => n + (p.photos?.length ?? 0), 0);
  let exportText = exportJSON(state);
  const buildExport = async () => {
    const obj = JSON.parse(exportJSON(state));
    if (withPhotos.checked) {
      obj.photos = {};
      for (const p of state.points) {
        for (const id of p.photos ?? []) {
          const b = await getPhoto(id).catch(() => null);
          if (b) obj.photos[id] = await blobToDataUrl(b);
        }
      }
    }
    exportText = JSON.stringify(obj);
  };
  withPhotos.addEventListener('change', buildExport);
  const exportFile = () => new File([exportText], exportFileName(new Date(), state.points.length), { type: 'application/json' });
  const markExported = () => { state.lastExport = Date.now(); persist(); };
  const download = async () => {
    if (withPhotos.checked) await buildExport(); else exportText = exportJSON(state);
    const f = exportFile();
    markExported();
    const url = URL.createObjectURL(f);
    const a = el('a', { href: url, download: f.name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast(state.me
      ? `« ${f.name} » enregistré dans tes Téléchargements`
      : 'Fichier enregistré dans tes Téléchargements. Astuce : indique ton prénom plus bas pour que tes amis sachent de qui viennent ces lieux.');
  };
  const canShareFile = (() => {
    try { return Boolean(navigator.canShare?.({ files: [exportFile()] })); } catch { return false; }
  })();
  const share = async () => {
    try { await navigator.share({ files: [exportFile()], title: 'Ma carte de Paris' }); markExported(); } catch { /* annulé */ }
  };
  const back = () => openSettings();
  const backBtn = el('button', { type: 'button', class: 'btn', onclick: back }, '← Réglages');
  const due = backupDue(state);
  const unsaved = unsavedCount(state);
  const saveSummary = state.lastExport
    ? `${timeAgo(state.lastExport).replace(/^./, (c) => c.toUpperCase())}${unsaved ? ` · ${plural(unsaved, 'lieu non sauvegardé', 'lieux non sauvegardés')}` : ' · tout est sauvegardé'}`
    : 'Jamais sauvegardé';

  if (section === 'sauvegarde') {
    openSheet([ico('save'), ' Sauvegarde'], el('div', { class: 'stack' },
      el('p', { class: due ? 'warn' : 'help' }, `${plural(count, 'lieu', 'lieux')} sur ce téléphone. ${saveSummary}.`),
      nbPhotos ? el('label', { class: 'item-main check-row' }, withPhotos,
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, `Inclure les ${nbPhotos} photo${nbPhotos > 1 ? 's' : ''}`),
          el('span', { class: 'item-sub' }, 'Le fichier sera plus lourd'))) : null,
      el('button', { type: 'button', class: 'btn c-add solid', onclick: download, disabled: count === 0 }, '⬇  Exporter mes lieux'),
      canShareFile ? el('button', { type: 'button', class: 'btn c-add', onclick: share, disabled: count === 0 }, '✉  Envoyer le fichier (mail, Drive…)') : null,
      el('button', { type: 'button', class: 'btn c-add', onclick: () => file.click() }, '⬆  Importer un fichier'),
      el('button', { type: 'button', class: 'btn c-add', onclick: openGoogleImport }, ico('download'), 'Importer de Google Maps'),
      el('p', { class: 'help' }, 'L\'import ajoute les lieux du fichier sans effacer les tiens : ta propre sauvegarde ou les lieux d\'un ami.'),
      file,
      el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Partager avec un ami'), el('span', {}, '')),
      el('label', { class: 'field' }, 'Ton prénom, noté sur chacun de tes lieux exportés', meInput),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => {
        state.me = meInput.value.trim().slice(0, 30); persist(); toast(state.me ? `Prénom enregistré : ${state.me}` : 'Prénom effacé');
      } }, 'Enregistrer le prénom'),
      el('p', { class: 'help' }, 'Exporte, envoie le fichier, ton ami l\'importe. Chacun garde ses lieux sur son téléphone.'),
      backBtn,
    ), { tall: true, name: 'settings:sauvegarde', again: () => openSettings('sauvegarde') });
    return;
  }

  if (section === 'categories') {
    openSheet([ico('tags'), ' Catégories et listes'], el('div', { class: 'stack' },
      el('p', { class: 'help' }, 'L\'ordre ici est celui de la barre du haut. Flèches pour déplacer, Modifier pour le nom, l\'icône et la couleur.'),
      el('div', {}, state.categories.map((c, i) => {
        const k = categoryCounts(state.points, c.id);
        const move = (delta) => { state = moveCategory(state, c.id, delta); persist(); refresh(); openSettings('categories');
          requestAnimationFrame(() => document.querySelector(`[data-move="${c.id}:${delta}"]`)?.focus()); };
        const last = state.categories.length - 1;
        return el('div', { class: 'cat-row' }, catDot(c.id),
          el('span', { class: 'cat-name' }, c.name, el('br'),
            el('span', { class: 'cat-count' }, k.total ? `${plural(k.total, 'lieu', 'lieux')} · ${k.todo} à faire` : 'aucun lieu')),
          el('button', { type: 'button', class: 'btn move', disabled: i === 0, 'data-move': `${c.id}:-1`, onclick: () => move(-1), 'aria-label': `Monter ${c.name}` }, '↑'),
          el('button', { type: 'button', class: 'btn move', disabled: i === last, 'data-move': `${c.id}:1`, onclick: () => move(1), 'aria-label': `Descendre ${c.name}` }, '↓'),
          el('button', { type: 'button', class: 'btn', onclick: () => openCategory(c.id), 'aria-label': `Modifier ${c.name}` }, 'Modifier'));
      })),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openCategory(null) }, '+ Nouvelle catégorie'),
      el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(state.chipIcons === true), onclick: () => {
        state.chipIcons = !state.chipIcons; persist(); refresh(); openSettings('categories');
        toast(state.chipIcons ? 'Barre du haut : icônes seules' : 'Barre du haut : icône et nom');
      } },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, state.categories[0] ? catDot(state.categories[0].id) : '🏷️'),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Icônes seules en haut'), el('span', { class: 'menu-sub' }, 'Plus de catégories visibles sans faire défiler')),
      el('span', { class: `switch${state.chipIcons ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
      el('p', { class: 'help' }, 'Astuce : sur la carte, un appui long sur une catégorie en haut ouvre directement sa modification.'),
      el('h3', { class: 'ring-title', style: 'margin-top:14px' }, el('span', {}, 'Mes listes'), el('span', {}, String((state.lists ?? []).length))),
      (state.lists ?? []).length ? el('div', {}, state.lists.map((l) => el('div', { class: 'cat-row' },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('list', { size: 18 })),
        el('span', { class: 'cat-name' }, l.name, el('br'), el('span', { class: 'cat-count' }, plural(state.points.filter((p) => p.lists?.includes(l.id)).length, 'lieu', 'lieux'))),
        el('button', { type: 'button', class: 'btn', 'aria-label': `Renommer ${l.name}`, onclick: () => {
          const n = prompt('Nouveau nom de la liste', l.name);
          if (n == null) return;
          try { state = renameList(state, l.id, n); persist(); refresh(); openSettings('categories'); } catch (e) { toast(e.message, true); }
        } }, 'Renommer'),
        el('button', { type: 'button', class: 'btn danger move', 'aria-label': `Supprimer la liste ${l.name}`, onclick: () => {
          if (!confirm(`Supprimer la liste « ${l.name} » ? Les lieux restent sur ta carte.`)) return;
          state = deleteList(state, l.id); filt.lists.delete(l.id); persist(); refresh(); openSettings('categories'); toast('Liste supprimée');
        } }, ico('x'))))) : el('p', { class: 'help' }, 'Une liste regroupe des lieux de catégories différentes (« Sous la pluie », « Avec Paul »). Crée-la en modifiant un lieu.'),
      backBtn,
    ), { tall: true, name: 'settings:categories', again: () => openSettings('categories') });
    return;
  }

  if (section === 'style') {
    openSheet([ico('palette'), ' Style de la carte'], el('div', { class: 'stack' },
      el('div', { class: 'style-grid' }, Object.entries(STYLE_INFO).map(([id, st]) => el('button', { type: 'button', class: 'style-card', 'aria-pressed': String((state.mapStyle ?? 'classic') === id), onclick: () => {
        state.mapStyle = id; persist(); applyMapStyle(); openSettings('style'); toast(`Carte : ${st.name}`);
      } }, el('span', { class: `style-prev s-${id}`, 'aria-hidden': 'true' }), el('b', {}, st.name), el('span', { class: 'menu-sub' }, st.sub)))),
      el('p', { class: 'help' }, 'Française et Douce viennent des serveurs bénévoles d\'OpenStreetMap France : parfait pour un usage personnel. Pastel et Nuit sont des filtres faits par ton téléphone.'),
      backBtn,
    ), { tall: true, name: 'settings:style', again: () => openSettings('style') });
    return;
  }

  if (section === 'outils') {
    const list = normalizeTools(state.mapTools);
    openSheet([ico('arrow-up-down'), ' Boutons de la carte'], el('div', { class: 'stack' },
      el('div', {}, el('div', { class: 'legend' }, 'Côté de l\'écran'), el('div', { class: 'seg', role: 'group', 'aria-label': 'Côté des boutons' },
        ['right', 'left'].map((side) => el('button', { type: 'button', 'aria-pressed': String((state.toolsSide ?? 'right') === side), onclick: () => {
          state.toolsSide = side; persist(); applyToolOrder(); openSettings('outils'); toast(side === 'left' ? 'Boutons à gauche' : 'Boutons à droite');
        } }, side === 'left' ? '← À gauche' : 'À droite →')))),
      el('p', { class: 'help' }, 'De haut en bas, comme sur la carte. Le dernier est le plus près de ton pouce. Décoche un bouton pour le cacher.'),
      el('div', {}, list.map((t, i) => {
        const info = TOOL_INFO[t];
        const move = (delta) => { state.mapTools = moveTool(list, t, delta); persist(); applyToolOrder(); openSettings('outils');
          requestAnimationFrame(() => document.querySelector(`[data-move="${t}:${delta}"]`)?.focus()); };
        const shown = !cleanHidden(state.hiddenTools).includes(t);
        const box = el('input', { type: 'checkbox', class: 'check', checked: shown, 'aria-label': `Afficher ${info.name}` });
        box.addEventListener('change', () => {
          const h = new Set(cleanHidden(state.hiddenTools));
          if (box.checked) h.delete(t); else h.add(t);
          state.hiddenTools = [...h]; persist(); applyToolOrder(); openSettings('outils');
          toast(box.checked ? `${info.name} : affiché` : `${info.name} : caché`);
        });
        return el('div', { class: `cat-row${shown ? '' : ' off'}` },
          el('label', { class: 'tool-check' }, box,
            el('span', { class: `tool-prev${t === 'paris' ? ' txt' : ''}`, 'aria-hidden': 'true' }, ICON_NAMES.has(info.icon) ? ico(info.icon, { size: 20 }) : info.icon),
            el('span', { class: 'cat-name' }, info.name)),
          el('button', { type: 'button', class: 'btn move', disabled: i === 0, 'data-move': `${t}:-1`, onclick: () => move(-1), 'aria-label': `Monter ${info.name}` }, '↑'),
          el('button', { type: 'button', class: 'btn move', disabled: i === list.length - 1, 'data-move': `${t}:1`, onclick: () => move(1), 'aria-label': `Descendre ${info.name}` }, '↓'));
      })),
      el('button', { type: 'button', class: 'btn', onclick: () => { state.mapTools = normalizeTools([]); state.hiddenTools = []; persist(); applyToolOrder(); openSettings('outils'); toast('Boutons d\'origine remis'); } }, 'Tout remettre comme au début'),
      backBtn,
    ), { tall: true, name: 'settings:outils', again: () => openSettings('outils') });
    return;
  }

  if (section === 'cercles') {
    openSheet([ico('target'), ' Cercles'], el('div', { class: 'stack' },
      el('label', { class: 'field' }, 'En mètres', rings),
      el('p', { class: 'help', id: 'ringsHelp' }, '100 m au minimum, séparés par des virgules. Exemple : 100, 300, 500, 1000'),
      el('button', { type: 'button', class: 'btn c-guide solid', onclick: () => {
        state.rings = normalizeRings(rings.value);
        rings.value = state.rings.join(', ');
        if (persist()) toast(`Cercles : ${state.rings.map(fmtRing).join(', ')}`);
      } }, 'Enregistrer les mètres'),
      el('label', { class: 'field' }, 'En minutes à pied', minRings),
      el('p', { class: 'help' }, 'De 1 à 60 minutes. Exemple : 5, 10, 15, 20. Estimation : 12 min par km, détours compris.'),
      el('button', { type: 'button', class: 'btn c-guide solid', onclick: () => {
        state.minuteRings = normalizeMinuteRings(minRings.value);
        minRings.value = state.minuteRings.join(', ');
        if (persist()) toast(`Cercles : ${state.minuteRings.map((m) => `${m} min`).join(', ')}`);
      } }, 'Enregistrer les minutes'),
      backBtn,
    ), { tall: true, name: 'settings:cercles', again: () => openSettings('cercles') });
    return;
  }

  if (section === 'appli') {
    openSheet([ico('info'), ' Application'], el('div', { class: 'stack' },
      el('button', { type: 'button', class: 'btn c-info solid', onclick: updateApp }, '↻ Mettre à jour l\'appli'),
      el('button', { type: 'button', class: 'btn c-info', onclick: () => { closeSheet(); reloadMap(); } }, '🗺️ Recharger la carte (si elle reste grise)'),
      el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Code couleur des boutons'), el('span', {}, '')),
      el('div', { class: 'legend-colors' },
        el('span', { class: 'btn primary', style: 'min-height:0' }, 'Y aller'),
        el('span', { class: 'btn c-metro', style: 'min-height:0' }, 'Métro'),
        el('span', { class: 'btn c-guide', style: 'min-height:0' }, 'Se guider'),
        el('span', { class: 'btn c-add', style: 'min-height:0' }, 'Ajouter, garder'),
        el('span', { class: 'btn c-fav', style: 'min-height:0' }, 'Favori'),
        el('span', { class: 'btn c-info', style: 'min-height:0' }, 'Aide, réglages'),
        el('span', { class: 'btn danger', style: 'min-height:0' }, 'Supprimer')),
      el('p', { class: 'help' }, `Version du ${VERSION}. La mise à jour ne touche pas à tes lieux.`),
      el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Confidentialité'), el('span', {}, '')),
      el('p', { class: 'help' }, 'Tes lieux, tes photos et ta position restent sur ce téléphone. GitHub ne fait qu\'envoyer l\'appli : il ne reçoit ni ta position ni tes lieux. L\'appli ne contacte d\'autres services que pour ce que tu demandes : la carte (OpenStreetMap, qui voit le quartier affiché), les adresses (IGN), l\'annuaire et les horaires (OpenStreetMap), les fontaines et toilettes (Ville de Paris, sans ta position), les Curiosités (Wikipédia, position arrondie à 100 m), la météo (Open-Meteo, position arrondie à 1 km) et Vélib\' (aucune position envoyée). Pour Mon Paris, la position de tes lieux sans code postal est envoyée une fois à l\'IGN pour trouver leur arrondissement. Comme tout site, ces services voient l\'adresse internet du téléphone.'),
      el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Marche'), el('span', {}, '')),
      el('p', { class: 'help' }, `Aujourd'hui : ${walkText(todayWalk())}. Compté seulement quand le suivi en direct ou la boussole est ouvert à l'écran : une appli web n'a pas accès au podomètre. Pas estimés avec 70 cm par pas.`),
      el('p', { class: 'help' }, `Carte © OpenStreetMap. Adresses : IGN. Annuaire et horaires : OpenStreetMap. Fontaines et toilettes : Ville de Paris.${stationsSource ? ` Stations ${stationsSource}.` : ''}`),
      backBtn,
    ), { tall: true, name: 'settings:appli', again: () => openSettings('appli') });
    return;
  }

  // Sommaire
  const row = (icon, title, summary, onclick, warn = false, family = 'c-info') => el('button', { type: 'button', class: `menu-row ${family}${warn ? ' warn-row' : ''}`, onclick },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, typeof icon === 'string' && ICON_NAMES.has(icon) ? ico(icon) : icon),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, summary)),
    el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›'));
  const voiceOn = state.voice !== false;
  const voiceSwitch = el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(voiceOn), onclick: () => {
    state.voice = !voiceOn; persist(); if (!state.voice) silence(); openSettings();
    toast(state.voice ? 'Voix activée' : 'Voix désactivée');
  } },
  el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(voiceOn ? 'volume-2' : 'volume-x')),
  el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Voix'), el('span', { class: 'menu-sub' }, 'Boussole et suivi en direct')),
  el('span', { class: `switch${voiceOn ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));

  openSheet('Réglages', el('div', { class: 'menu' },
    !state.ok ? el('p', { class: 'warn' }, 'Le stockage de ce téléphone n\'a pas pu être lu. Fais un export régulier pour ne rien perdre.') : null,
    row('map', 'Mon Paris', 'Arrondissements explorés, marche du jour', () => openMyParis('settings'), false, 'c-guide'),
    row('house', 'Mes stations', (state.myStations ?? []).length ? state.myStations.map((x) => `${x.label} : ${x.station}`).join(' · ') : 'Maison, Travail… pour rentrer en 1 appui', openMyStations, false, 'c-metro'),
    row('save', 'Sauvegarde et partage', saveSummary, () => openSettings('sauvegarde'), due, 'c-add'),
    row('tags', 'Catégories et listes', `${plural(state.categories.length, 'catégorie', 'catégories')} · ${plural((state.lists ?? []).length, 'liste', 'listes')}`, () => openSettings('categories'), false, 'c-add'),
    row(glyph(state.fav.icon, { filled: true }), 'Favoris', 'Icône et couleur', openFavStyle, false, 'c-fav'),
    row('target', 'Cercles', 'Tailles en mètres et en minutes', () => openSettings('cercles'), false, 'c-guide'),
    row('palette', 'Style de la carte', (STYLE_INFO[state.mapStyle] ?? STYLE_INFO.classic).name, () => openSettings('style'), false, 'c-guide'),
    row('arrow-up-down', 'Boutons de la carte', 'Ordre, côté, afficher ou cacher', () => openSettings('outils'), false, 'c-guide'),
    voiceSwitch,
    el('button', { type: 'button', class: 'menu-row c-info', role: 'switch', 'aria-checked': String(isDark()), onclick: () => {
      state.theme = isDark() ? 'light' : 'dark'; persist(); applyTheme(); refresh(); openSettings();
      toast(isDark() ? 'Mode sombre activé' : 'Mode clair activé');
    } },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(isDark() ? 'moon' : 'sun')),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Mode sombre'), el('span', { class: 'menu-sub' }, state.theme === 'auto' || !state.theme ? 'Suit le réglage du téléphone' : 'Choisi par toi')),
    el('span', { class: `switch${isDark() ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
    row('circle-help', 'Aide', 'Comment utiliser l\'appli, problèmes fréquents', openHelp),
    row('info', 'Application', `Mettre à jour · confidentialité · marche`, () => openSettings('appli')),
    mySettingsBlock(),
  ), { name: 'settings', again: () => openSettings(), tall: true });
}

function favBadge(icon = state.fav.icon, color = state.fav.color) {
  const b = el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, glyph(icon, { filled: true }));
  b.style.background = '#fff';
  b.style.color = color;
  b.style.boxShadow = `0 0 0 3px ${color}`;
  return b;
}

function openFavStyle() {
  let { icon, color } = state.fav;
  const preview = el('div', { class: 'where' });
  const drawPreview = () => fill(preview, favBadge(icon, color), ' Aperçu sur la carte');
  drawPreview();
  openSheet('Favoris', el('div', { class: 'stack' },
    preview,
    el('div', {}, el('div', { class: 'legend' }, 'Icône'), picker(ICONS, icon, (v) => { icon = v; drawPreview(); })),
    el('div', {}, el('div', { class: 'legend' }, 'Couleur du contour'), picker(FAV_COLORS, color, (v) => { color = v; drawPreview(); }, { colors: true, names: FAV_COLOR_NAMES })),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: openSettings }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: () => {
        state = setFavStyle(state, { icon, color });
        persist(); refresh(); openSettings();
        toast('Favoris modifiés');
      } }, 'Enregistrer')),
  ), { tall: true, name: 'favstyle', again: () => openFavStyle() });
}


/** Range les photos contenues dans un fichier de sauvegarde (seulement celles des lieux présents). */
async function importPhotos(text, st) {
  let photos;
  try { photos = JSON.parse(text)?.photos; } catch { return; }
  if (!photos || typeof photos !== 'object') return;
  const wanted = new Set(st.points.flatMap((p) => p.photos ?? []));
  for (const [id, url] of Object.entries(photos)) {
    if (!wanted.has(id)) continue;
    const blob = await dataUrlToBlob(url).catch(() => null);
    if (blob) await putPhoto(id, blob).catch(() => {});
  }
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
    persist(); refresh(); openSettings('categories');
    toast(id ? 'Catégorie modifiée' : 'Catégorie ajoutée');
  };

  const n = id ? state.points.filter((p) => p.cat === id).length : 0;
  const others = state.categories.filter((x) => x.id !== id);
  const doDelete = (moveTo) => {
    try { state = deleteCategory(state, id, moveTo); } catch (e) { err.textContent = e.message; return; }
    persist(); refresh(); openSettings('categories');
    toast('Catégorie supprimée');
  };
  const showButtons = () => fill(zone, 
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openSettings('categories') }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, 'Enregistrer')),
    id && others.length ? el('button', { type: 'button', class: 'btn danger', onclick: askDelete }, 'Supprimer cette catégorie') : null,
    id && !others.length ? el('p', { class: 'help' }, 'C\'est ta seule catégorie : elle ne peut pas être supprimée.') : null,
  );
  const askDelete = () => {
    if (!n) {
      fill(zone, 
        el('p', { class: 'warn', role: 'alert' }, `Supprimer la catégorie « ${c.name} » ? Elle ne contient aucun lieu.`),
        el('div', { class: 'row' },
          el('button', { type: 'button', class: 'btn', onclick: showButtons }, 'Annuler'),
          el('button', { type: 'button', class: 'btn danger solid', onclick: () => doDelete(null) }, 'Oui, supprimer')));
      return;
    }
    fill(zone, 
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
        persist(); refresh(); openSettings('categories');
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
  ), { tall: true, name: `category:${id ?? 'new'}`, again: () => openCategory(id) });
}

/** Rappel de sauvegarde avec un bouton pour le faire tout de suite. */
function remindBackup() {
  if (!sheet.hidden) return;
  const n = unsavedCount(state);
  openSheet('Sauvegarde', el('div', { class: 'stack' },
    el('p', {}, `${plural(n, 'lieu n\'est', 'lieux ne sont')} pas encore ${n > 1 ? 'sauvegardés' : 'sauvegardé'}. Tes lieux n'existent que sur ce téléphone : une sauvegarde régulière évite de tout perdre.`),
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => openSettings('sauvegarde') }, 'Sauvegarder maintenant'),
    el('button', { type: 'button', class: 'btn', onclick: () => closeSheet() }, 'Plus tard'),
  ));
}

/* ---------- Actualiser : ma position, la carte, l'appli ---------- */

// Bouton ◎ : ma position avec les cercles de temps à pied (5, 10, 15, 20 min…). Un second appui les retire.
let meShown = null; // { lat, lng } quand les cercles sont affichés

function drawMe() {
  meLayer.clearLayers();
  if (!meShown) return;
  const { lat, lng, acc } = meShown;
  if (acc > 30) L.circle([lat, lng], { radius: acc, stroke: false, fillColor: '#4c6ef5', fillOpacity: 0.12, interactive: false }).addTo(meLayer);
  const radii = state.minuteRings.map(minutesToMeters);
  drawRings(meLayer, lat, lng, radii, (r) => `${state.minuteRings[radii.indexOf(r)]} min`);
  meMarker(lat, lng).addTo(meLayer);
}

async function locateOnMap() {
  const btn = document.getElementById('btnLocate');
  if (meShown) {
    meShown = null;
    drawMe();
    btn.setAttribute('aria-pressed', 'false');
    toast('Cercles retirés');
    return;
  }
  toast('Recherche de ta position…');
  try {
    const fix = await locate();
    hideToast();
    meShown = fix;
    const maxR = minutesToMeters(state.minuteRings.at(-1));
    map.fitBounds(L.latLng(fix.lat, fix.lng).toBounds(maxR * 2), { paddingTopLeft: [10, 60], paddingBottomRight: [70, 90], animate: false });
    drawMe();
    btn.setAttribute('aria-pressed', 'true');
    toast(`Cercles à pied : ${state.minuteRings.map((m) => `${m} min`).join(' · ')} (à ${Math.round(fix.acc)} m près)`);
  } catch (e) {
    toast(e.message, true);
  }
}

/** Zoom automatique sur ma position, au niveau de la rue (17 : environ 280 m de large sur un téléphone). */
const ZOOM_RUE = 17;
const zoomLayer = L.layerGroup().addTo(map);
async function zoomOnMe() {
  closeSheet();
  if (meShown) { map.setView([meShown.lat, meShown.lng], ZOOM_RUE, { animate: false }); return; }
  toast('Recherche de ta position…');
  try {
    const fix = await locate();
    hideToast();
    zoomLayer.clearLayers();
    if (fix.acc > 30) L.circle([fix.lat, fix.lng], { radius: fix.acc, stroke: false, fillColor: '#4c6ef5', fillOpacity: 0.12, interactive: false }).addTo(zoomLayer);
    meMarker(fix.lat, fix.lng).addTo(zoomLayer);
    map.setView([fix.lat, fix.lng], ZOOM_RUE, { animate: false });
    if (fix.acc > 100) toast(`Position peu précise (à ${Math.round(fix.acc)} m près).`, true);
  } catch (e) {
    toast(e.message, true);
  }
}

function reloadMap() {
  if (!navigator.onLine) { toast('Pas de connexion internet : la carte ne peut pas se recharger.', true); return; }
  map.invalidateSize();
  tiles.redraw();
  toast('Carte rechargée');
}

async function updateApp() {
  if (!navigator.onLine) { toast('Pas de connexion internet : impossible de vérifier les mises à jour.', true); return; }
  toast('Recherche de la dernière version…');
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k))); // tes lieux ne sont pas dans ce cache : rien n'est perdu
  } catch { /* on recharge quand même */ }
  location.reload();
}

/* ---------- Quel métro prendre pour aller à un lieu ---------- */

async function showMetroPlan(p, back) {
  await stationsReady;
  toast('Calcul du trajet…');
  let from = freshHere();
  if (!from) {
    try { from = await locate(); } catch (e) {
      if (here) from = here; else { toast(e.message, true); return; }
    }
  }
  hideToast();
  renderMetroPlan(p, from, back);
}

function renderMetroPlan(p, from, back) {
  const plan = metroPlan(stations, from, p);
  const ln = (l) => `ligne ${l}`;
  const step = (icon, text) => el('li', { class: 'plan-step' }, el('span', { class: 'plan-ico', 'aria-hidden': 'true' }, icon), el('span', {}, text));
  let steps;
  let firstTarget = null;
  if (plan.type === 'walk') {
    steps = [step('🚶', `À pied, c'est le plus simple : ≈ ${plan.minutes} min.`)];
  } else {
    firstTarget = { name: `Ⓜ ${plan.start.n}`, lat: plan.start.lat, lng: plan.start.lng };
    steps = [
      step('🚶', `${plan.walkIn} min à pied jusqu'à Ⓜ ${plan.start.n}`),
      plan.type === 'direct'
        ? step('Ⓜ', `Prends la ${ln(plan.line)} jusqu'à ${plan.end.n}`)
        : step('Ⓜ', `Prends la ${ln(plan.line1)} jusqu'à ${plan.via.n}, puis la ${ln(plan.line2)} jusqu'à ${plan.end.n}`),
      step('🚶', `${plan.walkOut} min à pied jusqu'à ${p.name}`),
    ];
  }
  openSheet(`Vers ${p.name}`, el('div', { class: 'stack' },
    el('p', { class: 'summary' }, plan.type === 'walk' ? 'À pied' : `En métro · ≈ ${plan.minutes} min au total`),
    el('ol', { class: 'plan' }, steps),
    plan.type === 'walk' ? null : el('p', { class: 'help' }, 'Estimation sans horaires : vérifie la direction sur le quai. Le trajet exact est dans Google Maps ou l\'appli Île-de-France Mobilités.'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(firstTarget ?? p) }, ico('compass'), firstTarget ? 'Vers la station' : 'Boussole'),
      el('a', { class: 'btn primary', href: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${plan.type === 'walk' ? 'walking' : 'transit'}`, target: '_blank', rel: 'noopener' }, 'Google Maps')),
    plan.type === 'walk' ? null : el('a', { class: 'btn c-metro', href: IDFM_APP }, '🚇 Ouvrir l\'appli Île-de-France Mobilités'),
    back ? el('button', { type: 'button', class: 'btn', onclick: back }, '← Retour') : null,
  ), { name: `plan:${p.id}`, again: () => renderMetroPlan(p, from, back) });
  nearLayer.clearLayers();
  meMarker(from.lat, from.lng).addTo(nearLayer);
  const pts = [[from.lat, from.lng], [p.lat, p.lng]];
  if (plan.type !== 'walk') {
    const chain = [from, plan.start, ...(plan.type === 'transfer' ? [plan.via] : []), plan.end, p];
    L.polyline(chain.map((x) => [x.lat, x.lng]), { color: '#003ca6', weight: 3, dashArray: '6 8', interactive: false }).addTo(nearLayer);
    for (const st of chain.slice(1, -1)) {
      pts.push([st.lat, st.lng]);
      L.marker([st.lat, st.lng], { interactive: false, keyboard: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'pin-wrap', html: '<span class="metro-pin small">M</span>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(nearLayer);
    }
  }
  map.fitBounds(L.latLngBounds(pts).pad(0.25), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], maxZoom: 16, animate: false });
}

/* ---------- Métro le plus proche, en un appui ---------- */

// Ouvre l'appli Île-de-France Mobilités si elle est installée (Android), sinon son site d'itinéraires.
const IDFM_APP = 'intent://#Intent;package=com.applidium.vianavigo;S.browser_fallback_url=https%3A%2F%2Fme-deplacer.iledefrance-mobilites.fr%2Fitineraire;end';

const stationLabel = (st) => [st.l?.length ? `Ligne${st.l.length > 1 ? 's' : ''} ${st.l.join(', ')}` : '', st.rer?.length ? `RER ${st.rer.join(', ')}` : ''].filter(Boolean).join(' · ');

async function nearestMetro() {
  await stationsReady;
  if (!stations.length) { toast('La liste des stations n\'est pas encore chargée : réessaie dans un instant.', true); return; }
  toast('Recherche du métro le plus proche…');
  let from;
  let note = null;
  try {
    from = await locate();
    hideToast();
  } catch (e) {
    if (here && Date.now() - here.time < 2 * 3600 * 1000) {
      from = here;
      note = `GPS indisponible : calculé depuis ta dernière position (${timeAgoShort(here.time)}).`;
      hideToast();
    } else { toast(e.message, true); return; }
  }
  showNearestMetro(from, note);
}

function showNearestMetro(from, note = null) {
  const list = nearestStations(stations, from, 3);
  const [first, ...others] = list;
  const st = first.station;
  const target = { name: `Ⓜ ${st.n}`, lat: st.lat, lng: st.lng };
  openSheet(`Ⓜ ${st.n}`, el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${fmtDist(first.d)} · ${fmtWalk(first.d)}`),
    el('p', { class: 'help' }, stationLabel(st)),
    note ? el('p', { class: 'warn' }, note) : null,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(target) }, ico('compass'), 'Boussole'),
      el('a', { class: 'btn primary', href: mapsUrl(st, Math.min(first.d, 999)), target: '_blank', rel: 'noopener' }, 'Y aller')),
    el('a', { class: 'btn c-metro', href: IDFM_APP }, '🚇 Ouvrir l\'appli Île-de-France Mobilités'),
    others.length ? el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Autres stations proches'), el('span', {}, '')) : null,
    el('ul', { class: 'items' }, others.map(({ station: o, d }) => el('li', { class: 'item' },
      el('span', { class: 'item-main' }, el('span', { class: 'metro-mini', 'aria-hidden': 'true' }, 'M'),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, o.n),
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min · ${stationLabel(o)}`))),
      el('a', { class: 'go', href: mapsUrl(o, Math.min(d, 999)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${o.n}` }, 'Y aller')))),
  ), { name: 'metro', again: () => showNearestMetro(from, note) });
  nearLayer.clearLayers();
  L.polyline([[from.lat, from.lng], [st.lat, st.lng]], { color: '#003ca6', weight: 3, dashArray: '6 8', interactive: false }).addTo(nearLayer);
  meMarker(from.lat, from.lng).addTo(nearLayer);
  for (const { station: o } of others) {
    L.marker([o.lat, o.lng], { interactive: false, keyboard: false, zIndexOffset: 1500, icon: L.divIcon({ className: 'pin-wrap', html: '<span class="metro-pin small">M</span>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(nearLayer);
  }
  L.marker([st.lat, st.lng], { interactive: false, keyboard: false, zIndexOffset: 2000, icon: L.divIcon({ className: 'pin-wrap', html: '<span class="metro-pin">M</span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(nearLayer);
  map.fitBounds(L.latLngBounds([[from.lat, from.lng], [st.lat, st.lng]]).pad(0.6), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
}

/* ---------- Fontaine ou toilettes les plus proches, en un appui ---------- */

const PRATIQUE_KEY = 'carte-paris.pratique'; // copie locale des données de la Ville (rafraîchie chaque jour)
const pratique = { fontaines: null, toilettes: null };

async function loadPratique(kind) {
  if (pratique[kind]) return pratique[kind];
  let cached = null;
  try { cached = JSON.parse(storage.getItem(`${PRATIQUE_KEY}.${kind}`) ?? 'null'); } catch { /* rien */ }
  const fresh = cached && Date.now() - cached.time < 24 * 3600 * 1000;
  if (!fresh && navigator.onLine !== false) {
    try {
      const res = await fetch(exportUrl(kind), { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseRecords(await res.json(), kind);
      if (items.length) {
        cached = { time: Date.now(), items };
        try { storage.setItem(`${PRATIQUE_KEY}.${kind}`, JSON.stringify(cached)); } catch { /* trop gros : pas grave */ }
      }
    } catch { /* on garde l'ancienne copie s'il y en a une */ }
  }
  pratique[kind] = cached?.items ?? [];
  return pratique[kind];
}

async function nearestPratique() {
  toast('Recherche de la fontaine, des toilettes et d\'un lieu frais…');
  const [from, fontaines, toilettes, fraisLieux, fraisParcs] = await Promise.all([
    locate().catch(() => (here && Date.now() - here.time < 2 * 3600 * 1000 ? here : null)),
    loadPratique('fontaines'),
    loadPratique('toilettes'),
    loadPratique('fraisLieux'),
    loadPratique('fraisParcs'),
  ]);
  hideToast();
  if (!from) { toast(GEO_ERRORS[1], true); return; }
  if (!fontaines.length && !toilettes.length && !fraisLieux.length && !fraisParcs.length) {
    toast('Les données de la Ville de Paris ne répondent pas. Vérifie ta connexion et réessaie.', true);
    return;
  }
  showPratique(from, nearestOf(fontaines, from, 2), nearestOf(toilettes, from, 2), nearestOf([...fraisLieux, ...fraisParcs], from, 2));
}

function showPratique(from, fs, ts, cs = []) {
  const block = (title, icon, list) => [
    el('h3', { class: 'ring-title' }, el('span', {}, title), el('span', {}, '')),
    list.length
      ? el('ul', { class: 'items' }, list.map(({ item, d }) => {
        const target = { name: `${icon} ${item.label}`, lat: item.lat, lng: item.lng };
        return el('li', { class: 'item' },
          el('span', { class: 'item-main' }, el('span', { class: 'pr-ico', 'aria-hidden': 'true' }, icon),
            el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, `${item.label} · ${fmtDist(d)} · ${walkMinutes(d)} min`),
              item.detail ? el('span', { class: 'item-sub' }, item.detail) : null)),
          el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass(target), 'aria-label': `Boussole vers ${item.label}` }, ico('compass')),
          el('a', { class: 'go', href: mapsUrl(item, Math.min(d, 999)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${item.label}` }, 'Y aller'));
      }))
      : el('p', { class: 'empty' }, 'Aucune trouvée.'),
  ];
  openSheet('Pratique près de toi', el('div', { class: 'stack' },
    ...block('Fontaine à boire', '🚰', fs),
    ...block('Toilettes publiques', '🚻', ts),
    ...(cs.length ? block('Lieu frais (ombre, musée, bibliothèque…)', '🌳', cs) : []),
    el('p', { class: 'help' }, 'Données ouvertes de la Ville de Paris (ODbL), mises à jour chaque jour : fontaines, toilettes et îlots de fraîcheur. Les fontaines hors service sont écartées.'),
  ), { name: 'pratique', again: () => showPratique(from, fs, ts, cs), tall: true });
  nearLayer.clearLayers();
  meMarker(from.lat, from.lng).addTo(nearLayer);
  const pts = [[from.lat, from.lng]];
  for (const [list, icon] of [[fs, '🚰'], [ts, '🚻'], [cs, '🌳']]) {
    list.forEach(({ item }, i) => {
      pts.push([item.lat, item.lng]);
      L.marker([item.lat, item.lng], { interactive: false, keyboard: false, zIndexOffset: i ? 1500 : 2000,
        icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pr-pin${i ? ' far' : ''}">${icon}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(nearLayer);
    });
  }
  map.fitBounds(L.latLngBounds(pts).pad(0.3), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
}

document.getElementById('btnPratique').addEventListener('click', nearestPratique);
document.getElementById('btnMetro').addEventListener('click', nearestMetro);
document.getElementById('btnLocate').addEventListener('click', locateOnMap);
document.getElementById('btnZoomMe').addEventListener('click', zoomOnMe);
document.getElementById('btnVelib').addEventListener('click', () => showVelib());
document.getElementById('btnHome').addEventListener('click', goHome);

/* Ordre des boutons de la carte (réglable dans ⚙ → Boutons de la carte) */
const TOOL_INFO = {
  pratique: { el: 'btnPratique', icon: 'droplets', name: 'Fontaine et toilettes' },
  metro: { el: 'btnMetro', icon: 'Ⓜ', name: 'Métro le plus proche' },
  locate: { el: 'btnLocate', icon: 'locate-fixed', name: 'Ma position et cercles de temps' },
  paris: { el: 'btnParis', icon: 'Paris', name: 'Retour au centre de Paris' },
  zoom: { el: 'btnZoomMe', icon: 'zoom-in', name: 'Zoom sur ma position' },
  velib: { el: 'btnVelib', icon: 'bike', name: 'Vélib\' le plus proche' },
  home: { el: 'btnHome', icon: 'house', name: 'Rentrer (mes stations)' },
};
function applyToolOrder() {
  const box = document.querySelector('.map-tools');
  box.classList.toggle('left', state.toolsSide === 'left');
  const hidden = cleanHidden(state.hiddenTools);
  for (const t of normalizeTools(state.mapTools)) {
    const b = document.getElementById(TOOL_INFO[t].el);
    b.hidden = hidden.includes(t);
    box.append(b);
  }
}
applyToolOrder();
document.getElementById('btnParis').addEventListener('click', () => {
  closeSheet();
  map.setView(PARIS, 13, { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
});

/* ---------- Mes réglages par défaut ---------- */

function applyAllSettings() { applyTheme(); applyMapStyle(); applyToolOrder(); refresh(); }
function mySettingsBlock() {
  const ms = state.mySettings;
  const when = ms ? new Date(ms.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
  const save = () => { state = saveMySettings(state); persist(); openSettings(); toast('Réglages enregistrés par défaut'); };
  const restore = () => { state = applyMySettings(state); persist(); applyAllSettings(); openSettings(); toast('Tes réglages par défaut sont remis'); };
  return el('div', { class: 'my-settings' },
    !ms ? [
      el('button', { type: 'button', class: 'btn c-info solid', onclick: save }, ico('save'), 'Enregistrer mes réglages par défaut'),
      el('p', { class: 'help' }, 'Chaque changement est déjà gardé tout de suite. Ce bouton fixe ta configuration préférée (cercles, voix, favoris, boutons et style de la carte, mode sombre) pour pouvoir y revenir d\'un appui.'),
    ] : sameAsMySettings(state) ? [
      el('p', { class: 'ok-line' }, ico('check'), ` Réglages par défaut enregistrés le ${when}.`),
      el('button', { type: 'button', class: 'btn c-info', onclick: save }, 'Les enregistrer à nouveau'),
    ] : [
      el('p', { class: 'help' }, `Tu as changé des réglages depuis ceux enregistrés par défaut le ${when}.`),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn c-info solid', onclick: save }, ico('save'), 'Enregistrer'),
        el('button', { type: 'button', class: 'btn c-info', onclick: restore }, ico('refresh-cw'), 'Revenir aux miens')),
    ]);
}

/* ---------- Aide ---------- */

const HELP = [
  ['sparkles', 'Nouveautés', [
    '{navigation} Balade guidée : la boussole t\'emmène d\'étape en étape (Temps libre, Parcours, balade reçue).',
    '{calendar-days} Sorties du jour près de toi, {locate} Où suis-je ? et envoi de ta position, {house} Rentrer en 1 appui.',
    '{image} Ajouter un lieu depuis une photo, {qr-code} QR code d\'un lieu, lieux frais quand il fait chaud.',
    '{list-filter} Filtres en haut : ouvert maintenant, mieux notés, abrités, listes, personne.',
    '{hourglass} Temps libre, {shuffle} Surprise et {book-open-text} Curiosités dans Autour de moi.',
    '{bike} Vélib\' en temps réel, {map} Mon Paris, {share-2} partage d\'un lieu par lien, import Google Maps.',
    '{palette} 5 styles de carte, {moon} mode sombre, boutons de la carte à gauche ou à droite : dans {settings}.',
  ]],
  ['map', 'Les boutons de la carte', [
    'En haut : {search} chercher dans tes lieux (et dans l\'annuaire), {circle-help} cette aide.',
    'Puis « Tout », {list-filter} Filtres, {star} favoris et tes catégories. Fais glisser la barre pour toutes les voir.',
    'Catégories : touches-en une ou plusieurs ; touche-la encore pour la retirer, « Tout » pour tout revoir. Appui long : la modifier.',
    'À droite (ordre et boutons à cacher : {settings} → Boutons de la carte) :',
    '{droplets} la fontaine à boire, les toilettes et un lieu frais (ombre, musée, bibliothèque) les plus proches.',
    'M la station de métro la plus proche.',
    '{locate-fixed} ta position avec les cercles de temps à pied. Encore un appui pour les retirer.',
    'Le faisceau bleu autour de ton point montre la direction où tu regardes (si ton téléphone a une boussole).',
    'Paris : revenir au centre de Paris.',
    '{zoom-in} zoomer sur ta position, au niveau de la rue (environ 280 m à l\'écran).',
    '{bike} les 3 stations Vélib\' les plus proches avec des vélos ou des places libres.',
    '{house} Rentrer : quel métro prendre vers ta station Maison (ou Travail…). Tes stations : {settings} → Mes stations.',
    'En bas : {settings} Réglages, + Ajouter, Autour de moi.',
    'Changer l\'allure de la carte : {settings} → {palette} Style de la carte (Classique, Française, Douce, Pastel, Nuit).',
    'Fond sombre pour toute l\'appli : {settings} → {moon} Mode sombre. Boutons à gauche : {settings} → Boutons de la carte → À gauche.',
    'Tes réglages sont gardés à chaque changement. En bas des {settings} Réglages, « Enregistrer mes réglages par défaut » fixe ta configuration préférée ; « Revenir aux miens » la remet d\'un appui.',
  ]],
  ['list-filter', 'Filtres', [
    'Le bouton {list-filter}, juste après « Tout », ouvre : {clock} Ouvert maintenant, {star} Mes mieux notés (4 étoiles et plus), {umbrella} Abrités, tes {list} listes et, si tu as des lieux d\'amis, de qui afficher les lieux.',
    'Le chiffre sur le bouton = nombre de filtres actifs. « Effacer les filtres » remet tout.',
    'Ils s\'appliquent à la carte, à la recherche, à Autour de moi et au Temps libre.',
    'Ouvert maintenant ne garde que les lieux dont on connaît les horaires.',
  ]],
  ['plus', 'Ajouter un lieu', [
    'Laisse le doigt appuyé sur la carte à l\'endroit voulu.',
    'Ou + Ajouter → À ma position, ou → Avec un nom ou une adresse (ex. « Uniqlo Opéra »).',
    'Depuis Google Maps ou un site : Partager → Ma carte. Le nom et l\'adresse se remplissent seuls.',
    '{image} Depuis une photo de ta galerie : l\'appli place le lieu là où la photo a été prise, et l\'ajoute à sa fiche.',
    'Si le lieu existe déjà tout près, l\'appli te prévient : « Voir ce lieu » ou « Ajouter quand même ».',
    'Dans le formulaire : catégorie, note, état, {star} étoiles, {list} listes et « Abrité de la pluie ».',
  ]],
  ['map-pinned', 'Autour de moi', [
    'Tes lieux rangés par cercles, du plus proche au plus loin.',
    '{radio} Suivre : les cercles te suivent ; le téléphone vibre et parle à 100 m d\'un lieu à faire (appli ouverte).',
    '{hourglass} Temps libre : choisis ton temps et le temps sur place ; l\'appli trace une boucle qui revient au départ, mieux notés en priorité, sans les lieux fermés à ton arrivée.',
    '{navigation} Balade guidée (Temps libre, Parcours) : la boussole te mène d\'étape en étape ; « Étape suivante » passe à la suite. Tes lieux atteints sont notés « déjà visité ».',
    '{footprints} Chemin : tes lieux à faire sur ton trajet. {route} Parcours : 2 à 4 lieux dans le meilleur ordre.',
    '{shuffle} Surprise : un lieu à faire au hasard, à moins de 15 min.',
    '{book-open-text} Curiosités : articles Wikipédia autour de toi ; + pour en faire un lieu.',
    'M Station : ce qu\'il y a autour d\'une station, sans GPS (pratique dans le métro).',
    '{cloud-rain} S\'il pleut, un bandeau propose de n\'afficher que tes lieux abrités.',
    '{calendar-days} Sorties : les événements du jour à moins de 2 km (agenda de la Ville de Paris).',
    '{locate} Où suis-je ? : ton adresse, l\'arrondissement, la station la plus proche, et « Envoyer ma position » à quelqu\'un.',
    'Mètres / Minutes, à côté : la taille des cercles.',
    '{thermometer-sun} S\'il fait chaud, un bandeau propose les lieux frais.',
    'En bas : {map} Mon Paris.',
  ]],
  ['compass', 'La fiche d\'un lieu', [
    'Touche un lieu sur la carte pour ouvrir sa fiche.',
    'La grande barre « Y aller » ouvre Google Maps et indique le temps à pied.',
    '{compass} Boussole : une flèche et une voix te guident. M Métro : la ligne et la correspondance, estimées. {camera} Photo : l\'appareil photo direct.',
    '{star} Étoiles : ta note de 1 à 5 ; touche la même étoile pour la retirer.',
    'En dessous : Déjà visité, Favori, Modifier, et ⋯ Plus : {share-2} partager, horaires, déplacer, supprimer.',
  ]],
  ['camera', 'Photos', [
    '{camera} Photo dans la fiche ouvre l\'appareil photo (6 photos par lieu).',
    'Touche la vignette à gauche de la fiche : voir les photos, en ajouter depuis la {image-plus} Galerie, ou {x} supprimer.',
    'Les photos restent sur ton téléphone, sans leur position GPS.',
  ]],
  ['tags', 'Catégories, listes et favoris', [
    '{settings} → Catégories et listes : ajoute tes catégories (14 toutes prêtes), icône, couleur et ordre avec ↑ ↓ (l\'ordre de la barre du haut).',
    '« Icônes seules en haut » : la barre n\'affiche que les logos.',
    'Une {list} liste regroupe des lieux de catégories différentes (« Sous la pluie », « Avec Paul ») ; crée-la depuis Modifier.',
    'Favori : bouton dans la fiche ; {settings} → Favoris pour l\'icône et la couleur (un cœur évite la confusion avec les étoiles).',
  ]],
  ['map', 'Mon Paris', [
    'Les 20 arrondissements se colorent selon les lieux « Déjà visité ». Chaque case : visités / enregistrés.',
    'Accès : en bas d\'Autour de moi, ou {settings} → Mon Paris. Ta marche du jour y est aussi.',
  ]],
  ['users', 'Partager avec un ami', [
    'Un lieu : ⋯ Plus → {share-2} Partager (lien) ou {qr-code} QR code à scanner. Ton ami l\'enregistre en un appui.',
    'Une balade : « Partager » dans Temps libre ou Parcours. Ton ami la reçoit avec la balade guidée.',
    'Te retrouver : Autour de moi → {locate} Où suis-je ? → Envoyer ma position. Ton ami a une boussole vers toi.',
    'Tous tes lieux : {settings} → Sauvegarde et partage, écris ton prénom, Exporter, envoie le fichier ; ton ami fait Importer.',
    'Ensuite, {list-filter} Filtres → « Lieux de » : les tiens, les siens ou tous.',
    'L\'appli elle-même : envoie le lien limopo74.github.io/Carte-paris/',
  ]],
  ['save', 'Sauvegarder (important)', [
    'Tes lieux ne sont que sur ce téléphone. Exporte-les souvent : {settings} → Sauvegarde et partage → Exporter.',
    'Le fichier va dans tes Téléchargements. Sur un autre téléphone : Importer.',
    '{download} Importer de Google Maps : tes listes et tes lieux enregistrés (les étapes sont expliquées). Les listes .csv sont cherchées par leur nom : vérifie les lieux marqués « à vérifier ».',
  ]],
  ['zap', 'Raccourcis sur l\'icône', [
    'Appui long sur l\'icône de l\'appli : Métro, Autour de moi, Ajouter ici, Fontaine et WC.',
    'Absents ? Exporte tes lieux, supprime l\'icône et réinstalle-la depuis Chrome (⋮ → Ajouter à l\'écran d\'accueil).',
  ]],
  ['palette', 'Le code couleur', [
    'Bleu nuit : y aller · Bleu métro : métro · Vert-bleu : se guider · Vert : ajouter, garder · Doré : favori, surprise · Violet : aide, réglages, curiosités · Rouge : supprimer · Gris : le reste.',
  ]],
  ['wrench', 'Ça ne marche pas ?', [
    'Position refusée : Chrome ⋮ → Paramètres → Paramètres des sites → Position → autorise limopo74.github.io, et allume la Position du téléphone.',
    'Carte grise : vérifie internet, puis {settings} → Application → Recharger la carte.',
    'Perdu sur la carte : Paris, ou {zoom-in} pour revenir sur toi.',
    'Une nouveauté n\'apparaît pas : {settings} → Application → Mettre à jour l\'appli.',
    'La voix ne parle pas : monte le volume, et vérifie {settings} → Voix.',
    'Vélib\', Curiosités ou météo muets : ces services en ligne ne répondent peut-être pas ; réessaie plus tard.',
    'Boussole « indisponible » : le téléphone ne donne pas son orientation ; la flèche montre la direction, nord en haut.',
  ]],
];

function openHelp() {
  openSheet('Aide', el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Touche un sujet pour l\'ouvrir.'),
    el('div', { class: 'help-list' }, HELP.map(([icon, title, lines]) => el('details', { class: 'help-item' },
      el('summary', {}, el('span', { class: 'menu-ico help-ico', 'aria-hidden': 'true' }, ico(icon)), el('span', { class: 'help-title' }, title)),
      el('ul', {}, lines.map((l) => el('li', {}, ...l.split(/\{([a-z0-9-]+)\}/).map((part, i) => (i % 2 ? (ICON_NAMES.has(part) ? ico(part, { size: 17 }) : '') : part)))))))),
    el('p', { class: 'help' }, `Version du ${VERSION}.`),
  ), { name: 'help', again: openHelp, tall: true });
}

/* ---------- Démarrage ---------- */

document.getElementById('btnAdd').addEventListener('click', openAddChoice);
document.getElementById('btnNear').addEventListener('click', openNear);
document.getElementById('btnSettings').addEventListener('click', openSettings);
document.getElementById('btnSearch').addEventListener('click', () => openSearch());
document.getElementById('btnHelp').addEventListener('click', openHelp);
// Échap ferme la feuille ouverte (ou la boussole, la photo en grand)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  if (!document.getElementById('viewer')?.hidden) { history.back(); return; }
  if (!document.getElementById('compass')?.hidden) { history.back(); return; }
  if (!sheet.hidden) { e.preventDefault(); closeSheet(); }
});

renderChips();
renderMarkers();
if (state.points.length) {
  map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 15, animate: false });
} else {
  toast('Appuie sur « + Ajouter », ou laisse le doigt appuyé sur la carte, pour enregistrer ton premier lieu. Le bouton ? en haut à droite explique tout.');
}
if (!state.ok) toast('Le stockage de ce téléphone n\'est pas lisible : pense à exporter tes lieux.', true);

const launched = location.search.length > 1;
runLaunchAction();
if (!launched && state.ok && backupDue(state)) remindBackup();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
