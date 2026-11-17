// Fonctions sans interface pour : partage d'un lieu par lien, temps libre (boucle), import Google Maps,
// doublons, Wikipédia, arrondissements, Vélib' et météo. Tout est testé dans tests/explore.test.mjs.
import { distanceM } from './geo.js';
import { fold } from './search.js';

/* ---------- 1. Partager un lieu par lien (dans le #, jamais envoyé au serveur) ---------- */

const b64url = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
const r5 = (x) => Math.round(x * 1e5) / 1e5;

/** Lien vers l'appli qui contient le lieu (nom, adresse, position, note, catégorie, mot). */
export function placeLink(base, p, catName = '', catIcon = '', { invite = false } = {}) {
  const o = { v: 1, n: p.name, y: r5(p.lat), x: r5(p.lng) };
  if (invite && Number.isFinite(p.ticket?.at)) o.t = Math.round(p.ticket.at / 60000); // invitation : jour et heure, à la minute
  if (invite && typeof invite === 'string') o.w = invite.slice(0, 30); // invitation : le prénom de qui invite
  if (p.address) o.a = p.address;
  if (catName) o.c = catName;
  if (catIcon) o.i = catIcon;
  if (p.stars) o.s = p.stars;
  if (p.note) o.o = String(p.note).slice(0, 300);
  if (p.hours) o.h = p.hours;
  return `${base.split('#')[0]}#lieu=${b64url(JSON.stringify(o))}`;
}

/** Lit un lien reçu. Renvoie null s'il est abîmé ou hors de l'Île-de-France. */
export function readPlaceLink(hash) {
  const m = /(?:^|[#&])lieu=([\w-]+)/.exec(hash ?? '');
  if (!m) return null;
  try {
    const o = JSON.parse(unb64url(m[1]));
    const lat = Number(o.y);
    const lng = Number(o.x);
    const name = String(o.n ?? '').trim().slice(0, 80);
    if (!name || !(lat > 48 && lat < 49.5) || !(lng > 1.4 && lng < 3.6)) return null;
    const stars = Number.isInteger(o.s) && o.s >= 1 && o.s <= 5 ? o.s : 0;
    const at = Number.isInteger(o.t) ? o.t * 60000 : NaN; // invitation : gardée seulement si elle n'est pas déjà passée (ni absurde)
    const ticketAt = at > Date.now() - 864e5 && at < Date.now() + 400 * 864e5 ? at : null;
    const withName = ticketAt && typeof o.w === 'string' ? o.w.trim().slice(0, 30) : '';
    return {
      name, lat, lng, stars, ticketAt, withName,
      address: String(o.a ?? '').slice(0, 200), catName: String(o.c ?? '').slice(0, 30), catIcon: String(o.i ?? ''),
      note: String(o.o ?? '').slice(0, 300), hours: String(o.h ?? '').slice(0, 300),
    };
  } catch { return null; }
}

/* ---------- 2. J'ai du temps libre : une boucle qui revient au départ ---------- */

const MIN_PER_M = (12 / 1000) * 1.3; // 12 min/km, rues 1,3 fois plus longues que la ligne droite
const walkMin = (a, b) => distanceM(a, b) * MIN_PER_M;
const loopWalk = (start, route) => {
  let t = 0; let prev = start;
  for (const p of route) { t += walkMin(prev, p); prev = p; }
  return route.length ? t + walkMin(prev, start) : 0;
};

/**
 * Choisit des lieux à faire pour une boucle qui tient dans `minutes` (marche + `dwell` min sur place),
 * en insérant à chaque fois le lieu qui coûte le moins de temps. Les lieux mieux notés passent devant à égalité.
 */
export function planLoop(start, candidates, minutes, { dwell = 15, maxStops = 8 } = {}) {
  let route = [];
  const left = [...candidates];
  for (;;) {
    if (route.length >= maxStops) break;
    let best = null;
    for (const c of left) {
      for (let k = 0; k <= route.length; k++) {
        const r = [...route.slice(0, k), c, ...route.slice(k)];
        const total = loopWalk(start, r) + dwell * r.length;
        if (total > minutes) continue;
        const score = total - (c.stars ?? 0) * 0.5 - (c.fav ? 1 : 0);
        if (!best || score < best.score) best = { r, c, score };
      }
    }
    if (!best) break;
    route = best.r;
    left.splice(left.indexOf(best.c), 1);
  }
  const walk = Math.round(loopWalk(start, route));
  return { route, walk, total: walk + dwell * route.length };
}

/** Lien Google Maps à pied : par les lieux puis retour au départ (9 étapes au plus). */
export function loopUrl(start, route) {
  const ll = (p) => `${r5(p.lat)},${r5(p.lng)}`;
  const u = new URL('https://www.google.com/maps/dir/');
  u.search = new URLSearchParams({ api: '1', origin: ll(start), destination: ll(start), travelmode: 'walking', waypoints: route.slice(0, 9).map(ll).join('|') });
  return u.toString();
}

/* ---------- 5. Import des lieux enregistrés dans Google Maps (Google Takeout) ---------- */

/** Coordonnées lisibles dans un lien Google Maps, ou null. */
export function coordsFromUrl(url) {
  const s = String(url ?? '');
  const pats = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /@(-?\d+\.\d+),(-?\d+\.\d+)/, /[?&](?:q|query|ll)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i];
  for (const re of pats) {
    const m = re.exec(s);
    if (m) {
      const lat = Number(m[1]); const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng)) return { lat, lng };
    }
  }
  return null;
}

