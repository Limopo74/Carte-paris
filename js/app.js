// Interface de « Ma carte de Paris ».
import { svgIcon, glyphHTML, ICON_SVG } from './icons.js';
const ICON_NAMES = new Set(Object.keys(ICON_SVG));
import { distanceM, walkMinutes, normalizeRings, groupByRings, mapsUrl, minutesToMeters, normalizeMinuteRings } from './geo.js';
import {
  KEY, PALETTE, ICONS, FAV_COLORS, newPoint, loadState, saveState, exportJSON, mergeImport,
  addCategory, updateCategory, deleteCategory, moveCategory, moveTool, normalizeTools, cleanHidden, DEFAULT_HIDDEN, addList, addMyStation, removeMyStation, saveMySettings, applyMySettings, sameAsMySettings, renameList, deleteList, setListMembers, setFavStyle, setDone, exportFileName, suggestedPresets, backupDue, unsavedCount,
  fileOwner, owners,
} from './store.js';
import { timeAgo, formatDate, todoSummary, categoryCounts, nearestStation, nearestStations } from './stats.js';
import { searchAddress, reverseAddress, reverseInfo } from './adresse.js';
import { searchPlaces } from './annuaire.js';
import { parseShared } from './share.js';
import { exportUrl, parseRecords, nearestOf } from './pratique.js';
import { openState, minutesLeft, closedDaysText } from './hours.js';
import { isExpo, lastChance, endText, weekExpos, weekText, galleriesUrl, parseGalleries, galleriesNear, freeToday, freeNear, FREE_CHECKED, FREE_SOURCE, highlightsSoon, highlightText, HIGHLIGHTS_CHECKED, listsStale, quarterSearchUrl, pickQuarter, extractUrl, readExtract, leaveAt, ticketToday } from './art.js';
import { holidayOn } from './holidays.js';
import { cleanJournal, addWalk, addUse, resetJournal, prune as pruneJournal, lastDays, totals, placesStats, arrProgress, WALK_M_PER_MIN } from './journal.js';
import { metroPlan, lineName, linesOf } from './metroplan.js';
import { putPhoto, getPhoto, deletePhoto, compressImage, blobToDataUrl, dataUrlToBlob, MAX_PHOTOS } from './photos.js';
import { searchPoints, fold } from './search.js';
import { eventsUrl, weekEventsUrl, parseEvents, nearbyEvents, whenText, streetKind, isFleaMarket, genreOf, startsLater } from './events.js';
import { MARKETS_URL, parseMarkets, hoursToday, marketsOn, nearestMarkets, airUrl, readAir } from './markets.js';
import qrcode from '../vendor/qrcode.mjs';
import { routeLink, readRouteLink, meetLink, readMeetLink, planLoopOpen, gpsFromJpeg } from './explore.js';
import { placeLink, readPlaceLink, planLoop, loopUrl, parseTakeout, findDuplicate, wikiUrl, parseWiki, wikiPage, arrFromText, arrFromCitycode, ARR_GRID, HIST_URL, parseHist, merimeeUrl, VELIB_INFO, VELIB_STATUS, VELIB_PARIS, parseVelibParis, mergeVelib, nearestVelib, meteoUrl, readMeteo } from './explore.js';
import {
  bearing, relativeAngle, compassLabel, bestFix, onTheWay, MAX_DETOUR_M,
  orderRoute, routeLength, routeUrl, MAX_ROUTE, newlyNear, directionWord, spokenDistance, walkSegment, stepsFor, dayKey,
} from './move.js';

const L = window.L;
const VERSION = '16 novembre 2026 (91)';
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
  const m = el('span', { class: 'fav-mark', role: 'img', 'aria-label': 'Favori' }, glyph(state.fav.icon, { filled: true }));
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

/* Retour visible : toujours « ← nom de l'écran d'avant », jamais un « Retour » sans destination. */
const named = (label, fn) => Object.assign(fn, { label });
const BACK_NAMES = new Map([[openEvents, 'Sorties'], [openMonuments, 'Monuments'], [openFreeTime, 'J\'ai du temps'], [openRoutes, 'Itinéraire'], [openCuriosities, 'Curiosités'], [openFilters, 'Filtres'], [openWeekExpos, 'Expos de la semaine']]);
const backLabel = (fn) => fn?.label ?? BACK_NAMES.get(fn) ?? 'Retour';
const backBtn = (fn) => el('button', { type: 'button', class: 'btn', onclick: fn }, `← ${backLabel(fn)}`);
/** Barre collée en bas de la feuille : le retour (et Enregistrer) reste sous le pouce même sur une page longue. */
const foot = (...kids) => { const k = kids.flat().filter(Boolean); return k.length ? el('div', { class: 'sheet-foot' }, ...k) : null; };

/* ---------- Carte ---------- */

const map = L.map('map', { zoomControl: false, attributionControl: true }).setView(PARIS, 13);
const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
// Fonds de carte sans clé : OpenStreetMap, et les rendus d'OpenStreetMap France (« FR » et humanitaire).
// Pastel et Nuit sont des filtres de couleur appliqués sur le téléphone : aucun service de plus.
const STYLE_INFO = {
  classic: { name: 'Classique', sub: 'La carte OpenStreetMap habituelle', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: OSM_ATTR, maxZoom: 19 },
  clean: { name: 'Épuré', sub: 'Sans icônes de commerces (CARTO, clé gratuite)', url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key={k}', attr: `${OSM_ATTR}, © <a href="https://carto.com/attributions">CARTO</a>`, maxZoom: 20 },
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
let noCorsTiles = false;
/* Clé CARTO du style Épuré : saisie par toi, gardée sur ce téléphone seulement (ni sauvegarde, ni partage, ni GitHub). */
const CARTO_KEY = 'carte-paris.carto';
const cartoKey = () => { try { return localStorage.getItem(CARTO_KEY) ?? ''; } catch { return ''; } };
const validCartoKey = (k) => /^[A-Za-z0-9_.-]{8,200}$/.test(k);
function applyMapStyle() {
  // Épuré sans clé : on garde le style Classique (le choix reste enregistré pour quand la clé sera là)
  const id = state.mapStyle === 'clean' && !cartoKey() ? 'classic' : state.mapStyle;
  const st = STYLE_INFO[id] ?? STYLE_INFO.classic;
  if (tiles) map.removeLayer(tiles);
  // Tuiles demandées en CORS : le service worker peut les garder pour le métro sans réseau.
  // Filet de sécurité : si elles échouent toutes alors qu'on est en ligne, on revient au mode normal.
  const cors = !noCorsTiles && /tile\.openstreetmap\.org|basemaps\.cartocdn\.com/.test(st.url);
  tiles = L.tileLayer(st.url, { maxZoom: st.maxZoom, subdomains: 'abc', attribution: st.attr, crossOrigin: cors ? 'anonymous' : undefined, k: cartoKey() }).addTo(map);
  if (cors) {
    let ok = 0; let bad = 0;
    tiles.on('tileload', () => { ok++; });
    tiles.on('tileerror', () => { if (++bad >= 6 && !ok && navigator.onLine) { noCorsTiles = true; applyMapStyle(); } });
  }
  document.getElementById('map').dataset.style = id ?? 'classic';
}

/** Saisir, changer ou retirer la clé CARTO (style Épuré). */
function openCartoKey(back = () => openSettings('style')) {
  const has = cartoKey();
  const input = el('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Colle ta clé ici', 'aria-label': 'Clé CARTO' });
  const err = el('div', { class: 'error', role: 'alert' });
  const save = () => {
    const k = input.value.trim();
    if (!validCartoKey(k)) { err.textContent = 'Cette clé ne ressemble pas à une clé CARTO : vérifie le copier-coller.'; return; }
    try { localStorage.setItem(CARTO_KEY, k); } catch { err.textContent = 'Le téléphone refuse de garder la clé.'; return; }
    state.mapStyle = 'clean'; persist(); applyMapStyle(); toast('Carte : Épuré'); back();
  };
  openSheet([ico('palette'), ' Style Épuré : clé CARTO'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Le style Épuré vient de CARTO, qui demande une clé gratuite pour un usage personnel (5 millions de tuiles par mois : ton usage en fait quelques milliers). Comme OpenStreetMap, CARTO voit les quartiers affichés à l\'écran, jamais tes lieux.'),
    el('ol', { class: 'steps' },
      el('li', {}, 'Ouvre la page CARTO ci-dessous et demande une clé (usage non commercial).'),
      el('li', {}, 'Copie la clé reçue.'),
      el('li', {}, 'Colle-la ici et touche Enregistrer.')),
    el('a', { class: 'btn c-disc', href: 'https://carto.com/basemaps/apikey/', target: '_blank', rel: 'noopener' }, ico('send'), 'Demander une clé sur carto.com'),
    el('label', { class: 'field' }, has ? 'Nouvelle clé' : 'Ta clé', input),
    err,
    el('button', { type: 'button', class: 'btn c-info solid', onclick: save }, ico('save'), 'Enregistrer la clé'),
    has ? el('button', { type: 'button', class: 'btn danger', onclick: () => { try { localStorage.removeItem(CARTO_KEY); } catch { /* rien */ } if (state.mapStyle === 'clean') state.mapStyle = 'classic'; persist(); applyMapStyle(); toast('Clé retirée : carte Classique'); back(); } }, 'Retirer la clé') : null,
    el('p', { class: 'help' }, 'La clé reste sur ce téléphone : elle n\'est ni dans ta sauvegarde, ni dans les liens partagés, ni sur GitHub. Ne la donne pas dans une conversation.'),
    foot(el('button', { type: 'button', class: 'btn', onclick: back }, '← Style de la carte')),
  ), { name: 'carto-key' });
}
applyMapStyle();

// Pastilles plus petites quand on voit une grande partie de Paris, pour éviter qu'elles se chevauchent.
const mapEl = document.getElementById('map');
const scalePins = () => {
  const z = map.getZoom();
  mapEl.classList.toggle('z-far', z < 15);
  mapEl.classList.toggle('z-st', z >= 15); // stations des lignes
  mapEl.classList.toggle('z-name', z >= 16); // et leurs noms
};
map.on('zoomend', scalePins);
map.on('zoomend', () => { if (view === 'near' && origin) drawNear(); if (meShown) drawMe(); });
scalePins();

/** Point « moi » toujours au-dessus des lieux. */
function meMarker(lat, lng, grey = false) {
  // Le cône (direction où tu regardes) apparaît dès que le téléphone donne son orientation.
  if (!grey) startHeading();
  const cone = grey ? '' : `<span class="me-cone"${mapHeading == null ? ' hidden' : ''} style="transform:rotate(${mapHeading ?? 0}deg)"><svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"><defs><linearGradient id="cg" gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="40" y2="0"><stop offset="0" class="cone-a"/><stop offset="1" class="cone-b"/></linearGradient></defs><path class="cone-halo" d="M40 40 L18 4 A44 44 0 0 1 62 4 Z"/><path class="cone-fill" d="M40 40 L18 4 A44 44 0 0 1 62 4 Z" fill="url(#cg)"/></svg></span>`;
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

/** Initiale d'un proche pour son épingle : une seule lettre, jamais de texte saisi brut dans le HTML. */
const initialOf = (name) => (String(name).match(/\p{L}|\p{N}/u)?.[0] ?? '?').toLocaleUpperCase('fr');

function renderMarkers() {
  pointsLayer.clearLayers();
  for (const p of visible()) {
    if (moving && moving.id === p.id) continue; // le viseur le remplace pendant le déplacement
    const c = catOf(p.cat);
    // Icônes et couleurs viennent de listes fixes : pas de texte saisi dans ce HTML.
    const ring = p.fav ? `box-shadow:0 0 0 3px ${state.fav.color},0 2px 6px rgba(0,0,0,.35);` : '';
    const html = `<span class="pin${p.done ? ' done' : ''}" style="background:${c.color};${ring}"><span class="pin-in">${glyphHTML(c.icon, { size: 17, filled: true, stroke: 2.2 })}</span>${p.fav ? `<span class="pin-fav" style="color:${state.fav.color}">${glyphHTML(state.fav.icon, { size: 11, filled: true, stroke: 2.4 })}</span>` : ''}${p.owner ? `<span class="pin-who" aria-hidden="true">${initialOf(p.owner)}</span>` : ''}</span>`;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'pin-wrap', html, iconSize: [32, 32], iconAnchor: [16, 39] }),
      zIndexOffset: p.fav ? 500 : 0,
      alt: p.name,
    })
      .on('add', (e) => { const n = e.target.getElement(); if (n) { n.setAttribute('aria-label', `${p.name}, ${c.name}${p.done ? ', déjà visité' : ''}${p.fav ? ', favori' : ''}${p.owner ? `, lieu de ${p.owner}` : ''}`); n.removeAttribute('alt'); } })
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
  // Boutons masqués dans les réglages ; un bouton reste visible tant que son filtre est actif, pour pouvoir l'enlever
  const hidden = new Set(state.hiddenChips ?? []);
  const show = (key, active) => !hidden.has(key) || active;
  fill(box, ...[
    // « Tout » = toutes les catégories et pas seulement les favoris : un appui enlève les deux
    show('all', false) ? chip('Tout', !filterCats.size && !favOnly, () => { filterCats.clear(); favOnly = false; refresh(); }) : null,
    show('filters', activeFilters() > 0) ? chip([ico('list-filter'), activeFilters() ? ` ${activeFilters()}` : ''], activeFilters() > 0, openFilters,
      { class: 'filters', aria: activeFilters() ? `Filtres : ${activeFilters()} actifs` : 'Filtres' }) : null,
    show('fav', favOnly) ? chip(glyph(state.fav.icon, { filled: true, size: 20 }), favOnly, () => { favOnly = !favOnly; refresh(); emptyHint(); }, { class: 'star', aria: 'Seulement les favoris' }) : null,
    show('street', Boolean(state.showMarkets)) ? chip(ico('tent'), Boolean(state.showMarkets), () => {
      state.showMarkets = !state.showMarkets; persist(); drawMarkets(); refresh();
      toast(state.showMarkets ? 'Dans la rue aujourd\'hui : marchés, brocantes, fêtes et expos en plein air sur la carte' : 'Dans la rue aujourd\'hui : masqué');
    }, { class: 'street', aria: 'Dans la rue aujourd\'hui : marchés, brocantes, fêtes, expos en plein air' }) : null,
    show('lines', Boolean(state.showLines)) ? chip(ico('lines'), Boolean(state.showLines), toggleLines, { class: 'lines', aria: 'Lignes de métro et RER' }) : null,
    ...state.categories.filter((c) => show(`cat:${c.id}`, filterCats.has(c.id))).map(catChip),
  ].filter(Boolean));
  const star = box.querySelector('.star');
  if (!star) { /* favoris masqués */ } else if (favOnly) { star.style.background = state.fav.color; star.style.borderColor = state.fav.color; star.style.color = '#fff'; } else star.style.color = state.fav.color;
  // La catégorie choisie reste visible dans la barre
  const on = lastToggled && box.querySelector(`.chip[data-cat="${lastToggled}"]`);
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  lastToggled = null;
}

/** Barre du haut : afficher, masquer et ranger se font sur une seule page, Réglages → Catégories et listes. */
function openChipsSettings() { openSettings('categories'); }

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
  // Lignes masquées dans « Choisir les filtres affichés » ; une ligne active reste visible pour pouvoir l'éteindre
  const hid = new Set(state.hiddenFilters ?? []);
  const keep = (key, active) => !hid.has(key) || active;
  const withTitle = (title, rows) => (rows.some(Boolean) ? [el('h3', { class: 'ring-title menu-group' }, title), ...rows] : []);
  openSheet([ico('list-filter'), ' Filtres'], el('div', { class: 'menu' },
    el('p', { class: 'help' }, `${plural(shown, 'lieu affiché', 'lieux affichés')} sur ${state.points.length}.`),
    // Le titre n'apparaît que s'il reste au moins un filtre dessous (tout peut être masqué dans « Choisir les filtres affichés »)
    ...withTitle('Filtrer mes lieux', [
      !keep('open', filt.open) ? null : sw(filt.open, 'clock', 'Ouvert maintenant', withHours ? `${plural(count((p) => openState(p.hours)?.open === true), 'ouvert', 'ouverts')} sur ${withHours} avec horaires` : 'Aucun lieu n\'a encore d\'horaires', () => { filt.open = !filt.open; }),
      !keep('top', filt.top) ? null : sw(filt.top, 'star', 'Mes mieux notés', `4 étoiles et plus · ${plural(count((p) => (p.stars ?? 0) >= 4), 'lieu', 'lieux')}`, () => { filt.top = !filt.top; }),
      !keep('covered', filt.covered) ? null : sw(filt.covered, 'umbrella', 'Abrités (pluie)', plural(count((p) => p.covered), 'lieu coché « abrité »', 'lieux cochés « abrité »'), () => { filt.covered = !filt.covered; }),
      !keep('lists', filt.lists.size > 0) ? null : el('h3', { class: 'ring-title', style: 'margin-top:10px' }, el('span', {}, 'Mes listes'), el('span', {}, '')),
      !keep('lists', filt.lists.size > 0) ? null : (state.lists ?? []).length
        ? el('div', { class: 'list-chips' }, state.lists.map((l) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(filt.lists.has(l.id)), onclick: () => {
          if (filt.lists.has(l.id)) filt.lists.delete(l.id); else filt.lists.add(l.id); refresh(); openFilters();
        } }, ico('list'), ` ${l.name} `, el('span', { class: 'cat-count' }, String(count((p) => p.lists?.includes(l.id)))))))
        : el('p', { class: 'help' }, 'Aucune liste. Crée-en une en modifiant un lieu (« Mes listes »).'),
      people.length && keep('people', personFilter !== 'all') ? el('h3', { class: 'ring-title', style: 'margin-top:10px' }, el('span', {}, 'Lieux de mes proches'), el('span', {}, '')) : null,
      people.length && keep('people', personFilter !== 'all') ? el('div', { class: 'list-chips' },
        [['all', 'Tout le monde', state.points.length], ['', state.me ? `Moi (${state.me})` : 'Moi', count((p) => !p.owner)], ...people.map((o) => [o.name, o.name, o.n])]
          .map(([who, label, n]) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(personFilter === who), onclick: () => { personFilter = who; refresh(); openFilters(); } },
            ico(who === 'all' ? 'users' : 'map-pin'), ` ${label} `, el('span', { class: 'cat-count' }, String(n))))) : null,
      activeFilters() ? el('button', { type: 'button', class: 'btn', style: 'margin-top:8px', onclick: () => {
        filt.open = false; filt.top = false; filt.covered = false; filt.lists.clear(); personFilter = 'all'; refresh(); openFilters(); toast('Filtres effacés');
      } }, ico('x'), 'Effacer les filtres') : null,
    ]),
    keep('lines', state.showLines) || keep('markets', state.showMarkets) ? el('h3', { class: 'ring-title menu-group' }, 'Ajouter sur la carte') : null,
    !keep('lines', state.showLines) ? null : sw(Boolean(state.showLines), 'lines', 'Lignes de métro et RER', 'Les tracés dans leurs couleurs (aussi : appui long sur M)', () => { state.showLines = !state.showLines; persist(); drawLines(); }),
    !keep('markets', state.showMarkets) ? null : sw(Boolean(state.showMarkets), 'tent', 'Dans la rue aujourd\'hui', 'Marchés, brocantes, fêtes, expos en plein air, marchés éphémères', () => { state.showMarkets = !state.showMarkets; persist(); drawMarkets(); }),
    el('button', { type: 'button', class: 'btn c-info', style: 'margin-top:8px', onclick: () => openFilterChoice() }, ico('settings'), hid.size ? `Choisir les filtres affichés (${hid.size} masqué${hid.size > 1 ? 's' : ''})` : 'Choisir les filtres affichés'),
  ), { name: 'filters', again: openFilters, tall: true });
}

/** Choisir d'un coup les lieux d'une liste : cases à cocher, recherche par nom, enregistrement en un appui. */
function openListPlaces(listId, query = '', picked = null) {
  const list = (state.lists ?? []).find((l) => l.id === listId);
  if (!list) { openSettings('categories'); return; }
  const sel = picked ?? new Set(state.points.filter((p) => p.lists?.includes(listId)).map((p) => p.id));
  const from = freshHere() ?? origin;
  const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(query.trim());
  // Ceux de la liste d'abord, puis les plus proches (ou par nom sans position)
  const pts = state.points.filter((p) => !q || norm(`${p.name} ${p.address ?? ''} ${catOf(p.cat).name}`).includes(q))
    .map((p) => ({ p, d: from ? distanceM(from, p) : null }))
    .sort((a, b) => (sel.has(b.p.id) - sel.has(a.p.id)) || (a.d != null && b.d != null ? a.d - b.d : a.p.name.localeCompare(b.p.name, 'fr')));
  const save = el('button', { type: 'button', class: 'btn c-add solid', onclick: () => {
    state = setListMembers(state, listId, [...sel]); persist(); refresh(); openSettings('categories');
    toast(`« ${list.name} » : ${plural(sel.size, 'lieu', 'lieux')}`);
  } });
  const count = () => { save.textContent = `Enregistrer (${plural(sel.size, 'lieu', 'lieux').replace(' ', '\u00a0')})`; };
  count();
  const search = el('input', { type: 'search', value: query, placeholder: 'Chercher un lieu', 'aria-label': 'Chercher un lieu', enterkeyhint: 'search' });
  let t = null;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { openListPlaces(listId, search.value, sel); const s2 = document.querySelector('#sheet input[type=search]'); s2?.focus(); s2?.setSelectionRange(s2.value.length, s2.value.length); }, 250); });
  const rows = pts.slice(0, 200).map(({ p, d }) => {
    const box = el('input', { type: 'checkbox', class: 'check', checked: sel.has(p.id), 'aria-label': p.name });
    box.addEventListener('change', () => { if (box.checked) sel.add(p.id); else sel.delete(p.id); count(); });
    return el('li', { class: 'item' }, el('label', { class: 'item-main check-row' }, box,
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, p.name),
        el('span', { class: 'item-sub' }, [catOf(p.cat).name, d != null ? fmtDist(d) : ''].filter(Boolean).join(' · ')))));
  });
  openSheet([ico('list'), ` ${list.name}`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Coche les lieux de cette liste, décoche ceux à retirer, puis Enregistrer. Les lieux restent sur ta carte.'),
    search,
    rows.length ? el('ul', { class: 'items' }, rows) : el('p', { class: 'empty' }, query ? 'Aucun lieu ne correspond.' : 'Aucun lieu sur ta carte.'),
    pts.length > 200 ? el('p', { class: 'help' }, `${pts.length - 200} lieux de plus : cherche par nom pour les trouver.`) : null,
    foot(el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openSettings('categories') }, '← Catégories et listes'),
      save)),
  ), { tall: true, name: `list:${listId}`, again: () => openListPlaces(listId, '', sel) });
}

