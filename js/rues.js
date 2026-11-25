// Plan des rues à pied (Mes parcours, v1) : lecture du fichier fabriqué par tools/maj-rues.py, étape posée sur la rue
// la plus proche, chemin le plus court dans les rues. Tout se calcule sur le téléphone ; rien n'est envoyé.
// Aucune dépendance au navigateur : testé par tests/rues.test.mjs.

/** Drapeaux d'un tronçon (tools/maj-rues.py). */
export const PARK = 1;
export const COVERED = 2;
export const STEPS = 4;
/** v406 : pont, tunnel ou voie hors du sol (passerelle, couloir sous terre) : son altitude n'est pas celle du sol. */
export const OFFGROUND = 8;
/** Un parc ou un passage couvert coûte 50 fois sa longueur : le chemin les contourne, sauf s'il n'y a pas d'autre passage
 *  ou si l'étape est dedans (choix 1A du 19 nov. 2026). */
const AVOID = 50;
/** Une étape se pose sur une rue à 60 m au plus du doigt ; plus loin, elle est refusée. */
export const SNAP_MAX_M = 60;
const NAME_NEAR_M = 30; // une étape sur un trottoir prend le nom de la rue nommée à 30 m de plus au plus
const CELL = 0.002; // ≈ 220 m sur 150 m à Paris

const KY = 111_320;
const kx = (lat) => KY * Math.cos((lat * Math.PI) / 180);

/** v406 : altitudes du sol des croisements (tools/maj-altitudes.mjs, IGN RGE ALTI), en mètres entiers, chacune écrite
 *  par écart avec la dernière connue ; null = inconnue (pont, tunnel, ou pas reçue). Float32Array (NaN = inconnue) ou null. */
export function readAlt(a, N) {
  if (!Array.isArray(a) || a.length !== N) return null;
  const out = new Float32Array(N); let z = 0; let any = false;
  for (let i = 0; i < N; i++) {
    const d = a[i];
    if (d === null) { out[i] = NaN; continue; }
    if (!Number.isFinite(d)) return null;
    z += d; out[i] = z; any = true;
  }
  return any ? out : null;
}

/** Lit le fichier du plan (format 2 de tools/maj-rues.py). Renvoie null s'il est illisible ou incohérent. */
export function readPlan(json) {
  const n = json?.nodes; const { ea: da, eb: db, ef: f, ek: k, en: c, shape: sh } = json ?? {};
  const arr = (x) => Array.isArray(x);
  if (json?.v !== 2 || !arr(n) || !arr(da) || !arr(db) || !arr(f) || !arr(k) || !arr(c) || !arr(sh) || n.length % 2 || !n.length) return null;
  const N = n.length / 2; const E = da.length;
  if (db.length !== E || f.length !== E || k.length !== E || c.length !== E) return null;
  const lat = new Float64Array(N); const lng = new Float64Array(N);
  let a = 0; let g = 0;
  for (let i = 0; i < N; i++) { a += n[2 * i]; g += n[2 * i + 1]; lat[i] = a / 1e5; lng[i] = g / 1e5; }
  const ea = new Int32Array(E); const eb = new Int32Array(E); const em = new Float64Array(E);
  const ef = Uint8Array.from(f); const ek = Int32Array.from(k); const es = new Int32Array(E + 1);
  let s = 0; let pa = 0;
  for (let i = 0; i < E; i++) {
    pa += da[i]; ea[i] = pa; eb[i] = pa + db[i];
    if (ea[i] < 0 || ea[i] >= N || eb[i] < 0 || eb[i] >= N || !(c[i] >= 0)) return null;
    es[i] = s; s += c[i];
  }
  es[E] = s;
  if (sh.length !== 2 * s) return null;
  // Points de forme en degrés (le 1er relatif au nœud a, les suivants au point d'avant), puis longueur de chaque tronçon
  const slat = new Float64Array(s); const slng = new Float64Array(s);
  for (let i = 0; i < E; i++) {
    let x = Math.round(lat[ea[i]] * 1e5); let y = Math.round(lng[ea[i]] * 1e5);
    let pl = lat[ea[i]]; let pg = lng[ea[i]]; let m = 0;
    for (let j = es[i]; j < es[i + 1]; j++) {
      x += sh[2 * j]; y += sh[2 * j + 1]; slat[j] = x / 1e5; slng[j] = y / 1e5;
      m += Math.hypot((slat[j] - pl) * KY, (slng[j] - pg) * kx(pl)); pl = slat[j]; pg = slng[j];
    }
    em[i] = m + Math.hypot((lat[eb[i]] - pl) * KY, (lng[eb[i]] - pg) * kx(pl));
  }
  // Voisins (tableaux compacts) : pour chaque nœud, ses tronçons
  const deg = new Int32Array(N + 1);
  for (let i = 0; i < E; i++) { deg[ea[i] + 1]++; deg[eb[i] + 1]++; }
  for (let i = 0; i < N; i++) deg[i + 1] += deg[i];
  const adj = new Int32Array(2 * E); const fill = deg.slice(0, N);
  for (let i = 0; i < E; i++) { adj[fill[ea[i]]++] = i; adj[fill[eb[i]]++] = i; }
  // Grille : tronçons rangés par case (par leurs deux bouts et leurs points de forme)
  const grid = new Map();
  const put = (la, lo, i) => { const k = `${Math.floor(la / CELL)},${Math.floor(lo / CELL)}`; const c = grid.get(k); if (!c) grid.set(k, [i]); else if (c.at(-1) !== i) c.push(i); };
  for (let i = 0; i < E; i++) {
    put(lat[ea[i]], lng[ea[i]], i);
    for (let j = es[i]; j < es[i + 1]; j++) put(slat[j], slng[j], i);
    put(lat[eb[i]], lng[eb[i]], i);
  }
  const names = Array.isArray(json.names) ? json.names.map((x) => String(x)) : [];
  return { N, E, lat, lng, ea, eb, em, ef, ek, es, slat, slng, deg, adj, grid, names, updated: String(json.updated ?? ''), alt: readAlt(json.alt, N) };
}

