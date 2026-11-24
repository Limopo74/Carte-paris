// v415 (mes choix 1A 2A 3A du 24 nov.) : les ronds des listes posées sur la carte se touchent (bandeau de « Carte »),
// et ces listes gardent les cercles d'Autour de moi autour de leur point de départ (pas autour du centre de la carte).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
/** Le corps d'une fonction de app.js, de sa déclaration à la suivante. */
const body = (name) => {
  const start = app.search(new RegExp(`^(async )?function ${name}\\(`, 'm'));
  assert.ok(start >= 0, `${name} existe`);
  const next = app.slice(start + 10).search(/^(async )?function /m);
  return app.slice(start, next < 0 ? undefined : start + 10 + next);
};
const SCREENS = ['openEvents', 'showVelib', 'openHomePlan', 'openCuriosities', 'openMonuments'];

test('ronds touchables : aucune des cinq listes ne pose plus de rond qu\'on ne peut pas toucher', () => {
  for (const f of SCREENS) {
    const b = body(f);
    assert.doesNotMatch(b, /L\.circleMarker\([^\n]*interactive: false\)\.addTo\(nearLayer\)/, `${f} : plus de rond non touchable`);
    assert.match(b, /tapRounds\(nearLayer, /, `${f} : ses ronds passent par tapRounds`);
    assert.match(b, /showPeek\(\{[\s\S]{0,400}?stay: true/, `${f} : un rond touché ouvre le bandeau sans déplacer la carte`);
  }
});

test('ronds touchables : zone d\'appui de 44 px, le rond le plus proche du doigt, tes gouttes et Mes parcours gardent la main', () => {
  const b = body('tapRounds');
  assert.match(b, /radius: 22/, 'zone de 44 px');
  assert.match(b, /fillOpacity: 0/, 'zone invisible');
  assert.match(b, /bubblingMouseEvents: false/, 'l\'appui ne passe pas aussi à la carte');
  assert.match(b, /interactive: false/, 'le rond dessiné, lui, ne capte rien');
  assert.match(b, /orTrace\(/, 'pendant un tracé, l\'appui pose une étape');
  assert.match(b, /distanceTo/, 'le rond le plus proche du doigt');
});

test('ronds touchables : Sorties dessine les ronds de « Carte », et « Carte » ouvre le même bandeau', () => {
  const b = body('openEvents');
  assert.match(b, /tapRounds\(nearLayer, mapList\.map/);
  assert.match(b, /onclick: \(\) => showPeek\(peekOpts\)/);
  assert.match(b, /showPeek\(\{ \.\.\.peekOpts, start: k, stay: true \}\)/);
});

test('ronds touchables : showPeek « stay » ne déplace la carte que si le lieu est caché', () => {
  const b = body('showPeek');
  assert.match(b, /stay = false/);
  assert.match(b, /else if \(stay\) \{[\s\S]*?if \(y > top - 24 \|\| y < 90\) map\.panBy/);
});

test('cercles : les cinq listes les dessinent autour de leur point de départ, Sorties pas autour du centre de la carte', () => {
  for (const f of SCREENS) assert.match(body(f), /listRingsAt\(/, `${f} : cercles`);
  assert.match(body('openEvents'), /if \(!fromMap\) listRingsAt\(o\)/);
  assert.match(body('listRingsAt'), /L\.layerGroup\(\)\.addTo\(nearLayer\)/, 'effacés avec la liste');
  assert.match(app, /map\.on\('zoomend', \(\) => \{[^\n]*redrawListRings\(\)/, 'redessinés à chaque zoom');
  assert.match(body('redrawListRings'), /nearLayer\.hasLayer\(listRings\.group\)/, 'jamais après la fermeture de la liste');
});