/** Quelles lignes montrer dans la feuille Filtres (masquer ne change rien aux lieux). */
function openFilterChoice(back = openFilters) {
  const hid = new Set(state.hiddenFilters ?? []);
  const rows = [['open', 'clock', 'Ouvert maintenant'], ['top', 'star', 'Mes mieux notés'], ['covered', 'umbrella', 'Abrités (pluie)'], ['lists', 'list', 'Mes listes'], ['people', 'users', 'Lieux de mes proches'], ['lines', 'lines', 'Lignes de métro et RER'], ['markets', 'tent', 'Dans la rue aujourd\'hui']];
  openSheet([ico('settings'), ' Filtres affichés'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Allumé : la ligne est dans Filtres. Masquer une ligne ne supprime rien, et une ligne dont le filtre est actif reste visible pour pouvoir l\'éteindre.'),
    el('div', { class: 'menu' }, rows.map(([key, icon, title]) => {
      const on = !hid.has(key);
      return el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(on), onclick: () => {
        if (on) hid.add(key); else hid.delete(key);
        state.hiddenFilters = [...hid]; persist(); openFilterChoice(back);
      } },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(icon)),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title)),
      el('span', { class: `switch${on ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));
    })),
    hid.size ? el('button', { type: 'button', class: 'btn c-guide', onclick: () => { state.hiddenFilters = []; persist(); openFilterChoice(back); } }, 'Tout réafficher') : null,
    foot(backBtn(back)),
  ), { name: 'filter-choice', again: () => openFilterChoice(back) });
}

/** Ajoute ou retire une catégorie du filtre du haut. */
let lastToggled = null;
function toggleCat(id) {
  if (filterCats.has(id)) filterCats.delete(id); else filterCats.add(id);
  lastToggled = id;
  refresh();
  emptyHint();
}
/** Si la combinaison choisie en haut ne montre plus aucun lieu, le dire (sinon la carte vide fait croire à une panne). */
function emptyHint() {
  if (!state.points.length || visible().length) return;
  const cats = [...filterCats].map((id) => catOf(id).name).join(', ');
  toast(favOnly && cats ? `Aucun favori dans ${cats}. « Tout » remet tout.` : favOnly ? 'Aucun favori pour l\'instant : ★ dans la fiche d\'un lieu.' : 'Aucun lieu avec ces filtres. « Tout » remet tout.');
}

/** Redessine ce qui dépend des lieux et des filtres. */
function refresh() {
  renderChips();
  renderMarkers();
  updateNow(true);
  if (view === 'near' && origin) renderNear();
}

/* ---------- Feuille du bas (avec retour Android) ---------- */

const sheet = document.getElementById('sheet');
const sheetTitle = document.getElementById('sheetTitle');
const sheetBody = document.getElementById('sheetBody');
let onSheetClose = null;
let historyPushed = false;
let view = null; // nom de l'écran affiché ('near' pour « Autour de moi »…)
let quietId = null; // suivi discret de la position, seulement sur Autour de moi
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
  if (name !== 'near') stopQuietNear(); // la position n'est suivie que sur l'écran Autour de moi
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
  stopQuietNear();
  view = null;
  navStack = [];
  fill(sheetBody, );
  draftLayer.clearLayers();
  nearLayer.clearLayers();
  if (moving) stopMove();
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
let markets = null; // marchés de la Ville (liste gardée sur le téléphone)
// Mes chiffres : totaux par jour, sur le téléphone seulement (pas dans la sauvegarde, jamais le tracé)
const JOURNAL_KEY = 'carte-paris.journal';
let journal = (() => { try { return pruneJournal(cleanJournal(JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? 'null'))); } catch { return cleanJournal(null); } })();
let journalSavedAt = 0;
function saveJournal(force = false) {
  if (!force && Date.now() - journalSavedAt < 30000) return;
  journalSavedAt = Date.now();
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(pruneJournal(journal))); } catch { /* stockage plein : tant pis */ }
}
const lastUse = new Map();
/** Compte une utilisation (une fois par minute au plus pour une même fonction). */
function track(name) {
  if (Date.now() - (lastUse.get(name) ?? 0) < 60000) return;
  lastUse.set(name, Date.now());
  addUse(journal, name);
  saveJournal(true);
}
let marketsTime = 0; // date de cette liste
let nowHidden = false; // carte « Maintenant » cachée par la croix
let nowLast = 0;
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
  updateNow();
}

/** Moment de la journée pour « Maintenant » (types de lieux mis en avant), ou null. */
function timeSlot(now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60;
  if (h >= 7 && h < 11) return { label: 'Ce matin', re: /caf[ée]|boulang|p[âa]tiss|brunch|petit[- ]d[ée]j|march[ée]/i, markets: true };
  if (h >= 11.5 && h < 14.5) return { label: 'Ce midi', re: /resto|restaurant|bistro|brasserie|cantine|d[ée]jeuner|street ?food/i, markets: true };
  if (h >= 18 && h < 23.5) return { label: 'Ce soir', re: /resto|restaurant|bistro|brasserie|bar\b|bars\b|cave|vin|cocktail|ap[ée]ro|concert|cin[ée]/i, markets: false };
  return null;
}
/** Le marché se tient-il en ce moment ? (horaires du jour « 7h–14h30 » ; inconnus : non) */
function marketOpenNow(m, now = new Date()) {
  const t = hoursToday(m, now).match(/^(\d{1,2})h(\d{2})?–(\d{1,2})h(\d{2})?$/);
  if (!t) return false;
  const min = now.getHours() * 60 + now.getMinutes();
  return min >= Number(t[1]) * 60 + Number(t[2] ?? 0) && min < Number(t[3]) * 60 + Number(t[4] ?? 0);
}
/** Rappel du jour : férié ou dimanche (calculé sur le téléphone), sinon null. */
function dayNote(now = new Date()) {
  const h = holidayOn(now);
  if (h) return { short: 'Férié', long: `Jour férié (${h}) : beaucoup de commerces et certains marchés sont fermés. Vérifie avant d'y aller, surtout pour les lieux sans horaires.` };
  if (now.getDay() === 0) return { short: 'Dim.', long: 'Dimanche : beaucoup de commerces sont fermés ; les marchés se tiennent surtout le matin.' };
  return null;
}

/* « Maintenant » : sur la carte, le lieu le plus proche et ouvert (15 min à pied au plus).
   Calculé sur le téléphone ; un appui ouvre sa fiche, la croix le cache jusqu'à la prochaine ouverture. */
function updateNow(force = false) {
  const card = document.getElementById('nowCard');
  if (!card) return;
  if (!force && Date.now() - nowLast < 20000) return;
  nowLast = Date.now();
  const pos = freshHere();
  // Mon billet du jour passe avant tout : à quelle heure partir (à pied, ou en métro si c'est loin)
  const tk = nowHidden ? null : ticketToday(state.points);
  if (tk) {
    let travel = null; let how = '';
    if (pos) {
      const d = distanceM(pos, tk);
      travel = walkMinutes(d); how = 'à pied';
      if (travel > 25 && stations.length) { const plan = metroPlan(stations, pos, tk, 3); if (plan.type !== 'walk') { travel = plan.minutes; how = 'en métro'; } }
    }
    const at = tk.ticket.at;
    const leave = travel != null ? leaveAt(at, travel) : null;
    card.hidden = false;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `Ton billet · ${hmText(new Date(at))}`),
      el('span', { class: 'now-name' }, tk.name),
      el('span', { class: 'now-sub' }, leave
        ? `${leave <= new Date() ? 'Pars maintenant' : `Pars à ${hmText(leave)}`} · ≈ ${travel} min ${how}`
        : `Créneau à ${hmText(new Date(at))}`));
    card.querySelector('.now-open').onclick = () => openDetail(tk.id);
    return;
  }
  // Selon l'heure, un lieu du bon type passe devant (comme s'il était 400 m plus près) :
  // le matin cafés et boulangeries, à midi et le soir restos (et bars le soir).
  const slot = timeSlot();
  const fits = (p) => slot && slot.re.test(`${catOf(p.cat).name} ${p.name}`);
  // Un favori (même déjà visité) passe devant un lieu jusqu'à 5 min de marche plus proche
  const score = (x) => x.d - (fits(x.p) ? 400 : 0) - (x.p.fav ? minutesToMeters(5) : 0);
  const best = !pos || nowHidden ? null : visible().filter((p) => openState(p.hours)?.open !== false)
    .map((p) => ({ p, d: distanceM(pos, p) })).filter((x) => x.d <= 1200).sort((a, b) => score(a) - score(b))[0];
  // Le matin, un marché ouvert tout près passe avant un lieu sans rapport avec l'heure
  const mk = pos && !nowHidden && slot?.markets && markets ? nearestMarkets(markets, pos).filter((m) => m.d <= 800 && marketOpenNow(m))[0] : null;
  const useMarket = mk && (!best || (!fits(best.p) && !best.p.fav) || mk.d < best.d);
  card.hidden = !best && !useMarket;
  if (card.hidden) return;
  if (useMarket) {
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `${slot.label} · marché`),
      el('span', { class: 'now-name' }, mk.name),
      el('span', { class: 'now-sub' }, [`${walkMinutes(mk.d)} min à pied`, hoursToday(mk)].filter(Boolean).join(' · ')));
    card.querySelector('.now-open').onclick = () => openMarket(mk);
    return;
  }
  const { p, d } = best;
  const st = openState(p.hours);
  fill(card.querySelector('.now-text'),
    el('span', { class: 'now-kicker' }, [fits(p) ? slot.label : 'Maintenant', p.fav ? 'ton favori' : null].filter(Boolean).join(' · ')),
    el('span', { class: 'now-name' }, p.name),
    el('span', { class: 'now-sub' }, [`${walkMinutes(d)} min à pied`, st?.open ? (st.until ? `ouvert jusqu'à ${/^(24|00):00$/.test(st.until) ? 'minuit' : st.until.replace(':', 'h')}` : 'ouvert') : null, !st && dayNote() ? 'horaires inconnus, vérifie' : null].filter(Boolean).join(' · ')));
  card.querySelector('.now-open').onclick = () => openDetail(p.id);
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
    el('button', { type: 'button', class: 'btn big c-add solid', onclick: addAtPosition }, ico('map-pin'), 'À ma position'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: () => openPlaceSearch() }, ico('search'), 'Avec un nom ou une adresse'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: addFromPhoto }, ico('image'), 'Depuis une photo de ma galerie'),
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
  track('Ajouter un lieu');
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
  const info = el('p', { class: 'help', id: 'placeHelp' }, 'Tape un nom de lieu ou une adresse, puis appuie sur « Chercher ». Recherche dans Paris et les départements voisins (92, 93, 94).');
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
    const [places, addrs] = await Promise.allSettled([searchPlaces(q, ctrl.signal, { zone: true }), searchAddress(q, ctrl.signal, { zone: true })]);
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
        : 'Rien trouvé dans Paris et les départements voisins (92, 93, 94). Essaie avec moins de mots, ou ajoute le quartier (ex. : « Uniqlo Opéra »).';
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
  const v = existing ?? { name: draft.name ?? '', cat: draft.cat ?? firstCat, note: draft.note ?? '', done: draft.done ?? false, fav: draft.fav ?? favOnly, address: draft.address, stars: draft.stars ?? 0, covered: draft.covered, lists: draft.lists };
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
  // Nouveau lieu : les catégories sur une seule ligne qui défile, pour laisser de la place à la carte.
  const catSeg = el('div', { class: existing ? 'seg' : 'seg seg-scroll', role: 'group', 'aria-label': 'Catégorie' });
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
  const accWarn = existing ? null : draft.acc > 100
    ? el('p', { class: 'warn' }, `Position peu précise (à ${Math.round(draft.acc)} m près). Vérifie le point sur la carte, et touche « Ajuster » s'il est mal placé.`)
    : draft.rough
      ? el('p', { class: 'warn' }, `${draft.rough}. Vérifie le point sur la carte, et touche « Ajuster » s'il est mal placé.`)
      : null;
  /** Ajuster la position d'un nouveau lieu sur toute la carte, sans perdre ce qui est déjà rempli. */
  const adjust = () => {
    Object.assign(draft, { name: name.value, note: note.value, cat, done, fav, stars, covered, lists: [...lists] });
    startDraftMove(draft);
  };

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

  // Le détail facultatif est replié pour un nouveau lieu : la fiche reste courte et la carte garde la moitié de l'écran.
  const details = [
    el('label', { class: 'field' }, 'Note (facultatif)', note),
    el('div', {}, el('div', { class: 'legend' }, 'État'), doneSeg),
    el('div', {}, el('div', { class: 'legend' }, 'Ma note (facultatif)'), starPicker(stars, (n) => { stars = n; })),
    el('div', { class: 'stack', style: 'gap:8px' }, el('div', { class: 'legend' }, 'Mes listes (facultatif)'), listBox,
      el('div', { class: 'row' }, newList, el('button', { type: 'button', class: 'btn c-add', style: 'flex:none', onclick: createList }, ico('plus'), 'Créer'))),
    el('label', { class: 'item-main check-row' }, coveredBox,
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, 'Abrité de la pluie'), el('span', { class: 'item-sub' }, 'Musée, passage couvert, café avec salle…'))),
  ];
  const filled = Boolean(v.note || v.done || (v.fav && !favOnly) || stars || covered || lists.size);
  openSheet(existing ? 'Modifier le lieu' : 'Nouveau lieu', el('div', { class: 'stack' },
    el('div', { class: 'where-row' },
      el('p', { class: 'where' }, el('span', { 'aria-hidden': 'true' }, '📍'), whereText),
      existing ? null : el('button', { type: 'button', class: 'btn c-add where-adjust', onclick: adjust, 'aria-label': 'Ajuster la position sur la carte' }, ico('locate-fixed'), 'Ajuster')),
    accWarn,
    el('label', { class: 'field' }, 'Nom', name),
    el('div', {}, el('div', { class: 'legend' }, 'Catégorie'), catSeg),
    existing ? el('div', { class: 'stack' }, ...details)
      : el('details', { class: 'help-item form-more', open: filled },
        el('summary', {}, el('span', { class: 'help-title' }, 'Plus de détails'), el('span', { class: 'form-more-sub' }, 'note, état, listes…')),
        el('div', { class: 'stack' }, ...details)),
    err,
    foot(el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => (existing ? openDetail(existing.id) : closeSheet()) }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, 'Enregistrer'))),
  ), { tall: Boolean(existing), name: 'form', ...(existing ? {} : { again: () => openForm(draft) }) }); // retour Android depuis « Ajuster » : la fiche revient remplie

  showDraft(existing ? existing.lat : draft.lat, existing ? existing.lng : draft.lng);
  if (!existing) catSeg.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    fill(btn, ico('ellipsis'), open ? 'Plus' : 'Moins');
    if (open) { fill(more, ); return; }
    fill(more, 
      el('p', { class: 'help' }, ageLine(p)),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn c-add', onclick: () => sharePlace(p) }, ico('share-2'), 'Partager'),
        el('button', { type: 'button', class: 'btn c-add', onclick: () => showQr(p, back) }, ico('qr-code'), 'QR code')),
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openTicket(p, back) }, ico('ticket'), p.ticket ? 'Mon billet (modifier)' : 'Mon billet (créneau réservé)'),
      el('button', { type: 'button', class: 'btn', onclick: () => findHours(p, back) }, ico('clock'), p.hours ? 'Mettre à jour les horaires' : 'Chercher les horaires'),
      p.hours ? el('p', { class: 'help' }, `Horaires OpenStreetMap : ${p.hours}`) : null,
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => startMove(p, back) }, 'Déplacer'),
        el('button', { type: 'button', class: 'btn danger', onclick: askDelete }, 'Supprimer')));
  };
  const showActions = () => {
    fill(more, );
    const moreBtn = el('button', { type: 'button', class: 'btn mini c-info', 'aria-expanded': 'false', onclick: () => toggleMore(moreBtn) }, ico('ellipsis'), 'Plus');
    fill(actions, 
      el('a', { class: 'btn primary go-bar', href: mapsUrl(p, d ?? 1000), target: '_blank', rel: 'noopener' },
        el('span', { 'aria-hidden': 'true' }, '→'), d != null ? `Y aller · ${fmtWalk(d)}` : 'Y aller', d != null ? el('small', { class: 'go-dist' }, fmtDist(d)) : null),
      el('div', { class: 'row3' },
        el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(p) }, ico('compass'), 'Boussole'),
        el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan(p, named('Fiche', () => openDetail(p.id, back))), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
        el('button', { type: 'button', class: 'btn c-add', onclick: () => quickPhoto(p, back), 'aria-label': 'Prendre une photo' }, ico('camera'), 'Photo')),
      el('div', { class: 'row4' },
        el('button', { type: 'button', class: 'btn mini c-add', 'aria-pressed': String(!!p.done), 'aria-label': p.done ? 'Déjà visité : remettre à faire' : 'Marquer comme déjà visité', onclick: () => update(() => { setDone(p, !p.done); }) }, ico(p.done ? 'rotate-ccw' : 'check'), p.done ? 'À refaire' : 'Visité'),
        el('button', { type: 'button', class: 'btn mini c-fav', 'aria-pressed': String(!!p.fav), onclick: () => update(() => { p.fav = !p.fav; }) }, glyph(state.fav.icon, { filled: !!p.fav }), 'Favori'),
        el('button', { type: 'button', class: 'btn mini c-info', onclick: () => openForm({ lat: p.lat, lng: p.lng, address: p.address }, p) }, ico('pencil'), 'Modifier'),
        moreBtn),
      more,
      back ? backBtn(back) : null,
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
        p.owner || owners(state.points).length ? el('div', { class: 'badge' }, `👤 Ajouté par ${p.owner || (state.me ? `toi (${state.me})` : 'toi')}`) : null,
        hoursLine(p) ? el('div', { class: `badge hours ${openState(p.hours)?.open ? 'open' : 'closed'}` }, ico('clock'), hoursLine(p)) : null,
        closedDaysText(p.hours) ? el('div', { class: 'badge' }, closedDaysText(p.hours)) : null,
        p.ticket ? el('div', { class: 'badge' }, ico('ticket'), ` Billet : ${ticketText(p.ticket.at)}`) : null,
        stationLine(p) ? el('div', { class: 'badge' }, stationLine(p)) : null,
        (p.lists ?? []).length || p.covered ? el('div', { class: 'badge' }, [p.covered ? 'Abrité' : null, ...(p.lists ?? []).map((id) => state.lists?.find((l) => l.id === id)?.name)].filter(Boolean).join(' · ')) : null,
        ageLine(p).includes('jamais visité') ? el('div', { class: 'badge' }, ageLine(p)) : null, // rappel utile seulement s'il est ancien
      )),
    starPicker(p.stars ?? 0, (n) => { p.stars = n; persist(); toast(n ? `Note : ${n} étoile${n > 1 ? 's' : ''} sur 5` : 'Note retirée'); }),
    p.note ? el('p', { class: 'note' }, p.note) : null,
    p.address ? el('div', { class: 'copy-row' }, el('p', { class: 'where' }, ico('map-pin'), p.address), copyBtn(() => p.address, 'l\'adresse', 'Adresse copiée')) : null,
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
    el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, '← Fiche'),
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
  const left = minutesLeft(p.hours);
  if (st.open && left != null && left <= 45) return `Ouvert · ferme dans ${left} min (${st.until.replace(':', 'h')})`;
  if (st.open) return st.until ? `Ouvert · ferme à ${/^(24|00):00$/.test(st.until) ? 'minuit' : st.until.replace(':', 'h')}` : 'Ouvert toute la journée';
  return st.opensAt ? `Fermé · ouvre à ${st.opensAt.replace(':', 'h')}` : 'Fermé pour aujourd\'hui';
}
/** Tampon d'état du jour, le même partout : Ouvert, Ferme dans 20 min, Ouvre à 14h, Fermé aujourd'hui (rien si horaires inconnus). */
function stateTag(hours) {
  const st = openState(hours);
  if (!st) return null;
  const left = minutesLeft(hours);
  if (st.open && left != null && left <= 45) return el('span', { class: 'tag soon' }, `Ferme dans ${left} min`);
  if (st.open) return el('span', { class: 'tag open' }, 'Ouvert');
  if (st.opensAt) return el('span', { class: 'tag soon' }, `Ouvre à ${hhText(st.opensAt)}`);
  return el('span', { class: 'tag closed' }, 'Fermé aujourd\'hui');
}
function hoursTag(p) { return stateTag(p.hours); }

/* ---------- Copier d'un appui (adresse, coordonnées) pour coller dans une autre appli ---------- */

async function copyText(text, done) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); toast(done); } catch { prompt('Copie ce texte :', text); }
}
/** Petit bouton « copier » ; getText est lu au moment de l'appui. */
const copyBtn = (getText, what, done) => el('button', { type: 'button', class: 'go-compass copy-btn', 'aria-label': `Copier ${what}`, title: `Copier ${what}`, onclick: () => copyText(getText(), typeof done === 'function' ? done() : done) }, ico('copy'));

