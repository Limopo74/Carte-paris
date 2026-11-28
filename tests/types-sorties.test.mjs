// v554 (mes choix du 28 nov. 2026) : types de sorties, mes artistes et mes thèmes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TYPE_IDS, cleanEvPick, cleanThemes, mergeEvPick, themeHit, liked, passPick, pickText, pickOn } from '../js/types-sorties.js';

const ev = (title, extra = {}) => ({ title, place: '', tags: '', lead: '', ...extra });

test('le choix : 10 types connus, les 10 cochés valent « tous », un inconnu est retiré', () => {
  assert.equal(TYPE_IDS.length, 10);
  assert.deepEqual(cleanEvPick(null), { types: null, themes: [] });
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
  assert.equal(pickText({ types: ['expo', 'musique', 'cine', 'fete'] }), '4 types sur 10');
  assert.equal(pickText({ types: [], themes: ['jazz'] }), 'Mes artistes et thèmes');
});

test('sauvegarde : depuis ma propre sauvegarde, les types du téléphone gardés, les thèmes ajoutés', () => {
  assert.deepEqual(mergeEvPick({ types: ['expo'], themes: ['jazz'] }, { types: ['cine'], themes: ['Japon', 'Jazz'] }), { types: ['expo'], themes: ['jazz', 'Japon'] });
  assert.deepEqual(mergeEvPick(null, { types: ['cine'] }), { types: ['cine'], themes: [] });
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
