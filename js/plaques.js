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

/* ---------- Chercher un nom dans les plaques (v198, la loupe) ---------- */

const plainText = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/**
 * Les plaques qui portent tous les mots de `q`, en mots entiers (« cole » ne trouve pas « Colette », « hugo » ne trouve pas
 * « Hugonnet ») : [{ plaque, d, title }]. Celles dont le titre porte le nom d'abord, puis la plus proche de `here`.
 * Liste vide sous 3 lettres. On dit « porte ce nom », jamais « a vécu ici » : une plaque peut seulement citer la personne.
 */
export function plaquesFor(list, q, here = null) {
  const words = plainText(q).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (plainText(q).replace(/[^a-z0-9]/g, '').length < 3 || !words.length) return [];
  const res = words.map((w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`));
  const all = (text) => res.every((r) => r.test(text));
  const out = [];
  for (const p of list) {
    const t = plainText(p.t);
    const title = all(t);
    if (!title && !all(`${t} ${plainText(p.x)}`)) continue;
    out.push({ plaque: p, d: here ? distanceM(here, p) : 0, title });
  }
  return out.sort((a, b) => (b.title - a.title) || (a.d - b.d));
}
