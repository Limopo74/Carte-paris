// v290 : 11 salles de concert de plus dans Grands lieux → Musique (mes choix 1B 2B du 20 nov.).
// Les noms viennent de l'agenda « Que faire à Paris ? » tel qu'il les écrivait le 20 nov. 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ART_PLACES, artPlaceOf, findArtPlaces } from '../js/art.js';

const of = (place) => artPlaceOf({ place })?.name ?? null;

test('salles de concert : les noms de l\'agenda trouvent la bonne salle', () => {
  const cas = {
    'Théâtre du Châtelet': 'Théâtre du Châtelet',
    'Théâtre des Champs-Elysées': 'Théâtre des Champs-Élysées',
    'Théâtre des Champs Elysées': 'Théâtre des Champs-Élysées',
    'Théâtre des champs-Elysées': 'Théâtre des Champs-Élysées',
    'Théâtre des Champs-Élysées': 'Théâtre des Champs-Élysées',
    'Salle Pleyel': 'Salle Pleyel',
    'Salle Gaveau': 'Salle Gaveau',
    'Salle Cortot': 'Salle Cortot',
    'La Cigale': 'La Cigale',
    'Le Trianon': 'Le Trianon',
    'Opéra Garnier': 'Opéra Garnier',
    'Opéra Bastille Amphithéâtre Olivier Messiaen': 'Opéra Bastille',
    'L\'Olympia - Bruno Coquatrix': 'L\'Olympia',
    'L’Olympia': 'L\'Olympia',
    'La Seine Musicale': 'La Seine Musicale',
    'Seine Musicale': 'La Seine Musicale',
    'La Seine Musicale - Pianos Hanlet': 'La Seine Musicale',
  };
  for (const [place, name] of Object.entries(cas)) assert.equal(of(place), name, place);
});

test('salles de concert : les lieux voisins ne sont pas pris pour elles', () => {
  for (const place of ['Théâtre de la Bastille', 'Théâtre Comédie Bastille', 'Place de l\'Opéra', 'Médiathèque des Olympiades',
    'Sur les berges de Seine (rive droite), en contrebas de la rampe Châtelet, entre le Pont-Neuf et Pont au Change.',
    'Jardins des Champs-Élysées', 'Port des Champs-Elysées', 'Majestic Bastille']) assert.equal(of(place), null, place);
});

test('salles de concert : 13 salles, chacune avec site, position et adresse', () => {
  const m = ART_PLACES.filter((p) => p.kind === 'musique');
  assert.equal(m.length, 13);
  for (const p of m) {
    assert.ok(/^https:\/\//.test(p.site) && p.address, p.name);
    assert.ok(p.lat > 48.81 && p.lat < 48.91 && p.lng > 2.22 && p.lng < 2.42, `${p.name} : position hors de Paris et Boulogne`);
  }
  assert.deepEqual(findArtPlaces('olympia').map((p) => p.name), ['L\'Olympia']);
  assert.deepEqual(findArtPlaces('opéra').map((p) => p.name).sort(), ['Opéra Bastille', 'Opéra Garnier']);
});
