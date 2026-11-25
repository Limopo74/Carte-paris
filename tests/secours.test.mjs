// v431 (mon « 2 oui » du 25 nov.) : dans Où suis-je ?, « Urgences 112 » et « Samu 15 » ouvrent le téléphone avec le numéro.
// Numéros : service-public.gouv.fr, fiche F33954.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const icons = readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8');
const body = (name) => {
  const start = app.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `${name} existe`);
  const next = app.slice(start + 10).search(/^(async )?function /m);
  return app.slice(start, next < 0 ? undefined : start + 10 + next);
};

test('secours : 112, 15 et 17 seulement, en liens tel: (le téléphone compose, rien n\'est appelé seul)', () => {
  const list = app.match(/const SECOURS = (\[.*\]);/)?.[1];
  assert.ok(list, 'SECOURS existe');
  const nums = [...list.matchAll(/\['(\d+)', '([^']+)'/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(nums, [['112', 'Urgences 112'], ['15', 'Samu 15'], ['17', 'Police 17']]);
  assert.match(body('secoursRow'), /href: `tel:\$\{n\}`/);
  assert.doesNotMatch(body('secoursRow'), /onclick|location/, 'aucun appel lancé par le code');
});

test('secours : sous « Ajouter ce lieu », au-dessus du quartier, dans Où suis-je ?', () => {
  const b = body('openWhereAmI');
  const add = b.indexOf("'Ajouter ce lieu'");
  const row = b.indexOf('secoursRow()');
  const quarter = b.indexOf('    quarter,');
  assert.ok(add > 0 && row > add && quarter > row);
});

test('secours : icône téléphone, et ni rouge ni plaque pleine (rouge = fermé ; une seule plaque pleine)', () => {
  assert.match(icons, /^"phone": /m);
  assert.doesNotMatch(body('secoursRow'), /danger|primary|solid/);
});
