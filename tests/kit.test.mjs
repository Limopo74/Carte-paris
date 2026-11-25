// v510 (ma réponse 17 A, maquette validée le 25 nov. ; mes choix A, A, A) : mon kit 72 h à cocher, liste du guide « Tous
// responsables » ; dans le mode crise et en bas de Mon Paris ; coches et date sur le téléphone et dans ma sauvegarde,
// jamais chez un proche ; eau : 6 litres par personne, 2 personnes au départ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { KIT, KIT_IDS, cleanKit, mergeKit, waterText } from '../js/kit.js';
import { loadState, saveState, exportJSON, mergeImport, exportForFriend, backupHash } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('la liste du guide : 6 groupes, 33 objets, identifiants uniques', () => {
  assert.equal(KIT.length, 6);
  assert.equal(KIT_IDS.length, 33);
  assert.equal(new Set(KIT_IDS).size, 33);
  assert.equal(waterText(2), '6 litres par personne (2 personnes : 12 litres)');
  assert.equal(waterText(1), '6 litres par personne (1 personne : 6 litres)');
});

test('nettoyage et fusion', () => {
  assert.equal(cleanKit(null), null);
  assert.equal(cleanKit({ ok: [], n: 2 }), null, 'rien de noté : null');
  assert.deepEqual(cleanKit({ ok: ['eau', 'eau', 'pirate'], at: 1.79e12, n: 40 }), { ok: ['eau'], at: 1.79e12, n: 2 });
  assert.deepEqual(mergeKit({ ok: ['eau'], at: 1.79e12, n: 3 }, { ok: ['radio'], at: 1.8e12, n: 1 }), { ok: ['eau', 'radio'], at: 1.8e12, n: 3 });
});

test('sauvegarde : oui ; fichier pour un proche : jamais', () => {
  let raw = null; const st = { getItem: () => raw, setItem: (_k, v) => { raw = v; } };
  const s0 = loadState(st);
  assert.equal(s0.kit, null);
  const kit = { ok: ['eau', 'radio'], at: 1.79e12, n: 2 };
  saveState(st, { ...s0, kit });
  const s1 = loadState(st);
  assert.deepEqual(s1.kit, kit);
  assert.deepEqual(JSON.parse(exportJSON(s1)).kit, kit);
  assert.notEqual(backupHash(s1), backupHash(s0));
  assert.ok(!('kit' in exportForFriend(s1)), 'jamais pour un proche');
  assert.deepEqual(mergeImport(s0, exportJSON(s1)).state.kit, kit);
});

test('dans le mode crise et en bas de Mon Paris ; mis en cache', () => {
  assert.match(app, /kitRow\(back\), \/\/ v510/);
  assert.match(app, /kitRow\(named\('Mon Paris', \(\) => openMyParis\(\)\), 'c-disc'\)/);
  assert.match(app, /'Je l\\'ai vérifié aujourd\\'hui'/);
  assert.match(sw, /'js\/kit\.js'/);
});
