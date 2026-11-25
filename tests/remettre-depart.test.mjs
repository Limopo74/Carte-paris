// 6A (25 nov. 2026) : dans les pages de Réglages, une seule façon de dire « revenir au départ » :
// « Remettre au départ », icône ↺, bouton simple, seulement quand quelque chose a changé, juste au-dessus du retour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const section = (name) => {
  const i = app.indexOf(`if (section === '${name}')`);
  assert.ok(i > 0, name);
  return app.slice(i, app.indexOf(`name: 'settings:${name}'`, i));
};

test('plus de « Tout réafficher » ni de « Tout remettre au départ »', () => {
  assert.ok(!app.includes("'Tout réafficher'"));
  assert.ok(!app.includes("'Tout remettre au départ'"));
});

for (const name of ['distances', 'pas', 'alertes', 'fiche']) {
  test(`${name} : « Remettre au départ » avec ↺, seulement quand quelque chose a changé, juste avant le retour`, () => {
    const body = section(name);
    const i = body.indexOf("ico('rotate-ccw'), 'Remettre au départ')");
    assert.ok(i > 0, 'le bouton et son icône');
    const start = body.lastIndexOf("el('button'", i);
    assert.match(body.slice(start - 120, start), /\? null : $|hid\.size \? $/, 'affiché seulement quand quelque chose a changé');
    assert.match(body.slice(i, i + 220), /^[^]*?\n\s*backBtn,/, 'le retour juste après');
    assert.ok(!/backBtn[^]*Remettre au départ/.test(body), 'jamais sous le retour');
  });
}

test('Filtres affichés : le même bouton', () => {
  const i = app.indexOf('state.hiddenFilters = []; persist(); openFilterChoice(back);');
  assert.ok(i > 0);
  assert.ok(app.slice(i, i + 200).includes("ico('rotate-ccw'), 'Remettre au départ')"));
});

test('Alertes et bandeau : la remise couvre toute la page, et seulement elle', () => {
  const body = section('alertes');
  const i = body.indexOf('alertsAtStart() ? null');
  const reset = body.slice(i, body.indexOf("'Remettre au départ'", i));
  for (const k of ['suggestNow = true', 'vibrateNow = false', 'alertNear = true', 'voice = true', 'jardinsNow = false', 'alertM: TUNING.alertM.def', 'memoryM: TUNING.memoryM.def']) assert.ok(reset.includes(k), k);
  assert.ok(!/walkM|eventsM|textSize|theme/.test(reset), 'rien d\'une autre page');
  const f = app.slice(app.indexOf('function alertsAtStart()'), app.indexOf('function openSettings('));
  for (const k of ['suggestNow', 'vibrateNow', 'alertNear', 'voice', 'jardinsNow', "tune('alertM')", "tune('memoryM')"]) assert.ok(f.includes(k), k);
});

test('Photos dans Sorties : la même image que le bouton du titre de Sorties, pas l\'appareil photo', () => {
  assert.ok(app.includes("onOff('evThumbs', 'image', 'Photos dans Sorties'"));
});
