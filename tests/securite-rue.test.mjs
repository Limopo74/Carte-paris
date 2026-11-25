// v485 (mon choix C du 25 nov. 2026) : SMS au 31177, « Je rentre », commissariats les plus proches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRANSPORT_SMS, sms31177Text, arrivalText, jeRentreText, JE_RENTRE_MAX_MIN, smsHref } from '../js/alerte.js';
import { COMMISSARIATS, commissariatsNear, hoursText } from '../js/commissariats.js';
import { distanceM } from '../js/geo.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const arrs = JSON.parse(readFileSync(new URL('../data/arrondissements.json', import.meta.url), 'utf8'));

test('31177 : le numéro RATP / SNCF, un message sans heure d\'ouverture ni position', () => {
  assert.equal(TRANSPORT_SMS, '31177');
  assert.match(sms31177Text(), /^Je ne peux pas parler\. Ligne : … Station ou direction : … Ce qui se passe : $/);
  assert.ok(smsHref(TRANSPORT_SMS, sms31177Text()).startsWith('sms:31177?body='));
  const fn = app.slice(app.indexOf('function openSilentAlert('), app.indexOf('function openJeRentre('));
  assert.equal((fn.match(/btn primary/g) ?? []).length, 1, 'une seule plaque : le 114');
  assert.ok(fn.indexOf("'SMS au 114'") < fn.indexOf('SMS au 31177'), 'le 31177 sous le 114');
  assert.doesNotMatch(fn, /24 ?h|7 ?j/i, 'aucune heure d\'ouverture écrite pour le 31177');
});

test('Je rentre : heure arrondie aux 5 min du dessus, rien au-delà de 90 min ou sans durée', () => {
  const d = new Date(2026, 10, 25, 22, 47);
  assert.equal(arrivalText(23, d), '23 h 10');
  assert.equal(arrivalText(13, d), '23 h 00');
  assert.equal(arrivalText(3, new Date(2026, 10, 25, 23, 58)), '0 h 05'); // minuit passé
  assert.equal(arrivalText(JE_RENTRE_MAX_MIN + 1, d), '');
  assert.equal(arrivalText(null, d), '');
  assert.equal(jeRentreText(23, d), 'Je rentre à pied, j\'arrive vers 23 h 10.');
  assert.equal(jeRentreText(null, d), 'Je rentre.');
  const fn = app.slice(app.indexOf('function openJeRentre('), app.indexOf('function openAlertContacts('));
  assert.match(fn, /walkMinutes\(distanceM\(at, home\)\)/, 'calcul sur le téléphone, mon pas compris');
  assert.doesNotMatch(fn, /smsProcheText/, 'ma position ne part pas dans « Je rentre »');
});

// Point dans un polygone (contours des arrondissements)
const inRing = ([x, y], ring) => { let inside = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i]; const [xj, yj] = ring[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; };
const arrAt = (lat, lng) => {
  for (const a of arrs.arr) if (a.rings.some((r) => inRing([lng, lat], r))) return a.n;
  return null;
};

test('commissariats : 16 adresses de la Préfecture de Police, chacune dans son arrondissement', () => {
  assert.equal(COMMISSARIATS.length, 16);
  const all = COMMISSARIATS.flatMap((x) => x.arr).sort((a, b) => a - b);
  assert.deepEqual(all, Array.from({ length: 20 }, (_, i) => i + 1), 'les 20 arrondissements, une fois chacun');
  for (const x of COMMISSARIATS) {
    const cp = Number(x.address.match(/750(\d\d)$/)[1]);
    assert.ok(x.arr.includes(cp), `${x.name} : code postal ${cp}`);
    const a = arrAt(x.lat, x.lng);
    assert.equal(a, cp, `${x.name} : la position tombe dans le ${a}e, pas le ${cp}e`);
    assert.ok(x.h24 || /^\d+h-\d+h$/.test(x.hours), `${x.name} : horaires de la fiche`);
  }
  assert.equal(hoursText(COMMISSARIATS[1]), 'Ouvert 24 h/24');
  assert.equal(hoursText(COMMISSARIATS[0]), 'Horaires affichés : 9h-20h');
});

test('commissariats proches : les 2 plus proches à moins de 4 km, rien loin de Paris', () => {
  const chaptal = { lat: 48.8812, lng: 2.3361 };
  const near = commissariatsNear(chaptal, distanceM);
  assert.equal(near.length, 2);
  assert.equal(near[0].x.arr[0], 9);
  assert.ok(near[0].d <= near[1].d);
  assert.deepEqual(commissariatsNear({ lat: 45.76, lng: 4.84 }, distanceM), []); // Lyon
  const block = app.slice(app.indexOf('const police = commissariatsNear('), app.indexOf("openSheet([ico('map-pinned'), ' ', ...withGear(nearTitle()"));
  assert.ok(block.length > 0 && app.indexOf('const police = commissariatsNear(') > app.indexOf('const prized = prizedNear('), 'tout en bas d\'Autour de moi');
});
