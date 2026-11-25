// v327 (mes choix 1B 2C 3A 4A 6A 7A du 20 nov., puis 1B : la sauvegarde générale) : « Photos dans Sorties » et « Photos des salles ».
// La photo de l'agenda à la place de l'icône du genre (56 × 76 px, en haut de la ligne), éteint au départ ; ma photo d'une
// salle seulement quand l'agenda n'a pas de photo ou que la sienne ne se charge pas ; mes photos des salles dans la sauvegarde
// générale, jamais dans l'export de Vu en passant ni pour un proche.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, KEY } from '../js/store.js';
import { cleanVenuePhotos, venuePhotoFor, venuePhotoOf, setVenuePhoto, removeVenuePhoto, VENUE_PHOTOS_KEY, VENUE_PHOTO_SIDE } from '../js/venue-photos.js';
import { topVenues } from '../js/art.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('Photos dans Sorties : éteint au départ, gardé sur le téléphone, dans mes réglages par défaut', () => {
  const st = memStorage();
  assert.equal(loadState(st).evThumbs, false);
  st.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st).evThumbs, false, 'ancienne sauvegarde');
  saveState(st, { ...loadState(st), evThumbs: true });
  const s = loadState(st);
  assert.equal(s.evThumbs, true);
  assert.equal(readSettings(JSON.parse(exportJSON(s))).evThumbs, true);
  assert.equal(cleanSettings({ evThumbs: 'oui' }).evThumbs, false);
});

test('Vignette : seulement allumé, la photo de l\'agenda d\'abord, ma photo de la salle en secours, sinon la lettrine', () => {
  assert.match(app, /const tiled = state\.evThumbs === true && !badge && genre !== 'circuit';/, 'éteint, ou un circuit : l\'icône d\'avant');
  assert.match(app, /const none = \(\) => \(tiled \? letterTile\(genre\) : icon\(\)\);/);
  assert.match(app, /const thumb = tiled \? \(photo \|\| venuePhoto \? evThumb\(photo, venuePhoto, none\) : none\(\)\) : null;/);
  const f = app.slice(app.indexOf('function evThumb('), app.indexOf('function sortieCard('));
  assert.match(f, /if \(photo\) \{ img\.loading = 'lazy'; img\.src = photo; \} else \{ tried = true; mine\(\); \}/, 'la photo de l\'agenda passe avant la mienne');
  assert.match(f, /addEventListener\('error', \(\) => \{ if \(tried \|\| !photo\) \{ img\.replaceWith\(none\(\)\); return; \} tried = true; mine\(\); \}\)/, 'l\'image ne charge pas : ma photo, puis la lettrine');
  assert.match(app, /photo: e\.cover, venuePhoto: venuePhotoFor\(e, venuePhotos\)\?\.id \?\? null/, 'toutes les listes de sorties de l\'agenda (eventRow)');
});

test('Lettrine (design 7) : l\'initiale et le mot du genre, sans genre sûr « Sortie », décor caché à TalkBack, jetons seulement', () => {
  const words = app.match(/const TILE_WORD = (\{[^}]+\});/)[1];
  const W = Function(`return ${words}`)();
  for (const g of ['musique', 'scene', 'expo', 'cine', 'fete', 'atelier', 'famille', 'balade', 'chiner', 'marche']) assert.ok(W[g], g);
  assert.ok(Object.values(W).every((w) => w.length <= 7), 'tient dans 46 px');
  assert.match(app, /const tileWord = \(genre\) => TILE_WORD\[genre\] \?\? 'Sortie';/);
  assert.match(app, /el\('span', \{ class: 'ev-thumb ev-letter', 'aria-hidden': 'true' \}, el\('i', \{\}, tileWord\(genre\)\.charAt\(0\)\), el\('b', \{\}, tileWord\(genre\)\)\)/);
  const rule = css.match(/\.ev-letter \{[^}]+\}/)[0];
  assert.match(rule, /background: color-mix\(in srgb, var\(--ink\) 6%, var\(--bg\)\)/, 'visible en clair et en sombre');
  assert.doesNotMatch(css.match(/\.ev-letter[\s\S]*?white-space: nowrap; \}/)[0], /#[0-9a-f]{3,6}\b/i, 'aucune couleur en dur');
  assert.match(css, /\.ev-letter i \{[^}]*color: var\(--disc\);/, 'terre cuite (mon choix 2A)');
});

