import test from 'node:test';
import assert from 'node:assert/strict';
import { RESPIRE, respireWindow, respirePlanned, cleanRespire, respireSectors, distanceToSector, respireOn, respireNow, respireNextDay, RESPIRE_MARGIN } from '../js/respire.js';

// Les 29 noms du jeu « Paris Respire – Secteurs » lus le 18 nov. 2026 (Paris Data)
const NOMS = ['Aligre', 'Luxembourg', 'Rue des Moines (marché Brochant)', 'Roquette', 'Canal Saint-Martin hiver', 'Marguerite de Rochechouart', 'Montmartre', 'Daguerre',
  'Bois de Vincennes - Pépinière, Fontenay, Tremblay', 'Faubourg Saint Denis', 'Bois de Vincennes', 'Poteau', 'Saint-Martin (extension sud)', 'Bassin de la Villette', 'Mouffetard',
  'Bois de Vincennes', 'Sentier', 'MARAIS', 'Butte Aux Cailles', 'Bois de Vincennes - Route du Parc', 'Jourdain Levert', 'Trudaine', 'Lavigerie / Laperrine', 'Jean Moulin',
  'Piétonnisation des Champs-Elysées', 'CHATEAU ROUGE', 'Bois de Boulogne', 'Martyrs', 'Route des Fortifications'];
// Contour réel (simplifié) du secteur Trudaine, lu le même jour : [lat, lng]
const TRUDAINE = [[48.88184, 2.33991], [48.8827, 2.34443], [48.88178, 2.34479], [48.88203, 2.34628], [48.88193, 2.34649], [48.88047, 2.34629], [48.87883, 2.34527], [48.87996, 2.34036], [48.88032, 2.34055], [48.88177, 2.33986]];
const json = { updated: '2026-11-18', secteurs: NOMS.map((nom) => ({ nom, rings: [TRUDAINE] })) };
const rule = (name) => RESPIRE.find((r) => r.name === name);
const d = (y, m, day, h = 12, mn = 0) => new Date(y, m - 1, day, h, mn);

test('chaque règle retrouve son secteur dans le jeu de la Ville, et les trois secteurs écartés n\'en ont pas', () => {
  const sectors = respireSectors(json);
  assert.equal(sectors.length, RESPIRE.length, 'toutes les règles ont un contour');
  assert.equal(sectors.find((s) => s.name === 'Bois de Vincennes').rings.length, 4, 'les quatre contours de Vincennes réunis');
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const nom of NOMS) {
    const hits = RESPIRE.filter((r) => norm(nom).startsWith(r.key));
    assert.ok(hits.length <= 1, `${nom} : une règle au plus`);
    if (/Champs|Lavigerie|Fortifications/.test(nom)) assert.equal(hits.length, 0, `${nom} : pas dans la liste`);
    else assert.equal(hits.length, 1, `${nom} : une règle`);
  }
});

