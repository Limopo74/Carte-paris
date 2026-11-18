// Mon planning : jours proposés, moments de la journée, texte d'une sortie prévue, sorties passées à confirmer.
// Fonctions sans interface, testées dans tests/planning.test.mjs.

/** Moments de la journée : l'heure de début sert au tri, la fin à savoir quand le moment est passé. */
export const PARTS = {
  matin: { label: 'Matin', from: 9, to: 12, today: 'ce matin', day: 'matin', when: 'le matin' },
  midi: { label: 'Midi', from: 12, to: 14, today: 'ce midi', day: 'midi', when: 'à midi' },
  aprem: { label: 'Après-midi', from: 14, to: 18, today: 'cet après-midi', day: 'après-midi', when: 'l\'après-midi' },
  soir: { label: 'Soir', from: 19, to: 23, today: 'ce soir', day: 'soir', when: 'le soir' },
};
export const isPart = (k) => Object.hasOwn(PARTS, k);

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Nombre de jours entre aujourd'hui et la date (0 = aujourd'hui, 1 = demain, −1 = hier). */
export const daysFrom = (at, now = new Date()) => Math.round((dayStart(new Date(at)) - dayStart(now)) / 864e5);

/** Le jour à midi pile, sans souci de changement d'heure. */
const noon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

/** Jours proposés en puces : aujourd'hui, demain, puis le samedi et le dimanche qui viennent (s'ils ne sont pas déjà l'un des deux). */
export function dayChoices(now = new Date()) {
  const out = [{ key: 'j0', label: 'Aujourd\'hui', date: noon(now) }];
  const d1 = noon(now); d1.setDate(d1.getDate() + 1);
  out.push({ key: 'j1', label: 'Demain', date: d1 });
  for (const wd of [6, 0]) {
    const d = noon(now);
    d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7));
    if (daysFrom(d, now) >= 2) out.push({ key: `j${daysFrom(d, now)}`, label: `${wd === 6 ? 'Samedi' : 'Dimanche'} ${d.getDate()}`, date: d });
  }
  return out;
}

/** Le moment de la sortie (Date) : le jour donné, à l'heure de début du moment, ou à l'heure précise. */
export function planAt(day, part, hh = 0, mm = 0) {
  return isPart(part)
    ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), PARTS[part].from).getTime()
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm).getTime();
}

const hm = (d) => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;

/** « aujourd'hui à 15h », « ce soir », « demain matin », « samedi 21 nov. après-midi ». */
export function planText(t, now = new Date()) {
  if (!Number.isFinite(t?.at)) return '';
  const d = new Date(t.at);
  const k = daysFrom(t.at, now);
  const part = isPart(t.part) ? PARTS[t.part] : null;
  if (part && k === 0) return part.today;
  const day = k === 0 ? 'aujourd\'hui' : k === 1 ? 'demain' : k === -1 ? 'hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  return part ? `${day} ${part.day}` : `${day} à ${hm(d)}`;
}

/** Ce qui s'écrit dans la colonne de l'heure de Mon planning : « 15h » ou « Soir ». */
export const planClock = (t) => (isPart(t?.part) ? PARTS[t.part].label : hm(new Date(t.at)));

/** Fin de la sortie pour « Maintenant » : 30 min après l'heure précise, ou la fin du moment choisi. */
export function planEnd(t) {
  if (!isPart(t?.part)) return t.at + 30 * 60000;
  const d = new Date(t.at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), PARTS[t.part].to).getTime();
}

/** Heures à vérifier pour savoir si le lieu est fermé : l'heure précise, ou chaque demi-heure du moment. */
export function planTimes(t) {
  if (!isPart(t?.part)) return [new Date(t.at)];
  const out = [];
  for (let x = t.at; x < planEnd(t); x += 30 * 60000) out.push(new Date(x));
  return out;
}

/** Sorties d'avant aujourd'hui (30 jours au plus), à confirmer : « Tu y es allé ? ». Les plus récentes d'abord. */
export function pastPlans(points, now = new Date()) {
  const today = dayStart(now).getTime();
  return points.filter((p) => !p.owner && !p.by && Number.isFinite(p.ticket?.at) && p.ticket.at < today && p.ticket.at >= today - 30 * 864e5)
    .sort((a, b) => b.ticket.at - a.ticket.at);
}