test('Vignette 56 × 76 px en haut de la ligne ; la distance reste centrée ; les autres lignes de la liste gardent la colonne', () => {
  assert.match(css, /\.ev-thumb \{[^}]*width: 56px; height: 76px; object-fit: cover;/);
  assert.match(css, /\.ev-list:has\(\.ev-thumb\) \.ev-main \{ grid-template-columns: 56px minmax\(0, 1fr\) auto; align-items: start; \}/);
  assert.match(css, /\.ev-list:has\(\.ev-thumb\) \.ev-dist \{ align-self: center; \}/);
  assert.match(css, /\.ev-list:has\(\.ev-thumb\) \.genre \{ width: 56px; \}/);
});

test('Photos des salles : une par salle, nom propre, identifiant sûr', () => {
  const l = cleanVenuePhotos([{ name: '  Le  Baiser Salé ', id: 'salle-abc123', at: 1 }, { name: 'le baiser sale', id: 'salle-zzz999' }, { name: 'Ab', id: 'salle-xxx111' }, { name: 'Forum des images', id: '../../x' }, null]);
  assert.deepEqual(l, [{ name: 'Le Baiser Salé', id: 'salle-abc123', at: 1 }]);
  assert.equal(venuePhotoOf('LE BAISER SALE', l)?.id, 'salle-abc123');
});

test('Photo d\'une salle pour une sortie : par le nom, mot pour mot (comme Mes salles), le plus long d\'abord', () => {
  const l = cleanVenuePhotos([{ name: '38Riv', id: 'salle-court1' }, { name: '38Riv Jazz Club', id: 'salle-long22' }, { name: "L'Olympia", id: 'salle-olymp3' }]);
  assert.equal(venuePhotoFor({ place: '38Riv Jazz Club' }, l)?.id, 'salle-long22');
  assert.equal(venuePhotoFor({ place: '38Riv' }, l)?.id, 'salle-court1');
  assert.equal(venuePhotoFor({ place: 'Les Olympiades' }, l), null, 'jamais un lieu voisin par un bout de mot');
  assert.equal(venuePhotoFor({ place: 'Fnac Forum des Halles' }, l), null);
});

test('Ajouter, remplacer, retirer une photo de salle : l\'ancienne photo est rendue pour être effacée', () => {
  let r = setVenuePhoto([], 'Le Double Fond', 'salle-aaa111', 5);
  assert.deepEqual(r, { list: [{ name: 'Le Double Fond', id: 'salle-aaa111', at: 5 }], old: null });
  r = setVenuePhoto(r.list, 'le double fond', 'salle-bbb222', 6);
  assert.equal(r.old, 'salle-aaa111');
  assert.deepEqual(r.list, [{ name: 'Le Double Fond', id: 'salle-bbb222', at: 6 }], 'le nom d\'origine reste');
  r = removeVenuePhoto(r.list, 'Le Double Fond');
  assert.deepEqual(r, { list: [], old: 'salle-bbb222' });
});

test('Les salles les plus présentes : sorties différentes comptées, sans bibliothèques ni salles suivies, deux graphies réunies', () => {
  const ev = (title, place, lat = 48.8567, lng = 2.3546) => ({ title, place, lat, lng });
  const events = [
    ev('A', '38Riv Jazz Club'), ev('B', '38Riv Jazz Club'), ev('C', '38Riv', 48.85671, 2.35461), ev('A', '38Riv Jazz Club'),
    ev('D', 'Médiathèque James Baldwin', 48.88, 2.37), ev('E', 'Médiathèque James Baldwin', 48.88, 2.37),
    ev('F', 'Le Baiser Salé', 48.8597, 2.3482), ev('G', 'Le Baiser Salé', 48.8597, 2.3482),
    ev('H', 'Forum des images', 48.862, 2.346),
    ev('I', 'Le Double Fond', 48.8556, 2.3626),
  ];
  const top = topVenues(events, { followed: ['Le Double Fond'] });
  assert.deepEqual(top, [{ name: '38Riv', n: 3 }, { name: 'Le Baiser Salé', n: 2 }, { name: 'Forum des images', n: 1 }]);
  assert.equal(topVenues(events, { max: 1 }).length, 1);
  assert.deepEqual(topVenues([ev('X', '38Riv'), ev('Y', '38Riv Jazz Club', 48.87, 2.30)]).length, 2, 'deux lieux loin l\'un de l\'autre restent deux');
});

