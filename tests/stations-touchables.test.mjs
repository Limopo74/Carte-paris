// v425 (mon choix A du 25 nov.) : une station des lignes de métro et RER se touche sur la carte :
// Autour de moi s'ouvre depuis elle, comme M → Choisir une station.
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

test('stations touchables : chaque station des lignes a une zone d\'appui invisible de 44 px', () => {
  const b = body('drawLines');
  assert.match(b, /L\.circleMarker\(\[st\.lat, st\.lng\], \{ pane: 'stHit'[^\n]*radius: 22[^\n]*fillOpacity: 0[^\n]*bubblingMouseEvents: false/);
  assert.match(b, /\.on\('click', stationTap\)/);
  assert.match(b, /\.on\('contextmenu', \(e\) => map\.fire\('contextmenu', e\)\)/, 'l\'appui long reste « Ce point »');
  assert.match(b, /linesLayer\.clearLayers\(\); stHitLayer\.clearLayers\(\); syncStHits\(\);/, 'lignes masquées : plus rien à toucher');
});

test('stations touchables : sous les ronds des listes et les gouttes, seulement quand les stations se voient', () => {
  const z = Number(app.match(/map\.createPane\('stHit'\)\.style\.zIndex = (\d+)/)?.[1]);
  assert.ok(z > 0 && z < 400, 'sous le calque des ronds (400) et des gouttes (600)');
  assert.match(body('syncStHits'), /state\.showLines\) && map\.getZoom\(\) >= 15/);
  assert.match(app, /mapEl\.classList\.toggle\('z-st', z >= 15\)/, 'même seuil que le dessin des stations');
  assert.match(app, /map\.on\('zoomend', syncStHits\)/);
});

test('stations touchables : un appui ouvre Autour de moi depuis la station, comme Choisir une station', () => {
  assert.match(body('nearStation'), /kind: 'station', label: st\.n \}; renderNear\(true\)/);
  assert.match(app, /function openStationPicker\(onPick = nearStation,/);
  const t = body('stationTap');
  assert.match(t, /if \(view === 'trace'\) \{ traceTap\(/, 'pendant un tracé : une étape');
  assert.match(t, /if \(view === 'rue'\) \{ rueTap\(/, 'pendant une rue d\'intérêt : un point de la rue');
  assert.match(t, /if \(moving \|\| !stations\.length\) return;/, 'en déplaçant un lieu : rien');
  assert.match(t, /distanceTo\(p\)[\s\S]*nearStation\(best\)/, 'la station la plus proche du doigt');
});

test('stations touchables : l\'aide le dit', () => {
  assert.match(app, /\*\*Lignes\*\* : [^\n]*touche-la : ce qu\\'il y a autour/);
  // v439 : sa ligne des Nouveautés est sortie (10 au plus) ; l'aide des Lignes le dit toujours
});

// v428 (mon choix A du 25 nov.) : la page « Autour de Ⓜ … » propose d'aller jusqu'à la station.
test('aller à la station : une ligne sous les 8 boutons, seulement autour d\'une station', () => {
  assert.match(body('renderNear'), /tool\('map', 'Mon Paris'[^\n]*\n  \)\);\n  if \(origin\.kind === 'station'\) body\.push\(stationGoRow\(\)\);/);
});

test('aller à la station : Y aller vers la station, distance seulement depuis une position récente', () => {
  const b = body('stationGoRow');
  assert.match(b, /const me = freshHere\(\);/, 'position de moins de 10 min');
  assert.match(b, /d == null \? null : walkGo\(d\) \? `\$\{fmtDist\(d\)\} · \$\{durText\(walkMinutes\(d\)\)\}` : fmtDist\(d\)/, 'pas de minutes à pied hors de la distance de marche');
  assert.match(b, /class: 'go', href: mapsUrl\(st, d \?\? 0\)/, 'Y aller : la station, jamais ma position dans le lien');
  assert.match(b, /compassOff\(\) \? null : el\('button'[^\n]*openCompass\(target\)/);
  assert.match(b, /stationBadges\(st\)/, 'ses lignes');
});
