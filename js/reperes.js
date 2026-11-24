// Repères (v386, mes choix du 24 nov. 2026, claude/idee-reperes.md) : 19 grands monuments dessinés dans l'appli,
// sur la carte vue de loin (zooms 12 et 13), pour se repérer. Dessins faits pour l'appli (pas copiés), charte Papier :
// trait encre, intérieur kraft ou papier, un seul détail terre cuite, pas de bleu (le bleu veut dire métro).
// Positions : Wikidata (élément cité dans `q`), lues le 24 nov. 2026. Rien n'est envoyé : la liste est dans l'appli.

const ink = 'stroke="var(--ink)"';
const S = (d, fill = 'var(--soft)', w = 1.5) => `<path d="${d}" fill="${fill}" ${ink} stroke-width="${w}"/>`;
const L = (d, w = 1) => `<path d="${d}" fill="none" ${ink} stroke-width="${w}"/>`;
const A = (d, w = 1.4) => `<path d="${d}" fill="none" stroke="var(--disc)" stroke-width="${w}"/>`;
const AF = (d) => `<path d="${d}" fill="var(--disc)" stroke="none"/>`;
const shadow = (cx, rx) => `<ellipse cx="${cx}" cy="46.6" rx="${rx}" ry="1.6" fill="var(--ink)" opacity=".16"/>`;

/** Zooms où les dessins se montrent (vue de loin) : 12 et 13 ; cachés de plus près, où l'on voit les rues. */
export const REPERE_MIN_ZOOM = 12;
export const REPERE_MAX_ZOOM = 13;
/** Taille d'un dessin à l'écran (px), pied du monument sur sa position. */
export const REPERE_SIZE = 48;

