// v503 (mes choix 8 A et 23 A du 25 nov.) : la zone inondable du PPRI de Paris (crue de 1910), apportée par le robot
// (tools/maj-ppri.py → data/ppri.json) ; ⋯ Plus → Zones inondables, et toute seule en mode Crue ; « ici » et « chez toi »
// calculés sur le téléphone ; « Sortir de la zone inondable » : chemin à pied jusqu'à une rue à 50 m au moins hors zone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPpri, inPpri, ppriState, ppriOut, PPRI_EDGE_M } from '../js/crue.js';
import { readPlan, snap, routeOut } from '../js/rues.js';
import { MAP_TOOLS, DEFAULT_MORE, NEW_IN_MORE, loadState } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const wf = readFileSync(new URL('../.github/workflows/maj-donnees.yml', import.meta.url), 'utf8');
const verif = readFileSync(new URL('../tools/verif-donnees.py', import.meta.url), 'utf8');
const data = JSON.parse(readFileSync(new URL('../data/ppri.json', import.meta.url), 'utf8'));
const sq = (s, w, n, e) => [[s, w], [s, e], [n, e], [n, w]];

test('lecture : zones avec trous ; vide ou abîmé : rien', () => {
  const P = readPpri({ updated: '2026-12-01', zones: [[sq(48.85, 2.30, 48.86, 2.32), sq(48.854, 2.31, 48.856, 2.312)], 'x', [[[1, 'a']]]] });
  assert.equal(P.zones.length, 1);
  assert.equal(inPpri(P, 48.852, 2.305), true);
  assert.equal(inPpri(P, 48.855, 2.311), false, 'dans un trou : hors zone');
  assert.equal(inPpri(P, 48.87, 2.31), false);
  assert.equal(readPpri({ zones: [] }), null);
  assert.equal(readPpri(null), null);
  assert.equal(inPpri(null, 48.85, 2.3), null, 'zone inconnue : null, jamais « hors zone »');
  assert.equal(ppriState(null, 48.85, 2.3), null);
});

test('au bord : « au bord » à moins de 50 m, des deux côtés', () => {
  const P = readPpri({ zones: [[sq(48.85, 2.30, 48.86, 2.32)]] });
  assert.equal(PPRI_EDGE_M, 50);
  assert.equal(ppriState(P, 48.855, 2.31), 'in');
  assert.equal(ppriState(P, 48.8502, 2.31), 'edge');
  assert.equal(ppriState(P, 48.8498, 2.31), 'edge');
  assert.equal(ppriState(P, 48.8494, 2.31), 'out');
  assert.equal(ppriOut(P)(48.8498, 2.31), false, 'pour sortir, le bord ne compte pas comme dehors');
});

test('Sortir de la zone : le plus court chemin dans les rues jusqu\'à 50 m hors zone', () => {
  const plan = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));
  const Z = readPpri({ zones: [[sq(48.852, 2.340, 48.860, 2.365)]] }); // un rectangle autour de l'Hôtel de Ville
  const a = snap(plan, { lat: 48.8566, lng: 2.3522 });
  const r = routeOut(plan, a, ppriOut(Z));
  assert.ok(r && r.m > 300 && r.m < 1000, `${r?.m}`);
  assert.equal(ppriState(Z, ...r.line.at(-1)), 'out');
  assert.equal(ppriState(Z, ...r.line[0]), 'in');
  const out = snap(plan, { lat: 48.87, lng: 2.35 });
  assert.equal(routeOut(plan, out, ppriOut(Z)).already, true, 'déjà dehors');
  assert.equal(routeOut(plan, a, () => false, 2000), null, 'aucune sortie : null');
});

test('robot : Paris Data (zonage du PPRI), jamais bloquant ; fichier vide tant qu\'il n\'est pas passé', () => {
  assert.match(wf, /get \/tmp\/src\/ppri\.geojson "\$PARIS\/plub_pprizone\/exports\/geojson" \|\| rm -f/);
  assert.match(wf, /python3 -I tools\/maj-ppri\.py \/tmp\/src\/ppri\.geojson "\$TODAY"; \} \|\| echo "Zone inondable : fichier d'avant gardé"/);
  assert.match(wf, /data\/jardins-liens\.json data\/ppri\.json"/);
  assert.match(verif, /'data\/ppri\.json': \('zones', 1\)/);
  assert.ok(Array.isArray(data.zones));
  assert.match(data.source, /Paris Data, zonage du PPRI de la Seine, licence ODbL/);
  assert.match(sw, /'data\/ppri\.json'/);
});

test('⋯ Plus → Zones inondables, éteint au départ ; en gris, jamais en bleu ; toute seule en mode Crue', () => {
  assert.deepEqual(MAP_TOOLS.slice(-3), ['crise', 'crue', 'locate']);
  assert.ok(DEFAULT_MORE.includes('crue') && NEW_IN_MORE.includes('crue'));
  assert.equal(loadState({ getItem: () => null, setItem() {} }).showPpri, false);
  assert.match(html, /id="btnCrue" class="map-btn c-guide" aria-label="Zones inondables de la crue de 1910 sur la carte"/);
  assert.match(app, /const ppriShown = \(\) => state\.showPpri === true \|\| crisis\?\.k === 'crue';/);
  assert.match(css, /\.ppri-zone \{ stroke: var\(--ink\); stroke-opacity: \.35; fill: var\(--ink\); fill-opacity: \.10; \}/);
  assert.match(app, /La carte des zones inondables n\\'est pas encore dans l\\'appli\./);
  assert.match(app, /'Sortir de la zone inondable'\)/);
  assert.match(app, /zones selon la hauteur : Vigicrues/);
});
