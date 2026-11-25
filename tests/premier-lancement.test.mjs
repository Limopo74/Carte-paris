// v314 : premier lancement (mes choix du 20 nov.) : le départ d'un nouveau venu et le circuit de réglage en 6 étapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, freshStart, cleanSettings, barOrderOf, freshChips, chipsAsFresh, FRESH_TOOLS } from '../js/store.js';
import { defaultPreset } from '../js/depart.js';

const KEY = 'carte-paris.v1';
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Mémoire vide : le départ d\'un nouveau venu (v440, d\'après mes captures de 6 h 29 et 6 h 31)', () => {
  const s = loadState(memStorage());
  assert.equal(s.fresh, true);
  // Barre du haut : Dans la rue, Lignes, Vu en passant, en icônes seules
  const bar = barOrderOf(s.chipOrder, s.categories.map((c) => c.id)).filter((k) => !s.hiddenChips.includes(k) && !s.moreChips.includes(k));
  assert.deepEqual(bar, ['street', 'lines'], 'v442 (mon choix 4B) : Vu en passant dans ⋯ Plus, ⋯ visible à 360 px');
  assert.equal(s.chipIcons, true);
  // ⋯ Plus du haut, dans cet ordre (Mes artistes toujours en tête) ; v442 (mon choix 2B) : TTB dès le départ
  const more = barOrderOf(s.chipOrder, s.categories.map((c) => c.id)).filter((k) => s.moreChips.includes(k));
  assert.deepEqual(more, ['cat:vu', 'fav', 'cat:boutique', 'cat:culture', 'cat:resto', 'pratique', 'jardins', 'ttb', 'velib', 'passages', 'artistes']);
  assert.deepEqual(s.hiddenChips, ['buslines', 'velo'], 'ce qui ne se voit pas est masqué');
  assert.deepEqual(s.hiddenFilters, ['buslines', 'velo'], 'Filtres : les mêmes lignes masquées');
  // Colonne : Ma position, Sorties, Mon planning, Vu en passant, Rentrer ; ⋯ Plus : Mon Paris, Métro, Centre de Paris, Note du jour, Vélib', Fontaine et WC ; Circuits masqué
  assert.deepEqual(s.mapTools.filter((t) => !s.moreTools.includes(t) && !s.hiddenTools.includes(t)), ['locate', 'sorties', 'planning', 'vu', 'home']);
  assert.deepEqual(s.mapTools.filter((t) => s.moreTools.includes(t)), ['myparis', 'metro', 'paris', 'notes', 'velib', 'pratique']);
  assert.deepEqual(s.hiddenTools, ['circuits']);
  assert.ok(s.categories.some((c) => c.id === 'vu'), 'Vu en passant existe dès le départ');
  assert.deepEqual(s.categories.filter((c) => c.id !== 'vu').map((c) => c.id), ['resto', 'boutique', 'culture']);
  assert.deepEqual(s.lists, []);
});

test('v442 : « comme au début » range TTB et toutes mes catégories dans ⋯ Plus', () => {
  const f = freshChips(['resto', 'theatre', 'vu']);
  assert.ok(!f.hiddenChips.includes('ttb') && f.moreChips.includes('ttb'));
  assert.ok(f.moreChips.includes('cat:theatre') && f.moreChips.includes('cat:vu'));
  assert.ok(chipsAsFresh({ ...f }, ['resto', 'theatre', 'vu']));
  assert.ok(!chipsAsFresh({ ...f, chipIcons: false }, ['resto', 'theatre', 'vu']), 'icônes et noms : pas comme au début');
  assert.ok(!chipsAsFresh({ hiddenChips: [], moreChips: undefined, chipOrder: null }, ['resto']), 'l\'ancien départ n\'est plus « comme au début »');
  // Téléphones d'avant la v442 (TTB masqué au départ) : le bouton TTB, revenu avec la première liste, va dans ⋯ Plus (v314 : la barre)
  const back = app.slice(app.indexOf('function ttbChipBack('), app.indexOf('function ttbChipBack(') + 500);
  assert.match(back, /state\.moreChips = \[\.\.\.cleanMoreChips\(state\.moreChips \?\? \[\], state\.hiddenChips\)\.filter\(\(k\) => k !== 'ttb'\), 'ttb'\];/);
  // Boutons de la carte comme au début = la colonne du départ
  assert.match(app, /state\.mapTools = \[\.\.\.FRESH_TOOLS\.mapTools\]; state\.hiddenTools = \[\.\.\.FRESH_TOOLS\.hiddenTools\]; state\.moreTools = \[\.\.\.FRESH_TOOLS\.moreTools\];/);
});

