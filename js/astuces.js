// Astuces au démarrage (idée du 25 nov. 2026, claude/idee-astuces.md ; mes choix 1B 2B 3B 4B 5A 6A, puis 1A 2A 3A 4B 5A).
// Au plus une par jour, dans une petite carte en bas (la forme de « Dans la rue, à 5 min ») ; « Montre-moi » ouvre le vrai écran
// et fait palpiter le vrai bouton. Seulement des fonctions que « Ce que j'utilise » n'a jamais vu toucher.
// Ce qui est gardé ici (les astuces vues, le jour de la dernière) reste sur le téléphone, hors sauvegarde, comme « Ce que j'utilise ».
// Le nombre d'astuces au plus est un réglage (TUNING.tipsMax, js/reglages.js).

import { cleanLabel } from './usage.js';

export const TIPS_KEY = 'carte-paris.astuces';

/**
 * Chaque astuce : `go` dit où la montrer.
 *  - { tool } : un bouton de la colonne (sur la carte, dans son ⋯ Plus, ou masqué : l'écran s'ouvre alors directement) ;
 *  - { chip } : un bouton de la barre du haut (sur la barre ou dans son ⋯ Plus ; masqué : l'astuce ne sort pas) ;
 *  - { open, find } : un écran à ouvrir, puis la ligne dont le titre est `find` ;
 *  - { el } : un bouton fixe de la carte (son id).
 * `used` : les noms de bouton (comptés par « Ce que j'utilise ») qui montrent que la fonction sert déjà.
 * Les petites lignes reprennent des mots déjà écrits dans l'appli (nom du bouton, ligne de menu, Aide) : rien de nouveau à vérifier.
 */
export const TIPS = Object.freeze([
  { id: 'notes', icon: 'notebook-pen', title: 'Note du jour', sub: 'Une note, sans lieu', go: { tool: 'notes' }, used: ['Note du jour'] },
  { id: 'vu', icon: 'camera', title: 'Vu en passant', sub: 'Une photo tout de suite', go: { tool: 'vu' }, used: ['Vu en passant'] },
  { id: 'myparis', icon: 'map', title: 'Mon Paris', sub: 'Ton journal, ton planning, tes chiffres', go: { tool: 'myparis' }, used: ['Mon Paris'] },
  { id: 'pratique', icon: 'droplets', title: 'Fontaine et WC', sub: 'Fontaine ou toilettes les plus proches', go: { tool: 'pratique' }, used: ['Fontaine ou toilettes les plus proches', 'Fontaines et WC sur la carte'] },
  { id: 'metro', icon: 'train-front', title: 'Métro', sub: 'La station la plus proche', go: { tool: 'metro' }, used: ['Métro le plus proche'] },
  { id: 'velib', icon: 'bike', title: 'Vélib\'', sub: '3 stations avec vélos ou places', go: { tool: 'velib' }, used: ['Vélib\' le plus proche', 'Vélib\' sur la carte'] },
  { id: 'home', icon: 'house', title: 'Rentrer', sub: 'Quel métro vers ta station Maison', go: { tool: 'home' }, used: ['Rentrer'] },
  { id: 'circuits', icon: 'signpost', title: 'Circuits de visite', sub: 'Des balades d\'un métro à l\'autre', go: { tool: 'circuits' }, used: ['Circuits de visite'] },
  { id: 'crue', icon: 'waves', title: 'Zones inondables', sub: 'La crue de 1910 sur la carte', go: { tool: 'crue' }, used: [] }, // son bouton a un nom trop long pour « Ce que j'utilise » (44 signes) : on ne sait pas s'il a servi
  { id: 'crise', icon: 'triangle-alert', title: 'Mode crise', sub: 'Crue, coupure, canicule, abri', go: { tool: 'crise' }, used: ['Mode crise'] },
  { id: 'chiffres', icon: 'timer', title: 'Mes chiffres', sub: 'Marche, air et lieux', go: { open: 'myparis', find: 'Mes chiffres' }, used: ['Mes chiffres'] },
  { id: 'kit', icon: 'backpack', title: 'Mon kit 72 h', sub: 'La liste à cocher, dans Mon Paris', go: { open: 'myparis', find: 'Mon kit 72 h' }, used: ['Mon kit 72 h'] },
  { id: 'parcours', icon: 'route', title: 'Mes parcours', sub: 'Autour de moi → Itinéraire', go: { open: 'near', find: 'Itinéraire' }, used: ['Mes parcours'] },
  { id: 'boucle', icon: 'repeat', title: 'Boucle à courir', sub: 'Autour de moi → Itinéraire', go: { open: 'near', find: 'Itinéraire' }, used: ['Boucle à courir'] },
  { id: 'curiosites', icon: 'book-open-text', title: 'Curiosités', sub: 'Les plaques à moins de 5 min', go: { open: 'near', find: 'Curiosités' }, used: ['Curiosités'] },
  { id: 'newcircuit', icon: 'plus', title: 'Nouveau circuit', sub: 'En bas de Circuits de visite', go: { open: 'circuits', find: 'Nouveau circuit' }, used: ['Nouveau circuit'] },
  { id: 'mots', icon: 'message-square-text', title: 'Mots tout prêts', sub: 'Pour tes impressions', go: { open: 'autres', find: 'Mots tout prêts' }, used: ['Mots tout prêts'] },
  { id: 'fonds', icon: 'layers', title: 'Fonds de carte', sub: 'Plan IGN, photo aérienne…', go: { el: 'btnStyle' }, used: ['Fond de carte'] },
  { id: 'meteo', icon: 'thermometer-sun', title: 'Météo et air', sub: 'Touche la pastille en haut', go: { el: 'wxBadge' }, used: [], screens: ['meteo'] },
  { id: 'velo', icon: 'spline', title: 'Pistes à vélo', sub: 'Sans voitures, et rues calmes', go: { chip: 'velo' }, used: ['Pistes à vélo', 'Pistes à vélo sur la carte'] },
]);

