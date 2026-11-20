// Un proche me renvoie ses lieux après les avoir changés : « Toujours ouvert » (checked, v274) et la date de ses horaires
// (hoursAt, v200) suivent sa nouvelle version (mergeFriend, js/store.js). Avant, ma copie gardait l'ancienne : « a pu fermer »
// restait affiché alors qu'il avait revu le lieu, et ses nouveaux horaires portaient la date des anciens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeFriend, exportForFriend, SEND_DEFAULT } from '../js/store.js';

const cats = [{ id: 'resto', name: 'Restos', color: '#aa3300', icon: '🍽️' }];
const AN = 400 * 864e5;
const now = Date.now();
const lieu = (o = {}) => ({ id: 'a', name: 'Chez Paul', lat: 48.83, lng: 2.35, cat: 'resto', note: '', hours: 'lun-ven 9h-18h', hoursAt: now - AN, created: now - AN, ...o });
const lui = (p) => ({ me: 'Paul', categories: cats, lists: [], points: [p] });
const envoi = (p) => JSON.parse(JSON.stringify(exportForFriend(lui(p), SEND_DEFAULT)));
const choix = { lieux: true, notes: true, passages: false, photos: false, cats: null, artists: new Set(), venues: new Set(), plans: new Set() };
const moi = () => mergeFriend({ me: 'Marie', categories: cats, lists: [], points: [], plans: [], artists: [], venues: [] }, envoi(lieu()), 'Paul', choix).state;

test('« Toujours ouvert » noté par lui depuis le premier envoi : ma copie le reprend', () => {
  const r = mergeFriend(moi(), envoi(lieu({ checked: now })), 'Paul', choix);
  assert.equal(r.updated, 1);
  assert.equal(r.state.points[0].checked, now);
});

test('une date « Toujours ouvert » plus ancienne que la mienne ne la remplace pas', () => {
  const chezMoi = moi();
  chezMoi.points[0].checked = now;
  const r = mergeFriend(chezMoi, envoi(lieu({ checked: now - 864e5 })), 'Paul', choix);
  assert.equal(r.state.points[0].checked, now);
});

test('ses nouveaux horaires sans date : ma copie ne garde pas la date des anciens', () => {
  const r = mergeFriend(moi(), envoi(lieu({ hours: 'tous les jours 10h-20h', hoursAt: undefined })), 'Paul', choix);
  assert.equal(r.state.points[0].hours, 'tous les jours 10h-20h');
  assert.equal(r.state.points[0].hoursAt, undefined);
});

test('ses horaires inchangés gardent leur date', () => {
  const r = mergeFriend(moi(), envoi(lieu({ note: 'Toujours bien' })), 'Paul', choix);
  assert.equal(r.state.points[0].hoursAt, now - AN);
});
