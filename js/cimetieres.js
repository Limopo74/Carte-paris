// Cimetières (v450, mes choix A puis B du 25 nov. 2026) : les trois grands cimetières de la Ville dans le calque « Jardins publics ».
// - Le contour vient de data/jardins.json (robot, type « c », par l'identifiant du jeu de la Ville).
// - Tout le reste est tenu à la main dans data/cimetieres.json : horaires et portes relevés sur paris.fr ; tombes recopiées des plans
//   officiels (« Sépultures des personnalités les plus demandées ») et recoupées avec Wikidata (une division qui ne concorde pas : la
//   tombe est retirée ; des années qui ne concordent pas : elles ne s'affichent pas). Les horaires du jeu de la Ville ne servent pas :
//   pour ces cimetières, ce sont ceux du bureau (fermé le dimanche), pas ceux des portes.
// - L'appli mène au milieu de la division d'une tombe, jamais à la tombe : la position d'une tombe n'est pas assez sûre.
import { distanceM } from './geo.js';

/** « On n'entre plus 15 min avant la fermeture » (paris.fr, pages des trois cimetières). */
export const EVACUATION_MIN = 15;

const okNum = (x) => Number.isFinite(x);
const okPos = (o) => okNum(o?.lat) && okNum(o?.lng) && Math.abs(o.lat) <= 90 && Math.abs(o.lng) <= 180;
const str = (x, n = 200) => (typeof x === 'string' ? x.trim().slice(0, n) : '');
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MD = /^\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

/** data/cimetieres.json nettoyé : [{ id, jid, name, short, side, hours, gates, plan, planSource, col, tombs, div }]. */
export function cleanCimetieres(json) {
  const out = [];
  for (const x of Array.isArray(json?.items) ? json.items : []) {
    const id = str(x?.id, 40); const jid = str(x?.jid, 20); const name = str(x?.name, 80);
    if (!id || !jid || !name) continue;
    const div = new Map();
    for (const [k, v] of Object.entries(x.div ?? {})) {
      const pos = Array.isArray(v) ? { lat: v[0], lng: v[1] } : null;
      if (/^\d{1,3}$/.test(k) && okPos(pos)) div.set(Number(k), pos);
    }
    const gates = (Array.isArray(x.gates) ? x.gates : []).filter((g) => str(g?.n) && okPos(g)).map((g) => ({
      name: str(g.n, 60), address: str(g.a, 80), lat: g.lat, lng: g.lng, steps: g.steps === 1,
      ...(HM.test(g.open ?? '') ? { open: g.open } : {}),
      ...(Array.isArray(g.closed) && g.closed.length === 2 && g.closed.every((d) => MD.test(d)) ? { closed: g.closed } : {}),
    }));
    if (!gates.length) continue;
    const tombs = (Array.isArray(x.tombs) ? x.tombs : []).filter((t) => str(t?.n) && Number.isInteger(t?.d) && div.has(t.d)).map((t) => ({
      name: str(t.n, 80), what: str(t.m, 140), div: t.d, key: str(t.k, 40) || str(t.n, 40).toLowerCase(),
      ...(str(t.y, 30) ? { years: str(t.y, 30) } : {}), ...(/^Q\d+$/.test(t.q ?? '') ? { q: t.q } : {}),
    }));
    const hours = (Array.isArray(x.hours) ? x.hours : []).filter((h) => DAY.test(h?.from ?? '') && DAY.test(h?.to ?? '') && str(h?.h)).map((h) => ({ from: h.from, to: h.to, h: str(h.h) }));
    out.push({ id, jid, name, short: str(x.short, 40) || name, side: okNum(x.side) ? x.side : null, hours, gates,
      plan: /^https:\/\//.test(x.plan ?? '') ? x.plan : '', planSource: str(x.planSource, 80), col: Number.isInteger(x.col) ? x.col : null, tombs, div });
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Les horaires de la saison en cours (format OpenStreetMap) ; '' hors des saisons relevées : pas d'information plutôt qu'une fausse. */
export function cimHours(c, now = new Date()) {
  const day = dayOf(now);
  return (c?.hours ?? []).find((h) => h.from <= day && day <= h.to)?.h ?? '';
}

/** La porte est-elle utilisable maintenant ? (Amandiers : 10 h à 17 h ; Réunion : fermée du 26 mars au 19 avril) */
export function gateUsable(g, now = new Date()) {
  if (g.closed) { const md = `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`; if (md >= g.closed[0] && md <= g.closed[1]) return false; }
  if (g.open) {
    const [a, b] = g.open.split('-').map((t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; });
    const m = now.getHours() * 60 + now.getMinutes();
    if (m < a || m >= b) return false;
  }
  return true;
}

/** La porte où mène « Y aller » : la plus proche de `from` parmi celles utilisables maintenant ; sans position, la première (principale). */
export function gateFor(c, from = null, now = new Date()) {
  const ok = (c?.gates ?? []).filter((g) => gateUsable(g, now));
  const list = ok.length ? ok : (c?.gates ?? []);
  if (!from || !okPos(from)) return list[0] ?? null;
  return list.map((g) => ({ g, d: distanceM(from, g) })).sort((a, b) => a.d - b.d)[0]?.g ?? null;
}

/** Le centre de la division d'une tombe (là où mène l'appli). */
export const tombPlace = (c, t) => c?.div?.get(t?.div) ?? null;

/** « L'appli te mène… » : au columbarium pour une case, au milieu de la division sinon. */
export function tombHelp(c, t) {
  if (c?.col != null && t?.div === c.col) return 'L\'appli te mène au columbarium (division ' + t.div + ') ; la case est indiquée ci-dessus.';
  const side = c?.side ? ` : environ ${c.side} m de côté, la tombe se cherche sur place` : ' : la tombe se cherche sur place';
  return `L'appli te mène au milieu de la division ${t.div}, pas à la tombe${side}.`;
}

/** Le métier court d'une ligne de liste : avant la première virgule ou parenthèse. */
export const shortWhat = (t) => (t?.what ?? '').split(/[,(]/)[0].trim();

/** Article Wikipédia en français de la personne, par son identifiant Wikidata choisi à la main (jamais par le seul nom). */
export const wikiOf = (t) => (t?.q ? `https://www.wikidata.org/wiki/Special:GoToLinkedPage/frwiki/${t.q}` : '');

/** Tri des tombes : par distance quand `from` est donné, sinon par ordre alphabétique du nom de famille. */
export function sortTombs(c, list, from = null) {
  if (from && okPos(from)) return list.map((t) => ({ t, d: distanceM(from, tombPlace(c, t)) })).sort((a, b) => a.d - b.d);
  return list.map((t) => ({ t, d: null })).sort((a, b) => a.t.key.localeCompare(b.t.key, 'fr'));
}
