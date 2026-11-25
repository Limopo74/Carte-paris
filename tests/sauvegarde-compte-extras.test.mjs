// v444 (défaut trouvé le 25 nov., mon choix 2A) : mes préparations pour un proche et mes remarques, dans ma sauvegarde depuis la
// v380, comptent dans « changements non sauvegardés » (règle de la v295 pour une donnée gardée à part) ; Mes chiffres, non.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backupHash, trackChange, savedBackup } from '../js/store.js';
import { cleanPreps, defaultPreset } from '../js/depart.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const base = { points: [{ id: 'a', name: 'Café', lat: 48.88, lng: 2.33, cat: 'resto' }], categories: [], lists: [] };
const preps = cleanPreps([{ id: 'p1', name: 'Pour Paul', at: 1, p: defaultPreset('Anne') }]);
const remarks = [{ id: 'rq-a', k: 'autre', at: 1000, t: 'un' }];

test('vides : l\'empreinte des sauvegardes d\'avant ne change pas', () => {
  const h = backupHash(base);
  assert.equal(backupHash({ ...base, preps: [], remarks: [] }), h);
  assert.equal(backupHash({ ...base, ttbMarks: {}, preps: [], remarks: [] }), h);
});

test('une préparation ou une remarque ajoutée, puis changée, compte ; la sauvegarde remet à zéro', () => {
  let s = { ...base, backup: savedBackup(base) };
  s = { ...s, backup: trackChange({ ...s, preps }) };
  assert.equal(s.backup.n, 1, 'préparation ajoutée');
  const renamed = preps.map((x) => ({ ...x, name: 'Pour Léa' }));
  s = { ...s, backup: trackChange({ ...s, preps: renamed }) };
  assert.equal(s.backup.n, 2, 'préparation changée');
  s = { ...s, backup: trackChange({ ...s, preps: renamed, remarks }) };
  assert.equal(s.backup.n, 3, 'remarque ajoutée');
  s = { ...s, backup: savedBackup({ ...s, preps: renamed, remarks }) };
  assert.equal(trackChange({ ...s, preps: renamed, remarks }).n, 0);
});

test('appli : l\'empreinte lit les préparations et les remarques sur le téléphone ; les enregistrer fait suivre le compte', () => {
  const w = app.slice(app.indexOf('function withMarks('), app.indexOf('function countExtras('));
  assert.ok(w.includes('storage.getItem(DEPART_KEY)') && w.includes('storage.getItem(TEST_KEY)'));
  assert.ok(!/journal/.test(w), 'Mes chiffres ne comptent pas');
  assert.match(app, /const savePreps = [^\n]*countExtras\(\)/);
  assert.match(app, /const saveTest = [^\n]*countExtras\(\)/);
});
