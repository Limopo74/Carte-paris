// v344 (mon choix A du 21 nov.) : la catégorie Vu en passant prend l'icône des photos empilées ;
// l'appareil photo ne veut plus dire que « prendre une photo ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEEN_CAT } from '../js/passage.js';
import { ICONS, cleanCategories } from '../js/store.js';
import { EMOJI_ICON } from '../js/icons.js';

test('Vu en passant : photos empilées, comme Mes Vu en passant', () => {
  assert.equal(EMOJI_ICON[SEEN_CAT.icon], 'images');
  assert.ok(ICONS.includes(SEEN_CAT.icon), 'choisissable, sinon cleanCategories la remplace');
});

test('l\'appareil photo n\'est plus proposé comme icône de catégorie', () => {
  assert.ok(!ICONS.includes('📷'));
});

test('une catégorie enregistrée avec l\'appareil photo passe aux photos empilées ; une autre icône reste', () => {
  const [vu, mine] = cleanCategories([
    { id: 'vu', name: 'Vu en passant', color: '#0c8599', icon: '📷' },
    { id: 'c1', name: 'Cours', color: '#0c8599', icon: '🌳' },
  ]);
  assert.equal(vu.icon, '🎞️');
  assert.equal(mine.icon, '🌳');
  const [changed] = cleanCategories([{ id: 'vu', name: 'Vu en passant', color: '#0c8599', icon: '📍' }]);
  assert.equal(changed.icon, '📍', 'une icône choisie à la main reste');
});

// v392 (mon choix A du 24 nov.) : le rond d'une photo prise en passant, sur la carte, montre aussi les photos empilées.
test('le rond Vu en passant de la carte n\'a plus l\'appareil photo', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const dot = app.match(/class="seen-dot"[^`]*?svgIcon\('([a-z-]+)'/);
  assert.ok(dot, 'rond seen-dot introuvable');
  assert.equal(dot[1], 'images');
});
