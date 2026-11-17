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
  { id: 'merimee', name: 'Monuments : protection et musées', every: 365 },
  { id: 'marches', name: 'Horaires des marchés couverts', every: 365 },
  { id: 'listes', name: 'Gratuités, Kiosques, grands lieux, temps forts', every: 365 }, // tâche programmée Claude chaque 1er septembre
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
