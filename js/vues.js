// v454 (construite comme v452) : points de vue sur Paris (mes choix 1B 2A 3A, puis 1A 2A 3A 4A du 25 nov. 2026 ; claude/idee-points-de-vue.md).
// Liste courte tenue à la main, vérifiée sur le site officiel de chaque lieu. Ni prix ni horaires : ils changent trop souvent
// (règle « pas d'info plutôt qu'une info fausse ») ; seulement gratuit ou payant, la réservation, les marches quand le site
// les donne, et une fermeture datée. Revue par les tâches planifiées (voir l'idée) ; au-delà de 13 mois sans revue, l'appli
// n'affiche plus que le nom et le lien (vueStale).
//
// Positions : IGN (data.geopf.fr, adresse avec code postal) ou Wikidata (élément cité dans `q`), relues le 25 nov. 2026.
// Esplanade du Trocadéro : Wikidata Q3367074 (parvis des droits de l'homme), OpenStreetMap à 32 m.
import { durText } from './geo.js';
export const VUES_CHECKED = '25 novembre 2026';
export const VUES_CHECKED_ON = '2026-11-25';
/** Au-delà, la liste est trop vieille pour qu'on affiche gratuit, payant, marches ou fermetures. */
export const VUES_STALE_MONTHS = 13;
/** Dans Curiosités : les points de vue à moins de N min à pied (3 au plus). */
export const VUES_NEAR_MIN = 20;

export const VUES = [
  // Gratuits
  { id: 'belleville', nom: 'Belvédère de Belleville', libre: true, lat: 48.871605, lng: 2.384925, adresse: '27 rue Piat, 75020 Paris',
    t: 'En plein air, en haut du parc de Belleville, entrée rue Piat.', s: 'https://www.paris.fr/lieux/parc-de-belleville-1777' },
  { id: 'parvis-sacre-coeur', nom: 'Parvis du Sacré-Cœur', libre: true, lat: 48.88665, lng: 2.34295, q: 'Q28785',
    t: 'En plein air, devant la basilique, en haut de la butte Montmartre.', s: 'https://www.sacre-coeur-montmartre.com/' },
  { id: 'ima', nom: 'Terrasse de l\'Institut du monde arabe', libre: true, lat: 48.849172, lng: 2.356212, adresse: '1 rue des Fossés-Saint-Bernard, 75005 Paris',
    t: 'Au dernier étage. Fermée le lundi.', s: 'https://www.imarabe.org/fr/terrasse' },
  { id: 'galeries-lafayette', nom: 'Terrasse des Galeries Lafayette', libre: true, lat: 48.873199, lng: 2.332434, adresse: '40 boulevard Haussmann, 75009 Paris',
    t: 'Au 8e étage, aux heures du magasin. Ferme par pluie ou grand vent.', ferme: { du: '2026-11-20', au: '2027-01-06', pourquoi: 'patinoire' },
    s: 'https://haussmann.galerieslafayette.com/' },
  { id: 'trocadero', nom: 'Esplanade du Trocadéro', libre: true, lat: 48.8622903, lng: 2.2881979, q: 'Q3367074',
    t: 'En plein air, face à la tour Eiffel.', s: 'https://fr.wikipedia.org/wiki/Parvis_des_droits_de_l%27homme' },
  // Payants
  { id: 'tour-eiffel', nom: 'Tour Eiffel', libre: false, acces: 'réservation conseillée', lat: 48.858296, lng: 2.294479, q: 'Q243',
    t: 'Réservation conseillée sur le site officiel.', s: 'https://www.toureiffel.paris/' },
  { id: 'arc', nom: 'Arc de triomphe', libre: false, lat: 48.87378, lng: 2.29504, q: 'Q64436',
    t: '284 marches.', s: 'https://www.paris-arc-de-triomphe.fr/' },
  { id: 'notre-dame', nom: 'Tours de Notre-Dame', libre: false, acces: 'sur réservation', lat: 48.853, lng: 2.3498, q: 'Q2981',
    t: 'Sur réservation. 424 marches.', s: 'https://www.tours-notre-dame-de-paris.fr/' },
  { id: 'dome-sacre-coeur', nom: 'Dôme du Sacré-Cœur', libre: false, acces: 'billets sur place', lat: 48.88665, lng: 2.34295, q: 'Q28785',
    t: 'Billets sur place. 280 marches, sans ascenseur.', s: 'https://www.sacre-coeur-montmartre.com/infos-et-visites/visites/visite-du-dome/' },
  // Saison : avril à septembre (Visit Paris Region) ou à octobre (presse) : seul l'hiver (novembre à mars) est sûr.
  { id: 'pantheon', nom: 'Colonnade du Panthéon', libre: false, hiver: true, lat: 48.846198, lng: 2.346105, q: 'Q188856',
    t: 'Fermée l\'hiver.', s: 'https://www.paris-pantheon.fr/' },
];

const day = (iso) => new Date(`${iso}T00:00:00`);

/** La liste a-t-elle plus de 13 mois ? Alors on n'affiche plus que le nom et le lien. */
export function vueStale(now = new Date()) {
  const lim = day(VUES_CHECKED_ON);
  lim.setMonth(lim.getMonth() + VUES_STALE_MONTHS);
  return now >= lim;
}

/** Fermée aujourd'hui ? Fermeture datée (du … au …, le dernier jour exclu), ou l'hiver (novembre à mars). Rien quand la liste est trop vieille. */
export function vueFermee(v, now = new Date()) {
  if (vueStale(now)) return false;
  if (v.ferme && now >= day(v.ferme.du) && now < day(v.ferme.au)) return true;
  if (v.hiver && (now.getMonth() >= 10 || now.getMonth() <= 2)) return true;
  return false;
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « Fermée jusqu'au 6 janv. (patinoire). » pendant une fermeture datée ; sinon ''. Le jour écrit est le jour de réouverture. */
export function vueFermeText(v, now = new Date()) {
  if (vueStale(now) || !v.ferme || !(now >= day(v.ferme.du) && now < day(v.ferme.au))) return '';
  const d = day(v.ferme.au);
  return `Fermée jusqu'au ${d.getDate() === 1 ? '1er' : d.getDate()} ${MOIS[d.getMonth()]}${v.ferme.pourquoi ? ` (${v.ferme.pourquoi})` : ''}.`;
}

/** La petite ligne d'une ligne de liste : « 6 min · Gratuit », « Payant · sur réservation ». */
export function vueSub(v, minutes = null, now = new Date()) {
  const parts = [minutes != null ? `${durText(minutes).replace(/ /g, '\u00a0')}` : ''];
  if (!vueStale(now)) parts.push(v.libre ? 'Gratuit' : `Payant${v.acces ? ` · ${v.acces}` : ''}`);
  return parts.filter(Boolean).join(' · ');
}

/** Tous les points de vue avec leur distance : gratuits d'abord, puis payants, chacun du plus proche. */
export function vuesSorted(here, distanceM) {
  const all = VUES.map((v) => ({ v, d: here ? distanceM(here, v) : null }));
  return all.sort((a, b) => (a.v.libre !== b.v.libre ? (a.v.libre ? -1 : 1) : (a.d ?? 0) - (b.d ?? 0)));
}
