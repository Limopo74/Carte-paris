// Réglages souples (v214) : les distances et les durées que l'appli gardait fixes, et les lignes de la fiche qu'on peut masquer.
// Tout se règle par − et + : une valeur est toujours sur un cran, entre ses deux bornes. Rien n'est envoyé.

/** Chaque valeur réglable : au départ, borne basse, borne haute, cran. Mètres, minutes à pied ou jours. */
export const TUNING = Object.freeze({
  alertM: Object.freeze({ def: 100, min: 50, max: 500, step: 50, unit: 'm' }), // Ma position allumée : prévenir près d'un de mes lieux
  memoryM: Object.freeze({ def: 100, min: 50, max: 500, step: 50, unit: 'm' }), // bandeau « Déjà passé ici »
  walkM: Object.freeze({ def: 1000, min: 500, max: 3000, step: 250, unit: 'm' }), // Y aller : à pied en dessous, en transports au-delà
  eventsM: Object.freeze({ def: 3000, min: 1000, max: 5000, step: 500, unit: 'm' }), // tous les onglets de Sorties
  ttbMin: Object.freeze({ def: 15, min: 5, max: 30, step: 5, unit: 'min' }), // TTB dans Autour de moi
  rainMin: Object.freeze({ def: 10, min: 5, max: 20, step: 5, unit: 'min' }), // passages couverts quand il pleut
  traceMin: Object.freeze({ def: 2, min: 1, max: 5, step: 1, unit: 'min' }), // mes lieux près du tracé d'un circuit
  askDays: Object.freeze({ def: 30, min: 15, max: 90, step: 15, unit: 'jours' }), // « Tu y es allé ? »
});

const valid = (t, v) => typeof v === 'number' && Number.isFinite(v) && v >= t.min && v <= t.max && (v - t.min) % t.step === 0;

/** Toutes les valeurs, vérifiées une par une : hors bornes, entre deux crans ou illisible → valeur de départ. */
export function cleanTuning(o) {
  const out = {};
  for (const [k, t] of Object.entries(TUNING)) out[k] = valid(t, o?.[k]) ? o[k] : t.def;
  return out;
}

/** Un cran de moins (dir −1) ou de plus (dir +1) : { value, edge } ; edge = 'min' ou 'max' quand on est déjà au bout. */
export function stepTuning(tuning, key, dir) {
  const t = TUNING[key];
  const cur = cleanTuning(tuning)[key];
  const next = cur + (dir > 0 ? t.step : -t.step);
  if (next < t.min) return { value: cur, edge: 'min' };
  if (next > t.max) return { value: cur, edge: 'max' };
  return { value: next, edge: null };
}

/** La valeur écrite en clair : « 100 m », « 1,25 km », « 15 min », « 30 jours ». */
export function tuningText(key, v) {
  const { unit } = TUNING[key];
  if (unit !== 'm') return `${v} ${unit}`;
  return v < 1000 ? `${v} m` : `${String(v / 1000).replace('.', ',')} km`;
}

/** Lignes de la fiche d'un lieu qu'on peut masquer : QR code, Avis Google, Uber jusqu'ici. */
export const FICHE_LINES = Object.freeze(['qr', 'avis', 'uber']);
export const cleanFicheHidden = (list) => FICHE_LINES.filter((k) => Array.isArray(list) && list.includes(k));
