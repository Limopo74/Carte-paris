// Trois hauteurs de fenêtre (v332) : réduite (la barre du titre), moitié (58 % de l'écran), grande (85 %).
// En glissant la barre du titre, la fenêtre se cale sur une de ces hauteurs ; aucune hauteur libre.

const DOWN = 50; // px vers le bas pour bouger (comme la v166)
const UP = 30;   // px vers le haut

/**
 * Hauteur après un glissement de `dy` px (positif = vers le bas).
 * `cur` : 'mini' | 'mid' | 'tall' ; `h` : hauteurs réelles en px { mini, mid, tall } (une page courte a mid = tall) ;
 * `keep` : la hauteur d'avant la réduction ('mid' ou 'tall').
 */
export function sheetStep(dy, cur, h, keep = 'mid') {
  if (!(dy > DOWN || dy < -UP)) return cur;
  const same = Math.abs(h.tall - h.mid) < 8; // page courte : moitié et grande se confondent
  const states = same ? ['mini', cur === 'mini' ? keep : cur] : ['mini', 'mid', 'tall'];
  const idx = states.indexOf(cur);
  const target = h[cur] - dy;
  let ni = 0;
  states.forEach((s, i) => { if (Math.abs(h[s] - target) < Math.abs(h[states[ni]] - target)) ni = i; });
  if (dy > DOWN && ni >= idx) ni = Math.max(0, idx - 1);
  if (dy < -UP && ni <= idx) ni = Math.min(states.length - 1, idx + 1);
  if (cur === 'mini' && ni === 1 && !same && target < (h.mini + h.mid) / 2) return keep; // court glissement : la hauteur d'avant
  return states[ni];
}
