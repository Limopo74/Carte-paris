// v483 (mon choix 1 du 25 nov.) : le soir, Rentrer en bus rappelle la descente à la demande entre deux arrêts (IDFM, RATP).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('la ligne du soir : de 21 h à 6 h, dans le bloc bus de Rentrer, sans heure de passage inventée', () => {
  const m = app.match(/const eveningBus = \(d = new Date\(\)\) => ([^;]+);/);
  assert.ok(m, 'eveningBus existe');
  const eveningBus = new Function('d', `return ${m[1]};`);
  const at = (h, min = 0) => eveningBus(new Date(2026, 10, 25, h, min));
  assert.equal(at(20, 59), false);
  assert.equal(at(21), true);
  assert.equal(at(23, 30), true);
  assert.equal(at(2), true);
  assert.equal(at(5, 59), true);
  assert.equal(at(6), false);
  assert.equal(at(14), false);
  const bus = app.slice(app.indexOf('const busBlock = !home.bus'), app.indexOf('await loadGares();'));
  assert.match(bus, /eveningBus\(\) \? el\('p', \{ class: 'help' \}[^\n]*Après 22 h, tu peux descendre entre deux arrêts : dis-le au conducteur au moins un arrêt avant\./);
  // v498 : sortie des Nouveautés (10 au plus), l'Aide garde la règle avec sa source.
  assert.match(app, /Noctilien compris \(Île-de-France Mobilités, RATP\)/, 'Aide, avec la source');
});