/* ---------- Mon billet : un créneau réservé (Orsay à 15 h…), rappelé dans « Maintenant » le jour J ---------- */

/** « 19:00 » → « 19h », « 15:30 » → « 15h30 », « 00:00 » → « minuit ». */
function hhText(t) { return /^(24|00):00$/.test(t) ? 'minuit' : t.replace(/^0(\d)/, '$1').replace(':00', 'h').replace(':', 'h'); }
function hmText(d) { return `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`; }
/** « aujourd'hui à 15h », « demain à 10h30 », « mardi 24 nov. à 15h ». */
function ticketText(at) {
  const d = new Date(at);
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
  const day = days === 0 ? 'aujourd\'hui' : days === 1 ? 'demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  return `${day} à ${hmText(d)}`;
}
function openTicket(p, back = null) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = p.ticket ? new Date(p.ticket.at) : null;
  const today = new Date();
  const date = el('input', { type: 'date', value: d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` });
  const time = el('input', { type: 'time', value: d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '' });
  const err = el('div', { class: 'error', role: 'alert' });
  const done = () => (back ? openDetail(p.id, back) : openDetail(p.id));
  const save = () => {
    const [y, mo, da] = date.value.split('-').map(Number);
    const [h, mi] = time.value.split(':').map(Number);
    if (!y || !Number.isFinite(h)) { err.textContent = 'Choisis le jour et l\'heure du billet.'; return; }
    p.ticket = { at: new Date(y, mo - 1, da, h, mi || 0).getTime() };
    persist(); updateNow(true);
    toast(`Billet noté : ${ticketText(p.ticket.at)}`);
    done();
  };
  openSheet([ico('ticket'), ` Mon billet · ${p.name}`], el('div', { class: 'stack' },
    el('label', { class: 'field' }, 'Jour', date),
    el('label', { class: 'field' }, 'Heure du créneau', time),
    err,
    el('button', { type: 'button', class: 'btn c-guide solid', onclick: save }, ico('ticket'), 'Enregistrer le billet'),
    p.ticket ? el('button', { type: 'button', class: 'btn danger', onclick: () => { delete p.ticket; persist(); updateNow(true); toast('Billet retiré'); done(); } }, 'Retirer le billet') : null,
    el('p', { class: 'help' }, 'Le jour même, « Maintenant » sur la carte te dit à quelle heure partir (trajet à pied ou en métro, plus 5 min de marge). Pour garder le billet lui-même, prends-le en photo avec le bouton Photo de la fiche. Rien ne part du téléphone.'),
    el('button', { type: 'button', class: 'btn', onclick: done }, '← Fiche'),
  ), { name: `ticket:${p.id}` });
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

/** Nouveau lieu : placer le point avec le viseur sur toute la carte, puis revenir à la fiche, déjà remplie. */
function startDraftMove(draft) {
  moving = { draft: true };
  draftLayer.clearLayers();
  openSheet('Ajuster la position', el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Fais glisser la carte pour mettre le viseur à la bonne place.'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => { stopMove(); openForm(draft); } }, 'Annuler'),
      el('button', { type: 'button', class: 'btn primary', onclick: () => {
        const ll = map.containerPointToLatLng([map.getSize().x / 2, crosshairY()]);
        stopMove();
        Object.assign(draft, { lat: Math.round(ll.lat * 1e6) / 1e6, lng: Math.round(ll.lng * 1e6) / 1e6, address: '', acc: null, rough: null });
        openForm(draft);
        reverseAddress(draft.lat, draft.lng).then((label) => { if (label && draft.onAddress) draft.onAddress(label); });
      } }, 'Valider ici')),
  ), { name: 'move' });
  centerOn(draft.lat, draft.lng, Math.max(map.getZoom(), 17));
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
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, named('Recherche', () => openSearch(input.value))) },
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
  track('Autour de moi');
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
function openStationPicker(onPick = (st) => { origin = { lat: st.lat, lng: st.lng, acc: 0, time: Date.now(), kind: 'station', label: st.n }; renderNear(true); }) {
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
  } else if (!following) {
    if (!following) meMarker(lat, lng, kind === 'last').addTo(nearLayer);
  }
}

function nearTitle() {
  if (origin.kind === 'station') return `Autour de Ⓜ ${origin.label}`;
  if (origin.kind === 'last') return `Autour de moi (${timeAgoShort(origin.time)})`;
  return following ? 'Autour de moi · en direct' : 'Autour de moi';
}

function renderNear(fit = false) {
  const pts = visible();
  const groups = groupByRings(pts, origin, nearRings(), { favBonus: minutesToMeters(5) }); // favoris en tête de leur cercle
  const inside = groups.reduce((n, g) => n + g.items.length, 0);
  const farther = pts.length - inside;
  const maxRing = nearRings().at(-1);

  const body = [];
  // Outils pour se déplacer, en haut pour les voir tout de suite
  const tool = (icon, label, onclick, pressed = null, family = 'c-guide') => el('button', {
    type: 'button', class: `tool ${family}${pressed ? ' on' : ''}`, onclick, 'aria-pressed': pressed == null ? null : String(pressed),
  }, el('span', { class: 'tool-ico', 'aria-hidden': 'true' }, typeof icon === 'string' && ICON_NAMES.has(icon) ? ico(icon) : icon), label);
  body.push(el('div', { class: 'tools' },
    tool('route', 'Itinéraire', () => openRoutes()),
    tool('calendar-days', 'Sorties', () => openEvents('near'), null, 'c-disc'),
    tool('shuffle', 'Surprise', () => surprise(), null, 'c-disc'),
    tool('book-open-text', 'Curiosités', () => openCuriosities(), null, 'c-disc'),
    tool('landmark', 'Monuments', () => openMonuments(), null, 'c-disc'),
    tool('Ⓜ', 'Station', () => openStationPicker(), null, 'c-metro'),
  ));
  body.push(el('div', { class: 'near-bar' },
    origin.kind === 'station' ? el('button', { type: 'button', class: 'btn where-btn c-metro', onclick: () => openStationPicker() }, 'Ⓜ Autre station')
      : origin.kind === 'last' ? el('button', { type: 'button', class: 'btn where-btn c-guide', onclick: openNear }, ico('refresh-cw'), 'Réessayer ma position')
        : el('button', { type: 'button', class: 'btn where-btn c-guide', onclick: openWhereAmI }, ico('locate'), 'Où suis-je ?')));
  if (pts.length) {
    const t = todoSummary(groups);
    const msg = !t.last.n
      ? `Aucun lieu à moins de ${ringText(t.last.ring)}.`
      : t.first.ring === t.last.ring || t.first.n === t.last.n
        ? `${plural(t.first.n, 'lieu', 'lieux')} à moins de ${ringText(t.first.ring)}.`
        : `${plural(t.first.n, 'lieu', 'lieux')} à moins de ${ringText(t.first.ring)}, ${t.last.n} à moins de ${ringText(t.last.ring)}.`;
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
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, named('Autour de moi', () => renderNear())) },
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
  if (inside) body.push(el('p', { class: 'help' }, `Temps à pied estimés, détours compris. Le trajet exact est dans « Y aller ».${origin.kind === 'gps' && !following ? ' La liste se met à jour toute seule quand tu as marché 50 m.' : ''}`));
  body.push(el('button', { type: 'button', class: 'btn c-disc', style: 'margin-top:8px;width:100%', onclick: () => openMyParis('near') }, ico('map'), 'Mon Paris : arrondissements explorés'));

  openSheet(nearTitle(), body, { name: 'near', again: () => renderNear() });
  if (origin.kind === 'gps' && !following) startQuietNear(); else stopQuietNear();
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
  addWalk(journal, seg, air?.level); saveJournal();
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

/* Mise à jour discrète d'Autour de moi : seulement tant que l'écran est ouvert, précision moyenne
   (économise la batterie), nouvelle liste après 50 m de marche. Rien n'est envoyé : la position reste sur le téléphone. */
function startQuietNear() {
  if (quietId != null || following || !('geolocation' in navigator)) return;
  quietId = navigator.geolocation.watchPosition((pos) => {
    if (view !== 'near' || following || origin?.kind !== 'gps') { stopQuietNear(); return; }
    const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() };
    if (fix.acc > 150 || distanceM(fix, origin) < 50) return;
    remember(fix);
    origin = { ...fix, kind: 'gps' };
    const keep = sheetBody.scrollTop;
    renderNear();
    sheetBody.scrollTop = keep;
  }, () => {}, { enableHighAccuracy: false, maximumAge: 20000 });
}
function stopQuietNear() {
  if (quietId != null) navigator.geolocation.clearWatch(quietId);
  quietId = null;
}

/* Mode « Ma position et direction » (bouton cible de la carte) : point bleu + cône tant qu'on ne rappuie pas,
   la carte suit ; si on la déplace au doigt, elle arrête de suivre jusqu'au prochain appui. Écran allumé,
   vibration à 100 m d'un de tes lieux. Tout reste sur le téléphone. */
let trackFollow = true;
function setLocateBtn() {
  const b = document.getElementById('btnLocate');
  b.setAttribute('aria-pressed', String(following));
  b.classList.toggle('paused', following && !trackFollow);
  b.setAttribute('aria-label', !following ? 'Afficher ma position et ma direction' : trackFollow ? 'Arrêter ma position et ma direction' : 'Recentrer sur ma position');
}
function startFollow() {
  track('Ma position et direction');
  if (!('geolocation' in navigator)) { toast('Ce téléphone ne donne pas sa position.', true); return; }
  stopQuietNear();
  following = true;
  trackFollow = true;
  setLocateBtn();
  walkPrev = null;
  walkSession = 0;
  signaled.clear();
  let first = true;
  keepScreenOn(true);
  toast('Recherche de ta position…');
  followId = navigator.geolocation.watchPosition((pos) => {
    const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() };
    if (fix.acc > 150 && !first) return; // trop imprécis pour suivre
    if (first) {
      first = false;
      for (const p of newlyNear(visible(), fix, signaled, 100)) signaled.add(p.id); // déjà proches : pas d'alerte
      map.setView([fix.lat, fix.lng], Math.max(map.getZoom(), ZOOM_RUE), { animate: false });
      toast(`Position et direction activées${fix.acc > 100 ? ` (à ${Math.round(fix.acc)} m près)` : ''}. Rappuie sur le bouton pour arrêter.`);
    } else if (trackFollow) {
      map.panTo([fix.lat, fix.lng], { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
    }
    meShown = fix;
    drawMe();
    countWalk(fix);
    remember(fix);
    if (view === 'near' && origin?.kind === 'gps') origin = { ...fix, kind: 'gps' };
    const alerts = newlyNear(visible(), fix, signaled, 100);
    for (const p of alerts) signaled.add(p.id);
    if (alerts.length) {
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* pas de vibreur */ }
      toast(`À moins de 100 m : ${alerts.map((p) => p.name).join(', ')}`);
      speak(alerts.map((p) => `${p.name}, à ${spokenDistance(distanceM(fix, p))}`).join('. '));
    }
    const moved = distanceM(fix, lastRender);
    if (view === 'near' && origin?.kind === 'gps' && (moved > 15 || Date.now() - lastRender.t > 15000)) {
      lastRender = { t: Date.now(), lat: fix.lat, lng: fix.lng };
      const keep = sheetBody.scrollTop;
      renderNear();
      sheetBody.scrollTop = keep;
    }
  }, (e) => {
    if (first) { stopFollow(); toast(e.code === 1 ? 'Position refusée : autorise-la dans les réglages du navigateur.' : 'Position introuvable pour l\'instant. Réessaie dehors.', true); }
  }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 });
}

function stopFollow() {
  if (followId != null) navigator.geolocation.clearWatch(followId);
  followId = null;
  if (!following) return;
  following = false;
  meShown = null;
  drawMe();
  setLocateBtn();
  persist(); // garde le compteur de marche
  keepScreenOn(false);
  silence();
  if (view === 'near') renderNear();
}
// Déplacer la carte au doigt met le suivi en pause (le point et le cône restent)
map.on('dragstart', () => { if (following && trackFollow) { trackFollow = false; setLocateBtn(); } });

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
  track('Sur mon chemin');
  const from = origin;
  openDestinationPicker('Où vas-tu ?', (dest) => renderWay(from, dest));
}

function renderWay(from, dest) {
  const found = onTheWay(visible(), from, dest).filter((x) => distanceM(x.point, dest) > 30);
  const total = distanceM(from, dest);
  const body = [
    el('p', { class: 'summary' }, found.length
      ? `${plural(found.length, 'lieu', 'lieux')} sur ton chemin, à moins de 5 min de détour.`
      : 'Aucun de tes lieux sur ton chemin (moins de 5 min de détour).'),
    el('p', { class: 'help' }, `Trajet : ${fmtDist(total)} · ${fmtWalk(total)}.`),
    el('ul', { class: 'items' }, found.map(({ point: p, detour }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, named('Sur mon chemin', () => renderWay(from, dest))) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, detour < 30 ? 'Pile sur ton chemin' : `Détour ≈ ${walkMinutes(detour)} min`))),
      el('a', { class: 'go', href: mapsUrl(p, distanceM(from, p)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${p.name}` }, 'Y aller')))),
    found.length
      ? el('a', { class: 'btn primary', href: routeUrl([...found.slice(0, MAX_ROUTE - 1).map((x) => x.point), dest]), target: '_blank', rel: 'noopener' },
        found.length > MAX_ROUTE - 1 ? `Itinéraire avec les ${MAX_ROUTE - 1} premiers arrêts` : 'Itinéraire avec ces arrêts')
      : el('a', { class: 'btn primary', href: routeUrl([dest]), target: '_blank', rel: 'noopener' }, 'Itinéraire direct'),
    el('button', { type: 'button', class: 'btn', onclick: () => renderNear(true) }, '← Autour de moi'),
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
  track('Relier des lieux');
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
    return el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, named('Relier des lieux', () => renderRoute(start, chosen))) },
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('sauvegarde') }, '← Sauvegarde et partage')),
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
  // 1. Paris Data (marche depuis le navigateur) ; 2. sinon le flux Smovengo
  try {
    const r = await fetch(VELIB_PARIS);
    if (r.ok) { const list = parseVelibParis(await r.json()); if (list.length > 100) return list; }
  } catch { /* on essaie l'autre source */ }
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
  track('Vélib\'');
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
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
  for (const s of list) L.circleMarker([s.lat, s.lng], { radius: 8, color: '#1B56E8', weight: 3, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
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
  openSheet([ico('map'), ' Mon Paris et mes chiffres'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${explored} arrondissement${explored > 1 ? 's' : ''} sur 20 où tu as visité au moins un lieu.`),
    el('div', { class: 'arr-grid' }, tiles),
    el('div', { class: 'arr-legend', 'aria-hidden': 'true' }, el('span', { class: 'arr l0' }), ' aucun', el('span', { class: 'arr l1' }), ' 1', el('span', { class: 'arr l2' }), ' 2 à 4', el('span', { class: 'arr l3' }), ' 5 et +'),
    el('p', { class: 'help' }, `Chaque case : lieux visités / lieux enregistrés. Plan schématique, à peu près à la place de chaque arrondissement.${unknown ? ` ${plural(unknown, 'lieu', 'lieux')} sans arrondissement connu (hors Paris ou en cours de recherche).` : ''}`),
    ...myStats(),
    foot(myParisBack === 'near' && origin
      ? el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')
      : el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages')),
  ), { tall: true, name: 'myparis', again: openMyParis });
  findArrondissements();
}

/* ---------- Mes chiffres (tableau de bord sous Mon Paris) ----------
   Graphiques faits main, lisibles sans la couleur : légende, valeurs au toucher, tableau. */
let statsDays = 7;
const AIR_LABEL = { bon: 'Air bon', moyen: 'Air moyen', mauvais: 'Air médiocre ou pire', inconnu: 'Air inconnu' };
const minOf = (m) => Math.round(m / WALK_M_PER_MIN);
function myStats() {
  const days = lastDays(journal, statsDays);
  const t = totals(days);
  const from = days[0].date.getTime();
  const ps = placesStats(state.points, from);
  const ap = arrProgress(state.points, from);
  const dayName = (d) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Période' },
    [7, 30].map((n) => el('button', { type: 'button', 'aria-pressed': String(statsDays === n), onclick: () => { statsDays = n; openMyParis(); } }, `${n} jours`)));

  // Marche par jour, empilée par qualité de l'air (du meilleur en bas au pire en haut)
  const order = ['bon', 'moyen', 'mauvais', 'inconnu'];
  const W = 320, H = 120, top = 14, base = H - 18;
  const maxMin = Math.max(10, ...days.map((d) => minOf(d.m)));
  const slot = W / days.length, bw = Math.max(3, Math.min(26, slot - (days.length > 10 ? 2 : 6)));
  const readout = el('p', { class: 'help stats-readout', 'aria-live': 'polite' }, 'Touche une barre pour le détail du jour.');
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; };
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'stats-svg', role: 'group', 'aria-label': `Minutes de marche par jour sur ${statsDays} jours : ${minOf(t.m)} minutes au total.` });
  svg.append(svgEl('line', { x1: 0, x2: W, y1: base + 0.5, y2: base + 0.5, class: 'stats-axis' }));
  const cap = svgEl('text', { x: 0, y: 10, class: 'stats-tick' }); cap.textContent = `${maxMin} min`; svg.append(cap);
  svg.append(svgEl('line', { x1: 0, x2: W, y1: top + 0.5, y2: top + 0.5, class: 'stats-grid' }));
  days.forEach((d, i) => {
    const x = i * slot + (slot - bw) / 2;
    let y = base;
    const parts = order.map((b) => [b, minOf(d.air[b] ?? 0)]).filter(([, v]) => v > 0);
    const detail = `${dayName(d.date)} : ${minOf(d.m)} min de marche${parts.length ? ` (${parts.map(([b, v]) => `${AIR_LABEL[b].toLowerCase()} ${v} min`).join(', ')})` : ''}.`;
    const g = svgEl('g', { class: 'stats-bar', tabindex: '0', role: 'button', 'aria-label': detail });
    g.append(svgEl('rect', { x: i * slot, y: 0, width: slot, height: H, fill: 'transparent' })); // zone de toucher plus grande que la barre
    parts.forEach(([b, v], k) => {
      const h = Math.max(1.5, (v / maxMin) * (base - top));
      const gap = k ? 2 : 0; // 2 px de fond entre les morceaux
      y -= h;
      g.append(svgEl('rect', { x, y: y, width: bw, height: Math.max(1, h - gap), rx: k === parts.length - 1 ? 3 : 0, class: `air-seg air-${b}` }));
    });
    const show = () => { readout.textContent = detail; for (const n of svg.querySelectorAll('.stats-bar')) n.classList.toggle('on', n === g); };
    g.addEventListener('click', show); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
    svg.append(g);
  });
  for (const [i, txt] of [[0, dayName(days[0].date)], [days.length - 1, 'aujourd\'hui']]) {
    const tx = svgEl('text', { x: i ? W : 0, y: H - 4, class: 'stats-tick', 'text-anchor': i ? 'end' : 'start' }); tx.textContent = txt; svg.append(tx);
  }
  const legend = el('div', { class: 'stats-legend' }, order.filter((b) => t.air[b] > 0 || b !== 'inconnu').map((b) => el('span', {}, el('i', { class: `air-key air-${b}`, 'aria-hidden': 'true' }), `${AIR_LABEL[b]} · ${minOf(t.air[b])} min`)));
  const table = el('details', { class: 'stats-table' }, el('summary', {}, 'Voir en tableau'),
    el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Jour'), el('th', {}, 'Marche'), ...order.map((b) => el('th', {}, AIR_LABEL[b].replace('Air ', ''))))),
      el('tbody', {}, days.filter((d) => d.m > 0).reverse().map((d) => el('tr', {}, el('td', {}, dayName(d.date)), el('td', {}, `${minOf(d.m)} min`), ...order.map((b) => el('td', {}, d.air[b] ? `${minOf(d.air[b])}` : '–')))))));

  // Barres horizontales (une seule série : pas de légende, la valeur est écrite)
  const hbars = (rows, label) => {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return el('ul', { class: 'hbars', 'aria-label': label }, rows.map(([name, v, lead]) => el('li', {},
      el('span', { class: 'hbar-label' }, lead ?? null, name),
      el('span', { class: 'hbar-track', 'aria-hidden': 'true' }, el('span', { class: 'hbar', style: `width:${Math.max(3, (v / max) * 100)}%` })),
      el('span', { class: 'hbar-val' }, String(v)))));
  };
  const tile = (n, label) => el('div', { class: 'stat-tile' }, el('b', {}, n), el('span', {}, label));
  const steps = stepsFor(t.m);

  // Remise à zéro : au choix marche et air / fonctions utilisées ; jamais les lieux ni leurs « visité ».
  const resetBox = el('div', { class: 'stack' });
  const showReset = () => fill(resetBox, el('button', { type: 'button', class: 'btn danger', onclick: askReset }, ico('rotate-ccw'), 'Remettre à zéro…'));
  const askReset = () => {
    const walkBox = el('input', { type: 'checkbox', class: 'check' });
    const useBox = el('input', { type: 'checkbox', class: 'check' });
    const err = el('div', { class: 'error', role: 'alert' });
    for (const b of [walkBox, useBox]) b.addEventListener('change', () => { err.textContent = ''; });
    const line = (box, name, sub) => el('label', { class: 'item-main check-row' }, box,
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, name), el('span', { class: 'item-sub' }, sub)));
    fill(resetBox,
      el('p', { class: 'warn' }, 'Que remettre à zéro ?'),
      line(walkBox, 'Marche et air', 'Minutes de marche par jour et qualité de l\'air, marche du jour comprise'),
      line(useBox, 'Fonctions utilisées', 'La liste « Ce que j\'utilise le plus »'),
      el('p', { class: 'help' }, 'Efface les 90 jours gardés. Tes lieux, leurs « visité », favoris et notes ne changent pas. Ce n\'est pas annulable.'),
      err,
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: showReset }, 'Annuler'),
        el('button', { type: 'button', class: 'btn danger solid', onclick: () => {
          const walk = walkBox.checked, use = useBox.checked;
          if (!walk && !use) { err.textContent = 'Coche au moins une case.'; return; }
          resetJournal(journal, { walk, use });
          if (walk) state.walk = { day: '', m: 0 };
          saveJournal(true); persist();
          openMyParis();
          toast(walk && use ? 'Marche, air et fonctions remis à zéro.' : walk ? 'Marche et air remis à zéro.' : 'Fonctions utilisées remises à zéro.');
        } }, 'Remettre à zéro')));
    walkBox.focus();
  };
  showReset();
  return [
    el('h3', { class: 'ring-title' }, el('span', {}, 'Mes chiffres'), el('span', {}, '')),
    seg,
    el('h3', { class: 'ring-title' }, el('span', {}, 'Marche et air'), el('span', {}, '')),
    el('div', { class: 'stat-tiles' }, tile(`${minOf(t.m)} min`, 'de marche'), tile(steps.toLocaleString('fr-FR'), 'pas environ'), tile(t.m ? `${Math.round((t.air.mauvais / t.m) * 100)} %` : '–', 'sous un air médiocre')),
    svg, readout, legend, table,
    el('p', { class: 'help' }, 'Marche comptée seulement quand l\'appli suit ta position (Ma position et direction, balade guidée). L\'air est une estimation du quartier, heure par heure, pas une mesure sur toi.'),
    el('h3', { class: 'ring-title' }, el('span', {}, 'Mes lieux'), el('span', {}, '')),
    el('div', { class: 'stat-tiles' }, tile(String(ps.added), 'ajoutés'), tile(String(ps.visited), 'visités'), tile(String(ps.fav), 'favoris'), tile(ps.stars != null ? `${String(ps.stars).replace('.', ',')} ★` : '–', 'note moyenne')),
    ps.byCat.length ? hbars(ps.byCat.slice(0, 6).map(([id, n]) => [catOf(id).name, n, catDot(id)]), 'Lieux par catégorie') : null,
    el('p', { class: 'help' }, `Ajoutés et visités : sur les ${statsDays} derniers jours. Catégories et favoris : tous tes lieux (${ps.total}).`),
    el('h3', { class: 'ring-title' }, el('span', {}, 'Mon Paris'), el('span', {}, '')),
    el('p', {}, `${ap.now} arrondissement${ap.now > 1 ? 's' : ''} sur 20 explorés${ap.gained ? `, dont ${ap.gained} de plus sur les ${statsDays} derniers jours` : ''}.`),
    el('h3', { class: 'ring-title' }, el('span', {}, 'Ce que j\'utilise le plus'), el('span', {}, '')),
    t.use.length ? hbars(t.use.slice(0, 6), 'Fonctions les plus utilisées') : el('p', { class: 'help' }, 'Rien encore sur cette période.'),
    el('p', { class: 'help' }, 'Totaux par jour gardés 90 jours sur ce téléphone seulement : ni le tracé de tes déplacements, ni la sauvegarde, ni personne d\'autre.'),
    resetBox,
  ];
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
  const quarter = el('div', { class: 'quarter', 'aria-live': 'polite' }, el('p', { class: 'help' }, 'Le quartier : recherche dans Wikipédia…'));
  const coords = `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`;
  let addrText = '';
  fill(body,
    el('div', { class: 'copy-row' }, addr, copyBtn(() => addrText || coords, 'l\'adresse', () => (addrText ? 'Adresse copiée' : 'Adresse inconnue : coordonnées copiées'))),
    arrLine,
    near ? el('p', { class: 'badge' }, `Ⓜ ${near.station.n}${near.station.l?.length ? ` (${near.station.l.join(', ')})` : ''} · ${fmtWalk(near.d)}`) : null,
    el('div', { class: 'copy-row' }, el('p', { class: 'help' }, `Précision : environ ${Math.round(at.acc ?? 0)} m · ${coords}`), copyBtn(() => coords, 'les coordonnées GPS', 'Coordonnées copiées')),
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => shareLink('Où je suis', `Je suis ici${state.me ? ` (${state.me})` : ''} : `, meetLink(location.href, at, state.me)) }, ico('send'), 'Envoyer ma position à quelqu\'un'),
    el('button', { type: 'button', class: 'btn c-add', onclick: () => addAt(at.lat, at.lng, at.acc) }, ico('plus'), 'Enregistrer ce lieu'),
    quarter,
    el('p', { class: 'help' }, 'Ta position n\'est envoyée qu\'une fois, dans le lien, à la personne que tu choisis. L\'adresse vient de l\'IGN.'),
  );
  openSheet([ico('locate'), ' Où suis-je ?'], body, { name: 'where', again: openWhereAmI });
  // Le quartier en 3 lignes : l'article Wikipédia le plus proche décrit comme un quartier (position arrondie à 100 m)
  (async () => {
    try {
      const r = await fetch(quarterSearchUrl(at.lat, at.lng));
      const q = r.ok ? pickQuarter(await r.json(), at) : null;
      if (!q) { fill(quarter); return; }
      const r2 = await fetch(extractUrl(q.title));
      const text = r2.ok ? readExtract(await r2.json()) : '';
      fill(quarter,
        el('h3', { class: 'ring-title' }, el('span', {}, q.title), el('span', {}, '')),
        text ? el('p', { class: 'quarter-text' }, text) : null,
        el('a', { class: 'btn c-disc', href: wikiPage(q.title), target: '_blank', rel: 'noopener' }, ico('book-open-text'), 'Lire la suite sur Wikipédia'),
        el('p', { class: 'help' }, 'Texte : Wikipédia (CC BY-SA). Quartier trouvé avec ta position arrondie à 100 m environ.'));
    } catch { fill(quarter); }
  })();
  try {
    const r = await reverseInfo(at.lat, at.lng);
    const a = arrFromCitycode(r?.citycode) ?? arrFromText(r?.label);
    addr.textContent = r?.label ?? 'Adresse introuvable';
    addrText = r?.label ?? '';
    arrLine.textContent = a ? `${a === 1 ? '1er' : `${a}e`} arrondissement` : '';
  } catch { addr.textContent = 'Adresse indisponible (pas de connexion).'; }
}

/* ---------- Ce soir près de moi : agenda « Que faire à Paris ? » ---------- */

let eventsCache = null; // { day, items }
let eventsMode = 'all'; // 'all' | 'free' | 'art'

/** Bouton « M » : quel métro prendre jusqu'à ce point, calculé dans l'appli. */
const metroBtn = (t, back) => el('button', { type: 'button', class: 'go-compass go-metro', 'aria-label': `Métro vers ${t.name}`,
  onclick: () => showMetroPlan({ name: t.name, lat: t.lat, lng: t.lng, id: `pt:${t.lat.toFixed(5)},${t.lng.toFixed(5)}` }, back) },
el('b', { class: 'm-badge', 'aria-hidden': 'true' }));
const compassBtn = (t) => el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: t.name, lat: t.lat, lng: t.lng }), 'aria-label': `Boussole vers ${t.name}` }, ico('compass'));

/* Galeries d'art (OpenStreetMap) : la liste de tout Paris, téléchargée une fois par mois, triée sur le téléphone. */
const GAL_KEY = 'carte-paris.galeries';
let galleries = null;
let galleriesTime = 0;
let galleriesLoading = null;
function loadGalleries(force = false) {
  if (galleries && !force) return Promise.resolve(galleries);
  if (!force) {
    try { const c = JSON.parse(storage.getItem(GAL_KEY) ?? 'null'); if (c?.items?.length && Date.now() - c.time < 30 * 864e5) { galleries = c.items; galleriesTime = c.time; return Promise.resolve(galleries); } } catch { /* rien */ }
  }
  if (galleriesLoading) return galleriesLoading;
  galleriesLoading = fetch(galleriesUrl()).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((json) => {
      const items = parseGalleries(json);
      if (!items.length) throw new Error('vide');
      galleries = items; galleriesTime = Date.now();
      try { storage.setItem(GAL_KEY, JSON.stringify({ time: galleriesTime, items })); } catch { /* trop gros */ }
      return galleries;
    })
    .catch((e) => { try { const c = JSON.parse(storage.getItem(GAL_KEY) ?? 'null'); if (c?.items?.length) { galleries = c.items; galleriesTime = c.time; return galleries; } } catch { /* rien */ } throw e; })
    .finally(() => { galleriesLoading = null; });
  return galleriesLoading;
}

/** Une galerie : nom, état (ouverte, ferme bientôt, jours de fermeture), distance ; boussole, métro, garder. */
/* ---------- Cartes des Sorties : une icône de genre, le nom, quand et où, le temps à pied, les tampons et les boutons DANS la carte ---------- */
const GENRE_ICON = { musique: 'music', expo: 'palette', chiner: 'tags', marche: 'store', fete: 'sparkles', scene: 'drama', cine: 'clapperboard', balade: 'footprints', famille: 'users', atelier: 'book-open', musee: 'landmark', galerie: 'palette' };
const GENRE_NAME = { musique: 'Musique', expo: 'Expo', chiner: 'Puces et brocantes', marche: 'Marché', fete: 'Fête', scene: 'Spectacle', cine: 'Cinéma', balade: 'Balade ou visite', famille: 'En famille', atelier: 'Atelier ou rencontre', musee: 'Musée', galerie: 'Galerie' };
const walkTxt = (d) => `${walkMinutes(d)}\u00a0min · ${fmtDist(d).replace(' ', '\u00a0')}`; // peut passer à la ligne après « · », jamais au milieu d'une mesure
/** Une carte de sortie. `feat` : la grande plaque en tête (la seule plaque pleine de l'écran). */
function sortieCard({ genre, name, href = '', onclick = null, sub = [], d = null, tags = [], buttons = [], feat = false, kicker = '' }) {
  const label = GENRE_NAME[genre];
  const main = el(href ? 'a' : onclick ? 'button' : 'div', { class: 'ev-main', ...(href ? { href, target: '_blank', rel: 'noopener' } : onclick ? { type: 'button', onclick } : {}) },
    kicker ? el('span', { class: 'feat-kicker' }, kicker) : null,
    el('span', { class: 'ev-name' }, label ? el('span', { class: 'sr-only' }, `${label} : `) : null, name),
    sub.filter(Boolean).length ? el('span', { class: 'ev-sub' }, ...sub.filter(Boolean).flatMap((x, i) => (i ? [' · ', x] : [typeof x === 'string' ? x.charAt(0).toUpperCase() + x.slice(1) : x]))) : null,
    tags.filter(Boolean).length ? el('span', { class: 'ev-tags' }, ...tags.filter(Boolean)) : null);
  return el(feat ? 'div' : 'li', { class: feat ? 'ev feat' : 'ev' },
    el('span', { class: `genre g-${genre ?? 'autre'}`, 'aria-hidden': 'true' }, ico(GENRE_ICON[genre] ?? 'calendar-days', { size: feat ? 26 : 22 })),
    main,
    el('div', { class: 'ev-foot' },
      el('span', { class: 'walk' }, d != null ? walkTxt(d) : ''),
      ...buttons.filter(Boolean)));
}
const freeTag = () => el('span', { class: 'tag open' }, 'Gratuit');
const addBtn = (name, label, onclick) => el('button', { type: 'button', class: 'go-compass add', 'aria-label': `Ajouter ${label} ${name} à ma carte`, onclick }, ico('plus'));

const galleryRow = (g, back) => {
  const st = openState(g.hours);
  const stTxt = !st ? 'horaires inconnus' : st.open && st.until ? `jusqu'à ${hhText(st.until)}` : '';
  return sortieCard({ genre: 'galerie', name: g.name, href: g.site || '', sub: [g.kind === 'Galerie' ? '' : g.kind, stTxt, closedDaysText(g.hours)], d: g.d, tags: [stateTag(g.hours)],
    buttons: [compassBtn(g), metroBtn(g, back), addBtn(g.name, '', () => openForm({ name: g.name, lat: g.lat, lng: g.lng, address: g.address, hours: g.hours, acc: null }))] });
};

/** Une expo ou une sortie : genre, titre, quand, où ; boussole, métro, et pour une expo « garder » (avec sa date de fin). */
const eventRow = (e, back, { last = false, week = false, feat = false, kicker = '' } = {}) => {
  const expo = isExpo(e);
  const keep = () => openForm({ name: e.title, lat: e.lat, lng: e.lng, address: e.address, acc: null,
    note: [e.place, e.end ? `Expo jusqu'au ${e.end.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : '', e.url].filter(Boolean).join(' · ') });
  const later = startsLater(e);
  const when = week ? el('b', {}, weekText(e)) : last ? el('b', {}, endText(e.end)) : later ? el('b', {}, whenText(e).replace(/^à/, 'À')) : whenText(e) === 'en cours aujourd\'hui' ? null : whenText(e).replace(/^j/, 'J');
  return sortieCard({ genre: genreOf(e, { expo }), name: e.title, href: e.url, sub: [when, e.place], d: e.d, tags: [e.free ? freeTag() : null], feat, kicker,
    buttons: [compassBtn(e), metroBtn(e, back), expo ? addBtn(e.title, 'l\'expo', keep) : null] });
};

/** Un musée gratuit aujourd'hui. */
const freeRow = (f, back) => sortieCard({ genre: 'musee', name: f.name, sub: [f.when], d: f.d, tags: [freeTag()], buttons: [compassBtn(f), metroBtn(f, back)] });

/** Un marché du jour : en ce moment, plus tard, ou déjà fini. */
function marketWhen(m, now = new Date()) {
  const t = hoursToday(m, now).match(/^(\d{1,2})h(\d{2})?(?:–(\d{1,2})h(\d{2})?)?$/);
  if (!t) return { when: 'now', text: '' }; // horaires inconnus : on le montre, sans heure
  const min = now.getHours() * 60 + now.getMinutes();
  const a = Number(t[1]) * 60 + Number(t[2] ?? 0);
  const b = t[3] ? Number(t[3]) * 60 + Number(t[4] ?? 0) : null;
  if (min < a) return { when: 'later', text: `À ${t[1]}h${t[2] ?? ''}` };
  if (b != null && min >= b) return { when: 'done', text: '' };
  return { when: 'now', text: b != null ? `Jusqu'à ${t[3]}h${t[4] ?? ''}` : '' };
}
const marketRow = (m, back, { feat = false, kicker = '' } = {}) => {
  const w = marketWhen(m);
  return sortieCard({ genre: isFleaMarket(m) ? 'chiner' : 'marche', name: m.name, onclick: () => openMarket(m, back), sub: [w.when === 'later' ? el('b', {}, w.text) : w.text, m.place], d: m.d, feat, kicker,
    buttons: [compassBtn(m), metroBtn(m, back)] });
};

/** L'agenda du jour (Ville de Paris), téléchargé une fois par jour, sans position. */
let eventsLoading = null;
async function todayEvents() {
  const day = new Date().toDateString();
  if (eventsCache?.day === day) return eventsCache.items;
  eventsLoading ??= fetch(eventsUrl()).then(async (r) => {
    if (!r.ok) throw new Error(String(r.status));
    eventsCache = { day, items: parseEvents(await r.json()) };
    return eventsCache.items;
  }).finally(() => { eventsLoading = null; });
  return eventsLoading;
}

let weekCache = null; // { day, items } : la semaine de tout Paris, gardée le temps de la journée
async function weekEvents() {
  const day = new Date().toDateString();
  if (weekCache?.day === day) return weekCache.items;
  // Version légère (champs utiles seulement) ; si le serveur la refuse, la version complète, plus courte
  let r = await fetch(weekEventsUrl());
  if (!r.ok) r = await fetch(weekEventsUrl(new Date(), 7, false));
  if (!r.ok) throw new Error(String(r.status));
  weekCache = { day, items: parseEvents(await r.json()) };
  return weekCache.items;
}

/** Expos de la semaine dans tout Paris, par arrondissement, sans déplacer la carte. */
async function openWeekExpos() {
  track('Expos de la semaine');
  const title = [ico('calendar-days'), ' Expos de la semaine'];
  const back = foot(backBtn(openEvents));
  if (!weekCache || weekCache.day !== new Date().toDateString()) {
    openSheet(title, el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris (tout Paris, sur 7 jours)…'), { name: 'week' });
    try { await weekEvents(); } catch {
      openSheet(title, el('div', { class: 'stack' }, el('p', { class: 'warn' }, 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'), back), { name: 'week' });
      return;
    }
  }
  const o = evFrom;
  const now = new Date();
  const until = new Date(now); until.setDate(until.getDate() + 7);
  const groups = weekExpos(weekCache.items.map((e) => ({ ...e, d: o ? distanceM(o, e) : null })), now);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const arrName = (a) => (a == null ? 'Hors Paris ou sans adresse' : a === 1 ? '1er' : `${a}e`);
  openSheet(title, el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${plural(total, 'expo', 'expos')} jusqu'au ${until.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, tout Paris.`),
    el('p', { class: 'help' }, 'Touche un arrondissement pour l\'ouvrir. Dans chacun, celles qui ferment le plus tôt d\'abord.'),
    total ? el('div', { class: 'help-list' }, groups.map((g) => {
      const near = o ? Math.min(...g.items.map((e) => e.d)) : null;
      return el('details', { class: 'help-item week-arr' },
        el('summary', {}, el('span', { class: 'week-arr-name' }, arrName(g.arr)),
          el('span', { class: 'week-arr-sub' }, [plural(g.items.length, 'expo', 'expos'), near != null ? `${g.items.length > 1 ? 'la plus proche ' : ''}à ${fmtDist(near)}` : ''].filter(Boolean).join(' · '))),
        el('ul', { class: 'items week-items ev-list' }, g.items.slice(0, 40).map((e) => eventRow(e, openWeekExpos, { week: true }))));
    })) : el('p', { class: 'empty' }, 'Aucune expo trouvée dans l\'agenda cette semaine.'),
    el('p', { class: 'help' }, `Source : agenda « Que faire à Paris ? » de la Ville de Paris, téléchargé pour tout Paris (ta position n'est pas envoyée). Les galeries privées n'y sont souvent pas. ${o ? (o.kind === 'map' ? 'Distances depuis le centre de la carte.' : 'Distances depuis toi.') : ''}`),
    back,
  ), { tall: true, name: 'week', again: openWeekExpos });
}

/** Sites utiles pour aller plus loin (ouverts dans le navigateur ; rien de l'appli n'est envoyé). Vérifiés le 16 novembre 2026. */
const SORTIES_LINKS = [
  ['Que faire à Paris : à ne pas rater', 'La sélection de la rédaction de la Ville (paris.fr)', 'https://www.paris.fr/quefaire'],
  ['Que faire à Paris : aujourd\'hui', 'La sélection du jour, tout Paris (paris.fr)', 'https://www.paris.fr/quefaire/aujourdhui'],
  ['Paris Musées', 'Expos des 14 musées de la Ville (parismusees.paris.fr)', 'https://www.parismusees.paris.fr/fr'],
  ['Expos des galeries', 'L\'Officiel des spectacles : galeries d\'art, vernissages (offi.fr)', 'https://www.offi.fr/expositions-musees/galeries.html'],
  ['Paris je t\'aime', 'Office du tourisme : calendrier des grandes expos (parisjetaime.com)', 'https://parisjetaime.com/article/calendrier-expositions-paris-a1055'],
  ['Sortir à Paris', 'Le plus complet, avec beaucoup de publicité (sortiraparis.com)', 'https://www.sortiraparis.com/'],
];

let evFrom = null; // point de départ des Sorties : ma position (Autour de moi) ou le centre de la carte (bouton de la colonne)
async function openEvents(start = null) {
  track('Sorties');
  if (start === 'map') { const c = map.getCenter(); evFrom = { lat: c.lat, lng: c.lng, kind: 'map' }; }
  else if (start === 'near' || !evFrom) evFrom = origin;
  if (!evFrom) { openNear(); return; }
  const o = evFrom;
  const fromMap = o.kind === 'map';
  const backNear = () => (fromMap ? null : el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'));
  const day = new Date().toDateString();
  const title = [ico('calendar-days'), ' Sorties du jour'];
  if (!eventsCache || eventsCache.day !== day) {
    openSheet(title, el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris…'), { name: 'events' });
    try {
      await todayEvents();
    } catch {
      openSheet(title, el('div', { class: 'stack' },
        el('p', { class: 'warn' }, 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'),
        backNear()), { name: 'events' });
      return;
    }
  }
  const mode = eventsMode;
  const back = openEvents;
  const near3 = nearbyEvents(eventsCache.items, o, 3000);
  const all = near3.filter((e) => e.d <= 2000 && (mode !== 'free' || e.free)).slice(0, 40);
  const last = lastChance(near3.filter((e) => mode !== 'free' || e.free));
  const lastIds = new Set(last);
  const notes = []; // sources et précautions : regroupées tout en bas, dans « Sources et mise à jour »
  const head = (label, n) => (n ? el('h3', { class: 'ring-title' }, el('span', {}, label), el('span', {}, String(n))) : null);
  const list = (rows) => (rows.length ? el('ul', { class: 'items ev-list' }, rows) : null);

  // En tête, pour tous : les temps forts de la semaine, et la gratuité exceptionnelle du jour
  const soon = highlightsSoon();
  const freeAll = freeNear(o, new Date(), 3000, 5);
  const freeSpecial = freeAll.filter((f) => f.rule !== 'always');
  const top = [
    ...soon.map((h) => el('p', { class: 'hl-line' }, ico('sparkles'), ` ${highlightText(h)} — ${h.what}`)),
    mode === 'all' && freeSpecial.length ? el('p', { class: 'hl-line' }, ico('landmark'), ` Gratuit aujourd'hui : ${freeSpecial.map((f) => `${f.name} (${f.when})`).join(', ')}`) : null,
    listsStale() ? el('p', { class: 'hl-line' }, ico('refresh-cw'), ' Listes des temps forts et des musées gratuits à mettre à jour : demande-le à Claude.') : null,
  ];
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Sorties à afficher' },
    [['all', 'Tout'], ['free', 'Gratuit'], ['art', 'Expos']].map(([m, label]) =>
      el('button', { type: 'button', 'aria-pressed': String(mode === m), onclick: () => { eventsMode = m; openEvents(); } }, label)));
  const freeSection = () => [head('Musées gratuits aujourd\'hui', freeAll.length), list(freeAll.map((f) => freeRow(f, back))),
    freeAll.length ? (notes.push(`Musées gratuits : liste vérifiée le ${FREE_CHECKED} (musées de la Ville de Paris, 1er dimanche des musées nationaux, Louvre le 1er vendredi soir). Les règles changent : vérifie sur le site du musée.`), null) : null];

  let body;
  if (mode === 'art') {
    const expos = all.filter((e) => isExpo(e) && !lastIds.has(e)).slice(0, 15);
    const galBox = el('div', { class: 'stack' });
    const drawGal = () => {
      if (!galleries) { fill(galBox, head('Galeries', 1), el('p', { class: 'help' }, 'Chargement de la liste des galeries de Paris (une fois par mois)…')); return; }
      const g = galleriesNear(galleries, o).slice(0, 15);
      const open = g.filter((x) => openState(x.hours)?.open).length;
      fill(galBox,
        el('h3', { class: 'ring-title' }, el('span', {}, 'Galeries à moins de 1,5 km'), el('span', {}, g.length ? `${open} ouverte${open > 1 ? 's' : ''}` : '')),
        g.length ? el('ul', { class: 'items ev-list' }, g.map((x) => galleryRow(x, back))) : el('p', { class: 'empty' }, 'Aucune galerie connue à moins de 1,5 km.'),
        g.length ? el('button', { type: 'button', class: 'btn c-disc', onclick: () => openGalleryWalk(openEvents) }, ico('route'), 'Parcours galeries ouvertes') : null);
    };
    drawGal();
    if (!galleries) loadGalleries().then(() => { if (view === 'events' && eventsMode === 'art') drawGal(); })
      .catch(() => fill(galBox, el('p', { class: 'warn' }, 'La liste des galeries (OpenStreetMap) ne répond pas. Réessaie plus tard.')));
    body = [
      head('Dernière chance : expos qui ferment', last.length), list(last.slice(0, 8).map((e) => eventRow(e, back, { last: true }))),
      galBox,
      head('Autres expos aujourd\'hui', expos.length), list(expos.map((e) => eventRow(e, back))),
      el('button', { type: 'button', class: 'btn c-disc', onclick: () => openWeekExpos() }, ico('calendar-days'), 'Expos de la semaine, tout Paris'),
      ...freeSection(),
      !last.length && !expos.length ? el('p', { class: 'help' }, 'Aucune expo de l\'agenda de la Ville à moins de 3 km aujourd\'hui. Les expos des galeries privées n\'y sont souvent pas : regarde les galeries ci-dessus.') : null,
    ];
  } else {
    const mkAll = nearestMarkets(await loadMarkets(), o).filter((m) => m.d <= 2500);
    // En ce moment / plus tard aujourd'hui, chacun du plus proche au plus loin ; un marché déjà fini n'apparaît plus.
    const items = [
      ...mkAll.map((m) => ({ m, d: m.d, when: marketWhen(m).when })),
      ...all.filter((e) => !lastIds.has(e)).map((e) => ({ e, d: e.d, when: startsLater(e) ? 'later' : 'now' })),
    ].filter((x) => x.when !== 'done').sort((x, y) => x.d - y.d);
    const now = items.filter((x) => x.when === 'now');
    const later = items.filter((x) => x.when === 'later').slice(0, 15);
    const feat = now[0] ?? null; // la plus proche en ce moment : la grande plaque en tête
    const card = (x, opts = {}) => (x.m ? marketRow(x.m, back, opts) : eventRow(x.e, back, opts));
    const nowRest = now.slice(1, 26);
    body = [
      feat ? card(feat, { feat: true, kicker: 'En ce moment, au plus près' }) : null,
      ...top,
      head('Dernière chance : expos qui ferment', Math.min(3, last.length)), list(last.slice(0, 3).map((e) => eventRow(e, back, { last: true }))),
      head('En ce moment', nowRest.length), list(nowRest.map((x) => card(x))),
      head('Plus tard aujourd\'hui', later.length), list(later.map((x) => card(x))),
      ...(mode === 'free' ? freeSection() : []),
      !items.length && !last.length ? el('p', { class: 'empty' }, `Aucune sortie${mode === 'free' ? ' gratuite' : ''} trouvée aujourd'hui à moins de 2 km.`) : null,
    ];
  }
  openSheet(title, el('div', { class: 'stack' },
    seg, // les onglets restent toujours à la même place ; les annonces viennent dessous
    el('p', { class: 'from-line' }, ico(fromMap ? 'map' : 'locate-fixed'), fromMap ? ' Autour du centre de la carte. Pour un autre quartier : déplace la carte et rouvre Sorties.' : ' Autour de toi.'),
    ...(mode === 'art' ? top : []), // Tout et Gratuit : sous la plaque
    ...body,
    el('details', { class: 'help-item sources', open: Boolean(marketsTime) && Date.now() - marketsTime > 30 * 864e5 }, el('summary', {}, ico('info'), 'Aide, sources et mise à jour'),
      el('div', { class: 'stack sources-body' },
        el('p', { class: 'help' }, `Ici : les marchés, brocantes, fêtes et expos du jour de l'agenda de la Ville, à moins de 2 km ${fromMap ? 'du centre de la carte' : 'de toi'}.`),
        el('p', { class: 'help' }, 'Mise à jour automatique : l\'agenda se recharge chaque jour à la première ouverture, les marchés tous les 7 jours, les galeries tous les 30 jours. Le bouton recharge tout de suite (utile si une sortie vient d\'être annoncée ou si le réseau a manqué).'),
        el('button', { type: 'button', class: 'btn c-disc', onclick: refreshSorties }, ico('refresh-cw'), 'Mettre à jour maintenant'),
        el('p', { class: 'help' }, [`Agenda : aujourd'hui`, marketsTime ? `marchés : liste du ${new Date(marketsTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : '', mode === 'art' && galleriesTime ? `galeries : liste du ${new Date(galleriesTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''].filter(Boolean).join(' · ') + '.'),
        el('h3', { class: 'ring-title menu-group' }, 'Pour aller plus loin'),
        el('div', { class: 'menu' }, SORTIES_LINKS.map(([title, sub, href]) => el('a', { class: 'menu-row c-disc', href, target: '_blank', rel: 'noopener noreferrer' },
          el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)),
          el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '↗')))),
        el('p', { class: 'help' }, `Sources : marchés et agenda « Que faire à Paris ? » de la Ville de Paris${mode === 'art' ? ', galeries OpenStreetMap' : ''}. Dernière chance : expos de l'agenda qui ferment dans moins de 7 jours. Les fermetures exceptionnelles ne sont pas dans ces données. Ta position n'est pas envoyée : l'appli trie sur le téléphone.${soon.length ? ` Temps forts vérifiés le ${HIGHLIGHTS_CHECKED}.` : ''}`),
        mode === 'art' ? el('p', { class: 'help' }, 'Galeries : la plupart ferment le dimanche et le lundi ; sans horaires connus, vérifie avant d\'y aller.') : null,
        ...notes.map((t) => el('p', { class: 'help' }, t)))),
    foot(backNear()),
  ), { tall: true, name: 'events', again: openEvents });
  nearLayer.clearLayers();
  if (!following && !fromMap) meMarker(o.lat, o.lng).addTo(nearLayer);
  for (const e of mode === 'art' ? [...last, ...all.filter(isExpo)] : [...last.slice(0, 3), ...all]) L.circleMarker([e.lat, e.lng], { radius: 6, color: '#c2255c', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  if (mode === 'art' && galleries) for (const g of galleriesNear(galleries, o).slice(0, 15)) L.circleMarker([g.lat, g.lng], { radius: 6, color: '#A54A28', weight: 3, fillColor: openState(g.hours)?.open ? '#A54A28' : '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
}

/* ---------- Parcours galeries : une boucle à pied par les galeries ouvertes à ton arrivée ---------- */

let galMin = 120;
let galBack = null; // d'où l'on vient : Sorties ou Itinéraire
async function openGalleryWalk(from = null) {
  if (from) galBack = from;
  track('Parcours galeries');
  const origin0 = galBack === openEvents && evFrom ? evFrom : origin; // depuis Sorties : le même point de départ
  if (!origin0) { openNear(); return; }
  if (!galleries) {
    openSheet([ico('palette'), ' Parcours galeries'], el('p', { class: 'help' }, 'Chargement de la liste des galeries…'), { name: 'galwalk' });
    try { await loadGalleries(); } catch {
      openSheet([ico('palette'), ' Parcours galeries'], el('div', { class: 'stack' }, el('p', { class: 'warn' }, 'La liste des galeries (OpenStreetMap) ne répond pas. Réessaie plus tard.'), el('button', { type: 'button', class: 'btn', onclick: () => (galBack ?? openRoutes)() }, galBack === openEvents ? '← Sorties' : '← Itinéraire')), { name: 'galwalk' });
      return;
    }
  }
  // Seulement les galeries aux horaires connus : sans horaires, on risque de trouver porte close
  const cands = galleriesNear(galleries, origin0, new Date(), 2000).filter((g) => openState(g.hours) != null);
  const isOpen = (g, t) => { const st = openState(g.hours, new Date(Date.now() + t * 60000)); return st ? st.open : null; };
  const plan = planLoopOpen(origin0, cands, galMin, isOpen, { dwell: 15, maxStops: 6 });
  const choice = el('div', { class: 'seg', role: 'group', 'aria-label': 'Durée' }, [60, 120, 180].map((v) =>
    el('button', { type: 'button', 'aria-pressed': String(v === galMin), onclick: () => { galMin = v; openGalleryWalk(); } }, `${v / 60} h`)));
  let prev = origin0;
  const steps = plan.route.map((g, i) => {
    const leg = distanceM(prev, g); prev = g;
    return el('li', { class: 'item' }, el('span', { class: 'item-main' },
      el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, g.name), el('span', { class: 'item-sub' }, [fmtWalk(leg), openState(g.hours)?.until ? `ferme à ${hhText(openState(g.hours).until)}` : ''].filter(Boolean).join(' · ')))));
  });
  openSheet([ico('palette'), ' Parcours galeries'], el('div', { class: 'stack' },
    el('div', {}, el('div', { class: 'legend' }, 'J\'ai devant moi'), choice),
    plan.route.length
      ? el('p', { class: 'summary' }, `${plural(plan.route.length, 'galerie', 'galeries')} ouvertes à ton arrivée, retour au départ : ${plan.walk} min de marche + 15 min par galerie = ${plan.total} min.`)
      : el('p', { class: 'empty' }, cands.length ? 'Aucune galerie ouverte sur ce temps. Essaie plus long, ou un autre jour (beaucoup ferment le dimanche et le lundi).' : 'Aucune galerie aux horaires connus à moins de 2 km.'),
    plan.route.length ? el('ol', { class: 'items' }, steps) : null,
    plan.route.length ? el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => startGuide([...plan.route, { name: 'Retour au départ', lat: origin0.lat, lng: origin0.lng }], 'Parcours galeries') }, ico('navigation'), 'Balade guidée') : null,
    plan.route.length ? el('a', { class: 'btn', href: loopUrl(origin0, plan.route), target: '_blank', rel: 'noopener' }, 'Google Maps') : null,
    el('p', { class: 'help' }, 'Seules les galeries dont les horaires sont connus (OpenStreetMap) sont proposées, et seulement si elles sont ouvertes à ton arrivée. Ta position n\'est pas envoyée.'),
    el('button', { type: 'button', class: 'btn', onclick: () => (galBack ?? openRoutes)() }, galBack === openEvents ? '← Sorties' : '← Itinéraire'),
  ), { tall: true, name: 'galwalk', again: () => openGalleryWalk() });
  nearLayer.clearLayers();
  if (!following && origin0.kind !== 'map') meMarker(origin0.lat, origin0.lng).addTo(nearLayer);
  if (plan.route.length) {
    const line = [origin0, ...plan.route, origin0].map((p) => [p.lat, p.lng]);
    L.polyline(line, { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
    plan.route.forEach((p, i) => L.marker([p.lat, p.lng], { interactive: false, keyboard: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }) }).addTo(nearLayer));
    map.fitBounds(L.latLngBounds(line).pad(0.2), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
  }
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

/* ---------- Partager l'appli elle-même (lien ou QR code), sans aucune donnée ---------- */

/** Adresse publique de l'appli, sans page, paramètre ni ancre (rien de personnel dedans). */
const APP_URL = () => location.origin + location.pathname.replace(/[^/]*$/, '');
function showAppQr() {
  const q = qrcode(0, 'M'); q.addData(APP_URL()); q.make();
  const box = el('div', { class: 'qr-box', role: 'img', 'aria-label': 'QR code de l\'adresse de l\'appli' });
  box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  openSheet([ico('qr-code'), ' Partager l\'appli'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, 'Ma carte de Paris'), box,
    el('p', { class: 'help' }, `Ton proche le scanne avec l'appareil photo, ouvre le lien dans Chrome, puis menu ⋮ → « Ajouter à l'écran d'accueil ». Sur iPhone : Safari, Partager → « Sur l'écran d'accueil ». Adresse : ${APP_URL()}`),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('appli') }, '← Application')),
  ), { name: 'appqr' });
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
  track('Rentrer');
  await stationsReady;
  const mine = (state.myStations ?? []).map((s) => ({ ...s, st: stationByName(s.station) })).filter((s) => s.st);
  if (!mine.length) { pickMyStation(true); return; }
  if (mine.length === 1) { openHomePlan(mine[0]); return; }
  openSheet([ico('house'), ' Rentrer'], el('div', { class: 'menu' }, mine.map((s) => el('button', { type: 'button', class: 'menu-row c-metro', onclick: () => openHomePlan(s) },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('house')),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, s.label), el('span', { class: 'menu-sub' }, `Ⓜ ${s.st.n}`)),
    el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›')))), { name: 'home' });
}
/* Rentrer : les 2 ou 3 stations (métro, RER) les plus proches de toi, avec le temps total
   jusqu'à ta station Maison depuis chacune ; la plus rapide est marquée. Calcul sur le téléphone. */
async function openHomePlan(home) {
  toast('Recherche des stations proches…');
  let from = freshHere();
  if (!from) {
    try { from = await locate(); } catch (e) { if (here) from = here; else { toast(e.message, true); return; } }
  }
  hideToast();
  const dest = { name: `${home.label} (${home.st.n})`, lat: home.st.lat, lng: home.st.lng };
  const back = named('Rentrer', () => openHomePlan(home));
  const near = nearestStations(stations, from, 3).filter((x) => x.d <= 1500);
  const walk = walkMinutes(distanceM(from, dest));
  const opts = near.map(({ station: st, d }) => ({ st, d, plan: metroPlan(stations, from, dest, 3, st) }));
  const best = opts.reduce((a, o) => (!a || o.plan.minutes < a.plan.minutes ? o : a), null);
  const lineBadges = (st) => linesOf(st).map((l) => el('span', { class: `line-badge${l.startsWith('RER') ? ' rer' : ''}` }, l.replace('RER ', 'RER\u00a0')));
  openSheet([ico('house'), ` Rentrer · ${home.label}`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `Vers ${home.st.n}. Les stations les plus proches de toi\u00a0:`),
    opts.length ? el('ul', { class: 'items' }, opts.map((o) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => renderMetroPlan(dest, from, back, o.st) },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('route', { size: 18 })),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, o.st.n),
          el('span', { class: 'lines' }, lineBadges(o.st), o === best && opts.length > 1 ? el('span', { class: 'tag open' }, 'Le plus rapide') : null),
          el('span', { class: 'item-sub' }, `${walkMinutes(o.d)} min à pied · ${o.plan.type === 'walk' ? 'puis à pied' : `≈ ${o.plan.minutes} min jusqu'à ${home.label}`}`))),
      el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: `Ⓜ ${o.st.n}`, lat: o.st.lat, lng: o.st.lng }), 'aria-label': `Boussole vers la station ${o.st.n}` }, ico('compass'))))) 
      : el('p', { class: 'empty' }, 'Aucune station de métro à moins de 1,5 km.'),
    best && walk <= best.plan.minutes ? el('p', { class: 'summary' }, `À pied, c'est aussi rapide : ≈ ${walk} min.`) : null,
    el('p', { class: 'help' }, 'Métro et RER (là où le RER croise le métro). Estimation sans horaires ; pour le bus, ouvre le trajet puis Google Maps.'),
    el('button', { type: 'button', class: 'btn c-metro', onclick: openMyStations }, ico('house'), 'Mes stations'),
  ), { name: `home:${home.id ?? home.label}`, again: back });
  nearLayer.clearLayers();
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
  for (const o of opts) L.circleMarker([o.st.lat, o.st.lng], { radius: 9, color: '#1B56E8', weight: 3, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  if (opts.length) map.fitBounds(L.latLngBounds([[from.lat, from.lng], ...opts.map((o) => [o.st.lat, o.st.lng])]).pad(0.3), { paddingTopLeft: [10, 60], paddingBottomRight: [70, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages')),
  ), { tall: true, name: 'mystations', again: openMyStations });
}

/* ---------- Température et qualité de l'air : petit badge sur la carte ---------- */

let air = null;
const wxBadge = document.getElementById('wxBadge');
function drawWx() {
  const day = dayNote();
  if (!meteo && !air && !day) { wxBadge.hidden = true; return; }
  wxBadge.hidden = false;
  fill(wxBadge,
    day ? el('span', { class: 'day-tag' }, day.short) : null,
    meteo?.temp != null ? el('b', {}, `${meteo.temp}°`) : null,
    meteo?.rain ? ico('cloud-rain', { size: 15 }) : null,
    air ? el('span', { class: `air-dot air-${air.level}`, 'aria-hidden': 'true' }) : null,
    air ? `Air ${air.label.toLowerCase()}` : null);
  wxBadge.setAttribute('aria-label', [day ? (day.short === 'Férié' ? 'jour férié' : 'dimanche') : '', meteo?.temp != null ? `${meteo.temp} degrés` : '', meteo?.rain ? 'pluie' : '', air ? `qualité de l'air : ${air.label}` : ''].filter(Boolean).join(', ') + '. Détails');
}
const AIR_ADVICE = {
  bon: 'Air de bonne qualité : aucune précaution.', correct: 'Rien à signaler pour l\'air.', moyen: 'Les personnes sensibles peuvent limiter les efforts longs.',
  mediocre: 'Évite les efforts intenses dehors, surtout près des grands axes.', 'tres-mediocre': 'Limite les efforts dehors ; privilégie les parcs et les rues calmes.',
  extreme: 'Évite les efforts dehors aujourd\'hui.',
};
function openWeather() {
  track('Météo et air');
  const day = dayNote();
  openSheet([ico('thermometer-sun'), day ? ' Aujourd\'hui' : ' Météo et air'], el('div', { class: 'stack' },
    day ? el('p', { class: 'warn day-note' }, day.long) : null,
    meteo ? el('p', { class: 'where-big' }, `${meteo.temp ?? '–'}° · ${meteo.rain ? 'il pleut' : 'pas de pluie'}`) : null,
    air ? el('div', { class: `air-card air-${air.level}` }, el('b', {}, `Air ${air.label.toLowerCase()}`), el('span', {}, ` · indice européen ${air.aqi}`)) : el('p', { class: 'help' }, 'Qualité de l\'air indisponible pour le moment.'),
    air ? el('p', {}, AIR_ADVICE[air.level]) : null,
    meteo?.rain && state.points.some((p) => p.covered) ? el('button', { type: 'button', class: 'btn c-guide', onclick: () => {
      filt.covered = true; refresh(); closeSheet(); toast(`Il pleut : ${plural(visible().length, 'lieu abrité', 'lieux abrités')} sur la carte`);
    } }, ico('umbrella'), `Il pleut : voir mes lieux abrités (${state.points.filter((p) => p.covered).length})`) : null,
    air ? el('p', { class: 'help' }, [air.pm25 != null ? `Particules fines PM2,5 : ${air.pm25} µg/m³` : '', air.pm10 != null ? `PM10 : ${air.pm10}` : '', air.no2 != null ? `dioxyde d'azote : ${air.no2}` : '', air.o3 != null ? `ozone : ${air.o3}` : ''].filter(Boolean).join(' · ')) : null,
    meteo?.temp >= 28 ? el('button', { type: 'button', class: 'btn c-guide', onclick: nearestPratique }, ico('trees'), 'Lieux frais près de moi') : null,
    el('p', { class: 'help' }, 'Source : Open-Meteo (prévisions européennes CAMS pour l\'air). Valeurs pour le quartier, à l\'heure près. Seule une position arrondie à 1 km est envoyée.'),
  ), { name: 'weather', again: openWeather });
}
wxBadge.addEventListener('click', openWeather);

/* ---------- Marchés découverts : sur la carte le jour où ils se tiennent, et dans Sorties ---------- */

const marketsLayer = L.layerGroup().addTo(map);
async function loadMarkets(force = false) {
  if (markets && !force) return markets;
  let cached = null;
  try { cached = JSON.parse(storage.getItem('carte-paris.marches') ?? 'null'); } catch { /* rien */ }
  if (force || !cached || Date.now() - cached.time > 7 * 864e5) {
    try {
      const r = await fetch(MARKETS_URL);
      if (!r.ok) throw new Error(String(r.status));
      const items = parseMarkets(await r.json());
      if (items.length) { cached = { time: Date.now(), items }; try { storage.setItem('carte-paris.marches', JSON.stringify(cached)); } catch { /* trop gros */ } }
    } catch { if (force) throw new Error('marchés'); /* sinon on garde l'ancienne copie */ }
  }
  markets = cached?.items ?? [];
  marketsTime = cached?.time ?? 0;
  return markets;
}
/** Bouton « Mettre à jour » de Sorties : marchés et agenda redemandés tout de suite. */
async function refreshSorties() {
  toast('Mise à jour des marchés et de l\'agenda…');
  try {
    await loadMarkets(true);
    eventsCache = null;
    if (eventsMode === 'art') await loadGalleries(true).catch(() => {});
    drawMarkets();
    await openEvents();
    toast(`Marchés et sorties à jour (${plural(markets.length, 'marché', 'marchés')} à Paris).`);
  } catch {
    toast('La Ville de Paris ne répond pas : la liste gardée reste affichée. Réessaie plus tard.', true);
  }
}
/* ---------- Lignes de métro et RER sur la carte (à la demande) ----------
   Tracés Île-de-France Mobilités (ODbL) simplifiés, gardés dans l'appli : rien n'est demandé à un serveur. */
const linesLayer = L.layerGroup();
const LINES_ATTR = 'Lignes : <a href="https://data.iledefrance-mobilites.fr/">Île-de-France Mobilités</a> (ODbL)';
let linesData = null;
// texte foncé sur les couleurs claires (ligne 1 jaune, RER C…), blanc sur les foncées
const textOn = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.3 ? '#1C2533' : '#ffffff'; };
const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
async function drawLines() {
  linesLayer.clearLayers();
  if (!state.showLines) { map.removeLayer(linesLayer); map.attributionControl.removeAttribution(LINES_ATTR); return; }
  try { linesData ??= (await (await fetch('data/lignes.json')).json()).lines ?? []; } catch { toast('Les tracés des lignes n\'ont pas pu être chargés.', true); return; }
  if (!state.showLines) return;
  for (const ln of [...linesData].reverse()) { // métro dessiné par-dessus le RER
    const rer = ln.mode === 'R';
    for (const path of ln.paths) {
      L.polyline(path, { className: 'line-casing', weight: rer ? 8 : 6.5, opacity: 0.9, interactive: false }).addTo(linesLayer);
      L.polyline(path, { color: ln.color, weight: rer ? 5 : 3.5, opacity: 1, interactive: false, dashArray: rer ? '10 4' : null }).addTo(linesLayer);
    }
    // une pastille par ligne, au milieu de son plus long morceau
    const longest = ln.paths.reduce((a, b) => (b.length > a.length ? b : a), []);
    const mid = longest[Math.floor(longest.length / 2)];
    if (mid) L.marker(mid, { interactive: false, keyboard: false, zIndexOffset: -200,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="line-tag${rer ? ' rer' : ''}" style="--c:${ln.color};--t:${textOn(ln.color)}">${rer ? `RER ${ln.ref}` : ln.ref}</span>`, iconSize: [30, 20], iconAnchor: [15, 10] }) }).addTo(linesLayer);
  }
  // Stations : un rond et les numéros de leurs lignes (visibles à partir du niveau quartier, noms en zoomant encore)
  await stationsReady;
  if (!state.showLines) return;
  const color = new Map(linesData.map((l) => [l.mode === 'R' ? `RER ${l.ref}` : l.ref, l.color]));
  for (const st of stations) {
    const badges = linesOf(st).map((l) => {
      const c = color.get(l) ?? '#1F4180';
      return `<span class="st-line${l.startsWith('RER') ? ' rer' : ''}" style="--c:${c};--t:${textOn(c)}">${esc(l.replace('RER ', ''))}</span>`;
    }).join('');
    L.marker([st.lat, st.lng], { interactive: false, keyboard: false, zIndexOffset: -150,
      icon: L.divIcon({ className: 'pin-wrap st-wrap', html: `<span class="st-mark"><span class="st-dot"></span>${badges}<span class="st-name">${esc(st.n)}</span></span>`, iconSize: [0, 0], iconAnchor: [0, 0] }) }).addTo(linesLayer);
  }
  linesLayer.addTo(map);
  map.attributionControl.addAttribution(LINES_ATTR);
}
function toggleLines() {
  state.showLines = !state.showLines; persist(); drawLines(); refresh();
  toast(state.showLines ? 'Lignes de métro et RER affichées' : 'Lignes de métro et RER cachées');
}

const STREET_ICON = { marche: 'gift', brocante: 'tags', fete: 'sparkles', expo: 'palette' };
const STREET_LABEL = { marche: 'Marché éphémère', brocante: 'Brocante, puces, vide-grenier', fete: 'Fête, festival', expo: 'Expo en plein air' };
async function drawMarkets() {
  marketsLayer.clearLayers();
  if (!state.showMarkets) return;
  const list = marketsOn(await loadMarkets());
  if (!state.showMarkets) return;
  for (const m of list) {
    L.marker([m.lat, m.lng], { keyboard: true, title: m.name, alt: m.name, zIndexOffset: -100,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="market-pin">${svgIcon('store', { size: 15, stroke: 2.2 })}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) })
      .on('click', () => openMarket(m)).addTo(marketsLayer);
  }
  if (!list.length && markets?.length === 0) toast('Les marchés de la Ville de Paris ne répondent pas pour le moment.', true);
  // Dans la rue : brocantes, fêtes, expos en plein air, marchés éphémères de l'agenda du jour
  let ev = [];
  try { ev = await todayEvents(); } catch { return; }
  if (!state.showMarkets) return;
  const now = new Date();
  const seen = new Set();
  for (const e of ev) {
    const kind = streetKind(e);
    if (!kind || (e.end && e.end < now)) continue;
    const key = `${e.title}|${e.lat.toFixed(4)}|${e.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    L.marker([e.lat, e.lng], { keyboard: true, title: e.title, alt: e.title, zIndexOffset: -90,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="market-pin street-pin">${svgIcon(STREET_ICON[kind], { size: 15, stroke: 2.2 })}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) })
      .on('click', () => openStreetEvent(e)).addTo(marketsLayer);
  }
}
/** Fiche d'un événement de rue (agenda de la Ville). */
function openStreetEvent(e) {
  const kind = streetKind(e) ?? 'fete';
  const d = freshHere() ? distanceM(freshHere(), e) : null;
  openSheet([ico(STREET_ICON[kind]), ` ${e.title}`], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, [STREET_LABEL[kind], whenText(e), d != null ? fmtWalk(d) : ''].filter(Boolean).join(' · ')),
    e.place || e.address ? el('div', { class: 'copy-row' }, el('p', { class: 'where' }, ico('map-pin'), [e.place, e.address].filter(Boolean).join(' · ')), copyBtn(() => e.address || e.place, 'l\'adresse', 'Adresse copiée')) : null,
    e.lead ? el('p', { class: 'help' }, e.lead) : null,
    e.free ? el('p', {}, el('span', { class: 'tag open' }, 'Gratuit')) : null,
    el('a', { class: 'btn primary go-bar', href: mapsUrl(e, d ?? 1000), target: '_blank', rel: 'noopener' }, el('span', { 'aria-hidden': 'true' }, '→'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: e.title, lat: e.lat, lng: e.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: e.title, lat: e.lat, lng: e.lng, id: `ev:${e.lat},${e.lng}` }, named('Événement', () => openStreetEvent(e))), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openForm({ name: e.title, lat: e.lat, lng: e.lng, address: e.address, acc: null, note: [e.place, e.url].filter(Boolean).join(' · ') }) }, ico('plus'), 'Enregistrer')),
    e.url ? el('a', { class: 'btn c-disc', href: e.url, target: '_blank', rel: 'noopener' }, ico('calendar-days'), 'Voir dans « Que faire à Paris »') : null,
    el('p', { class: 'help' }, 'Agenda « Que faire à Paris ? » de la Ville de Paris. « Dans la rue » est deviné d\'après le titre et le lieu : vérifie sur la page de l\'événement.'),
  ), { name: 'street' });
}
function openMarket(m, back = null) {
  const d = freshHere() ? distanceM(freshHere(), m) : null;
  openSheet([ico('store'), ` ${m.name}`], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `Aujourd'hui${hoursToday(m) ? ` : ${hoursToday(m)}` : ''}${d != null ? ` · ${fmtWalk(d)}` : ''}`),
    m.place ? el('p', { class: 'where' }, m.place) : null,
    m.products ? el('p', { class: 'help' }, m.products) : null,
    el('p', { class: 'help' }, `Se tient le ${['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].filter((_, i) => m.days[i]).join(', ')}.`),
    el('a', { class: 'btn primary go-bar', href: mapsUrl(m, d ?? 1000), target: '_blank', rel: 'noopener' }, el('span', { 'aria-hidden': 'true' }, '→'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: m.name, lat: m.lat, lng: m.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: m.name, lat: m.lat, lng: m.lng, id: `mk:${m.lat},${m.lng}` }, named('Marché', () => openMarket(m, back))), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openForm({ name: m.name, lat: m.lat, lng: m.lng, address: m.place, acc: null }) }, ico('plus'), 'Enregistrer')),
    back ? backBtn(back) : null,
    el('p', { class: 'help' }, 'Données « Marchés découverts », Ville de Paris. Horaires indicatifs.'),
  ), { name: 'market' });
}

