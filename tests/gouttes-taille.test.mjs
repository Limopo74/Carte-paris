// 3A (25 nov. 2026) : la taille des gouttes de mes lieux sur la carte, Normales ou Grandes, dans la page Taille du texte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, exportJSON, readSettings, cleanSettings, saveMySettings, applyMySettings, exportSettingsJSON, cleanPinSize, PIN_SIZES } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('deux tailles, Normales au départ ; une valeur abîmée redevient Normales', () => {
  assert.deepEqual(PIN_SIZES, ['normal', 'grand']);
  for (const v of [undefined, null, 'tresgrand', 2, '']) assert.equal(cleanPinSize(v), 'normal');
  assert.equal(cleanPinSize('grand'), 'grand');
  assert.equal(loadState(memStorage()).pinSize, 'normal');
});

test('gardée, dans ma sauvegarde et mes réglages de référence, jamais dans les réglages envoyés', () => {
  const st = memStorage();
  saveState(st, { ...loadState(st), pinSize: 'grand' });
  const back = loadState(st);
  assert.equal(back.pinSize, 'grand');
  assert.equal(readSettings(JSON.parse(exportJSON(back))).pinSize, 'grand');
  assert.equal(cleanSettings(back).pinSize, 'grand');
  assert.equal(applyMySettings({ ...saveMySettings(back), pinSize: 'normal' }).pinSize, 'grand');
  assert.ok(!('pinSize' in JSON.parse(exportSettingsJSON(back)).settings), 'comme la taille du texte : reste sur ce téléphone');
});

test('la carte : la goutte grandit, sa pointe reste sur le lieu ; le reste de l\'appli ne change pas', () => {
  assert.match(css, /:root:is\(\[data-pins="grand"\]\) #map \{ --pk: 1\.3; \}/);
  assert.match(css, /\.pin \{[^}]*transform: translateY\(calc\(-22\.6px \* \(var\(--pk, 1\) - 1\)\)\) rotate\(-45deg\) scale\(var\(--pk, 1\)\);/);
  assert.ok(!/--pk\)/.test(css), 'toujours avec sa valeur de départ (hors de la carte, une goutte garde sa forme)');
  // la pointe : 16 px × √2 sous le centre d'un carré de 32 px tourné de 45°
  assert.ok(Math.abs(16 * Math.SQRT2 - 22.6) < 0.05);
  assert.match(app, /document\.documentElement\.dataset\.pins = cleanPinSize\(state\.pinSize\)/);
});

test('la page Taille du texte : le choix sous l\'aperçu, juste avant le retour ; Réglages le dit', () => {
  const page = app.slice(app.indexOf("if (section === 'texte')"), app.indexOf("name: 'settings:texte'"));
  const a = page.indexOf("'Aperçu'"); const g = page.indexOf("'Gouttes de mes lieux sur la carte'"); const b = page.indexOf('backBtn,');
  assert.ok(a > 0 && g > a && b > g);
  assert.match(app, /row\('a-large-small', 'Taille du texte', `\$\{TEXT_NAME\[cleanTextSize\(state\.textSize\)\]\} · gouttes \$\{PIN_NAME/);
});
