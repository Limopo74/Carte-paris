// Interface de « Ma carte de Paris ».
import { svgIcon, glyphHTML, ICON_SVG } from './icons.js';
import { busHome, searchBusStops, busPlace, busLines } from './bus.js';
import { plaquesOf, plaquesNear, plaquesFor, plaqueStart } from './plaques.js';
const ICON_NAMES = new Set(Object.keys(ICON_SVG));
import { distanceM, walkMinutes, setWalkSpeed, normalizeRings, groupByRings, mapsUrl, reviewsUrl, uberUrl, minutesToMeters, normalizeMinuteRings } from './geo.js';
import { cleanMore, DEFAULT_MORE, cleanChips, cleanMoreChips, DEFAULT_MORE_CHIPS, cleanEssentials, cleanLayout, essentialLayout, cleanToolName, TOOL_NAME_MAX, PACES, paceKmh, cleanPace, TEXT_SIZES, cleanTextSize,
  KEY, PALETTE, ICONS, FAV_COLORS, newPoint, loadState, saveState, exportJSON, mergeImport,
  addCategory, updateCategory, deleteCategory, moveCategory, moveTool, normalizeTools, cleanHidden, addList, addMyStation, removeMyStation, setMyStationBus, saveMySettings, applyMySettings, sameAsMySettings, renameList, deleteList, setListMembers, setFavStyle, setDone, exportFileName, suggestedPresets, backupDue, trackChange, savedBackup,
  fileOwner, owners, exportForFriend, sendPoints, friendFileName, SEND_DEFAULT, mergeFriend,
} from './store.js';
import { timeAgo, formatDate, todoSummary, categoryCounts, nearestStation, nearestStations } from './stats.js';
import { searchAddress, reverseAddress, reverseInfo } from './adresse.js';
import { searchPlaces, viewBox } from './annuaire.js';
import { parseShared } from './share.js';
import { exportUrl, parseRecords, nearestOf, parseRatpToilets, parkFor, looksLikePark } from './pratique.js';
import { parseNavigo, navigoNear, navigoFor, navigoGenre, navigoGroup, navigoPass, NAVIGO_GROUPS, NAVIGO_SOURCE } from './navigo.js';
import { ROBOT_URL, ARR_FILE, BUS_FILE, PLAQUES_FILE, RESPIRE_FILE, VOIES_FILE, ARCH_FILE, ACCES_FILE, GARES_FILE, COVERED_SOURCE, TRANSPORT_FILES, COLORS_FILE, RATP_TOILETS_FILE, MERIMEE_FILES, TRAFFIC_URL, IDFM_SITE, frenchDate, FIXED_DATA, everyText, dataDue } from './donnees.js';
import { openState, minutesLeft, closedOnArrival, closedDaysText, opensThatDay } from './hours.js';
import { isExpo, lastChance, endText, weekExpos, weekText, parseGalleries, galleriesNear, freeToday, nextFreeFor, freeNear, freeDayNear, freeSoon, freeBanner, cleanArtists, artistEvents, artistKey, cleanArtist, artistWorks, knownArtists, linkFrom, cleanArtistLinks, cleanVenues, venueEvents, atVenue, favCategory, artistSuggest, artistSearchUrl, lateOn, lateTonight, lateHour, lateBefore, LATE_CHECKED, LAST_CHECKED, parseStreetArt, streetArtNear, textMatch, KIOSQUES, KIOSQUE_SOURCE, ART_PLACES, ART_PLACES_CHECKED, artPlacesWith, findArtPlaces, FREE_CHECKED, FREE_CHECKED_ON, FREE_SOURCE, highlightsSoon, highlightText, HIGHLIGHTS_CHECKED, listsStale, quarterSearchUrl, pickQuarter, extractUrl, readExtract, leaveAt, ticketToday, spotHours, spotRank } from './art.js';
import { holidayOn } from './holidays.js';
import { nightNote } from './soleil.js';
import { voieOrigin } from './voies.js';
import { cleanAcces, exitFor } from './acces.js';
import { cleanGares, gareLines, garesNear } from './gares.js';
import { cleanArch, archLine, sameAuthor, authorName } from './architectes.js';
import { RESPIRE_CHECKED, RESPIRE_PAGE, respireSectors, respireOn, respireNow, respireNextDay, respirePlanned } from './respire.js';
import { CIRCUIT_THEMES, CIRCUIT_DURATIONS, STOP_MIN, NEAR_TRACE_MIN, cleanCircuits, circuitTimes, minText, kmText, circuitsFor, pointsNearTrace, circuitOutingId, circuitDone, STEP_PROBLEMS, ROUTE_PROBLEMS, problemLabel, NOTE_TEXT_MAX, cleanCircuitNotes, cleanHiddenCircuits, circuitNoteId, notesOf, notesText } from './circuits.js';
import { groupPoints, groupCenter, groupLabel, GROUP_MAX_ZOOM } from './groupes.js';
import { ARCADE_LINE_ZOOM, ARCADE_NEAR_MIN, ARCADE_RAIN_MIN, ARCADE_TRACE_MIN, ARCADE_HOURS, cleanArcades, arcadesNear, arcadesNearTrace } from './passages.js';
import { TTB_SITE, TTB_KEY, TTB_RUBS, ttbIcon, TTB_DAYS, mhtmlHtml, mhtmlDate, ttbRawFromDoc, cleanAll, readTtb, ttbStore, ttbKicker, ttbPass, ttbToday, ttbCategory, TTB_MARKS_KEY, ttbKey, cleanTtbMarks, ttbMark, ttbExport, ttbMerge } from './ttb.js';
import { cleanJournal, addWalk, addUse, resetJournal, prune as pruneJournal, lastDays, totals, placesStats, arrProgress, WALK_M_PER_MIN } from './journal.js';
import { NOTE_MAX, cleanNotes, setNote, noteOf } from './notes.js';
import { metroPlan, lineName, linesOf } from './metroplan.js';
import { SEEN_CAT, seenName, withSeenCat, agoText, memoryHere, markShown, logName, cleanLog, addPassage, dropAutoPassage, photoIds, placeNear, journal as allPassages, memoryOf, cleanPassages, MOMENTS, cleanMoments, momentText, momentHere, didName, didLower, DID_DEFAULT, isStreetCat, streetCatId, withStreetCat, canVanish, lastSeen } from './passage.js';
import { PARTS, isPart, dayChoices, planAt, planText, planClock, planTimes, pastPlans, cleanPlans, planOfEvent, cleanOutings, outingOf, DAY_MAX, isDayList, dayTicket, dayList, staleDayList, rankDayList, moveInList } from './planning.js';
import { putPhoto, getPhoto, deletePhoto, compressImage, blobToDataUrl, dataUrlToBlob, MAX_PHOTOS, swipeStep, swipeIndex, photoCount } from './photos.js';
import { searchPoints, fold } from './search.js';
import { eventsUrl, weekEventsUrl, parseEvents, nearbyEvents, whenText, nextSlotText, streetKind, nowNearEvent, isFleaMarket, genreOf, startsLater, todayOnly, passWhere, siteName } from './events.js';
import { MARKETS_URL, parseMarkets, hoursToday, whenToday, marketsOn, nearestMarkets, airUrl, readAir, COVERED_MARKETS, COVERED_CHECKED, COVERED_CHECKED_ON, niceName } from './markets.js';
import qrcode from '../vendor/qrcode.mjs';
import { routeLink, readRouteLink, meetLink, readMeetLink, planLoopOpen, gpsFromJpeg } from './explore.js';
import { LAYER_ZOOM, VELIB_RECHECK_MS, inBox, hourText, velibOld, layerNote as layerNoteOf } from './calques.js';
import { placeLink, readPlaceLink, loopUrl, parseTakeout, findDuplicate, wikiUrl, parseWiki, wikiPage, arrFromText, arrFromCitycode, arrAt, arrSure, arrLabelPoint, arrGroups, arrTap, ARR_GRID, HIST_URL, parseHist, merimeeUrl, parseMerimee, merimeeLine, museumLine, VELIB_INFO, VELIB_STATUS, VELIB_PARIS, parseVelibParis, mergeVelib, nearestVelib, velibState, velibCount, meteoUrl, readMeteo, forecastUrl, readForecast, planWeather } from './explore.js';
import {
  bearing, relativeAngle, compassLabel, bestFix, onTheWay,
  orderRoute, routeLength, routeUrl, MAX_ROUTE, newlyNear, directionWord, spokenDistance, walkSegment, stepsFor, dayKey,
} from './move.js';

const L = window.L;
const VERSION = '18 novembre 2026 (206)';
const NET_TIMEOUT_MS = 10000;
const PARIS = [48.8566, 2.3522];
const FRESH_MS = 10 * 60 * 1000; // une position de moins de 10 min sert encore aux distances
const COLOR_NAMES = ['Rouge orangé', 'Bleu', 'Violet', 'Vert', 'Marron', 'Framboise', 'Turquoise', 'Gris'];
const FAV_COLOR_NAMES = ['Doré', ...COLOR_NAMES];

/* ---------- Stockage ---------- */

const failingStorage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
let storage;
try { storage = window.localStorage; storage.getItem('test'); } catch { storage = failingStorage; }

// L'appli installée s'ouvre en plein écran (« standalone ») : elle marque sa mémoire, partagée avec Chrome.
// Un navigateur sans cette marque (celui de Messages, Samsung Internet…) n'est donc pas « mon appli ».
const STANDALONE = (() => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } })();
const MY_APP_KEY = 'carte-paris.mon-appli';
if (STANDALONE) { try { storage.setItem(MY_APP_KEY, '1'); } catch { /* rien */ } }
let state = loadState(storage);
setWalkSpeed(paceKmh(state.pace)); // Mon pas : toutes les durées à pied de l'appli
/** Taille du texte (v144) : le CSS multiplie l'échelle selon :root[data-text]. */
function applyTextSize() { document.documentElement.dataset.text = cleanTextSize(state.textSize); }
applyTextSize();
/** Horaires de la Ville pour mes lieux qui sont des parcs sans horaires (id → horaires), recalculés quand la liste des parcs arrive. */
const parkHoursById = new Map();
/** Les horaires d'un lieu : les miens (ou ceux d'OpenStreetMap), sinon ceux de la Ville pour un parc. */
function hoursOf(p) { return p?.hours || parkHoursById.get(p?.id) || ''; }
if (!state.ok) {
  // Données illisibles : on en garde une copie avant de réécrire par-dessus.
  try {
    const raw = storage.getItem(KEY);
    if (raw) storage.setItem(`${KEY}.illisible-${Date.now()}`, raw);
  } catch { /* stockage indisponible */ }
}
try { navigator.storage?.persist?.(); } catch { /* facultatif */ }

function persist() {
  state.backup = trackChange(state); // tout changement de lieux, catégories ou listes compte pour la sauvegarde
  if (!saveState(storage, state)) {
    toast('Attention : ce téléphone n\'a pas pu enregistrer. Sauvegarde tes lieux : Réglages → Sauvegarde.', true);
    return false;
  }
  updatePlanningCount();
  updateSettingsDot();
  return true;
}
/** Pastille du bouton Réglages (v163) : la sauvegarde est due (5 changements, ou 3 jours après le premier). Partie dès qu'on sauvegarde. */
function updateSettingsDot() {
  const btn = document.getElementById('btnSettings');
  if (!btn) return;
  const due = state.ok !== false && backupDue(state);
  let dot = btn.querySelector('.set-dot');
  if (due && !dot) { dot = el('span', { class: 'set-dot', 'aria-hidden': 'true' }); btn.append(dot); }
  if (!due && dot) dot.remove();
  btn.setAttribute('aria-label', due ? 'Réglages, sauvegarde à faire' : 'Réglages');
}

/** Demande au navigateur de ne jamais effacer les données de l'appli quand le téléphone manque de place.
 * true : protégé ; false : refusé ou impossible ; null : on ne sait pas encore. */
let persisted = null;
let editMe = false; // Sauvegarde : afficher le champ prénom même s'il est déjà rempli
async function askPersist() {
  try {
    if (!navigator.storage?.persist) { persisted = false; return; }
    persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch { persisted = false; }
}

const catOf = (id) => state.categories.find((c) => c.id === id) ?? { id, name: '?', color: '#495057', icon: '📍' };

/* ---------- Stations de métro et RER ---------- */

/** Sorties du métro (data/acces.json, robot ; v199) : lues au démarrage, après les stations ; vides tant que le robot ne les a pas rangées. */
let accesData = null; let acces = [];
const loadAcces = async () => { accesData ??= await fetch('data/acces.json').then((r) => (r.ok ? r.json() : null)).catch(() => null); acces = cleanAcces(accesData); return acces; };
/** Gares de RER et arrêts de tram (data/gares.json, robot ; v200) : lus par Station et Rentrer. */
let garesData = null; let gares = [];
const loadGares = async () => { garesData ??= await fetch('data/gares.json').then((r) => (r.ok ? r.json() : null)).catch(() => null); gares = cleanGares(garesData); return gares; };
let stations = [];
let stationsSource = '';
let transportsUpdated = ''; // date des tracés et des stations gardés dans l'appli (AAAA-MM-JJ)
const stationsReady = fetch('data/stations.json')
  .then((r) => (r.ok ? r.json() : null))
  .then((j) => {
    if (!Array.isArray(j?.stations)) return;
    stations = j.stations.filter((x) => typeof x.n === 'string' && Number.isFinite(x.lat) && Number.isFinite(x.lng));
    stationsSource = typeof j.source === 'string' ? j.source : '';
    transportsUpdated = typeof j.updated === 'string' ? j.updated : '';
    if (view === 'near' && origin) renderNear();
  })
  .catch(() => { /* pas encore de données : la fonction reste discrète */ });

stationsReady.then(() => loadAcces()).catch(() => {});
/** Appel à un service en ligne, abandonné au bout de 10 s : avec un réseau faible (métro, quai), l'écran affiche
 * son message d'erreur au lieu de rester sur « Chargement… ». Les fichiers de l'appli passent par fetch() directement. */
function net(url, opts = {}) {
  return fetch(url, { ...opts, signal: opts.signal ?? AbortSignal.timeout(NET_TIMEOUT_MS) });
}

/** Dates des données figées dans l'appli (AAAA-MM-JJ). */
let ratpUpdated = '';
function dataDates() {
  return { lignes: transportsUpdated, navigo: navigoUpdated, ratp: ratpUpdated, ...(arrData ? { arrondissements: arrUpdated } : {}), ...(busData?.updated ? { bus: busData.updated } : {}), ...(plaquesData?.updated ? { plaques: plaquesData.updated } : {}), ...(respireData?.updated ? { respire: respireData.updated } : {}), ...(voiesData?.updated ? { voies: voiesData.updated } : {}), ...(archData?.updated ? { architectes: archData.updated } : {}), ...(accesData?.updated ? { acces: accesData.updated } : {}), ...(garesData?.updated ? { gares: garesData.updated } : {}), ...(streetArtUpdated ? { oeuvres: streetArtUpdated } : {}), ...(galleriesUpdated ? { galeries: galleriesUpdated } : {}), // arrondissements : seulement une fois le fichier lu
    merimee: merimeeInfo?.updated ?? '', marches: COVERED_CHECKED_ON, listes: FREE_CHECKED_ON };
}
/** Données figées à refaire : un seul message groupé à l'ouverture, au plus une fois par semaine (jamais de notification). */
function remindData() {
  const due = dataDue(dataDates());
  if (!due.length) return;
  let last = 0;
  try { last = Number(storage.getItem('carte-paris.rappel-transports')) || 0; } catch { /* rien */ }
  if (Date.now() - last < 7 * 864e5) return;
  try { storage.setItem('carte-paris.rappel-transports', String(Date.now())); } catch { /* rien */ }
  setTimeout(() => toast(`${due.length > 1 ? `${due.length} données de l'appli à mettre à jour` : `${FIXED_DATA.find((d) => d.id === due[0]).name} : à mettre à jour`}. Réglages → Appli → Données de l'appli.`), 2500);
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
function toast(msg, isError = false, action = null) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  // action { label, fn } : un bouton dans le message (le geste caché devient visible), message gardé 6 s
  for (const a of [action].flat().filter(Boolean)) t.append(' ', el('button', { type: 'button', class: 'toast-act', onclick: () => { t.hidden = true; a.fn(); } }, a.label)); // une ou plusieurs actions (v167)
  t.classList.toggle('error', isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, isError || action ? 6000 : msg.length > 50 ? 5000 : 3000); // un long message reste le temps d'être lu
}
const hideToast = () => { document.getElementById('toast').hidden = true; };

/* Retour visible : toujours « ← nom de l'écran d'avant », jamais un « Retour » sans destination. */
const named = (label, fn) => Object.assign(fn, { label });
const BACK_NAMES = new Map([[openEvents, 'Sorties'], [openMonuments, 'Monuments'], [openFreeTime, 'J\'ai du temps'], [openRoutes, 'Itinéraire'], [openCuriosities, 'Curiosités'], [openFilters, 'Filtres'], [openWeekExpos, 'Expos de la semaine'], [openArtPlaces, 'Grands lieux'], [openCircuits, 'Circuits']]);
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
  fr: { name: 'Française', sub: 'Noms en français, couleurs plus vives (OSM France). Pas de carte sans réseau', url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', attr: `${OSM_ATTR} — rendu <a href="https://www.openstreetmap.fr/">OSM France</a>`, maxZoom: 19 },
  hot: { name: 'Douce', sub: 'Couleurs pastel du rendu humanitaire (OSM France). Pas de carte sans réseau', url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', attr: `${OSM_ATTR} — tuiles <a href="https://www.hotosm.org/">HOT</a>, OSM France`, maxZoom: 19 },
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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark() ? '#14171D' : '#15181D');
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
  ), { tall: true, name: 'carto-key' });
}
applyMapStyle();

// Pastilles plus petites quand on voit une grande partie de Paris, pour éviter qu'elles se chevauchent.
const mapEl = document.getElementById('map');
const scalePins = () => {
  const z = map.getZoom();
  mapEl.classList.toggle('z-far', z < 15);
  mapEl.classList.toggle('z-11', z <= 11); // Paris tout petit : limites des arrondissements sans leurs numéros (v193)
  mapEl.classList.toggle('z-st', z >= 15); // stations des lignes
  mapEl.classList.toggle('z-name', z >= 16); // et leurs noms
};
map.on('zoomend', scalePins);
map.on('zoomend', () => { if (!(map.getZoom() > GROUP_MAX_ZOOM && drawnZoom > GROUP_MAX_ZOOM)) renderMarkers(); }); /* groupes (v178) */
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
// Contour de l'arrondissement choisi dans Filtres (v182) : seulement quand ce filtre est actif.
const arrLayer = L.layerGroup().addTo(map);

let filterCats = new Set(); // catégories choisies en haut ; vide = « Tout »
let favOnly = false;
let personFilter = 'all'; // 'all', '' (moi) ou le prénom d'une autre personne
// Filtres (bouton « Filtres » en haut) : ouvert maintenant, mieux notés, abrités, listes, personne
const filt = { open: false, top: false, covered: false, seen: false, lists: new Set(), arr: 0 }; // arr : numéro de l'arrondissement choisi (0 = tous), le temps de la session
const activeFilters = () => [filt.open, filt.top, filt.covered, filt.seen, filt.lists.size > 0, personFilter !== 'all', filt.arr > 0].filter(Boolean).length;
const passFilters = (p) => (!filt.open || openState(hoursOf(p))?.open === true) && (!filt.top || (p.stars ?? 0) >= 4)
  && (!filt.covered || p.covered) && (!filt.seen || p.cat === SEEN_CAT.id) && (!filt.lists.size || (p.lists ?? []).some((l) => filt.lists.has(l)))
  && (personFilter === 'all' || p.owner === personFilter) && (!filt.arr || arrOfPoint(p) === filt.arr);
const visible = () => state.points.filter((p) =>
  (!filterCats.size || filterCats.has(p.cat)) && (!favOnly || p.fav) && passFilters(p));
/** Ce que l'appli propose (Autour de moi, Surprise, balades, alertes…) : pas une œuvre « Disparue ou recouverte » (v161). Elle reste sur la carte et dans le journal. */
const offered = () => visible().filter((p) => !p.gone);

/** Initiale d'un proche pour son épingle : une seule lettre, jamais de texte saisi brut dans le HTML. */
const initialOf = (name) => (String(name).match(/\p{L}|\p{N}/u)?.[0] ?? '?').toLocaleUpperCase('fr');

// Zoom auquel les gouttes ont été dessinées : à la vue « rue », zoomer encore ne change rien aux groupes (v178).
let drawnZoom = null;
function renderMarkers() {
  pointsLayer.clearLayers();
  drawnZoom = map.getZoom();
  // De loin, les lieux proches deviennent une goutte encre chiffrée ; les favoris restent seuls (js/groupes.js, v178).
  // Le lieu qu'on déplace n'est pas dessiné : le viseur le remplace.
  const { single, groups } = groupPoints(visible(), (p) => map.project([p.lat, p.lng], drawnZoom), drawnZoom, moving?.id ?? null);
  for (const g of groups) {
    const { lat, lng } = groupCenter(g);
    const big = g.length >= 100 ? ' big' : '';
    L.marker([lat, lng], {
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pin pin-group${big}"><span class="pin-in">${g.length}</span></span>`, iconSize: [36, 36], iconAnchor: [18, 44] }),
      zIndexOffset: 300, alt: groupLabel(g.length), title: '',
    })
      .on('add', (e) => { const n = e.target.getElement(); if (n) { n.setAttribute('aria-label', groupLabel(g.length)); n.setAttribute('role', 'button'); } })
      .on('click', () => map.fitBounds(L.latLngBounds(g.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: GROUP_MAX_ZOOM + 1, paddingTopLeft: [10, 60], paddingBottomRight: [70, (sheet.hidden ? 0 : sheet.offsetHeight) + 10] }))
      .addTo(pointsLayer);
  }
  for (const p of single) {
    const c = catOf(p.cat);
    // Icônes et couleurs viennent de listes fixes : pas de texte saisi dans ce HTML.
    const ring = p.fav ? `box-shadow:0 0 0 3px ${state.fav.color},0 2px 6px rgba(0,0,0,.35);` : '';
    const soon = Number.isFinite(p.ticket?.at) && daysUntil(p.ticket.at) >= 0 && daysUntil(p.ticket.at) <= 7; // sortie dans les 7 jours : pastille agenda
    const seen = p.cat === SEEN_CAT.id && p.photos?.length && !p.gone; // Vu en passant (v157) ; disparue : une goutte grise
    const html = seen
      ? `<span class="seen-pin" style="border-color:${c.color}"><span class="seen-dot" style="background:${c.color}">${svgIcon('camera', { size: 12, stroke: 2.4 })}</span><img class="seen-img" alt="" data-photo="${p.photos[0]}"></span>`
      : `<span class="pin${p.gone ? ' gone' : ''}" style="background:${c.color};${ring}"><span class="pin-in">${glyphHTML(c.icon, { size: 17, filled: true, stroke: 2.2 })}</span>${p.fav ? `<span class="pin-fav" style="color:${state.fav.color}">${glyphHTML(state.fav.icon, { size: 11, filled: true, stroke: 2.4 })}</span>` : ''}${p.owner ? `<span class="pin-who" aria-hidden="true">${initialOf(p.owner)}</span>` : p.done && !p.gone ? `<span class="pin-done" aria-hidden="true">${svgIcon('check', { size: 11, stroke: 3 })}</span>` : ''}${soon ? `<span class="pin-plan" aria-hidden="true">${svgIcon('alarm-clock', { size: 11, stroke: 2.6 })}</span>` : ''}</span>`;
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'pin-wrap', html, iconSize: seen ? [44, 44] : [32, 32], iconAnchor: seen ? [22, 22] : [16, 39] }),
      zIndexOffset: p.fav ? 500 : 0,
      alt: p.name,
    })
      .on('add', (e) => { const n = e.target.getElement(); if (n && seen) seenThumb(n); if (n) { n.setAttribute('aria-label', `${p.name}, ${c.name}${p.gone ? (canVanish(p, state.categories) ? ', disparue ou recouverte' : ', fermé définitivement') : p.done ? `, ${didLower(c)}` : ''}${p.fav ? ', favori' : ''}${p.owner ? `, lieu de ${p.owner}` : ''}${soon ? `, sortie prévue ${planText(p.ticket)}` : ''}`); n.removeAttribute('alt'); } })
      .bindTooltip(el('span', {}, p.name), { direction: 'top', offset: [0, -16] }) // texte brut : un nom importé ne doit jamais devenir du HTML
      .on('click', () => { if (!moving) openDetail(p.id); })
      .addTo(pointsLayer);
  }
  // Une adresse TTB gardée dans mes lieux : seule ma goutte reste (v155). Au démarrage, le calque TTB n'existe pas encore.
  try { if (state.showTtb) drawTtb(); } catch { /* calque TTB pas encore créé : il sera dessiné au démarrage */ }
}

/* Miniatures des notes « Vu en passant » : 96 px, faites une fois par session, seulement quand la carte est assez zoomée. */
const thumbs = new Map(); // id de photo -> promesse de l'adresse locale de la miniature
function thumbUrl(id) {
  if (!thumbs.has(id)) thumbs.set(id, (async () => {
    const blob = await getPhoto(id).catch(() => null);
    if (!blob) return null;
    try {
      const bmp = await createImageBitmap(blob);
      const k = 96 / Math.min(bmp.width, bmp.height);
      const cv = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      bmp.close?.();
      const small = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.8));
      return small ? URL.createObjectURL(small) : null;
    } catch { return null; }
  })());
  return thumbs.get(id);
}
function seenThumb(node) {
  const img = node.querySelector('.seen-img');
  if (!img || img.src || !mapEl.classList.contains('z-name')) return;
  thumbUrl(img.dataset.photo).then((u) => { if (u) { img.src = u; img.closest('.seen-pin')?.classList.add('has-img'); } });
}
map.on('zoomend', () => { if (mapEl.classList.contains('z-name')) document.querySelectorAll('.seen-pin').forEach((n) => seenThumb(n.parentElement)); });

/* ---------- Mes passages (v157) : dans la fiche, une page pour noter ou corriger un passage, et le journal de tous ---------- */
const shortDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
/** Après un passage noté : si la note diffère de celle du lieu, le message propose de la reporter sur le lieu (rien d'automatique). */
function offerStars(p, stars, msg) {
  if (!stars || stars === (p.stars ?? 0)) { toast(msg); return; }
  toast(msg, false, { label: `Mettre ${stars} ★ au lieu`, fn: () => { p.stars = stars; persist(); renderMarkers(); toast(`Note du lieu : ${stars} étoile${stars > 1 ? 's' : ''}`); if (view?.startsWith?.('detail:')) openDetail(p.id); } });
}
/** Une ligne de passage : date, texte, miniature de la photo ; un appui l'ouvre pour la corriger. */
function passageRow(x, onclick, who = '') {
  const img = x.photo ? el('img', { class: 'passage-img', alt: '' }) : null;
  if (img) thumbUrl(x.photo).then((u) => { if (u) img.src = u; });
  return el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick },
    el('span', { class: 'plan-time passage-date' }, shortDate(x.at), x.stars ? el('span', { class: 'passage-stars', role: 'img', 'aria-label': `${x.stars} étoile${x.stars > 1 ? 's' : ''} sur 5` }, '★'.repeat(x.stars)) : null),
    el('span', { class: 'item-text' },
      who ? el('span', { class: 'item-name' }, who) : null,
      el('span', { class: who ? 'item-sub' : 'item-name' }, x.text || (x.photo ? 'Une photo' : 'Passé ici'))),
    img));
}
/** Rubrique de la fiche : son nom vient de la catégorie (« Mes repas »…), 3 passages puis « Tous ». Rien s'il n'y en a pas. */
function passageSection(p, back, all = false) {
  const list = cleanPassages(p.passages);
  if (!list.length) return [];
  const shown = all ? list : list.slice(0, 3);
  return [
    el('h3', { class: 'fiche-sec' }, logName(catOf(p.cat))),
    el('ul', { class: 'items' }, shown.map((x) => passageRow(x, () => openPassage(p, back, x.at)))),
    list.length > shown.length ? el('button', { type: 'button', class: 'ev-more', onclick: () => openPassages(p, back) }, `Tous (${list.length})`) : null,
  ];
}
function openPassages(p, back) {
  const again = () => openPassages(p, back);
  openSheet([ico('footprints'), ` ${logName(catOf(p.cat))} · ${p.name}`], el('div', { class: 'stack' },
    el('ul', { class: 'items' }, cleanPassages(p.passages).map((x) => passageRow(x, () => openPassage(p, named(logName(catOf(p.cat)), again), x.at)))),
    foot(backBtn(back)),
  ), { name: `passages:${p.id}`, again });
}
/** Noter (ou corriger, `at` donné) un passage : le jour en puces, une ligne, une photo facultative. Passer, c'est aussi « Déjà visité ». */
function openPassage(p, back, at = null) {
  const old = at != null ? cleanPassages(p.passages).find((x) => x.at === at) : null;
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(); const yday = new Date(Date.now() - 864e5);
  const oldIso = old ? iso(new Date(old.at)) : iso(today);
  let day = oldIso === iso(today) ? 'today' : oldIso === iso(yday) ? 'yday' : 'other';
  const date = el('input', { type: 'date', max: iso(today), value: oldIso });
  const dateField = el('label', { class: 'field' }, 'Date', date);
  const text = el('input', { type: 'text', maxlength: '200', autocomplete: 'off', value: old?.text ?? '', placeholder: 'Ex. : la glycine en fleur' });
  let photo = old?.photo ?? null; let newBlob = null;
  let stars = old?.stars ?? 0;
  const pick = starPicker(stars, (n) => { stars = n; });
  const preview = el('div', { class: 'stack' });
  const camera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  camera.addEventListener('change', async () => { const f = camera.files?.[0]; camera.value = ''; if (!f) return; try { newBlob = await compressImage(f); drawPhoto(); } catch { toast('Cette photo n\'a pas pu être lue.', true); } });
  const drawPhoto = () => {
    const img = el('img', { class: 'seen-preview', alt: 'Photo du passage' });
    if (newBlob) img.src = URL.createObjectURL(newBlob); else if (photo) photoUrl(photo).then((u) => { if (u) img.src = u; });
    fill(preview, newBlob || photo
      ? [img, el('button', { type: 'button', class: 'btn', onclick: () => { newBlob = null; photo = null; drawPhoto(); } }, ico('x'), 'Retirer la photo')]
      : [el('button', { type: 'button', class: 'btn c-add', onclick: () => camera.click() }, ico('camera'), 'Ajouter une photo')]);
  };
  drawPhoto();
  const segBtn = (label, key) => el('button', { type: 'button', 'aria-pressed': String(day === key), onclick: () => { day = key; drawDays(); } }, label);
  const daySeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Quel jour' });
  const drawDays = () => { fill(daySeg, segBtn('Aujourd\'hui', 'today'), segBtn('Hier', 'yday'), segBtn('Autre jour', 'other')); dateField.hidden = day !== 'other'; };
  drawDays();
  const done = () => openDetail(p.id, back);
  const save = async () => {
    const d = day === 'today' ? today : day === 'yday' ? yday : (() => { const [y, m, dd] = date.value.split('-').map(Number); return y ? new Date(y, m - 1, dd) : null; })();
    if (!d) { toast('Choisis la date.', true); return; }
    // l'heure : maintenant pour aujourd'hui, midi pour un autre jour (on ne garde que le jour)
    const when = day === 'today' ? Date.now() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime();
    let photoId = photo;
    if (newBlob) { photoId = newPhotoId(); try { await putPhoto(photoId, newBlob); } catch { toast('Photo non enregistrée : le téléphone manque peut-être de place.', true); return; } }
    if (old?.photo && old.photo !== photoId) deletePhoto(old.photo).catch(() => {});
    const rest = cleanPassages(p.passages).filter((x) => x !== old && x.at !== old?.at);
    p.passages = cleanPassages([...rest, { at: old && day !== 'today' && iso(new Date(old.at)) === iso(d) ? old.at : when, text: text.value, photo: photoId, stars: stars || undefined }]);
    if (!p.done) setDone(p, true, when); // passé ici : c'est aussi « Déjà visité »
    persist(); renderMarkers();
    done();
    offerStars(p, stars, old ? 'Passage corrigé' : `Noté dans « ${logName(catOf(p.cat))} »`);
  };
  const remove = () => {
    if (old.photo) deletePhoto(old.photo).catch(() => {});
    p.passages = cleanPassages(p.passages).filter((x) => x.at !== old.at);
    if (!p.passages.length) delete p.passages;
    persist(); toast('Passage supprimé'); done();
  };
  openSheet([ico('footprints'), old ? ' Cette impression' : ' Écrire une impression'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, p.name),
    el('div', { class: 'field' }, 'Quel jour ?', daySeg), dateField,
    el('label', { class: 'field' }, 'Ce que j\'ai vu (facultatif)', text),
    el('div', { class: 'field' }, 'Ma note (facultatif)', pick),
    preview, camera,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: done }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, ico('check'), 'Garder')),
    old ? el('button', { type: 'button', class: 'btn danger', onclick: remove }, 'Supprimer ce passage') : null,
    el('p', { class: 'help' }, `Tes passages restent sur ce téléphone et partent dans ta sauvegarde. Le nom « ${logName(catOf(p.cat))} » se change dans Réglages → Catégories et listes → la catégorie.`),
  ), { name: `passage:${p.id}:${at ?? 'new'}` });
}
/* ---------- Note du jour (v205) : une page de texte par jour, sans lieu ni position ; Mon journal la range à sa date ---------- */
const noteDayTitle = (day) => { const [y, m, d] = day.split('-').map(Number); const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: y === new Date().getFullYear() ? undefined : 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
/** Écrire ou compléter la note d'un jour (aujourd'hui par défaut). Enregistrer un texte vide l'efface. */
function openDayNote(back = null, day = dayKey()) {
  track('Note du jour');
  const old = noteOf(state.notes, day);
  const today = day === dayKey();
  const text = el('textarea', { rows: '7', maxlength: String(NOTE_MAX), placeholder: 'Ex. : la librairie dont on m\'a parlé, rue des Martyrs' });
  text.value = old?.text ?? '';
  const leave = () => (back ? back() : closeSheet());
  const save = () => {
    const had = !!old;
    state.notes = setNote(state.notes, day, text.value);
    persist();
    const now = noteOf(state.notes, day);
    leave();
    if (!now) { if (had) toast('Note effacée'); return; }
    toast(had ? 'Note enregistrée' : 'Note gardée dans Mon journal', false, back ? null : { label: 'Voir', fn: () => openJournal() });
  };
  openSheet([ico('notebook-pen'), ' Note du jour'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, noteDayTitle(day)),
    el('label', { class: 'field' }, old ? 'À noter (tu peux compléter)' : 'À noter', text),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: leave }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, ico('check'), 'Enregistrer')),
    today ? el('div', { class: 'menu' }, el('button', { type: 'button', class: 'menu-row c-add', onclick: () => openJournal(named('Note du jour', () => openDayNote(back))) },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('book-open-text')),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Mes notes des autres jours'), el('span', { class: 'menu-sub' }, 'Dans Mon journal, à leur date')),
      el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right')))) : null,
    el('p', { class: 'help' }, old && !today ? 'Pour l\'effacer : vide le texte, puis Enregistrer.' : 'Du texte seulement, sans position. Une page par jour : rouvre-la pour la compléter. Elle reste sur ce téléphone et part dans ta sauvegarde, jamais chez un proche.'),
  ), { name: `note:${day}`, again: () => openDayNote(back, day) });
}
/** Mon journal : tous mes passages, toutes adresses, par mois. */
/** Mon journal : mes passages et mon carnet de sorties de l'agenda (v158), du plus récent au plus ancien. */
const journalItems = () => [...allPassages(state.points), ...cleanOutings(state.outings).map((o) => ({ o, at: o.at, text: o.text || o.place || '', photo: o.photo, stars: o.stars })), ...cleanNotes(state.notes).map((n) => ({ n, at: n.at, text: n.text }))]
  .sort((a, b) => b.at - a.at);
function openJournal(back = named('Mon Paris', () => openMyParis())) {
  const again = () => openJournal(back);
  const all = journalItems();
  const groups = [];
  for (const x of all) {
    const m = new Date(x.at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (groups.at(-1)?.label !== m) groups.push({ label: m, items: [] });
    groups.at(-1).items.push(x);
  }
  openSheet([ico('book-open-text'), ' Mon journal'], el('div', { class: 'stack' },
    all.length ? null : el('p', { class: 'empty' }, 'Aucun passage noté.'),
    all.length ? null : el('p', { class: 'help' }, 'Dans la fiche d\'un lieu : « Écrire une impression ». Cocher « Déjà visité » note aussi le jour. Une sortie de l\'agenda prévue arrive ici quand tu réponds Oui à « Tu y es allé ? ». Une note sans lieu : ⋯ Plus → Note du jour.'),
    ...groups.flatMap((g) => [
      el('h3', { class: 'ring-title' }, el('span', {}, g.label.charAt(0).toUpperCase() + g.label.slice(1)), el('span', {}, String(g.items.length))),
      el('ul', { class: 'items' }, g.items.slice(0, 60).map((x) => (x.n ? passageRow(x, () => openDayNote(named('Mon journal', again), x.n.day), 'Note du jour') : x.o ? passageRow(x, () => openOuting(x.o.id, named('Mon journal', again)), x.o.name)
        : passageRow(x, () => openDetail(x.p.id, named('Mon journal', again)), x.p.name)))),
    ]),
    foot(backBtn(back)),
  ), { tall: true, name: 'journal', again });
}

/**
 * Une sortie de mon carnet (v158) : ce que j'en retiens, une note, une photo (le cartel d'une œuvre, par exemple).
 * Le carnet reste sur ce téléphone et part dans la sauvegarde ; rien n'est envoyé.
 */
function openOuting(id, back) {
  const o = cleanOutings(state.outings).find((x) => x.id === id);
  if (!o) { back(); return; }
  const text = el('input', { type: 'text', maxlength: '200', autocomplete: 'off', value: o.text ?? '', placeholder: 'Ex. : l\'autoportrait de la dernière salle' });
  let photo = o.photo ?? null; let newBlob = null;
  let stars = o.stars ?? 0;
  const pick = starPicker(stars, (n) => { stars = n; });
  const preview = el('div', { class: 'stack' });
  const camera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  camera.addEventListener('change', async () => { const f = camera.files?.[0]; camera.value = ''; if (!f) return; try { newBlob = await compressImage(f); drawPhoto(); } catch { toast('Cette photo n\'a pas pu être lue.', true); } });
  const drawPhoto = () => {
    const img = el('img', { class: 'seen-preview', alt: 'Photo de la sortie' });
    if (newBlob) img.src = URL.createObjectURL(newBlob); else if (photo) photoUrl(photo).then((u) => { if (u) img.src = u; });
    fill(preview, newBlob || photo
      ? [img, el('button', { type: 'button', class: 'btn', onclick: () => { newBlob = null; photo = null; drawPhoto(); } }, ico('x'), 'Retirer la photo')]
      : [el('button', { type: 'button', class: 'btn c-add', onclick: () => camera.click() }, ico('camera'), 'Ajouter une photo')]);
  };
  drawPhoto();
  const save = async () => {
    let photoId = photo;
    if (newBlob) { photoId = newPhotoId(); try { await putPhoto(photoId, newBlob); } catch { toast('Photo non enregistrée : le téléphone manque peut-être de place.', true); return; } }
    if (o.photo && o.photo !== photoId) deletePhoto(o.photo).catch(() => {});
    state.outings = cleanOutings(cleanOutings(state.outings).map((x) => (x.id === id ? { ...x, text: text.value, stars: stars || undefined, photo: photoId ?? undefined } : x)));
    persist(); toast('Noté dans Mon journal'); back();
  };
  const remove = () => {
    if (!confirm(`Retirer « ${o.name} » de Mon journal ?`)) return;
    if (o.photo) deletePhoto(o.photo).catch(() => {});
    state.outings = cleanOutings(state.outings).filter((x) => x.id !== id);
    persist(); toast('Sortie retirée de Mon journal'); back();
  };
  openSheet([ico('book-open-text'), ' Ma sortie'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, o.name),
    el('p', { class: 'help' }, [new Date(o.at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase()), o.place].filter(Boolean).join(' · ')),
    el('label', { class: 'field' }, 'Ce que je retiens (facultatif)', text),
    el('div', { class: 'field' }, 'Ma note (facultatif)', pick),
    preview, camera,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: back }, 'Annuler'),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, ico('check'), 'Garder')),
    o.url ? el('a', { class: 'btn c-disc', href: o.url, target: '_blank', rel: 'noopener noreferrer' }, ico('external-link'), 'Page de l\'agenda') : null,
    el('button', { type: 'button', class: 'btn danger', onclick: remove }, 'Retirer de Mon journal'),
    el('p', { class: 'help' }, 'Ton carnet reste sur ce téléphone et part dans ta sauvegarde.'),
  ), { name: `sortie-faite:${id}` });
}

/** Déjà visité, avec son passage daté (v157) : coché = un passage sans texte ce jour-là ; décoché = ce passage vide part. */
function markDone(p, done, at = Date.now()) {
  if (done && !p.done) p.passages = addPassage(p.passages, { at });
  if (!done && p.done) p.passages = dropAutoPassage(p.passages, Number.isFinite(p.visited) ? p.visited : at); // le passage du jour où je l'avais coché (v161)
  if (!p.passages?.length) delete p.passages;
  setDone(p, done, at);
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

/** Où va chaque bouton du haut : 'bar', 'more' (sous ⋯ Plus) ou 'hidden'. */
function chipPlace() {
  const hidden = new Set(cleanChips(state.hiddenChips));
  const more = new Set(cleanMoreChips(state.moreChips ?? [], [...hidden]));
  return (key) => (hidden.has(key) ? 'hidden' : more.has(key) ? 'more' : 'bar');
}
/** Les boutons du haut, dans l'ordre : { key, name, icon, active, make } (make : le bouton de la barre). */
function chipItems(chip = null, catChip = null) {
  const toggleStreet = () => {
    state.showMarkets = !state.showMarkets; persist(); drawMarkets(); refresh();
    toast(state.showMarkets ? 'Dans la rue aujourd\'hui : marchés, brocantes, fêtes et expos en plein air sur la carte' : 'Dans la rue aujourd\'hui : masqué');
  };
  const toggleVelib = () => { setVelibLayer(!velibOn); refresh(); toast(velibOn ? 'Vélib\' : les stations sur la carte (en zoomant)' : 'Vélib\' : masqué'); };
  const togglePrat = () => { setPratLayer(!state.showPratique); refresh(); toast(state.showPratique ? 'Fontaines et toilettes sur la carte (en zoomant)' : 'Fontaines et toilettes : masquées'); };
  const toggleArc = () => { setArcadeLayer(!state.showPassages); refresh(); toast(state.showPassages ? 'Passages couverts sur la carte (le trait en zoomant)' : 'Passages couverts : masqués'); };
  const fixed = [
    { key: 'all', name: 'Tout', icon: ico('list'), active: false, act: () => { filterCats.clear(); favOnly = false; refresh(); },
      make: () => chip('Tout', !filterCats.size && !favOnly, () => { filterCats.clear(); favOnly = false; refresh(); }) },
    { key: 'filters', name: 'Filtres', icon: ico('list-filter'), active: activeFilters() > 0, act: openFilters,
      make: () => chip([ico('list-filter'), activeFilters() ? ` ${activeFilters()}` : ''], activeFilters() > 0, openFilters, { class: 'filters', aria: activeFilters() ? `Filtres : ${activeFilters()} actifs` : 'Filtres' }) },
    { key: 'fav', name: 'Favoris', icon: glyph(state.fav.icon, { filled: true }), active: favOnly, act: () => { favOnly = !favOnly; refresh(); emptyHint(); },
      make: () => chip(glyph(state.fav.icon, { filled: true, size: 20 }), favOnly, () => { favOnly = !favOnly; refresh(); emptyHint(); }, { class: 'star', aria: 'Seulement les favoris' }) },
    { key: 'street', name: 'Dans la rue aujourd\'hui', icon: ico('tent'), active: Boolean(state.showMarkets), act: toggleStreet,
      make: () => chip(ico('tent'), Boolean(state.showMarkets), toggleStreet, { class: 'street', aria: 'Dans la rue aujourd\'hui : marchés, brocantes, fêtes, expos en plein air' }) },
    { key: 'ttb', name: 'TTB', icon: ttbDotFor(''), active: Boolean(state.showTtb), act: toggleTtb,
      make: () => {
        const b = chip(ttbDot(), Boolean(state.showTtb), toggleTtb, { class: 'ttb-chip icon-only', aria: 'TTB : adresses du guide (appui long : la liste)' });
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); openTtbList(); }); // appui long : la liste
        return b;
      } },
    { key: 'lines', name: 'Lignes de métro et RER', icon: ico('lines'), active: Boolean(state.showLines), act: toggleLines,
      make: () => chip(ico('lines'), Boolean(state.showLines), toggleLines, { class: 'lines', aria: 'Lignes de métro et RER' }) },
    { key: 'velib', name: 'Vélib\'', icon: ico('bike'), active: velibOn, act: toggleVelib,
      make: () => chip(ico('bike'), velibOn, toggleVelib, { class: 'velib', aria: 'Vélib\' : les stations sur la carte' }) },
    { key: 'pratique', name: 'Fontaines et toilettes', icon: ico('droplets'), active: Boolean(state.showPratique), act: togglePrat,
      make: () => chip(ico('droplets'), Boolean(state.showPratique), togglePrat, { class: 'pratique', aria: 'Fontaines et toilettes sur la carte' }) },
    { key: 'passages', name: 'Passages couverts', icon: ico('door-open'), active: Boolean(state.showPassages), act: toggleArc,
      make: () => chip(ico('door-open'), Boolean(state.showPassages), toggleArc, { class: 'pratique', aria: 'Passages couverts sur la carte' }) },
  ];
  return [...fixed, ...state.categories.map((c) => ({ key: `cat:${c.id}`, name: c.name, icon: catDot(c.id), cat: c.id, active: filterCats.has(c.id), act: () => toggleCat(c.id), make: () => catChip(c) }))];
}

/** ⋯ Plus de la barre du haut (v151) : les boutons qu'on y a rangés, chacun s'allume ou s'éteint d'un appui. */
function openChipsMore() {
  const where = chipPlace();
  const list = chipItems().filter((x) => where(x.key) === 'more');
  const sub = (x) => (x.cat ? plural(categoryCounts(state.points, x.cat).total, 'lieu', 'lieux')
    : { all: 'Toutes les catégories', filters: 'Ouvre les filtres', fav: 'Seulement les favoris', street: 'Marchés, brocantes, fêtes', ttb: 'Les adresses du guide', lines: 'Les tracés du métro et du RER', velib: 'Les stations, en zoomant', pratique: 'Celles de la zone, en zoomant', passages: 'Les 12 passages, le trait en zoomant' }[x.key] ?? '');
  openSheet([ico('ellipsis'), ' Plus'], el('div', { class: 'menu' },
    el('p', { class: 'help' }, 'Touche pour allumer ou éteindre. Un bouton allumé apparaît aussi dans la barre, le temps de l\'éteindre.'),
    list.map((x) => {
      const opens = x.key === 'filters' || x.key === 'all';
      return el('button', { type: 'button', class: 'menu-row c-guide', ...(opens ? {} : { role: 'switch', 'aria-checked': String(x.active) }), onclick: () => {
        x.act();
        if (!opens) openChipsMore();
      } },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, x.icon),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, x.name), el('span', { class: 'menu-sub' }, sub(x))),
      opens ? el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›') : el('span', { class: `switch${x.active ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));
    }),
    el('button', { type: 'button', class: 'btn c-info', style: 'margin-top:8px', onclick: () => openSettings('categories') }, ico('settings'), 'Choisir ce qui va dans Plus'),
  ), { name: 'chips-more', again: openChipsMore, tall: true });
}

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
  // Chaque bouton : dans la barre, sous ⋯ Plus, ou caché (Réglages → Catégories et listes). Un bouton actif reste visible
  // dans la barre, même rangé ou caché, pour pouvoir l'enlever (v151).
  const items = chipItems(chip, catChip);
  const where = chipPlace();
  const bar = items.filter((x) => where(x.key) === 'bar');
  const kept = items.filter((x) => where(x.key) !== 'bar' && x.active);
  const inMore = items.filter((x) => where(x.key) === 'more').length;
  fill(box, ...[...bar, ...kept].map((x) => x.make()),
    inMore ? chip(ico('ellipsis'), false, openChipsMore, { class: 'more-chip icon-only', aria: `Plus : ${plural(inMore, 'autre bouton', 'autres boutons')}` }) : null);
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
  if (filt.arr) { filt.arr = 0; refresh(); } /* v202 : l'arrondissement ne dure que le temps de sa liste */
  const count = (fn) => state.points.filter(fn).length;
  const sw = (on, icon, title, sub, toggle) => el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(on), onclick: () => { if (toggle() === 'stop') return; refresh(); openFilters(); } },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, typeof icon === 'string' ? ico(icon) : icon),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)),
    el('span', { class: `switch${on ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));
  const withHours = count((p) => openState(hoursOf(p)) != null);
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
      !keep('open', filt.open) ? null : sw(filt.open, 'clock', 'Ouvert maintenant', withHours ? `${plural(count((p) => openState(hoursOf(p))?.open === true), 'ouvert', 'ouverts')} sur ${withHours} avec horaires` : 'Aucun lieu n\'a encore d\'horaires', () => { filt.open = !filt.open; }),
      !keep('top', filt.top) ? null : sw(filt.top, 'star', 'Mes mieux notés', `4 étoiles et plus · ${plural(count((p) => (p.stars ?? 0) >= 4), 'lieu', 'lieux')}`, () => { filt.top = !filt.top; }),
      !keep('covered', filt.covered) ? null : sw(filt.covered, 'umbrella', 'Abrités (pluie)', plural(count((p) => p.covered), 'lieu coché « abrité »', 'lieux cochés « abrité »'), () => { filt.covered = !filt.covered; }),
      !keep('seen', filt.seen) ? null : sw(filt.seen, 'camera', 'Vu en passant', `Tes photos prises en marchant · ${plural(count((p) => p.cat === SEEN_CAT.id), 'note', 'notes')}`, () => { filt.seen = !filt.seen; }),
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
      !keep('arr', false) ? null : el('h3', { class: 'ring-title', style: 'margin-top:10px' }, el('span', {}, 'Arrondissement'), el('span', {}, '')),
      !keep('arr', false) ? null : arrPicker(),
      !keep('arr', false) || !arrData ? null : el('p', { class: 'help' }, 'Le chiffre : tes lieux dans cet arrondissement. Touche une case pour voir leur liste.'),
      activeFilters() ? el('button', { type: 'button', class: 'btn', style: 'margin-top:8px', onclick: () => {
        filt.open = false; filt.top = false; filt.covered = false; filt.seen = false; filt.lists.clear(); personFilter = 'all'; refresh(); openFilters(); toast('Filtres effacés');
      } }, ico('x'), 'Effacer les filtres') : null,
    ]),
    keep('lines', state.showLines) || keep('markets', state.showMarkets) || keep('ttb', state.showTtb) || keep('velib', velibOn) || keep('pratique', state.showPratique) || keep('passages', state.showPassages) ? el('h3', { class: 'ring-title menu-group' }, 'Afficher aussi sur la carte') : null,
    !keep('lines', state.showLines) ? null : sw(Boolean(state.showLines), 'lines', 'Lignes de métro et RER', 'Les tracés dans leurs couleurs (raccourci : appui long sur M)', () => { state.showLines = !state.showLines; persist(); drawLines(); }),
    !keep('markets', state.showMarkets) ? null : sw(Boolean(state.showMarkets), 'tent', 'Dans la rue aujourd\'hui', 'Marchés, brocantes, fêtes, expos en plein air, marchés éphémères', () => { state.showMarkets = !state.showMarkets; persist(); drawMarkets(); }),
    !keep('ttb', state.showTtb) ? null : sw(Boolean(state.showTtb), ttbDotFor(''), 'TTB', ttbList().length ? `${plural(ttbList().length, 'adresse', 'adresses')} du guide` : 'Importer d\'abord la liste (Réglages)', () => { if (!ttbList().length) { openTtb(); return 'stop'; } state.showTtb = !state.showTtb; persist(); drawTtb(); }),
    !keep('velib', velibOn) ? null : sw(velibOn, 'bike', 'Vélib\'', 'Les stations visibles en zoomant, avec leurs vélos (ou leurs places). S\'éteint quand tu fermes l\'appli', () => { setVelibLayer(!velibOn); }),
    !keep('pratique', state.showPratique) ? null : sw(Boolean(state.showPratique), 'droplets', 'Fontaines et toilettes', 'Celles de la zone, visibles en zoomant', () => { setPratLayer(!state.showPratique); }),
    !keep('passages', state.showPassages) ? null : sw(Boolean(state.showPassages), 'door-open', 'Passages couverts', 'Les 12 passages de Paris, avec leur trait en zoomant', () => { setArcadeLayer(!state.showPassages); }),
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
  const rows = [['open', 'clock', 'Ouvert maintenant'], ['top', 'star', 'Mes mieux notés'], ['covered', 'umbrella', 'Abrités (pluie)'], ['seen', 'camera', 'Vu en passant'], ['lists', 'list', 'Mes listes'], ['people', 'users', 'Lieux de mes proches'], ['arr', 'map', 'Arrondissement'], ['lines', 'lines', 'Lignes de métro et RER'], ['markets', 'tent', 'Dans la rue aujourd\'hui'], ['ttb', 'ttb', 'TTB'], ['velib', 'bike', 'Vélib\''], ['pratique', 'droplets', 'Fontaines et toilettes'], ['passages', 'door-open', 'Passages couverts']];
  openSheet([ico('settings'), ' Filtres affichés'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Allumé : la ligne est dans Filtres. Masquer une ligne ne supprime rien, et une ligne dont le filtre est actif reste visible pour pouvoir l\'éteindre.'),
    el('div', { class: 'menu' }, rows.map(([key, icon, title]) => {
      const on = !hid.has(key);
      return el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(on), onclick: () => {
        if (on) hid.add(key); else hid.delete(key);
        state.hiddenFilters = [...hid]; persist(); openFilterChoice(back);
      } },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, key === 'ttb' ? ttbDotFor('') : ico(icon)),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title)),
      el('span', { class: `switch${on ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));
    })),
    hid.size ? el('button', { type: 'button', class: 'btn c-guide', onclick: () => { state.hiddenFilters = []; persist(); openFilterChoice(back); } }, 'Tout réafficher') : null,
    foot(backBtn(back)),
  ), { tall: true, name: 'filter-choice', again: () => openFilterChoice(back) });
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
  drawArrOutline();
  updateNow(true);
  if (view === 'near' && origin) renderNear();
  if (view === 'arrlist' && filt.arr) { const mini = sheet.classList.contains('mini'); openArrList(filt.arr); if (mini) setSheetMini(true); } /* v202 : réduite, elle le reste */
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
let shownKey = null; // nom de l'écran affiché dans la feuille

let sheetOpener = null; // bouton qui a ouvert la feuille : il retrouve le focus à la fermeture
function openSheet(title, body, { onClose = null, tall = false, name = null, again = null } = {}) {
  if (moving && name !== 'move') stopMove();
  setSheetMini(false); // un nouvel écran (ou le même redessiné) s'ouvre toujours en grand
  const focusOutside = !sheet.contains(document.activeElement);
  if (sheet.hidden && focusOutside && document.activeElement !== document.body) sheetOpener = document.activeElement;
  const prevClose = onSheetClose;
  if (prevClose && name !== view) { onSheetClose = null; prevClose(); }
  const key = name ?? `anon-${navStack.length}`;
  // Hauteur de lecture (v150) : l'écran qu'on quitte la garde ; en revenant (← Réglages…) ou en le redessinant (un interrupteur),
  // on retrouve la même hauteur au lieu de remonter en haut. Un nouvel écran s'ouvre en haut.
  const cur = navStack.find((e) => e.name === shownKey); // l'écran affiché (déjà retiré de la pile par le bouton retour du téléphone : rien à garder)
  if (cur && !sheet.hidden) {
    const max = sheetBody.scrollHeight - sheetBody.clientHeight;
    cur.scroll = cur.want && max < cur.want ? cur.want : sheetBody.scrollTop; // écran encore en chargement (trop court) : on garde la hauteur voulue
  }
  const at = navStack.findIndex((e) => e.name === key);
  const scroll = at >= 0 ? (navStack[at].scroll ?? 0) : 0;
  if (at >= 0) navStack = navStack.slice(0, at); // on revient à un écran déjà ouvert : on oublie ceux d'après
  navStack.push({ name: key, again, want: scroll });
  shownKey = key;
  if (name !== 'near') stopQuietNear(); // la position n'est suivie que sur l'écran Autour de moi
  view = name;
  fill(sheetTitle, ...[title].flat().filter(Boolean));
  fill(sheetBody, ...[body].flat().filter(Boolean));
  sheet.classList.toggle('tall', tall);
  sheet.hidden = false;
  sheetBody.scrollTop = scroll;
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
  if (filt.arr) { filt.arr = 0; refresh(); } /* v202 : la croix (ou le retour du téléphone) enlève l'arrondissement choisi */
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
    history.pushState({ sheet: true }, '');
    navStack.at(-1).again(); // il reste dans la pile : openSheet y retrouve sa hauteur de lecture
  } else {
    historyPushed = false;
    closeSheet(true);
  }
});
document.getElementById('sheetClose').addEventListener('click', () => closeSheet());

/* Réduire la feuille pour voir la carte (v166) : un bouton à côté de la croix, et la barre du titre qui se fait glisser.
   Réduite, seule la barre du titre reste ; la carte se voit et se déplace. Agrandie, la liste revient à la même hauteur. */
const sheetMin = el('button', { type: 'button', id: 'sheetMin', class: 'icon-btn', 'aria-label': 'Réduire pour voir la carte', 'aria-expanded': 'true', onclick: () => setSheetMini(!sheet.classList.contains('mini')) }, ico('chevron-down'));
document.getElementById('sheetClose').before(sheetMin);
let miniScroll = 0;
function setSheetMini(on) {
  if (on === sheet.classList.contains('mini')) return;
  if (on) miniScroll = sheetBody.scrollTop;
  sheet.classList.toggle('mini', on);
  fill(sheetMin, ico(on ? 'chevron-up' : 'chevron-down'));
  sheetMin.setAttribute('aria-label', on ? 'Agrandir la fenêtre' : 'Réduire pour voir la carte');
  sheetMin.setAttribute('aria-expanded', String(!on));
  if (!on) sheetBody.scrollTop = miniScroll;
}
{ // glisser la barre du titre : vers le bas, la feuille se réduit ; vers le haut, elle s'agrandit
  const head = sheet.querySelector('.sheet-head');
  let drag = null;
  head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = { y: e.clientY }; head.setPointerCapture?.(e.pointerId); });
  head.addEventListener('pointermove', (e) => { if (!drag) return; const dy = e.clientY - drag.y; sheet.style.transform = !sheet.classList.contains('mini') && dy > 0 ? `translateY(${dy}px)` : ''; });
  const end = (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y;
    drag = null; sheet.style.transform = '';
    if (dy > 50) setSheetMini(true); else if (dy < -30) setSheetMini(false);
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', () => { drag = null; sheet.style.transform = ''; });
}

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
const FREE_SEEN_KEY = 'carte-paris.gratuit-vu'; // jour où « Gratuit … » a été caché par la croix (sur le téléphone, hors sauvegarde)
const SEEN_SHOWN_KEY = 'carte-paris.deja-vu'; // { id: date du premier rappel } : reste sur le téléphone, hors sauvegarde
let seenShown = (() => { try { return JSON.parse(storage.getItem(SEEN_SHOWN_KEY) ?? '{}') ?? {}; } catch { return {}; } })();
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
  try { drawWx(); } catch { /* pastille pas encore prête au démarrage */ }
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

/** À quelle heure partir pour un billet : à pied, ou en métro si c'est à plus de 25 min (calcul sur le téléphone). */
function departureFor(p, pos) {
  if (!pos) return { leave: null, travel: null, how: '' };
  let travel = walkMinutes(distanceM(pos, p)); let how = 'à pied';
  if (travel > 25 && stations.length) { const plan = metroPlan(stations, pos, p, 3); if (plan.type !== 'walk') { travel = plan.minutes; how = 'en métro'; } }
  return { leave: leaveAt(p.ticket.at, travel), travel, how };
}

/* Vibrer quand « Maintenant » a du nouveau (v189, réglage éteint au départ) : une courte vibration, une seule fois
   par suggestion et par ouverture de l'appli. Seulement pour : Pars maintenant, Tu es déjà passé ici, C'est le moment,
   Dans la rue, Gratuit à 5 min. Rien quand l'écran est éteint (le téléphone ne le permet pas) : jamais un réveil. */
const buzzed = new Set();
function buzzNow(key) {
  if (state.vibrateNow !== true || buzzed.has(key)) return;
  buzzed.add(key);
  try { navigator.vibrate?.([120, 80, 120]); } catch { /* pas de vibreur */ }
}

/* « Maintenant » : sur la carte, le lieu le plus proche et ouvert (15 min à pied au plus).
   Calculé sur le téléphone ; un appui ouvre sa fiche, la croix le cache jusqu'à la prochaine ouverture. */
function updateNow(force = false) {
  const card = document.getElementById('nowCard');
  if (!card) return;
  if (!force && Date.now() - nowLast < 20000) return;
  nowLast = Date.now();
  const pos = freshHere();
  card.dataset.kind = '';
  // La sortie prévue du jour passe avant tout : à quelle heure partir (à pied, ou en métro si c'est loin ; pas d'heure pour un moment)
  const tk = nowHidden ? null : ticketToday([...state.points, ...(state.plans ?? [])]);
  if (tk) {
    const at = tk.ticket.at;
    // Un moment de la journée (matin, soir…) n'a pas d'heure : pas de « Pars à », qui serait faux.
    const { leave, travel, how } = isPart(tk.ticket.part) ? {} : departureFor(tk, pos);
    card.hidden = false;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, isPart(tk.ticket.part) ? `Prévu ${planText(tk.ticket)}` : `Prévu · ${hmText(new Date(at))}`),
      el('span', { class: 'now-name' }, tk.name),
      el('span', { class: 'now-sub' }, leave
        ? `${leave <= new Date() ? 'Pars maintenant' : `Pars à ${hmText(leave)}`} · ≈ ${travel} min ${how}`
        : isPart(tk.ticket.part) ? (tk.ticket.with ? `Avec ${tk.ticket.with}` : 'Voir la fiche') : `Rendez-vous à ${hmText(new Date(at))}`));
    if (leave && leave <= new Date()) buzzNow(`pars:${tk.name}:${at}`);
    card.querySelector('.now-open').onclick = () => openPlanned(tk);
    return;
  }
  // « Tu es déjà passé ici » (v157) : une de mes adresses ou notes à moins de 100 m, rappelée une fois par visite, puis pas avant 7 jours
  const mem = nowHidden ? null : memoryHere(state.points, pos, seenShown);
  if (mem) {
    seenShown = markShown(seenShown, mem.p.id);
    try { storage.setItem(SEEN_SHOWN_KEY, JSON.stringify(seenShown)); } catch { /* facultatif */ }
    const m = memoryOf(mem.p);
    card.hidden = false;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `Tu es déjà passé ici${m.at ? ` · ${agoText(m.at)}` : ''}`),
      el('span', { class: 'now-name' }, mem.p.name),
      el('span', { class: 'now-sub' }, m.text || (m.photo ? 'Ta photo' : 'Voir la fiche')));
    buzzNow(`passe:${mem.p.id}`);
    card.querySelector('.now-open').onclick = () => openDetail(mem.p.id);
    return;
  }
  // « C'est le moment » (v158) : un de mes lieux dont le bon moment est venu, à moins de 10 min, pas fermé
  const mo = nowHidden ? null : momentHere(state.points, pos, new Date(), minutesToMeters(10), (p) => openState(hoursOf(p))?.open !== false);
  if (mo) {
    card.hidden = false;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `C'est le moment · ${momentText(mo.p.moments)}`),
      el('span', { class: 'now-name' }, mo.p.name),
      el('span', { class: 'now-sub' }, [`${walkMinutes(mo.d)} min à pied`, mo.p.note?.trim() ? mo.p.note.trim().slice(0, 60) : null].filter(Boolean).join(' · ')));
    buzzNow(`moment:${mo.p.id}`);
    card.querySelector('.now-open').onclick = () => openDetail(mo.p.id);
    return;
  }
  // Prochaine sortie prévue (Mon planning) : celle de demain passe avant la suggestion du moment ;
  // plus tard dans la semaine, elle ne s'affiche que s'il n'y a rien d'autre à proposer.
  const nx = nowHidden ? null : nextPlanned();
  const showNext = () => {
    card.hidden = false;
    const n = plannedPoints().length;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `Prévu ${planText(nx.ticket)}`),
      el('span', { class: 'now-name' }, nx.name),
      el('span', { class: 'now-sub' }, n > 1 ? `Mon planning : ${plural(n, 'sortie prévue', 'sorties prévues')}` : 'Voir Mon planning'));
    card.querySelector('.now-open').onclick = () => openPlanning('map');
  };
  if (nx && daysUntil(nx.ticket.at) === 1) { showNext(); return; }
  // « Dans la rue, à 5 min » (v158) : brocante, fête, marché éphémère ou expo en plein air, en cours ou dans la demi-heure ;
  // « Gratuit, à 5 min » (v187) : une sortie gratuite en salle, sans réservation obligatoire (js/events.js nowNearEvent).
  // Seulement avec un créneau connu aujourd'hui (agenda de la Ville chargé une fois par jour, sans position)
  const street = !pos || nowHidden || eventsCache?.day !== new Date().toDateString() ? null
    : nowNearEvent(eventsCache.items, pos, new Date(), minutesToMeters(5));
  if (street) {
    card.hidden = false;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `${street.street ? 'Dans la rue' : 'Gratuit'} · ${walkMinutes(street.d)} min à pied`),
      el('span', { class: 'now-name' }, street.title),
      el('span', { class: 'now-sub' }, [whenText(street).replace(/^à/, 'À').replace(/^j/, 'J'), street.place,
        !street.street && street.booking === 'advised' ? 'réservation conseillée' : null].filter(Boolean).join(' · ')));
    buzzNow(`sortie:${street.title}:${street.lat},${street.lng}`);
    card.querySelector('.now-open').onclick = () => openEventPage(street);
    return;
  }
  // Rue sans voitures (v197) : un secteur « Paris Respire » prévu en ce moment, à 10 min à pied au plus (js/respire.js).
  // Jamais « fermé aux voitures » : la Ville peut ajourner, l'appli dit « prévu ». Contours lus seulement un jour prévu.
  if (!respireData && pos && !nowHidden && respirePlanned(new Date())) loadRespire().then((d) => { if (d) updateNow(true); });
  const calm = !pos || nowHidden ? null : respireNow(respireSectors(respireData), pos, new Date(), minutesToMeters(10));
  if (calm) {
    card.hidden = false;
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, calm.d ? `Sans voitures · ${walkMinutes(calm.d)} min à pied` : 'Sans voitures · tu y es'),
      el('span', { class: 'now-name' }, calm.s.name),
      el('span', { class: 'now-sub' }, `Prévu jusqu'à ${hhText(calm.to)} · Paris Respire`));
    card.querySelector('.now-open').onclick = () => openRespire(named('Carte', () => closeSheet()));
    return;
  }
  // Bientôt gratuit (v158) : aujourd'hui, demain ou après-demain ; la croix le cache pour la journée, la suggestion revient
  const fb = nowHidden || storage.getItem(FREE_SEEN_KEY) === new Date().toDateString() ? null : freeBanner();
  // v187 : aujourd'hui, le lieu gratuit du jour le plus proche (15 min à pied au plus), avec son heure seulement si elle est sûre
  const fd = fb && !fb.k && pos ? freeDayNear(pos, new Date(), minutesToMeters(15)) : null;
  if (fd) {
    const st = openState(spotHours(fd));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    card.hidden = false;
    card.dataset.kind = 'free';
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, 'Gratuit aujourd\'hui'),
      el('span', { class: 'now-name' }, fd.name),
      el('span', { class: 'now-sub' }, [`${walkMinutes(fd.d)} min à pied`, st?.open ? (st.until ? `jusqu'à ${hhText(st.until)}` : null) : st?.opensAt ? `dès ${hhText(st.opensAt)}` : 'horaires inconnus, vérifie',
        /réservation/i.test(`${fd.note ?? ''} ${fd.when}`) ? 'sur réservation' : null].filter(Boolean).join(' · ')));
    card.querySelector('.now-open').onclick = () => openFreeDaySpot(fd, today, named('Carte', () => closeSheet()));
    return;
  }
  if (fb) {
    card.hidden = false;
    card.dataset.kind = 'free';
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `Gratuit ${fb.when}`),
      el('span', { class: 'now-name' }, fb.text),
      el('span', { class: 'now-sub' }, fb.k ? 'Voir les lieux et leurs heures' : 'Voir Sorties → Gratuit'));
    // v168 : un jour à venir ouvre sa page (lieux, heures ce jour-là, Prévoir) ; aujourd'hui, Sorties → Gratuit,
    // depuis ma position si elle est connue (v187, sans demander le GPS), sinon depuis le centre de la carte
    card.querySelector('.now-open').onclick = () => { if (fb.k) { const d = new Date(); openFreeDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + fb.k), named('Carte', () => closeSheet())); } else { eventsMode = 'free'; const p = freshHere(); openEvents(p ? { lat: p.lat, lng: p.lng, acc: p.acc, time: p.time, kind: 'gps', via: 'now' } : 'map'); } };
    return;
  }
  // Selon l'heure, un lieu du bon type passe devant (comme s'il était 400 m plus près) :
  // le matin cafés et boulangeries, à midi et le soir restos (et bars le soir).
  const slot = timeSlot();
  const fits = (p) => slot && slot.re.test(`${catOf(p.cat).name} ${p.name}`);
  // Un favori (même déjà visité) passe devant un lieu jusqu'à 5 min de marche plus proche
  const score = (x) => x.d - (fits(x.p) ? 400 : 0) - (x.p.fav ? minutesToMeters(5) : 0);
  const best = !pos || nowHidden ? null : offered().filter((p) => openState(hoursOf(p))?.open !== false)
    .map((p) => ({ p, d: distanceM(pos, p) })).filter((x) => x.d <= 1200).sort((a, b) => score(a) - score(b))[0];
  // Le matin, un marché ouvert tout près passe avant un lieu sans rapport avec l'heure
  const mk = pos && !nowHidden && slot?.markets && markets ? nearestMarkets(markets, pos).filter((m) => m.d <= 800 && marketOpenNow(m))[0] : null;
  const useMarket = mk && (!best || (!fits(best.p) && !best.p.fav) || mk.d < best.d);
  if (!best && !useMarket) {
    if (nx) showNext(); else card.hidden = true;
    return;
  }
  card.hidden = false;
  if (useMarket) {
    fill(card.querySelector('.now-text'),
      el('span', { class: 'now-kicker' }, `${slot.label} · marché`),
      el('span', { class: 'now-name' }, mk.name),
      el('span', { class: 'now-sub' }, [`${walkMinutes(mk.d)} min à pied`, hoursToday(mk)].filter(Boolean).join(' · ')));
    card.querySelector('.now-open').onclick = () => openMarket(mk);
    return;
  }
  const { p, d } = best;
  const st = openState(hoursOf(p));
  fill(card.querySelector('.now-text'),
    el('span', { class: 'now-kicker' }, [fits(p) ? slot.label : 'Maintenant', p.fav ? 'ton favori' : null].filter(Boolean).join(' · ')),
    el('span', { class: 'now-name' }, p.name),
    el('span', { class: 'now-sub' }, [`${walkMinutes(d)} min à pied`, st?.open ? (st.until ? `ouvert jusqu'à ${hhText(st.until)}` : 'ouvert') : null, !st && dayNote() ? 'horaires inconnus, vérifie' : null].filter(Boolean).join(' · ')));
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
  openSheet([ico('plus'), ' Ajouter un lieu'], el('div', { class: 'stack' },
    el('button', { type: 'button', class: 'btn big c-add solid', onclick: captureSeen }, ico('camera'), 'Vu en passant'),
    el('p', { class: 'help' }, 'Une photo et une ligne, posées là où tu es. Pour les trouvailles de la rue : une cour, une vitrine, une plaque.'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: addAtPosition }, ico('map-pin'), 'À ma position'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: () => openPlaceSearch('', false, { name: 'Ajouter un lieu', fn: openAddChoice }) }, ico('search'), 'Avec un nom ou une adresse'),
    el('button', { type: 'button', class: 'btn big c-add', onclick: addFromPhoto }, ico('image'), 'Depuis une photo de ma galerie'),
    el('p', { class: 'help' }, 'Astuce : tu peux aussi laisser le doigt appuyé sur la carte, là où tu veux.'),
  ), { name: 'add', again: openAddChoice });
}

/* ---------- Vu en passant (v157) : la position se cherche pendant la photo ; une ligne facultative ; Garder ---------- */
function captureSeen() {
  track('Vu en passant');
  const where = locate().catch((e) => ({ error: e.message })); // tout de suite, au moment de l'appui
  const camera = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  camera.addEventListener('change', async () => {
    const f = camera.files?.[0];
    camera.remove();
    if (!f) return;
    let blob = null;
    try { blob = await compressImage(f); } catch { blob = null; }
    if (!blob) { toast('Cette photo n\'a pas pu être lue.', true); return; }
    openSeenForm(blob, where);
  });
  document.body.append(camera);
  camera.click();
}
let seenStreet = false; // dernier rangement choisi dans Vu en passant (le temps de la session) : Street art ou non
function openSeenForm(blob, where) {
  const url = URL.createObjectURL(blob);
  const line = el('input', { type: 'text', maxlength: '120', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'Ex. : cour avec glycine' });
  const posLine = el('p', { class: 'help', 'aria-live': 'polite' }, 'Recherche de ta position…');
  const choice = el('div', { class: 'field', hidden: true });
  let stars = 0;
  const starBox = el('div', { class: 'field', hidden: true }, 'Ma note (facultatif)', starPicker(0, (n) => { stars = n; }));
  let target = 'new'; // id d'une de mes adresses proches, ou une nouvelle note
  let fix = null;
  // Ranger une nouvelle note (v161) : Vu en passant, ou Street art avec son artiste (facultatif)
  let street = seenStreet;
  const artist = artistInput();
  const artistBox = el('div', { class: 'stack', style: 'gap:8px' }, el('label', { class: 'field' }, 'Artiste (facultatif)', artist), artistHelp(artist));
  const sortBox = el('div', { class: 'field' });
  const drawSort = () => {
    fill(sortBox, 'Ranger dans', el('div', { class: 'seg', role: 'group', 'aria-label': 'Ranger dans' },
      el('button', { type: 'button', 'aria-pressed': String(!street), onclick: () => { street = false; drawSort(); } }, 'Vu en passant'),
      el('button', { type: 'button', 'aria-pressed': String(street), onclick: () => { street = true; drawSort(); } }, 'Street art')));
    sortBox.hidden = target !== 'new';
    artistBox.hidden = target !== 'new' || !street;
  };
  drawSort();
  where.then((r) => {
    fix = r;
    const near = !r?.error ? placeNear(state.points, r, 30) : null;
    if (near) {
      target = near.p.id;
      let draw = () => fill(choice, 'Où la garder ?', el('div', { class: 'seg', role: 'group', 'aria-label': 'Où la garder' },
        el('button', { type: 'button', 'aria-pressed': String(target === near.p.id), onclick: () => { target = near.p.id; draw(); } }, `Ajouter à : ${near.p.name}`),
        el('button', { type: 'button', 'aria-pressed': String(target === 'new'), onclick: () => { target = 'new'; draw(); } }, 'Nouvelle note')));
      const drawAll = draw;
      draw = () => { drawAll(); starBox.hidden = target === 'new'; drawSort(); };
      draw();
      choice.hidden = false;
    }
    if (r?.error) { posLine.textContent = `${r.error} Le point sera posé au centre de la carte : tu pourras le déplacer.`; posLine.className = 'warn'; return; }
    const m = Math.round(r.acc ?? 0);
    posLine.textContent = m > 50 ? `Position à ${m} m près : tu pourras déplacer le point.` : m < 5 ? 'Position précise.' : `Position à ${m} m près.`;
    if (m > 50) posLine.className = 'warn';
  });
  let busy = false;
  const keep = el('button', { type: 'button', class: 'btn c-add solid', onclick: () => save() }, ico('check'), 'Garder');
  const save = async () => {
    if (busy) return;
    busy = true;
    if (!fix) fill(keep, ico('locate'), 'Position en cours…'); // le GPS cherche encore (6 s au plus)
    const r = fix ?? await where;
    const c = map.getCenter();
    const at = r?.error ? { lat: c.lat, lng: c.lng, acc: null } : r;
    const rough = !at.acc || at.acc > 50;
    const id = newPhotoId();
    try { await putPhoto(id, blob); } catch { busy = false; toast('Photo non enregistrée : le téléphone manque peut-être de place.', true); return; }
    const place = target !== 'new' ? state.points.find((x) => x.id === target) : null;
    if (place) { // un passage de cette adresse, avec la photo et la ligne
      place.passages = addPassage(place.passages, { at: Date.now(), text: line.value, photo: id, stars: stars || undefined });
      if (!place.done) setDone(place, true);
      persist(); renderMarkers();
      URL.revokeObjectURL(url);
      closeSheet();
      if (stars && stars !== (place.stars ?? 0)) offerStars(place, stars, `Ajouté à « ${place.name} »`);
      else toast(`Ajouté à « ${place.name} »`, false, { label: 'Voir', fn: () => openDetail(place.id) });
      return;
    }
    seenStreet = street;
    state = street ? withStreetCat(state) : withSeenCat(state);
    const cat = street ? streetCatId(state.categories) : SEEN_CAT.id;
    const np = newPoint({ name: seenName(line.value), cat, note: line.value.trim().slice(0, 120), lat: at.lat, lng: at.lng });
    np.photos = [id];
    if (street && cleanArtist(artist.value)) np.artist = cleanArtist(artist.value);
    state.points.push(np);
    persist(); refresh();
    URL.revokeObjectURL(url);
    closeSheet();
    centerOn(at.lat, at.lng, Math.max(map.getZoom(), 17));
    toast(rough ? 'Gardé · position approximative' : `Gardé dans ${street ? catOf(cat).name : 'Vu en passant'}`, false, rough ? { label: 'Déplacer', fn: () => startMove(np) } : { label: 'Voir', fn: () => openDetail(np.id) });
    reverseAddress(at.lat, at.lng).then((label) => { if (label) { np.address = label; persist(); } }).catch(() => {});
  };
  openSheet([ico('camera'), ' Vu en passant'], el('div', { class: 'stack' },
    el('img', { class: 'seen-preview', src: url, alt: 'Ta photo' }),
    el('label', { class: 'field' }, 'Une ligne (facultatif)', line),
    posLine,
    choice,
    starBox,
    sortBox,
    artistBox,
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => { URL.revokeObjectURL(url); closeSheet(); toast('Photo non gardée'); } }, 'Annuler'),
      keep),
  ), { name: 'seen' });
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
function openPlaceSearch(initial = '', autoRun = false, back = null, kept = null) {
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
    // Les lieux : d'abord dans la zone que montre la carte ; moins de 5 réponses → complétés par tout Paris et la petite couronne.
    // Les adresses : toujours dans toute la zone (une adresse précise est unique).
    const b = map.getBounds();
    const box = viewBox({ west: b.getWest(), north: b.getNorth(), east: b.getEast(), south: b.getSouth() });
    const [places, addrs] = await Promise.allSettled([searchPlaces(q, ctrl.signal, { zone: true, box }), searchAddress(q, ctrl.signal, { zone: true })]);
    if (ctrl.signal.aborted) return;
    let inView = places.status === 'fulfilled' ? places.value : [];
    let more = [];
    let moreFailed = false;
    if (box && places.status === 'fulfilled' && inView.length < 5) {
      info.textContent = 'Peu de réponses dans la zone de la carte : recherche dans tout Paris…';
      try {
        const all = await searchPlaces(q, ctrl.signal, { zone: true });
        more = all.filter((r) => !inView.some((v) => v.name === r.name && Math.abs(v.lat - r.lat) < 0.0004 && Math.abs(v.lng - r.lng) < 0.0006));
      } catch { moreFailed = true; }
      if (ctrl.signal.aborted) return;
    }
    // Du plus proche au plus loin : de ma position récente, sinon du centre de la carte (pas de GPS demandé)
    const ref = freshHere() ?? map.getCenter();
    const near = (list) => list.map((r) => ({ ...r, d: distanceM(ref, r) })).sort((x, y) => x.d - y.d);
    const P = near(inView);
    const M = near(more);
    const A = addrs.status === 'fulfilled' ? addrs.value : [];
    const failed = places.status === 'rejected' || addrs.status === 'rejected' || moreFailed;
    show({ q, P, M, A, failed, box: Boolean(box) });
  };
  /** Les résultats d'une recherche (gardés pour revenir de la carte sans tout redemander). */
  const show = (res) => {
    const { q, P, M, A, failed, box } = res;
    fill(out);
    const placeRows = (list) => el('ul', { class: 'results' }, list.map((r) => row(r.name, [r.kind, r.address, fmtDist(r.d)].filter(Boolean).join(' · '),
      () => openForm({ lat: r.lat, lng: r.lng, address: r.address, name: r.name, hours: r.hours }))));
    if (P.length) out.append(el('h3', { class: 'ring-title' }, el('span', {}, box ? 'Lieux dans la zone de la carte' : 'Lieux, du plus proche'), el('span', {}, String(P.length))), placeRows(P));
    if (M.length) out.append(el('h3', { class: 'ring-title' }, el('span', {}, P.length ? 'Ailleurs à Paris et autour' : 'Rien dans la zone de la carte : ailleurs à Paris et autour'), el('span', {}, String(M.length))), placeRows(M));
    if (A.length) {
      out.append(el('h3', { class: 'ring-title' }, el('span', {}, 'Adresses'), el('span', {}, String(A.length))),
        el('ul', { class: 'results' }, A.map((r) => row(r.label, ROUGH[r.type] ?? null,
          () => openForm({ lat: r.lat, lng: r.lng, address: r.label, rough: ROUGH[r.type] ?? null })))));
    }
    const total = P.length + M.length + A.length;
    if (total >= 2) out.prepend(el('button', { type: 'button', class: 'btn c-disc', onclick: () => showSearchPeek(res, () => openPlaceSearch(q, false, back, res)) }, ico('map'), 'Voir sur la carte'));
    if (P.length || M.length || A.length) {
      info.textContent = failed ? 'Une partie de la recherche n\'a pas répondu, les résultats peuvent être incomplets.' : 'Choisis un résultat :';
    } else {
      info.textContent = failed
        ? 'La recherche ne répond pas. Vérifie ta connexion internet, puis réessaie.'
        : 'Rien trouvé dans Paris et les départements voisins (92, 93, 94). Essaie avec moins de mots, ou ajoute le quartier (ex. : « Uniqlo Opéra »).';
    }
    if (P.length || M.length) out.append(el('p', { class: 'help' }, `Lieux : données © OpenStreetMap, ${box ? 'cherchés d\'abord dans la zone que montre la carte (déplace ou zoome la carte, puis relance)' : 'cherchés dans tout Paris et autour'}, 40 au plus. OpenStreetMap ne connaît pas tous les commerces (surtout les récents) : pour un nom courant (« boulangerie »), zoome sur le quartier ou ajoute la rue.`));
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });

  openSheet([ico('search'), ' Nom ou adresse'], el('div', { class: 'stack' },
    el('label', { class: 'field' }, 'Lieu ou adresse', input),
    el('button', { type: 'button', class: 'btn primary', onclick: run }, 'Chercher'),
    info, out, back ? foot(el('button', { type: 'button', class: 'btn', onclick: back.fn }, `← ${back.name}`)) : null),
    { tall: true, onClose: () => ctrl?.abort(), name: 'place', again: () => openPlaceSearch(input.value, Boolean(input.value.trim()), back) });
  if (kept) show(kept); else if (autoRun) run(); else input.focus();
}

/** Ajouter → Nom ou adresse → « Voir sur la carte » : les résultats en ronds à contour terre cuite.
    Un rond touché : son nom et son adresse dans le bandeau, un appui sur le bandeau ouvre la fiche d'ajout.
    Toucher la carte à côté revient à « tous les résultats » ; le bandeau de départ rouvre la liste (sans nouvelle recherche). */
function showSearchPeek(res, back) {
  const items = [
    ...[...res.P, ...res.M].map((r) => ({ lat: r.lat, lng: r.lng, name: r.name, sub: [r.kind, r.address].filter(Boolean).join(' · '), draft: { lat: r.lat, lng: r.lng, address: r.address, name: r.name, hours: r.hours } })),
    ...res.A.map((r) => ({ lat: r.lat, lng: r.lng, name: r.label, sub: ROUGH[r.type] ?? 'Adresse', draft: { lat: r.lat, lng: r.lng, address: r.label, rough: ROUGH[r.type] ?? null } })),
  ];
  closeSheet();
  endPeek();
  const pins = [];
  const card = (x) => {
    peekCard?.remove();
    if (x) {
      peekCard = el('div', { class: 'now-card peek-card', role: 'region', 'aria-label': 'Résultat choisi' },
        el('button', { type: 'button', class: 'now-open', onclick: () => { endPeek(); openForm({ ...x.draft, onCancel: () => showSearchPeek(res, back) }); } },
          el('span', { class: 'now-text' }, el('span', { class: 'now-kicker' }, 'Résultat'), el('span', { class: 'now-name' }, x.name), el('span', { class: 'now-sub' }, `${x.sub ? `${x.sub} · ` : ''}Touche ici pour l'ajouter`)),
          el('span', { class: 'now-chev', 'aria-hidden': 'true' }, '›')),
        el('button', { type: 'button', class: 'now-close', 'aria-label': 'Retirer de la carte', onclick: endPeek }, ico('x')));
      document.body.append(peekCard);
    } else showPeekCard('Recherche', `« ${res.q} » · ${plural(items.length, 'résultat', 'résultats')}`, back, 'Touche un rond pour voir son nom');
  };
  const pick = (x) => {
    for (const m of pins) m.getElement()?.querySelector('.peek-pin')?.classList.toggle('sel', m.options.item === x);
    card(x);
  };
  for (const x of items) {
    const m = L.marker([x.lat, x.lng], { keyboard: true, title: x.name, zIndexOffset: 400, item: x,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="peek-pin">${svgIcon('map-pin-plus', { size: 15, stroke: 2.4 })}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
      .on('add', (e) => e.target.getElement()?.setAttribute('aria-label', x.name))
      .on('click', () => pick(x))
      .addTo(peekLayer);
    pins.push(m);
  }
  const toAll = () => { if (peekCard?.getAttribute('aria-label') === 'Résultat choisi') pick(null); };
  map.on('click', toAll);
  peekOff = () => map.off('click', toAll);
  card(null);
  map.fitBounds(L.latLngBounds(items.map((x) => [x.lat, x.lng])), { paddingTopLeft: [24, 90], paddingBottomRight: [84, 170], maxZoom: 16, animate: false });
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

/** Le lien s'est-il ouvert ailleurs que dans mon appli ? Navigateur intégré d'une appli (Messages, WhatsApp…),
    ou navigateur dont la mémoire est vide : mes lieux n'y sont pas. */
function outsideMyApp() {
  if (STANDALONE) return false;
  let mine = false;
  try { mine = storage.getItem(MY_APP_KEY) === '1'; } catch { /* rien */ }
  return /; wv\)/.test(navigator.userAgent) || !mine;
}
/** Avant d'enregistrer un lieu reçu dans un navigateur « jetable » : proposer de l'ouvrir dans Chrome, où est l'appli. */
function linkGuard(link, hash, go) {
  const target = `${location.host}${location.pathname}?ouvrir=${encodeURIComponent(hash.replace(/^#/, ''))}`;
  const chrome = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast('Lien copié : colle-le dans Chrome.'); } catch { prompt('Copie ce lien et colle-le dans Chrome :', link); }
  };
  openSheet([ico('triangle-alert'), ' Tu n\'es pas dans ton appli'], el('div', { class: 'stack' },
    el('p', {}, 'Ce lien s\'est ouvert dans un navigateur qui ne connaît pas tes lieux (souvent celui de Messages ou de WhatsApp). Ce que tu enregistres ici risque d\'être perdu.'),
    el('a', { class: 'btn primary', href: chrome }, 'Ouvrir dans Chrome'),
    el('button', { type: 'button', class: 'btn c-info', onclick: copy }, ico('copy'), 'Copier le lien'),
    el('button', { type: 'button', class: 'btn', onclick: go }, 'Continuer ici (je n\'ai pas l\'appli)'),
    el('p', { class: 'help' }, 'Pour que les liens s\'ouvrent toujours dans ton appli : Aide → Ça ne marche pas ? → « Un lien reçu ouvre une carte vide ».'),
  ), { name: 'linkguard' });
}

/** Lancé depuis un raccourci de l'icône ou un partage : l'adresse de la page dit quoi faire. */
function runLaunchAction() {
  // « Ouvrir dans Chrome » (voir linkGuard) renvoie le lien dans ?ouvrir=… : on le remet à sa place
  const reopened = new URLSearchParams(location.search).get('ouvrir');
  const h = reopened ? `#${reopened}` : location.hash;
  const shared = readPlaceLink(h); const walk = readRouteLink(h); const meet = readMeetLink(h);
  const link = location.href;
  if (/(lieu|balade|rdv)=/.test(h)) history.replaceState(null, '', location.pathname + (reopened ? '' : location.search));
  const go = shared ? () => receivePlace(shared) : walk ? () => stationsReady.then(() => receiveRoute(walk)) : meet ? () => receiveMeet(meet) : null;
  if (go) { if (!reopened && outsideMyApp()) linkGuard(link, h, go); else go(); return; }
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

/** Champ « Artiste » (v161) : les noms déjà connus (mes lieux, Mes artistes) sont proposés pendant la saisie. */
/** Les noms d'artistes que l'appli connaît sans rien demander : mes lieux, Mes artistes, et Art dans la rue (liste rangée dans l'appli). */
function artistNames() {
  // v175 : la liste d'Art dans la rue est un fichier de l'appli ; lue en arrière-plan, ses noms servent dès l'appui suivant
  if (!streetArt) loadStreetArt().catch(() => {});
  const rue = streetArt ?? [];
  return [...knownArtists(state.points, state.artists), ...(Array.isArray(rue) ? rue.map((a) => a?.artist).filter((x) => typeof x === 'string') : [])];
}
/**
 * Sous le champ Artiste (v172) : « Vouliez-vous dire… ? » (des noms connus proches, un appui remplit le champ ; rien
 * si aucun n'est proche, jamais « inconnu ») et « Chercher « nom » sur Google » (un lien, ouvert seulement par mon appui).
 */
function artistHelp(input) {
  const box = el('div', { class: 'stack artist-help', style: 'gap:8px', 'aria-live': 'polite' });
  let names = null;
  const draw = () => {
    const t = input.value.trim();
    names ??= artistNames();
    const sugg = artistSuggest(t, names);
    fill(box,
      sugg.length ? el('p', { class: 'legend' }, 'Vouliez-vous dire ?') : null,
      sugg.length ? el('div', { class: 'list-chips', role: 'group', 'aria-label': 'Vouliez-vous dire' },
        ...sugg.map((n) => el('button', { type: 'button', class: 'chip', onclick: () => { input.value = n; input.dispatchEvent(new Event('input')); } }, n))) : null,
      t.replace(/\s/g, '').length >= 2 ? el('a', { class: 'btn c-guide', href: artistSearchUrl(t), target: '_blank', rel: 'noopener noreferrer' }, ico('search'), `Chercher « ${t.slice(0, 30)} » sur Google`) : null);
  };
  let timer = 0;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(draw, 250); });
  draw();
  return box;
}

function artistInput(value = '') {
  const id = 'artist-names';
  document.getElementById(id)?.remove();
  document.body.append(el('datalist', { id }, knownArtists(state.points, state.artists).map((n) => el('option', { value: n }))));
  return el('input', { type: 'text', maxlength: '60', list: id, autocomplete: 'off', enterkeyhint: 'done', value, placeholder: 'Ex. : Invader, Miss.Tic, Rodin' });
}

function openForm(draft, existing = null) {
  const firstCat = filterCats.size === 1 ? [...filterCats][0] : state.categories[0].id;
  // Modifier : les saisies en cours (draft.pending) passent avant le lieu enregistré, pour revenir d'une nouvelle catégorie sans rien perdre
  const v = existing ? { ...existing, ...(draft.pending ?? {}) } : { name: draft.name ?? '', cat: draft.cat ?? firstCat, note: draft.note ?? '', done: draft.done ?? false, fav: draft.fav ?? favOnly, address: draft.address, stars: draft.stars ?? 0, covered: draft.covered, lists: draft.lists };
  let cat = v.cat;
  let done = v.done;
  let fav = v.fav;
  let stars = v.stars ?? 0;
  let covered = Boolean(v.covered);
  const moments = new Set(cleanMoments(v.moments ?? draft.moments)); // Le bon moment (v158)
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
  const momentChips = el('div', { class: 'list-chips', role: 'group', 'aria-label': 'Le bon moment' });
  const drawMoments = () => fill(momentChips, MOMENTS.map(([k, label]) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(moments.has(k)), onclick: () => { if (moments.has(k)) moments.delete(k); else moments.add(k); drawMoments(); } }, label)));
  drawMoments();
  const momentBox = el('div', { class: 'stack', style: 'gap:8px' }, el('div', { class: 'legend' }, 'Le bon moment (facultatif)'), momentChips,
    el('p', { class: 'help' }, 'Ex. : Printemps pour une glycine, Week-end + Matin pour un marché. « Maintenant » te le rappellera quand ce sera le moment.'));
  const coveredBox = el('input', { type: 'checkbox', class: 'check', checked: covered });
  coveredBox.addEventListener('change', () => { covered = coveredBox.checked; });

  const name = el('input', { type: 'text', value: v.name, maxlength: '80', autocomplete: 'off', enterkeyhint: 'next', required: true });
  const note = el('textarea', { maxlength: '1000', placeholder: 'Pourquoi tu l\'as gardé, quoi y prendre…' });
  note.value = v.note;
  const artist = artistInput(v.artist ?? draft.artist ?? ''); // l'artiste d'une œuvre (v161)
  // Le champ Artiste ne sert qu'aux œuvres (v164) : ma catégorie street art, Vu en passant, ou un lieu qui a déjà un artiste
  const artistField = el('div', { class: 'stack', style: 'gap:8px' }, el('label', { class: 'field' }, 'Artiste (facultatif)', artist), artistHelp(artist));
  const syncArtist = () => { artistField.hidden = !(isStreetCat(catOf(cat)) || cat === SEEN_CAT.id || artist.value.trim()); };
  // Modifier : l'adresse se corrige à la main (v162) ; le point ne bouge pas (Rangement → Déplacer le point pour cela)
  const addr = existing ? el('input', { type: 'text', value: v.address ?? '', maxlength: '200', autocomplete: 'off', enterkeyhint: 'next', placeholder: 'Ex. : 16 rue Chaptal, 75009 Paris' }) : null;
  const err = el('div', { class: 'error', role: 'alert' });

  const segBtn = (label, pressed, onPick) => el('button', { type: 'button', 'aria-pressed': String(pressed), onclick: onPick }, label);
  // Nouveau lieu : les catégories sur une seule ligne qui défile, pour laisser de la place à la carte.
  const catSeg = el('div', { class: existing ? 'seg' : 'seg seg-scroll', role: 'group', 'aria-label': 'Catégorie' });
  const drawCats = () => fill(catSeg, ...state.categories.map((c) =>
    segBtn([catDot(c.id), c.name], c.id === cat, () => { cat = c.id; drawCats(); drawDone(); syncArtist(); })), // le nom de « Déjà visité » et le champ Artiste suivent la catégorie
    // Au bout des catégories : en créer une sans quitter la fiche
    el('button', { type: 'button', class: 'seg-new', onclick: () => newCat() }, ico('plus'), 'Nouvelle'));
  drawCats();
  const doneSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'État' });
  const drawDone = () => fill(doneSeg, 
    segBtn('À faire', !done, () => { done = false; drawDone(); }),
    segBtn(didName(catOf(cat)), done, () => { done = true; drawDone(); }),
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
  /** Nouvelle catégorie depuis la fiche : on garde ce qui est tapé, on revient avec la catégorie choisie. */
  const newCat = () => {
    const keep = { name: name.value, note: note.value, artist: artist.value, ...(addr ? { address: addr.value } : {}), cat, done, fav, stars, covered, lists: [...lists], moments: [...moments] };
    if (existing) draft.pending = keep; else Object.assign(draft, keep);
    const reopen = () => openForm(draft, existing);
    openCategory(null, { back: reopen, done: (id) => { if (existing) draft.pending.cat = id; else draft.cat = id; reopen(); } });
  };
  /** Ajuster la position d'un nouveau lieu sur toute la carte, sans perdre ce qui est déjà rempli. */
  const adjust = () => {
    Object.assign(draft, { name: name.value, note: note.value, artist: artist.value, cat, done, fav, stars, covered, lists: [...lists], moments: [...moments] });
    startDraftMove(draft);
  };

  const save = () => {
    const n = name.value.trim();
    if (!n) { err.textContent = 'Donne un nom à ce lieu.'; name.focus(); return; }
    if (!state.categories.some((c) => c.id === cat)) { err.textContent = 'Choisis une catégorie.'; catSeg.scrollIntoView({ block: 'center' }); return; }
    if (!existing && !dupOk) {
      const dup = findDuplicate(state.points, { name: n, lat: draft.lat, lng: draft.lng });
      if (dup) {
        fill(err,
          `Tu as déjà « ${dup.point.name} » à ${Math.round(dup.d)} m. `,
          el('div', { class: 'row', style: 'margin-top:8px' },
            Number.isFinite(draft.ticketAt)
              ? el('button', { type: 'button', class: 'btn c-add', onclick: () => { dup.point.ticket = draftPlan(draft); persist(); updateNow(true); renderMarkers(); openDetail(dup.point.id); toast(`Dans Mon planning : ${planText(dup.point.ticket)}`); } }, 'Noter sur ce lieu')
              : el('button', { type: 'button', class: 'btn', onclick: () => openDetail(dup.point.id) }, 'Voir ce lieu'),
            el('button', { type: 'button', class: 'btn c-add', onclick: () => { dupOk = true; save(); } }, 'Ajouter quand même')));
        err.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
    const listIds = [...lists].filter((id) => (state.lists ?? []).some((l) => l.id === id));
    if (existing) {
      Object.assign(existing, { name: n, cat, note: note.value, fav, stars, covered, lists: listIds });
      if (moments.size) existing.moments = cleanMoments([...moments]); else delete existing.moments;
      if (cleanArtist(artist.value)) existing.artist = cleanArtist(artist.value); else delete existing.artist;
      existing.address = addr.value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
      markDone(existing, done);
    } else {
      const np = newPoint({ name: n, cat, note: note.value, done, fav, lat: draft.lat, lng: draft.lng, address: draft.address || '', hours: draft.hours || '', stars, covered, lists: listIds });
      if (moments.size) np.moments = cleanMoments([...moments]);
      if (cleanArtist(artist.value)) np.artist = cleanArtist(artist.value);
      if (Number.isFinite(draft.ticketAt)) np.ticket = draftPlan(draft); // sortie datée (Sorties, invitation) : elle va dans Mon planning
      if (done) np.passages = addPassage([], { at: np.created }); // ajouté comme « Déjà visité » : son premier passage
      state.points.push(np);
      if (draft.photoFile) savePhotos(np, [draft.photoFile]);
    }
    const ok = persist();
    renderMarkers();
    if (existing) openDetail(existing.id); else closeSheet();
    if (ok) toast(existing ? 'Modifications enregistrées' : `« ${n} » est sur ta carte${Number.isFinite(draft.ticketAt) ? ` · dans Mon planning ${planText(draftPlan(draft))}` : ''}`);
    if (ok && Number.isFinite(draft.ticketAt)) updateNow(true);
    if (ok && !existing) refreshParkHours().catch(() => {});
  };

  // Le détail facultatif est replié pour un nouveau lieu : la fiche reste courte et la carte garde la moitié de l'écran.
  const details = [
    el('label', { class: 'field' }, 'Note (facultatif)', note),
    artistField,
    el('div', {}, el('div', { class: 'legend' }, 'État'), doneSeg),
    el('div', {}, el('div', { class: 'legend' }, 'Ma note (facultatif)'), starPicker(stars, (n) => { stars = n; })),
    el('div', { class: 'stack', style: 'gap:8px' }, el('div', { class: 'legend' }, 'Mes listes (facultatif)'), listBox,
      el('div', { class: 'row' }, newList, el('button', { type: 'button', class: 'btn c-add', style: 'flex:none', onclick: createList }, ico('plus'), 'Créer'))),
    el('label', { class: 'item-main check-row' }, coveredBox,
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, 'Abrité de la pluie'), el('span', { class: 'item-sub' }, 'Musée, passage couvert, café avec salle…'))),
    momentBox,
  ];
  syncArtist();
  const filled = Boolean(v.note || v.artist || draft.artist || v.done || (v.fav && !favOnly) || stars || covered || lists.size || moments.size);
  openSheet([ico(existing ? 'pencil' : 'map-pin-plus'), existing ? ' Modifier le lieu' : ' Nouveau lieu'], el('div', { class: 'stack' },
    existing ? el('div', { class: 'stack', style: 'gap:8px' }, el('label', { class: 'field' }, 'Adresse', addr),
      el('p', { class: 'help' }, 'Corrige le texte : le point ne bouge pas. Pour le déplacer : fiche → Rangement → Déplacer le point (l\'adresse est alors recalculée).'))
    : el('div', { class: 'where-row' },
      el('p', { class: 'where' }, ico('map-pin'), whereText),
      existing ? null : el('button', { type: 'button', class: 'btn c-add where-adjust', onclick: adjust, 'aria-label': 'Ajuster la position sur la carte' }, ico('locate-fixed'), 'Ajuster')),
    accWarn,
    !existing && Number.isFinite(draft.ticketAt) ? el('p', { class: 'summary' }, ico('alarm-clock'), ` Sortie ${planText(draftPlan(draft))}${draft.ticketWith ? ` avec ${draft.ticketWith}` : ''} : elle ira dans Mon planning.`) : null,
    el('label', { class: 'field' }, 'Nom', name),
    el('div', {}, el('div', { class: 'legend' }, 'Catégorie'), catSeg),
    existing ? el('div', { class: 'stack' }, ...details)
      : el('details', { class: 'help-item form-more', open: filled },
        el('summary', {}, el('span', { class: 'help-title' }, 'Plus de détails'), el('span', { class: 'form-more-sub' }, 'note, état, listes…')),
        el('div', { class: 'stack' }, ...details)),
    err,
    foot(el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: () => (existing ? openDetail(existing.id) : draft.onCancel ? draft.onCancel() : closeSheet()) }, 'Annuler'), /* onCancel : revenir aux résultats sur la carte */
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
  const update = (fn) => { fn(); persist(); renderMarkers(); openDetail(id, back); };
  const here = named('Fiche', () => openDetail(p.id, back));

  // En tête, juste sous le nom : Y aller (seule plaque pleine) puis Boussole, Métro, Photo (v93).
  // Visibles sans défiler à 360 px, même avec la photo, qui passe dessous.
  const goBox = el('div', { class: 'stack' },
    el('a', { class: 'btn primary go-bar', href: mapsUrl(p, d ?? 1000), target: '_blank', rel: 'noopener' },
      ico('arrow-right'), d != null ? `Y aller · ${fmtWalk(d).replace(/ /g, '\u00a0')}` : 'Y aller', d != null ? el('small', { class: 'go-dist' }, fmtDist(d)) : null), /* insécables : la ligne ne se coupe qu'après « · » (audit du 18 nov.) */
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(p) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan(p, here), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => quickPhoto(p, back), 'aria-label': 'Prendre une photo' }, ico('camera'), 'Photo')));

  // Favori et Déjà visité : deux interrupteurs à libellé fixe, l'état est dit par aria-pressed (v95).
  const toggles = el('div', { class: 'row' },
    el('button', { type: 'button', class: 'btn c-fav', 'aria-pressed': String(!!p.fav), onclick: () => update(() => { p.fav = !p.fav; }) }, glyph(state.fav.icon, { filled: !!p.fav }), 'Favori'),
    el('button', { type: 'button', class: 'btn c-add', 'aria-pressed': String(!!p.done), onclick: () => update(() => { markDone(p, !p.done); }) }, ico('check'), didName(catOf(p.cat))));
  // Prévoir (v152) : juste sous les interrupteurs, il dit aussi quand la sortie est prévue.
  const planned = Number.isFinite(p.ticket?.at) && daysUntil(p.ticket.at) >= 0;
  const planBtn = el('button', { type: 'button', class: 'btn c-disc', onclick: () => openPlan(p, back) },
    ico('alarm-clock'), planned ? `Prévu ${planText(p.ticket)}${p.ticket.with ? ` avec ${p.ticket.with}` : ''}` : 'Prévoir une visite');

  // Deux colonnes de faits : aujourd'hui (horaires) et métro le plus proche.
  const st = openState(hoursOf(p));
  const metro = stationFacts(p);
  const facts2 = st || metro ? el('div', { class: 'fiche-cols' },
    el('div', {},
      el('div', { class: 'fiche-k' }, 'Aujourd\'hui'),
      st ? el('div', { class: `fiche-v ${st.open ? 'ok' : 'ko'}` }, hoursLine(p)) : el('div', { class: 'fiche-v muted' }, 'Horaires inconnus'),
      closedDaysText(hoursOf(p)) ? el('div', { class: 'fiche-s' }, closedDaysText(hoursOf(p))) : null,
      st && p.hours && hoursAge(p) ? el('div', { class: 'fiche-s' }, hoursAge(p)) : null,
      !p.hours && parkHoursById.has(p.id) ? el('div', { class: 'fiche-s' }, 'Horaires de la Ville, saison en cours') : null),
    el('div', {},
      el('div', { class: 'fiche-k' }, metro?.lines ? `Métro ${metro.lines}` : 'Métro'),
      metro ? el('div', { class: 'fiche-v m' }, metro.name) : el('div', { class: 'fiche-v muted' }, 'Pas de station proche'),
      metro ? el('div', { class: 'fiche-s' }, metro.exit ? `${metro.exit} · ≈ ${metro.min} min` : `≈ ${metro.min} min à pied`) : null)) : null;

  // Lignes d'information, séparées par des filets.
  const listNames = [p.covered ? 'Abrité' : null, ...(p.lists ?? []).map((lid) => state.lists?.find((l) => l.id === lid)?.name)].filter(Boolean);
  // « Encore là ? » (v161) : pour une œuvre, le dernier jour où je l'ai vue (jamais « toujours là »), ou qu'elle a disparu
  const vanish = canVanish(p, state.categories);
  const seenAt = vanish ? lastSeen(p) : null;
  const facts = el('div', { class: 'fiche-lines' },
    p.address ? el('div', { class: 'copy-row' }, el('p', { class: 'where' }, ico('map-pin'), p.address), copyBtn(() => p.address, 'l\'adresse', 'Adresse copiée')) : null,
    // La sortie prévue n'est écrite qu'une fois : sur le bouton Prévoir.
    listNames.length ? el('p', {}, listNames.join(' · ')) : null,
    p.moments?.length ? el('p', {}, ico('sun'), ` Le bon moment : ${momentText(p.moments)}`) : null,
    p.owner || owners(state.points).length ? el('p', {}, ico('user'), ` Ajouté par ${p.owner || (state.me ? `toi (${state.me})` : 'toi')}`) : null,
    p.gone ? el('p', {}, ico('eye-off'), ` ${vanish ? 'Disparue ou recouverte' : 'Fermé définitivement'} (noté le ${formatDate(p.gone)})`) : null,
    el('p', { class: 'muted' }, seenAt ? `${p.gone ? 'Vue pour la dernière fois' : 'Vue'} le ${formatDate(seenAt)}` : ageLine(p)));

  // Actions, version A « Sommaire » : trois rubriques nommées, tout à un appui (plus de « Plus »).
  const row = (icon, label, sub, onclick, cls = '') => el('button', { type: 'button', class: `fiche-row ${cls}`.trim(), onclick },
    typeof icon === 'string' ? ico(icon) : icon, el('span', {}, label, sub ? el('small', {}, sub) : null), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')));
  const tidy = el('div', { class: 'fiche-toc' });
  // Une œuvre « Disparue ou recouverte » (v161) ; tout autre lieu « Fermé définitivement » (v165) : gris, plus proposé, réversible
  const setGone = (on) => {
    if (on) p.gone = Date.now();
    else { delete p.gone; if (vanish) p.passages = addPassage(p.passages, { at: Date.now() }); } // œuvre revue aujourd'hui : un passage
    persist(); renderMarkers(); openDetail(id, back);
    if (on) toast(vanish ? 'Notée disparue : l\'appli ne la propose plus' : 'Noté fermé : l\'appli ne le propose plus', false, { label: 'Annuler', fn: () => { delete p.gone; persist(); renderMarkers(); openDetail(id, back); } });
    else toast(vanish ? 'De nouveau là : vue aujourd\'hui' : 'De nouveau ouvert : l\'appli le propose à nouveau');
  };
  const showTidy = () => fill(tidy,
    p.gone ? row('eye', vanish ? 'Elle est de nouveau là' : 'De nouveau ouvert', 'L\'appli le propose à nouveau', () => setGone(false))
      : vanish ? row('eye-off', 'Disparue ou recouverte', 'Grise sur la carte, gardée dans ton journal', () => setGone(true))
        : row('store', 'Fermé définitivement', 'Constaté sur place ou dans Google Maps ; gris sur la carte', () => setGone(true)),
    row('move', 'Déplacer le point', 'Corriger sa place sur la carte', () => startMove(p, back)),
    row('trash-2', 'Supprimer ce lieu', 'Demande confirmation', askDelete, 'danger'));
  const askDelete = () => fill(tidy,
    el('p', { class: 'warn', role: 'alert' }, `Supprimer « ${p.name} » ? Ce n'est pas annulable.`),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn', onclick: showTidy }, 'Annuler'),
      el('button', { type: 'button', class: 'btn danger solid', onclick: () => {
        for (const ph of photoIds(p)) deletePhoto(ph).catch(() => {});
        state.points = state.points.filter((x) => x.id !== id);
        persist(); renderMarkers();
        if (back) back(); else closeSheet();
        toast('Lieu supprimé');
      } }, 'Oui, supprimer')));
  // Rangement replié en une ligne (v176) : la fiche reste courte, les trois actions rares sont à deux appuis.
  const openTidy = () => {
    showTidy();
    openSheet([ico('wrench'), ' Rangement'], el('div', { class: 'stack' },
      el('p', { class: 'muted' }, p.name),
      tidy,
      foot(backBtn(named(p.name, () => openDetail(id, back)))),
    ), { name: `rangement:${id}`, again: openTidy });
  };
  const tidySub = [p.gone ? (vanish ? 'De nouveau là' : 'De nouveau ouvert') : (vanish ? 'Disparue ou recouverte' : 'Fermé définitivement'), 'déplacer', 'supprimer'].join(', ');

  const kick = [catOf(p.cat).name, arrLabel(p)].filter(Boolean).join(' · ');
  openSheet([el('span', { class: 'fiche-kick', 'aria-hidden': 'true' }, kick), favMark(p), el('span', { class: 'fiche-name' }, p.name), el('span', { class: 'sr-only' }, `, ${kick}`)], el('div', { class: 'stack detail' },
    goBox,
    // L'état d'abord (v176) : ouvert ou fermé, et quel métro, juste sous Y aller, avant les boutons à moi.
    facts2,
    p.note ? el('p', { class: 'fiche-lede' }, p.note) : null,
    toggles,
    el('div', { class: 'row row-big' },
      planBtn,
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openPassage(p, here) }, ico('footprints'), 'Écrire une impression')),
    starPicker(p.stars ?? 0, (n) => { p.stars = n; persist(); toast(n ? `Note : ${n} étoile${n > 1 ? 's' : ''} sur 5` : 'Note retirée'); }),
    photoWide(p, back),
    facts,
    ...passageSection(p, here),
    el('h3', { class: 'fiche-sec' }, 'Sur ce lieu'),
    el('div', { class: 'fiche-toc' },
      p.artist ? row('user', p.artist, 'L\'artiste : ses autres œuvres, son site', () => openArtist(p.artist, here)) : null,
      row('pencil', 'Modifier', vanish ? 'Nom, catégorie, commentaire, artiste, listes' : 'Nom, catégorie, commentaire, listes', () => openForm({ lat: p.lat, lng: p.lng, address: p.address }, p)),
      row('share-2', 'Partager', 'Envoyer à un proche', () => (p.note ? openSharePlace(p, back) : sharePlace(p))),
      row('qr-code', 'QR code', 'À scanner par un proche', () => showQr(p, back)),
      row('wrench', 'Rangement', tidySub, openTidy)),
    el('h3', { class: 'fiche-sec' }, 'Pratique'),
    el('div', { class: 'fiche-toc' },
      navigoOf(p) ? row('badge-percent', 'Avantage Navigo', shortOffer(navigoOf(p).offer), () => openNavigo(navigoOf(p), named(p.name, () => openDetail(id, back)))) : null,
      ttbOf(p) ? row(ttbDotFor(ttbOf(p).rub), 'TTB', ttbKicker(ttbOf(p)), () => openTtbPlace(ttbOf(p), named(p.name, () => openDetail(id, back)))) : null,
      row('clock', 'Horaires', p.hours ? 'Mettre à jour depuis OpenStreetMap' : 'Chercher sur OpenStreetMap', () => findHours(p, back)),
      el('a', { class: 'fiche-row', href: reviewsUrl(p), target: '_blank', rel: 'noopener' },
        ico('star'), el('span', {}, 'Avis Google', el('small', {}, 'Note et avis, dans Google Maps')), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))),
      el('a', { class: 'fiche-row', href: uberUrl(p), target: '_blank', rel: 'noopener' },
        ico('car-taxi-front'), el('span', {}, 'Uber jusqu\'ici', el('small', {}, 'Ouvre Uber, destination déjà remplie')), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')))),
    back ? backBtn(back) : null,
  ), { name: `detail:${id}`, again: () => openDetail(id, back) });
  if (!back) centerOn(p.lat, p.lng, Math.max(map.getZoom(), 16));
}

/** Arrondissement lu dans le code postal de l'adresse (« 75003 » → « 3e », « 75116 » → « 16e »), sinon null. Rien n'est envoyé. */
function arrondissement(address) {
  const m = /\b75(0\d\d|116)\b/.exec(address ?? '');
  if (!m) return null;
  const n = m[1] === '116' ? 16 : Number(m[1]);
  return n >= 1 && n <= 20 ? (n === 1 ? '1er' : `${n}e`) : null;
}

/** Arrondissement d'un lieu (« 3e ») d'après sa position et les contours officiels, comme Filtres et Mon Paris (v193) ;
 * le code postal de l'adresse seulement tant que les contours ne sont pas lus. Hors de Paris : rien. */
function arrLabel(p) {
  if (arrData && Number.isFinite(p?.lat) && Number.isFinite(p?.lng)) { const a = arrOfPoint(p); return a ? arrOrd(a) : null; }
  return arrondissement(p?.address);
}

/** Station la plus proche, en morceaux pour la fiche : nom, lignes, minutes à pied (ou null au-delà de 2 km). */
/** v200 : « horaires notés en mars 2024 » quand les horaires d'un lieu ont été copiés dans l'appli il y a plus d'un an (rien sans date). */
const hoursAge = (p) => (Number.isFinite(p.hoursAt) && Date.now() - p.hoursAt > 365 * 864e5
  ? `horaires notés en ${new Date(p.hoursAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : '');

function stationFacts(p) {
  const r = nearestStation(stations, p);
  if (!r || r.d > 2000) return null;
  const { station: st, d } = r;
  const lines = [Array.isArray(st.l) ? st.l.join(', ') : '', Array.isArray(st.rer) && st.rer.length ? `RER ${st.rer.join(', ')}` : ''].filter(Boolean).join(' · ');
  const exit = exitFor(acces, st, p); // v199 : la sortie la plus proche du lieu, et les minutes depuis elle
  return { name: st.n, lines, min: walkMinutes(exit ? exit.d : d), exit: exit?.label ?? '' };
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

/** Photo de la fiche, en large sous les informations (v95) ; un appui ouvre toutes les photos. */
function photoWide(p, back) {
  const photos = p.photos ?? [];
  if (!photos.length) return null; // le bouton « Photo » de la fiche suffit
  const img = el('img', { alt: '', class: 'fiche-photo-img' });
  photoUrl(photos[0]).then((u) => { if (u) img.src = u; });
  return el('figure', { class: 'fiche-photo' },
    el('button', { type: 'button', onclick: () => openPhotos(p, back), 'aria-label': photos.length > 1 ? `Voir les ${photos.length} photos` : 'Voir la photo' }, img),
    el('figcaption', {}, photos.length > 1 ? `Ta photo · 1 sur ${photos.length}` : 'Ta photo'));
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
      el('button', { type: 'button', class: 'photo-open', onclick: () => viewPhoto(p.photos, i, p.name), 'aria-label': `Voir la photo ${i + 1} en grand` }, img),
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, '← Fiche')),
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

/** Photos en plein écran ; le retour d'Android ou un appui ferme. Avec plusieurs photos, glisser de côté passe à la suivante ou à la précédente (v201). */
async function viewPhoto(ids, i, name) {
  const u = await photoUrl(ids[i]);
  if (!u) { toast('Photo introuvable.', true); return; }
  viewerSet = { ids, i, name };
  showViewerPhoto(u);
  document.getElementById('viewer').hidden = false;
  viewerOpen = true;
  history.pushState({ viewer: true }, '');
}
let viewerOpen = false;
let viewerSet = null; // { ids, i, name } : les photos du lieu et celle qu'on regarde
function showViewerPhoto(u, from = 0) {
  const v = document.getElementById('viewer');
  const img = v.querySelector('img');
  const { ids, i, name } = viewerSet;
  const many = ids.length > 1;
  img.src = u;
  img.alt = many ? `Photo ${i + 1} sur ${ids.length} de ${name}` : `Photo de ${name}`;
  const count = v.querySelector('.viewer-count');
  count.textContent = photoCount(i, ids.length);
  count.hidden = !many;
  v.querySelector('.viewer-hint').textContent = many ? 'Glisse de côté : autre photo.\nTouche pour fermer.' : 'Touche pour fermer';
  // la nouvelle photo arrive du côté où on l'a tirée (sans mouvement si le téléphone le demande : voir style.css)
  img.classList.add('drag');
  img.style.transform = from ? `translateX(${from * 48}px)` : '';
  requestAnimationFrame(() => requestAnimationFrame(() => { img.classList.remove('drag'); img.style.transform = ''; }));
}
/** Photo suivante (1) ou précédente (-1) ; une photo introuvable est sautée ; rien au bout de la série. */
async function stepViewer(step) {
  if (!viewerOpen || !viewerSet) return;
  const n = viewerSet.ids.length;
  let i = viewerSet.i;
  for (;;) {
    const next = swipeIndex(i, n, step);
    if (next === i) return;
    i = next;
    const u = await photoUrl(viewerSet.ids[i]);
    if (!viewerOpen) return;
    if (u) { viewerSet.i = i; showViewerPhoto(u, step); return; }
  }
}
function closeViewer(fromHistory = false) {
  if (!viewerOpen) return;
  document.getElementById('viewer').hidden = true;
  // Fermée par un appui : le retour qui suit repasse ici. `viewerOpen` reste vrai jusque-là, pour que la page Photos reste ouverte dessous (v201 : on retombait sur la fiche).
  if (!fromHistory) { history.back(); return; }
  viewerOpen = false;
  viewerSet = null;
}
{ // un appui ferme ; un glissement de côté change de photo (doigt vers la gauche : la suivante)
  const v = document.getElementById('viewer');
  const img = v.querySelector('img');
  let drag = null;
  let moved = false;
  const zoomed = () => (globalThis.visualViewport?.scale ?? 1) > 1.01; // photo agrandie à deux doigts : on laisse la page se déplacer
  globalThis.visualViewport?.addEventListener('resize', () => v.classList.toggle('zoomed', zoomed()));
  v.addEventListener('pointerdown', (e) => {
    moved = false;
    drag = e.isPrimary && !zoomed() && viewerSet?.ids.length > 1 ? { x: e.clientX, y: e.clientY } : null;
    if (drag) v.setPointerCapture?.(e.pointerId);
  });
  v.addEventListener('pointermove', (e) => {
    if (!drag || !e.isPrimary || !viewerSet) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 8 || Math.abs(e.clientY - drag.y) > 8) moved = true;
    const end = (dx > 0 && viewerSet.i === 0) || (dx < 0 && viewerSet.i === viewerSet.ids.length - 1);
    img.classList.add('drag');
    img.style.transform = `translateX(${end ? dx / 4 : dx}px)`; // au bout de la série, la photo résiste
  });
  const drop = (e) => {
    if (!drag) return;
    const step = e.type === 'pointerup' ? swipeStep(e.clientX - drag.x, e.clientY - drag.y) : 0;
    drag = null;
    img.classList.remove('drag');
    img.style.transform = '';
    if (step) stepViewer(step);
  };
  v.addEventListener('pointerup', drop);
  v.addEventListener('pointercancel', drop);
  v.addEventListener('click', () => { if (moved) { moved = false; return; } closeViewer(); });
}
window.addEventListener('popstate', () => { if (viewerOpen) closeViewer(true); });

/** « Ouvert · ferme à 22h30 », « Fermé · ouvre à 9h », ou null si horaires inconnus (même écriture que les tampons). */
function hoursLine(p, h = hoursOf(p)) {
  const st = openState(h);
  if (!st) return null;
  const left = minutesLeft(h);
  if (st.open && left != null && left <= 45) return `Ouvert · ferme dans ${left} min (${hhText(st.until)})`;
  if (st.open) return st.until ? `Ouvert · ferme à ${hhText(st.until)}` : 'Ouvert toute la journée';
  return st.opensAt ? `Fermé · ouvre à ${hhText(st.opensAt)}` : 'Fermé pour aujourd\'hui';
}
/**
 * Tampon d'état du jour, le même partout : Ouvert, Ferme dans 20 min, Ouvre à 14h, Fermé aujourd'hui (rien si horaires inconnus).
 * Avec `walk` (minutes à pied jusqu'au lieu, v196) : « Fermé à ton arrivée » quand la marche dépasse le temps qui reste.
 */
function stateTag(hours, walk = null) {
  const st = openState(hours);
  if (!st) return null;
  const left = minutesLeft(hours);
  if (closedOnArrival(hours, walk)) return el('span', { class: 'tag soon' }, 'Fermé à ton arrivée');
  if (st.open && left != null && left <= 45) return el('span', { class: 'tag soon' }, `Ferme dans ${left} min`);
  if (st.open) return el('span', { class: 'tag open' }, 'Ouvert');
  if (st.opensAt) return el('span', { class: 'tag soon' }, `Ouvre à ${hhText(st.opensAt)}`);
  // Fermé toute la journée, ou déjà fermé ce soir (le lieu a ouvert plus tôt) : on ne dit pas « aujourd'hui » à tort
  return el('span', { class: 'tag closed' }, opensThatDay(hours) ? 'Fermé' : 'Fermé aujourd\'hui');
}
function hoursTag(p, walk = null) { return stateTag(hoursOf(p), walk); }
/** Minutes à pied pour une distance connue, null sinon (pas de point de départ). */
const walkOf = (d) => (d == null ? null : walkMinutes(d));

/* ---------- Copier d'un appui (adresse, coordonnées) pour coller dans une autre appli ---------- */

async function copyText(text, done) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); toast(done); } catch { prompt('Copie ce texte :', text); }
}
/** Petit bouton « copier » ; getText est lu au moment de l'appui. */
const copyBtn = (getText, what, done) => el('button', { type: 'button', class: 'go-compass copy-btn', 'aria-label': `Copier ${what}`, title: `Copier ${what}`, onclick: () => copyText(getText(), typeof done === 'function' ? done() : done) }, ico('copy'));

/* ---------- Heures écrites en clair ; Prévoir : une sortie prévue, rappelée dans « Maintenant » le jour J ---------- */

/** « 19:00 » → « 19h », « 15:30 » → « 15h30 », « 00:00 » → « minuit ». */
function hhText(t) { return /^(24|00):00$/.test(t) ? 'minuit' : t.replace(/^0(\d)/, '$1').replace(':00', 'h').replace(':', 'h'); }
function hmText(d) { return `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`; }
/** La sortie prévue d'un brouillon (sortie de l'agenda, invitation reçue). */
function draftPlan(draft) {
  return { at: draft.ticketAt, ...(draft.ticketWith ? { with: draft.ticketWith } : {}), ...(isPart(draft.ticketPart) ? { part: draft.ticketPart } : {}) };
}

/* ---------- Prévoir (v152) : le jour et le moment en puces, l'heure précise seulement si on veut ---------- */
/** Prévoir (v199) : « Gratuit ici dimanche 6 décembre (1er dimanche du mois…) » quand le lieu a un jour gratuit dans les 35 jours. */
function freeNote(p) {
  const n = nextFreeFor(p);
  if (!n) return null;
  const day = n.k === 0 ? 'aujourd\'hui' : n.k === 1 ? 'demain' : dayTitle(n.date);
  return el('p', { class: 'help' }, el('b', {}, `Gratuit ici ${day}`), ` : ${n.when}.`);
}

function openPlan(p, back = null, { done: doneFn = null } = {}) {
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const now = new Date();
  const old = Number.isFinite(p.ticket?.at) && daysUntil(p.ticket.at) >= 0 ? p.ticket : null; // une sortie passée ne remplit rien
  const stored = !p.plan || (state.plans ?? []).some((x) => x.id === p.id); // sortie de l'agenda pas encore gardée : rien à retirer ni à envoyer
  const days = dayChoices(now);
  const oldDay = old ? days.find((d) => iso(d.date) === iso(new Date(old.at))) : null;
  let day = old ? (oldDay?.key ?? 'other') : null;
  let part = old ? (isPart(old.part) ? old.part : isDayList(old) ? null : 'time') : null; // liste du jour : ni moment ni heure
  const date = el('input', { type: 'date', min: iso(now), value: old ? iso(new Date(old.at)) : '' });
  const time = el('input', { type: 'time', value: old && !isPart(old.part) && !isDayList(old) ? `${pad(new Date(old.at).getHours())}:${pad(new Date(old.at).getMinutes())}` : '' });
  const dateField = el('label', { class: 'field' }, 'Date', date);
  const timeField = el('label', { class: 'field' }, 'Heure', time);
  const who = el('input', { type: 'text', maxlength: '40', autocomplete: 'off', placeholder: 'Léa, Tom…', value: old?.with ?? '' });
  const err = el('div', { class: 'error', role: 'alert' });
  const done = doneFn ?? (() => (p.plan ? openPlanning() : back ? openDetail(p.id, back) : openDetail(p.id)));
  const segBtn = (label, pressed, onPick) => el('button', { type: 'button', 'aria-pressed': String(pressed), onclick: onPick }, label);
  const daySeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Quel jour' });
  const partSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'À quel moment' });
  // v201 : aujourd'hui, pour un de mes lieux, le moment est facultatif : sans moment, le lieu va dans la liste du jour
  const partHelp = el('p', { class: 'help' }, 'Aujourd\'hui, le moment est facultatif : sans moment, le lieu va dans ta liste du jour (Mon planning).');
  const draw = () => {
    fill(daySeg, ...days.map((d) => segBtn(d.label, day === d.key, () => { day = d.key; err.textContent = ''; draw(); })),
      segBtn('Autre jour', day === 'other', () => { day = 'other'; err.textContent = ''; draw(); date.focus(); }));
    fill(partSeg, ...Object.entries(PARTS).map(([k, v]) => segBtn(v.label, part === k, () => { part = part === k ? null : k; err.textContent = ''; draw(); })), /* un second appui retire le moment */
      segBtn('Heure précise', part === 'time', () => { part = part === 'time' ? null : 'time'; err.textContent = ''; draw(); if (part) time.focus(); }));
    dateField.hidden = day !== 'other';
    timeField.hidden = part !== 'time';
    partHelp.hidden = p.plan || day !== 'j0';
  };
  draw();
  const save = () => {
    let d = days.find((x) => x.key === day)?.date ?? null;
    if (day === 'other') { const [y, mo, da] = date.value.split('-').map(Number); d = y ? new Date(y, mo - 1, da, 12) : null; }
    if (!d) { err.textContent = 'Choisis le jour.'; return; }
    if (!part && !p.plan && daysUntil(d.getTime()) === 0) {
      const mine = isDayList(p.ticket) && daysUntil(p.ticket.at) === 0;
      const list = dayList(state.points);
      if (!mine && list.length >= DAY_MAX) { err.textContent = `${DAY_MAX} lieux au plus dans la liste d'aujourd'hui.`; return; }
      p.ticket = dayTicket(mine ? p.ticket.list : list.length + 1, new Date(), who.value.trim().slice(0, 40));
      persist(); updateNow(true); renderMarkers(); updatePlanningCount();
      toast('Dans ta liste d\'aujourd\'hui', false, { label: 'Voir', fn: () => openPlanning() });
      done();
      return;
    }
    if (!part) { err.textContent = 'Choisis le moment.'; return; }
    const [h, mi] = time.value.split(':').map(Number);
    if (part === 'time' && !Number.isFinite(h)) { err.textContent = 'Choisis l\'heure.'; return; }
    delete p.missed; // v199 : une sortie manquée reprévue redevient une sortie comme les autres
    p.ticket = { at: planAt(d, part === 'time' ? null : part, h, mi || 0), ...(who.value.trim() ? { with: who.value.trim().slice(0, 40) } : {}), ...(part !== 'time' ? { part } : {}) };
    if (p.plan && !stored) state.plans = cleanPlans([...(state.plans ?? []), p]);
    rankDayList(dayList(state.points)); // un lieu sorti de la liste du jour ne laisse pas de trou dans les rangs
    persist(); updateNow(true); renderMarkers(); updatePlanningCount();
    toast(`Dans Mon planning : ${planText(p.ticket)}`, false, p.plan ? { label: 'Voir', fn: () => openPlanning() } : null);
    done();
  };
  const inviteNote = p.plan ? null : noteCheck(p);
  openSheet([ico('alarm-clock'), ` Prévoir · ${p.name}`], el('div', { class: 'stack' },
    el('div', { class: 'field' }, 'Quel jour ?', daySeg), dateField,
    el('div', { class: 'field' }, 'À quel moment ?', partSeg), partHelp, timeField,
    el('label', { class: 'field' }, 'Avec qui (facultatif)', who),
    err,
    freeNote(p),
    el('button', { type: 'button', class: 'btn c-guide solid', onclick: save }, ico('alarm-clock'), 'Enregistrer'),
    old && stored && !isDayList(old) ? inviteNote?.row : null, /* la liste du jour n'a ni heure ni moment à annoncer : pas d'invitation */
    old && stored && !isDayList(old) ? el('button', { type: 'button', class: 'btn c-add', onclick: () => invitePlace(p, Boolean(inviteNote?.box.checked)) }, ico('copy'), 'Copier le lien d\'invitation') : null,
    old && stored ? el('button', { type: 'button', class: 'btn danger', onclick: () => {
      if (p.plan) state.plans = (state.plans ?? []).filter((x) => x.id !== p.id); else delete p.ticket;
      rankDayList(dayList(state.points));
      persist(); updateNow(true); renderMarkers(); updatePlanningCount(); toast('Sortie retirée de Mon planning');
      if (p.plan) openPlanning(); else done();
    } }, 'Retirer de Mon planning') : null,
    el('p', { class: 'help' }, `Avec une heure précise, « Maintenant » sur la carte te dit le jour même à quelle heure partir (trajet à pied ou en métro, plus 5 min de marge). Avec un moment (matin, soir…), il te rappelle la sortie sans heure de départ.${p.plan ? '' : ' Un billet à montrer à l\'entrée : prends-le en photo avec le bouton Photo de la fiche.'} Rien ne part du téléphone, sauf si tu invites un proche : il reçoit le lieu, le jour et le moment.`),
    foot(p.plan ? (back ? backBtn(back) : null) : el('button', { type: 'button', class: 'btn', onclick: done }, '← Fiche')),
  ), { name: `plan:${p.id}` });
}

/** Prévoir une sortie de l'agenda : gardée dans Mon planning, sans devenir un de mes lieux. Heure de l'agenda proposée quand elle est connue. */
function planEvent(e, again) {
  const known = planOfEvent(state.plans, e);
  if (known) { openPlan(known, named('Sortie', again), { done: again }); return; }
  const slot = e.slotStart instanceof Date && e.slotStart.getTime() > Date.now() - 30 * 60000 ? e.slotStart.getTime() : null;
  openPlan({ id: newPhotoId(), name: String(e.title ?? '').trim().slice(0, 120), lat: e.lat, lng: e.lng, plan: true,
    ...(e.address ? { address: e.address } : {}), ...(e.place ? { place: e.place } : {}), ...(e.url ? { url: e.url } : {}),
    ...(slot ? { ticket: { at: slot } } : {}),
    ...(isExpo(e) && e.end instanceof Date && Number.isFinite(+e.end) ? { until: +e.end } : {}) }, named('Sortie', again), { done: again }); // v199 : la fin d'une expo, pour « encore à l'affiche »
}

/** Page d'une sortie de l'agenda prévue : Y aller, boussole, métro, changer le jour, retirer ; « Ajouter » la garde dans mes lieux. */
function openPlanSpot(x, back = null) {
  const again = () => openPlanSpot(x, back);
  openSpot({ icon: 'calendar-days', title: x.name, kicker: `Prévu ${planText(x.ticket)}${x.ticket.with ? ` avec ${x.ticket.with}` : ''}`,
    lines: [[x.place, x.address].filter(Boolean).join(' · '), 'Sortie de l\'agenda « Que faire à Paris ? ». Le lendemain, Mon planning te demande si tu y es allé. « Ajouter » la garde dans tes lieux.'],
    place: x, link: x.url ? [x.url, 'Voir dans « Que faire à Paris »'] : null, back, key: `sortieprevue:${x.id}`,
    add: { note: [x.place, x.url].filter(Boolean).join(' · ') },
    extra: x.by
      ? el('div', { class: 'stack' },
        el('p', { class: 'help' }, `Prévu par ${x.by}. Elle n'est pas encore dans ton propre planning : le lendemain, l'appli ne te demandera pas si tu y es allé.`),
        el('button', { type: 'button', class: 'btn c-disc', onclick: () => { const y = (state.plans ?? []).find((z) => z.id === x.id); if (y) delete y.by; persist(); updatePlanningCount(); toast(`« ${x.name} » est dans ton planning`); openPlanSpot(y ?? x, back); } }, ico('alarm-clock'), 'L\'ajouter à mon planning'),
        el('button', { type: 'button', class: 'btn', onclick: () => { state.plans = (state.plans ?? []).filter((z) => z.id !== x.id); persist(); updatePlanningCount(); toast(`« ${x.name} » retiré de Mon planning`); if (back) back(); else closeSheet(); } }, 'Retirer'))
      : el('button', { type: 'button', class: 'btn c-disc', onclick: () => openPlan(x, named(x.name, again), { done: again }) }, ico('alarm-clock'), 'Changer le jour ou retirer') });
}

/** Chercher dans OpenStreetMap les horaires d'un lieu déjà enregistré (même nom, à moins de 150 m). */
async function findHours(p, back) {
  toast('Recherche des horaires…');
  try {
    const res = await searchPlaces(p.name);
    const hit = res.filter((r) => r.hours && distanceM(r, p) < 150).sort((a, b) => distanceM(a, p) - distanceM(b, p))[0];
    if (!hit) { toast('Horaires introuvables pour ce lieu dans OpenStreetMap.', true); return; }
    p.hours = hit.hours;
    p.hoursAt = Date.now(); // v200
    persist();
    openDetail(p.id, back);
    toast('Horaires ajoutés');
  } catch {
    toast('La recherche ne répond pas. Vérifie ta connexion.', true);
  }
}

/** « Ajouté il y a 8 mois, jamais visité » ou « Visité le 3 mars 2026 ». */
function ageLine(p) {
  const did = didName(catOf(p.cat)); // « Déjà goûté »… (v162) ; par défaut, « Visité le 3 mars » comme avant
  if (p.done && did !== DID_DEFAULT) return p.visited ? `${did} (le ${formatDate(p.visited)})` : `${did} (date non notée)`;
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
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Un nom, une adresse, un artiste…', value: initial, 'aria-label': 'Chercher' });
  const list = el('ul', { class: 'items' });
  const info = el('p', { class: 'help' });

  const run = () => {
    const pos = freshHere();
    const res = searchPoints(visible(), state.categories, input.value, pos);
    info.textContent = !state.points.length
      ? 'Tu n\'as encore aucun lieu.'
      : res.length ? `${plural(res.length, 'de tes lieux', 'de tes lieux')}${pos ? ', du plus proche au plus loin' : ''}` : 'Aucun de tes lieux ne correspond.';
    fill(list, ...res.slice(0, 100).map(({ point: p, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, named('Recherche', () => openSearch(input.value))) },
        catDot(p.cat),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, favMark(p), p.name),
          el('span', { class: 'item-sub' }, [catOf(p.cat).name, d != null ? fmtDist(d) : null, p.done ? null : 'À faire'].filter(Boolean).join(' · '), p.stars ? ' ' : null, starsText(p.stars)))))));
  };
  const toDirectory = el('button', { type: 'button', class: 'btn', onclick: () => openPlaceSearch(input.value, true) });
  const bigBox = el('div', { class: 'stack' }); // grands lieux (liste de l'appli, rien n'est envoyé)
  const updateDir = () => {
    const q = input.value.trim();
    const big = findArtPlaces(q);
    fill(bigBox, ...(big.length ? [el('h3', { class: 'ring-title' }, el('span', {}, 'Grands lieux'), el('span', {}, String(big.length))),
      el('ul', { class: 'items' }, big.map((p) => el('li', { class: 'item' },
        el('button', { type: 'button', class: 'item-main', onclick: () => openArtPlaces(p.name, named('Recherche', () => openSearch(input.value))) },
          el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('landmark', { size: 18 })),
          el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, p.name), el('span', { class: 'item-sub' }, `${p.address} · expos et programme`))))))] : []));
    toDirectory.hidden = q.length < 3;
    fill(toDirectory, ico('search'), ` Chercher « ${q} » dans l'annuaire`);
    updateMore();
  };
  /* v158 : la loupe cherche aussi dans les listes gardées sur le téléphone (TTB, Navigo, galeries, art dans la rue),
     et dans l'agenda de la semaine sur demande. Rien n'est envoyé : chaque liste est la même pour tout le monde. */
  const moreBox = el('div', { class: 'stack' });
  const agendaBox = el('div', { class: 'stack' });
  const toAgenda = el('button', { type: 'button', class: 'btn c-disc', onclick: () => searchAgenda() });
  const back = named('Recherche', () => openSearch(input.value));
  const from = () => freshHere() ?? map.getCenter();
  const near = (xs) => xs.map((x) => ({ ...x, d: distanceM(from(), x) })).sort((a, b) => a.d - b.d);
  const block = (label, rows) => (rows.length ? [el('h3', { class: 'ring-title' }, el('span', {}, label), el('span', {}, String(rows.length))), el('ul', { class: 'items ev-list' }, rows.slice(0, 8))] : []);
  function updateMore() {
    const q = input.value.trim();
    const hit = (xs, ...keys) => near((xs ?? []).filter((x) => textMatch(q, ...keys.map((k) => x[k]))));
    fill(moreBox,
      ...block('TTB', hit(ttbOpen(), 'name', 'cuisine', 'rub', 'address').map((x) => sortieCard({ genre: 'ttb', badge: ttbDotFor(x.rub), name: x.name, onclick: () => openTtbPlace(x, back), sub: [x.rub, x.cuisine], d: x.d }))),
      ...block('Avantages Navigo', hit(navigoItems, 'name', 'kind').map((x) => navigoRow(x, back))),
      ...block('Galeries', hit(galleries, 'name', 'address').map((x) => galleryRow(x, back))),
      ...block('Art dans la rue', hit(streetArt, 'name', 'artist').map((a) => sortieCard({ genre: 'oeuvre', name: a.name, onclick: () => openStreetArtCard(a, back), sub: [a.type, a.artist], d: a.d }))),
      /* v198 : les plaques qui portent ce nom (mots entiers), le titre d'abord ; le fichier n'est lu qu'à la première recherche */
      ...block('Plaques commémoratives', plaquesFor(plaquesOf(plaquesData), q, from()).map((x) => plaqueRow(x, back))));
    if (!plaquesData && !updateMore.asked && q.replace(/\s/g, '').length >= 3) { updateMore.asked = true; loadPlaques().then((d) => { if (d) updateMore(); }); }
    toAgenda.hidden = q.replace(/\s/g, '').length < 3;
    fill(toAgenda, ico('calendar-days'), ` Chercher « ${q} » dans l'agenda de la semaine`);
    fill(agendaBox);
  }
  async function searchAgenda() {
    const q = input.value.trim();
    fill(agendaBox, el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris (tout Paris, 7 jours)…'));
    try { await weekEvents(); } catch { fill(agendaBox, el('p', { class: 'warn' }, 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.')); return; }
    if (input.value.trim() !== q) return;
    const far = 864e13;
    const seen = new Set();
    const found = (weekCache?.items ?? []).filter((e) => textMatch(q, e.title, e.place, e.tags))
      .filter((e) => { const k = `${e.title}|${e.place}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => (a.end?.getTime() ?? far) - (b.end?.getTime() ?? far));
    fill(agendaBox, ...(found.length ? [el('h3', { class: 'ring-title' }, el('span', {}, 'Agenda de la semaine'), el('span', {}, String(found.length))),
      el('ul', { class: 'items ev-list' }, found.slice(0, 30).map((e) => eventRow({ ...e, d: distanceM(from(), e) }, () => openSearch(q), { week: true })))]
      : [el('p', { class: 'empty' }, `Rien dans l'agenda de la semaine pour « ${q} ».`)]));
  }
  input.addEventListener('input', () => { run(); updateDir(); });
  run(); updateDir();
  openSheet([ico('search'), ' Chercher'], el('div', { class: 'stack' }, input, info, list, bigBox, moreBox, toAgenda, agendaBox, toDirectory,
    el('p', { class: 'help' }, 'Cherche dans tes lieux, les Grands lieux, TTB, les avantages Navigo, les galeries et l\'art dans la rue, sur ce téléphone. L\'agenda et l\'annuaire seulement quand tu les touches.')),
  { tall: true, name: 'search', again: () => openSearch(input.value) });
  input.focus();
  // Listes pas encore lues : chargées une fois (Navigo dans l'appli ; galeries et œuvres une fois par mois), puis la recherche se refait
  Promise.allSettled([loadNavigo(), loadGalleries(), loadStreetArt()]).then(() => { if (view === 'search') updateMore(); });
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
    el('button', { type: 'button', class: 'btn', onclick: () => openStationPicker() }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Choisir une station de métro'),
    el('button', { type: 'button', class: 'btn', onclick: openNear }, ico('rotate-cw'), 'Réessayer'),
  ), { name: 'fallback' });
}

function timeAgoShort(t) {
  const min = Math.round((Date.now() - t) / 60000);
  return min < 1 ? 'à l\'instant' : min < 60 ? `il y a ${min} min` : `il y a ${Math.round(min / 60)} h`;
}

/** Choisir une station pour voir ce qu'il y a autour en sortant (sans GPS). */
function openStationPicker(onPick = (st) => { origin = { lat: st.lat, lng: st.lng, acc: 0, time: Date.now(), kind: 'station', label: st.n }; renderNear(true); }, back = null) {
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
  openSheet([ico('train-front'), ' Choisir une station'], el('div', { class: 'stack' }, input, list, back ? foot(el('button', { type: 'button', class: 'btn', onclick: back.fn }, `← ${back.name}`)) : null),
    { tall: true, name: 'station', again: () => openStationPicker(onPick, back) });
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
  const pts = offered();
  const groups = groupByRings(pts, origin, nearRings(), { favBonus: minutesToMeters(5) }); // favoris en tête de leur cercle
  const inside = groups.reduce((n, g) => n + g.items.length, 0);
  const farther = pts.length - inside;
  const maxRing = nearRings().at(-1);

  const body = [];
  // Outils pour se déplacer, en haut pour les voir tout de suite
  const tool = (icon, label, onclick, pressed = null, family = 'c-guide') => el('button', {
    type: 'button', class: `tool ${family}${pressed ? ' on' : ''}`, onclick, 'aria-pressed': pressed == null ? null : String(pressed),
  }, el('span', { class: 'tool-ico', 'aria-hidden': 'true' }, typeof icon === 'string' && ICON_NAMES.has(icon) ? ico(icon) : icon), label);
  // 8 outils en 2 rangées de 4 (v176) : Où suis-je et Mon Paris rejoignent la grille, la liste commence plus haut.
  const pickStation = () => openStationPicker(undefined, { name: 'Autour de moi', fn: () => renderNear() });
  body.push(el('div', { class: 'tools' },
    tool('route', 'Itinéraire', () => openRoutes()),
    tool('calendar-days', 'Sorties', () => openEvents('near'), null, 'c-disc'),
    tool('shuffle', 'Surprise', () => surprise(), null, 'c-disc'),
    tool('book-open-text', 'Curiosités', () => openCuriosities(), null, 'c-disc'),
    tool('landmark', 'Monuments', () => openMonuments(), null, 'c-disc'),
    tool(el('b', { class: 'm-badge' }), 'Station', pickStation, null, 'c-metro'),
    origin.kind === 'station' ? tool(el('b', { class: 'm-badge' }), 'Autre station', pickStation, null, 'c-metro')
      : origin.kind === 'last' ? tool('refresh-cw', 'Réessayer', openNear)
        : tool('locate', 'Où suis-je\u00a0?', openWhereAmI), /* espace insécable : le « ? » ne passe pas seul à la ligne */
    tool('map', 'Mon Paris', () => openMyParis('near'), null, 'c-disc'),
  ));
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
    const arcs = arcadesNear(arcadesData ?? [], origin, ARCADE_RAIN_MIN);
    if (arcs.length) body.push(el('button', { type: 'button', class: 'btn c-disc', onclick: () => openArcadeList(arcs, ARCADE_RAIN_MIN, named('Autour de moi', renderNear)) },
      ico('door-open'), arcs.length === 1 ? `1 passage couvert à moins de ${ARCADE_RAIN_MIN} min` : `${arcs.length} passages couverts à moins de ${ARCADE_RAIN_MIN} min`));
  }
  if (following) {
    body.push(el('p', { class: 'help' }, ico('footprints', { size: 15 }), ` Cette balade : ${walkText(walkSession)} · aujourd'hui : ${walkText(todayWalk())}`));
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
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min `, starsText(p.stars), hoursTag(p, walkMinutes(d)), p.done ? null : el('span', { class: 'tag' }, 'À faire')))),
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
  if (state.showTtb && ttbList().length) {
    // Le guide, quand son calque est affiché : les 3 plus proches à moins de 15 min, puis toute la liste
    const ttbNear = ttbShown().map((x) => ({ x, d: distanceM(origin, x) })).filter((t) => t.d <= minutesToMeters(15)).sort((a, b) => a.d - b.d);
    body.push(el('h3', { class: 'ring-title' }, el('span', {}, 'TTB à moins de 15 min'), el('span', {}, String(ttbNear.length))));
    if (ttbNear.length) body.push(el('ul', { class: 'items' }, ttbNear.slice(0, 3).map(({ x, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openTtbPlace(x, named('Autour de moi', () => renderNear())) },
        ttbDotFor(x.rub),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, x.name), el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min · ${ttbKicker(x)}`))),
      el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass(x), 'aria-label': `Boussole vers ${x.name}` }, ico('compass')),
      el('a', { class: 'go', href: mapsUrl(x, d), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${x.name}` }, 'Y aller')))));
    body.push(el('button', { type: 'button', class: 'btn c-disc', style: 'width:100%', onclick: () => openTtbList(named('Autour de moi', () => renderNear())) }, ttbDotFor(''), 'Liste TTB'));
  }

  openSheet([ico('map-pinned'), ` ${nearTitle()}`], body, { name: 'near', again: () => renderNear() });
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
  const say = !following ? 'Afficher ma position et ma direction' : trackFollow ? 'Arrêter ma position et ma direction' : 'Recentrer sur ma position';
  b.setAttribute('aria-label', state.toolNames?.locate || state.toolLabels ? `${toolName('locate')} : ${say}` : say);
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
      for (const p of newlyNear(offered(), fix, signaled, 100)) signaled.add(p.id); // déjà proches : pas d'alerte
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
    const alerts = newlyNear(offered(), fix, signaled, 100);
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
  const found = onTheWay(offered(), from, dest).filter((x) => distanceM(x.point, dest) > 30);
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear(true) }, '← Autour de moi')),
  ];
  openSheet(`Vers ${dest.label}`, el('div', { class: 'stack' }, body), { tall: true, name: 'way', again: () => renderWay(from, dest) });
  nearLayer.clearLayers();
  L.polyline([[from.lat, from.lng], [dest.lat, dest.lng]], { color: ink(), weight: 3, dashArray: '8 8', interactive: false }).addTo(nearLayer);
  L.circleMarker([from.lat, from.lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#4c6ef5', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  L.circleMarker([dest.lat, dest.lng], { radius: 8, color: '#fff', weight: 3, fillColor: ink(), fillOpacity: 1, interactive: false }).addTo(nearLayer);
  const b = L.latLngBounds([[from.lat, from.lng], [dest.lat, dest.lng]]).pad(0.25);
  map.fitBounds(b, { paddingTopLeft: [10, 60], paddingBottomRight: [10, sheet.offsetHeight + 10], animate: false });
}

/* ---------- Relier des lieux ---------- */

function openRoutePicker(selected = new Set()) {
  track('Relier des lieux');
  const start = origin ?? freshHere();
  const pts = offered()
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
        el('span', { class: 'item-sub' }, [start ? fmtDist(d) : null, p.done ? didName(catOf(p.cat)) : 'À faire'].filter(Boolean).join(' · ')))));
  }));
  update();
  openSheet([ico('route'), ' Relier des lieux'], el('div', { class: 'stack' }, info, list, go), { tall: true, name: 'routepick', again: () => openRoutePicker(selected) });
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

async function sharePlace(p, withNote = false) {
  const c = catOf(p.cat);
  const url = placeLink(location.href, p, c.name, c.icon, { note: withNote });
  const text = `${p.name}${p.address ? ` — ${p.address}` : ''}`;
  try {
    if (navigator.share) { await navigator.share({ title: p.name, text, url }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Lien copié : colle-le dans un message.'); } catch { prompt('Copie ce lien :', url); }
}

/** Case « Avec ma note » (lien, QR code, invitation d'un seul lieu) : décochée à chaque fois, et seulement si le lieu a un commentaire. */
function noteCheck(p, onchange) {
  if (!p.note) return null;
  const box = el('input', { type: 'checkbox', class: 'check' });
  if (onchange) box.addEventListener('change', () => onchange(box.checked));
  const txt = String(p.note).replace(/\s+/g, ' ').trim();
  const row = el('label', { class: 'item-main check-row' }, box,
    el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, 'Avec ma note'),
      el('span', { class: 'item-sub' }, `Ton commentaire : « ${txt.length > 70 ? `${txt.slice(0, 68)}…` : txt} »`)));
  return { row, box };
}

/** Partager un lieu qui a un commentaire : on choisit d'abord s'il part avec (case décochée). Sans commentaire, Partager envoie tout de suite. */
function openSharePlace(p, back) {
  const nc = noteCheck(p);
  openSheet([ico('share-2'), ' Partager'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, p.name),
    nc?.row,
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => sharePlace(p, Boolean(nc?.box.checked)) }, ico('share-2'), 'Envoyer le lien'),
    el('button', { type: 'button', class: 'btn c-add', onclick: () => showQr(p, back, Boolean(nc?.box.checked)) }, ico('qr-code'), 'QR code'),
    el('p', { class: 'help' }, 'Ton proche ouvre le lien : le lieu s\'ouvre, prêt à être ajouté à sa carte. Ton commentaire ne part que si la case est cochée.'),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, '← Fiche')),
  ), { name: `partager:${p.id}` });
}

/** Inviter un proche à une sortie : copie le lien du lieu avec le jour et l'heure du billet (et mon prénom). Mon commentaire seulement si `withNote`. */
async function invitePlace(p, withNote = false) {
  if (!Number.isFinite(p.ticket?.at)) return;
  const c = p.plan ? { name: '', icon: '' } : catOf(p.cat);
  const url = placeLink(location.href, p, c.name, c.icon, { invite: (state.me ?? '').trim() || true, note: withNote });
  // Seulement le lien (ton proche voit le lieu, le jour et l'heure en l'ouvrant) : à coller dans un SMS ou un message
  try { await navigator.clipboard.writeText(url); toast(`Lien de l'invitation copié (${planText(p.ticket)}) : colle-le dans ton message.`); } catch { prompt('Copie ce lien :', url); }
}

/** Un lien reçu : on montre le lieu et on propose de l'ajouter (catégorie du même nom si elle existe). */
function receivePlace(r) {
  const cat = state.categories.find((c) => fold(c.name) === fold(r.catName))?.id;
  openForm({ name: r.name, lat: r.lat, lng: r.lng, address: r.address, hours: r.hours, note: r.note, stars: r.stars, cat, acc: null, ticketAt: r.ticketAt ?? undefined, ticketPart: r.ticketPart || undefined, ticketWith: r.withName || undefined });
  toast(r.ticketAt ? `Invitation : ${planText({ at: r.ticketAt, part: r.ticketPart })}. Enregistre pour l'avoir dans Mon planning.` : 'Lieu reçu par un lien : vérifie et enregistre.');
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('importer') }, '← Restaurer ou importer')),
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
    const r = await net(VELIB_PARIS);
    if (r.ok) { const list = parseVelibParis(await r.json()); if (list.length > 100) return list; }
  } catch { /* on essaie l'autre source */ }
  let info = null;
  try { const c = JSON.parse(localStorage.getItem(VELIB_KEY) ?? 'null'); if (c && Date.now() - c.t < 7 * 864e5) info = c.info; } catch { /* rien */ }
  const statusP = net(VELIB_STATUS).then((r) => r.json());
  if (!info) {
    const full = await (await net(VELIB_INFO)).json();
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
  keepVelib(stations);
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
    el('button', { type: 'button', class: 'btn c-metro', onclick: () => {
      setVelibLayer(!velibOn);
      if (velibOn) { nearLayer.clearLayers(); closeSheet(); } else showVelib(from);
    } }, ico('map'), velibOn ? 'Cacher les stations de la carte' : 'Toutes les stations sur la carte'),
    el('p', { class: 'help' }, `Données Vélib' Métropole en temps réel, reçues à ${hourText(velibAt)}. Une station qui n'a rien envoyé depuis plus d'une heure n'est pas proposée : ses nombres seraient sans doute faux.`),
  ), { name: 'velib', again: () => showVelib(from) });
  nearLayer.clearLayers();
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
  for (const s of list) L.circleMarker([s.lat, s.lng], { radius: 8, color: '#1B56E8', weight: 3, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  if (list.length) map.fitBounds(L.latLngBounds([[from.lat, from.lng], ...list.map((s) => [s.lat, s.lng])]).pad(0.4), { paddingTopLeft: [10, 60], paddingBottomRight: [70, sheet.offsetHeight + 10], maxZoom: 17, animate: false });
}

/* ---------- Calques Vélib' et Fontaines et WC (v150) : tout ce qui est dans la zone de la carte ----------
   Vu d'assez près seulement (LAYER_ZOOM), redessinés quand la carte s'arrête de bouger. Ni GPS demandé, ni carte déplacée.
   Vélib' : le temps de la session seulement (des nombres en temps réel ne doivent pas revenir seuls, périmés, à la prochaine
   ouverture) ; heure des données affichée ; au-delà de 10 min les nombres disparaissent ; pas de rechargement automatique. */
const velibLayer = L.layerGroup().addTo(map);
const pratLayer = L.layerGroup().addTo(map);
const layerNoteBtn = document.getElementById('layerNote');
let velibOn = false;
let velibAll = null;
let velibAt = 0;
let velibBusy = false;
let velibWasOld = false;
let pratAll = null;

function keepVelib(list) { velibAll = list; velibAt = Date.now(); velibWasOld = false; drawVelibLayer(); drawLayerNote(); }
function boxNow() { const b = map.getBounds().pad(0.2); return { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() }; }

async function loadVelibLayer() {
  if (velibBusy) return;
  velibBusy = true; drawLayerNote();
  let list = null;
  try { list = await velibStations(); } catch { toast('Les données Vélib\' ne répondent pas. Réessaie dans un moment.', true); }
  velibBusy = false;
  if (list) keepVelib(list); else drawLayerNote();
}

function setVelibLayer(on) {
  velibOn = on;
  if (!on) { velibLayer.clearLayers(); drawLayerNote(); return; }
  if (!velibAll || Date.now() - velibAt > VELIB_RECHECK_MS) loadVelibLayer(); else { drawVelibLayer(); drawLayerNote(); }
}

function drawVelibLayer() {
  velibLayer.clearLayers();
  if (!velibOn || !velibAll || map.getZoom() < LAYER_ZOOM) return;
  const now = Date.now();
  const old = velibOld(velibAt, now);
  const dock = velibNeed === 'dock';
  for (const s of inBox(velibAll, boxNow())) {
    const n = old ? null : velibCount(s, velibNeed, now);
    const cls = n == null ? ' unknown' : n ? '' : ' zero';
    const label = n == null ? `Vélib' ${s.name} : nombre inconnu` : `Vélib' ${s.name} : ${dock ? plural(n, 'place libre', 'places libres') : plural(n, 'vélo', 'vélos')}`;
    L.marker([s.lat, s.lng], { keyboard: true, title: label, alt: label, zIndexOffset: -60,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="vb-pin${dock ? ' dock' : ''}${cls}">${n == null ? svgIcon('bike', { size: 14, stroke: 2.2 }) : n}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }) }) // zone d'appui de 40 px autour d'un dessin de 30
      .on('click', () => openVelibStation(s.id)).addTo(velibLayer);
  }
}

/** Une station touchée sur la carte : on recharge d'abord si les données ont plus de 2 minutes. */
async function openVelibStation(id) {
  if (Date.now() - velibAt > VELIB_RECHECK_MS) { toast('Mise à jour des Vélib\'…'); await loadVelibLayer(); hideToast(); }
  const s = velibAll?.find((x) => x.id === id);
  if (!s) return;
  const now = Date.now();
  const st = velibState(s, now);
  const lines = velibOld(velibAt, now) ? ['Données trop anciennes : touche « Mettre à jour » pour voir les vélos et les places.']
    : st === 'silent' ? ['Cette station n\'a rien envoyé depuis plus d\'une heure. Ses nombres seraient sans doute faux : l\'appli ne les montre pas.']
      : [
        s.open ? `${plural(s.bikes, 'vélo', 'vélos')} : ${s.mech} mécanique${s.mech > 1 ? 's' : ''}, ${s.ebike} électrique${s.ebike > 1 ? 's' : ''}.` : 'Prêt fermé : pas de vélo à prendre ici.',
        s.ret === false ? 'Retour fermé : pas de vélo à rendre ici.' : `${plural(s.docks, 'place libre', 'places libres')} pour rendre un vélo.`,
      ];
  lines.push(velibAt ? `Données Vélib' Métropole reçues à ${hourText(velibAt)}.` : '');
  openSpot({ icon: 'bike', title: s.name, kicker: 'Station Vélib\'', lines, place: s, key: `velib:${s.id}`,
    extra: el('button', { type: 'button', class: 'btn c-metro', onclick: async () => { await loadVelibLayer(); openVelibStation(id); } }, ico('refresh-cw'), 'Mettre à jour') });
}

async function loadPratLayer() {
  const [f, tv, tr] = await Promise.all([loadPratique('fontaines'), loadPratique('toilettes'), loadRatpToilets()]);
  pratAll = [...f.map((x) => ({ ...x, kind: 'eau' })), ...tv.map((x) => ({ ...x, kind: 'wc' })), ...tr.map((x) => ({ ...x, kind: 'wc' }))].filter((x) => x.ok !== false); // hors service : écartés, comme dans Fontaine et WC
  if (!pratAll.length && state.showPratique) toast('Les données de la Ville de Paris ne répondent pas. Vérifie ta connexion et réessaie.', true);
  drawPratLayer(); drawLayerNote();
}

function setPratLayer(on) {
  state.showPratique = on; persist();
  if (!on) { pratLayer.clearLayers(); drawLayerNote(); return; }
  if (pratAll) { drawPratLayer(); drawLayerNote(); } else loadPratLayer();
}

function drawPratLayer() {
  pratLayer.clearLayers();
  if (!state.showPratique || !pratAll || map.getZoom() < LAYER_ZOOM) return;
  for (const x of inBox(pratAll, boxNow())) {
    const shut = x.hours ? openState(x.hours)?.open === false : false; // fermé en ce moment, d'après les horaires publiés
    const icon = x.kind === 'wc' ? 'toilet' : 'glass-water';
    const label = `${x.kind === 'wc' ? 'Toilettes' : 'Fontaine'} : ${x.label}${shut ? ' (fermé en ce moment)' : ''}`;
    L.marker([x.lat, x.lng], { keyboard: true, title: label, alt: label, zIndexOffset: -70,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pr-pin lite${shut ? ' shut' : ''}">${svgIcon(icon, { size: 14 })}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }) })
      .on('click', () => openPratSpot(x)).addTo(pratLayer);
  }
}

function openPratSpot(x) {
  const wc = x.kind === 'wc';
  openSpot({ icon: wc ? 'toilet' : 'glass-water', title: x.label, kicker: wc ? 'Toilettes publiques' : 'Fontaine à boire',
    lines: [x.hours ? stateTag(x.hours) : null, x.detail, x.extra], place: x, key: `prat:${x.kind}:${x.lat},${x.lng}` });
}

/** L'étiquette sous la barre du haut : « Zoome pour voir… », ou l'heure des Vélib' et « Mettre à jour ». */
function drawLayerNote() {
  const n = layerNoteOf({ velib: velibOn, pratique: Boolean(state.showPratique), zoom: map.getZoom(), at: velibAt, busy: velibBusy, need: velibNeed });
  layerNoteBtn.hidden = !n;
  if (!n) return;
  fill(layerNoteBtn, ico(n.act === 'zoom' ? 'zoom-in' : 'bike'), n.text);
  layerNoteBtn.disabled = !n.act;
}
layerNoteBtn.addEventListener('click', () => {
  const n = layerNoteOf({ velib: velibOn, pratique: Boolean(state.showPratique), zoom: map.getZoom(), at: velibAt, busy: velibBusy, need: velibNeed });
  if (n?.act === 'zoom') map.setZoom(LAYER_ZOOM);
  else if (n?.act === 'refresh') loadVelibLayer();
});
map.on('moveend', () => { drawVelibLayer(); drawPratLayer(); drawLayerNote(); });
// Chaque minute, tant que le calque Vélib' est allumé : l'heure reste juste, et après 10 min les nombres s'effacent.
setInterval(() => {
  if (!velibOn) return;
  const old = velibOld(velibAt);
  if (old !== velibWasOld) { velibWasOld = old; drawVelibLayer(); }
  drawLayerNote();
}, 60e3);

/* ---------- Mon Paris : les arrondissements explorés ---------- */

// Contours des 20 arrondissements (data/arrondissements.json, refaits chaque mois par le robot) : l'arrondissement de
// chaque lieu est trouvé sur le téléphone, d'après sa position, à chaque ouverture (un lieu déplacé change de case).
let arrData = null;
let arrUpdated = '';
/** Arrêts de bus et leurs lignes (data/bus.json, v148) : lus seulement pour Rentrer et Mes stations (fichier de plusieurs centaines de Ko). */
/** Plaques commémoratives (data/plaques.json, v159) : lues seulement à l'ouverture de Curiosités (fichier de plusieurs centaines de Ko). */
/** Contours des secteurs « Paris Respire » (data/respire.json, robot ; v197) : lus à la demande. */
let respireData = null;
const loadRespire = async () => (respireData ??= await fetch('data/respire.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
/** Origine du nom des voies (data/voies.json, robot ; v198) : lue à la demande par « Où suis-je ? ». */
let voiesData = null;
const loadVoies = async () => (voiesData ??= await fetch('data/voies.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
let plaquesData = null;
const loadPlaques = async () => (plaquesData ??= await fetch('data/plaques.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
let busData = null;
const loadBus = async () => (busData ??= await fetch('data/bus.json').then((r) => (r.ok ? r.json() : null)).catch(() => null));
const busReady = () => Boolean(busData?.stops?.length);
const loadArr = async () => (arrData ??= await fetch('data/arrondissements.json').then((r) => (r.ok ? r.json() : null))
  .then((j) => { arrUpdated = typeof j?.updated === 'string' ? j.updated : ''; return j; }).catch(() => null));
loadArr().then(() => { drawArrNums(); drawWx(); });
setInterval(() => { if (!document.hidden) drawWx(); }, 60000); // l'arrondissement de la pastille s'efface quand la position vieillit

/* ---------- Numéros des arrondissements sur la carte (v193) : de loin (zoom 14 et moins), pour apprendre où ils sont ---------- */

map.createPane('arrNums').style.zIndex = 390; // sous les gouttes et les calques, au-dessus du fond de carte
const arrNumsLayer = L.layerGroup().addTo(map);
function drawArrNums() {
  arrNumsLayer.clearLayers();
  mapEl.classList.toggle('arr-nums-off', state.showArrNums === false);
  if (!Array.isArray(arrData?.arr)) return;
  const renderer = L.svg({ pane: 'arrNums' });
  for (const a of arrData.arr) {
    const rings = (a.rings ?? []).map((r) => r.map(([x, y]) => [y, x]));
    L.polygon(rings, { renderer, pane: 'arrNums', className: 'arr-limit', weight: 1.5, fill: false, interactive: false }).addTo(arrNumsLayer);
    const at = arrLabelPoint(a.rings);
    if (at) L.marker(at, { pane: 'arrNums', interactive: false, keyboard: false,
      icon: L.divIcon({ className: 'arr-num-wrap', html: `<span class="arr-num">${a.n}<small>${a.n === 1 ? 'er' : 'e'}</small></span>`, iconSize: [0, 0] }) }).addTo(arrNumsLayer);
  }
}

/* ---------- Filtres → Arrondissement (v182) : un appui sur une case ne garde que mes lieux de cet arrondissement ;
   v202 : leur liste s'ouvre sous la carte, et l'arrondissement ne dure que le temps de cette liste ---------- */

const arrCache = new Map(); // arrondissement d'une position, calculé une fois sur le téléphone
/** Arrondissement d'un lieu d'après sa position (null hors de Paris ou contours pas encore lus). */
function arrOfPoint(p) {
  if (!arrData) return null;
  const k = `${p.lat},${p.lng}`;
  if (!arrCache.has(k)) arrCache.set(k, arrAt(p.lat, p.lng, arrData));
  return arrCache.get(k);
}
const arrOrd = (n) => (n === 1 ? '1er' : `${n}e`);
const arrZone = (n) => (Array.isArray(arrData?.arr) ? arrData.arr.find((a) => a.n === n) : null);
/** Contour pointillé de l'arrondissement choisi ; rien quand le filtre est éteint. */
function drawArrOutline() {
  arrLayer.clearLayers();
  const z = filt.arr ? arrZone(filt.arr) : null;
  if (!z) return;
  const rings = z.rings.map((r) => r.map(([x, y]) => [y, x]));
  // Voile gris sur tout ce qui est hors de l'arrondissement (le monde moins ses contours) : l'intérieur garde la vraie carte
  L.polygon([[[85, -180], [85, 180], [-85, 180], [-85, -180]], ...rings], { stroke: false, fillColor: isDark() ? '#000000' : ink(), fillOpacity: isDark() ? 0.45 : 0.28, interactive: false }).addTo(arrLayer);
  L.polygon(rings, { color: ink(), weight: 3, dashArray: '8 6', fill: false, interactive: false }).addTo(arrLayer);
}
/** La grille des 20 arrondissements (même plan schématique que Mon Paris), avec le nombre de mes lieux dans chacun. */
function arrPicker() {
  if (!arrData) { loadArr().then(() => { if (arrData && shownKey === 'filters') openFilters(); }); return el('p', { class: 'help' }, 'Les contours des arrondissements n\'ont pas pu être lus. Rouvre Filtres avec du réseau.'); }
  const by = new Map();
  for (const p of state.points) { const a = arrOfPoint(p); if (a) by.set(a, (by.get(a) ?? 0) + 1); }
  return el('div', { class: 'arr-grid arr-pick' }, Object.entries(ARR_GRID).map(([k, [c, r]]) => {
    const a = Number(k); const m = by.get(a) ?? 0;
    return el('button', { type: 'button', class: 'arr', style: `grid-column:${c + 1};grid-row:${r + 1}`,
      'aria-label': `${arrOrd(a)} arrondissement : ${plural(m, 'lieu', 'lieux')}`, onclick: () => pickArr(a) },
    el('b', {}, arrOrd(a)), el('span', {}, String(m)));
  }));
}
/** Choisit l'arrondissement : la liste de mes lieux s'ouvre, la carte se place dessus au-dessus de la liste et dessine son contour
 * (exception voulue : c'est le but de l'appui, sur une case de Filtres comme sur la carte). */
function pickArr(n) {
  filt.arr = n;
  if (view === 'arrlist') { setSheetMini(false); sheetBody.scrollTop = 0; } else openArrList(n); /* un autre arrondissement : la liste repart du haut, en grand */
  refresh(); /* la carte, le voile, et la liste (refresh la redessine quand elle est affichée) */
  const z = arrZone(n);
  if (z) map.fitBounds(L.latLngBounds(z.rings.flat().map(([x, y]) => [y, x])), { paddingTopLeft: [10, 60], paddingBottomRight: [70, sheet.offsetHeight + 10], animate: false });
}
/** Mes lieux de l'arrondissement, rangés par catégorie (v202). Les boutons du haut et les autres filtres s'y appliquent comme sur la carte. */
function openArrList(n) {
  const here = (p) => arrOfPoint(p) === n;
  const pts = visible().filter(here);
  const back = named(`Mes lieux du ${arrOrd(n)}`, () => openArrList(n));
  const row = (p) => el('li', { class: 'item' },
    el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, back) },
      catDot(p.cat),
      el('span', { class: 'item-text' },
        el('span', { class: 'item-name' }, favMark(p), p.name),
        el('span', { class: 'item-sub' }, [p.address || null, p.done ? null : 'À faire'].filter(Boolean).join(' · '), p.stars ? ' ' : null, starsText(p.stars)))));
  openSheet([ico('map'), ` Mes lieux du ${arrOrd(n)}`], el('div', { class: 'stack' },
    pts.length ? null : el('p', { class: 'empty' }, state.points.some(here) ? 'Aucun de tes lieux ici avec les filtres choisis.' : 'Aucun de tes lieux dans cet arrondissement.'),
    pts.length ? null : el('p', { class: 'help' }, 'Touche un autre arrondissement sur la carte.'),
    ...arrGroups(pts, state.categories).flatMap((g) => [
      el('h3', { class: 'ring-title' }, el('span', {}, catOf(g.cat).name), el('span', {}, String(g.rows.length))),
      el('ul', { class: 'items' }, g.rows.map(row))]),
    foot(backBtn(openFilters)),
  ), { name: 'arrlist', again: () => openArrList(n) });
}
/* Liste d'un arrondissement affichée (même réduite) : toucher un autre arrondissement sur la carte ouvre le sien.
   Sans arrondissement choisi, un appui sur la carte ne fait toujours rien. Un lieu ou un calque touché garde son propre rôle. */
map.on('click', (e) => {
  if (view !== 'arrlist' || moving || e.originalEvent?.target?.closest?.('.leaflet-interactive, .leaflet-marker-icon')) return;
  const n = arrTap(e.latlng.lat, e.latlng.lng, filt.arr, arrData);
  if (n) pickArr(n);
});

let myParisBack = 'settings';
async function openMyParis(from = null) {
  if (from) myParisBack = from;
  await loadArr();
  const by = new Map();
  const mine = state.points.filter((p) => !p.owner); // les lieux d'un proche ne colorent pas mon Paris
  let outside = 0;
  for (const p of mine) {
    const a = arrAt(p.lat, p.lng, arrData);
    if (!a) { outside++; continue; }
    const e = by.get(a) ?? { done: 0, all: 0 };
    e.all++; if (p.done) e.done++;
    by.set(a, e);
  }
  const explored = [...by.values()].filter((e) => e.done).length;
  const inParis = mine.length - outside;
  const ord = (n) => (n === 1 ? '1er' : `${n}e`);
  const tiles = Object.entries(ARR_GRID).map(([n, [c, r]]) => {
    const e = by.get(Number(n)) ?? { done: 0, all: 0 };
    const level = e.done >= 5 ? 3 : e.done >= 2 ? 2 : e.done ? 1 : 0;
    return el('div', { class: `arr l${level}`, style: `grid-column:${c + 1};grid-row:${r + 1}`, role: 'img', 'aria-label': `${ord(Number(n))} : ${e.done} visité${e.done > 1 ? 's' : ''} sur ${e.all}` },
      el('b', {}, ord(Number(n))), el('span', {}, e.all ? `${e.done}/${e.all}` : '–'));
  });
  const planned = plannedPoints().length;
  openSheet([ico('map'), ' Mon Paris et mes chiffres'], el('div', { class: 'stack' },
    el('div', { class: 'menu' }, el('button', { type: 'button', class: 'menu-row c-disc', onclick: () => openPlanning('myparis') },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('alarm-clock')),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Mon planning'), el('span', { class: 'menu-sub' }, planned ? `${plural(planned, 'sortie prévue', 'sorties prévues')}` : 'Aucune sortie prévue')),
      el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right')))),
    el('div', { class: 'menu' }, el('button', { type: 'button', class: 'menu-row c-add', onclick: () => openJournal() },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('book-open-text')),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Mon journal'), el('span', { class: 'menu-sub' }, (() => { const k = cleanNotes(state.notes).length; const n = journalItems().length - k; return [n ? plural(n, 'passage noté', 'passages notés') : '', k ? plural(k, 'note', 'notes') : ''].filter(Boolean).join(' · ') || 'Tes passages, tes sorties et tes notes'; })())),
      el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right')))),
    el('p', { class: 'summary' }, `${explored} arrondissement${explored > 1 ? 's' : ''} sur 20 où tu as visité au moins un lieu.`),
    el('div', { class: 'arr-grid' }, tiles),
    el('div', { class: 'arr-legend', 'aria-hidden': 'true' }, el('span', { class: 'arr l0' }), ' aucun', el('span', { class: 'arr l1' }), ' 1', el('span', { class: 'arr l2' }), ' 2 à 4', el('span', { class: 'arr l3' }), ' 5 et +'),
    el('p', { class: 'help' }, arrData
      ? `Chaque case : lieux visités / lieux enregistrés. ${plural(inParis, 'lieu', 'lieux')} dans Paris${outside ? `, ${plural(outside, 'hors de Paris', 'hors de Paris')} (non comptés)` : ''}${state.points.length > mine.length ? `. Les lieux de tes proches ne sont pas comptés` : ''}. L'arrondissement vient de la position du lieu, calculée sur ton téléphone. Plan schématique.`
      : 'Les contours des arrondissements n\'ont pas pu être lus : rouvre Mon Paris avec du réseau.'),
    ...myStats(),
    foot(myParisBack === 'near' && origin
      ? el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')
      : el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages')),
  ), { tall: true, name: 'myparis', again: openMyParis });
}

/* ---------- Mon planning : les sorties prévues (Prévoir), rangées par jour ; la veille et avant : « Tu y es allé ? ». ---------- */

/** v199 : une expo prévue encore à l'affiche après aujourd'hui (date de fin gardée au moment de Prévoir). */
const stillOn = (p) => Number.isFinite(p.until) && p.until >= new Date(new Date().setHours(23, 59, 59, 999)).getTime();
const untilText = (p) => new Date(p.until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** Sorties prévues à partir d'aujourd'hui. */
function plannedPoints() { const t = new Date().setHours(0, 0, 0, 0); return [...state.points, ...(state.plans ?? [])].filter((p) => Number.isFinite(p.ticket?.at) && p.ticket.at >= t); }
/** Ouvre ce qui est prévu : la fiche d'un de mes lieux, ou la page d'une sortie de l'agenda. */
function openPlanned(x, back = null) { if (x.plan) openPlanSpot(x, back); else if (back) openDetail(x.id, back); else openDetail(x.id); }
/** Nombre de jours entre aujourd'hui et la date (0 = aujourd'hui, 1 = demain). */
function daysUntil(at) { const d = new Date(at); return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date().setHours(0, 0, 0, 0)) / 864e5); }
/** La prochaine sortie prévue après aujourd'hui, dans les 7 jours (sinon null). */
function nextPlanned() { return plannedPoints().filter((p) => { const k = daysUntil(p.ticket.at); return k >= 1 && k <= 7; }).sort((a, b) => a.ticket.at - b.ticket.at)[0] ?? null; }
/** Le chiffre du bouton Planning de la carte (rien quand aucune sortie n'est prévue). */
function updatePlanningCount() {
  const b = document.getElementById('btnPlanning');
  if (!b) return;
  const n = plannedPoints().length;
  const c = b.querySelector('.map-count');
  c.textContent = n > 9 ? '9+' : String(n);
  c.hidden = !n;
  b.setAttribute('aria-label', n ? `Mon planning : ${plural(n, 'sortie prévue', 'sorties prévues')}` : 'Mon planning : aucune sortie prévue');
  // Mon planning rangé dans « Plus » : son chiffre passe sur ⋯
  const more = document.getElementById('btnMore');
  if (!more) return;
  const inMore = cleanMore(state.moreTools, cleanHidden(state.hiddenTools)).includes('planning');
  const mc = more.querySelector('.map-count');
  mc.textContent = c.textContent;
  mc.hidden = !inMore || !n;
  more.setAttribute('aria-label', inMore && n ? `Plus de boutons (Mon planning : ${plural(n, 'sortie prévue', 'sorties prévues')})` : 'Plus de boutons');
}
/** Ce que la ligne d'une sortie doit dire en plus : départ (aujourd'hui), lieu fermé à cette heure-là, météo du jour. */
function planInfo(p) {
  const at = new Date(p.ticket.at);
  const out = [];
  // Heure précise : fermé à cette heure-là. Moment de la journée : fermé seulement s'il l'est à chaque demi-heure du moment.
  const sts = hoursOf(p) ? planTimes(p.ticket).map((t) => openState(hoursOf(p), t)) : [];
  if (sts.length && sts.every((st) => st && !st.open)) {
    const st = sts[0];
    out.push(el('span', { class: 'plan-note bad' }, ico('clock'), isPart(p.ticket.part)
      ? ` Fermé ${PARTS[p.ticket.part].when} ce jour-là`
      : ` Fermé à cette heure-là${st.opensAt ? ` (ouvre à ${hhText(st.opensAt)})` : ''}`));
  }
  if (!isPart(p.ticket.part) && daysUntil(p.ticket.at) === 0 && p.ticket.at > Date.now()) {
    const { leave, travel, how } = departureFor(p, freshHere());
    if (leave) out.push(el('span', { class: 'plan-note' }, ico('footprints'), ` ${leave <= new Date() ? 'Pars maintenant' : `Pars à ${hmText(leave)}`} · ≈ ${travel} min ${how}`));
  }
  const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const w = planWeather(forecast?.days?.[key], p.covered);
  if (w) out.push(el('span', { class: 'plan-note' }, ico(w.startsWith('Pluie') ? 'cloud-rain' : 'thermometer-sun'), ` ${w}`));
  return out;
}
/* Prévisions de Paris pour le planning : centre de Paris (aucune position envoyée), gardées 3 heures. */
let forecast = null;
function loadForecast() {
  if (!navigator.onLine || (forecast && Date.now() - forecast.time < 3 * 3600e3)) return;
  forecast = { time: Date.now(), days: forecast?.days ?? {} };
  net(forecastUrl()).then((r) => (r.ok ? r.json() : null)).then((j) => {
    forecast = { time: Date.now(), days: readForecast(j) };
    if (view === 'planning') openPlanning();
  }).catch(() => {});
}
let planningBack = 'myparis'; // d'où l'on vient : la carte (bouton de la colonne) ou Mon Paris
function openPlanning(from = null) {
  if (typeof from === 'string') planningBack = from;
  track('Mon planning');
  loadForecast();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  state.plans = cleanPlans(state.plans); // une sortie de l'agenda s'efface 30 jours après (Tu y es allé ? avant)
  dropStaleDayList();
  const items = plannedPoints().filter((p) => !isDayList(p.ticket)).sort((a, b) => a.ticket.at - b.ticket.at);
  const back = named('Mon planning', () => openPlanning());
  const dayLabel = (d) => {
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - today) / 864e5);
    const date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    return days === 0 ? `Aujourd'hui · ${date}` : days === 1 ? `Demain · ${date}` : date.charAt(0).toUpperCase() + date.slice(1);
  };
  // Le lendemain (v152) : « Tu y es allé ? ». Oui = Déjà visité, à la date prévue ; Non = la sortie s'efface (v199 : sauf une expo encore à l'affiche).
  // v158 : aussi pour une sortie de l'agenda (Oui = une ligne dans Mon journal) ; le message propose d'écrire un mot.
  const answer = (p, yes) => {
    const at = p.ticket.at;
    // v199 : « Non » sur une expo encore à l'affiche la garde, avec « Prévoir un autre jour » ou « Retirer »
    if (!yes && p.plan && !p.missed && stillOn(p)) { p.missed = true; persist(); openPlanning(); toast(`« ${p.name} » : encore à l'affiche jusqu'au ${untilText(p)}`); return; }
    if (p.plan) {
      state.plans = (state.plans ?? []).filter((x) => x.id !== p.id);
      if (yes) state.outings = cleanOutings([outingOf(p), ...(state.outings ?? [])].filter(Boolean));
    } else {
      if (yes) markDone(p, true, at);
      delete p.ticket;
    }
    persist(); renderMarkers(); updateNow(true);
    openPlanning();
    if (!yes) { toast(`« ${p.name} » retiré de Mon planning`); return; }
    toast(p.plan ? `« ${p.name} » : dans Mon journal` : `« ${p.name} » : ${didLower(catOf(p.cat))}`, false, { label: 'Écrire une impression',
      fn: () => (p.plan ? openOuting(p.id, named('Mon planning', () => openPlanning())) : openPassage(p, named('Mon planning', () => openPlanning()), cleanPassages(p.passages).find((x) => new Date(x.at).toDateString() === new Date(at).toDateString())?.at ?? null)) });
  };
  const past = pastPlans([...state.points, ...(state.plans ?? [])]);
  const removePlan = (p) => { state.plans = (state.plans ?? []).filter((x) => x.id !== p.id); persist(); renderMarkers(); updateNow(true); openPlanning(); toast(`« ${p.name} » retiré de Mon planning`); };
  const pastBlock = past.length ? [
    el('h3', { class: 'ring-title' }, el('span', {}, 'Tu y es allé ?'), el('span', {}, String(past.length))),
    el('ul', { class: 'items' }, past.map((p) => el('li', { class: 'item past-plan' },
      el('span', { class: 'item-text' },
        el('span', { class: 'item-name' }, p.name),
        el('span', { class: 'item-sub' }, p.missed ? (stillOn(p) ? `Pas allé · encore à l'affiche jusqu'au ${untilText(p)}` : 'Pas allé · l\'expo est finie')
          : [planText(p.ticket).replace(/^./, (c) => c.toUpperCase()), p.ticket.with ? `avec ${p.ticket.with}` : ''].filter(Boolean).join(' · '))),
      p.missed ? el('div', { class: 'row' },
        stillOn(p) ? el('button', { type: 'button', class: 'btn c-guide', onclick: () => openPlan(p, named('Mon planning', () => openPlanning()), { done: () => openPlanning() }) }, 'Prévoir un autre jour') : null,
        el('button', { type: 'button', class: 'btn', onclick: () => removePlan(p) }, 'Retirer'))
        : el('div', { class: 'row' },
          el('button', { type: 'button', class: 'btn c-add', onclick: () => answer(p, true), 'aria-label': `Oui, je suis allé à ${p.name}` }, ico('check'), 'Oui'),
          el('button', { type: 'button', class: 'btn', onclick: () => answer(p, false), 'aria-label': `Non, pas allé à ${p.name}` }, 'Non'))))),
  ] : [];
  const groups = [];
  for (const p of items) {
    const label = dayLabel(new Date(p.ticket.at));
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(p);
  }
  /* v192 : la ligne n'a plus de boutons (charte) ; la flèche dit qu'elle s'ouvre. Boussole : sur la page ; invitation : Prévu → Copier le lien d'invitation */
  const planLine = (p) => el('li', { class: 'item' },
    el('button', { type: 'button', class: 'item-main', onclick: () => openPlanned(p, back) },
      el('span', { class: 'plan-time' }, planClock(p.ticket)),
      el('span', { class: 'item-text' },
        el('span', { class: 'item-name' }, p.name),
        el('span', { class: 'item-sub' }, [p.by ? `Prévu par ${p.by}` : '', p.ticket.with ? `avec ${p.ticket.with}` : '', p.plan ? (p.place || 'Sortie de l\'agenda') : catOf(p.cat).name, arrLabel(p)].filter(Boolean).join(' · ')),
        ...planInfo(p)),
      el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))));
  /* v201 : « Aujourd'hui » toujours en tête. La liste du jour (mes lieux sans heure, dans mon ordre) : le prochain lieu avec Y aller,
     Boussole, Métro (ordre de la charte) et Fait ; les lignes n'ont pas de boutons ; l'ordre se change sur une page à part. */
  const todayLabel = dayLabel(new Date());
  const timed = groups[0]?.label === todayLabel ? groups.shift().items : [];
  const list = dayList(state.points);
  const next = list[0] ?? null;
  const pos = freshHere();
  const dNext = next && pos ? distanceM(pos, next) : null;
  const tagNext = next ? hoursTag(next) : null; // dit seulement ce qui demande d'y penser : « Ouvre à 14h », « Ferme dans 20 min », « Fermé »
  const todayBlock = [
    el('h3', { class: 'ring-title' }, el('span', {}, todayLabel), list.length + timed.length ? el('span', {}, String(list.length + timed.length)) : null),
    next ? el('p', { class: 'summary day-next' }, `Prochain lieu : ${next.name}`, tagNext && !tagNext.classList.contains('open') ? [' ', tagNext] : null) : null,
    next ? el('a', { class: 'btn primary go-bar', href: mapsUrl(next, dNext ?? 1000), target: '_blank', rel: 'noopener' },
      ico('arrow-right'), dNext != null ? `Y aller · ${fmtWalk(dNext).replace(/ /g, '\u00a0')}` : 'Y aller', dNext != null ? el('small', { class: 'go-dist' }, fmtDist(dNext)) : null) : null,
    next ? el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(next) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan(next, back), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => dayDone(next), 'aria-label': `Fait : ${next.name}` }, ico('check'), 'Fait')) : null,
    next ? el('ol', { class: 'items' }, list.map((p, i) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, back) },
        el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, p.name),
          el('span', { class: 'item-sub' }, [catOf(p.cat).name, arrLabel(p)].filter(Boolean).join(' · '), ' ', hoursTag(p))),
        el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')))))) : null,
    next ? null : el('p', { class: 'help' }, 'Note ici les lieux que tu veux faire aujourd\'hui : tu iras de l\'un à l\'autre d\'un appui.'),
    timed.length ? el('ul', { class: 'items' }, timed.map(planLine)) : null,
    list.length >= 2 && list.length <= MAX_ROUTE ? el('a', { class: 'btn', href: routeUrl(list), target: '_blank', rel: 'noopener' }, ico('route'), 'Tout le parcours · Google Maps') : null,
    el('button', { type: 'button', class: 'btn c-add', onclick: () => openDayPicker() }, ico('plus'), 'Ajouter des lieux'),
    list.length ? el('button', { type: 'button', class: 'btn', onclick: () => openDayOrder() }, ico('pencil'), 'Modifier la liste') : null, /* v205 : l'ordre et Retirer, dès un lieu */
  ];
  openSheet([ico('alarm-clock'), ' Mon planning'], el('div', { class: 'stack' },
    ...todayBlock,
    ...pastBlock,
    groups.length || timed.length ? null : el('p', { class: 'help' }, 'Pour prévoir un autre jour : touche un lieu sur la carte, puis Prévoir une visite.'),
    ...groups.flatMap((g) => [
      el('h3', { class: 'ring-title' }, el('span', {}, g.label), el('span', {}, String(g.items.length))),
      el('ul', { class: 'items' }, g.items.map(planLine)),
    ]),
    el('button', { type: 'button', class: 'btn c-disc', onclick: () => openDayEvents(null, named('Mon planning', () => openPlanning())) }, ico('calendar-days'), 'Trouver une sortie'),
    planningBack === 'myparis' ? foot(backBtn(named('Mon Paris', () => openMyParis()))) : null,
  ), { tall: true, name: 'planning', again: () => openPlanning() });
}

/* ---------- Liste du jour (v201) : Fait, Lieux du jour (cases à cocher), Changer l'ordre ---------- */

/** Le lendemain, ce qui reste dans la liste du jour s'efface sans question : les lieux restent sur la carte. */
function dropStaleDayList() {
  const old = staleDayList(state.points);
  if (!old.length) return false;
  for (const p of old) delete p.ticket;
  persist();
  return true;
}

/** « Fait » : le lieu passe en Déjà visité (comme « Tu y es allé ? → Oui ») et quitte la liste ; « Annuler » remet tout comme avant. */
function dayDone(p) {
  const before = { ticket: p.ticket, done: p.done, visited: p.visited, passages: p.passages ? [...p.passages] : null };
  markDone(p, true);
  delete p.ticket;
  rankDayList(dayList(state.points));
  persist(); renderMarkers(); updateNow(true);
  openPlanning();
  const short = p.name.length > 28 ? `${p.name.slice(0, 27)}…` : p.name;
  toast(`« ${short} » : ${didLower(catOf(p.cat))}`, false, { label: 'Annuler', fn: () => {
    p.ticket = before.ticket;
    p.done = before.done;
    if (before.visited === undefined) delete p.visited; else p.visited = before.visited;
    if (before.passages) p.passages = before.passages; else delete p.passages;
    rankDayList([p, ...dayList(state.points).filter((x) => x.id !== p.id)]); // il reprend sa place : le premier
    persist(); renderMarkers(); updateNow(true);
    if (view === 'planning') openPlanning();
  } });
}

/** Lieux du jour : mes lieux avec une case (les plus proches d'abord quand ma position est connue), un champ pour chercher. */
function openDayPicker(selected = null, query = '') {
  track('Lieux du jour');
  const cur = dayList(state.points);
  const sel = selected ?? new Set(cur.map((p) => p.id));
  const start = freshHere(); // jamais de GPS demandé pour une liste : sans position récente, ordre alphabétique
  // Un lieu déjà prévu à une heure ou un autre jour garde sa sortie : il ne se coche pas ici
  const busy = (p) => Number.isFinite(p.ticket?.at) && daysUntil(p.ticket.at) >= 0 && !(isDayList(p.ticket) && daysUntil(p.ticket.at) === 0);
  const all = offered().map((p) => ({ p, d: start ? distanceM(start, p) : 0, key: fold(p.name) }))
    .sort((a, b) => (start ? a.d - b.d : a.p.name.localeCompare(b.p.name, 'fr')));
  const input = el('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', placeholder: 'Chercher un de mes lieux', 'aria-label': 'Chercher un de mes lieux', value: query });
  const list = el('ul', { class: 'items' });
  const more = el('p', { class: 'help' });
  const go = el('button', { type: 'button', class: 'btn c-guide solid', onclick: () => save() });
  const update = () => {
    go.disabled = !sel.size && !cur.length;
    fill(go, ico('check'), sel.size ? `Enregistrer (${plural(sel.size, 'lieu', 'lieux')})` : cur.length ? 'Enregistrer (liste vide)' : 'Coche au moins un lieu');
  };
  const row = ({ p, d }) => {
    const box = el('input', { type: 'checkbox', class: 'check', 'aria-label': p.name, disabled: busy(p) });
    box.checked = sel.has(p.id);
    box.addEventListener('change', () => {
      if (box.checked && sel.size >= DAY_MAX) { box.checked = false; toast(`${DAY_MAX} lieux au plus.`); return; }
      if (box.checked) sel.add(p.id); else sel.delete(p.id);
      update();
    });
    return el('li', {}, el('label', { class: 'item-main check-row' }, box, catDot(p.cat),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, favMark(p), p.name),
        el('span', { class: 'item-sub' }, busy(p) ? `Prévu ${planText(p.ticket)}` : [start ? fmtDist(d) : null, p.done ? didName(catOf(p.cat)) : 'À faire'].filter(Boolean).join(' · ')))));
  };
  const draw = () => {
    const q = fold(input.value.trim());
    const hits = all.filter((x) => !q || x.key.includes(q));
    const shown = q ? hits.slice(0, 60) : hits.filter((x, i) => i < 60 || sel.has(x.p.id));
    fill(list, ...shown.map(row));
    more.textContent = !hits.length ? (q ? 'Aucun de tes lieux ne porte ce nom.' : 'Ta carte n\'a pas encore de lieu : touche Ajouter, en bas de la carte.')
      : hits.length > shown.length ? `${shown.length} lieux affichés sur ${hits.length} : cherche un nom pour voir les autres.` : '';
    more.hidden = !more.textContent;
  };
  function save() {
    const kept = cur.filter((p) => sel.has(p.id));
    const added = all.filter((x) => sel.has(x.p.id) && !cur.includes(x.p) && !busy(x.p)).map((x) => x.p);
    // Une liste neuve part dans le parcours le plus court depuis ma position ; ensuite, mon ordre est gardé et les nouveaux vont à la fin
    const shortest = !cur.length && Boolean(start) && added.length > 1;
    const order = shortest ? orderRoute(start, added) : [...kept, ...added];
    for (const p of cur) if (!sel.has(p.id)) delete p.ticket;
    order.forEach((p, i) => { p.ticket = dayTicket(i + 1, new Date(), isDayList(p.ticket) ? p.ticket.with ?? '' : ''); });
    persist(); renderMarkers(); updateNow(true);
    openPlanning();
    toast(order.length ? `Aujourd'hui : ${plural(order.length, 'lieu', 'lieux')}${shortest ? ', dans l\'ordre le plus court' : ''}` : 'Liste d\'aujourd\'hui vidée');
  }
  input.addEventListener('input', draw);
  draw(); update();
  openSheet([ico('alarm-clock'), ' Lieux du jour'], el('div', { class: 'stack' },
    input,
    el('p', { class: 'help' }, `Coche les lieux d'aujourd'hui, ${DAY_MAX} au plus. ${start ? 'Les plus proches d\'abord.' : 'Par ordre alphabétique : ta position n\'est pas connue.'}`),
    list, more, go,
    foot(backBtn(named('Mon planning', () => openPlanning()))),
  ), { tall: true, name: 'jourlieux', again: () => openDayPicker(sel, input.value) });
}

/** Modifier la liste du jour (v201 : « Changer l'ordre » ; v205 : Retirer) : les flèches de Réglages et un ×, sur une page à part
    (une ligne de Mon planning n'a pas de boutons). Retirer laisse le lieu sur la carte ; « Annuler » dans le message le remet à sa place. */
function dayRemove(p, list) {
  const i = list.findIndex((x) => x.id === p.id);
  const old = p.ticket;
  delete p.ticket;
  rankDayList(dayList(state.points));
  persist(); renderMarkers(); updateNow(true);
  if (dayList(state.points).length) openDayOrder(); else openPlanning();
  const short = p.name.length > 28 ? `${p.name.slice(0, 27)}…` : p.name;
  toast(`« ${short} » retiré d'aujourd'hui`, false, { label: 'Annuler', fn: () => {
    if (p.ticket) return;
    p.ticket = old;
    const rest = dayList(state.points).filter((x) => x.id !== p.id);
    rankDayList([...rest.slice(0, i), p, ...rest.slice(i)]);
    persist(); renderMarkers(); updateNow(true);
    if (view === 'jourordre') openDayOrder(); else if (view === 'planning') openPlanning();
  } });
}
function openDayOrder(focus = null) {
  const list = dayList(state.points);
  if (!list.length) { openPlanning(); return; }
  const apply = (next, f = null) => { rankDayList(next); persist(); openDayOrder(f); };
  const start = freshHere();
  const shortest = () => {
    apply(start ? orderRoute(start, list) : [list[0], ...orderRoute(list[0], list.slice(1))]);
    toast(start ? 'Parcours le plus court depuis ta position' : 'Parcours le plus court depuis le premier lieu');
  };
  openSheet([ico('pencil'), ' Modifier la liste'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, list.length > 1 ? 'Le n° 1 est le prochain lieu, celui de « Y aller ». Range à ta façon ; × le retire d\'aujourd\'hui, il reste sur ta carte.' : '× retire le lieu d\'aujourd\'hui ; il reste sur ta carte.'),
    el('div', {}, list.map((p, i) => el('div', { class: 'cat-row' },
      el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
      el('span', { class: 'cat-name' }, p.name),
      el('button', { type: 'button', class: 'btn move', disabled: i === 0, 'data-move': `${p.id}:-1`, onclick: () => apply(moveInList(list, p.id, -1), `${p.id}:-1`), 'aria-label': `Monter ${p.name}` }, '↑'),
      el('button', { type: 'button', class: 'btn move', disabled: i === list.length - 1, 'data-move': `${p.id}:1`, onclick: () => apply(moveInList(list, p.id, 1), `${p.id}:1`), 'aria-label': `Descendre ${p.name}` }, '↓'),
      el('button', { type: 'button', class: 'btn move remove', onclick: () => dayRemove(p, list), 'aria-label': `Retirer ${p.name} d'aujourd'hui` }, ico('x'))))),
    list.length > 1 ? el('button', { type: 'button', class: 'btn', onclick: shortest }, ico('route'), 'Remettre le plus court') : null,
    foot(backBtn(named('Mon planning', () => openPlanning()))),
  ), { name: 'jourordre', again: () => openDayOrder() });
  if (focus) requestAnimationFrame(() => (document.querySelector(`[data-move="${focus}"]:not(:disabled)`) ?? document.querySelector(`[data-move^="${focus.split(':')[0]}:"]:not(:disabled)`))?.focus());
}

/* ---------- Trouver une sortie (v154) : l'agenda de la Ville pour un jour choisi, autour du centre de la carte ----------
   Seulement les sorties qui ont un créneau publié ce jour-là (rien de deviné), rangées par heure. La carte ne bouge pas. */
const dayEventsCache = new Map(); // jour → sorties, le temps de la session
let dayEventsKey = 'j1';
async function eventsOfDay(date) {
  const k = date.toDateString();
  if (dayEventsCache.has(k)) return dayEventsCache.get(k);
  const today = k === new Date().toDateString();
  const from = today ? new Date() : new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const r = await net(eventsUrl(from));
  if (!r.ok) throw new Error(String(r.status));
  const items = todayOnly(parseEvents(await r.json(), from), from);
  dayEventsCache.set(k, items);
  return items;
}
function openDayEvents(key = null, back = null) {
  if (key) dayEventsKey = key;
  const days = dayChoices();
  const day = days.find((d) => d.key === dayEventsKey) ?? days[1];
  dayEventsKey = day.key;
  const again = () => openDayEvents(null, back);
  const center = map.getCenter();
  const from = { lat: center.lat, lng: center.lng };
  const list = el('div', { class: 'stack' }, el('p', { class: 'help' }, 'Chargement de l\'agenda…'));
  const chips = el('div', { class: 'list-chips' }, days.map((d) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(d.key === day.key), onclick: () => openDayEvents(d.key, back) }, d.label)));
  openSheet([ico('calendar-days'), ' Trouver une sortie'], el('div', { class: 'stack' },
    chips,
    el('p', { class: 'help' }, 'Autour du centre de la carte (2 km), par heure. Touche une sortie, puis Prévoir.'),
    list,
    back ? foot(backBtn(back)) : null,
  ), { tall: true, name: 'joursortie', again });
  eventsOfDay(day.date).then((all) => {
    if (!list.isConnected) return;
    const near = nearbyEvents(all, from, 2000).sort((a, b) => a.slotStart - b.slotStart).slice(0, 40);
    const hm = (d) => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;
    fill(list, near.length
      ? el('ul', { class: 'items ev-list' }, near.map((e) => sortieCard({ genre: genreOf(e, { expo: isExpo(e) }), name: e.title, onclick: () => openEventPage(e, named('Trouver une sortie', again)),
        sub: [el('b', {}, hm(e.slotStart)), e.place], d: e.d, tags: [e.free ? freeTag() : null] })))
      : el('p', { class: 'empty' }, 'Aucune sortie avec un horaire publié ce jour-là, à moins de 2 km du centre de la carte. Déplace la carte ou choisis un autre jour.'));
  }).catch(() => { if (list.isConnected) fill(list, el('p', { class: 'error' }, 'L\'agenda de la Ville ne répond pas. Vérifie ta connexion, puis réessaie.')); });
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
  const ps = placesStats(state.points.filter((p) => !p.owner), from); // mes lieux seulement
  const ap = arrProgress(state.points.filter((p) => !p.owner).map((p) => ({ ...p, arr: arrAt(p.lat, p.lng, arrData) })), from); // même calcul que la carte de Mon Paris
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
  const origLine = el('p', { class: 'help', hidden: true }, ''); /* v198 : l'origine du nom de la rue, quand la Ville la donne */
  const quarter = el('div', { class: 'quarter', 'aria-live': 'polite' }, el('p', { class: 'help' }, 'Le quartier : recherche dans Wikipédia…'));
  const coords = `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`;
  let addrText = '';
  fill(body,
    el('div', { class: 'copy-row' }, addr, copyBtn(() => addrText || coords, 'l\'adresse', () => (addrText ? 'Adresse copiée' : 'Adresse inconnue : coordonnées copiées'))),
    arrLine,
    origLine,
    near ? el('p', { class: 'badge' }, `Ⓜ ${near.station.n}${near.station.l?.length ? ` (${near.station.l.join(', ')})` : ''} · ${fmtWalk(near.d)}`) : null,
    el('div', { class: 'copy-row' }, el('p', { class: 'help' }, `Précision : environ ${Math.round(at.acc ?? 0)} m · ${coords}`), copyBtn(() => coords, 'les coordonnées GPS', 'Coordonnées copiées')),
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => shareLink('Où je suis', `Je suis ici${state.me ? ` (${state.me})` : ''} : `, meetLink(location.href, at, state.me)) }, ico('send'), 'Envoyer ma position à quelqu\'un'),
    el('button', { type: 'button', class: 'btn c-add', onclick: () => addAt(at.lat, at.lng, at.acc) }, ico('plus'), 'Ajouter ce lieu'),
    quarter,
    el('p', { class: 'help' }, 'Pour trouver ton adresse, ta position est envoyée à l\'IGN (Géoplateforme, service public). Le quartier vient de Wikipédia, avec une position arrondie à 100 m. « Envoyer ma position » ne la transmet qu\'à la personne que tu choisis.'),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')),
  );
  openSheet([ico('locate'), ' Où suis-je ?'], body, { name: 'where', again: openWhereAmI });
  // Le quartier en 3 lignes : l'article Wikipédia le plus proche décrit comme un quartier (position arrondie à 100 m)
  (async () => {
    try {
      const r = await net(quarterSearchUrl(at.lat, at.lng));
      const q = r.ok ? pickQuarter(await r.json(), at) : null;
      if (!q) { fill(quarter); return; }
      const r2 = await net(extractUrl(q.title));
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
    if (r?.street) loadVoies().then((d) => { const o = voieOrigin(d, r.street); if (o) { fill(origLine, el('b', {}, `${r.street} : `), o); origLine.hidden = false; } });
  } catch { addr.textContent = 'Adresse indisponible (pas de connexion).'; }
}

/* ---------- Ce soir près de moi : agenda « Que faire à Paris ? » ---------- */

let eventsCache = null; // { day, items }
let eventsMode = 'all'; // 'all' | 'free' | 'art'
let evWhere = ''; // Tout et Gratuit : 'out' dehors, 'in' à l'abri, '' tout (le temps de la session)

/** Bouton « M » : quel métro prendre jusqu'à ce point, calculé dans l'appli. */
// Un lieu a un « name », une sortie de l'agenda un « title » : on prend celui qui existe (sinon « undefined » s'affichait).
const nameOf = (t) => t.name ?? t.title ?? 'ce lieu';
const metroBtn = (t, back) => el('button', { type: 'button', class: 'go-compass go-metro', 'aria-label': `Métro vers ${nameOf(t)}`,
  onclick: () => showMetroPlan({ name: nameOf(t), lat: t.lat, lng: t.lng, id: `pt:${t.lat.toFixed(5)},${t.lng.toFixed(5)}` }, back) },
el('b', { class: 'm-badge', 'aria-hidden': 'true' }));
const compassBtn = (t) => el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: nameOf(t), lat: t.lat, lng: t.lng }), 'aria-label': `Boussole vers ${nameOf(t)}` }, ico('compass'));

/* Galeries d'art et œuvres dans la rue (OpenStreetMap) : listes de tout Paris rangées dans l'appli par le robot des données
   une fois par mois (data/galeries.json, data/oeuvres.json, v170). Le téléphone ne demande plus rien à OpenStreetMap. */
let artCacheGone = false;
const artFilesRead = new Set(); // Réglages → Données de l'appli : listes déjà lues une fois
/** Œuvres ou galeries que le robot n'a encore jamais rangées dans l'appli (ni date ni liste). */
const artNotYet = (id, dates) => (id === 'oeuvres' && !streetArt && !dates[id]) || (id === 'galeries' && !galleries && !dates[id]) || (id === 'respire' && !respireData?.secteurs?.length && !dates[id]) || (id === 'voies' && !Object.keys(voiesData?.voies ?? {}).length && !dates[id]) || (id === 'architectes' && !archData?.items?.length && !dates[id]) || (id === 'acces' && !acces.length && !dates[id]) || (id === 'gares' && !gares.length && !dates[id]);
/** Les copies gardées avant la v170 (téléchargées par le téléphone) ne servent plus : place rendue au téléphone. */
function dropOldArtCache() {
  if (artCacheGone) return;
  artCacheGone = true;
  try { storage.removeItem('carte-paris.galeries'); storage.removeItem('carte-paris.art-rue'); } catch { /* rien */ }
}
/** Lit une liste de l'appli : { items, updated, time } ; erreur « vide » si le robot ne l'a pas encore remplie. */
async function readArtFile(read, parse) {
  dropOldArtCache();
  const r = await read();
  if (!r.ok) throw new Error(String(r.status));
  const json = await r.json();
  const items = parse(json);
  if (!items.length) throw new Error('vide');
  const updated = /^\d{4}-\d{2}-\d{2}$/.test(json?.updated ?? '') ? json.updated : '';
  return { items, updated, time: Date.parse(updated) || 0 };
}
/** Le message quand une liste manque : pas encore remplie par le robot, ou illisible. */
const artFileWarn = (what, e) => (e?.message === 'vide'
  ? `La liste ${what} n'est pas encore dans l'appli : elle arrive avec la prochaine mise à jour des données (chaque 1er du mois, ou Réglages → Appli → Données de l'appli).`
  : `La liste ${what} n'a pas pu être lue. Réessaie plus tard.`);
let galleries = null;
let galleriesTime = 0;
let galleriesUpdated = '';
let galleriesLoading = null;
function loadGalleries(force = false) {
  if (galleries && !force) return Promise.resolve(galleries);
  galleriesLoading ??= readArtFile(() => fetch('data/galeries.json'), parseGalleries)
    .then(({ items, updated, time }) => { galleries = items; galleriesUpdated = updated; galleriesTime = time; return galleries; })
    .finally(() => { galleriesLoading = null; });
  return galleriesLoading;
}

/** Une galerie : nom, état (ouverte, ferme bientôt, jours de fermeture), distance ; boussole, métro, garder. */
/* ---------- Cartes des Sorties : une icône de genre, le nom, quand et où, le temps à pied, les tampons et les boutons DANS la carte ---------- */
const GENRE_ICON = { musique: 'music', expo: 'palette', chiner: 'tags', marche: 'store', fete: 'sparkles', scene: 'drama', cine: 'clapperboard', balade: 'footprints', famille: 'users', atelier: 'book-open', musee: 'landmark', galerie: 'palette', oeuvre: 'shapes', circuit: 'signpost' };
const GENRE_NAME = { musique: 'Musique', expo: 'Expo', chiner: 'Puces et brocantes', marche: 'Marché', fete: 'Fête', scene: 'Spectacle', cine: 'Cinéma', balade: 'Balade ou visite', famille: 'En famille', atelier: 'Atelier ou rencontre', musee: 'Musée', galerie: 'Galerie', ttb: 'TTB', oeuvre: 'Œuvre dans la rue', circuit: 'Circuit' };
/**
 * Une ligne de sortie (v136) : icône du genre, nom, quand et où, et le temps à pied à droite. Aucun bouton dans la ligne :
 * un appui ouvre sa page, où sont Y aller, Boussole, Métro, Ajouter. (v177 : plus de grande plaque en tête de Sorties.)
 * `buttons` est gardé pour compatibilité et ignoré.
 */
function sortieCard({ genre, name, href = '', onclick = null, sub = [], d = null, tags = [], badge = null }) {
  const label = GENRE_NAME[genre];
  const dist = d != null ? el('span', { class: 'ev-dist' }, `${walkMinutes(d)}\u00a0min`, el('small', {}, fmtDist(d).replace(' ', '\u00a0'))) : el('span', { class: 'ev-dist' });
  const inner = [
    el('span', { class: `genre g-${genre ?? 'autre'}`, 'aria-hidden': 'true' }, badge ?? ico(GENRE_ICON[genre] ?? 'calendar-days', { size: 22 })),
    el('span', { class: 'ev-text' },
      el('span', { class: 'ev-name' }, label ? el('span', { class: 'sr-only' }, `${label} : `) : null, name),
      sub.filter(Boolean).length ? el('span', { class: 'ev-sub' }, ...sub.filter(Boolean).flatMap((x, i) => (i ? [' · ', x] : [typeof x === 'string' ? x.charAt(0).toUpperCase() + x.slice(1) : x]))) : null,
      tags.filter(Boolean).length ? el('span', { class: 'ev-tags' }, ...tags.filter(Boolean)) : null),
    dist];
  const main = el(href ? 'a' : onclick ? 'button' : 'div', { class: 'ev-main', ...(href ? { href, target: '_blank', rel: 'noopener' } : onclick ? { type: 'button', onclick } : {}) }, ...inner);
  return el('li', { class: 'ev' }, main);
}
/** Boussole et M toujours au même endroit : la place du + reste réservée quand une ligne n'en a pas. */
const slots = (btns, n) => [...btns, ...Array.from({ length: Math.max(0, n - btns.length) }, () => el('span', { class: 'go-compass slot', 'aria-hidden': 'true' }))];
const freeTag = () => el('span', { class: 'tag open' }, 'Gratuit');
const kiosqueRow = (k, back) => sortieCard({ genre: 'scene', name: k.name, onclick: () => openKiosque(k, back), sub: ['Places du jour à −50 % (+ 3,50 €)', k.address], d: k.d, tags: [stateTag(spotHours(k), walkOf(k.d))] });
function openKiosque(k, back = null) {
  openSpot({ icon: 'drama', title: k.name, kicker: 'Théâtre à moitié prix, le jour même', lines: [hoursLine(k, spotHours(k)), k.address, k.hours, 'Places invendues du jour à moitié prix, plus 3,50 € de frais par place. Sur place seulement.'],
    place: k, link: [KIOSQUE_SOURCE, 'Site officiel du Kiosque'], back, key: `kiosque:${k.lat},${k.lng}`, add: { hours: k.oh ?? '' }, fav: 'theatre' });
}
/** La page d'un lieu de Sorties qui n'a pas de fiche (musée gratuit, kiosque, galerie) : ce qu'on sait, puis les mêmes actions qu'une sortie. */
/**
 * « ★ Favori » d'un lieu qui n'est pas encore à moi (v167) : un appui le garde dans mes lieux, en favori, avec une catégorie
 * devinée (`favCategory`) ; le message propose Modifier et Annuler. Déjà à moi (même lieu à quelques mètres) : l'étoile
 * s'allume ou s'éteint. Aucune catégorie ne va : le formulaire s'ouvre, Favori coché. `again` redessine la page.
 */
function favButton({ name, lat, lng, address = '', hours = '', note = '', kind = 'musee', text = 'Favori' }, again, cls = 'btn c-fav') {
  const mine = findDuplicate(state.points.filter((p) => !p.owner), { name, lat, lng })?.point ?? null;
  const on = Boolean(mine?.fav);
  const label = mine ? `${name} : ${on ? 'favori' : 'dans tes lieux'}` : `Garder ${name} en favori`;
  return el('button', { type: 'button', class: cls, 'aria-pressed': String(on), 'aria-label': label, onclick: () => {
    if (mine) { mine.fav = !mine.fav; persist(); renderMarkers(); again(); toast(mine.fav ? `« ${mine.name} » en favori` : 'Favori retiré'); return; }
    const cat = favCategory(kind, state.categories);
    if (!cat) { openForm({ name, lat, lng, address, hours, acc: null, fav: true, note }); return; }
    const np = newPoint({ name, cat, fav: true, lat, lng, address, hours, note });
    state.points.push(np);
    persist(); renderMarkers(); again();
    toast(`« ${name} » en favori, dans ${catOf(cat).name}`, false, [
      { label: 'Modifier', fn: () => openForm({ lat: np.lat, lng: np.lng, address: np.address }, np) },
      { label: 'Annuler', fn: () => { state.points = state.points.filter((x) => x.id !== np.id); persist(); renderMarkers(); again(); toast('Retiré de tes lieux'); } }]);
    refreshParkHours().catch(() => {});
  } }, glyph(state.fav.icon, { filled: on }), text);
}

/** « ♡ Suivre » une salle (v170) : elle entre dans Mes salles (son programme arrive en tête de Sorties) ; un nouvel appui la retire. */
function followButton(name, again) {
  const on = cleanVenues(state.venues).some((v) => artistKey(v) === artistKey(name));
  return el('button', { type: 'button', class: 'btn c-disc', 'aria-pressed': String(on), 'aria-label': on ? `${name} : dans Mes salles` : `Suivre ${name} dans Mes salles`, onclick: () => {
    state.venues = on ? cleanVenues(state.venues).filter((v) => artistKey(v) !== artistKey(name)) : cleanVenues([...cleanVenues(state.venues), name]);
    persist(); again();
    toast(on ? `${name} : retiré de Mes salles` : `${name} : dans Mes salles`, false, on ? null : { label: 'Voir', fn: () => openVenues(named(name, again)) });
  } }, ico('heart'), on ? 'Suivie (Mes salles)' : 'Suivre');
}

function openSpot({ icon, title, kicker = '', lines = [], place, link = null, back = null, key, add = {}, extra = null, fav = null }) {
  const d = freshHere() ? distanceM(freshHere(), place) : null;
  const again = () => openSpot({ icon, title, kicker, lines, place, link, back, key, add, extra, fav });
  openSheet([ico(icon), ` ${title}`], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, [kicker, d != null ? fmtWalk(d) : ''].filter(Boolean).join(' · ')),
    ...lines.filter(Boolean).map((t) => (typeof t === 'string' ? el('p', { class: 'help' }, t) : t)),
    el('a', { class: 'btn primary go-bar', href: mapsUrl(place, d ?? 1000), target: '_blank', rel: 'noopener' }, ico('arrow-right'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: title, lat: place.lat, lng: place.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: title, lat: place.lat, lng: place.lng, id: `spot:${place.lat},${place.lng}` }, named(title, again)), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      // v167 : « ★ Favori » (un appui) pour un musée, une galerie, un théâtre ; « Ajouter » (formulaire) pour le reste
      fav ? favButton({ name: title, lat: place.lat, lng: place.lng, address: place.address ?? '', hours: add.hours ?? '', note: add.note ?? '', kind: fav }, again)
        : el('button', { type: 'button', class: 'btn c-add', onclick: () => openForm({ name: title, lat: place.lat, lng: place.lng, address: place.address ?? '', acc: null, ...add }) }, ico('plus'), 'Ajouter')),
    fav ? followButton(title, again) : null, // v170 : une salle, une galerie, un musée se suivent aussi (Mes salles)
    extra,
    link ? el('a', { class: 'btn c-disc', href: link[0], target: '_blank', rel: 'noopener' }, ico('external-link'), link[1]) : null,
    back ? foot(backBtn(back)) : null,
  ), { tall: true, name: key, again });
}
const addBtn = (name, label, onclick) => el('button', { type: 'button', class: 'go-compass add', 'aria-label': `Ajouter ${label} ${name} à ma carte`, onclick }, ico('plus'));

const galleryRow = (g, back) => {
  const st = openState(g.hours);
  const stTxt = !st ? 'horaires inconnus' : st.open && st.until ? `jusqu'à ${hhText(st.until)}` : '';
  return sortieCard({ genre: 'galerie', name: g.name, onclick: () => openGalleryCard(g, back), sub: [g.kind === 'Galerie' ? '' : g.kind, stTxt, closedDaysText(g.hours)], d: g.d, tags: [stateTag(g.hours, walkOf(g.d))] });
};

/** Une expo ou une sortie : genre, titre, quand, où ; boussole, métro, et pour une expo « garder » (avec sa date de fin). */
/** Photo officielle d'une sortie (agenda de la Ville), avec son crédit ; disparaît si l'image ne se charge pas. */
function evPhoto(e, cls = '') {
  if (!e?.cover) return null;
  const img = el('img', { src: e.cover, alt: e.coverAlt || '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  const fig = el('figure', { class: `ev-photo ${cls}`.trim() }, img, e.coverCredit ? el('figcaption', {}, `© ${e.coverCredit}`) : null);
  img.addEventListener('error', () => fig.remove(), { once: true });
  return fig;
}

/** Quand, en une ligne : « À 20h », « Finit dimanche 22 nov. », « Dès samedi 21 nov. »… Jamais « aujourd'hui » sans créneau connu (whenText). */
function eventWhen(e, now = new Date()) {
  // Créneau d'un autre jour (Trouver une sortie) : le jour est écrit, jamais un « À 20h » qui ferait croire à aujourd'hui
  if (e.slotStart && e.slotStart > now && e.slotStart.toDateString() !== now.toDateString()) { const t = planText({ at: e.slotStart.getTime() }, now); return t.charAt(0).toUpperCase() + t.slice(1); }
  if (e.start && e.start > now && e.start.toDateString() !== now.toDateString()) return weekText(e, now);
  if (isExpo(e) && e.end) return endText(e.end, now);
  const w = whenText(e, now);
  return w === 'en cours aujourd\'hui' ? 'En cours' : w.replace(/^à/, 'À').replace(/^j/, 'J');
}

/** La page d'une sortie de l'agenda : photo officielle, quand, où, résumé, et les mêmes actions qu'un lieu. */
/** Un lien vers un site, en ligne de fiche (v164) : une icône de l'appli, ce qu'on y trouve, et le nom du site écrit en clair. */
const linkRow = (icon, label, href) => el('a', { class: 'fiche-row', href, target: '_blank', rel: 'noopener noreferrer' },
  ico(icon), el('span', {}, label, el('small', {}, siteName(href))), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')));
const BOOKING_TEXT = { required: 'Réservation obligatoire', advised: 'Réservation conseillée', none: 'Sans réservation' };

function openEventPage(e, back = null, { label = '', icon = '' } = {}) {
  const expo = isExpo(e);
  const genre = genreOf(e, { expo });
  const d = freshHere() ? distanceM(freshHere(), e) : null;
  const again = () => openEventPage(e, back, { label, icon });
  openSheet([ico(icon || GENRE_ICON[genre] || 'calendar-days'), ` ${e.title}`], el('div', { class: 'stack' },
    evPhoto(e),
    el('p', { class: 'summary' }, [label || GENRE_NAME[genre], eventWhen(e), d != null ? fmtWalk(d) : ''].filter(Boolean).join(' · ')),
    e.dates?.length ? el('div', { class: 'ev-dates' }, el('p', { class: 'legend' }, 'Dates de l\'agenda'), ...e.dates.map((t) => el('p', {}, t))) : null,
    e.place || e.address ? el('div', { class: 'copy-row' }, el('p', { class: 'where' }, ico('map-pin'), [e.place, e.address].filter(Boolean).join(' · ')), copyBtn(() => e.address || e.place, 'l\'adresse', 'Adresse copiée')) : null,
    e.lead ? el('p', { class: 'help' }, e.lead) : null,
    e.free ? el('p', {}, freeTag()) : null,
    el('a', { class: 'btn primary go-bar', href: mapsUrl(e, d ?? 1000), target: '_blank', rel: 'noopener' }, ico('arrow-right'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: e.title, lat: e.lat, lng: e.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: e.title, lat: e.lat, lng: e.lng, id: `ev:${e.lat},${e.lng}` }, named('Sortie', again)), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-disc', onclick: () => planEvent(e, again) }, ico('alarm-clock'), planOfEvent(state.plans, e) ? 'Prévu' : 'Prévoir')),
    planOfEvent(state.plans, e) ? el('p', { class: 'summary' }, ico('alarm-clock'), ` Dans Mon planning : ${planText(planOfEvent(state.plans, e).ticket)}.`) : null,
    // Réserver et s'informer (v164) : ce que l'organisateur a écrit dans l'agenda, les sites nommés en clair
    e.booking || e.book || e.site || e.url ? el('h3', { class: 'fiche-sec' }, 'Réserver et s\'informer') : null,
    e.booking ? el('p', { class: e.booking === 'required' ? 'warn' : 'help' }, ico('ticket'), ` ${BOOKING_TEXT[e.booking]}, selon l'organisateur.`) : null,
    e.book || e.site || e.url ? el('div', { class: 'fiche-toc' },
      e.book ? linkRow('ticket', e.bookText || (e.booking === 'none' ? 'Plus d\'infos' : 'Infos et réservations'), e.book) : null,
      e.site && e.site !== e.book ? linkRow('external-link', e.org ? `Site : ${e.org}` : 'Site de l\'organisateur', e.site) : null,
      e.url ? linkRow('external-link', 'Voir dans « Que faire à Paris »', e.url) : null) : null,
    // Le lieu de la sortie en favori (v167), avec l'expo ou la sortie dans la note
    e.place ? favButton({ name: e.place, lat: e.lat, lng: e.lng, address: e.address ?? '', kind: isExpo(e) ? 'expo' : genre === 'scene' ? 'theatre' : genre === 'musique' ? 'musique' : 'musee',
      note: isExpo(e) && e.end ? `Expo « ${e.title} » jusqu'au ${e.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : `« ${e.title} »`, text: `${e.place} en favori` }, again) : null,
    // Mes salles (v166) : suivre le lieu de cette sortie, son programme vient en tête de Sorties
    e.place ? el('div', { class: 'fiche-toc' }, cleanVenues(state.venues).some((v) => atVenue(e, v))
      ? el('button', { type: 'button', class: 'fiche-row', onclick: () => openVenues(named('Sortie', again)) }, ico('heart'), el('span', {}, 'Dans Mes salles', el('small', {}, e.place)), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')))
      : el('button', { type: 'button', class: 'fiche-row', onclick: () => { state.venues = cleanVenues([...cleanVenues(state.venues), e.place]); persist(); again(); toast(`${e.place} : dans Mes salles`); } },
        ico('heart'), el('span', {}, 'Suivre ce lieu', el('small', {}, `${e.place} : son programme en tête de Sorties`)), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')))) : null,
    el('p', { class: 'help' }, 'Agenda « Que faire à Paris ? » de la Ville de Paris. Photo, liens et réservation fournis par l\'organisateur. Horaires et prix : vérifie sur son site.'),
    label ? el('p', { class: 'help' }, `« ${label} » est deviné d'après le titre et le lieu : vérifie sur la page de l'événement.`) : null,
    back ? foot(backBtn(back)) : null,
  ), { tall: true, name: 'sortie', again });
}

const eventRow = (e, back, { last = false, week = false } = {}) => {
  const expo = isExpo(e);
  const keep = () => openForm({ name: e.title, lat: e.lat, lng: e.lng, address: e.address, acc: null,
    note: [e.place, e.end ? `Expo jusqu'au ${e.end.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : '', e.url].filter(Boolean).join(' · ') });
  const later = startsLater(e);
  const when = week ? el('b', {}, (!expo && nextSlotText(e)) || weekText(e)) /* v191 : un concert dit son prochain créneau, une expo sa date de fin */ : last ? el('b', {}, endText(e.end)) : later ? el('b', {}, whenText(e).replace(/^à/, 'À')) : whenText(e) === 'en cours aujourd\'hui' ? null : whenText(e).replace(/^j/, 'J');
  return sortieCard({ genre: genreOf(e, { expo }), name: e.title, onclick: () => openEventPage(e, back), sub: [when, e.place], d: e.d, tags: [e.free ? freeTag() : null, e.booking === 'required' ? el('span', { class: 'tag closed' }, 'Sur réservation') : null],
    buttons: [compassBtn(e), metroBtn(e, back), expo ? addBtn(e.title, 'l\'expo', keep)
      : later && !week ? addBtn(e.title, 'la sortie', () => openForm({ name: e.title, lat: e.lat, lng: e.lng, address: e.address, acc: null, note: [e.place, e.url].filter(Boolean).join(' · '), ticketAt: (e.slotStart ?? e.start).getTime() })) : null] });
};

/** Un musée gratuit aujourd'hui. */
/** Page d'un musée gratuit : quand c'est gratuit, et s'il est ouvert en ce moment (v156 ; rien si l'horaire n'est pas sûr). */
const openFreeSpot = (f, back = null) => openSpot({ icon: 'landmark', title: f.name, kicker: 'Gratuit aujourd\'hui',
  lines: [hoursLine(f, spotHours(f)), `Gratuit : ${f.when}.`, 'Les règles changent : vérifie sur le site du musée avant d\'y aller.'], place: f, back, key: `gratuit:${f.lat},${f.lng}`, fav: 'musee' });
/* ---------- Un jour gratuit à venir (v168) : les lieux gratuits ce jour-là, leurs heures, Prévoir ---------- */
/** Les heures d'un lieu un jour donné : « 9h30 – 18h », « Fermé ce jour-là » ou null (horaires inconnus). */
function hoursOn(f, date) {
  const h = spotHours(f, date);
  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 1);
  const st = openState(h, d0);
  if (!st) return null;
  if (!st.opensAt) return 'Fermé ce jour-là';
  const [hh, mm] = st.opensAt.split(':').map(Number);
  const until = openState(h, new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm))?.until;
  return `${hhText(st.opensAt)}${until ? ` – ${hhText(until)}` : ''}`;
}
const dayTitle = (date) => date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
/** Un lieu gratuit ce jour-là : ses heures ce jour-là, la règle, Y aller, Boussole, Métro, ★ Favori, et « Prévoir ce … ». */
function openFreeDaySpot(f, date, back) {
  const again = () => openFreeDaySpot(f, date, back);
  const h = hoursOn(f, date);
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  const plan = () => { // une sortie prévue (Mon planning), à l'heure d'ouverture de ce jour-là si elle est connue
    const st = openState(spotHours(f, date), new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 1));
    const [hh, mm] = (st?.opensAt ?? '14:00').split(':').map(Number);
    const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm).getTime();
    openPlan({ id: newPhotoId(), name: f.name, lat: f.lat, lng: f.lng, plan: true, place: f.name, ticket: st?.opensAt ? { at } : { at, part: 'aprem' } }, named(f.name, again), { done: again });
  };
  openSpot({ icon: 'landmark', title: f.name, kicker: `Gratuit ${dayTitle(date)}`, place: f, back, key: `gratuitjour:${f.lat},${f.lng}:${date.getTime()}`, fav: 'musee',
    lines: [h ? el('p', {}, ico('clock'), ` Ce jour-là : ${h}`) : el('p', { class: 'help' }, 'Horaires de ce jour-là inconnus : vérifie avant d\'y aller.'),
      `Gratuit : ${f.when}.`, 'Les règles changent : vérifie sur le site du musée avant d\'y aller.'],
    extra: el('button', { type: 'button', class: 'btn c-disc', onclick: plan }, ico('alarm-clock'), `Prévoir ce ${day}`) });
}
/** La page d'un jour gratuit à venir (Sorties → Gratuit → Bientôt gratuit, ou le bandeau « Maintenant ») : du plus proche au plus loin. */
function openFreeDay(date, back = named('Gratuit', () => { eventsMode = 'free'; openEvents(); })) {
  const again = () => openFreeDay(date, back);
  const o = evFrom ?? origin ?? (() => { const c = map.getCenter(); return { lat: c.lat, lng: c.lng, kind: 'map' }; })(); // jamais de GPS demandé ici
  const list = freeToday(date).filter((f) => f.rule !== 'always').map((f) => ({ ...f, d: distanceM(o, f) })).sort((a, b) => a.d - b.d);
  const here = named(`Gratuit ${date.toLocaleDateString('fr-FR', { weekday: 'long' })}`, again);
  openSheet([ico('landmark'), ` Gratuit ${dayTitle(date)}`], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${plural(list.length, 'lieu gratuit', 'lieux gratuits')} ce jour-là, en plus des musées de la Ville (gratuits toute l'année).`),
    list.length ? el('button', { type: 'button', class: 'btn c-disc', onclick: () => showPeek({ kicker: `Gratuit ${dayTitle(date)}`, label: plural(list.length, 'lieu', 'lieux'), items: list, icon: 'landmark',
      open: (x) => openFreeDaySpot(x, date, here), back: again, from: o }) }, ico('map'), 'Voir sur la carte') : null,
    el('ul', { class: 'items ev-list' }, list.map((f) => sortieCard({ genre: 'musee', name: f.name, onclick: () => openFreeDaySpot(f, date, here), sub: [hoursOn(f, date), f.when], d: f.d,
      tags: [/réservation/i.test(`${f.note ?? ''} ${f.when}`) ? el('span', { class: 'tag closed' }, 'Sur réservation') : null] }))),
    el('p', { class: 'help' }, `Liste vérifiée le ${FREE_CHECKED}. Distances depuis ${o.kind === 'map' ? 'le centre de la carte' : 'le point de départ de Sorties'}. Les règles changent : vérifie sur le site du lieu.`),
    foot(backBtn(back)),
  ), { tall: true, name: `gratuitjour:${date.getTime()}`, again });
}

const freeRow = (f, back) => sortieCard({ genre: 'musee', name: f.name, onclick: () => openFreeSpot(f, back), sub: [f.when], d: f.d, tags: [stateTag(spotHours(f), walkOf(f.d))] });

/** Un marché du jour : en ce moment, plus tard, ou déjà fini. */
/** Ouvert, plus tard ou fini, pour un marché découvert comme pour un marché couvert qui ferme à midi. */
const marketWhen = (m, now = new Date()) => whenToday(m, now);
const marketRow = (m, back) => {
  const w = marketWhen(m);
  return sortieCard({ genre: isFleaMarket(m) ? 'chiner' : 'marche', name: m.name, onclick: () => openMarket(m, back), sub: [w.when === 'later' ? el('b', {}, w.text) : w.text, m.place], d: m.d,
    buttons: [compassBtn(m), metroBtn(m, back)] });
};

/** L'agenda du jour (Ville de Paris), téléchargé une fois par jour, sans position. */
let eventsLoading = null;
async function todayEvents() {
  const day = new Date().toDateString();
  if (eventsCache?.day === day) return eventsCache.items;
  eventsLoading ??= net(eventsUrl()).then(async (r) => {
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
  let r = await net(weekEventsUrl());
  if (!r.ok) r = await net(weekEventsUrl(new Date(), 7, false));
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

/** Grands lieux d'art et de musique, toute distance : liste fixe ; leurs événements viennent de l'agenda de la semaine. */
async function openArtPlaces(focus = '', from = null) {
  if (typeof focus !== 'string') focus = '';
  track('Grands lieux');
  const title = [ico('landmark'), ' Grands lieux'];
  const back = foot(from ? backBtn(from) : backBtn(openEvents)); // depuis la loupe : retour à la recherche
  if (!weekCache || weekCache.day !== new Date().toDateString()) {
    openSheet(title, el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris (tout Paris, sur 7 jours)…'), { name: 'grands-lieux' });
    try { await weekEvents(); } catch {
      openSheet(title, el('div', { class: 'stack' }, el('p', { class: 'warn' }, 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'), back), { name: 'grands-lieux' });
      return;
    }
  }
  const o = evFrom;
  const places = artPlacesWith(weekCache.items).map((p) => ({ ...p, d: o ? distanceM(o, p) : null }));
  const block = (p) => el('details', { class: 'help-item week-arr', open: p.name === focus },
    el('summary', {}, el('span', { class: 'week-arr-name' }, p.name),
      el('span', { class: 'week-arr-sub' }, [p.address, p.events.length ? plural(p.events.length, 'rendez-vous dans l\'agenda', 'rendez-vous dans l\'agenda') : 'rien dans l\'agenda cette semaine', p.d != null ? fmtDist(p.d) : ''].filter(Boolean).join(' · '))),
    el('div', { class: 'stack' },
      lateLine(p) ? el('p', { class: 'help' }, ico('moon'), ` ${lateLine(p)}`) : null,
      el('div', { class: 'row' },
        el('a', { class: 'btn c-disc', href: p.site, target: '_blank', rel: 'noopener' }, ico('external-link'), 'Programme officiel'),
        favButton({ name: p.name, lat: p.lat, lng: p.lng, address: p.address ?? '', kind: { expo: 'musee', art: 'galerie', musique: 'musique' }[p.kind] ?? 'musee' }, () => openArtPlaces(p.name, from))), // v167
      followButton(p.name, () => openArtPlaces(p.name, from)), // v170
      p.events.length ? el('ul', { class: 'items week-items ev-list' }, p.events.slice(0, 8).map((e) => eventRow({ ...e, d: o ? distanceM(o, e) : null }, openArtPlaces, { week: true }))) : null));
  const group = (kind) => places.filter((p) => p.kind === kind).sort((a, b) => (b.events.length > 0) - (a.events.length > 0)); // ceux qui ont un rendez-vous d'abord
  const groups = [['expo', 'Grandes expositions'], ['art', 'Art contemporain et photo'], ['musique', 'Musique']];
  openSheet(title, el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Les grands musées et fondations, et deux salles de concert, où que tu sois. Touche un lieu pour voir ce que l\'agenda de la Ville annonce cette semaine, et son programme officiel.'),
    el('button', { type: 'button', class: 'btn c-disc', onclick: () => showPeek({ kicker: 'Grands lieux', label: plural(places.length, 'lieu', 'lieux'), items: places, icon: 'landmark',
      open: (x) => openArtPlaces(x.name), back: () => openArtPlaces() }) }, ico('map'), 'Voir sur la carte'),
    ...groups.flatMap(([kind, label]) => { const g = group(kind); return [el('h3', { class: 'ring-title' }, el('span', {}, label), el('span', {}, String(g.length))), el('div', { class: 'help-list' }, g.map(block))]; }),
    el('p', { class: 'help' }, `Liste des lieux vérifiée le ${ART_PLACES_CHECKED}. Rendez-vous : agenda « Que faire à Paris ? » de la Ville de Paris, sur 7 jours, téléchargé pour tout Paris (ta position n'est pas envoyée). Tous les rendez-vous n'y sont pas : le programme officiel fait foi. Le Centre Pompidou est fermé jusqu'en 2030, ses expositions ont lieu au Grand Palais ; le musée Maillol rouvre le 13 janvier 2027.`),
    back,
  ), { tall: true, name: 'grands-lieux', again: () => openArtPlaces(focus, from) });
  if (focus) sheetBody.querySelector('details[open]')?.scrollIntoView({ block: 'start' });
}

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
/** « Nocturne : mercredi et vendredi jusqu'à 21 h » pour la page d'un grand lieu ('' sans nocturne connue). */
function lateLine(p) {
  const parts = (p.late ?? []).map((r) => `${r.first ? '1er ' : ''}${r.d.length === 5 ? 'tous les jours d\'ouverture' : r.d.map((d) => DAY_NAMES[d]).join(' et ')}${r.first ? ' du mois' : ''} jusqu'à ${lateHour(r.to)}${lateBefore(r.to, p.last) ? `, arriver avant ${lateHour(lateBefore(r.to, p.last))}` : ''}${r.note ? ` (${r.note})` : ''}`);
  return parts.length ? `Ouvert tard : ${parts.join(' ; ')}${p.lateNote ? ` — ${p.lateNote}` : ''}.` : '';
}
/**
 * Ouvert tard (v158) : les nocturnes habituelles des grands lieux, ce soir puis toute la semaine.
 * Liste fixe vérifiée sur le site de chaque lieu ; un jour férié, rien n'est annoncé (horaires changés).
 */
function openLate() {
  track('Ouvert tard');
  const o = evFrom;
  const now = new Date();
  const holiday = holidayOn(now);
  const tonight = lateTonight(now, ART_PLACES, holiday);
  const row = (p, back) => el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openArtPlaces(p.name, back) },
    el('span', { class: 'plan-time' }, lateHour(p.to)),
    el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, p.name),
      el('span', { class: 'item-sub' }, [p.before ? `arriver avant ${lateHour(p.before)}` : '', p.note, o ? fmtDist(distanceM(o, p)) : ''].filter(Boolean).join(' · ')))));
  const back = named('Ouvert tard', () => openLate());
  const week = [1, 2, 3, 4, 5, 6, 0].map((k) => { const d = new Date(now); d.setDate(d.getDate() + ((k - now.getDay() + 7) % 7)); return { k, list: lateOn(d) }; });
  openSheet([ico('moon'), ' Ouvert tard'], el('div', { class: 'stack' },
    holiday ? el('p', { class: 'warn' }, `Jour férié (${holiday}) : les horaires changent. Vérifie sur le site du lieu.`) : null,
    el('h3', { class: 'ring-title' }, el('span', {}, 'Ce soir'), el('span', {}, String(tonight.length))),
    tonight.length ? el('ul', { class: 'items' }, tonight.map((p) => row(p, back))) : el('p', { class: 'empty' }, holiday ? 'Rien d\'annoncé aujourd\'hui.' : lateOn(now).length ? 'Plus de nocturne ce soir parmi les grands lieux.' : `Pas de nocturne le ${DAY_NAMES[now.getDay()]} parmi les grands lieux.`),
    el('h3', { class: 'ring-title' }, el('span', {}, 'Chaque semaine'), el('span', {}, '')),
    el('div', { class: 'help-list' }, week.filter((w) => w.list.length).map((w) => el('details', { class: 'help-item week-arr' },
      el('summary', {}, el('span', { class: 'week-arr-name' }, DAY_NAMES[w.k].charAt(0).toUpperCase() + DAY_NAMES[w.k].slice(1)),
        el('span', { class: 'week-arr-sub' }, w.list.map((p) => p.name).join(', '))),
      el('ul', { class: 'items' }, w.list.map((p) => row(p, back)))))),
    el('p', { class: 'help' }, `À gauche, la fermeture. « Arriver avant » : fermeture du guichet ou dernière entrée, lue le ${LAST_CHECKED} sur le site du lieu ; le lieu quitte alors « Ce soir ». Sans cette ligne (Orsay, Art moderne) : heure non trouvée, le lieu quitte « Ce soir » une heure avant sa fermeture. Horaires habituels, vérifiés le ${LATE_CHECKED}. Fermetures exceptionnelles et 1er samedi : vérifie sur le site. Liste remise à jour avec les listes annuelles.`),
    foot(backBtn(named('Expos', () => { eventsMode = 'art'; openEvents(); }))),
  ), { tall: true, name: 'ouvert-tard', again: openLate });
}

/**
 * Mes artistes (v158) : les noms que je suis, cherchés mot pour mot dans l'agenda de la Ville (tout Paris, 7 jours).
 * Rien n'est envoyé : l'agenda est téléchargé en entier, la recherche se fait sur le téléphone.
 */
/**
 * La page d'un artiste (v161), ouverte depuis la fiche d'une œuvre ou Mes artistes : ses œuvres dans mes lieux
 * (les disparues à la fin), son site ou son Instagram noté une fois, et « Suivre ses expos » (Mes artistes). Rien n'est envoyé.
 */
function openArtist(name, back = null) {
  const n = cleanArtist(name);
  if (!n) return;
  const k = artistKey(n);
  const again = () => openArtist(n, back);
  const here = named(n, again);
  const pos = freshHere() ?? origin;
  const works = artistWorks(state.points, n, pos);
  const followed = cleanArtists(state.artists).some((x) => artistKey(x) === k);
  const link = cleanArtistLinks(state.artistLinks)[k];
  const input = el('input', { type: 'text', maxlength: '200', autocomplete: 'off', inputmode: 'url', enterkeyhint: 'done', placeholder: 'https://… ou @nom (Instagram)', 'aria-label': `Site ou Instagram de ${n}` });
  const saveLink = () => {
    const u = linkFrom(input.value);
    if (!u) { toast('Écris une adresse qui commence par https://, ou @nom pour Instagram.', true); return; }
    state.artistLinks = { ...cleanArtistLinks(state.artistLinks), [k]: { n, u } };
    persist(); again(); toast('Lien enregistré');
  };
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') saveLink(); });
  const dropLink = () => { const l = { ...cleanArtistLinks(state.artistLinks) }; delete l[k]; state.artistLinks = l; persist(); again(); toast('Lien retiré'); };
  const follow = () => { state.artists = cleanArtists([...cleanArtists(state.artists), n]); persist(); again(); toast(`${n} est dans Mes artistes`); };
  const site = link ? link.u.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '') : '';
  openSheet([ico('user'), ` ${n}`], el('div', { class: 'stack' },
    el('h3', { class: 'ring-title' }, el('span', {}, 'Ses œuvres dans tes lieux'), el('span', {}, String(works.length))),
    works.length ? el('ul', { class: 'items ev-list' }, works.map(({ p, d }) => sortieCard({ genre: 'oeuvre', name: p.name, onclick: () => openDetail(p.id, here),
      sub: [catOf(p.cat).name, p.address], d, tags: [p.gone ? el('span', { class: 'tag closed' }, 'Disparue ou recouverte') : null] })))
      : el('p', { class: 'empty' }, 'Aucune pour l\'instant. Note l\'artiste dans la fiche d\'une œuvre (Modifier → Artiste).'),
    el('h3', { class: 'fiche-sec' }, 'Son site'),
    link ? el('div', { class: 'fiche-toc' },
      el('a', { class: 'fiche-row', href: link.u, target: '_blank', rel: 'noopener' }, ico('external-link'),
        el('span', {}, site, el('small', {}, 'Noté par toi, ouvert dans le navigateur')), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))),
      el('button', { type: 'button', class: 'fiche-row danger', onclick: dropLink }, ico('trash-2'), el('span', {}, 'Retirer ce lien'), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))))
      : el('div', { class: 'stack' },
        el('label', { class: 'field' }, 'Adresse (facultatif)', input),
        el('button', { type: 'button', class: 'btn c-add', onclick: saveLink }, ico('save'), 'Enregistrer le lien'),
        el('p', { class: 'help' }, 'Recopie l\'adresse de son site officiel ou son compte Instagram (@nom). L\'appli ne le cherche pas pour toi : un faux compte est vite arrivé.')),
    el('h3', { class: 'fiche-sec' }, 'Ses expos'),
    followed ? el('button', { type: 'button', class: 'btn c-disc', onclick: () => openArtists() }, ico('palette'), 'Voir Mes artistes')
      : el('button', { type: 'button', class: 'btn c-disc', onclick: follow }, ico('plus'), 'Suivre ses expos'),
    el('p', { class: 'help' }, followed ? 'Dans Mes artistes, l\'appli cherche son nom dans l\'agenda de la Ville sur 7 jours.' : 'Son nom ira dans Mes artistes (Sorties → Expos) : l\'appli le cherchera dans l\'agenda de la Ville sur 7 jours.'),
    foot(backBtn(back ?? named('Mes artistes', () => openArtists()))),
  ), { tall: true, name: `artiste:${k}`, again });
}

/**
 * Mes salles (v166) : les lieux de sortie que je suis (salle de concert, théâtre, galerie, musée) et leur programme
 * de la semaine dans l'agenda de la Ville (tout Paris, 7 jours). Un lieu se suit depuis la page d'une de ses sorties.
 */
async function openVenues(back = named('Sorties', () => { eventsMode = 'all'; openEvents(); })) {
  track('Mes salles');
  const title = [ico('heart'), ' Mes salles'];
  const again = () => openVenues(back);
  const names = cleanVenues(state.venues);
  let failed = false;
  if (names.length && (!weekCache || weekCache.day !== new Date().toDateString())) {
    openSheet(title, el('p', { class: 'help' }, 'Recherche du programme de tes salles dans l\'agenda de la Ville de Paris (7 jours)…'), { name: 'salles' });
    try { await weekEvents(); } catch { failed = true; }
  }
  const o = evFrom;
  const found = names.length && !failed ? venueEvents(weekCache?.items ?? [], names) : [];
  const input = el('input', { type: 'text', maxlength: '80', autocomplete: 'off', placeholder: 'Ex. : Philharmonie de Paris', 'aria-label': 'Nom d\'une salle' });
  const add = () => {
    const before = cleanVenues(state.venues).length;
    state.venues = cleanVenues([...cleanVenues(state.venues), input.value]);
    if (state.venues.length === before) { toast(input.value.trim() ? 'Cette salle est déjà dans ta liste.' : 'Écris un nom.', true); return; }
    persist(); again();
  };
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') add(); });
  const removeName = (n) => { state.venues = cleanVenues(state.venues).filter((x) => x !== n); persist(); again(); };
  const here = named('Mes salles', again);
  // Suggestions (v170) : les lieux des sorties que j'ai prévues ou faites (Mon planning, Mon journal), pas encore suivis
  const known = new Set(names.map(artistKey));
  const sugg = [];
  for (const x of [...(state.plans ?? []), ...cleanOutings(state.outings)]) {
    const n = cleanVenues([x.place ?? ''])[0];
    if (n && !known.has(artistKey(n))) { known.add(artistKey(n)); sugg.push(n); }
  }
  const follow = (n) => { state.venues = cleanVenues([...cleanVenues(state.venues), n]); persist(); again(); toast(`${n} : dans Mes salles`); };
  openSheet(title, el('div', { class: 'stack' },
    names.length ? el('p', { class: 'summary' }, failed ? 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'
      : found.length ? `${plural(found.length, 'rendez-vous', 'rendez-vous')} dans tes salles cette semaine.` : 'Rien dans l\'agenda de la Ville pour tes salles cette semaine.') : null,
    found.length ? el('ul', { class: 'items ev-list' }, found.slice(0, 60).map(({ e }) => eventRow({ ...e, d: o ? distanceM(o, e) : null }, here, { week: true }))) : null,
    el('h3', { class: 'ring-title' }, el('span', {}, 'Les salles que tu suis'), el('span', {}, String(names.length))),
    names.length ? el('ul', { class: 'items' }, names.map((n) => el('li', { class: 'item' },
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, n),
        found.length ? el('span', { class: 'item-sub' }, plural(found.filter((x) => x.where === n).length, 'rendez-vous', 'rendez-vous')) : null),
      el('button', { type: 'button', class: 'go-compass', onclick: () => removeName(n), 'aria-label': `Ne plus suivre ${n}` }, ico('x'))))) : null,
    sugg.length ? el('h3', { class: 'ring-title' }, el('span', {}, 'Les lieux de tes sorties'), el('span', {}, String(Math.min(sugg.length, 8)))) : null,
    sugg.length ? el('ul', { class: 'items' }, sugg.slice(0, 8).map((n) => el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => follow(n) },
      el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('plus', { size: 18 })),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, n), el('span', { class: 'item-sub' }, 'Un appui pour la suivre')))))) : null,
    el('label', { class: 'field' }, 'Suivre une salle', input),
    el('button', { type: 'button', class: 'btn c-add', onclick: add }, ico('plus'), 'Ajouter'),
    el('p', { class: 'help' }, 'Le plus simple : « Suivre » sur la page d\'une sortie, d\'un Grand lieu, d\'une galerie ou d\'un musée gratuit. L\'appli cherche le nom tel quel (sans tenir compte des accents ni des majuscules) dans le lieu et l\'organisateur des sorties de l\'agenda « Que faire à Paris ? », sur 7 jours. Les salles qui n\'y publient pas n\'apparaîtront pas. Ta liste reste sur ce téléphone et part dans ta sauvegarde.'),
    foot(backBtn(back)),
  ), { tall: true, name: 'salles', again });
}

async function openArtists() {
  track('Mes artistes');
  const title = [ico('user'), ' Mes artistes'];
  const back = foot(backBtn(named('Expos', () => { eventsMode = 'art'; openEvents(); })));
  const names = cleanArtists(state.artists);
  let failed = false;
  if (names.length && (!weekCache || weekCache.day !== new Date().toDateString())) {
    openSheet(title, el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris (tout Paris, sur 7 jours)…'), { name: 'artistes' });
    try { await weekEvents(); } catch { failed = true; }
  }
  const o = evFrom;
  const found = names.length && !failed ? artistEvents(weekCache?.items ?? [], names) : [];
  const input = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', placeholder: 'Ex. : David Hockney', 'aria-label': 'Nom d\'un artiste' });
  const add = () => {
    const before = cleanArtists(state.artists).length;
    state.artists = cleanArtists([...cleanArtists(state.artists), input.value]);
    if (state.artists.length === before) { toast(input.value.trim() ? 'Ce nom est déjà dans ta liste.' : 'Écris un nom.', true); return; }
    persist(); openArtists();
  };
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') add(); });
  const removeName = (n) => { state.artists = cleanArtists(state.artists).filter((x) => x !== n); persist(); openArtists(); };
  openSheet(title, el('div', { class: 'stack' },
    names.length ? el('p', { class: 'summary' }, failed ? 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'
      : found.length ? `${plural(found.length, 'rendez-vous', 'rendez-vous')} avec tes artistes cette semaine, tout Paris.` : 'Aucun de tes artistes dans l\'agenda de la Ville cette semaine.') : null,
    found.length ? el('ul', { class: 'items ev-list' }, found.slice(0, 60).map(({ e }) => eventRow({ ...e, d: o ? distanceM(o, e) : null }, openArtists, { week: true }))) : null,
    el('h3', { class: 'ring-title' }, el('span', {}, 'Les artistes que tu suis'), el('span', {}, String(names.length))),
    names.length ? el('ul', { class: 'items' }, names.map((n) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openArtist(n, named('Mes artistes', () => openArtists())) },
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, n),
          el('span', { class: 'item-sub' }, [found.length ? plural(found.filter((x) => x.who.includes(n)).length, 'rendez-vous', 'rendez-vous') : '', artistWorks(state.points, n).length ? plural(artistWorks(state.points, n).length, 'œuvre dans tes lieux', 'œuvres dans tes lieux') : ''].filter(Boolean).join(' · ') || 'Ses œuvres, son site'))),
      el('button', { type: 'button', class: 'go-compass', onclick: () => removeName(n), 'aria-label': `Retirer ${n} de mes artistes` }, ico('x'))))) : null,
    el('label', { class: 'field' }, 'Ajouter un artiste', input),
    el('button', { type: 'button', class: 'btn c-add', onclick: add }, ico('plus'), 'Ajouter'),
    el('p', { class: 'help' }, 'L\'appli cherche le nom tel quel (sans tenir compte des accents ni des majuscules) dans le titre, le lieu et les mots-clés des sorties de l\'agenda « Que faire à Paris ? » de la Ville, sur 7 jours. Les galeries privées n\'y sont souvent pas. Ta liste reste sur ce téléphone et part dans ta sauvegarde.'),
    back,
  ), { tall: true, name: 'artistes', again: openArtists });
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

/** Clé d'une sortie, la même dans l'agenda du jour et dans celui de la semaine (titre et position). */
const evKey = (e) => `${e.title}|${Math.round(e.lat * 1e3)}|${Math.round(e.lng * 1e3)}`;
/** Les clés des 3 rendez-vous de mes salles montrés en tête de Sorties → Tout (v186 : pas répétés plus bas). */
function venueShownKeys() {
  const names = cleanVenues(state.venues);
  if (!names.length || weekCache?.day !== new Date().toDateString()) return new Set();
  return new Set(venueEvents(weekCache.items ?? [], names).slice(0, 3).map(({ e }) => evKey(e)));
}
/**
 * Mes salles en tête de Sorties → Tout (v166) : les 3 prochains rendez-vous de mes salles cette semaine, puis « Mes salles ».
 * Sans salle suivie : une seule ligne qui explique. Le programme de la semaine se charge une fois par jour, en arrière-plan.
 * v186 : une sortie qui a lieu aujourd'hui s'affiche comme plus bas (`todayRow` : son heure, ou « Dernier jour » pour une expo qui ferme) ; elle n'y est pas répétée.
 */
function venueBox(back, todayRow = () => null) {
  const names = cleanVenues(state.venues);
  const go = () => openVenues(named('Sorties', () => openEvents()));
  const line = (sub) => el('div', { class: 'fiche-toc' }, el('button', { type: 'button', class: 'fiche-row', onclick: go },
    ico('heart'), el('span', {}, 'Mes salles', el('small', {}, sub)), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))));
  if (!names.length) return line('Suis tes lieux préférés (« Suivre ce lieu » sur la page d\'une sortie) : leur programme ici');
  const box = el('div', { class: 'stack', style: 'gap:0' });
  const draw = () => {
    const found = venueEvents(weekCache?.items ?? [], names);
    const o = evFrom;
    if (!found.length) { fill(box, line(`${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''} : rien cette semaine`)); return; }
    fill(box, el('h3', { class: 'ring-title' }, el('span', {}, 'Mes salles cette semaine'), el('span', {}, String(found.length))),
      el('ul', { class: 'items ev-list' }, found.slice(0, 3).map(({ e }) => todayRow(e) ?? eventRow({ ...e, d: o ? distanceM(o, e) : null }, back, { week: true }))),
      el('button', { type: 'button', class: 'ev-more', onclick: go }, `Mes salles (${found.length})`, ico('chevron-right')));
  };
  if (weekCache?.day === new Date().toDateString()) draw();
  else { fill(box, line('Programme de la semaine en chargement…')); weekEvents().then(() => { if (!box.isConnected) return; if (venueShownKeys().size) openEvents(); else draw(); }) /* v186 : redessine Sorties pour retirer les doublons */.catch(() => { if (box.isConnected) fill(box, line('L\'agenda de la semaine ne répond pas')); }); }
  return box;
}

const evOpen = new Set(); // rubriques de Sorties dépliées (« Les N … »), le temps de la session
/** Sorties → « Autour de … ▾ » : d'où partent les distances. */
function openEventsFrom() {
  const o = evFrom;
  const opt = (on, icon, title, sub, onclick) => el('button', { type: 'button', class: 'menu-row c-disc', 'aria-pressed': String(on), onclick },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(on ? 'check' : icon)),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)));
  openSheet([ico('map-pin'), ' Distances depuis…'], el('div', { class: 'stack' },
    el('div', { class: 'menu' },
      opt(o?.kind === 'map', 'map', 'Le centre de la carte', 'Sans ta position', () => openEvents('map')),
      opt(o && o.kind !== 'map' && o.kind !== 'station', 'locate-fixed', 'Ma position', 'Demandée seulement maintenant', eventsFromMe),
      opt(false, 'move', 'Un autre quartier', 'Déplace la carte : une croix marque le point', pickEventsArea)),
    foot(backBtn(openEvents))), { name: 'events-from' });
}
let evFrom = null; // point de départ des Sorties : ma position (Autour de moi) ou le centre de la carte (bouton de la colonne)
async function openEvents(start = null) {
  track('Sorties');
  if (start === 'map') { const c = map.getCenter(); evFrom = { lat: c.lat, lng: c.lng, kind: 'map' }; }
  else if (start && typeof start === 'object' && Number.isFinite(start.lat)) evFrom = start; // « Ma position », demandée par un appui
  else if (start === 'near' || !evFrom) evFrom = origin;
  if (!evFrom) { openNear(); return; }
  const o = evFrom;
  const fromMap = o.kind === 'map';
  const backNear = () => (fromMap || o.via === 'now' ? null : /* v187 : ouvert depuis « Maintenant », rien à rouvrir */ el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'));
  const day = new Date().toDateString();
  const title = [ico('calendar-days'), ' Sorties du jour'];
  if (eventsMode === 'navigo') await loadNavigo(); // onglet Navigo : fichier de l'appli, l'agenda n'est pas nécessaire
  else if (!eventsCache || eventsCache.day !== day) {
    openSheet(title, el('p', { class: 'help' }, 'Recherche dans l\'agenda de la Ville de Paris…'), { name: 'events' });
    try {
      await todayEvents();
    } catch {
      openSheet(title, el('div', { class: 'stack' },
        el('p', { class: 'warn' }, 'L\'agenda de la Ville de Paris ne répond pas. Réessaie plus tard.'),
        foot(backNear())), { name: 'events' });
      return;
    }
  }
  const mode = eventsMode;
  const back = openEvents;
  const whereOn = (mode === 'all' || mode === 'free') ? evWhere : '';
  const near3 = nearbyEvents(todayOnly(eventsCache?.items ?? [], new Date(), isExpo), o, 3000).filter((e) => passWhere(e.indoor, whereOn)); // seulement les créneaux d'aujourd'hui
  const all = near3.filter((e) => e.d <= 2000 && (mode !== 'free' || e.free)).slice(0, 40);
  const last = lastChance(near3.filter((e) => mode !== 'free' || e.free));
  const lastIds = new Set(last);
  const notes = []; // sources et précautions : regroupées tout en bas, dans « Aide, sources et mise à jour »
  const head = (label, n) => (n ? el('h3', { class: 'ring-title' }, el('span', {}, label), el('span', {}, String(n))) : null);
  /** Une rubrique (v136) : son intertitre, ses 3 premières lignes, puis « Voir les N … » (v186) qui déplie le reste (le temps de la session). */
  const section = (key, label, rows, noun, max = 3) => {
    if (!rows.length) return [];
    const opened = evOpen.has(`${mode}:${key}`);
    const shown = opened || rows.length <= max + 1 ? rows : rows.slice(0, max);
    return [head(label, rows.length), el('ul', { class: 'items ev-list' }, shown),
      shown.length < rows.length ? el('button', { type: 'button', class: 'ev-more', onclick: () => { evOpen.add(`${mode}:${key}`); openEvents(); } }, `Voir les ${rows.length} ${noun}`, ico('chevron-down')) : null];
  };
  const mapList = []; // ce que montre « Carte » : { name, lat, lng, go }
  const onMap = (xs, go) => { for (const x of xs) mapList.push({ name: x.name ?? x.title, lat: x.lat, lng: x.lng, go: () => go(x) }); };

  // Temps forts de la semaine et gratuité exceptionnelle du jour : sous la plaque (Tout)
  const soon = highlightsSoon();
  const freeAll = freeNear(o, new Date(), 3000, 12);
  const freeSpecial = freeAll.filter((f) => f.rule !== 'always' && spotRank(f) !== 2); // déjà fermé ce soir : plus annoncé
  const top = [
    ...soon.map((h) => el('p', { class: 'hl-line' }, ico('sparkles'), ` ${highlightText(h)} — ${h.what}`)),
    mode === 'all' && freeSpecial.length ? el('p', { class: 'hl-line' }, ico('landmark'), ` Gratuit aujourd'hui : ${freeSpecial.map((f) => `${f.name} (${f.when})`).join(', ')}`) : null,
    listsStale() ? el('p', { class: 'hl-line' }, ico('refresh-cw'), ' Listes des temps forts et des musées gratuits à mettre à jour : demande-le à Claude.') : null,
  ];
  // Onglets soulignés, toujours à la même place
  const seg = el('div', { class: 'tabs-line', role: 'group', 'aria-label': 'Sorties à afficher' },
    [['all', 'Tout'], ['free', 'Gratuit'], ['art', 'Expos'], ['navigo', 'Navigo']].map(([m, label]) =>
      el('button', { type: 'button', 'aria-pressed': String(mode === m), onclick: () => { eventsMode = m; openEvents(); } }, label)));
  const kiosks = KIOSQUES.map((k) => ({ ...k, d: distanceM(o, k) })).sort((a, b) => spotRank(a) - spotRank(b) || a.d - b.d); // fermé à la fin
  const soonFree = freeSoon().slice(0, 3);
  let filters = null; // une seule rangée de puces sous le point de départ
  if (mode === 'all' || mode === 'free') {
    filters = [['out', 'sun', 'Dehors'], ['in', 'umbrella', 'À l\'abri']].map(([w, icon, label]) =>
      el('button', { type: 'button', class: 'chip', 'aria-pressed': String(evWhere === w), onclick: () => { evWhere = evWhere === w ? '' : w; openEvents(); } }, ico(icon), ` ${label}`));
    notes.push('Dehors ou à l\'abri : c\'est l\'organisateur qui l\'indique dans l\'agenda de la Ville (une sortie sans l\'indication est cachée par ces filtres) ; un marché couvert est à l\'abri, un marché découvert dehors. Musées et Kiosque Théâtre comptent à l\'abri.');
  }

  let body;
  const nvNear = mode === 'navigo' ? navigoNear((navigoItems ?? []).filter((x) => navigoPass(x, navigoKinds)), o, 2000, 5).slice(0, 30) : [];
  if (mode === 'navigo') {
    const within = nvNear.filter((x) => x.d <= 2000).length;
    const present = new Set((navigoItems ?? []).map((x) => navigoGroup(x.kind)));
    const flip = (g) => { if (navigoKinds.has(g)) navigoKinds.delete(g); else navigoKinds.add(g); openEvents(); };
    if (present.size > 1) filters = [el('button', { type: 'button', class: 'chip', 'aria-pressed': String(!navigoKinds.size), onclick: () => { navigoKinds.clear(); openEvents(); } }, 'Tout'),
      ...NAVIGO_GROUPS.filter((g) => present.has(g)).map((g) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(navigoKinds.has(g)), onclick: () => flip(g) }, g))];
    onMap(nvNear, (x) => openNavigo(x));
    body = [
      el('p', { class: 'help' }, ico('ticket'), ' Réductions sur présentation du passe Navigo (annuel, mois, imagine R, Senior, Liberté +).'),
      ...(nvNear.length ? section('navigo', within ? 'Lieux partenaires à moins de 2 km' : 'Lieux partenaires les plus proches', nvNear.map((x) => navigoRow(x, back)), 'lieux', 5)
        : [el('p', { class: 'empty' }, 'La liste des lieux partenaires n\'a pas pu être lue.')]),
    ];
    notes.push(`Avantages Navigo : liste « Lieux bénéficiant des avantages culture Navigo » d'Île-de-France Mobilités${navigoUpdated ? ` du ${frenchDate(navigoUpdated)}` : ''}, gardée dans l'appli (Paris et petite couronne). Les offres « en cours d'élaboration » ou « à venir » sont écartées.`);
  } else if (mode === 'art') {
    const expos = all.filter((e) => isExpo(e) && !lastIds.has(e)).slice(0, 15);
    const galBox = el('div', { class: 'stack' });
    const drawGal = () => {
      if (!galleries) { fill(galBox, head('Galeries', 1), el('p', { class: 'help' }, 'Lecture de la liste des galeries de Paris…')); return; }
      const g = galleriesNear(galleries, o).slice(0, 15);
      fill(galBox, ...section('galeries', 'Galeries à moins de 1,5 km', g.map((x) => galleryRow(x, back)), 'galeries'),
        g.length ? el('button', { type: 'button', class: 'ev-more', onclick: () => openGalleryWalk(openEvents) }, 'Parcours des galeries ouvertes', ico('chevron-right')) : el('p', { class: 'empty' }, 'Aucune galerie connue à moins de 1,5 km.'));
    };
    drawGal();
    if (!galleries) loadGalleries().then(() => { if (view === 'events' && eventsMode === 'art') drawGal(); })
      .catch((e) => fill(galBox, el('p', { class: 'warn' }, artFileWarn('des galeries', e))));
    else onMap(galleriesNear(galleries, o).slice(0, 15), (g) => openGalleryCard(g));
    onMap([...last, ...expos], (e) => openEventPage(e, back));
    const entry = (icon, title, sub, onclick) => el('button', { type: 'button', class: 'menu-row c-disc', onclick },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(icon)),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)),
      el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right')));
    body = [
      el('h3', { class: 'ring-title' }, el('span', {}, 'Tout Paris'), el('span', {}, '')),
      el('div', { class: 'menu' },
        entry('landmark', 'Grands lieux', `${ART_PLACES.length} musées, fondations, salles de concert`, () => openArtPlaces()),
        entry('calendar-days', 'Expos de la semaine', 'Par arrondissement, celles qui ferment d\'abord', () => openWeekExpos()),
        entry('moon', 'Ouvert tard', (() => { const t = lateTonight(new Date(), ART_PLACES, holidayOn()); return t.length ? `Ce soir : ${t.slice(0, 3).map((p) => p.name.replace(/^Musée (du |de l'|d')?/, '')).join(', ')}${t.length > 3 ? '…' : ''}` : 'Les nocturnes des musées et fondations'; })(), () => openLate()),
        entry('shapes', 'Art dans la rue', 'Statues et sculptures à moins de 1 km', () => openStreetArt()),
        entry('user', 'Mes artistes', cleanArtists(state.artists).length ? plural(cleanArtists(state.artists).length, 'artiste suivi', 'artistes suivis') : 'Les noms que tu suis, cherchés dans l\'agenda', () => openArtists())),
      ...section('last', 'Dernière chance', last.map((e) => eventRow(e, back, { last: true })), 'expos'),
      ...section('expos', 'Expos en cours', expos.map((e) => eventRow(e, back)), 'expos'),
      galBox,
      !last.length && !expos.length ? el('p', { class: 'help' }, 'Aucune expo de l\'agenda de la Ville à moins de 3 km aujourd\'hui. Les galeries privées n\'y sont souvent pas : regarde les galeries.') : null,
    ];
  } else {
    const mkAll = nearestMarkets(await loadMarkets(), o).filter((m) => m.d <= 2500 && passWhere(Boolean(m.covered), whereOn));
    // En ce moment / plus tard aujourd'hui, chacun du plus proche au plus loin ; un marché déjà fini n'apparaît plus.
    const items = [
      ...mkAll.map((m) => ({ m, d: m.d, when: marketWhen(m).when })),
      // « En ce moment » et « Plus tard » : seulement un créneau connu aujourd'hui (une expo sans créneau reste dans Expos)
      ...all.filter((e) => !lastIds.has(e) && e.slotStart).map((e) => ({ e, d: e.d, when: startsLater(e) ? 'later' : 'now' })),
    ].filter((x) => x.when !== 'done').sort((x, y) => x.d - y.d);
    const now = items.filter((x) => x.when === 'now');
    const later = items.filter((x) => x.when === 'later').slice(0, 15);
    const card = (x, opts = {}) => (x.m ? marketRow(x.m, back, opts) : eventRow(x.e, back, opts));
    for (const x of [...now, ...later]) mapList.push({ name: x.m ? x.m.name : x.e.title, lat: (x.m ?? x.e).lat, lng: (x.m ?? x.e).lng, go: () => (x.m ? openMarket(x.m) : openEventPage(x.e, back)) });
    if (mode === 'free') {
      const freeItems = [...now, ...later];
      const freePlaces = whereOn === 'out' ? [] : freeAll; // musées et théâtre : à l'abri
      onMap(freePlaces, (f) => openFreeSpot(f));
      body = [
        ...section('sorties', 'Sorties gratuites', freeItems.map((x) => card(x)), 'sorties'),
        ...section('musees', 'Musées gratuits', freePlaces.map((f) => freeRow(f, back)), 'musées'),
        ...(whereOn === 'out' ? [] : section('theatre', 'Théâtre à moitié prix', kiosks.map((k) => kiosqueRow(k, back)), 'kiosques')),
        soonFree.length ? head('Bientôt gratuit', soonFree.length) : null,
        soonFree.length ? el('ul', { class: 'items' }, soonFree.map((x) => el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openFreeDay(x.date) },
          el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('calendar-days', { size: 18 })),
          el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, dayTitle(x.date).replace(/^./, (c) => c.toUpperCase())), el('span', { class: 'item-sub' }, x.text.replace(/^./, (c) => c.toUpperCase()))),
          el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')))))) : null, // v168 : chaque jour s'ouvre
        !freeItems.length && !freePlaces.length ? el('p', { class: 'empty' }, `Aucune sortie gratuite${whereOn === 'out' ? ' dehors' : whereOn === 'in' ? ' à l\'abri' : ''} trouvée aujourd'hui à moins de 2 km.`) : null,
      ];
      if (freeAll.length) notes.push(`Musées gratuits : liste vérifiée le ${FREE_CHECKED} (musées de la Ville de Paris, 1er dimanche des musées nationaux, Louvre le 1er vendredi soir). Les règles changent : vérifie sur le site du musée.`);
    } else {
      onMap(last.slice(0, 3), (e) => openEventPage(e, back));
      // v186 : une sortie déjà montrée dans Mes salles (en tête) n'est pas répétée plus bas ; elle reste sur la Carte
      const inVenues = venueShownKeys();
      const notShown = (e) => !inVenues.has(evKey(e));
      const todayByKey = new Map(near3.map((e) => [evKey(e), e]));
      body = [
        venueBox(back, (w) => { const t = todayByKey.get(evKey(w)); return t ? eventRow(t, back, { last: lastIds.has(t) }) : null; }),
        ...top,
        ...section('now', 'En ce moment', now.filter((x) => !x.e || notShown(x.e)).slice(0, 25).map((x) => card(x)), 'sorties'),
        ...section('later', 'Plus tard aujourd\'hui', later.filter((x) => !x.e || notShown(x.e)).map((x) => card(x)), 'sorties'),
        ...section('last', 'Dernière chance', last.filter(notShown).map((e) => eventRow(e, back, { last: true })), 'expos'),
        !items.length && !last.length ? el('p', { class: 'empty' }, `Aucune sortie${whereOn === 'out' ? ' dehors' : whereOn === 'in' ? ' à l\'abri' : ''} trouvée aujourd'hui à moins de 2 km.`) : null,
      ];
    }
  }
  // Le point de départ des distances : un seul contrôle, et « Carte » pour voir la liste de l'onglet sur la carte
  const fromLabel = fromMap ? ['', 'Centre de la carte'] : o.kind === 'station' ? ['', o.label] : ['Autour de ', 'toi'];
  const tabName = { all: 'Sorties', free: 'Gratuit', art: 'Expos', navigo: 'Avantages Navigo' }[mode];
  const ctx = el('div', { class: 'ev-ctx' },
    el('button', { type: 'button', class: 'ev-from', onclick: openEventsFrom, 'aria-label': `Point de départ des distances : ${fromLabel.join('')}. Changer` },
      ico(fromMap ? 'map-pin' : o.kind === 'station' ? 'train-front' : 'locate-fixed'), el('span', { class: 'ev-from-text' }, fromLabel[0], el('b', {}, fromLabel[1])), ico('chevron-down')),
    el('button', { type: 'button', class: 'btn c-disc ev-mapbtn', disabled: !mapList.length, onclick: () => showPeek({ kicker: tabName, label: plural(mapList.length, 'lieu', 'lieux'), items: mapList, icon: { all: 'calendar-days', free: 'landmark', art: 'palette', navigo: 'ticket' }[mode],
      open: (x) => x.go(), back: () => openEvents(), from: o }) }, ico('map'), 'Carte'));
  openSheet(title, el('div', { class: 'stack ev-page' },
    seg, // les onglets restent toujours à la même place
    ctx,
    filters ? el('div', { class: 'list-chips chips-scroll', role: 'group', 'aria-label': mode === 'navigo' ? 'Disciplines' : 'Dehors ou à l\'abri' }, ...filters) : null,
    ...body,
    // Les sites utiles (v164) : visibles en bas de Sorties, et non plus cachés dans l'aide ; le nom du site est écrit en clair
    el('h3', { class: 'fiche-sec' }, 'Pour aller plus loin'),
    el('div', { class: 'fiche-toc' }, SORTIES_LINKS.map(([title, sub, href]) => el('a', { class: 'fiche-row', href, target: '_blank', rel: 'noopener noreferrer' },
      ico('external-link'), el('span', {}, title, el('small', {}, sub)), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))))),
    el('details', { class: 'help-item sources', open: Boolean(marketsTime) && Date.now() - marketsTime > 30 * 864e5 }, el('summary', {}, ico('info'), 'Aide, sources et mise à jour'),
      el('div', { class: 'stack sources-body' },
        el('p', { class: 'help' }, `Ici : les marchés, brocantes, fêtes et expos du jour de l'agenda de la Ville, à moins de 2 km ${fromMap ? 'du centre de la carte' : 'de toi'}. Touche une ligne pour Y aller, la Boussole, le Métro ou l'ajouter à ta carte.`),
        el('p', { class: 'help' }, 'Mise à jour automatique : l\'agenda se recharge chaque jour à la première ouverture, les marchés tous les 7 jours, les galeries tous les 30 jours. Le bouton recharge tout de suite (utile si une sortie vient d\'être annoncée ou si le réseau a manqué).'),
        el('button', { type: 'button', class: 'btn c-disc', onclick: refreshSorties }, ico('refresh-cw'), 'Mettre à jour maintenant'),
        el('p', { class: 'help' }, [`Agenda : aujourd'hui`, marketsTime ? `marchés : liste du ${new Date(marketsTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : '', mode === 'art' && galleriesTime ? `galeries : liste du ${new Date(galleriesTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''].filter(Boolean).join(' · ') + '.'),
        el('p', { class: 'help' }, `Sources : marchés et agenda « Que faire à Paris ? » de la Ville de Paris${mode === 'art' ? ', galeries OpenStreetMap' : ''}. Dernière chance : expos de l'agenda qui ferment dans moins de 7 jours. Les fermetures exceptionnelles ne sont pas dans ces données. Ta position n'est pas envoyée : l'appli trie sur le téléphone.${soon.length ? ` Temps forts vérifiés le ${HIGHLIGHTS_CHECKED}.` : ''}`),
        mode === 'art' ? el('p', { class: 'help' }, 'Galeries : la plupart ferment le dimanche et le lundi ; sans horaires connus, vérifie avant d\'y aller.') : null,
        ...notes.map((t) => el('p', { class: 'help' }, t)))),
    foot(backNear()),
  ), { tall: true, name: 'events', again: openEvents });
  nearLayer.clearLayers();
  if (!following && !fromMap) meMarker(o.lat, o.lng).addTo(nearLayer);
  for (const e of mode === 'navigo' ? nvNear : mode === 'art' ? [...last, ...all.filter(isExpo)] : [...last.slice(0, 3), ...all]) L.circleMarker([e.lat, e.lng], { radius: 6, color: '#c2255c', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  if (mode === 'art' && galleries) for (const g of galleriesNear(galleries, o).slice(0, 15)) L.circleMarker([g.lat, g.lng], { radius: 6, color: '#A54A28', weight: 3, fillColor: openState(g.hours)?.open ? '#A54A28' : '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
}


/* ---------- Voir sur la carte : les lieux d'une liste (Navigo, galeries), le temps de les regarder ----------
   Rien de permanent : un bandeau en bas dit ce qui est affiché, × retire tout, un appui sur le bandeau rouvre la liste. */
const peekLayer = L.layerGroup().addTo(map);
let peekCard = null;
let peekOff = null; // ce qu'un « Voir sur la carte » doit défaire en partant (ex. le toucher de la carte des résultats)
function endPeek() { peekLayer.clearLayers(); peekCard?.remove(); peekCard = null; peekOff?.(); peekOff = null; document.querySelector('.area-cross')?.remove(); }

/** Sorties → « Autre quartier » : la page se ferme, une croix marque le centre ; on déplace la carte puis on touche le bandeau. */
function pickEventsArea() {
  closeSheet();
  endPeek();
  const box = document.getElementById('map');
  box.append(el('span', { class: 'area-cross', 'aria-hidden': 'true' }, ico('plus')));
  peekCard = el('div', { class: 'now-card peek-card', role: 'region', 'aria-label': 'Choisir le quartier des sorties' },
    el('button', { type: 'button', class: 'now-open', onclick: () => { endPeek(); openEvents('map'); } },
      el('span', { class: 'now-text' }, el('span', { class: 'now-kicker' }, 'Sorties'), el('span', { class: 'now-name' }, 'Déplace la carte'), el('span', { class: 'now-sub' }, 'La croix au centre, puis touche ici : sorties autour de la croix')),
      el('span', { class: 'now-chev', 'aria-hidden': 'true' }, '›')),
    el('button', { type: 'button', class: 'now-close', 'aria-label': 'Annuler', onclick: endPeek }, ico('x')));
  document.body.append(peekCard);
}

/** Sorties → « Ma position » : la position n'est demandée qu'à cet appui (rien n'est envoyé : tout est trié sur le téléphone). */
async function eventsFromMe() {
  toast('Recherche de ta position…');
  try {
    const pos = await locate();
    hideToast();
    openEvents({ lat: pos.lat, lng: pos.lng, kind: 'here' });
  } catch (e) { toast(e.message, true); }
}
/** Le bandeau de « Voir sur la carte » : ce qui est montré, un appui pour revenir, la croix pour tout retirer. */
function showPeekCard(kicker, label, back, sub = 'Touche ici pour revenir à la liste') {
  peekCard = el('div', { class: 'now-card peek-card', role: 'region', 'aria-label': `${kicker} sur la carte` },
    el('button', { type: 'button', class: 'now-open', onclick: () => { endPeek(); back(); } },
      el('span', { class: 'now-text' }, el('span', { class: 'now-kicker' }, kicker), el('span', { class: 'now-name' }, label), el('span', { class: 'now-sub' }, sub)),
      el('span', { class: 'now-chev', 'aria-hidden': 'true' }, '›')),
    el('button', { type: 'button', class: 'now-close', 'aria-label': 'Retirer de la carte', onclick: endPeek }, ico('x')));
  document.body.append(peekCard);
}
/** items : { name, lat, lng } ; open(x) ouvre la fiche d'un lieu ; off(x) : lieu fermé (contour pointillé) ; back : rouvre la liste. */
function showPeek({ kicker, label, items, icon, open, off = () => false, back, from = null }) {
  closeSheet();
  endPeek();
  if (!items.length) { toast('Rien à afficher sur la carte.'); return; }
  for (const x of items) {
    L.marker([x.lat, x.lng], { keyboard: true, title: x.name, zIndexOffset: 400,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="peek-pin${off(x) ? ' off' : ''}">${svgIcon(icon, { size: 15, stroke: 2.4 })}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
      .on('add', (e) => e.target.getElement()?.setAttribute('aria-label', `${x.name}${off(x) ? ', fermé' : ''}`))
      .on('click', () => open(x))
      .addTo(peekLayer);
  }
  if (from) L.marker([from.lat, from.lng], { interactive: false, keyboard: false, zIndexOffset: 350, // point de départ des distances
    icon: L.divIcon({ className: 'pin-wrap', html: `<span class="from-pin" title="Point de départ">${svgIcon(from.kind === 'map' ? 'plus' : 'locate-fixed', { size: 14, stroke: 2.6 })}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(peekLayer);
  showPeekCard(kicker, label, back);
  map.fitBounds(L.latLngBounds([...items, ...(from ? [from] : [])].map((x) => [x.lat, x.lng])), { paddingTopLeft: [24, 90], paddingBottomRight: [84, 170], maxZoom: 16, animate: false }); // ni sous la colonne de boutons, ni sous le bandeau
}
/** Une galerie touchée sur la carte : sa ligne de liste dans une petite feuille (état, boussole, métro, ajouter). */
/* Art dans la rue (v158) : statues, sculptures, installations nommées (OpenStreetMap) ; liste de tout Paris rangée
   dans l'appli par le robot (data/oeuvres.json, v170). */
let streetArt = null;
let streetArtTime = 0;
let streetArtUpdated = '';
let streetArtLoading = null;
function loadStreetArt(force = false) {
  if (streetArt && !force) return Promise.resolve(streetArt);
  streetArtLoading ??= readArtFile(() => fetch('data/oeuvres.json'), parseStreetArt)
    .then(({ items, updated, time }) => { streetArt = items; streetArtUpdated = updated; streetArtTime = time; return streetArt; })
    .finally(() => { streetArtLoading = null; });
  return streetArtLoading;
}
/** Une œuvre : ce qu'on sait (type, artiste, année), Y aller, Boussole, Métro ; l'article Wikipédia s'il existe. */
function openStreetArtCard(a, back = null) {
  openSpot({ icon: 'shapes', title: a.name, kicker: a.type, lines: [[a.artist, a.year].filter(Boolean).join(', ') || 'Artiste non indiqué.', 'Dans la rue : visible à toute heure, sauf travaux.'],
    place: a, link: a.wiki ? [a.wiki, 'Article Wikipédia'] : null, back: typeof back === 'function' ? back : null, key: `oeuvre:${a.lat},${a.lng}` });
}
/** Art dans la rue autour du point de départ de Sorties : les 30 œuvres les plus proches, mes artistes d'abord. */
async function openStreetArt() {
  track('Art dans la rue');
  const title = [ico('shapes'), ' Art dans la rue'];
  const backExpos = foot(backBtn(named('Expos', () => { eventsMode = 'art'; openEvents(); })));
  const o = evFrom ?? origin;
  if (!o) { openNear(); return; }
  if (!streetArt) {
    openSheet(title, el('p', { class: 'help' }, 'Lecture de la liste des œuvres de Paris…'), { name: 'art-rue' });
    try { await loadStreetArt(); } catch (e) {
      openSheet(title, el('div', { class: 'stack' }, el('p', { class: 'warn' }, artFileWarn('des œuvres', e)), backExpos), { name: 'art-rue' });
      return;
    }
  }
  const near = streetArtNear(streetArt, o, 1000, state.artists).slice(0, 30);
  const back = named('Art dans la rue', () => openStreetArt());
  openSheet(title, el('div', { class: 'stack' },
    el('p', { class: 'summary' }, near.length ? `${plural(near.length, 'œuvre', 'œuvres')} à moins de 1 km ${o.kind === 'map' ? 'du centre de la carte' : 'de toi'}.` : `Aucune œuvre connue à moins de 1 km ${o.kind === 'map' ? 'du centre de la carte' : 'de toi'}.`),
    near.length ? el('button', { type: 'button', class: 'btn c-disc', onclick: () => showPeek({ kicker: 'Art dans la rue', label: plural(near.length, 'œuvre', 'œuvres'), items: near, icon: 'shapes',
      open: (x) => openStreetArtCard(x, back), back: () => openStreetArt(), from: o }) }, ico('map'), 'Voir sur la carte') : null,
    near.length ? el('ul', { class: 'items ev-list' }, near.map((a) => sortieCard({ genre: 'oeuvre', name: a.name, onclick: () => openStreetArtCard(a, back), sub: [a.type, a.artist], d: a.d,
      tags: [a.mine ? el('span', { class: 'tag open' }, 'Tes artistes') : null] }))) : null,
    el('p', { class: 'help' }, `Statues, sculptures et installations nommées, d'après OpenStreetMap (liste de tout Paris rangée dans l'appli${streetArtUpdated ? ` le ${frenchDate(streetArtUpdated)}` : ''}, rien n'est envoyé). Les fresques, graffitis et mosaïques ne sont pas montrés : ils disparaissent trop souvent. La liste n'est pas complète.`),
    backExpos,
  ), { tall: true, name: 'art-rue', again: openStreetArt });
}

function openGalleryCard(g, back = null) {
  const st = openState(g.hours);
  openSpot({ icon: 'palette', title: g.name, kicker: g.kind || 'Galerie', lines: [g.address, !st ? 'Horaires inconnus : vérifie avant d\'y aller.' : st.open ? `Ouverte${st.until ? ` jusqu'à ${hhText(st.until)}` : ''}.` : 'Fermée en ce moment.', closedDaysText(g.hours)],
    place: g, link: g.site ? [g.site, 'Site de la galerie'] : null, back: typeof back === 'function' ? back : null, key: `galerie:${g.lat},${g.lng}`, add: { hours: g.hours }, fav: 'galerie' });
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
    try { await loadGalleries(); } catch (e) {
      openSheet([ico('palette'), ' Parcours galeries'], el('div', { class: 'stack' }, el('p', { class: 'warn' }, artFileWarn('des galeries', e)), foot(el('button', { type: 'button', class: 'btn', onclick: () => (galBack ?? openRoutes)() }, galBack === openEvents ? '← Sorties' : '← Itinéraire'))), { name: 'galwalk' });
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => (galBack ?? openRoutes)() }, galBack === openEvents ? '← Sorties' : '← Itinéraire')),
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
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('appli') }, '← Appli')),
  ), { name: 'appqr' });
}

/* ---------- QR code d'un lieu, à montrer à quelqu'un à côté de toi ---------- */

function showQr(p, back, withNote = false) {
  const c = catOf(p.cat);
  const box = el('div', { class: 'qr-box', role: 'img', 'aria-label': `QR code du lieu ${p.name}` });
  const draw = (on) => { // le code change avec la case : avec la note, il a plus de points
    const q = qrcode(0, 'M'); q.addData(placeLink(location.href, p, c.name, c.icon, { note: on })); q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  };
  draw(withNote);
  const nc = noteCheck(p, draw);
  if (nc) nc.box.checked = withNote;
  openSheet([ico('qr-code'), ' QR code'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, p.name), box, nc?.row,
    el('p', { class: 'help' }, `Ton ami le scanne avec l'appareil photo : le lieu s'ouvre, prêt à être ajouté à sa carte.${nc ? ' Ton commentaire ne part que si la case est cochée.' : ''}`),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openDetail(p.id, back) }, '← Fiche')),
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
  // Bus (v148) : les lignes qui vont jusqu'à mon arrêt maison, depuis un arrêt à moins de 8 min à pied
  if (home.bus) await loadBus();
  const busOpts = home.bus && busReady() ? busHome(busData, from, `${home.bus.n}|${home.bus.c}`, minutesToMeters(8)) : null;
  const busBlock = !home.bus ? [el('p', { class: 'help' }, 'Pour rentrer aussi en bus : choisis ton arrêt dans Mes stations.')] : [
    el('h3', { class: 'ring-title' }, el('span', {}, `En bus jusqu'à ${home.bus.n}`), el('span', {}, busOpts?.length ? String(busOpts.length) : '')),
    !busReady() ? el('p', { class: 'empty' }, 'Les arrêts de bus ne sont pas encore chargés. Pour les avoir tout de suite : Réglages → Appli → Données de l\'appli → Lancer le robot maintenant.')
      : busOpts === null ? el('p', { class: 'empty' }, 'Ton arrêt de bus n\'existe plus dans la liste : choisis-le à nouveau dans Mes stations.')
        : busOpts.length ? el('ul', { class: 'items' }, busOpts.map((o) => el('li', { class: 'item' },
          el('button', { type: 'button', class: 'item-main', onclick: () => openCompass({ name: `Arrêt ${o.stop[2]}`, lat: o.stop[0], lng: o.stop[1] }), 'aria-label': `Boussole vers l'arrêt ${o.stop[2]}, lignes ${o.lines.join(', ')}` },
            el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('bus', { size: 18 })),
            el('span', { class: 'item-text' },
              el('span', { class: 'item-name' }, o.stop[2]),
              el('span', { class: 'lines' }, o.lines.map((l) => el('span', { class: 'bus-line' }, l))),
              el('span', { class: 'item-sub' }, [`${walkMinutes(o.d)} min à pied`, busPlace(busData, o.stop)].filter(Boolean).join(' · ')))))))
          : el('p', { class: 'empty' }, `Aucun bus vers ${home.bus.n} à moins de 8 min à pied.`),
  ];
  await loadGares();
  const railNear = garesNear(gares, from, 1500, 1)[0];
  const metroD = near[0]?.d ?? Infinity;
  const railLine = railNear && railNear.d + 200 < metroD ? el('p', { class: 'help' }, ico('train-front'), ` Plus près que le métro : ${railNear.station.n} (${gareLines(railNear.station)}), ${fmtWalk(railNear.d)}. Vérifie qu'il va vers chez toi.`) : null;
  openSheet([ico('house'), ` Rentrer · ${home.label}`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `Vers ${home.st.n}. Les stations les plus proches de toi\u00a0:`),
    railLine,
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
    ...busBlock,
    el('p', { class: 'help' }, `Métro et RER (là où le RER croise le métro) : estimation sans horaires.${home.bus ? ' Bus : les lignes qui vont jusqu\'à ton arrêt, sans horaires ni sens ; vérifie le sens à l\'arrêt. Touche un arrêt pour la boussole.' : ''}`),
    trafficLink(),
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
  }, thenGo ? null : { name: 'Mes stations', fn: openMyStations });
  toast('Choisis ta station (Maison, Travail…)');
}
/** Choisir l'arrêt de bus « maison » d'une de mes stations (v148) : d'abord les plus proches de la station, ou par son nom. */
async function pickBusStop(s, query = '') {
  await Promise.all([loadBus(), stationsReady]);
  if (!busReady()) { toast('Les arrêts de bus ne sont pas encore chargés. Pour les avoir tout de suite : Réglages → Appli → Données de l\'appli → Lancer le robot maintenant.', true); return; }
  const st = stationByName(s.station);
  const results = el('ul', { class: 'items' });
  const input = el('input', { type: 'search', value: query, placeholder: 'Nom de l\'arrêt (ex. Gare du Nord)', 'aria-label': 'Chercher un arrêt de bus', enterkeyhint: 'search', autocomplete: 'off' });
  const draw = () => {
    const found = searchBusStops(busData, input.value, st ?? null, 12);
    fill(results, ...(found.length ? found.map(({ stop, d }) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => {
        state = setMyStationBus(state, s.id, { n: stop[2], c: stop[3] }); persist(); toast(`${s.label} : arrêt ${stop[2]}`); openMyStations();
      } },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('bus', { size: 18 })),
        el('span', { class: 'item-text' },
          el('span', { class: 'item-name' }, stop[2]),
          el('span', { class: 'lines' }, busLines(busData, stop).slice(0, 8).map((l) => el('span', { class: 'bus-line' }, l))),
          el('span', { class: 'item-sub' }, [busPlace(busData, stop), st && !input.value.trim() ? `${fmtDist(d)} de ${st.n}` : ''].filter(Boolean).join(' · '))))))
      : [el('li', { class: 'empty' }, 'Aucun arrêt de ce nom à Paris et en petite couronne.')]));
  };
  input.addEventListener('input', draw);
  draw();
  openSheet([ico('bus'), ` Arrêt de bus · ${s.label}`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, st ? `Les arrêts les plus proches de ${st.n}, ou cherche par le nom. Rentrer te dira quelles lignes y vont.` : 'Cherche ton arrêt par son nom.'),
    el('label', { class: 'field' }, 'Arrêt', input),
    results,
    s.bus ? el('button', { type: 'button', class: 'btn danger', onclick: () => { state = setMyStationBus(state, s.id, null); persist(); toast('Arrêt de bus retiré'); openMyStations(); } }, ico('trash-2'), `Retirer l'arrêt ${s.bus.n}`) : null,
    foot(el('button', { type: 'button', class: 'btn', onclick: openMyStations }, '← Mes stations')),
  ), { tall: true, name: `busstop:${s.id}`, again: () => pickBusStop(s, input.value) });
}
function openMyStations() {
  const mine = state.myStations ?? [];
  openSheet([ico('house'), ' Mes stations'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Tes stations à toi (Maison, Travail…). Rentrer te dit quel métro prendre pour y aller, et quel bus si tu choisis ton arrêt. Elles partent dans ta sauvegarde, pas dans les lieux partagés.'),
    mine.length ? el('div', {}, mine.map((s) => el('div', { class: 'cat-row mystation-row' },
      el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('house', { size: 18 })),
      el('span', { class: 'cat-name' }, s.label, el('br'), el('span', { class: 'cat-count' }, `Ⓜ ${s.station}`)),
      el('button', { type: 'button', class: 'btn danger move', 'aria-label': `Retirer ${s.label}`, onclick: () => { state = removeMyStation(state, s.id); persist(); openMyStations(); } }, ico('x')),
      el('button', { type: 'button', class: 'btn c-metro bus-pick', onclick: () => pickBusStop(s) }, ico('bus'), s.bus ? `Arrêt de bus : ${s.bus.n}` : 'Choisir mon arrêt de bus')))) : null,
    el('button', { type: 'button', class: 'btn c-metro', onclick: () => pickMyStation(false) }, ico('plus'), 'Ajouter une station'),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings() }, '← Réglages')),
  ), { tall: true, name: 'mystations', again: openMyStations });
}

/* ---------- Température et qualité de l'air : petit badge sur la carte ---------- */

let air = null;
const wxBadge = document.getElementById('wxBadge');
/** Arrondissement où je suis, seulement s'il est sûr (position de moins de 10 min, assez précise, loin d'une limite). */
const arrHere = () => (arrData ? arrSure(here, arrData) : null);
function drawWx() {
  const day = dayNote();
  const a = arrHere();
  if (!meteo && !air && !day && !a) { wxBadge.hidden = true; return; }
  wxBadge.hidden = false;
  fill(wxBadge,
    a ? el('b', { class: 'wx-arr' }, arrOrd(a)) : null,
    a && (day || meteo || air) ? el('span', { class: 'wx-sep', 'aria-hidden': 'true' }, '·') : null,
    day ? el('span', { class: 'day-tag' }, day.short) : null,
    meteo?.temp != null ? el('b', {}, `${meteo.temp}°`) : null,
    meteo?.rain ? ico('cloud-rain', { size: 15 }) : null,
    air ? el('span', { class: `air-dot air-${air.level}`, 'aria-hidden': 'true' }) : null,
    air ? `Air ${air.label.toLowerCase()}` : null);
  wxBadge.setAttribute('aria-label', [a ? `${arrOrd(a)} arrondissement` : '', day ? (day.short === 'Férié' ? 'jour férié' : 'dimanche') : '', meteo?.temp != null ? `${meteo.temp} degrés` : '', meteo?.rain ? 'pluie' : '', air ? `qualité de l'air : ${air.label}` : ''].filter(Boolean).join(', ') + '. Détails');
}
const AIR_ADVICE = {
  bon: 'Air de bonne qualité : aucune précaution.', correct: 'Rien à signaler pour l\'air.', moyen: 'Les personnes sensibles peuvent limiter les efforts longs.',
  mediocre: 'Évite les efforts intenses dehors, surtout près des grands axes.', 'tres-mediocre': 'Limite les efforts dehors ; privilégie les parcs et les rues calmes.',
  extreme: 'Évite les efforts dehors aujourd\'hui.',
};
function openWeather() {
  track('Météo et air');
  const day = dayNote();
  const a = arrHere();
  openSheet([ico('thermometer-sun'), day ? ' Aujourd\'hui' : ' Météo et air'], el('div', { class: 'stack' },
    a ? el('p', { class: 'where-big' }, `Tu es dans le ${arrOrd(a)} arrondissement`) : null,
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
      const r = await net(MARKETS_URL);
      if (!r.ok) throw new Error(String(r.status));
      const items = parseMarkets(await r.json());
      if (items.length) { cached = { time: Date.now(), items }; try { storage.setItem('carte-paris.marches', JSON.stringify(cached)); } catch { /* trop gros */ } }
    } catch { if (force) throw new Error('marchés'); /* sinon on garde l'ancienne copie */ }
  }
  // niceName : une copie gardée d'avant la v116 a encore les noms en majuscules
  markets = [...(cached?.items ?? []).map((m) => ({ ...m, name: niceName(m.name) })), ...COVERED_MARKETS]; // les couverts : liste fixe, toujours là
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
const textOn = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.3 ? '#15181D' : '#ffffff'; };
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
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="line-tag${rer ? ' rer' : ''}" style="--c:${ln.color};--t:${textOn(ln.color)}">${rer ? `RER ${ln.ref}` : ln.ref}</span>`, iconSize: [0, 0] }) }).addTo(linesLayer); /* centrée en CSS : elle grandit avec la taille du texte (v177) */
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
  if (!(markets ?? []).some((x) => !x.covered)) toast('Les marchés découverts de la Ville de Paris ne répondent pas pour le moment.', true);
  // Dans la rue : brocantes, fêtes, expos en plein air, marchés éphémères de l'agenda du jour
  let ev = [];
  try { ev = todayOnly(await todayEvents(), new Date(), (e) => isExpo(e) || streetKind(e) === 'marche'); } catch { return; } // sans créneau publié : seulement une expo ou un marché éphémère, ouverts toute leur période
  if (!state.showMarkets) return;
  const now = new Date();
  const seen = new Set();
  for (const e of ev) {
    const kind = streetKind(e);
    if (!kind || ((e.slotEnd ?? e.end) && (e.slotEnd ?? e.end) < now)) continue;
    const key = `${e.title}|${e.lat.toFixed(4)}|${e.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    L.marker([e.lat, e.lng], { keyboard: true, title: e.title, alt: e.title, zIndexOffset: -90,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="market-pin street-pin">${svgIcon(STREET_ICON[kind], { size: 15, stroke: 2.2 })}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) })
      .on('click', () => openStreetEvent(e)).addTo(marketsLayer);
  }
}
/** Fiche d'un événement de rue (agenda de la Ville) : la page d'une sortie, avec le genre « Dans la rue ». */
function openStreetEvent(e) {
  const kind = streetKind(e) ?? 'fete';
  openEventPage(e, null, { label: STREET_LABEL[kind], icon: STREET_ICON[kind] });
}
function openMarket(m, back = null) {
  const d = freshHere() ? distanceM(freshHere(), m) : null;
  openSheet([ico('store'), ` ${m.name}`], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `Aujourd'hui${hoursToday(m) ? ` : ${hoursToday(m)}` : ''}${d != null ? ` · ${fmtWalk(d)}` : ''}`),
    m.place ? el('p', { class: 'where' }, m.place) : null,
    m.products ? el('p', { class: 'help' }, m.products) : null,
    el('p', { class: 'help' }, m.covered ? 'Marché couvert, à l\'abri de la pluie. Ouvert du mardi au dimanche, fermé le lundi.' : `Se tient le ${['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].filter((_, i) => m.days[i]).join(', ')}.`),
    el('a', { class: 'btn primary go-bar', href: mapsUrl(m, d ?? 1000), target: '_blank', rel: 'noopener' }, el('span', { 'aria-hidden': 'true' }, '→'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: m.name, lat: m.lat, lng: m.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: m.name, lat: m.lat, lng: m.lng, id: `mk:${m.lat},${m.lng}` }, named('Marché', () => openMarket(m, back))), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openForm({ name: m.name, lat: m.lat, lng: m.lng, address: m.place, acc: null }) }, ico('plus'), 'Ajouter')),
    back ? backBtn(back) : null,
    el('p', { class: 'help' }, m.covered ? `Horaires relevés sur paris.fr le ${COVERED_CHECKED} ; ils peuvent changer les jours fériés.` : 'Données « Marchés découverts », Ville de Paris. Horaires indicatifs.'),
  ), { name: 'market' });
}

/* ---------- Avantages culture Navigo : lieux partenaires (fichier fixe, trié sur le téléphone) ---------- */

let navigoItems = null;
let navigoUpdated = '';
const loadNavigo = async () => (navigoItems ??= await fetch('data/navigo.json').then((r) => (r.ok ? r.json() : null))
  .then((j) => { navigoUpdated = typeof j?.updated === 'string' ? j.updated : ''; return parseNavigo(j); }).catch(() => []));
/** Le lieu partenaire qui correspond à un de mes lieux (si la liste est déjà chargée). */
const navigoOf = (p) => (navigoItems ? navigoFor(p, navigoItems) : null);
/** L'offre en une ligne courte : la première phrase, coupée proprement. */
function shortOffer(t, n = 90) {
  const first = String(t ?? '').split(/(?<=[.!])\s/)[0];
  return first.length <= n ? first : `${first.slice(0, n).replace(/\s+\S*$/, '')}…`;
}
const navigoRow = (x, back) => sortieCard({ genre: navigoGenre(x.kind), name: x.name, onclick: () => openNavigo(x, back), sub: [x.kind, shortOffer(x.offer)], d: x.d,
  buttons: [compassBtn(x), metroBtn(x, back)] });

function openNavigo(x, back = null) {
  const d = freshHere() ? distanceM(freshHere(), x) : null;
  const again = () => openNavigo(x, back);
  openSheet([ico('badge-percent'), ` ${x.name}`], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, [x.kind, d != null ? fmtWalk(d) : ''].filter(Boolean).join(' · ')),
    x.address ? el('p', { class: 'where' }, x.address) : null,
    el('h3', { class: 'ring-title' }, el('span', {}, 'Avantage Navigo'), el('span', {}, '')),
    el('p', {}, x.offer),
    el('p', { class: 'help' }, 'Sur présentation d\'un passe Navigo valide (annuel, mois, imagine R, Senior, Liberté +). L\'offre peut changer : vérifie sur le site du lieu avant d\'y aller.'),
    el('a', { class: 'btn primary go-bar', href: mapsUrl(x, d ?? 1000), target: '_blank', rel: 'noopener' }, el('span', { 'aria-hidden': 'true' }, '→'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: x.name, lat: x.lat, lng: x.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: x.name, lat: x.lat, lng: x.lng, id: `nv:${x.lat},${x.lng}` }, named('Avantage Navigo', again)), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openForm({ name: x.name, lat: x.lat, lng: x.lng, address: x.address, acc: null, note: `Avantage Navigo : ${x.offer}` }) }, ico('plus'), 'Ajouter')),
    x.url ? el('a', { class: 'btn c-disc', href: x.url, target: '_blank', rel: 'noopener noreferrer' }, ico('info'), 'Site du lieu') : null,
    back ? backBtn(back) : null,
    el('p', { class: 'help' }, `Liste « Avantages culture Navigo » d'Île-de-France Mobilités${navigoUpdated ? ` du ${frenchDate(navigoUpdated)}` : ''}.`),
  ), { name: `navigo:${x.lat},${x.lng}`, again });
}

/* ---------- TTB : adresses du guide, importées par moi et gardées sur le téléphone ----------
   Rien dans le dépôt, rien envoyé : le fichier est lu et trié ici. Seules les infos pratiques sont gardées. */

const ttbLayer = L.layerGroup().addTo(map);
let ttbData; // { items, date } ou null ; lu une fois
function ttbList() {
  if (ttbData === undefined) { try { ttbData = readTtb(JSON.parse(storage.getItem(TTB_KEY) ?? 'null')); } catch { ttbData = null; } }
  return ttbData?.items ?? [];
}
const navigoKinds = new Set(); // disciplines choisies dans Sorties → Navigo (le temps de la session ; aucune = tout)
const ttbRubs = new Set(); // filtres de la liste et de la carte (le temps de la session)
const ttbBudgets = new Set();
/** Adresses TTB masquées ou fermées (v165), notées par moi : plus sur la carte ni dans les listes. Gardées à part (localStorage), comme la liste ; elles partent dans le fichier de sauvegarde avec la case « Avec la liste TTB » (v179). */
let ttbMarks;
const ttbMarksNow = () => { if (ttbMarks === undefined) { try { ttbMarks = cleanTtbMarks(JSON.parse(storage.getItem(TTB_MARKS_KEY) ?? 'null')); } catch { ttbMarks = {}; } } return ttbMarks; };
function setTtbMark(x, k) {
  const m = { ...ttbMarksNow() };
  if (k) m[ttbKey(x)] = { n: x.name, k, at: Date.now() }; else delete m[ttbKey(x)];
  ttbMarks = cleanTtbMarks(m);
  try { storage.setItem(TTB_MARKS_KEY, JSON.stringify(ttbMarks)); } catch { toast('Le téléphone n\'a pas pu le garder (plus de place).', true); }
  drawTtb();
}
const ttbOpen = () => ttbList().filter((x) => !ttbMark(ttbMarksNow(), x)); // ni masquées ni fermées
const ttbShown = () => ttbOpen().filter((x) => ttbPass(x, ttbRubs, ttbBudgets));
/** Le bouton du haut : un rond terre cuite marqué « TTB » (ailleurs, le rond porte l'icône de la rubrique).
 * Pour changer la marque, ne modifier que TTB_MARK (3 lettres au plus pour tenir dans le rond). */
const TTB_MARK = 'TTB';
const ttbDot = () => el('span', { class: 'ttb-dot', 'aria-hidden': 'true' }, el('b', {}, TTB_MARK));
/** Le rond d'une adresse ou d'une rubrique : l'icône de sa rubrique (couverts, bol, sandwich, croissant, panier, verre). */
const ttbDotFor = (rub) => el('span', { class: 'ttb-dot', 'aria-hidden': 'true' }, ico(ttbIcon(rub), { size: 15, stroke: 2.4 }));
const ttbOf = (p) => (ttbList().length ? navigoFor(p, ttbList()) : null); // l'adresse du guide qui correspond à un de mes lieux
const ttbDateText = () => (ttbData?.date ? frenchDate(ttbData.date) : '');

// Vue de loin (zoom 13 ou moins) : petits ronds sans icône, pour que les 200 adresses ne couvrent pas la carte.
const ttbFar = () => document.getElementById('map').classList.toggle('ttb-far', map.getZoom() <= 13);
map.on('zoomend', ttbFar);
ttbFar();
function drawTtb() {
  ttbLayer.clearLayers();
  if (!state.showTtb) return;
  const mine = state.points.filter((p) => !p.owner);
  for (const x of ttbShown()) {
    if (navigoFor(x, mine)) continue; // déjà dans mes lieux : sa goutte suffit (sa fiche a la ligne TTB)
    L.marker([x.lat, x.lng], { keyboard: true, title: x.name, alt: x.name, zIndexOffset: -80,
      icon: L.divIcon({ className: 'pin-wrap', html: `<span class="ttb-pin">${svgIcon(ttbIcon(x.rub), { size: 15, stroke: 2.4 })}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .on('add', (e) => e.target.getElement()?.setAttribute('aria-label', `${x.name}, TTB${x.rub ? `, ${x.rub}` : ''}`))
      .on('click', () => { if (!moving) openTtbPlace(x); })
      .addTo(ttbLayer);
  }
}
function toggleTtb() {
  if (!ttbList().length) { openTtb(); return; }
  state.showTtb = !state.showTtb; persist(); drawTtb(); refresh();
  if (state.showTtb) toast(`TTB : ${plural(ttbShown().length, 'adresse', 'adresses')} sur la carte.`, false, { label: 'Voir la liste', fn: () => openTtbList() });
  else toast('TTB : masqué');
}

/** Liste des adresses, de la plus proche à la plus loin (ma position récente, sinon le centre de la carte : pas de GPS demandé). */
function openTtbList(back = null, limit = 30) {
  const again = () => openTtbList(back, limit);
  if (!ttbList().length) { openTtb(back); return; }
  const here = freshHere();
  const from = here ?? map.getCenter();
  const all = ttbShown().map((x) => ({ ...x, d: distanceM(from, x) })).sort((a, b) => a.d - b.d);
  const chip = (label, on, onclick) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick }, label);
  const flip = (set, v) => { if (set.has(v)) set.delete(v); else set.add(v); drawTtb(); openTtbList(back, 30); };
  openSheet([ttbDotFor(''), ' TTB'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${plural(all.length, 'adresse', 'adresses')}${ttbRubs.size || ttbBudgets.size ? ' choisies' : ' à Paris'} · ${here ? 'depuis ta position' : 'depuis le centre de la carte'}`),
    el('button', { type: 'button', class: 'menu-row c-disc', role: 'switch', 'aria-checked': String(Boolean(state.showTtb)), onclick: () => { toggleTtb(); openTtbList(back, limit); } },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ttbDotFor('')),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Sur la carte'), el('span', { class: 'menu-sub' }, 'Ronds terre cuite, icône selon la rubrique, avec ces filtres')),
      el('span', { class: `switch${state.showTtb ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
    el('div', { class: 'list-chips', role: 'group', 'aria-label': 'Rubriques' }, TTB_RUBS.map((r) => chip([ttbDotFor(r), ` ${r}`], ttbRubs.has(r), () => flip(ttbRubs, r)))),
    el('div', { class: 'list-chips', role: 'group', 'aria-label': 'Budget' }, [1, 2, 3, 4].map((b) => chip(el('span', { 'aria-label': `Budget ${b} sur 4` }, '€'.repeat(b)), ttbBudgets.has(b), () => flip(ttbBudgets, b)))),
    all.length ? el('ul', { class: 'items ev-list' }, all.slice(0, limit).map((x) => sortieCard({ genre: 'ttb', badge: ttbDotFor(x.rub), name: x.name, onclick: () => openTtbPlace(x, named('TTB', again)),
      sub: [ttbKicker(x), ttbToday(x) ? `aujourd'hui ${ttbToday(x)}` : ''], d: x.d,
      buttons: [compassBtn(x), metroBtn(x, named('TTB', again)), addBtn(x.name, 'l\'adresse', () => ttbAdd(x))] })))
      : el('p', { class: 'empty' }, 'Aucune adresse avec ces filtres.'),
    all.length > limit ? el('button', { type: 'button', class: 'btn c-disc', onclick: () => openTtbList(back, limit + 30) }, ico('plus'), `Voir ${Math.min(30, all.length - limit)} de plus`) : null,
    el('p', { class: 'help' }, `Liste du guide TTB${ttbDateText() ? ` du ${ttbDateText()}` : ''}, gardée sur ce téléphone. Horaires selon le guide : vérifie avant d'y aller.`),
    foot(back ? backBtn(back) : null, el('button', { type: 'button', class: 'btn c-info', onclick: () => openTtb(named('TTB', again)) }, ico('refresh-cw'), 'Mettre à jour')),
  ), { name: 'ttb-list', again, tall: true });
}

/** Garder une adresse du guide dans mes lieux (formulaire prérempli). Si elle y est déjà : sa fiche. */
function ttbAdd(x) {
  const mine = navigoFor(x, state.points);
  if (mine) { openDetail(mine.id); toast('Déjà dans tes lieux'); return; }
  // Catégorie d'après la rubrique du guide quand une des miennes correspond ; sinon aucune : je la choisis (v155)
  openForm({ name: x.name, lat: x.lat, lng: x.lng, address: x.address, acc: null, note: `TTB : ${ttbKicker(x)}`, cat: ttbCategory(x.rub, state.categories) ?? '' });
}

function openTtbPlace(x, back = null) {
  const d = freshHere() ? distanceM(freshHere(), x) : null;
  const again = () => openTtbPlace(x, back);
  const metro = stationFacts(x);
  const mine = navigoFor(x, state.points);
  const today = ttbToday(x);
  const kick = `TTB · ${x.arr}${x.arr === 1 ? 'er' : 'e'}`;
  const insta = /instagram\.com/i.test(x.url), fb = /facebook\.com/i.test(x.url);
  openSheet([el('span', { class: 'fiche-kick', 'aria-hidden': 'true' }, kick), el('span', { class: 'fiche-name' }, x.name), el('span', { class: 'sr-only' }, `, ${kick}`)], el('div', { class: 'stack detail' },
    el('p', { class: 'summary' }, [ttbKicker(x), d != null ? fmtWalk(d) : ''].filter(Boolean).join(' · ')),
    el('div', { class: 'copy-row' }, el('p', { class: 'where' }, ico('map-pin'), x.address), copyBtn(() => x.address, 'l\'adresse', 'Adresse copiée')),
    el('div', { class: 'fiche-cols' },
      el('div', {},
        el('div', { class: 'fiche-k' }, 'Aujourd\'hui'),
        today ? el('div', { class: 'fiche-v' }, today.charAt(0).toUpperCase() + today.slice(1)) : el('div', { class: 'fiche-v muted' }, 'Horaires inconnus'),
        el('div', { class: 'fiche-s' }, 'selon TTB')),
      el('div', {},
        el('div', { class: 'fiche-k' }, metro?.lines ? `Métro ${metro.lines}` : 'Métro'),
        metro ? el('div', { class: 'fiche-v m' }, metro.name) : el('div', { class: 'fiche-v muted' }, 'Pas de station proche'),
        metro ? el('div', { class: 'fiche-s' }, `≈ ${metro.min} min à pied`) : null)),
    el('a', { class: 'btn primary go-bar', href: mapsUrl(x, d ?? 1000), target: '_blank', rel: 'noopener' }, el('span', { 'aria-hidden': 'true' }, '→'), 'Y aller'),
    el('div', { class: 'row3' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass({ name: x.name, lat: x.lat, lng: x.lng }) }, ico('compass'), 'Boussole'),
      el('button', { type: 'button', class: 'btn c-metro', onclick: () => showMetroPlan({ name: x.name, lat: x.lat, lng: x.lng, id: `ttb:${x.lat},${x.lng}` }, named(x.name, again)), 'aria-label': 'Métro : quel métro prendre' }, el('b', { class: 'm-badge', 'aria-hidden': 'true' }), 'Métro'),
      mine ? el('button', { type: 'button', class: 'btn c-add', onclick: () => openDetail(mine.id, named(x.name, again)), 'aria-label': `Dans mes lieux : ${mine.name}` }, ico('check'), 'Mon lieu')
        : el('button', { type: 'button', class: 'btn c-add', onclick: () => ttbAdd(x) }, ico('plus'), 'Ajouter')),
    x.url ? el('a', { class: 'btn c-disc', href: x.url, target: '_blank', rel: 'noopener noreferrer' }, ico(insta ? 'camera' : 'info'), insta ? 'Instagram du lieu' : fb ? 'Page Facebook du lieu' : 'Site du lieu') : null,
    el('a', { class: 'btn c-guide', href: reviewsUrl(x), target: '_blank', rel: 'noopener' }, ico('star'), 'Avis Google'),
    x.hours.length ? el('h3', { class: 'fiche-sec' }, 'Horaires selon TTB') : null,
    x.hours.length ? el('div', { class: 'fiche-lines' }, x.hours.map((h, i) => el('p', {}, el('b', {}, `${TTB_DAYS[i]} `), h))) : null,
    el('p', { class: 'help' }, `Adresse du guide TTB${ttbDateText() ? `, liste du ${ttbDateText()}` : ''}. Les horaires viennent du guide et peuvent avoir changé : vérifie avant d'y aller.`),
    // Rangement (v165) : fermé définitivement (constaté sur place ou dans Google Maps), ou simplement masqué ; réversible
    el('h3', { class: 'fiche-sec' }, 'Rangement'),
    ttbMark(ttbMarksNow(), x) ? el('div', { class: 'stack' },
      el('p', {}, ico('eye-off'), ttbMark(ttbMarksNow(), x) === 'closed' ? ' Noté fermé définitivement : plus sur la carte ni dans les listes.' : ' Masquée : plus sur la carte ni dans les listes.'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => { setTtbMark(x, ''); again(); toast('Remise sur la carte'); } }, ico('eye'), 'Remettre sur la carte'))
      : el('div', { class: 'fiche-toc' },
        el('button', { type: 'button', class: 'fiche-row', onclick: () => { setTtbMark(x, 'closed'); again(); toast('Noté fermé : l\'appli ne la propose plus', false, { label: 'Annuler', fn: () => { setTtbMark(x, ''); again(); } }); } },
          ico('store'), el('span', {}, 'Fermé définitivement', el('small', {}, 'Constaté sur place ou dans Google Maps')), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))),
        el('button', { type: 'button', class: 'fiche-row', onclick: () => { setTtbMark(x, 'hidden'); again(); toast('Masquée', false, { label: 'Annuler', fn: () => { setTtbMark(x, ''); again(); } }); } },
          ico('eye-off'), el('span', {}, 'Masquer cette adresse', el('small', {}, 'Elle ne m\'intéresse pas ; gardée masquée après un nouvel import')), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')))),
    back ? backBtn(back) : null,
  ), { name: `ttb:${x.lat},${x.lng}`, again });
  if (!back) centerOn(x.lat, x.lng, Math.max(map.getZoom(), 16));
}

/** Réglages → TTB : importer ou mettre à jour la liste, la retirer. */
/** Réglages → TTB (v165) : les adresses masquées ou notées fermées ; un appui ouvre la fiche, qui permet de les remettre. */
function ttbMarkedSection(again) {
  const marks = ttbMarksNow();
  const list = ttbList().filter((x) => ttbMark(marks, x)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  if (!list.length) return [];
  return [el('h3', { class: 'ring-title' }, el('span', {}, 'Masquées ou fermées'), el('span', {}, String(list.length))),
    el('ul', { class: 'items' }, list.map((x) => el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openTtbPlace(x, named('TTB', again)) },
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, x.name), el('span', { class: 'item-sub' }, ttbMark(marks, x) === 'closed' ? 'Fermé définitivement' : 'Masquée')))))),
    el('p', { class: 'help' }, 'Elles restent masquées après un nouvel import (même nom et même adresse). Comme la liste, elles partent dans ta sauvegarde si la case « Avec la liste TTB » est cochée.')];
}

function openTtb(back = named('Réglages', () => openSettings()), confirm = false) {
  const n = ttbList().length;
  const again = () => openTtb(back, confirm);
  const input = el('input', { type: 'file', hidden: true }); // pas de filtre : Android ne reconnaît pas toujours le type .mhtml
  input.addEventListener('change', () => { const f = input.files?.[0]; input.value = ''; if (f) importTtbFile(f, back); });
  openSheet([ttbDotFor(''), ' TTB'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, n ? `${plural(n, 'adresse', 'adresses')} à Paris${ttbDateText() ? `, liste du ${ttbDateText()}` : ''}` : 'Les adresses du guide TTB, sur ta carte.'),
    n ? el('button', { type: 'button', class: 'btn c-disc', onclick: () => openTtbList(named('TTB', again)) }, ico('list'), 'Voir la liste') : null,
    ...ttbMarkedSection(again),
    el('h3', { class: 'ring-title' }, el('span', {}, n ? 'Mettre à jour la liste' : 'Importer la liste'), el('span', {}, '')),
    el('ol', { class: 'steps' },
      el('li', {}, 'Ouvre la page Adresses du guide dans Chrome, en mode liste (bouton ci-dessous).'),
      el('li', {}, 'Menu ⋮ en haut à droite, puis la flèche « Télécharger » : la page est enregistrée dans Téléchargements.'),
      el('li', {}, 'Reviens ici et choisis ce fichier.')),
    el('a', { class: 'btn c-guide', href: TTB_SITE, target: '_blank', rel: 'noopener' }, ico('external-link'), 'Ouvrir la page Adresses'),
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => input.click() }, ico('download'), 'Choisir le fichier'),
    input,
    el('p', { class: 'help' }, 'Source : le guide Très Très Bon (trestresbon.fr). Seules les adresses à Paris sont gardées, sans doublons. L\'appli garde le nom, l\'adresse, la rubrique, le budget, le lien du lieu et les horaires, jamais les textes du guide. La liste reste sur ce téléphone et rien n\'est envoyé ; elle part seulement dans ta sauvegarde (case « Avec la liste TTB », cochée au départ).'),
    n ? (confirm
      ? el('div', { class: 'stack' }, el('p', { class: 'warn', role: 'alert' }, `Retirer les ${n} adresses TTB ? Tes lieux ne sont pas touchés.`),
        el('div', { class: 'row' }, el('button', { type: 'button', class: 'btn', onclick: () => openTtb(back) }, 'Annuler'),
          el('button', { type: 'button', class: 'btn danger solid', onclick: () => {
            try { storage.removeItem(TTB_KEY); } catch { /* rien */ }
            ttbData = null; state.showTtb = false; persist(); drawTtb(); refresh(); openTtb(back); toast('Liste TTB retirée');
          } }, 'Oui, retirer')))
      : el('button', { type: 'button', class: 'btn danger', onclick: () => openTtb(back, true) }, ico('trash-2'), 'Retirer la liste')) : null,
    foot(backBtn(back)),
  ), { name: 'ttb', again, tall: true });
}

async function importTtbFile(file, back) {
  toast('Lecture du fichier…');
  let res = null;
  try {
    const text = await file.slice(0, 30e6).text(); // la page est au début du fichier : les images après ne servent pas
    if (/^\s*\{/.test(text)) res = readTtb(JSON.parse(text));
    else {
      const html = mhtmlHtml(text);
      if (html) res = { items: cleanAll(ttbRawFromDoc(new DOMParser().parseFromString(html, 'text/html'))), date: mhtmlDate(text) || dayKey(new Date()) };
    }
  } catch { res = null; }
  if (!res?.items.length) { toast('Ce fichier ne contient pas d\'adresses TTB. Enregistre la page Adresses en mode liste, puis réessaie.', true); return; }
  const before = ttbList().length;
  try { storage.setItem(TTB_KEY, JSON.stringify(ttbStore(res.items, res.date))); } catch { toast('Le téléphone n\'a pas pu garder la liste (plus de place).', true); return; }
  ttbData = { items: res.items, date: res.date };
  state.showTtb = true; persist(); drawTtb(); refresh();
  openTtb(back);
  toast(`${plural(res.items.length, 'adresse', 'adresses')} à Paris importées${before ? ` (avant : ${before})` : ''}. Elles sont sur la carte.`);
}

/** TTB d'un fichier de sauvegarde (v179) : la liste dont la page est la plus récente gagne, mes marques restent et
 * celles du fichier s'ajoutent. Renvoie un bout de phrase pour le message (« liste TTB remise »…) ou ''. */
function importTtb(text) {
  let file = null;
  try { file = JSON.parse(text)?.ttb ?? null; } catch { return ''; }
  if (!file) return '';
  ttbList();
  const r = ttbMerge({ data: ttbData, marks: ttbMarksNow() }, file);
  try {
    if (r.list) storage.setItem(TTB_KEY, JSON.stringify(ttbStore(r.data.items, r.data.date)));
    if (r.newMarks) storage.setItem(TTB_MARKS_KEY, JSON.stringify(r.marks));
  } catch { return 'la liste TTB n\'a pas pu être gardée (plus de place)'; }
  if (r.list) ttbData = { items: r.data.items, date: r.data.date };
  ttbMarks = r.marks;
  drawTtb();
  return [r.list ? `liste TTB remise (${plural(r.data.items.length, 'adresse', 'adresses')})` : '', r.newMarks ? plural(r.newMarks, 'marque TTB ajoutée', 'marques TTB ajoutées') : ''].filter(Boolean).join(', ');
}

/* ---------- Météo (Open-Meteo, position arrondie, une fois par demi-heure au plus) ---------- */

let meteo = null;
let meteoAt = 0;
async function checkMeteo(at) {
  if (Date.now() - meteoAt < 30 * 60 * 1000 || !navigator.onLine) return;
  meteoAt = Date.now();
  const [m, a] = await Promise.all([
    net(meteoUrl(at?.lat, at?.lng)).then((r) => r.json()).then(readMeteo).catch(() => null),
    net(airUrl(at?.lat, at?.lng)).then((r) => r.json()).then(readAir).catch(() => null),
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
  const todo = offered(); // « déjà visité » n'est qu'une information : tous les lieux comptent
  // Ouvert à l'heure d'arrivée ? (horaires inconnus : on garde)
  const isOpen = (p, t) => { const st = openState(hoursOf(p), new Date(Date.now() + t * 60000)); return st ? st.open : null; };
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
    plan.route.length ? nightLine(plan.total) : null,
    plan.route.length ? el('ol', { class: 'items' }, steps) : null,
    plan.closed ? el('p', { class: 'help' }, `${plural(plan.closed, 'lieu écarté', 'lieux écartés')} : fermé${plan.closed > 1 ? 's' : ''} à ton arrivée.`) : null,
    plan.route.length ? el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => startGuide([...plan.route, { name: 'Retour au départ', lat: origin.lat, lng: origin.lng }], 'Temps libre') }, ico('navigation'), 'Balade guidée') : null,
    plan.route.length ? el('div', { class: 'row' },
      el('a', { class: 'btn', href: loopUrl(origin, plan.route), target: '_blank', rel: 'noopener' }, 'Google Maps'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => shareRoute(plan.route, 'Ma balade') }, ico('share-2'), 'Partager')) : null,
    el('p', { class: 'help' }, 'Les lieux les mieux notés et les favoris passent en priorité. Les filtres en haut s\'appliquent.'),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')),
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
  const pool = offered().filter((p) => distanceM(origin, p) <= max);
  if (!pool.length) { toast('Aucun de tes lieux à moins de 15 min (avec les filtres actuels).', true); return; }
  const p = pool[Math.floor(Math.random() * pool.length)];
  openDetail(p.id, named('Autour de moi', () => renderNear()));
  toast(`Surprise : ${p.name}, à ${walkMinutes(distanceM(origin, p))} min à pied`);
}

/* ---------- Curiosités : articles Wikipédia autour (position arrondie à 100 m environ) ---------- */

const wikiCache = new Map();
const PLAQUE_COLOR = '#2b8a3e';
/** La page d'une plaque : son texte gravé en entier, où la regarder sur l'immeuble, puis les actions d'un lieu. */
function openPlaque(p, back = null) {
  openSpot({ icon: 'scroll-text', title: p.t, kicker: 'Plaque commémorative', place: { lat: p.lat, lng: p.lng, address: p.a },
    lines: [el('blockquote', { class: 'plaque-text' }, p.x),
      p.o ? el('p', { class: 'where' }, ico('eye'), `Où regarder : ${p.o.charAt(0).toLowerCase()}${p.o.slice(1)}`) : null,
      p.a ? el('p', { class: 'where' }, ico('map-pin'), p.a) : null,
      el('p', { class: 'help' }, 'Texte relevé par la Ville de Paris (Direction des Affaires Culturelles, licence ODbL). Une plaque peut avoir été déplacée ou retirée.')],
    add: { note: p.x }, back, key: `plaque:${p.lat},${p.lng}` });
}
const plaqueRow = (x, back) => el('li', { class: 'item' },
  el('button', { type: 'button', class: 'item-main', onclick: () => openPlaque(x.plaque, back) },
    el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('scroll-text', { size: 18 })),
    el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, x.plaque.t), el('span', { class: 'item-sub' }, `${walkMinutes(x.d)}\u00a0min · ${plaqueStart(x.plaque, 60)}`))));

/** Toutes les plaques à moins de 5 min, de la plus proche. */
function openAllPlaques(near) {
  openSheet([ico('scroll-text'), ' Plaques à moins de 5 min'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `${plural(near.length, 'plaque', 'plaques')}, de la plus proche. Touche une plaque pour lire son texte.`),
    el('ul', { class: 'items' }, near.map((x) => plaqueRow(x, named('Plaques', () => openAllPlaques(near))))),
    foot(backBtn(named('Curiosités', openCuriosities))),
  ), { tall: true, name: 'plaques', again: () => openAllPlaques(near) });
}

async function openCuriosities() {
  track('Curiosités');
  if (!origin) { openNear(); return; }
  const here = origin;
  const key = `${here.lat.toFixed(3)},${here.lng.toFixed(3)}`;
  let list = wikiCache.get(key);
  if (!list || !plaquesData) openSheet([ico('book-open-text'), ' Curiosités'], el('p', { class: 'help' }, 'Recherche des plaques et des articles…'), { name: 'wiki' });
  // Les plaques sont dans l'appli : elles s'affichent même si Wikipédia ne répond pas.
  const [, , wiki] = await Promise.all([loadPlaques(), loadArcades(),
    list ? Promise.resolve(list) : net(wikiUrl(here.lat, here.lng, 1000)).then((r) => r.json()).then(parseWiki).catch(() => null)]);
  if (wiki && !list) { list = wiki; wikiCache.set(key, list); }
  if (origin !== here) return; // la position a changé pendant la recherche : la nouvelle ouverture s'en charge
  const near = plaquesNear(plaquesOf(plaquesData), here, minutesToMeters(5), Infinity);
  const arcs = arcadesNear(arcadesData ?? [], here, ARCADE_NEAR_MIN);
  const items = (list ?? []).map((w) => ({ ...w, d: distanceM(here, w) })).sort((a, b) => a.d - b.d);
  const have = (w) => findDuplicate(state.points, { name: w.title, lat: w.lat, lng: w.lng });
  const back = named('Curiosités', openCuriosities);
  openSheet([ico('book-open-text'), ' Curiosités'], el('div', { class: 'stack' },
    el('h3', { class: 'ring-title' }, 'Plaques à moins de 5 min'),
    !plaquesData ? el('p', { class: 'warn' }, 'Les plaques n\'ont pas pu être lues. Réessaie plus tard.')
      : near.length ? el('ul', { class: 'items' }, near.slice(0, 3).map((x) => plaqueRow(x, back)))
        : el('p', { class: 'help' }, 'Aucune plaque commémorative à moins de 5 min à pied.'),
    near.length > 3 ? el('button', { type: 'button', class: 'btn', onclick: () => openAllPlaques(near) }, `Toutes les plaques (${near.length})`) : null,
    arcs.length ? el('h3', { class: 'ring-title' }, `Passages couverts à moins de ${ARCADE_NEAR_MIN} min`) : null,
    arcs.length ? el('ul', { class: 'items' }, arcs.slice(0, 3).map((x) => arcadeRow(x, back))) : null,
    arcs.length > 3 ? el('button', { type: 'button', class: 'btn', onclick: () => openArcadeList(arcs, ARCADE_NEAR_MIN, back) }, `Tous les passages (${arcs.length})`) : null,
    el('h3', { class: 'ring-title' }, 'Wikipédia à moins de 1 km'),
    !list ? el('p', { class: 'warn' }, 'Wikipédia ne répond pas. Vérifie ta connexion.')
      : el('p', { class: 'help' }, `${plural(items.length, 'article', 'articles')} : monuments, rues, histoire. « + » pour en faire un lieu.`),
    list ? el('ul', { class: 'items' }, items.map((w) => el('li', { class: 'item' },
      el('a', { class: 'item-main', href: wikiPage(w.title), target: '_blank', rel: 'noopener' },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('book-open-text', { size: 18 })),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, w.title), el('span', { class: 'item-sub' }, `${fmtDist(w.d)} · ${walkMinutes(w.d)} min · lire l'article`))),
      have(w) ? el('span', { class: 'tag' }, 'Déjà là')
        : el('button', { type: 'button', class: 'go-compass add', 'aria-label': `Ajouter ${w.title} à ma carte`, onclick: () => openForm({ name: w.title, lat: w.lat, lng: w.lng, acc: null }) }, ico('plus'))))) : null,
    el('p', { class: 'help' }, 'Plaques : Ville de Paris (licence ODbL), triées sur ton téléphone. Wikipédia (CC BY-SA) : seule une position arrondie à 100 m est envoyée.'),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')),
  ), { tall: true, name: 'wiki', again: openCuriosities });
  nearLayer.clearLayers();
  if (!following) meMarker(here.lat, here.lng).addTo(nearLayer);
  for (const w of items) L.circleMarker([w.lat, w.lng], { radius: 6, color: '#5f3dc4', weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
  for (const x of near) L.circleMarker([x.plaque.lat, x.plaque.lng], { radius: 5, color: PLAQUE_COLOR, weight: 2, fillColor: PLAQUE_COLOR, fillOpacity: 1, interactive: false }).addTo(nearLayer);
  for (const x of arcs) L.circleMarker([x.a.lat, x.a.lng], { radius: 6, color: discInk(), weight: 2, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(nearLayer);
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
    row('signpost', 'Circuits de visite', 'Des balades d\'un métro à l\'autre, avec leur tracé', () => openCircuits(openRoutes)),
    row('footprints', 'Rues sans voitures', 'Les secteurs « Paris Respire » prévus aujourd\'hui ou ce week-end', () => openRespire(openRoutes)),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')),
  ), { name: 'routes', again: openRoutes });
}

/* ---------- Rues sans voitures (v197) : les secteurs « Paris Respire » prévus aujourd'hui, sinon le prochain jour (js/respire.js) ---------- */

/** Un secteur sur la carte : son contour, et un bandeau pour revenir à la liste. Rien n'est demandé (contours dans l'appli). */
function showRespireOnMap(x, back) {
  closeSheet();
  endPeek();
  const zone = L.polygon(x.s.rings, { className: 'respire-zone', weight: 3, interactive: false }).addTo(peekLayer);
  showPeekCard('Sans voitures · prévu', x.s.name, back, `De ${hhText(x.w.from)} à ${hhText(x.w.to)} · touche ici pour revenir à la liste`);
  map.fitBounds(zone.getBounds(), { padding: [30, 30], maxZoom: 17, animate: false });
}

async function openRespire(back = openRoutes) {
  const again = () => openRespire(back);
  const title = [ico('footprints'), ' Rues sans voitures'];
  if (!respireData) { openSheet(title, el('p', { class: 'help' }, 'Lecture des secteurs…'), { name: 'respire', again }); await loadRespire(); }
  const sectors = respireSectors(respireData);
  const today = new Date();
  const from = freshHere() || origin; // jamais de GPS demandé : la dernière position connue, sinon pas de distance
  const self = named('Rues sans voitures', again);
  const rows = (date) => el('ul', { class: 'items' }, respireOn(sectors, date, from).map((x) => el('li', { class: 'item' },
    el('button', { type: 'button', class: 'item-main', onclick: () => showRespireOnMap(x, self) },
      el('span', { class: 'plan-time' }, hhText(x.w.to)),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, x.s.name),
        el('span', { class: 'item-sub' }, [`prévu de ${hhText(x.w.from)} à ${hhText(x.w.to)}`, x.d == null ? x.s.arr : x.d ? fmtWalk(x.d) : 'tu y es'].join(' · ')))))));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const n = respireOn(sectors, today).length;
  const next = n ? null : respireNextDay(sectors, today);
  openSheet(title, el('div', { class: 'stack' },
    !sectors.length ? el('p', { class: 'warn' }, 'Les contours des secteurs ne sont pas encore dans l\'appli. Ils arrivent avec la prochaine mise à jour des données (Réglages → Appli → Données de l\'appli).')
      : n ? el('p', { class: 'summary' }, `${cap(dayTitle(today))} : ${plural(n, 'secteur prévu', 'secteurs prévus')}. À gauche, l'heure de fin.`)
        : el('p', { class: 'summary' }, 'Rien de prévu aujourd\'hui.'),
    n ? rows(today) : null,
    next ? el('h3', { class: 'ring-title' }, el('span', {}, `Prochain jour : ${dayTitle(next)}`)) : null,
    next ? rows(next) : null,
    el('p', { class: 'help' }, `Opérations « Paris Respire » de la Ville de Paris : jours et heures lus le ${RESPIRE_CHECKED} sur ${RESPIRE_PAGE}. Ce sont des prévisions : une opération peut être ajournée, et rien ici ne dit qu'elle a bien lieu. Un appui montre le secteur sur la carte. Pas dans la liste : les Champs-Élysées (1er dimanche du mois, sauf exception).`),
    foot(backBtn(back)),
  ), { name: 'respire', again });
}

/* ---------- Circuits de visite (v168) : étapes vérifiées, tracé calculé une fois et rangé dans l'appli (data/circuits.json) ---------- */

let circuitsData = null;
const loadCircuits = async () => (circuitsData ??= await fetch('data/circuits.json').then((r) => (r.ok ? r.json() : null)).then((j) => (j ? cleanCircuits(j) : null)).catch(() => null));
let circuitTheme = '';
let circuitDur = '';
/** Couleur du tracé d'un circuit : terre cuite (découvrir), lisible sur le fond clair comme sombre. */
const discInk = () => (isDark() ? '#FFB08A' : '#A54A28');
/** D'où trier les circuits : ma position si elle est fraîche, sinon le centre de la carte (aucune demande de GPS). */
const circuitFrom = () => freshHere() ?? { ...map.getCenter(), kind: 'map' };
const dayText = (at) => new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const circuitDoneTag = (c) => { const d = circuitDone(state.outings, c.id)[0]; return d ? el('span', { class: 'tag open' }, `Fait le ${dayText(d.at)}`) : null; };
const stepStops = (c) => c.etapes.map((e) => ({ name: e.n, lat: e.lat, lng: e.lng }));

async function openCircuits(back = null) {
  track('Circuits');
  const again = () => openCircuits(back);
  if (!circuitsData) openSheet([ico('signpost'), ' Circuits'], el('p', { class: 'help' }, 'Chargement des circuits…'), { name: 'circuits' });
  const [list] = await Promise.all([loadCircuits(), loadArcades()]);
  if (!list?.length) {
    openSheet([ico('signpost'), ' Circuits'], el('div', { class: 'stack' }, el('p', { class: 'warn' }, 'Les circuits n\'ont pas pu être chargés. Essaie Réglages → Appli → Mettre à jour l\'appli.'), back ? foot(backBtn(back)) : null), { name: 'circuits', again });
    return;
  }
  const from = circuitFrom();
  const hidden = new Set(cleanHiddenCircuits(state.hiddenCircuits));
  const kept = list.filter((c) => !hidden.has(c.id));
  const notes = cleanCircuitNotes(state.circuitNotes);
  const self = named('Circuits', again);
  const shown = circuitsFor(kept, { theme: circuitTheme, dur: circuitDur }, from);
  const chip = (on, label, fn) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick: fn }, label);
  openSheet([ico('signpost'), ' Circuits'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${plural(kept.length, 'balade', 'balades')} à pied, d'un métro à l'autre. ${from.kind === 'map' ? 'La plus proche du centre de la carte d\'abord.' : 'La plus proche de toi d\'abord.'}`),
    el('div', { class: 'list-chips chips-scroll', role: 'group', 'aria-label': 'Thème et durée' },
      ...CIRCUIT_THEMES.map(([k, label]) => chip(circuitTheme === k, label, () => { circuitTheme = circuitTheme === k ? '' : k; again(); })),
      ...CIRCUIT_DURATIONS.map(([k, label]) => chip(circuitDur === k, label, () => { circuitDur = circuitDur === k ? '' : k; again(); }))),
    shown.length ? el('ul', { class: 'items ev-list' }, shown.map((c) => sortieCard({ genre: 'circuit', name: c.titre, onclick: () => openCircuit(c, named('Circuits', again)),
      sub: [`${c.depart} → ${c.arrivee}`, `environ ${minText(circuitTimes(c).total)}`, kmText(c.m)], d: distanceM(from, c.etapes[0]), tags: [circuitDoneTag(c)] })))
      : el('p', { class: 'empty' }, 'Aucun circuit pour ce choix. Touche une puce allumée pour l\'éteindre.'),
    notes.length ? ficheRow('triangle-alert', 'Problèmes notés', `${plural(notes.length, 'signalement', 'signalements')} · Copier pour Claude`, () => openCircuitNotes(null, self)) : null,
    hidden.size ? ficheRow('eye-off', plural(list.filter((c) => hidden.has(c.id)).length, 'circuit masqué', 'circuits masqués'), 'Les voir et les remettre', () => openHiddenCircuits(list, self)) : null,
    el('p', { class: 'help' }, `La durée suit ton pas : la marche, plus ${STOP_MIN} min pour regarder chaque étape. Les visites de musée sont en plus. Le temps à droite : pour aller au départ.`),
    back ? foot(backBtn(back)) : null,
  ), { tall: true, name: 'circuits', again });
}

/** La page d'un circuit : durée à mon pas, confort, Balade guidée, le tracé sur la carte, les étapes, mes lieux près du tracé. */
/** L'encadré « le soleil se couche à… » d'une balade de `total` minutes qui finirait de nuit (rien sinon). */
const nightLine = (total) => { const s = nightNote(total); return s ? el('p', { class: 'warn' }, s) : null; };

function openCircuit(c, back) {
  const again = () => openCircuit(c, back);
  const t = circuitTimes(c);
  const done = circuitDone(state.outings, c.id);
  const mine = pointsNearTrace(offered().filter((p) => !p.owner), c.trace, minutesToMeters(NEAR_TRACE_MIN));
  const showAll = openCircuit.all === c.id;
  const mineShown = showAll || mine.length <= 4 ? mine : mine.slice(0, 3);
  const stopNames = new Set(c.etapes.map((e) => e.n));
  const arcs = arcadesNearTrace(arcadesData ?? [], c.trace, minutesToMeters(ARCADE_TRACE_MIN)).filter((x) => !stopNames.has(x.a.nom));
  const self = named(c.titre, again);
  const pbs = notesOf(state.circuitNotes, c.id);
  const isHidden = cleanHiddenCircuits(state.hiddenCircuits).includes(c.id);
  openSheet([ico('signpost'), ` ${c.titre}`], el('div', { class: 'stack' },
    isHidden ? el('p', { class: 'warn' }, 'Circuit masqué : il n\'est plus dans la liste. « Remettre ce circuit », en bas, le fait revenir.') : null,
    el('p', { class: 'summary' }, `${c.depart} → ${c.arrivee} · ${kmText(c.m)}`),
    el('p', { class: 'help' }, ico('footprints'), ` ${minText(t.walk)} de marche à ton pas, environ ${minText(t.total)} avec les arrêts.`),
    nightLine(t.total),
    c.confort ? el('p', { class: 'help' }, ico('triangle-alert'), ` ${c.confort}`) : null,
    c.note ? el('p', { class: 'help' }, ico('info'), ` ${c.note}`) : null,
    done.length ? el('button', { type: 'button', class: 'fiche-row', onclick: () => openOuting(done[0].id, self) }, ico('check'), el('span', {}, `Fait le ${dayText(done[0].at)}`, el('small', {}, done.length > 1 ? `${plural(done.length, 'fois', 'fois')} en tout · ce que j'en retiens` : 'Ce que j\'en retiens')), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right'))) : null,
    el('button', { type: 'button', class: 'btn primary go-bar', onclick: () => startGuide(stepStops(c), c.titre) }, ico('navigation'), 'Balade guidée'),
    el('button', { type: 'button', class: 'btn c-disc', onclick: () => showCircuitOnMap(c, back) }, ico('map'), 'Voir sur la carte'),
    el('button', { type: 'button', class: 'btn c-add', onclick: () => markCircuitDone(c, self) }, ico('check'), 'Je l\'ai fait'),
    el('h3', { class: 'fiche-sec' }, `Les ${c.etapes.length} étapes`),
    el('ol', { class: 'items' }, c.etapes.map((e, i) => el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openCircuitStep(c, i, self) },
      el('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1)),
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, e.n), e.t ? el('span', { class: 'item-sub' }, e.t) : null))))),
    mine.length ? el('h3', { class: 'fiche-sec' }, `Mes lieux à ${NEAR_TRACE_MIN} min du tracé`) : null,
    mine.length ? el('ul', { class: 'items' }, mineShown.map(({ p, d }) => el('li', { class: 'item' }, el('button', { type: 'button', class: 'item-main', onclick: () => openDetail(p.id, self) },
      el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, p.name), el('span', { class: 'item-sub' }, `${catOf(p.cat).name} · à ${Math.max(10, Math.round(d / 10) * 10)} m du tracé`)))))) : null,
    mineShown.length < mine.length ? el('button', { type: 'button', class: 'ev-more', onclick: () => { openCircuit.all = c.id; again(); } }, `Tous mes lieux près du tracé (${mine.length})`, ico('chevron-down')) : null,
    arcs.length ? el('h3', { class: 'fiche-sec' }, `Autres passages à ${ARCADE_TRACE_MIN} min du tracé`) : null,
    arcs.length ? el('ul', { class: 'items' }, arcs.map((x) => arcadeRow(x, self, `${walkMinutes(x.d)} min du tracé · ${x.a.rues}`))) : null,
    el('h3', { class: 'fiche-sec' }, 'Un souci sur ce circuit ?'),
    pbs.length ? ficheRow('triangle-alert', plural(pbs.length, 'problème noté', 'problèmes notés'), `Le dernier le ${dayText(pbs[0].at)} · les voir, les copier`, () => openCircuitNotes(c, self)) : null,
    ficheRow('triangle-alert', 'Signaler un problème sur le chemin', 'Pour une étape : ouvre l\'étape, puis « Signaler un problème »', () => openProblem(c, null, self)),
    isHidden ? ficheRow('eye', 'Remettre ce circuit', 'Il revient dans la liste', () => setCircuitHidden(c, false, again))
      : ficheRow('eye-off', 'Masquer ce circuit', 'Il quitte la liste ; tu pourras le remettre', () => setCircuitHidden(c, true, back ?? (() => openCircuits()))),
    el('p', { class: 'help' }, 'Chaque étape cite sa source. Le tracé suit les rues d\'OpenStreetMap ; il ne change pas si une rue est en travaux.'),
    back ? foot(backBtn(back)) : null,
  ), { tall: true, name: `circuit:${c.id}`, again });
}

/** Une étape : son texte et sa source, puis les mêmes actions qu'un lieu de Sorties (Y aller, Boussole, Métro, Ajouter). */
function openCircuitStep(c, i, back) {
  const e = c.etapes[i];
  const self = named(e.n, () => openCircuitStep(c, i, back));
  openSpot({ icon: e.m ? 'train-front' : 'signpost', title: e.n, kicker: `Étape ${i + 1} sur ${c.etapes.length} · ${c.titre}`, lines: [e.t], place: e,
    extra: el('button', { type: 'button', class: 'btn c-info', onclick: () => openProblem(c, i, self) }, ico('triangle-alert'), 'Signaler un problème'),
    link: e.s ? [e.s, `Source : ${siteName(e.s)}`] : null, back, key: `circuit:${c.id}:${i}` });
}

/** Le tracé et les étapes numérotées sur la carte ; le bandeau ramène au circuit. Rien n'est demandé au GPS. */
function showCircuitOnMap(c, back) {
  closeSheet();
  endPeek();
  L.polyline(c.trace, { color: discInk(), weight: 5, opacity: 0.85, interactive: false }).addTo(peekLayer);
  const self = named(c.titre, () => openCircuit(c, back));
  c.etapes.forEach((e, i) => L.marker([e.lat, e.lng], { keyboard: true, title: e.n, zIndexOffset: 420,
    icon: L.divIcon({ className: 'pin-wrap', html: `<span class="step-pin circuit">${i + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
    .on('add', (ev) => ev.target.getElement()?.setAttribute('aria-label', `Étape ${i + 1} : ${e.n}`))
    .on('click', () => openCircuitStep(c, i, self))
    .addTo(peekLayer));
  showPeekCard('Circuit', c.titre, () => openCircuit(c, back), 'Touche ici pour revenir au circuit');
  map.fitBounds(L.latLngBounds(c.trace), { paddingTopLeft: [24, 90], paddingBottomRight: [84, 170], maxZoom: 17, animate: false });
}

/** « Je l'ai fait » : une ligne dans Mon journal (jamais le trajet suivi), puis « Ce que j'en retiens ». */
function markCircuitDone(c, back) {
  const id = circuitOutingId(c.id);
  const end = c.etapes.at(-1);
  state.outings = cleanOutings([{ id, at: Date.now(), name: `Circuit ${c.titre}`, lat: end.lat, lng: end.lng, place: `${c.depart} → ${c.arrivee}` }, ...(state.outings ?? [])]);
  persist();
  toast('Noté dans Mon journal');
  openOuting(id, back);
}

/* ---------- Un souci sur un circuit (v172) : noté sur le téléphone, jamais envoyé ; « Copier pour Claude » ; masquer un circuit ---------- */
const ficheRow = (icon, title, sub, onclick) => el('button', { type: 'button', class: 'fiche-row', onclick },
  ico(icon), el('span', {}, title, sub ? el('small', {}, sub) : null), el('span', { class: 'fiche-chev', 'aria-hidden': 'true' }, ico('chevron-right')));

/** Signaler un problème : sur le chemin (i = null) ou sur une étape. Un choix, un mot facultatif. Ni position ni photo. */
function openProblem(c, i, back) {
  const kinds = i === null ? ROUTE_PROBLEMS : STEP_PROBLEMS;
  let pick = '';
  const text = el('textarea', { maxlength: String(NOTE_TEXT_MAX), placeholder: i === null ? 'Ex. : grille fermée rue de Lyon' : 'Ex. : la date est 1828, pas 1826' });
  const save = el('button', { type: 'button', class: 'btn primary', onclick: () => {
    if (!pick) { toast('Choisis d\'abord le problème, juste au-dessus.', true); return; }
    const e = i === null ? null : c.etapes[i];
    state.circuitNotes = cleanCircuitNotes([{ id: circuitNoteId(c.id), c: c.id, e: i, n: e?.n ?? '', k: pick, t: text.value, at: Date.now() }, ...(state.circuitNotes ?? [])]);
    persist();
    toast('Problème noté. Liste des circuits → Problèmes notés → Copier pour Claude.');
    back();
  } }, ico('check'), 'Noter le problème');
  const chips = kinds.map(([k, label]) => el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: (ev) => {
    pick = k;
    for (const b of chips) b.setAttribute('aria-pressed', String(b === ev.currentTarget));
  } }, label));
  openSheet([ico('triangle-alert'), ' Signaler un problème'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, i === null ? `${c.titre} · le chemin` : `${c.titre} · étape ${i + 1} : ${c.etapes[i].n}`),
    el('div', { class: 'list-chips', role: 'group', 'aria-label': 'Le problème (un seul choix)' }, chips),
    el('label', { class: 'field' }, 'Un mot (facultatif)', text),
    save,
    el('p', { class: 'help' }, 'Gardé sur ton téléphone, rien n\'est envoyé, ta position n\'est pas notée. Pour que je corrige le circuit : « Copier pour Claude », puis colle le texte dans une conversation.'),
    foot(backBtn(back)),
  ), { name: `probleme:${c.id}:${i ?? 'chemin'}` });
}

/** Les problèmes notés (d'un circuit, ou de tous), à copier pour Claude ou à effacer une fois le circuit corrigé. */
function openCircuitNotes(c, back) {
  const again = () => openCircuitNotes(c, back);
  const notes = c ? notesOf(state.circuitNotes, c.id) : cleanCircuitNotes(state.circuitNotes);
  const titles = new Map((circuitsData ?? []).map((x) => [x.id, x.titre]));
  if (!notes.length) { back(); return; }
  openSheet([ico('triangle-alert'), ' Problèmes notés'], el('div', { class: 'stack' },
    el('p', { class: 'summary' }, `${c ? `${c.titre} · ` : ''}${plural(notes.length, 'signalement', 'signalements')}, du plus récent.`),
    el('ul', { class: 'pb-list' }, notes.map((x) => el('li', {},
      el('b', {}, `${c ? '' : `${titles.get(x.c) ?? x.c} · `}${x.e === null ? 'Le chemin' : `Étape ${x.e + 1}${x.n ? ` : ${x.n}` : ''}`}`),
      el('span', {}, `${problemLabel(x.k)} · le ${dayText(x.at)}`),
      x.t ? el('span', { class: 'pb-text' }, `« ${x.t} »`) : null))),
    el('button', { type: 'button', class: 'btn c-info', onclick: () => copyText(notesText(notes, circuitsData), 'Copié : colle-le dans une conversation avec Claude.') }, ico('copy'), 'Copier pour Claude'),
    el('button', { type: 'button', class: 'btn danger', onclick: () => {
      if (!confirm(notes.length > 1 ? `Effacer ces ${notes.length} signalements ?` : 'Effacer ce signalement ?')) return;
      const gone = new Set(notes.map((x) => x.id));
      state.circuitNotes = cleanCircuitNotes(state.circuitNotes).filter((x) => !gone.has(x.id));
      persist(); toast('Signalements effacés'); back();
    } }, ico('trash-2'), notes.length > 1 ? 'Effacer ces signalements' : 'Effacer ce signalement'),
    el('p', { class: 'help' }, 'Une fois le circuit corrigé dans l\'appli, efface ses signalements.'),
    foot(backBtn(back)),
  ), { tall: true, name: `pb:${c?.id ?? 'tous'}`, again });
}

/** Masquer ou remettre un circuit : rien n'est supprimé, il quitte seulement la liste. */
function setCircuitHidden(c, on, next) {
  const now = cleanHiddenCircuits(state.hiddenCircuits).filter((id) => id !== c.id);
  state.hiddenCircuits = on ? [...now, c.id] : now;
  persist();
  toast(on ? `« ${c.titre} » masqué : en bas de la liste des circuits pour le remettre.` : `« ${c.titre} » est de nouveau dans la liste.`, false,
    on ? { label: 'Annuler', fn: () => setCircuitHidden(c, false, next) } : null);
  next();
}

function openHiddenCircuits(list, back) {
  const again = () => openHiddenCircuits(list, back);
  const hidden = new Set(cleanHiddenCircuits(state.hiddenCircuits));
  const items = list.filter((c) => hidden.has(c.id));
  if (!items.length) { back(); return; }
  const self = named('Circuits masqués', again);
  openSheet([ico('eye-off'), ' Circuits masqués'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Touche un circuit, puis « Remettre ce circuit » en bas de sa page.'),
    el('ul', { class: 'items ev-list' }, items.map((c) => sortieCard({ genre: 'circuit', name: c.titre, onclick: () => openCircuit(c, self), sub: [`${c.depart} → ${c.arrivee}`, kmText(c.m)] }))),
    foot(backBtn(back)),
  ), { tall: true, name: 'circuits-masques', again });
}

/* ---------- Passages couverts (v168) : liste fixe dans l'appli (data/passages.json), triée sur le téléphone ----------
   Calque : de loin un petit point (le toucher zoome), de près un pictogramme ; en zoomant encore (ARCADE_LINE_ZOOM), un trait d'une entrée à l'autre,
   seulement pour les passages dont le chemin calculé est sûr. Aucun horaire : ils varient d'un passage à l'autre. */
let arcadesData = null;
const loadArcades = async () => (arcadesData ??= await fetch('data/passages.json').then((r) => (r.ok ? r.json() : null)).then((j) => (j ? cleanArcades(j) : null)).catch(() => null));
const arcadeLayer = L.layerGroup().addTo(map);
/** De loin (sous LAYER_ZOOM), un petit point : les passages sont proches les uns des autres et se recouvriraient ; le toucher zoome dessus. */
const arcadePin = (a, z = -60, far = false) => {
  const label = far ? `Passage couvert : ${a.nom} (touche pour zoomer)` : `Passage couvert : ${a.nom}`;
  return L.marker([a.lat, a.lng], { keyboard: true, title: label, alt: label, zIndexOffset: z,
    icon: L.divIcon({ className: 'pin-wrap', html: far ? '<span class="arc-pin far"></span>' : `<span class="arc-pin">${svgIcon('door-open', { size: 15 })}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }) });
};
const arcadeLine = (a, interactive = true) => L.polyline(a.trace, { color: discInk(), weight: 9, opacity: 0.45, lineCap: 'butt', interactive });

function drawArcadeLayer() {
  arcadeLayer.clearLayers();
  if (!state.showPassages || !arcadesData) return;
  const z = map.getZoom();
  for (const a of arcadesData) {
    if (z >= ARCADE_LINE_ZOOM && a.trace) arcadeLine(a).on('click', () => openArcade(a)).addTo(arcadeLayer);
    if (z < LAYER_ZOOM) arcadePin(a, -60, true).on('click', () => map.setView([a.lat, a.lng], ARCADE_LINE_ZOOM + 1)).addTo(arcadeLayer);
    else arcadePin(a).on('click', () => openArcade(a)).addTo(arcadeLayer);
  }
}
async function setArcadeLayer(on) {
  state.showPassages = on; persist();
  if (!on) { arcadeLayer.clearLayers(); return; }
  if (!(await loadArcades())) { toast('Les passages couverts n\'ont pas pu être lus. Essaie Réglages → Appli → Mettre à jour l\'appli.', true); return; }
  drawArcadeLayer();
}
map.on('zoomend', drawArcadeLayer);

/** La page d'un passage : ce qu'il a de particulier, ses entrées, sa source ; puis les actions d'un lieu (ajouté, il est déjà coché « abrité »). */
function openArcade(a, back = null) {
  openSpot({ icon: 'door-open', title: a.nom, kicker: 'Passage couvert', place: a,
    lines: [a.t, a.rues ? el('p', { class: 'where' }, ico('map-pin'), `Entrées : ${a.rues}`) : null, ARCADE_HOURS],
    extra: el('button', { type: 'button', class: 'btn c-disc', onclick: () => showArcadeOnMap(a, back) }, ico('map'), 'Voir sur la carte'),
    link: a.s ? [a.s, `Source : ${siteName(a.s)}`] : null, add: { covered: true }, back, key: `passage:${a.id}` });
}

/** Le passage seul sur la carte, de près : son trait s'il est sûr, sinon son pictogramme. Le bandeau ramène à sa page. */
function showArcadeOnMap(a, back) {
  closeSheet();
  endPeek();
  if (a.trace) arcadeLine(a, false).addTo(peekLayer);
  arcadePin(a, 420).on('click', () => openArcade(a, back)).addTo(peekLayer);
  showPeekCard('Passage couvert', a.nom, () => openArcade(a, back), 'Touche ici pour revenir au passage');
  map.setView([a.lat, a.lng], 17, { animate: false });
}

const arcadeRow = (x, back, sub = '') => el('li', { class: 'item' },
  el('button', { type: 'button', class: 'item-main', onclick: () => openArcade(x.a, back) },
    el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('door-open', { size: 18 })),
    el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, x.a.nom), el('span', { class: 'item-sub' }, sub || `${walkMinutes(x.d)} min · ${x.a.rues}`))));

/** Les passages couverts à moins de N min, du plus proche. */
function openArcadeList(near, min, back) {
  const self = named('Passages', () => openArcadeList(near, min, back));
  openSheet([ico('door-open'), ` Passages à moins de ${min} min`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `${plural(near.length, 'passage couvert', 'passages couverts')}, du plus proche. ${ARCADE_HOURS}`),
    el('ul', { class: 'items' }, near.map((x) => arcadeRow(x, self))),
    back ? foot(backBtn(back)) : null,
  ), { tall: true, name: 'passages', again: () => openArcadeList(near, min, back) });
}

/* ---------- Monuments historiques (Wikidata, protégés MH) ---------- */

const HIST_KEY = 'carte-paris.monuments';
let histList = null;
/** Protection, siècle, type et musée des monuments de Paris (fichier de l'appli, joint par la référence PA). */
/** Auteur et date des monuments (data/architectes.json, robot ; v198) : lu avec Monuments. */
let archData = null; let archMap = null;
const loadArch = async () => { archData ??= await fetch('data/architectes.json').then((r) => (r.ok ? r.json() : null)).catch(() => null); archMap ??= cleanArch(archData); return archMap; };
let merimeeInfo = null;
const loadMerimee = async () => (merimeeInfo ??= await fetch('data/merimee.json').then((r) => (r.ok ? r.json() : null))
  .then(parseMerimee).catch(() => parseMerimee(null)));
async function monuments() {
  if (histList) return histList;
  try { const c = JSON.parse(localStorage.getItem(HIST_KEY) ?? 'null'); if (c && Date.now() - c.t < 30 * 864e5 && c.list?.length) histList = c.list; } catch { /* rien */ }
  if (histList) return histList;
  const r = await net(HIST_URL, { headers: { Accept: 'application/sparql-results+json' } });
  if (!r.ok) throw new Error('wikidata');
  histList = parseHist(await r.json());
  try { localStorage.setItem(HIST_KEY, JSON.stringify({ t: Date.now(), list: histList })); } catch { /* stockage plein : on garde en mémoire */ }
  return histList;
}

/** Les autres monuments protégés de Paris du même auteur (v198), du plus proche ; un appui ouvre la boussole. */
function openSameAuthor(rec, back) {
  const who = authorName(rec.a[0]);
  const from = freshHere() || origin;
  const list = sameAuthor(archMap, rec, from);
  const self = named(who, () => openSameAuthor(rec, back));
  openSheet([ico('user'), ` ${who}`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `${plural(list.length, 'autre monument protégé', 'autres monuments protégés')} à Paris portent ce nom d'auteur dans la base Mérimée${from ? ', du plus proche au plus loin' : ''}.`),
    el('ul', { class: 'items' }, list.map((x) => el('li', { class: 'item' },
      el('button', { type: 'button', class: 'item-main', onclick: () => openCompass({ name: x.t || 'Monument', lat: x.lat, lng: x.lng }) },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('landmark', { size: 18 })),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, x.t || 'Monument'),
          el('span', { class: 'item-sub' }, [x.m != null ? fmtWalk(x.m) : '', x.d].filter(Boolean).join(' · '))))))),
    el('p', { class: 'help' }, 'Seulement les édifices où ce nom est écrit à l\'identique : ce n\'est pas toute son œuvre. Un appui ouvre la boussole. Source : base Mérimée du ministère de la Culture (Licence Ouverte 2.0).'),
    foot(backBtn(back)),
  ), { name: 'same-author', again: self });
}

async function openMonuments() {
  track('Monuments');
  if (!origin) { openNear(); return; }
  const title = [ico('landmark'), ' Monuments historiques'];
  let all;
  if (!histList) openSheet(title, el('p', { class: 'help' }, 'Chargement des monuments de Paris (la première fois seulement)…'), { name: 'hist' });
  try { all = await monuments(); await Promise.all([loadMerimee(), loadArch()]); } catch {
    openSheet(title, el('div', { class: 'stack' },
      el('p', { class: 'warn' }, 'La base des monuments ne répond pas. Réessaie dans un moment.'),
      foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi'))), { name: 'hist' });
    return;
  }
  const items = all.map((m) => ({ ...m, d: distanceM(origin, m) })).filter((m) => m.d <= 1000).sort((a, b) => a.d - b.d).slice(0, 25);
  const have = (m) => findDuplicate(state.points, { name: m.name, lat: m.lat, lng: m.lng });
  const info = (m) => merimeeInfo?.items.get(m.merimee);
  const link = (href, icon, label, aria) => el('a', { class: 'mini-link', href, target: '_blank', rel: 'noopener', 'aria-label': aria }, ico(icon), label);
  // v198 : « Du même auteur (N) » quand le premier auteur nommé a d'autres monuments protégés dans Paris (nom écrit à l'identique)
  const sameBtn = (m) => { const rec = archMap?.get(m.merimee); const n = rec ? sameAuthor(archMap, rec, null).length : 0;
    return n ? el('button', { type: 'button', class: 'mini-link', onclick: () => openSameAuthor(rec, named('Monuments', openMonuments)), 'aria-label': `Les autres monuments de ${authorName(rec.a[0])}` }, ico('user'), `Du même auteur (${n})`) : null; };
  openSheet(title, el('div', { class: 'stack' },
    el('p', { class: 'help' }, items.length ? `${plural(items.length, 'monument protégé', 'monuments protégés')} à moins de 1 km, du plus proche au plus loin.` : 'Aucun monument historique à moins de 1 km.'),
    el('ul', { class: 'items' }, items.map((m) => el('li', { class: 'item item-col' },
      el('div', { class: 'item-row wrap' },
        el('div', { class: 'item-main' },
          el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, ico('landmark', { size: 18 })),
          el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, m.name), el('span', { class: 'item-sub' }, `${fmtDist(m.d)} · ${walkMinutes(m.d)} min`),
            ...[merimeeLine(info(m)), museumLine(info(m)), archLine(archMap?.get(m.merimee))].filter(Boolean).map((t) => el('span', { class: 'item-sub small' }, t)))),
        el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass({ name: m.name, lat: m.lat, lng: m.lng }), 'aria-label': `Boussole vers ${m.name}` }, ico('compass')),
        metroBtn(m, openMonuments),
        have(m) ? null : el('button', { type: 'button', class: 'go-compass add', 'aria-label': `Ajouter ${m.name} à ma carte`, onclick: () => openForm({ name: m.name, lat: m.lat, lng: m.lng, acc: null }) }, ico('plus'))),
      el('div', { class: 'links' },
        m.site ? link(m.site, 'send', 'Site officiel', `Site officiel de ${m.name} (visites, billets)`) : null,
        m.merimee ? link(merimeeUrl(m.merimee), 'landmark', 'Fiche Culture', `Fiche du ministère de la Culture : ${m.name}`) : null,
        sameBtn(m),
        m.wiki ? link(m.wiki, 'book-open-text', 'Wikipédia', `Article Wikipédia : ${m.name}`) : null)))),
    el('p', { class: 'help' }, `Billets et horaires : sur le site officiel quand il existe. « Façade seulement » : seul l'extérieur est protégé, l'intérieur ne se visite en général pas. Sources : Wikidata (CC0), base Mérimée du ministère de la Culture${merimeeInfo?.updated ? ` (${frenchDate(merimeeInfo.updated)})` : ''} et liste des musées de la Région Île-de-France. La liste de Paris est téléchargée une fois par mois ; ta position n'est pas envoyée.`),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => renderNear() }, '← Autour de moi')),
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
  doneBtn.setAttribute('aria-label', `Marquer ${p.name} : ${mine ? didLower(catOf(mine.cat)) : 'déjà visité'}`);
  doneBtn.onclick = () => {
    if (!mine) return;
    markDone(mine, true); persist(); renderMarkers();
    doneBtn.hidden = true;
    toast(`${mine.name} : noté « ${didLower(catOf(mine.cat))} »`);
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
      fill(walkEl, ico('footprints', { size: 15 }), ` ${walkText(walkSession)}`);
      remember(pos);
      if (distanceM(pos, p) < 20) { try { navigator.vibrate?.(300); } catch { /* rien */ } }
      draw();
    }, (err) => { hint.textContent = GEO_ERRORS[err.code] ?? 'Position indisponible.'; }, { enableHighAccuracy: true, maximumAge: 3000 })
    : null;
  draw();

  const mute = compassEl.querySelector('.compass-mute');
  const drawMute = () => { fill(mute, ...(state.voice === false ? [ico('volume-x'), ' Voix coupée'] : [ico('volume-2'), ' Voix'])); mute.setAttribute('aria-pressed', String(state.voice !== false)); };
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
  if (fromHistory) return;
  // Fermée par la croix ou en fin de balade : le retour qui suit repasse par popstate. `compassOpen` reste vrai jusque-là,
  // pour que la fiche ou la page d'en dessous reste ouverte (v203 : la croix fermait aussi la fiche).
  compassOpen = true;
  history.back();
}
compassEl.querySelector('.compass-close').addEventListener('click', () => { guide = null; closeCompass(); });
compassEl.querySelector('.compass-next').addEventListener('click', guideNext);
window.addEventListener('popstate', () => { if (!compassOpen) return; if (compassStop) closeCompass(true); else compassOpen = false; });

/* ---------- Réglages ---------- */

/**
 * Réglages : un sommaire court (tout tient sur un écran), chaque rubrique s'ouvre à part.
 * `section` : null (sommaire), 'sauvegarde', 'categories', 'favoris', 'cercles', 'marche', 'appli'.
 */
function openSettings(section = null) {
  const rings = el('input', { type: 'text', inputmode: 'numeric', value: state.rings.join(', '), 'aria-describedby': 'ringsHelp' });
  const minRings = el('input', { type: 'text', inputmode: 'numeric', value: state.minuteRings.join(', ') });
  const meInput = el('input', { type: 'text', maxlength: '30', value: state.me ?? '', autocomplete: 'given-name', placeholder: 'Ton prénom ou un pseudo' });
  const count = state.points.length;

  // Les photos partent avec la sauvegarde par défaut : une restauration rend aussi les photos.
  const withPhotos = el('input', { type: 'checkbox', class: 'check', checked: true });
  const nbPhotos = state.points.reduce((n, p) => n + (p.photos?.length ?? 0), 0);
  // La liste TTB et mes marques partent aussi, case cochée au départ (v179) : après une remise à zéro, plus besoin de réimporter la page du guide.
  const withTtb = el('input', { type: 'checkbox', class: 'check', checked: true });
  const nbTtb = ttbList().length;
  const nbTtbMarks = Object.keys(ttbMarksNow()).length;
  const canShareFile = (() => {
    try { return Boolean(navigator.canShare?.({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] })); } catch { return false; }
  })();
  const back = () => openSettings();
  const backBtn = foot(el('button', { type: 'button', class: 'btn', onclick: back }, '← Réglages'));
  const unsaved = state.backup?.n ?? 0;
  const saveSummary = backupSummary();

  if (section === 'sauvegarde') {
    openSheet([ico('save'), ' Sauvegarde'], el('div', { class: 'stack' },
      el('p', { class: unsaved ? 'warn' : 'ok-line' }, unsaved ? null : ico('check'), `${unsaved ? '' : ' '}${plural(count, 'lieu', 'lieux')} sur ce téléphone. ${saveSummary}.`),
      persisted === false ? el('p', { class: 'warn' }, 'Ce téléphone n\'a pas promis de garder tes lieux s\'il manque de place. Installe l\'appli sur l\'écran d\'accueil et sauvegarde régulièrement.') : null,
      // Le prénom passe AVANT les boutons d'envoi : on voit sous quel nom les lieux partiront.
      // Prénom déjà là : une seule ligne, pour que « Exporter » reste en haut.
      state.me && !editMe
        ? el('div', { class: 'me-line' },
          el('span', {}, 'Tes lieux partiront au nom de ', el('b', {}, state.me)),
          el('button', { type: 'button', class: 'btn', onclick: () => { editMe = true; openSettings('sauvegarde'); document.querySelector('#sheetBody .me-box input')?.focus(); } }, 'Modifier'))
        : el('div', { class: 'me-box' },
          el('label', { class: 'field' }, 'Tes lieux partiront au nom de', meInput),
          el('button', { type: 'button', class: 'btn c-add', onclick: () => {
            state.me = meInput.value.trim().slice(0, 30); editMe = false; persist(); openSettings('sauvegarde'); toast(state.me ? `Prénom enregistré : ${state.me}` : 'Prénom effacé');
          } }, 'Enregistrer le prénom'),
          el('p', { class: 'help' }, 'Tes amis le verront sur tes lieux (initiale sur l\'épingle, « Ajouté par » dans la fiche). Sans prénom, ils ne sauront pas de qui viennent ces lieux.')),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: () => saveBackup(withPhotos.checked, withTtb.checked).then(() => openSettings('sauvegarde')), disabled: count === 0 }, ico('download'), 'Sauvegarder maintenant'),
      canShareFile ? el('button', { type: 'button', class: 'btn c-add', onclick: () => sendBackup(withPhotos.checked, withTtb.checked).then(() => openSettings('sauvegarde')), disabled: count === 0 }, ico('send'), 'Envoyer le fichier (mail, Drive…)') : null,
      nbPhotos ? el('label', { class: 'item-main check-row' }, withPhotos,
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, `Avec les ${nbPhotos} photo${nbPhotos > 1 ? 's' : ''}`),
          el('span', { class: 'item-sub' }, 'Fichier plus lourd, mais une restauration rend aussi les photos'))) : null,
      nbTtb || nbTtbMarks ? el('label', { class: 'item-main check-row' }, withTtb,
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, 'Avec la liste TTB'),
          el('span', { class: 'item-sub' }, `${[nbTtb ? plural(nbTtb, 'adresse', 'adresses') : '', nbTtbMarks ? `tes marques (${nbTtbMarks})` : ''].filter(Boolean).join(' et ')} : après une remise à zéro, plus besoin de réimporter la page du guide`))) : null,
      el('button', { type: 'button', class: 'btn c-disc', onclick: () => openSendFriend(), disabled: count === 0 }, ico('users'), 'Envoyer à un proche…'),
      el('p', { class: 'help' }, 'Ce fichier est ta sauvegarde complète, pour toi : il va dans tes Téléchargements, et si tu perds ton téléphone il part avec. De temps en temps, envoie-le aussi sur ton mail ou ton Drive. Pour un proche, « Envoyer à un proche » te laisse choisir ce qui part.'),
      el('p', { class: 'warn' }, 'Effacer les « données des sites » dans Chrome efface aussi tes lieux. Sauvegarde avant.'),
      foot(el('button', { type: 'button', class: 'btn c-add', onclick: () => openSettings('importer') }, ico('upload'), 'Restaurer'), el('button', { type: 'button', class: 'btn', onclick: back }, '← Réglages')), // v185 : le retour toujours en dernier
    ), { tall: true, name: 'settings:sauvegarde', again: () => openSettings('sauvegarde') });
    return;
  }
  if (section === 'importer') {
    openSheet([ico('upload'), ' Restaurer ou importer'], el('div', { class: 'stack' },
      el('button', { type: 'button', class: 'btn c-add solid', onclick: () => pickImport('mine') }, ico('upload'), 'Restaurer ma sauvegarde'),
      el('p', { class: 'help' }, 'Choisis ton dernier fichier « Ma carte de Paris - sauvegarde du … » (dossier Téléchargements). Les lieux qui manquent reviennent, avec leurs photos et tes stations ; ceux déjà là ne sont pas touchés.'),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => pickImport('friend') }, ico('user'), 'Importer les lieux d\'un proche'),
      el('p', { class: 'help' }, 'Ses lieux s\'ajoutent aux tiens, à son nom. Le bouton Filtres en haut permet ensuite d\'afficher les tiens, les siens ou tous.'),
      el('button', { type: 'button', class: 'btn c-add', onclick: openGoogleImport }, ico('download'), 'Importer de Google Maps'),
      foot(el('button', { type: 'button', class: 'btn', onclick: back }, '← Réglages')),
    ), { tall: true, name: 'settings:importer', again: () => openSettings('importer') });
    return;
  }

  if (section === 'categories') {
    // Chaque bouton du haut : Barre, Plus (sous ⋯) ou Caché, comme les boutons de la carte (v151)
    const placeOf = chipPlace();
    const putTop = (key, name, to) => {
      const h = new Set(cleanChips(state.hiddenChips));
      const m = new Set(cleanMoreChips(state.moreChips ?? [], [...h]));
      h.delete(key); m.delete(key);
      if (to === 'hidden') h.add(key);
      if (to === 'more') m.add(key);
      state.hiddenChips = [...h]; state.moreChips = [...m]; persist(); refresh(); openSettings('categories');
      requestAnimationFrame(() => document.querySelector(`[data-top="${key}:${to}"]`)?.focus());
      toast(`${name} : ${to === 'bar' ? 'dans la barre' : to === 'more' ? 'dans ⋯ Plus' : 'caché (rien n\'est supprimé)'}`);
    };
    const topSeg = (key, name) => el('div', { class: 'seg tool-where', role: 'group', 'aria-label': `Place de ${name} en haut` },
      [['bar', 'Barre'], ['more', 'Plus'], ['hidden', 'Caché']].map(([k, label]) =>
        el('button', { type: 'button', 'aria-pressed': String(placeOf(key) === k), 'data-top': `${key}:${k}`, onclick: () => { if (placeOf(key) !== k) putTop(key, name, k); } }, label)));
    const fixed = chipItems().filter((x) => !x.cat);
    const nTop = { bar: 0, more: 0, hidden: 0 };
    for (const x of chipItems()) nTop[placeOf(x.key)] += 1;
    const moreNow = cleanMoreChips(state.moreChips ?? [], cleanChips(state.hiddenChips));
    const asStart = !cleanChips(state.hiddenChips).length && moreNow.length === DEFAULT_MORE_CHIPS.length && DEFAULT_MORE_CHIPS.every((k) => moreNow.includes(k));
    openSheet([ico('tags'), ' Catégories et listes'], el('div', { class: 'stack' },
      el('p', { class: 'help' }, 'La barre du haut, de gauche à droite. Pour chaque bouton : « Barre » le garde en haut, « Plus » le range sous le bouton ⋯ (à un appui), « Caché » l\'enlève. Les lieux restent toujours sur la carte. Flèches pour ranger tes catégories, nom pour les modifier.'),
      el('p', { class: 'summary' }, `En haut : ${plural(nTop.bar, 'bouton', 'boutons')}${nTop.more ? ` + ⋯ (${nTop.more} dans Plus)` : ''}${nTop.hidden ? ` · ${nTop.hidden} caché${nTop.hidden > 1 ? 's' : ''}` : ''}`),
      // Réglage de toute la barre : en tête de page, sans faire défiler
      el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(state.chipIcons === true), onclick: () => {
        state.chipIcons = !state.chipIcons; persist(); refresh(); openSettings('categories');
        toast(state.chipIcons ? 'Barre du haut : icônes seules' : 'Barre du haut : icône et nom');
      } },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, state.categories[0] ? catDot(state.categories[0].id) : '🏷️'),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Icônes seules en haut'), el('span', { class: 'menu-sub' }, 'Plus de catégories visibles sans faire défiler')),
      el('span', { class: `switch${state.chipIcons ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
      el('div', { class: 'legend' }, 'Les boutons de l\'appli'),
      el('div', {}, fixed.map((x) => el('div', { class: `cat-row tool-row${placeOf(x.key) === 'hidden' ? ' off' : ''}` },
        el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, x.icon),
        el('div', { class: 'tool-main' }, el('span', { class: 'cat-name' }, x.name), topSeg(x.key, x.name))))),
      el('div', { class: 'legend' }, 'Mes catégories, dans cet ordre'),
      el('div', {}, state.categories.map((c, i) => {
        const k = categoryCounts(state.points, c.id);
        const move = (delta) => { state = moveCategory(state, c.id, delta); persist(); refresh(); openSettings('categories');
          requestAnimationFrame(() => document.querySelector(`[data-move="${c.id}:${delta}"]`)?.focus()); };
        const last = state.categories.length - 1;
        const key = `cat:${c.id}`;
        return el('div', { class: `cat-row tool-row${placeOf(key) === 'hidden' ? ' off' : ''}` },
          el('span', { class: 'tool-prev', 'aria-hidden': 'true' }, catDot(c.id)),
          el('div', { class: 'tool-main' },
            el('button', { type: 'button', class: 'tool-rename', onclick: () => openCategory(c.id), 'aria-label': `Modifier ${c.name}` },
              el('span', { class: 'cat-name' }, c.name), ico('pencil'),
              el('span', { class: 'menu-sub' }, k.total ? `${plural(k.total, 'lieu', 'lieux')} · ${k.todo} à faire` : 'aucun lieu')),
            topSeg(key, c.name)),
          el('button', { type: 'button', class: 'btn move', disabled: i === 0, 'data-move': `${c.id}:-1`, onclick: () => move(-1), 'aria-label': `Monter ${c.name}` }, '↑'),
          el('button', { type: 'button', class: 'btn move', disabled: i === last, 'data-move': `${c.id}:1`, onclick: () => move(1), 'aria-label': `Descendre ${c.name}` }, '↓'));
      })),
      el('button', { type: 'button', class: 'btn c-add', onclick: () => openCategory(null) }, ico('plus'), 'Nouvelle catégorie'),
      asStart ? null : el('button', { type: 'button', class: 'btn c-guide', onclick: () => { state.hiddenChips = []; state.moreChips = [...DEFAULT_MORE_CHIPS]; persist(); refresh(); openSettings('categories'); toast('Barre du haut remise comme au début'); } }, 'Barre du haut comme au début'),
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
      el('p', { class: 'help' }, 'Touche le nom d\'un bouton pour le changer. Pour chaque bouton : « Carte » le met dans la colonne, « Plus » le range sous le bouton ⋯ (avec son nom, à un appui), « Caché » l\'enlève. ↑ ↓ règlent l\'ordre, de haut en bas, dans la colonne comme dans Plus. Le dernier de la colonne est le plus près de ton pouce.'),
      el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(state.toolLabels === true), onclick: () => {
        state.toolLabels = state.toolLabels !== true; persist(); applyToolOrder(); setLocateBtn(); openSettings('outils');
        toast(state.toolLabels ? 'Noms affichés à côté des boutons' : 'Noms cachés : icônes seules');
      } }, el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('tags')),
        el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Noms à côté des boutons'), el('span', { class: 'menu-sub' }, 'Écrits sur la carte, à côté de chaque bouton de la colonne')),
        el('span', { class: `switch${state.toolLabels === true ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
      el('p', { class: 'legend' }, 'L\'essentiel'),
      el('p', { class: 'help' }, `Un appui garde sur la carte : ${cleanEssentials(state.essentials).map(toolName).join(', ')}. Les autres passent dans ⋯ Plus ; rien n'est caché.`),
      el('button', { type: 'button', class: 'btn c-guide', onclick: applyEssential }, ico('check'), 'Ne garder que l\'essentiel'),
      state.layoutBefore ? el('button', { type: 'button', class: 'btn', onclick: restoreLayout }, ico('rotate-ccw'), 'Remettre mes boutons d\'avant') : null,
      el('button', { type: 'button', class: 'menu-row c-guide', onclick: () => openSettings('essentiel') },
        el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('pencil')),
        el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Choisir l\'essentiel'), el('span', { class: 'menu-sub' }, 'Les boutons à garder sur la carte')),
        el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›')),
      el('p', { class: 'legend' }, 'Chaque bouton'),
      el('p', { class: 'summary' }, (() => { const h = cleanHidden(state.hiddenTools); const m = moreList(); const n = list.filter((t) => !h.includes(t) && !m.includes(t)).length; return `Sur la carte : ${plural(n, 'bouton', 'boutons')}${m.length ? ` + ⋯ (${m.length} dans Plus)` : ''}`; })()),
      el('div', {}, list.map((t, i) => {
        const info = TOOL_INFO[t];
        const move = (delta) => { state.mapTools = moveTool(list, t, delta); persist(); applyToolOrder(); openSettings('outils');
          requestAnimationFrame(() => document.querySelector(`[data-move="${t}:${delta}"]`)?.focus()); };
        const where = cleanHidden(state.hiddenTools).includes(t) ? 'hidden' : moreList().includes(t) ? 'more' : 'map';
        const put = (to) => {
          const h = new Set(cleanHidden(state.hiddenTools));
          const m = new Set(moreList());
          h.delete(t); m.delete(t);
          if (to === 'hidden') h.add(t);
          if (to === 'more') m.add(t);
          state.hiddenTools = [...h]; state.moreTools = [...m]; persist(); applyToolOrder(); openSettings('outils');
          requestAnimationFrame(() => document.querySelector(`[data-put="${t}:${to}"]`)?.focus());
          toast(`${toolName(t)} : ${to === 'map' ? 'sur la carte' : to === 'more' ? 'dans Plus' : 'caché'}`);
        };
        return el('div', { class: `cat-row tool-row${where === 'hidden' ? ' off' : ''}` },
          el('span', { class: `tool-prev${t === 'paris' ? ' txt' : ''}`, 'aria-hidden': 'true' }, ICON_NAMES.has(info.icon) ? ico(info.icon, { size: 20 }) : info.icon),
          el('div', { class: 'tool-main' },
            el('button', { type: 'button', class: 'tool-rename', onclick: () => openSettings(`nom:${t}`), 'aria-label': `Renommer ${toolName(t)}` },
              el('span', { class: 'cat-name' }, toolName(t)), ico('pencil'),
              el('span', { class: 'menu-sub' }, state.toolNames?.[t] ? `${info.name} · nom d'origine : ${info.short}` : info.name)),
            el('div', { class: 'seg tool-where', role: 'group', 'aria-label': `Place du bouton ${toolName(t)}` },
              [['map', 'Carte'], ['more', 'Plus'], ['hidden', 'Caché']].map(([k, label]) =>
                el('button', { type: 'button', 'aria-pressed': String(where === k), 'data-put': `${t}:${k}`, onclick: () => { if (where !== k) put(k); } }, label)))),
          el('button', { type: 'button', class: 'btn move', disabled: i === 0, 'data-move': `${t}:-1`, onclick: () => move(-1), 'aria-label': `Monter ${toolName(t)}` }, '↑'),
          el('button', { type: 'button', class: 'btn move', disabled: i === list.length - 1, 'data-move': `${t}:1`, onclick: () => move(1), 'aria-label': `Descendre ${toolName(t)}` }, '↓'));
      })),
      el('button', { type: 'button', class: 'btn', onclick: () => { state.mapTools = normalizeTools([]); state.hiddenTools = []; state.moreTools = [...DEFAULT_MORE]; state.toolNames = {}; state.toolLabels = false; persist(); applyToolOrder(); setLocateBtn(); openSettings('outils'); toast('Boutons d\'origine remis, noms compris'); } }, 'Tout remettre comme au début'),
      backBtn,
    ), { tall: true, name: 'settings:outils', again: () => openSettings('outils') });
    return;
  }

  if (section === 'essentiel') {
    const ess = cleanEssentials(state.essentials);
    const flip = (t, box) => {
      const on = ess.includes(t);
      if (on && ess.length === 1) { box.checked = true; toast('Garde au moins un bouton', true); return; }
      state.essentials = on ? ess.filter((x) => x !== t) : [...ess, t]; persist(); openSettings('essentiel');
      requestAnimationFrame(() => document.querySelector(`[data-ess="${t}"]`)?.focus());
    };
    openSheet([ico('pencil'), ' Choisir l\'essentiel'], el('div', { class: 'stack' },
      el('p', { class: 'help' }, 'Coche les boutons à garder sur la carte. « Ne garder que l\'essentiel » range les autres dans ⋯ Plus.'),
      el('ul', { class: 'items' }, normalizeTools(state.mapTools).map((t) => {
        const info = TOOL_INFO[t];
        const box = el('input', { type: 'checkbox', class: 'check', checked: ess.includes(t), 'data-ess': t });
        box.addEventListener('change', () => flip(t, box));
        return el('li', { class: 'item' }, el('label', { class: 'item-main check-row' }, box,
          el('span', { class: `tool-prev${t === 'paris' ? ' txt' : ''}`, 'aria-hidden': 'true' }, ICON_NAMES.has(info.icon) ? ico(info.icon, { size: 20 }) : info.icon),
          el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, toolName(t)))));
      })),
      el('button', { type: 'button', class: 'btn c-guide', onclick: applyEssential }, ico('check'), 'Ne garder que l\'essentiel'),
      foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('outils') }, '← Boutons de la carte')),
    ), { tall: true, name: 'settings:essentiel', again: () => openSettings('essentiel') });
    return;
  }

  if (section === 'texte') {
    const cur = cleanTextSize(state.textSize);
    const choose = (t) => {
      state.textSize = t; persist(); applyTextSize(); refresh(); openSettings('texte'); toast(`Taille du texte : ${TEXT_NAME[t]}`);
      requestAnimationFrame(() => document.querySelector(`[data-text-size="${t}"]`)?.focus());
    };
    openSheet([ico('a-large-small'), ' Taille du texte'], el('div', { class: 'stack' },
      el('p', { class: 'help' }, 'Tout le texte de l\'appli grandit : listes, fiches, boutons, aide. Les noms sur le fond de carte suivent le zoom de la carte.'),
      el('div', { class: 'seg', role: 'group', 'aria-label': 'Taille du texte' },
        ...TEXT_SIZES.map((t) => el('button', { type: 'button', 'aria-pressed': String(cur === t), 'data-text-size': t, onclick: () => { if (cur !== t) choose(t); } }, TEXT_NAME[t]))),
      el('p', { class: 'legend' }, 'Aperçu'),
      el('div', { class: 'text-preview' },
        el('p', { class: 'menu-title' }, 'Musée Carnavalet'),
        el('p', { class: 'menu-sub' }, 'Musée · 3e · ouvert jusqu\'à 18h · 12 min à pied')),
      backBtn,
    ), { tall: true, name: 'settings:texte', again: () => openSettings('texte') });
    requestAnimationFrame(() => document.querySelector(`[data-text-size="${cur}"]`)?.focus());
    return;
  }

  if (section === 'pas') {
    const pace = cleanPace(state.pace);
    const apply = (next, msg) => {
      state.pace = cleanPace(next); setWalkSpeed(paceKmh(state.pace)); persist(); refresh(); openSettings('pas'); toast(msg);
    };
    const choose = (m) => apply({ ...pace, mode: m }, `Mon pas : ${PACE_NAME[m]}, ${kmhText(pace.kmh[m])} km/h`);
    const step = (m, d) => {
      const k = Math.min(7, Math.max(2, pace.kmh[m] + d));
      if (k === pace.kmh[m]) { toast(d > 0 ? 'Au plus : 7 km/h' : 'Au moins : 2 km/h'); return; }
      apply({ ...pace, kmh: { ...pace.kmh, [m]: k } }, `${PACE_NAME[m]} : ${kmhText(k)} km/h`);
      requestAnimationFrame(() => document.querySelector(`[data-step="${m}:${d}"]`)?.focus());
    };
    const perKm = (k) => Math.round(60 / k);
    openSheet([ico('footprints'), ' Mon pas'], el('div', { class: 'stack' },
      el('p', { class: 'help' }, 'Toutes les durées à pied de l\'appli suivent ton pas : listes, fiches, cercles en minutes, balade, Rentrer.'),
      el('p', { class: 'legend' }, 'Mon pas'),
      el('div', { class: 'seg', role: 'group', 'aria-label': 'Mon pas' },
        ...PACES.map((m) => el('button', { type: 'button', 'aria-pressed': String(pace.mode === m), 'data-pace': m, onclick: () => { if (pace.mode !== m) choose(m); } }, PACE_NAME[m]))),
      el('p', { class: 'legend' }, 'Vitesse de chaque mode'),
      ...PACES.map((m) => el('div', { class: 'cat-row pace-row' },
        el('span', { class: 'pace-text' }, el('span', { class: 'cat-name' }, PACE_NAME[m]),
          el('span', { class: 'menu-sub' }, `${kmhText(pace.kmh[m])} km/h · ${perKm(pace.kmh[m])} min par km`)),
        el('button', { type: 'button', class: 'btn c-guide pace-step', 'data-step': `${m}:-0.5`, 'aria-label': `${PACE_NAME[m]} : moins vite`, onclick: () => step(m, -0.5) }, ico('minus')),
        el('button', { type: 'button', class: 'btn c-guide pace-step', 'data-step': `${m}:0.5`, 'aria-label': `${PACE_NAME[m]} : plus vite`, onclick: () => step(m, 0.5) }, ico('plus')))),
      el('p', { class: 'help' }, `À ton pas, 1 km en ligne droite ≈ ${walkMinutes(1000)} min à pied (les rues font environ 1,3 fois la ligne droite). De 2 à 7 km/h. Au départ : Rapide 6, Normal 5, Tranquille 3,5.`),
      el('button', { type: 'button', class: 'btn', onclick: () => apply(undefined, 'Mon pas remis au départ : Normal, 5 km/h') }, ico('rotate-ccw'), 'Remettre au départ'),
      backBtn,
    ), { tall: true, name: 'settings:pas', again: () => openSettings('pas') });
    requestAnimationFrame(() => document.querySelector(`[data-pace="${pace.mode}"]`)?.focus());
    return;
  }

  if (typeof section === 'string' && section.startsWith('nom:')) {
    const t = section.slice(4);
    const info = TOOL_INFO[t];
    if (!info) { openSettings('outils'); return; }
    const custom = state.toolNames?.[t] ?? '';
    const input = el('input', { type: 'text', maxlength: String(TOOL_NAME_MAX), value: custom || info.short, autocomplete: 'off', enterkeyhint: 'done', 'aria-describedby': 'toolNameHelp' });
    const count = el('p', { class: 'help', id: 'toolNameHelp', 'aria-live': 'polite' });
    const showCount = () => { count.textContent = `${[...input.value].length} sur ${TOOL_NAME_MAX} caractères. Nom d'origine : ${info.short}. Laisse vide pour le remettre.`; };
    input.addEventListener('input', showCount); showCount();
    const done = (names, msg) => { state.toolNames = names; persist(); applyToolOrder(); setLocateBtn(); toast(msg); openSettings('outils'); };
    const reset = () => { const names = { ...(state.toolNames ?? {}) }; delete names[t]; done(names, `Nom d'origine remis : ${info.short}`); };
    const save = () => {
      const v = cleanToolName(input.value);
      if (!v || v === info.short) { reset(); return; }
      done({ ...(state.toolNames ?? {}), [t]: v }, `Bouton renommé : ${v}`);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
    openSheet([ico('pencil'), ' Nom du bouton'], el('div', { class: 'stack' },
      el('div', { class: 'cat-row' }, el('span', { class: `tool-prev${t === 'paris' ? ' txt' : ''}`, 'aria-hidden': 'true' }, ICON_NAMES.has(info.icon) ? ico(info.icon, { size: 20 }) : info.icon),
        el('span', { class: 'cat-name' }, info.name)),
      el('label', { class: 'field' }, 'Nom', input),
      count,
      custom ? el('button', { type: 'button', class: 'btn', onclick: reset }, ico('rotate-ccw'), `Remettre « ${info.short} »`) : null,
      el('p', { class: 'help' }, 'Ce nom se voit dans le panneau ⋯ Plus, dans cette page et à côté du bouton si « Noms à côté des boutons » est allumé ; TalkBack le lit. L\'aide de l\'appli garde les noms d\'origine.'),
      foot(el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', onclick: () => openSettings('outils') }, 'Annuler'),
        el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, 'Enregistrer'))),
    ), { tall: true, name: `settings:nom:${t}`, again: () => openSettings(`nom:${t}`) });
    requestAnimationFrame(() => { input.focus(); input.select(); });
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
      el('p', { class: 'help' }, `De 1 à 60 minutes. Exemple : 5, 10, 15, 20. Estimation à ton pas (${kmhText(paceKmh(state.pace))} km/h, réglable dans Mon pas), détours compris.`),
      el('button', { type: 'button', class: 'btn c-guide solid', onclick: () => {
        state.minuteRings = normalizeMinuteRings(minRings.value);
        minRings.value = state.minuteRings.join(', ');
        if (persist()) toast(`Cercles : ${state.minuteRings.map((m) => `${m} min`).join(', ')}`);
      } }, 'Enregistrer les minutes'),
      backBtn,
    ), { tall: true, name: 'settings:cercles', again: () => openSettings('cercles') });
    return;
  }

  if (section === 'transports') section = 'donnee:lignes'; // ancien nom
  if (section === 'donnees') {
    // Œuvres et galeries : lues une fois pour savoir si le robot les a déjà rangées dans l'appli (sinon « Pas encore ») ;
    // arrêts de bus et plaques aussi (v187) : sans eux, leur date restait inconnue et la ligne disait « À jour » à tort
    if (!artFilesRead.has('liste')) { artFilesRead.add('liste'); Promise.allSettled([loadStreetArt(), loadGalleries(), loadBus(), loadPlaques(), loadArr(), loadRespire(), loadVoies(), loadArch(), loadGares()]).finally(() => openSettings(section)); return; }
    const dates = dataDates();
    const due = new Set(dataDue(dates));
    // Date inconnue (fichier illisible, hors réseau et jamais gardé) : ni « À jour » ni « En retard » (v187 : pas d'info plutôt qu'une info fausse)
    const unknown = new Set(FIXED_DATA.filter((d) => d.robot && !dates[d.id] && !artNotYet(d.id, dates)).map((d) => d.id));
    const live = (kind) => { try { return JSON.parse(storage.getItem(`${PRATIQUE_KEY}.${kind}`) ?? 'null')?.time ?? 0; } catch { return 0; } };
    const when = (t) => (!t ? 'pas encore chargé' : new Date(t).toDateString() === new Date().toDateString() ? 'aujourd\'hui' : `le ${new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`);
    // Une donnée en direct : sa page sur opendata.paris.fr (pour voir sa date de mise à jour côté Ville), ou une simple ligne.
    const autoRow = (title, sub, dataset = '') => (dataset
      ? el('a', { class: 'menu-row c-info', href: `https://opendata.paris.fr/explore/dataset/${dataset}/information/`, target: '_blank', rel: 'noopener' },
        el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub)),
        el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '↗'))
      : el('div', { class: 'menu-row c-info' }, el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, title), el('span', { class: 'menu-sub' }, sub))));
    openSheet([ico('database'), ' Données de l\'appli'], el('div', { class: 'stack' },
      // v189 : l'état d'un coup d'œil (coche verte ou triangle), en gros, au lieu d'une ligne grise
      due.size ? el('p', { class: 'warn' }, ico('triangle-alert'), ` ${plural(due.size, 'donnée à mettre à jour', 'données à mettre à jour')}`)
        : unknown.size ? el('p', { class: 'help' }, `${plural(unknown.size, 'date inconnue', 'dates inconnues')} : rouvre cette page avec du réseau.`)
        : el('p', { class: 'hl-line ok' }, ico('circle-check'), 'Tout est à jour'),
      el('h3', { class: 'ring-title' }, el('span', {}, 'Mises à jour par le robot, chaque 1er du mois'), el('span', {}, '')),
      el('div', { class: 'menu' }, FIXED_DATA.filter((d) => d.robot).map((d) => el('button', { type: 'button', class: 'menu-row c-info', onclick: () => openSettings(`donnee:${d.id}`) },
        el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, d.name),
          el('span', { class: 'menu-sub' }, `${frenchDate(dates[d.id]) || (artNotYet(d.id, dates) ? 'pas encore dans l\'appli' : 'date inconnue')} · ${everyText(d.every)}`)),
        artNotYet(d.id, dates) ? el('span', { class: 'tag' }, 'Pas encore') : unknown.has(d.id) ? null : el('span', { class: due.has(d.id) ? 'tag due' : 'tag open' }, due.has(d.id) ? 'En retard' : 'À jour'),
        el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right'))))),
      el('a', { class: 'btn c-info solid', href: ROBOT_URL, target: '_blank', rel: 'noopener' }, ico('rotate-cw'), 'Lancer le robot maintenant'),
      el('button', { type: 'button', class: 'btn c-info', onclick: updateApp }, ico('download'), 'Mettre à jour l\'appli (après le robot)'),
      el('p', { class: 'help' }, 'Ouvre la page du robot sur GitHub (connecte-toi si besoin), puis « Run workflow » → « Run workflow ». En 2 à 5 minutes, il télécharge les fichiers officiels, les vérifie et publie. Ensuite : Appli → Mettre à jour l\'appli. S\'il échoue, rien ne change dans l\'appli, et GitHub t\'envoie normalement un mail.'),
      el('h3', { class: 'ring-title' }, el('span', {}, 'À refaire avec Claude'), el('span', {}, '')),
      el('div', { class: 'menu' }, FIXED_DATA.filter((d) => !d.robot).map((d) => el('button', { type: 'button', class: 'menu-row c-info', onclick: () => openSettings(`donnee:${d.id}`) },
        el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, d.name),
          el('span', { class: 'menu-sub' }, `${frenchDate(dates[d.id]) || 'date inconnue'} · ${everyText(d.every)}`)),
        el('span', { class: due.has(d.id) ? 'tag due' : 'tag open' }, due.has(d.id) ? 'À refaire' : 'À jour'),
        el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right'))))),
      el('p', { class: 'help' }, 'Touche une ligne : quoi télécharger et quoi envoyer à Claude (Mérimée n\'a pas de lien de téléchargement direct, les deux listes sont relevées à la main). Un rappel groupé s\'affiche à l\'ouverture, au plus une fois par semaine.'),
      el('h3', { class: 'ring-title' }, el('span', {}, 'Mises à jour automatiques'), el('span', {}, '')),
      el('p', { class: 'help' }, 'Rechargées toutes seules, sans ta position. Les liens ouvrent leur page sur opendata.paris.fr, avec la date de mise à jour de la Ville.'),
      el('div', { class: 'menu' },
        autoRow('Fontaines à boire', `Chaque jour · ${when(live('fontaines'))}`, 'fontaines-a-boire'),
        autoRow('Toilettes publiques (sanisettes)', `Chaque jour · ${when(live('toilettes'))}`, 'sanisettesparis'),
        autoRow('Parcs et lieux frais (îlots de fraîcheur)', `Chaque jour · ${when(Math.max(live('fraisParcs'), live('fraisLieux')))}`, 'ilots-de-fraicheur-espaces-verts-frais'),
        autoRow('Agenda « Que faire à Paris ? » (sorties, photos, grands lieux)', `Chaque jour · ${eventsCache ? 'aujourd\'hui' : 'à l\'ouverture de Sorties'}`, 'que-faire-a-paris-'),
        autoRow('Marchés découverts', `Tous les 7 jours · ${when(marketsTime)}`, 'marches-decouverts'),
        autoRow('Vélib\'', 'En temps réel, quand tu le demandes', 'velib-disponibilite-en-temps-reel'),
        autoRow('Monuments historiques (Wikidata)', `Tous les 30 jours · ${when((() => { try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? 'null')?.t ?? 0; } catch { return 0; } })())}`),
        autoRow('Curiosités (Wikipédia)', 'En direct, position arrondie à 100 m ; les plaques sont dans l\'appli'),
        autoRow('Annuaire et adresses (OpenStreetMap, IGN)', 'En direct, quand tu cherches ou ajoutes un lieu'),
        autoRow('Météo et air (Open-Meteo)', 'En temps réel, position arrondie à 1 km')),
      el('h3', { class: 'ring-title' }, el('span', {}, 'Importé par toi'), el('span', {}, '')),
      el('div', { class: 'menu' }, el('button', { type: 'button', class: 'menu-row c-info', onclick: () => openTtb(named('Données de l\'appli', () => openSettings('donnees'))) },
        el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Adresses TTB'), el('span', { class: 'menu-sub' }, ttbList().length ? `${plural(ttbList().length, 'adresse', 'adresses')} · page du ${ttbDateText() || 'date inconnue'} · à réimporter quand le guide change` : 'Pas encore importées')),
        el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right')))),
      el('a', { class: 'btn c-info', href: 'https://opendata.paris.fr/', target: '_blank', rel: 'noopener' }, ico('database'), 'Toutes les données de la Ville : opendata.paris.fr'),
      foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('appli') }, '← Appli')),
    ), { tall: true, name: 'settings:donnees', again: () => openSettings('donnees') });
    return;
  }
  if (typeof section === 'string' && section.startsWith('donnee:')) {
    const id = section.slice(7);
    const d = FIXED_DATA.find((x) => x.id === id);
    if (!d) { openSettings('donnees'); return; }
    // Fichiers lus à part : on les lit pour connaître leur date, puis la page se rouvre
    if (id === 'plaques' && !plaquesData) { loadPlaques().then(() => openSettings(section)); return; }
    if (id === 'respire' && !respireData && !openSettings.respireTried) { openSettings.respireTried = true; loadRespire().then(() => openSettings(section)); return; }
    if (id === 'bus' && !busData) { loadBus().then(() => openSettings(section)); return; }
    // Œuvres et galeries : lues une fois pour connaître leur date (une liste encore vide ne relance pas la lecture)
    if (id === 'oeuvres' && !streetArt && !artFilesRead.has(id)) { artFilesRead.add(id); loadStreetArt().catch(() => {}).finally(() => openSettings(section)); return; }
    if (id === 'galeries' && !galleries && !artFilesRead.has(id)) { artFilesRead.add(id); loadGalleries().catch(() => {}).finally(() => openSettings(section)); return; }
    const date = dataDates()[id];
    const notYet = artNotYet(id, dataDates());
    // Œuvres et galeries (v170) : à quoi sert la liste et combien elle en compte, en tête de page
    const about = {
      oeuvres: () => `Sert à Art dans la rue : statues, sculptures et installations nommées de tout Paris, d'après OpenStreetMap (licence ODbL).${streetArt?.length ? ` ${plural(streetArt.length, 'œuvre', 'œuvres')} dans l'appli.` : ''}`,
      galeries: () => `Sert aux galeries de Sorties → Expos et au Parcours des galeries : galeries et centres d'art de tout Paris, avec leurs horaires quand ils sont connus, d'après OpenStreetMap (licence ODbL).${galleries?.length ? ` ${plural(galleries.length, 'galerie', 'galeries')} dans l'appli.` : ''}`,
    }[id];
    const late = !notYet && dataDue({ [id]: date }).includes(id);
    const link = (f) => el('a', { class: 'menu-row c-metro', href: f.url, target: '_blank', rel: 'noopener' },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('download')),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, f.name), el('span', { class: 'menu-sub' }, `Exporter → ${f.file.endsWith('.xlsx') ? 'Excel' : f.file.endsWith('.json') ? 'JSON' : 'GeoJSON'} · fichier « ${f.file} »`)),
      el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right')));
    const robot = d.robot ? [
      el('p', { class: 'help' }, 'Refait chaque 1er du mois par le robot GitHub, qui télécharge le fichier officiel, le vérifie et publie. Pour le lancer tout de suite :'),
      el('a', { class: 'btn c-info solid', href: ROBOT_URL, target: '_blank', rel: 'noopener' }, ico('rotate-cw'), 'Lancer le robot maintenant'),
      el('p', { class: 'help' }, 'Puis « Run workflow » → « Run workflow », et 2 à 5 minutes plus tard : Appli → Mettre à jour l\'appli.'),
      el('h3', { class: 'ring-title' }, el('span', {}, late ? 'Le robot a échoué : à la main' : 'Si le robot échoue'), el('span', {}, '')),
    ] : [];
    const say = (phrase, tool) => el('p', { class: 'help' }, `Dans le projet « Geoloc », envoie-le à Claude avec la phrase : « ${phrase} ».${tool ? ` Claude lance ${tool}, vérifie, puis publie une nouvelle version.` : ''}`);
    const body = {
      lignes: () => [
        el('p', { class: 'help' }, `À refaire ${everyText(d.every)}, ou dès qu'une ligne ouvre ou se prolonge. Données d'Île-de-France Mobilités (${IDFM_SITE.replace('https://', '')}), licence ODbL.`),
        el('h3', { class: 'ring-title' }, el('span', {}, '1. Télécharge ces deux fichiers'), el('span', {}, '')),
        el('div', { class: 'menu' }, ...TRANSPORT_FILES.map(link)),
        el('p', { class: 'help' }, `Seulement si une ligne change de couleur ou si une nouvelle ligne ouvre : « ${COLORS_FILE.name} ».`),
        el('div', { class: 'menu' }, link(COLORS_FILE)),
        el('h3', { class: 'ring-title' }, el('span', {}, '2. Envoie-les à Claude'), el('span', {}, '')),
        say('Mets à jour les tracés et les gares', 'tools/maj-lignes.py')],
      navigo: () => [
        el('p', { class: 'help' }, `À refaire ${everyText(d.every)} : les lieux partenaires et les offres changent (festivals, saisons).`),
        el('div', { class: 'menu' }, link({ name: 'Lieux bénéficiant des avantages culture Navigo', file: 'lieux-avantages-cultures-navigo.geojson', url: NAVIGO_SOURCE })),
        say('Mets à jour les avantages Navigo', 'tools/maj-navigo.py')],
      gares: () => [
        el('p', { class: 'help' }, 'Sert à Station et Rentrer : les gares de RER et les arrêts de tramway de Paris et de la proche couronne, avec leurs lignes. Ni horaires ni sens. Île-de-France Mobilités, ODbL.'),
        el('div', { class: 'menu' }, link(GARES_FILE)),
        say('Mets à jour les gares de RER et de tram', 'tools/maj-gares.py')],
      acces: () => [
        el('p', { class: 'help' }, 'Sert à la fiche d\'un lieu : la sortie de métro la plus proche (numéro et nom écrits sur les panneaux, à vérifier sur place). Seulement les accès RATP. Une sortie fermée pour travaux n\'est pas connue. Île-de-France Mobilités, Licence Ouverte 2.0.'),
        el('div', { class: 'menu' }, link(ACCES_FILE)),
        say('Mets à jour les sorties du métro', 'tools/maj-acces.py')],
      architectes: () => [
        el('p', { class: 'help' }, 'Sert à Monuments : l\'auteur (architecte, sculpteur…) et la date de chaque monument protégé de Paris, et « Du même auteur ». Ministère de la Culture, base Mérimée, Licence Ouverte 2.0, lu dans l\'API de data.gouv.fr.'),
        el('div', { class: 'menu' }, link(ARCH_FILE)),
        say('Mets à jour les auteurs des monuments', 'tools/maj-architectes.py')],
      merimee: () => [
        el('p', { class: 'help' }, `À refaire ${everyText(d.every)} : de nouveaux monuments sont protégés chaque année. Sert à la ligne « Classé · 17e siècle · église » et « Se visite : … » de Monuments.`),
        el('div', { class: 'menu' }, ...MERIMEE_FILES.map(link)),
        el('p', { class: 'help' }, 'Sur pop.culture.gouv.fr : base « Patrimoine architectural (Mérimée) », filtre Localisation : Paris, puis Exporter. Pour les musées : export GeoJSON.'),
        say('Mets à jour les monuments (Mérimée)', 'tools/maj-merimee.py')],
      ratp: () => [
        el('p', { class: 'help' }, `À refaire ${everyText(d.every)}, ou dès qu'une gare ouvre.`),
        el('div', { class: 'menu' }, link(RATP_TOILETS_FILE)),
        say('Mets à jour les toilettes RATP', 'tools/maj-sanitaires.py')],
      arrondissements: () => [
        el('p', { class: 'help' }, 'Sert à Mon Paris : l\'arrondissement de chaque lieu est calculé sur ton téléphone avec ces contours officiels. Ils ne changent presque jamais.'),
        el('div', { class: 'menu' }, link(ARR_FILE)),
        say('Mets à jour les arrondissements', 'tools/maj-arrondissements.py')],
      bus: () => [
        el('p', { class: 'help' }, 'Sert à Rentrer en bus : les arrêts de Paris et de la petite couronne, avec les lignes qui s\'y arrêtent. Calcul sur ton téléphone ; ni horaires ni sens.'),
        el('div', { class: 'menu' }, link(BUS_FILE)),
        el('p', { class: 'help' }, 'Sur le portail : filtre « mode » = Bus, puis Export → JSON.'),
        say('Mets à jour les arrêts de bus', 'tools/maj-bus.py')],
      plaques: () => [
        el('p', { class: 'help' }, 'Sert à Curiosités : les plaques commémoratives posées par la Ville de Paris, avec leur texte gravé. Tri sur ton téléphone. Direction des Affaires Culturelles, licence ODbL.'),
        el('div', { class: 'menu' }, link(PLAQUES_FILE)),
        say('Mets à jour les plaques commémoratives', 'tools/maj-plaques.py')],
      voies: () => [
        el('p', { class: 'help' }, 'Sert à « Où suis-je ? » : une phrase sur l\'origine du nom de la rue où tu es. Seuls le nom de la voie et cette phrase sont gardés. Direction de l\'Urbanisme, licence ODbL.'),
        el('div', { class: 'menu' }, link(VOIES_FILE)),
        say('Mets à jour l\'origine du nom des voies', 'tools/maj-voies.py')],
      respire: () => [
        el('p', { class: 'help' }, `Sert à « Rues sans voitures » : les contours des secteurs Paris Respire. Les jours et les heures ne viennent pas de ce fichier (il les donne en codes) : ils sont tenus à la main d'après ${RESPIRE_PAGE}, lus le ${RESPIRE_CHECKED}. Tri sur ton téléphone. Direction de la Voirie et des Déplacements, licence ODbL.`),
        el('div', { class: 'menu' }, link(RESPIRE_FILE)),
        say('Mets à jour les secteurs Paris Respire', 'tools/maj-respire.py')],
      oeuvres: () => [
        el('p', { class: 'help' }, 'Le serveur d\'OpenStreetMap n\'a sans doute pas répondu ce jour-là : la liste d\'avant reste dans l\'appli. Relance le robot un autre jour. Rien à faire à la main.')],
      galeries: () => [
        el('p', { class: 'help' }, 'Le serveur d\'OpenStreetMap n\'a sans doute pas répondu ce jour-là : la liste d\'avant reste dans l\'appli. Relance le robot un autre jour. Rien à faire à la main.')],
      marches: () => [
        el('p', { class: 'help' }, `Les horaires des 9 marchés couverts sont relevés à la main sur paris.fr (le ${COVERED_CHECKED}). Rien à télécharger : demande à Claude « Vérifie les horaires des marchés couverts ».`),
        el('a', { class: 'btn c-info', href: COVERED_SOURCE, target: '_blank', rel: 'noopener' }, ico('external-link'), 'Les marchés sur paris.fr')],
      listes: () => [
        el('p', { class: 'help' }, `Listes tenues par Claude, vérifiées le ${FREE_CHECKED} : musées et monuments gratuits (et leurs jours), Kiosque Théâtre, grands lieux (${ART_PLACES.length}, vérifiés le ${ART_PLACES_CHECKED}), temps forts de l'année. Une tâche programmée les prépare chaque 1er septembre et te demande ton accord. Sinon, demande à Claude « Mets à jour les listes annuelles ».`),
        el('div', { class: 'menu' },
          el('a', { class: 'menu-row c-info', href: FREE_SOURCE, target: '_blank', rel: 'noopener' }, el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Musées et monuments gratuits'), el('span', { class: 'menu-sub' }, 'Paris je t\'aime, office du tourisme')), el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('external-link'))),
          el('a', { class: 'menu-row c-info', href: KIOSQUE_SOURCE, target: '_blank', rel: 'noopener' }, el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Kiosque Théâtre'), el('span', { class: 'menu-sub' }, 'Adresses et horaires sur le site officiel')), el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('external-link'))),
          el('button', { type: 'button', class: 'menu-row c-info', onclick: () => openArtPlaces('', named(d.name, () => openSettings(section))) }, el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Grands lieux'), el('span', { class: 'menu-sub' }, 'Chaque lieu a le lien de son programme officiel')), el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, ico('chevron-right'))))],
    }[id]();
    openSheet([ico('database'), ` ${d.name}`], el('div', { class: 'stack' },
      el('p', { class: late ? 'warn' : 'help' }, notYet ? 'Pas encore dans l\'appli : le robot ne l\'a pas encore obtenue.' : `${date ? `Version du ${frenchDate(date)}` : 'Date inconnue'}.${late ? ' À mettre à jour.' : ''}`),
      about ? el('p', { class: 'help' }, about()) : null,
      ...robot,
      ...body,
      foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('donnees') }, '← Données de l\'appli')), // (backBtn est masqué dans openSettings)
    ), { tall: true, name: `settings:${section}`, again: () => openSettings(section) });
    return;
  }

  if (section === 'appli') {
    openSheet([ico('info'), ' Appli'], el('div', { class: 'stack' },
      el('button', { type: 'button', class: 'btn c-info solid', onclick: updateApp }, ico('rotate-cw'), 'Mettre à jour l\'appli'),
      el('button', { type: 'button', class: 'btn c-info', onclick: () => openSettings('donnees') }, ico('database'),
        dataDue(dataDates()).length ? `Données de l'appli : ${dataDue(dataDates()).length} à mettre à jour` : 'Données de l\'appli (à jour)'),
      el('button', { type: 'button', class: 'btn c-info', onclick: () => { closeSheet(); reloadMap(); } }, ico('map'), 'Recharger la carte (si elle reste grise)'),
      el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Partager l\'appli'), el('span', {}, '')),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn c-add', onclick: () => shareLink('Ma carte de Paris', 'Ma carte de Paris : une carte perso de Paris, à installer sur l\'écran d\'accueil depuis Chrome.', APP_URL()) }, ico('share-2'), 'Envoyer le lien'),
        el('button', { type: 'button', class: 'btn c-add', onclick: showAppQr }, ico('qr-code'), 'QR code')),
      el('p', { class: 'help' }, 'Ton proche reçoit une appli vide : tes lieux, tes réglages et ta clé CARTO restent sur ce téléphone. Pour lui donner tes lieux : Réglages → Sauvegarde → Envoyer le fichier.'),
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
      el('p', { class: 'help' }, 'Tes lieux, tes photos et ta position restent sur ce téléphone. GitHub ne fait qu\'envoyer l\'appli : il ne reçoit ni ta position ni tes lieux. L\'appli ne contacte d\'autres services que pour ce que tu demandes : les fonds de carte (OpenStreetMap, ou CARTO et OpenStreetMap France selon le style choisi : comme pour toute carte en ligne, ils voient la zone affichée, donc à peu près où tu es quand la carte est centrée sur toi), les adresses (IGN, avec la position exacte, quand tu ajoutes un lieu ou touches « Où suis-je ? »), l\'annuaire et les horaires (OpenStreetMap), les fontaines, toilettes, horaires des parcs, l\'agenda de Sorties et ses photos (chargé aussi une fois par jour à l\'ouverture, pour « Maintenant ») et les marchés (Ville de Paris, sans ta position), la liste des monuments (Wikidata, tout Paris, sans ta position), les Curiosités et le quartier d\'« Où suis-je ? » (Wikipédia, position arrondie à 100 m), la météo (Open-Meteo, position arrondie à 1 km ; les prévisions de Mon planning sont celles de tout Paris, sans position) et Vélib\' (aucune position envoyée). Y aller (Google Maps), Avis Google et Uber ne reçoivent que le lieu choisi ; « Chercher … sur Google » ne reçoit que le nom tapé dans le champ Artiste ; Instagram, seulement le compte de l\'artiste : chaque fois seulement quand tu appuies sur le lien. Mon Paris et les arrondissements se calculent sur le téléphone. Un lien de partage contient le lieu, et ton commentaire seulement si tu coches « Avec ma note ». Comme tout site, ces services voient l\'adresse internet du téléphone.'),
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

  const buzzOn = state.vibrateNow === true; // v189 : éteint au départ
  const vibrateSwitch = el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(buzzOn), onclick: () => {
    state.vibrateNow = !buzzOn; persist(); openSettings();
    if (state.vibrateNow) { try { navigator.vibrate?.([120, 80, 120]); } catch { /* pas de vibreur */ } } // un essai, tout de suite
    toast(state.vibrateNow ? 'Le téléphone vibrera quand « Maintenant » a du nouveau, appli ouverte' : 'Vibration coupée');
  } },
  el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('vibrate')),
  el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Vibrer quand « Maintenant » a du nouveau'), el('span', { class: 'menu-sub' }, 'Seulement appli ouverte, écran allumé')),
  el('span', { class: `switch${buzzOn ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));

  // Numéros des arrondissements sur la carte vue de loin (v193), allumés au départ
  const arrNumsSwitch = el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(state.showArrNums !== false), onclick: () => {
    state.showArrNums = state.showArrNums === false; persist(); drawArrNums(); openSettings();
    toast(state.showArrNums ? 'Numéros des arrondissements affichés de loin' : 'Numéros des arrondissements masqués');
  } },
  el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('map')),
  el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Numéros des arrondissements'), el('span', { class: 'menu-sub' }, 'Sur la carte vue de loin, avec leurs limites')),
  el('span', { class: `switch${state.showArrNums !== false ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' })));

  const due = state.ok && backupDue(state); // la pastille du bouton Réglages (v163) : « Sauvegarder maintenant » en premier
  openSheet([ico('settings'), ' Réglages'], el('div', { class: 'menu' },
    !state.ok ? el('p', { class: 'warn' }, 'Le stockage de ce téléphone n\'a pas pu être lu. Sauvegarde régulièrement pour ne rien perdre.') : null,
    due ? el('button', { type: 'button', class: 'btn c-add solid', onclick: () => saveBackup(true).then(() => openSettings()) }, ico('download'), 'Sauvegarder maintenant') : null, // le nombre de changements est sur la ligne Sauvegarde, juste dessous
    row('circle-help', 'Aide', 'Comment utiliser l\'appli, nouveautés, problèmes fréquents', openHelp),
    el('h3', { class: 'ring-title menu-group' }, 'Mes données'),
    // En tête : l'état de la sauvegarde se voit dès l'ouverture des Réglages.
    el('button', { type: 'button', class: `menu-row c-add${unsaved ? ' warn-row' : ''}`, onclick: () => openSettings('sauvegarde') },
      el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('save')),
      el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Sauvegarde'), el('span', { class: 'menu-sub' }, unsaved ? plural(unsaved, 'changement non sauvegardé', 'changements non sauvegardés') : saveSummary)),
      el('span', { class: unsaved ? 'tag due' : 'tag open' }, unsaved ? 'À faire' : 'À jour'),
      el('span', { class: 'menu-chev', 'aria-hidden': 'true' }, '›')),
    row('upload', 'Restaurer ou importer', 'Ta sauvegarde, les lieux d\'un proche, Google Maps', () => openSettings('importer'), false, 'c-add'),
    el('h3', { class: 'ring-title menu-group' }, 'Mes lieux'),
    row('map', 'Mon Paris', 'Planning, arrondissements explorés, marche du jour', () => openMyParis('settings'), false, 'c-disc'),
    row('house', 'Mes stations', (state.myStations ?? []).length ? state.myStations.map((x) => `${x.label} : ${x.station}`).join(' · ') : 'Maison, Travail… pour rentrer en 1 appui', openMyStations, false, 'c-metro'),
    row('tags', 'Catégories et listes', `${plural(state.categories.length, 'catégorie', 'catégories')} · ${plural((state.lists ?? []).length, 'liste', 'listes')}`, () => openSettings('categories'), false, 'c-add'),
    row(glyph(state.fav.icon, { filled: true }), 'Favoris', 'Icône et couleur', openFavStyle, false, 'c-fav'),
    el('h3', { class: 'ring-title menu-group' }, 'La carte'),
    // Ouvrir sur ma position (v176) : au démarrage, la carte se centre sur moi quand je suis dans Paris
    el('button', { type: 'button', class: 'menu-row c-guide', role: 'switch', 'aria-checked': String(state.startOnMe !== false), onclick: () => {
      state.startOnMe = state.startOnMe === false; persist(); openSettings();
      toast(state.startOnMe ? 'La carte s\'ouvrira sur ta position, dans Paris' : 'La carte s\'ouvrira sur tous tes lieux');
    } },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico('locate')),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Ouvrir sur ma position'), el('span', { class: 'menu-sub' }, state.startOnMe !== false ? 'Dans Paris, si la position est déjà autorisée ; sinon tous tes lieux' : 'La carte s\'ouvre sur tous tes lieux')),
    el('span', { class: `switch${state.startOnMe !== false ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
    row('target', 'Cercles', 'Tailles en mètres et en minutes', () => openSettings('cercles'), false, 'c-guide'),
    row('footprints', 'Mon pas', `${PACE_NAME[cleanPace(state.pace).mode]} · ${kmhText(paceKmh(state.pace))} km/h · toutes les durées à pied`, () => openSettings('pas'), false, 'c-guide'),
    row(ttbDotFor(''), 'TTB', ttbList().length ? `${plural(ttbList().length, 'adresse', 'adresses')}${ttbDateText() ? ` · liste du ${ttbDateText()}` : ''}` : 'Importer les adresses du guide', () => openTtb(), false, 'c-disc'),
    row('palette', 'Style de la carte', (STYLE_INFO[state.mapStyle] ?? STYLE_INFO.classic).name, () => openSettings('style'), false, 'c-guide'),
    el('button', { type: 'button', class: 'menu-row c-info', role: 'switch', 'aria-checked': String(isDark()), onclick: () => {
      state.theme = isDark() ? 'light' : 'dark'; persist(); applyTheme(); refresh(); openSettings();
      toast(isDark() ? 'Mode sombre activé' : 'Mode clair activé');
    } },
    el('span', { class: 'menu-ico', 'aria-hidden': 'true' }, ico(isDark() ? 'moon' : 'sun')),
    el('span', { class: 'menu-text' }, el('span', { class: 'menu-title' }, 'Mode sombre'), el('span', { class: 'menu-sub' }, state.theme === 'auto' || !state.theme ? 'Suit le réglage du téléphone' : 'Choisi par toi')),
    el('span', { class: `switch${isDark() ? ' on' : ''}`, 'aria-hidden': 'true' }, el('span', { class: 'knob' }))),
    voiceSwitch,
    vibrateSwitch,
    arrNumsSwitch,
    el('h3', { class: 'ring-title menu-group' }, 'Ce qui s\'affiche'),
    row('a-large-small', 'Taille du texte', TEXT_NAME[cleanTextSize(state.textSize)], () => openSettings('texte'), false, 'c-guide'),
    row('list-filter', 'Barre du haut', (() => { const h = cleanChips(state.hiddenChips).length; const m = cleanMoreChips(state.moreChips ?? [], cleanChips(state.hiddenChips)).length; return [m ? `${m} dans ⋯ Plus` : '', h ? plural(h, 'bouton caché', 'boutons cachés') : ''].filter(Boolean).join(' · ') || 'Tous les boutons dans la barre'; })(), () => openChipsSettings(named('Réglages', () => openSettings())), false, 'c-guide'),
    row('arrow-up-down', 'Boutons de la carte', 'Ordre, côté, noms, carte, Plus ou caché', () => openSettings('outils'), false, 'c-guide'),
    row('settings', 'Filtres affichés', (state.hiddenFilters ?? []).length ? `${plural(state.hiddenFilters.length, 'ligne masquée', 'lignes masquées')} dans Filtres` : 'Toutes les lignes de Filtres', () => openFilterChoice(named('Réglages', () => openSettings())), false, 'c-guide'),
    el('h3', { class: 'ring-title menu-group' }, 'Appli'),
    dataDue(dataDates()).length ? row('database', 'Données de l\'appli', `${plural(dataDue(dataDates()).length, 'donnée à mettre à jour', 'données à mettre à jour')}`, () => openSettings('donnees'), true, 'c-info') : null,
    row('info', 'Appli', 'Mettre à jour · partager l\'appli · confidentialité', () => openSettings('appli')),
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
  openSheet([glyph(state.fav.icon, { filled: true }), ' Favoris'], el('div', { class: 'stack' },
    preview,
    el('div', {}, el('div', { class: 'legend' }, 'Icône'), picker(ICONS, icon, (v) => { icon = v; drawPreview(); })),
    el('div', {}, el('div', { class: 'legend' }, 'Couleur du contour'), picker(FAV_COLORS, color, (v) => { color = v; drawPreview(); }, { colors: true, names: FAV_COLOR_NAMES })),
    foot(el('div', { class: 'row' },
      backBtn(named('Réglages', () => openSettings())),
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
  const wanted = new Set([...st.points.flatMap((p) => photoIds(p)), ...cleanOutings(st.outings).map((o) => o.photo).filter(Boolean)]);
  for (const [id, url] of Object.entries(photos)) {
    if (!wanted.has(id)) continue;
    const blob = await dataUrlToBlob(url).catch(() => null);
    if (blob) await putPhoto(id, blob).catch(() => {});
  }
}

/** Création (id null) ou modification d'une catégorie. */
/** `ret` (facultatif) : { back, done(id) } quand on vient de la fiche d'un lieu au lieu des Réglages. */
function openCategory(id, ret = null) {
  const c = id ? catOf(id) : null;
  let color = c?.color ?? PALETTE.find((col) => !state.categories.some((x) => x.color === col)) ?? PALETTE[0];
  let icon = c?.icon ?? '📍';
  const name = el('input', { type: 'text', value: c?.name ?? '', maxlength: '20', autocomplete: 'off' });
  const log = el('input', { type: 'text', value: c?.log ?? '', maxlength: '24', autocomplete: 'off', placeholder: 'Mes passages' });
  const did = el('input', { type: 'text', value: c?.did ?? '', maxlength: '24', autocomplete: 'off', placeholder: 'Déjà visité' });
  const err = el('p', { class: 'error', role: 'alert' });
  const swatches = picker(PALETTE, color, (v) => { color = v; }, { colors: true, names: COLOR_NAMES });
  const icons = picker(ICONS, icon, (v) => { icon = v; });
  const zone = el('div', { class: 'stack' });

  const save = () => {
    try {
      const f = { name: name.value, color, icon, log: cleanLog(log.value), did: cleanLog(did.value) };
      state = id ? updateCategory(state, id, f) : addCategory(state, f);
    } catch (e) { err.textContent = e.message; return; }
    persist(); refresh();
    if (ret && !id) ret.done(state.categories.at(-1).id); else openSettings('categories');
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
        persist(); refresh();
        if (ret) ret.done(state.categories.at(-1).id); else openSettings('categories');
        toast(`Catégorie « ${pr.name} » ajoutée`);
      } }, el('span', { class: 'cat-ico', 'aria-hidden': 'true' }, pr.icon), pr.name);
      b.firstChild.style.background = pr.color;
      return b;
    })),
    el('div', { class: 'legend', style: 'margin-top:14px' }, 'Ou sur mesure')) : null;

  openSheet([ico('tags'), id ? ' Modifier la catégorie' : ' Nouvelle catégorie'], el('div', { class: 'stack' },
    presetBox,
    el('label', { class: 'field' }, 'Nom', name),
    el('div', {}, el('div', { class: 'legend' }, 'Icône'), icons),
    el('div', {}, el('div', { class: 'legend' }, 'Couleur'), swatches),
    el('label', { class: 'field' }, 'Nom de l\'historique dans la fiche', log),
    el('p', { class: 'help' }, 'Ex. : « Mes repas » pour des restos, « Mes visites » pour des musées. Vide : « Mes passages ».'),
    el('label', { class: 'field' }, 'Nom de « Déjà visité » dans la fiche', did),
    el('p', { class: 'help' }, 'Ex. : « Déjà goûté » pour des restos, « Déjà vu » pour du street art, « Déjà lu » pour des livres. Vide : « Déjà visité ».'),
    err, zone,
    foot(el('div', { class: 'row' },
      backBtn(ret ? named('Le lieu', () => ret.back()) : named('Catégories', () => openSettings('categories'))),
      el('button', { type: 'button', class: 'btn c-add solid', onclick: save }, 'Enregistrer'))),
  ), { tall: true, name: `category:${id ?? 'new'}`, again: () => openCategory(id, ret) });
}

/** Rappel de sauvegarde avec un bouton pour le faire tout de suite. */
function remindBackup() {
  if (!sheet.hidden) return;
  const n = state.backup?.n ?? 0;
  if (!n) return;
  openSheet('Sauvegarde', el('div', { class: 'stack' },
    el('p', {}, `${plural(n, 'changement n\'est', 'changements ne sont')} pas encore ${n > 1 ? 'sauvegardés' : 'sauvegardé'}. Tes lieux n'existent que sur ce téléphone : effacer les données de Chrome les efface aussi.`),
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => saveBackup(true).then(closeSheet) }, ico('download'), 'Sauvegarder maintenant'),
    el('button', { type: 'button', class: 'btn', onclick: () => closeSheet() }, 'Plus tard'),
  ), { name: 'rappel-sauvegarde' });
}

/** « Sauvegardé il y a 2 h », « 3 changements non sauvegardés · dernière sauvegarde il y a 4 jours », « Jamais sauvegardé ». */
function backupSummary() {
  const n = state.backup?.n ?? 0;
  const last = state.lastExport ? `${n ? 'dernière sauvegarde ' : 'Sauvegardé '}${timeAgo(state.lastExport)}` : '';
  if (!n) return last || (state.points.length ? 'Sauvegardé' : 'Rien à sauvegarder');
  return [plural(n, 'changement non sauvegardé', 'changements non sauvegardés'), last || 'jamais sauvegardé'].join(' · ');
}

/* ---------- Sauvegarde : un fichier dans Téléchargements, toujours sur décision de la personne ---------- */

/** Le texte du fichier de sauvegarde, avec les photos et la liste TTB si demandé. */
async function backupText(withPhotos, withTtb = false) {
  const obj = JSON.parse(exportJSON(state));
  if (withTtb) { ttbList(); const t = ttbExport(ttbData, ttbMarksNow()); if (t) obj.ttb = t; } /* v179 : la liste et mes marques */
  if (withPhotos) {
    obj.photos = {};
    for (const id of [...state.points.flatMap((p) => photoIds(p)), ...cleanOutings(state.outings).map((o) => o.photo).filter(Boolean)]) {
      const b = await getPhoto(id).catch(() => null);
      if (b) obj.photos[id] = await blobToDataUrl(b);
    }
  }
  return JSON.stringify(obj);
}
function backupFile(text) { return new File([text], exportFileName(new Date(), state.points.length), { type: 'application/json' }); }
function markSaved() { state.lastExport = Date.now(); state.backup = savedBackup(state); persist(); }
/** Sauvegarder maintenant : le fichier part dans Téléchargements (photos comprises par défaut). */
async function saveBackup(withPhotos = true, withTtb = true) {
  const f = backupFile(await backupText(withPhotos, withTtb));
  const url = URL.createObjectURL(f);
  const a = el('a', { href: url, download: f.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  markSaved();
  toast(`« ${f.name} » enregistré dans tes Téléchargements`);
}
/** Envoyer le fichier (mail, Drive…) par le menu de partage du téléphone. */
async function sendBackup(withPhotos = true, withTtb = true) {
  const f = backupFile(await backupText(withPhotos, withTtb));
  try {
    await navigator.share({ files: [f], title: 'Ma carte de Paris' });
    markSaved();
    // Le téléphone dit seulement que le fichier a été passé à une appli, pas qu'il est parti.
    toast('Fichier passé à l\'appli choisie : vérifie qu\'il est bien parti.');
  } catch { /* annulé */ }
}

/* ---------- Envoyer à un proche (v180, maquette validée le 18 nov.) ---------- */
// Un fichier séparé de ma sauvegarde : seulement ce que je coche (le temps de la session), seulement mes lieux.
let sendSel = { ...SEND_DEFAULT };
let sendCats = null; // catégories choisies ; null = toutes
let sendLists = new Set(); // listes choisies (leurs lieux s'ajoutent)
function openSendFriend(back = () => openSettings('sauvegarde')) {
  const again = () => openSendFriend(back);
  const mine = state.points.filter((p) => !p.owner);
  const pts = sendPoints(state, sendCats, sendLists);
  const nbPhotos = pts.reduce((n, p) => n + photoIds(p).length, 0);
  const nbPassages = pts.reduce((n, p) => n + (p.passages?.length ?? 0), 0);
  const nbPlans = cleanPlans(state.plans).length;
  const nbArtists = cleanArtists(state.artists).length;
  const nbVenues = cleanVenues(state.venues).length;
  const nbTtb = ttbList().length;
  const nbMarks = Object.keys(ttbMarksNow()).length;
  const summary = el('p', { class: 'ok-line', role: 'status' });
  const sumText = () => {
    const parts = [sendSel.lieux && pts.length ? `${plural(pts.length, 'lieu', 'lieux')}${sendSel.notes ? ' avec leurs notes' : ''}` : '',
      sendSel.lieux && pts.length && sendSel.passages && nbPassages ? 'leurs passages' : '', sendSel.lieux && pts.length && sendSel.photos && nbPhotos ? plural(nbPhotos, 'photo', 'photos') : '',
      sendSel.plans && nbPlans ? plural(nbPlans, 'sortie prévue', 'sorties prévues') : '', sendSel.artists && nbArtists ? plural(nbArtists, 'artiste', 'artistes') : '',
      sendSel.venues && nbVenues ? plural(nbVenues, 'salle', 'salles') : '', sendSel.ttb && (nbTtb || nbMarks) ? 'la liste TTB' : ''].filter(Boolean);
    fill(summary, parts.length ? [ico('check'), ` Partiront : ${parts.join(', ')}.`] : 'Rien de coché : coche au moins une ligne.');
    return parts.length;
  };
  const row = (k, name, sub, show = true) => (show ? el('li', { class: 'item' }, el('label', { class: 'item-main check-row' },
    el('input', { type: 'checkbox', class: 'check', checked: sendSel[k], onchange: (e) => { sendSel = { ...sendSel, [k]: e.target.checked }; sumText(); } }),
    el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, name), sub ? el('span', { class: 'item-sub' }, sub) : null))) : null);
  const cats = state.categories.map((c) => [c, mine.filter((p) => p.cat === c.id).length]).filter(([, n]) => n);
  const lists = (state.lists ?? []).map((l) => [l, mine.filter((p) => (p.lists ?? []).includes(l.id)).length]).filter(([, n]) => n);
  const chip = (label, on, fn) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick: () => { fn(); again(); } }, label);
  const toggleCat = (id) => { const c = new Set(sendCats ?? []); if (c.has(id)) c.delete(id); else c.add(id); sendCats = c; };
  const toggleList = (id) => { if (sendCats === null) sendCats = new Set(); const l = new Set(sendLists); if (l.has(id)) l.delete(id); else l.add(id); sendLists = l; };
  const meInput = el('input', { type: 'text', maxlength: '30', value: state.me ?? '', autocomplete: 'given-name', placeholder: 'Ton prénom ou un pseudo' });
  const send = async () => {
    if (!sumText()) { toast('Coche au moins une ligne.', true); return; }
    const obj = exportForFriend(state, sendSel, sendCats, sendLists);
    if (sendSel.photos && sendSel.lieux) {
      obj.photos = {};
      for (const id of obj.points.flatMap((p) => photoIds(p))) { const b = await getPhoto(id).catch(() => null); if (b) obj.photos[id] = await blobToDataUrl(b); }
      if (Object.keys(obj.photos).length) obj.sent.push('photos'); else delete obj.photos;
    }
    if (sendSel.ttb) { ttbList(); const t = ttbExport(ttbData, ttbMarksNow()); if (t) { obj.ttb = t; obj.sent.push('ttb'); } }
    const f = new File([JSON.stringify(obj)], friendFileName(new Date(), state.me, obj.points.length), { type: 'application/json' });
    let shared = false;
    try { if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'Ma carte de Paris' }); shared = true; } } catch { return; /* annulé */ }
    if (!shared) {
      const url = URL.createObjectURL(f);
      const a = el('a', { href: url, download: f.name }); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast(`« ${f.name} » enregistré dans tes Téléchargements : envoie-le à ton proche.`);
    } else toast('Fichier passé à l\'appli choisie : vérifie qu\'il est bien parti.');
  };
  openSheet([ico('users'), ' Envoyer à un proche'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Ta sauvegarde reste complète. Ici, tu choisis ce que ton proche reçoit. Tes favoris, tes « Déjà visité » et tes billets restent à toi ; tes étoiles partent. Il ouvre le fichier dans son appli : Réglages → Restaurer ou importer → Importer les lieux d\'un proche.'),
    state.me ? el('div', { class: 'me-line' }, el('span', {}, 'Tes lieux partiront au nom de ', el('b', {}, state.me)),
      el('button', { type: 'button', class: 'btn', onclick: () => openSettings('sauvegarde') }, 'Modifier'))
      : el('div', { class: 'me-box' }, el('label', { class: 'field' }, 'Tes lieux partiront au nom de', meInput),
        el('button', { type: 'button', class: 'btn c-add', onclick: () => { state.me = meInput.value.trim().slice(0, 30); persist(); again(); } }, 'Enregistrer le prénom'),
        el('p', { class: 'help' }, 'Sans prénom, ton proche ne saura pas de qui viennent ces lieux.')),
    el('h3', { class: 'fiche-sec' }, 'Quoi envoyer'),
    el('ul', { class: 'items' },
      row('lieux', 'Lieux', `${plural(pts.length, 'lieu', 'lieux')} des catégories choisies plus bas`),
      row('notes', 'Notes', 'Ton commentaire sur chaque lieu'),
      row('passages', 'Passages', 'Tes impressions datées (« Écrire une impression »)', nbPassages > 0),
      row('photos', 'Photos', `${plural(nbPhotos, 'photo', 'photos')} · fichier plus lourd`, nbPhotos > 0),
      row('plans', 'Sorties prévues', `${nbPlans} dans Mon planning`, nbPlans > 0),
      row('artists', 'Artistes', plural(nbArtists, 'artiste suivi', 'artistes suivis'), nbArtists > 0),
      row('venues', 'Salles', plural(nbVenues, 'salle suivie', 'salles suivies'), nbVenues > 0),
      row('ttb', 'TTB', `La liste du guide${nbTtb ? ` (${plural(nbTtb, 'adresse', 'adresses')}${ttbData?.date ? `, page du ${frenchDate(ttbData.date)}` : ''})` : ''}${nbMarks ? ` et tes marques (${nbMarks})` : ''}`, nbTtb + nbMarks > 0)),
    el('h3', { class: 'fiche-sec' }, 'Quelles catégories'),
    el('div', { class: 'list-chips', style: 'margin-top: 8px' },
      chip('Toutes', sendCats === null, () => { sendCats = null; sendLists = new Set(); }),
      ...cats.map(([c, n]) => chip(`${c.name} ${n}`, sendCats === null || sendCats.has(c.id), () => toggleCat(c.id))),
      ...lists.map(([l, n]) => chip(`Liste : ${l.name} ${n}`, sendLists.has(l.id), () => toggleList(l.id)))),
    summary,
    el('button', { type: 'button', class: 'btn c-add solid', onclick: send }, ico('send'), 'Envoyer le fichier'),
    el('p', { class: 'help' }, 'Le menu de partage du téléphone s\'ouvre (SMS, mail, WhatsApp…). Rien ne passe par un serveur. Tes billets, tes réglages, ton journal et les lieux de tes proches ne partent jamais.'),
    foot(el('button', { type: 'button', class: 'btn', onclick: back }, '← Sauvegarde')),
  ), { name: 'envoyer-proche', again });
  sumText();
}

/* ---------- Restaurer ma sauvegarde, importer les lieux d'un proche ---------- */

let importMode = 'mine';
let importInput = null;
function pickImport(mode) {
  importMode = mode;
  if (!importInput) {
    importInput = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
    document.body.append(importInput);
    importInput.addEventListener('change', onImportFile);
  }
  importInput.click();
}
async function onImportFile() {
  const f = importInput.files?.[0];
  importInput.value = '';
  if (!f) return;
  const text = await f.text();
  const from = fileOwner(text);
  // Ma sauvegarde : directement. Si le fichier porte un autre prénom que le mien, on demande.
  if (importMode === 'mine' && (!from || !state.me || from === state.me)) { importText(text, ''); return; }
  if (importMode === 'friend' && from && from === state.me) { importText(text, ''); return; }
  if (importMode === 'friend' && from) { openFriendImport(text, from); return; } // v181 : elle choisit ce qu'elle garde
  const other = el('input', { type: 'text', maxlength: '30', value: from, placeholder: 'Prénom', 'aria-label': 'Prénom de la personne' });
  openSheet('À qui sont ces lieux ?', el('div', { class: 'stack' },
    el('button', { type: 'button', class: 'btn c-add', onclick: () => importText(text, '') }, 'Ce sont mes lieux (sauvegarde)'),
    el('label', { class: 'field' }, 'Lieux d\'une autre personne', other),
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => {
      const name = other.value.trim();
      if (!name) { other.focus(); toast('Indique son prénom.', true); return; }
      openFriendImport(text, name);
    } }, 'Ajouter comme ses lieux'),
    el('p', { class: 'help' }, 'Ses lieux s\'ajoutent aux tiens. Le bouton Filtres en haut permet ensuite d\'afficher les tiens, les siens ou tous.'),
  ), { name: 'importwho' });
}
/* ---------- Les lieux d'un proche : elle choisit ce qu'elle garde (v181, maquette validée le 18 nov.) ----------
   Seules les cases de ce qui a été envoyé, toutes cochées au départ ; catégories en puces ; artistes, salles et sorties
   prévues une par une. Un lieu déjà chez elle n'est pas ajouté deux fois ; un nouvel envoi met à jour sans rien retirer. */
let impSel = {}; let impCats = null; let impArtists = new Set(); let impVenues = new Set(); let impPlans = new Set();
function openFriendImport(text, owner, fresh = true) {
  let obj = null;
  try { obj = JSON.parse(text); } catch { obj = null; }
  if (!obj || obj.app !== 'carte-paris' || !Array.isArray(obj.points)) { toast('Ce fichier n\'est pas un fichier de Ma carte de Paris.', true); return; }
  const fileArtists = cleanArtists(obj.artists);
  const fileVenues = cleanVenues(obj.venues);
  const filePlans = cleanPlans(obj.plans);
  const pts = obj.points;
  const hasNotes = pts.some((p) => typeof p?.note === 'string' && p.note.trim());
  const hasPassages = pts.some((p) => Array.isArray(p?.passages) && p.passages.length);
  const hasPhotos = Boolean(obj.photos && typeof obj.photos === 'object' && Object.keys(obj.photos).length);
  const hasTtb = Boolean(obj.ttb && ((Array.isArray(obj.ttb.items) && obj.ttb.items.length) || Object.keys(obj.ttb.marks ?? {}).length));
  if (fresh) {
    impSel = { lieux: pts.length > 0, notes: hasNotes, passages: hasPassages, photos: hasPhotos, ttb: hasTtb };
    impCats = null; impArtists = new Set(fileArtists); impVenues = new Set(fileVenues); impPlans = new Set(filePlans.map((x) => x.id));
  }
  const again = () => openFriendImport(text, owner, false);
  const choice = () => ({ ...impSel, cats: impCats, artists: impArtists, venues: impVenues, plans: impPlans });
  let pre;
  try { pre = mergeFriend(state, obj, owner, choice()); } catch (e) { toast(e.message || 'Import impossible.', true); return; }
  const set = (k, v) => { impSel = { ...impSel, [k]: v }; again(); };
  const row = (on, name, sub, onchange) => el('li', { class: 'item' }, el('label', { class: 'item-main check-row' },
    el('input', { type: 'checkbox', class: 'check', checked: on, onchange: (e) => onchange(e.target.checked) }),
    el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, name), sub ? el('span', { class: 'item-sub' }, sub) : null)));
  const toggleIn = (setRef, v, on) => { if (on) setRef.add(v); else setRef.delete(v); again(); };
  // TTB : ce qui se passera (la liste la plus récente gagne, mes marques restent)
  let ttbLine = '';
  if (hasTtb) {
    ttbList();
    const t = ttbMerge({ data: ttbData, marks: ttbMarksNow() }, obj.ttb);
    const theirs = obj.ttb.date ? `du ${frenchDate(obj.ttb.date)}` : 'sans date';
    ttbLine = [ttbData?.items?.length
      ? (t.list ? `Sa liste est ${theirs}, la tienne ${ttbData.date ? `du ${frenchDate(ttbData.date)}` : 'sans date'} : la sienne la remplace.` : `Ta liste est aussi récente ou plus récente : elle reste.`)
      : (t.list ? `Sa liste (${plural(t.data.items.length, 'adresse', 'adresses')}, page ${theirs}) arrive sur ton téléphone.` : ''),
    t.newMarks ? `Tes marques restent, ${plural(t.newMarks, 'des siennes s\'ajoute', 'des siennes s\'ajoutent')}.` : ''].filter(Boolean).join(' ') || 'Rien de nouveau pour ta liste TTB.';
  }
  const fileCats = Array.isArray(obj.categories) ? obj.categories : [];
  const catChips = fileCats.map((c) => [c, pts.filter((p) => p?.cat === c.id).length]).filter(([c, n]) => n && typeof c?.name === 'string');
  const toggleCat = (id) => { const c = new Set(impCats ?? catChips.map(([x]) => x.id)); if (c.has(id)) c.delete(id); else c.add(id); impCats = c.size === catChips.length ? null : c; };
  const sent = obj.exported ? new Date(obj.exported) : null;
  const lieuxSub = [plural(pre.added, 'nouveau lieu', 'nouveaux lieux'),
    pre.dups ? `${plural(pre.dups, 'est', 'sont')} déjà chez toi : pas ajouté${pre.dups > 1 ? 's' : ''} une seconde fois` : '',
    pre.updated ? `${plural(pre.updated, 'déjà reçu', 'déjà reçus')} de ${owner} : mis à jour` : ''].filter(Boolean).join('. ').replace(/^(\d+) (est|sont)/, '$1 $2');
  const apply = async () => {
    let r;
    try { r = mergeFriend(state, obj, owner, choice()); } catch (e) { toast(e.message || 'Import impossible.', true); return; }
    state = { ...r.state, ok: state.ok };
    if (impSel.photos) await importPhotos(text, state);
    const ttbNote = impSel.ttb && hasTtb ? importTtb(text) : '';
    persist(); refresh(); updatePlanningCount();
    openSettings('importer');
    toast([`${plural(r.added, 'lieu ajouté', 'lieux ajoutés')} (lieux de ${owner})`, r.dups ? `${r.dups} déjà chez toi` : '', r.updated ? `${plural(r.updated, 'mis à jour', 'mis à jour')}` : '',
      r.artists ? plural(r.artists, 'artiste', 'artistes') : '', r.venues ? plural(r.venues, 'salle', 'salles') : '', r.plans ? `${plural(r.plans, 'sortie', 'sorties')} dans Mon planning` : '', ttbNote].filter(Boolean).join(', ') + '.');
  };
  openSheet([ico('user'), ` Lieux de ${owner}`], el('div', { class: 'stack' },
    el('p', { class: 'help' }, `${sent && !Number.isNaN(sent.getTime()) ? `Fichier envoyé le ${sent.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}. ` : ''}Tout est coché : décoche ce que tu ne veux pas garder.`),
    el('h3', { class: 'fiche-sec' }, 'Contenu'),
    el('ul', { class: 'items' },
      pts.length ? row(impSel.lieux, `Lieux (${pts.length})`, impSel.lieux ? lieuxSub : '', (v) => set('lieux', v)) : null,
      hasNotes ? row(impSel.notes, 'Notes', `Son commentaire sur chaque lieu`, (v) => set('notes', v)) : null,
      hasPassages ? row(impSel.passages, 'Passages', 'Ses souvenirs datés', (v) => set('passages', v)) : null,
      hasPhotos ? row(impSel.photos, 'Photos', plural(Object.keys(obj.photos).length, 'photo', 'photos'), (v) => set('photos', v)) : null,
      hasTtb ? row(impSel.ttb, 'TTB', ttbLine, (v) => set('ttb', v)) : null),
    catChips.length > 1 && impSel.lieux ? el('h3', { class: 'fiche-sec' }, 'Catégories') : null,
    catChips.length > 1 && impSel.lieux ? el('div', { class: 'list-chips', style: 'margin-top: 8px' },
      el('button', { type: 'button', class: 'chip', 'aria-pressed': String(impCats === null), onclick: () => { impCats = null; again(); } }, 'Toutes'),
      ...catChips.map(([c, n]) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(impCats === null || impCats.has(c.id)), onclick: () => { toggleCat(c.id); again(); } }, `${c.name} ${n}`))) : null,
    fileArtists.length ? el('h3', { class: 'fiche-sec' }, `Artistes (${fileArtists.length})`) : null,
    fileArtists.length ? el('ul', { class: 'items' }, fileArtists.map((a) => row(impArtists.has(a), a, (state.artists ?? []).includes(a) ? 'Tu le suis déjà' : '', (v) => toggleIn(impArtists, a, v)))) : null,
    fileVenues.length ? el('h3', { class: 'fiche-sec' }, `Salles (${fileVenues.length})`) : null,
    fileVenues.length ? el('ul', { class: 'items' }, fileVenues.map((v0) => row(impVenues.has(v0), v0, (state.venues ?? []).includes(v0) ? 'Tu la suis déjà' : '', (v) => toggleIn(impVenues, v0, v)))) : null,
    filePlans.length ? el('h3', { class: 'fiche-sec' }, `Sorties prévues (${filePlans.length})`) : null,
    filePlans.length ? el('ul', { class: 'items' }, filePlans.map((x) => row(impPlans.has(x.id), x.name, `${planText(x.ticket).replace(/^./, (c) => c.toUpperCase())} · Prévu par ${owner}`, (v) => toggleIn(impPlans, x.id, v)))) : null,
    el('button', { type: 'button', class: 'btn c-add solid', onclick: apply }, ico('download'), 'Garder ce qui est coché'),
    el('p', { class: 'help' }, `Les lieux de ${owner} gardent son nom (son initiale sur la goutte ; Filtres pour afficher les tiens, les siens ou tous). Rien n'est retiré de chez toi.`),
    foot(el('button', { type: 'button', class: 'btn', onclick: () => openSettings('importer') }, '← Restaurer ou importer')),
  ), { name: 'import-proche', again });
}
function importText(text, owner) {
  const wasEmpty = state.points.length === 0;
  try {
    const r = mergeImport(state, text, owner);
    state = { ...r.state, ok: state.ok };
    importPhotos(text, state);
    const ttbNote = owner ? '' : importTtb(text); /* ma sauvegarde seulement (v179) ; chez un proche, la page d'import le proposera */
    if (!owner && wasEmpty) {
      // Restauration sur une appli vide (après un effacement) : rien n'attend d'être sauvegardé, et le prénom revient.
      let at = Date.now();
      try { at = Date.parse(JSON.parse(text).exported) || at; } catch { /* date illisible : maintenant */ }
      if (!state.me) state.me = fileOwner(text);
      if (r.settings) { state = { ...state, ...r.settings }; applyAllSettings(); drawMarkets(); drawTtb(); drawLines(); if (state.showPratique) loadPratLayer(); else pratLayer.clearLayers(); loadArcades().then(drawArcadeLayer); drawLayerNote(); } // affichage, cercles, favori… comme avant l'effacement
      state.lastExport = at;
      state.backup = savedBackup(state);
    }
    persist(); refresh();
    if (wasEmpty && state.points.length) {
      closeSheet();
      map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 15, animate: false });
    } else openSettings(owner ? 'importer' : 'sauvegarde');
    toast(`${plural(r.added, 'lieu ajouté', 'lieux ajoutés')}${owner ? ` (lieux de ${owner})` : wasEmpty ? ' : ta carte est restaurée' : ''}${r.skipped ? `, ${plural(r.skipped, 'illisible ignoré', 'illisibles ignorés')}` : ''}${ttbNote ? ` ; ${ttbNote}` : ''}.`);
  } catch (e) {
    toast(e.message || 'Import impossible.', true);
  }
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
    steps = [step(ico('footprints'), `À pied, c'est le plus simple : ≈ ${plan.minutes} min.`)];
  } else {
    firstTarget = { name: `Ⓜ ${plan.start.n}`, lat: plan.start.lat, lng: plan.start.lng };
    steps = [
      step(ico('footprints'), `${plan.walkIn} min à pied jusqu'à Ⓜ ${plan.start.n}`),
      plan.type === 'direct'
        ? step(el('b', { class: 'm-badge', 'aria-hidden': 'true' }), `Prends ${ln(plan.line)} jusqu'à ${plan.end.n}`)
        : step(el('b', { class: 'm-badge', 'aria-hidden': 'true' }), `Prends ${ln(plan.line1)} jusqu'à ${plan.via.n}, puis ${ln(plan.line2)} jusqu'à ${plan.end.n}`),
      step(ico('footprints'), `${plan.walkOut} min à pied jusqu'à ${p.name}`),
    ];
  }
  openSheet(`Vers ${p.name}`, el('div', { class: 'stack' },
    el('p', { class: 'summary' }, plan.type === 'walk' ? 'À pied' : `En métro · ≈ ${plan.minutes} min au total`),
    el('ol', { class: 'plan' }, steps),
    plan.type === 'walk' ? null : el('p', { class: 'help' }, 'Estimation sans horaires : vérifie la direction sur le quai. Le trajet exact est dans Google Maps ou l\'appli Île-de-France Mobilités.'),
    el('div', { class: 'row' },
      el('button', { type: 'button', class: 'btn c-guide', onclick: () => openCompass(firstTarget ?? p) }, ico('compass'), firstTarget ? 'Vers la station' : 'Boussole'),
      el('a', { class: 'btn primary', href: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=${plan.type === 'walk' ? 'walking' : 'transit'}`, target: '_blank', rel: 'noopener' }, 'Google Maps')),
    plan.type === 'walk' ? null : el('a', { class: 'btn c-metro', href: IDFM_APP }, ico('train-front'), 'Ouvrir l\'appli Île-de-France Mobilités'),
    plan.type === 'walk' ? null : trafficLink(),
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
/** Lien vers les infos trafic d'IDFM, toujours au même endroit : sous l'appli IDFM (Station, trajet), au-dessus de « Mes stations » (Rentrer). */
function trafficLink() {
  return el('a', { class: 'btn c-metro', href: TRAFFIC_URL, target: '_blank', rel: 'noopener' }, ico('triangle-alert'), 'Info trafic métro et RER');
}

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
  if (!garesData) loadGares().then(() => { if (gares.length) showNearestMetro(from, note); });
  const rail = garesNear(gares, from, 1500, 3); // v200 : RER et tram à moins de 1,5 km
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
    el('a', { class: 'btn c-metro', href: IDFM_APP }, ico('train-front'), 'Ouvrir l\'appli Île-de-France Mobilités'),
    trafficLink(),
    others.length ? el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'Autres stations proches'), el('span', {}, '')) : null,
    el('ul', { class: 'items' }, others.map(({ station: o, d }) => el('li', { class: 'item' },
      el('span', { class: 'item-main' }, el('span', { class: 'metro-mini', 'aria-hidden': 'true' }, 'M'),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, o.n),
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min · ${stationLabel(o)}`))),
      el('a', { class: 'go', href: mapsUrl(o, Math.min(d, 999)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${o.n}` }, 'Y aller')))),
    rail.length ? el('h3', { class: 'ring-title', style: 'margin-top:8px' }, el('span', {}, 'RER et tram proches'), el('span', {}, '')) : null,
    rail.length ? el('ul', { class: 'items' }, rail.map(({ station: o, d }) => el('li', { class: 'item' },
      el('span', { class: 'item-main' }, el('span', { class: `metro-mini${o.m === 'R' ? ' rer' : ' tram'}`, 'aria-hidden': 'true' }, o.m === 'R' ? 'R' : 'T'),
        el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, o.n),
          el('span', { class: 'item-sub' }, `${fmtDist(d)} · ${walkMinutes(d)} min · ${gareLines(o)}`))),
      el('a', { class: 'go', href: mapsUrl(o, Math.min(d, 999)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${o.n}, ${gareLines(o)}` }, 'Y aller')))) : null,
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
let ratpToilets = null;
const loadRatpToilets = async () => (ratpToilets ??= await fetch('data/sanitaires-ratp.json').then((r) => (r.ok ? r.json() : null))
  .then((j) => { ratpUpdated = typeof j?.updated === 'string' ? j.updated : ''; return parseRatpToilets(j); }).catch(() => []));

async function loadPratique(kind) {
  if (pratique[kind]) return pratique[kind];
  let cached = null;
  try { cached = JSON.parse(storage.getItem(`${PRATIQUE_KEY}.${kind}`) ?? 'null'); } catch { /* rien */ }
  const fresh = cached && Date.now() - cached.time < 24 * 3600 * 1000;
  if (!fresh && navigator.onLine !== false) {
    try {
      const res = await net(exportUrl(kind), { headers: { Accept: 'application/json' } });
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

/** Mes lieux qui sont des parcs sans horaires : on charge la liste des espaces verts de la Ville (sans position, une fois par jour)
    pour leur donner les horaires de la saison. Rien n'est écrit dans le lieu lui-même. */
async function refreshParkHours() {
  const cands = state.points.filter((p) => !p.hours && looksLikePark(`${p.name} ${catOf(p.cat).name}`));
  if (!cands.length) return;
  const parks = await loadPratique('fraisParcs');
  parkHoursById.clear();
  for (const p of cands) { const m = parkFor(p, parks); if (m) parkHoursById.set(p.id, m.hours); }
  if (parkHoursById.size) { updateNow(true); updatePlanningCount(); if (view === 'planning') openPlanning(); }
}

async function nearestPratique() {
  track('Fontaine et toilettes');
  toast('Recherche de la fontaine, des toilettes et d\'un lieu frais…');
  const [from, fontaines, toilettesVille, toilettesRatp, fraisLieux, fraisParcs] = await Promise.all([
    locate().catch(() => (here && Date.now() - here.time < 2 * 3600 * 1000 ? here : null)),
    loadPratique('fontaines'),
    loadPratique('toilettes'),
    loadRatpToilets(),
    loadPratique('fraisLieux'),
    loadPratique('fraisParcs'),
  ]);
  hideToast();
  const toilettes = [...toilettesVille, ...toilettesRatp];
  if (!from) { toast(GEO_ERRORS[1], true); return; }
  if (!fontaines.length && !toilettes.length && !fraisLieux.length && !fraisParcs.length) {
    toast('Les données de la Ville de Paris ne répondent pas. Vérifie ta connexion et réessaie.', true);
    return;
  }
  // Toilettes et lieux « aux horaires du parc » : ceux du parc où ils se trouvent (à moins de 150 m)
  const parkOf = (x) => fraisParcs.filter((pk) => pk.hours).map((pk) => ({ pk, d: distanceM(x, pk) })).filter((y) => y.d <= 150).sort((a, b) => a.d - b.d)[0]?.pk;
  const withPark = (list) => list.map((x) => (x.inPark && !x.hours ? { ...x, hours: parkOf(x)?.hours ?? '' } : x));
  // Les plus proches, mais un lieu fermé en ce moment passe après un lieu ouvert (ou aux horaires inconnus)
  const openFirst = (list, n) => nearestOf(withPark(list), from, n * 3)
    .sort((a, b) => (openState(a.item.hours)?.open === false) - (openState(b.item.hours)?.open === false) || a.d - b.d).slice(0, n);
  showPratique(from, nearestOf(fontaines, from, 2), openFirst(toilettes, 2), openFirst([...fraisLieux, ...fraisParcs], 2));
}

function showPratique(from, fs, ts, cs = []) {
  const block = (title, icon, list) => [
    el('h3', { class: 'ring-title' }, el('span', {}, title), el('span', {}, '')),
    list.length
      ? el('ul', { class: 'items' }, list.map(({ item, d }) => {
        const target = { name: item.label, lat: item.lat, lng: item.lng };
        return el('li', { class: 'item' },
          el('span', { class: 'item-main' }, el('span', { class: 'pr-ico', 'aria-hidden': 'true' }, ico(icon)),
            el('span', { class: 'item-text' }, el('span', { class: 'item-name' }, `${item.label} · ${fmtDist(d)} · ${walkMinutes(d)} min`, item.hours ? stateTag(item.hours, walkMinutes(d)) : null, item.extra ? el('span', { class: 'tag open' }, item.extra) : null),
              item.detail ? el('span', { class: 'item-sub' }, item.detail) : null)),
          el('button', { type: 'button', class: 'go-compass', onclick: () => openCompass(target), 'aria-label': `Boussole vers ${item.label}` }, ico('compass')),
          el('a', { class: 'go', href: mapsUrl(item, Math.min(d, 999)), target: '_blank', rel: 'noopener', 'aria-label': `Y aller : ${item.label}` }, 'Y aller'));
      }))
      : el('p', { class: 'empty' }, 'Aucune trouvée.'),
  ];
  openSheet('Pratique près de toi', el('div', { class: 'stack' },
    ...block('Fontaine à boire', 'glass-water', fs),
    ...block('Toilettes publiques', 'toilet', ts),
    ...(cs.length ? block('Lieu frais (ombre, musée, bibliothèque…)', 'trees', cs) : []),
    el('button', { type: 'button', class: 'btn c-guide', onclick: () => {
      setPratLayer(!state.showPratique);
      if (state.showPratique) { nearLayer.clearLayers(); closeSheet(); } else showPratique(from, fs, ts, cs);
    } }, ico('map'), state.showPratique ? 'Cacher fontaines et toilettes de la carte' : 'Toutes les fontaines et toilettes sur la carte'),
    el('p', { class: 'help' }, 'Données ouvertes de la Ville de Paris (ODbL), mises à jour chaque jour : fontaines, toilettes et îlots de fraîcheur. Les fontaines hors service sont écartées. Ouvert ou fermé : d\'après les horaires publiés (ceux du parc pour les toilettes d\'un parc) ; un lieu fermé en ce moment passe en dernier. Toilettes des gares et stations : open data RATP (liste gardée dans l\'appli).'),
  ), { name: 'pratique', again: () => showPratique(from, fs, ts, cs), tall: true });
  nearLayer.clearLayers();
  if (!following) meMarker(from.lat, from.lng).addTo(nearLayer);
  const pts = [[from.lat, from.lng]];
  for (const [list, icon] of [[fs, 'glass-water'], [ts, 'toilet'], [cs, 'trees']]) {
    list.forEach(({ item }, i) => {
      pts.push([item.lat, item.lng]);
      L.marker([item.lat, item.lng], { interactive: false, keyboard: false, zIndexOffset: i ? 1500 : 2000,
        icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pr-pin${i ? ' far' : ''}">${svgIcon(icon, { size: 16 })}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(nearLayer);
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
document.getElementById('btnPlanning').addEventListener('click', () => openPlanning('map'));
document.getElementById('btnCircuits').addEventListener('click', () => openCircuits());
document.getElementById('btnNotes').addEventListener('click', () => openDayNote());

/* Ordre des boutons de la carte (réglable dans ⚙ → Boutons de la carte) */
const TOOL_INFO = {
  pratique: { el: 'btnPratique', icon: 'droplets', name: 'Fontaine et toilettes', short: 'Fontaine et WC' },
  metro: { el: 'btnMetro', icon: 'M', name: 'Métro le plus proche', short: 'Métro' },
  locate: { el: 'btnLocate', icon: 'locate-fixed', name: 'Ma position et direction', short: 'Ma position' },
  paris: { el: 'btnParis', icon: 'Paris', name: 'Retour au centre de Paris', short: 'Centre de Paris' },
  velib: { el: 'btnVelib', icon: 'bike', name: 'Vélib\' le plus proche', short: 'Vélib\'' },
  home: { el: 'btnHome', icon: 'house', name: 'Rentrer (mes stations)', short: 'Rentrer' },
  sorties: { el: 'btnSorties', icon: 'calendar-days', name: 'Sorties là où regarde la carte', short: 'Sorties' },
  planning: { el: 'btnPlanning', icon: 'alarm-clock', name: 'Mon planning (sorties prévues)', short: 'Mon planning' },
  circuits: { el: 'btnCircuits', icon: 'signpost', name: 'Circuits de visite', short: 'Circuits' },
  notes: { el: 'btnNotes', icon: 'notebook-pen', name: 'Note du jour (sans lieu)', short: 'Note du jour' },
};
/** L'essentiel (v147) : les boutons choisis sur la carte, les autres dans Plus ; « Annuler » remet la disposition d'avant. */
function applyEssential() {
  const r = essentialLayout(state);
  state.layoutBefore = r.layoutBefore; state.hiddenTools = r.hiddenTools; state.moreTools = r.moreTools;
  persist(); applyToolOrder(); setLocateBtn(); openSettings('outils');
  toast('L\'essentiel est sur la carte, le reste dans Plus', false, { label: 'Annuler', fn: restoreLayout });
}
function restoreLayout() {
  const b = cleanLayout(state.layoutBefore);
  if (!b) return;
  state.mapTools = b.mapTools; state.hiddenTools = b.hiddenTools; state.moreTools = b.moreTools; state.layoutBefore = null;
  persist(); applyToolOrder(); setLocateBtn(); openSettings('outils'); toast('Tes boutons d\'avant sont remis');
}
/** Taille du texte (v144) : noms des trois tailles. */
const TEXT_NAME = { normal: 'Normal', grand: 'Grand', tresgrand: 'Très grand' };
/** Mon pas (v142) : noms des trois modes et vitesse écrite à la française (« 3,5 »). */
const PACE_NAME = { rapide: 'Rapide', normal: 'Normal', tranquille: 'Tranquille' };
const kmhText = (k) => String(k).replace('.', ',');
/** Nom d'un bouton de la carte : celui que j'ai choisi (Réglages → Boutons de la carte), sinon le nom d'origine. */
const toolName = (t) => state.toolNames?.[t] || TOOL_INFO[t].short;
/* « Plus » (⋯) : les boutons rangés là par Réglages → Boutons de la carte, avec leur nom, à un appui. Rien ne bouge tout seul. */
const btnMore = el('button', { type: 'button', id: 'btnMore', class: 'map-btn c-guide', 'aria-label': 'Plus de boutons', 'aria-expanded': 'false', 'aria-controls': 'morePanel', onclick: () => (morePanel.hidden ? openMore() : closeMore()) },
  ico('ellipsis', { size: 24 }), el('span', { class: 'map-count', hidden: true }));
const morePanel = el('div', { id: 'morePanel', class: 'more-panel', role: 'group', 'aria-label': 'Plus de boutons', hidden: true });
document.body.append(morePanel);
const moreList = () => cleanMore(state.moreTools, cleanHidden(state.hiddenTools));
function openMore() {
  fill(morePanel, normalizeTools(state.mapTools).filter((t) => moreList().includes(t)).map((t) => {
    const info = TOOL_INFO[t];
    const extra = t === 'planning' ? document.querySelector('#btnPlanning .map-count:not([hidden])')?.textContent : '';
    return el('button', { type: 'button', class: 'more-item', onclick: () => { closeMore(); document.getElementById(info.el).click(); } },
      el('span', { class: `more-ico${t === 'paris' || t === 'metro' ? ' txt' : ''}`, 'aria-hidden': 'true' }, ICON_NAMES.has(info.icon) ? ico(info.icon, { size: 20 }) : info.icon),
      el('span', { class: 'more-name' }, toolName(t)), extra ? el('span', { class: 'more-count' }, extra) : null);
  }));
  const r = btnMore.getBoundingClientRect();
  morePanel.style.bottom = `${Math.max(8, innerHeight - r.bottom)}px`;
  morePanel.classList.toggle('left', state.toolsSide === 'left');
  morePanel.hidden = false;
  btnMore.setAttribute('aria-expanded', 'true');
  morePanel.querySelector('button')?.focus({ preventScroll: true });
}
function closeMore() {
  if (morePanel.hidden) return;
  morePanel.hidden = true;
  btnMore.setAttribute('aria-expanded', 'false');
}
document.addEventListener('pointerdown', (e) => { if (!morePanel.hidden && !morePanel.contains(e.target) && !btnMore.contains(e.target)) closeMore(); }, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !morePanel.hidden) { closeMore(); btnMore.focus(); } });
map.on('movestart', closeMore);
/** Nom écrit à côté d'un bouton de la colonne (visible seulement avec « Noms à côté des boutons »). */
function toolLabel(b, text) {
  let lab = b.querySelector('.map-label');
  if (!lab) { lab = el('span', { class: 'map-label', 'aria-hidden': 'true' }); b.append(lab); }
  lab.textContent = text;
}
function applyToolOrder() {
  const box = document.querySelector('.map-tools');
  box.classList.toggle('left', state.toolsSide === 'left');
  const hidden = cleanHidden(state.hiddenTools);
  const more = moreList();
  const order = normalizeTools(state.mapTools);
  box.classList.toggle('labels', state.toolLabels === true);
  for (const t of order) {
    const b = document.getElementById(TOOL_INFO[t].el);
    b.hidden = hidden.includes(t) || more.includes(t);
    toolLabel(b, toolName(t));
    if (t !== 'locate') { // « Ma position » change de description selon son état (setLocateBtn)
      b.dataset.aria ??= b.getAttribute('aria-label') ?? '';
      b.setAttribute('aria-label', state.toolNames?.[t] || state.toolLabels ? `${toolName(t)} : ${b.dataset.aria}` : b.dataset.aria);
    }
    box.append(b);
  }
  toolLabel(btnMore, 'Plus');
  // ⋯ juste au-dessus de « Ma position » quand elle est en bas de la colonne, sinon en dernier
  const shown = order.filter((t) => !hidden.includes(t) && !more.includes(t));
  if (shown.at(-1) === 'locate') box.insertBefore(btnMore, document.getElementById('btnLocate')); else box.append(btnMore);
  btnMore.hidden = !more.length;
  // le dernier bouton de la colonne touche le bandeau « Maintenant » : son nom écrit le cacherait
  for (const b of box.children) b.classList.remove('col-last');
  [...box.children].filter((b) => !b.hidden).at(-1)?.classList.add('col-last');
  closeMore();
  updatePlanningCount();
}
applyToolOrder();
// Sorties sans GPS : autour du centre de la carte, la carte ne bouge pas
document.getElementById('btnSorties').addEventListener('click', () => openEvents('map'));
document.getElementById('btnParis').addEventListener('click', () => {
  closeSheet();
  map.setView(PARIS, 13, { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches });
});

/* ---------- Mes réglages par défaut ---------- */

function applyAllSettings() { setWalkSpeed(paceKmh(state.pace)); applyTextSize(); applyTheme(); applyMapStyle(); applyToolOrder(); refresh(); }
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
  ['map', 'Se repérer', [
    '{chevron-down} **Voir la carte derrière une fenêtre** : le bouton à côté de la croix la réduit à sa barre de titre ; un nouvel appui la rouvre au même endroit. Tu peux aussi faire glisser la barre du titre vers le bas ou vers le haut.',
    '**La carte** : tes lieux sont les gouttes. Touche une goutte pour ouvrir sa fiche. **De loin**, les lieux proches les uns des autres deviennent une goutte noire avec leur nombre : touche-la, la carte zoome dessus. À la vue « rue », chaque lieu a sa goutte. Tes favoris ne sont jamais regroupés.',
    '**{locate-fixed} Ma position**, en bas de la colonne de droite : le point bleu dit où tu es, le cône où tu regardes. La carte te suit.',
    '{locate} **Au démarrage**, la carte s\'ouvre sur toi quand tu es dans Paris et que la position est déjà autorisée (rien n\'est demandé). Ce point bleu-là ne te suit pas : il s\'efface au bout de 2 min. Pour tous tes lieux à l\'ouverture : {settings} → La carte → Ouvrir sur ma position.',
    '**Si tu bouges la carte au doigt**, elle ne te suit plus. Un appui la recentre sur toi, un autre arrête tout.',
    '**Tant que Ma position est allumée**, l\'écran reste allumé. Le téléphone vibre à 100 m d\'un de tes lieux.',
    '**Le bandeau « Maintenant »**, en bas de la carte, montre une seule chose à la fois : ta sortie du jour, « Tu es déjà passé ici », « C\'est le moment », ta sortie de demain, ce qui se passe dans la rue à 5 min, une sortie gratuite à 5 min (gratuite sans condition, sans réservation obligatoire, qui commence dans la demi-heure ou est en cours), un jour gratuit (le lieu gratuit le plus proche à 15 min, avec son heure si elle est sûre), sinon le lieu ouvert le plus proche. La croix le cache. Pour qu\'il vibre quand il a du nouveau (Pars maintenant, Tu es déjà passé ici, C\'est le moment, Dans la rue, Gratuit à 5 min) : {settings} → Vibrer quand « Maintenant » a du nouveau. Seulement appli ouverte et écran allumé.',
    '**Paris** recentre la carte sur Paris. **Perdu ?** {locate-fixed} te ramène sur toi.',
    '**M** : la station de métro la plus proche.',
    '**La barre du haut** se fait glisser de côté. Elle commence par {search} : chercher partout.',
    '{search} **La loupe** cherche dans tes lieux, les Grands lieux, TTB, les avantages Navigo, les galeries, l\'art dans la rue et les plaques commémoratives (tape un nom : « Colette » liste les plaques qui portent ce nom, en mot entier ; la liste de la Ville n\'est pas tout Paris). Sous les résultats : chercher dans l\'agenda de la semaine, ou dans l\'annuaire.',
    '**Tout** : toutes tes catégories. Touche une catégorie pour ne voir qu\'elle, touche-la encore pour la retirer.',
    '{star} **Favoris** : seulement tes favoris. Avec une catégorie : ses favoris.',
    '{list-filter} **Filtres** : ouvert maintenant, mieux notés, abrités, tes listes, la liste de tes lieux d\'un arrondissement. La rubrique Filtres explique tout.',
    '{tent} **Dans la rue aujourd\'hui** : marchés, brocantes, fêtes et expos en plein air.',
    '**TTB** : les bonnes tables du guide. La rubrique TTB explique comment les mettre.',
    '{lines} **Lignes** : le métro et le RER. En zoomant, chaque station montre ses lignes, puis son nom (raccourci : appui long sur M).',
    '{ellipsis} **⋯ en haut** : les boutons rangés dans Plus. Au départ : Vélib\' et Fontaines et toilettes. Touche-en un pour l\'allumer ; allumé, il apparaît aussi dans la barre.',
    '**Ranger les boutons du haut** : {settings} → Ce qui s\'affiche → Barre du haut. Pour chacun : Barre, Plus ou Caché. Exemple : Resto et Boutique dans Plus.',
    '**Sous la barre** : la température et la qualité de l\'air. Touche-les pour le détail et un conseil.',
    '**« 3e · 12° »** : devant la température, l\'arrondissement où tu es, seulement s\'il est sûr. Il faut une position de moins de 10 min (Ma position, Autour de moi, ouverture sur toi), assez précise et pas trop près d\'une limite. Sinon, rien ne s\'affiche. Le GPS n\'est jamais demandé pour ça.',
    '{map} **De loin, les numéros des arrondissements** sont écrits sur la carte, avec leurs limites en trait fin. Ils disparaissent en zoomant sur une rue. Pour les masquer : {settings} → La carte → Numéros des arrondissements.',
    '**La colonne de droite** : Paris, M, {calendar-days} Sorties, {alarm-clock} Mon planning, {ellipsis} Plus et Ma position.',
    '{ellipsis} **Plus** ouvre les autres boutons, avec leur nom : au départ Fontaine et WC, Vélib\' et Rentrer.',
    '{droplets} **Fontaine et WC** : la fontaine, les toilettes et le lieu frais les plus proches. Ce qui est ouvert passe d\'abord. Chaque toilette dit s\'il faut un ticket.',
    '{map} **Toutes les fontaines et toilettes sur la carte** : bouton en bas de Fontaine et WC. On les voit en zoomant ; une toilette fermée en ce moment est en tirets.',
    '{bike} **Vélib\'** : les 3 stations les plus proches qui ont des vélos ou des places.',
    '{map} **Toutes les stations sur la carte** : bouton en bas de Vélib\'. Chaque station montre ses vélos (ou ses places, selon ton choix). On les voit en zoomant.',
    '**L\'heure des Vélib\'** est écrite en haut à gauche. Touche-la pour mettre à jour. Après 10 min, les nombres s\'effacent : ils seraient faux.',
    '{house} **Rentrer** : les 3 stations proches et le temps jusqu\'à ta station Maison. Tes stations : {settings} → Mes stations. Quand une gare de RER ou un arrêt de tram est nettement plus près que le métro (bois, bord de Paris), une ligne le dit : vérifie qu\'il va vers chez toi.',
    '{bus} **En bus** : dans Mes stations, choisis ton arrêt de bus. Rentrer montre alors les lignes qui y vont, depuis un arrêt à moins de 8 min.',
    '**Bus : ni horaires ni sens.** Vérifie le sens du bus à l\'arrêt. Touche un arrêt pour la boussole.',
    '**Ranger les boutons de la colonne** : {settings} → Boutons de la carte. Pour chacun : Carte, Plus ou Caché, et l\'ordre.',
    '{pencil} **Changer le nom d\'un bouton** : même page, touche son nom. « Noms à côté des boutons » les écrit sur la carte.',
    '{check} **L\'essentiel** : même page, « Ne garder que l\'essentiel ». Seuls tes boutons choisis restent sur la carte, les autres passent dans Plus.',
    '**Choisir l\'essentiel** : même page. Au départ : M, Rentrer, Sorties et Ma position. « Remettre mes boutons d\'avant » annule.',
    '**En bas de l\'écran** : {settings} Réglages, + Ajouter, Autour de moi. Cette aide est en tête des Réglages.',
    '**Sans réseau** (métro) : les quartiers déjà regardés restent affichés.',
    '{palette} **Allure de la carte** : {settings} → Style de la carte. Le style Épuré demande une clé CARTO gratuite, à coller une fois.',
    '{moon} **Fond sombre** : {settings} → Mode sombre. **Boutons à gauche** : {settings} → Boutons de la carte → À gauche.',
    '**Tes réglages** sont gardés à chaque changement. « Enregistrer mes réglages par défaut », en bas des Réglages, permet d\'y revenir d\'un appui.',
  ]],
  ['calendar-days', 'Trouver une sortie', [
    '{calendar-days} **Sorties**, dans la colonne de droite : ce qui se passe aujourd\'hui autour du centre de la carte. La carte ne bouge pas.',
    '**Quatre onglets** : Tout, Gratuit, Expos, Navigo.',
    '**Le point de départ** est écrit sous les onglets. Touche-le pour choisir : centre de la carte, ta position ou un autre quartier.',
    '**Un autre quartier** : une croix apparaît au centre. Déplace la carte, puis touche le bandeau.',
    '{map} **Carte** montre les sorties de l\'onglet sur la carte. Un petit carré marque le point de départ.',
    '**Une ligne = une sortie.** L\'icône dit le genre ; un calendrier veut dire « genre pas sûr ». À droite : les minutes à pied.',
    '**Chaque rubrique** montre les 3 plus proches. « Voir les … » déroule la suite. Une sortie de Mes salles, montrée en tête de Tout, n\'est pas répétée plus bas.',
    '**Touche une sortie** pour sa page : quand, où, Y aller, {compass} Boussole, Métro, Prévoir.',
    '{calendar-days} **Bientôt gratuit**, dans Sorties → Gratuit (et le bandeau « Maintenant ») : touche un jour pour voir les lieux gratuits ce jour-là, leurs heures, ceux qui sont sur réservation, et « Prévoir ce dimanche » pour le mettre dans Mon planning.',
    '{star} **★ Favori, d\'un appui** : sur la page d\'une expo ou d\'une sortie (son lieu, avec l\'expo dans la note), d\'un Grand lieu, d\'une galerie, d\'un musée gratuit ou du Kiosque. Le lieu entre dans tes lieux, en favori, dans une catégorie devinée (Musées, Culture…) : « Modifier » dans le message pour la changer, « Annuler » pour le retirer. Déjà dans tes lieux : l\'étoile s\'allume ou s\'éteint.',
    '{heart} **Mes salles** : « Suivre » sur la page d\'une sortie, d\'un Grand lieu, d\'une galerie, d\'un musée gratuit ou du Kiosque ; dans Mes salles, les lieux de tes sorties prévues ou faites se suivent d\'un appui. Les prochains rendez-vous de tes salles (7 jours, agenda de la Ville) arrivent en tête de Sorties ; la liste complète et les salles suivies : « Mes salles ».',
    '{ticket} **Réserver et s\'informer**, en bas de sa page : réservation obligatoire ou conseillée, le site de l\'organisateur et sa billetterie, avec le nom du site écrit en clair. Dans la liste, « Sur réservation » le signale. C\'est l\'organisateur qui le dit : vérifie sur son site.',
    '{external-link} **Pour aller plus loin**, en bas de Sorties : paris.fr, Paris Musées, les galeries (Offi), l\'office du tourisme, Sortir à Paris.',
    '**Les dates** viennent de l\'agenda de la Ville. Une sortie sans créneau aujourd\'hui n\'est pas dans la liste du jour.',
    '**Une sortie sans adresse sur la carte** n\'apparaît pas : l\'agenda la place au centre de Paris, ce qui donnerait une fausse distance.',
    '**Gratuit** : sorties gratuites, musées gratuits, théâtre à moitié prix, et les prochains jours gratuits.',
    '**Bientôt gratuit** : 2 jours avant (musées nationaux, Louvre le soir, Bourse de Commerce), « Maintenant » sur la carte le dit. Le jour même, s\'il y en a un à 15 min, il te donne ce lieu et son heure ; sinon, touche-le pour Gratuit, autour de toi. La croix le cache pour la journée.',
    '**Musées gratuits et Kiosque** : un tampon dit s\'ils sont ouverts (Ouvert, Ferme dans 20 min, Fermé à ton arrivée, Fermé). Les fermés passent à la fin. Les musées de la Ville sont fermés le lundi.',
    '**Expos** : en tête, Grands lieux, Expos de la semaine, Ouvert tard, Art dans la rue et Mes artistes. Puis Dernière chance, Expos en cours et galeries.',
    '{moon} **Ouvert tard** : les nocturnes des grands lieux, ce soir puis jour par jour. À gauche, la fermeture ; dessous, « arriver avant » : l\'heure où le guichet ferme ou de la dernière entrée, quand le site du lieu la donne. Un lieu quitte « Ce soir » à cette heure. Horaires habituels ; rien un jour férié.',
    '{user} **Mes artistes** : écris les noms que tu suis ; l\'appli les cherche tels quels dans l\'agenda de la semaine, tout Paris.',
    '{shapes} **Art dans la rue** : statues, sculptures et installations à moins de 1 km (OpenStreetMap, liste rangée dans l\'appli chaque mois). Pas de fresques : elles disparaissent trop vite.',
    '{landmark} **Grands lieux** : 26 musées, fondations et salles de concert, avec ce que l\'agenda annonce. Aussi par la loupe : tape « orsay ».',
    '**Expos de la semaine** : tout Paris sur 7 jours, par arrondissement, celles qui ferment d\'abord.',
    '**Dernière chance** : les expos qui ferment dans moins de 7 jours.',
    '{route} **Parcours galeries** : une boucle de 1 à 3 h par les galeries ouvertes à ton arrivée.',
    '**Navigo** : les lieux partenaires des avantages Navigo. Touche-en un pour lire l\'offre.',
    '{alarm-clock} **Prévoir**, sur la page d\'une sortie : elle va dans Mon planning, à l\'heure de l\'agenda quand elle est connue. Elle ne se met pas sur ta carte.',
    '{plus} **Ajouter** (galerie, musée gratuit, Kiosque, sortie prévue) met le lieu sur ta carte, pour de bon.',
    '{alarm-clock} **Mon planning** : tes sorties prévues, jour par jour : tes lieux et les sorties de l\'agenda. Le lendemain, « Tu y es allé ? » : « Non » sur une expo encore à l\'affiche la garde, avec « Prévoir un autre jour » ou « Retirer ».',
    '{check} **Aujourd\'hui**, en tête de Mon planning : la liste des lieux que tu veux faire dans la journée, 8 au plus. « Ajouter des lieux » : coche-les, ou cherche un nom. Depuis une fiche : Prévoir une visite → Aujourd\'hui → Enregistrer, sans choisir de moment.',
    '{arrow-right} **Y aller**, Boussole et Métro mènent au premier lieu de la liste. **Fait** le passe en Déjà visité (« Annuler » dans le message) et le suivant prend sa place. « Modifier la liste » : des flèches pour ranger à ta façon, et × pour retirer un lieu d\'aujourd\'hui (il reste sur ta carte ; « Annuler » dans le message). « Tout le parcours · Google Maps » : de 2 à 4 lieux, à pied, dans ton ordre.',
    '**Passé minuit**, ce qui reste dans la liste du jour s\'efface sans question : les lieux restent sur ta carte.',
    '{calendar-days} **Trouver une sortie**, en bas de Mon planning : choisis le jour (Demain, Samedi…). L\'agenda de la Ville montre ce qui a un horaire ce jour-là, autour du centre de la carte, par heure. Touche une sortie, puis Prévoir.',
    '{alarm-clock} **Prévoir une visite**, dans la fiche d\'un lieu, sous Favori : touche le jour (Aujourd\'hui, Demain, Samedi…) puis le moment (Matin, Midi, Après-midi, Soir) ou « Heure précise ». Avec qui : facultatif. Si le lieu a un jour gratuit dans les 5 semaines (1er dimanche du mois…), la page le dit au-dessus d\'« Enregistrer ».',
    '**Le jour même**, « Maintenant » rappelle la sortie. Avec une heure précise, il dit aussi à quelle heure partir.',
    '**Le lendemain** d\'une sortie prévue (un jour, un moment), Mon planning demande « Tu y es allé ? ». Oui : le lieu passe en Déjà visité ; une sortie de l\'agenda va dans Mon journal. Non : la sortie s\'efface. « Écrire une impression » : ce que tu retiens, une note, une photo.',
    '**Sur la carte**, une pastille {alarm-clock} près d\'une goutte signale une sortie prévue dans les 7 jours.',
    '{copy} **Inviter quelqu\'un** : Mon planning → la sortie → « Prévu » (ou « Changer le jour ou retirer ») → Copier le lien d\'invitation, puis colle-le dans un SMS. Ton proche reçoit le lieu, le jour et l\'heure.',
    '{sparkles} **Temps forts** (Nuit Blanche…) : annoncés en haut de Sorties la semaine où ils ont lieu.',
    '**Gratuités et temps forts** sont des listes vérifiées le 16 novembre 2026. Vérifie aussi sur le site du lieu.',
  ]],
  ['map-pinned', 'Autour de moi', [
    '{map-pinned} **Autour de moi**, en bas à droite : tes lieux du plus proche au plus loin, rangés par cercles. « Fermé à ton arrivée » : le lieu est encore ouvert, mais il aura fermé le temps d\'y aller à pied (5 min de marge ; la marche est une estimation).',
    '**La liste se met à jour** toute seule quand tu as marché 50 m.',
    '**Les minutes à pied** suivent ton pas : {settings} → {footprints} Mon pas. Les cercles : {settings} → Cercles.',
    '{locate} **Où suis-je ?**, dans les 8 boutons du haut : ton adresse, l\'arrondissement, l\'origine du nom de la rue quand la Ville la donne, la station la plus proche et le quartier en 3 lignes.',
    '{copy} **Ta position** se copie ou s\'envoie d\'un appui, dans Où suis-je ?',
    '{map} **Mon Paris**, le dernier des 8 boutons : tes 20 arrondissements, ta marche du jour et Mon planning.',
    '{route} **Itinéraire** : J\'ai du temps, Sur mon chemin, Relier des lieux, Parcours galeries, Circuits de visite.',
    '{signpost} **Circuits de visite** : des balades d\'un métro à l\'autre (Marais, îles, passages couverts, Montmartre, canal, Luxembourg, Butte-aux-Cailles, Coulée verte). Aussi dans ⋯ Plus, à droite de la carte. Puces Thème et Durée en haut ; la plus proche d\'abord. En fin de journée, un encadré prévient quand la balade finirait après le coucher du soleil (calculé sur le téléphone).',
    '**La page d\'un circuit** : la durée à ton pas (plus 4 min par étape pour regarder), les escaliers et les pentes, Balade guidée, Voir sur la carte (le tracé et les étapes numérotées), puis tes lieux à 2 min du tracé et les autres passages couverts à 5 min.',
    '{triangle-alert} **Un souci sur un circuit** : sur la page d\'une étape, ou en bas du circuit pour le chemin, « Signaler un problème » (un choix, un mot si tu veux). Rien n\'est envoyé ni ta position notée. Liste des circuits → Problèmes notés → « Copier pour Claude », à coller dans une conversation pour que le circuit soit corrigé. « Masquer ce circuit » le retire de la liste ; en bas de la liste, « circuits masqués » pour le remettre.',
    '{check} **Je l\'ai fait** : le circuit va dans Mon journal, avec un mot si tu veux. Ton trajet n\'est jamais gardé.',
    '{footprints} **Rues sans voitures** (Itinéraire) : les secteurs « Paris Respire » prévus aujourd\'hui, sinon le prochain jour, avec leurs heures ; un appui montre le secteur sur la carte. Un samedi ou un dimanche, « Maintenant » signale celui qui est à 10 min au plus. Toujours « prévu » : la Ville peut ajourner une opération. Jours et heures lus sur paris.fr ; contours rangés dans l\'appli par le robot.',
    '{hourglass} **J\'ai du temps** : choisis ta durée. L\'appli trace une boucle par tes lieux ouverts, les mieux notés d\'abord.',
    '{footprints} **Sur mon chemin** : tes lieux sur ton trajet. **Relier des lieux** : 2 à 4 lieux dans le meilleur ordre.',
    '{navigation} **Balade guidée** : la boussole te mène d\'étape en étape. « Étape suivante » passe à la suite.',
    '**À l\'arrivée** à un de tes lieux, « Visité » le note en un appui. Rien ne se coche tout seul.',
    '{shuffle} **Surprise** : un de tes lieux au hasard, à moins de 15 min.',
    '{book-open-text} **Curiosités** : d\'abord les plaques commémoratives à moins de 5 min (touche-en une pour lire son texte et savoir où regarder), puis les passages couverts à moins de 15 min, puis les articles Wikipédia à moins de 1 km. + pour en faire un lieu.',
    '{landmark} **Monuments** : les monuments protégés à moins de 1 km, avec leur site, la fiche du ministère et Wikipédia, et, quand la base Mérimée les donne, leur auteur (architecte, sculpteur…) et leur date. « Du même auteur » liste ses autres édifices protégés de Paris (nom écrit à l\'identique : ce n\'est pas toute son œuvre).',
    '**M Station** : ce qu\'il y a autour d\'une station, sans GPS. Pratique dans le métro. Sous les autres stations de métro : les gares de RER (R) et les arrêts de tram (T) à moins de 1,5 km, avec leurs lignes, sans horaires.',
    '{cloud-rain} **S\'il pleut**, un bandeau propose tes lieux abrités. {thermometer-sun} **S\'il fait chaud**, les lieux frais.',
    '**TTB affiché ?** Les 3 adresses du guide les plus proches, et la liste complète.',
    '{map} **Mon Paris** : chaque arrondissement se colore selon tes lieux « Déjà visité ». Chaque case : visités / enregistrés.',
    '**Les lieux de tes proches** et ceux hors de Paris ne comptent pas dans Mon Paris.',
    '**Marche et air** : touche une barre pour le détail du jour.',
    '**« Remettre à zéro… »**, tout en bas de Mon Paris, efface la marche et l\'air ou les fonctions utilisées. Tes lieux ne changent pas.',
  ]],
  ['map-pin', 'Mes lieux', [
    '{plus} **Ajouter un lieu** : + Ajouter, en bas. À ma position, ou avec un nom ou une adresse. Quand la recherche donne plusieurs réponses, « Voir sur la carte » les montre en ronds : touche un rond pour voir son nom, puis le bandeau pour l\'ajouter. « Annuler » sur la fiche te ramène aux ronds.',
    '{camera} **Vu en passant**, en tête de + Ajouter : une photo et une ligne, posées là où tu es. Près d\'une de tes adresses, l\'appli propose de l\'y ajouter.',
    '{check} **Sur la carte**, une petite coche verte sur la goutte : déjà visité. Une goutte grise et pâle : une œuvre disparue ou un lieu fermé définitivement.',
    '**Sur la carte**, une note Vu en passant est un petit rond. En zoomant, sa photo apparaît. Pour ne voir qu\'elles : Filtres → Vu en passant.',
    '{palette} **Street art** : dans Vu en passant, « Ranger dans : Street art » garde la photo dans ta catégorie Street art (créée la première fois), avec son artiste si tu le connais.',
    '{search} **En écrivant l\'artiste**, « Vouliez-vous dire » propose les noms connus proches (tes lieux, Mes artistes, Art dans la rue) : un appui remplit le champ. « Chercher … sur Google » ouvre une recherche, seulement si tu la touches.',
    '{user} **L\'artiste** d\'une œuvre : Modifier → Artiste (le champ n\'apparaît que pour ta catégorie Street art et Vu en passant). Dans la fiche, son nom ouvre sa page : ses œuvres dans tes lieux, son site ou son Instagram (que tu recopies une fois), et « Suivre ses expos ».',
    '{store} **Fermé définitivement** : dans la fiche, Sur ce lieu → Rangement, pour un resto ou une boutique qui a fermé (vu sur place, ou « Définitivement fermé » dans Avis Google). Gris sur la carte, plus proposé ; « De nouveau ouvert » annule. Pour une adresse TTB : Rangement de sa fiche, « Fermé définitivement » ou « Masquer cette adresse » ; les remettre : {settings} → TTB.',
    '{eye-off} **Disparue ou recouverte** : pour une œuvre, dans la fiche, Sur ce lieu → Rangement. Elle devient grise sur la carte, reste dans ton journal, et l\'appli ne la propose plus. La fiche dit le dernier jour où tu l\'as vue, jamais « toujours là ».',
    '**Ou laisse le doigt appuyé** sur la carte, là où tu veux.',
    '**La recherche** commence dans la zone que montre la carte : zoome sur le quartier avant de chercher.',
    '**Un nom courant** (« boulangerie ») ? Ajoute la rue ou le quartier : l\'annuaire ne connaît pas tous les commerces.',
    '**Depuis Google Maps ou un site** : Partager → Ma carte. Le nom et l\'adresse se remplissent seuls.',
    '{image} **Depuis une photo** de ta galerie : le lieu se place là où la photo a été prise.',
    '**Déjà dans tes lieux ?** L\'appli te prévient : « Voir ce lieu » ou « Ajouter quand même ».',
    '**Le formulaire** : catégorie, note, étoiles, listes, « Abrité de la pluie » et « Le bon moment ».',
    '**La fiche** s\'ouvre quand tu touches une goutte.',
    '**Y aller** ouvre Google Maps. {compass} **Boussole** : une flèche et une voix te guident.',
    '**M Métro** : la ligne et la correspondance. {camera} **Photo** : l\'appareil photo, 6 photos par lieu.',
    '**Aujourd\'hui** et **Métro**, juste sous les boutons du haut : ouvert, ferme à…, ferme dans 30 min, ou fermé ce jour (« horaires notés en mars 2024 » quand ils ont été copiés il y a plus d\'un an : vérifie avant de faire le trajet) ; la station la plus proche et, sous elle, la sortie de métro la plus proche du lieu (numéro et nom des panneaux RATP ; une sortie fermée pour travaux n\'est pas connue).',
    '{star} **Favori** et {check} **Déjà visité** : un appui allume, un autre éteint. Le mot change selon la catégorie si tu l\'as choisi (« Déjà goûté », « Déjà vu »…) : {settings} → Catégories et listes.',
    '{alarm-clock} **Prévoir une visite** : sous Favori, à côté d\'« Écrire une impression ». Une fois prévue, le bouton dit quand (« Prévu samedi après-midi »).',
    '{footprints} **Écrire une impression** : le jour, ce que tu as vu, une photo. L\'historique est dans la fiche, sous le nom choisi pour la catégorie (« Mes passages », « Mes repas »…).',
    '**Tous tes passages** : Mon Paris → Mon journal, avec les sorties de l\'agenda où tu es allé. Cocher « Déjà visité » note aussi le jour.',
    '{notebook-pen} **Note du jour** : ⋯ Plus → Note du jour, pour écrire sans lieu (une adresse qu\'on te donne, un nom lu sur une affiche). Une page par jour : rouvre-la pour la compléter ; vide le texte pour l\'effacer. Mon journal la range à sa date. Texte seulement, sans position ; elle part dans ta sauvegarde, jamais chez un proche. Pour la sortir sur la carte : Réglages → Boutons de la carte.',
    '**En repassant** à moins de 100 m, « Maintenant » te rappelle ce que tu avais vu (une fois par visite).',
    '{sun} **Le bon moment**, dans Modifier : Matin, Midi, Soir, Week-end, Printemps… Quand c\'est le moment, à moins de 10 min, « Maintenant » te le dit.',
    '**Étoiles** : ta note de 1 à 5. Touche la même étoile pour la retirer.',
    '{copy} **L\'adresse** se copie d\'un appui, pour un taxi ou un message.',
    '{pencil} **L\'adresse** se corrige dans Modifier. Le point ne bouge pas ; pour le déplacer : Rangement → Déplacer le point.',
    '**En bas de la fiche** : Modifier, Partager, QR code, {wrench} Rangement (Fermé définitivement, Déplacer, Supprimer), Horaires, Avis Google, Uber jusqu\'ici.',
    '{camera} **Les photos** restent sur ton téléphone, sans leur position GPS. Touche une photo pour la voir, en ajouter ou la supprimer. En grand, le repère « 2 / 6 » dit où tu en es : glisse le doigt de côté pour voir la suivante ou la précédente, touche pour fermer.',
    '{tags} **Catégories** : {settings} → Catégories et listes. L\'ordre, le nom, l\'icône, la couleur, le nom de l\'historique et celui de « Déjà visité ».',
    '{list} **Une liste** regroupe des lieux de catégories différentes (« Sous la pluie »). « Nouvelle liste », puis coche ses lieux.',
    '**Icônes seules en haut** : la barre n\'affiche que les logos. Même page.',
    '**Favori** : son icône et sa couleur dans {settings} → Favoris. Un cœur évite la confusion avec les étoiles.',
    '{list-filter} **Filtres** : Ouvert maintenant, Mes mieux notés (4 étoiles et plus), Abrités, tes listes et les lieux de tes proches.',
    '{map} **Arrondissement** (en bas de Filtres) : touche une case du plan. La carte se place sur l\'arrondissement, le reste de Paris est voilé de gris, et la liste de tes lieux s\'ouvre dessous, rangée par catégorie. Les boutons de catégories du haut filtrent la carte et la liste ensemble. Pour un autre arrondissement : touche-le sur la carte, dans le gris. La flèche réduit la liste pour voir la carte ; la croix la ferme et tous tes lieux reviennent. Calculé sur ton téléphone, même sans réseau.',
    '**Ouvert maintenant** ne garde que les lieux dont on connaît les horaires.',
    '**Les filtres** valent pour la carte, la recherche, Autour de moi et J\'ai du temps. Le chiffre sur le bouton dit combien sont actifs.',
    '**Masquer des filtres** : en bas de Filtres, « Choisir les filtres affichés ».',
    '{tent} **Dans la rue aujourd\'hui** : les marchés du jour et ce que l\'agenda annonce dans la rue. C\'est deviné d\'après le titre : il peut y avoir des oublis.',
    '{bike} **Vélib\'** et {droplets} **Fontaines et toilettes** : aussi dans Filtres → Afficher aussi sur la carte. Vélib\' s\'éteint quand tu fermes l\'appli, car ses nombres changent à la minute.',
    '{door-open} **Passages couverts** (⋯ Plus en haut, ou Filtres → Afficher aussi sur la carte) : les 12 passages de la liste, chacun avec sa page (son histoire, ses entrées, sa source). De loin, un point : touche-le pour zoomer. De près, un trait relie ses entrées quand le chemin est sûr ; sinon, le pictogramme seul. Aucun horaire : ils ferment en général la nuit.',
    '**Il pleut** : sous le bandeau d\'Autour de moi, les passages couverts à moins de 10 min. Un passage ajouté à ta carte est déjà coché « abrité ».',
  ]],
  ['book-open-text', 'TTB', [
    '**TTB** : les adresses d\'un guide de bonnes tables, en ronds terre cuite sur la carte. La source est citée dans {settings} → TTB.',
    '**Les mettre** : {settings} → TTB → « Ouvrir la page Adresses ».',
    '**Dans Chrome**, menu ⋮ → flèche Télécharger. La page va dans Téléchargements.',
    '**Reviens dans l\'appli** et touche « Choisir le fichier ». Même chose pour mettre la liste à jour.',
    '**Le bouton TTB**, en haut : un appui affiche ou cache les adresses.',
    '**La liste** : Autour de moi → Liste TTB, ou {settings} → TTB → Voir la liste. La plus proche d\'abord, avec un tri par rubrique et par budget.',
    '**Chaque icône** dit la rubrique : {utensils} La Table, {soup} Boui-boui, {sandwich} Street-food, {croissant} Bec sucré, {shopping-basket} Le panier, {wine} Cave.',
    '**La fiche** : cuisine, budget, horaires selon le guide, station, site, Avis Google et + Ajouter.',
    '{plus} **Ajouter** garde l\'adresse dans tes lieux, pour Favori, Déjà visité, étoiles, photos ou Prévoir. Sa goutte remplace alors le rond TTB.',
    '**La catégorie** est choisie d\'après la rubrique quand une des tiennes correspond (Restos pour La Table…). Sinon, choisis-la toi-même.',
    '**Mauvaise catégorie** : touche la goutte → Modifier. **Pas voulu** : touche la goutte → Rangement → Supprimer ce lieu. Le rond TTB revient.',
    '**La fiche d\'un de tes lieux** dit s\'il est dans le guide. L\'icône du rond TTB vient du guide : elle ne se change pas.',
    '**La liste reste sur ce téléphone.** Avec tes marques (fermées, masquées), elle part dans ta sauvegarde si la case « Avec la liste TTB » est cochée (elle l\'est au départ) : après une remise à zéro, plus besoin de réimporter la page. {trash-2} {settings} → TTB → Retirer la liste.',
  ]],
  ['save', 'Garder et partager', [
    '**Tes lieux ne sont que sur ce téléphone.** Sauvegarde-les souvent.',
    '{save} **Sauvegarder** : {settings} → Sauvegarde → Sauvegarder maintenant. La ligne est orange s\'il y a des changements.',
    '**Un rappel** s\'affiche dès 5 changements, ou au bout de 3 jours : une pastille terre cuite sur le bouton {settings} Réglages, et « Sauvegarder maintenant » en tête des Réglages. Elle part dès que tu sauvegardes.',
    '**Le fichier** va dans Téléchargements. Envoie-le aussi sur ton mail ou ton Drive : si tu perds le téléphone, Téléchargements part avec.',
    '**Il contient** tes lieux, photos, sorties prévues, catégories, listes, stations, réglages et, si la case est cochée, la liste TTB avec tes marques. Pas la clé CARTO, ni ta marche.',
    '{triangle-alert} **Attention** : effacer les données des sites dans Chrome efface aussi tes lieux. Sauvegarde avant.',
    '{upload} **Retrouver tes lieux** : {settings} → Restaurer ou importer → Restaurer ma sauvegarde.',
    '{download} **Depuis Google Maps** : {settings} → Restaurer ou importer. Les étapes sont expliquées. Vérifie les lieux marqués « à vérifier ».',
    '{share-2} **Partager un lieu** : sa fiche → Partager, ou QR code. Ton ami l\'enregistre en un appui. Ton commentaire ne part que si tu coches « Avec ma note ».',
    '{copy} **Partager une sortie** : Mon planning → la sortie → « Prévu » → Copier le lien d\'invitation. Ton ami la reçoit dans son planning.',
    '**Partager une balade** : « Partager » dans J\'ai du temps ou Parcours.',
    '{locate} **Te faire retrouver** : Où suis-je ? → Envoyer ma position. Ton ami a une boussole vers toi.',
    '{users} **Partager tes lieux** : {settings} → Sauvegarde → Envoyer à un proche. Tu coches ce qui part (lieux, notes, passages, photos, sorties prévues, artistes, salles, liste TTB) et les catégories ; tes favoris, tes « Déjà visité » et tes billets restent à toi. Ta sauvegarde, elle, reste complète.',
    '**Ton proche** fait Restaurer ou importer → Importer les lieux d\'un proche. Tout est coché : il décoche ce qu\'il ne veut pas (contenu, catégories, chaque artiste, salle ou sortie prévue). Un lieu qu\'il a déjà n\'est pas ajouté deux fois ; un nouvel envoi met à jour sans rien retirer. Puis Filtres → « Lieux de mes proches ».',
    '**Une sortie prévue par un proche** apparaît dans Mon planning avec « Prévu par » et son prénom. Sur sa page : « L\'ajouter à mon planning », ou Retirer.',
    '**Partager l\'appli** : {settings} → Appli → Envoyer le lien, ou QR code. Elle arrive vide chez ton ami.',
  ]],
  ['settings', 'Régler l\'appli', [
    '{footprints} **Mon pas** : Rapide, Normal ou Tranquille. Tu règles la vitesse de chacun, de 2 à 7 km/h.',
    '{a-large-small} **Taille du texte** : Normal, Grand ou Très grand. {settings} → Ce qui s\'affiche.',
    '**Boutons, barre du haut, style, fond sombre** : la rubrique Se repérer explique tout.',
    '{volume-2} **Voix** : la boussole et le suivi parlent. {settings} → Voix pour l\'éteindre.',
    '{vibrate} **Vibrer quand « Maintenant » a du nouveau** : éteint au départ ; {settings} pour l\'allumer. Une courte vibration, une fois par suggestion, seulement appli ouverte et écran allumé : ce n\'est pas un réveil.',
    '{zap} **Raccourcis** : appui long sur l\'icône de l\'appli. Métro, Autour de moi, Ajouter ici, Fontaine et WC.',
    '**Raccourcis absents ?** Sauvegarde, supprime l\'icône et réinstalle-la depuis Chrome (⋮ → Ajouter à l\'écran d\'accueil).',
    '{database} **Données de l\'appli** : {settings} → Appli. Chaque donnée a sa date.',
    '**En direct** : fontaines, toilettes, agenda, marchés, Vélib\' et météo se rechargent seuls.',
    '**Lignes, gares, Navigo, toilettes RATP, arrondissements et arrêts de bus** : un robot les refait le 1er de chaque mois. Il ne publie que si tout est correct.',
    '{rotate-cw} **Le lancer tout de suite** : Données de l\'appli → Lancer le robot maintenant, puis « Run workflow ». Ensuite : Appli → Mettre à jour l\'appli.',
    '**Monuments, marchés couverts et listes d\'expos** se refont avec Claude. Touche la ligne pour savoir quoi faire.',
    '**Un rappel** s\'affiche, une fois par semaine au plus, quand une donnée est en retard.',
    '{info} **Sorties → « Aide, sources et mise à jour »**, tout en bas : d\'où viennent les sorties. L\'agenda se recharge chaque jour, les marchés chaque semaine, les galeries chaque mois.',
    '**Gratuités et temps forts** sont des listes fixes. Sorties prévient quand elles sont à revoir ; Claude en prépare une chaque début septembre.',
    '**Les couleurs** : ardoise pour y aller, bleu pour le métro, terre cuite pour découvrir.',
    '**Et aussi** : vert pour ajouter, or pour les favoris, zinc pour les réglages, brique pour supprimer.',
    '**Les formes** : plaque pleine = l\'action principale ; contour = une autre action ; tampon = un état (ouvert, à faire).',
  ]],
  ['wrench', 'Ça ne marche pas ?', [
    '**Position refusée** : Chrome ⋮ → Paramètres → Paramètres des sites → Position. Autorise limopo74.github.io et allume la Position du téléphone.',
    '**Carte grise** : vérifie internet, puis {settings} → Appli → Recharger la carte.',
    '**Une nouveauté n\'apparaît pas** : {settings} → Appli → Mettre à jour l\'appli.',
    '**Un lien reçu ouvre une carte vide** : il s\'est ouvert dans le navigateur de Messages ou de WhatsApp. Appuie sur « Ouvrir dans Chrome ».',
    '**Pour que ça n\'arrive plus** : Paramètres du téléphone → Applis → Applis par défaut → Navigateur : Chrome.',
    '**Puis** Paramètres → Applis → Ma carte de Paris → Ouvrir par défaut : active « Ouvrir les liens compatibles ».',
    '**Dans Messages ou WhatsApp**, désactive « Ouvrir les liens dans l\'appli » s\'il existe. Les noms varient selon les téléphones.',
    '**Style Épuré vide ou avec un filigrane** : la clé CARTO manque ou est fausse. {settings} → Style de la carte → Clé CARTO.',
    '**La voix ne parle pas** : monte le volume, et vérifie {settings} → Voix.',
    '**Vélib\', Curiosités ou météo muets** : le service en ligne ne répond pas. Réessaie plus tard. Les plaques de Curiosités, les galeries et Art dans la rue, eux, sont dans l\'appli.',
    '{bike} **Une station Vélib\' sans nombre** (vélo gris) : les données ont plus de 10 min, ou la station n\'a rien envoyé depuis plus d\'une heure. Touche l\'heure en haut à gauche pour mettre à jour.',
    '{zoom-in} **Vélib\' ou fontaines allumés mais rien sur la carte** : rapproche-toi. Touche « Zoome pour voir… » en haut à gauche.',
    '**Copier ne marche pas** : le texte s\'affiche dans une fenêtre. Sélectionne-le et copie-le à la main.',
    '**TTB : « ce fichier ne contient pas d\'adresses »** : la page n\'a pas été enregistrée en entier. Ouvre-la depuis {settings} → TTB, attends la fin du chargement, puis Télécharger.',
    '**Boussole « indisponible »** : le téléphone ne donne pas son orientation. La flèche montre la direction, nord en haut.',
    '{bus} **« Les arrêts de bus ne sont pas encore chargés »** : le robot les ajoute le 1er du mois. Tout de suite : {settings} → Appli → Données de l\'appli → Lancer le robot maintenant, puis « Run workflow ».',
    '**Puis, quelques minutes après** : {settings} → Appli → Mettre à jour l\'appli.',
    '**Perdu sur la carte** : {locate-fixed} te ramène sur toi, Paris au centre.',
  ]],
  ['sparkles', 'Nouveautés', [
    '{notebook-pen} Note du jour : ⋯ Plus → Note du jour, pour écrire sans lieu. Une page par jour, que tu complètes en la rouvrant ; tes notes sont dans Mon journal, à leur date, et partent dans ta sauvegarde.',
    '{pencil} Mon planning → Aujourd\'hui : « Changer l\'ordre » devient « Modifier la liste », dès un lieu. Un × retire un lieu d\'aujourd\'hui (il reste sur ta carte ; « Annuler » dans le message).',
    '{train-front} Sortie de métro : plus de « Sortie 0 » ni de « Entrée / Sortie » ; quand la sortie n\'a ni numéro ni nom de rue, la fiche n\'en dit rien.',
    '{camera} Photos d\'un lieu en grand : avec plusieurs photos, glisse le doigt de côté pour passer à la suivante ou à la précédente. Le repère « 2 / 6 » dit où tu en es ; un appui ferme, comme avant.',
    '{map} Filtres → Arrondissement : une case ouvre maintenant la liste de tes lieux de l\'arrondissement, sous la carte, rangée par catégorie. Pour un autre arrondissement, touche-le sur la carte. Les boutons de catégories du haut filtrent la carte et la liste. La croix ferme la liste et tous tes lieux reviennent.',
    '{alarm-clock} Mon planning → Aujourd\'hui : note les lieux de ta journée (« Ajouter des lieux », ou Prévoir une visite → Aujourd\'hui, sans moment), range-les (« Modifier la liste »), puis va de l\'un à l\'autre : Y aller, Boussole, Métro, et « Fait » quand tu y es passé. De 2 à 4 lieux, « Tout le parcours · Google Maps ». Le lendemain, la liste se vide toute seule.',
    '{train-front} Station montre aussi les gares de RER et les arrêts de tram à moins de 1,5 km ; Rentrer dit quand l\'un d\'eux est nettement plus près que le métro. La fiche d\'un lieu dit « horaires notés en … » quand ses horaires ont plus d\'un an. Les gares arrivent avec la prochaine mise à jour des données.',
    '{alarm-clock} Moins de déplacements ratés : la fiche dit la sortie de métro la plus proche du lieu ; Prévoir dit quand le lieu est gratuit dans les 5 semaines ; « Non » à « Tu y es allé ? » garde une expo encore à l\'affiche, avec « Prévoir un autre jour ». Les sorties du métro arrivent avec la prochaine mise à jour des données.',
    '{landmark} Apprendre la ville : Où suis-je ? dit l\'origine du nom de la rue ; la loupe trouve les plaques commémoratives qui portent un nom (essaie « Colette ») ; Monuments donne l\'auteur et la date d\'un édifice, et « Du même auteur ». Les origines et les auteurs arrivent avec la prochaine mise à jour des données.',
    '{footprints} Rues sans voitures : dans Autour de moi → Itinéraire, les secteurs « Paris Respire » prévus aujourd\'hui ou le prochain jour, avec leurs heures et leur contour sur la carte. Le week-end, « Maintenant » signale celui qui est à 10 min à pied. Toujours « prévu » : la Ville peut ajourner. Les contours arrivent avec la prochaine mise à jour des données.',
  ]],
];

/** Une ligne d'aide : {icône} devient une icône Lucide, **mots** du gras (v145). Texte toujours en texte brut. */
function helpLine(l) {
  return l.split(/(\*\*[^*]+\*\*|\{[a-z0-9-]+\})/).filter(Boolean).map((part) => {
    if (/^\{[a-z0-9-]+\}$/.test(part)) { const n = part.slice(1, -1); return ICON_NAMES.has(n) ? ico(n, { size: 17 }) : ''; }
    if (/^\*\*[^*]+\*\*$/.test(part)) return el('strong', {}, ...helpLine(part.slice(2, -2)));
    return part;
  });
}
function openHelp() {
  openSheet([ico('circle-help'), ' Aide'], el('div', { class: 'stack' },
    el('p', { class: 'help' }, 'Touche un sujet pour l\'ouvrir.'),
    el('div', { class: 'help-list' }, HELP.map(([icon, title, lines]) => el('details', { class: 'help-item' },
      el('summary', {}, el('span', { class: 'menu-ico help-ico', 'aria-hidden': 'true' }, ico(icon)), el('span', { class: 'help-title' }, title)),
      el('ul', {}, lines.map((l) => el('li', {}, ...helpLine(l))))))),
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
if (state.showPratique) loadPratLayer();
loadArcades().then(drawArcadeLayer); // petit fichier de l'appli : prêt pour Curiosités et le bandeau « Il pleut »
drawLayerNote();
drawTtb();
// « Dans la rue, à 5 min » (v158) : l'agenda du jour est chargé une fois par jour à l'ouverture (aucune position envoyée)
setTimeout(() => { if (navigator.onLine) todayEvents().then(() => updateNow(true)).catch(() => {}); }, 4000);
// Échap ferme la feuille ouverte (ou la boussole, la photo en grand)
document.addEventListener('keydown', (e) => {
  if (viewerOpen && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { stepViewer(e.key === 'ArrowRight' ? 1 : -1); return; } /* photos en grand : flèches du clavier */
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  if (!document.getElementById('viewer')?.hidden) { history.back(); return; }
  if (!document.getElementById('compass')?.hidden) { history.back(); return; }
  if (!sheet.hidden) { e.preventDefault(); closeSheet(); }
});

renderChips();
renderMarkers();
if (state.points.length) {
  map.fitBounds(L.latLngBounds(state.points.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 15, animate: false });
} else if (state.ok && !/(lieu|balade|rdv|ouvrir)=/.test(location.hash + location.search)) { // pas par-dessus un lien reçu
  // Carte vide : premier lancement, ou lieux effacés avec les données de Chrome. La restauration est proposée tout de suite.
  openSheet('Ta carte est vide', el('div', { class: 'stack' },
    el('p', {}, 'Tu avais déjà des lieux ? Ils ont pu être effacés avec les données de Chrome. Ta sauvegarde est dans tes Téléchargements : « Ma carte de Paris - sauvegarde du … ».'),
    el('button', { type: 'button', class: 'btn c-add solid', onclick: () => pickImport('mine') }, ico('upload'), 'Restaurer ma sauvegarde'),
    el('button', { type: 'button', class: 'btn c-add', onclick: () => { closeSheet(); openAddChoice(); } }, ico('plus'), 'Ajouter mon premier lieu'),
    el('p', { class: 'help' }, 'Tu peux aussi laisser le doigt appuyé sur la carte. L\'aide est en tête des Réglages, en bas à gauche.'),
  ), { name: 'vide' });
}
if (!state.ok) toast('Le stockage de ce téléphone n\'est pas lisible : pense à sauvegarder tes lieux.', true);
updateSettingsDot(); // pastille de sauvegarde à l'ouverture (3 jours passés : due même sans nouveau changement)

const launched = location.search.length > 1 || /(lieu|balade|rdv)=/.test(location.hash);
runLaunchAction();
if (!launched && state.ok && backupDue(state)) {
  let last = 0;
  try { last = Number(storage.getItem('carte-paris.rappel-sauvegarde')) || 0; } catch { /* rien */ }
  if (Date.now() - last > 864e5) { // au plus une fois par jour
    try { storage.setItem('carte-paris.rappel-sauvegarde', String(Date.now())); } catch { /* rien */ }
    remindBackup();
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  // Demande au navigateur de ne pas effacer tes lieux et la carte gardée quand le téléphone manque de place
  navigator.storage?.persist?.().catch(() => {});
}

// « Maintenant » : la croix cache la suggestion ; si la position est déjà autorisée, on la lit
// discrètement au lancement (rien n'est envoyé), puis la suggestion est revue toutes les 5 minutes.
document.querySelector('#nowCard .now-close').addEventListener('click', () => {
  // « Gratuit … » : caché pour la journée seulement, la suggestion habituelle reprend sa place
  if (document.getElementById('nowCard').dataset.kind === 'free') { try { storage.setItem(FREE_SEEN_KEY, new Date().toDateString()); } catch { /* facultatif */ } } else nowHidden = true;
  updateNow(true);
});
let markersDay = new Date().toDateString(); // à minuit, les pastilles agenda des épingles changent
setInterval(() => { updateNow(true); drawWx(); updatePlanningCount(); if (new Date().toDateString() !== markersDay) { markersDay = new Date().toDateString(); dropStaleDayList(); renderMarkers(); } }, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveJournal(true); });
drawWx(); // le rappel dimanche / férié s'affiche même sans réseau (appelé ici, une fois tout déclaré)
// Liste des marchés (gardée une semaine sur le téléphone) : pour que « Maintenant » propose un marché le matin
loadMarkets().then(() => updateNow(true)).catch(() => {});
if (dropStaleDayList()) renderMarkers(); // la liste du jour d'hier s'efface sans question (v201)
updatePlanningCount();
refreshParkHours().catch(() => {}); // horaires de la Ville pour mes parcs (liste sans position, gardée un jour)
// Fichiers de l'appli (rien n'est envoyé) : Navigo pour les fiches ; une fois toutes les dates connues, le rappel groupé
Promise.all([stationsReady, loadNavigo(), loadRatpToilets(), loadMerimee()]).then(remindData).catch(() => {});
// Ouvrir sur ma position (v176, Réglages → La carte, allumé au départ) : seulement si la position est déjà autorisée
// (rien n'est demandé), récente, précise, dans Paris, arrivée dans les 2 s, et si je n'ai ni touché la carte ni ouvert
// un lien. Le point bleu s'efface au bout de 2 min : il ne suit pas mes pas, il ne doit jamais montrer une position fausse.
const startedAt = Date.now();
let mapTouched = false;
map.getContainer().addEventListener('pointerdown', () => { mapTouched = true; }, { once: true });
function startOnMe(fix, age) {
  if (state.startOnMe === false || mapTouched || launched || following || Date.now() - startedAt > 2000) return;
  if (age > 30000 || !(fix.acc <= 150) || !(fix.lat > 48.80 && fix.lat < 48.92 && fix.lng > 2.22 && fix.lng < 2.48)) return;
  centerOn(fix.lat, fix.lng, 16);
  meShown = fix;
  drawMe();
  setTimeout(() => { if (!following && meShown === fix) { meShown = null; drawMe(); } }, 120000);
}
if (navigator.permissions && 'geolocation' in navigator) {
  navigator.permissions.query({ name: 'geolocation' }).then((perm) => {
    if (perm.state === 'granted') navigator.geolocation.getCurrentPosition((pos) => {
      const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, time: Date.now() };
      remember(fix);
      startOnMe(fix, Date.now() - (pos.timestamp || 0));
    }, () => {}, { enableHighAccuracy: false, maximumAge: 120000, timeout: 15000 });
  }).catch(() => {});
}
// Tes lieux n'existent que sur ce téléphone : on demande qu'ils ne soient jamais effacés automatiquement (manque de place).
askPersist();
