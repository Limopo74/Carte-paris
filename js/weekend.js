// « Ce week-end » (v546, mes choix 1B 2C 3A 4A 5A du 28 nov. 2026) : les sorties de l'agenda de la Ville du samedi et du dimanche,
// rangées par rubrique (le genre que l'appli sait déjà lire, js/events.js `genreOf`), avec les grandes photos de l'agenda.
// Rien n'est deviné en plus : une sortie que l'appli ne sait pas classer va dans « Autres sorties » ; seuls les créneaux
// publiés de ces jours-là comptent (les expos sans créneau, si leurs dates couvrent le jour).

/** Les rubriques, dans l'ordre de la mosaïque : [id, nom, icône]. 'autre' : celles que l'appli ne sait pas classer. */
export const WEEKEND_RUBRIQUES = [
  ['expo', 'Expos', 'palette'], ['musique', 'Concerts', 'music'], ['scene', 'Spectacles', 'drama'], ['famille', 'En famille', 'users'],
  ['cine', 'Cinéma', 'clapperboard'], ['balade', 'Balades et visites', 'footprints'], ['chiner', 'Puces et brocantes', 'tags'],
  ['fete', 'Fêtes', 'sparkles'], ['atelier', 'Ateliers et rencontres', 'book-open'], ['autre', 'Autres sorties', 'calendar-days'],
];

const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Les jours du week-end (mon choix 4A) : du lundi au vendredi, le samedi et le dimanche qui viennent ; le samedi, aujourd'hui
 * et demain ; le dimanche, aujourd'hui seulement. [{ key: 'sam' | 'dim', date (midi), label: « Samedi 29 », short: « sam. 29 » }].
 */
export function weekendDays(now = new Date()) {
  const wd = now.getDay();
  const out = [];
  for (const target of [6, 0]) {
    if (wd === 0 && target === 6) continue; // dimanche : le samedi est passé
    const d = noon(now);
    d.setDate(d.getDate() + ((target - wd + 7) % 7));
    out.push({ key: target === 6 ? 'sam' : 'dim', date: d, label: `${JOURS[target]} ${d.getDate()}${d.getDate() === 1 ? 'er' : ''}`,
      short: `${target === 6 ? 'sam.' : 'dim.'} ${d.getDate()}${d.getDate() === 1 ? 'er' : ''}` });
  }
  return out;
}

/** « sam. 29 · dim. 30 » ; le dimanche : « dim. 30 ». */
export const weekendShort = (days) => days.map((d) => d.short).join(' · ');

const key = (e) => `${e.title}|${Math.round(e.lat * 1e4)}|${Math.round(e.lng * 1e4)}`;

/**
 * Réunit les sorties des jours choisis : une sortie présente les deux jours n'apparaît qu'une fois, avec ses jours.
 * `byDay` : [{ key: 'sam' | 'dim', items: [événements à distance `d`, créneau du jour `slotStart` s'il est publié] }].
 * Renvoie [{ e, d, days: ['sam', 'dim'], slot: { sam: Date | null, dim: Date | null } }], du plus proche au plus loin.
 */
export function mergeWeekend(byDay) {
  const map = new Map();
  for (const day of byDay ?? []) {
    for (const e of day.items ?? []) {
      const k = key(e);
      const x = map.get(k) ?? { e, d: e.d ?? null, days: [], slot: {} };
      if (!x.days.includes(day.key)) x.days.push(day.key);
      x.slot[day.key] = e.slotStart instanceof Date ? e.slotStart : null;
      map.set(k, x);
    }
  }
  const order = { sam: 0, dim: 1 };
  return [...map.values()].map((x) => ({ ...x, days: x.days.sort((a, b) => order[a] - order[b]) }))
    .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity));
}

/** Les rubriques non vides, dans l'ordre de WEEKEND_RUBRIQUES : [{ id, name, icon, items }]. `genre(e)` : le genre, ou null. */
export function weekendGroups(merged, genre) {
  const known = new Set(WEEKEND_RUBRIQUES.map(([id]) => id));
  const by = new Map();
  for (const x of merged ?? []) {
    const g = genre(x.e);
    const id = known.has(g) ? g : 'autre';
    if (!by.has(id)) by.set(id, []);
    by.get(id).push(x);
  }
  return WEEKEND_RUBRIQUES.filter(([id]) => by.has(id)).map(([id, name, icon]) => ({ id, name, icon, items: by.get(id) }));
}

const hm = (d) => `${d.getHours()} h${d.getMinutes() ? ` ${String(d.getMinutes()).padStart(2, '0')}` : ''}`;
/**
 * Quand, en peu de mots, seulement d'après les créneaux publiés : « Sam. 11 h », « Dim. 15 h 30 », « Sam. et dim. »
 * (une heure par jour n'est pas écrite quand il y a deux jours), « Sam. » sans heure connue (expo, créneau à 0 h).
 * `today` : la clé du jour d'aujourd'hui ('sam' le samedi), écrit « Aujourd'hui ».
 */
export function weekendWhen(x, today = '') {
  const name = (k) => (k === today ? 'Aujourd\'hui' : k === 'sam' ? 'Sam.' : 'Dim.');
  if (x.days.length > 1) return today === 'sam' ? 'Aujourd\'hui et demain' : 'Sam. et dim.';
  const k = x.days[0];
  const s = x.slot[k];
  return s && (s.getHours() || s.getMinutes()) ? `${name(k)} ${hm(s)}` : name(k);
}
