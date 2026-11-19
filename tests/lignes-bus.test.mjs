// Mes lignes de bus (v228, mes choix du 19 nov. 2026 : 1A 2A 3A 4A, ajout et retrait immédiats).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanBusLines, addBusLine, removeBusLine, cleanTraces, keepTraces, tracesDue, searchBusLines, linesAtStop,
  passesNear, busLineSub, refsText, labelSpots, dayText, BUS_LINES_MAX, stopMarks, cleanStops } from '../js/buslines.js';
import { loadState, saveState, exportJSON, exportForFriend, mergeImport, backupHash, readSettings, SEND_DEFAULT, FILTER_KEYS } from '../js/store.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
// Deux vraies lignes simplifiées (formes du fichier du robot)
const L38 = { id: 'C01083', ref: '38', op: 'RATP', c: '#0055C8', t: '#FFFFFF', v: ['Paris'], p: [[[48.8975, 2.3592], [48.8759, 2.3581], [48.8235, 2.3253]]], s: [[48.87592, 2.35795, 0], [48.87588, 2.35828, 0], [48.8600, 2.3480, 1]] };
const L26 = { id: 'C01076', ref: '26', op: 'RATP', c: '#FF5A00', t: '#000000', v: ['Paris'], p: [[[48.8757, 2.3273], [48.8480, 2.3960]]] };
const L1A = { id: 'C00189', ref: '1', op: 'Transdev', c: '#00814F', t: '#FFFFFF', v: ['Le Blanc-Mesnil'], p: [[[48.94, 2.46], [48.95, 2.50]]] };
const L1B = { id: 'C01826', ref: '1', op: 'Mobicité', c: '#FF0000', t: '#FFFFFF', v: ['Rosny-sous-Bois'], p: [[[48.87, 2.48], [48.88, 2.49]]] };
const L100 = { id: 'C01999', ref: '100', op: 'X', c: '#123456', t: '#FFFFFF', v: [], p: [[[48.8, 2.3], [48.81, 2.31]]] };
const FILE = { source: 'IDFM', updated: '2026-11-01', data: '2026-09-07', names: ['Gare de l\'Est', 'Châtelet'], lines: [L1A, L1B, L26, L38, L100] };
const mine = (...ls) => ls.map(({ p, s: _s, ...l }) => l);

test('cleanBusLines : vérifiées, sans tracé, sans doublon, 8 au plus', () => {
  assert.equal(BUS_LINES_MAX, 8);
  assert.deepEqual(cleanBusLines([L38]), mine(L38), 'le tracé ne reste pas dans mes lignes');
  assert.deepEqual(cleanBusLines([L38, L38, { id: 'x', ref: '1' }, { id: 'C00001' }, null]), mine(L38));
  assert.equal(cleanBusLines([{ ...L38, c: 'red', t: '<b>' }])[0].c, '#1B56E8');
  assert.equal(cleanBusLines(Array.from({ length: 12 }, (_, i) => ({ ...L38, id: `C0${1000 + i}` }))).length, 8);
  assert.deepEqual(addBusLine([], L38), mine(L38));
  assert.deepEqual(addBusLine(mine(L38), L38), mine(L38), 'déjà là : rien ne change');
  assert.deepEqual(removeBusLine(mine(L38, L26), 'C01083'), mine(L26));
});

test('tracés gardés : seulement mes lignes, une ligne disparue est notée, redemandés après 32 jours', () => {
  const k = keepTraces(FILE, mine(L38, L26, { ...L38, id: 'C09999', ref: '999' }));
  assert.deepEqual(Object.keys(k.lines).sort(), ['C01076', 'C01083']);
  assert.deepEqual(k.missing, ['C09999']);
  assert.equal(k.updated, '2026-11-01');
  assert.equal(k.data, '2026-09-07');
  const now = Date.parse('2026-11-19T12:00:00');
  assert.equal(tracesDue(k, mine(L38), now), false);
  assert.equal(tracesDue(k, mine(L38, { ...L38, id: 'C09999' }), now), false, 'une ligne absente du fichier ne le fait pas redemander à chaque ouverture');
  assert.equal(tracesDue(k, mine(L38, L1A), now), true, 'une nouvelle ligne : tracé à chercher');
  assert.equal(tracesDue(k, mine(L38), Date.parse('2026-12-05T12:00:00')), true);
  assert.equal(tracesDue(null, [], now), false, 'pas de ligne : rien à télécharger');
  assert.deepEqual(cleanTraces({ lines: { C01083: [[[91, 2], [48, 2]]], bad: L38.p } }).lines, {});
});

