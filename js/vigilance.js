/* v511 (ma réponse 9 B, mes choix A et A du 25 nov. 2026) : la vigilance Météo-France à Paris, lue avec MA clé de l'API
   « Données Publiques Vigilance » (portail-api.meteofrance.fr, compte gratuit créé par moi, clé tapée dans l'appli, jamais
   donnée à Claude, jamais sur GitHub). Rien n'est envoyé de moi : la carte de la vigilance est la même pour tous.
   Format : « Descriptif technique Vigilance métropole, données publiques », Météo-France, v4 du 11/09/2023 :
   product.periods[] (echeance « J » ou « J1 », begin_validity_time, end_validity_time) → timelaps.domain_ids[] (domain_id :
   le département, « 75 ») → max_color_id et phenomenon_items[] (phenomenon_id, phenomenon_max_color_id).
   Couleurs : 1 vert, 2 jaune, 3 orange, 4 rouge. Seuls l'orange et le rouge s'affichent (mon choix A).
   Pas d'information plutôt qu'une fausse : rien si la carte a plus de 30 h (elle est refaite au moins deux fois par jour). */

export const VIGI_URL = 'https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours';
export const VIGI_PAGE = 'https://vigilance.meteofrance.fr/fr/paris';
export const VIGI_PORTAL = 'https://portail-api.meteofrance.fr/';
export const VIGI_KEY = 'carte-paris.meteofrance';
export const VIGI_DEPT = '75';
const MAX_AGE = 30 * 3600 * 1000;

export const PHENOMENA = { 1: 'vent', 2: 'pluie', 3: 'orages', 4: 'crues', 5: 'neige et verglas', 6: 'canicule', 7: 'grand froid', 8: 'avalanches', 9: 'vagues et submersion' };
export const COLOR_NAME = { 1: 'verte', 2: 'jaune', 3: 'orange', 4: 'rouge' };

/** Clé plausible (le portail donne une longue chaîne de lettres, chiffres et signes . _ -). */
export const validVigiKey = (k) => /^[A-Za-z0-9_.=-]{20,4000}$/.test(String(k ?? ''));

/**
 * Lit la carte : { color (1 à 4), risks: [{ name, color }] (orange et rouge seulement, le plus fort d'abord), at (ms) }
 * ou null (réponse bizarre, carte trop vieille, Paris absent, pas de période en cours).
 */
export function readVigi(json, now = Date.now()) {
  const p = json?.product;
  const at = Date.parse(p?.update_time ?? '');
  if (!Number.isFinite(at) || now - at > MAX_AGE || at - now > 3600 * 1000) return null;
  const periods = Array.isArray(p?.periods) ? p.periods : [];
  const cur = periods.find((x) => Date.parse(x?.begin_validity_time) <= now && now < Date.parse(x?.end_validity_time));
  if (!cur) return null;
  const doms = (Array.isArray(cur.timelaps?.domain_ids) ? cur.timelaps.domain_ids : Array.isArray(cur.timelaps) ? cur.timelaps.flatMap((t) => t?.domain_ids ?? []) : []);
  const d = doms.find((x) => String(x?.domain_id) === VIGI_DEPT);
  const color = Number(d?.max_color_id);
  if (!d || !(color >= 1 && color <= 4)) return null;
  const risks = (Array.isArray(d.phenomenon_items) ? d.phenomenon_items : [])
    .map((x) => ({ name: PHENOMENA[Number(x?.phenomenon_id)], color: Number(x?.phenomenon_max_color_id) }))
    .filter((x) => x.name && x.color >= 3 && x.color <= 4)
    .sort((a, b) => b.color - a.color);
  return { color, risks, at };
}

/** « Orages », ou « Orages +1 » s'il y en a d'autres (la pastille reste courte). */
export const vigiShort = (v) => (v?.risks.length ? `${v.risks[0].name[0].toUpperCase()}${v.risks[0].name.slice(1)}${v.risks.length > 1 ? ` +${v.risks.length - 1}` : ''}` : '');
/** « Vigilance orange à Paris : orages, canicule. » */
export const vigiText = (v) => `Vigilance ${COLOR_NAME[v.color]} à Paris${v.risks.length ? ` : ${v.risks.map((r) => r.name).join(', ')}` : ''}.`;
