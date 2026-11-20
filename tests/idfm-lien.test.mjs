// v325 (mon choix A du 20 nov.) : « Appli Île-de-France Mobilités » ouvre la fiche de l'appli dans Google Play.
// Avant, un intent avec le seul nom du paquet : Chrome ouvrait toujours le site, et le bouton promettait d'ouvrir l'appli.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Le bouton IDFM : lien Google Play documenté, mots qui ne promettent pas plus', () => {
  assert.match(app, /const IDFM_APP = 'https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.applidium\.vianavigo';/);
  assert.doesNotMatch(app, /intent:\/\/#Intent;package=com\.applidium\.vianavigo/);
  assert.doesNotMatch(app, /'Ouvrir l\\'appli Île-de-France Mobilités'/);
  assert.equal((app.match(/href: IDFM_APP, target: '_blank', rel: 'noopener' \}, ico\('train-front'\), 'Appli Île-de-France Mobilités'\)/g) ?? []).length, 2);
});
