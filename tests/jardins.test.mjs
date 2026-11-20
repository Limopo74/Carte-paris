import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jardinName, jardinAddress, cleanJardins, inRings, distanceToJardin, nearestEdge, jardinHours, bigJardinNear, jardinsInBox, BIG_M2, NEAR_M, WIND_GUST } from '../js/jardins.js';

// v261 : jardins publics (mes choix 1A 2A 3B 4A du 20 nov. 2026).
const sq = (id, lat, lng, half = 0.0005, extra = {}) => ({ id, n: `SQUARE ${id}`, t: 'j', c: [lat, lng],
  s: [[[lat - half, lng - half], [lat - half, lng + half], [lat + half, lng + half], [lat + half, lng - half]]], ...extra });

test('noms et adresses : la casse de la Ville réparée, rien de deviné', () => {
  assert.equal(jardinName('SQUARE DU TEMPLE'), 'Square du Temple');
  assert.equal(jardinName("JARDIN DE L'HOTEL SALE - LEONOR FINI"), "Jardin de l'Hotel Sale - Leonor Fini", 'les accents absents ne sont pas devinés');
  assert.equal(jardinName('PARC MARCEL BLEUNSTEIN-BLANCHET DIT PARC DE LA TURLURE'), 'Parc Marcel Bleunstein-Blanchet dit Parc de la Turlure');
  assert.equal(jardinName('Parc de Belleville'), 'Parc de Belleville', 'déjà écrit en minuscules : tel quel');
  assert.equal(jardinName(''), '');
  assert.equal(jardinAddress('50 RUE BRETAGNE'), '50 rue Bretagne');
  assert.equal(jardinAddress(''), '');
});

test('lecture du fichier du robot : contours gardés, éléments illisibles écartés', () => {
  const list = cleanJardins({ items: [
    sq('ID1', 48.86, 2.36), sq('ID2', 48.87, 2.30, 0.002, { big: 1, t: 'b' }),
    { id: 'ID3', n: 'X', t: 'j', c: [48.86, 2.36], s: [[[48.86, 2.36], [48.87, 2.36]]] }, // anneau de 2 points
    { id: 'ID4', n: '', t: 'j', c: [48.86, 2.36], s: sq('a', 48.86, 2.36).s }, // sans nom
    { id: 5, n: 'Y', t: 'j', c: [48.86, 2.36], s: sq('a', 48.86, 2.36).s }, // identifiant illisible
    { id: 'ID6', n: 'Z', t: 'j', c: ['a', 2], s: sq('a', 48.86, 2.36).s },
  ] });
  assert.deepEqual(list.map((j) => [j.id, j.kind, j.big]), [['ID1', 'j', false], ['ID2', 'b', true]]);
  assert.equal(list[0].name, 'Square Id1');
  assert.deepEqual(cleanJardins(null), []);
  assert.deepEqual(cleanJardins({ items: 'non' }), []);
});

test('dedans, distance au bord, point du bord le plus proche', () => {
  const [j] = cleanJardins({ items: [sq('ID1', 48.86, 2.36, 0.001)] });
  assert.equal(inRings({ lat: 48.86, lng: 2.36 }, j.rings), true);
  assert.equal(distanceToJardin({ lat: 48.86, lng: 2.36 }, j), 0);
  const d = distanceToJardin({ lat: 48.862, lng: 2.36 }, j); // 0,001° au nord du bord, environ 110 m
  assert.ok(d > 100 && d < 120, `distance ${d}`);
  // un trou du contour (anneau dans l'anneau) n'est pas « dedans »
  const holed = { rings: [j.rings[0], [[48.8598, 2.3598], [48.8598, 2.3602], [48.8602, 2.3602], [48.8602, 2.3598]]] };
  assert.equal(inRings({ lat: 48.86, lng: 2.36 }, holed.rings), false);
  assert.equal(inRings({ lat: 48.8605, lng: 2.3595 }, holed.rings), true);
  const e = nearestEdge({ lat: 48.865, lng: 2.36 }, j);
  assert.equal(e.lat, 48.861);
  assert.equal(jardinsInBox([j], { s: 48.8595, n: 48.8605, w: 2.3595, e: 2.3605 }).length, 1, 'un cadre tout entier dans le jardin le garde');
  assert.equal(jardinsInBox([j], { s: 48.87, n: 48.88, w: 2.37, e: 2.38 }).length, 0);
});

