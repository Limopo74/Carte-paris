// Circuits de visite (v166) : données de l'appli et calculs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanCircuits, decodeTrace, circuitTimes, durationClass, minText, kmText, circuitsFor, distanceToTrace, pointsNearTrace, circuitOutingId, circuitDone, CIRCUIT_THEMES, STOP_MIN } from '../js/circuits.js';
import { setWalkSpeed, distanceM } from '../js/geo.js';
import { cleanOutings } from '../js/planning.js';

const raw = JSON.parse(readFileSync(new URL('../data/circuits.json', import.meta.url)));
const list = cleanCircuits(raw);

test('circuits : tous lisibles, d\'un métro à l\'autre, avec un tracé qui passe par chaque étape', () => {
  assert.equal(list.length, raw.items.length, 'aucun circuit écarté au nettoyage');
  assert.ok(list.length >= 6);
  for (const c of list) {
    assert.ok(c.etapes[0].m && c.etapes.at(-1).m, `${c.id} : départ et arrivée à une station`);
    assert.ok(c.themes.length, `${c.id} : un thème au moins`);
    assert.ok(c.confort, `${c.id} : le confort est toujours dit (escaliers, pentes ou « plat »)`);
    for (const e of c.etapes) {
      assert.ok(distanceToTrace(e, c.trace) < 60, `${c.id} : le tracé passe près de « ${e.n} »`);
      assert.ok(e.t && e.t.length <= 200, `${c.id} : « ${e.n} » a un texte court`);
      if (!e.m) assert.ok(!/\b\d{1,2}\s?h\s?\d{0,2}\b/.test(e.t) || /fermé le/.test(e.t), `${c.id} : pas d'horaire dans « ${e.n} » (une heure peut changer)`);
    }
    // Longueur du tracé = longueur annoncée (à 2 % près)
    let L = 0;
    for (let i = 0; i < c.trace.length - 1; i++) L += distanceM({ lat: c.trace[i][0], lng: c.trace[i][1] }, { lat: c.trace[i + 1][0], lng: c.trace[i + 1][1] });
    assert.ok(Math.abs(L - c.m) / c.m < 0.02, `${c.id} : ${Math.round(L)} m tracés pour ${c.m} m annoncés`);
  }
});

test('circuits : sources en https, une source pour chaque étape qui avance un fait daté', () => {
  for (const c of list) for (const e of c.etapes) {
    if (e.s) assert.match(e.s, /^https:\/\//);
    if (/\b1[0-9]{3}\b|XV|XI|XX/.test(e.t) && !e.m) assert.ok(e.s, `${c.id} : « ${e.n} » cite une date sans source`);
  }
});

test('tracé : décodage du format polyline, illisible ou hors de Paris = rien', () => {
  assert.deepEqual(decodeTrace('_p~iF~ps|U'), [], 'un point hors de Paris est refusé');
  assert.deepEqual(decodeTrace('e`eiH'), [], 'texte coupé');
  assert.deepEqual(decodeTrace(42), []);
  const t = decodeTrace('e`eiHmblM@I');
  assert.deepEqual(t[0], [48.85523, 2.36087]);
  assert.equal(t.length, 2);
});

test('nettoyage : un circuit sans station au bout, sans tracé ou doublon est écarté', () => {
  const c = raw.items[0];
  assert.equal(cleanCircuits({ items: [c, c] }).length, 1, 'doublon');
  assert.equal(cleanCircuits({ items: [{ ...c, trace: 'xx' }] }).length, 0, 'tracé illisible');
  assert.equal(cleanCircuits({ items: [{ ...c, etapes: c.etapes.map((e) => ({ ...e, m: false })) }] }).length, 0, 'pas de station');
  assert.equal(cleanCircuits({ items: [{ ...c, id: 'A B' }] }).length, 0, 'identifiant');
  assert.equal(cleanCircuits({ items: [{ ...c, etapes: [{ ...c.etapes[0], s: 'javascript:alert(1)' }, ...c.etapes.slice(1)] }] })[0].etapes[0].s, undefined, 'lien non https retiré');
  assert.deepEqual(cleanCircuits(null), []);
});

test('durées : la marche suit mon pas, 4 min par étape à regarder, classe de durée', () => {
  const c = { m: 3000, etapes: [{ m: true }, {}, {}, {}, { m: true }] };
  setWalkSpeed(5);
  assert.deepEqual(circuitTimes(c), { walk: 36, total: 36 + 3 * STOP_MIN });
  setWalkSpeed(3.5);
  assert.equal(circuitTimes(c).walk, 51);
  setWalkSpeed(5);
  assert.equal(durationClass(45), 'court');
  assert.equal(durationClass(46), 'heure');
  assert.equal(durationClass(75), 'heure');
  assert.equal(durationClass(76), 'long');
  assert.equal(minText(63), '1 h 05');
  assert.equal(minText(60), '1 h');
  assert.equal(minText(33), '35 min');
  assert.equal(minText(1), '5 min');
  assert.equal(kmText(2896), '2,9 km');
  assert.equal(kmText(3047), '3 km');
  assert.equal(kmText(840), '800 m');
});

test('liste : puces Thème et Durée, la plus proche d\'abord', () => {
  setWalkSpeed(5);
  const art = circuitsFor(list, { theme: 'art' });
  assert.ok(art.length && art.every((c) => c.themes.includes('art')));
  assert.deepEqual(circuitsFor(list, { theme: 'passages' }).map((c) => c.id), ['passages']);
  const fromAbbesses = circuitsFor(list, {}, { lat: 48.88485, lng: 2.33869 });
  assert.equal(fromAbbesses[0].id, 'montmartre');
  assert.equal(circuitsFor(list, { dur: 'heure' }).length + circuitsFor(list, { dur: 'court' }).length + circuitsFor(list, { dur: 'long' }).length, list.length);
  assert.ok(CIRCUIT_THEMES.every(([k]) => list.some((c) => c.themes.includes(k))), 'chaque puce de thème a au moins un circuit');
});

test('mes lieux près du tracé : à 2 min au plus, du plus proche au plus loin', () => {
  const trace = [[48.85, 2.35], [48.85, 2.36]];
  const near = { id: 'a', lat: 48.8505, lng: 2.355 }; // ≈ 56 m au nord du tracé
  const far = { id: 'b', lat: 48.853, lng: 2.355 };
  assert.ok(Math.abs(distanceToTrace(near, trace) - 55.6) < 2);
  assert.deepEqual(pointsNearTrace([far, near], trace, 128).map((x) => x.p.id), ['a']);
  assert.ok(distanceToTrace({ lat: 48.85, lng: 2.37 }, trace) > 700, 'au-delà du bout du tracé : distance au bout');
});

test('« Je l\'ai fait » : une ligne de Mon journal qui garde son identifiant', () => {
  const id = circuitOutingId('montmartre', Date.UTC(2026, 10, 18, 15));
  assert.match(id, /^circuit-montmartre-[a-z0-9]+$/);
  const outings = cleanOutings([{ id, at: Date.UTC(2026, 10, 18, 15), name: 'Circuit Montmartre', lat: 48.889, lng: 2.338, place: 'Abbesses → Lamarck-Caulaincourt' }]);
  assert.equal(outings.length, 1, 'le carnet accepte la ligne');
  assert.equal(circuitDone(outings, 'montmartre').length, 1);
  assert.equal(circuitDone(outings, 'marais').length, 0);
  assert.deepEqual(circuitDone(null, 'x'), []);
});