/** Découpe un CSV (guillemets et retours à la ligne dans les champs compris). */
export function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  const t = String(text).replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(f); f = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else f += ch;
  }
  row.push(f);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

/**
 * Lit un fichier de Google Takeout : « Saved Places.json » (GeoJSON) ou une liste « …csv ».
 * Renvoie { list, items: [{ name, address, note, lat, lng }] } ; lat/lng sont null quand il faut chercher l'adresse.
 */
export function parseTakeout(text, filename = '') {
  const list = String(filename).replace(/^.*[\\/]/, '').replace(/\.(csv|json|geojson)$/i, '').trim();
  const trimmed = String(text).trim();
  if (trimmed.startsWith('{')) {
    const o = JSON.parse(trimmed);
    if (!Array.isArray(o.features)) throw new Error('Ce fichier JSON ne vient pas de Google Maps.');
    const items = o.features.map((f) => {
      const pr = f.properties ?? {};
      const loc = pr.Location ?? pr.location ?? {};
      const [lng, lat] = Array.isArray(f.geometry?.coordinates) ? f.geometry.coordinates.map(Number) : [0, 0];
      const name = String(pr.Title ?? pr.name ?? loc['Business Name'] ?? loc.name ?? '').trim();
      const url = pr['Google Maps URL'] ?? pr.google_maps_url ?? '';
      const c = lat || lng ? { lat, lng } : coordsFromUrl(url);
      return { name, address: String(loc.Address ?? loc.address ?? pr.address ?? ''), note: String(pr.Comment ?? pr.note ?? ''), lat: c?.lat ?? null, lng: c?.lng ?? null };
    }).filter((x) => x.name || x.address);
    return { list: list === 'Saved Places' ? 'Google Maps' : list, items };
  }
  const rows = parseCsv(trimmed);
  if (!rows.length) return { list, items: [] };
  const head = rows[0].map((h) => fold(h));
  const col = (...names) => head.findIndex((h) => names.includes(h));
  const iT = col('title', 'titre', 'nom', 'name'); const iN = col('note', 'notes'); const iU = col('url', 'lien'); const iC = col('comment', 'commentaire');
  if (iT < 0) throw new Error('Ce fichier CSV ne ressemble pas à une liste Google Maps (colonne « Title » absente).');
  const items = rows.slice(1).map((r) => {
    const c = coordsFromUrl(r[iU] ?? '');
    return { name: String(r[iT] ?? '').trim(), address: '', note: [r[iN], r[iC]].filter(Boolean).join(' — '), lat: c?.lat ?? null, lng: c?.lng ?? null };
  }).filter((x) => x.name);
  return { list, items };
}

/* ---------- 6. Doublons ---------- */

/** Lieu déjà enregistré qui ressemble au nouveau : même endroit (≤ 12 m) ou nom proche à moins de 60 m. */
export function findDuplicate(points, cand, ignoreId = null) {
  const n = fold(cand.name);
  let best = null;
  for (const p of points) {
    if (p.id === ignoreId) continue;
    const d = distanceM(p, cand);
    if (d > 60) continue;
    const pn = fold(p.name);
    const similar = n && pn && (pn === n || pn.includes(n) || n.includes(pn));
    if ((d <= 12 || similar) && (!best || d < best.d)) best = { point: p, d };
  }
  return best;
}

/* ---------- 7. Wikipédia : ce qu'il y a d'intéressant autour ---------- */

