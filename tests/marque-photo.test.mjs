// v391 (ma demande du 24 nov. : « une petite marque lorsqu'un lieu dispose d'une photo ») :
// l'icône `image` au début de la petite ligne grise, dans chaque liste de mes lieux qui montre le favori.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const def = app.match(/const photoMark = \(p\) => \(([\s\S]*?)\n {2}: null\);/);

test('la marque existe : seulement avec une photo, pas pour une note prise en passant ni pour un lieu d\'un proche', () => {
  assert.ok(def, 'photoMark absente');
  assert.match(def[1], /p\.photos\?\.length/);
  assert.match(def[1], /!isPass\(p\)/);
  assert.match(def[1], /!p\.owner/);
  assert.match(def[1], /ico\('image'/, 'icône « photo » ; l\'appareil photo veut dire « prendre une photo »');
  assert.match(def[1], /aria-label/, 'dite par TalkBack');
});

test('chaque liste qui montre le favori montre aussi la marque photo', () => {
  const rows = app.split('\n').filter((l) => /nameFav\(p\)/.test(l));
  assert.ok(rows.length >= 6, `listes trouvées : ${rows.length}`);
  const withMark = app.split('\n').filter((l) => /class: 'item-sub' \}, photoMark\(p\)/.test(l));
  assert.equal(withMark.length, rows.length, 'une marque par liste, au début de la petite ligne grise');
});

test('la marque a son style (taille fixe, encre)', () => {
  assert.match(css, /\.photo-mark \{[^}]*inline-flex/);
});
