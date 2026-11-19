// Données des transports gardées dans l'appli (tracés des lignes, stations) : d'où elles viennent
// et quand les refaire. Rappel dans l'appli seulement (Réglages et un message à l'ouverture), jamais de notification.

export const TRANSPORT_EVERY_DAYS = 183; // à refaire tous les 6 mois, ou dès qu'une ligne ouvre ou se prolonge
export const IDFM_SITE = 'https://data.iledefrance-mobilites.fr';

/** Les jeux de données à télécharger (export GeoJSON) et le nom du fichier obtenu. */
export const TRANSPORT_FILES = [
  { name: 'Tracés du réseau ferré IDF', file: 'traces-du-reseau-ferre-idf.geojson', url: `${IDFM_SITE}/explore/dataset/traces-du-reseau-ferre-idf/export/` },
  { name: 'Emplacement des gares IDF', file: 'emplacement-des-gares-idf.geojson', url: `${IDFM_SITE}/explore/dataset/emplacement-des-gares-idf/export/` },
];
/** Seulement si une ligne change de couleur ou si une nouvelle ligne ouvre. */
export const COLORS_FILE = { name: 'Référentiel des lignes', file: 'referentiel-des-lignes.json', url: `${IDFM_SITE}/explore/dataset/referentiel-des-lignes/export/` };

/** Toilettes des gares et stations RATP (data/sanitaires-ratp.json, refait par tools/maj-sanitaires.py). */
export const RATP_TOILETS_FILE = { name: 'Toilettes publiques dans le réseau RATP', file: 'sanitaires-reseau-ratp.geojson', url: 'https://data.ratp.fr/explore/assets/sanitaires-reseau-ratp/export/' }; // nouvelle adresse du portail RATP (vérifiée le 17 nov. 2026)

/** Monuments : export Mérimée (POP) et liste des musées franciliens (data/merimee.json, refait par tools/maj-merimee.py). */
export const MERIMEE_FILES = [
  { name: 'Base Mérimée : Localisation Paris', file: 'merimee_AAAAMMJJ.xlsx', url: 'https://pop.culture.gouv.fr/' },
  { name: 'Liste des musées franciliens', file: 'liste_des_musees_franciliens.geojson', url: 'https://www.data.gouv.fr/datasets/liste-des-musees-franciliens-idf' },
];

/** Arrêts de bus et leurs lignes, Paris et petite couronne (data/bus.json, refait par le robot avec tools/maj-bus.py, v148). */
export const BUS_FILE = { name: 'Arrêts et lignes associées', file: 'arrets-lignes.json', url: 'https://data.iledefrance-mobilites.fr/explore/dataset/arrets-lignes/export/' };
/** Plaques commémoratives (data/plaques.json, refait par le robot avec tools/maj-plaques.py, v159). */
export const PLAQUES_FILE = { name: 'Plaques commémoratives', file: 'plaques_commemoratives.geojson', url: 'https://opendata.paris.fr/explore/dataset/plaques_commemoratives/export/' };
/** Gares de RER et arrêts de tram (data/gares.json, refait par le robot avec tools/maj-gares.py, v200). */
export const GARES_FILE = { name: 'Emplacement des gares IDF', file: 'emplacement-des-gares-idf.geojson', url: 'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/export/' };
/** Sorties du métro (data/acces.json, refait par le robot avec tools/maj-acces.py, v199). */
export const ACCES_FILE = { name: 'Référentiel des arrêts : Accès', file: 'acces.json', url: 'https://data.iledefrance-mobilites.fr/explore/dataset/acces/export/' };
/** Auteur et date des monuments (data/architectes.json, refait par le robot avec tools/maj-architectes.py, v198). */
export const ARCH_FILE = { name: 'Immeubles protégés au titre des Monuments historiques', file: 'liste-des-immeubles-proteges-au-titre-des-monuments-historiques.csv', url: 'https://www.data.gouv.fr/datasets/immeubles-proteges-au-titre-des-monuments-historiques-2' };
/** Immeubles protégés par la Ville (data/patrimoine.json, refait par le robot avec tools/maj-patrimoine.py, v245). */
export const PVP_FILES = [
  { name: 'PLU bioclimatique : protections patrimoniales', file: 'plub_pvp.json', url: 'https://opendata.paris.fr/explore/dataset/plub_pvp/export/' },
  { name: 'Lien entre protections et bâtiments', file: 'plub_pvp_geos.json', url: 'https://opendata.paris.fr/explore/dataset/plub_pvp_geos/export/' },
  { name: 'Bâtiments protégés', file: 'plub_surf_pvp.json', url: 'https://opendata.paris.fr/explore/dataset/plub_surf_pvp/export/' },
];
/** Architecture contemporaine remarquable (data/acr.json, refait par le robot avec tools/maj-acr.py, v245). */
export const ACR_FILE = { name: 'Liste des édifices labellisés Architecture contemporaine remarquable', file: 'liste-des-edifices-labellises-acr.csv', url: 'https://www.data.gouv.fr/datasets/liste-des-edifices-labellises-architecture-contemporaine-remarquable-acr/' };
/** Origine du nom des voies (data/voies.json, refait par le robot avec tools/maj-voies.py, v198). */
export const VOIES_FILE = { name: 'Dénominations des emprises des voies actuelles', file: 'denominations-emprises-voies-actuelles.json', url: 'https://opendata.paris.fr/explore/dataset/denominations-emprises-voies-actuelles/export/' };
/** Contours des secteurs « Paris Respire » (data/respire.json, refait par le robot avec tools/maj-respire.py, v197). */
export const RESPIRE_FILE = { name: 'Paris Respire – Secteurs', file: 'secteurs-paris-respire.geojson', url: 'https://opendata.paris.fr/explore/dataset/secteurs-paris-respire/export/' };
/** Contours des arrondissements (data/arrondissements.json, refait par le robot avec tools/maj-arrondissements.py). */
export const ARR_FILE = { name: 'Arrondissements', file: 'arrondissements.geojson', url: 'https://opendata.paris.fr/explore/dataset/arrondissements/export/' };
/** Horaires des 9 marchés couverts : page de la Ville, relevée à la main. */
export const COVERED_SOURCE = 'https://www.paris.fr/pages/les-marches-parisiens-2428';

