// v310 (mes choix 1A 2A du 20 nov., et « Pourquoi deux dates identiques ? ») : rattacher une photo prise en passant à un de mes
// lieux ; une impression prise en passant reste dans Mes Vu en passant ; légende avec la date complète, sans date en double ;
// une photo de la galerie garde sa date de prise de vue (0 : inconnue, jamais la date d'ajout présentée comme celle de la photo).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanPassages, addPassage } from '../js/passage.js';
import { dateFromJpeg } from '../js/explore.js';
import { jpegWithExif, csvText } from '../js/export-vu.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const attach = app.slice(app.indexOf('function openAttach('), app.indexOf('/** Le diaporama : la photo en grand'));
const jpg = readFileSync(new URL('./fixtures/petite.jpg', import.meta.url));
const buf = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

test('Une impression garde la marque « prise en passant »', () => {
  assert.equal(cleanPassages([{ at: 1, photo: 'ph1', pass: true }])[0].pass, true);
  assert.equal(cleanPassages([{ at: 1, photo: 'ph1', pass: 'oui' }])[0].pass, undefined);
  assert.equal(addPassage([], { at: 2, photo: 'ph2', text: 'Porte', pass: true })[0].pass, true);
});

test('Date de prise de vue lue dans la photo de la galerie ; absente : null', () => {
  const t = new Date(2025, 4, 3, 10, 20, 30).getTime();
  assert.equal(dateFromJpeg(buf(jpegWithExif(jpg, { date: t }))), t);
  assert.equal(dateFromJpeg(buf(new Uint8Array(jpg))), null);
  assert.equal(dateFromJpeg(new ArrayBuffer(2)), null);
  assert.match(csvText([{ file: 'a.jpg', name: 'x', at: null }]), /a\.jpg;x;;;;/, 'tableau : date inconnue = cases vides');
});

test('Rattacher : la ligne sur la fiche d\'une note prise en passant, mes lieux les plus proches, « Annuler »', () => {
  assert.match(app, /isPass\(p\) && !p\.owner && p\.photos\?\.length \? row\('link', 'Rattacher à un de mes lieux'/);
  assert.match(attach, /state\.points\.filter\(\(x\) => !x\.owner && !isPass\(x\) && x\.id !== note\.id\)/);
  assert.match(attach, /\.sort\(\(a, b\) => a\.d - b\.d\)/);
  assert.match(attach, /pass: true \}\); \}\);/);
  assert.match(attach, /label: 'Annuler', fn: \(\) => \{\s*target\.passages = before\.passages; state\.points\.push\(before\.note\);/);
});

test('Diaporama : date complète, plus de date en double ; « Ajouter à » marque l\'impression', () => {
  assert.match(app, /at \? fullDate\(at\) : 'Date de la photo inconnue'/);
  assert.ok(!app.slice(app.indexOf('function openSeenSlides('), app.indexOf('function openSeenSlides(') + 900).includes('shortDate('));
  assert.match(app, /photo: id, stars: stars \|\| undefined, pass: true \}\);/);
});
