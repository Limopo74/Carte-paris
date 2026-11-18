// v207 : la liste du jour ne compte pas pour le rappel de sauvegarde ; le lien d'un lieu porte la date de ses horaires
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupHash, trackChange, savedBackup } from '../js/store.js';
import { dayTicket } from '../js/planning.js';
import { placeLink, readPlaceLink } from '../js/explore.js';

const base = () => ({
  categories: [{ id: 'resto', name: 'Restos', color: '#aa3300', icon: '🍽️' }], lists: [], fav: { icon: '⭐', color: '#f2a900' }, myStations: [],
  points: [
    { id: 'a', name: 'Café', cat: 'resto', lat: 48.86, lng: 2.35, note: '', done: false, fav: false },
    { id: 'b', name: 'Bistrot', cat: 'resto', lat: 48.87, lng: 2.34, note: '', done: false, fav: false, ticket: { at: 1795000000000, part: 'soir' } },
  ],
});

test('sauvegarde (v207) : noter, ranger ou vider la liste du jour ne change pas l\'empreinte ; « Fait » et un vrai billet, si', () => {
  const s = base();
  const h0 = backupHash(s);
  s.backup = savedBackup(s);
  s.points[0].ticket = dayTicket(1);
  assert.equal(backupHash(s), h0, 'un lieu noté pour aujourd\'hui');
  s.points[0].ticket = dayTicket(2, new Date(), 'Paul');
  assert.equal(backupHash(s), h0, 'changé de rang, avec quelqu\'un');
  assert.equal(trackChange(s).n, 0, 'aucun changement à sauvegarder');
  delete s.points[0].ticket;
  assert.equal(backupHash(s), h0, 'liste vidée à minuit');
  s.points[0].ticket = dayTicket(1); s.points[0].done = true;
  assert.notEqual(backupHash(s), h0, '« Fait » compte');
  const t = base(); t.points[1].ticket = { at: 1795000000000, part: 'matin' };
  assert.notEqual(backupHash(t), h0, 'une visite prévue (jour et moment) compte toujours');
  const u = base(); u.points[1].ticket = dayTicket(1);
  assert.notEqual(backupHash(u), h0, 'une visite prévue remplacée par la liste du jour : la visite a disparu, ça compte');
});

test('lien d\'un lieu (v207) : les horaires partent avec leur date ; sans date ou avec une date absurde, pas de date', () => {
  const day = Math.floor(Date.UTC(2025, 2, 14) / 864e5);
  const p = { name: 'Café', lat: 48.86, lng: 2.35, hours: 'Mo-Fr 09:00-18:00', hoursAt: Date.UTC(2025, 2, 14, 16, 30) };
  const read = (x) => readPlaceLink(new URL(placeLink('https://x/', x)).hash);
  assert.equal(read(p).hoursAt, day * 864e5, 'le jour où ils ont été notés');
  assert.equal(new Date(read(p).hoursAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }), 'mars 2025');
  assert.equal(read({ ...p, hoursAt: undefined }).hoursAt, null, 'horaires sans date (lieu d\'avant la v200)');
  assert.equal(read({ ...p, hours: '' }).hoursAt, null, 'pas d\'horaires : pas de date');
  assert.equal(read({ ...p, hoursAt: Date.now() + 5 * 864e5 }).hoursAt, null, 'date dans le futur refusée');
  assert.equal(read({ ...p, hoursAt: 86400000 }).hoursAt, null, 'date d\'avant 2000 refusée');
  assert.equal(read(p).hours, p.hours);
});
