// v505 (mes choix 1A à 5A du 25 nov. 2026) : Boucle à courir et mon allure en courant.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPlan, snap, route, PARK } from '../js/rues.js';
import { inRings } from '../js/jardins.js';
import { planLoop, parksOpen, alongLine, overlapM, offset, LOOP_KM, LOOP_TOL, LOOP_OVERLAP_MAX, cleanRunPace, stepRunPace, runPaceText, runKmhText, runMinutes, RUN_START_S } from '../js/boucle.js';
import { cleanSettings, SETTINGS_OWN, exportSettingsJSON } from '../js/store.js';

/** Un plan inventé (format 2 de tools/maj-rues.py) : une grille de n × n croisements, environ 100 m entre deux. */
function grid(n, flag = () => 0) {
  const LAT0 = 48.85; const LNG0 = 2.33; const DLA = 0.0009; const DLN = 0.00137;
  const nodes = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) nodes.push([Math.round((LAT0 + i * DLA) * 1e5), Math.round((LNG0 + j * DLN) * 1e5)]);
  const flat = []; let p = [0, 0]; for (const q of nodes) { flat.push(q[0] - p[0], q[1] - p[1]); p = q; }
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (j + 1 < n) edges.push([i * n + j, i * n + j + 1]); if (i + 1 < n) edges.push([i * n + j, (i + 1) * n + j]); }
  const ea = []; const eb = []; let pa = 0;
  for (const [a, b] of edges) { ea.push(a - pa); eb.push(b - a); pa = a; }
  return readPlan({ v: 2, names: [], nodes: flat, ea, eb, ef: edges.map(([a, b]) => flag(a, b, n)), ek: edges.map(() => 0), en: edges.map(() => 0), shape: [] });
}
const P = grid(40); // 4 km de côté
const CENTER = { lat: 48.85 + 20 * 0.0009, lng: 2.33 + 20 * 0.00137 };

test('mon allure : de 4 à 10 min par km, de 15 s en 15 s, absente au départ', () => {
  assert.equal(cleanRunPace(undefined), null);
  assert.equal(cleanRunPace(null), null);
  assert.equal(cleanRunPace('abc'), null);
  assert.equal(cleanRunPace(390), 390);
  assert.equal(cleanRunPace(397), 390); // sur un cran de 15 s
  assert.equal(cleanRunPace(100), 240);
  assert.equal(cleanRunPace(900), 600);
  assert.equal(stepRunPace(null, 1), RUN_START_S); // premier appui : 6 min 30
  assert.equal(stepRunPace(null, -1), 390);
  assert.equal(stepRunPace(390, 1), 405);
  assert.equal(stepRunPace(390, -1), 375);
  assert.equal(stepRunPace(600, 1), 600);
  assert.equal(stepRunPace(240, -1), 240);
  assert.equal(runPaceText(390), '6 min 30 par km');
  assert.equal(runPaceText(300), '5 min par km');
  assert.equal(runPaceText(255), '4 min 15 par km');
  assert.equal(runKmhText(390), '9,2 km/h');
  assert.equal(runMinutes(5200, null), null); // pas d'allure : rien en courant
  assert.equal(runMinutes(5200, 390), 34);
  assert.equal(runMinutes(10000, 360), 60);
});

test('mon allure se garde, mais ne part ni dans le fichier de réglages ni chez un proche', () => {
  assert.equal(cleanSettings({ runPace: 375 }).runPace, 375);
  assert.equal(cleanSettings({}).runPace, null);
  assert.equal(cleanSettings({ runPace: 'n\'importe' }).runPace, null);
  assert.ok(SETTINGS_OWN.includes('runPace'));
  const file = JSON.parse(exportSettingsJSON({ runPace: 375, categories: [], lists: [] }));
  assert.equal('runPace' in file.settings, false);
});