/** Les points d'un tronçon, de a vers b : [[lat, lng], …]. */
export function edgePoints(P, i) {
  const out = [[P.lat[P.ea[i]], P.lng[P.ea[i]]]];
  for (let j = P.es[i]; j < P.es[i + 1]; j++) out.push([P.slat[j], P.slng[j]]);
  out.push([P.lat[P.eb[i]], P.lng[P.eb[i]]]);
  return out;
}

/** Nom de la rue d'un tronçon ('' si sans nom). */
export const edgeName = (P, i) => (P.ek[i] > 0 ? P.names[P.ek[i] - 1] ?? '' : '');

/**
 * Pose un point sur la rue la plus proche : { edge, t (mètres depuis a le long du tronçon), lat, lng, d (mètres du doigt), name }
 * ou null si aucune rue à moins de maxM.
 */
/** v339 : le doigt est-il sur le plan ? Faux quand aucune rue du plan n'est à environ 400 m (hors de Paris et ses abords) :
 *  le message dit alors de déplacer la carte sur Paris, au lieu de « touche plus près d'une rue ». */
export function onPlan(P, pt) {
  if (!P || !Number.isFinite(pt?.lat) || !Number.isFinite(pt?.lng)) return false;
  const ci = Math.floor(pt.lat / CELL); const cj = Math.floor(pt.lng / CELL);
  for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) if (P.grid.get(`${ci + di},${cj + dj}`)?.length) return true;
  return false;
}
export function snap(P, pt, maxM = SNAP_MAX_M) {
  if (!P || !Number.isFinite(pt?.lat) || !Number.isFinite(pt?.lng)) return null;
  const ci = Math.floor(pt.lat / CELL); const cj = Math.floor(pt.lng / CELL);
  const KX = kx(pt.lat);
  let best = null; let named = null; // named : la rue nommée la plus proche (un trottoir ou un passage piéton n'a pas de nom)
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    for (const i of P.grid.get(`${ci + di},${cj + dj}`) ?? []) {
      const pts = edgePoints(P, i);
      let along = 0;
      for (let k = 0; k < pts.length - 1; k++) {
        const ax = (pts[k][1] - pt.lng) * KX; const ay = (pts[k][0] - pt.lat) * KY;
        const bx = (pts[k + 1][1] - pt.lng) * KX; const by = (pts[k + 1][0] - pt.lat) * KY;
        const dx = bx - ax; const dy = by - ay; const L2 = dx * dx + dy * dy;
        const u = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0;
        const px = ax + u * dx; const py = ay + u * dy; const d = Math.hypot(px, py);
        const seg = Math.sqrt(L2);
        if (!best || d < best.d) best = { edge: i, seg: along + u * seg, d, lat: pt.lat + py / KY, lng: pt.lng + px / KX, raw: 0 };
        if (P.ek[i] > 0 && (!named || d < named.d)) named = { i, d };
        along += seg;
      }
      if (best && best.edge === i) best.raw = along; // longueur mesurée sur les points (pour remettre t à l'échelle de em)
    }
  }
  if (!best || best.d > maxM) return null;
  const scale = best.raw > 0 ? P.em[best.edge] / best.raw : 1;
  const name = edgeName(P, best.edge) || (named && named.d <= best.d + NAME_NEAR_M ? edgeName(P, named.i) : '');
  return { edge: best.edge, t: best.seg * scale, lat: best.lat, lng: best.lng, d: best.d, name };
}