/* ---------- Météo (Open-Meteo, position arrondie, une fois par demi-heure au plus) ---------- */

let meteo = null;
let meteoAt = 0;
async function checkMeteo(at) {
  if (Date.now() - meteoAt < 30 * 60 * 1000 || !navigator.onLine) return;
  meteoAt = Date.now();
  const [m, a] = await Promise.all([
    fetch(meteoUrl(at?.lat, at?.lng)).then((r) => r.json()).then(readMeteo).catch(() => null),
    fetch(airUrl(at?.lat, at?.lng)).then((r) => r.json()).then(readAir).catch(() => null),
  ]);
  if (a) air = a;
  if (m) { const changed = m.rain !== meteo?.rain || (m.temp >= 28) !== (meteo?.temp >= 28); meteo = m; if (changed && view === 'near') renderNear(); }
  drawWx();
}
// Au lancement et toutes les 30 min : météo du dernier endroit connu (ou du centre de Paris), sans demander la position.
setTimeout(() => checkMeteo(here ?? { lat: PARIS[0], lng: PARIS[1] }), 1500);
setInterval(() => { if (document.visibilityState === 'visible') checkMeteo(here ?? { lat: PARIS[0], lng: PARIS[1] }); }, 31 * 60 * 1000);

/* ---------- Temps libre : une boucle qui revient au point de départ ---------- */