/** Une sortie prévue lisible, ou null : { at, with?, part? }. */
export function cleanPlan(t) {
  if (!Number.isFinite(t?.at)) return null;
  return {
    at: t.at,
    ...(typeof t.with === 'string' && t.with.trim() ? { with: t.with.trim().slice(0, 40) } : {}),
    ...(isPart(t.part) ? { part: t.part } : {}),
  };
}

/**
 * Sorties de l'agenda prévues (v153) : gardées à part de mes lieux, sans goutte sur la carte.
 * Forme : { id, name, lat, lng, plan: true, ticket, address?, place?, url? }. Effacées 30 jours après le jour prévu
 * (avant la v158 : dès le lendemain) ; « Tu y es allé ? » les retire avant.
 */
export function cleanPlans(list, now = Date.now()) {
  const d = new Date(now);
  // v158 : gardées 30 jours après le jour prévu, le temps de répondre à « Tu y es allé ? » (comme mes lieux)
  const t0 = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 30).getTime();
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map((x) => {
    const ticket = cleanPlan(x?.ticket);
    const lat = Number(x?.lat);
    const lng = Number(x?.lng);
    const name = typeof x?.name === 'string' ? x.name.trim().slice(0, 120) : '';
    if (!ticket || ticket.at < t0 || !name || !(lat > 48 && lat < 49.5) || !(lng > 1.4 && lng < 3.6)) return null;
    if (typeof x.id !== 'string' || !/^[\w-]{1,64}$/.test(x.id) || seen.has(x.id)) return null;
    seen.add(x.id);
    return {
      id: x.id, name, lat, lng, plan: true, ticket,
      ...(typeof x.address === 'string' && x.address.trim() ? { address: x.address.trim().slice(0, 200) } : {}),
      ...(typeof x.place === 'string' && x.place.trim() ? { place: x.place.trim().slice(0, 120) } : {}),
      ...(typeof x.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(x.url) ? { url: x.url.slice(0, 500) } : {}),
      ...(typeof x.by === 'string' && x.by.trim() ? { by: x.by.trim().slice(0, 30) } : {}), // v181 : prévue par un proche (son fichier)
    };
  }).filter(Boolean).slice(0, 200);
}

/** La sortie de l'agenda déjà prévue pour cet événement (même titre, même endroit), ou null. */
export const planOfEvent = (plans, e, now = new Date()) => (plans ?? []).find((x) => x.name === String(e?.title ?? '').trim().slice(0, 120)
  && Math.abs(x.lat - e.lat) < 1e-5 && Math.abs(x.lng - e.lng) < 1e-5 && x.ticket?.at >= dayStart(now).getTime()) ?? null;

/**
 * Mon carnet de sorties (v158) : les sorties de l'agenda où je suis allé (« Tu y es allé ? » → Oui), avec ce que j'en retiens.
 * Forme : { id, at, name, lat, lng, place?, url?, text?, stars?, photo? }, la plus récente d'abord ; 500 au plus.
 */
export function cleanOutings(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map((x) => {
    const lat = Number(x?.lat);
    const lng = Number(x?.lng);
    const name = typeof x?.name === 'string' ? x.name.trim().slice(0, 120) : '';
    if (!Number.isFinite(x?.at) || !name || !(lat > 48 && lat < 49.5) || !(lng > 1.4 && lng < 3.6)) return null;
    if (typeof x.id !== 'string' || !/^[\w-]{1,64}$/.test(x.id) || seen.has(x.id)) return null;
    seen.add(x.id);
    return {
      id: x.id, at: x.at, name, lat, lng,
      ...(typeof x.place === 'string' && x.place.trim() ? { place: x.place.trim().slice(0, 120) } : {}),
      ...(typeof x.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(x.url) ? { url: x.url.slice(0, 500) } : {}),
      ...(typeof x.text === 'string' && x.text.trim() ? { text: x.text.trim().slice(0, 200) } : {}),
      ...(Number.isInteger(x.stars) && x.stars >= 1 && x.stars <= 5 ? { stars: x.stars } : {}),
      ...(typeof x.photo === 'string' && /^[\w-]{1,64}$/.test(x.photo) ? { photo: x.photo } : {}),
    };
  }).filter(Boolean).sort((a, b) => b.at - a.at).slice(0, 500);
}

/** Une sortie de l'agenda prévue devient une ligne du carnet (le jour prévu, sans le moment ni la compagnie). */
export const outingOf = (plan) => cleanOutings([{ id: plan.id, at: plan.ticket.at, name: plan.name, lat: plan.lat, lng: plan.lng, place: plan.place, url: plan.url }])[0] ?? null;