test('v440 : Nouveautés, la ligne en tête', () => {
  const i = app.indexOf("['sparkles', 'Nouveautés', [");
  const lines = app.slice(i, app.indexOf(']],', i)).split('\n').filter((l) => l.trim().startsWith("'{"));
  // v452 : sa ligne des Nouveautés est sortie (10 au plus, « Deux nouveaux styles » en tête) ; Réglages → Barre du haut garde « Barre du haut comme au début »
  assert.ok(!lines.some((l) => l.includes('**Les boutons comme au début**')));
  assert.match(app, /chipsAsFresh\(state, catIds\)/);
});

test('v440 : la préparation d\'un proche part du même départ', () => {
  const p = defaultPreset();
  assert.deepEqual(p.hiddenChips, ['buslines', 'velo']);
  assert.ok(p.moreChips.includes('fav') && p.moreChips.includes('cat:vu') && p.moreChips.includes('ttb'));
  assert.equal(p.chipIcons, true);
  assert.deepEqual(p.chipOrder.slice(0, 3), ['street', 'lines', 'cat:vu']);
  assert.deepEqual([p.mapTools, p.hiddenTools, p.moreTools].map((x) => x.join()), [FRESH_TOOLS.mapTools, FRESH_TOOLS.hiddenTools, FRESH_TOOLS.moreTools].map((x) => x.join()));
});

test('Une mémoire déjà là ne change pas (mon téléphone, l\'autre personne)', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [] }));
  const s = loadState(st);
  assert.equal(s.fresh, undefined);
  assert.deepEqual(s.hiddenChips, []);
  assert.ok(s.moreTools.includes('notes'));
  assert.ok(!s.categories.some((c) => c.id === 'vu'));
  // Le départ d'un nouveau venu, une fois enregistré, se relit tel quel, sans la marque « fresh »
  const st2 = memStorage();
  const f = loadState(st2);
  saveState(st2, f);
  const again = loadState(st2);
  assert.equal(again.fresh, undefined);
  assert.deepEqual(again.hiddenChips, ['buslines', 'velo']);
  assert.deepEqual(again.chipOrder, f.chipOrder);
  assert.equal(again.chipIcons, true);
  assert.deepEqual(again.hiddenFilters, ['buslines', 'velo']);
  assert.deepEqual(again.moreChips, f.moreChips);
  assert.ok(!JSON.parse(st2.getItem(KEY)).fresh);
  assert.deepEqual(cleanSettings(again).hiddenChips, ['buslines', 'velo']);
});

test('freshStart : ne double pas Vu en passant', () => {
  const s = freshStart(freshStart(loadState(memStorage())));
  assert.equal(s.categories.filter((c) => c.id === 'vu').length, 1);
});

