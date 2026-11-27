// v450 : les trois grands cimetières (Père-Lachaise, Montparnasse, Montmartre) dans le calque « Jardins publics » ;
// données tenues à la main (data/cimetieres.json) : horaires et portes de paris.fr, tombes des plans officiels recoupées avec Wikidata.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { cleanCimetieres, cimHours, gateFor, gateUsable, tombPlace, tombHelp, shortWhat, wikiOf, sortTombs, EVACUATION_MIN } from '../js/cimetieres.js';
import { cleanJardins, jardinRecord, bigJardinNear, jardinKind } from '../js/jardins.js';
import { openState } from '../js/hours.js';
import { parseRecords } from '../js/pratique.js';
import { distanceM } from '../js/geo.js';

const raw = JSON.parse(readFileSync(new URL('../data/cimetieres.json', import.meta.url), 'utf8'));
const list = cleanCimetieres(raw);
const byId = Object.fromEntries(list.map((c) => [c.id, c]));
const at = (y, mo, d, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi);

test('cimetières : trois, chacun avec ses tombes, ses portes et sa source', () => {
  assert.deepEqual(list.map((c) => c.jid).sort(), ['ID129', 'ID130', 'ID154']);
  for (const c of list) {
    assert.ok(c.tombs.length >= 80, `${c.short} : ${c.tombs.length} tombes`);
    assert.equal(c.tombs.length, raw.items.find((x) => x.id === c.id).tombs.length, 'aucune tombe perdue au nettoyage');
    assert.ok(c.gates.length >= 1 && c.plan.startsWith('https://') && c.planSource);
  }
  assert.match(raw.source, /Wikidata/);
  assert.equal(EVACUATION_MIN, 15);
});

test('cimetières : chaque division, chaque porte et chaque tombe tombent dans le bon cimetière', () => {
  // centres relevés sur les plans : une division ou une porte à plus de 700 m de son cimetière serait une erreur de recopie
  const centre = { 'pere-lachaise': { lat: 48.8614, lng: 2.3936 }, montparnasse: { lat: 48.8381, lng: 2.3272 }, montmartre: { lat: 48.8875, lng: 2.3305 } };
  for (const c of list) {
    for (const [n, p] of c.div) assert.ok(distanceM(centre[c.id], p) < 700, `${c.short}, division ${n}`);
    for (const g of c.gates) assert.ok(distanceM(centre[c.id], g) < 700, `${c.short}, ${g.name}`);
    for (const t of c.tombs) assert.ok(tombPlace(c, t), `${t.name} : division ${t.div} sans position`);
  }
  assert.equal(byId['pere-lachaise'].div.size, 97);
  assert.equal(byId.montparnasse.div.size, 30);
  assert.equal(byId.montmartre.div.size, 33);
});

test('cimetières : les tombes vérifiées (division du plan officiel = Wikidata), les conflits retirés', () => {
  const find = (id, n) => byId[id].tombs.find((t) => t.name === n);
  assert.equal(find('pere-lachaise', 'Frédéric Chopin').div, 11);
  assert.equal(find('pere-lachaise', 'Jim Morrison').div, 6);
  assert.equal(find('pere-lachaise', 'Édith Piaf').div, 97);
  assert.equal(find('montparnasse', 'Serge Gainsbourg').div, 1);
  assert.equal(find('montmartre', 'Dalida').div, 18);
  // divisions contradictoires (plan 95 / Wikidata 88 ; plan 62 / Wikidata 71) : retirées plutôt qu'une division fausse
  assert.equal(find('pere-lachaise', 'Georges Moustaki'), undefined);
  assert.equal(find('pere-lachaise', 'Yılmaz Güney'), undefined);
  // années contradictoires : pas d'années
  assert.equal(find('pere-lachaise', 'Marie Laurencin').years, undefined);
  assert.equal(find('pere-lachaise', 'Oscar Wilde').years, '1854-1900');
  // Zola est au Panthéon : pas dans la liste de Montmartre
  assert.ok(!byId.montmartre.tombs.some((t) => /Zola/.test(t.name)));
  // Wikipédia par l'identifiant Wikidata, jamais par le nom ; pas pour un couple ni une famille
  assert.equal(wikiOf(find('pere-lachaise', 'Frédéric Chopin')), 'https://www.wikidata.org/wiki/Special:GoToLinkedPage/frwiki/Q1268');
  assert.equal(wikiOf(find('pere-lachaise', 'Héloïse et Abélard')), '');
  assert.ok(list.every((c) => c.tombs.every((t) => !t.q || /^Q\d+$/.test(t.q))));
});

