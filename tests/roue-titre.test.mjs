// v377, construite comme v365 (mes choix 1A 2A 3A du 21 nov.) : une roue dans le titre de Sorties, Autour de moi et d'un circuit ; le retour des Réglages
// ouverts depuis un écran ramène à cet écran (aussi Mes Vu en passant et « Choisir ce qui va dans Plus »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const settings = app.slice(app.indexOf('function openSettings('), app.indexOf("if (section === 'sauvegarde')"));

test('roue : Sorties, Autour de moi et la page d\'un circuit ouvrent Distances et durées, avec leur retour', () => {
  // v377 (mon choix A du 23 nov.) : dans Sorties, la roue après l'image « Photos dans Sorties », qui ne bouge pas
  assert.match(app, /const gear = settingsGear\('distances', '[^']+', named\('Sorties', \(\) => openEvents\(\)\)\);/);
  assert.match(app, /openSheet\(\[\.\.\.title, photoBtn, gear\]\.filter\(Boolean\), el\('div', \{ class: 'stack ev-page' \}/);
  assert.match(app, /withGear\(nearTitle\(\), settingsGear\('distances', '[^']+', named\('Autour de moi', nearAgain\)\)\)/);
  assert.match(app, /withGear\(c\.titre, (circuitsOff\(\) \? null : )?settingsGear\('distances', '[^']+', self\)\)/); // v390 : pas de roue quand les circuits sont éteints
  assert.equal((app.match(/settingsGear\('/g) ?? []).length, 3, 'trois roues, pas plus (mon choix 2A)');
});

test('retour : Mes Vu en passant et Plus passent d\'où l\'on vient', () => {
  assert.match(app, /openSettings\('vu', named\('Mes Vu en passant', again\)\)/);
  assert.match(app, /openSettings\('barre', named\('Plus', openChipsMore\)\)/);
});

test('openSettings : le retour va à l\'écran de départ, oublié en ouvrant Réglages ou Autres réglages', () => {
  assert.match(settings, /if \(from\) settingsFrom = \{ section, back: from \}/);
  assert.match(settings, /else if \(!section \|\| section === 'autres'\) settingsFrom = null/);
  assert.match(settings, /const ret = settingsFrom\?\.section === section \? settingsFrom\.back : null/);
  assert.match(settings, /ret \? `← \$\{backLabel\(ret\)\}`/);
});

test('la roue reste collée au dernier mot du titre (elle ne passe jamais seule à la ligne)', () => {
  const src = app.slice(app.indexOf('const withGear'), app.indexOf('\n', app.indexOf('const withGear')));
  const withGear = new Function('el', `${src.replace('const withGear =', 'return')}`)((tag, attrs, ...kids) => ({ tag, attrs, kids }));
  const [head, tail] = withGear('Autour de moi · en direct', 'G');
  assert.equal(head, 'Autour de moi · en ');
  assert.deepEqual(tail.kids, ['direct', 'G']);
  assert.equal(tail.attrs.class, 'title-tail');
  const [h1, t1] = withGear('Sorties', 'G');
  assert.equal(h1, '');
  assert.deepEqual(t1.kids, ['Sorties', 'G']);
});
