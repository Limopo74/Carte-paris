// v454 (construite comme v452) : points de vue sur Paris (mes choix 1B 2A 3A puis 1A 2A 3A 4A du 25 nov. 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VUES, VUES_CHECKED, VUES_CHECKED_ON, vueStale, vueFermee, vueFermeText, vueSub, vuesSorted } from '../js/vues.js';
import { arrAt } from '../js/explore.js';
import { distanceM } from '../js/geo.js';

const data = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url), 'utf8'));
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const at = (iso) => new Date(`${iso}T12:00:00`);

// Arrondissement de l'adresse (ou du lieu) de chaque point de vue.
const ARR = { belleville: [20], 'parvis-sacre-coeur': [18], ima: [5], 'galeries-lafayette': [9], trocadero: [16], 'tour-eiffel': [7],
  arc: [8, 16, 17], 'notre-dame': [4], 'dome-sacre-coeur': [18], pantheon: [5] };

test('10 points de vue, chacun avec un id unique, une source https et une position dans son arrondissement', () => {
  assert.equal(VUES.length, 10);
  assert.equal(new Set(VUES.map((v) => v.id)).size, 10);
  for (const v of VUES) {
    assert.match(v.s, /^https:\/\//, v.id);
    assert.equal(typeof v.libre, 'boolean', v.id);
    assert.ok(v.adresse || /^Q\d+$/.test(v.q ?? ''), `${v.id} : adresse IGN ou élément Wikidata`);
    assert.ok(ARR[v.id].includes(arrAt(v.lat, v.lng, data)), `${v.id} : ${arrAt(v.lat, v.lng, data)}`);
  }
});

test('ni prix ni horaires écrits (règle « pas d\'info plutôt qu\'une info fausse »)', () => {
  for (const v of VUES) {
    const txt = `${v.t} ${v.acces ?? ''}`;
    assert.doesNotMatch(txt, /€|euro|\d+\s?h\b|\d+h\d*/i, v.id);
  }
});

test('gratuits d\'abord, puis payants, chacun du plus proche', () => {
  const here = { lat: 48.8522, lng: 2.356 }; // près de l'IMA
  const l = vuesSorted(here, distanceM);
  const firstPaid = l.findIndex((x) => !x.v.libre);
  assert.ok(l.slice(0, firstPaid).every((x) => x.v.libre));
  assert.ok(l.slice(firstPaid).every((x) => !x.v.libre));
  assert.equal(l[0].v.id, 'ima');
  for (let i = 1; i < firstPaid; i++) assert.ok(l[i - 1].d <= l[i].d);
  // sans position : l'ordre de la liste, gratuits d'abord
  assert.ok(vuesSorted(null, distanceM)[0].v.libre);
});

test('fermeture datée : du premier jour au jour de réouverture exclu, avec son texte', () => {
  const gl = VUES.find((v) => v.id === 'galeries-lafayette');
  assert.equal(vueFermee(gl, at('2026-11-19')), false);
  assert.equal(vueFermee(gl, at('2026-11-25')), true);
  assert.equal(vueFermeText(gl, at('2026-11-25')), 'Fermée jusqu\'au 6 janv. (patinoire).');
  assert.equal(vueFermee(gl, at('2027-01-06')), false);
  assert.equal(vueFermeText(gl, at('2027-01-06')), '');
});

test('colonnade du Panthéon : fermée de novembre à mars seulement', () => {
  const p = VUES.find((v) => v.id === 'pantheon');
  assert.equal(vueFermee(p, at('2026-11-25')), true);
  assert.equal(vueFermee(p, at('2027-03-31')), true);
  assert.equal(vueFermee(p, at('2027-04-01')), false);
  assert.equal(vueFermee(p, at('2027-10-31')), false); // avril à septembre ou à octobre selon les sources : on ne dit rien
});

test('la petite ligne : minutes, gratuit ou payant, réservation', () => {
  const now = at('2026-12-01');
  assert.equal(vueSub(VUES.find((v) => v.id === 'ima'), 6, now), '6 min · Gratuit');
  assert.equal(vueSub(VUES.find((v) => v.id === 'notre-dame'), 9, now), '9 min · Payant · sur réservation');
  assert.equal(vueSub(VUES.find((v) => v.id === 'arc'), null, now), 'Payant');
});

test('plus de 13 mois sans revue : plus de gratuit, payant, fermeture', () => {
  assert.equal(VUES_CHECKED, '25 novembre 2026');
  assert.equal(VUES_CHECKED_ON, '2026-11-25');
  assert.equal(vueStale(at('2027-12-24')), false);
  assert.equal(vueStale(at('2027-12-25')), true);
  const later = at('2028-01-10');
  assert.equal(vueSub(VUES.find((v) => v.id === 'ima'), 6, later), '6 min');
  assert.equal(vueFermee(VUES.find((v) => v.id === 'pantheon'), later), false);
});

test('dans l\'appli : bloc de Curiosités, liste, page, fichier gardé hors ligne, aide', () => {
  assert.match(app, /Points de vue à moins de \$\{durText\(VUES_NEAR_MIN\)\}/);
  assert.ok(app.indexOf('Points de vue à moins de') < app.indexOf("'Wikipédia à moins de 1 km'"), 'avant Wikipédia (choix 2A)');
  assert.match(app, /Tous les points de vue \(\$\{VUES\.length\}\)/);
  assert.match(app, /function openVue\(/);
  assert.match(app, /snap: \(\) => vuePhoto\(/);
  assert.match(sw, /'js\/vues\.js'/);
  // v464 : « Quatre styles » en tête, sa ligne des Nouveautés est sortie des 10 ; la page et le bloc restent vérifiés ci-dessus
});
