// v482 (mes choix 1A 2A 3A du 25 nov. 2026) : Alerter en silence et Proches à prévenir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanTel, cleanAlertContacts, sms114Text, smsProcheText, smsHref, ALERT_MAX } from '../js/alerte.js';
import { loadState, saveState, exportJSON, exportForFriend, mergeImport, backupHash, SEND_DEFAULT } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const AT = { lat: 48.88181, lng: 2.33372, acc: 14.6 };

test('cleanTel : chiffres et « + » au début, 8 à 15 chiffres, rien d\'autre', () => {
  assert.equal(cleanTel('06 12 34 56 78'), '0612345678');
  assert.equal(cleanTel('+33 6 12-34-56-78'), '+33612345678');
  assert.equal(cleanTel('12'), '');
  assert.equal(cleanTel('abc'), '');
  assert.equal(cleanTel('1234567890123456'), '');
  assert.equal(cleanTel(null), '');
});

test('cleanAlertContacts : 2 au plus, sans doublon ni numéro faux, prénom raccourci', () => {
  const c = cleanAlertContacts([{ name: '  Léa ', tel: '0612345678' }, { name: 'Bis', tel: '06 12 34 56 78' }, { name: 'X', tel: 'faux' }, { name: 'Marc', tel: '0712345678' }, { name: 'Trop', tel: '0812345678' }]);
  assert.deepEqual(c, [{ name: 'Léa', tel: '0612345678' }, { name: 'Marc', tel: '0712345678' }]);
  assert.equal(ALERT_MAX, 2);
  assert.equal(cleanAlertContacts([{ name: 'A'.repeat(40), tel: '0612345678' }])[0].name.length, 20);
  assert.deepEqual(cleanAlertContacts('rien'), []);
});

test('les messages prêts : je ne peux pas parler, adresse, coordonnées ; le lien sms: les encode', () => {
  const t = sms114Text(AT, '16 Rue Chaptal 75009 Paris');
  assert.match(t, /^Je ne peux pas parler\. Je suis : 16 Rue Chaptal 75009 Paris\. GPS : 48\.88181, 2\.33372 \(à 15 m près\)\. Ce qui se passe : $/);
  assert.match(sms114Text(AT), /Je suis : GPS : 48\.88181/); // adresse inconnue : les coordonnées seules
  const p = smsProcheText(AT, '');
  assert.match(p, /^Je suis à l'abri, je ne peux pas parler\./);
  assert.match(p, /query=48\.88181,2\.33372$/);
  const h = smsHref('114', t);
  assert.ok(h.startsWith('sms:114?body=Je%20ne%20peux%20pas%20parler'));
  assert.ok(!/[ \n]/.test(h));
});

test('mes proches à prévenir : gardés, dans ma sauvegarde, jamais chez un proche', () => {
  const s = memStorage();
  const st = { ...loadState(s), alertContacts: [{ name: 'Léa', tel: '0612345678' }] };
  saveState(s, st);
  assert.deepEqual(loadState(s).alertContacts, [{ name: 'Léa', tel: '0612345678' }]);
  assert.deepEqual(JSON.parse(exportJSON(st)).alertContacts, [{ name: 'Léa', tel: '0612345678' }]);
  assert.equal(exportForFriend(st, SEND_DEFAULT).alertContacts, undefined);
  assert.notEqual(backupHash(st), backupHash({ ...st, alertContacts: [] })); // un changement est à sauvegarder
  assert.equal(backupHash({ ...st, alertContacts: [] }), backupHash({ ...st, alertContacts: undefined })); // l'empreinte d'avant ne change pas
  // Restaurer ma sauvegarde les ajoute ; le fichier d'un proche ne touche pas aux miens
  const empty = loadState(memStorage());
  const file = exportJSON(st);
  assert.deepEqual(mergeImport(empty, file, '').state.alertContacts, [{ name: 'Léa', tel: '0612345678' }]);
  const friend = JSON.stringify({ ...JSON.parse(file), owner: 'Marc' });
  assert.deepEqual(mergeImport(empty, friend, 'Marc').state.alertContacts, []);
});

test('l\'écran : sous Urgences 112 dans Où suis-je ?, sombre, une seule plaque ; le réglage tout en bas d\'Autres réglages', () => {
  assert.match(app, /secoursRow\(\),\n.*\n\s+el\('button', \{ type: 'button', class: 'btn', onclick: \(\) => openSilentAlert\(at, \(\) => addrText, openWhereAmI\) \}, ico\('volume-x'\), 'Alerter en silence'\),/);
  const fn = app.slice(app.indexOf('function openSilentAlert('), app.indexOf('function openAlertContacts('));
  assert.equal((fn.match(/btn primary/g) ?? []).length, 1);
  assert.match(fn, /dataset\.theme = 'dark'/);
  assert.match(fn, /onClose: applyTheme/);
  assert.doesNotMatch(fn, /vibrate|speak|say\(/);
  const autres = app.slice(app.indexOf("if (section === 'autres')"), app.indexOf("{ name: 'settings:autres'"));
  assert.ok(autres.indexOf("'Proches à prévenir'") > autres.indexOf("'Mes remarques'"), 'Proches à prévenir : tout en bas, il ne pousse rien');
});
