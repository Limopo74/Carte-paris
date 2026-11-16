// Jours fériés en France métropolitaine, calculés sur le téléphone (rien n'est demandé à Internet).
// Pâques par l'algorithme de Meeus/Jones/Butcher (calendrier grégorien).

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const cache = new Map();
/** Map « AAAA-MM-JJ » -> nom du jour férié, pour l'année donnée. */
export function holidays(year) {
  if (cache.has(year)) return cache.get(year);
  const e = easter(year);
  const plus = (n) => new Date(e.getFullYear(), e.getMonth(), e.getDate() + n);
  const list = [
    [new Date(year, 0, 1), 'Jour de l\'an'], [plus(1), 'Lundi de Pâques'], [new Date(year, 4, 1), 'Fête du Travail'],
    [new Date(year, 4, 8), 'Victoire 1945'], [plus(39), 'Ascension'], [plus(50), 'Lundi de Pentecôte'],
    [new Date(year, 6, 14), 'Fête nationale'], [new Date(year, 7, 15), 'Assomption'], [new Date(year, 10, 1), 'Toussaint'],
    [new Date(year, 10, 11), 'Armistice'], [new Date(year, 11, 25), 'Noël'],
  ];
  const m = new Map(list.map(([d, n]) => [key(d), n]));
  cache.set(year, m);
  return m;
}

/** Nom du jour férié à cette date (heure du téléphone), sinon null. */
export const holidayOn = (date = new Date()) => holidays(date.getFullYear()).get(key(date)) ?? null;
