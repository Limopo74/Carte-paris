// v296 : Mes salles → « Salles près de toi » : les lieux de l'agenda de la semaine qui ont un concert ou un spectacle.
// Noms tels que l'agenda « Que faire à Paris ? » les écrivait le 20 nov. 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { venuesNear, atVenue } from '../js/art.js';

const here = { lat: 48.8530, lng: 2.3690 }; // place de la Bastille
const ev = (title, place, lat, lng, tags = 'Concert') => ({ title, place, lat, lng, tags });
const isShow = (e) => /Concert|Théâtre|Humour/.test(e.tags);

const week = [
  ev('Trio jazz', '38Riv Jazz Club', 48.8556, 2.3593),
  ev('Jam session', '38Riv', 48.8557, 2.3594),
  ev('Jam session', '38Riv', 48.8557, 2.3594), // même sortie, deux fois
  ev('Seul en scène', 'Théâtre Comédie Bastille', 48.8606, 2.3726, 'Humour'),
  ev('Heure du conte', 'Bibliothèque Václav Havel', 48.8530, 2.3700, 'Théâtre'),
  ev('Danse au gymnase', 'Gymnase Marie Paradis', 48.8531, 2.3701, 'Théâtre'),
  ev('Opéra', 'Opéra Bastille', 48.8522, 2.3690),
  ev('Atelier', 'Le Regard du Cygne', 48.8540, 2.3700, 'Atelier'),
  ev('Loin', 'Théâtre 13 - Glacière', 48.8300, 2.3430, 'Théâtre'),
  ev('Sans lieu', '', 48.8530, 2.3690),
];

test('les salles proches qui ont un concert ou un spectacle, la plus proche d\'abord', () => {
  const near = venuesNear(week, here, 1000, { isShow });
  assert.deepEqual(near.map((v) => v.name), ['38Riv', 'Théâtre Comédie Bastille']);
  assert.equal(near[0].n, 2, 'deux sorties différentes au 38Riv (deux graphies, un doublon)');
  assert.ok(near[0].d > 600 && near[0].d < 900);
  assert.ok(atVenue(week[0], near[0].name), 'suivre « 38Riv » trouve aussi « 38Riv Jazz Club »');
});

test('sans Grands lieux, bibliothèques, gymnases, ni ce qui n\'est pas un spectacle', () => {
  const names = venuesNear(week, here, 5000, { isShow }).map((v) => v.name);
  for (const n of ['Opéra Bastille', 'Bibliothèque Václav Havel', 'Gymnase Marie Paradis', 'Le Regard du Cygne']) assert.ok(!names.includes(n), n);
  assert.ok(names.includes('Théâtre 13 - Glacière'), 'à 3,6 km : dans un rayon de 5 km');
});

test('une salle déjà suivie n\'est pas proposée ; sans point de départ, rien', () => {
  assert.deepEqual(venuesNear(week, here, 1000, { isShow, followed: ['38riv'] }).map((v) => v.name), ['Théâtre Comédie Bastille']);
  assert.deepEqual(venuesNear(week, null, 1000, { isShow }), []);
  assert.deepEqual(venuesNear(week, { lat: 45.76, lng: 4.83 }, 1000, { isShow }), [], 'loin de Paris : aucune');
});

test('deux salles différentes au nom voisin restent deux', () => {
  const two = [ev('A', 'Théâtre de la Ville', 48.8573, 2.3477, 'Théâtre'), ev('B', 'Théâtre de la Ville-Sarah Bernhardt', 48.8800, 2.3800, 'Théâtre')];
  assert.equal(venuesNear(two, here, 9000, { isShow }).length, 2, 'à plus de 100 m l\'une de l\'autre');
});
