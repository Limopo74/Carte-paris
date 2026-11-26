// v535 (mes choix du 26 nov.) : en mode crise, les gestes urgents en gros boutons, 2 par rangée, sous Rentrer à pied ;
// un bouton par proche ; Urgences 112 ; ce qui se prépare dans « À préparer », plus bas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const block = app.slice(app.indexOf('function crisisBlock()'), app.indexOf('/** « Je vais bien »'));

test('gros boutons du mode crise : ordre, un par proche, 112', () => {
  const at = (t) => { const i = block.indexOf(t); assert.ok(i > 0, t); return i; };
  const order = ['Rentrer à pied chez moi', "class: 'tools crisis-tools'", "'Je vais bien'", 'people.map((c) => big(', "'Alerter en silence'", "'Urgences 112', null, 'tel:112'", "'Hôpital'", "'Bons gestes'", 'seineRow()', "'À préparer'", 'kitRow(back)', 'offlineRow(', "'Changer ou terminer'"];
  for (let i = 1; i < order.length; i++) assert.ok(at(order[i - 1]) < at(order[i]), `${order[i - 1]} avant ${order[i]}`);
  assert.doesNotMatch(block, /Le téléphone s\\'ouvre/, 'plus de petite ligne inutile en urgence');
});

test('gros boutons : deux par rangée dans toutes les tailles, liens sans soulignement', () => {
  assert.match(css, /\.crisis-tools \{ --tools-cols: 2;/);
  assert.match(css, /\.crisis-tools \.tool \{ text-decoration: none;/);
  assert.match(app, /\*\*Mode crise\*\*[^\n]*gros boutons/, 'Aide → Mode crise');
});
