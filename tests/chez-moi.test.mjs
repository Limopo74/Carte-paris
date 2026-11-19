// Chez moi (v222, mes choix du 19 nov. 2026) : mon adresse comme point de départ des distances.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanHome, awayFromHome, homeOrigin, homeShort, HOME_AWAY_M } from '../js/chezmoi.js';
import { loadState, saveState, exportJSON, exportForFriend, mergeImport, backupHash, SEND_DEFAULT } from '../js/store.js';

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const MARTYRS = { lat: 48.8790, lng: 2.3400, label: '12 Rue des Martyrs 75009 Paris' };
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('cleanHome : une adresse dans Paris ou tout près, rien de loin ni de faux', () => {
  assert.deepEqual(cleanHome(MARTYRS), MARTYRS);
  assert.equal(cleanHome({ lat: 45.76, lng: 4.83, label: 'Lyon' }), null); // loin de Paris : refusée
  assert.equal(cleanHome({ lat: 'x', lng: 2.34 }), null);
  assert.equal(cleanHome(null), null);
  assert.equal(cleanHome({ lat: 48.879, lng: 2.34 }).label, 'Mon adresse');
  assert.equal(cleanHome({ ...MARTYRS, label: 'a'.repeat(200) }).label.length, 80);
});

test('awayFromHome : seulement à coup sûr à plus de 500 m (précision du GPS déduite)', () => {
  assert.equal(HOME_AWAY_M, 500);
  const near = { lat: 48.8800, lng: 2.3400, acc: 20 }; // ≈ 110 m
  const far = { lat: 48.8900, lng: 2.3400, acc: 20 }; // ≈ 1,2 km
  assert.equal(awayFromHome(near, MARTYRS), false);
  assert.equal(awayFromHome(far, MARTYRS), true);
  assert.equal(awayFromHome({ ...far, acc: 1000 }, MARTYRS), false); // trop imprécis pour l'éteindre
  assert.equal(awayFromHome(far, null), false);
});

test('homeOrigin et homeShort', () => {
  const o = homeOrigin(MARTYRS, 123);
  assert.deepEqual(o, { lat: MARTYRS.lat, lng: MARTYRS.lng, acc: 0, time: 123, kind: 'home', label: 'Chez moi' });
  assert.equal(homeShort(MARTYRS), '12 Rue des Martyrs');
  assert.equal(homeShort({ label: 'Ma position du 19 novembre' }), 'Ma position du 19 novembre');
});

test('Chez moi est gardé sur le téléphone, part dans ma sauvegarde, jamais chez un proche', () => {
  const st = memStorage();
  const s0 = loadState(st);
  assert.equal(s0.home, null);
  assert.equal(s0.homeOn, false);
  saveState(st, { ...s0, home: MARTYRS, homeOn: true });
  const s1 = loadState(st);
  assert.deepEqual(s1.home, MARTYRS);
  assert.equal(s1.homeOn, true);
  const file = JSON.parse(exportJSON(s1));
  assert.deepEqual(file.home, MARTYRS);
  assert.equal('homeOn' in file, false); // l'interrupteur est un moment, pas un réglage
  assert.equal(JSON.stringify(exportForFriend(s1, SEND_DEFAULT)).includes('Martyrs'), false);
});

test('restauration : mon adresse revient de ma sauvegarde, pas de celle d\'un proche, et ne remplace pas celle du téléphone', () => {
  const empty = loadState(memStorage());
  const file = exportJSON({ ...empty, home: MARTYRS });
  assert.deepEqual(mergeImport(empty, file).state.home, MARTYRS);
  assert.equal(mergeImport(empty, file, 'Anne').state.home ?? null, null);
  const other = { lat: 48.85, lng: 2.35, label: 'Autre' };
  assert.deepEqual(mergeImport({ ...empty, home: other }, file).state.home, other);
});

test('empreinte de sauvegarde : inchangée sans adresse, changée avec, pas par l\'interrupteur', () => {
  const s = loadState(memStorage());
  const h0 = backupHash(s);
  assert.equal(backupHash({ ...s, home: null }), h0);
  assert.notEqual(backupHash({ ...s, home: MARTYRS }), h0);
  assert.equal(backupHash({ ...s, home: MARTYRS, homeOn: true }), backupHash({ ...s, home: MARTYRS, homeOn: false }));
});

test('l\'appli : point de départ unique, écrans « là où je suis » inchangés, extinction seule, canapé', () => {
  assert.match(app, /const startHere = \(\) => atHome\(\) \?\? nearHere\(\);/);
  assert.match(app, /if \(homeOn\(\) && fix\.time >= homeOnAt && awayFromHome\(fix, state\.home\)\)/);
  assert.match(app, /de\\u00a0chez\\u00a0toi/);
  // v239 : la pastille ouvre toujours la météo ; Chez moi s'éteint par l'interrupteur en haut de la page
  assert.match(app, /wxBadge\.addEventListener\('click', \(\) => openWeather\(\)\);/);
  const w = app.slice(app.indexOf('function openWeather('), app.indexOf("name: 'weather'"));
  assert.match(w, /role: 'switch'/);
  assert.match(w, /'Partir de chez moi'/);
  assert.match(app, /if \(view === 'weather'\) openWeather\(true\);/);
  // v241 : la page Réglages → Chez moi suit aussi (« Annuler » du message)
  assert.match(app, /else if \(view === 'settings:chezmoi'\) openHomeSettings\(\);/);
  // Rentrer, la boussole et Où suis-je ? partent toujours de ma vraie position
  for (const fn of ['async function openHomePlan', 'function openCompass', 'async function openWhereAmI']) {
    const i = app.indexOf(fn); assert.ok(i > 0, fn);
    const body = app.slice(i, app.indexOf('\n}\n', i));
    assert.equal(/startHere\(\)|startPos\(\)|atHome\(\)/.test(body), false, fn);
  }
  // « Y aller » n'envoie jamais mon adresse à Google : pas de point de départ dans le lien
  assert.equal(readFileSync(new URL('../js/geo.js', import.meta.url), 'utf8').includes('origin='), false);
  assert.ok(readFileSync(new URL('../sw.js', import.meta.url), 'utf8').includes("'js/chezmoi.js'"));
});
