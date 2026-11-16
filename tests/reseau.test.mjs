// Réseau faible (métro, quai) : aucun appel à un service en ligne sans limite de temps, et le service worker
// prend la copie gardée quand le réseau ne répond pas en 3 s.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('app.js : seuls les fichiers de l\'appli sont lus par fetch() direct, le reste passe par net() (10 s au plus)', () => {
  const app = src('js/app.js');
  const direct = [...app.matchAll(/(?<![\w.])fetch\(([^)]{0,60})/g)].map((m) => m[1]).filter((a) => a && !/^'data\//.test(a) && !/^url, \{ \.\.\.opts/.test(a));
  assert.deepEqual(direct, [], `appels sans limite de temps : ${direct.join(' | ')}`);
  assert.match(app, /AbortSignal\.timeout\(NET_TIMEOUT_MS\)/);
});

test('recherche d\'adresse et annuaire : limite de 10 s en plus de l\'annulation', () => {
  for (const f of ['js/adresse.js', 'js/annuaire.js']) assert.match(src(f), /signal: withLimit\(signal\)/, f);
});

test('service worker : copie gardée au bout de 3 s, puis tout de suite pendant 30 s', () => {
  const sw = src('sw.js');
  assert.match(sw, /setTimeout\(\(\) => \{ slowUntil = Date\.now\(\) \+ 30000; caches\.match\(e\.request\)\.then\(give\); \}, 3000\)/);
  assert.match(sw, /if \(Date\.now\(\) < slowUntil\) caches\.match\(e\.request\)\.then\(give\)/);
});
