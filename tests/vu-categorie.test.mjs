// v305 (mes choix du 20 nov.) : après une photo Vu en passant, la catégorie (toutes sur une ligne qui défile, Vu en passant
// en premier, puis Street art), sa sous-catégorie (Street art : l'artiste) ; plus de listes sur cet écran (elles restent
// dans Modifier) ; catégorie et sous-catégorie gardées pour la photo suivante ; la marque « en passant » suit le lieu.
// v302 : Annuler | Enregistrer fixés en bas, feuille en grand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, KEY, addSub, renameSub, deleteSub, subNameOf, cleanSubs, deleteCategory } from '../js/store.js';
import { isPass, SEEN_CAT } from '../js/passage.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const seenForm = app.slice(app.indexOf('function openSeenForm('), app.indexOf('/** Ouvre le formulaire à une position'));
const mem = (obj) => { const m = new Map(obj ? [[KEY, JSON.stringify(obj)]] : []); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const base = () => ({ categories: [{ id: 'culture', name: 'Culture', color: '#7048e8', icon: '🏛️' }, { id: 'resto', name: 'Restos', color: '#e8590c', icon: '🍽️' }], points: [] });

test('Sous-catégories : créer, reprendre le même nom, renommer, supprimer sans perdre les lieux', () => {
  let s = loadState(mem(base()));
  const a = addSub(s, 'culture', '  Portes '); s = a.state;
  assert.deepEqual(s.categories[0].subs, [{ id: a.id, name: 'Portes' }]);
  assert.equal(addSub(s, 'culture', 'portes').id, a.id, 'le même nom (casse, accents) reprend la sous-catégorie');
  assert.throws(() => addSub(s, 'nulle-part', 'Cours'));
  const b = addSub(s, 'culture', 'Cours'); s = b.state;
  assert.throws(() => renameSub(s, 'culture', b.id, 'PORTES'), /existe déjà/);
  s = renameSub(s, 'culture', b.id, 'Cours fleuries');
  s.points.push({ id: 'p1', name: 'Porte bleue', cat: 'culture', sub: a.id, pass: true, lat: 48.88, lng: 2.34 });
  assert.equal(subNameOf(s.categories, s.points[0]), 'Portes');
  assert.equal(subNameOf(s.categories, { ...s.points[0], cat: 'resto' }), '', 'une sous-catégorie d\'une autre catégorie ne compte pas');
  s = deleteSub(s, 'culture', a.id);
  assert.equal(s.points[0].sub, undefined); assert.equal(s.points.length, 1, 'le lieu reste');
  assert.deepEqual(s.categories[0].subs.map((x) => x.name), ['Cours fleuries']);
});

test('Sous-catégorie et marque « en passant » : gardées par la sauvegarde ; la sous-catégorie ne suit pas une catégorie supprimée', () => {
  let s = loadState(mem(base()));
  const a = addSub(s, 'culture', 'Portes'); s = a.state;
  s.points.push({ id: 'p1', name: 'Porte bleue', cat: 'culture', sub: a.id, pass: true, lat: 48.88, lng: 2.34, note: '', done: false, fav: false, address: '', hours: '', owner: '', stars: 0, lists: [], covered: false, arr: null, photos: [], created: 1 });
  const st = mem(); saveState(st, s); const back = loadState(st);
  assert.equal(back.points[0].pass, true); assert.equal(back.points[0].sub, a.id);
  assert.deepEqual(back.categories[0].subs, [{ id: a.id, name: 'Portes' }]);
  const moved = deleteCategory(back, 'culture', 'resto');
  assert.equal(moved.points[0].cat, 'resto'); assert.equal(moved.points[0].sub, undefined); assert.equal(moved.points[0].pass, true);
  assert.deepEqual(cleanSubs([{ id: 'x', name: '' }, { id: '../', name: 'A' }, { id: 'y', name: 'B' }]), [{ id: 'y', name: 'B' }]);
});

test('Pris en passant : la marque, ou la catégorie Vu en passant d\'avant la v305', () => {
  assert.equal(isPass({ cat: 'culture', pass: true }), true);
  assert.equal(isPass({ cat: SEEN_CAT.id }), true);
  assert.equal(isPass({ cat: 'culture' }), false);
  assert.match(app, /\(!filt\.seen \|\| isPass\(p\)\)/, 'Filtres → Vu en passant');
  assert.match(app, /const seen = isPass\(p\) && p\.photos\?\.length && !p\.gone(?: && state\.seenPhotoMap !== false)?;/, 'la photo sur la carte');
});

test('Écran après la photo : catégorie, sous-catégorie ou artiste, plus de listes ; gardés pour la photo suivante', () => {
  assert.ok(!seenForm.includes('listChooser('), 'les listes restent dans Modifier');
  assert.match(seenForm, /    catBox,\n    subBox,\n    artistBox,\n    foot\(/);
  assert.match(app, /const all = \[vu, street, \.\.\.presets, \.\.\.state\.categories\.filter\(\(c\) => c\.photo === true/, 'v344 : Vu en passant, Street art, les catégories de photos, puis les miennes créées depuis Vu en passant');
  assert.match(seenForm, /class: 'seg seg-scroll', role: 'group', 'aria-label': 'Catégorie'/);
  assert.match(seenForm, /seenCat = cat; seenSub = isStreet \? '' : sub;/);
  assert.match(seenForm, /np\.pass = true;/);
  assert.match(seenForm, /subBox\.hidden = street\(\);/);
  assert.match(seenForm, /artistBox\.hidden = !street\(\);/);
  assert.match(seenForm, /foot\(el\('div', \{ class: 'row' \},[\s\S]*?'Annuler'\),\s*keep\)\)/);
  assert.match(seenForm, /\{ name: 'seen', tall: true \}/);
});

test('Modifier : la sous-catégorie seulement pour un lieu pris en passant, tout en bas', () => {
  assert.match(app, /const passPlace = Boolean\(existing && isPass\(existing\)\);/);
  assert.match(app, /rubBox, \/\* v288[^\n]*\n\s*passPlace \? null : subBox,/); // v348 : sous le commentaire pour une photo prise en passant
  assert.match(app, /existing \? noteField : null,\n\s*passPlace \? subBox : null,/);
  assert.match(app, /if \(passPlace && sub && !isStreetCat\(catOf\(cat\)\)\) existing\.sub = sub; else delete existing\.sub;/);
  assert.match(app, /function listChooser\(lists\)/);
});

test('Une note prise en passant n\'est jamais proposée comme « une de tes adresses » à la photo suivante', async () => {
  const { placeNear } = await import('../js/passage.js');
  const here = { lat: 48.88, lng: 2.34 };
  assert.equal(placeNear([{ id: 'a', cat: 'culture', pass: true, lat: 48.88, lng: 2.34 }], here), null);
  assert.equal(placeNear([{ id: 'b', cat: 'culture', lat: 48.88, lng: 2.34 }], here)?.p.id, 'b');
});
