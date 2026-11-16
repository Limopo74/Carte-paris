import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mhtmlHtml, mhtmlDate, decodeQP, ttbDayText, cleanTtb, cleanAll, readTtb, ttbStore, ttbKicker, ttbPass, ttbToday, TTB_RUBS } from '../js/ttb.js';

const raw = (o = {}) => ({ name: "L'Assiette ", type: 'Français, La Table', address: '181, Rue du Château , 75014 Paris', lat: 48.8334157, lng: 2.3240673, budget: 3,
  links: ['https://trestresbon.fr/adresses?display=list#infos-1', 'https://trestresbon.fr/video?id=1', 'https://restaurant-lassiette.paris/'],
  hours: { Lundi: ['Fermé', 'Fermé'], Mercredi: ['12:00 - 22:30', '19:00 - 22:30'], Samedi: ['10:00 - 19:00', ''] }, ...o });

test('ttb : une fiche propre (rubrique, cuisine, arrondissement, lien du lieu)', () => {
  const x = cleanTtb(raw());
  assert.equal(x.name, "L'Assiette");
  assert.equal(x.rub, 'La Table');
  assert.equal(x.cuisine, 'Français');
  assert.equal(x.address, '181, Rue du Château, 75014 Paris');
  assert.equal(x.arr, 14);
  assert.equal(x.budget, 3);
  assert.equal(x.url, 'https://restaurant-lassiette.paris/');
  assert.equal(ttbKicker(x), 'La Table · Français · €€€');
  assert.equal(x.hours.length, 7);
  assert.equal(x.hours[0], 'fermé');
  assert.equal(x.hours[2], 'midi dès 12h, soir 19h – 22h30');
  assert.equal(x.hours[5], '10h – 19h');
  assert.equal(cleanTtb(raw({ address: '5 rue Guillaume Bertrand, 75116 Paris' })).arr, 16);
});

test('ttb : Paris seulement, positions et liens vérifiés', () => {
  assert.equal(cleanTtb(raw({ address: "37, Rue de l'Église, 93100 Montreuil", lat: 48.8639, lng: 2.4439 })), null);
  assert.equal(cleanTtb(raw({ address: "15, Rue de l'Eglise, 75048 Montreuil" })), null);
  assert.equal(cleanTtb(raw({ address: '222, Rue de Charenton,', lat: 0, lng: 0 })), null);
  assert.equal(cleanTtb(raw({ lat: 48.9, lng: 3.5 })), null);
  assert.equal(cleanTtb(raw({ links: ['javascript:alert(1)'] })).url, '');
  assert.equal(cleanTtb(raw({ type: 'Inconnu' })).rub, '');
  assert.equal(cleanTtb(null), null);
});

test('ttb : sans doublons, horaires absents = liste vide', () => {
  const all = cleanAll([raw(), raw({ address: '181, Rue du Chateau, 75014 Paris' }), raw({ name: 'Autre', hours: {} })]);
  assert.equal(all.length, 2);
  assert.deepEqual(all[1].hours, []);
  assert.equal(ttbToday(all[1]), '');
});

test('ttb : horaires du jour en texte court', () => {
  assert.equal(ttbDayText(['Fermé', 'Fermé']), 'fermé');
  assert.equal(ttbDayText(['12:00 - 15:00', '19:00 - 23:00']), '12h – 15h, 19h – 23h');
  assert.equal(ttbDayText(['8:00 - 19:00', '8:00 - 19:00']), '8h – 19h');
  const x = cleanTtb(raw());
  assert.equal(ttbToday(x, new Date(2026, 10, 18)), 'midi dès 12h, soir 19h – 22h30'); // un mercredi
});

test('ttb : page .mhtml de Chrome (binaire ou quoted-printable) et sa date', () => {
  const mk = (enc, body) => `From: <Saved by Blink>\r\nDate: Mon, 16 Nov 2026 22:05:05 GMT\r\nContent-Type: multipart/related;\r\n\ttype="text/html";\r\n\tboundary="----B--x----"\r\n\r\n------B--x----\r\nContent-Type: text/html\r\nContent-Transfer-Encoding: ${enc}\r\n\r\n${body}\r\n------B--x----\r\nContent-Type: image/png\r\n\r\nPNG\r\n------B--x------\r\n`;
  assert.match(mhtmlHtml(mk('binary', '<html><h5>Très</h5></html>')), /^<html><h5>Très<\/h5><\/html>/);
  assert.match(mhtmlHtml(mk('quoted-printable', '<h5>Tr=C3=A8s Tr=C3=\r\n=A8s</h5>')), /^<h5>Très Très<\/h5>/);
  assert.equal(mhtmlHtml('<!DOCTYPE html><p>x</p>'), '<!DOCTYPE html><p>x</p>');
  assert.equal(mhtmlHtml('rien'), '');
  assert.equal(mhtmlDate(mk('binary', '')), '2026-11-16');
  assert.equal(decodeQP('a=3Db'), 'a=b');
});

test('ttb : la liste gardée est relue et revérifiée', () => {
  const items = cleanAll([raw()]);
  const back = readTtb(JSON.parse(JSON.stringify(ttbStore(items, '2026-11-16'))));
  assert.equal(back.date, '2026-11-16');
  assert.deepEqual(back.items, items);
  assert.equal(readTtb({ ttb: 1, items: [{ ...items[0], url: 'javascript:x' }] }).items[0].url, '');
  assert.equal(readTtb({ ttb: 1, items: [{ ...items[0], lat: 40 }] }).items.length, 0);
  assert.equal(readTtb({ items: [] }), null);
  assert.equal(readTtb(null), null);
});

test('ttb : filtres par rubrique et budget', () => {
  const x = cleanTtb(raw());
  assert.ok(ttbPass(x, new Set(), new Set()));
  assert.ok(ttbPass(x, new Set(['La Table']), new Set([3])));
  assert.ok(!ttbPass(x, new Set(['Cave']), new Set()));
  assert.ok(!ttbPass(x, new Set(), new Set([1, 2])));
  assert.equal(TTB_RUBS.length, 6);
});