test('grand jardin dans « Maintenant » : ouvert, proche, pas sur le point de fermer, horaires connus', () => {
  const list = cleanJardins({ items: [sq('BIG', 48.86, 2.36, 0.001, { big: 1 }), sq('SMALL', 48.86, 2.37, 0.001)] });
  const parks = [{ id: 'BIG', hours: 'Mo-Su 07:00-20:00' }, { id: 'SMALL', hours: 'Mo-Su 07:00-20:00' }];
  const at = (h, m = 0) => new Date(2026, 10, 20, h, m); // vendredi 20 novembre 2026
  const near = { lat: 48.8625, lng: 2.36 }; // environ 165 m au nord du bord
  const g = bigJardinNear(list, near, { parks, now: at(15) });
  assert.equal(g?.j.id, 'BIG');
  assert.ok(g.d > 150 && g.d <= NEAR_M);
  assert.equal(bigJardinNear(list, near, { parks, now: at(21) }), null, 'fermé : rien');
  assert.equal(bigJardinNear(list, near, { parks, now: at(19, 45) }), null, 'ferme dans 15 min : rien');
  assert.equal(bigJardinNear(list, near, { parks: [], now: at(15) }), null, 'horaires inconnus : rien');
  assert.equal(bigJardinNear(list, { lat: 48.865, lng: 2.36 }, { parks, now: at(15) }), null, 'trop loin : rien');
  assert.equal(bigJardinNear(list, { lat: 48.8625, lng: 2.37 }, { parks, now: at(15) }), null, 'un petit square n\'est jamais signalé');
  assert.equal(bigJardinNear(list, near, { parks, now: at(15), shown: new Set(['BIG']) }), null);
  assert.equal(bigJardinNear(list, { lat: 45.76, lng: 4.83 }, { parks, now: at(15) }), null, 'loin de Paris : rien');
  assert.equal(bigJardinNear(list, null, { parks, now: at(15) }), null);
  assert.equal(jardinHours(list[0], parks), 'Mo-Su 07:00-20:00');
  assert.equal(BIG_M2, 40000);
  assert.ok(WIND_GUST > 0 && WIND_GUST < 70, 'en dessous des rafales qui ont déjà fait fermer les jardins');
});

const py = (args) => spawnSync('python3', ['-I', 'tools/maj-jardins.py', ...args], { encoding: 'utf8' });
const hasPython = spawnSync('python3', ['-V']).status === 0;

test('robot des jardins : types gardés, contours simplifiés, surface, garde-fou', { skip: !hasPython }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'jardins-'));
  const ring = (lat, lng, half, n = 40) => { // un cercle de n points : la simplification en garde moins
    const pts = Array.from({ length: n }, (_, i) => [lng + half * 1.5 * Math.cos((2 * Math.PI * i) / n), lat + half * Math.sin((2 * Math.PI * i) / n)]);
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...pts, pts[0]]] } };
  };
  const rec = (id, type, half, extra = {}) => ({ identifiant: id, nom: `JARDIN ${id}`, type, geo_point_2d: { lat: 48.86, lon: 2.35 }, geo_shape: ring(48.86, 2.35, half), ...extra });
  const src = [
    rec('ID1', 'Promenades ouvertes', 0.0003), rec('ID2', 'Promenades ouvertes', 0.002), rec('ID3', 'Bois', 0.001), rec('ID4', "Jardins d'Etat", 0.001),
    rec('ID5', 'Décorations sur la voie publique', 0.0003), rec('ID6', 'Jardinets décoratifs', 0.0003), rec('ID7', 'Jardins grandes institutions', 0.001),
    rec('ID1', 'Promenades ouvertes', 0.0003), // doublon
    { ...rec('', 'Promenades ouvertes', 0.0003), nsq_espace_vert: 42 }, // sans identifiant : celui de l'espace vert
    rec('ID9', 'Promenades ouvertes', 0.0003, { geo_point_2d: { lat: 45.76, lon: 4.83 } }), // hors de Paris
  ];
  writeFileSync(join(dir, 'src.json'), JSON.stringify(src));
  const out = join(dir, 'jardins.json');
  const r = py([join(dir, 'src.json'), '2026-11-20', '1', out]);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(j.date, '2026-11-20');
  assert.match(j.source, /Ville de Paris, licence ODbL/);
  assert.deepEqual(j.items.map((x) => `${x.id}:${x.t}${x.big ? ':grand' : ''}`), ['EV42:j', 'ID1:j', 'ID2:j:grand', 'ID3:b', 'ID4:e']);
  assert.ok(j.items.every((x) => x.s[0].length >= 3 && x.s[0].length <= 40));
  assert.ok(j.items.find((x) => x.id === 'ID1').s[0].length < 25, 'un petit contour arrondi perd les points inutiles (écart de 1,5 m au plus)');
  assert.ok(j.items.every((x) => x.s[0].every(([la, ln]) => String(la).split('.')[1].length <= 5 && String(ln).split('.')[1].length <= 5)), 'arrondis au mètre');
  assert.equal(cleanJardins(j).length, 5, 'l\'appli lit tout ce que le robot écrit');
  // garde-fou : trop peu de jardins, rien n'est écrit
  const out2 = join(dir, 'vide.json');
  assert.notEqual(py([join(dir, 'src.json'), '2026-11-20', '500', out2]).status, 0);
  assert.equal(existsSync(out2), false);
});

test('le calque est branché : fichier lu seulement s\'il sert, module gardé pour le métro, robot publié', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'js/jardins.js'"));
  assert.ok(!sw.includes("'data/jardins.json'"), 'le fichier des contours n\'est lu qu\'une fois le calque ou le bandeau allumé');
  const yml = readFileSync(new URL('../.github/workflows/maj-donnees.yml', import.meta.url), 'utf8');
  assert.match(yml, /tools\/maj-jardins\.py/);
  assert.match(yml, /FILES="[^"]*data\/jardins\.json/);
});