/** Dessins (viewBox 48 × 48). */
export const REPERE_SVG = {
  'Tour Eiffel': [shadow(24, 15),
    S('M10 46 17.6 29 19.4 20.5 22.3 9 23.2 4h1.6l.9 5 2.9 11.5 1.8 8.5L38 46h-6.5Q24 35.5 16.5 46Z'),
    S('M14.6 29h18.8v2.2H14.6Z', 'var(--ink)', 1), S('M18.4 20.5h11.2v1.8H18.4Z', 'var(--ink)', 1), S('M21.6 9h4.8v1.5h-4.8Z', 'var(--ink)', 1),
    L('M19.8 22.3 28.6 29M28.2 22.3 19.4 29M22.6 10.5 26 20.5M25.4 10.5 22 20.5M16.6 31.2l4 6.2M31.4 31.2l-4 6.2', .8),
    A('M24 4V.8', 1.3)].join(''),
  'Arc de triomphe': [shadow(24, 19),
    S('M6 13h36v33H30.5V35a6.5 6.5 0 0 0-13 0v11H6Z'),
    S('M4 9.5h40V13H4Z', 'var(--ink)', 1), L('M6 17h36M6 20.5h36', .9),
    L('M9 24h6v9H9ZM33 24h6v9h-6Z', .9),
    L('M6 46h11.5M30.5 46H42', 1.5), AF('M24 45.6c-1.4-1.3-1.5-2.9 0-4.9 1.5 2 1.4 3.6 0 4.9Z')].join(''), // la flamme du Soldat inconnu
  'Sacré-Cœur': [shadow(24, 18),
    S('M7 46V31h34v15Z', 'var(--bg)'),
    S('M9 31a4.2 5.5 0 0 1 8.4 0ZM30.6 31a4.2 5.5 0 0 1 8.4 0Z', 'var(--bg)', 1.3),
    S('M17 31v-5h14v5Z', 'var(--bg)', 1.3), S('M16.5 26a7.5 10 0 0 1 15 0Z', 'var(--bg)'),
    S('M22.6 16h2.8v-3.4h-2.8Z', 'var(--bg)', 1.1), A('M24 12.6V8.2M22.3 9.8h3.4', 1.2),
    L('M21 46v-6a3 3 0 0 1 6 0v6M11 37v-2.5a1.5 1.5 0 0 1 3 0V37M34 37v-2.5a1.5 1.5 0 0 1 3 0V37', 1),
    L('M19 28.5v2.5M24 28v3M29 28.5v2.5', .8)].join(''),
  'Notre-Dame': [shadow(24, 18),
    A('M24 21V4', 1.4),
    S('M7 46V11h11v35ZM30 46V11h11v35Z'), S('M18 46V20h12v26Z'),
    S('M6 11h13V8.6H6ZM29 11h13V8.6H29Z', 'var(--ink)', 1),
    L('M7 19h11M30 19h11', 1.1),
    `<circle cx="24" cy="30" r="4.4" fill="var(--bg)" stroke="var(--disc)" stroke-width="1.8"/>`,
    L('M21.5 46v-5a2.5 2.5 0 0 1 5 0v5', 1.2)].join(''),
  'Tour Montparnasse': [shadow(24, 11),
    S('M16.5 46 17.6 5h12.8l1.1 41Z', 'var(--ink)', 1.5),
    `<path d="M18.6 10h10.8M18.5 14h11M18.4 18h11.2M18.3 22h11.4M18.2 26h11.6M18.1 30h11.8M18 34h12M17.9 38h12.2M17.8 42h12.4" stroke="var(--soft)" stroke-width=".9" fill="none"/>`,
    A('M17.6 5h12.8', 1.6)].join(''),
  'Opéra Garnier': [shadow(24, 21),
    S('M4 46V27h40v19Z'), S('M6 23h36v4H6Z', 'var(--ink)', 1), S('M15 23a9 5.5 0 0 1 18 0Z'),
    A('M22.4 17.6v-2.4a1.6 1.6 0 0 1 3.2 0v2.4M24 17.6v-2.6', 1.1),
    L('M8 29v6M12.5 29v6M17 29v6M21.5 29v6M26.5 29v6M31 29v6M35.5 29v6M40 29v6', .8), L('M4 36.5h40', 1),
    L('M8.5 46v-5.5a2 2 0 0 1 4 0V46M15.5 46v-5.5a2 2 0 0 1 4 0V46M22 46v-5.5a2 2 0 0 1 4 0V46M28.5 46v-5.5a2 2 0 0 1 4 0V46M35.5 46v-5.5a2 2 0 0 1 4 0V46', 1)].join(''),
  'Louvre': [shadow(24, 22),
    S('M2 46V31h44v15Z'), S('M3 31l2-4.5h7l2 4.5ZM34 31l2-4.5h7l2 4.5Z', 'var(--ink)', 1),
    L('M6 35v3M10 35v3M38 35v3M42 35v3', .9),
    S('M11 46 24 25l13 21Z', 'var(--bg)'), L('M24 25v21M17.5 35.5h13M14.3 40.7h19.4', .8),
    A('M24 25v-3', 1.3)].join(''),
  'Panthéon': [shadow(24, 19),
    S('M16.5 30v-6h15v6Z'), L('M19 24.5v5M22 24.5v5M26 24.5v5M29 24.5v5', .7),
    S('M17 24a7 8.5 0 0 1 14 0Z'), S('M22.8 15.6h2.4v-3h-2.4Z', 'var(--bg)', 1.1), A('M24 12.6V9', 1.3),
    S('M7 35 24 29.5 41 35Z'), S('M7 35h34v2H7Z', 'var(--ink)', 1),
    L('M10 37v9M14.2 37v9M18.4 37v9M22.6 37v9M26.8 37v9M31 37v9M35.2 37v9M39.4 37v9', 1.1), L('M5 46h38', 1.5)].join(''),
  'Invalides': [shadow(24, 19),
    S('M7 46V34h34v12Z'), L('M11 37v9M15 37v9M33 37v9M37 37v9', .9), L('M21.5 46v-5a2.5 2.5 0 0 1 5 0v5', 1.1),
    S('M16.5 34v-5h15v5Z'), L('M19 29.5v4M22 29.5v4M26 29.5v4M29 29.5v4', .7),
    S('M17 29a7 10.5 0 0 1 14 0Z'), A('M20.5 28.5c.3-5 1.6-8 3.5-10M27.5 28.5c-.3-5-1.6-8-3.5-10M24 28.5V18.6', 1),
    S('M23 18.6h2v-3.6h-2Z', 'var(--bg)', 1), A('M24 15V8.5', 1.3)].join(''),
  'Concorde': [shadow(24, 9),
    S('M21.6 39.5 22.6 11h2.8l1 28.5Z'), AF('M22.6 11 24 6.5l1.4 4.5Z'),
    L('M24 14v22', .6), S('M19.5 39.5h9v4h-9Z'), S('M17.5 43.5h13V46h-13Z', 'var(--ink)', 1)].join(''),
  'Moulin Rouge': [shadow(24, 16),
    S('M9 46V31h30v15Z'), L('M9 35h30', 1), L('M21.5 46v-5a2.5 2.5 0 0 1 5 0v5', 1.1),
    S('M17.5 31V19h13v12Z'), S('M16.5 19 24 13l7.5 6Z', 'var(--ink)', 1),
    A('M24 15.5 13 5.5M24 15.5l11-10M24 15.5 13 25.5M24 15.5l11 10', 2.4),
    `<circle cx="24" cy="15.5" r="2" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.2"/>`].join(''),
  'Centre Pompidou': [shadow(24, 22),
    S('M4 44V13h40v31Z'), L('M4 23.3h40M4 33.6h40', 1), L('M4 13l10 10.3M14 13 4 23.3M14 23.3l10 10.3M24 23.3 14 33.6M24 33.6 34 44M34 33.6 24 44M34 13l10 10.3M44 13 34 23.3', .6),
    `<path d="M9 9v35M39 9v35" stroke="var(--ink)" stroke-width="2.2" fill="none"/>`, A('M19 10v34M29 10v34', 2.2),
    L('M2 46h44', 1.5)].join(''),
  'Grand Palais': [shadow(24, 22),
    S('M3 46V33h42v13Z'), L('M7 36v10M11 36v10M15 36v10M33 36v10M37 36v10M41 36v10', .9), L('M20 46v-6a4 4 0 0 1 8 0v6', 1.1),
    S('M5 33a19 9 0 0 1 38 0Z', 'var(--bg)'), L('M12 33v-6.5M18 33v-8.5M30 33v-8.5M36 33v-6.5', .7),
    S('M18.5 26a5.5 9 0 0 1 11 0Z', 'var(--bg)'), A('M24 17v-5M24 12l3.5 1.4L24 14.8', 1.1)].join(''),
  'Pont Alexandre-III': [
    `<path d="M2 45.5c3-1.2 5-1.2 8 0s5 1.2 8 0 5-1.2 8 0 5 1.2 8 0 5-1.2 8 0" fill="none" stroke="var(--ink)" stroke-width="1"/>`,
    S('M2 31h44v3H2Z', 'var(--ink)', 1), S('M7 43.5Q24 30.5 41 43.5', 'none', 1.6), L('M15 34v4.2M24 34v2.4M33 34v4.2', .8),
    S('M3 43V22h4.5v21ZM40.5 43V22H45v21Z'), S('M2.5 22h5.5v-2H2.5ZM40 22h5.5v-2H40Z', 'var(--ink)', 1),
    `<circle cx="5.25" cy="16.8" r="2.2" fill="var(--disc)"/><circle cx="42.75" cy="16.8" r="2.2" fill="var(--disc)"/>`].join(''),
  'Colonne de Juillet': [shadow(24, 9),
    S('M21.5 40V14h5v26Z'), S('M20 14h8v-2.2h-8Z', 'var(--ink)', 1), L('M21.5 20h5M21.5 26h5M21.5 32h5', .8),
    `<circle cx="24" cy="5" r="1.3" fill="var(--disc)"/>`, AF('M23 11.8h2l-.4-5.4h-1.2Z'),
    A('M23.4 7.4c-2-.4-4-1.8-5-4M24.6 7.4c2-.4 4-1.8 5-4', 1.3),
    S('M18 40h12v3.6H18Z'), S('M16 43.6h16V46H16Z', 'var(--ink)', 1)].join(''),
  'Musée d\'Orsay': [shadow(24, 22),
    S('M3 46V20h42v26Z'), S('M2 17h44v3H2Z', 'var(--ink)', 1), L('M13 20v26M35 20v26', 1),
    S('M16 46V31a8 8 0 0 1 16 0v15Z', 'var(--bg)', 1.2), L('M24 23v23M16 35h16M18.5 26.5 21 30M29.5 26.5 27 30', .7),
    `<circle cx="8" cy="26" r="2.6" fill="var(--bg)" stroke="var(--disc)" stroke-width="1.3"/><circle cx="40" cy="26" r="2.6" fill="var(--bg)" stroke="var(--disc)" stroke-width="1.3"/>`,
    L('M6 35v8M10 35v8M38 35v8M42 35v8', .8)].join(''),
  'Hôtel de Ville': [shadow(24, 22),
    S('M3 46V28h42v18Z'), S('M3 28l2-5h10l2 5ZM31 28l2-5h10l2 5Z', 'var(--ink)', 1),
    S('M18 46V24h12v22Z'), S('M17 24l2-6h10l2 6Z', 'var(--ink)', 1), S('M22 18v-5h4v5Z', 'var(--bg)', 1.1),
    A('M24 13V7.5M24 7.5l3.4 1.3L24 10.1', 1.1),
    `<circle cx="24" cy="29" r="2.3" fill="var(--bg)" stroke="var(--disc)" stroke-width="1.2"/>`,
    L('M21.5 46v-5a2.5 2.5 0 0 1 5 0v5M7 32v3M11 32v3M7 39v3M11 39v3M37 32v3M41 32v3M37 39v3M41 39v3', .9)].join(''),
  'Sainte-Chapelle': [shadow(24, 13),
    A('M24 9.5V2', 1.4), S('M13 46V18h22v28Z'), S('M11.5 18 24 9.5 36.5 18Z', 'var(--ink)', 1),
    L('M17 18v-3M31 18v-3', 1),
    `<circle cx="24" cy="24" r="3" fill="var(--bg)" stroke="var(--disc)" stroke-width="1.3"/>`,
    L('M16.5 44V31a2 2 0 0 1 4 0v13M27.5 44V31a2 2 0 0 1 4 0v13M22 44v-9a2 2 0 0 1 4 0v9', 1)].join(''),
  'Tour Saint-Jacques': [shadow(24, 9),
    S('M17.5 46V11h13v35Z'), S('M16.5 11h15V8h-15Z', 'var(--ink)', 1), L('M17.5 8V4.6M30.5 8V4.6M21 8V5.6M27 8V5.6', 1),
    A('M24 8V3.2M22.8 4.6h2.4', 1.2), L('M17.5 19h13M17.5 31h13', .8),
    L('M22 43V36a2 2 0 0 1 4 0v7M22 28.5v-6a2 2 0 0 1 4 0v6', 1)].join(''),
};

