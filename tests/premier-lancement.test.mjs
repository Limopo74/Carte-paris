// v312 : premier lancement (mes choix du 20 nov.) : le départ d'un nouveau venu et le circuit de réglage en 6 étapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadState, saveState, freshStart, cleanSettings } from '../js/store.js';

const KEY = 'carte-paris.v1';
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Mémoire vide : le départ d\'un nouveau venu (d\'après ma capture)', () => {
  const s = loadState(memStorage());
  assert.equal(s.fresh, true);
  assert.deepEqual(s.hiddenChips, ['ttb'], 'TTB masqué tant qu\'aucune liste n\'est importée');
  assert.ok(s.moreChips.includes('fav'), 'Favoris sous ⋯ Plus');
  for (const id of ['resto', 'boutique', 'culture']) assert.ok(s.moreChips.includes(`cat:${id}`), `catégorie ${id} sous ⋯ Plus`);
  assert.ok(s.categories.some((c) => c.id === 'vu'), 'Vu en passant existe dès le départ');
  assert.ok(!s.moreChips.includes('cat:vu') && !s.hiddenChips.includes('cat:vu'), 'Vu en passant dans la barre');
  for (const k of ['street', 'lines']) assert.ok(!s.moreChips.includes(k) && !s.hiddenChips.includes(k), `${k} dans la barre`);
  assert.ok(!s.moreTools.includes('notes'), 'Note du jour sur la carte');
  assert.ok(s.moreTools.includes('home'), 'Rentrer reste dans ⋯ Plus');
  assert.deepEqual(s.categories.filter((c) => c.id !== 'vu').map((c) => c.id), ['resto', 'boutique', 'culture']);
  assert.deepEqual(s.lists, []);
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
  assert.deepEqual(again.hiddenChips, ['ttb']);
  assert.deepEqual(again.moreChips, f.moreChips);
  assert.ok(!JSON.parse(st2.getItem(KEY)).fresh);
  assert.deepEqual(cleanSettings(again).hiddenChips, ['ttb']);
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
  assert.match(pages, /welcomeNext = 2; pickImport\('friend'\)/, 'après les lieux d\'un proche, il reprend');
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
