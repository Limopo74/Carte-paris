// v164 : réserver et s'informer — ce que l'organisateur écrit dans l'agenda « Que faire à Paris ? ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEvents, safeLink, siteName, bookingOf, EVENT_FIELDS } from '../js/events.js';

test('liens de l\'organisateur : https seulement, nom du site en clair', () => {
  assert.equal(safeLink(' https://philharmoniedeparis.fr/fr/activite/bal?itemId=1 '), 'https://philharmoniedeparis.fr/fr/activite/bal?itemId=1');
  for (const bad of ['http://orchestre.fr', 'javascript:alert(1)', 'data:text/html,x', 'www.site.fr', 'https://localhost/x', '', null]) assert.equal(safeLink(bad), '', String(bad));
  assert.equal(siteName('https://www.orchestrehelios.com/concerts'), 'orchestrehelios.com');
  assert.equal(siteName('nimporte'), '');
});

test('réservation : obligatoire, conseillée, sans, ou rien de dit', () => {
  assert.equal(bookingOf('obligatoire'), 'required');
  assert.equal(bookingOf('conseillée'), 'advised');
  assert.equal(bookingOf('Conseillee'), 'advised');
  assert.equal(bookingOf('non'), 'none');
  assert.equal(bookingOf(null), '');
  assert.equal(bookingOf('peut-être'), '');
  for (const f of ['access_type', 'access_link', 'access_link_text', 'contact_url', 'contact_organisation_name']) assert.ok(EVENT_FIELDS.split(',').includes(f), f);
});

test('une sortie de l\'agenda garde ses liens et sa réservation', () => {
  const base = { title: 'Bal Balkans', lat_lon: { lat: 48.89, lon: 2.39 }, date_start: '2026-11-18T19:00:00+00:00', date_end: '2026-11-18T23:00:00+00:00' };
  const [e] = parseEvents([{ ...base, access_type: 'obligatoire', access_link: 'https://philharmoniedeparis.fr/fr/activite/bal', access_link_text: 'Infos et <b>réservations</b>', contact_url: 'http://philharmoniedeparis.fr', contact_organisation_name: 'Philharmonie de Paris' }]);
  assert.deepEqual([e.booking, e.book, e.bookText, e.site, e.org], ['required', 'https://philharmoniedeparis.fr/fr/activite/bal', 'Infos et réservations', '', 'Philharmonie de Paris']);
  const [f] = parseEvents([base]);
  assert.deepEqual([f.booking, f.book, f.bookText, f.site, f.org], ['', '', '', '', '']);
});
