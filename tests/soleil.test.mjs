import test from 'node:test';
import assert from 'node:assert/strict';
import { sunsetMin, sunText, nightNote } from '../js/soleil.js';

// Repères habituels de Paris, à quelques minutes près (pas relus sur une source le 18 nov. 2026 : le test vérifie surtout que la formule ne dérive pas).
const paris = (y, m, d, h = 12, mn = 0) => new Date(y, m - 1, d, h, mn);
const off = (date) => -date.getTimezoneOffset(); // minutes d'avance sur UTC du poste qui lance le test
const utc = (date) => sunsetMin(date) - off(date);

test('coucher du soleil à Paris : les repères de l\'année, en temps universel', () => {
  const near = (date, hUtc, mUtc) => assert.ok(Math.abs(utc(date) - (hUtc * 60 + mUtc)) <= 4, `${date.toDateString()} : ${utc(date)}`);
  near(paris(2026, 11, 18), 16, 8);  // 17 h 08 à Paris
  near(paris(2026, 12, 21), 15, 56); // 16 h 56
  near(paris(2026, 6, 21), 19, 58);  // 21 h 58
  near(paris(2026, 3, 20), 18, 3);   // 19 h 03
});

test('nightNote : seulement quand la balade commence de jour et finit de nuit', () => {
  const d = paris(2026, 11, 18);
  const set = sunsetMin(d);
  const at = (min) => new Date(2026, 10, 18, Math.floor(min / 60), min % 60);
  assert.equal(nightNote(60, at(set - 180)), '', 'finie bien avant');
  assert.match(nightNote(100, at(set - 60)), /^Le soleil se couche à \d+ h \d\d : parti maintenant, tu finirais de nuit\.$/);
  assert.equal(nightNote(100, at(set + 5)), '', 'déjà nuit : on le voit');
  assert.equal(nightNote(60, at(set - 60)), '', 'finit pile au coucher');
  assert.equal(nightNote(0, at(set - 10)), '');
  assert.equal(sunText(17 * 60 + 8), '17 h 08');
});
