/* Mode crise (claude/idee-mode-crise.md, mes réponses 1 à 6, 11, 14 et 16 du 25 nov. 2026 ; maquette validée, mon choix 29 A).
   Allumé : une étiquette sous la barre du haut (« Mode crise · Crue · Terminer ») ; Autour de moi commence par les gestes
   utiles ; fontaines et toilettes s'allument pour une crue, une coupure ou une canicule. Aucun bouton ne bouge de place.
   Gardé sur le téléphone (une crise dure plusieurs jours), jamais dans la sauvegarde ni chez un proche. */

export const CRISES = [
  { k: 'crue', name: 'Crue', icon: 'waves', sub: 'La Seine déborde ou va déborder', water: true },
  { k: 'coupure', name: 'Coupure d\'électricité ou de réseau', short: 'Coupure', icon: 'zap', sub: 'Électricité, téléphone ou internet coupés', water: true },
  { k: 'canicule', name: 'Canicule', icon: 'thermometer-sun', sub: 'Forte chaleur plusieurs jours', water: true },
  { k: 'abri', name: 'Confinement ou attentat', short: 'Abri', icon: 'house', sub: 'Rester à l\'abri, alerter sans bruit', water: false },
  { k: 'greve', name: 'Grève ou panne des transports', short: 'Grève', icon: 'train-front', sub: 'Métro, RER ou bus arrêtés', water: false },
];
export const crisisOf = (k) => CRISES.find((c) => c.k === k) ?? null;
/** Le nom court, pour l'étiquette du haut. */
export const crisisShort = (k) => { const c = crisisOf(k); return c ? (c.short ?? c.name) : ''; };

/** { k, since, pratBefore } ou null. `pratBefore` : Fontaines et toilettes étaient-elles allumées avant (pour les remettre comme avant). */
export function cleanCrisis(o) {
  if (!o || typeof o !== 'object' || !crisisOf(o.k)) return null;
  return { k: o.k, since: Number.isFinite(o.since) ? o.since : Date.now(), pratBefore: o.pratBefore === true };
}

/** Le SMS « Je vais bien » (réponse 14) ; la position seulement si je la coche, et si elle est là. */
export function smsOkText(at = null) {
  if (!at || !Number.isFinite(at.lat) || !Number.isFinite(at.lng)) return 'Je vais bien.';
  const p = `${at.lat.toFixed(5)},${at.lng.toFixed(5)}`;
  return `Je vais bien. Je suis ici : https://www.google.com/maps/search/?api=1&query=${p}`;
}