/** Page « Infos trafic » d'Île-de-France Mobilités (simple lien : rien n'est envoyé avant l'appui). */
export const TRAFFIC_URL = 'https://me-deplacer.iledefrance-mobilites.fr/infos-trafic/metro'; // vérifié le 16 nov. 2026 (l'ancienne adresse www…/info-trafic donnait une erreur 500)

/** Données figées dans l'appli : seules elles demandent un rappel (les données en direct se rechargent seules). */
// robot : refaites le 1er de chaque mois par le robot GitHub (.github/workflows/maj-donnees.yml). Leur rappel arrive
// après 45 jours : seulement si le robot a échoué deux fois (source coupée ou changée).
export const FIXED_DATA = [
  { id: 'lignes', name: 'Lignes et gares', every: 45, robot: true },
  { id: 'navigo', name: 'Avantages culture Navigo', every: 45, robot: true },
  { id: 'ratp', name: 'Toilettes des gares RATP', every: 45, robot: true },
  { id: 'arrondissements', name: 'Contours des arrondissements (Mon Paris)', every: 45, robot: true, lazy: true }, // date connue une fois le fichier lu
  { id: 'bus', name: 'Arrêts de bus et leurs lignes (Rentrer)', every: 45, robot: true, lazy: true }, // v148 ; date connue une fois le fichier lu
  { id: 'plaques', name: 'Plaques commémoratives (Curiosités)', every: 45, robot: true, lazy: true }, // v159 ; Ville de Paris, licence ODbL
  { id: 'oeuvres', name: 'Œuvres dans la rue (Art dans la rue)', every: 45, robot: true, lazy: true }, // v170 ; OpenStreetMap, licence ODbL
  { id: 'galeries', name: 'Galeries d\'art (Expos, Parcours des galeries)', every: 45, robot: true, lazy: true }, // v170 ; OpenStreetMap, licence ODbL
  { id: 'respire', name: 'Rues sans voitures (Paris Respire)', every: 45, robot: true, lazy: true }, // v197 ; contours seulement, Ville de Paris, licence ODbL
  { id: 'voies', name: 'Origine du nom des rues (Où suis-je ?)', every: 45, robot: true, lazy: true }, // v198 ; Ville de Paris, licence ODbL
  { id: 'architectes', name: 'Auteurs des monuments (Monuments)', every: 45, robot: true, lazy: true }, // v198 ; ministère de la Culture, Licence Ouverte 2.0
  { id: 'patrimoine', name: 'Immeubles protégés par la Ville (Monuments)', every: 45, robot: true, lazy: true }, // v245 ; Ville de Paris, licence ODbL
  { id: 'acr', name: 'Architecture contemporaine remarquable (Monuments)', every: 45, robot: true, lazy: true }, // v245 ; ministère de la Culture, Licence Ouverte 2.0
  { id: 'acces', name: 'Sorties du métro (fiche d\'un lieu)', every: 45, robot: true, lazy: true }, // v199 ; IDFM, Licence Ouverte 2.0
  { id: 'gares', name: 'Gares de RER et arrêts de tram (Station, Rentrer)', every: 45, robot: true, lazy: true }, // v200 ; IDFM, ODbL
  { id: 'merimee', name: 'Monuments et musées (protection, artistes)', every: 365 },
  { id: 'marches', name: 'Horaires des marchés couverts', every: 365 },
  { id: 'listes', name: 'Gratuités, Kiosques, grands lieux, temps forts', every: 365 }, // tâches programmées Claude chaque 1er mars et chaque 1er septembre (v225)
];
/** « tous les 6 mois », « tous les ans »… (les données du robot : « chaque mois »). */
export const everyText = (days) => (days >= 360 ? 'tous les ans' : days <= 45 ? 'chaque mois' : `tous les ${Math.round(days / 30.5)} mois`);
/** Le robot de mise à jour : sa page sur GitHub (« Run workflow » pour le lancer, et ses derniers passages). */
export const ROBOT_URL = 'https://github.com/Limopo74/Carte-paris/actions/workflows/maj-donnees.yml';
/** Les données figées à refaire, d'après leurs dates ({ lignes: 'AAAA-MM-JJ', … }). Une date manquante compte comme à refaire. */
export function dataDue(dates, now = Date.now()) {
  // lazy : fichier lu à part (arrondissements) ; tant que sa date n'est pas connue, pas de fausse alerte
  return FIXED_DATA.filter((d) => !(d.lazy && !Object.hasOwn(dates ?? {}, d.id)) && transportsDue(dates?.[d.id], now, d.every)).map((d) => d.id);
}

/** Vrai si la date (AAAA-MM-JJ) manque ou date de plus de `days` jours. */
export function transportsDue(updated, now = Date.now(), days = TRANSPORT_EVERY_DAYS) {
  const t = Date.parse(updated ?? '');
  return !Number.isFinite(t) || now - t > days * 864e5;
}

/** « 16 novembre 2026 » à partir de « 2026-11-16 » (ou '' si illisible). */
export function frenchDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return '';
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return `${Number(m[3])}${m[3] === '01' ? 'er' : ''} ${months[Number(m[2]) - 1]} ${m[1]}`;
}
