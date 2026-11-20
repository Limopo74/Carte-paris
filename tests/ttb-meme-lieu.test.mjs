// v289 (mon choix A du 20 nov.) : une adresse TTB n'est « la même » qu'un de mes lieux que par le nom (un vrai mot commun,
// ou le même nom), à moins de 150 m ; avant, la seule distance (moins de 30 m) suffisait : la fiche de mon resto montrait
// la ligne TTB du resto d'à côté, et le rond de celui-ci disparaissait de la carte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ttbSame } from '../js/ttb.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const at = (name, lat, lng, more = {}) => ({ name, lat, lng, ...more });

test('Même lieu : le resto d\'à côté, sans mot commun, n\'est jamais le même', () => {
  const mine = at('Le Petit Vendôme', 48.8687, 2.3311);
  assert.equal(ttbSame(mine, [at('Chez Jeanne', 48.8688, 2.3312)]), null); // 11 m
  assert.equal(ttbSame(at('Chez Jeanne', 48.8688, 2.3312), [mine]), null); // dans l'autre sens aussi (rond caché, « Mon lieu »)
});

test('Même lieu : un vrai mot commun, ou le même nom, à moins de 150 m', () => {
  const x = at('Les Gladines', 48.8280, 2.3526, { rub: 'Boui-boui' });
  assert.equal(ttbSame(at('Chez Gladines', 48.8279, 2.3525), [x]), x);
  assert.equal(ttbSame(at('Chez Gladines', 48.8299, 2.3525), [x]), null); // 220 m
  assert.equal(ttbSame(at('Chez Paul', 48.85, 2.35), [at('Chez Jeanne', 48.8501, 2.35)]), null); // « Chez » ne compte pas
  // un nom fait seulement de mots courants : seul le même nom compte
  const bistrot = at('Le Petit Bistrot', 48.85, 2.35);
  assert.equal(ttbSame(at('le petit bistrot', 48.8501, 2.35), [bistrot]), bistrot);
  assert.equal(ttbSame(at('Le Bistrot', 48.8501, 2.35), [bistrot]), null);
  // deux candidats : le plus proche
  const near = at('Gladines', 48.8280, 2.3525), far = at('Gladines', 48.8287, 2.3525);
  assert.equal(ttbSame(at('Chez Gladines', 48.8279, 2.3525), [far, near]), near);
  assert.equal(ttbSame(null, [near]), null);
});

test('Même lieu : la ligne TTB de la fiche, le rond caché et « Mon lieu » n\'utilisent plus la seule distance', () => {
  assert.match(app, /const ttbOf = \(p\) => \(ttbList\(\)\.length \? ttbSame\(p, ttbList\(\)\) : null\)/);
  assert.match(app, /if \(ttbSame\(x, mine\)\) continue;/);
  assert.equal((app.match(/const mine = ttbSame\(x, state\.points\);/g) ?? []).length, 2);
  assert.doesNotMatch(app, /navigoFor\([^)]*ttb/i);
  assert.doesNotMatch(app, /navigoFor\(x, /);
});