/** Coût d'un tronçon : sa longueur, multipliée si c'est un parc ou un passage couvert qu'on n'a pas choisi. */
const cost = (P, i, allow) => P.em[i] * ((P.ef[i] & (PARK | COVERED)) & ~allow ? AVOID : 1) * (P.pen ? P.pen[i] : 1); // pen : outil des circuits (tools/circuits/sans-retour.mjs), jamais dans l'appli

/** Petit tas binaire (nœud, coût). */
class Heap {
  constructor() { this.n = []; this.c = []; }
  get size() { return this.n.length; }
  push(n, c) {
    const N = this.n; const C = this.c; let i = N.length; N.push(n); C.push(c);
    while (i > 0) { const p = (i - 1) >> 1; if (C[p] <= c) break; N[i] = N[p]; C[i] = C[p]; i = p; }
    N[i] = n; C[i] = c;
  }
  pop() {
    const N = this.n; const C = this.c; const top = N[0]; const n = N.pop(); const c = C.pop();
    if (N.length) {
      let i = 0; const L = N.length;
      for (;;) { let m = 2 * i + 1; if (m >= L) break; if (m + 1 < L && C[m + 1] < C[m]) m++; if (C[m] >= c) break; N[i] = N[m]; C[i] = C[m]; i = m; }
      N[i] = n; C[i] = c;
    }
    return top;
  }
}

/** Points du tronçon avec leur distance depuis a, remise à l'échelle de la longueur du fichier (em). */
function measured(P, i) {
  const pts = edgePoints(P, i); const cum = [0]; let tot = 0;
  for (let k = 0; k < pts.length - 1; k++) { tot += Math.hypot((pts[k + 1][0] - pts[k][0]) * KY, (pts[k + 1][1] - pts[k][1]) * kx(pts[k][0])); cum.push(tot); }
  const f = tot > 0 ? P.em[i] / tot : 1;
  return { pts, cum: cum.map((c) => c * f) };
}

/** Les points d'un tronçon strictement entre les positions t1 et t2 (mètres depuis a), dans le sens de t1 vers t2. */
function between(P, i, t1, t2) {
  const { pts, cum } = measured(P, i);
  const lo = Math.min(t1, t2); const hi = Math.max(t1, t2);
  const inner = pts.filter((_, k) => cum[k] > lo && cum[k] < hi);
  return t1 <= t2 ? inner : inner.reverse();
}

/**
 * Chemin le plus court à pied entre deux points posés (snap) : { m (mètres), line: [[lat, lng], …], flags (drapeaux traversés), names }
 * ou null s'il n'y a pas de chemin (deux morceaux de rues séparés).
 */