test('la boucle revient au départ, à 10 % près de la longueur choisie, sans trop revenir sur ses pas', () => {
  const start = snap(P, CENTER);
  for (const km of LOOP_KM.filter((k) => k <= 5)) {
    const L = planLoop(P, start, km * 1000);
    assert.ok(L, `${km} km`);
    assert.ok(Math.abs(L.m - km * 1000) <= km * 1000 * LOOP_TOL, `${km} km : ${L.m}`);
    assert.ok(L.overlap <= L.m * LOOP_OVERLAP_MAX);
    assert.equal(L.legs.length, 3);
    assert.equal(L.corners.length, 2);
    const [a0, g0] = L.line[0]; const [a1, g1] = L.line.at(-1);
    assert.ok(Math.abs(a0 - a1) < 1e-6 && Math.abs(g0 - g1) < 1e-6, 'revient au départ');
  }
});

test('rien plutôt qu\'une boucle fausse : trop longue pour le plan, ou départ absent', () => {
  const start = snap(P, CENTER);
  assert.equal(planLoop(P, start, 60000), null); // 60 km dans un plan de 4 km
  assert.equal(planLoop(P, null, 5000), null);
  assert.equal(planLoop(null, start, 5000), null);
});

test('un coin se pose sur une fontaine en service près de l\'endroit visé, jamais sur une fontaine fermée', () => {
  const start = snap(P, CENTER);
  const side = 3000 / (3 * 1.3);
  // une fontaine à 30 m de chaque coin visé, dans les 8 directions essayées
  const near = Array.from({ length: 8 }, (_, k) => offset(CENTER, k * 45, side + 30));
  const L = planLoop(P, start, 3000, { fountains: near.map((f) => ({ ...f, ok: true })) });
  assert.equal(L.water, 2);
  assert.ok(L.corners.every((c) => c.water));
  const closed = planLoop(P, start, 3000, { fountains: near.map((f) => ({ ...f, ok: false })) });
  assert.equal(closed.water, 0);
  assert.ok(closed.corners.every((c) => !c.water));
});

test('le long de la boucle : dans l\'ordre de la course, avec le kilomètre, à 75 m au plus du tracé', () => {
  const line = [[48.85, 2.33], [48.86, 2.33]]; // 1,1 km vers le nord
  const pts = [{ lat: 48.858, lng: 2.3305, id: 'b' }, { lat: 48.852, lng: 2.33, id: 'a' }, { lat: 48.855, lng: 2.34, id: 'loin' }];
  const out = alongLine(line, pts, 75);
  assert.deepEqual(out.map((x) => x.point.id), ['a', 'b']);
  assert.ok(Math.abs(out[0].at - 222) < 3, String(out[0].at));
  assert.ok(out[0].off < 1);
  assert.ok(out[1].off > 30 && out[1].off < 45);
});

test('mètres parcourus deux fois : seulement entre deux chemins différents', () => {
  assert.equal(overlapM([{ segs: [[1, 0, 100]] }, { segs: [[2, 0, 100]] }]), 0);
  assert.equal(overlapM([{ segs: [[1, 0, 100]] }, { segs: [[1, 50, 150]] }]), 50);
  assert.equal(overlapM([{ segs: [[1, 0, 100], [1, 0, 100]] }]), 0);
});

test('sur le vrai plan des rues : une boucle de 5 km au canal Saint-Martin', () => {
  const real = readPlan(JSON.parse(readFileSync('data/rues.json', 'utf8')));
  const start = snap(real, { lat: 48.8718, lng: 2.3655 });
  const L = planLoop(real, start, 5000);
  assert.ok(L);
  assert.ok(Math.abs(L.m - 5000) <= 500, String(L.m));
});

test('l\'appli : la ligne d\'Itinéraire sous les anciennes, mon allure dans Mon pas, le fichier en cache', () => {
  const app = readFileSync('js/app.js', 'utf8');
  const sw = readFileSync('sw.js', 'utf8');
  const respire = app.indexOf("row('footprints', 'Rues sans voitures'");
  const boucle = app.indexOf("row('repeat', 'Boucle à courir'");
  assert.ok(respire > 0 && boucle > respire, 'en bas de la liste');
  assert.ok(sw.includes("'js/boucle.js'"));
  assert.match(app, /'data-step': 'run:1', 'aria-label': 'Mon allure : moins vite'/);
  assert.match(app, /n > 1 && t\.legs\.every\(Boolean\) \? runLine\(total\) : null/); // Mes parcours, en traçant
  assert.match(app, /ok \? runLine\(total\) : null/); // un parcours enregistré
  assert.match(app, /'Dans Mes parcours'\)/); // choix 4A : pas « Garder », qui sert déjà dans Mes parcours
});

