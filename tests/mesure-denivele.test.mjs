import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPlan } from '../js/rues.js';
import { resample, onBridges, fillBridges, climbs, phrase, query, igAltitudes, measureTrip, readBridges, TRIPS, BBOX, table }
  from '../tools/mesure-denivele.mjs';

// tools/mesure-denivele.mjs (24 nov. 2026, mes choix 2A 3A 4A) : une mesure pour le journal du robot, jamais bloquante,
// rien d'écrit dans data/. Elle dira si « ça monte de 40 m » peut s'afficher sans être faux.

const KY = 111_320;
const north = (m) => m / KY; // degrés de latitude pour m mètres

test('dénivelé : un point tous les 10 m le long du chemin, bouts compris', () => {
  const line = [[48.85, 2.35], [48.85 + north(95), 2.35]];
  const pts = resample(line);
  assert.equal(pts.length, 11); // 0, 10, … 90, puis le bout à 95 m
  assert.deepEqual(pts[0], line[0]);
  assert.deepEqual(pts.at(-1), line[1]);
  assert.ok(Math.abs((pts[1][0] - pts[0][0]) * KY - 10) < 0.01);
  assert.equal(resample([[48.85, 2.35]]).length, 1);
});

test('dénivelé : un pont prend l\'altitude de ses deux bouts (le modèle de l\'IGN donne l\'eau dessous)', () => {
  // Mesuré le 24 nov. 2026 (Châtelet → Saint-Michel) : quai 36 m, Pont au Change 26,85 m (la Seine), île 34 m.
  const alts = [36, 36, 35.2, 29.3, 26.85, 26.85, 26.85, 28, 35, 34.8, 34.6, 34.8, 26.86, 26.85, 34.9, 35.1];
  const flags = [false, false, false, true, true, true, true, true, false, false, false, false, true, true, false, false];
  const fixed = fillBridges(alts, flags);
  assert.equal(fixed[0], 36);
  for (let i = 3; i <= 7; i++) assert.ok(fixed[i] <= 35.2 && fixed[i] >= 35, `point ${i} : ${fixed[i]}`);
  assert.equal(phrase(climbs(alts).upN), 'ça monte de 20 m'); // sans traitement : faux (route plate)
  assert.equal(phrase(climbs(fixed).upN), '');
  // altitude absente : traitée comme un pont ; un pont au bout : le dernier point connu ; tout inconnu : null
  assert.deepEqual(fillBridges([10, null, 12], [false, false, false]), [10, 11, 12]);
  assert.deepEqual(fillBridges([10, 20, 30], [false, true, true]), [10, 10, 10]);
  assert.equal(fillBridges([null, 5], [false, true]), null);
});

test('dénivelé : les ponts et tunnels lus d\'OpenStreetMap, un point à 12 m au plus est « sur le pont »', () => {
  const json = { elements: [{ type: 'way', id: 1, geometry: [{ lat: 48.8565, lon: 2.3470 }, { lat: 48.8555, lon: 2.3465 }] },
    { type: 'node', id: 2, lat: 1, lon: 2 }, { type: 'way', id: 3, geometry: [{ lat: 48.86 }] }] };
  const br = readBridges(json);
  assert.equal(br.length, 1);
  const flags = onBridges([[48.8560, 2.34675], [48.8560, 2.34675 + 8 / 73_000], [48.8560, 2.34675 + 30 / 73_000]], br);
  assert.deepEqual(flags, [true, true, false]);
  assert.deepEqual(readBridges('pas du json'), []);
});

test('dénivelé : le bruit du modèle (moins de 2 m) ne compte pas, une vraie montée compte en entier', () => {
  const wiggle = Array.from({ length: 50 }, (_, i) => 40 + (i % 2 ? 0.9 : 0));
  assert.equal(climbs(wiggle).upN, 0);
  assert.ok(climbs(wiggle).up > 20); // la somme brute, elle, gonfle
  const ramp = Array.from({ length: 31 }, (_, i) => 70 + i * 1.8); // +54 m, Anvers → Sacré-Cœur mesuré : +56 m
  assert.ok(Math.abs(climbs(ramp).upN - 54) < 1e-9);
  const upDown = [50, 60, 70, 59, 60.5, 50]; // remonter de 1,5 m : du bruit
  const c = climbs(upDown);
  assert.equal(c.upN, 20);
  assert.equal(c.downN, 20);
});

