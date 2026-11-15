import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitSize, MAX_SIDE, MAX_PHOTOS } from '../js/photos.js';

test('réduction des photos : 1280 px au plus, proportions gardées, jamais agrandie', () => {
  assert.equal(MAX_SIDE, 1280);
  assert.equal(MAX_PHOTOS, 6);
  assert.deepEqual(fitSize(4000, 3000), { w: 1280, h: 960 });
  assert.deepEqual(fitSize(3000, 4000), { w: 960, h: 1280 });
  assert.deepEqual(fitSize(800, 600), { w: 800, h: 600 });
});
