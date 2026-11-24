// Stations proches d'un lieu (v393, mes choix 1A 2A 3A 4A du 24 nov. 2026) : la case Métro de la fiche ouvre les 3 stations
// les plus proches du lieu et le temps pour rentrer jusqu'à ma station Maison ; « Le plus rapide » seulement avec 3 min d'avance
// (aussi dans Rentrer, mes choix 1A 2A du 24 nov.).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clearFastest, CLEAR_LEAD_MIN, metroPlan } from '../js/metroplan.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const { stations } = JSON.parse(readFileSync(new URL('../data/stations.json', import.meta.url), 'utf8'));
const st = (n) => stations.find((s) => s.n === n);
const opt = (name, minutes, extra = {}) => ({ st: { n: name }, plan: { type: 'direct', minutes, ...extra } });

test('clearFastest : « Le plus rapide » seulement avec 3 min d\'avance sur chaque autre station qui a un trajet', () => {
  assert.equal(CLEAR_LEAD_MIN, 3);
  const a = opt('A', 20), b = opt('B', 23), c = opt('C', 30);
  assert.equal(clearFastest([a, b, c], null, 99), a, '3 min d\'avance : marquée');
  assert.equal(clearFastest([a, opt('B', 22), c], null, 99), null, '2 min : on ne départage pas');
  assert.equal(clearFastest([a, opt('B', 21, { noMetro: 'route' }), opt('C', 18, { type: 'walk' })], null, 99), a, 'les stations sans trajet en métro ne comptent pas');
  assert.equal(clearFastest([a], null, 99), a, 'seule à avoir un trajet');
  const home = { n: 'Maison' };
  assert.equal(clearFastest([a, b, { st: home, plan: { type: 'walk', minutes: 5 } }], home, 15), null, 'ma station Maison est à côté et la marche bat le métro');
});

test('depuis la rue Saulnier vers Nation : Grands Boulevards (ligne 9 directe) est marquée, pas Cadet, la plus proche', () => {
  const place = { lat: 48.87455, lng: 2.3447 };
  const home = st('Nation');
  const opts = ['Cadet', 'Grands Boulevards', 'Le Peletier'].map((n) => ({ st: st(n), plan: metroPlan(stations, place, home, 3, st(n)) }));
  assert.equal(clearFastest(opts, home, 60)?.st.n, 'Grands Boulevards');
});

test('la case Métro de la fiche (et de la fiche TTB) ouvre Stations proches ; « › » pour une page', () => {
  assert.match(app, /function metroCell\(metro, sub, onOpen\)/);
  assert.equal((app.match(/metroCell\(metro, (?!sub)/g) ?? []).length, 2, 'fiche d\'un lieu et fiche TTB');
  assert.match(app, /class: 'fiche-metro', onclick: onOpen/);
  assert.match(app, /'chev', 'aria-hidden': 'true' }, ' ›'/);
  assert.match(css, /\.fiche-cols > \.fiche-metro \{[^}]*min-height: 48px[^}]*border: 0/);
});

test('Stations proches part du lieu, jamais de ma position, et la marque passe par clearFastest (aussi dans Rentrer)', () => {
  const body = app.slice(app.indexOf('async function openPlaceStations'), app.indexOf('function pickMyStation('));
  assert.ok(body.length > 500);
  assert.match(body, /nearestStations\(stations, place, 3\)/);
  assert.match(body, /metroPlan\(stations, place, dest, 3, st\)/);
  assert.doesNotMatch(body, /locate\(|freshHere\(|\bhere\b|startPos\(/, 'aucune position demandée');
  assert.match(body, /clearFastest\(opts, home\.st, walk\)/);
  assert.match(body, /renderMetroPlan\(dest, place, self, o\.st, place\)/);
  assert.match(body, /pickMyStation\(false, self\)/, 'sans Maison : la choisir puis revenir');
  assert.match(app, /const lead = clearFastest\(opts, home\.st, walk\);[^\n]*\n[\s\S]{0,4000}o === lead && opts\.length > 1/, 'Rentrer');
  assert.doesNotMatch(app, /o === best && opts\.length > 1/);
});

test('un trajet qui part d\'un lieu : pas de rond « moi » à cet endroit, Google Maps part du lieu', () => {
  assert.match(app, /if \(!following && !fromPlace\) meMarker\(from\.lat, from\.lng\)/);
  assert.match(app, /fromPlace \? `&origin=\$\{fromPlace\.lat\},\$\{fromPlace\.lng\}` : ''/);
});

// v394 (mes choix 1A 2A du 24 nov.) : la page Métro d'un lieu (l'aller, depuis ma position) montre aussi les 3 stations les plus
// proches de moi, avec le temps jusqu'au lieu ; « Le plus rapide » avec la même règle des 3 min.
test('page Métro : « Autres stations près de toi » sous les boutons, seulement pour l\'aller depuis ma position', () => {
  const body = app.slice(app.indexOf('function otherStartsBlock'), app.indexOf('function renderMetroPlan('));
  assert.match(body, /nearestStations\(stations, from, 3\)\.filter\(\(x\) => x\.d <= 1500\)/);
  assert.match(body, /metroPlan\(stations, from, p, 3, st\)/);
  assert.match(body, /clearFastest\(opts, null, Infinity\)/);
  assert.match(body, /'Autres stations près de toi'/);
  assert.match(body, /renderMetroPlan\(p, from, self, o\.st\)/);
  // pas dans Rentrer ni Stations proches (station imposée ou départ d'un lieu), ni quand la marche ou aucun métro
  assert.match(app, /\.\.\.\(start \|\| fromPlace \|\| onFoot \|\| none \? \[\] : otherStartsBlock\(p, from, back\)\),\n\s+back \? backBtn\(back\) : null,/);
});

test('clearFastest sans station Maison : la plus rapide des stations proches de moi, avec 3 min d\'avance', () => {
  const from = { lat: 48.8707, lng: 2.3488 }; // près de Bonne Nouvelle
  const to = st('Nation');
  const opts = ['Bonne Nouvelle', 'Strasbourg—Saint-Denis', 'Sentier'].map((n) => ({ st: st(n), plan: metroPlan(stations, from, to, 3, st(n)) }));
  const best = clearFastest(opts, null, Infinity);
  const sorted = opts.map((o) => o.plan.minutes).sort((a, b) => a - b);
  assert.equal(best === null, sorted[1] - sorted[0] < 3);
});