test('jours et heures : seulement ce que paris.fr et le jeu de la Ville disent tous les deux', () => {
  const sun = d(2026, 11, 22); const sat = d(2026, 11, 21); const wed = d(2026, 11, 18);
  assert.deepEqual(respireWindow(rule('Rue des Martyrs'), sun), { from: '10:00', to: '18:00' });
  assert.deepEqual(respireWindow(rule('Avenue Trudaine'), sun), { from: '14:00', to: '18:00' });
  assert.deepEqual(RESPIRE.filter((r) => respireWindow(r, sat)).map((r) => r.name).sort(), ['Bois de Boulogne', 'Château-Rouge', 'Rue des Martyrs']);
  assert.equal(RESPIRE.some((r) => respireWindow(r, wed)), false);
  assert.equal(respirePlanned(wed), false); assert.equal(respirePlanned(sun), true);
  assert.equal(respireWindow(rule('Château-Rouge'), sun), null, 'le samedi seulement');
  assert.ok(respireWindow(rule('Luxembourg'), sun), 'd\'avril à novembre');
  assert.equal(respireWindow(rule('Luxembourg'), d(2026, 12, 6)), null);
  assert.equal(respireWindow(rule('Butte-aux-Cailles'), sun), null, 'd\'avril à septembre');
  assert.ok(respireWindow(rule('Jean Moulin'), d(2026, 12, 6)), '1er dimanche du mois');
  assert.equal(respireWindow(rule('Jean Moulin'), d(2026, 12, 13)), null);
  assert.equal(respireWindow(rule('Marais'), d(2026, 6, 14)).to, '19:30', 'été');
  assert.equal(respireWindow(rule('Marais'), d(2026, 6, 7)).to, '18:00', 'le 1er dimanche du mois garde les heures d\'hiver');
  assert.equal(respireWindow(rule('Montmartre'), d(2026, 9, 13)).to, '18:00', 'les deux sources ne s\'accordent sur 19 h que d\'avril à août');
  assert.equal(respireWindow(rule('Montmartre'), d(2026, 6, 14)).to, '19:00');
  assert.equal(respireWindow(rule('Bassin de la Villette'), sun).from, '14:00', 'début le plus tard des deux sources');
  assert.equal(respireWindow(rule('Jourdain-Levert'), sun).from, '14:00');
  for (const r of RESPIRE) { assert.ok(r.win[0] < r.win[1], r.name); if (r.sum) assert.ok(r.sumM && r.sum[1] >= r.win[1], r.name); }
});

test('distance à un secteur, secteur en cours, prochain jour', () => {
  const sectors = respireSectors({ secteurs: [{ nom: 'Trudaine', rings: [TRUDAINE] }, { nom: 'Martyrs', rings: [TRUDAINE.map(([a, b]) => [a - 0.01, b])] }] });
  const inside = { lat: 48.8810, lng: 2.3440 }; const near = { lat: 48.8812, lng: 2.3361 };
  assert.equal(distanceToSector(inside, sectors.find((s) => s.name === 'Avenue Trudaine').rings), 0);
  const dist = distanceToSector(near, [TRUDAINE]);
  assert.ok(dist > 200 && dist < 350, `environ 280 m : ${dist}`);
  const sun15 = d(2026, 11, 22, 15, 0);
  const now = respireNow(sectors, near, sun15, 800);
  assert.equal(now.s.name, 'Avenue Trudaine'); assert.equal(now.to, '18:00'); assert.equal(now.d, dist);
  assert.equal(respireNow(sectors, near, d(2026, 11, 22, 13, 0), 800), null, 'Trudaine ne commence qu\'à 14 h, Martyrs est trop loin');
  assert.equal(respireNow(sectors, near, d(2026, 11, 22, 18 - 1, 60 - RESPIRE_MARGIN), 800), null, 'plus proposé le dernier quart d\'heure');
  assert.equal(respireNow(sectors, near, d(2026, 11, 18, 15, 0), 800), null, 'un mercredi : rien');
  assert.equal(respireNow(sectors, null, sun15, 800), null, 'sans position : rien');
  assert.equal(respireNow(sectors, near, sun15, 100), null, 'trop loin');
  assert.deepEqual(respireOn(sectors, sun15, near).map((x) => x.s.name), ['Avenue Trudaine', 'Rue des Martyrs']);
  assert.equal(respireNextDay(sectors, d(2026, 11, 18)).getDate(), 21, 'samedi : rue des Martyrs');
  assert.equal(respireNextDay([], d(2026, 11, 18)), null);
});

test('le fichier du robot est nettoyé ; vide, rien ne s\'affiche', () => {
  assert.deepEqual(cleanRespire({ secteurs: [{ nom: 'X', rings: [[[1, 2], [3, 4]]] }, { nom: '', rings: [TRUDAINE] }, { nom: 'Y', rings: [[[1, 'a'], [2, 3], [4, 5]]] }, null] }), []);
  assert.deepEqual(respireSectors({ source: 's', updated: null, secteurs: [] }), []);
  assert.deepEqual(respireSectors(null), []);
});
