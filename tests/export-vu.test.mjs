// v307 (mes choix du 20 nov.) : exporter mes Vu en passant : photos JPEG avec position, date et ligne (EXIF), et un tableau, dans un .zip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jpegWithExif, exifSegment, zipStore, crc32, csvText, photoFileName, exifDate } from '../js/export-vu.js';
import { gpsFromJpeg } from '../js/explore.js';

const jpg = readFileSync(new URL('./fixtures/petite.jpg', import.meta.url));

test('Position remise dans la photo : relue par le lecteur de l\'appli (Paris, et l\'autre côté du globe)', () => {
  for (const [lat, lng] of [[48.856613, 2.352222], [-33.8688, -151.2093]]) {
    const out = jpegWithExif(jpg, { lat, lng, date: Date.UTC(2026, 10, 20, 14, 7), text: 'Porte bleue' });
    const g = gpsFromJpeg(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
    assert.ok(Math.abs(g.lat - lat) < 1e-5 && Math.abs(g.lng - lng) < 1e-5, JSON.stringify(g));
  }
});

test('Sans position : pas de bloc GPS ; un Exif existant est remplacé, le reste de la photo intact', () => {
  const out = jpegWithExif(jpg, { date: 0, text: 'x' });
  assert.equal(gpsFromJpeg(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)), null);
  const twice = jpegWithExif(jpegWithExif(jpg, { lat: 1, lng: 1 }), { lat: 2, lng: 2 });
  const g = gpsFromJpeg(twice.buffer.slice(twice.byteOffset, twice.byteOffset + twice.byteLength));
  assert.ok(Math.abs(g.lat - 2) < 1e-6);
  assert.equal(Buffer.from(twice.subarray(twice.length - 100)).equals(jpg.subarray(jpg.length - 100)), true);
  assert.throws(() => jpegWithExif(new Uint8Array([1, 2, 3]), {}));
  assert.equal(exifDate(new Date(2026, 10, 20, 9, 5, 3)), '2026:11:20 09:05:03');
  assert.equal(exifSegment({ text: '\u0007a' })[0], 0xff);
});

test('Le zip : en-têtes, CRC, noms en UTF-8', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const z = zipStore([{ name: 'été/001-porte.jpg', bytes: new Uint8Array([1, 2, 3]) }, { name: 'tableau.csv', bytes: 'a;b' }]);
  const v = new DataView(z.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(z.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(z.length - 22 + 10, true), 2);
});

test('Le tableau : « ; », date française, lien Google Maps, une ligne sûre pour un tableur', () => {
  const t = csvText([{ file: '001-porte.jpg', name: 'Porte; bleue', note: '=1+1', at: new Date(2026, 10, 20, 15, 7).getTime(), cat: 'Culture', sub: 'Portes', artist: '', lists: ['A', 'B'], stars: 4, address: '16 rue Chaptal', arr: 9, lat: 48.881235, lng: 2.3312 }]);
  assert.ok(t.startsWith('﻿Photo;Nom;Ma ligne;Date;Heure;Catégorie;Sous-catégorie;Artiste;Listes;Étoiles;Adresse;Arrondissement;Latitude;Longitude;Google Maps\r\n'));
  assert.match(t, /001-porte\.jpg;"Porte; bleue";"'=1\+1";20\/11\/2026;15:07;Culture;Portes;;A, B;4;16 rue Chaptal;9e;48\.881235;2\.331200;https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=48\.881235,2\.331200/);
  assert.equal(photoFileName(2, 'Porte bleue, rue Chaptal !'), '003-porte-bleue-rue-chaptal.jpg');
  assert.equal(photoFileName(0, ''), '001-photo.jpg');
});

test('Dans l\'appli : « Exporter (N) » en bas de la mosaïque, rappel visible, gardé hors réseau', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(app, /onclick: \(\) => openSeenExport\(photos,[^\n]*`Exporter \(\$\{photos\.length\}\)`/);
  assert.match(app, /el\('p', \{ class: 'warn' \}, 'Les photos gardent l\\'endroit où tu les as prises : qui les reçoit le voit\.'\)/);
  assert.match(sw, /'js\/export-vu\.js'/);
});