let freeMin = 60;
let freeDwell = 15;
function openFreeTime() {
  track('J\'ai du temps');
  if (!origin) { openNear(); return; }
  const todo = visible(); // « déjà visité » n'est qu'une information : tous les lieux comptent
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
      ? el('p', { class: 'summary' }, `${plural(plan.route.length, 'lieu', 'lieux')}, retour au départ : ${plan.walk} min de marche + ${plan.route.length * freeDwell} min sur place = ${plan.total} min.`)
      : el('p', { class: 'empty' }, todo.length ? 'Aucun lieu assez proche pour ce temps. Essaie plus long ou moins de temps sur place.' : 'Aucun lieu avec les filtres actuels.'),
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
  if (!following) meMarker(origin.lat, origin.lng).addTo(nearLayer);
  if (plan.route.length) {
    const line = [origin, ...plan.route, origin].map((p) => [p.lat, p.lng]);
    L.polyline(line, { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
    plan.route.forEach((p, i) => L.marker([p.lat, p.lng], { interactive: false, keyboard: false, zIndexOffset: 1000,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 30] }) }).addTo(nearLayer));
    map.fitBounds(L.latLngBounds(line).pad(0.2), { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
  }
}

/* ---------- Surprends-moi : un de tes lieux au hasard, à moins de 15 min ---------- */

function surprise() {
  track('Surprise');
  if (!origin) { openNear(); return; }
  const max = minutesToMeters(15);
  const pool = visible().filter((p) => distanceM(origin, p) <= max);
  if (!pool.length) { toast('Aucun de tes lieux à moins de 15 min (avec les filtres actuels).', true); return; }
  const p = pool[Math.floor(Math.random() * pool.length)];
  openDetail(p.id, named('Autour de moi', () => renderNear()));
  toast(`Surprise : ${p.name}, à ${walkMinutes(distanceM(origin, p))} min à pied`);
}

/* ---------- Curiosités : articles Wikipédia autour (position arrondie à 100 m environ) ---------- */

const wikiCache = new Map();
async function openCuriosities() {
  track('Curiosités');
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
  if (!following) meMarker(origin.lat, origin.lng).addTo(nearLayer);
  for (const w of items) L.circleMarker([w.lat, w.lng], { radius: 6, color: '#5f3dc4', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
}

/* ---------- Itinéraire : un seul outil pour les trois façons de tracer un trajet ---------- */

function openRoutes() {
  const row = (icon, title, sub, onclick) => el('button', { type: 'button', class: 'menu-row c-guide', onclick },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(icon)),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)),
    el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›'));
  openSheet([ico('route'), ' Itinéraire'], el('div', { class: 'menu' },
    row('hourglass', 'J\'ai du temps', 'Une boucle à pied qui revient ici, selon ton temps libre', () => openFreeTime()),
    row('footprints', 'Sur mon chemin', 'Tes lieux sur le trajet vers une destination', () => openWayPicker()),
    row('route', 'Relier des lieux', '2 à 4 de tes lieux dans le meilleur ordre', () => openRoutePicker()),
    row('palette', 'Parcours galeries', 'Une boucle par les galeries d\'art ouvertes à ton arrivée', () => openGalleryWalk(openRoutes)),
    el('button', { type: 'button', class: 'btn', style: 'margin-top:8px', onclick: () => renderNear() }, '← Autour de moi'),
  ), { name: 'routes', again: openRoutes });
}

/* ---------- Monuments historiques (Wikidata, protégés MH) ---------- */

const HIST_KEY = 'carte-paris.monuments';
let histList = null;
async function monuments() {
  if (histList) return histList;
  try { const c = JSON.parse(localStorage.getItem(HIST_KEY) ?? 'null'); if (c && Date.now() - c.t < 30 * 864e5 && c.list?.length) histList = c.list; } catch { /* rien */ }
  if (histList) return histList;
  const r = await fetch(HIST_URL, { headers: { Accept: 'application/sparql-results+json' } });
  if (!r.ok) throw new Error('wikidata');
  histList = parseHist(await r.json());
  try { localStorage.setItem(HIST_KEY, JSON.stringify({ t: Date.now(), list: histList })); } catch { /* stockage plein : on garde en mémoire */ }
  return histList;
}

async function openMonuments() {
  track('Monuments');
  if (!origin) { openNear(); return; }
  const title = [ico('landmark'), ' Monuments historiques'];
  let all;
  if (!histList) openSheet(title, el('p', { class: 'help' }, 'Chargement des monuments de Paris (la première fois seulement)…'), { name: 'hist' });
  try { all = await monuments(); } catch {
    openSheet(title, el('div', { class: 'stack' },
      el('p', { class: 'warn' }, 'La base des monuments ne répond pas. Réessaie dans un moment.'),
      el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')), { name: 'hist' });
    return;
  }
  const items = all.map((m) => ({ ...m, d: distanceM(origin, m) })).filter((m) => m.d <= 1000).sort((a, b) => a.d - b.d).slice(0, 25);
  const have = (m) => findDuplicate(state.points, { name: m.name, lat: m.lat, lng: m.lng });
  const link = (href, icon, label, aria) => el('a', { class: 'mini-link', href, target: '_blank', rel: 'noopener', 'aria-label': aria }, ico(icon), label);
  openSheet(title, el('div', { class: 'stack' },
    el('p', { class: 'help' }, items.length ? `${plural(items.length, 'monument protégé', 'monuments protégés')} à moins de 1 km, du plus proche au plus loin.` : 'Aucun monument historique à moins de 1 km.'),
    el('ul', { class: 'items' }, items.map((m) => el('li', { class: 'item item-col' },
      el('div', { class: 'item-row wrap' },
        el('div', { class: 'item-main' },
          el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('landmark', { size: 18 })),
          el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, m.name), el('span', { class: 'item-sub' }, `${fmtDist(m.d)} · ${walkMinutes(m.d)} min`))),
        el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: m.name, lat: m.lat, lng: m.lng }), 'aria-label': `Boussole vers ${m.name}` }, ico('compass')),
        metroBtn(m, openMonuments),
        have(m) ? null : el('button', { type: 'button', class: 'go-compass add', 'aria-label': `Ajouter ${m.name} à ma carte`, onclick: () => openForm({ name: m.name, lat: m.lat, lng: m.lng, acc: null }) }, ico('plus'))),
      el('div', { class: 'links' },
        m.site ? link(m.site, 'send', 'Site officiel', `Site officiel de ${m.name} (visites, billets)`) : null,
        m.merimee ? link(merimeeUrl(m.merimee), 'landmark', 'Fiche Culture', `Fiche du ministère de la Culture : ${m.name}`) : null,
        m.wiki ? link(m.wiki, 'book-open-text', 'Wikipédia', `Article Wikipédia : ${m.name}`) : null)))),
    el('p', { class: 'help' }, 'Billets et horaires : sur le site officiel quand il existe. Sources : Wikidata (CC0) et base Mérimée du ministère de la Culture. La liste de Paris est téléchargée une fois par mois ; ta position n\'est pas envoyée.'),
    el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'),
  ), { tall: true, name: 'hist', again: openMonuments });
  nearLayer.clearLayers();
  if (!following) meMarker(origin.lat, origin.lng).addTo(nearLayer);
  for (const m of items) L.circleMarker([m.lat, m.lng], { radius: 7, color: '#A54A28', weight: 3, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  if (items.length) map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], ...items.slice(0, 8).map((m) => [m.lat, m.lng])]).pad(0.3), { paddingTopLeft: [10, 60], paddingBottomRight: [70, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
}

/* ---------- Boussole « Vers ce lieu » ---------- */

let compassOpen = false;
let compassStop = null;
const compassEl = document.getElementById('compass');

function openCompass(p, step = null) {
  track('Boussole');
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
  // Arrivée à un de mes lieux : « Visité » en un appui, jamais coché tout seul (passer à côté n'est pas visiter).
  const mine = p.id ? state.points.find((x) => x.id === p.id) : null;
  const doneBtn = compassEl.querySelector('.compass-done');
  let arrived = false;
  doneBtn.hidden = true;
  fill(doneBtn, ico('check'), 'Visité');
  doneBtn.setAttribute('aria-label', `Marquer ${p.name} comme déjà visité`);
  doneBtn.onclick = () => {
    if (!mine) return;
    setDone(mine, true); persist(); renderMarkers();
    doneBtn.hidden = true;
    toast(`${mine.name} : noté « déjà visité »`);
  };
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
      }
      return;
    }
    const dir = rel == null ? null : directionWord(rel);
    if (!said.first) {
      said.first = true; said.step = Math.floor(d / 100); said.dir = dir; said.dirAt = Date.now();
      speak(`Direction ${p.name}. ${spokenDistance(d)}${dir ? `, ${dir}` : ''}.`);
      return;
    }
    const hundred = Math.floor(d / 100);
    if (hundred < said.step) { said.step = hundred; speak(`Encore ${spokenDistance(d)}${dir ? `, ${dir}` : ''}.`); said.dir = dir; said.dirAt = Date.now(); return; }
    if (dir && dir !== said.dir && Date.now() - said.dirAt > 8000) { said.dir = dir; said.dirAt = Date.now(); speak(dir); }
  };

  const draw = () => {
    if (!pos) { dist.textContent = 'Recherche de ta position…'; arrow.style.opacity = '0.25'; return; }
    const d = distanceM(pos, p);
    const b = bearing(pos, p);
    talk(d, heading == null ? null : relativeAngle(b, heading));
    if (d < 20) arrived = true;
    doneBtn.hidden = !(arrived && mine && !mine.done);
    if (d < 20 || !doneBtn.hidden) {
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
      el('p', { class: 'help' }, 'Ses lieux s\'ajoutent aux tiens. Le bouton Filtres en haut permet ensuite d\'afficher les tiens, les siens ou tous.'),
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
  const backBtn = foot(el('button', { type: 'button', class: 'btn', onclick: back }, '← Réglages'));
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
    const hiddenTop = new Set(state.hiddenChips ?? []);
    const topBox = (key, name) => {
      const box = el('input', { type: 'checkbox', class: 'check', checked: !hiddenTop.has(key), 'aria-label': `Afficher ${name} dans la barre du haut` });
      box.addEventListener('change', () => {
        if (box.checked) hiddenTop.delete(key); else hiddenTop.add(key);
        state.hiddenChips = [...hiddenTop]; persist(); refresh(); openSettings('categories');
        requestAnimationFrame(() => document.querySelector(`[data-top="${key}"]`)?.focus());
        toast(box.checked ? `${name} : affiché en haut` : `${name} : masqué en haut (rien n'est supprimé)`);
      });
      box.dataset.top = key;
      return box;
    };
    const fixed = [['all', ico('list'), 'Tout'], ['filters', ico('list-filter'), 'Filtres'], ['fav', glyph(state.fav.icon, { filled: true }), 'Favoris'], ['street', ico('tent'), 'Dans la rue aujourd\'hui'], ['lines', ico('lines'), 'Lignes de métro et RER']];
    openSheet([ico('tags'), ' Catégories et listes'], el('div', { class: 'stack' },
      el('p', { class: 'help' }, 'La barre du haut, de gauche à droite. Coche pour afficher, décoche pour masquer : les lieux restent sur la carte. Flèches pour ranger tes catégories, crayon pour le nom, l\'icône et la couleur.'),
      el('div', { class: 'legend' }, 'Toujours en tête'),
      el('div', {}, fixed.map(([key, icon, name]) => el('div', { class: `cat-row${hiddenTop.has(key) ? ' off' : ''}` },
        el('label', { class: 'tool-check' }, topBox(key, name), el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, icon), el('span', { class: 'cat-name' }, name))))),
      el('div', { class: 'legend' }, 'Mes catégories, dans cet ordre'),
      el('div', {}, state.categories.map((c, i) => {
        const k = categoryCounts(state.points, c.id);
        const move = (delta) => { state = moveCategory(state, c.id, delta); persist(); refresh(); openSettings('categories');
          requestAnimationFrame(() => document.querySelector(`[data-move="${c.id}:${delta}"]`)?.focus()); };
        const last = state.categories.length - 1;
        const key = `cat:${c.id}`;
        return el('div', { class: `cat-row${hiddenTop.has(key) ? ' off' : ''}` },
          el('label', { class: 'tool-check' }, topBox(key, c.name), catDot(c.id),
            el('span', { class: 'cat-name' }, c.name, el('br'),
              el('span', { class: 'cat-count' }, k.total ? `${plural(k.total, 'lieu', 'lieux')} · ${k.todo} à faire` : 'aucun lieu'))),
          el('button', { type: 'button', class: 'btn move', disabled: i === 0, 'data-move': `${c.id}:-1`, onclick: () => move(-1), 'aria-label': `Monter ${c.name}` }, '↑'),
          el('button', { type: 'button', class: 'btn move', disabled: i === last, 'data-move': `${c.id}:1`, onclick: () => move(1), 'aria-label': `Descendre ${c.name}` }, '↓'),
          el('button', { type: 'button', class: 'btn move', onclick: () => openCategory(c.id), 'aria-label': `Modifier ${c.name}` }, ico('pencil')));
      })),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openCategory(null) }, '+ Nouvelle catégorie'),
      hiddenTop.size ? el('button', { type: 'button', class: 'btn c-guide', onclick: () => { state.hiddenChips = []; persist(); refresh(); openSettings('categories'); toast('Tous les boutons sont de nouveau en haut'); } }, `Tout réafficher en haut (${hiddenTop.size} masqué${hiddenTop.size > 1 ? 's' : ''})`) : null,
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
        el('button', { type: 'button', class: 'cat-name cat-open', onclick: () => openListPlaces(l.id), 'aria-label': `Choisir les lieux de la liste ${l.name}` }, l.name, el('br'), el('span', { class: 'cat-count' }, `${plural(state.points.filter((p) => p.lists?.includes(l.id)).length, 'lieu', 'lieux')} · choisir les lieux ›`)),
        el('button', { type: 'button', class: 'btn', 'aria-label': `Renommer ${l.name}`, onclick: () => {
          const n = prompt('Nouveau nom de la liste', l.name);
          if (n == null) return;
          try { state = renameList(state, l.id, n); persist(); refresh(); openSettings('categories'); } catch (e) { toast(e.message, true); }
        } }, 'Renommer'),
        el('button', { type: 'button', class: 'btn danger move', 'aria-label': `Supprimer la liste ${l.name}`, onclick: () => {
          if (!confirm(`Supprimer la liste « ${l.name} » ? Les lieux restent sur ta carte.`)) return;
          state = deleteList(state, l.id); filt.lists.delete(l.id); persist(); refresh(); openSettings('categories'); toast('Liste supprimée');
        } }, ico('x'))))) : el('p', { class: 'help' }, 'Une liste regroupe des lieux de catégories différentes (« Sous la pluie », « Avec Paul »).'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => {
        const n = prompt('Nom de la nouvelle liste (ex. « Sous la pluie »)', '');
        if (n == null) return;
        try { const r = addList(state, n); state = r.state; persist(); refresh(); openListPlaces(r.id); } catch (e) { toast(e.message, true); }
      } }, ico('plus'), 'Nouvelle liste'),
      backBtn,
    ), { tall: true, name: 'settings:categories', again: () => openSettings('categories') });
    return;
  }

  if (section === 'style') {
    openSheet([ico('palette'), ' Style de la carte'], el('div', { class: 'stack' },
      el('div', { class: 'style-grid' }, Object.entries(STYLE_INFO).map(([id, st]) => el('button', { type: 'button', class: 'style-card', 'aria-pressed': String((state.mapStyle ?? 'classic') === id && (id !== 'clean' || !!cartoKey())), onclick: () => {
        if (id === 'clean' && !cartoKey()) { openCartoKey(); return; }
        state.mapStyle = id; persist(); applyMapStyle(); openSettings('style'); toast(`Carte : ${st.name}`);
      } }, el('span', { class: `style-prev s-${id}`, 'aria-hidden': 'true' }), el('b', {}, st.name), el('span', { class: 'menu-sub' }, id === 'clean' && !cartoKey() ? 'Sans icônes de commerces : touche pour saisir ta clé CARTO gratuite' : st.sub)))),
      cartoKey() ? el('button', { type: 'button', class: 'btn c-info', onclick: () => openCartoKey() }, ico('settings'), 'Clé CARTO (changer ou retirer)') : null,
      el('p', { class: 'help' }, 'Épuré vient de CARTO (clé gratuite, gardée sur ton téléphone). Française et Douce viennent des serveurs bénévoles d\'OpenStreetMap France : parfait pour un usage personnel. Pastel et Nuit sont des filtres faits par ton téléphone.'),
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
      el('button', { type: 'button', class: 'btn', onclick: () => { state.mapTools = normalizeTools([]); state.hiddenTools = [...DEFAULT_HIDDEN]; persist(); applyToolOrder(); openSettings('outils'); toast('Boutons d\'origine remis'); } }, 'Tout remettre comme au début'),
      backBtn,
    ), { tall: true, name: 'settings:outils', again: () => openSettings('outils') });
    return;
  }

  if (section === 'cercles') {
    const unitSeg = el('div', { class: 'seg unit', role: 'group', 'aria-label': 'Autour de moi affiche les cercles en' },
      ['m', 'min'].map((u) => el('button', { type: 'button', 'aria-pressed': String((inMinutes() ? 'min' : 'm') === u), onclick: () => { state.ringUnit = u; persist(); openSettings('cercles'); toast(u === 'm' ? 'Cercles en mètres' : 'Cercles en minutes à pied'); } }, u === 'm' ? 'Mètres' : 'Minutes')));
    openSheet([ico('target'), ' Cercles'], el('div', { class: 'stack' },
      el('p', { class: 'ring-title' }, 'Autour de moi affiche les cercles en'), unitSeg,
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
      el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Partager l\'appli'), el('span', {}, '')),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn c-add', onclick: () => shareLink('Ma carte de Paris', 'Ma carte de Paris : une carte perso de Paris, à installer sur l\'écran d\'accueil depuis Chrome.', APP_URL()) }, ico('share-2'), 'Envoyer le lien'),
        el('button', { type: 'button', class: 'btn c-add', onclick: showAppQr }, ico('qr-code'), 'QR code')),
      el('p', { class: 'help' }, 'Ton proche reçoit une appli vide : tes lieux, tes réglages et ta clé CARTO restent sur ce téléphone. Pour lui donner tes lieux : Sauvegarde et partage → Exporter.'),
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
      el('p', { class: 'help' }, 'Tes lieux, tes photos et ta position restent sur ce téléphone. GitHub ne fait qu\'envoyer l\'appli : il ne reçoit ni ta position ni tes lieux. L\'appli ne contacte d\'autres services que pour ce que tu demandes : la carte (OpenStreetMap, qui voit le quartier affiché), les adresses (IGN), l\'annuaire et les horaires (OpenStreetMap), les fontaines et toilettes (Ville de Paris, sans ta position), les Curiosités et le quartier d\'« Où suis-je ? » (Wikipédia, position arrondie à 100 m), la liste des galeries d\'art (OpenStreetMap, tout Paris, sans ta position), la météo (Open-Meteo, position arrondie à 1 km) et Vélib\' (aucune position envoyée). Pour Mon Paris, la position de tes lieux sans code postal est envoyée une fois à l\'IGN pour trouver leur arrondissement. Comme tout site, ces services voient l\'adresse internet du téléphone.'),
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
    row('circle-help', 'Aide', 'Comment utiliser l\'appli, nouveautés, problèmes fréquents', openHelp),
    el('h3', { class: 'ring-title menu-group' }, 'Mes lieux'),
    row('map', 'Mon Paris', 'Arrondissements explorés, marche du jour', () => openMyParis('settings'), false, 'c-disc'),
    row('house', 'Mes stations', (state.myStations ?? []).length ? state.myStations.map((x) => `${x.label} : ${x.station}`).join(' · ') : 'Maison, Travail… pour rentrer en 1 appui', openMyStations, false, 'c-metro'),
    row('save', 'Sauvegarde et partage', saveSummary, () => openSettings('sauvegarde'), due, 'c-add'),
    row('tags', 'Catégories et listes', `${plural(state.categories.length, 'catégorie', 'catégories')} · ${plural((state.lists ?? []).length, 'liste', 'listes')}`, () => openSettings('categories'), false, 'c-add'),
    row(glyph(state.fav.icon, { filled: true }), 'Favoris', 'Icône et couleur', openFavStyle, false, 'c-fav'),
    el('h3', { class: 'ring-title menu-group' }, 'La carte'),
    row('target', 'Cercles', 'Tailles en mètres et en minutes', () => openSettings('cercles'), false, 'c-guide'),
    row('palette', 'Style de la carte', (STYLE_INFO[state.mapStyle] ?? STYLE_INFO.classic).name, () => openSettings('style'), false, 'c-guide'),
    el('button', { type: 'button', class: 'menu-row c-info', role: 'switch', 'aria-checked': String(isDark()), onclick: () => {
      state.theme = isDark() ? 'light' : 'dark'; persist(); applyTheme(); refresh(); openSettings();
      toast(isDark() ? 'Mode sombre activé' : 'Mode clair activé');
    } },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(isDark() ? 'moon' : 'sun')),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Mode sombre'), el('span', { class: 'menu-sub' }, state.theme === 'auto' || !state.theme ? 'Suit le réglage du téléphone' : 'Choisi par toi')),
    el('span', { class: `switch${isDark() ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
    voiceSwitch,
    el('h3', { class: 'ring-title menu-group' }, 'Ce qui s\'affiche'),
    row('list-filter', 'Barre du haut', (state.hiddenChips ?? []).length ? `${plural(state.hiddenChips.length, 'bouton masqué', 'boutons masqués')}` : 'Tous les boutons affichés', () => openChipsSettings(named('Réglages', () => openSettings())), false, 'c-guide'),
    row('arrow-up-down', 'Boutons de la carte', 'Ordre, côté, afficher ou cacher', () => openSettings('outils'), false, 'c-guide'),
    row('settings', 'Filtres affichés', (state.hiddenFilters ?? []).length ? `${plural(state.hiddenFilters.length, 'ligne masquée', 'lignes masquées')} dans Filtres` : 'Toutes les lignes de Filtres', () => openFilterChoice(named('Réglages', () => openSettings())), false, 'c-guide'),
    el('h3', { class: 'ring-title menu-group' }, 'Application'),
    row('info', 'Application', 'Mettre à jour · partager l\'appli · confidentialité', () => openSettings('appli')),
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
    foot(el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: () => {
        state = setFavStyle(state, { icon, color });
        persist(); refresh(); openSettings();
        toast('Favoris modifiés');
      } }, 'Enregistrer'))),
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

// Bouton ◎ : ma position et ma direction, qui restent jusqu'au prochain appui (voir startFollow).
let meShown = null; // { lat, lng } quand les cercles sont affichés

function drawMe() {
  meLayer.clearLayers();
  if (!meShown) return;
  const { lat, lng, acc } = meShown;
  if (acc > 30) L.circle([lat, lng], { radius: acc, stroke: false, fillColor: '#4c6ef5', fillOpacity: 0.12, interactive: false }).addTo(meLayer);
  meMarker(lat, lng).addTo(meLayer); // point + cône seulement : les cercles de temps sont dans Autour de moi
}

function locateOnMap() {
  if (!following) { startFollow(); return; }
  if (!trackFollow) {
    trackFollow = true;
    setLocateBtn();
    if (meShown) map.setView([meShown.lat, meShown.lng], Math.max(map.getZoom(), 16), { animate: false });
    toast('La carte te suit à nouveau. Rappuie pour arrêter.');
    return;
  }
  stopFollow();
  toast('Position et direction arrêtées');
}

/** Niveau « rue » utilisé par Ma position et direction (17 : environ 280 m de large sur un téléphone). */
const ZOOM_RUE = 17;

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

function renderMetroPlan(p, from, back, start = null) {
  const plan = metroPlan(stations, from, p, 3, start);
  const ln = lineName;
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
        ? step('Ⓜ', `Prends ${ln(plan.line)} jusqu'à ${plan.end.n}`)
        : step('Ⓜ', `Prends ${ln(plan.line1)} jusqu'à ${plan.via.n}, puis ${ln(plan.line2)} jusqu'à ${plan.end.n}`),
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
    back ? backBtn(back) : null,
  ), { name: `plan:${p.id}${start ? `:${start.n}` : ''}`, again: () => renderMetroPlan(p, from, back, start) });
  nearLayer.clearLayers();
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
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
  track('Métro le plus proche');
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
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
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
  track('Fontaine et toilettes');
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
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
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
// Appui long sur M : afficher ou cacher les lignes
document.getElementById('btnMetro').addEventListener('contextmenu', (e) => { e.preventDefault(); toggleLines(); });
drawLines();
document.getElementById('btnLocate').addEventListener('click', locateOnMap);
document.getElementById('btnVelib').addEventListener('click', () => showVelib());
document.getElementById('btnHome').addEventListener('click', goHome);

