// v167 : garder un lieu en favori d'un appui — la catégorie devinée parmi les miennes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { favCategory } from '../js/art.js';

const cats = [{ id: 'resto', name: 'Restos' }, { id: 'vu', name: 'Vu en passant' }, { id: 'streetart', name: 'Street art' }, { id: 'm', name: 'Musées' }, { id: 'g', name: 'Galeries d\'art' }, { id: 'culture', name: 'Culture' }];

test('la catégorie d\'un lieu gardé d\'un appui : la mienne qui va avec le genre', () => {
  assert.equal(favCategory('musee', cats), 'm');
  assert.equal(favCategory('expo', cats), 'm');
  assert.equal(favCategory('galerie', cats), 'g');
  assert.equal(favCategory('theatre', cats), 'culture');
  assert.equal(favCategory('musique', [{ id: 'c', name: 'Concerts' }, ...cats]), 'c');
});

test('sinon Culture, sinon rien (le formulaire s\'ouvre) ; jamais Vu en passant ni street art', () => {
  assert.equal(favCategory('galerie', [{ id: 'resto', name: 'Restos' }, { id: 'culture', name: 'Ma culture' }]), 'culture');
  assert.equal(favCategory('musee', [{ id: 'resto', name: 'Restos' }, { id: 'b', name: 'Boutiques' }]), null);
  assert.equal(favCategory('galerie', [{ id: 'streetart', name: 'Street art' }, { id: 'vu', name: 'Vu en passant' }]), null);
  assert.equal(favCategory('inconnu', cats), 'm', 'genre inconnu : comme un musée');
  assert.equal(favCategory('musee', null), null);
});
