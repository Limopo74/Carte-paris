// v165 : adresses TTB masquées ou fermées, retrouvées après un nouvel import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ttbKey, cleanTtbMarks, ttbMark, TTB_MARKS_KEY } from '../js/ttb.js';

const x = { name: 'Le Bouillon Chartier', address: '7, rue du Faubourg-Montmartre 75009 Paris', lat: 48.8719, lng: 2.3431 };

test('une adresse TTB se reconnaît par son nom et son adresse, même réimportée autrement écrite', () => {
  const again = { name: 'LE BOUILLON  CHARTIER', address: '7 rue du Faubourg Montmartre, 75009 Paris', lat: 48.87, lng: 2.34 };
  assert.equal(ttbKey(x), ttbKey(again));
  assert.notEqual(ttbKey(x), ttbKey({ ...x, address: '59 boulevard du Montparnasse 75006 Paris' }), 'autre adresse, autre lieu');
  assert.equal(TTB_MARKS_KEY, 'carte-paris.ttb-masque');
});

test('masquée ou fermée : notée, nettoyée, réversible', () => {
  const marks = cleanTtbMarks({ [ttbKey(x)]: { n: x.name, k: 'closed', at: 1 }, 'a|b': { n: 'A', k: 'hidden', at: 2 }, 'c|d': { k: 'autre', at: 3 }, '<x>|y': { k: 'hidden', at: 4 }, 'e|f': { k: 'hidden' } });
  assert.deepEqual(Object.keys(marks), [ttbKey(x), 'a|b']);
  assert.equal(ttbMark(marks, x), 'closed');
  assert.equal(ttbMark(marks, { name: 'Autre', address: '' }), '');
  assert.equal(ttbMark(null, x), '');
  assert.deepEqual(cleanTtbMarks('nimporte'), {});
});
