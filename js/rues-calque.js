// v429 (ma demande du 25 nov.) : le trait des rues d'intérêt est un filtre, comme les passages couverts,
// éteint au départ : Filtres → Afficher aussi sur la carte → Rues d'intérêt. La goutte de la rue reste toujours ;
// la fiche ouverte d'une rue montre son trait même filtre éteint. Tout se calcule sur le téléphone.

/** Le trait de cette rue se dessine-t-il ? Filtre allumé, ou sa fiche ouverte (`openId`). */
export const rueTraitShown = (p, on, openId = null) => Boolean(p?.line) && (Boolean(on) || (openId != null && String(p.id) === String(openId)));

/** Le segment a → b ([lat, lng]) touche-t-il le cadre ? (découpage de Liang et Barsky) */
function segInBox([la1, ln1], [la2, ln2], box) {
  let t0 = 0, t1 = 1;
  const dx = ln2 - ln1, dy = la2 - la1;
  for (const [p, q] of [[-dx, ln1 - box.w], [dx, box.e - ln1], [-dy, la1 - box.s], [dy, box.n - la1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

/** Un tracé [[lat, lng], …] passe-t-il dans le cadre { s, w, n, e } ? Un de ses morceaux le touche. */
export function lineInBox(line, box) {
  if (!Array.isArray(line) || !line.length || !box) return false;
  if (line.length === 1) return segInBox(line[0], line[0], box);
  for (let i = 1; i < line.length; i++) if (segInBox(line[i - 1], line[i], box)) return true;
  return false;
}

/** L'étiquette sous la barre du haut : filtre allumé, des rues affichées, aucune dans le cadre. Sinon null. */
export function rueNote(points, on, box) {
  if (!on || !box) return null;
  const rues = (points ?? []).filter((p) => Array.isArray(p?.line) && p.line.length);
  if (!rues.length || rues.some((p) => lineInBox(p.line, box))) return null;
  return { text: rues.length === 1 ? 'Aucune rue ici · Voir la rue' : `Aucune rue ici · Voir les ${rues.length}`, act: 'rues' };
}
