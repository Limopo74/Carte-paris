// v396 : zoomer d'un seul doigt (deux appuis, le second gardé, puis glisser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSecondTap, zoomFromDrag, TAP_GAP_MS, TAP_NEAR_PX, PX_PER_LEVEL } from '../js/zoom-doigt.js';

test('le second appui compte seulement s\'il suit vite et tout près', () => {
  const a = { x: 100, y: 300, t: 1000 };
  assert.equal(isSecondTap(a, { x: 110, y: 305, t: 1200 }), true);
  assert.equal(isSecondTap(a, { x: 110, y: 305, t: 1000 + TAP_GAP_MS + 1 }), false, 'trop tard');
  assert.equal(isSecondTap(a, { x: 100 + TAP_NEAR_PX + 5, y: 300, t: 1100 }), false, 'trop loin');
  assert.equal(isSecondTap(null, { x: 100, y: 300, t: 1100 }), false, 'pas de premier appui');
});

test('vers le bas on rapproche, vers le haut on éloigne, sans sortir des bornes', () => {
  assert.equal(zoomFromDrag(15, PX_PER_LEVEL), 16);
  assert.equal(zoomFromDrag(15, -2 * PX_PER_LEVEL), 13);
  assert.equal(zoomFromDrag(18, 10 * PX_PER_LEVEL, 3, 19), 19);
  assert.equal(zoomFromDrag(5, -10 * PX_PER_LEVEL, 3, 19), 3);
});

test('le geste est branché sur la carte et gardé pour le métro', () => {
  assert.match(readFileSync('js/app.js', 'utf8'), /oneFingerZoom\(map\)/);
  assert.match(readFileSync('sw.js', 'utf8'), /'js\/zoom-doigt\.js'/);
});