test('cimetières : horaires de la saison relevée seulement, le dimanche ouvert (pas les horaires du bureau)', () => {
  const pl = byId['pere-lachaise'];
  assert.equal(cimHours(pl, at(2027, 3, 16)), '', 'après le 15 mars : pas d\'horaires plutôt que des horaires faux');
  assert.equal(cimHours(pl, at(2026, 11, 5)), '');
  const h = cimHours(pl, at(2026, 11, 29)); // un dimanche
  assert.ok(h);
  assert.equal(openState(h, at(2026, 11, 29, 10, 0))?.open, true, 'ouvert le dimanche à 10 h');
  assert.equal(openState(h, at(2026, 11, 29, 8, 30))?.open, false, 'pas avant 9 h le dimanche');
  assert.equal(openState(h, at(2026, 11, 25, 17, 45))?.open, false, 'fermé à 17 h 45');
  assert.equal(openState(h, at(2026, 11, 25, 8, 5))?.open, true, 'ouvert à 8 h 05 en semaine');
  // Montmartre : jours fériés aux horaires du dimanche (sa page le dit) ; ailleurs, inconnus
  assert.equal(openState(cimHours(byId.montmartre, at(2026, 12, 25)), at(2026, 12, 25, 10, 0))?.open, true);
});

test('cimetières : Y aller, la porte la plus proche ouverte à cette heure', () => {
  const pl = byId['pere-lachaise'];
  const amandiers = pl.gates.find((g) => /Amandiers/.test(g.name));
  const reunion = pl.gates.find((g) => /Réunion/.test(g.name));
  assert.equal(gateUsable(amandiers, at(2026, 11, 25, 9, 30)), false);
  assert.equal(gateUsable(amandiers, at(2026, 11, 25, 11, 0)), true);
  assert.equal(gateUsable(amandiers, at(2026, 11, 25, 17, 0)), false);
  assert.equal(gateUsable(reunion, at(2027, 4, 1)), false, 'fermée du 26 mars au 19 avril');
  const nextTo = { lat: amandiers.lat + 0.0001, lng: amandiers.lng };
  assert.equal(gateFor(pl, nextTo, at(2026, 11, 25, 11, 0)).name, 'Porte des Amandiers');
  assert.notEqual(gateFor(pl, nextTo, at(2026, 11, 25, 9, 0)).name, 'Porte des Amandiers', 'fermée à 9 h : une autre');
  assert.equal(gateFor(pl, null).name, 'Porte principale', 'sans position, la porte principale');
});

test('cimetières : une tombe mène au milieu de sa division, au columbarium pour une case', () => {
  const pl = byId['pere-lachaise'];
  const chopin = pl.tombs.find((t) => t.name === 'Frédéric Chopin');
  assert.match(tombHelp(pl, chopin), /milieu de la division 11, pas à la tombe : environ 70 m de côté/);
  const callas = pl.tombs.find((t) => t.name === 'Maria Callas');
  assert.match(tombHelp(pl, callas), /columbarium/);
  assert.equal(shortWhat({ what: 'Écrivain, critique littéraire et critique d\'art' }), 'Écrivain');
  assert.equal(shortWhat({ what: 'Compositeur italien (« Norma »)' }), 'Compositeur italien');
});

test('cimetières : liste par ordre alphabétique du nom de famille, ou par distance dans le cimetière', () => {
  const pl = byId['pere-lachaise'];
  const abc = sortTombs(pl, pl.tombs).map(({ t }) => t.key);
  assert.deepEqual(abc, [...abc].sort((a, b) => a.localeCompare(b, 'fr')));
  assert.equal(sortTombs(pl, pl.tombs)[0].d, null, 'pas de minutes hors du cimetière');
  const near = sortTombs(pl, pl.tombs, tombPlace(pl, pl.tombs.find((t) => t.name === 'Jim Morrison')));
  assert.equal(near[0].t.div, 6);
  assert.ok(near.every((x, i) => i === 0 || x.d >= near[i - 1].d));
});

test('cimetières : jamais les horaires du jeu de la Ville, jamais un « grand jardin », jamais un parc de Fontaine et WC', () => {
  const j = cleanJardins({ items: [{ id: 'ID154', n: 'CIMETIERE DE L\'EST PARISIEN DIT DU PÈRE LACHAISE', t: 'c', c: [48.8614, 2.3936], s: [[[48.858, 2.388], [48.864, 2.388], [48.864, 2.400], [48.858, 2.400]]], big: 1 }] });
  assert.equal(jardinKind(j[0]), 'Cimetière');
  assert.equal(jardinRecord(j[0], [{ id: 'ID154', hours: 'Mo-Fr 08:30-12:30' }]), null, 'les horaires du jeu sont ceux du bureau');
  assert.equal(bigJardinNear(j, { lat: 48.8614, lng: 2.3936 }, { parks: [{ id: 'ID154', hours: '24/7' }] }), null);
  const recs = parseRecords([
    { identifiant: 'ID154', nom: 'CIMETIERE DE L\'EST', type: 'Cimetières', geo_point_2d: { lat: 48.86, lon: 2.39 }, horaires_lundi: '08h30 - 12h30' },
    { identifiant: 'ID1', nom: 'SQUARE DU TEMPLE', type: 'Promenades ouvertes', geo_point_2d: { lat: 48.86, lon: 2.36 } },
  ], 'fraisParcs');
  assert.deepEqual(recs.map((r) => r.id), ['ID1']);
});

