import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { artPlaceForPoint, followedVenueOf, ART_PLACES } from '../js/art.js';

// v519 (mes choix 1A 2A 3A du 25 nov.) : « Au programme » sur la fiche d'un de mes lieux
const gp = ART_PLACES.find((p) => p.name === 'Grand Palais');

test('programme : le Grand Palais de mes lieux (même nom, même place) est le grand lieu', () => {
  assert.equal(artPlaceForPoint({ name: 'Grand Palais', lat: gp.lat, lng: gp.lng })?.name, 'Grand Palais');
  assert.equal(artPlaceForPoint({ name: 'Le Grand Palais', lat: gp.lat + 0.0005, lng: gp.lng })?.name, 'Grand Palais'); // ≈ 55 m
});

test('programme : jamais par la seule distance, jamais par le seul nom', () => {
  assert.equal(artPlaceForPoint({ name: 'Pont Alexandre-III', lat: gp.lat, lng: gp.lng }), null);
  assert.equal(artPlaceForPoint({ name: 'Petit Palais', lat: gp.lat, lng: gp.lng })?.name, 'Petit Palais'); // son voisin garde son nom
  assert.equal(artPlaceForPoint({ name: 'Grand Palais', lat: 48.8566, lng: 2.3522 }), null); // Hôtel de Ville, à plus de 150 m
  assert.equal(artPlaceForPoint({ name: '', lat: gp.lat, lng: gp.lng }), null);
  assert.equal(artPlaceForPoint({ name: 'Grand Palais' }), null);
});

test('programme : le Théâtre de la Ville aux Abbesses n\'est pas celui du Châtelet', () => {
  const abb = ART_PLACES.find((p) => p.name === 'Théâtre de la Ville – Les Abbesses');
  assert.equal(artPlaceForPoint({ name: 'Théâtre de la Ville – Les Abbesses', lat: abb.lat, lng: abb.lng })?.name, abb.name);
});

test('programme : une salle suivie, au même nom (accents et majuscules ignorés)', () => {
  assert.equal(followedVenueOf({ name: 'le baiser salé' }, ['Le Baiser Salé']), 'Le Baiser Salé');
  assert.equal(followedVenueOf({ name: 'Baiser' }, ['Le Baiser Salé']), '');
  assert.equal(followedVenueOf({ name: 'Le Baiser Salé' }, []), '');
});

test('programme : la ligne est en bas de Pratique, ne télécharge rien et ne dit jamais « rien cette semaine »', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /uberRow\(p\),\s*\n\s*programmeRow\(p, /);
  const fn = app.slice(app.indexOf('function programmeRow('), app.indexOf('/** Arrondissement lu'));
  assert.ok(fn.length > 50 && !/weekEvents\(|rien cette semaine/.test(fn.replace(/\s*\*.*\n/g, '')));
});
