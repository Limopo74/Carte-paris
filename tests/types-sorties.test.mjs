// v554 (mes choix du 28 nov. 2026) : types de sorties, mes artistes et mes thèmes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { TYPE_IDS, cleanEvPick, cleanThemes, mergeEvPick, themeHit, liked, passPick, pickText, pickOn } from '../js/types-sorties.js';

const ev = (title, extra = {}) => ({ title, place: '', tags: '', lead: '', ...extra });

test('le choix : 11 types connus (v564 : Sport), les 11 cochés valent « tous », un inconnu est retiré', () => {
  assert.equal(TYPE_IDS.length, 11);
  assert.deepEqual(cleanEvPick({ types: ['expo', 'autre'] }).types, ['expo', 'sport', 'autre']); // un choix d'avant : le sport était dans Autres
  assert.deepEqual(cleanEvPick({ types: ['expo', 'autre'], typesV: 2 }).types, ['expo', 'autre']); // Sport décoché ensuite : respecté
  assert.deepEqual(cleanEvPick(null), { types: null, themes: [], nots: [], typesV: 2 });
  assert.deepEqual(cleanEvPick({ types: ['musique', 'expo', 'zzz'] }).types, ['expo', 'musique']); // dans l'ordre des rubriques
  assert.equal(cleanEvPick({ types: [...TYPE_IDS] }).types, null);
  assert.deepEqual(cleanEvPick({ types: [] }).types, []);
  assert.equal(pickOn({ types: ['expo'] }), true);
  assert.equal(pickOn({ types: [...TYPE_IDS] }), false);
});

test('mes thèmes : sans doublon, accents et majuscules ignorés, 2 lettres au moins', () => {
  assert.deepEqual(cleanThemes(['Jazz', 'jazz', ' Japon ', 'x', 'Photographie', 'photographie ', 42]), ['Jazz', 'Japon', 'Photographie']);
});

test('T4 A : début de mot ; 3 lettres ou moins, mot entier', () => {
  assert.equal(themeHit(ev('Exposition de photographies'), 'photo'), true);
  assert.equal(themeHit(ev('Les estampes japonaises'), 'Japon'), true);
  assert.equal(themeHit(ev('Une photocopieuse géante'), 'photo'), true); // début de mot : accepté (choix T4 A)
  assert.equal(themeHit(ev('Atelier artichaut'), 'art'), false);
  assert.equal(themeHit(ev('Le départ du train'), 'art'), false);
  assert.equal(themeHit(ev('Street art au canal'), 'art'), true);
  assert.equal(themeHit(ev('Soirée'), 'jazz'), false);
  assert.equal(themeHit(ev('Concert', { tags: 'Concerts -> Jazz' }), 'jazz'), true); // étiquettes
  assert.equal(themeHit(ev('Concert', { lead: 'Un trio de JAZZ manouche' }), 'jazz'), true); // chapô
  assert.equal(themeHit(ev('Récital', { place: 'Philharmonie de Paris' }), 'philharmonie'), true); // lieu
  assert.equal(themeHit(ev('Musique classique en plein air'), 'musique classique'), true);
  assert.equal(themeHit(ev('Musique de chambre classique'), 'musique classique'), false);
  assert.equal(themeHit(ev('Été au théâtre'), 'ete'), true); // accents ignorés
});

test('T1 A : en plus des types ; mes artistes en nom entier', () => {
  const pick = { types: ['expo'], themes: ['jazz'] };
  assert.equal(passPick(ev('Expo Hockney'), 'expo', pick), true);
  assert.equal(passPick(ev('Concert de jazz'), 'musique', pick), true); // un autre type, mais mon thème
  assert.equal(passPick(ev('Concert de rock'), 'musique', pick), false);
  assert.equal(passPick(ev('Inconnue'), null, { types: ['autre'] }), true); // Autres sorties
  assert.equal(passPick(ev('Rétrospective David Hockney'), 'scene', { types: ['expo'] }, ['David Hockney']), true);
  assert.equal(passPick(ev('Rétrospective Hockney'), 'scene', { types: ['expo'] }, ['David Hockney']), false);
  assert.equal(passPick(ev('Tout passe'), 'scene', null), true); // rien choisi : tout
  assert.equal(liked(ev('Concert de jazz'), pick), true);
  assert.equal(liked(ev('Expo'), pick), false);
});

