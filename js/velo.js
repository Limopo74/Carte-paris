/* Pistes à vélo : data/velo.json, refait par le robot depuis les « Linéaires d'aménagement cyclable » de la Ville de Paris
   (tools/maj-velo.py). Deux familles : « s » séparé des voitures (trait plein), « c » rue calme (pointillé).
   Rien n'est demandé depuis le téléphone, aucune position n'est envoyée : le fichier est lu puis dessiné ici. */
import { decodeTrace } from './circuits.js';

/** Le fichier du robot → { updated, s: [[[lat, lng], …], …], c: […] } ; illisible : null. */
export function cleanVelo(j) {
  if (!j || typeof j !== 'object') return null;
  const read = (list) => (Array.isArray(list) ? list.map(decodeTrace).filter((t) => t.length >= 2) : []);
  const s = read(j.s);
  const c = read(j.c);
  if (!s.length && !c.length) return null;
  const updated = typeof j.updated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.updated) ? j.updated : '';
  return { updated, s, c };
}

/** « 19 nov. 2026 » ; date absente ou illisible : ''. */
export function veloDate(updated) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated ?? '')) return '';
  const d = new Date(`${updated}T12:00:00Z`);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' });
}

/** La petite étiquette sous la barre du haut : toujours la date de la Ville et ce qu'on ne voit pas (pas d'information fausse). */
export function veloNoteText(updated) {
  const d = veloDate(updated);
  return d ? `Vélo : pistes du ${d} · sans les travaux` : 'Vélo : pistes de date inconnue · sans les travaux';
}

/** Épaisseur du trait selon le zoom : fin de loin pour ne pas couvrir la carte, plus épais en rue. */
export const veloWeight = (zoom) => (zoom >= 16 ? 5 : zoom >= 15 ? 4 : zoom >= 14 ? 3 : zoom >= 13 ? 2 : 1.5);
/** Les rues calmes (pointillé) seulement à partir du quartier : de plus loin, des centaines de petits bouts brouillent la carte. */
export const VELO_CALM_ZOOM = 14;
