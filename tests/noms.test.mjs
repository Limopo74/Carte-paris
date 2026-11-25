// v397 : le nom de mes lieux sous leur goutte, de près.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shortName, keepNames, NAME_MAX, NAMES_MIN_ZOOM } from '../js/noms.js';
import { loadState, saveState, exportJSON, readSettings } from '../js/store.js';

const r = (left, top, w = 60, h = 14) => ({ left, top, right: left + w, bottom: top + h });

test('le nom est coupé proprement', () => {
  assert.equal(shortName('  Café   des  Deux Moulins '), 'Café des Deux Moulins');
  const long = 'Musée de la Vie romantique et son jardin';
  assert.equal(shortName(long).length, NAME_MAX);
  assert.ok(shortName(long).endsWith('…'));
  assert.equal(shortName(null), '');
  assert.equal(NAMES_MIN_ZOOM, 16);
});

test('un nom qui touche un autre nom, une autre goutte ou un bouton se cache ; favoris puis centre d\'abord', () => {
  const own = r(10, 0, 32, 32);
  const autreGoutte = r(200, 100, 32, 32);
  const items = [
    { rect: r(0, 40), own, fav: false, d: 50 },        // 0 : touche le nom 1, plus loin du centre
    { rect: r(30, 45), own: r(40, 5, 32, 32), fav: false, d: 10 }, // 1 : plus près du centre
    { rect: r(190, 120), own: r(300, 0), fav: false, d: 5 },       // 2 : touche une autre goutte
    { rect: r(400, 40), own: r(410, 0), fav: false, d: 90 },       // 3 : seul
    { rect: r(25, 50), own: r(30, 8), fav: true, d: 200 },         // 4 : favori, passe avant 0 et 1
  ];
  const obstacles = [own, items[1].own, autreGoutte, items[3].own, items[4].own];
  assert.deepEqual(keepNames(items, obstacles), [3, 4]);
  assert.deepEqual(keepNames([{ rect: null, own, d: 0 }, items[3]], obstacles), [1], 'un nom absent ne bloque rien');
  assert.deepEqual(keepNames([{ rect: r(0, 40), own, d: 0 }], [own, r(0, 45, 200, 40)]), [], 'un bouton cache le nom');
  const frame = { left: 0, top: 0, right: 360, bottom: 740 };
  assert.deepEqual(keepNames([{ rect: r(-20, 40), own, d: 0 }, { rect: r(320, 40), own, d: 0 }, { rect: r(100, 300), own, d: 0 }], [], frame), [2], 'jamais un bout de nom au bord');
});

test('réglage : allumé au départ, gardé, dans la sauvegarde et les réglages envoyés', () => {
  const mem = new Map();
  const st = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(loadState(st).showNames, true);
  assert.ok(saveState(st, { ...loadState(st), showNames: false }));
  const back = loadState(st);
  assert.equal(back.showNames, false);
  assert.equal(readSettings(JSON.parse(exportJSON(back))).showNames, false);
});

test('le nom est du texte brut, sous Dessins des monuments, et le fichier est gardé hors ligne', () => {
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(app, /el\('span', \{ class: 'pin-name', 'aria-hidden': 'true' \}, myPhoto\(p\) \? ico\('image', \{ size: 13, stroke: 2\.4 \}\) : null, shortName\(p\.name\)\)/);
  assert.ok(app.indexOf("onOff('names'") > app.indexOf("onOff('reperes'"));
  assert.match(readFileSync('sw.js', 'utf8'), /'js\/noms\.js'/);
});

test('v441 : la marque photo des listes (v391) devant le nom sous la goutte, avec la même règle', () => {
  const app = readFileSync('js/app.js', 'utf8');
  // même règle que la marque des listes : ma photo, pas une note prise en passant, pas un lieu d'un proche
  assert.match(app, /const myPhoto = \(p\) => Boolean\(p\.photos\?\.length && !isPass\(p\) && !p\.owner\);/);
  assert.match(app, /const photoMark = \(p\) => \(myPhoto\(p\)/);
  // même icône que dans les listes
  assert.match(app, /class: 'photo-mark'[^\n]*ico\('image'/);
  assert.match(app, /class: 'pin-name'[^\n]*myPhoto\(p\) \? ico\('image'/);
  // TalkBack l'entend sur la goutte (le nom est caché aux lecteurs d'écran)
  assert.match(app, /myPhoto\(p\) \? ', avec photo' : ''/);
  // la marque suit la taille du texte
  assert.ok(app.slice(app.indexOf("['sparkles', 'Nouveautés', [")).split('\n').slice(1, 11).some((l) => l.includes('**Photo sous la goutte**'))); // v452 : « Deux nouveaux styles » en tête ; // v443, v444 : « Le démarrage d'un proche », « Sauvegarde » au-dessus ; v445 : « Mon Paris plus court » aussi ; v446 : une ligne de plus ; v452 : « Sorties, une ligne de moins » ; v448 : « Des boutons à la place des chemins » en tête ; v450 : « Grands lieux, depuis toi » ; v450, v451 : deux lignes de plus
  assert.match(readFileSync('css/style.css', 'utf8'), /\.pin-name \.ico svg \{ width: calc\(13px \* var\(--ts\)\); height: calc\(13px \* var\(--ts\)\); \}/);
});
