/* Boulangeries primées (v265) : en bas d'Autour de moi, les plus proches, à la distance du plus grand cercle.
   Deux listes tenues à la main, vérifiées le 20 novembre 2026 :
   - Grand Prix de la baguette de tradition française de la Ville de Paris, les 10 premiers de 2024, 2025 et 2026
     (pages paris.fr « La meilleure baguette de Paris 2024/2025/2026 se déguste… », lues dans le navigateur) ;
   - concours du meilleur croissant du Grand Paris au beurre Charentes-Poitou AOP, Syndicat des boulangers du Grand Paris
     (ce n'est pas la Ville) : les 10 premiers de 2024 et 2025 d'après le site du Syndicat, adresses de Paris seulement ;
     2026 : le Syndicat n'a pas mis sa liste en ligne ; seule la gagnante, donnée par plusieurs journaux, est gardée
     (la 3e, Maison Thevenin, a plusieurs boutiques dans le 6e : adresse primée incertaine, pas gardée).
   Positions : base des adresses de l'IGN (data.geopf.fr/geocodage). « Graine », 74 avenue Gambetta (20e, baguette 2025, 6e) :
   numéro absent de la base, pas placé plutôt que deviné.
   Un prix vaut pour l'adresse primée, jamais pour l'enseigne (La Parisienne a plusieurs boulangeries).
   Rien sur les heures d'ouverture ; une boulangerie a pu fermer ou changer de main depuis : l'écran le dit. */
export const BAGUETTES_CHECKED = '20 novembre 2026';
export const BAGUETTES_CHECKED_ON = '2026-11-20';
export const BAGUETTES_SOURCE = 'https://www.paris.fr/pages/la-meilleure-baguette-de-paris-2026-se-deguste-dans-le-14e-arrondissement-34064';
export const CROISSANT_SOURCE = 'https://boulangersdugrandparis.com/2025-resultats-meilleur-croissant-du-grand-paris-au-beurre-charentes-poitou-aop/';

