// v308 (mes choix du 20 nov.) : Réglages → Vu en passant, tout en bas : garder la catégorie, au départ ranger dans,
// proposer une adresse proche, photo sur la carte. Gardés, dans la sauvegarde et dans « mes réglages par défaut ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, cleanSettings, seenSettings, cleanSeenLast, KEY } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test('Au départ : catégorie gardée, Vu en passant, adresse proche proposée, photo sur la carte', () => {
  const s = loadState(mem());
  assert.deepEqual([s.seenKeep, s.seenStart, s.seenNear, s.seenPhotoMap, s.seenLast], [true, 'vu', true, true, null]);
  assert.deepEqual(seenSettings({ seenStart: 'nimporte' }).seenStart, 'vu');
});

test('Gardés au rechargement, dans mes réglages par défaut ; « La dernière » se souvient d\'un jour à l\'autre', () => {
  const st = mem();
  saveState(st, { ...loadState(mem()), seenKeep: false, seenStart: 'last', seenNear: false, seenPhotoMap: false, seenLast: { cat: 'culture', sub: 'abc' } });
  const b = loadState(st);
  assert.deepEqual([b.seenKeep, b.seenStart, b.seenNear, b.seenPhotoMap], [false, 'last', false, false]);
  assert.deepEqual(b.seenLast, { cat: 'culture', sub: 'abc' });
  const set = cleanSettings(b);
  assert.deepEqual([set.seenKeep, set.seenStart, set.seenNear, set.seenPhotoMap], [false, 'last', false, false]);
  assert.equal(cleanSeenLast({ cat: '../x' }), null);
});

test('Dans l\'appli : la ligne tout en bas, et chaque réglage agit', () => {
  // v322 : rangée dans Autres réglages → Mes lieux, sous Favoris
  const page = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const fav = page.indexOf("'Favoris', 'Étoile ou cœur, couleur'");
  const vu = page.indexOf("row('camera', 'Vu en passant'");
  assert.ok(fav > 0 && vu > fav && !page.slice(fav, vu).includes("row("), 'sous Favoris');
  assert.match(app, /if \(state\.seenKeep !== false && seenCats\(\)\.some\(\(c\) => c\.id === seenCat\)\) return \{ cat: seenCat, sub: seenSub \};/);
  assert.match(app, /if \(state\.seenStart === 'last' && state\.seenLast/);
  assert.match(app, /const near = !r\?\.error && state\.seenNear !== false \? placeNear/);
  assert.match(app, /const seen = isPass\(p\) && p\.photos\?\.length && !p\.gone && state\.seenPhotoMap !== false;/);
});
