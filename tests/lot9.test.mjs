import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeLink, readRouteLink, meetLink, readMeetLink, planLoopOpen, gpsFromJpeg } from '../js/explore.js';
import { eventsUrl, parseEvents, nearbyEvents, whenText } from '../js/events.js';
import { exportUrl, parseRecords } from '../js/pratique.js';

const START = { lat: 48.8606, lng: 2.3376 };

test('balade partagée : aller-retour, 12 étapes au plus, étapes hors Paris écartées', () => {
  const stops = Array.from({ length: 14 }, (_, i) => ({ name: `Étape ${i} « é »`, lat: 48.86 + i / 1000, lng: 2.34 }));
  const r = readRouteLink(new URL(routeLink('https://x.fr/app/#y', stops, 'Ma balade')).hash);
  assert.equal(r.title, 'Ma balade'); assert.equal(r.stops.length, 12); assert.equal(r.stops[0].name, 'Étape 0 « é »');
  assert.equal(readRouteLink(new URL(routeLink('https://x.fr/', [{ name: 'NY', lat: 40.7, lng: -74 }])).hash), null);
  assert.equal(readRouteLink('#balade=!!'), null);
});

test('rendez-vous : position envoyée une fois, lue, refusée hors Paris', () => {
  const r = readMeetLink(new URL(meetLink('https://x.fr/', { ...START, time: 1.7e12 }, 'Capucine')).hash);
  assert.equal(r.name, 'Capucine'); assert.equal(r.lat, 48.8606); assert.ok(Math.abs(r.time - 1.7e12) < 60000);
  assert.equal(readMeetLink(new URL(meetLink('https://x.fr/', { lat: 0, lng: 0 })).hash), null);
});

test('temps libre avec horaires : un lieu fermé à l\'arrivée est écarté, horaires inconnus acceptés', () => {
  const open = { id: 'o', lat: START.lat + 0.001, lng: START.lng, open: true };
  const closed = { id: 'c', lat: START.lat - 0.001, lng: START.lng, open: false };
  const unknown = { id: 'u', lat: START.lat, lng: START.lng + 0.0015, open: null };
  const closesSoon = { id: 's', lat: START.lat + 0.002, lng: START.lng + 0.002, closesAt: 3 };
  const isOpen = (p, t) => (p.closesAt != null ? t < p.closesAt : p.open);
  const r = planLoopOpen(START, [open, closed, unknown, closesSoon], 60, isOpen, { dwell: 10 });
  const ids = r.route.map((p) => p.id).sort();
  assert.deepEqual(ids, ['o', 'u']);
  assert.equal(r.closed, 2);
});

/** Petit JPEG avec seulement un bloc EXIF GPS (48°51'38.16" N, 2°20'15.36" E). */
function jpegWithGps(le = false, south = false) {
  const b = []; const w16 = (n) => (le ? b.push(n & 255, n >> 8) : b.push(n >> 8, n & 255));
  const w32 = (n) => (le ? b.push(n & 255, (n >> 8) & 255, (n >> 16) & 255, n >>> 24) : b.push(n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255));
  // TIFF
  b.push(...(le ? [0x49, 0x49] : [0x4d, 0x4d])); w16(42); w32(8);
  w16(1); w16(0x8825); w16(4); w32(1); w32(26); w32(0); // IFD0 : pointeur GPS -> 26
  w16(4); // IFD GPS : 4 entrées, données à 26+2+48+4 = 80
  w16(1); w16(2); w32(2); b.push(south ? 83 : 78, 0, 0, 0);
  w16(2); w16(5); w32(3); w32(80);
  w16(3); w16(2); w32(2); b.push(69, 0, 0, 0);
  w16(4); w16(5); w32(3); w32(104);
  w32(0);
  for (const [n, d] of [[48, 1], [51, 1], [3816, 100], [2, 1], [20, 1], [1536, 100]]) { w32(n); w32(d); }
  const tiff = Uint8Array.from(b);
  const app1 = [0xff, 0xe1, ((tiff.length + 8) >> 8) & 255, (tiff.length + 8) & 255, 0x45, 0x78, 0x69, 0x66, 0, 0];
  return Uint8Array.from([0xff, 0xd8, ...app1, ...tiff, 0xff, 0xd9]).buffer;
}

