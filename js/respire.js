// Rues sans voitures : les secteurs « Paris Respire » de la Ville de Paris (v197).
//
// Deux sources officielles, lues le 18 novembre 2026 :
//  - la page https://www.paris.fr/parisrespire (mise à jour le 16 nov. 2026) : jours et heures en clair ;
//  - le jeu « Paris Respire – Secteurs » (Paris Data, ODbL) : les contours (data/respire.json, refait par le robot avec
//    tools/maj-respire.py). Ses jours sont des codes sans légende : ils ne sont PAS lus.
// Les jours et les heures ci-dessous sont donc tenus à la main, et seulement là où les deux sources s'accordent : quand elles
// donnent des heures différentes (Montmartre, Bassin de la Villette, Jourdain-Levert), on garde la plage commune (début le
// plus tard, fin le plus tôt). Pas dans la liste : Champs-Élysées (« sauf exception », dates qui changent), Lavigerie /
// Laperrine (Foire du Trône, dates non précisées), Route des Fortifications (absente de la page de la Ville).
// La Ville écrit que les opérations « peuvent être ajournées exceptionnellement » : l'appli dit toujours « prévu ».
// À revoir chaque 1er septembre avec les listes annuelles.

export const RESPIRE_CHECKED = '18 novembre 2026';
export const RESPIRE_PAGE = 'paris.fr/parisrespire';

const SUN = [0]; const WEEKEND = [6, 0]; const SAT = [6];
const ETE = [4, 9]; // avril à septembre
/**
 * key : début du nom du secteur dans le jeu de la Ville (minuscules, sans accents) ; days : jours de la semaine (0 = dimanche) ;
 * first : seulement le 1er dimanche du mois ; months : [de, à] quand le secteur n'existe qu'une partie de l'année ;
 * win : heures toute l'année ; sum + sumM : heures et mois d'été ; firstWin : le 1er dimanche du mois garde les heures d'hiver.
 */
export const RESPIRE = [
  { key: 'sentier', name: 'Sentier', arr: '2e', days: SUN, win: ['10:00', '18:00'], sum: ['10:00', '19:00'], sumM: ETE, firstWin: true },
  { key: 'marais', name: 'Marais', arr: '3e et 4e', days: SUN, win: ['10:00', '18:00'], sum: ['10:00', '19:30'], sumM: ETE, firstWin: true },
  { key: 'mouffetard', name: 'Mouffetard', arr: '5e', days: SUN, win: ['10:00', '18:00'] },
  { key: 'luxembourg', name: 'Luxembourg', arr: '6e', days: SUN, months: [4, 11], win: ['10:00', '18:00'] },
  { key: 'martyrs', name: 'Rue des Martyrs', arr: '9e', days: WEEKEND, win: ['10:00', '18:00'] },
  { key: 'trudaine', name: 'Avenue Trudaine', arr: '9e', days: SUN, win: ['14:00', '18:00'] },
  { key: 'marguerite de rochechouart', name: 'Rochechouart', arr: '18e', days: SUN, win: ['10:00', '18:00'] },
  { key: 'canal saint-martin', name: 'Canal Saint-Martin', arr: '10e', days: SUN, win: ['10:00', '18:00'], sum: ['10:00', '20:00'], sumM: ETE },
  { key: 'saint-martin (extension', name: 'Canal Saint-Martin, côté sud', arr: '10e', days: SUN, months: [7, 8], win: ['10:00', '20:00'] },
  { key: 'faubourg saint denis', name: 'Faubourg Saint-Denis', arr: '10e', days: SUN, win: ['10:00', '18:00'], sum: ['10:00', '20:00'], sumM: ETE },
  { key: 'roquette', name: 'Rue de la Roquette', arr: '11e', days: SUN, win: ['10:00', '18:00'], sum: ['10:00', '20:00'], sumM: ETE },
  { key: 'aligre', name: 'Aligre', arr: '12e', days: SUN, win: ['10:00', '14:00'] },
  { key: 'bois de vincennes', name: 'Bois de Vincennes', arr: '12e', days: SUN, win: ['09:00', '18:00'], sum: ['09:00', '20:00'], sumM: ETE },
  { key: 'butte aux cailles', name: 'Butte-aux-Cailles', arr: '13e', days: SUN, months: [4, 9], win: ['10:00', '20:00'] },
  { key: 'daguerre', name: 'Rue Daguerre', arr: '14e', days: SUN, win: ['10:00', '18:00'] },
  { key: 'jean moulin', name: 'Jean Moulin', arr: '14e', days: SUN, first: true, win: ['10:00', '18:00'] },
  { key: 'bois de boulogne', name: 'Bois de Boulogne', arr: '16e', days: WEEKEND, win: ['09:00', '18:00'] },
  { key: 'rue des moines', name: 'Rue des Moines', arr: '17e', days: SUN, win: ['10:00', '13:00'] },
  { key: 'poteau', name: 'Rue du Poteau', arr: '18e', days: SUN, win: ['10:00', '14:00'] },
  { key: 'montmartre', name: 'Montmartre', arr: '18e', days: SUN, win: ['11:00', '18:00'], sum: ['11:00', '19:00'], sumM: [4, 8] },
  { key: 'chateau rouge', name: 'Château-Rouge', arr: '18e', days: SAT, win: ['11:00', '18:00'] },
  { key: 'bassin de la villette', name: 'Bassin de la Villette', arr: '19e', days: SUN, win: ['14:00', '18:00'], sum: ['14:00', '20:00'], sumM: ETE },
  { key: 'jourdain levert', name: 'Jourdain-Levert', arr: '20e', days: SUN, win: ['14:00', '18:00'] },
];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const inMonths = (m, r) => !r || (m >= r[0] && m <= r[1]);

