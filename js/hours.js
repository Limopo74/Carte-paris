// Lecture des horaires d'ouverture au format OpenStreetMap (forme courante seulement).
// Si le format n'est pas compris, on renvoie null : mieux vaut « inconnu » qu'une erreur.
// Les jours fériés (« PH ») sont pris en compte quand les horaires les précisent.
import { holidayOn } from './holidays.js';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function parseDays(spec) {
  const days = new Set();
  for (const part of spec.split(',')) {
    const m = part.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if (!m) return null;
    const a = ORDER.indexOf(m[1]);
    const b = m[2] ? ORDER.indexOf(m[2]) : a;
    for (let i = a; ; i = (i + 1) % 7) { days.add(ORDER[i]); if (i === b) break; }
  }
  return days;
}

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function parseTimes(spec) {
  const out = [];
  for (const part of spec.split(',')) {
    const m = part.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
    if (!m) return null;
    const from = toMin(m[1]);
    let to = toMin(m[2]);
    if (from > 24 * 60 || to > 24 * 60) return null;
    if (to <= from) to += 24 * 60; // passe minuit
    out.push({ from, to, end: from === 0 && to === 1440 ? null : m[2].padStart(5, '0') });
  }
  return out;
}

/** Règles par jour : { Mo: [intervalles] | [] (fermé) }, ou null si non compris. */
function parseRules(hours) {
  const text = String(hours ?? '').trim();
  if (!text) return null;
  if (text === '24/7') return Object.fromEntries(ORDER.map((d) => [d, [{ from: 0, to: 1440, end: null }]]));
  const week = {};
  for (let rule of text.split(';').map((r) => r.trim()).filter(Boolean)) {
    // Jours fériés : « PH off », « PH 10:00-18:00 », ou « Mo-Fr,PH 09:00-12:00 »
    let ph = false;
    if (/^PH\b/.test(rule)) { ph = 'only'; rule = rule.replace(/^PH\s*/, ''); } else if (/,\s*PH\b/.test(rule)) { ph = 'also'; rule = rule.replace(/,\s*PH\b/, ''); }
    if (ph === 'only') {
      if (/^(off|closed)$/i.test(rule)) week.PH = [];
      else { const t = parseTimes(rule.replace(/\s+/g, '')); if (t) week.PH = t; }
      continue;
    }
    const m = rule.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?,?)+)?\s*(.*)$/);
    const days = m[1] ? parseDays(m[1].replace(/,$/, '')) : new Set(ORDER);
    const rest = m[2].trim();
    if (!days) return null;
    let times;
    if (/^(off|closed)$/i.test(rest)) times = [];
    else { times = parseTimes(rest.replace(/\s+/g, '')); if (!times) return null; }
    for (const d of days) week[d] = times; // la dernière règle l'emporte
    if (ph === 'also') week.PH = times;
  }
  return week;
}

/**
 * État à la date donnée : { open: true, until } ou { open: false, opensAt } (opensAt : plus tard aujourd'hui, sinon null),
 * ou null si les horaires sont absents ou dans un format non compris.
 */
export function openState(hours, date = new Date()) {
  const week = parseRules(hours);
  if (!week) return null;
  const now = date.getHours() * 60 + date.getMinutes();
  const today = (holidayOn(date) && week.PH) ? week.PH : (week[DAYS[date.getDay()]] ?? []);
  const yesterday = week[DAYS[(date.getDay() + 6) % 7]] ?? [];
  for (const iv of yesterday) if (iv.to > 1440 && now < iv.to - 1440) return { open: true, until: iv.end };
  for (const iv of today) if (now >= iv.from && now < iv.to) return { open: true, until: iv.end };
  const later = today.filter((iv) => iv.from > now).sort((a, b) => a.from - b.from)[0];
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return { open: false, opensAt: later ? hhmm(later.from) : null };
}
