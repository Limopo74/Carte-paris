// Un souci sur un circuit (v172) : signalements et circuits masqués, gardés sur le téléphone et dans la sauvegarde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanCircuitNotes, cleanHiddenCircuits, circuitNoteId, notesOf, notesText, problemLabel, STEP_PROBLEMS, ROUTE_PROBLEMS, NOTES_MAX } from '../js/circuits.js';
import { loadState, saveState, exportJSON, mergeImport, backupHash, KEY } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const AT = Date.UTC(2026, 10, 20, 10);
const note = (over = {}) => ({ id: circuitNoteId('coulee', AT), c: 'coulee', e: 2, n: 'Les statues du commissariat', k: 'texte', t: 'Il y en a 12, pas 13', at: AT, ...over });

test('signalements : nettoyés, du plus récent, sans position', () => {
  const r = cleanCircuitNotes([note(), note({ id: 'pb-2', e: null, k: 'chemin', t: '', at: AT + 1 }), note(), { id: 'pb-3', c: 'Coulée!', k: 'texte', at: AT }, { id: 'pb-4', c: 'coulee', k: 'inconnu', at: AT }]);
  assert.equal(r.length, 2, 'doublon, circuit illisible et type inconnu écartés');
  assert.equal(r[0].id, 'pb-2');
  assert.equal(r[0].n, '', 'le chemin n\'a pas de nom d\'étape');
  assert.deepEqual(Object.keys(r[1]).sort(), ['at', 'c', 'e', 'id', 'k', 'n', 't'], 'rien d\'autre, aucune position');
  assert.equal(cleanCircuitNotes([note({ t: 'x'.repeat(500) })])[0].t.length, 300);
  assert.equal(cleanCircuitNotes(Array.from({ length: 150 }, (_, i) => note({ id: `pb-${i}`, at: AT + i }))).length, NOTES_MAX);
  assert.deepEqual(notesOf([note(), note({ id: 'pb-b', c: 'butte' })], 'butte').map((x) => x.id), ['pb-b']);
  for (const [k] of [...STEP_PROBLEMS, ...ROUTE_PROBLEMS]) assert.notEqual(problemLabel(k), '');
});

test('« Copier pour Claude » : un signalement par ligne, du plus ancien au plus récent', () => {
  const t = notesText([note(), note({ id: 'pb-2', e: null, k: 'escalier', t: '', at: AT + 1 })], [{ id: 'coulee', titre: 'La Coulée verte' }]);
  const lines = t.split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /^- La Coulée verte, étape 3 « Les statues du commissariat » : Texte faux ou à revoir\. « Il y en a 12, pas 13 » \(20 novembre 2026\)$/);
  assert.match(lines[2], /le chemin : Escalier ou pente non signalés\./);
  assert.equal(notesText([], []), '');
});

test('circuits masqués : identifiants propres, sans doublon', () => {
  assert.deepEqual(cleanHiddenCircuits(['coulee', 'coulee', '<b>', 3, 'butte']), ['coulee', 'butte']);
  assert.deepEqual(cleanHiddenCircuits(null), []);
});

test('gardés sur le téléphone, dans la sauvegarde, et repris d\'une sauvegarde à moi', () => {
  const st = memStorage();
  const s = loadState(st);
  assert.deepEqual(s.circuitNotes, []);
  assert.deepEqual(s.hiddenCircuits, []);
  const h0 = backupHash(s);
  const s2 = { ...s, circuitNotes: [note()], hiddenCircuits: ['butte'] };
  assert.notEqual(backupHash(s2), h0, 'compte comme un changement à sauvegarder');
  saveState(st, s2);
  const r = loadState(st);
  assert.equal(r.circuitNotes.length, 1);
  assert.deepEqual(r.hiddenCircuits, ['butte']);
  const file = exportJSON(r);
  const back = mergeImport(loadState(memStorage()), file).state;
  assert.equal(back.circuitNotes.length, 1);
  assert.deepEqual(back.hiddenCircuits, ['butte']);
  const friend = mergeImport(loadState(memStorage()), file, 'Léa').state;
  assert.deepEqual(friend.circuitNotes, [], 'les signalements d\'un proche ne viennent pas');
  assert.ok(!JSON.parse(exportJSON(loadState(memStorage()))).circuitNotes, 'rien dans le fichier quand il n\'y a rien');
  assert.ok(st.getItem(KEY).includes('hiddenCircuits'));
});
