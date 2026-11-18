import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metroPlan } from '../js/metroplan.js';

// Petit réseau de test (positions réelles approximatives)
const S = {
  pyramides: { n: 'Pyramides', l: ['7', '14'], lat: 48.8657, lng: 2.3346 },
  opera: { n: 'Opéra', l: ['3', '7', '8'], lat: 48.8712, lng: 2.3310 },
  chatelet: { n: 'Châtelet', l: ['1', '4', '7', '11', '14'], lat: 48.8584, lng: 2.3473 },
  bastille: { n: 'Bastille', l: ['1', '5', '8'], lat: 48.8531, lng: 2.3691 },
  gareEst: { n: 'Gare de l\'Est', l: ['4', '5', '7'], lat: 48.8762, lng: 2.3582 },
  nation: { n: 'Nation', l: ['1', '2', '6', '9'], lat: 48.8483, lng: 2.3959 },
  laDefense: { n: 'La Défense', l: ['1'], lat: 48.8919, lng: 2.2380 },
  porteMaillot: { n: 'Porte Maillot', l: ['1'], lat: 48.8781, lng: 2.2825 },
  republique: { n: 'République', l: ['3', '5', '8', '9', '11'], lat: 48.8675, lng: 2.3637 },
};
const stations = Object.values(S);

test('tout près : à pied', () => {
  const r = metroPlan(stations, { lat: 48.8660, lng: 2.3340 }, { lat: 48.8700, lng: 2.3320 });
  assert.equal(r.type, 'walk');
});

test('ligne directe quand elle existe', () => {
  // de Pyramides à Porte Maillot par la 1 ? Non : depuis Châtelet vers La Défense, ligne 1 directe
  const r = metroPlan(stations, { lat: 48.8586, lng: 2.3470 }, { lat: 48.8917, lng: 2.2385 });
  assert.equal(r.type, 'direct');
  assert.equal(r.line, '1');
  assert.equal(r.start.n, 'Châtelet');
  assert.equal(r.end.n, 'La Défense');
  assert.ok(r.minutes > 10 && r.minutes < 40, String(r.minutes));
});

test('avec une correspondance', () => {
  // près de Pyramides (7, 14) vers près de Nation (1, 2, 6, 9) : correspondance à Châtelet (7 → 1) ou ailleurs
  const r = metroPlan(stations, { lat: 48.8657, lng: 2.3346 }, { lat: 48.8483, lng: 2.3959 });
  assert.equal(r.type, 'transfer');
  assert.ok(['7', '14'].includes(r.line1));
  assert.ok(['1', '2', '6', '9'].includes(r.line2));
  assert.ok(r.via.l.includes(r.line1) && r.via.l.includes(r.line2));
});

test('aucune station proche : à pied', () => {
  const r = metroPlan([], { lat: 48.86, lng: 2.33 }, { lat: 48.88, lng: 2.37 });
  assert.equal(r.type, 'walk');
});

test('RER entre stations du métro, départ imposé, stations les plus proches', async () => {
  const { metroPlan, lineName, linesOf } = await import('../js/metroplan.js');
  const A = { n: 'Châtelet', l: ['1'], rer: ['A'], lat: 48.8587, lng: 2.3474 };
  const B = { n: 'Nation', l: ['2'], rer: ['A'], lat: 48.8483, lng: 2.3959 };
  const C = { n: 'Hôtel de Ville', l: ['1'], lat: 48.8573, lng: 2.3519 };
  const st = [A, B, C];
  assert.deepEqual(linesOf(A), ['1', 'RER A']);
  assert.equal(lineName('RER A'), 'le RER A');
  assert.equal(lineName('4'), 'la ligne 4');
  const plan = metroPlan(st, { lat: 48.8588, lng: 2.3476 }, { lat: 48.8484, lng: 2.3961 });
  assert.equal(plan.type, 'direct');
  assert.equal(plan.line, 'RER A');
  // départ imposé : Hôtel de Ville, même si Châtelet serait meilleur → correspondance ou ligne 1
  const fixed = metroPlan(st, { lat: 48.8574, lng: 2.352 }, { lat: 48.8484, lng: 2.3961 }, 3, C);
  assert.equal(fixed.start.n, 'Hôtel de Ville');
});

// v211 : « À pied, c'est le plus simple » ne se dit que quand la marche a vraiment été comparée au métro, ou que le lieu est tout près.
test('aucune station près de moi et lieu loin : pas de métro trouvé, raison « from »', () => {
  const r = metroPlan(stations, { lat: 48.70, lng: 2.10 }, { lat: 48.8586, lng: 2.3470 });
  assert.equal(r.type, 'walk');
  assert.equal(r.noMetro, 'from');
});

test('aucune station près du lieu et lieu loin : raison « to »', () => {
  const r = metroPlan(stations, { lat: 48.8586, lng: 2.3470 }, { lat: 48.70, lng: 2.10 });
  assert.equal(r.type, 'walk');
  assert.equal(r.noMetro, 'to');
});

test('des stations des deux côtés mais ni ligne directe ni correspondance unique : raison « route »', () => {
  const X = { n: 'X', l: ['3bis'], lat: 48.8700, lng: 2.4050 };
  const Y = { n: 'Y', l: ['7bis'], lat: 48.8800, lng: 2.3000 };
  const r = metroPlan([X, Y], { lat: 48.8701, lng: 2.4051 }, { lat: 48.8801, lng: 2.3001 });
  assert.equal(r.type, 'walk');
  assert.equal(r.noMetro, 'route');
});

test('pas de métro trouvé mais lieu à moins de 1 km : à pied, sans réserve', () => {
  const r = metroPlan([], { lat: 48.8600, lng: 2.3300 }, { lat: 48.8640, lng: 2.3330 });
  assert.equal(r.type, 'walk');
  assert.equal(r.noMetro, undefined);
});

test('marche comparée au métro et plus rapide : à pied, sans réserve', () => {
  const r = metroPlan(stations, { lat: 48.8660, lng: 2.3340 }, { lat: 48.8700, lng: 2.3320 });
  assert.equal(r.type, 'walk');
  assert.equal(r.noMetro, undefined);
});

test('départ imposé sans trajet trouvé : raison « route »', () => {
  const X = { n: 'X', l: ['3bis'], lat: 48.8700, lng: 2.4050 };
  const Y = { n: 'Y', l: ['7bis'], lat: 48.8800, lng: 2.3000 };
  const r = metroPlan([X, Y], { lat: 48.8701, lng: 2.4051 }, { lat: 48.8801, lng: 2.3001 }, 3, X);
  assert.equal(r.noMetro, 'route');
});

test('texte de la page quand aucun métro n\'est trouvé', async () => {
  const { noMetroText } = await import('../js/metroplan.js');
  assert.match(noMetroText({ noMetro: 'from' }), /Aucune station de métro à moins de 1,2 km de toi/);
  assert.match(noMetroText({ noMetro: 'to' }), /Aucune station de métro à moins de 1,2 km de ce lieu/);
  assert.match(noMetroText({ noMetro: 'route' }), /plus d'une correspondance/);
  assert.match(noMetroText({ noMetro: 'route' }, { n: 'Blanche' }), /^Depuis Ⓜ Blanche/);
  assert.equal(noMetroText({ type: 'walk', minutes: 5 }), '');
});
