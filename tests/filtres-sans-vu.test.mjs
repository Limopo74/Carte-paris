// v364 (mon choix A du 21 nov.) : plus d'interrupteur « Vu en passant » dans Filtres ; « Mes listes » explique à quoi sert une liste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const filters = app.slice(app.indexOf('function openFilters'), app.indexOf('function openFilterChoice'));

test('Filtres : plus de ligne Vu en passant, ni dans Filtres affichés', () => {
  assert.doesNotMatch(filters, /keep\('seen'/);
  assert.doesNotMatch(filters, /Tes photos prises en marchant/);
  assert.doesNotMatch(app, /filt\.seen/);
  assert.doesNotMatch(app, /\['seen', 'camera', 'Vu en passant'\]/);
});

test('Filtres : « Mes listes » a un bouton Nouvelle liste qui revient à Filtres, plus de chemin à lire', () => {
  assert.match(filters, /« Pour fêter » ou « Avec des enfants »/);
  assert.doesNotMatch(filters, /crée-les dans Réglages/);
  assert.match(filters, /openListPlaces\(r\.id, '', null, named\('Filtres', openFilters\)\)/);
  assert.doesNotMatch(filters, /Choisis d\\'abord tes lignes \(Réglages/);
});

test('Filtres : Filtrer mes lieux, puis Afficher aussi sur la carte, puis Arrondissement (mon choix B)', () => {
  const a = filters.indexOf("withTitle('Filtrer mes lieux'"), b = filters.indexOf("'Afficher aussi sur la carte'"), c = filters.indexOf("withTitle('Arrondissement'");
  assert.ok(a > 0 && a < b && b < c, 'ordre des groupes');
  const choice = app.slice(app.indexOf('function openFilterChoice'), app.indexOf('/** Ajoute ou retire une catégorie'));
  assert.ok(choice.indexOf("['arr'") > choice.indexOf("['jardins'"), 'Filtres affichés suit le même ordre');
});
