// Le lieu dont la fiche est ouverte, sur la carte (v331) : sa goutte se distingue des autres,
// et depuis une liste la carte ne se place sur lui que si on ne le voit pas.

/** Identifiant du lieu affiché par l'écran `view` (« detail:ID »), sinon null. */
export function openIdOf(view) {
  const s = String(view ?? '');
  return s.startsWith('detail:') && s.length > 7 ? s.slice(7) : null;
}

/**
 * Faut-il placer la carte sur le lieu ? Oui s'il n'a pas de goutte seule (caché dans un groupe : `pt` null)
 * ou si sa goutte sort de la partie de carte visible : sous la barre du haut (`top`), au-dessus de la fiche (`sheetH`).
 * `pt` = position de la pointe de la goutte en pixels de la carte ; la goutte monte d'environ 45 px au-dessus.
 */
export function needsCenter(pt, size, sheetH = 0, top = 0, margin = 12) {
  if (!pt || !size) return true;
  const PIN_H = 45;
  return pt.x < margin || pt.x > size.x - margin
    || pt.y - PIN_H < top + margin || pt.y > size.y - sheetH - margin;
}
