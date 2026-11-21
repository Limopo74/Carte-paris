// v341 (ma demande du 21 nov.) : au dernier cran de zoom, la carte restait vide (Très épuré sur mon téléphone ; Douce aussi) :
// le serveur HOT d'OSM France répond 404 au zoom 19 (vérifié le 21 nov.), alors que l'appli permettait 19.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
// Zoom le plus proche que chaque serveur sait dessiner (vérifié le 21 nov. ; CARTO : sa documentation, 0 à 20).
const SERVEUR = { 'tile.openstreetmap.org': 19, 'tile.openstreetmap.fr/osmfr': 20, 'tile.openstreetmap.fr/hot': 18, 'basemaps.cartocdn.com': 20 };

const styles = [...app.matchAll(/^\s+(\w+): \{ name: '[^']+', sub: .*?url: '([^']+)'.*?maxZoom: (\d+)(?:, native: (\d+))? \}/gm)]
  .map(([, id, url, max, native]) => ({ id, url, max: +max, native: native ? +native : +max }));

test('chaque fond ne demande jamais d\'images au-delà de ce que son serveur dessine', () => {
  assert.ok(styles.length >= 9, `fonds lus : ${styles.length}`);
  for (const st of styles) {
    const host = Object.keys(SERVEUR).find((h) => st.url.includes(h));
    assert.ok(host, `serveur inconnu pour ${st.id}`);
    assert.ok(st.native <= SERVEUR[host], `${st.id} demande le zoom ${st.native}, le serveur s'arrête à ${SERVEUR[host]}`);
    assert.ok(st.max >= st.native, `${st.id} : zoom permis plus petit que le zoom des images`);
  }
});

test('Douce garde le zoom 19, avec les images du 18 agrandies', () => {
  const hot = styles.find((s) => s.id === 'hot');
  assert.equal(hot.max, 19);
  assert.equal(hot.native, 18);
  assert.match(app, /const native = Math\.min\(st\.native \?\? st\.maxZoom, zoomCap\[id\] \?\? st\.maxZoom\);/);
  assert.match(app, /L\.tileLayer\(st\.url, \{ maxZoom: st\.maxZoom, maxNativeZoom: native,/);
});

// Très épuré (CARTO) restait vide au dernier cran sur mon téléphone, alors que CARTO annonce 0 à 20 : on ne peut pas
// le vérifier sans la clé. Filet pour tous les fonds : échecs au cran 19 ou plus, en ligne, aucun succès à ce cran → cran du dessous.
test('filet : un cran ≥ 19 sans images passe aux images du cran du dessous, sans toucher au retour hors CORS', () => {
  assert.match(app, /const HIGH_ZOOM = 19;/);
  assert.match(app, /if \(!\(z >= HIGH_ZOOM\) \|\| okZ\.has\(z\) \|\| !navigator\.onLine\) return;/);
  assert.match(app, /\) >= 3\) \{ zoomCap\[id\] = z - 1; applyMapStyle\(\); \}/);
  assert.match(app, /if \(e\.coords\?\.z >= HIGH_ZOOM\) return; if \(\+\+bad >= 6 && !okZ\.size/);
});
