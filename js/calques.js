/* Calques Vélib' et Fontaines et WC (v150) : tout ce qui se trouve dans la zone de la carte, vu d'assez près.
   Aucune position n'est envoyée : les listes complètes sont téléchargées puis triées ici. */

/** À partir du niveau quartier : environ 30 à 50 points sur un écran de téléphone. Plus loin, la carte serait couverte. */
export const LAYER_ZOOM = 15;
/** Garde-fou : jamais plus de points à la fois. */
export const LAYER_MAX = 300;
/** Au-delà, les nombres de vélos et de places disparaissent jusqu'à la prochaine mise à jour (pas d'information plutôt qu'une fausse). */
export const VELIB_OLD_MS = 10 * 60e3;
/** En ouvrant une station, l'appli recharge d'abord si ses données ont plus de 2 minutes. */
export const VELIB_RECHECK_MS = 2 * 60e3;

/** Les points dans le cadre { s, w, n, e }, au plus `max`. */
export function inBox(items, box, max = LAYER_MAX) {
  const out = [];
  for (const x of items ?? []) {
    if (x.lat >= box.s && x.lat <= box.n && x.lng >= box.w && x.lng <= box.e) {
      out.push(x);
      if (out.length >= max) break;
    }
  }
  return out;
}

/** Heure de Paris, à la façon de l'appli : « 9h05 », « 14h32 ». */
export function hourText(t) {
  const [h, m] = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' })
    .format(new Date(t)).split(':');
  return `${Number(h)}h${m}`;
}

/** Les données Vélib' sont-elles trop anciennes pour montrer des nombres ? */
export const velibOld = (at, now = Date.now()) => !at || now - at > VELIB_OLD_MS;

/**
 * La petite étiquette sous la barre du haut, quand un calque est allumé : { text, act } ou null.
 * act : 'zoom' (un appui rapproche la carte), 'refresh' (un appui recharge Vélib'), null (rien à faire).
 */
export function layerNote({ velib = false, pratique = false, jardins = false, zoom = 0, at = 0, now = Date.now(), busy = false, need = 'bike' } = {}) {
  if (!velib && !pratique && !jardins) return null;
  if (zoom < LAYER_ZOOM) {
    const what = {
      100: 'les stations Vélib\'', '010': 'les fontaines et toilettes', '001': 'les jardins', 110: 'les Vélib\', fontaines et toilettes',
      101: 'les Vélib\' et les jardins', '011': 'les fontaines, toilettes et jardins', 111: 'les Vélib\', fontaines, toilettes et jardins',
    }[`${+velib}${+pratique}${+jardins}`];
    return { text: `Zoome pour voir ${what}`, act: 'zoom' };
  }
  if (!velib) return null;
  if (busy) return { text: 'Vélib\' : chargement…', act: null };
  if (!at) return { text: 'Vélib\' : pas de données · Réessayer', act: 'refresh' };
  const what = need === 'dock' ? 'places' : 'vélos';
  if (velibOld(at, now)) return { text: `Vélib' (${what}) de ${hourText(at)}, trop ancien · Mettre à jour`, act: 'refresh' };
  return { text: `Vélib' (${what}) à ${hourText(at)} · Mettre à jour`, act: 'refresh' };
}