export function route(P, s1, s2) {
  if (!P || !s1 || !s2) return null;
  const allow = (P.ef[s1.edge] | P.ef[s2.edge]) & (PARK | COVERED); // une étape dans un parc : ce parc est permis
  const L1 = P.em[s1.edge]; const L2 = P.em[s2.edge];
  // Même tronçon : tout droit le long de la rue
  if (s1.edge === s2.edge) {
    return { m: Math.abs(s2.t - s1.t), line: [[s1.lat, s1.lng], ...between(P, s1.edge, s1.t, s2.t), [s2.lat, s2.lng]],
      flags: P.ef[s1.edge], names: [edgeName(P, s1.edge)].filter(Boolean), segs: [[s1.edge, Math.min(s1.t, s2.t), Math.max(s1.t, s2.t)]],
      run: [[s1.edge, s1.t, s2.t]] };
  }
  const dist = new Float64Array(P.N).fill(Infinity); const via = new Int32Array(P.N).fill(-1);
  const h = new Heap();
  const start = (node, c) => { if (c < dist[node]) { dist[node] = c; via[node] = -2; h.push(node, c); } };
  const k1 = cost(P, s1.edge, allow) / (L1 || 1);
  start(P.ea[s1.edge], s1.t * k1); start(P.eb[s1.edge], (L1 - s1.t) * k1);
  const goalA = P.ea[s2.edge]; const goalB = P.eb[s2.edge];
  const k2 = cost(P, s2.edge, allow) / (L2 || 1);
  let best = Infinity; let bestEnd = -1;
  while (h.size) {
    const u = h.pop(); const du = dist[u];
    if (du >= best) break;
    if (u === goalA && du + s2.t * k2 < best) { best = du + s2.t * k2; bestEnd = u; }
    if (u === goalB && du + (L2 - s2.t) * k2 < best) { best = du + (L2 - s2.t) * k2; bestEnd = u; }
    for (let j = P.deg[u]; j < P.deg[u + 1]; j++) {
      const i = P.adj[j]; const v = P.ea[i] === u ? P.eb[i] : P.ea[i];
      const nd = du + cost(P, i, allow);
      if (nd < dist[v]) { dist[v] = nd; via[v] = i; h.push(v, nd); }
    }
  }
  if (bestEnd < 0) return null;
  // Remonte le chemin
  const edges = []; let x = bestEnd;
  while (via[x] >= 0) { const i = via[x]; edges.push([i, x]); x = P.ea[i] === x ? P.eb[i] : P.ea[i]; }
  edges.reverse();
  const first = x; // nœud par lequel on quitte le tronçon de départ
  const outB = first === P.eb[s1.edge];
  const line = [[s1.lat, s1.lng], ...between(P, s1.edge, s1.t, outB ? L1 : 0), [P.lat[first], P.lng[first]]];
  let m = outB ? L1 - s1.t : s1.t; let flags = P.ef[s1.edge]; const names = [edgeName(P, s1.edge)];
  const segs = [[s1.edge, outB ? s1.t : 0, outB ? L1 : s1.t]]; // [tronçon, de, à] en mètres depuis son nœud a
  const run = [[s1.edge, s1.t, outB ? L1 : 0]]; // v406 : les mêmes morceaux dans le sens de la marche (pour la montée)
  for (const [i, to] of edges) {
    const pts = edgePoints(P, i); if (to === P.ea[i]) pts.reverse();
    line.push(...pts.slice(1)); m += P.em[i]; flags |= P.ef[i]; names.push(edgeName(P, i)); segs.push([i, 0, P.em[i]]);
    run.push(to === P.eb[i] ? [i, 0, P.em[i]] : [i, P.em[i], 0]);
  }
  const inB = bestEnd === P.eb[s2.edge];
  line.push(...between(P, s2.edge, inB ? L2 : 0, s2.t), [s2.lat, s2.lng]);
  m += inB ? L2 - s2.t : s2.t; flags |= P.ef[s2.edge]; names.push(edgeName(P, s2.edge)); segs.push([s2.edge, inB ? s2.t : 0, inB ? L2 : s2.t]);
  run.push([s2.edge, inB ? L2 : 0, s2.t]);
  const uniq = names.filter((n, i) => n && n !== names[i - 1]);
  return { m, line, flags, names: [...new Set(uniq)], segs, run };
}

/**
 * v503 (mon choix 23 A du 25 nov.) : le chemin à pied le plus court depuis un point posé (snap) jusqu'au premier croisement
 * où `out(lat, lng)` est vrai (en mode Crue : hors de la zone inondable). Ponts et tunnels coûtent 20 fois leur longueur
 * (un souterrain se remplit, un pont peut être fermé) : on ne les prend que s'il n'y a pas d'autre sortie (les îles).
 * Résultat : celui de route(), ou { m: 0, … } déjà dehors, ou null (aucune sortie à moins de maxM mètres).
 */
