// Mesure du dénivelé de quelques trajets à pied (24 nov. 2026, mes choix 2A 3A 4A) : une mesure pour le journal du robot,
// jamais bloquante, rien d'écrit dans data/. Elle sert à décider si « ça monte de 40 m » peut s'afficher sans être faux.
//
//   node tools/mesure-denivele.mjs requete FICHIER     écrit la demande Overpass des ponts et tunnels (même zone que le robot)
//   node tools/mesure-denivele.mjs [PONTS.json]        mesure les trajets d'essai (altitudes : API de calcul altimétrique de
//                                                      l'IGN, RGE ALTI ; seuls les points de ces trajets fixes sont envoyés)
//
// Les trajets d'essai sont écrits ici, entre deux lieux publics : jamais un de mes tracés ni ma position.
// Le modèle de l'IGN donne le sol : sur un pont, c'est l'eau ou la voie ferrée en dessous (Pont Neuf : 26,8 m, quai voisin :
// 31,7 m, mesuré le 24 nov.). Les points sur un pont ou dans un tunnel prennent donc l'altitude des deux bouts, au prorata.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readPlan, snap, route } from '../js/rues.js';

export const BBOX = '48.815,2.224,48.902,2.470'; // la même que les autres demandes du robot
export const STEP_M = 10; // un point tous les 10 m le long du chemin
export const BRIDGE_NEAR_M = 12; // un point à moins de 12 m d'un pont (ou d'un tunnel) est « sur le pont »
export const NOISE_M = 2; // une montée ne compte qu'une fois le chemin remonté de 2 m (bruit du modèle)
export const SHOW_FROM_M = 15; // règle 4A : la montée seule, à partir de 15 m, arrondie à 10 m (donc « 20 m » au moins)

/** Les trajets d'essai : buttes, ponts, et deux trajets plats pour contrôle. */
export const TRIPS = [
  { nom: 'Anvers → Sacré-Cœur', a: [48.8828, 2.3441], b: [48.8863, 2.3430] },
  { nom: 'Abbesses → place du Tertre', a: [48.8844, 2.3384], b: [48.8865, 2.3408] },
  { nom: 'Pyrénées → belvédère de Belleville', a: [48.8738, 2.3852], b: [48.8713, 2.3843] },
  { nom: 'Belleville (métro) → parc de Belleville', a: [48.8722, 2.3768], b: [48.8713, 2.3843] },
  { nom: "Place d'Italie → Butte-aux-Cailles", a: [48.8310, 2.3557], b: [48.8273, 2.3518] },
  { nom: 'Corvisart → Butte-aux-Cailles', a: [48.8299, 2.3504], b: [48.8273, 2.3518] },
  { nom: 'Alma-Marceau → Trocadéro', a: [48.8647, 2.3010], b: [48.8631, 2.2875] },
  { nom: 'Maubert-Mutualité → Panthéon', a: [48.8502, 2.3483], b: [48.8462, 2.3458] },
  { nom: 'Châtelet → Saint-Michel (deux ponts)', a: [48.8577, 2.3474], b: [48.8535, 2.3440] },
  { nom: 'Palais-Royal → Saint-Germain-des-Prés (pont)', a: [48.8625, 2.3364], b: [48.8540, 2.3334] },
  { nom: "Gare de Lyon → gare d'Austerlitz (pont)", a: [48.8443, 2.3740], b: [48.8420, 2.3650] },
  { nom: 'Bastille → République (plat)', a: [48.8532, 2.3691], b: [48.8674, 2.3636] },
  { nom: 'Opéra → Madeleine (plat)', a: [48.8713, 2.3317], b: [48.8700, 2.3245] },
];

const KY = 111_320;
const kx = (lat) => KY * Math.cos((lat * Math.PI) / 180);
const dist = (p, q) => Math.hypot((q[0] - p[0]) * KY, (q[1] - p[1]) * kx(p[0]));

/** Un point tous les `step` mètres le long d'une ligne [[lat, lng], …] (le premier et le dernier compris). */
export function resample(line, step = STEP_M) {
  const pts = (line ?? []).filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]]; let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]; const b = pts[i]; const d = dist(a, b);
    let t = step - carry;
    while (t <= d) { const f = t / d; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); t += step; }
    carry = d - (t - step);
  }
  const last = pts.at(-1);
  if (dist(out.at(-1), last) > 0.5) out.push(last);
  return out;
}

