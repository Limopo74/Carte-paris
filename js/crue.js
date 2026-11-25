/* v498 (mes choix 7 A et 9 A du 25 nov.) : la hauteur de la Seine à Paris, station d'Austerlitz (F700000103, la station
   de référence de Vigicrues), lue sur Hub'Eau (eaufrance, données publiques, sans clé). Aucune position envoyée.
   Règle de l'appli : pas d'information plutôt qu'une fausse. Rien si la dernière mesure a plus de 2 h ou si la réponse est
   bizarre. Pas de repère de 1910 (les sources ne s'accordent pas sur la hauteur exacte). */

export const SEINE_STATION = 'F700000103';
export const SEINE_URL = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=${SEINE_STATION}&grandeur_hydro=H&size=90&sort=desc&fields=date_obs,resultat_obs`;
export const VIGICRUES = 'https://www.vigicrues.gouv.fr/';
export const SEINE_MAX_AGE = 2 * 3600 * 1000;
const TREND_HOURS = 6;
const TREND_CM = 10; // en dessous de 10 cm en 6 h : « stable » (les mesures sautent de quelques cm au passage des bateaux)

const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** Lit la réponse Hub'Eau : { m (mètres, au cm), at (ms), trend: 'monte' | 'baisse' | 'stable' | null } ou null. */
export function readSeine(json, now = Date.now()) {
  const rows = (json?.data ?? [])
    .map((o) => ({ at: Date.parse(o?.date_obs), mm: o?.resultat_obs }))
    .filter((o) => Number.isFinite(o.at) && typeof o.mm === 'number' && Number.isFinite(o.mm) && o.mm > -500 && o.mm < 12000)
    .sort((a, b) => b.at - a.at);
  if (!rows.length) return null;
  const last = rows[0];
  if (now - last.at > SEINE_MAX_AGE || last.at - now > 10 * 60 * 1000) return null;
  const head = med(rows.slice(0, 3).map((o) => o.mm));
  const old = rows.filter((o) => last.at - o.at >= TREND_HOURS * 3600 * 1000 - 5 * 60 * 1000);
  let trend = null;
  if (old.length) {
    const d = (head - med(old.slice(0, 3).map((o) => o.mm))) / 10; // cm
    trend = d >= TREND_CM ? 'monte' : d <= -TREND_CM ? 'baisse' : 'stable';
  }
  return { m: Math.round(head / 10) / 100, at: last.at, trend };
}

/** « 1,09 m » */
export const seineText = (s) => `${s.m.toFixed(2).replace('.', ',')} m`;
/** « en hausse sur 6 h » */
export const seineTrend = (s) => (s.trend === 'monte' ? 'en hausse sur 6 h' : s.trend === 'baisse' ? 'en baisse sur 6 h' : s.trend === 'stable' ? 'stable sur 6 h' : '');