// v505 suite (mon choix 1A du 25 nov.) : un parc ouvert jusqu'au retour n'est plus évité ; un parc fermé, si.
test('parcs : seuls ceux ouverts jusqu\'au retour deviennent permis, et le chemin les prend alors', () => {
  // une grille de 9 × 9 dont la colonne du milieu (j = 4) est un parc, sauf ses deux bouts
  const PG = grid(9, (a, b, n) => (a % n === 4 && b % n === 4 && Math.floor(a / n) >= 1 && Math.floor(b / n) <= 7 ? PARK : 0));
  const at = (i, j) => ({ lat: 48.85 + i * 0.0009, lng: 2.33 + j * 0.00137 });
  const ring = [[48.85 + 0.5 * 0.0009, 2.33 + 3.5 * 0.00137], [48.85 + 7.5 * 0.0009, 2.33 + 3.5 * 0.00137], [48.85 + 7.5 * 0.0009, 2.33 + 4.5 * 0.00137], [48.85 + 0.5 * 0.0009, 2.33 + 4.5 * 0.00137]];
  const parc = { id: 'p1', kind: 'j', lat: at(4, 4).lat, lng: at(4, 4).lng, rings: [ring] };
  const s1 = snap(PG, at(1, 4)); const s2 = snap(PG, at(7, 4)); // posés hors du parc : le bout du milieu
  const s1b = { ...s1 }; const s2b = { ...s2 };
  const start = snap(PG, at(4, 0));
  const closed = parksOpen(PG, start, 3000, [parc], () => false, inRings, PARK);
  assert.equal(closed, null);
  const ok = parksOpen(PG, start, 3000, [parc], () => true, inRings, PARK);
  assert.ok(ok && ok.some(Boolean));
  assert.ok([...ok].every((v, i) => !v || PG.ef[i] & PARK), 'seulement des tronçons de parc');
  const parkM = (r) => r.segs.reduce((t, [e, a, b]) => t + (PG.ef[e] & PARK ? Math.abs(b - a) : 0), 0);
  // de (0,4) à (8,4), les deux bouts hors du parc : tout droit par le parc seulement s'il est permis
  void s1b; void s2b;
  const a = snap(PG, at(0, 4)); const b = snap(PG, at(8, 4));
  const avoid = route(PG, a, b);
  PG.okPark = ok; const through = route(PG, a, b); PG.okPark = null;
  assert.ok(avoid && through);
  assert.equal(parkM(avoid), 0);
  assert.ok(parkM(through) > 500, String(parkM(through)));
  assert.ok(through.m < avoid.m);
  // planLoop remet le plan comme avant (okPark posé seulement le temps du calcul)
  planLoop(PG, start, 2000, { okPark: ok });
  assert.equal(PG.okPark ?? null, null);
});

test('la boucle partie de chez moi le dit, et l\'interrupteur « Partir de chez moi » est le même qu\'ailleurs', () => {
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(app, /retour \$\{from\.home \? 'chez toi' : 'ici'\}/);
  assert.match(app, /const start0 = homeOn\(\) \? atHome\(\) : origin;/);
  assert.match(app, /'Partir de chez moi'\), el\('span', \{ class: 'menu-sub' \}, onHome \? `La boucle part de chez toi/);
  assert.match(app, /const okPark = parksOpen\(streets, start, km \* 600, jards \?\? \[\], parkOk, inRings, PARK\);/);
  assert.match(app, /j\.kind !== 'c' && !windy\(\) && openState\(jardinHours\(j, parcs\)\)\?\.open === true && !closedOnArrival/);
});
