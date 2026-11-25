/* Commissariats d'arrondissement de Paris (v485, mon choix C du 25 nov. 2026 ; idee-mode-crise.md réponse 24A, hors mode crise).
   Liste tenue à la main, relevée fiche par fiche sur la page officielle de la Préfecture de Police « Vos points d'accueil »
   (prefecturedepolice.interieur.gouv.fr/demarches/vos-points-daccueil, « Dernière mise à jour le 01/10/26 », lue le 25 nov. 2026).
   Positions : base des adresses de l'IGN (Géoplateforme, numéro exact) ; 8e : l'IGN ne trouve que la rue, position du bâtiment
   « Police Nationale » d'OpenStreetMap (way 1386587590), à 45 m du milieu de la rue donné par l'IGN.
   Horaires : seulement ce qu'écrit chaque fiche (« 24H/24H » ou des heures sans jours) ; l'annexe 1er–4e (« horaires non encore
   définis ») n'est pas reprise. Revue chaque 1er septembre avec les urgences (tâche annuelle). */

export const COMMISSARIATS_CHECKED = '25 novembre 2026';
export const COMMISSARIATS_SOURCE = 'https://www.prefecturedepolice.interieur.gouv.fr/demarches/vos-points-daccueil';

const c = (arr, name, address, lat, lng, h24, hours = '') => ({ arr, name, address, lat, lng, h24, hours });
export const COMMISSARIATS = [
  c([1, 2, 3, 4], 'Commissariat central 1er à 4e', '1 rue Gabriel Vicaire, 75003', 48.864861, 2.361419, false, '9h-20h'),
  c([5, 6], 'Commissariat central 5e et 6e', '4 rue de la Montagne-Sainte-Geneviève, 75005', 48.849473, 2.348571, true),
  c([7], 'Commissariat central 7e', '7-9 rue Fabert, 75007', 48.862113, 2.31177, true),
  c([8], 'Commissariat central 8e', '1 avenue de Selves, 75008', 48.8675392, 2.3118257, true),
  c([9], 'Commissariat central 9e', '14 bis rue Chauchat, 75009', 48.873555, 2.339734, true),
  c([10], 'Commissariat central 10e', '26 rue Louis Blanc, 75010', 48.880797, 2.36587, false, '9h-19h'),
  c([11], 'Commissariat central 11e', '12-14 passage Charles Dallery, 75011', 48.854238, 2.378305, false, '9h-20h'),
  c([12], 'Commissariat central 12e', '80 avenue Daumesnil, 75012', 48.844302, 2.381172, true),
  c([13], 'Commissariat central 13e', '144 boulevard de l\'Hôpital, 75013', 48.832945, 2.356153, true),
  c([14], 'Commissariat central 14e', '114-116 avenue du Maine, 75014', 48.836198, 2.323203, true),
  c([15], 'Commissariat central 15e', '250 rue de Vaugirard, 75015', 48.84002, 2.302345, true),
  c([16], 'Commissariat central 16e', '62 avenue Mozart, 75016', 48.854334, 2.26902, true),
  c([17], 'Commissariat central 17e', '19-21 rue Truffaut, 75017', 48.885114, 2.322312, true),
  c([18], 'Commissariat central 18e', '79 rue de Clignancourt, 75018', 48.889655, 2.348185, true),
  c([19], 'Commissariat central 19e', '3-5 rue Erik Satie, 75019', 48.884295, 2.38624, true),
  c([20], 'Commissariat central 20e', '3-7 rue des Gâtines, 75020', 48.865126, 2.397363, true),
];

/** Ce que la fiche officielle écrit des horaires, rien de plus (les jours ne sont pas écrits pour les heures). */
export const hoursText = (x) => (x.h24 ? 'Ouvert 24 h/24' : `Horaires affichés : ${x.hours}`);

/** Les plus proches, à moins de `max` mètres (rien loin de Paris). */
export function commissariatsNear(origin, dist, n = 2, max = 4000) {
  return COMMISSARIATS.map((x) => ({ x, d: dist(origin, x) })).filter((t) => t.d <= max).sort((a, b) => a.d - b.d).slice(0, n);
}
