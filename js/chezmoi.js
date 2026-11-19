// « Chez moi » (v222, mes choix du 19 nov. 2026) : mon adresse, enregistrée une fois dans Réglages → Chez moi.
// Allumé, les distances, les durées et « Pars à … » partent de chez moi au lieu de ma position.
// Il s'éteint tout seul quand l'appli sait déjà (sans rien demander) que je suis à plus de 500 m de chez moi.
// L'adresse reste sur le téléphone et dans ma sauvegarde, jamais dans le fichier pour un proche. Aucune dépendance au navigateur.
import { distanceM } from './geo.js';
import { nearParis } from './parcours.js';

/** Au-delà de cette distance (sûre, précision du GPS déduite), je ne suis plus chez moi. */
export const HOME_AWAY_M = 500;

/** Mon adresse vérifiée : { lat, lng, label } dans Paris ou tout près (12 km du centre), sinon null. */
export function cleanHome(h) {
  if (!h || typeof h !== 'object') return null;
  const lat = Number(h.lat); const lng = Number(h.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (!nearParis({ lat, lng })) return null; // loin de Paris, les distances ne serviraient à rien (mon choix 1A)
  const label = typeof h.label === 'string' ? h.label.trim().slice(0, 80) : '';
  return { lat, lng, label: label || 'Mon adresse' };
}

/** Une position reçue me dit-elle, à coup sûr, que je ne suis plus chez moi ? (distance moins la marge d'erreur du GPS) */
export function awayFromHome(fix, home, m = HOME_AWAY_M) {
  if (!fix || !home || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return false;
  const acc = Number.isFinite(fix.acc) && fix.acc > 0 ? fix.acc : 0;
  return distanceM(fix, home) - acc > m;
}

/** Le point de départ « chez moi », au format des positions de l'appli (toujours frais, précision parfaite). */
export const homeOrigin = (home, now = Date.now()) => ({ lat: home.lat, lng: home.lng, acc: 0, time: now, kind: 'home', label: 'Chez moi' });

/** Court nom de l'adresse pour une ligne : « 12 rue des Martyrs » (sans le code postal ni la ville). */
export const homeShort = (home) => String(home?.label ?? '').replace(/\s+\d{5}\s.*$/, '').replace(/,\s*$/, '').trim() || 'Mon adresse';
