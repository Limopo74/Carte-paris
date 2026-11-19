/* Parcourir sur la carte (v213) : une fiche à la fois dans le bandeau, la carte placée sur elle.
   « Dans la rue » : marchés et événements de rue d'aujourd'hui ou de demain, du plus proche au plus loin.
   Tout se calcule sur le téléphone : rien n'est envoyé. */
import { distanceM } from './geo.js';
import { marketsOn, whenToday, hoursToday } from './markets.js';
import { streetKind } from './events.js';

/** Rayon du parcours au départ : celui de Sorties (3 km). L'appli passe le réglage (Réglages → Distances et durées). */
export const DECK_RADIUS = 3000;

export const STREET_ICON = { marche: 'gift', brocante: 'tags', fete: 'sparkles', expo: 'palette' };
export const STREET_LABEL = { marche: 'Marché éphémère', brocante: 'Brocante, puces, vide-grenier', fete: 'Fête, festival', expo: 'Expo en plein air' };
/** Phrase pour les marchés un jour férié : leur tenue et leurs heures ne sont pas sûres. */
export const HOLIDAY_NOTE = 'Jour férié : vérifie sur place ou sur paris.fr';

const hm = (d) => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;
/** « 14h–18h » d'après le créneau d'un événement, ou '' sans créneau. */
export function slotText(e) {
  if (!(e.slotStart instanceof Date)) return '';
  return e.slotEnd instanceof Date ? `${hm(e.slotStart)}–${hm(e.slotEnd)}` : `dès ${hm(e.slotStart)}`;
}

/**
 * Les fiches « Dans la rue » d'un jour, du plus proche au plus loin.
 * markets : marchés (découverts et couverts) ; events : agenda du jour déjà filtré par todayOnly ;
 * date : le jour voulu ; now : maintenant ; from : point de départ ; holiday : nom du jour férié ou null.
 * Aujourd'hui, un marché ou un événement déjà fini n'y est plus. Un jour férié, pas d'heure pour les marchés.
 */
export function streetDeck({ markets = [], events = [], date, now = new Date(), from, holiday = null, radius = DECK_RADIUS }) {
  if (!from || !date) return [];
  const sameDay = date.toDateString() === now.toDateString();
  const out = [];
  for (const m of marketsOn(markets, date)) {
    if (sameDay && whenToday(m, now).when === 'done') continue;
    const d = distanceM(from, m);
    if (!(d <= radius)) continue;
    out.push({ type: 'market', m, name: m.name, lat: m.lat, lng: m.lng, d,
      label: m.covered ? 'Marché couvert' : 'Marché', icon: 'store', hours: holiday ? '' : hoursToday(m, date), holiday: Boolean(holiday) });
  }
  const seen = new Set();
  for (const e of events) {
    const kind = streetKind(e);
    if (!kind || !Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue;
    const end = e.slotEnd ?? e.end;
    if (sameDay && end && end < now) continue;
    const key = `${e.title}|${e.lat.toFixed(4)}|${e.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const d = distanceM(from, e);
    if (!(d <= radius)) continue;
    out.push({ type: 'event', e, kind, name: e.title, lat: e.lat, lng: e.lng, d, label: STREET_LABEL[kind], icon: STREET_ICON[kind], hours: slotText(e), holiday: false });
  }
  return out.sort((a, b) => a.d - b.d);
}

/** Le jour ouvert par « Parcourir » : aujourd'hui, sauf s'il n'y reste plus rien (le soir) : alors demain. */
export const deckDay = (todayCount, tomorrowCount) => (todayCount || !tomorrowCount ? 0 : 1);
