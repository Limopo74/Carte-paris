import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cleanText, excerpt, cleanPvp, cleanAcr, acrLabel, within, PVP_CUT } from '../js/patrimoine.js';
import { TUNING } from '../js/reglages.js';

// v245 : immeubles protégés par la Ville et architecture contemporaine remarquable, dans Monuments (claude/idee-architecture.md)
const HALLES = { lat: 48.8612, lng: 2.3495 }; // le point de la maquette, entre le Forum des Halles et Beaubourg

test('texte de la Ville : guillemets abîmés réparés, extrait coupé au mot', () => {
  assert.equal(cleanText('nommée «?la tour Piano?», est  conçue'), 'nommée « la tour Piano », est conçue');
  const long = 'Remarquable séquence de trois maisons des XVIIe et XVIIIe siècle. Au n°71, belle maison en pierre de taille d\'époque Louis XIV édifice référencé.';
  const e = excerpt(long);
  assert.ok(e.endsWith('…') && e.length <= PVP_CUT + 1, e);
  assert.ok(long.startsWith(e.slice(0, -1)), 'le début exact du texte');
  assert.ok(!/[\s,;:.]…$/.test(e), 'pas de ponctuation pendante');
  assert.equal(excerpt('Maison d\'origine du XVIIe siècle ayant subi de nombreuses transformations.'), '', 'un texte court s\'affiche en entier');
});

test('immeubles de la Ville : plusieurs bâtiments, le plus proche compte ; rayon réglable', () => {
  const list = cleanPvp({ items: [
    { n: '01-1015', a: '99 à 109 rue Saint-Denis', t: 'Séquence de maisons anciennes.', p: [[48.86266, 2.34939], [48.86244, 2.34925]] },
    { n: '01-1025', a: '34 rue Saint-Denis', t: 'Devanture commerciale.', p: [[48.86023, 2.34855]] },
    { n: '04-0455', a: '1 à 9 place Igor Stravinsky', t: 'Établissement de recherche.', p: [[48.85983, 2.35125]] },
    { n: 'x', a: 'Sans point', t: 'x', p: [] }, { n: 'y', a: '', t: 'sans adresse', p: [[48.86, 2.35]] },
    { n: 'z', a: 'À Lyon', t: 'loin', p: [[45.76, 4.83]] }, null] });
  assert.deepEqual(list.map((x) => x.n), ['01-1015', '01-1025', '04-0455']);
  const near = within(list, HALLES, TUNING.villeM.def);
  assert.deepEqual(near.map((x) => x.n), ['01-1025', '01-1015'], '150 m au départ : la place Stravinsky (200 m) n\'y est pas');
  assert.equal(near[1].lat, 48.86244, 'la boussole vise le bâtiment le plus proche');
  assert.ok(near[1].d >= 130 && near[1].d <= 150, String(near[1].d));
  assert.equal(within(list, HALLES, TUNING.villeM.max).length, 3, '300 m au plus');
  assert.deepEqual(within(list, null, 300), [], 'sans position, rien');
  assert.deepEqual(TUNING.villeM, { def: 150, min: 50, max: 300, step: 50, unit: 'm' });
});

test('architecture contemporaine remarquable : référence, point à Paris, date à part de la distance', () => {
  const list = cleanAcr({ items: [
    { r: 'ACR0001545', t: 'Forum des Halles', a: ['Chemetov Paul (architecte)', 'Chauvelin Gérard (architecte)'], d: '1979, 1985', l: '2019', lat: 48.86189, lng: 2.34685 },
    { r: 'ACR0000721', t: 'Centre Pompidou', a: [], d: '1977', l: '2016', lat: 48.86083, lng: 2.3524 },
    { r: 'PA00085805', t: 'Pas un label', lat: 48.86, lng: 2.35 }, { r: 'ACR0000001', t: 'Toulouse', lat: 43.6, lng: 1.44 }] });
  assert.deepEqual(list.map((x) => x.r), ['ACR0001545', 'ACR0000721']);
  assert.equal(list[0].y, '1979, 1985');
  assert.equal(acrLabel(list[0]), 'Architecture contemporaine remarquable (label 2019)');
  const near = within(list, HALLES, 1000);
  assert.equal(near[0].y, '1979, 1985', 'la distance (d) n\'écrase pas la date (y)');
  assert.ok(Number.isFinite(near[0].d));
});

test('fichiers du robot : au bon format (vides tant que le robot ne les a pas faits)', () => {
  for (const f of ['patrimoine', 'acr']) {
    const j = JSON.parse(fs.readFileSync(new URL(`../data/${f}.json`, import.meta.url)));
    assert.ok(Array.isArray(j.items) && typeof j.source === 'string', f);
    if (j.items.length) assert.match(j.updated, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.equal(cleanPvp(JSON.parse(fs.readFileSync(new URL('../data/patrimoine.json', import.meta.url)))).length, JSON.parse(fs.readFileSync(new URL('../data/patrimoine.json', import.meta.url))).items.length, 'aucune ligne du robot perdue à la lecture');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'js/patrimoine.js'") && sw.includes("'data/acr.json'"), 'gardés sans réseau');
  assert.ok(!sw.includes("'data/patrimoine.json'"), 'le gros fichier de la Ville n\'est lu qu\'à l\'ouverture de Monuments');
});
