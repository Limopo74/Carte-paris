import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSlotText } from '../js/events.js';

// v191 : Mes salles, Grands lieux, Mes artistes : un concert dit son prochain créneau (plus « Dernier jour »)
const now = new Date(2026, 10, 18, 14, 0); // mercredi 18 nov. 2026, 14 h
const slot = (d, h1, m1, h2, m2) => ({ start: new Date(2026, 10, d, h1, m1), end: new Date(2026, 10, d, h2, m2) });

test('prochain créneau : aujourd\'hui, en cours, demain, un autre jour', () => {
  assert.equal(nextSlotText({ slots: [slot(18, 19, 0, 21, 0)] }, now), 'Aujourd\'hui à 19h');
  assert.equal(nextSlotText({ slots: [slot(18, 10, 0, 15, 30)] }, now), 'Jusqu\'à 15h30');
  assert.equal(nextSlotText({ slots: [slot(19, 20, 30, 22, 0)] }, now), 'Demain à 20h30');
  assert.equal(nextSlotText({ slots: [slot(21, 20, 0, 22, 0)] }, now), 'Samedi 21 nov. à 20h');
});

test('prochain créneau : le plus proche à venir, les créneaux finis ignorés', () => {
  assert.equal(nextSlotText({ slots: [slot(21, 20, 0, 22, 0), slot(18, 9, 0, 12, 0), slot(19, 20, 0, 22, 0)] }, now), 'Demain à 20h');
});

test('prochain créneau : journée entière sans heure, rien sans créneau', () => {
  assert.equal(nextSlotText({ slots: [slot(20, 0, 0, 23, 59)] }, now), 'Vendredi 20 nov.');
  assert.equal(nextSlotText({ slots: [] }, now), '');
  assert.equal(nextSlotText({}, now), '');
  assert.equal(nextSlotText({ slots: [slot(18, 9, 0, 12, 0)] }, now), '');
});

test('prochain créneau : commencé hier soir, fini après minuit', () => {
  const late = new Date(2026, 10, 19, 0, 30);
  assert.equal(nextSlotText({ slots: [{ start: new Date(2026, 10, 18, 22, 0), end: new Date(2026, 10, 19, 2, 0) }] }, late), 'Jusqu\'à 2h');
  assert.equal(nextSlotText({ slots: [{ start: new Date(2026, 10, 18, 22, 0), end: new Date(2026, 10, 19, 2, 0) }] }, new Date(2026, 10, 18, 23, 0)), 'En cours');
});