/** Recherche d'articles autour d'un point (position arrondie à 100 m environ). */
export function wikiUrl(lat, lng, radius = 1000) {
  const u = new URL('https://fr.wikipedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', list: 'geosearch', gscoord: `${lat.toFixed(3)}|${lng.toFixed(3)}`, gsradius: String(Math.min(10000, radius)), gslimit: '30', format: 'json', origin: '*' });
  return u.toString();
}

export function parseWiki(json) {
  const list = json?.query?.geosearch;
  if (!Array.isArray(list)) return [];
  return list.filter((g) => g.title && Number.isFinite(g.lat) && Number.isFinite(g.lon) && !/^(Liste|Arrondissement|Quartier) /i.test(g.title))
    .map((g) => ({ title: String(g.title), lat: g.lat, lng: g.lon, pageid: g.pageid }));
}

export const wikiPage = (title) => `https://fr.m.wikipedia.org/wiki/${encodeURIComponent(String(title).replace(/ /g, '_'))}`;

/* ---------- 8. Paris à colorier ---------- */

/** Numéro d'arrondissement (1 à 20) lu dans une adresse (code postal 75001…75020, 75116), ou null. */
export function arrFromText(text) {
  const m = /\b75(0(\d\d)|116)\b/.exec(String(text ?? ''));
  if (!m) return null;
  const n = m[1] === '116' ? 16 : Number(m[2]);
  return n >= 1 && n <= 20 ? n : null;
}

/** Numéro d'arrondissement lu dans un code commune INSEE (75101…75120), ou null. */
export function arrFromCitycode(code) {
  const m = /^751(\d\d)$/.exec(String(code ?? ''));
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 20 ? n : null;
}

/** Arrondissement (1 à 20) d'une position, d'après les contours de data/arrondissements.json ({ arr: [{ n, rings }] }), ou null
 * hors de Paris. Calculé sur le téléphone : rien n'est envoyé. */
export function arrAt(lat, lng, data) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const a of Array.isArray(data?.arr) ? data.arr : []) {
    for (const ring of a.rings ?? []) if (inRing(lng, lat, ring)) return a.n;
  }
  return null;
}
/** Point dans un polygone (règle pair-impair), coordonnées [lng, lat]. */
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Position de chaque arrondissement dans une grille schématique (colonne, rangée), proche de la carte réelle. */
export const ARR_GRID = {
  17: [1, 0], 18: [2, 0], 19: [3, 0],
  16: [0, 1], 8: [1, 1], 9: [2, 1], 10: [3, 1], 20: [4, 1],
  7: [1, 2], 1: [2, 2], 2: [3, 2], 3: [4, 2], 11: [5, 2],
  15: [0, 3], 6: [1, 3], 5: [2, 3], 4: [3, 3], 12: [4, 3],
  14: [1, 4], 13: [2, 4],
};

/* ---------- 11. Vélib' en temps réel (données ouvertes GBFS) ---------- */

const VELIB = 'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/';
export const VELIB_INFO = `${VELIB}station_information.json`;
export const VELIB_STATUS = `${VELIB}station_status.json`;

