// v426 (mes choix 0C 1A 2A 3A 4A du 25 nov.) : Mon journal en calendrier en tête de Mon Paris ; Mon Paris dans ⋯ Plus de la colonne.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { byDay, itemDay, monthCells, addMonth, monthRange, clampMonth, sameMonth, monthLabel, dayLabel } from '../js/calendrier.js';
import { MAP_TOOLS, DEFAULT_MORE, NEW_IN_MORE, FRESH_TOOLS, loadState } from '../js/store.js';
import { cleanPreset, defaultPreset } from '../js/depart.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const at = (y, m, d, h = 12) => new Date(y, m, d, h).getTime();

test('un mois : lundi en premier, semaines entières, chaque jour une fois', () => {
  const nov = monthCells(2026, 10); // novembre 2026 commence un dimanche
  assert.equal(nov.length % 7, 0);
  assert.equal(nov.slice(0, 6).every((c) => c === null), true, '6 cases vides avant le dimanche 1er');
  assert.deepEqual(nov[6], { d: 1, day: '2026-11-01' });
  assert.equal(nov.filter(Boolean).length, 30);
  assert.equal(nov.filter(Boolean).at(-1).day, '2026-11-30');
  const feb = monthCells(2027, 1); // février 2027 : un lundi, 28 jours, 4 semaines pile
  assert.equal(feb.length, 28);
  assert.equal(feb[0].day, '2027-02-01');
  assert.equal(monthCells(2028, 1).filter(Boolean).length, 29, 'année bissextile');
});

test('les entrées vont à leur jour ; la note du jour garde son jour même écrite plus tard', () => {
  const items = [
    { p: { name: 'A' }, at: at(2026, 10, 25, 9) },
    { o: { id: 'o1' }, at: at(2026, 10, 25, 22) },
    { n: { day: '2026-11-24' }, at: at(2026, 10, 25, 0, 30) }, // note d'hier, écrite après minuit
    { p: { name: 'B' }, at: at(2025, 2, 3) },
    null, { p: {}, at: NaN },
  ];
  const m = byDay(items);
  assert.equal(m.get('2026-11-25').length, 2);
  assert.equal(m.get('2026-11-24').length, 1);
  assert.equal(itemDay(items[2]), '2026-11-24');
  assert.equal(m.size, 3, 'une entrée sans date ne compte pas');
});

test('les flèches vont de la plus ancienne entrée au mois en cours, jamais dans le futur', () => {
  const now = new Date(2026, 10, 25);
  const r = monthRange(['2026-11-25', '2025-03-03', '2026-01-10'], now);
  assert.deepEqual(r, { min: { y: 2025, m: 2 }, max: { y: 2026, m: 10 } });
  assert.deepEqual(monthRange([], now), { min: { y: 2026, m: 10 }, max: { y: 2026, m: 10 } }, 'journal vide : le mois en cours seul');
  assert.deepEqual(addMonth({ y: 2026, m: 11 }, 1), { y: 2027, m: 0 });
  assert.deepEqual(addMonth({ y: 2026, m: 0 }, -1), { y: 2025, m: 11 });
  assert.deepEqual(clampMonth({ y: 2027, m: 3 }, r), r.max);
  assert.deepEqual(clampMonth({ y: 2020, m: 0 }, r), r.min);
  assert.ok(sameMonth({ y: 2026, m: 10 }, r.max));
  assert.equal(monthLabel({ y: 2026, m: 10 }), 'Novembre 2026');
  assert.equal(dayLabel('2026-11-25', now), 'Mercredi 25 novembre');
  assert.equal(dayLabel('2025-03-03', now), 'Lundi 3 mars 2025');
});

test('Mon Paris : le calendrier prend la place de la ligne « Mon journal », la liste reste en « Liste »', () => {
  const body = app.slice(app.indexOf('async function openMyParis('), app.indexOf('/* ---------- Mon planning : les sorties prévues'));
  assert.ok(body.includes('journalCalendar()'));
  assert.ok(!body.includes("'menu-title' }, 'Mon journal')"), 'plus de ligne « Mon journal »');
  assert.ok(body.indexOf('journalCalendar()') < body.indexOf("class: 'summary'"), 'en tête, avant les arrondissements');
  assert.match(app, /onclick: \(\) => openJournal\(\) \}, ico\('list'\), 'Liste'\)/);
  assert.match(app, /if \(from\) \{ myParisBack = from; calMonth = null; \}/, 'rouvert par un bouton : le mois en cours');
  assert.match(app, /disabled: prevOff \? '' : null/);
  assert.match(app, /disabled: nextOff \? '' : null/);
  assert.match(app, /onclick: \(\) => openCalDay\(c\.day, back\)/, 'un jour avec quelque chose s\'ouvre');
  assert.match(css, /\.cal-grid \{[^}]*grid-auto-rows: 46px/, 'cases de 46 px (45 de large à 360 px) : le mois entier se voit à l\'ouverture');
});

test('Mon Paris dans ⋯ Plus : jamais posé sur la carte tout seul, ni chez moi, ni chez un nouveau venu, ni par une préparation', () => {
  assert.deepEqual(MAP_TOOLS.slice(-4), ['myparis', 'crise', 'crue', 'locate']); // v490 : Mode crise entre Mon Paris et Ma position
  assert.ok(DEFAULT_MORE.includes('myparis') && NEW_IN_MORE.includes('myparis') && FRESH_TOOLS.moreTools.includes('myparis'));
  const mem = (v) => { let x = v; return { getItem: () => x, setItem: (_k, val) => { x = val; } }; };
  const mine = loadState(mem(JSON.stringify({ points: [], layoutV: 4, mapTools: ['vu', 'paris', 'metro', 'sorties', 'planning', 'pratique', 'velib', 'home', 'circuits', 'notes', 'locate'], moreTools: ['velib', 'home', 'circuits', 'notes'], hiddenTools: ['pratique'] })));
  assert.ok(mine.moreTools.includes('myparis'));
  assert.equal(mine.mapTools.at(-1), 'locate', 'Ma position reste en bas');
  assert.ok(loadState(mem(null)).moreTools.includes('myparis'));
  const old = { ...defaultPreset('Anne'), mapTools: ['vu', 'paris', 'locate', 'metro', 'sorties', 'planning', 'pratique', 'home', 'circuits', 'velib', 'notes'], moreTools: ['home', 'circuits', 'velib', 'notes'] };
  assert.ok(cleanPreset(old).moreTools.includes('myparis'), 'une préparation d\'avant la v426');
  assert.match(html, /<button type="button" id="btnMyParis" class="map-btn c-disc" aria-label="[^"]+">/);
  assert.ok(app.includes("document.getElementById('btnMyParis').addEventListener('click', () => openMyParis('map'));"));
  assert.match(app, /myparis: \{ el: 'btnMyParis', icon: 'map', name: '[^']+', short: 'Mon Paris' \}/);
  assert.ok(app.includes("row('map', 'Mon Paris', 'Planning, journal, arrondissements'" /* 1A du 25 nov. : sur une ligne */), 'le sous-titre de Réglages dit vrai');
});
