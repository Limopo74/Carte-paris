// v300 : Théâtre et danse dans Grands lieux (mes choix 1A 2A du 20 nov. 2026).
// Les noms viennent de l'agenda « Que faire à Paris ? » tel qu'il les écrivait le 20 nov. 2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ART_PLACES, artPlaceOf, findArtPlaces, venuesNear } from '../js/art.js';
import { arrAt } from '../js/explore.js';

const of = (place) => artPlaceOf({ place })?.name ?? null;
const arr = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url)));
const scenes = ART_PLACES.filter((p) => p.kind === 'scene');

test('théâtre et danse : les noms de l\'agenda trouvent la bonne scène', () => {
  const cas = {
    'Chaillot - Théâtre national de la Danse': 'Chaillot – Théâtre national de la Danse',
    'Théâtre National de la Danse Chaillot': 'Chaillot – Théâtre national de la Danse',
    'Théâtre de la Ville – Sarah Bernhardt': 'Théâtre de la Ville – Sarah Bernhardt',
    'Théâtre de la Ville - Sarah Bernhardt': 'Théâtre de la Ville – Sarah Bernhardt',
    'Théâtre de la Ville': 'Théâtre de la Ville – Sarah Bernhardt',
    'Théâtre de la Ville - Abbesses': 'Théâtre de la Ville – Les Abbesses',
    'Théâtre de la Ville - Les Abbesses': 'Théâtre de la Ville – Les Abbesses',
    'La Colline - théâtre national': 'La Colline – théâtre national',
    'Théâtre du Rond-Point': 'Théâtre du Rond-Point',
    'Le CENTQUATRE-PARIS (104)': 'Le Centquatre (104)',
  };
  for (const [place, name] of Object.entries(cas)) assert.equal(of(place), name, place);
});

test('théâtre et danse : les lieux voisins ne sont pas pris pour elles', () => {
  for (const place of ['Métro Abbesses', 'Sortie du métro Abbesses', 'Studios de Danse des Abbesses', 'Théâtre de la Manufacture des Abbesses',
    'Musée National de la Marine / Palais de Chaillot', 'Bibliothèque historique de la Ville de Paris (BHVP)', 'Petit Palais - Musée des beaux-arts de la Ville de Paris',
    'Théâtre de la Bastille', 'Théâtre Paris-Villette']) assert.notEqual(ART_PLACES.find((p) => p.name === of(place))?.kind, 'scene', place);
  assert.equal(of('Maison de la Radio et de la musique - Studio 104'), 'Maison de la Radio et de la Musique');
  assert.equal(of('Théâtre du Châtelet'), 'Théâtre du Châtelet', 'le Châtelet reste dans Musique');
});

test('théâtre et danse : 6 scènes, chacune dans l\'arrondissement de son adresse, avec son site', () => {
  assert.equal(scenes.length, 6);
  for (const p of scenes) {
    assert.ok(/^https:\/\//.test(p.site), p.name);
    const n = Number(/, (\d+)e$/.exec(p.address)?.[1]);
    assert.ok(n >= 1 && n <= 20, `arrondissement lisible : ${p.address}`);
    assert.equal(arrAt(p.lat, p.lng, arr), n, `${p.name}, ${p.address}`);
  }
  assert.deepEqual(findArtPlaces('chaillot').map((p) => p.name), ['Chaillot – Théâtre national de la Danse']);
  assert.deepEqual(findArtPlaces('abbesses').map((p) => p.name), ['Théâtre de la Ville – Les Abbesses']);
  assert.deepEqual(findArtPlaces('104').map((p) => p.name), ['Le Centquatre (104)']);
});

test('théâtre et danse : ces scènes sortent de « Salles près de toi » (déjà dans Grands lieux)', () => {
  const ev = (place, lat, lng) => ({ title: `Spectacle ${place}`, place, lat, lng, tags: ['Théâtre'] });
  const near = venuesNear([ev('Théâtre de la Ville - Les Abbesses', 48.8848, 2.3374), ev('Théâtre de la Manufacture des Abbesses', 48.8851, 2.3380)],
    { lat: 48.8848, lng: 2.3374 }, 3000, { isShow: () => true });
  assert.deepEqual(near.map((v) => v.name ?? v.place), ['Théâtre de la Manufacture des Abbesses']);
});
