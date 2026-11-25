// Le lieu dont la fiche est ouverte, marqué sur la carte (v331) : js/lieu-ouvert.js et son emploi dans app.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openIdOf, needsCenter } from '../js/lieu-ouvert.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('lieu ouvert : seul l\'écran d\'une fiche donne un lieu', () => {
  assert.equal(openIdOf('detail:abc-12'), 'abc-12');
  assert.equal(openIdOf('detail:'), null);
  assert.equal(openIdOf('near'), null);
  assert.equal(openIdOf(null), null);
  assert.equal(openIdOf('horaires:abc'), null);
});

test('lieu ouvert : la carte ne bouge que si la goutte ne se voit pas', () => {
  const size = { x: 360, y: 740 };
  const sheetH = 430; const top = 60;
  assert.equal(needsCenter({ x: 180, y: 200 }, size, sheetH, top), false, 'visible entre la barre et la fiche');
  assert.equal(needsCenter({ x: 180, y: 500 }, size, sheetH, top), true, 'sous la fiche');
  assert.equal(needsCenter({ x: 180, y: 80 }, size, sheetH, top), true, 'sous la barre du haut');
  assert.equal(needsCenter({ x: -20, y: 200 }, size, sheetH, top), true, 'hors de l\'écran');
  assert.equal(needsCenter(null, size, sheetH, top), true, 'cachée dans un groupe');
});

test('lieu ouvert : app.js marque la goutte et ne centre depuis une liste que si besoin', () => {
  assert.match(app, /function markOpen\(/);
  assert.match(app, /markOpen\(true\)/, 'openSheet marque la goutte (palpitation à la première ouverture)');
  assert.ok((app.match(/showOpened\(p, back\)/g) ?? []).length >= 2, 'fiche ordinaire et fiche d\'une photo');
  assert.doesNotMatch(app, /if \(!back\) centerOn\(p\.lat, p\.lng/, 'plus de centrage seulement sans retour');
});

test('lieu ouvert : la marque se voit, la palpitation respecte « Supprimer les animations »', () => {
  assert.match(css, /\.pin-wrap\.is-open \.pin \{[^}]*scale\(calc\(1\.4 \* var\(--pk, 1\)\)\)/); // 3A (25 nov.) : 1,4 fois la goutte, normale ou grande
  assert.match(css, /\.pin-wrap\.is-open \.pin \{[^}]*var\(--ink\)[^}]*!important/, 'anneau encre, même sur un favori');
  const reduced = css.match(/@media \(prefers-reduced-motion: no-preference\) \{[^@]*open-pulse/);
  assert.ok(reduced, 'animation seulement sans réduction des mouvements');
});
