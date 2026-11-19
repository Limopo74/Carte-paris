// v219 : le bandeau de « Carte » (Sorties, Gratuit, Expos…) dit l'arrondissement, l'heure, Gratuit et Sur réservation,
// et compte les minutes depuis le même point que la liste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const peek = app.slice(app.indexOf('function showPeek(opts)'), app.indexOf('/** Une galerie touchée sur la carte'));

test('le petit titre du bandeau dit l\'arrondissement du lieu montré (arrLabel), après l\'onglet', () => {
  assert.match(peek, /const kickerOf = \(x\) => \{ const a = arrLabel\(x\); return \[kicker, tabs\?\.name, a\]\.filter\(Boolean\)\.join\(' · '\); \}/);
  assert.match(peek, /el\('span', \{ class: 'now-kicker' \}, kickerOf\(x\)\)/);
});

test('les minutes partent du centre de la carte ou de la station quand la liste part de là, pas de ma position', () => {
  assert.match(peek, /from && \(from\.kind === 'map' \|\| from\.kind === 'station'\) \? from : nearHere\(\) \?\? from/);
  assert.doesNotMatch(peek, /const o = (freshHere|nearHere)\(\) \?\? from;/);
});

test('une sortie : heure, « Gratuit » seulement si l\'agenda le dit, « Sur réservation » seulement si elle est obligatoire', () => {
  assert.match(app, /const eventInfo = \(e\) => \[eventWhen\(e\), e\.free \? 'Gratuit' : '', e\.booking === 'required' \? 'Sur réservation' : ''\];/);
  assert.match(app, /info: \(\) => \(x\.m \? marketInfo\(x\.m\) : eventInfo\(x\.e\)\)/);
  assert.match(peek, /\[\.\.\.info, off\(x\) \? 'Fermé' : '', o \? fmtWalk\(distanceM\(o, x\)\)\.replace\(/);
});

test('horaires inconnus : rien n\'est écrit pour une galerie ou un lieu gratuit', () => {
  assert.match(app, /const galleryInfo = \(g\) => \{ const st = openState\(g\.hours\); return \[!st \? '' :/);
  assert.match(app, /const hoursLineShort = \(f\) => \{ const st = openState\(spotHours\(f\)\); return !st \? '' :/);
});
