// v293 (mon choix A du 20 nov.) : ma sauvegarde remise sur un téléphone qui a déjà les mêmes lieux (même id) ne les touche
// pas ; mergeImport (js/store.js) les compte, et le message de l'appli le dit (« 3 déjà sur le téléphone : gardés tels quels »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeImport, exportJSON } from '../js/store.js';

const cats = [{ id: 'resto', name: 'Restos', color: '#aa3300', icon: '🍽️' }];
const lieu = (id, o = {}) => ({ id, name: `Lieu ${id}`, lat: 48.83, lng: 2.35 + Number(id.slice(1)) / 100, cat: 'resto', note: '', created: 1, ...o });
const etat = (points) => ({ me: '', categories: cats, lists: [], points, plans: [], artists: [], venues: [], fav: { icon: '⭐', color: '#f2a900' }, rings: [] });

test('les lieux déjà là sont comptés et gardés tels quels, les autres s\'ajoutent', () => {
  const fichier = exportJSON(etat([lieu('p1', { stars: 5, rub: 'La Table' }), lieu('p2'), lieu('p3')]));
  const r = mergeImport(etat([lieu('p1', { stars: 2 }), lieu('p2')]), fichier, '');
  assert.equal(r.added, 1); assert.equal(r.already, 2);
  const p1 = r.state.points.find((p) => p.id === 'p1');
  assert.equal(p1.stars, 2); assert.equal(p1.rub, undefined);
});

test('le message de la restauration dit les lieux déjà sur le téléphone', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /r\.already \? `, \$\{r\.already\} déjà sur le téléphone : \$\{r\.already > 1 \? 'gardés tels quels' : 'gardé tel quel'\}`/);
});
