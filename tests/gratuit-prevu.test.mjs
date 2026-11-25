// v521 (mon choix 3A du 25 nov.) : une visite gratuite prévue ne se dit plus « Sortie de l'agenda « Que faire à Paris ? » ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanPlans } from '../js/planning.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Prévoir ce dimanche (Gratuit) : marque gardée, texte et lien justes', () => {
  const at = new Date(2026, 10, 29, 10).getTime();
  const [x] = cleanPlans([{ id: 'g1', name: 'Musée Cognacq-Jay', lat: 48.8577, lng: 2.3622, plan: true, free: true, url: 'https://www.museecognacqjay.paris.fr', ticket: { at } }], new Date(2026, 10, 25).getTime());
  assert.equal(x.free, true);
  assert.match(app, /plan: true, free: true \/\* v521 : pas une sortie de l'agenda \*\//);
  assert.match(app, /x\.free \? `Gratuit ce jour-là\. Les règles changent/);
  assert.match(app, /\[x\.url, x\.late \|\| x\.free \? 'Site officiel' : 'Voir dans « Que faire à Paris »'\]/);
});
