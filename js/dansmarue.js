/* v471 (mes choix 6, « tout conseillé, toujours très visuel », 25 nov.) : couche « Signalements Dans ma rue ».
   Les signalements « Propreté » et « Objets abandonnés » de l'appli DansMaRue de la Ville de Paris (Paris Data, jeu dans-ma-rue),
   comptés par carré d'environ 100 m sur les 12 derniers mois publiés (la Ville publie avec environ 3 mois de retard).
   Rangés dans l'appli par le robot (data/dansmarue.json, tools/maj-dansmarue.py) : le téléphone n'envoie rien, ni position ni zone.
   Ce sont des signalements d'habitants, pas une mesure de la saleté ; traités ou non, la source ne le dit pas. */

export const DMR_ZOOM = 15; // comme Vélib' et Fontaines et WC : vu d'assez près seulement
export const DMR_MAX = 700; // carrés dessinés au plus à la fois (un écran de téléphone en montre environ 250 au zoom 15)
export const DMR_LEVELS = ['Peu', 'Moyen', 'Beaucoup'];

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Le fichier relu ; null s'il manque, est vide ou faux. */
export function cleanDmr(j) {
  if (!j || !Array.isArray(j.cells) || !j.cells.length) return null;
  const [lat0, lng0] = j.origin ?? []; const [dlat, dlng] = j.step ?? []; const [c1, c2] = j.cuts ?? [];
  if (![lat0, lng0, dlat, dlng, c1, c2].every(isNum) || !(dlat > 0 && dlng > 0 && c1 >= 1 && c2 > c1) || !isDay(j.from) || !isDay(j.to)) return null;
  const cells = j.cells.filter((c) => Array.isArray(c) && c.length === 3 && c.every(Number.isInteger) && c[2] > 0);
  return cells.length ? { source: String(j.source ?? ''), updated: isDay(j.updated) ? j.updated : '', from: j.from, to: j.to, lat0, lng0, dlat, dlng, cuts: [c1, c2], cells } : null;
}

/** 0 peu, 1 moyen, 2 beaucoup : c1 et c2 sont les premiers nombres des niveaux moyen et beaucoup. */
export const dmrLevel = (n, [c1, c2]) => (n >= c2 ? 2 : n >= c1 ? 1 : 0);

/** Les carrés dans le cadre { s, w, n, e } : { s, w, n, e, level, count }, au plus `max`. */
export function dmrInBox(d, box, max = DMR_MAX) {
  const out = [];
  if (!d) return out;
  for (const [i, j, n] of d.cells) {
    const s = d.lat0 + i * d.dlat; const w = d.lng0 + j * d.dlng;
    if (s + d.dlat < box.s || s > box.n || w + d.dlng < box.w || w > box.e) continue;
    out.push({ s, w, n: s + d.dlat, e: w + d.dlng, level: dmrLevel(n, d.cuts), count: n });
    if (out.length >= max) break;
  }
  return out;
}

const day = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
/** « du 21 août 2025 au 20 août 2026 ». */
export const dmrPeriod = (d) => `du ${day(d.from)} au ${day(d.to)}`;
/** Les mots de la légende pour un carré d'environ 100 m : « 1 à 3 », « 4 à 9 », « 10 et plus ». */
export function dmrLegend(d) {
  const [c1, c2] = d.cuts;
  return [c1 > 2 ? `1 à ${c1 - 1}` : '1', c2 - 1 > c1 ? `${c1} à ${c2 - 1}` : String(c1), `${c2} et plus`];
}