/** Les heures prévues ce jour-là pour un secteur : { from, to } (« HH:MM »), ou null si rien n'est prévu ce jour-là. */
export function respireWindow(rule, date) {
  if (!rule.days.includes(date.getDay())) return null;
  const first = date.getDate() <= 7;
  if (rule.first && !first) return null;
  const m = date.getMonth() + 1;
  if (!inMonths(m, rule.months)) return null;
  const w = rule.sum && inMonths(m, rule.sumM) && !(rule.firstWin && first) ? rule.sum : rule.win;
  return { from: w[0], to: w[1] };
}

/** Vrai si au moins un secteur est prévu ce jour-là (sans lire les contours). */
export const respirePlanned = (date) => RESPIRE.some((r) => respireWindow(r, date));

/** Le fichier du robot, nettoyé : [{ nom, rings: [[[lat, lng], …], …] }]. */
export function cleanRespire(json) {
  const ok = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  return (Array.isArray(json?.secteurs) ? json.secteurs : []).map((s) => ({
    nom: String(s?.nom ?? '').slice(0, 80),
    rings: (Array.isArray(s?.rings) ? s.rings : []).filter((r) => Array.isArray(r) && r.length >= 3 && r.every(ok)),
  })).filter((s) => s.nom && s.rings.length);
}

/** Les secteurs de la liste qui ont un contour dans le fichier du robot : la règle + rings (plusieurs contours possibles). */
export function respireSectors(json) {
  const data = cleanRespire(json);
  return RESPIRE.map((rule) => ({ ...rule, rings: data.filter((s) => norm(s.nom).startsWith(rule.key)).flatMap((s) => s.rings) })).filter((s) => s.rings.length);
}

function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i]; const [yj, xj] = ring[j];
    if ((yi > p.lat) !== (yj > p.lat) && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Mètres jusqu'au secteur : 0 à l'intérieur d'un contour, sinon jusqu'au bord le plus proche. */
export function distanceToSector(p, rings) {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180); const ky = 110540;
  let best = Infinity;
  for (const ring of rings) {
    if (inRing(p, ring)) return 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]; const b = ring[(i + 1) % ring.length];
      const ax = (a[1] - p.lng) * kx; const ay = (a[0] - p.lat) * ky; const bx = (b[1] - p.lng) * kx; const by = (b[0] - p.lat) * ky;
      const dx = bx - ax; const dy = by - ay; const l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return Math.round(best);
}

/** Les secteurs prévus ce jour-là, avec leurs heures ; le plus proche de `here` d'abord (ordre de la liste sans position). */
export function respireOn(sectors, date, here = null) {
  const out = sectors.map((s) => ({ s, w: respireWindow(s, date) })).filter((x) => x.w)
    .map((x) => ({ ...x, d: here ? distanceToSector(here, x.s.rings) : null }));
  return here ? out.sort((a, b) => a.d - b.d) : out;
}

/** Marge avant la fin : on ne propose plus un secteur qui rouvre aux voitures dans moins d'un quart d'heure. */
export const RESPIRE_MARGIN = 15;
/** Le secteur prévu en ce moment le plus proche, à `maxM` mètres au plus : { s, d, to }, ou null. */
export function respireNow(sectors, here, date, maxM) {
  if (!here) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  const x = respireOn(sectors, date, here).find((y) => y.d <= maxM && now >= toMin(y.w.from) && now < toMin(y.w.to) - RESPIRE_MARGIN);
  return x ? { s: x.s, d: x.d, to: x.w.to } : null;
}

/** Le prochain jour (de demain à dans 7 jours) où un secteur est prévu, ou null. */
export function respireNextDay(sectors, date) {
  for (let k = 1; k <= 7; k++) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + k);
    if (sectors.some((s) => respireWindow(s, d))) return d;
  }
  return null;
}
