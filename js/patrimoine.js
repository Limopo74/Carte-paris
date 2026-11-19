// L'architecture autour de moi, dans Monuments (v245) : deux fichiers rangés dans l'appli, rien n'est envoyé.
// - data/patrimoine.json : les protections patrimoniales de la Ville de Paris (plan d'urbanisme bioclimatique voté
//   le 16 juin 2026 ; opendata.paris.fr, jeux plub_pvp, plub_pvp_geos et plub_surf_pvp ; ODbL ; sans valeur
//   réglementaire). Une protection = une adresse, le texte de la Ville (ce qu'il faut regarder) et un point.
// - data/acr.json : le label « Architecture contemporaine remarquable » du ministère de la Culture (édifices de moins de
//   100 ans, jamais protégés au titre des monuments historiques ; Licence Ouverte 2.0).
// Le tri par distance se fait sur le téléphone.

// Le rayon des immeubles protégés par la Ville se règle dans Réglages → Distances et durées (TUNING.villeM, js/reglages.js) :
// bien plus court que celui des monuments, car il y en a environ 70 par km² à Paris.
/** Longueur de l'extrait d'un texte de la Ville avant « Lire la suite ». */
export const PVP_CUT = 100;

/** Le texte de la Ville, réparé : les guillemets dont l'espace fine est devenue « ? » (« «?la tour Piano?» »). */
export function cleanText(s) {
  return String(s ?? '')
    .replace(/«\s*\?\s*/g, '« ').replace(/\s*\?\s*»/g, ' »')
    .replace(/\s+/g, ' ').trim().slice(0, 6000);
}

/** Le début d'un texte, coupé au mot, sans ponctuation pendante : '' si le texte entier tient (il s'affiche alors seul). */
export function excerpt(s, n = PVP_CUT) {
  const t = String(s ?? '');
  if (t.length <= n + 40) return '';
  const cut = t.slice(0, n + 1).replace(/\s+\S*$/, '').replace(/[\s,;:.\-–(]+$/, '');
  return `${cut}…`;
}

const point = (x) => Number.isFinite(x?.lat) && Number.isFinite(x?.lng) && Math.abs(x.lat - 48.86) < 0.2 && Math.abs(x.lng - 2.35) < 0.3;

/**
 * data/patrimoine.json nettoyé : [{ n, a, t, pts: [{ lat, lng }], lat, lng }] ; une protection peut couvrir plusieurs
 * bâtiments (« p » : [[lat, lng], …], tous gardés par le robot) ; une ligne sans adresse, texte ou point est ignorée.
 */
export function cleanPvp(json) {
  const out = [];
  for (const x of Array.isArray(json?.items) ? json.items : []) {
    if (!x || typeof x.a !== 'string' || typeof x.t !== 'string') continue;
    const pts = (Array.isArray(x.p) ? x.p : [[x.lat, x.lng]]).filter(Array.isArray).map(([lat, lng]) => ({ lat, lng })).filter(point).slice(0, 12);
    const a = x.a.replace(/\s+/g, ' ').trim().slice(0, 120); const t = cleanText(x.t);
    if (a && t && pts.length) out.push({ n: typeof x.n === 'string' ? x.n.slice(0, 12) : '', a, t, pts, ...pts[0] });
  }
  return out;
}

/** data/acr.json nettoyé : [{ r, t, a: [auteurs], y: dates, l: année du label, lat, lng }] (y, pas d : d est la distance). */
export function cleanAcr(json) {
  const out = [];
  for (const x of Array.isArray(json?.items) ? json.items : []) {
    if (!x || typeof x.r !== 'string' || !/^ACR\d{7}$/.test(x.r) || typeof x.t !== 'string' || !point(x)) continue;
    const a = (Array.isArray(x.a) ? x.a : []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 80));
    out.push({ r: x.r, t: x.t.replace(/\s+/g, ' ').trim().slice(0, 140), a, y: typeof x.d === 'string' ? x.d.slice(0, 30) : '', l: typeof x.l === 'string' && /^\d{4}$/.test(x.l) ? x.l : '', lat: x.lat, lng: x.lng });
  }
  return out;
}

/** La ligne du label : « Architecture contemporaine remarquable (label 2016) ». */
export const acrLabel = (x) => `Architecture contemporaine remarquable${x?.l ? ` (label ${x.l})` : ''}`;

/**
 * Les éléments d'une liste à moins de `max` mètres de `from`, du plus proche : [{ ...x, d }]. Un élément qui a plusieurs
 * points (« pts ») est mesuré à son point le plus proche, qui devient son lat / lng (pour la boussole).
 */
export function within(list, from, max) {
  if (!from || !Array.isArray(list)) return [];
  const out = [];
  for (const x of list) {
    let best = x; let d = dist(from, x);
    for (const q of x.pts ?? []) { const e = dist(from, q); if (e < d) { d = e; best = q; } }
    if (d <= max) out.push({ ...x, lat: best.lat, lng: best.lng, d: Math.round(d) });
  }
  return out.sort((p, q) => p.d - q.d);
}
function dist(a, b) {
  const R = 6371008.8; const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r; const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