/* Ordre des boutons de la carte (réglable dans ⚙ → Boutons de la carte) */
const TOOL_INFO = {
  pratique: { el: 'btnPratique', icon: 'droplets', name: 'Fontaine et toilettes' },
  metro: { el: 'btnMetro', icon: 'Ⓜ', name: 'Métro le plus proche' },
  locate: { el: 'btnLocate', icon: 'locate-fixed', name: 'Ma position et direction' },
  paris: { el: 'btnParis', icon: 'Paris', name: 'Retour au centre de Paris' },
  velib: { el: 'btnVelib', icon: 'bike', name: 'Vélib\' le plus proche' },
  home: { el: 'btnHome', icon: 'house', name: 'Rentrer (mes stations)' },
  sorties: { el: 'btnSorties', icon: 'calendar-days', name: 'Sorties là où regarde la carte' },
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
// Sorties sans GPS : autour du centre de la carte, la carte ne bouge pas
document.getElementById('btnSorties').addEventListener('click', () => openEvents('map'));
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
    '{umbrella} Météo : sous la pluie, plus de « Parfait pour marcher » (ce conseil ne parlait que de l\'air) ; à la place, un bouton « Voir mes lieux abrités ». Filtres : le titre « Filtrer mes lieux » disparaît quand tous ses filtres sont masqués.',
    '{plus} Nouveau lieu : fiche plus courte (nom, catégorie, Enregistrer), le reste dans « Plus de détails ». La carte garde beaucoup plus de place. « Ajuster » place le point avec le viseur sur toute la carte, puis revient à la fiche sans rien perdre.',
    '{search} Chercher un nom ou une adresse dans l\'annuaire : seulement dans Paris et les départements voisins (Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne). Plus de résultats à Lyon ou à Orléans. L\'import de listes et le partage depuis une autre appli cherchent toujours partout.',
    '{calendar-days} Sorties du jour, nouvelle allure : la sortie en cours la plus proche en grande plaque, puis « En ce moment » et « Plus tard aujourd\'hui ». Chaque carte a une icône de genre (musique, spectacle, cinéma, balade, en famille…), le temps à pied, et ses boutons dedans. Un marché déjà fini n\'apparaît plus.',
    '{users} Lieux de tes proches : leur épingle porte l\'initiale de la personne (« M » pour Marie). Tu vois à qui est un lieu sans ouvrir sa fiche ni filtrer.',
    '{arrow-up-down} Pages longues : le bouton de retour (« ← Réglages », « ← Autour de moi »…) et « Enregistrer » restent en bas de l\'écran pendant que tu fais défiler. Plus besoin de descendre tout en bas. L\'Aide a maintenant son « ← Réglages ».',
    '{share-2} Partager l\'appli : {settings} Réglages → Application → « Envoyer le lien » (SMS, WhatsApp, mail…) ou « QR code » à faire scanner. Ton proche reçoit une appli vide : rien de tes lieux ne part.',
    '{users} « Lieux de (personnes) » devient « Lieux de mes proches » : dans Filtres, choisir d\'afficher tes lieux, ceux d\'un proche dont tu as importé l\'export, ou tous.',
    '{tags} Catégories et listes : afficher, masquer et ranger la barre du haut se fait sur une seule page, comme pour les boutons de la carte. Une case pour afficher, des flèches pour l\'ordre, un crayon pour modifier. Réglages → Ce qui s\'affiche → Barre du haut ouvre la même page.',
    '{calendar-days} Sorties : en bas, « Aide, sources et mise à jour » explique ce qui est affiché et quand tout se met à jour seul, avec « Mettre à jour maintenant » et 6 liens pour aller plus loin (Que faire à Paris, Paris Musées, galeries, Paris je t\'aime, Sortir à Paris).',
    '{calendar-days} Sorties sans ta position : nouveau bouton calendrier dans la colonne de la carte. Il montre les sorties autour du centre de la carte, sans GPS et sans bouger la carte : déplace la carte sur le quartier voulu, puis touche-le. Autour de moi → Sorties reste « autour de toi ». Dans l\'onglet Expos, « Expos de la semaine, tout Paris » : 7 jours, rangées par arrondissement.',
    '{lines} Lignes de métro et RER : nouveau bouton en haut, juste après « Dans la rue ». Un appui les montre ou les cache (l\'appui long sur M marche toujours). Pour le masquer : {settings} → Ce qui s\'affiche → Barre du haut.',
    'Rangement : {circle-help} l\'Aide passe en tête des {settings} Réglages (une catégorie de plus visible en haut). Nouvelle rubrique « Ce qui s\'affiche » : Barre du haut, Boutons de la carte et Filtres affichés au même endroit. Filtres en deux blocs : « Filtrer mes lieux » et « Ajouter sur la carte ». Chaque retour dit où il mène (← Autour de moi, ← Fiche…). Le bouton Favori de la fiche garde son nom, allumé = étoile pleine et contour épais. Sorties : sources et mise à jour repliées tout en bas. Les sous-titres ne sont plus coupés.',
    'Nouvelle police pour le texte : Inter, plus moderne et très lisible (titres et boutons gardent Archivo). Elle est dans l\'appli : rien n\'est demandé à un service.',
    '{star} Favoris et catégories : « Tout » enlève aussi le filtre des favoris, et n\'est plus allumé quand seuls les favoris sont affichés. Si une combinaison ne montre plus aucun lieu (ex. favoris + Boutiques), l\'appli le dit.',
    '{tent} « Dans la rue aujourd\'hui » passe en haut de l\'écran, juste après l\'étoile des favoris : c\'est un choix de ce que la carte montre. Un appui l\'allume ou l\'éteint ; pour le masquer : {settings} → Catégories et listes → Boutons de la barre du haut.',
    '{list} Listes : {settings} → Catégories et listes. « Nouvelle liste », et un appui sur une liste pour cocher d\'un coup tous ses lieux (avec recherche par nom).',
    'Tampon d\'état du jour, le même partout (tes listes, galeries) : OUVERT, FERME DANS 20 MIN, OUVRE À 14H ou FERMÉ AUJOURD\'HUI. Les jours de fermeture restent écrits à côté.',
    '{copy} Icône « copier » plus discrète : plus petite et sans cadre (toujours facile à toucher).',
    '{store} « Dans la rue aujourd\'hui » remplace « Marchés du jour » dans {list-filter} Filtres : en plus des marchés, la carte montre les brocantes, fêtes, expos en plein air et marchés éphémères du jour. Un appui ouvre leur fiche (boussole, métro, enregistrer).',
    '{circle-help} Aide mise à jour : chaque rubrique décrit maintenant Sorties (Tout, Gratuit, Expos), Mon billet, Copier, les filtres et boutons à masquer, le style Épuré et les couleurs de Mon Paris.',
    '{copy} Copier d\'un appui : l\'adresse d\'un lieu (dans sa fiche), et dans « Où suis-je ? » ton adresse et tes coordonnées GPS. Colle-les ensuite dans un taxi, un message ou une autre appli.',
    '{palette} Nouveau style de carte « Épuré », sans icônes de commerces (CARTO) : {settings} → La carte → Style. Il demande une clé gratuite à créer sur carto.com, que tu colles une fois ; elle reste sur ton téléphone.',
    '{list-filter} Filtres : en bas, « Choisir les filtres affichés » pour masquer les lignes dont tu ne te sers pas (Ouvert maintenant, Mieux notés, Lignes de métro, Marchés, Abrités, Listes, Personnes).',
    '{refresh-cw} Rappel : quand la liste des temps forts n\'a plus rien à venir, ou que celle des musées gratuits a plus d\'un an, Sorties l\'indique en haut. Une mise à jour est aussi préparée par Claude chaque début septembre.',
    '{list-filter} Barre du haut : {settings} → Ce qui s\'affiche → Barre du haut pour afficher ou masquer Tout, Filtres, Favoris et chaque catégorie.',
    '{calendar-days} Sorties : nouvel onglet « Expos » avec les expos qui ferment dans la semaine (« Dernière chance », aussi en tête de « Tout »), les galeries proches (ouvertes d\'abord, jours de fermeture) et le « Parcours galeries ».',
    '{landmark} Musées gratuits aujourd\'hui (Ville de Paris, 1er dimanche, Louvre le 1er vendredi soir) dans « Gratuit » et « Expos » ; les temps forts de la semaine (Nuit Blanche, Art Basel Paris…) en tête de Sorties.',
    '{ticket} Mon billet : dans la fiche d\'un lieu, ⋯ Plus → « Mon billet ». Le jour J, « Maintenant » te dit à quelle heure partir.',
    '{plus} Ajouter une expo à ta carte : le + à côté d\'une expo ou d\'une galerie en fait un de tes lieux, avec la date de fin dans la note.',
    '{clock} Horaires : « ferme dans 30 min » quand ça ferme bientôt, et les jours de fermeture (« Fermé le lundi ») dans la fiche.',
    'Ⓜ Métro calculé dans l\'appli aussi pour les expos, galeries, sorties, marchés et monuments. {locate} Où suis-je : le quartier en 3 lignes (Wikipédia).',
    '{map} Mes chiffres : « Remettre à zéro… » en bas, au choix la marche et l\'air ou les fonctions utilisées. Tes lieux et leurs « visité » ne bougent pas.',
    '{map} Mon Paris : couleurs plus franches. Air bon en bleu-vert, moyen en orange, médiocre en prune ; arrondissements sans lieu visité en pointillés.',
    '{navigation} Cône de direction plus net sur la carte, même en plein soleil : contour bleu franc avec un liseré, plus clair sur la carte Nuit.',
    '{compass} Arrivée à un de tes lieux (boussole ou balade guidée) : un bouton « Visité » le note en un appui. L\'appli ne coche plus rien toute seule, car passer à côté d\'un lieu ne veut pas dire l\'avoir visité.',
    '{map} Mon Paris et mes chiffres : marche par jour selon la qualité de l\'air, mes lieux, arrondissements explorés et fonctions les plus utilisées, sur 7 ou 30 jours. Tout reste sur ton téléphone.',
    '« Déjà visité » n\'est plus qu\'une information : tous tes lieux comptent dans Maintenant, Surprise, Itinéraire, les alertes à 100 m et les cercles. Tes favoris passent en premier : dans « Maintenant » et en tête de chaque cercle d\'Autour de moi, s\'ils sont à moins de 5 min de plus qu\'un autre lieu.',
    'Bleu modernisé : le bleu des transports est plus vif ; en mode sombre, les boutons principaux sont blanc cassé.',
    '« Maintenant » s\'adapte à l\'heure : le matin un café, une boulangerie ou un marché ; à midi et le soir un resto (ou un bar le soir). Le dimanche et les jours fériés, « Dim. » ou « Férié » apparaît à côté de la température ; « Ouvert maintenant » tient compte des jours fériés quand les horaires le précisent.',
    '{calendar-days} Sorties : bouton « Mettre à jour » en bas, pour redemander tout de suite les marchés et l\'agenda de la Ville.',
    'Avec les lignes affichées, chaque station montre le numéro de ses lignes quand tu zoomes sur un quartier, puis son nom en zoomant encore.',
    'Lignes de métro et RER sur la carte, dans leurs couleurs : appui long sur M, ou {list-filter} Filtres → Lignes de métro et RER.',
    '{house} Rentrer : les 3 stations de métro ou RER les plus proches de toi, avec le temps jusqu\'à chez toi depuis chacune ; la plus rapide est marquée.',
    'Boutons plus colorés : chaque bouton prend la teinte de sa famille. Le bouton « zoom sur ma position » disparaît : Ma position et direction fait déjà ce zoom.',
    'Sur la carte, « Maintenant » propose le lieu le plus proche et ouvert (15 min à pied au plus) ; × pour le cacher. {route} Itinéraire remplace Temps libre, Chemin et Parcours. Sorties : marchés, puces et brocantes, fêtes, et un filtre « Gratuit seulement ».',
    'Carte sans réseau : les quartiers déjà regardés restent visibles dans le métro (styles Classique, Pastel, Nuit).',
    '{locate-fixed} Ma position et direction : un appui, le cône reste et la carte te suit jusqu\'au prochain appui. {landmark} Monuments historiques dans Autour de moi, avec site officiel. Vélib\' réparé.',
    'Nouvelle charte « Plaques & pavés » : la couleur dit la famille (ardoise = y aller, bleu vif = transport, terre cuite = découvrir, vert = garder, or = favori), la forme dit l\'importance (plaque pleine = action principale).',
    'Fiche d\'un lieu plus courte : {check} Visité, Favori, {pencil} Modifier et {ellipsis} Plus sur une seule rangée. Réglages rangés en 3 groupes. Épingles en goutte qui pointent le lieu exact.',
    '{thermometer-sun} Température et qualité de l\'air en haut à gauche de la carte. {store} Marchés du jour : dans {list-filter} Filtres et dans Sorties.',
    '{navigation} Balade guidée : la boussole t\'emmène d\'étape en étape (Temps libre, Parcours, balade reçue).',
    '{calendar-days} Sorties du jour près de toi, {locate} Où suis-je ? et envoi de ta position, {house} Rentrer en 1 appui.',
    '{image} Ajouter un lieu depuis une photo, {qr-code} QR code d\'un lieu, lieux frais quand il fait chaud.',
    '{list-filter} Filtres en haut : ouvert maintenant, mieux notés, abrités, listes, personne.',
    '{hourglass} Temps libre, {shuffle} Surprise et {book-open-text} Curiosités dans Autour de moi.',
    '{bike} Vélib\' en temps réel, {map} Mon Paris, {share-2} partage d\'un lieu par lien, import Google Maps.',
    '{palette} 6 styles de carte, {moon} mode sombre, boutons de la carte à gauche ou à droite : dans {settings}.',
  ]],
  ['map', 'Les boutons de la carte', [
    'En haut : {search} chercher dans tes lieux (et dans l\'annuaire). Cette aide est en tête des {settings} Réglages.',
    'Sous la barre : la température et la qualité de l\'air du quartier. Touche-les pour le détail et un conseil.',
    'Puis « Tout », {list-filter} Filtres, {star} favoris, {tent} Dans la rue aujourd\'hui (marchés, brocantes, fêtes, expos en plein air : un appui les montre ou les cache), {lines} Lignes de métro et RER, et tes catégories. Fais glisser la barre pour toutes les voir. Pour en masquer : {settings} → Ce qui s\'affiche → Barre du haut.',
    'Catégories : touches-en une ou plusieurs ; touche-la encore pour la retirer, « Tout » pour tout revoir (catégories et favoris). Appui long : la modifier.',
    '{star} L\'étoile n\'affiche que tes favoris. Avec une catégorie, tu vois les favoris de cette catégorie seulement.',
    'À droite (ordre et boutons à cacher : {settings} → Ce qui s\'affiche → Boutons de la carte) :',
    '{droplets} la fontaine à boire, les toilettes et un lieu frais (ombre, musée, bibliothèque) les plus proches.',
    'M la station de métro la plus proche. Appui long sur M : afficher ou cacher les lignes de métro et RER ; en zoomant, chaque station montre le numéro de ses lignes, puis son nom (tracés 2022 : les prolongements 2024 des lignes 11 et 14 n\'y sont pas encore).',
    '{locate-fixed} le gros bouton du bas : ta position et ta direction (le cône bleu). Ils restent affichés et la carte te suit tant que tu ne rappuies pas. Écran allumé, vibration à 100 m d\'un de tes lieux.',
    'Si tu déplaces la carte au doigt, elle arrête de te suivre (bouton en pointillé) : un appui la recentre, un autre arrête tout.',
    'Caché au départ, à réafficher dans {settings} → Boutons de la carte : Paris (revenir au centre de Paris).',
    '{bike} les 3 stations Vélib\' les plus proches avec des vélos ou des places libres.',
    '{calendar-days} Sorties autour du centre de la carte, sans ta position : la carte ne bouge pas. Déplace d\'abord la carte sur le quartier qui t\'intéresse.',
    '{house} Rentrer : les 3 stations de métro ou RER les plus proches, et le temps jusqu\'à ta station Maison (ou Travail…) depuis chacune. Touche une station pour le trajet. Tes stations : {settings} → Mes stations.',
    'En bas : {settings} Réglages, + Ajouter, Autour de moi.',
    'Changer l\'allure de la carte : {settings} → {palette} Style de la carte (Classique, Épuré, Française, Douce, Pastel, Nuit). Épuré, sans icônes de commerces, demande une clé CARTO gratuite à coller une fois.',
    'Sans réseau (métro) : les quartiers que tu as déjà regardés restent affichés, en style Classique, Épuré, Pastel ou Nuit (environ 3 000 morceaux de carte gardés, les plus anciens s\'effacent).',
    'Fond sombre pour toute l\'appli : {settings} → {moon} Mode sombre. Boutons à gauche : {settings} → Boutons de la carte → À gauche.',
    'Tes réglages sont gardés à chaque changement. En bas des {settings} Réglages, « Enregistrer mes réglages par défaut » fixe ta configuration préférée ; « Revenir aux miens » la remet d\'un appui.',
  ]],
  ['list-filter', 'Filtres', [
    'Le bouton {list-filter}, juste après « Tout », ouvre deux blocs. « Filtrer mes lieux » : {clock} Ouvert maintenant, {star} Mes mieux notés (4 étoiles et plus), {umbrella} Abrités, tes {list} listes et, si tu as importé les lieux d\'un proche, « Lieux de mes proches » : de qui afficher les lieux. « Ajouter sur la carte » : {lines} Lignes de métro et RER, {tent} Dans la rue aujourd\'hui (ils ne cachent aucun de tes lieux).',
    'En bas de Filtres (ou {settings} → Ce qui s\'affiche → Filtres affichés), « Choisir les filtres affichés » masque les lignes dont tu ne te sers pas. Une ligne dont le filtre est actif reste visible pour pouvoir l\'éteindre.',
    'Le chiffre sur le bouton = nombre de filtres actifs. « Effacer les filtres » remet tout.',
    'Ils s\'appliquent à la carte, à la recherche, à Autour de moi et au Temps libre.',
    'Ouvert maintenant ne garde que les lieux dont on connaît les horaires.',
    '{tent} Dans la rue aujourd\'hui : sur la carte, les marchés du jour et ce que l\'agenda de la Ville annonce sur la voie publique (brocantes, fêtes, expos en plein air, marchés éphémères). « Dans la rue » est deviné d\'après le titre et le lieu : il peut y avoir des oublis.',
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
    '{landmark} Monuments : les monuments historiques protégés à moins de 1 km, avec leur site officiel (visites, billets), la fiche du ministère de la Culture et Wikipédia.',
    '{route} Itinéraire réunit quatre façons de tracer un trajet : « J\'ai du temps », « Sur mon chemin », « Relier des lieux » et « Parcours galeries ».',
    '{hourglass} J\'ai du temps (Temps libre) : choisis ton temps et le temps sur place ; l\'appli trace une boucle qui revient au départ, mieux notés en priorité, sans les lieux fermés à ton arrivée.',
    '{navigation} Balade guidée (Temps libre, Parcours) : la boussole te mène d\'étape en étape ; « Étape suivante » passe à la suite. À l\'arrivée à un de tes lieux, le bouton « Visité » le note en un appui.',
    '{footprints} Sur mon chemin : tes lieux sur ton trajet. {route} Relier des lieux : 2 à 4 lieux dans le meilleur ordre.',
    '{shuffle} Surprise : un de tes lieux au hasard, à moins de 15 min.',
    '{book-open-text} Curiosités : articles Wikipédia autour de toi ; + pour en faire un lieu.',
    'M Station : ce qu\'il y a autour d\'une station, sans GPS (pratique dans le métro).',
    '{cloud-rain} S\'il pleut, un bandeau propose de n\'afficher que tes lieux abrités.',
    '{calendar-days} Sorties : trois onglets. Tout et Gratuit commencent par la sortie en cours la plus proche (grande plaque), puis « Dernière chance », « En ce moment » et « Plus tard aujourd\'hui ». L\'icône dit le genre (musique, spectacle, cinéma, balade, en famille…) ; deviné d\'après l\'agenda, il peut se tromper, et un calendrier veut dire « genre pas sûr ». Expos : voir la rubrique « Expos et art ». Dans chaque carte : {compass} boussole, M métro, et + pour l\'ajouter à ta carte.',
    '{locate} Où suis-je ? : ton adresse et tes coordonnées GPS (à copier d\'un appui {copy}), l\'arrondissement, la station la plus proche, « Envoyer ma position » à quelqu\'un, et le quartier en 3 lignes (Wikipédia).',
    'La liste se met à jour toute seule quand tu as marché 50 m. Cercles en mètres ou en minutes : {settings} Réglages → Cercles.',
    '{thermometer-sun} S\'il fait chaud, un bandeau propose les lieux frais.',
    'En bas : {map} Mon Paris.',
  ]],
  ['compass', 'La fiche d\'un lieu', [
    'Touche un lieu sur la carte pour ouvrir sa fiche.',
    'La grande barre « Y aller » ouvre Google Maps et indique le temps à pied.',
    '{compass} Boussole : une flèche et une voix te guident ; à l\'arrivée, « Visité » en un appui. M Métro : la ligne et la correspondance, calculées dans l\'appli. {camera} Photo : l\'appareil photo direct.',
    'Horaires : « Ouvert · ferme à… », « ferme dans 30 min » quand ça ferme bientôt, et les jours de fermeture (« Fermé le lundi »). Dans les listes, un tampon dit l\'état du jour : Ouvert, Ferme dans 20 min, Ouvre à 14h ou Fermé aujourd\'hui.',
    '{copy} À côté de l\'adresse : la copier d\'un appui, pour la coller dans un taxi, un message ou une autre appli.',
    '{star} Étoiles : ta note de 1 à 5 ; touche la même étoile pour la retirer.',
    'En dessous, quatre cases : {check} Visité, Favori, {pencil} Modifier et {ellipsis} Plus (partager, QR code, {ticket} Mon billet, horaires, déplacer, supprimer, date d\'ajout).',
  ]],
  ['camera', 'Photos', [
    '{camera} Photo dans la fiche ouvre l\'appareil photo (6 photos par lieu).',
    'Touche la vignette à gauche de la fiche : voir les photos, en ajouter depuis la {image-plus} Galerie, ou {x} supprimer.',
    'Les photos restent sur ton téléphone, sans leur position GPS.',
  ]],
  ['tags', 'Catégories, listes et favoris', [
    '{settings} → Catégories et listes : toute la barre du haut sur une page. Case cochée = bouton affiché en haut (décoché : masqué, les lieux restent sur la carte). ↑ ↓ pour l\'ordre de tes catégories, {pencil} pour le nom, l\'icône et la couleur. Tout, Filtres, Favoris, Dans la rue et Lignes restent toujours en tête.',
    '« Icônes seules en haut » : la barre n\'affiche que les logos.',
    'Une {list} liste regroupe des lieux de catégories différentes (« Sous la pluie », « Avec Paul »). {settings} → Catégories et listes → « Nouvelle liste », puis coche ses lieux d\'un coup ; un appui sur une liste existante pour en ajouter ou en retirer. On peut aussi la choisir depuis Modifier, lieu par lieu.',
    'Favori : bouton dans la fiche ; {settings} → Favoris pour l\'icône et la couleur (un cœur évite la confusion avec les étoiles).',
  ]],
  ['palette', 'Expos et art', [
    '{calendar-days} Sorties → « Expos » : Dernière chance (expos de l\'agenda de la Ville qui ferment dans moins de 7 jours), galeries à moins de 1,5 km (OpenStreetMap, ouvertes d\'abord), autres expos du jour et musées gratuits aujourd\'hui.',
    '{calendar-days} « Expos de la semaine, tout Paris » (en bas de l\'onglet Expos) : toutes les expos de l\'agenda sur 7 jours, rangées par arrondissement, celles qui ferment le plus tôt d\'abord. Rien ne bouge sur la carte.',
    '{calendar-days} Pour regarder un autre quartier sans ta position : déplace la carte, puis le bouton calendrier de la colonne.',
    '{info} En bas de Sorties, « Aide, sources et mise à jour » : l\'agenda se recharge seul chaque jour, les marchés tous les 7 jours, les galeries tous les 30 jours. Liens utiles : Que faire à Paris, Paris Musées, galeries (L\'Officiel des spectacles), Paris je t\'aime, Sortir à Paris.',
    '{route} Parcours galeries : une boucle de 1 à 3 h par les galeries ouvertes à ton arrivée (Sorties ou Itinéraire).',
    '{plus} Le + à côté d\'une expo ou d\'une galerie l\'ajoute à ta carte, avec la date de fin de l\'expo dans la note.',
    '{sparkles} Temps forts (Nuit Blanche, Art Basel Paris…) : annoncés en haut de Sorties la semaine où ils ont lieu.',
    '{ticket} Mon billet : fiche → ⋯ Plus → Mon billet. Le jour J, « Maintenant » affiche l\'heure de départ (à pied ou en métro, 5 min de marge).',
    'Les listes de gratuités et de temps forts sont fixes : vérifiées le 16 novembre 2026, à vérifier sur le site du musée. Sorties te prévient quand elles sont à mettre à jour, et Claude en prépare une chaque début septembre.',
  ]],
  ['map', 'Mon Paris', [
    'Les 20 arrondissements se colorent selon les lieux « Déjà visité » : pointillés = aucun, vert de plus en plus foncé = 1, 2 à 4, 5 et plus. Chaque case : visités / enregistrés.',
    'Marche et air : air bon en bleu-vert, moyen en orange, médiocre en prune (de plus en plus foncé, lisible sans les couleurs). Touche une barre pour le détail du jour.',
    'Accès : en bas d\'Autour de moi, ou {settings} → Mon Paris. Ta marche du jour y est aussi.',
    'Tout en bas, « Remettre à zéro… » efface au choix la marche et l\'air ou les fonctions utilisées, après confirmation. Tes lieux ne changent pas.',
  ]],
  ['users', 'Partager avec un ami', [
    'L\'appli elle-même : {settings} → Application → « Envoyer le lien » ou « QR code ». Ton proche l\'installe depuis Chrome (menu ⋮ → Ajouter à l\'écran d\'accueil) ; elle arrive vide chez lui.',
    'Un lieu : ⋯ Plus → {share-2} Partager (lien) ou {qr-code} QR code à scanner. Ton ami l\'enregistre en un appui.',
    'Une balade : « Partager » dans Temps libre ou Parcours. Ton ami la reçoit avec la balade guidée.',
    'Te retrouver : Autour de moi → {locate} Où suis-je ? → Envoyer ma position. Ton ami a une boussole vers toi.',
    'Tous tes lieux : {settings} → Sauvegarde et partage, écris ton prénom, Exporter, envoie le fichier ; ton ami fait Importer.',
    'Ensuite, {list-filter} Filtres → « Lieux de mes proches » : les tiens, les siens ou tous.',
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
    'Ardoise : y aller et se guider · Bleu vif : métro, Vélib\', rentrer · Terre cuite : découvrir (sorties, curiosités, surprise, Mon Paris) · Vert Wallace : ajouter, garder · Or : favori, notes · Zinc : réglages, aide · Brique : supprimer.',
    'La forme dit l\'importance : plaque pleine = l\'action principale de l\'écran ; contour = action secondaire ; tuile ronde = outil ; tampon = état (ouvert, à faire).',
  ]],
  ['wrench', 'Ça ne marche pas ?', [
    'Position refusée : Chrome ⋮ → Paramètres → Paramètres des sites → Position → autorise limopo74.github.io, et allume la Position du téléphone.',
    'Carte grise : vérifie internet, puis {settings} → Application → Recharger la carte.',
    'Perdu sur la carte : {locate-fixed} pour revenir sur toi, ou le bouton Paris (à réafficher dans {settings} → Boutons de la carte).',
    'Carte Épuré avec un filigrane ou vide : la clé CARTO manque ou est fausse. {settings} → La carte → Style → Clé CARTO.',
    'Une nouveauté n\'apparaît pas : {settings} → Application → Mettre à jour l\'appli.',
    'La voix ne parle pas : monte le volume, et vérifie {settings} → Voix.',
    'Vélib\', Curiosités, galeries ou météo muets : ces services en ligne ne répondent peut-être pas ; réessaie plus tard.',
    'Copier ne marche pas : le téléphone affiche alors le texte dans une fenêtre, à sélectionner et copier à la main.',
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages')),
  ), { name: 'help', again: openHelp, tall: true });
}

