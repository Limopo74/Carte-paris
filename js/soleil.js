// Coucher du soleil à Paris : calculé sur le téléphone (formule de la NOAA, à une ou deux minutes près).
// Rien n'est demandé à un service : c'est de l'astronomie, pas une prévision.

const PARIS = { lat: 48.8566, lng: 2.3522 };
const rad = (d) => (d * Math.PI) / 180;

// Équation du temps (minutes) et angle horaire du soleil au lever / coucher (degrés), pour le jour de `date`.
function sunParts(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const n = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - start) / 86400000) + 1;
  const g = ((2 * Math.PI) / 365) * (n - 1 + 0.5);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(rad(90.833)) / (Math.cos(rad(PARIS.lat)) * Math.cos(dec)) - Math.tan(rad(PARIS.lat)) * Math.tan(dec)) * (180 / Math.PI);
  return { eq, ha };
}

/** Minutes après minuit (heure du téléphone) où le soleil se couche à Paris ce jour-là. */
export function sunsetMin(date) {
  const { eq, ha } = sunParts(date);
  return Math.round(720 - 4 * PARIS.lng - eq + 4 * ha - date.getTimezoneOffset());
}

/** Minutes après minuit (heure du téléphone) où le soleil se lève à Paris ce jour-là (v479, pastille météo). */
export function sunriseMin(date) {
  const { eq, ha } = sunParts(date);
  return Math.round(720 - 4 * PARIS.lng - eq - 4 * ha - date.getTimezoneOffset());
}

/** Le prochain lever ou coucher, pour la pastille : avant le lever, le lever ; le jour, le coucher ; après, le lever de demain. */
export function nextSun(now = new Date()) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const rise = sunriseMin(now);
  if (cur < rise) return { kind: 'rise', min: rise };
  const set = sunsetMin(now);
  if (cur < set) return { kind: 'set', min: set };
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12);
  return { kind: 'rise', min: sunriseMin(next) };
}

/** « 17 h 08 ». */
export const sunText = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

/**
 * La phrase à afficher quand une balade de `total` minutes, commencée maintenant, finirait après le coucher du soleil.
 * '' de jour (elle finit avant), et '' une fois le soleil couché (on le voit : inutile de le dire).
 */
export function nightNote(total, now = new Date()) {
  if (!(total > 0)) return '';
  const set = sunsetMin(now);
  const start = now.getHours() * 60 + now.getMinutes();
  if (start >= set || start + total <= set) return '';
  return `Le soleil se couche à ${sunText(set)} : parti maintenant, tu finirais de nuit.`;
}
