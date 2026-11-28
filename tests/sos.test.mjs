// v553 (mes choix « Tout conseillé » du 28 nov.) : le rond SOS, en haut de la colonne, ouvre Secours en un appui.
// Numéros : service-public.gouv.fr, fiche F33954 (vérifiée le 25 août 2026) : 112, 15, 17, 18, 114 (aussi par SMS), 3117.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const charte = readFileSync(new URL('../CHARTE.md', import.meta.url), 'utf8');
const body = (name) => {
  const start = app.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `${name} existe`);
  const next = app.slice(start + 10).search(/^(async )?function /m);
  return app.slice(start, next < 0 ? undefined : start + 10 + next);
};

test('SOS : 112, 15, 17, 18 et 3117 en liens tel:, puis le SMS au 114 ; rien n\'est appelé par le code', () => {
  const list = app.match(/const SOS_CALLS = (\[[\s\S]*?\]\]);/)?.[1];
  assert.ok(list, 'SOS_CALLS existe');
  const nums = [...list.matchAll(/\[(?:'(\d+)'|TRANSPORT_TEL), '([^']+)'/g)].map((m) => [m[1] ?? 'TRANSPORT_TEL', m[2]]);
  assert.deepEqual(nums, [['112', 'Urgences 112'], ['15', 'Samu 15'], ['17', 'Police 17'], ['18', 'Pompiers 18'], ['TRANSPORT_TEL', 'Transports 3117']]);
  const b = body('openSos');
  assert.match(b, /`tel:\$\{n\}`/);
  assert.match(b, /smsHref\('114'/);
  assert.doesNotMatch(b, /location\.href|window\.open/, 'aucun appel lancé par le code');
});

test('SOS : la page s\'ouvre avant la position (pas d\'await avant openSheet)', () => {
  const b = body('openSos');
  const sheet = b.indexOf('openSheet(');
  assert.ok(sheet > 0);
  assert.doesNotMatch(b.slice(0, sheet), /await /);
});

test('SOS : premier bouton de la colonne, jamais dans la liste des boutons réglables', () => {
  const col = html.slice(html.indexOf('<div class="map-tools">'));
  assert.ok(col.indexOf('id="btnSos"') > 0 && col.indexOf('id="btnSos"') < col.indexOf('<button type="button" id="btnVu"'));
  assert.doesNotMatch(app.match(/const TOOL_INFO = \{[\s\S]*?\n\};/)[0], /btnSos/);
});

test('SOS : rouge plein par jetons, caché sous une page ouverte, exception écrite dans la charte', () => {
  assert.match(css, /\.map-btn\.sos-btn \{[^}]*background: var\(--danger\); color: var\(--on-danger\)/);
  assert.equal((css.match(/--on-danger: #/g) || []).length, 4, 'un jeton par style');
  assert.match(css, /body:has\(#sheet:not\(\[hidden\]\)\) \.map-btn\.sos-btn \{ visibility: hidden; \}/);
  assert.match(charte, /Seule exception : le rond SOS/);
});

test('Secours (v554) : bandeau du titre rouge par jetons, boutons de la page sans rouge, écrit dans la charte', () => {
  assert.match(app, /sheet\.classList\.toggle\('sos-sheet', name === 'sos'\)/);
  assert.match(css, /\.sheet\.sos-sheet \.sheet-head \{ background: var\(--danger\); color: var\(--on-danger\)/);
  assert.doesNotMatch(css, /\.sos-tools[^{]*\{[^}]*danger/, 'les gros boutons restent sans rouge');
  assert.match(charte, /Le bandeau du titre de la page Secours prend le même rouge/);
});

test('Secours (v555) : SMS transports 31177 en dernier, sur toute la largeur, message prêt', () => {
  const b = body('openSos');
  assert.match(b, /smsHref\(TRANSPORT_SMS, sms31177Text\(\)\)/);
  assert.ok(b.indexOf('sms31177Text') > b.indexOf("smsHref('114'"), 'sous le SMS au 114');
  assert.match(css, /\.sos-tools \.tool\.sos-wide \{ grid-column: 1 \/ -1; \}/);
});
