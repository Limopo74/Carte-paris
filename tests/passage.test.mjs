import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEEN_CAT, seenName, withSeenCat, agoText, memoryHere, markShown, MEMORY_AGAIN_MS } from '../js/passage.js';
import { ICONS } from '../js/store.js';

const now = new Date(2026, 10, 17, 18).getTime();
const day = 864e5;

test('nom d\'une note prise en passant : sa ligne, sinon la date', () => {
  assert.equal(seenName('  cour   avec glycine ', new Date(now)), 'cour avec glycine');
  assert.equal(seenName('', new Date(now)), 'Vu le 17 nov.');
  const long = seenName('une très longue phrase qui décrit la porte cochère ouverte le matin', new Date(now));
  assert.ok(long.length <= 41 && long.endsWith('…'));
  assert.ok(!/\s…$/.test(long));
});

test('catégorie Vu en passant : ajoutée une seule fois, cachée de la barre du haut', () => {
  assert.ok(ICONS.includes(SEEN_CAT.icon));
  const s0 = { categories: [{ id: 'resto' }], hiddenChips: ['fav'] };
  const s1 = withSeenCat(s0);
  assert.deepEqual(s1.categories.map((c) => c.id), ['resto', 'vu']);
  assert.deepEqual(s1.hiddenChips, ['fav', 'cat:vu']);
  assert.equal(withSeenCat(s1), s1, 'déjà là : rien ne change');
  // remise en barre par moi : jamais recachée
  const s2 = withSeenCat({ ...s1, hiddenChips: [] });
  assert.deepEqual(s2.hiddenChips, []);
});

test('il y a…', () => {
  assert.equal(agoText(now - 2 * 3600e3, now), 'aujourd\'hui');
  assert.equal(agoText(now - day, now), 'hier');
  assert.equal(agoText(now - 12 * day, now), 'il y a 12 jours');
  assert.equal(agoText(now - 250 * day, now), 'il y a 8 mois');
  assert.equal(agoText(now - 400 * day, now), 'il y a plus d\'un an');
  assert.equal(agoText(now - 800 * day, now), 'il y a 2 ans');
});

test('« Tu es déjà passé ici » : à moins de 100 m, avec une note ou une photo, pas ce qu\'on vient d\'ajouter', () => {
  const here = { lat: 48.8800, lng: 2.3400 };
  const pts = [
    { id: 'a', lat: 48.8805, lng: 2.3400, note: 'cour avec glycine', created: now - 200 * day }, // ~55 m
    { id: 'b', lat: 48.8801, lng: 2.3400, created: now - 200 * day }, // ~11 m, mais ni note ni photo
    { id: 'c', lat: 48.8802, lng: 2.3400, photos: ['x'], created: now - 3600e3 }, // ajouté il y a une heure
    { id: 'd', lat: 48.8802, lng: 2.3401, note: 'lieu de Léa', owner: 'Léa', created: now - 200 * day },
    { id: 'e', lat: 48.8820, lng: 2.3400, note: 'trop loin', created: now - 200 * day }, // ~220 m
  ];
  assert.equal(memoryHere(pts, here, {}, now)?.p.id, 'a');
  assert.equal(memoryHere(pts, null, {}, now), null);
  // déjà rappelé il y a 10 min : on le garde (même visite) ; il y a 2 jours : non ; il y a 8 jours : de nouveau
  assert.equal(memoryHere(pts, here, { a: now - 600e3 }, now)?.p.id, 'a');
  assert.equal(memoryHere(pts, here, { a: now - 2 * day }, now), null);
  assert.equal(memoryHere(pts, here, { a: now - 8 * day }, now)?.p.id, 'a');
});

test('carnet des rappels : la date du premier rappel est gardée 7 jours, puis oubliée', () => {
  let s = markShown({}, 'a', now);
  assert.equal(s.a, now);
  s = markShown(s, 'a', now + 600e3);
  assert.equal(s.a, now, 'même visite : date inchangée');
  s = markShown(s, 'b', now + MEMORY_AGAIN_MS + 1);
  assert.equal(s.a, undefined, 'plus de 7 jours : oublié');
  assert.ok(s.b);
});

test('mes passages : datés, du plus récent au plus ancien, pas de doublon automatique le même jour', async () => {
  const { addPassage, dropAutoPassage, cleanPassages, logName, cleanLog, photoIds, placeNear, journal, memoryOf } = await import('../js/passage.js');
  let l = addPassage([], { at: now - 10 * day, text: 'glycine en fleur', photo: 'ph1' });
  l = addPassage(l, { at: now });
  l = addPassage(l, { at: now + 3600e3 }); // Déjà visité recoché le même jour : pas de second passage vide
  assert.equal(l.length, 2);
  assert.equal(l[0].at, now);
  l = addPassage(l, { at: now + 7200e3, text: 'terrasse ouverte' }); // avec un texte : gardé
  assert.equal(l.length, 3);
  assert.deepEqual(dropAutoPassage(l, now).map((x) => x.text ?? ''), ['terrasse ouverte', 'glycine en fleur'], 'décoché : seul le passage vide du jour part');
  assert.deepEqual(cleanPassages([{ at: 'x' }, { at: 1, text: '  ', photo: '<b>' }]), [{ at: 1 }]);
  assert.equal(logName({ log: ' Mes repas ' }), 'Mes repas');
  assert.equal(logName({}), 'Mes passages');
  assert.equal(cleanLog('  Mes\n visites  '), 'Mes visites');
  assert.equal(cleanLog('x'.repeat(40)).length, 24);
  assert.deepEqual(photoIds({ photos: ['a'], passages: [{ at: 1, photo: 'b' }, { at: 2, photo: 'a' }] }), ['a', 'b']);
  const pts = [
    { id: 'cafe', cat: 'resto', lat: 48.8800, lng: 2.3400, passages: l },
    { id: 'vu1', cat: 'vu', lat: 48.88001, lng: 2.3400 },
    { id: 'lea', cat: 'resto', owner: 'Léa', lat: 48.88001, lng: 2.34001, passages: [{ at: now, text: 'chez Léa' }] },
  ];
  assert.equal(placeNear(pts, { lat: 48.8801, lng: 2.3400 })?.p.id, 'cafe', 'à 11 m : proposé (ni une note, ni un lieu de proche)');
  assert.equal(placeNear(pts, { lat: 48.8810, lng: 2.3400 }), null, 'à 110 m : non');
  assert.deepEqual(journal(pts).map((x) => x.text ?? ''), ['terrasse ouverte', '', 'glycine en fleur']);
  assert.equal(memoryOf(pts[0]).text, 'terrasse ouverte');
  assert.equal(memoryOf({ note: 'jardin', created: 5 }).text, 'jardin');
});

