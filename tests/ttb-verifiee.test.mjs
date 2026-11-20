// TTB « encore ouvert ? » (v218) : une adresse vérifiée par moi porte une marque « ok », datée, qui vaut 6 mois.
// Elle ne cache pas l'adresse (seules « closed » et « hidden » la retirent) et suit les autres marques dans la sauvegarde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ttbKey, cleanTtbMarks, ttbMark, ttbState, ttbCheckedAt, ttbCheckEnd, ttbCounts, ttbQueue, ttbExport, ttbMerge, TTB_CHECK_DAYS } from '../js/ttb.js';

const DAY = 864e5;
const NOW = Date.UTC(2026, 10, 19, 12);
const item = (name, arr = 9) => ({ name, rub: 'La Table', cuisine: '', address: `1 rue d'Essai, 750${String(arr).padStart(2, '0')} Paris`, arr, budget: 2, url: '', hours: [], lat: 48.87, lng: 2.34 });
const mark = (x, k, daysAgo) => ({ [ttbKey(x)]: { n: x.name, k, at: NOW - daysAgo * DAY } });

test('TTB vérifiée : la marque « ok » est gardée et ne cache pas l\'adresse', () => {
  const a = item('A');
  const marks = cleanTtbMarks({ ...mark(a, 'ok', 3), ...mark(item('B'), 'peut-être', 1) });
  assert.equal(Object.keys(marks).length, 1, 'une sorte de marque inconnue est écartée');
  assert.equal(ttbMark(marks, a), '', '« ok » n\'est ni fermée ni masquée : l\'adresse reste sur la carte');
  assert.equal(ttbCheckedAt(marks, a), NOW - 3 * DAY);
  assert.equal(ttbCheckedAt(mark(a, 'closed', 3), a), 0);
  assert.equal(ttbMark(mark(a, 'closed', 3), a), 'closed');
});

test('TTB vérifiée : 6 mois, puis « à revoir » ; jamais vérifiée, fermée ou masquée', () => {
  const a = item('A');
  assert.equal(TTB_CHECK_DAYS, 183);
  assert.equal(ttbState({}, a, NOW), 'no');
  assert.equal(ttbState(mark(a, 'ok', 0), a, NOW), 'ok');
  assert.equal(ttbState(mark(a, 'ok', 182), a, NOW), 'ok');
  assert.equal(ttbState(mark(a, 'ok', 183), a, NOW), 'old', 'au bout de 183 jours, la marque ne vaut plus');
  assert.equal(ttbState(mark(a, 'ok', 400), a, NOW), 'old');
  assert.equal(ttbState(mark(a, 'closed', 1), a, NOW), '');
  assert.equal(ttbState(mark(a, 'hidden', 1), a, NOW), '');
  assert.equal(ttbCheckEnd(NOW), NOW + 183 * DAY);
});

test('TTB vérifiée : le compteur (vérifiées, fermées, à voir) ne compte pas les masquées', () => {
  const [a, b, c, d, e] = ['A', 'B', 'C', 'D', 'E'].map((n) => item(n));
  const marks = { ...mark(a, 'ok', 10), ...mark(b, 'ok', 300), ...mark(c, 'closed', 2), ...mark(d, 'hidden', 2) };
  assert.deepEqual(ttbCounts([a, b, c, d, e], marks, NOW), { ok: 1, closed: 1, todo: 2 }, 'B (vérifiée il y a 300 jours) et E sont à voir');
  assert.deepEqual(ttbCounts([], {}, NOW), { ok: 0, closed: 0, todo: 0 });
});

test('TTB vérifiée : la file « à voir », par arrondissement puis par nom, sans les adresses passées', () => {
  const list = [item('Zoé', 2), item('Élan', 10), item('Abri', 10), item('Vue', 9), item('Fermée', 1), item('Faite', 1)];
  const marks = { ...mark(list[4], 'closed', 1), ...mark(list[5], 'ok', 5), ...mark(list[3], 'ok', 200) };
  assert.deepEqual(ttbQueue(list, marks, new Set(), NOW).map((x) => x.name), ['Zoé', 'Vue', 'Abri', 'Élan']);
  assert.deepEqual(ttbQueue(list, marks, new Set([ttbKey(list[0])]), NOW).map((x) => x.name), ['Vue', 'Abri', 'Élan'], '« Passer » la retire le temps de la session');
  assert.equal(list[0].name, 'Zoé', 'la liste reçue n\'est pas modifiée');
});

test('TTB vérifiée : la marque part dans la sauvegarde et revient', () => {
  const a = item('A');
  const file = ttbExport({ items: [a], date: '2026-11-01' }, mark(a, 'ok', 4));
  assert.equal(file.marks[ttbKey(a)].k, 'ok');
  const r = ttbMerge({ data: null, marks: {} }, file);
  assert.equal(ttbState(r.marks, a, NOW), 'ok');
  assert.equal(r.newMarks, 1);
});

