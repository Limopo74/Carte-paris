// v382 (mes choix 7A et 8AB du 24 nov.) : Plan IGN et Photo aérienne (Géoplateforme, sans clé, citer l'IGN) ;
// un petit rond sur la carte ouvre les fonds en vignettes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAP_STYLES } from '../js/store.js';
import { FREE_STYLES } from '../js/depart.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('deux fonds IGN, sans clé, avec la mention de l\'IGN', () => {
  for (const id of ['ign', 'photo']) { assert.ok(MAP_STYLES.includes(id)); assert.ok(FREE_STYLES.includes(id)); }
  assert.match(app, /ign: \{ name: 'Plan IGN',[^\n]*GEOGRAPHICALGRIDSYSTEMS\.PLANIGNV2&FORMAT=image\/png`, attr: IGN_ATTR/);
  assert.match(app, /photo: \{ name: 'Photo aérienne',[^\n]*ORTHOIMAGERY\.ORTHOPHOTOS&FORMAT=image\/jpeg`, attr: IGN_ATTR/);
  assert.match(app, /const IGN_WMTS = 'https:\/\/data\.geopf\.fr\/wmts\?SERVICE=WMTS&REQUEST=GetTile&VERSION=1\.0\.0&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX=\{z\}&TILEROW=\{y\}&TILECOL=\{x\}&LAYER=';/);
  assert.match(app, /const IGN_ATTR = '© <a href="https:\/\/www\.ign\.fr\/">IGN<\/a>';/);
  assert.ok(sw.includes("url.hostname === 'data.geopf.fr' && url.pathname === '/wmts'"), 'tuiles regardées gardées pour le métro');
  assert.ok(css.includes(':not([data-style="photo"]) .leaflet-tile-pane'), 'le mode sombre ne retourne pas la photo');
});

test('le petit rond : en bas du côté opposé à la colonne, au-dessus du bandeau, caché sous une page', () => {
  assert.match(html, /<button type="button" id="btnStyle" class="map-btn style-btn" aria-label="Fond de carte : changer">/);
  assert.match(css, /\.map-btn\.style-btn \{ position: fixed; left: 10px; bottom: calc\(196px \+ var\(--safe-b\)\);[^}]*width: 44px; height: 44px; border-radius: 50%; \}/);
  assert.ok(css.includes('body:has(.map-tools.left) .map-btn.style-btn { left: auto; right: 10px; }'));
  assert.ok(app.includes("const QUICK_STYLES = ['eclairci', 'classic', 'ign', 'photo', 'night'];"));
  assert.match(app, /openSettings\('style', named\('Fond de carte', openStylePicker\)\)/);
});