test('Mes photos des salles : dans la sauvegarde générale (mon choix 1B), jamais dans l\'export de Vu en passant ni pour un proche', () => {
  assert.notEqual(VENUE_PHOTOS_KEY, KEY);
  assert.ok(VENUE_PHOTO_SIDE >= 400 && VENUE_PHOTO_SIDE <= 800, 'réduite : assez pour la vignette et le bandeau');
  const st = memStorage();
  saveState(st, { ...loadState(st), venuePhotos: [{ name: 'Le Baiser Salé', id: 'salle-abc123' }] });
  assert.doesNotMatch(st.getItem(KEY), /salle-abc123/, 'liste à part, pas dans l\'état des lieux');
  const bk = app.slice(app.indexOf('async function backupText('), app.indexOf('function backupFile('));
  assert.match(bk, /if \(withPhotos\) \{[\s\S]*const vp = cleanVenuePhotos\(venuePhotos\);[\s\S]*obj\.venuePhotos = vp\.filter/, 'avec les photos de la sauvegarde');
  const imp = app.slice(app.indexOf('async function importPhotos('), app.indexOf('async function importPhotos(') + 1500);
  assert.match(imp, /if \(venuePhotoOf\(x\.name, venuePhotos\) \|\| typeof photos\[x\.id\] !== 'string'\) continue;/, 'une salle qui a déjà sa photo la garde');
  assert.match(imp, /for \(const x of mine \? cleanVenuePhotos\(file\.venuePhotos\) : \[\]\)/, 'jamais depuis le fichier d\'un proche');
  assert.match(app, /importPhotos\(text, state, !owner\);/);
  const vu = app.slice(app.indexOf('function openSeenExport'), app.indexOf('function openSeenExport') + 6000);
  assert.doesNotMatch(vu, /venuePhoto/, 'pas dans Exporter de Vu en passant');
  const friend = app.slice(app.indexOf('const obj = exportForFriend('), app.indexOf('const obj = exportForFriend(') + 800);
  assert.doesNotMatch(friend, /venuePhoto/, 'jamais pour un proche');
  assert.match(app, /storage\.setItem\(VENUE_PHOTOS_KEY,/, 'sa propre clé, dans la mémoire de l\'essai pendant un essai');
  assert.match(app, /compressImage\(f, VENUE_PHOTO_SIDE\)/, 'réduite sur le téléphone, position effacée');
});

test('Autres réglages → Ce qui s\'affiche : « Photos des salles » sous Fiche d\'un lieu, puis les interrupteurs, Photos dans Sorties en premier (v359)', () => {
  const page = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const f = page.indexOf("'Fiche d\\'un lieu'");
  const c = page.indexOf("row('camera', 'Photos des salles'");
  const b = page.indexOf("onOff('evThumbs', 'image', 'Photos dans Sorties'"); // 6A (25 nov.) : l'image du bouton de Sorties
  const a = page.indexOf("onOff('masculin'");
  const d = page.indexOf("'ring-title menu-group' }, 'Appli')");
  assert.ok(f > 0 && c > f && b > c && a > b && d > a);
  assert.ok(!page.slice(c + 10, b).includes('row('), 'les deux lignes Photos côte à côte');
  const notStyle = (t) => t.replace("row('palette', 'Style de l\\'appli'", ''); // v452 : Style de l'appli, une ligne de plus tout en bas
  assert.ok(!notStyle(page.slice(b, d)).includes('row('), 'les interrupteurs ensemble, en bas du groupe');
  assert.match(app, /'Dans Sorties, la photo de l\\'agenda passe toujours avant la tienne\.'/);
});
