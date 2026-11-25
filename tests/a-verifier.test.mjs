// v467 (mes choix du 25 nov.) : « À mettre à jour sur place » — les 5 plus proches, une tombe au plus, trié sur le téléphone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickChecks, pointCheck, hoursOld, checkWhat, CHECK_MAX } from '../js/a-verifier.js';
import { distanceM } from '../js/geo.js';

const here = { lat: 48.8566, lng: 2.3522 };
const at = (kind, name, dLat) => ({ kind, key: name, name, lat: here.lat + dLat, lng: here.lng });

test('les 5 plus proches, du plus proche au plus loin', () => {
  const c = [at('venue', 'E', 0.005), at('stale', 'A', 0.001), at('vue', 'C', 0.003), at('hours', 'B', 0.002), at('venue', 'F', 0.006), at('venue', 'D', 0.004)];
  const r = pickChecks(c, here, distanceM);
  assert.equal(r.length, CHECK_MAX);
  assert.deepEqual(r.map((x) => x.name), ['A', 'B', 'C', 'D', 'E']);
  assert.ok(r.every((x, i) => i === 0 || x.d >= r[i - 1].d));
});

test('une tombe au plus, même quand les tombes sont les plus proches', () => {
  const c = [at('tomb', 'T1', 0.0001), at('tomb', 'T2', 0.0002), at('tomb', 'T3', 0.0003), at('venue', 'S', 0.01)];
  const r = pickChecks(c, here, distanceM);
  assert.deepEqual(r.map((x) => x.name), ['T1', 'S']);
});

test('sans position de départ : aucune étape (pas de distance inventée) ; une étape sans position est écartée', () => {
  assert.deepEqual(pickChecks([at('venue', 'S', 0.01)], null, distanceM), []);
  assert.deepEqual(pickChecks([{ kind: 'venue', name: 'X' }, at('venue', 'S', 0.01)], here, distanceM).map((x) => x.name), ['S']);
  assert.equal(pickChecks([at('venue', 'S', 0.01), at('venue', 'S', 0.01)], here, distanceM).length, 1, 'une même étape une fois');
});

test('mes lieux : a pu fermer, horaires de plus d\'un an, jamais fermé ni d\'un proche', () => {
  const now = Date.UTC(2026, 10, 25);
  const old = now - 400 * 864e5;
  const p = { lat: 48.85, lng: 2.35, hours: 'Mo-Sa 09:00-19:00', hoursAt: old };
  assert.equal(pointCheck(p, old, now), 'stale');
  assert.equal(pointCheck(p, null, now), 'hours');
  assert.equal(pointCheck({ ...p, hoursAt: now - 10 * 864e5 }, null, now), null);
  assert.equal(pointCheck({ ...p, gone: now }, old, now), null);
  assert.equal(pointCheck({ ...p, owner: 'Léa' }, old, now), null);
  assert.equal(pointCheck({ ...p, checked: now - 864e5 }, null, now), null, 'vu ouvert il y a un jour : ses horaires ne reviennent pas tout de suite');
  assert.equal(hoursOld({ hoursAt: old }, now), false, 'sans horaires, rien à revoir');
});

test('les petites lignes tiennent sur une ligne', () => {
  assert.equal(checkWhat({ kind: 'stale' }), 'Encore ouvert ?');
  assert.equal(checkWhat({ kind: 'hours' }, { hoursMonth: 'juin 2025' }), 'Horaires notés en juin 2025');
  assert.equal(checkWhat({ kind: 'tomb' }), 'Photo de la tombe');
});

test('la ligne est dans Autres réglages, sous Photos des salles, et dans la recherche des réglages', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const page = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const a = page.indexOf("row('camera', 'Photos des salles'");
  const b = page.indexOf("row('map-pinned', 'À mettre à jour sur place'");
  const c = page.indexOf("onOff('evThumbs'");
  assert.ok(a > 0 && b > a && c > b);
  assert.ok(app.includes("['map-pinned', 'À mettre à jour sur place', RA,"));
  assert.ok(readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes("'js/a-verifier.js'"));
});
