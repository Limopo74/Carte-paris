// v139 : noms choisis pour les boutons de la carte, et « Noms à côté des boutons ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanToolName, cleanToolNames, TOOL_NAME_MAX, loadState, saveState, exportJSON, readSettings, cleanSettings, KEY } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('un nom de bouton est nettoyé et limité', () => {
  assert.equal(cleanToolName('  Ma   maison '), 'Ma maison');
  assert.equal(cleanToolName('Toi\u0000let‮tes\n'), 'Toilettes');
  assert.equal([...cleanToolName('x'.repeat(40))].length, TOOL_NAME_MAX);
  assert.equal(cleanToolName('Café ☕ du coin et plus'), 'Café ☕ du coin e');
  assert.equal(cleanToolName(12), '');
  assert.equal(cleanToolName('   '), '');
});

test('seuls les boutons connus gardent un nom non vide', () => {
  assert.deepEqual(cleanToolNames({ home: 'Maison', velib: '  ', inconnu: 'X', __proto__: { metro: 'Piège' } }), { home: 'Maison' });
  assert.deepEqual(cleanToolNames(null), {});
  assert.deepEqual(cleanToolNames(['Maison']), {});
  assert.deepEqual(cleanToolNames('Maison'), {});
});

test('les noms et l\'option sont gardés, rechargés et partent avec la sauvegarde', () => {
  const st = memStorage();
  const empty = loadState(st);
  assert.deepEqual(empty.toolNames, {});
  assert.equal(empty.toolLabels, false);
  assert.ok(saveState(st, { ...empty, toolNames: { home: 'Maison', pratique: 'Pipi' }, toolLabels: true }));
  const back = loadState(st);
  assert.deepEqual(back.toolNames, { pratique: 'Pipi', home: 'Maison' });
  assert.equal(back.toolLabels, true);
  const settings = readSettings(JSON.parse(exportJSON(back)));
  assert.deepEqual(settings.toolNames, { pratique: 'Pipi', home: 'Maison' });
  assert.equal(settings.toolLabels, true);
});

test('un fichier abîmé ne casse rien', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], toolNames: { home: { x: 1 }, metro: 'M'.repeat(99) }, toolLabels: 'oui' }));
  const s = loadState(st);
  assert.deepEqual(s.toolNames, { metro: 'M'.repeat(TOOL_NAME_MAX) });
  assert.equal(s.toolLabels, false);
  assert.deepEqual(cleanSettings({}).toolNames, {});
});