const py = (args) => spawnSync('python3', ['-I', 'tools/maj-jardins.py', ...args], { encoding: 'utf8' });
const hasPython = spawnSync('python3', ['-V']).status === 0;
test('robot des jardins : les trois grands cimetières gardés pour leur contour, les autres non', { skip: !hasPython }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'cim-'));
  const sq = (h) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[2.39 - h, 48.86 - h], [2.39 + h, 48.86 - h], [2.39 + h, 48.86 + h], [2.39 - h, 48.86 + h], [2.39 - h, 48.86 - h]]] } });
  const rec = (id, type, h = 0.002) => ({ identifiant: id, nom: `NOM ${id}`, type, geo_point_2d: { lat: 48.86, lon: 2.39 }, geo_shape: sq(h) });
  writeFileSync(join(dir, 'src.json'), JSON.stringify([rec('ID154', 'Cimetières'), rec('ID130', 'Cimetières'), rec('ID129', 'Cimetières'), rec('ID99', 'Cimetières'), rec('ID1', 'Promenades ouvertes')]));
  const out = join(dir, 'j.json');
  const r = py([join(dir, 'src.json'), '2026-11-25', '1', out]);
  assert.equal(r.status, 0, r.stderr);
  const items = JSON.parse(readFileSync(out, 'utf8')).items;
  assert.deepEqual(items.map((x) => `${x.id}:${x.t}${x.big ? ':grand' : ''}`), ['ID1:j:grand', 'ID129:c', 'ID130:c', 'ID154:c']);
  assert.deepEqual(cleanJardins({ items }).filter((x) => x.kind === 'c').map((x) => x.id), ['ID129', 'ID130', 'ID154']);
});

test('cimetières : branchés dans l\'appli (calque, page, cache hors ligne)', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'js/cimetieres.js'"));
  assert.ok(!sw.includes("'data/cimetieres.json'"), 'lu seulement quand le calque est allumé');
  assert.match(app, /\(j\.kind === 'c' \? openCimetiere : openJardin\)\(j\)/);
  assert.match(app, /j\.kind === 'c' \? cimHours\(cimOf\(j\)\)/);
});

test('v454 : numéros des divisions sur la carte, de près seulement, jamais avec ceux des arrondissements', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(app, /const CIM_NUM_ZOOM = 17;/);
  assert.match(app, /mapEl\.classList\.toggle\('z-far', z < 15\)/, 'les numéros d\'arrondissement : seulement en dessous du zoom 15');
  assert.match(app, /if \(!state\.showJardins && cimHi\?\.id !== c\.id\) continue;/, 'calque allumé, ou le cimetière de la tombe ouverte');
  assert.match(app, /cimHi = \{ id: c\.id, div: t\.div \}; drawCimNums\(\);/);
  assert.match(app, /onClose: \(\) => \{ if \(cimHi\?\.id === c\.id && cimHi\.div === t\.div\) \{ cimHi = null; drawCimNums\(\); \} \}/);
  assert.match(css, /\.div-num \{[^}]*color: var\(--muted\)/, 'gris, sans pastille');
  assert.match(css, /\.div-num\.div-off \{ visibility: hidden; \}/);
});

// v545 (mon choix 1A du 27 nov. 2026) : la fleur et le nom des cimetières, Jardins publics allumé, du zoom 12 au zoom 16.
test('repère des cimetières : calque allumé, zooms 12 à 16 seulement', async () => {
  const { cimMarkShown, CIM_MARK_MIN_ZOOM, CIM_MARK_MAX_ZOOM } = await import('../js/cimetieres.js');
  assert.equal(CIM_MARK_MIN_ZOOM, 12); assert.equal(CIM_MARK_MAX_ZOOM, 16);
  for (const z of [12, 13, 14, 15, 16, 16.5]) assert.equal(cimMarkShown(z, true), true, `zoom ${z}`);
  for (const z of [11, 11.9, 17, 18]) assert.equal(cimMarkShown(z, true), false, `zoom ${z} : de trop loin, ou les numéros des divisions`);
  assert.equal(cimMarkShown(14, false), false, 'calque éteint : rien');
  assert.equal(cimMarkShown(NaN, true), false);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function drawJardinLayer\(\) \{\n  jardinLayer\.clearLayers\(\);\n  drawCimMarks\(\);/, 'dessinés avec le calque, effacés avec lui');
  assert.match(app, /openCimetiere\(j\)/, 'un appui ouvre la page du cimetière');
  assert.equal(/Vert clair : ouverts maintenant, en zoomant/.test(app), false, 'la petite ligne nomme les cimetières');
});
