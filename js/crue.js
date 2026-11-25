/* v502 (mes choix 7 A et 9 A du 25 nov.) : la hauteur de la Seine à Paris, station d'Austerlitz (F700000103, la station
   de référence de Vigicrues), lue sur Hub'Eau (eaufrance, données publiques, sans clé). Aucune position envoyée.
   Règle de l'appli : pas d'information plutôt qu'une fausse. Rien si la dernière mesure a plus de 2 h ou si la réponse est
   bizarre. Pas de repère de 1910 (les sources ne s'accordent pas sur la hauteur exacte). */

export const SEINE_STATION = 'F700000103';
export const SEINE_URL = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=${SEINE_STATION}&grandeur_hydro=H&size=90&sort=desc&fields=date_obs,resultat_obs`;
export const VIGICRUES = 'https://www.vigicrues.gouv.fr/';
export const SEINE_MAX_AGE = 2 * 3600 * 1000;
const TREND_HOURS = 6;
const TREND_CM = 10; // en dessous de 10 cm en 6 h : « stable » (les mesures sautent de quelques cm au passage des bateaux)

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** Lit la réponse Hub'Eau : { m (mètres, au cm), at (ms), trend: 'monte' | 'baisse' | 'stable' | null } ou null. */
export function readSeine(json, now = Date.now()) {
  const rows = (json?.data ?? [])
    .map((o) => ({ at: Date.parse(o?.date_obs), mm: o?.resultat_obs }))
    .filter((o) => Number.isFinite(o.at) && typeof o.mm === 'number' && Number.isFinite(o.mm) && o.mm > -500 && o.mm < 12000)
    .sort((a, b) => b.at - a.at);
  if (!rows.length) return null;
  const last = rows[0];
  if (now - last.at > SEINE_MAX_AGE || last.at - now > 10 * 60 * 1000) return null;
  const head = med(rows.slice(0, 3).map((o) => o.mm));
  const old = rows.filter((o) => last.at - o.at >= TREND_HOURS * 3600 * 1000 - 5 * 60 * 1000);
  let trend = null;
  if (old.length) {
    const d = (head - med(old.slice(0, 3).map((o) => o.mm))) / 10; // cm
    trend = d >= TREND_CM ? 'monte' : d <= -TREND_CM ? 'baisse' : 'stable';
  }
  return { m: Math.round(head / 10) / 100, at: last.at, trend };
}

/** « 1,09 m » */
export const seineText = (s) => `${s.m.toFixed(2).replace('.', ',')} m`;
/** « en hausse sur 6 h » */
export const seineTrend = (s) => (s.trend === 'monte' ? 'en hausse sur 6 h' : s.trend === 'baisse' ? 'en baisse sur 6 h' : s.trend === 'stable' ? 'stable sur 6 h' : '');

/* v503 (mes choix 8 A et 23 A du 25 nov.) : la zone inondable du PPRI de Paris (crue de référence de 1910), réunie par le
   robot des données (tools/maj-ppri.py, data/ppri.json). Tout se calcule sur le téléphone : aucune position envoyée. */

/** Lit data/ppri.json : { zones: [{ rings, s, w, n, e }], updated, source } ou null (vide, abîmé). */
export function readPpri(json) {
  const ok = (r) => Array.isArray(r) && r.length >= 3 && r.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  const zones = [];
  for (const z of Array.isArray(json?.zones) ? json.zones : []) {
    if (!Array.isArray(z) || !z.length || !z.every(ok)) continue;
    let s = 90; let w = 180; let n = -90; let e = -180;
    for (const [la, lo] of z[0]) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo); }
    zones.push({ rings: z, bands: z.map(bandsOf), s, w, n, e });
  }
  return zones.length ? { zones, updated: typeof json.updated === 'string' ? json.updated : '', source: String(json.source ?? '') } : null;
}

const BAND = 0.001; // ≈ 110 m : les côtés de chaque anneau rangés par bande de latitude (calcul rapide, des milliers de points)
function bandsOf(r) {
  const b = new Map();
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const lo = Math.floor(Math.min(r[i][0], r[j][0]) / BAND); const hi = Math.floor(Math.max(r[i][0], r[j][0]) / BAND);
    for (let k = lo; k <= hi; k++) { const l = b.get(k); if (l) l.push(i); else b.set(k, [i]); }
  }
  return b;
}
/** Le point est-il dans l'anneau ? (règle du rayon, [lat, lng]) */
function inRing(r, bands, la, lo) {
  let inside = false;
  for (const i of bands.get(Math.floor(la / BAND)) ?? []) {
    const j = i === 0 ? r.length - 1 : i - 1;
    const [ai, bi] = r[i]; const [aj, bj] = r[j];
    if ((ai > la) !== (aj > la) && lo < ((bj - bi) * (la - ai)) / (aj - ai) + bi) inside = !inside;
  }
  return inside;
}

/** Dans la zone inondable ? true, false, ou null quand la zone n'est pas connue (pas d'information plutôt qu'une fausse). */
export function inPpri(P, la, lo) {
  if (!P || !Number.isFinite(la) || !Number.isFinite(lo)) return null;
  for (const z of P.zones) {
    if (la < z.s || la > z.n || lo < z.w || lo > z.e) continue;
    if (inRing(z.rings[0], z.bands[0], la, lo) && !z.rings.some((h, k) => k > 0 && inRing(h, z.bands[k], la, lo))) return true;
  }
  return false;
}

/** 'in', 'out', ou 'edge' quand un point à 50 m (nord, sud, est, ouest) n'est pas du même côté ; null si zone inconnue.
 *  Le contour est tracé au 1/5 000 : à quelques dizaines de mètres près, « hors zone » ne voudrait rien dire. */
export const PPRI_EDGE_M = 50;
export function ppriState(P, la, lo) {
  const here = inPpri(P, la, lo);
  if (here === null) return null;
  const dy = PPRI_EDGE_M / 111320; const dx = dy / Math.cos((la * Math.PI) / 180);
  const near = [[la + dy, lo], [la - dy, lo], [la, lo + dx], [la, lo - dx]].some(([a, b]) => inPpri(P, a, b) !== here);
  return near ? 'edge' : here ? 'in' : 'out';
}
/** Pour « Sortir de la zone inondable » : un croisement compte comme dehors s'il est hors zone et à 50 m au moins du bord. */
export const ppriOut = (P) => (la, lo) => ppriState(P, la, lo) === 'out';