test('dénivelé : règle 4A, la montée seule, à partir de 15 m, arrondie à 10 m', () => {
  assert.equal(phrase(14.9), '');
  assert.equal(phrase(15), 'ça monte de 20 m');
  assert.equal(phrase(44), 'ça monte de 40 m');
  assert.equal(phrase(56.3), 'ça monte de 60 m');
  assert.equal(phrase(NaN), '');
});

test('dénivelé : altitudes de l\'IGN par paquets de 100, sans donnée = null, réponse fausse = erreur', async () => {
  const calls = [];
  const fakeFetch = async (u) => {
    calls.push(String(u));
    const n = new URL(u).searchParams.get('lat').split('|').length;
    return { ok: true, json: async () => ({ elevations: Array.from({ length: n }, (_, i) => (i === 0 ? -99999 : 30)) }) };
  };
  const pts = Array.from({ length: 230 }, (_, i) => [48.85 + i * 1e-5, 2.35]);
  const z = await igAltitudes(pts, fakeFetch, async () => {});
  assert.equal(calls.length, 3);
  assert.equal(z.length, 230);
  assert.equal(z[0], null);
  assert.equal(z[1], 30);
  assert.match(calls[0], /^https:\/\/data\.geopf\.fr\/altimetrie\/1\.0\/calcul\/alti\/rest\/elevation\.json\?/);
  assert.match(calls[0], /resource=ign_rge_alti_wld/);
  await assert.rejects(igAltitudes(pts, async () => ({ ok: true, json: async () => ({ elevations: [1] }) }), async () => {}));
  await assert.rejects(igAltitudes(pts, async () => ({ ok: false, status: 503 }), async () => {}));
});

test('dénivelé : les trajets d\'essai ont un chemin dans le plan des rues, et la mesure se fait dessus', async () => {
  const P = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));
  assert.ok(P);
  const slope = async (pts) => pts.map((p) => 30 + (p[0] - 48.85) * KY * 0.05); // 5 % vers le nord
  const rows = [];
  for (const t of TRIPS) rows.push({ nom: t.nom, res: await measureTrip(P, t, [], slope) });
  for (const r of rows) {
    assert.ok(r.res, `${r.nom} : pas de chemin`);
    assert.ok(r.res.m > 200 && r.res.m < 2500, `${r.nom} : ${r.res.m} m`);
    assert.ok(r.res.points >= r.res.m / 10);
  }
  const bastille = rows.find((r) => /Bastille/.test(r.nom)).res; // vers le nord : ça monte
  assert.match(bastille.phrase, /^ça monte de \d+0 m$/);
  assert.match(table(rows), /^Trajet \| mètres/);
  assert.match(table([{ nom: 'X', err: 'IGN : réponse 503' }]), /X \| pas mesuré : IGN : réponse 503/);
});

test('dénivelé : la demande des ponts couvre la zone du robot ; le robot ne publie rien de cette étape', () => {
  assert.equal(BBOX, '48.815,2.224,48.902,2.470');
  assert.match(query(), /way\["highway"\]\["bridge"\]\["bridge"!="no"\]\(48\.815,2\.224,48\.902,2\.470\)/);
  assert.match(query(), /out geom;$/);
  const wf = readFileSync(new URL('../.github/workflows/maj-donnees.yml', import.meta.url), 'utf8');
  const step = /- name: Mesurer le dénivelé[^\n]*\n([\s\S]*?)\n\s+- name:/.exec(wf);
  assert.ok(step, 'étape absente');
  assert.match(step[1], /exit 0\s*$/);
  const files = /FILES="([^"]*)"/.exec(wf)[1];
  assert.equal(/denivele|ponts/.test(files), false);
});
