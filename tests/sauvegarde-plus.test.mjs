// v378 (mes choix 10A et 11A du 24 nov.) : remarques, préparations pour un proche et Mes chiffres dans ma sauvegarde ;
// à la restauration tout s'ajoute, rien n'est remplacé ; jamais les fonctions utilisées, jamais la clé CARTO, jamais chez un proche.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeRemarks } from '../js/remarques.js';
import { journalForBackup, mergeJournal } from '../js/journal.js';
import { mergePreps, defaultPreset } from '../js/depart.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('remarques : réunies sans doublon, aucune perdue', () => {
  const a = [{ id: 'rq-a', k: 'autre', at: 1000, t: 'un' }];
  const b = [{ id: 'rq-a', k: 'autre', at: 1000, t: 'un' }, { id: 'rq-b', k: 'manque', at: 2000, t: 'deux' }];
  const m = mergeRemarks(a, b);
  assert.deepEqual(m.map((r) => r.id), ['rq-b', 'rq-a']);
  assert.ok(!('lat' in m[0]) && !('lng' in m[0]));
});

test('Mes chiffres : marche et air seulement, jamais les fonctions utilisées ; un jour déjà là n\'est pas compté deux fois', () => {
  const j = { days: { '2026-11-20': { m: 1200, air: { bon: 1200 }, use: { Sorties: 4 } }, '2026-11-21': { m: 0, air: {}, use: { Rentrer: 1 } } } };
  const b = journalForBackup(j);
  assert.deepEqual(b, { days: { '2026-11-20': { m: 1200, air: { bon: 1200 } } } });
  assert.ok(!JSON.stringify(b).includes('use'));
  const mine = { days: { '2026-11-20': { m: 300, air: { bon: 300 }, use: { M: 2 } } } };
  const r = mergeJournal(mine, { days: { ...b.days, '2026-11-19': { m: 800, air: { moyen: 800 } } } });
  assert.equal(r.days['2026-11-20'].m, 300, 'le jour du téléphone reste');
  assert.equal(r.days['2026-11-19'].m, 800, 'le jour absent arrive');
  assert.equal(journalForBackup({ days: {} }), null);
});

test('préparations : une déjà là reste, les autres arrivent, sans clé CARTO', () => {
  const p = defaultPreset();
  const mine = [{ id: 'p1', name: 'Pour Paul', at: 1, p }];
  const theirs = [{ id: 'p1', name: 'Autre nom', at: 2, p }, { id: 'p2', name: 'Pour Léa', at: 3, p: { ...p, carto: 'cle-secrete' } }];
  const m = mergePreps(mine, theirs);
  assert.deepEqual(m.map((x) => [x.id, x.name]), [['p1', 'Pour Paul'], ['p2', 'Pour Léa']]);
  assert.ok(!JSON.stringify(m).includes('cle-secrete'));
});

test('appli : ajoutés à ma sauvegarde seulement, restaurés seulement depuis ma sauvegarde', () => {
  const b = app.slice(app.indexOf('async function backupText('), app.indexOf('async function backupText(') + 1400);
  for (const k of ['obj.remarks = testState.remarks', 'obj.preps = preps', 'obj.journal = jb']) assert.ok(b.includes(k), k);
  assert.ok(app.includes("if (!owner) restoreExtras(text);"));
  const send = app.slice(app.indexOf('function exportForFriend') > 0 ? app.indexOf('function exportForFriend') : 0);
  assert.ok(!/obj\.remarks|obj\.preps|obj\.journal/.test(app.slice(app.indexOf("if (sendSel.ttb)") - 3000, app.indexOf("if (sendSel.ttb)") + 500)), 'rien de tout ça pour un proche');
});
