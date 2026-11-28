import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitSize, MAX_SIDE } from '../js/photos.js';

test('réduction des photos : 1280 px au plus, proportions gardées, jamais agrandie', () => {
  assert.equal(MAX_SIDE, 1280);
  assert.deepEqual(fitSize(4000, 3000), { w: 1280, h: 960 });
  assert.deepEqual(fitSize(3000, 4000), { w: 960, h: 1280 });
  assert.deepEqual(fitSize(800, 600), { w: 800, h: 600 });
});

test('sauvegarde : une photo du fichier redevient une image, sans fetch() (refusé par la CSP)', async () => {
  const { dataUrlToBlob } = await import('../js/photos.js');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const saved = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('fetch interdit'); };
  try {
    const b = await dataUrlToBlob(png);
    assert.equal(b.type, 'image/png');
    assert.equal(b.size, 70);
    assert.deepEqual([...new Uint8Array(await b.arrayBuffer()).slice(1, 4)], [80, 78, 71]); // « PNG »
    assert.equal(await dataUrlToBlob('data:text/html;base64,PGI+'), null);
    assert.equal(await dataUrlToBlob('javascript:alert(1)'), null);
    assert.equal(await dataUrlToBlob(null), null);
  } finally { globalThis.fetch = saved; }
});

test('photos en grand : glisser de côté change de photo, sans boucler (v201)', async () => {
  const { swipeStep, swipeIndex, photoCount, SWIPE_MIN } = await import('../js/photos.js');
  assert.equal(swipeStep(-SWIPE_MIN, 0), 1); // doigt vers la gauche : la suivante
  assert.equal(swipeStep(SWIPE_MIN, 0), -1); // doigt vers la droite : celle d'avant
  assert.equal(swipeStep(-(SWIPE_MIN - 1), 0), 0); // trop court : rien
  assert.equal(swipeStep(-60, 50), 0); // en biais ou de haut en bas : rien
  assert.equal(swipeStep(0, 0), 0);
  assert.equal(swipeStep(NaN, 0), 0);
  assert.equal(swipeIndex(0, 6, 1), 1);
  assert.equal(swipeIndex(5, 6, 1), 5); // dernière : on s'arrête
  assert.equal(swipeIndex(0, 6, -1), 0); // première : on s'arrête
  assert.equal(swipeIndex(0, 1, 1), 0);
  assert.equal(photoCount(1, 6), '2 / 6');
  assert.equal(photoCount(0, 1), ''); // une seule photo : pas de repère
});
