// v389 (mon choix A du 24 nov.) : ma clé CARTO dans ma sauvegarde, case « Avec ma clé CARTO » cochée au départ ;
// Restaurer la remet seulement si le téléphone n'en a pas, jamais depuis le fichier d'un proche, jamais à la place d'une clé déjà là.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanCartoKey, mergeImport, loadState, exportJSON, newPoint } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const store = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
const fn = (name) => { const i = app.indexOf(`function ${name}(`); const j = app.indexOf('\n}\n', i); return app.slice(i, j + 2); };

function makeImport(start) {
  const mem = new Map(start ? [['carte-paris.carto', start]] : []);
  let styled = 0;
  const localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const cartoKey = () => localStorage.getItem('carte-paris.carto') ?? '';
  // eslint-disable-next-line no-new-func
  const f = new Function('localStorage', 'cartoKey', 'cleanCartoKey', 'CARTO_KEY', 'applyMapStyle', `${fn('importCartoKey')}; return importCartoKey;`)(localStorage, cartoKey, cleanCartoKey, 'carte-paris.carto', () => { styled += 1; });
  return { f, key: () => mem.get('carte-paris.carto'), styled: () => styled };
}

test('restaurer : la clé revient sur un téléphone qui n\'en a plus, et la carte se redessine', () => {
  const t = makeImport('');
  assert.equal(t.f(JSON.stringify({ points: [], carto: 'abcdEFGH1234' })), true);
  assert.equal(t.key(), 'abcdEFGH1234');
  assert.equal(t.styled(), 1);
});

test('restaurer : une clé déjà là n\'est jamais remplacée ; un fichier sans clé ou illisible ne change rien', () => {
  const t = makeImport('maCleActuelle99');
  assert.equal(t.f(JSON.stringify({ carto: 'abcdEFGH1234' })), false);
  assert.equal(t.key(), 'maCleActuelle99');
  const v = makeImport('');
  assert.equal(v.f(JSON.stringify({ points: [] })), false);
  assert.equal(v.f('pas du json'), false);
  assert.equal(v.f(JSON.stringify({ carto: '<script>' })), false);
  assert.equal(v.key(), undefined);
  assert.equal(v.styled(), 0);
});

test('la clé ne vient jamais du fichier d\'un proche, et revient avant les réglages', () => {
  const body = fn('importText');
  assert.match(body, /const keyBack = owner \? false : importCartoKey\(text\);/);
  assert.ok(body.indexOf('importCartoKey(text)') < body.indexOf('applyAllSettings()'));
});

test('sauvegarde : la clé seulement si la case est cochée ; case cochée au départ, visible seulement s\'il y a une clé', () => {
  assert.match(fn('backupText'), /if \(withKey && cleanCartoKey\(cartoKey\(\)\)\) obj\.carto = cleanCartoKey\(cartoKey\(\)\);/);
  assert.match(app, /const withKey = el\('input', \{ type: 'checkbox', class: 'check', checked: true \}\);/);
  assert.match(app, /cartoKey\(\) \? el\('label', \{ class: 'item-main check-row' \}, withKey,/);
  assert.match(app, /saveBackup\(withPhotos\.checked, withTtb\.checked, withKey\.checked, withPdf\.checked\)/ );
  assert.match(app, /sendBackup\(withPhotos\.checked, withTtb\.checked, withKey\.checked, withPdf\.checked\)/ );
  const i = store.indexOf('export function exportForFriend('); assert.ok(i > 0);
  assert.doesNotMatch(store.slice(i, store.indexOf('\n}\n', i)), /carto/, 'jamais dans le fichier pour un proche');
});

test('un fichier de sauvegarde avec la clé se restaure comme avant, la clé hors de l\'état', () => {
  const full = loadState({ getItem: () => null });
  full.points.push(newPoint({ name: 'Test', lat: 48.86, lng: 2.35, cat: full.categories[0].id }));
  const file = JSON.stringify({ ...JSON.parse(exportJSON(full)), carto: 'abcdEFGH1234' });
  const r = mergeImport(loadState({ getItem: () => null }), file);
  assert.equal(r.state.points.length, 1);
  assert.equal('carto' in r.state, false);
});
