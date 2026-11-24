// v397 : le nom de mes lieux écrit sous leur goutte, de près (zoom 16 et plus), comme les lieux enregistrés de Google Maps
// (mon choix 3 du 24 nov.). Un nom qui touche un nom déjà gardé, une autre goutte ou un bouton se cache : les favoris d'abord,
// puis du plus proche du centre de l'écran au plus loin. Calculé sur le téléphone ; rien n'est envoyé.

export const NAMES_MIN_ZOOM = 16;
export const NAME_MAX = 24; // au-delà, le nom est coupé (« … »)

/** Le nom affiché : espaces réunis, coupé à NAME_MAX signes avec « … ». */
export function shortName(name) {
  const s = String(name ?? '').replace(/\s+/g, ' ').trim();
  return s.length > NAME_MAX ? `${s.slice(0, NAME_MAX - 1).trimEnd()}…` : s;
}

const touches = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

/**
 * Quels noms garder. `items` : [{ rect, own, fav, d }] — rect : le nom à l'écran ; own : la goutte du lieu (elle ne compte pas
 * comme obstacle pour son propre nom) ; fav : favori ; d : distance au centre de l'écran. `obstacles` : gouttes et boutons.
 * `frame` : le cadre de la carte ; un nom qui en sort, même un peu, n'est pas écrit (jamais un bout de nom au bord de l'écran).
 * Rend les indices gardés.
 */
export function keepNames(items, obstacles, frame = null) {
  const order = items.map((x, i) => i).filter((i) => items[i]?.rect)
    .sort((a, b) => (items[b].fav === true) - (items[a].fav === true) || items[a].d - items[b].d);
  const kept = [];
  for (const i of order) {
    const { rect, own } = items[i];
    if (frame && (rect.left < frame.left || rect.right > frame.right || rect.top < frame.top || rect.bottom > frame.bottom)) continue;
    if (obstacles.some((o) => o !== own && touches(rect, o))) continue;
    if (kept.some((k) => touches(rect, items[k].rect))) continue;
    kept.push(i);
  }
  return kept.sort((a, b) => a - b);
}
