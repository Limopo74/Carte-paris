// v467 (mes choix du 25 nov. : la liste du plus proche, depuis ma position, 5 étapes, une tombe au plus, dans
// Réglages → Autres réglages sous Photos des salles) : « À mettre à jour sur place ».
// Ce qui ne se vérifie que sur place : la photo d'une salle de l'agenda, d'un point de vue gratuit ou d'une tombe célèbre ;
// un resto ou un commerce qui « a pu fermer » ; des horaires notés il y a plus d'un an. Tout se trie sur le téléphone :
// ma position ne part nulle part.

export const CHECK_MAX = 5;
export const CHECK_MAX_TOMBS = 1;
export const HOURS_OLD_MS = 365 * 864e5;

/** Les sortes d'étapes, dans l'ordre où l'on départage deux étapes à la même distance. */
export const CHECK_KINDS = ['stale', 'hours', 'venue', 'vue', 'tomb'];

/** Des horaires que j'ai notés il y a plus d'un an (la fiche dit alors « horaires notés en … »). */
export const hoursOld = (p, now = Date.now()) => Boolean(p?.hours) && Number.isFinite(p?.hoursAt) && now - p.hoursAt > HOURS_OLD_MS;

/**
 * Ce qu'un de mes lieux demande sur place : 'stale' (a pu fermer, `staleAt` donné par staleSince), 'hours' (horaires de plus
 * d'un an), ou null. Jamais un lieu fermé, ni celui d'un proche (ses données viennent de lui). Un lieu vu ouvert il y a moins
 * d'un an (`checked`, « Toujours ouvert ») ne redemande pas ses horaires : sinon il reviendrait juste après « Toujours ouvert ».
 */
export function pointCheck(p, staleAt, now = Date.now()) {
  if (!p || p.gone || p.owner || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null;
  if (staleAt) return 'stale';
  if (hoursOld(p, now) && !(Number.isFinite(p.checked) && now - p.checked < HOURS_OLD_MS)) return 'hours';
  return null;
}

/**
 * Les étapes les plus proches de `from` : `max` au plus, `maxTombs` tombes au plus, du plus proche au plus loin.
 * Une étape sans position est écartée ; sans position de départ, aucune étape (pas de distance inventée).
 * `cands` : [{ kind, key, name, lat, lng, … }] ; rend les mêmes objets avec `d` (mètres).
 */
export function pickChecks(cands, from, distanceM, { max = CHECK_MAX, maxTombs = CHECK_MAX_TOMBS } = {}) {
  if (!from || !Number.isFinite(from.lat) || !Number.isFinite(from.lng)) return [];
  const seen = new Set();
  const all = [];
  for (const c of cands ?? []) {
    if (!c || !CHECK_KINDS.includes(c.kind) || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const key = `${c.kind}:${c.key ?? c.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    all.push({ ...c, d: distanceM(from, c) });
  }
  all.sort((a, b) => a.d - b.d || CHECK_KINDS.indexOf(a.kind) - CHECK_KINDS.indexOf(b.kind) || String(a.name).localeCompare(String(b.name), 'fr'));
  const out = [];
  let tombs = 0;
  for (const c of all) {
    if (out.length >= max) break;
    if (c.kind === 'tomb') { if (tombs >= maxTombs) continue; tombs += 1; }
    out.push(c);
  }
  return out;
}

/** La petite ligne d'une étape, sans la distance. */
export function checkWhat(c, { hoursMonth = '' } = {}) {
  switch (c?.kind) {
    case 'stale': return 'Encore ouvert ?';
    case 'hours': return hoursMonth ? `Horaires notés en ${hoursMonth}` : 'Horaires anciens';
    case 'venue': return 'Photo de la salle';
    case 'vue': return 'Photo du point de vue';
    case 'tomb': return 'Photo de la tombe';
    default: return '';
  }
}
