/* v510 (ma réponse 17 A, maquette validée le 25 nov. 2026) : mon kit 72 h à cocher, d'après la liste du guide « Tous responsables »
   du Gouvernement (SGDSN, novembre 2025, p. 8-10), objet par objet, rien ajouté. Rien n'est rappelé tout seul. Mes coches et la
   date « vérifié le » restent sur le téléphone et dans ma sauvegarde, jamais chez un proche (mon choix A). Eau : « 6 litres par
   personne » (le guide) ; 2 personnes au départ, modifiable (mon choix A). */

export const KIT_SOURCE = 'Guide « Tous responsables » du Gouvernement (SGDSN), novembre 2025';
export const KIT_URL = 'https://www.info.gouv.fr/actualite/tous-responsables-un-guide-pour-mieux-faire-face-aux-risques';
export const WATER_L = 6;

/** [identifiant, nom, petite ligne] par groupe, dans l'ordre du guide. */
export const KIT = [
  ['Eau et nourriture', [
    ['eau', 'Eau en bouteilles', ''], // la petite ligne est calculée (litres)
    ['conserves', 'Conserves', 'Qui se gardent, sans cuisson si possible'],
    ['petitspots', 'Petits pots', ''],
    ['laitbebe', 'Lait infantile 1er âge', 'Liquide, prêt à l\'emploi'],
    ['cafe', 'Café, thé', ''],
    ['animaux', 'Nourriture pour animaux', ''],
    ['pastilles', 'Pastilles pour l\'eau', 'En dernier recours'],
  ]],
  ['Médicaments et premiers secours', [
    ['medicaments', 'Médicaments du quotidien', 'Et ceux de secours'],
    ['lunettes', 'Lunettes de vue', 'Une paire de secours'],
    ['gel', 'Alcool, gel hydroalcoolique', ''],
    ['masques', 'Masques', ''],
    ['pansements', 'Pansements', ''],
    ['compresses', 'Compresses', ''],
  ]],
  ['Matériel', [
    ['couteau', 'Couteau multifonctions', ''],
    ['ouvreboite', 'Ouvre-boîte', ''],
    ['rechaud', 'Réchaud', ''],
    ['radio', 'Radio à piles', 'Pour suivre les consignes des autorités'],
    ['batterie', 'Batterie externe', ''],
    ['piles', 'Piles de rechange', ''],
    ['chargeur', 'Chargeur de téléphone', ''],
    ['savon', 'Savon', ''],
  ]],
  ['S\'éclairer, rester au chaud', [
    ['lampe', 'Lampe de poche', ''],
    ['bougies', 'Bougies', ''],
    ['allumettes', 'Allumettes', ''],
    ['briquet', 'Briquet', ''],
    ['vetements', 'Vêtements chauds', ''],
    ['couverture', 'Couverture de survie', ''],
  ]],
  ['Papiers et clés', [
    ['cles', 'Double des clés', 'Maison et voiture'],
    ['identite', 'Photocopies des papiers d\'identité', ''],
    ['ordonnances', 'Ordonnances', ''],
    ['liquide', 'Argent liquide', 'Si les distributeurs ne marchent plus'],
  ]],
  ['Passer le temps', [
    ['jeux', 'Jeux', ''],
    ['livres', 'Livres', ''],
  ]],
];
export const KIT_IDS = KIT.flatMap(([, items]) => items.map(([id]) => id));

/** { ok: [identifiants cochés], at: date de vérification (ms) ou null, n: personnes (1 à 9) } ou null si rien n'est noté. */
export function cleanKit(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const ok = [...new Set((Array.isArray(v.ok) ? v.ok : []).filter((x) => KIT_IDS.includes(x)))];
  const at = Number.isFinite(v.at) && v.at > 1.6e12 && v.at < 4.1e12 ? v.at : null;
  const n = Number.isInteger(v.n) && v.n >= 1 && v.n <= 9 ? v.n : 2;
  if (!ok.length && !at && n === 2) return null;
  return { ok, at, n };
}
/** Fusion d'une sauvegarde : les coches des deux, la date la plus récente, le nombre de personnes du téléphone. */
export function mergeKit(mine, file) {
  const a = cleanKit(mine); const b = cleanKit(file);
  if (!a || !b) return a ?? b;
  return cleanKit({ ok: [...a.ok, ...b.ok], at: Math.max(a.at ?? 0, b.at ?? 0) || null, n: a.n });
}
export const waterText = (n) => `${WATER_L} litres par personne (${n} ${n > 1 ? 'personnes' : 'personne'} : ${WATER_L * n} litres)`;