test('la ligne du haut : 2 types au plus en clair, sinon le nombre', () => {
  assert.equal(pickText(null), null);
  assert.equal(pickText({ types: ['expo', 'musique'] }), 'Expos, Concerts');
  assert.equal(pickText({ types: ['expo', 'musique', 'cine', 'fete'] }), '4 types sur 11');
  assert.equal(pickText({ types: [], themes: ['jazz'] }), 'Mes artistes et thèmes');
});

test('sauvegarde : depuis ma propre sauvegarde, les types du téléphone gardés, les thèmes ajoutés', () => {
  assert.deepEqual(mergeEvPick({ types: ['expo'], themes: ['jazz'] }, { types: ['cine'], themes: ['Japon', 'Jazz'] }), { types: ['expo'], themes: ['jazz', 'Japon'], nots: [], typesV: 2 });
  assert.deepEqual(mergeEvPick(null, { types: ['cine'] }), { types: ['cine'], themes: [], nots: [], typesV: 2 });
});

test('branché : enregistré, dans ma sauvegarde, jamais dans le fichier pour un proche', () => {
  const store = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
  assert.match(store, /evPick: cleanEvPick\(obj\.evPick\)/);
  assert.match(store, /evPick: cleanEvPick\(state\.evPick\)/);
  assert.match(store, /pickOn\(state\.evPick\) \|\| cleanEvPick\(state\.evPick\)\.themes\.length \? \{ evPick: cleanEvPick\(state\.evPick\) \}/);
  assert.match(store, /const evPick = !owner \? mergeEvPick\(state\.evPick, obj\.evPick\) : cleanEvPick\(state\.evPick\)/);
  const friend = store.slice(store.indexOf('export function exportForFriend'), store.indexOf('export function exportForFriend') + 3000);
  assert.doesNotMatch(friend, /evPick/);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function openEvTypes\(/);
  assert.match(app, /'Types de sorties'/);
});

test('hors ligne : chaque module de js/ importé par l\'appli est dans le cache (sw.js)', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const missing = [];
  for (const f of readdirSync(new URL('../js/', import.meta.url))) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/from '\.\/([\w-]+\.js)'/g)) if (!sw.includes(`'js/${m[1]}'`)) missing.push(`${f} → ${m[1]}`);
  }
  assert.deepEqual([...new Set(missing)], []);
});

// v561 (mes choix E1 A à E4 A du 28 nov.) : « Je ne veux pas »
import { notHit } from '../js/types-sorties.js';
test('E2 A, E3 A : un mot écarté masque (début de mot) ; mon artiste ou mon thème gagne', () => {
  const pick = { types: null, themes: ['Hockney'], nots: ['enfant', 'yoga'] };
  assert.equal(notHit(ev('Atelier pour les enfants'), pick), true);
  assert.equal(passPick(ev('Atelier pour les enfants'), 'atelier', pick), false);
  assert.equal(passPick(ev('Yoga au parc'), 'autre', pick), false);
  assert.equal(passPick(ev('Hockney pour les enfants'), 'expo', pick), true); // mon thème gagne
  assert.equal(passPick(ev('Concert de piano'), 'musique', pick), true);
  assert.equal(passPick(ev('Expo', { lead: 'Pour les enfantines' }), 'expo', pick), false); // chapô, début de mot
  assert.equal(passPick(ev('Rétrospective David Hockney, atelier enfants'), 'expo', { nots: ['enfant'] }, ['David Hockney']), true); // mon artiste gagne
});
test('v561 : les mots écartés comptent comme un choix ; gardés et fusionnés', () => {
  assert.equal(pickOn({ nots: ['yoga'] }), true);
  assert.equal(pickText({ nots: ['yoga'] }), 'Sauf yoga');
  assert.equal(pickText({ nots: ['yoga', 'danse', 'conférence'] }), 'Sauf yoga, danse…');
  assert.deepEqual(mergeEvPick({ nots: ['yoga'] }, { nots: ['Yoga', 'conférence'] }).nots, ['yoga', 'conférence']);
  assert.deepEqual(cleanEvPick({ nots: ['x', 'Stand-up'] }).nots, ['Stand-up']);
});
