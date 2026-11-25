// v498 (ma demande du 25 nov.) : au-delà de 60 min, une durée s'écrit en heures, partout dans l'appli.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { durText, walkLabel, walkWhen, walkMinutes } from '../js/geo.js';
import { tuningText } from '../js/reglages.js';
import { vueSub, VUES } from '../js/vues.js';

test('durText : minutes sous une heure, heures dès 60 min, à la minute près', () => {
  assert.equal(durText(1), '1 min');
  assert.equal(durText(59), '59 min');
  assert.equal(durText(60), '1 h');
  assert.equal(durText(61), '1 h 01');
  assert.equal(durText(78), '1 h 18');
  assert.equal(durText(117), '1 h 57');
  assert.equal(durText(120), '2 h');
  assert.equal(durText(166), '2 h 46');
});

test('les écrans qui m\'ont montré « 117 min » écrivent des heures', () => {
  assert.match(vueSub(VUES[0], 117, new Date('2026-11-25')), /^1\sh\s57/);
  assert.equal(tuningText('leaveMin', 60), '1 h');
  assert.equal(tuningText('leaveMin', 20), '20 min');
  assert.match(walkLabel(8000), /≈ \d h \d\d à pied|≈ \d h à pied/);
});

// Permis : durText lui-même (v, n), minText des circuits et le chrono de Mon pas (mn, déjà en heures au-delà de 60 min).
test('aucun « ${…} min » brut dans le code : chaque durée passe par durText', () => {
  const bad = [];
  for (const f of readdirSync('js').filter((n) => n.endsWith('.js'))) {
    readFileSync(`js/${f}`, 'utf8').split('\n').forEach((line, i) => {
      if (/\$\{[^}]*\}(?: |\u00a0|\u202f|\\u00a0)min\b/.test(line.replace(/\$\{(?:v|n|mn)\} min/g, ''))) bad.push(`js/${f}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, []);
});

// v499 (ma demande du 25 nov.) : au-delà de 1 km, la distance et la durée.
test('walkWhen : la durée seule jusqu\'à 1 km, puis « distance · durée »', () => {
  assert.equal(walkWhen(500), durText(walkMinutes(500)));
  assert.equal(walkWhen(999), durText(walkMinutes(999)));
  assert.equal(walkWhen(1000), `1,0 km · ${durText(walkMinutes(1000))}`);
  assert.match(walkWhen(9100), /^9,1 km · \d h \d\d$/);
  assert.match(walkWhen(12400), /^12 km · \d h \d\d$/);
  assert.ok(!walkWhen(9100, true).includes(' h '), 'insécables dans chaque morceau');
  assert.match(walkWhen(9100, true), / · /, 'le point reste coupable');
});
test('Points de vue : distance et durée dans la petite ligne au-delà de 1 km', () => {
  assert.match(vueSub(VUES[0], walkWhen(9100, true), new Date('2026-11-25')), /^9,1\u00a0km · \d\u00a0h\u00a0\d\d · /);
});