/** Les 19 monuments, dans l'ordre de priorité : quand deux dessins se touchent, le premier reste. */
export const REPERES = [
  { name: 'Tour Eiffel', lat: 48.858296, lng: 2.294479, q: 'Q243' },
  { name: 'Arc de triomphe', lat: 48.87378, lng: 2.29504, q: 'Q64436' },
  { name: 'Notre-Dame', lat: 48.853, lng: 2.3498, q: 'Q2981' },
  { name: 'Opéra Garnier', lat: 48.871944, lng: 2.331667, q: 'Q187840' },
  { name: 'Louvre', lat: 48.861, lng: 2.335861, q: 'Q13397' },
  { name: 'Panthéon', lat: 48.846198, lng: 2.346105, q: 'Q188856' },
  { name: 'Concorde', lat: 48.865475, lng: 2.321133, q: 'Q1503331' },
  { name: 'Sacré-Cœur', lat: 48.88665, lng: 2.34295, q: 'Q28785' },
  { name: 'Tour Montparnasse', lat: 48.84211, lng: 2.32198, q: 'Q323767' },
  { name: 'Invalides', lat: 48.855, lng: 2.312222, q: 'Q152109' },
  { name: 'Moulin Rouge', lat: 48.884167, lng: 2.332222, q: 'Q151030' },
  { name: 'Centre Pompidou', lat: 48.860638, lng: 2.352277, q: 'Q1895953' },
  { name: 'Grand Palais', lat: 48.866111, lng: 2.3125, q: 'Q457318' },
  { name: 'Pont Alexandre-III', lat: 48.86361, lng: 2.31361, q: 'Q390418' },
  { name: 'Colonne de Juillet', lat: 48.853056, lng: 2.369167, q: 'Q269641' },
  { name: "Musée d'Orsay", lat: 48.859972, lng: 2.326527, q: 'Q23402' },
  { name: 'Hôtel de Ville', lat: 48.856389, lng: 2.352222, q: 'Q640968' },
  { name: 'Sainte-Chapelle', lat: 48.855369, lng: 2.345028, q: 'Q193193' },
  { name: 'Tour Saint-Jacques', lat: 48.857764, lng: 2.348778, q: 'Q1431547' },
];

/** Deux rectangles (left, top, right, bottom) se touchent-ils ? */
export const touches = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

/**
 * Quels dessins montrer : rects[i] = rectangle du dessin i (dans l'ordre de REPERES), obstacles = rectangles des boutons
 * et de mes lieux. Un dessin qui touche un obstacle ou un dessin déjà gardé est caché. Renvoie les indices gardés.
 */
export function placeReperes(rects, obstacles, zoom) {
  if (!(zoom >= REPERE_MIN_ZOOM && zoom < REPERE_MAX_ZOOM + 1)) return [];
  const kept = [];
  rects.forEach((r, i) => {
    if (!r || obstacles.some((o) => touches(r, o)) || kept.some((k) => touches(r, rects[k]))) return;
    kept.push(i);
  });
  return kept;
}
