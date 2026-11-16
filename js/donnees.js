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
export const RATP_TOILETS_FILE = { name: 'Toilettes publiques dans le réseau RATP', file: 'sanitaires-reseau-ratp.geojson', url: 'https://data.ratp.fr/explore/dataset/sanitaires-reseau-ratp/export/' };

/** Page « Infos trafic » d'Île-de-France Mobilités (simple lien : rien n'est envoyé avant l'appui). */
export const TRAFFIC_URL = 'https://www.iledefrance-mobilites.fr/info-trafic';

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