test('photo : position GPS lue dans l\'EXIF (gros et petit boutiste), absente sinon', () => {
  for (const le of [false, true]) {
    const g = gpsFromJpeg(jpegWithGps(le));
    assert.ok(Math.abs(g.lat - 48.8606) < 1e-4 && Math.abs(g.lng - 2.3376) < 1e-4, JSON.stringify(g));
  }
  assert.ok(gpsFromJpeg(jpegWithGps(false, true)).lat < 0);
  assert.equal(gpsFromJpeg(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]).buffer), null);
  assert.equal(gpsFromJpeg(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer), null);
});

test('sorties : requête du jour sans position, lecture robuste, proches d\'abord, horaire en clair', () => {
  const u = new URL(eventsUrl(new Date(2026, 10, 16, 18, 0)));
  assert.match(u.searchParams.get('where'), /date_end >= "2026-11-16T/);
  assert.ok(!/48\.|2\.3/.test(u.toString()));
  const json = [
    { title: 'Concert <b>gratuit</b>', lat_lon: { lat: 48.861, lon: 2.338 }, date_start: '2026-11-16T20:30:00+01:00', date_end: '2026-11-16T22:00:00+01:00', address_name: 'Église', address_street: '1 rue X', address_zipcode: '75001', url: 'https://quefaire.paris.fr/1', price_type: 'gratuit' },
    { title: 'Concert <b>gratuit</b>', lat_lon: { lat: 48.861, lon: 2.338 }, date_start: '2026-11-16T20:30:00+01:00' },
    { title: 'Loin', lat_lon: { lat: 48.9, lon: 2.4 } },
    { title: 'Sans lieu' },
    { title: 'Lien douteux', geo_point_2d: { lat: 48.862, lon: 2.339 }, url: 'javascript:alert(1)' },
  ];
  const ev = parseEvents(json);
  assert.equal(ev.length, 4); assert.equal(ev[0].title, 'Concert gratuit'); assert.equal(ev[0].free, true);
  assert.equal(ev[3].url, '');
  const near = nearbyEvents(ev, START, 1000);
  assert.deepEqual(near.map((e) => e.title), ['Concert gratuit', 'Lien douteux']);
  const h = new Date('2026-11-16T20:30:00+01:00');
  assert.equal(whenText(ev[0], new Date('2026-11-16T17:00:00+01:00')), `à ${h.getHours()}h30`);
});

test('lieux frais : adresse légère pour les parcs, lecture des équipements', () => {
  assert.match(exportUrl('fraisParcs'), /select=nom,type,adresse,geo_point_2d/);
  const r = parseRecords([{ nom: 'Bibliothèque X', type: 'Bibliothèques', adresse: '1 rue Y', payant: 'Non', geo_point_2d: { lat: 48.86, lon: 2.34 } }, { nom: 'Sans pos' }], 'fraisLieux');
  assert.equal(r.length, 1); assert.equal(r[0].label, 'Bibliothèque X'); assert.match(r[0].detail, /gratuit/);
});

test('sorties : brocantes, fêtes, gratuit, puces', async () => {
  const { parseEvents, eventKind, isFleaMarket } = await import('../js/events.js');
  const ev = parseEvents([
    { title: 'Grand vide-grenier de la rue des Martyrs', lat_lon: { lat: 48.88, lon: 2.34 }, price_type: 'gratuit' },
    { title: 'Concert', qfap_tags: ['Fête de quartier', 'Musique'], lat_lon: { lat: 48.88, lon: 2.34 }, price_type: 'payant' },
    { title: 'Exposition Monet', lat_lon: { lat: 48.88, lon: 2.34 } },
    { title: 'Défilé', lead_text: 'Une brocante solidaire au profit…', lat_lon: { lat: 48.88, lon: 2.34 } },
  ]);
  assert.deepEqual(ev.map(eventKind), ['brocante', 'fete', 'autre', 'brocante']);
  assert.deepEqual(ev.map((e) => e.free), [true, false, false, false]);
  assert.equal(isFleaMarket({ name: 'Puces de Vanves', products: '' }), true);
  assert.equal(isFleaMarket({ name: 'Marché Bastille', products: 'Alimentaire' }), false);
});