export const OUT_BRIDGE = 20;
export function routeOut(P, s1, out, maxM = 8000) {
  if (!P || !s1) return null;
  if (out(s1.lat, s1.lng)) return { m: 0, line: [[s1.lat, s1.lng]], flags: 0, names: [], segs: [], run: [], already: true };
  const c = (i) => cost(P, i, 0) * (P.ef[i] & OFFGROUND ? OUT_BRIDGE : 1);
  const dist = new Float64Array(P.N).fill(Infinity); const h = new Heap();
  const L1 = P.em[s1.edge]; const k1 = c(s1.edge) / (L1 || 1);
  for (const [node, d] of [[P.ea[s1.edge], s1.t * k1], [P.eb[s1.edge], (L1 - s1.t) * k1]]) if (d < dist[node]) { dist[node] = d; h.push(node, d); }
  let goal = -1;
  while (h.size) {
    const u = h.pop(); const du = dist[u];
    if (du > maxM * OUT_BRIDGE) break;
    if (out(P.lat[u], P.lng[u])) { goal = u; break; }
    for (let j = P.deg[u]; j < P.deg[u + 1]; j++) {
      const i = P.adj[j]; const v = P.ea[i] === u ? P.eb[i] : P.ea[i];
      const nd = du + c(i);
      if (nd < dist[v]) { dist[v] = nd; h.push(v, nd); }
    }
  }
  if (goal < 0) return null;
  // Le dernier bout : le même chemin, calculé par route() vers ce croisement (posé sur un tronçon qui y arrive, hors pont)
  let e = -1;
  for (let j = P.deg[goal]; j < P.deg[goal + 1]; j++) { const i = P.adj[j]; if (e < 0 || (!(P.ef[i] & OFFGROUND) && P.ef[e] & OFFGROUND)) e = i; }
  const s2 = { edge: e, t: P.ea[e] === goal ? 0 : P.em[e], lat: P.lat[goal], lng: P.lng[goal], d: 0, name: edgeName(P, e) };
  const saved = P.pen; const pen = new Float64Array(P.E).fill(1);
  for (let i = 0; i < P.E; i++) if (P.ef[i] & OFFGROUND) pen[i] = OUT_BRIDGE;
  P.pen = saved ? pen.map((x, i) => x * saved[i]) : pen;
  try { return route(P, s1, s2); } finally { P.pen = saved; }
}

/* ---------- Mes parcours enregistrés (v1) : seulement les étapes ; le chemin se recalcule avec le plan ---------- */
export const ROUTE_STEPS_MAX = 20;
export const ROUTES_MAX = 50;
const NAME_LEN = 80;
const inParis = (lat, lng) => lat > 48.7 && lat < 49 && lng > 2.1 && lng < 2.6;
const txt = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Une étape lisible : { lat, lng, name, pid? } (pid : un de mes lieux), ou null. */
export function cleanStep(s) {
  const lat = Number(s?.lat); const lng = Number(s?.lng);
  if (!inParis(lat, lng)) return null;
  const pid = typeof s.pid === 'string' && /^[\w-]{1,64}$/.test(s.pid) ? s.pid : null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, name: txt(s.name, NAME_LEN) || 'Étape', ...(pid ? { pid } : {}) };
}

/** Nom donné à l'enregistrement : « De [1re étape] à [dernière] » (choix A du 19 nov.). */
export const autoName = (steps) => (steps.length > 1 ? `De ${steps[0].name} à ${steps.at(-1).name}` : steps[0]?.name ?? 'Parcours').slice(0, NAME_LEN);

/** Liste de mes parcours nettoyée : 2 à 20 étapes dans Paris, un nom, un id unique ; 50 au plus, les plus récents d'abord. */
export function cleanRoutes(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map((r) => {
    const id = typeof r?.id === 'string' && /^[\w-]{1,64}$/.test(r.id) ? r.id : null;
    if (!id || seen.has(id)) return null;
    const steps = (Array.isArray(r.steps) ? r.steps : []).map(cleanStep).filter(Boolean).slice(0, ROUTE_STEPS_MAX);
    if (steps.length < 2) return null;
    seen.add(id);
    const at = Number(r.at);
    return { id, name: txt(r.name, NAME_LEN) || autoName(steps), at: Number.isFinite(at) && at > 0 ? at : 0, steps };
  }).filter(Boolean).sort((a, b) => b.at - a.at).slice(0, ROUTES_MAX);
}