const day = (now) => { const d = new Date(now); const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

/** Lecture tolérante : abîmé ou absent → rien de vu. Une astuce retirée de la liste est oubliée. */
export function readTips(raw) {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const ids = new Set(TIPS.map((t) => t.id));
    const seen = Array.isArray(o?.seen) ? [...new Set(o.seen.filter((x) => ids.has(x)))] : [];
    return { seen, day: typeof o?.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.day) ? o.day : '' };
  } catch { return { seen: [], day: '' }; }
}

/** Une fonction déjà touchée : un de ses noms touché au moins une fois (n'importe quel écran), ou un de ses écrans ouvert. */
export function tipUsed(tip, usage) {
  if (!usage || usage.off) return false;
  const names = new Set(tip.used.map(cleanLabel).filter(Boolean)); // le nom tel que « Ce que j'utilise » le garde
  for (const row of Object.values(usage.b ?? {})) for (const [l, v] of Object.entries(row)) if (names.has(l) && v?.[1] > 0) return true;
  return (tip.screens ?? []).some((k) => (usage.s?.[k]?.n ?? 0) > 0);
}

/**
 * L'astuce du jour, ou null : réglage à 0, déjà une aujourd'hui, toutes vues, plafond atteint, rien qui reste.
 * `ok(tip)` dit si elle peut se montrer sur ce téléphone (bouton masqué, pastille éteinte…).
 * Renvoie { tip, n, total } : « Astuce · n sur total » ; total = vues + celles qui restent, jamais plus que le réglage.
 */
export function pickTip(progress, usage, max, now = Date.now(), ok = () => true) {
  const p = readTips(progress);
  if (!(max > 0) || p.day === day(now) || p.seen.length >= max) return null;
  const left = TIPS.filter((t) => !p.seen.includes(t.id) && !tipUsed(t, usage) && ok(t));
  if (!left.length) return null;
  return { tip: left[0], n: p.seen.length + 1, total: Math.min(max, p.seen.length + left.length) };
}

/** Après l'affichage : l'astuce est vue (elle ne revient pas), et plus rien jusqu'au lendemain. */
export function markTip(progress, id, now = Date.now()) {
  const p = readTips(progress);
  return { seen: p.seen.includes(id) ? p.seen : [...p.seen, id], day: day(now) };
}
