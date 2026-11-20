// Hauteurs de fenêtre : réduite (la barre du titre), basse (33 % de l'écran, v333), moitié (58 %), grande (85 %) — v332.
// En glissant la barre du titre, la fenêtre se cale sur une de ces hauteurs ; aucune hauteur libre.

const DOWN = 50; // px vers le bas pour bouger (comme la v166)
const UP = 30;   // px vers le haut
export const SIZES = ['mini', 'low', 'mid', 'tall'];
export const SHARE = { low: 0.33, mid: 0.58, tall: 0.85 }; // part de la hauteur de l'écran

/**
 * Hauteur après un glissement de `dy` px (positif = vers le bas).
 * `cur` : 'mini' | 'low' | 'mid' | 'tall' ; `h` : hauteurs réelles en px { mini, low, mid, tall }
 * (une page courte a des hauteurs égales : elles ne comptent que pour une) ;
 * `keep` : la hauteur d'avant la réduction.
 */
export function sheetStep(dy, cur, h, keep = 'mid') {
  if (!(dy > DOWN || dy < -UP)) return cur;
  // hauteurs égales (à 8 px près) regroupées ; le groupe prend le nom de la hauteur actuelle, sinon de celle d'avant la réduction
  const states = [];
  for (const s of SIZES) {
    const last = states.at(-1);
    if (last && Math.abs(h[s] - h[last]) < 8) { if (s === cur || (cur === 'mini' && s === keep)) states[states.length - 1] = s; }
    else states.push(s);
  }
  const idx = states.indexOf(cur);
  const target = h[cur] - dy;
  let ni = 0;
  states.forEach((s, i) => { if (Math.abs(h[s] - target) < Math.abs(h[states[ni]] - target)) ni = i; });
  let forced = false;
  if (dy > DOWN && ni >= idx) ni = Math.max(0, idx - 1);
  if (dy < -UP && ni <= idx) { ni = Math.min(states.length - 1, idx + 1); forced = true; }
  if (cur === 'mini' && forced && states.includes(keep)) return keep; // réduite + court glissement : la hauteur d'avant
  return states[ni];
}