test('Le circuit : 6 étapes, une fois, pas par-dessus un lien reçu, pas après une restauration', () => {
  assert.match(app, /const WELCOME_STEPS = 6;/);
  const pages = app.slice(app.indexOf('function openWelcome('), app.indexOf('/* ---------- Démarrage ---------- */'));
  for (const t of ['Bienvenue', 'Taille du texte', 'Pour toi', 'Rentrer', 'Ta position', 'C\\\'est prêt']) assert.ok(pages.includes(`'${t}'`) || pages.includes(t), t);
  for (const w of ['Restaurer ma sauvegarde', 'Importer les lieux d\\\'un proche', 'Au féminin', 'Au masculin', 'À droite', 'À gauche', 'Noms à côté des boutons', 'J\\\'ai un passe Navigo', 'Choisir ma station Maison', 'Autoriser ma position', 'Installer sur l\\\'écran d\\\'accueil', 'Prise en main', 'Voir ma carte']) assert.ok(pages.includes(w), w);
  assert.match(app, /!firstDone\(\)\) \{ \/\/ pas par-dessus un lien reçu/, 'jamais par-dessus un lien reçu, et une seule fois');
  assert.match(app, /if \(state\.fresh\) \{ openWelcome\(1\); persist\(\); \} else openSheet\('Ta carte est vide'/);
  assert.match(pages, /if \(step === 1\) \{ try \{ storage\.setItem\(FIRST_KEY, '1'\)/, 'ouvert une fois : ne revient pas');
  assert.match(pages, /welcomeNext = 0; pickImport\('mine'\)/, 'après ma sauvegarde restaurée, le circuit s\'arrête');
  assert.match(pages, /welcomeNext = nextOf\(1\); pickImport\('friend'\)/, 'après les lieux d\'un proche, il reprend');
  assert.match(app, /if \(welcomeNext && owner\)/);
  assert.match(app, /'Refaire les réglages du début'/, 'relancé depuis Aide → Prise en main');
});

test('Installer : la barre de Chrome n\'attend que pendant le circuit ; le bouton seulement si Chrome le permet', () => {
  const h = app.slice(app.indexOf("window.addEventListener('beforeinstallprompt'"), app.indexOf('function openWelcome('));
  assert.ok(h.indexOf("startsWith('welcome:')) return;") < h.indexOf('e.preventDefault()'), 'hors du circuit, Chrome fait comme d\'habitude');
  assert.match(app, /installEvt \? el\('button'[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*'Installer sur l\\'écran d\\'accueil'\) : null/);
});

test('TTB : le bouton revient avec la première liste importée (page du guide ou sauvegarde)', () => {
  assert.match(app, /if \(!before\) ttbChipBack\(\);/);
  assert.match(app, /if \(r\.list && !had\) ttbChipBack\(\);/);
});

test('v315 : Essayer le premier lancement (Réglages) : une mémoire à part, mes données jamais lues ni écrites', () => {
  assert.match(app, /storage = ESSAI \? memStorage\(\) : window\.localStorage/);
  assert.match(app, /sessionStorage\.setItem\(ESSAI_KEY, '1'\)/, 'l\'essai ne dure que le temps de l\'onglet');
  assert.ok(!/localStorage\.(get|set)Item\(JOURNAL_KEY/.test(app), 'Mes chiffres passent aussi par la mémoire de l\'essai');
  assert.match(app, /ESSAI \? \{ text: 'Essai en cours · Terminer', act: 'essai' \} : null/, 'un mode allumé a toujours un bouton visible qui le dit et l\'éteint');
  assert.match(app, /if \(n\?\.act === 'essai'\) endEssai\(\)/);
  // v322 : tout en bas d'Autres réglages, au-dessus du retour ; « Terminer l'essai » reste sur Réglages pendant l'essai
  const end = app.indexOf("), { name: 'settings:autres'");
  const row = app.lastIndexOf("'Essayer le premier lancement'", end);
  const prep = app.indexOf("'Préparer le démarrage d\\'un proche'", row);
  const test = app.indexOf("onOff('test', 'megaphone', 'Période de test'", row);
  assert.ok(row > 0 && prep > row && prep - row < 900 && test > prep && test < end, 'en bas d\'Autres réglages → Appli, « Préparer le démarrage d\'un proche » juste dessous, puis l\'interrupteur Période de test (v359)');
  const main = app.indexOf('mySettingsBlock(),\n  ), { name: \'settings\'');
  assert.ok(main - app.lastIndexOf("'Terminer l\\'essai'", main) < 400, 'Terminer l\'essai sur Réglages, en bas');
  assert.match(app, /'Terminer l\\'essai'/);
});

test('v316 : le fond « Éclairci » (sans clé) est celui d\'un nouveau venu ; mon style ne change pas', async () => {
  const { MAP_STYLES } = await import('../js/store.js');
  assert.ok(MAP_STYLES.includes('eclairci'));
  assert.equal(loadState(memStorage()).mapStyle, 'eclairci');
  const st = memStorage(); st.setItem(KEY, JSON.stringify({ points: [], mapStyle: 'clean' }));
  assert.equal(loadState(st).mapStyle, 'clean');
  const st2 = memStorage(); st2.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st2).mapStyle, 'classic', 'une mémoire déjà là sans style garde Classique');
  assert.match(app, /eclairci: \{ name: 'Éclairci', [^\n]*url: 'https:\/\/tile\.openstreetmap\.org\//, 'mêmes tuiles que Classique : rien de nouveau envoyé, et gardées pour le métro');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /#map\[data-style="eclairci"\] \.leaflet-tile-pane \{ filter: saturate\(\.5\) brightness\(1\.06\); \}/);
  assert.match(css, /\.s-eclairci \{/);
});

test('v317 : Très épuré (Positron) et Nuit épurée (Dark Matter) avec la même clé CARTO', async () => {
  const { MAP_STYLES } = await import('../js/store.js');
  for (const id of ['positron', 'darkmatter']) assert.ok(MAP_STYLES.includes(id), id);
  assert.match(app, /positron: \{ name: 'Très épuré', [^\n]*rastertiles\/light_all\/[^\n]*\?key=\{k\}/);
  assert.match(app, /darkmatter: \{ name: 'Nuit épurée', [^\n]*rastertiles\/dark_all\/[^\n]*\?key=\{k\}/);
  assert.match(app, /const id = needsKey\(state\.mapStyle\) && !cartoKey\(\) \? 'classic'/, 'sans clé : Classique, jamais un filigrane');
  assert.match(app, /if \(needsKey\(id\) && !cartoKey\(\)\) \{ openCartoKey\(undefined, id\)/);
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert.match(css, /:root\[data-theme="dark"\] #map:not\(\[data-style="darkmatter"\]\):not\(\[data-style="photo"\]\) \.leaflet-tile-pane/, 'le mode sombre ne retourne pas une carte déjà sombre');
});

test('v317 : Style de la carte en deux groupes : « Sans clé » puis « Avec la clé CARTO »', () => {
  const page = app.slice(app.indexOf("if (section === 'style') {"), app.indexOf("if (section === 'outils') {"));
  const a = page.indexOf("'Sans clé'"), b = page.indexOf("'Avec la clé CARTO'");
  assert.ok(a > 0 && b > a);
  assert.ok(page.indexOf('!needsKey(id)).map(card)') > a && page.indexOf('!needsKey(id)).map(card)') < b);
  assert.ok(page.indexOf('=> needsKey(id)).map(card)') > b);
  assert.match(page, /'Saisir ma clé CARTO'/, 'sans clé, le bouton pour la saisir est dans son groupe');
});

test('v319 : le bouton qui avance est vert plein ; une seule plaque pleine par étape ; la station choisie mène à l\'étape 5', () => {
  const w = app.slice(app.indexOf('function openWelcome('), app.indexOf('/* ---------- Préparer le démarrage d\'un proche'));
  assert.match(w, /const next = \(label = 'Suivant →'\) => el\('button', \{ type: 'button', class: 'btn c-add solid'/);
  const page = (n) => w.slice(w.indexOf(`    ${n}: [`), w.indexOf(`    ${n + 1}: [`) > 0 ? w.indexOf(`    ${n + 1}: [`) : w.indexOf('  };'));
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const p = page(n);
    const solids = (p.match(/solid/g) ?? []).length + (/next\(/.test(p) ? 1 : 0);
    assert.equal(solids, 1, `étape ${n} : une seule plaque pleine`);
  }
  assert.match(page(4), /openWelcome\(nextOf\(4\)\)/);
  assert.match(page(6), /'Voir ma carte'/);
});

test('v323 (mon choix 2a) : un nouveau venu a la fiche sans Uber ; QR code, Avis Google et étoiles restent ; mon téléphone ne change pas', () => {
  const s = loadState(memStorage());
  assert.deepEqual(s.ficheHidden, ['uber']);
  const st = memStorage(); saveState(st, { ...s, points: [{ id: 'a', name: 'Lieu', lat: 48.85, lng: 2.35, cat: 'resto' }] });
  assert.deepEqual(loadState(st).ficheHidden, ['uber'], 'gardé après le premier enregistrement');
  const old = memStorage(); old.setItem(KEY, JSON.stringify({ points: [] }));
  assert.deepEqual(loadState(old).ficheHidden, [], 'une mémoire existante garde toutes les lignes');
});
