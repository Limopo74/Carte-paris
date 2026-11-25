/* v508 (mes réponses 12 bis A et 13 A du 25 nov. 2026, idee-mode-crise.md) : les urgences générales adultes de l'AP-HP dans
   Paris, en mode crise. Liste tenue à la main d'après la page officielle de l'AP-HP « Nos services d'accueil des urgences
   générales et spécialisées » (aphp.fr, « Mis à jour le 27/04/2026 », lue le 25 nov. 2026) : les 9 services situés dans
   Paris (les urgences pour enfants et les hôpitaux privés ne sont pas repris). L'AP-HP écrit que ses hôpitaux accueillent
   24 h sur 24 et tous les jours ; Hôtel-Dieu : « accueille les patients adultes 24h/24 et 7j/7 », entrée 7 rue de la Cité.
   Positions : base des adresses de l'IGN (Géoplateforme, numéro exact) ; Saint-Antoine : l'IGN ne trouve que la rue, point
   d'adresse du 184 dans OpenStreetMap. Téléphones : ceux de la page (accueil des urgences). Revue chaque 1er septembre avec
   les commissariats (tâche annuelle). */

export const URGENCES_CHECKED = '25 novembre 2026';
export const URGENCES_SOURCE = 'https://www.aphp.fr/vous-soigner/les-prises-en-charge/les-urgences/nos-services-daccueil-des-urgences-generales-et';

const u = (name, address, lat, lng, tel) => ({ name, address, lat, lng, tel });
export const URGENCES = [
  u('Hôtel-Dieu', '7 rue de la Cité, 75004', 48.854724, 2.347937, '0142348232'),
  u('Lariboisière', '2 rue Ambroise-Paré, 75010', 48.881901, 2.353763, '0149956445'),
  u('Saint-Louis', '1 avenue Claude-Vellefaux, 75010', 48.872907, 2.369788, '0142499117'),
  u('Saint-Antoine', '184 rue du Faubourg Saint-Antoine, 75012', 48.8474086, 2.3821554, '0149282708'),
  u('Pitié-Salpêtrière', '47 boulevard de l\'Hôpital, 75013', 48.840209, 2.36322, '0142160000'),
  u('Cochin – Port-Royal', '123 boulevard de Port-Royal, 75014', 48.839126, 2.33793, '0158412722'),
  u('Hôpital européen Georges-Pompidou', '20 rue Leblanc, 75015', 48.839637, 2.273756, '0156092000'),
  u('Bichat – Claude-Bernard', '46 rue Henri Huchard, 75018', 48.899124, 2.330921, '0140258080'),
  u('Tenon', '4 rue de la Chine, 75020', 48.86572, 2.400762, '0156016405'),
];

/** Toutes, de la plus proche à la plus loin (sans position : dans l'ordre de la liste). */
export function urgencesNear(origin, dist) {
  if (!origin) return URGENCES.map((x) => ({ x, d: null }));
  return URGENCES.map((x) => ({ x, d: dist(origin, x) })).sort((a, b) => a.d - b.d);
}

/** « 01 42 34 82 32 » */
export const telText = (t) => t.replace(/(\d{2})(?=\d)/g, '$1 ');

/* Pharmacie de garde (13 A) : le service officiel Résogardes, 32 37 (0,35 € la minute) ou 3237.fr (gratuit). Le site peut
   renvoyer au téléphone quand la pharmacie ne publie pas ses coordonnées (réponse ministérielle, Assemblée nationale). */
export const PHARMA_TEL = '3237';
export const PHARMA_URL = 'https://www.3237.fr/';

/* Radio (20 A) : France Inter 87.8 (FAQ de l'Arcom, émetteur de la tour Eiffel) ; franceinfo 105.5 (émetteur de la tour Eiffel :
   Wikipédia et annuaires des radios ; pas de page de Radio France trouvée le 25 nov. 2026). */
export const RADIO_TEXT = 'Radio FM à Paris : franceinfo 105.5, France Inter 87.8';

/* Vigipirate (26 A) : un lien seulement, le niveau change (trois stades depuis le 22 juin 2026 : vigilance, vigilance
   renforcée, alerte attentat). Page officielle du Gouvernement. */
export const VIGIPIRATE_URL = 'https://www.info.gouv.fr/risques/le-plan-vigipirate';