/* ---------- Démarrage ---------- */

document.getElementById('btnAdd').addEventListener('click', openAddChoice);
document.getElementById('btnNear').addEventListener('click', openNear);
document.getElementById('btnSettings').addEventListener('click', openSettings);
document.getElementById('btnSearch').addEventListener('click', () => openSearch());
drawMarkets();
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
  toast('Appuie sur « + Ajouter », ou laisse le doigt appuyé sur la carte, pour enregistrer ton premier lieu. L\'aide est en tête des Réglages, en bas à gauche.');
}
if (!state.ok) toast('Le stockage de ce téléphone n\'est pas lisible : pense à exporter tes lieux.', true);

const launched = location.search.length > 1;
runLaunchAction();
if (!launched && state.ok && backupDue(state)) remindBackup();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // Demande au navigateur de ne pas effacer tes lieux et la carte gardée quand le téléphone manque de place
  navigator.storage?.persist?.().catch(() => {});
}

// « Maintenant » : la croix cache la suggestion ; si la position est déjà autorisée, on la lit
// discrètement au lancement (rien n'est envoyé), puis la suggestion est revue toutes les 5 minutes.
document.querySelector('#nowCard .now-close').addEventListener('click', () => { nowHidden = true; updateNow(true); });
setInterval(() => { updateNow(true); drawWx(); }, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveJournal(true); });
drawWx(); // le rappel dimanche / férié s'affiche même sans réseau (appelé ici, une fois tout déclaré)
// Liste des marchés (gardée une semaine sur le téléphone) : pour que « Maintenant » propose un marché le matin
loadMarkets().then(() => updateNow(true)).catch(() => {});
if (navigator.permissions && 'geolocation' in navigator) {
  navigator.permissions.query({ name: 'geolocation' }).then((perm) => {
    if (perm.state === 'granted') navigator.geolocation.getCurrentPosition((pos) => remember({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() }), () => {}, { enableHighAccuracy: false, maximumAge: 120000, timeout: 15000 });
  }).catch(() => {});
}
