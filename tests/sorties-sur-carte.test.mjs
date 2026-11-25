// v429 (mon choix A du 25 nov.) : la page d'un lieu de Sorties montre ce lieu sur la carte (rond choisi),
// la carte ne se place sur lui que s'il ne se voit pas, et le rond part quand la page se ferme.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const body = (start) => {
  const i = app.indexOf(start);
  assert.ok(i >= 0, `${start} introuvable`);
  const next = app.slice(i + start.length).search(/\n(async )?function |\nconst [a-zA-Z]+ = \(/);
  return app.slice(i, i + start.length + next);
};

test('markSpot : rond choisi (bord encre), la carte ne bouge que si le lieu est hors de vue', () => {
  const f = body('function markSpot(');
  assert.match(f, /showPointPin\(lat, lng, icon, true\)/);
  assert.match(f, /Number\.isFinite\(lat\)/, 'une sortie sans position ne fait rien');
  const g = body('function showMarked(');
  assert.match(g, /if \(pt\.x >= m && pt\.x <= size\.x - m && pt\.y >= top \+ m && pt\.y <= size\.y - h - m\) return;/, 'lieu visible : la carte ne bouge pas');
  assert.match(g, /if \(size\.y - h - top < 100\) return;/, 'page en grand : la carte attend que la page baisse');
  assert.match(app, /if \(marked && h < lastH - 20\) \{ clearTimeout\(wait\); wait = setTimeout\(showMarked, 250\); \}/, 'la page baisse : le lieu se montre');
  assert.match(body('function showPointPin('), /peek-pin\$\{sel \? ' sel' : ''\}/);
});

test('les pages de Sorties marquent leur lieu et l\'effacent en se fermant', () => {
  for (const start of ['function openKiosque(', 'const openFreeSpot =', 'function openFreeDaySpot(', 'function openStreetArtCard(', 'function openGalleryCard(']) {
    assert.match(body(start), /openSpot\(\{ mark: true,/, start);
  }
  assert.match(app, /const openMuseum = \(m\) => openSpot\(\{ mark: true,/);
  for (const [start, name] of [['function openEventPage(', "name: 'sortie'"], ['function openMarket(', "name: 'market'"], ['function openNavigo(', 'name: `navigo:']]) {
    const f = body(start);
    assert.ok(f.includes(`${name}`) && /onClose: unmarkSpot/.test(f), `${start} : le rond part à la fermeture`);
    assert.ok(f.indexOf('markSpot(') > f.indexOf('openSheet('), `${start} : marqué après l'ouverture de la page (la hauteur de la page est connue)`);
  }
  const spot = body('function openSpot(');
  assert.ok(spot.indexOf('if (mark) markSpot(') > spot.indexOf('openSheet('));
});

test('les autres pages (Vélib\', jardins, plaques, Ce point) ne changent pas', () => {
  for (const start of ['async function openVelibStation(', 'async function openJardin(', 'function openPlaque(', 'function openArcade(']) {
    assert.doesNotMatch(body(start), /mark: true/, start);
  }
});