// b : baguette (Ville de Paris) ; c : croissant (Syndicat des boulangers du Grand Paris). [année, rang]
const shop = (name, address, lat, lng, b = [], c = []) => ({ name, address, lat, lng, b, c });
export const BAGUETTES = [
  shop('Le Fournil Didot', '103, rue Didot (14e)', 48.82829, 2.316055, [[2026, 1]]),
  shop('Boulangerie B&S Nation', '24, place de la Nation (12e)', 48.847262, 2.396288, [[2026, 2]]),
  shop('L\'Écrin Gourmand', '15, avenue du Docteur-Arnold-Netter (12e)', 48.841953, 2.404833, [[2026, 3], [2024, 5]]),
  shop('Maison Daguet', '175, rue de la Convention (15e)', 48.838054, 2.294872, [[2026, 4]]),
  shop('Boulangerie Laurent B.', '112, rue Saint-Dominique (7e)', 48.858477, 2.302211, [[2026, 5]]),
  shop('Boulangerie Guyot Ferreira', '28, rue Monge (5e)', 48.846695, 2.351393, [[2026, 6], [2025, 3]]),
  shop('Maison Leparq', '6, rue de Lourmel (15e)', 48.850323, 2.291965, [[2026, 7]]),
  shop('Boulangerie Moderne Rabineau', '16, rue des Fossés-Saint-Jacques (5e)', 48.845507, 2.344231, [[2026, 8]], [[2025, 4], [2024, 7]]),
  shop('Aux Délices de Glacière', '90, boulevard Auguste-Blanqui (13e)', 48.830952, 2.345462, [[2026, 9], [2025, 4]]),
  shop('Au Paradis du Gourmand', '156, rue Raymond-Losserand (14e)', 48.830587, 2.311338, [[2026, 10]]),
  shop('La Parisienne', '12, rue du Faubourg-Poissonnière (10e)', 48.871577, 2.347996, [[2025, 1]], [[2025, 2]]),
  shop('Aux Délices du Palais', '60, boulevard Brune (14e)', 48.825851, 2.312809, [[2025, 2]]),
  shop('La Petite Alsacienne', '45, rue Raymond-Losserand (14e)', 48.83499, 2.320239, [[2025, 5]]),
  shop('Le Marquis de Saint-Cyr', '20, boulevard Gouvion-Saint-Cyr (17e)', 48.884016, 2.288676, [[2025, 7]]),
  shop('Le Délice de Bagnolet', '42, boulevard Mortier (20e)', 48.867253, 2.409197, [[2025, 8]]),
  shop('Le Moulin de la Croix-Nivert', '39, rue de la Croix-Nivert (15e)', 48.845996, 2.298911, [[2025, 9]], [[2025, 6], [2024, 3]]),
  shop('Alexine', '109, avenue de Saint-Ouen (17e)', 48.894566, 2.327781, [[2025, 10]]),
  shop('Boulangerie Utopie', '20, rue Jean-Pierre-Timbaud (11e)', 48.865348, 2.368668, [[2024, 1]]),
  shop('Maison Doré', '29, rue Gay-Lussac (5e)', 48.844228, 2.342244, [[2024, 2]]),
  shop('La Parisienne', '85, rue Saint-Dominique (7e)', 48.859679, 2.30797, [[2024, 3]]),
  shop('Boulangerie Rougès', '45, avenue de Saint-Ouen (17e)', 48.890738, 2.326495, [[2024, 4]]),
  shop('Boulangerie AA', '63, rue du Javelot (13e)', 48.825855, 2.364514, [[2024, 6]]),
  shop('Boulangerie Paris and Co', '4, rue de la Convention (15e)', 48.845458, 2.278059, [[2024, 7]]),
  shop('Maison M', '2, avenue de la Porte-Didot (14e)', 48.826288, 2.310462, [[2024, 8]]),
  shop('Aux Délices de Vaugirard', '48, rue Madame (6e)', 48.848193, 2.331549, [[2024, 9]]),
  shop('Du Pain et Vous', '63, avenue Bosquet (7e)', 48.856153, 2.305043, [[2024, 10]]),
  // Croissant seulement
  shop('Boulangerie du Sentier', '47, rue du Caire (2e)', 48.867899, 2.349031, [], [[2026, 1]]),
  shop('Boulangerie Mille et Un', '32, rue Saint-Placide (6e)', 48.848646, 2.3255, [], [[2025, 3], [2024, 10]]),
  shop('Boulangerie Lorette', '48, rue Bobillot (13e)', 48.82668, 2.351078, [], [[2025, 5]]),
  shop('Magali Charonne', '135, rue de Charonne (11e)', 48.855131, 2.386875, [], [[2025, 7]]),
  shop('La Fabrique aux Gourmandises', '82, rue de l\'Amiral-Mouchez (14e)', 48.820913, 2.342958, [], [[2025, 9]]),
  shop('Georges Doucet', '234, rue du Faubourg-Saint-Antoine (12e)', 48.849338, 2.388756, [], [[2024, 1]]),
  shop('Boulangerie Victoire', '12, rue Cadet (9e)', 48.874632, 2.342846, [], [[2024, 2]]),
  shop('Les Saveurs de Parmentier', '103, avenue Parmentier (11e)', 48.866963, 2.373104, [], [[2024, 5]]),
  shop('Mildo', '93, rue du Commerce (15e)', 48.84398, 2.293372, [], [[2024, 8]]),
];

const rank = (r) => (r === 1 ? '1re' : `${r}e`);
const years = (list) => list.map(([y, r]) => `${rank(r)} en ${y}`).join(', ');
/** « Baguette : 6e en 2026, 3e en 2025 · Croissant : 4e en 2025 » (le plus récent d'abord ; espaces insécables). */
export function prizeText(s) {
  return [s.b.length ? `Baguette : ${years(s.b)}` : '', s.c.length ? `Croissant : ${years(s.c)}` : ''].filter(Boolean).join(' · ');
}

/** Les boulangeries primées à moins de `maxM` mètres de `here`, de la plus proche à la plus loin. */
export function prizedNear(here, maxM, distance) {
  if (!here || !Number.isFinite(here.lat) || !Number.isFinite(here.lng) || !(maxM > 0)) return [];
  return BAGUETTES.map((x) => ({ x, d: distance(here, x) })).filter((t) => t.d <= maxM).sort((a, b) => a.d - b.d);
}
