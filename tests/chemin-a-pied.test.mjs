// v383 (mes choix 3A et 4A du 24 nov.) : « Chemin à pied » sur la fiche, le chemin par les rues dessiné sur la carte ;
// la plaque « Y aller » dit la distance et la durée par les rues quand le plan est déjà sur le téléphone. Rien n'est envoyé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readPlan, snap, route } from '../js/rues.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const plan = readPlan(JSON.parse(readFileSync(new URL('../data/rues.json', import.meta.url), 'utf8')));

test('sur le vrai plan : de la rue de Douai à Notre-Dame-de-Lorette, un chemin plus long que la ligne droite', () => {
  const a = snap(plan, { lat: 48.8815, lng: 2.3365 }); const b = snap(plan, { lat: 48.8768, lng: 2.3392 });
  const r = route(plan, a, b);
  assert.ok(r && r.line.length > 2);
  assert.ok(r.m > 560 && r.m < 900, `${Math.round(r.m)} m`);
});

test('la fiche : plaque mise à jour seulement avec un vrai chemin, sans téléchargement ; Chemin à pied en tête de Pratique', () => {
  const w = app.slice(app.indexOf('async function walkRouteTo('), app.indexOf('function goRouteText('));
  assert.ok(w.includes('const P = streets ?? await loadStreets();') && !w.includes('downloadStreets'), 'jamais téléchargé pour la plaque');
  assert.ok(w.includes('return r && r.m > 0 ? r : null;'));
  // v406 : sauf sur une rue d'intérêt dont on est à moins de 50 m (pas de détour par les trottoirs)
  assert.ok(app.includes('if (d != null && walkGo(d) && !(p.line && d < 50)) walkRouteTo(p, pos).then((r) => { if (r && goLink.isConnected) fill(goLink, ico(\'arrow-right\'), ...goRouteText(r.m, pos)); });'));
  const i = app.indexOf("row('route', 'Chemin à pied'");
  assert.ok(i > 0 && i < app.indexOf("row('clock', 'Horaires'"));
  const s = app.slice(app.indexOf('async function showWalkRoute('), app.indexOf('async function showWalkRoute(') + 1400);
  assert.ok(s.includes("openMyRoutes({ title: ' Chemin à pied'"), 'sans plan : la page qui le propose');
  assert.ok(s.includes('L.polyline(r.line, { color: ink(), weight: 5'), 'trait plein encre 5 px, comme Mes parcours');
});
