// v288 (mes choix 1A, 2A, 3A du 20 nov.) : le genre d'un de mes restos, repris des rubriques TTB qui sont des restos
// (La Table, Boui-boui, Street-food). Choisi dans Modifier, ou repris du guide seulement quand un mot du nom est commun,
// à moins de 150 m. Affiché dans le surtitre de la fiche ; pas de filtre (2A) ; pas pour les commerces (3A).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RESTO_RUBS, TTB_RUBS, ttbRubByName } from '../js/ttb.js';
import { PLACE_RUBS, loadState, KEY } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const ttb = (name, rub, lat, lng) => ({ name, rub, cuisine: '', address: '', arr: 13, budget: 1, url: '', hours: [], lat, lng });
const here = { lat: 48.8279, lng: 2.3525 };

test('Genre : les trois rubriques de restos du guide, les mêmes dans l\'appli et dans la sauvegarde', () => {
  assert.deepEqual(RESTO_RUBS, ['La Table', 'Boui-boui', 'Street-food']);
  assert.deepEqual(PLACE_RUBS, RESTO_RUBS);
  for (const r of RESTO_RUBS) assert.ok(TTB_RUBS.includes(r));
});

test('Genre repris du guide : seulement avec un vrai mot du nom en commun, à moins de 150 m', () => {
  const p = { name: 'Chez Gladines', ...here };
  assert.equal(ttbRubByName(p, [ttb('Les Gladines', 'Boui-boui', 48.8280, 2.3526)]), 'Boui-boui');
  // le resto d'à côté, à 10 m, sans mot commun : rien (jamais par la seule distance)
  assert.equal(ttbRubByName(p, [ttb('Le Temps des Cerises', 'La Table', 48.8280, 2.3525)]), '');
  // un mot courant ne suffit pas (« Chez », « Bistrot », « Café »…)
  assert.equal(ttbRubByName({ name: 'Chez Paul', ...here }, [ttb('Chez Jeanne', 'La Table', 48.8280, 2.3525)]), '');
  assert.equal(ttbRubByName({ name: 'Le Petit Bistrot', ...here }, [ttb('Bistrot Petit Paris', 'La Table', 48.8280, 2.3525)]), '');
  // trop loin (environ 220 m) : rien
  assert.equal(ttbRubByName(p, [ttb('Les Gladines', 'Boui-boui', 48.8299, 2.3525)]), '');
  // une rubrique de commerce (3A) : rien
  assert.equal(ttbRubByName({ name: 'Cave Septime', ...here }, [ttb('Septime La Cave', 'Cave', 48.8280, 2.3525)]), '');
  // deux adresses du même nom : la plus proche
  assert.equal(ttbRubByName(p, [ttb('Gladines', 'La Table', 48.8285, 2.3525), ttb('Les Gladines', 'Boui-boui', 48.8280, 2.3525)]), 'Boui-boui');
  assert.equal(ttbRubByName(p, []), '');
  assert.equal(ttbRubByName(null, [ttb('Les Gladines', 'Boui-boui', 48.8280, 2.3526)]), '');
});

test('Genre gardé avec le lieu : un genre de resto ou « aucun » choisi ; le reste est écarté', () => {
  const mem = new Map([[KEY, JSON.stringify({ points: [
    { id: 'a', name: 'A', cat: 'resto', lat: 48.85, lng: 2.35, rub: 'La Table' },
    { id: 'b', name: 'B', cat: 'resto', lat: 48.85, lng: 2.35, rub: '' },
    { id: 'c', name: 'C', cat: 'resto', lat: 48.85, lng: 2.35, rub: 'Cave' },
    { id: 'd', name: 'D', cat: 'resto', lat: 48.85, lng: 2.35 },
  ] })]]);
  const s = loadState({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) });
  const by = Object.fromEntries(s.points.map((p) => [p.id, p]));
  assert.equal(by.a.rub, 'La Table');
  assert.equal(by.b.rub, '');
  assert.equal('rub' in by.c, false);
  assert.equal('rub' in by.d, false);
});

test('Genre dans l\'appli : surtitre de la fiche, Modifier tout en bas, adresse TTB gardée avec son genre', () => {
  assert.match(app, /const rubName = placeRub\(p\)(?: \|\| subNameOf\(state\.categories, p\))?;[^\n]*\n\s*const kick = \[catOf\(p\.cat\)\.name, rubName, arrLabel\(p\)\]/);
  assert.match(app, /if \(h <= kickEl\.offsetHeight\) kickEl\.firstChild\.textContent = kick;/); // retiré de la ligne s'il la coupe en deux
  assert.match(app, /const placeRub = \(p\) => \(!p \|\| !isRestoCat\(catOf\(p\.cat\)\)/); // jamais pour un lieu qui n'est pas un resto
  assert.match(app, /momentBox,\n\s*rubBox,/); // en bas du formulaire : il ne pousse rien
  assert.match(app, /'Genre \(facultatif\)'/);
  assert.match(app, /cat: ttbCategory\(x\.rub, state\.categories\) \?\? '', rub: x\.rub \}\)/);
});