test('nom de l\'historique d\'une catégorie : gardé, effacé = « Mes passages »', async () => {
  const { updateCategory, loadState, saveState } = await import('../js/store.js');
  const st0 = { categories: [{ id: 'resto', name: 'Restos', color: '#d9480f', icon: '🍽️' }] };
  const st1 = updateCategory(st0, 'resto', { name: 'Restos', color: '#d9480f', icon: '🍽️', log: 'Mes repas' });
  assert.equal(st1.categories[0].log, 'Mes repas');
  const st2 = updateCategory(st1, 'resto', { name: 'Restos', color: '#d9480f', icon: '🍽️', log: '' });
  assert.equal(st2.categories[0].log, undefined);
  const st3 = updateCategory(st1, 'resto', { name: 'Restaurants', color: '#d9480f', icon: '🍽️' });
  assert.equal(st3.categories[0].log, 'Mes repas', 'sans champ log : inchangé');
  // les passages et le nom passent par le stockage
  const m = new Map(); const mem = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
  const s = loadState(mem);
  s.categories = st1.categories;
  s.points = [{ id: 'p', name: 'Café', cat: 'resto', lat: 48.88, lng: 2.34, passages: [{ at: 5, text: 'terrasse' }], created: 1 }];
  saveState(mem, s);
  const back = loadState(mem);
  assert.equal(back.categories[0].log, 'Mes repas');
  assert.deepEqual(back.points[0].passages, [{ at: 5, text: 'terrasse' }]);
});

test('note d\'un passage : 1 à 5 étoiles, facultative ; un passage noté n\'est jamais retiré en décochant', async () => {
  const { cleanPassages, addPassage, dropAutoPassage } = await import('../js/passage.js');
  assert.deepEqual(cleanPassages([{ at: 1, stars: 4 }, { at: 2, stars: 9 }, { at: 3, stars: 2.5 }]).map((x) => x.stars ?? 0), [0, 0, 4]);
  let l = addPassage([], { at: now, stars: 5 });
  l = addPassage(l, { at: now + 60e3 }); // même jour, vide : ignoré
  assert.equal(l.length, 1);
  assert.equal(dropAutoPassage(l, now).length, 1, 'noté : gardé');
});

test('le bon moment : familles heure, jour, saison ; texte ; le plus proche dont le moment est venu', async () => {
  const { cleanMoments, momentNow, momentText, momentHere } = await import('../js/passage.js');
  assert.deepEqual(cleanMoments(['soir', 'x', 'matin', 'soir']), ['matin', 'soir']);
  const samMatinAvril = new Date(2027, 3, 10, 9); // samedi 10 avril 2027, 9 h
  assert.equal(momentNow(['printemps'], samMatinAvril), true);
  assert.equal(momentNow(['printemps', 'soir'], samMatinAvril), false, 'printemps ET soir');
  assert.equal(momentNow(['matin', 'soir', 'weekend'], samMatinAvril), true, 'matin OU soir, et week-end');
  assert.equal(momentNow(['ete', 'automne'], samMatinAvril), false);
  assert.equal(momentNow(['hiver'], new Date(2027, 0, 5, 15)), true, 'janvier = hiver');
  assert.equal(momentNow(['weekend'], new Date(2026, 10, 17, 9)), false, 'mardi');
  assert.equal(momentNow([], samMatinAvril), false);
  assert.equal(momentText(['matin', 'printemps']), 'au printemps, le matin');
  assert.equal(momentText(['soir', 'matin', 'weekend']), 'le week-end, le matin ou le soir');
  const here = { lat: 48.88, lng: 2.34 };
  const pts = [
    { id: 'glycine', lat: 48.8830, lng: 2.34, moments: ['printemps'] }, // ~330 m
    { id: 'marche', lat: 48.8805, lng: 2.34, moments: ['weekend', 'matin'] }, // ~55 m
    { id: 'terrasse', lat: 48.8801, lng: 2.34, moments: ['ete'] }, // pas en avril
    { id: 'lea', lat: 48.8800, lng: 2.34, moments: ['printemps'], owner: 'Léa' },
    { id: 'loin', lat: 48.8950, lng: 2.34, moments: ['printemps'] }, // ~1,7 km
  ];
  assert.equal(momentHere(pts, here, samMatinAvril)?.p.id, 'marche');
  assert.equal(momentHere(pts, here, samMatinAvril, 800, (p) => p.id !== 'marche')?.p.id, 'glycine', 'fermé : le suivant');
  assert.equal(momentHere(pts, null, samMatinAvril), null);
});
