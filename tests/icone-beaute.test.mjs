// v350 (mon choix B du 21 nov.) : 💄 (Beauté) et ✨ (Insolite, v344) dessinaient la même étoile : Beauté prend le vaporisateur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EMOJI_ICON, ICON_SVG } from '../js/icons.js';
import { ICONS } from '../js/store.js';

test('Deux icônes de catégorie proposées ne dessinent jamais la même chose', () => {
  const seen = new Map();
  for (const e of ICONS) {
    const g = EMOJI_ICON[e];
    assert.ok(g && ICON_SVG[g], `${e} sans dessin`);
    assert.ok(!seen.has(g), `${e} et ${seen.get(g)} dessinent « ${g} »`);
    seen.set(g, e);
  }
});

test('Beauté : le vaporisateur ; Insolite garde l\'étoile', () => {
  assert.equal(EMOJI_ICON['💄'], 'spray-can');
  assert.equal(EMOJI_ICON['✨'], 'sparkles');
});
