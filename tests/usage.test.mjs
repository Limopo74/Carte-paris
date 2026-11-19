import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanLabel, screenKey, emptyUsage, readUsage, noteOpen, noteSeen, noteUsed, usageReport, screenName, USAGE_MAX_LABELS } from '../js/usage.js';

test('Ce que j\'utilise : nom des boutons sans chiffres ni détails', () => {
  assert.equal(cleanLabel('Y aller · ≈ 9 min de chez toi'), 'Y aller');
  assert.equal(cleanLabel('Mes salles (3)'), 'Mes salles');
  assert.equal(cleanLabel('Voir les 6 sorties'), 'Voir les sorties');
  assert.equal(cleanLabel('  Boussole  '), 'Boussole');
  assert.equal(cleanLabel('12'), '');
  assert.equal(cleanLabel(''), '');
  assert.equal(cleanLabel('x'.repeat(41)), '', 'trop long : pas un bouton');
});

test('Ce que j\'utilise : nom des écrans, sans l\'identifiant d\'un lieu', () => {
  assert.equal(screenKey('detail:p123'), 'detail');
  assert.equal(screenKey('settings:chezmoi'), 'settings:chezmoi');
  assert.equal(screenKey('Ⓜ Bastille'), 'metro');
  assert.equal(screenKey('chercher-expos'), 'chercher');
  assert.equal(screenKey('near'), 'near');
  assert.equal(screenKey(null), 'autre');
});

test('Ce que j\'utilise : le titre d\'une fiche (nom du lieu) n\'est jamais gardé', () => {
  const u = emptyUsage(0);
  noteOpen(u, 'detail:p1', 'Café des Amis');
  noteOpen(u, 'market', 'Marché Telegraphe');
  assert.equal(JSON.stringify(u).includes('Amis'), false);
  assert.equal(JSON.stringify(u).includes('Telegraphe'), false);
  assert.equal(screenName(u, 'detail'), 'Fiche d\'un lieu');
  // un écran de l'appli garde son titre, oublié s'il change
  noteOpen(u, 'settings:usage', 'Ce que j\'utilise');
  assert.equal(screenName(u, 'settings:usage'), 'Ce que j\'utilise');
  noteOpen(u, 'week', 'Expos de la semaine'); noteOpen(u, 'week', 'Concerts de la semaine');
  assert.equal(u.s.week.t, undefined); assert.equal(u.s.week.varies, true);
});

test('Ce que j\'utilise : vus, touchés, jamais touchés', () => {
  const u = emptyUsage(0);
  for (let i = 0; i < 5; i += 1) { noteOpen(u, `detail:p${i}`); noteSeen(u, `detail:p${i}`, ['Y aller · 3 min', 'Boussole', 'QR code', 'Partager']); }
  noteUsed(u, 'detail:p1', 'Y aller · 8 min'); noteUsed(u, 'detail:p2', 'Y aller'); noteUsed(u, 'detail:p2', 'Boussole');
  u.opens = 4; noteSeen(u, 'carte', ['Métro le plus proche', 'Revenir au centre de Paris']); noteUsed(u, 'carte', 'Métro le plus proche');
  const r = usageReport(u, { minSeen: 3, minOpens: 3 });
  assert.equal(r.touches, 4);
  assert.deepEqual(r.top.map((x) => [x.label, x.used]), [['Y aller', 2], ['Boussole', 1], ['Métro le plus proche', 1]]);
  const fiche = r.never.find((x) => x.key === 'detail');
  assert.deepEqual(fiche.labels.sort(), ['Partager', 'QR code']);
  assert.equal(fiche.opens, 5);
  assert.equal(r.never.find((x) => x.key === 'carte'), undefined, 'vu une seule fois : trop tôt pour le dire');
});

test('Ce que j\'utilise : éteint, rien n\'est compté ; fichier abîmé, on repart de zéro ; taille bornée', () => {
  const u = { ...emptyUsage(0), off: true };
  noteOpen(u, 'near'); noteUsed(u, 'near', 'Boussole');
  assert.deepEqual(u.s, {}); assert.deepEqual(u.b, {});
  assert.equal(readUsage('pas du json', 5).since, 5);
  assert.equal(readUsage(JSON.stringify({ v: 2 }), 5).opens, 0);
  const v = emptyUsage(0);
  for (let i = 0; i < USAGE_MAX_LABELS + 50; i += 1) noteUsed(v, `e${Math.floor(i / 100)}`, `Bouton ${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26) % 26)}${String.fromCharCode(97 + Math.floor(i / 676) % 26)}`);
  const n = Object.values(v.b).reduce((k, x) => k + Object.keys(x).length, 0);
  assert.ok(n <= USAGE_MAX_LABELS, n);
});

test('Ce que j\'utilise : hors sauvegarde, hors envoi à un proche, rien vers le réseau', () => {
  const store = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
  const usage = readFileSync(new URL('../js/usage.js', import.meta.url), 'utf8');
  assert.equal(/usage/i.test(store), false, 'store.js (sauvegarde, empreinte, proche) ne connaît pas ces comptes');
  assert.equal(/fetch|XMLHttpRequest|sendBeacon|https?:/.test(usage.replace(/^\s*\/\/.*$/gm, '')), false);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const decl = app.indexOf('let usage = readUsage(');
  assert.ok(decl > 0 && decl < app.indexOf('function openSheet('), 'déclaré avant tout écran ouvert au démarrage');
});

test('Ce que j\'utilise : gardé pour le mode avion', () => {
  assert.ok(readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes("'js/usage.js'"));
});
