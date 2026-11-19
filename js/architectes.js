// L'auteur et la date des monuments protégés de Paris (v198) : « Immeubles protégés au titre des Monuments historiques »,
// ministère de la Culture (base Mérimée), Licence Ouverte 2.0, lu par le robot dans l'API tabulaire de data.gouv.fr
// (tools/maj-architectes.py → data/architectes.json). Rien n'est envoyé : la jointure se fait par la référence PA.

/** Le fichier du robot, nettoyé : Map référence → { r, t, a: [auteurs], k: [clés, variantes comprises], d, lat?, lng? }. */
export function cleanArch(json) {
  const out = new Map();
  for (const x of Array.isArray(json?.items) ? json.items : []) {
    if (!x || typeof x.r !== 'string' || !/^PA\d{8}$/.test(x.r)) continue;
    const raw = (Array.isArray(x.a) ? x.a : []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 80));
    const { a, k } = mergeAuthors(raw);
    if (!a.length) continue;
    const ok = Number.isFinite(x.lat) && Number.isFinite(x.lng);
    out.set(x.r, { r: x.r, t: typeof x.t === 'string' ? x.t.slice(0, 120) : '', a, k, d: typeof x.d === 'string' ? x.d.slice(0, 30) : '', ...(ok ? { lat: x.lat, lng: x.lng } : {}) });
  }
  return out;
}

/**
 * La base Mérimée sépare par « ; » ce qui va ensemble : « Gabriel Jacques-Ange ; ou ; Gabriel Ange-Jacques (architecte) »,
 * « Jeanneret Charles-Edouard ; dit ; Le Corbusier (architecte) », « Delorme Philibert ; … ; (maître d'œuvre) ».
 * Le robot coupe à chaque « ; » : « ou » et « dit » s'affichaient comme des auteurs (34 monuments, vu le 19 nov. 2026).
 * Ici : une variante après « ou » est gardée seulement pour comparer (k) ; « dit X » se recolle au nom ; un rôle seul
 * se recolle au nom d'avant ; un « ou » ou un « dit » sans suite disparaît.
 */
export function mergeAuthors(raw) {
  const a = []; const k = [];
  const role = (s) => (s.match(/\s*(\([^)]*\))\s*$/) || [])[1] || '';
  const withRole = (name, r) => (r && !role(name) ? `${name} ${r}` : name);
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    const last = a.length - 1;
    if (s === 'ou' || s === 'dit') {
      const next = raw[i + 1];
      if (last < 0 || next == null || next === 'ou' || next === 'dit') continue;
      i++;
      if (s === 'ou') { k[last].push(authorKey(next)); a[last] = withRole(a[last], role(next)); }
      else { a[last] = `${authorName(a[last])} dit ${next}`.replace(/\s+/g, ' '); k[last].push(authorKey(next)); }
      continue;
    }
    if (/^dit\s+\S/.test(s) && last >= 0) { a[last] = `${authorName(a[last])} ${s}`; k[last].push(authorKey(s.slice(4))); continue; }
    if (/^\([^)]*\)$/.test(s)) { if (last >= 0) a[last] = withRole(a[last], s); continue; }
    a.push(s); k.push([authorKey(s)]);
  }
  return { a: a.map((s) => s.slice(0, 80)), k: k.map((x) => [...new Set(x.filter(Boolean))]) };
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
  const ks = [rec?.k?.[0]?.[0] ?? authorKey(rec?.a?.[0])]; // le premier nom tel qu'écrit (pas ses variantes) : comme avant la v244
  if (!ks[0] || !map) return [];
  const out = [];
  for (const x of map.values()) {
    if (x.r === rec.r || !Number.isFinite(x.lat) || !(x.k ?? x.a.map((a) => [authorKey(a)])).some((xs) => xs.some((y) => ks.includes(y)))) continue;
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
