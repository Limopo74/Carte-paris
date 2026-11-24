// v422 (mes choix 1A 2A 3A 4A du 24 nov.) : « Café ou snack sur place » et « Boutique sur place », deux interrupteurs
// tout en bas de Modifier, cachés pour un resto, une boutique ou un café (`canClose`) ; la fiche l'écrit sur la ligne
// de « Abrité » et des listes. Les deux champs passent par clean (sauvegarde), mergeImport et mergeFriend (un proche).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeFriend, mergeImport, exportForFriend, SEND_DEFAULT, loadState, cleanServeNote } from '../js/store.js';
import { canClose } from '../js/passage.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const cats = [{ id: 'culture', name: 'Culture', color: '#aa3300', icon: '🏛️' }];
const now = Date.now();
const lieu = (o = {}) => ({ id: 'a', name: 'Musée de la Vie romantique', lat: 48.88, lng: 2.33, cat: 'culture', note: '', created: now, ...o });
const lui = (p) => ({ me: 'Paul', categories: cats, lists: [], points: [p] });
const envoi = (p) => JSON.parse(JSON.stringify(exportForFriend(lui(p), SEND_DEFAULT)));
const choix = { lieux: true, notes: true, passages: false, photos: false, cats: null, artists: new Set(), venues: new Set(), plans: new Set() };
const vide = () => ({ me: 'Marie', categories: cats, lists: [], points: [], plans: [], artists: [], venues: [] });

test('la sauvegarde garde « Café » et « Boutique » cochés, et seulement la vraie valeur true', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  mem.set('carte-paris.v1', JSON.stringify({ categories: cats, points: [lieu({ cafe: true, shop: true }), lieu({ id: 'b', name: 'Square', cafe: 'oui', shop: 1 })] }));
  const st = loadState(storage);
  const a = st.points.find((p) => p.id === 'a'), b = st.points.find((p) => p.id === 'b');
  assert.equal(a.cafe, true); assert.equal(a.shop, true);
  assert.equal('cafe' in b, false); assert.equal('shop' in b, false);
});

test('une sauvegarde remise rapporte « Café » et « Boutique »', () => {
  const fichier = JSON.stringify({ app: 'carte-paris', categories: cats, points: [lieu({ cafe: true })] });
  const r = mergeImport({ categories: cats, lists: [], points: [] }, fichier);
  const p = (r.state ?? r).points[0];
  assert.equal(p.cafe, true); assert.equal('shop' in p, false);
});

test('un proche : ses « Café » et « Boutique » arrivent, puis suivent sa nouvelle version', () => {
  const r1 = mergeFriend(vide(), envoi(lieu({ cafe: true, shop: true })), 'Paul', choix);
  assert.equal(r1.state.points[0].cafe, true); assert.equal(r1.state.points[0].shop, true);
  const r2 = mergeFriend(r1.state, envoi(lieu({ shop: true })), 'Paul', choix);
  assert.equal(r2.updated, 1);
  assert.equal('cafe' in r2.state.points[0], false); assert.equal(r2.state.points[0].shop, true);
});

test('les interrupteurs se cachent pour un resto, une boutique ou un café, pas pour un musée ou un jardin', () => {
  assert.equal(canClose({ id: 'resto', name: 'Restos' }), true);
  assert.equal(canClose({ id: 'boutique', name: 'Boutiques' }), true);
  assert.equal(canClose({ id: 'x1', name: 'Cafés' }), true);
  assert.equal(canClose({ id: 'culture', name: 'Culture' }), false);
  assert.equal(canClose({ id: 'x2', name: 'Parcs et jardins' }), false);
  assert.match(app, /const servesFits = \(\) => !canClose\(catOf\(cat\)\);/);
  assert.match(app, /formSwitch\('Café ou snack sur place', null, cafe/);
  assert.match(app, /formSwitch\('Boutique sur place', null, shop/);
  assert.match(app, /syncSub\(\); syncServes\(\); \}\)\)/, 'la catégorie changée les cache ou les montre');
  // tout en bas de Modifier, après la sous-catégorie ; une photo prise en passant ne les voit que s'ils sont déjà cochés
  assert.match(app, /passPlace \? null : subBox,[^\n]*\n\s*keepPhoto\(cafe \|\| shop\) \? servesBox : null,/);
  // enregistrés seulement quand la catégorie s'y prête
  assert.match(app, /if \(cafe && servesFits\(\)\) existing\.cafe = true; else delete existing\.cafe;/);
  assert.match(app, /if \(cafe && servesFits\(\)\) np\.cafe = true;/);
});

test('la fiche les écrit sur la ligne de « Abrité » et des listes ; avec un commentaire, sur une ligne à eux', () => {
  assert.match(app, /const listNames = \[p\.covered \? 'Abrité' : null, p\.cafe && !p\.cafeNote \? 'Café' : null, p\.shop && !p\.shopNote \? 'Boutique' : null,/);
  assert.match(app, /p\.cafe && p\.cafeNote \? el\('p', \{\}, `Café : \$\{p\.cafeNote\}`\) : null,/);
  assert.match(app, /p\.shop && p\.shopNote \? el\('p', \{\}, `Boutique : \$\{p\.shopNote\}`\) : null,/);
});

// v422 (ma demande du 25 nov.) : une ligne de commentaire sous chaque interrupteur
test('le commentaire : une ligne, 100 signes, gardé seulement si son interrupteur est allumé', () => {
  assert.equal(cleanServeNote('  Salon de thé\n dans le jardin  '), 'Salon de thé dans le jardin');
  assert.equal(cleanServeNote('x'.repeat(150)).length, 100);
  assert.equal(cleanServeNote(42), '');
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  mem.set('carte-paris.v1', JSON.stringify({ categories: cats, points: [lieu({ cafe: true, cafeNote: 'Salon de thé', shopNote: 'Livres' })] }));
  const p = loadState(storage).points[0];
  assert.equal(p.cafeNote, 'Salon de thé');
  assert.equal('shopNote' in p, false, 'boutique pas cochée : pas de commentaire');
  assert.match(app, /if \(existing\.cafe && cleanServeNote\(cafeText\.value\)\) existing\.cafeNote = cleanServeNote\(cafeText\.value\); else delete existing\.cafeNote;/);
  assert.match(app, /formSwitch\('Café ou snack sur place', null, cafe, \(on\) => \{ cafe = on; cafeField\.hidden = !on; \}\), cafeField,/);
});

test('un proche : ses commentaires suivent avec ses commentaires (choix « notes »), sinon ne viennent pas', () => {
  const r1 = mergeFriend(vide(), envoi(lieu({ cafe: true, cafeNote: 'Salon de thé' })), 'Paul', choix);
  assert.equal(r1.state.points[0].cafeNote, 'Salon de thé');
  const r2 = mergeFriend(r1.state, envoi(lieu({ cafe: true, cafeNote: 'Fermé l\'hiver' })), 'Paul', choix);
  assert.equal(r2.state.points[0].cafeNote, 'Fermé l\'hiver');
  const r3 = mergeFriend(r2.state, envoi(lieu({})), 'Paul', choix);
  assert.equal('cafeNote' in r3.state.points[0], false, 'café décoché chez lui : le commentaire part aussi');
  const sansNotes = { ...choix, notes: false };
  const r4 = mergeFriend(vide(), envoi(lieu({ cafe: true, cafeNote: 'Salon de thé' })), 'Paul', sansNotes);
  assert.equal(r4.state.points[0].cafe, true); assert.equal('cafeNote' in r4.state.points[0], false);
});
