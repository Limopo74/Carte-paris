// v490 : Mode crise, première partie (claude/idee-mode-crise.md, réponses 1 à 3, 6, 11, 14, 16 ; maquette validée, mon choix 29 A).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CRISES, crisisOf, crisisShort, cleanCrisis, smsOkText } from '../js/crise.js';
import { MAP_TOOLS, DEFAULT_MORE, NEW_IN_MORE, FRESH_TOOLS, loadState, exportJSON } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('les cinq crises (réponse 4) ; eau et toilettes pour crue, coupure, canicule (réponse 11)', () => {
  assert.deepEqual(CRISES.map((c) => c.k), ['crue', 'coupure', 'canicule', 'abri', 'greve']);
  assert.deepEqual(CRISES.filter((c) => c.water).map((c) => c.k), ['crue', 'coupure', 'canicule']);
  assert.equal(crisisShort('coupure'), 'Coupure');
  assert.equal(crisisShort('crue'), 'Crue');
  assert.equal(crisisOf('x'), null);
});

test('l\'état gardé est nettoyé ; une crise inconnue n\'allume rien', () => {
  assert.equal(cleanCrisis(null), null);
  assert.equal(cleanCrisis({ k: 'zombies' }), null);
  assert.deepEqual(cleanCrisis({ k: 'crue', since: 5, pratBefore: 'oui' }), { k: 'crue', since: 5, pratBefore: false });
});

test('« Je vais bien » : la position seulement si elle est donnée (réponse 14)', () => {
  assert.equal(smsOkText(), 'Je vais bien.');
  assert.equal(smsOkText({ lat: NaN, lng: 2 }), 'Je vais bien.');
  assert.equal(smsOkText({ lat: 48.876312, lng: 2.34 }), 'Je vais bien. Je suis ici : https://www.google.com/maps/search/?api=1&query=48.87631,2.34000');
});

test('le bouton arrive dans ⋯ Plus de la colonne, jamais sur la carte tout seul (réponse 2)', () => {
  assert.deepEqual(MAP_TOOLS.slice(-2), ['crise', 'locate']);
  assert.ok(DEFAULT_MORE.includes('crise') && NEW_IN_MORE.includes('crise') && FRESH_TOOLS.moreTools.includes('crise'));
  const mem = (v) => { let x = v; return { getItem: () => x, setItem: (_k, val) => { x = val; } }; };
  const mine = loadState(mem(JSON.stringify({ points: [], layoutV: 4, mapTools: ['vu', 'paris', 'locate'], moreTools: [], hiddenTools: [] })));
  assert.ok(mine.moreTools.includes('crise'));
  assert.match(html, /<button type="button" id="btnCrise" class="map-btn c-guide" aria-label="[^"]+">/);
  assert.match(app, /crise: \{ el: 'btnCrise', icon: 'triangle-alert', name: '[^']+', short: 'Mode crise' \}/);
  assert.ok(sw.includes("'js/crise.js'"));
});

test('gardé à part : jamais dans la sauvegarde (ni donc chez un proche)', () => {
  assert.match(app, /const CRISIS_KEY = 'carte-paris\.crise';/);
  const s = loadState({ getItem: () => null, setItem: () => {} });
  const o = JSON.parse(exportJSON(s));
  assert.ok(!('crisis' in o) && !('crisis' in (o.settings ?? {})), 'aucun état de crise dans le fichier');
  assert.ok(!/state\.crisis|crisis:/.test(readFileSync(new URL('../js/store.js', import.meta.url), 'utf8')), 'le store ne le connaît pas');
});

test('l\'étiquette, Où suis-je ?, Autour de moi', () => {
  // « Crise crue · Terminer » : tient sur une ligne en Très grand pour les cinq crises (« Mode crise · Canicule · Terminer » passait sur deux)
  assert.match(app, /\(crisis \? \{ text: `Crise \$\{crisisShort\(crisis\.k\)\.toLowerCase\(\)\} · Terminer`, act: 'crise' \} : null\)/);
  assert.match(app, /else if \(n\?\.act === 'crise'\) endCrisis\(\);/);
  assert.match(app, /toast\('Mode crise terminé', false, \{ label: 'Annuler'/, '« Terminer » se rattrape');
  const where = app.slice(app.indexOf('async function openWhereAmI()'), app.indexOf("openSheet([ico('locate'), ' Où suis-je ?']"));
  assert.ok(where.indexOf("'Alerter en silence'") < where.indexOf('openCrisis('), 'sous Alerter en silence');
  assert.ok(where.indexOf('openCrisis(') < where.indexOf('    delinq,'), 'au-dessus des vols');
  const near = app.slice(app.indexOf('function renderNear('), app.indexOf("body.push(el('div', { class: 'tools' },"));
  assert.match(near, /if \(crisis\) body\.push\(crisisBlock\(\)\);/, 'Autour de moi commence par les gestes utiles');
  const block = app.slice(app.indexOf('function crisisBlock()'), app.indexOf('function openImOk('));
  assert.ok((block.match(/class: 'btn primary/g) ?? []).length === 1, 'une seule plaque pleine : Rentrer à pied chez moi');
  assert.match(block, /showWalkRoute\(homeOrigin\(home\), pos, back\)/, 'part de ma vraie position, pas de Chez moi');
});
