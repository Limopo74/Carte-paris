// Plaques commémoratives (v159) : les 2 600 plaques posées par la Ville de Paris, avec leur texte gravé
// (data/plaques.json, refait chaque mois par le robot avec tools/maj-plaques.py ; licence ODbL).
// Tout se trie sur le téléphone : la position n'est envoyée nulle part.
import { distanceM } from './geo.js';

/** Une plaque du fichier : { t: titre, x: texte gravé (retours à la ligne), a: adresse, o?: endroit sur l'immeuble, lat, lng }. */
export const plaqueOk = (p) => Boolean(p && typeof p.t === 'string' && typeof p.x === 'string' && p.x.trim()
  && Number.isFinite(p.lat) && Number.isFinite(p.lng));

/** Les plaques valides du fichier (un fichier abîmé donne une liste vide, jamais une erreur). */
export const plaquesOf = (data) => (Array.isArray(data?.items) ? data.items.filter(plaqueOk) : []);

/** Plaques à moins de `maxM` mètres de `here`, de la plus proche : [{ plaque, d }]. */
export function plaquesNear(list, here, maxM = 400, max = 50) {
  if (!here || !Number.isFinite(here.lat)) return [];
  const out = [];
  for (const p of list ?? []) {
    if (Math.abs(p.lat - here.lat) > 0.01) continue; // environ 1,1 km : inutile de calculer plus loin
    const d = distanceM(here, p);
    if (d <= maxM) out.push({ plaque: p, d });
  }
  return out.sort((a, b) => a.d - b.d).slice(0, max);
}

/** Début du texte, sur une ligne, pour la liste : « Ici est né le 7 novembre 1895… ». */
export function plaqueStart(p, n = 70) {
  const t = String(p?.x ?? '').replace(/\s*\n\s*/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n).replace(/\s+\S*$/, '')}…` : t;
}
