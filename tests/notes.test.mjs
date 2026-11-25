// Note du jour (v205) : une page de texte par jour, sans lieu ni position, gardée sur le téléphone et dans ma sauvegarde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTE_MAX, cleanNotes, setNote, noteOf } from '../js/notes.js';
import { loadState, saveState, exportJSON, mergeImport, exportForFriend, backupHash, MAP_TOOLS, DEFAULT_MORE, NEW_IN_MORE, KEY } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const at = new Date(2026, 10, 18, 9, 30).getTime();

test('cleanNotes garde la bonne forme, une seule note par jour, la plus récente en premier', () => {
  const list = cleanNotes([
    { day: '2026-11-17', at: at - 864e5, text: 'hier' },
    { day: '2026-11-18', at, text: '  aujourd\'hui  ' },
    { day: '2026-11-18', at: at + 1, text: 'doublon' },
    { day: '18/11/2026', at, text: 'mauvaise date' },
    { day: '2026-11-16', at, text: '   ' },
    { day: '2026-11-15', at: 'x', text: 'heure illisible' },
    null, 'texte', 42,
  ]);
  assert.deepEqual(list, [{ day: '2026-11-18', at, text: 'aujourd\'hui' }, { day: '2026-11-17', at: at - 864e5, text: 'hier' }]);
  assert.deepEqual(cleanNotes(undefined), []);
  assert.deepEqual(cleanNotes({ day: '2026-11-18' }), []);
});

test('une note fait au plus 2 000 signes', () => {
  assert.equal(NOTE_MAX, 2000);
  assert.equal(cleanNotes([{ day: '2026-11-18', at, text: 'a'.repeat(2500) }])[0].text.length, 2000);
  assert.equal(setNote([], '2026-11-18', 'b'.repeat(2100), at)[0].text.length, 2000);
});

test('setNote : écrire, compléter (garde la première heure), effacer avec un texte vide', () => {
  let n = setNote([], '2026-11-18', 'Librairie rue des Martyrs', at);
  assert.deepEqual(n, [{ day: '2026-11-18', at, text: 'Librairie rue des Martyrs' }]);
  n = setNote(n, '2026-11-18', 'Librairie rue des Martyrs\nSquare au printemps', at + 3600e3);
  assert.equal(n.length, 1);
  assert.equal(n[0].at, at, 'la note garde sa place dans Mon journal');
  assert.match(n[0].text, /printemps/);
  n = setNote(n, '2026-11-17', 'hier', at - 864e5);
  assert.equal(n.length, 2);
  n = setNote(n, '2026-11-18', '   ', at + 7200e3);
  assert.deepEqual(n.map((x) => x.day), ['2026-11-17'], 'un texte vide efface la note du jour');
  assert.equal(noteOf(n, '2026-11-17').text, 'hier');
  assert.equal(noteOf(n, '2026-11-18'), null);
});

test('setNote ne modifie pas la liste reçue', () => {
  const before = [{ day: '2026-11-18', at, text: 'a' }];
  setNote(before, '2026-11-18', 'b', at);
  assert.equal(before[0].text, 'a');
});

test('les notes restent après fermeture de l\'appli et changent l\'empreinte de la sauvegarde', () => {
  const s = memStorage();
  const st = loadState(s);
  assert.deepEqual(st.notes, []);
  const h0 = backupHash(st);
  st.notes = setNote(st.notes, '2026-11-18', 'Expo à revoir', at);
  assert.notEqual(backupHash(st), h0, 'une note compte comme un changement à sauvegarder');
  saveState(s, st);
  assert.deepEqual(loadState(s).notes, [{ day: '2026-11-18', at, text: 'Expo à revoir' }]);
  assert.equal(backupHash({ ...st, notes: [] }), h0, 'sans note, l\'empreinte des anciennes sauvegardes ne change pas');
  assert.ok(JSON.parse(s.getItem(KEY)).notes);
});

test('ma sauvegarde emporte mes notes ; la restauration les ajoute sans écraser celles du téléphone', () => {
  const mine = loadState(memStorage());
  mine.notes = setNote(setNote([], '2026-11-18', 'du fichier', at), '2026-11-10', 'ancienne', at - 8 * 864e5);
  const file = exportJSON(mine);
  assert.equal(JSON.parse(file).notes.length, 2);
  const phone = loadState(memStorage());
  phone.notes = setNote([], '2026-11-18', 'du téléphone', at + 1);
  const { state } = mergeImport(phone, file);
  assert.equal(noteOf(state.notes, '2026-11-18').text, 'du téléphone');
  assert.equal(noteOf(state.notes, '2026-11-10').text, 'ancienne');
  assert.equal(JSON.parse(exportJSON(loadState(memStorage()))).notes, undefined, 'pas de champ notes quand il n\'y en a pas');
});

test('les notes ne partent jamais chez un proche et ne viennent jamais d\'un proche', () => {
  const st = loadState(memStorage());
  st.me = 'Marie';
  st.notes = setNote([], '2026-11-18', 'privé', at);
  const friendFile = exportForFriend(st, { lieux: true, notes: true, passages: true, photos: true, plans: true, artists: true, venues: true, ttb: true });
  assert.equal(friendFile.notes, undefined);
  assert.doesNotMatch(JSON.stringify(friendFile), /privé/);
  const other = loadState(memStorage());
  const { state } = mergeImport(other, JSON.stringify({ app: 'carte-paris', version: 2, owner: 'Léa', categories: [], points: [], notes: [{ day: '2026-11-18', at, text: 'de Léa' }] }), 'Léa');
  assert.deepEqual(state.notes, []);
});

test('bouton « Note du jour » : avant Ma position, rangé dans Plus, arrive dans Plus chez qui avait déjà ses boutons', () => {
  assert.deepEqual(MAP_TOOLS.slice(-4), ['notes', 'myparis', 'crise', 'locate']); // v490 : Mode crise ; // v426 : Mon Paris entre Note du jour et Ma position
  assert.ok(DEFAULT_MORE.includes('notes'));
  assert.ok(NEW_IN_MORE.includes('notes'));
  const s = memStorage();
  s.setItem(KEY, JSON.stringify({ points: [], layoutV: 4, mapTools: ['paris', 'pratique', 'metro', 'velib', 'home', 'sorties', 'planning', 'circuits', 'locate'], moreTools: ['velib'], hiddenTools: [] }));
  const st = loadState(s);
  assert.ok(st.moreTools.includes('notes'), 'jamais posé sur la carte tout seul');
  assert.equal(st.mapTools.at(-1), 'locate', 'Ma position reste en bas');
});

test('v213 : effacer une note, puis « Annuler » la remet avec son heure et à sa place', () => {
  const notes = [{ day: '2026-11-17', at: at - 864e5, text: 'hier' }, { day: '2026-11-18', at, text: 'librairie rue des Martyrs' }];
  const old = noteOf(notes, '2026-11-17');
  const sans = setNote(notes, '2026-11-17', '');
  assert.equal(noteOf(sans, '2026-11-17'), null);
  assert.equal(sans.length, 1);
  const remis = setNote(sans, old.day, old.text, old.at);
  assert.deepEqual(remis, cleanNotes(notes));
});