test('arrêts (v233) : gardés avec leur nom pour mes lignes ; une copie de la v229, sans arrêts, se redemande une fois', () => {
  const k = keepTraces(FILE, mine(L38, L26));
  assert.equal(k.sv, 1);
  assert.deepEqual(k.stops.C01083, [[48.87592, 2.35795, 'Gare de l\'Est'], [48.87588, 2.35828, 'Gare de l\'Est'], [48.86, 2.348, 'Châtelet']]);
  assert.equal(k.stops.C01076, undefined, 'ligne sans arrêt connu : rien');
  const now = Date.parse('2026-11-19T12:00:00');
  const old = { updated: '2026-11-19', data: '2026-09-07', lines: { C01083: L38.p } }; // copie gardée par la v229
  assert.equal(tracesDue(old, mine(L38), now), true, 'redemandée une fois pour avoir les arrêts');
  assert.equal(tracesDue(k, mine(L38), now), false);
  const sansNoms = keepTraces({ ...FILE, names: undefined }, mine(L38));
  assert.equal(sansNoms.sv, 0, 'fichier sans arrêts');
  assert.deepEqual(sansNoms.stops, {});
  assert.deepEqual(stopMarks(k.stops.C01083).map((q) => q.name), ['Gare de l\'Est', '', 'Châtelet'], 'le nom une fois par arrêt');
  assert.deepEqual(cleanStops([[91, 2, 'x'], 'x', [48.8, 2.3, 7]]), [[48.8, 2.3, '']]);
});

test('chercher par numéro : exact d\'abord, puis ceux qui commencent pareil ; les deux « 1 » restent distincts', () => {
  assert.deepEqual(searchBusLines(FILE, '1').map((l) => l.id), ['C00189', 'C01826', 'C01999']);
  assert.deepEqual(searchBusLines(FILE, ' 38 ').map((l) => l.id), ['C01083']);
  assert.deepEqual(searchBusLines(FILE, ''), []);
  assert.equal(busLineSub(L1A), 'Transdev · Le Blanc-Mesnil');
  assert.equal(busLineSub({ op: 'X', v: [] }), 'X');
});

test('lignes de mon arrêt : même numéro ET tracé à moins de 80 m de l\'arrêt', () => {
  const gareEst = { lat: 48.8759, lng: 2.3581 };
  assert.deepEqual(linesAtStop(FILE, gareEst, ['38', '26', '1']).map((l) => l.id), ['C01083']);
  assert.equal(passesNear(L38.p, { lat: 48.8867, lng: 2.3587 }, 80), true, 'entre deux sommets : le milieu compte');
  assert.equal(passesNear(L26.p, gareEst, 80), false);
  assert.deepEqual(linesAtStop(FILE, null, ['38']), []);
});

test('textes : numéros, date, pastilles', () => {
  assert.equal(refsText(mine(L38)), '38');
  assert.equal(refsText(mine(L38, L26)), '38 et 26');
  assert.equal(refsText(mine(L38, L26, L1A)), '38, 26 et 1');
  assert.equal(dayText('2026-09-07'), '7 septembre 2026');
  assert.equal(dayText('2026-03-01'), '1er mars 2026');
  assert.equal(dayText('x'), '');
  assert.equal(labelSpots(L38.p).length, 2);
  assert.deepEqual(labelSpots([]), []);
});

test('sauvegarde : mes lignes partent et reviennent, sans tracé, jamais chez un proche ; empreinte d\'avant inchangée', () => {
  const st = memStorage();
  const s = { ...loadState(st), busLines: mine(L38, L26), showBusLines: true };
  saveState(st, s);
  const r = loadState(st);
  assert.deepEqual(r.busLines, mine(L38, L26));
  assert.equal(r.showBusLines, true);
  const file = JSON.parse(exportJSON(r));
  assert.deepEqual(file.busLines, mine(L38, L26));
  assert.equal(JSON.stringify(file).includes('48.8975'), false, 'pas de tracé dans la sauvegarde');
  assert.equal(readSettings(file).showBusLines, true);
  assert.equal(JSON.stringify(exportForFriend(r, SEND_DEFAULT)).includes('C01083'), false);
  const empty = loadState(memStorage());
  const text = exportJSON(r);
  assert.deepEqual(mergeImport(empty, text).state.busLines, mine(L38, L26));
  assert.deepEqual(mergeImport(empty, text, 'Anne').state.busLines, [], 'le fichier d\'un proche n\'apporte pas ses lignes');
  assert.deepEqual(mergeImport({ ...empty, busLines: mine(L1A) }, text).state.busLines, mine(L1A, L38, L26));
  assert.equal(backupHash({ ...empty, busLines: [] }), backupHash(empty), 'sans ligne, l\'empreinte des sauvegardes d\'avant ne change pas');
  assert.notEqual(backupHash({ ...empty, busLines: mine(L38) }), backupHash(empty));
  assert.equal(backupHash({ ...empty, busLines: mine(L38), showBusLines: true }), backupHash({ ...empty, busLines: mine(L38) }), 'afficher ou masquer n\'est pas un changement à sauvegarder');
  assert.equal(JSON.stringify(exportJSON(empty)).includes('busLines'), false);
});

test('appli : ligne de Filtres gardée, tracés téléchargés en entier (GitHub ne sait pas lesquelles), hors de la copie sans réseau', () => {
  assert.ok(FILTER_KEYS.includes('buslines'));
  const app = src('js/app.js');
  assert.match(app, /fetch\('data\/bus-traces\.json'\)/);
  assert.doesNotMatch(app, /bus-traces\.json\?/, 'jamais de numéro de ligne dans l\'adresse');
  assert.doesNotMatch(src('sw.js'), /bus-traces\.json/, 'trop lourd pour la copie sans réseau : seules mes lignes sont gardées');
  assert.match(src('sw.js'), /'js\/buslines\.js'/);
  assert.match(app, /carte-paris\.bus-traces/);
});
