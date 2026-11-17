import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plaqueOk, plaquesOf, plaquesNear, plaqueStart } from '../js/plaques.js';

const here = { lat: 48.8572, lng: 2.3589 };
const p = (t, lat, lng, x = 'Ici est né\nJacob KAPLAN') => ({ t, x, a: '21 rue des Ecouffes', lat, lng });

test('plaques : un fichier abîmé donne une liste vide, une plaque sans texte ou sans position est écartée', () => {
  assert.deepEqual(plaquesOf(null), []);
  assert.deepEqual(plaquesOf({ items: 'x' }), []);
  assert.equal(plaqueOk(p('A', 48.85, 2.35)), true);
  assert.equal(plaqueOk(p('A', 48.85, 2.35, '  ')), false, 'sans texte');
  assert.equal(plaqueOk({ ...p('A', 48.85, 2.35), lat: null }), false, 'sans position');
  assert.equal(plaquesOf({ items: [p('A', 48.85, 2.35), { t: 'B' }] }).length, 1);
});

test('plaques à moins de 5 min : de la plus proche, rien de plus loin, rien sans position de départ', () => {
  const list = [p('Loin', 48.8700, 2.3589), p('Près', 48.8574, 2.3589), p('Tout près', 48.8573, 2.3589)];
  const near = plaquesNear(list, here, 400);
  assert.deepEqual(near.map((x) => x.plaque.t), ['Tout près', 'Près']);
  assert.ok(near[0].d < near[1].d);
  assert.deepEqual(plaquesNear(list, null), []);
});

test('début du texte d\'une plaque : sur une ligne, coupé à un mot', () => {
  assert.equal(plaqueStart(p('A', 0, 0, 'Ici est né\nJacob KAPLAN')), 'Ici est né Jacob KAPLAN');
  const s = plaqueStart(p('A', 0, 0, 'Dans cet immeuble a vécu de 1920 à 1935 le grand poète et romancier'), 30);
  assert.ok(s.endsWith('…') && s.length <= 31 && !s.includes('  '), s);
});

test('fichier des plaques de l\'appli : plus de 2 000 plaques lisibles, avec texte, adresse et position dans Paris', () => {
  const data = JSON.parse(readFileSync(new URL('../data/plaques.json', import.meta.url), 'utf8'));
  const list = plaquesOf(data);
  assert.ok(list.length >= 2000, `${list.length} plaques`);
  assert.equal(list.length, data.items.length, 'toutes valides');
  assert.ok(list.every((x) => x.lat > 48.8 && x.lat < 48.91 && x.lng > 2.22 && x.lng < 2.48));
  assert.match(data.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(data.source, /ODbL/);
});
