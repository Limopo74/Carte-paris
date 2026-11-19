// Plan des rues à pied (Mes parcours, v1) : lecture du fichier fabriqué par tools/maj-rues.py, étape posée sur la rue
// la plus proche, chemin le plus court dans les rues. Tout se calcule sur le téléphone ; rien n'est envoyé.
// Aucune dépendance au navigateur : testé par tests/rues.test.mjs.

/** Drapeaux d'un tronçon (tools/maj-rues.py). */
export const PARK = 1;
export const COVERED = 2;
export const STEPS = 4;
/** Un parc ou un passage couvert coûte 50 fois sa longueur : le chemin les contourne, sauf s'il n'y a pas d'autre passage
 *  ou si l'étape est dedans (choix 1A du 19 nov. 2026). */
const AVOID = 50;
/** Une étape se pose sur une rue à 60 m au plus du doigt ; plus loin, elle est refusée. */
export const SNAP_MAX_M = 60;
const NAME_NEAR_M = 30; // une étape sur un trottoir prend le nom de la rue nommée à 30 m de plus au plus
const CELL = 0.002; // ≈ 220 m sur 150 m à Paris

const KY = 111_320;
const kx = (lat) => KY * Math.cos((lat * Math.PI) / 180);

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
  return { N, E, lat, lng, ea, eb, em, ef, ek, es, slat, slng, deg, adj, grid, names, updated: String(json.updated ?? '') };
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
const cost = (P, i, allow) => P.em[i] * ((P.ef[i] & (PARK | COVERED)) & ~allow ? AVOID : 1);

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
      flags: P.ef[s1.edge], names: [edgeName(P, s1.edge)].filter(Boolean) };
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
  for (const [i, to] of edges) {
    const pts = edgePoints(P, i); if (to === P.ea[i]) pts.reverse();
    line.push(...pts.slice(1)); m += P.em[i]; flags |= P.ef[i]; names.push(edgeName(P, i));
  }
  const inB = bestEnd === P.eb[s2.edge];
  line.push(...between(P, s2.edge, inB ? L2 : 0, s2.t), [s2.lat, s2.lng]);
  m += inB ? L2 - s2.t : s2.t; flags |= P.ef[s2.edge]; names.push(edgeName(P, s2.edge));
  const uniq = names.filter((n, i) => n && n !== names[i - 1]);
  return { m, line, flags, names: [...new Set(uniq)] };
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
