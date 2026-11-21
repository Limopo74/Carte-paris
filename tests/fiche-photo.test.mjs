// v326 (mes choix 1B 2A 3A 4A 5A du 20 nov.) : une photo prise en passant a sa propre fiche :
// Y aller, la photo en 4:3 sur toute la largeur, sa date, ma ligne, puis « Cette photo » (Modifier, Rattacher, Partager, Rangement).
// Ni Boussole, Métro, horaires, Favori, Déjà visité, Prévoir, étoiles, QR code, Avis Google ni Uber.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const charte = readFileSync(new URL('../CHARTE.md', import.meta.url), 'utf8');

const start = app.indexOf('  if (photoFiche) {');
const block = app.slice(start, app.indexOf('    return;\n  }', start));

test('Toute note prise en passant avec une photo (choix 1B) a la fiche photo', () => {
  assert.match(app, /const photoFiche = isPass\(p\) && \(p\.photos\?\.length \?\? 0\) > 0;/);
  assert.ok(start > 0);
});

test('La fiche photo garde l\'essentiel, et seulement lui', () => {
  for (const want of ['goBox.firstChild', 'photoLarge(p)', "'Cette photo'", "'Modifier'", "'Rattacher à un de mes lieux'", "'Partager'", "'Rangement'", 'Date de la photo inconnue']) assert.ok(block.includes(want), want);
  for (const not of ['starPicker', 'toggles', 'planBtn', 'facts2', "'QR code'", 'Avis Google', 'Uber', "'Horaires'", 'openCompass', 'showMetroPlan']) assert.ok(!block.includes(not), not);
});

test('Photo en 4:3 sur toute la largeur (choix 2A), écrite dans la charte', () => {
  assert.match(css, /\.fiche-photo\.photo-large button \{ height: auto; aspect-ratio: 4 \/ 3; \}/);
  assert.match(charte, /photo prise en passant.*4:3/);
});

test('Rangement : « Je l\'ai revue aujourd\'hui » et « Ajouter une photo », juste au-dessus de Supprimer (choix 4A 5A, puis A)', () => {
  const i = app.indexOf("row('trash-2', delLabel");
  const a = app.indexOf("'Je l\\'ai revue aujourd\\'hui'"); const b = app.indexOf("photoFiche ? row('camera', 'Ajouter une photo'");
  assert.ok(a > 0 && b > a && i > b);
});

test('v344 : pour une photo prise en passant, « Supprimer cette photo » (ou « ces N photos »), pas « ce lieu »', () => {
  assert.match(app, /const delLabel = !photoFiche \? 'Supprimer ce lieu' : nPh > 1 \? `Supprimer ces \$\{nPh\} photos` : 'Supprimer cette photo';/);
  assert.match(app, /toast\(!photoFiche \? 'Lieu supprimé' : nPh > 1 \? 'Photos supprimées' : 'Photo supprimée'\)/);
});
