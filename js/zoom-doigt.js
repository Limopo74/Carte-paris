// v396 : zoomer d'un seul doigt, comme dans Google Maps (mon choix 2 du 24 nov.) — deux appuis rapides, le second
// gardé ; glisser vers le bas rapproche, vers le haut éloigne ; lâcher. Deux appuis sans glisser rapprochent d'un cran,
// comme avant. Le geste entier est pris avant Leaflet : ni déplacement de la carte, ni appui long (Ajouter un lieu), ni clic.

export const TAP_GAP_MS = 320;   // temps maximum entre les deux appuis
export const TAP_NEAR_PX = 40;   // le second appui à moins de 40 px du premier
export const MOVE_PX = 10;       // en dessous, ce n'est pas un glissé : deux appuis = un cran
export const PX_PER_LEVEL = 110; // 110 px de glissé = un cran de zoom

/** Le second appui suit-il le premier d'assez près, dans le temps et sur l'écran ? */
export function isSecondTap(prev, cur) {
  if (!prev || !cur) return false;
  const dt = cur.t - prev.t;
  return dt >= 0 && dt <= TAP_GAP_MS && Math.hypot(cur.x - prev.x, cur.y - prev.y) <= TAP_NEAR_PX;
}

/** Le zoom pendant le glissé : vers le bas (dy > 0) on rapproche ; borné par le zoom le plus petit et le plus grand. */
export function zoomFromDrag(z0, dy, min = 0, max = 20) {
  return Math.min(max, Math.max(min, z0 + dy / PX_PER_LEVEL));
}

/** Branche le geste sur une carte Leaflet. Les touchers d'un doigt seulement ; un second doigt rend la main à Leaflet. */
export function oneFingerZoom(map) {
  const box = map.getContainer();
  let last = null;      // le dernier appui simple terminé : { x, y, t }
  let down = null;      // où le doigt s'est posé, pour ne pas compter un glissé comme premier appui
  let g = null;         // le geste en cours : { id, x, y, z0, pt, moved }
  let swallowUntil = 0; // le dblclick qu'Android peut envoyer après le geste est ignoré
  const stop = (e) => { e.stopPropagation(); if (e.cancelable) e.preventDefault(); };
  const pos = (e) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const end = (e, cancel = false) => {
    if (!g || e.pointerId !== g.id) return;
    stop(e);
    const { pt, moved, z0 } = g;
    g = null; last = null; swallowUntil = Date.now() + 500;
    map.options.zoomSnap = 1;
    if (cancel) return;
    if (!moved) map.setZoomAround(pt, Math.min(map.getMaxZoom(), z0 + 1)); // deux appuis : un cran, comme avant
    else map.setZoomAround(pt, Math.round(map.getZoom()));
  };
  box.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || !e.isPrimary) { if (g) { g = null; map.options.zoomSnap = 1; } last = null; return; }
    const p = { ...pos(e), t: Date.now() };
    down = p;
    // sur une goutte, un bouton ou un dessin touchable : rien ne change
    if (e.target.closest?.('.leaflet-marker-icon.leaflet-interactive, .leaflet-interactive, button, a, .leaflet-control')) { last = null; return; }
    if (!isSecondTap(last, p)) { last = null; return; } // un premier appui : Leaflet le garde
    stop(e);
    g = { id: e.pointerId, x: p.x, y: p.y, z0: map.getZoom(), pt: map.containerPointToLatLng([p.x, p.y]), moved: false };
    try { box.setPointerCapture(e.pointerId); } catch { /* rien */ }
  }, true);
  box.addEventListener('pointermove', (e) => {
    if (!g || e.pointerId !== g.id) return;
    stop(e);
    const dy = pos(e).y - g.y;
    if (!g.moved && Math.abs(dy) < MOVE_PX) return;
    g.moved = true;
    map.options.zoomSnap = 0; // zoom continu pendant le glissé, remis au cran entier en lâchant
    map.setZoomAround(g.pt, zoomFromDrag(g.z0, dy, map.getMinZoom(), map.getMaxZoom()), { animate: false });
  }, true);
  box.addEventListener('pointerup', (e) => {
    if (g) { end(e); return; }
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    const p = { ...pos(e), t: Date.now() };
    last = down && Math.hypot(p.x - down.x, p.y - down.y) < MOVE_PX && p.t - down.t < 400 ? p : null; // un vrai appui, pas un glissé ni un appui long
  }, true);
  box.addEventListener('pointercancel', (e) => end(e, true), true);
  // le clic et le double clic que le navigateur envoie après le geste, et l'appui long pendant le geste, ne vont pas à la carte
  for (const type of ['click', 'dblclick']) box.addEventListener(type, (e) => { if (Date.now() < swallowUntil) stop(e); }, true);
  box.addEventListener('contextmenu', (e) => { if (g || Date.now() < swallowUntil) stop(e); }, true);
  // Un premier appui qui glisse (déplacer la carte) ne compte pas comme premier appui d'un double appui
  map.on('movestart', () => { if (!g) last = null; });
}