test('TTB vérifiée, fusion : ma vérification cède à une nouvelle plus récente (vérifiée ou fermée), jamais à une plus ancienne ni à « masquée »', () => {
  const a = item('A');
  const merge = (mine, theirs) => ttbMerge({ data: null, marks: mine }, { ttb: 1, items: [], marks: theirs }).marks[ttbKey(a)];
  assert.equal(merge(mark(a, 'ok', 30), mark(a, 'ok', 2)).at, NOW - 2 * DAY, 'vérifiée plus récemment par un proche');
  assert.equal(merge(mark(a, 'ok', 2), mark(a, 'ok', 30)).at, NOW - 2 * DAY, 'la mienne est plus récente : elle reste');
  assert.equal(merge(mark(a, 'ok', 30), mark(a, 'closed', 2)).k, 'closed', 'trouvée fermée depuis');
  assert.equal(merge(mark(a, 'ok', 2), mark(a, 'closed', 30)).k, 'ok', 'fermée notée avant ma vérification : la mienne reste');
  assert.equal(merge(mark(a, 'ok', 30), mark(a, 'hidden', 2)).k, 'ok', '« masquée » chez un proche ne remplace pas ma vérification');
  assert.equal(merge(mark(a, 'closed', 30), mark(a, 'ok', 2)).k, 'closed', 'ma marque « fermée » reste (règle d\'avant)');
  assert.equal(merge(mark(a, 'hidden', 30), mark(a, 'ok', 2)).k, 'hidden');
});

// v262 (mes choix du 20 nov.) : l'interrupteur « Seulement les vérifiées » ne garde que les adresses vérifiées depuis moins de 6 mois, partout.
test('TTB Seulement les vérifiées : allumé, seules les adresses vérifiées depuis moins de 6 mois restent', async () => {
  const { ttbOnlyOk } = await import('../js/ttb.js');
  const [a, b, c, d] = ['A', 'B', 'C', 'D'].map((n) => item(n));
  const marks = { ...mark(a, 'ok', 10), ...mark(b, 'ok', 200), ...mark(c, 'ok', 182) };
  assert.deepEqual(ttbOnlyOk([a, b, c, d], marks, true, NOW).map((x) => x.name), ['A', 'C'], 'B (à revoir) et D (jamais vérifiée) s\'en vont');
  assert.deepEqual(ttbOnlyOk([a, b, c, d], marks, false, NOW).map((x) => x.name), ['A', 'B', 'C', 'D'], 'éteint : rien ne change');
  assert.deepEqual(ttbOnlyOk(null, marks, true, NOW), []);
});

test('TTB Seulement les vérifiées : l\'interrupteur est gardé d\'un jour à l\'autre et dans les réglages de la sauvegarde', async () => {
  const { readFileSync } = await import('node:fs');
  const store = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
  assert.equal((store.match(/ttbOk: (obj|state|o)\.ttbOk === true/g) ?? []).length, 4, 'relu, enregistré, mis dans la sauvegarde et relu de la sauvegarde');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /const ttbHere = \(\) => ttbOnlyOk\(/, 'la carte, la liste, Autour de moi et la loupe passent par ttbHere');
  assert.match(app, /role: 'switch', 'aria-checked': String\(Boolean\(state\.ttbOk\)\)/, 'un interrupteur qui dit l\'état réel (v262, mon choix B)');
  assert.match(app, /'Seulement les vérifiées'\), el\('span', \{ class: 'menu-sub' \}, sub\)/, 'sa petite ligne est reçue d\'appel (le compteur : test v278 ci-dessous)');
});

// v278 (ta demande du 20 nov.) : le même interrupteur « Seulement les vérifiées » dans Réglages → TTB, à la place du compteur de « Encore ouvertes ? ».
test('TTB, Seulement les vérifiées : le même interrupteur dans la liste TTB et dans Réglages → TTB (v278)', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const body = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start)));
  assert.match(body('const ttbOkSwitch', '\n\n'), /state\.ttbOk = !state\.ttbOk; persist\(\); drawTtb\(\); again\(\);/);
  assert.match(body('function openTtb(', '\n}\n'), /n \? ttbOkSwitch\(ttbCountText\(\), again\) : null/, 'Réglages → TTB a l\'interrupteur, avec le compteur pour petite ligne');
  assert.doesNotMatch(body('function openTtb(', '\n}\n'), /el\('p', \{\}, ttbCountText\(\)\)/, 'le compteur seul ne reste pas en double');
  assert.match(body('function openTtbList(', '\n}\n'), /ttbOkSwitch\(ttbCountText\(/, 'la liste TTB garde le même interrupteur');
});