/** Assemble la liste des stations et leur état. */
export function mergeVelib(info, status) {
  const st = new Map((status?.data?.stations ?? []).map((s) => [String(s.station_id), s]));
  return (info?.data?.stations ?? []).map((s) => {
    const x = st.get(String(s.station_id)) ?? {};
    const types = x.num_bikes_available_types ?? [];
    const pick = (k) => types.reduce((n, t) => n + (Number(t?.[k]) || 0), 0);
    return {
      id: String(s.station_id), name: String(s.name ?? ''), lat: Number(s.lat), lng: Number(s.lon),
      bikes: Number(x.num_bikes_available ?? x.numBikesAvailable ?? 0), mech: pick('mechanical'), ebike: pick('ebike'),
      docks: Number(x.num_docks_available ?? x.numDocksAvailable ?? 0), open: x.is_renting === 1 || x.is_renting === true || x.is_renting === undefined,
    };
  }).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

/* Vélib' via Paris Data (opendata.paris.fr) : mis à jour chaque minute et lisible depuis un navigateur,
   contrairement au flux Smovengo qui refuse les appels venant d'un site web. Aucune position n'est envoyée. */
export const VELIB_PARIS = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/exports/json'
  + '?select=stationcode,name,numbikesavailable,mechanical,ebike,numdocksavailable,is_renting,coordonnees_geo';

const yes = (v) => v === true || v === 1 || v === '1' || String(v).toUpperCase() === 'OUI';

/** Lignes Paris Data -> même forme que mergeVelib. */
export function parseVelibParis(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    id: String(r?.stationcode ?? ''), name: String(r?.name ?? ''),
    lat: Number(r?.coordonnees_geo?.lat), lng: Number(r?.coordonnees_geo?.lon),
    bikes: Number(r?.numbikesavailable) || 0, mech: Number(r?.mechanical) || 0, ebike: Number(r?.ebike) || 0,
    docks: Number(r?.numdocksavailable) || 0, open: r?.is_renting == null ? true : yes(r.is_renting),
  })).filter((s) => s.name && Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

/** Les stations les plus proches qui ont des vélos (need='bike') ou des places (need='dock'). */
export function nearestVelib(stations, here, need = 'bike', k = 3) {
  return stations.filter((s) => s.open && (need === 'dock' ? s.docks > 0 : s.bikes > 0))
    .map((s) => ({ ...s, d: distanceM(here, s) })).sort((a, b) => a.d - b.d).slice(0, k);
}

/* ---------- 12. Météo (Open-Meteo, sans clé) ---------- */

export function meteoUrl(lat = 48.857, lng = 2.352) {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({ latitude: lat.toFixed(2), longitude: lng.toFixed(2), current: 'precipitation,weather_code,temperature_2m', timezone: 'Europe/Paris' });
  return u.toString();
}

/** Prévisions jour par jour pour Paris (centre de Paris : aucune position n'est envoyée), 8 jours. */
export function forecastUrl() {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({ latitude: '48.86', longitude: '2.35', daily: 'weather_code,temperature_2m_max,precipitation_probability_max', forecast_days: '8', timezone: 'Europe/Paris' });
  return u.toString();
}
/** { 'AAAA-MM-JJ': { rain, prob, tmax } } d'après la réponse (objet vide si illisible). */
export function readForecast(json) {
  const d = json?.daily;
  const out = {};
  if (!d || !Array.isArray(d.time)) return out;
  d.time.forEach((day, i) => {
    if (typeof day !== 'string') return;
    const prob = Number(d.precipitation_probability_max?.[i]);
    const tmax = Number(d.temperature_2m_max?.[i]);
    out[day] = { prob: Number.isFinite(prob) ? prob : null, tmax: Number.isFinite(tmax) ? Math.round(tmax) : null, rain: RAIN.has(Number(d.weather_code?.[i])) };
  });
  return out;
}
/** Ce qui compte pour une sortie ce jour-là : pluie (sauf lieu abrité) ou chaleur. '' si rien à signaler. */
export function planWeather(f, covered = false) {
  if (!f) return '';
  const wet = !covered && ((f.prob ?? 0) >= 50 || (f.rain && (f.prob ?? 50) >= 40));
  const hot = (f.tmax ?? 0) >= 28;
  return [wet ? `Pluie probable${f.prob != null ? ` (${f.prob} %)` : ''}` : '', hot ? `Chaud : ${f.tmax}°` : ''].filter(Boolean).join(' · ');
}

const RAIN = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
/** { rain, temp } d'après la réponse, ou null si elle est illisible. */
export function readMeteo(json) {
  const c = json?.current;
  if (!c || typeof c !== 'object') return null;
  const rain = Number(c.precipitation) >= 0.1 || RAIN.has(Number(c.weather_code));
  return { rain, temp: Number.isFinite(c.temperature_2m) ? Math.round(c.temperature_2m) : null };
}

/* ---------- Balade partagée et rendez-vous (dans le #, jamais envoyés au serveur) ---------- */

/** Lien vers une balade : liste d'étapes { name, lat, lng } (12 au plus). */
export function routeLink(base, stops, title = '') {
  const o = { v: 1, t: String(title).slice(0, 60), s: stops.slice(0, 12).map((p) => [String(p.name ?? '').slice(0, 60), r5(p.lat), r5(p.lng)]) };
  return `${base.split('#')[0]}#balade=${b64url(JSON.stringify(o))}`;
}
export function readRouteLink(hash) {
  const m = /(?:^|[#&])balade=([\w-]+)/.exec(hash ?? '');
  if (!m) return null;
  try {
    const o = JSON.parse(unb64url(m[1]));
    const stops = (Array.isArray(o.s) ? o.s : []).slice(0, 12).map(([n, lat, lng]) => ({ name: String(n ?? '').trim().slice(0, 60) || 'Étape', lat: Number(lat), lng: Number(lng) }))
      .filter((p) => p.lat > 48 && p.lat < 49.5 && p.lng > 1.4 && p.lng < 3.6);
    return stops.length ? { title: String(o.t ?? '').slice(0, 60), stops } : null;
  } catch { return null; }
}

/** Lien « Rejoins-moi » : une position envoyée une seule fois. */
export function meetLink(base, at, name = '') {
  return `${base.split('#')[0]}#rdv=${b64url(JSON.stringify({ v: 1, n: String(name).slice(0, 40), y: r5(at.lat), x: r5(at.lng), t: Math.round((at.time ?? Date.now()) / 60000) }))}`;
}
export function readMeetLink(hash) {
  const m = /(?:^|[#&])rdv=([\w-]+)/.exec(hash ?? '');
  if (!m) return null;
  try {
    const o = JSON.parse(unb64url(m[1]));
    const lat = Number(o.y); const lng = Number(o.x);
    if (!(lat > 48 && lat < 49.5 && lng > 1.4 && lng < 3.6)) return null;
    return { name: String(o.n ?? '').trim().slice(0, 40), lat, lng, time: Number.isFinite(o.t) ? o.t * 60000 : null };
  } catch { return null; }
}

/* ---------- Temps libre qui respecte les horaires ---------- */

/**
 * Comme planLoop, mais chaque étape doit être ouverte à l'heure d'arrivée : isOpen(lieu, minutesDepuisMaintenant)
 * renvoie true (ouvert), false (fermé) ou null (horaires inconnus : accepté).
 */
export function planLoopOpen(start, candidates, minutes, isOpen, opts = {}) {
  const { dwell = 15 } = opts;
  const fits = (route) => {
    let t = 0; let prev = start;
    for (const p of route) {
      t += walkMin(prev, p);
      if (isOpen(p, t) === false || isOpen(p, t + Math.min(dwell, 5)) === false) return false;
      t += dwell; prev = p;
    }
    return true;
  };
  const ok = candidates.filter((c) => isOpen(c, walkMin(start, c)) !== false);
  const res = planLoopWith(start, ok, minutes, { ...opts, fits });
  return { ...res, closed: candidates.length - ok.length };
}

function planLoopWith(start, candidates, minutes, { dwell = 15, maxStops = 8, fits = () => true } = {}) {
  let route = [];
  const left = [...candidates];
  for (;;) {
    if (route.length >= maxStops) break;
    let best = null;
    for (const c of left) {
      for (let k = 0; k <= route.length; k++) {
        const r = [...route.slice(0, k), c, ...route.slice(k)];
        const total = loopWalk(start, r) + dwell * r.length;
        if (total > minutes || !fits(r)) continue;
        const score = total - (c.stars ?? 0) * 0.5 - (c.fav ? 1 : 0);
        if (!best || score < best.score) best = { r, c, score };
      }
    }
    if (!best) break;
    route = best.r;
    left.splice(left.indexOf(best.c), 1);
  }
  const walk = Math.round(loopWalk(start, route));
  return { route, walk, total: walk + dwell * route.length };
}

/* ---------- Ajouter un lieu depuis une photo : position GPS lue dans l'EXIF ---------- */

/** Position GPS d'une photo JPEG (ArrayBuffer), ou null. Lu sur le téléphone, rien n'est envoyé. */
export function gpsFromJpeg(buf) {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off);
    const size = v.getUint16(off + 2);
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return readExifGps(v, off + 10);
    if ((marker & 0xff00) !== 0xff00 || size < 2) return null;
    off += 2 + size;
  }
  return null;
}

function readExifGps(v, tiff) {
  if (tiff + 8 > v.byteLength) return null;
  const le = v.getUint16(tiff) === 0x4949;
  const u16 = (o) => v.getUint16(o, le);
  const u32 = (o) => v.getUint32(o, le);
  const ifd0 = tiff + u32(tiff + 4);
  let gpsIfd = null;
  for (let i = 0, n = u16(ifd0); i < n; i++) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > v.byteLength) return null;
    if (u16(e) === 0x8825) gpsIfd = tiff + u32(e + 8);
  }
  if (gpsIfd == null || gpsIfd + 2 > v.byteLength) return null;
  const tags = {};
  for (let i = 0, n = u16(gpsIfd); i < n; i++) {
    const e = gpsIfd + 2 + i * 12;
    if (e + 12 > v.byteLength) break;
    const tag = u16(e); const type = u16(e + 2); const count = u32(e + 4);
    if (type === 2) tags[tag] = String.fromCharCode(v.getUint8(count <= 4 ? e + 8 : tiff + u32(e + 8)));
    if (type === 5 && count === 3) {
      const at = tiff + u32(e + 8);
      if (at + 24 > v.byteLength) continue;
      const r = (k) => { const d = u32(at + k * 8 + 4); return d ? u32(at + k * 8) / d : 0; };
      tags[tag] = r(0) + r(1) / 60 + r(2) / 3600;
    }
  }
  if (typeof tags[2] !== 'number' || typeof tags[4] !== 'number') return null;
  const lat = tags[2] * (tags[1] === 'S' ? -1 : 1);
  const lng = tags[4] * (tags[3] === 'W' ? -1 : 1);
  if (!lat && !lng) return null;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/* ---------- Monuments historiques (Wikidata : protégés MH dans Paris, avec site officiel) ----------
   Une seule requête pour tout Paris (aucune position envoyée), gardée sur le téléphone. */
const HIST_SPARQL = `SELECT ?item ?itemLabel ?coord ?site ?merimee ?article WHERE {
?item wdt:P380 ?merimee . FILTER(STRSTARTS(?merimee, "PA"))
SERVICE wikibase:box { ?item wdt:P625 ?coord .
bd:serviceParam wikibase:cornerSouthWest "Point(2.224 48.815)"^^geo:wktLiteral .
bd:serviceParam wikibase:cornerNorthEast "Point(2.470 48.903)"^^geo:wktLiteral . }
OPTIONAL { ?item wdt:P856 ?site }
OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". } }`;
export const HIST_URL = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(HIST_SPARQL)}`;

const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? u : '');

/** Réponse Wikidata -> [{ id, name, lat, lng, site, merimee, wiki }], un seul par monument. */
export function parseHist(json) {
  const out = new Map();
  for (const b of json?.results?.bindings ?? []) {
    const id = String(b?.item?.value ?? '').split('/').pop();
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b?.coord?.value ?? '');
    const name = String(b?.itemLabel?.value ?? '');
    if (!id || !m || !name || /^Q\d+$/.test(name)) continue; // sans nom français ni anglais : on saute
    const prev = out.get(id);
    const site = safeUrl(b?.site?.value);
    if (prev) { if (!prev.site || (site.startsWith('https') && !prev.site.startsWith('https'))) prev.site = site || prev.site; continue; }
    out.set(id, {
      id, name, lat: Number(m[2]), lng: Number(m[1]), site,
      merimee: /^PA\w+$/.test(b?.merimee?.value ?? '') ? b.merimee.value : '',
      wiki: safeUrl(b?.article?.value),
    });
  }
  return [...out.values()].filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
}

/** Fiche officielle du ministère de la Culture (base Mérimée, plateforme POP). */
export const merimeeUrl = (ref) => `https://www.pop.culture.gouv.fr/notice/merimee/${ref}`;

/* ---------- Mérimée : protection, siècle, type et musée d'un monument (data/merimee.json, refait par tools/maj-merimee.py) ---------- */

/** Fichier de l'appli -> { updated, items: Map(référence PA -> { p, s, t, f, m }) }. */
export function parseMerimee(json) {
  const items = new Map();
  const src = json?.items && typeof json.items === 'object' ? json.items : {};
  const str = (v) => (typeof v === 'string' ? v.slice(0, 80) : '');
  for (const [ref, x] of Object.entries(src)) {
    if (!/^PA\w{8}$/.test(ref) || !x || typeof x !== 'object') continue;
    items.set(ref, { p: str(x.p), s: str(x.s), t: str(x.t), f: str(x.f), m: Array.isArray(x.m) ? x.m.map(str).filter(Boolean).slice(0, 3) : [] });
  }
  return { updated: typeof json?.updated === 'string' ? json.updated : '', items };
}

/** « Classé · 17e siècle · église » et « façade seulement » ; '' si rien n'est connu. */
export function merimeeLine(x) {
  if (!x) return '';
  const prot = x.p === 'C' ? 'Classé' : x.p === 'I' ? 'Inscrit' : '';
  return [prot, x.s, x.t, x.f ? `${x.f} seulement` : ''].filter(Boolean).join(' · ');
}

/** « Se visite : Musée Carnavalet » quand le monument abrite un musée de France ; '' sinon. */
export const museumLine = (x) => (x?.m?.length ? `Se visite : ${x.m.join(', ')}` : '');
