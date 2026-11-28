// « Ce week-end » (v546, mes choix 1B 2C 3A 4A 5A du 28 nov. 2026) : les sorties de l'agenda de la Ville du samedi et du dimanche,
// rangées par rubrique (le genre que l'appli sait déjà lire, js/events.js `genreOf`), avec les grandes photos de l'agenda.
// Rien n'est deviné en plus : une sortie que l'appli ne sait pas classer va dans « Autres sorties » ; seuls les créneaux
// publiés de ces jours-là comptent (les expos sans créneau, si leurs dates couvrent le jour).

/** Les rubriques, dans l'ordre de la mosaïque : [id, nom, icône]. 'autre' : celles que l'appli ne sait pas classer. */
export const WEEKEND_RUBRIQUES = [
  ['expo', 'Expos', 'palette'], ['musique', 'Concerts', 'music'], ['scene', 'Spectacles', 'drama'], ['famille', 'En famille', 'users'],
  ['cine', 'Cinéma', 'clapperboard'], ['balade', 'Balades et visites', 'footprints'], ['chiner', 'Puces et brocantes', 'tags'],
  ['fete', 'Fêtes', 'sparkles'], ['atelier', 'Ateliers et rencontres', 'book-open'], ['sport', 'Sport', 'dumbbell'] /* v564 */, ['autre', 'Autres sorties', 'calendar-days'],
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

/* ---------- v555 (mes choix 8A à 12A du 28 nov. 2026) : Ce week-end sur tout Paris, sans distance ---------- */

/** « 15e », « 1er » d'après le code postal de l'agenda (75001 à 75020, 75116) ; hors Paris, la ville ; sinon '' (rien d'inventé). */
export function areaText(e) {
  const z = String(e?.zip ?? '');
  const m = /^75(?:0(0[1-9]|1\d|20)|116)$/.exec(z);
  if (m) { const n = m[1] ? Number(m[1]) : 16; return n === 1 ? '1er' : `${n}e`; }
  const city = String(e?.city ?? '').trim();
  return city && !/^paris$/i.test(city) ? city : '';
}

/**
 * L'ordre sans distance (9A) : d'abord ce qui cite mes artistes ou thèmes (T1 A), puis les expos qui ferment ce week-end
 * (la plus tôt d'abord), puis ce qui a un créneau ces jours-là, par heure de début, puis les autres expos, par date de fin.
 * Avec une distance (`x.d`, viseur allumé, 8A) : mes thèmes d'abord, puis du plus proche au plus loin.
 * `lastDay` : la fin du dernier jour du week-end ; `expo(e)`, `liked(e)` : fournis par l'appli.
 */
export function weekendOrder(items, { lastDay, expo = () => false, liked = () => false } = {}) {
  const far = 8.64e15;
  const first = (x) => Math.min(...Object.values(x.slot ?? {}).filter((d) => d instanceof Date).map((d) => d.getTime()), far);
  const end = (x) => (x.e.end instanceof Date ? x.e.end.getTime() : far);
  const rank = (x) => {
    if (expo(x.e) && end(x) <= lastDay.getTime()) return [0, end(x)];
    if (first(x) < far) return [1, first(x)];
    return [2, end(x)];
  };
  return [...items].map((x) => ({ x, love: liked(x.e) ? 0 : 1, r: x.d == null ? rank(x) : [0, x.d] }))
    .sort((a, b) => a.love - b.love || a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.x.e.title.localeCompare(b.x.e.title, 'fr'))
    .map(({ x }) => x);
}

/* ---------- v564 (mes choix C, C2 A, C3 A du 28 nov. 2026) : sous-thèmes d'une grande rubrique, étiquettes sur les photos ---------- */

/** Les étiquettes de l'agenda qui ne disent rien de plus que la rubrique (ou rien du tout). */
const SAME = { expo: ['expo', 'expositions'], musique: ['concert'], famille: ['enfants'], cine: ['ecrans'], balade: ['balade urbaine'],
  atelier: ['atelier', 'conference'], sport: ['sport'], chiner: ['brocante'], fete: ['fete'] };
const VAGUE = ['loisirs'];
const flat = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Les sous-thèmes d'une sortie, dans l'ordre de l'agenda (« Expo;Photo;Histoire » dans Expos → ['Photo', 'Histoire']). */
export function subTags(e, genre) {
  const drop = new Set([...(SAME[genre] ?? []), ...VAGUE]);
  const out = [];
  for (const t of String(e?.tags ?? '').split(/[;,]|->/).map((x) => x.trim()).filter(Boolean)) {
    if (drop.has(flat(t)) || out.some((x) => flat(x) === flat(t))) continue;
    out.push(t.slice(0, 24));
  }
  return out;
}

/** Les puces d'une rubrique (C2 A) : seulement au-delà de `over` sorties ; un sous-thème à partir de `min` sorties ; le plus fréquent d'abord. */
export function subThemes(items, genre, { over = 40, min = 3 } = {}) {
  if ((items?.length ?? 0) <= over) return [];
  const n = new Map();
  for (const x of items) for (const t of subTags(x.e, genre)) { const k = flat(t); const c = n.get(k) ?? { tag: t, n: 0 }; c.n += 1; n.set(k, c); }
  return [...n.values()].filter((c) => c.n >= min).sort((a, b) => b.n - a.n || a.tag.localeCompare(b.tag, 'fr'));
}
/** Une sortie a-t-elle ce sous-thème ? `null` : « Autres » (aucun des sous-thèmes des puces). */
export function hasSub(e, genre, tag, all = []) {
  const mine = subTags(e, genre).map(flat);
  return tag == null ? !all.some((c) => mine.includes(flat(c.tag))) : mine.includes(flat(tag));
}
