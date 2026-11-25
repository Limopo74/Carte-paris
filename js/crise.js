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

/* Points de crise (mes réponses 15 et 22, mon choix 30 B du 25 nov. 2026) : choisis par un appui long sur la carte (« Ce point »).
   Mon point de repli peut être loin de Paris (chez un proche) ; les deux rendez-vous sont pour moi et un proche.
   Sur le téléphone et dans ma sauvegarde (ajoutés à la restauration seulement s'il n'y en a pas), jamais dans le fichier pour un proche. */
export const CRISIS_POINTS = [
  { k: 'repli', name: 'Mon point de repli', icon: 'map-pin', sub: 'Chez un proche, même loin' },
  { k: 'pres', name: 'Près de chez nous', icon: 'users', sub: 'Dans le quartier' },
  { k: 'hors', name: 'Hors du quartier', icon: 'users', sub: 'Si le quartier est bloqué' },
];
const cleanPt = (p) => {
  const lat = Number(p?.lat); const lng = Number(p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const label = typeof p.label === 'string' ? p.label.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, label };
};
/** { repli?, pres?, hors? } ; null s'il n'y en a aucun. */
export function cleanCrisisPoints(o) {
  if (!o || typeof o !== 'object') return null;
  const out = {};
  for (const { k } of CRISIS_POINTS) { const p = cleanPt(o[k]); if (p) out[k] = p; }
  return Object.keys(out).length ? out : null;
}
/** Ceux du téléphone gardés ; ceux de ma sauvegarde ajoutés seulement là où il n'y a rien. */
export const mergeCrisisPoints = (mine, file) => cleanCrisisPoints({ ...(cleanCrisisPoints(file) ?? {}), ...(cleanCrisisPoints(mine) ?? {}) });
/** Le SMS pour un proche : le nom du point, l'adresse si connue, le lien de la carte. */
export function smsPointText(kind, p) {
  const c = CRISIS_POINTS.find((x) => x.k === kind);
  const what = kind === 'repli' ? 'Mon point de repli' : `Notre rendez-vous (${c ? c.name.toLowerCase() : ''})`;
  return `${what} : ${p.label ? `${p.label}. ` : ''}https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
}
