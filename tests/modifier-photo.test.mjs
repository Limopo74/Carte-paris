// v348 (v348 : mes choix 1A 2A 3A 4A 5A 6A du 21 nov.) : « Modifier » d'une photo prise en passant ne garde que ce qui sert à une photo ;
// les catégories de photos et celles de la carte ne se mélangent plus ; la fiche photo n'a plus « Rattacher » en double.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPhotoCat, PHOTO_CATS } from '../js/passage.js';
import { DEFAULT_CATEGORIES } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const form = app.slice(app.indexOf('function openForm('), app.indexOf('/* ---------- Fiche d\'un lieu'));
const detail = app.slice(app.indexOf('function openDetail('), app.indexOf('  if (photoFiche) {'));

test('isPhotoCat : Vu en passant, Street art, les catégories de photos ; jamais celles de la carte', () => {
  assert.ok(isPhotoCat({ id: 'vu' }));
  assert.ok(isPhotoCat({ id: 'streetart', name: 'Street art' }));
  for (const c of PHOTO_CATS) assert.ok(isPhotoCat(c), c.id);
  assert.ok(isPhotoCat({ id: 'x1', name: 'Mes chats', photo: true }));
  for (const c of DEFAULT_CATEGORIES) assert.ok(!isPhotoCat(c), c.id);
  assert.ok(!isPhotoCat(null));
});

test('Catégories proposées (1A 2A) : photos pour une photo, carte (et Street art) pour un lieu, la catégorie actuelle toujours', () => {
  // v355 (mon choix 1A) : pour une photo, la liste d'après la photo (seenCats), plus la catégorie actuelle ; vides créées à l'enregistrement
  assert.match(form, /if \(!passPlace\) return state\.categories\.filter\(\(c\) => c\.id === cat \|\| !isPhotoCat\(c\) \|\| isStreetCat\(c\)\);/);
  assert.match(form, /const list = seenCats\(\);\n\s*return list\.some\(\(c\) => c\.id === cat\) \? list : \[\.\.\.list, catOf\(cat\)\];/);
  assert.match(form, /if \(passPlace && !state\.categories\.some\(\(c\) => c\.id === cat\) && seenCatsAll\(\)\.some\(\(c\) => c\.id === cat\)\) cat = ensureSeenCat\(cat\);/);
  assert.match(form, /if \(passPlace\) newPhotoCat\(reopen, pick\);/);
});

test('Champs d\'une photo (3A) : plus d\'état, favori, étoiles, listes, abrité ni bon moment, sauf déjà remplis ; sous-catégorie sous le commentaire', () => {
  assert.match(form, /const keepPhoto = \(filledField\) => !passPlace \|\| filledField;/);
  for (const k of ["keepPhoto(false) ? el('div', {}, el('div', { class: 'legend' }, 'État')", 'existing && keepPhoto(fav)', 'keepPhoto(stars > 0)', 'keepPhoto(lists.size > 0)', 'keepPhoto(covered)', 'keepPhoto(moments.size > 0)']) assert.ok(form.includes(k), k);
});

test('Mots (4A) : « Modifier photo » (« Modifier la photo » passait sur deux lignes en Très grand), un exemple de commentaire pour une photo', () => {
  assert.ok(form.includes("passPlace ? ' Modifier photo' : ' Modifier le lieu'"));
  assert.ok(form.includes("passPlace ? 'Ce que tu as vu, où exactement…'"));
  assert.ok(form.includes("el('label', { class: 'field' }, 'Adresse', addr)")); // 5A : l'adresse reste (elle part dans Partager)
});

test('Fiche photo (6A) : Rattacher plus dans Rangement, « Supprimer cette photo »', () => {
  const tidy = detail.slice(detail.indexOf('const showTidy'), detail.indexOf('const seenAgain'));
  assert.ok(!tidy.includes("row('link'"));
  assert.ok(tidy.includes("row('trash-2', delLabel")); // « Supprimer cette photo » : fait aussi par la v347 d'une autre conversation
});

test('Une photo prise en passant n\'est jamais dite « À faire » dans une liste', () => {
  assert.equal((app.match(/p\.done \|\| isPass\(p\) \? null :/g) ?? []).length, 3);
});
