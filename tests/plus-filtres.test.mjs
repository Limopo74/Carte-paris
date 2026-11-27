// v544 (mon choix A du 27 nov.) : ⋯ Plus et Filtres disent la même chose de la même façon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FILTER_KEYS, cleanFilterKeys } from '../js/store.js';

const src = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const unq = (t) => t.replace(/\\'/g, '\'');
const part = (a, b) => src.slice(src.indexOf(a), src.indexOf(b, src.indexOf(a)));

test('Plus et Filtres (v544) : une couche porte le même nom aux deux endroits', () => {
  const chips = Object.fromEntries([...part('function chipItems(', 'function openChipsMore(').matchAll(/\{ key: '(\w+)', name: '((?:\\'|[^'])*)'/g)].map((m) => [m[1], unq(m[2])]));
  const filters = part('function openFilters(', '\nfunction ');
  const filterKey = { street: 'markets' };
  const layers = ['street', 'ttb', 'lines', 'velib', 'buslines', 'pratique', 'passages', 'velo', 'jardins', 'dansmarue'];
  for (const k of layers) {
    assert.ok(chips[k], `${k} : bouton du haut`);
    const name = chips[k].replace(/'/g, '\\\'');
    assert.ok(filters.includes(`'${name}', layerSub('${k}')`), `${k} : « ${chips[k]} » et sa petite ligne partagée dans Filtres`);
    assert.ok(FILTER_KEYS.includes(filterKey[k] ?? k), `${k} : a sa ligne dans « Choisir les filtres affichés »`);
  }
  const choice = part('function openFilterChoice(', '\nfunction ');
  assert.ok(choice.includes('\'Vélib\\\' sur la carte\'') && choice.includes('\'Fontaines et WC sur la carte\'') && choice.includes('\'Signalements Dans ma rue\''), 'les mêmes noms dans « Choisir les filtres affichés »');
  assert.ok(!filters.includes('\'Fontaines et toilettes\''), 'plus l\'ancien nom');
});

test('Plus et Filtres (v544) : ⋯ Plus prend la petite ligne des couches dans layerSub et range sous les titres de Filtres', () => {
  const more = part('function openChipsMore(', '\nfunction ');
  assert.match(more, /LAYER_KEYS\.includes\(x\.key\) \? layerSub\(x\.key\)/);
  assert.ok(more.includes('\'Filtrer mes lieux\'') && more.includes('\'Afficher aussi sur la carte\''));
  assert.ok(!/velib: 'Les stations/.test(more), 'aucun texte de couche recopié dans Plus');
  assert.deepEqual(cleanFilterKeys(['dansmarue']), ['dansmarue'], 'Dans ma rue peut se masquer dans Filtres');
});
