// v401 (mes choix 1A 2A 3A du 24 nov.) : « Toute la rue » dans Une rue d'intérêt, mesurée sur le vrai plan des rues (data/rues.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPlan, snap, wholeStreet, WHOLE_MAX_M } from '../js/rues.js';
import { distanceM } from '../js/geo.js';

const P = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));
const KY = 111_320;
/** Une étape posée au milieu d'un tronçon de cette rue, dans Paris (comme un doigt sur la rue). */
function on(name) {
  const k = P.names.indexOf(name) + 1; assert.ok(k, `${name} absente du plan`);
  for (let i = 0; i < P.E; i++) if (P.ek[i] === k) {
    const lat = (P.lat[P.ea[i]] + P.lat[P.eb[i]]) / 2; const lng = (P.lng[P.ea[i]] + P.lng[P.eb[i]]) / 2;
    if (lat < 48.815 || lat > 48.905 || lng < 2.25 || lng > 2.42) continue;
    const s = snap(P, { lat, lng }); if (s?.name === name) return s;
  }
  throw new Error(`pas d'étape sur ${name}`);
}
const lineLen = (line) => line.slice(1).reduce((m, p, i) => m + distanceM({ lat: line[i][0], lng: line[i][1] }, { lat: p[0], lng: p[1] }), 0);

test('rue Mouffetard : toute la rue, d\'un bout à l\'autre, un seul trait', () => {
  const w = wholeStreet(P, on('Rue Mouffetard'));
  assert.ok(w, 'un bouton');
  assert.ok(w.r.m > 550 && w.r.m < 720, `longueur ${w.r.m}`);
  assert.deepEqual(w.r.names, ['Rue Mouffetard']); // pas les rues qui la croisent
  assert.equal(w.a.name, 'Rue Mouffetard'); assert.equal(w.b.name, 'Rue Mouffetard');
  // un seul trait : sa longueur est celle d'un bout à l'autre (pas les trottoirs ni les deux chaussées en double)
  const span = distanceM(w.a, w.b);
  assert.ok(lineLen(w.r.line) < span * 1.15, `trait ${Math.round(lineLen(w.r.line))} m pour ${Math.round(span)} m`);
  assert.ok(w.r.line.length <= 400);
});

test('une rue courte et une rue coupée par un boulevard sont prises en entier', () => {
  const d = wholeStreet(P, on('Rue Dénoyez'));
  assert.ok(d && d.r.m > 120 && d.r.m < 260, `Dénoyez ${d?.r.m}`);
  const m = wholeStreet(P, on('Rue des Martyrs')); // traverse le boulevard de Clichy : un carrefour ne coupe pas la rue
  assert.ok(m && m.r.m > 800, `Martyrs ${m?.r.m}`);
});

test('pas de bouton quand la rue dépasse 1,5 km (mon choix 2A)', () => {
  assert.equal(WHOLE_MAX_M, 1500);
  assert.equal(wholeStreet(P, on('Avenue des Champs-Élysées')), null);
  assert.equal(wholeStreet(P, on('Rue de Rivoli')), null);
});

test('pas de bouton quand la rue continue plus loin (mon choix 3A) : on ne promet pas « toute la rue »', () => {
  assert.equal(wholeStreet(P, on('Rue du Faubourg Saint-Denis')), null);
});

test('pas de bouton sans nom de rue, ni sans plan', () => {
  assert.equal(wholeStreet(P, { ...on('Rue Mouffetard'), name: '' }), null);
  assert.equal(wholeStreet(null, on('Rue Mouffetard')), null);
});

test('l\'écran : le bouton sous « Recommencer », seulement après le début, et effacé par Recommencer et la fin', () => {
  const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const f = src.slice(src.indexOf('function showRue()'), src.indexOf('function rueTap('));
  assert.ok(f.indexOf("'Recommencer'") < f.indexOf('Toute la rue ·'), 'sous Recommencer');
  assert.match(f, /t\.whole \? el\('button'/);
  assert.match(src, /a: s, b: null, r: null, whole: wholeStreet\(streets, s\)/);
  assert.match(src, /b: s, r, whole: null \}/);
  assert.match(f, /r: null, whole: null \}; showRue\(\); \} \}, ico\('rotate-ccw'\)/);
  assert.ok(KY);
});
