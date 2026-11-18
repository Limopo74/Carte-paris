// L'auteur et la date des monuments protégés de Paris (v198) : « Immeubles protégés au titre des Monuments historiques »,
// ministère de la Culture (base Mérimée), Licence Ouverte 2.0, lu par le robot dans l'API tabulaire de data.gouv.fr
// (tools/maj-architectes.py → data/architectes.json). Rien n'est envoyé : la jointure se fait par la référence PA.

/** Le fichier du robot, nettoyé : Map référence → { r, t, a: [auteurs], d, lat?, lng? }. */
export function cleanArch(json) {
  const out = new Map();
  for (const x of Array.isArray(json?.items) ? json.items : []) {
    if (!x || typeof x.r !== 'string' || !/^PA\d{8}$/.test(x.r)) continue;
    const a = (Array.isArray(x.a) ? x.a : []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 80));
    if (!a.length) continue;
    const ok = Number.isFinite(x.lat) && Number.isFinite(x.lng);
    out.set(x.r, { r: x.r, t: typeof x.t === 'string' ? x.t.slice(0, 120) : '', a, d: typeof x.d === 'string' ? x.d.slice(0, 30) : '', ...(ok ? { lat: x.lat, lng: x.lng } : {}) });
  }
  return out;
}

/** « Hector Guimard (architecte) » → « Hector Guimard » (le nom sans le rôle). */
export const authorName = (a) => String(a ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();
/** Clé de comparaison d'un auteur : sans accents, sans majuscules, sans le rôle. */
export const authorKey = (a) => authorName(a).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** La ligne d'un monument : « Guimard Hector (architecte) · 1898 » ; deux auteurs au plus ; '' sans auteur. */
export function archLine(rec) {
  if (!rec?.a?.length) return '';
  const who = rec.a.length > 2 ? `${rec.a.slice(0, 2).join(', ')}…` : rec.a.join(', ');
  return [who, rec.d].filter(Boolean).join(' · ');
}

/**
 * Les autres monuments protégés du même auteur (le premier nommé), du plus proche de `here` : [{ ...rec, m }] (m : mètres ; d reste la date).
 * Même nom écrit à l'identique seulement (sans accents ni majuscules) : jamais « toute son œuvre ».
 */
export function sameAuthor(map, rec, here) {
  const k = authorKey(rec?.a?.[0]);
  if (!k || !map) return [];
  const out = [];
  for (const x of map.values()) {
    if (x.r === rec.r || !Number.isFinite(x.lat) || !x.a.some((a) => authorKey(a) === k)) continue;
    out.push({ ...x, m: here ? Math.round(dist(here, x)) : null });
  }
  return here ? out.sort((p, q) => p.m - q.m) : out;
}
function dist(a, b) {
  const R = 6371008.8; const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r; const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
