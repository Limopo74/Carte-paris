// v384 (mes choix 1A et 2A du 24 nov.) : une rue d'intérêt : deux appuis, le morceau suit les rues ; une fiche comme un lieu,
// son tracé gardé (sauvegarde, envoi à un proche), dessiné de la couleur de sa catégorie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanLine, LINE_MAX, loadState, saveState, exportJSON, mergeImport, mergeFriend, KEY } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const line = [[48.88151, 2.33651], [48.88102, 2.33702], [48.8805, 2.3375]];

test('cleanLine : un tracé valable autour de Paris, sinon rien', () => {
  assert.deepEqual(cleanLine(line), line);
  assert.equal(cleanLine([[48.88, 2.33]]), null, 'un seul point');
  assert.equal(cleanLine([[10, 2.33], [48.88, 2.33]]), null, 'loin de Paris');
  assert.equal(cleanLine(Array.from({ length: LINE_MAX + 1 }, (_, i) => [48.88, 2.33 + i * 1e-5])), null);
  assert.equal(cleanLine('pirate'), null);
});

test('le tracé passe par la sauvegarde, la restauration et un proche', () => {
  const s = mem();
  const st = loadState(s);
  st.points.push({ id: 'r1', name: 'Rue des Martyrs', cat: st.categories[0].id, lat: 48.881, lng: 2.337, line, created: 1 });
  saveState(s, st);
  const again = loadState(s);
  assert.deepEqual(again.points.find((p) => p.id === 'r1').line, line, 'gardé sur le téléphone');
  const file = exportJSON(again);
  const fresh = loadState(mem());
  const { state: back } = mergeImport(fresh, file, '');
  assert.deepEqual(back.points.find((p) => p.name === 'Rue des Martyrs')?.line, line, 'revient avec la sauvegarde');
  const other = loadState(mem());
  const { state: got } = mergeFriend(other, { ...JSON.parse(file), points: JSON.parse(file).points.map((p) => ({ ...p, owner: 'Léa' })) }, 'Léa', { lieux: true, notes: true, photos: false, passages: false });
  assert.deepEqual(got.points.find((p) => p.name === 'Rue des Martyrs')?.line, line, 'arrive chez un proche');
});

test('appli : + Ajouter → Une rue d\'intérêt, tout en bas ; trait de la couleur de la catégorie, touchable', () => {
  const add = app.slice(app.indexOf('function openAddChoice('), app.indexOf('function openAddChoice(') + 6000);
  assert.ok(add.indexOf("'Une rue d\\'intérêt'") > add.indexOf("'Un circuit'"), 'sous les autres boutons');
  assert.match(app, /L\.polyline\(p\.line, \{ color: catOf\(p\.cat\)\.color, weight: 8, opacity: p\.gone \? 0\.35 : 0\.7, lineCap: 'round', className: 'rue-line' \}\)/);
  assert.ok(app.includes('if (cleanLine(draft.line)) np.line = cleanLine(draft.line);'));
  assert.ok(app.includes("if (moving || view === 'trace' || view === 'rue') return;"), 'l\'appui long ne crée pas de lieu pendant le tracé');
});