/** Identifiant d'un parcours. */
export const routeId = () => globalThis.crypto?.randomUUID?.() ?? `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/* ---------- Mes circuits (v2) : ne jamais revenir sur ses pas (règle 14 des circuits, mon choix 6B) ---------- */
/** Un bout de moins de 15 m parcouru deux fois est permis (traversée). */
export const REPEAT_OK_M = 15;
/** Aller voir une étape un peu en retrait (cour, entrée) puis repartir par le même bout : permis jusqu'à 40 m
 *  (comme les étapes des circuits de Claude, à moins de 40 m du tracé). */
export const SPUR_OK_M = 40;
const NEAR_M = 20; // deux passages à moins de 20 m l'un de l'autre, dans la même rue (un trottoir puis l'autre) = la même rue
const STEP_M = 8; // le tracé est regardé tous les 8 m

/** Points tous les 8 m le long d'une ligne [[lat, lng], …], avec la direction (radians). */
function samples(line) {
  const out = [];
  for (let k = 0; k < line.length - 1; k++) {
    const [a1, g1] = line[k]; const [a2, g2] = line[k + 1];
    const dx = (g2 - g1) * kx(a1); const dy = (a2 - a1) * KY; const L = Math.hypot(dx, dy);
    const n = Math.max(1, Math.round(L / STEP_M)); const dir = Math.atan2(dy, dx);
    for (let j = 0; j < n; j++) out.push({ lat: a1 + ((a2 - a1) * j) / n, lng: g1 + ((g2 - g1) * j) / n, w: L / n, dir });
  }
  return out;
}

/**
 * Ce qu'un parcours parcourt deux fois : { m (mètres en double), name (rue la plus touchée), leg (étape à partir de
 * laquelle on revient sur ses pas) } ou null si rien au-delà de 15 m. legs : les chemins de route(), dans l'ordre.
 * Un bout du tracé compte double s'il passe à moins de 20 m d'un bout d'un chemin d'avant, dans la même rue (le nom de la
 * rue la plus proche) ; autour de chaque étape (20 m), le chemin d'avant et le suivant ne se comparent pas, et le petit
 * aller-retour fait pour aller voir une étape en retrait (cour, entrée) est permis jusqu'à 40 m.
 */
export function repeated(P, legs, fixed = null) { // fixed : les bouts gardés d'un circuit de Claude, pas comparés entre eux
  const S = legs.map((l) => (l ? samples(l.line) : []));
  const nameCache = new Map();
  const nameOf = (q) => { const k = `${q.lat.toFixed(5)},${q.lng.toFixed(5)}`; if (!nameCache.has(k)) nameCache.set(k, snap(P, q, 30)?.name ?? ''); return nameCache.get(k); };
  const stopAt = legs.map((l) => (l ? { lat: l.line.at(-1)[0], lng: l.line.at(-1)[1] } : null)); // l'étape au bout du chemin li
  const near = (a, b, m) => Math.hypot((a.lng - b.lng) * kx(a.lat), (a.lat - b.lat) * KY) < m;
  const parts = []; // [mètres, nom, chemin d'avant, chemin]
  for (let li = 1; li < S.length; li++) {
    for (const q of S[li]) {
      for (let lj = 0; lj < li; lj++) {
        if (fixed?.has(li) && fixed.has(lj)) continue;
        if (lj === li - 1 && stopAt[lj] && near(q, stopAt[lj], NEAR_M)) continue; // autour de l'étape partagée
        const hit = S[lj].find((r) => near(q, r, NEAR_M) && (lj !== li - 1 || !stopAt[lj] || !near(r, stopAt[lj], NEAR_M)));
        if (!hit) continue;
        const nq = nameOf(q);
        if (!near(q, hit, 8) && (!nq || nq !== nameOf(hit))) continue; // proches mais pas la même rue : une rue voisine
        parts.push([q.w, nq, lj, li]);
        break;
      }
    }
  }
  const spur = new Map();
  for (const [o, , lj, li] of parts) if (lj === li - 1) spur.set(li, (spur.get(li) ?? 0) + o);
  const kept = parts.filter(([, , lj, li]) => !(lj === li - 1 && spur.get(li) <= SPUR_OK_M));
  const total = kept.reduce((t, [o]) => t + o, 0);
  if (total <= REPEAT_OK_M) return null;
  const byName = new Map();
  for (const [o, n] of kept) if (n) byName.set(n, (byName.get(n) ?? 0) + o);
  const name = [...byName].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '';
  return { m: total, name, leg: Math.min(...kept.map(([, , , li]) => li + 1)) };
}

/** v401 (mes choix 1A 2A 3A du 24 nov.) : « Toute la rue » : depuis une étape posée (snap), toute la rue du même nom, d'un bout à l'autre, en un seul trait.
 *  Les tronçons du même nom se suivent ; un carrefour (autre nom, 80 m au plus) ne coupe pas la rue.
 *  Le trait est le chemin le plus court entre les deux bouts (une seule chaussée, pas les trottoirs en double).
 *  Rien quand la rue continue plus loin (un bout du même nom à moins de 150 m d'un bout) ou dépasse 1,5 km. */
export const WHOLE_MAX_M = 1500;
export function wholeStreet(P, s) {
  if (!P || !s?.name) return null;
  const k = P.names.indexOf(s.name) + 1; if (!k) return null;
  const GAP = 80; const best = new Map(); const named = new Set(); const q = [];
  for (const n of [P.ea[s.edge], P.eb[s.edge]]) { best.set(n, 0); q.push([n, 0]); }
  if (P.ek[s.edge] === k) named.add(s.edge);
  while (q.length) {
    const [n, g] = q.pop(); if (best.get(n) < g) continue;
    for (let j = P.deg[n]; j < P.deg[n + 1]; j++) {
      const e = P.adj[j]; const o = P.ea[e] === n ? P.eb[e] : P.ea[e];
      const same = P.ek[e] === k; const ng = same ? 0 : g + P.em[e];
      if (ng > GAP) continue;
      if (same) named.add(e);
      if (!best.has(o) || best.get(o) > ng) { best.set(o, ng); q.push([o, ng]); }
    }
  }
  if (!named.size) return null;
  const m = (a, b) => Math.hypot((a[0] - b[0]) * KY, (a[1] - b[1]) * kx(a[0]));
  const nodes = [...new Set([...named].flatMap((e) => [P.ea[e], P.eb[e]]))].map((n) => [P.lat[n], P.lng[n]]);
  const far = (p) => nodes.reduce((b, x) => (m(x, p) > m(b, p) ? x : b), nodes[0]);
  const a = far([s.lat, s.lng]); const b = far(a);
  for (let i = 0; i < P.E; i++) if (P.ek[i] === k && !named.has(i)) {
    const p1 = [P.lat[P.ea[i]], P.lng[P.ea[i]]]; const p2 = [P.lat[P.eb[i]], P.lng[P.eb[i]]];
    if (Math.min(m(p1, a), m(p1, b), m(p2, a), m(p2, b)) < 150) return null; // la rue continue : on ne promet pas « toute la rue »
  }
  const sa = snap(P, { lat: a[0], lng: a[1] }, 5); const sb = snap(P, { lat: b[0], lng: b[1] }, 5);
  const r = sa && sb ? route(P, sa, sb) : null;
  if (!r || r.m < 10 || r.m > WHOLE_MAX_M || r.line.length > 400) return null;
  return { a: { ...sa, name: s.name }, b: { ...sb, name: s.name }, r: { ...r, names: [s.name] } };
}

/* ---------- v406 (mes choix 3A 4A du 24 nov.) : altitude du sol et montée d'un chemin, calculées sur le téléphone ---------- */

/** Une montée ne compte qu'une fois le chemin remonté de 2 m (le modèle de l'IGN a du bruit) ; la phrase à partir de 15 m. */
export const CLIMB_NOISE_M = 2;
export const CLIMB_FROM_M = 15;

/** Altitude du sol à `t` mètres du nœud a du tronçon `i` (entre ses deux bouts), ou null : plan sans altitudes,
 *  pont ou tunnel, bout inconnu. */
export function altOnEdge(P, i, t) {
  if (!P?.alt || !(i >= 0 && i < P.E) || P.ef[i] & OFFGROUND) return null;
  const za = P.alt[P.ea[i]]; const zb = P.alt[P.eb[i]]; const L = P.em[i];
  if (!Number.isFinite(za) || !Number.isFinite(zb)) return null;
  const f = L > 0 ? Math.max(0, Math.min(1, t / L)) : 0;
  return za + (zb - za) * f;
}

/** Les altitudes d'un ou plusieurs chemins (résultats de `route`), dans l'ordre de la marche ; les ponts et tunnels
 *  sont sautés (le chemin va d'un bout à l'autre). null si une altitude manque ailleurs : rien ne s'affiche alors. */
export function routeProfile(P, legs) {
  if (!P?.alt) return null;
  const out = [];
  for (const r of legs) {
    if (!r) continue;
    if (!Array.isArray(r.run)) return null;
    for (const [i, t1, t2] of r.run) {
      if (P.ef[i] & OFFGROUND) continue;
      const a = altOnEdge(P, i, t1); const b = altOnEdge(P, i, t2);
      if (a === null || b === null) return null;
      out.push(a, b);
    }
  }
  return out.length ? out : null;
}

/** Montée cumulée (mètres), sans le bruit : un changement de sens ne compte qu'après CLIMB_NOISE_M. */
export function climbUp(alts, noise = CLIMB_NOISE_M) {
  if (!Array.isArray(alts) || alts.length < 2) return 0;
  let up = 0; let ref = alts[0]; let dir = 0;
  for (const z of alts.slice(1)) {
    if (dir === 1 && z > ref) { up += z - ref; ref = z; }
    else if (dir === -1 && z < ref) ref = z;
    else if (dir !== 1 && z - ref >= noise) { up += z - ref; ref = z; dir = 1; }
    else if (dir !== -1 && ref - z >= noise) { ref = z; dir = -1; }
  }
  return up;
}

/** Règle 4A : « monte de 40 m » à partir de 15 m, arrondi à 10 m ; sinon '' (rien n'est dit). */
export function climbWords(up) {
  if (!Number.isFinite(up) || up < CLIMB_FROM_M) return '';
  return `monte de ${Math.max(20, Math.round(up / 10) * 10)} m`;
}

/** La montée d'un ou plusieurs chemins en mots (« monte de 40 m »), ou ''. */
export function routeClimb(P, legs) {
  const prof = routeProfile(P, legs);
  return prof ? climbWords(climbUp(prof)) : '';
}

/** v406 (mes choix 1A 2A 3A du 24 nov.) : altitude du sol là où je suis, arrondie à 5 m, ou null. Seulement avec une position
 *  de moins de 10 min, précise à 25 m, sur une rue du plan à 25 m au plus, hors pont et tunnel. */
export const ALT_FIX_MAX_ACC = 25;
export function altHere(P, fix, now = Date.now()) {
  if (!P?.alt || !fix || !Number.isFinite(fix.time) || now - fix.time > 10 * 60 * 1000 || now < fix.time - 60000) return null;
  if (!(fix.acc <= ALT_FIX_MAX_ACC)) return null;
  const s = snap(P, fix, ALT_FIX_MAX_ACC);
  const z = s ? altOnEdge(P, s.edge, s.t) : null;
  return z === null ? null : Math.round(z / 5) * 5;
}

/** v494 (plan de secours, ma réponse 5 et mon choix 31 A) : les tronçons dont une case de la grille touche le cadre ;
 *  `max` cases au plus (sinon [] : vue trop large, trop de rues à dessiner). */
export function edgesInBox(P, s, w, n, e, max = 400) {
  if (!P) return [];
  const i0 = Math.floor(s / CELL); const i1 = Math.floor(n / CELL);
  const j0 = Math.floor(w / CELL); const j1 = Math.floor(e / CELL);
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > max) return [];
  const out = new Set();
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const k of P.grid.get(`${i},${j}`) ?? []) out.add(k);
  return [...out];
}
