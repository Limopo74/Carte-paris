// Regroupement de mes lieux vus de loin (v178, maquette validée le 18 nov.).
// Jusqu'à la vue « quartier » (zoom GROUP_MAX_ZOOM), les lieux proches les uns des autres deviennent une goutte encre
// qui porte leur nombre ; un appui zoome dessus. À la vue « rue », jamais de groupe. Les favoris ne sont jamais regroupés.
// Les cases sont fixes dans le monde (coordonnées projetées à ce zoom) : déplacer la carte ne change pas les groupes,
// seul le zoom les refait.

export const GROUP_MAX_ZOOM = 15;
export const GROUP_CELL = 84; // px : une goutte de groupe fait 36 px, deux groupes voisins ne se chevauchent presque pas
export const GROUP_MIN = 3; // deux lieux voisins restent deux gouttes

/**
 * `project(p)` donne la position du lieu en pixels au zoom `zoom` (map.project dans l'appli).
 * `skipId` : un lieu à ne pas dessiner (celui qu'on déplace, le viseur le remplace).
 * Renvoie { single: lieux dessinés seuls, groups: [[lieux], …] }.
 */
export function groupPoints(list, project, zoom, skipId = null) {
  const pts = list.filter((p) => p.id !== skipId);
  if (!(zoom <= GROUP_MAX_ZOOM)) return { single: pts, groups: [] };
  const single = [];
  const cells = new Map();
  for (const p of pts) {
    if (p.fav) { single.push(p); continue; }
    const { x, y } = project(p);
    const k = `${Math.floor(x / GROUP_CELL)}:${Math.floor(y / GROUP_CELL)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(p);
  }
  const groups = [];
  for (const g of cells.values()) {
    if (g.length >= GROUP_MIN) groups.push(g);
    else single.push(...g);
  }
  return { single, groups };
}

/** Le milieu des lieux d'un groupe : là où sa goutte est posée. */
export const groupCenter = (g) => ({
  lat: g.reduce((a, p) => a + p.lat, 0) / g.length,
  lng: g.reduce((a, p) => a + p.lng, 0) / g.length,
});

/** Ce que lit le lecteur d'écran sur une goutte de groupe. */
export const groupLabel = (n) => `${n} lieux ici. Toucher pour zoomer.`;