/** Distance en mètres d'un point à un segment [a, b]. */
function toSegment(p, a, b) {
  const X = kx(p[0]);
  const ax = (a[1] - p[1]) * X; const ay = (a[0] - p[0]) * KY; const bx = (b[1] - p[1]) * X; const by = (b[0] - p[0]) * KY;
  const dx = bx - ax; const dy = by - ay; const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Les ponts et tunnels d'une réponse Overpass (`out geom`) : [[[lat, lng], …], …]. Illisible : []. */
export function readBridges(json) {
  return (Array.isArray(json?.elements) ? json.elements : [])
    .filter((e) => e?.type === 'way' && Array.isArray(e.geometry) && e.geometry.length > 1)
    .map((e) => e.geometry.filter((g) => Number.isFinite(g?.lat) && Number.isFinite(g?.lon)).map((g) => [g.lat, g.lon]))
    .filter((l) => l.length > 1);
}

/** Pour chaque point : est-il sur un pont ou dans un tunnel (à moins de BRIDGE_NEAR_M d'un de leurs segments) ? */
export function onBridges(points, bridges, near = BRIDGE_NEAR_M) {
  const box = bridges.map((l) => {
    let s = 90; let n = -90; let w = 180; let e = -180;
    for (const [la, lo] of l) { s = Math.min(s, la); n = Math.max(n, la); w = Math.min(w, lo); e = Math.max(e, lo); }
    return [s, n, w, e];
  });
  const m = near / KY;
  return points.map((p) => bridges.some((l, k) => {
    const [s, n, w, e] = box[k];
    if (p[0] < s - m || p[0] > n + m || p[1] < w - m * 1.6 || p[1] > e + m * 1.6) return false;
    for (let i = 1; i < l.length; i++) if (toSegment(p, l[i - 1], l[i]) <= near) return true;
    return false;
  }));
}

/** Les altitudes des points sur un pont remplacées par celles des deux bouts, au prorata ; un pont au bout du chemin
 *  prend l'altitude du dernier point connu. Une altitude absente (null) se traite comme un pont. Tout inconnu : null. */
export function fillBridges(alts, flags) {
  const ok = alts.map((z, i) => Number.isFinite(z) && !flags[i]);
  if (!ok.some(Boolean)) return null;
  const out = alts.slice();
  for (let i = 0; i < out.length; i++) {
    if (ok[i]) continue;
    let a = i - 1; while (a >= 0 && !ok[a]) a--;
    let b = i + 1; while (b < out.length && !ok[b]) b++;
    if (a < 0) out[i] = alts[b]; else if (b >= out.length) out[i] = alts[a];
    else out[i] = alts[a] + ((alts[b] - alts[a]) * (i - a)) / (b - a);
  }
  return out;
}

/** Montée et descente brutes (somme des écarts) et « honnêtes » : un changement de sens ne compte qu'après NOISE_M. */
export function climbs(alts, noise = NOISE_M) {
  let up = 0; let down = 0;
  for (let i = 1; i < alts.length; i++) { const d = alts[i] - alts[i - 1]; if (d > 0) up += d; else down -= d; }
  // ref : le dernier sommet (en montée) ou le dernier creux (en descente) ; dir : 1 en montée, -1 en descente, 0 au départ
  let upN = 0; let downN = 0; let ref = alts[0]; let dir = 0;
  for (const z of alts.slice(1)) {
    if (dir === 1 && z > ref) { upN += z - ref; ref = z; }
    else if (dir === -1 && z < ref) { downN += ref - z; ref = z; }
    else if (dir !== 1 && z - ref >= noise) { upN += z - ref; ref = z; dir = 1; }
    else if (dir !== -1 && ref - z >= noise) { downN += ref - z; ref = z; dir = -1; }
  }
  return { up, down, upN, downN };
}

/** Règle 4A : « ça monte de 40 m » à partir de 15 m, arrondi à 10 m ; sinon rien (''). */
export function phrase(up) {
  if (!Number.isFinite(up) || up < SHOW_FROM_M) return '';
  return `ça monte de ${Math.max(20, Math.round(up / 10) * 10)} m`;
}

/** La demande Overpass : ponts et tunnels des chemins à pied et des rues, dans la zone du robot. */
export function query() {
  return `[out:json][timeout:180];(way["highway"]["bridge"]["bridge"!="no"](${BBOX});way["highway"]["tunnel"]["tunnel"!="no"]["tunnel"!="building_passage"](${BBOX}););out geom;`;
}

/** Altitudes de l'IGN (RGE ALTI) pour des points [[lat, lng], …], par paquets de 100, 4 demandes par seconde au plus. */
export async function igAltitudes(points, fetchFn = fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const out = [];
  for (let i = 0; i < points.length; i += 100) {
    const part = points.slice(i, i + 100);
    const u = new URL('https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json');
    u.search = new URLSearchParams({ lon: part.map((p) => p[1].toFixed(6)).join('|'), lat: part.map((p) => p[0].toFixed(6)).join('|'),
      resource: 'ign_rge_alti_wld', zonly: 'true' }).toString();
    const r = await fetchFn(u, { headers: { 'User-Agent': 'Carte-paris, robot mensuel (https://github.com/Limopo74/Carte-paris)' } });
    if (!r.ok) throw new Error(`IGN : réponse ${r.status}`);
    const z = (await r.json())?.elevations;
    if (!Array.isArray(z) || z.length !== part.length) throw new Error('IGN : réponse illisible');
    out.push(...z.map((v) => (Number.isFinite(v) && v > -100 ? v : null))); // -99999 : pas de donnée
    await wait(250);
  }
  return out;
}

/** Mesure un trajet : null si on ne trouve pas de chemin dans les rues. */
export async function measureTrip(P, trip, bridges, getAlt) {
  const a = snap(P, { lat: trip.a[0], lng: trip.a[1] }); const b = snap(P, { lat: trip.b[0], lng: trip.b[1] });
  const r = a && b ? route(P, a, b) : null;
  if (!r) return null;
  const pts = resample(r.line);
  const flags = onBridges(pts, bridges);
  const raw = await getAlt(pts);
  const fixed = fillBridges(raw, flags);
  if (!fixed) return null;
  const brut = climbs(raw.map((z, i) => (Number.isFinite(z) ? z : fixed[i])));
  const net = climbs(fixed);
  return { nom: trip.nom, m: Math.round(r.m), points: pts.length, surPont: flags.filter(Boolean).length,
    min: Math.min(...fixed), max: Math.max(...fixed), brut, net, phrase: phrase(net.upN) };
}

const f0 = (x) => String(Math.round(x));
export function table(rows) {
  const lines = ['Trajet | mètres | points | sur un pont | altitude min-max | montée brute / descente brute | montée / descente sans ponts ni bruit | phrase'];
  for (const r of rows) {
    if (!r.res) { lines.push(`${r.nom} | pas mesuré : ${r.err ?? 'pas de chemin dans les rues'}`); continue; }
    const x = r.res;
    lines.push(`${x.nom} | ${x.m} | ${x.points} | ${x.surPont} | ${f0(x.min)}-${f0(x.max)} m | +${f0(x.brut.up)} / -${f0(x.brut.down)} m | +${f0(x.net.upN)} / -${f0(x.net.downN)} m | ${x.phrase || '(rien)'}`);
  }
  return lines.join('\n');
}

async function main(args) {
  if (args[0] === 'requete') { writeFileSync(args[1], query()); return; }
  const P = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));
  if (!P) { console.log('Dénivelé : plan des rues illisible, rien à mesurer'); return; }
  let bridges = [];
  if (args[0]) { try { bridges = readBridges(JSON.parse(readFileSync(args[0], 'utf8'))); } catch { bridges = []; } }
  console.log(`Dénivelé (mesure seulement, rien n'est écrit) : plan des rues du ${P.updated}, ${bridges.length} ponts et tunnels lus${bridges.length ? '' : ' (aucun : les ponts faussent la mesure brute)'} ; un point tous les ${STEP_M} m ; altitudes IGN RGE ALTI.`);
  const rows = [];
  for (const t of TRIPS) {
    try { rows.push({ nom: t.nom, res: await measureTrip(P, t, bridges, (pts) => igAltitudes(pts)) }); }
    catch (e) { rows.push({ nom: t.nom, err: String(e?.message ?? e) }); }
  }
  console.log(table(rows));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((e) => console.log(`Dénivelé : mesure arrêtée (${e?.message ?? e}), rien d'écrit`)).finally(() => process.exit(0));
}
