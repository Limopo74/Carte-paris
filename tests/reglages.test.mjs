import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNING, cleanTuning, stepTuning, tuningText, cleanFicheHidden, FICHE_LINES } from '../js/reglages.js';
import { loadState, saveState, exportJSON, readSettings, cleanSettings, saveMySettings, applyMySettings, KEY } from '../js/store.js';
import { memoryHere, memoryTitle } from '../js/passage.js';
import { mapsUrl, setWalkLimit, distanceM } from '../js/geo.js';
import { pastPlans } from '../js/planning.js';

// v214 : Réglages → Alertes et bandeau, Fiche d'un lieu, Distances et durées (maquette validée le 18 nov., claude/idee-reglages.md)
const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

// Bornes et crans de la maquette (mon choix 3A), recopiés du texte, pas du code
const SPEC = {
  alertM: [50, 500, 50, 100], // « Prévenir à 100 m » : de 50 à 500 m, par 50 m
  memoryM: [50, 500, 50, 100], // « Déjà passée ici » : 50 à 500 m par 50
  walkM: [500, 3000, 250, 1000], // Y aller : 500 m à 3 km par 250 m
  eventsM: [1000, 5000, 500, 3000], // Sorties : 1 à 5 km par 500 m, 3 km au départ (mon choix 2A)
  ttbMin: [5, 30, 5, 15], // TTB : 5 à 30 min par 5
  rainMin: [5, 20, 5, 10], // passages couverts : 5 à 20 min par 5
  villeM: [50, 300, 50, 150], // v245 : immeubles protégés par la Ville dans Monuments, 50 à 300 m par 50 (mon choix M2B)
  traceMin: [1, 5, 1, 2], // circuits : 1 à 5 min par 1
  askDays: [15, 90, 15, 30], // « Tu y es allée ? » : 15 à 90 jours par 15
  leaveMin: [15, 60, 5, 20], // v365 : marge de « Pars à », 15 à 60 min par 5, 20 au départ (ma demande du 21 nov., 15 au plus bas)
};

test('valeurs au départ : celles d\'aujourd\'hui, sauf Sorties à 3 km', () => {
  assert.deepEqual(cleanTuning(), { alertM: 100, memoryM: 100, walkM: 1000, eventsM: 3000, ttbMin: 15, rainMin: 10, villeM: 150, traceMin: 2, askDays: 30, leaveMin: 20 });
  assert.deepEqual(Object.keys(TUNING).sort(), Object.keys(SPEC).sort());
});

for (const [key, [min, max, step, def]] of Object.entries(SPEC)) {
  test(`${key} : de ${min} à ${max} par ${step}, ${def} au départ`, () => {
    // les deux bornes sont acceptées, un cran dehors ne l'est pas
    assert.equal(cleanTuning({ [key]: min })[key], min, 'borne basse');
    assert.equal(cleanTuning({ [key]: max })[key], max, 'borne haute');
    assert.equal(cleanTuning({ [key]: min - step })[key], def, 'un cran sous la borne basse');
    assert.equal(cleanTuning({ [key]: max + step })[key], def, 'un cran au-dessus de la borne haute');
    assert.equal(cleanTuning({ [key]: min - 1 })[key], def, 'juste sous la borne basse');
    assert.equal(cleanTuning({ [key]: max + 1 })[key], def, 'juste au-dessus de la borne haute');
    // entre deux crans, du texte, rien : valeur de départ
    if (step > 1) assert.equal(cleanTuning({ [key]: min + 1 })[key], def, 'entre deux crans');
    assert.equal(cleanTuning({ [key]: String(min) })[key], def, 'du texte');
    assert.equal(cleanTuning({ [key]: NaN })[key], def);
    assert.equal(cleanTuning({})[key], def);
    // − et + : un cran à la fois, et on le sait quand on est au bout
    assert.deepEqual(stepTuning({ [key]: def }, key, 1), { value: def + step, edge: null });
    assert.deepEqual(stepTuning({ [key]: def }, key, -1), { value: def - step, edge: null });
    assert.deepEqual(stepTuning({ [key]: min + step }, key, -1), { value: min, edge: null }, 'on atteint la borne basse');
    assert.deepEqual(stepTuning({ [key]: min }, key, -1), { value: min, edge: 'min' }, 'pas plus bas');
    assert.deepEqual(stepTuning({ [key]: max - step }, key, 1), { value: max, edge: null }, 'on atteint la borne haute');
    assert.deepEqual(stepTuning({ [key]: max }, key, 1), { value: max, edge: 'max' }, 'pas plus haut');
  });
}

test('valeurs écrites en clair', () => {
  assert.equal(tuningText('alertM', 100), '100 m');
  assert.equal(tuningText('alertM', 500), '500 m');
  assert.equal(tuningText('walkM', 750), '750 m');
  assert.equal(tuningText('walkM', 1000), '1 km');
  assert.equal(tuningText('walkM', 1250), '1,25 km');
  assert.equal(tuningText('eventsM', 3000), '3 km');
  assert.equal(tuningText('eventsM', 3500), '3,5 km');
  assert.equal(tuningText('ttbMin', 15), '15 min');
  assert.equal(tuningText('traceMin', 1), '1 min');
  assert.equal(tuningText('askDays', 30), '30 jours');
});

test('Fiche d\'un lieu : seuls QR code, Avis Google et Uber se masquent', () => {
  assert.deepEqual(FICHE_LINES, ['qr', 'avis', 'uber', 'stars']);
  assert.deepEqual(cleanFicheHidden(['uber', 'qr', 'horaires', 'qr', 7]), ['qr', 'uber']);
  assert.deepEqual(cleanFicheHidden(undefined), []);
  assert.deepEqual(cleanFicheHidden('qr'), []);
});

test('nouveaux réglages : valeurs de départ, gardés, exportés, relus', () => {
  const st = memStorage();
  const s0 = loadState(st);
  assert.deepEqual(s0.tuning, cleanTuning());
  assert.equal(s0.suggestNow, true, 'Suggestions autour de moi : allumé au départ');
  assert.equal(s0.alertNear, true, 'Prévenir près d\'un de mes lieux : allumé au départ');
  assert.deepEqual(s0.ficheHidden, ['uber'], 'v323 : un nouveau venu a la fiche sans Uber (mon choix 2a)');
  assert.equal(s0.vibrateNow, false, 'la vibration de « Maintenant » reste éteinte au départ');
  assert.ok(saveState(st, { ...s0, tuning: { ...s0.tuning, alertM: 250, eventsM: 1500, askDays: 90 }, suggestNow: false, alertNear: false, ficheHidden: ['uber', 'qr'] }));
  const back = loadState(st);
  assert.deepEqual(back.tuning, { ...cleanTuning(), alertM: 250, eventsM: 1500, askDays: 90 });
  assert.equal(back.suggestNow, false);
  assert.equal(back.alertNear, false);
  assert.deepEqual(back.ficheHidden, ['qr', 'uber']);
  const read = readSettings(JSON.parse(exportJSON(back)));
  assert.deepEqual(read.tuning, back.tuning);
  assert.equal(read.suggestNow, false);
  assert.equal(read.alertNear, false);
  assert.deepEqual(read.ficheHidden, ['qr', 'uber']);
});

test('ancien stockage et ancienne sauvegarde sans ces réglages : valeurs de départ', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], categories: [], voice: false, vibrateNow: true }));
  const s = loadState(st);
  assert.deepEqual(s.tuning, cleanTuning());
  assert.equal(s.suggestNow, true);
  assert.equal(s.alertNear, true);
  assert.deepEqual(s.ficheHidden, []);
  assert.equal(s.voice, false, 'les anciens réglages ne bougent pas');
  assert.equal(s.vibrateNow, true);
  const old = readSettings({ settings: { voice: false, rings: [100, 300] } });
  assert.deepEqual(old.tuning, cleanTuning());
  assert.equal(old.suggestNow, true);
  assert.equal(old.alertNear, true);
  assert.deepEqual(old.ficheHidden, []);
});

test('valeurs abîmées dans le stockage : remises au départ, une par une', () => {
  const st = memStorage();
  st.setItem(KEY, JSON.stringify({ points: [], categories: [], tuning: { alertM: 9999, memoryM: 150, walkM: 'loin' }, suggestNow: 'non', alertNear: 0, ficheHidden: 'tout' }));
  const s = loadState(st);
  assert.deepEqual(s.tuning, { ...cleanTuning(), memoryM: 150 });
  assert.equal(s.suggestNow, true, 'seul false éteint');
  assert.equal(s.alertNear, true, 'seul false éteint');
  assert.deepEqual(s.ficheHidden, []);
});

test('« Mes réglages par défaut » reprend aussi les nouveaux réglages', () => {
  const base = loadState(memStorage());
  const mine = saveMySettings({ ...base, tuning: { ...base.tuning, walkM: 2000 }, suggestNow: false, ficheHidden: ['avis'] });
  const changed = { ...mine, tuning: cleanTuning(), suggestNow: true, alertNear: false, ficheHidden: [] };
  const again = applyMySettings(changed);
  assert.equal(again.tuning.walkM, 2000);
  assert.equal(again.suggestNow, false);
  assert.equal(again.alertNear, true);
  assert.deepEqual(again.ficheHidden, ['avis']);
  assert.deepEqual(cleanSettings({}).tuning, cleanTuning());
});

/* ---------- « Déjà passée ici » : distance réglable, texte jamais faux ---------- */
const day = 864e5;
const now = new Date(2026, 10, 19, 15).getTime();
const here = { lat: 48.8800, lng: 2.3400 };
const far = { id: 'e', lat: 48.8820, lng: 2.3400, note: 'cour avec glycine', created: now - 200 * day }; // environ 220 m

test('« Déjà passée ici » : la distance réglée est comprise, un mètre de plus ne l\'est pas', () => {
  const d = distanceM(here, far);
  assert.ok(d > 200 && d < 250, `le lieu d'essai est à ${d} m`);
  assert.equal(memoryHere([far], here, {}, now), null, 'sans réglage : 100 m, comme avant');
  assert.equal(memoryHere([far], here, {}, now, d - 1), null, 'un mètre trop court');
  assert.equal(memoryHere([far], here, {}, now, d)?.p.id, 'e', 'exactement à la distance réglée');
  assert.equal(memoryHere([far], here, {}, now, d + 1)?.p.id, 'e');
  assert.equal(memoryHere([far], here, {}, now, 250)?.p.id, 'e', 'réglé à 250 m');
  assert.equal(memoryHere([far], here, {}, now, 200), null, 'réglé à 200 m');
});

test('jusqu\'à 100 m « Tu es déjà passée ici » ; au-delà « Déjà passée · N min à pied »', () => {
  assert.equal(memoryTitle(99, 2), 'Tu es déjà passée ici');
  assert.equal(memoryTitle(100, 2), 'Tu es déjà passée ici');
  assert.equal(memoryTitle(101, 2), 'Déjà passée · 2 min à pied');
  assert.equal(memoryTitle(240, 3), 'Déjà passée · 3 min à pied');
  assert.equal(memoryTitle(0, 0), 'Tu es déjà passée ici');
});

/* ---------- Y aller : à pied jusqu'à la distance réglée, en transports au-delà ---------- */
const p = { lat: 48.85, lng: 2.35 };

test('Y aller : la limite réglée sépare la marche des transports', () => {
  assert.match(mapsUrl(p, 499, 500), /travelmode=walking/);
  assert.match(mapsUrl(p, 500, 500), /travelmode=transit/);
  assert.match(mapsUrl(p, 501, 500), /travelmode=transit/);
  assert.match(mapsUrl(p, 2999, 3000), /travelmode=walking/);
  assert.match(mapsUrl(p, 3000, 3000), /travelmode=transit/);
  assert.match(mapsUrl(p, 3001, 3000), /travelmode=transit/);
});

test('Y aller : une distance inconnue part en transports, une station toujours à pied, quelle que soit la limite', () => {
  for (const limit of [500, 1000, 3000]) {
    setWalkLimit(limit);
    assert.match(mapsUrl(p, Infinity), /travelmode=transit/, `distance inconnue, limite ${limit}`);
    assert.match(mapsUrl(p, 0), /travelmode=walking/, `à pied imposé, limite ${limit}`);
    assert.match(mapsUrl(p, limit - 1), /travelmode=walking/);
    assert.match(mapsUrl(p, limit), /travelmode=transit/);
  }
  setWalkLimit(); // sans valeur : 1 km, comme avant
  assert.match(mapsUrl(p, 999), /travelmode=walking/);
  assert.match(mapsUrl(p, 1000), /travelmode=transit/);
});

test('app.js ne garde plus les faux « 1000 » et « 999 » qui supposaient une limite de 1 km', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.equal(/mapsUrl\([^)]*\?\? 1000\)/.test(app), false, 'distance inconnue : Infinity');
  assert.equal(/mapsUrl\([^()]*, 1000\)/.test(app), false);
  assert.equal(/mapsUrl\([^)]*999\)/.test(app), false, 'à pied imposé : 0');
});

/* ---------- « Tu y es allée ? » : nombre de jours réglable ---------- */
test('« Tu y es allée ? » : le dernier jour compté est compris, le suivant ne l\'est pas', () => {
  const today = new Date(2026, 10, 19, 15);
  const ago = (n) => ({ name: `J-${n}`, ticket: { at: new Date(2026, 10, 19 - n, 10).getTime() } });
  const pts = [ago(1), ago(14), ago(15), ago(16), ago(30), ago(31), ago(89), ago(90), ago(91)];
  const names = (days) => pastPlans(pts, today, days).map((x) => x.name);
  assert.deepEqual(names(15), ['J-1', 'J-14', 'J-15']);
  assert.deepEqual(names(30), ['J-1', 'J-14', 'J-15', 'J-16', 'J-30']);
  assert.deepEqual(names(90), ['J-1', 'J-14', 'J-15', 'J-16', 'J-30', 'J-31', 'J-89', 'J-90']);
  assert.deepEqual(pastPlans(pts, today).map((x) => x.name), names(30), 'sans réglage : 30 jours, comme avant');
});

/* ---------- Une sortie de l'agenda prévue se garde aussi longtemps que la question se pose ---------- */
test('sorties de l\'agenda : gardées autant de jours que « Tu y es allée ? », jamais moins de 30', async () => {
  const { cleanPlans } = await import('../js/planning.js');
  const t = new Date(2026, 10, 19, 15).getTime();
  const plan = (n) => ({ id: `p${n}`, name: `J-${n}`, lat: 48.86, lng: 2.33, plan: true, ticket: { at: new Date(2026, 10, 19 - n, 10).getTime() } });
  const list = [plan(20), plan(30), plan(31), plan(60), plan(90), plan(91)];
  const kept = (days) => cleanPlans(list, t, days).map((x) => x.name);
  assert.deepEqual(cleanPlans(list, t).map((x) => x.name), ['J-20', 'J-30'], 'sans réglage : 30 jours, comme avant');
  assert.deepEqual(kept(30), ['J-20', 'J-30']);
  assert.deepEqual(kept(15), ['J-20', 'J-30'], 'réglé à 15 jours : rien n\'est effacé plus tôt qu\'avant');
  assert.deepEqual(kept(60), ['J-20', 'J-30', 'J-31', 'J-60']);
  assert.deepEqual(kept(90), ['J-20', 'J-30', 'J-31', 'J-60', 'J-90']);
});

test('réglé à 90 jours, une sortie de l\'agenda vieille de 60 jours survit à l\'enregistrement et à la sauvegarde', () => {
  const st = memStorage();
  const old = { id: 'vieux', name: 'Expo de septembre', lat: 48.86, lng: 2.33, plan: true, ticket: { at: Date.now() - 60 * day } };
  const base = loadState(st);
  assert.ok(saveState(st, { ...base, plans: [old] }));
  assert.equal(loadState(st).plans.length, 0, 'à 30 jours, elle s\'efface comme avant');
  assert.ok(saveState(st, { ...base, plans: [old], tuning: { ...base.tuning, askDays: 90 } }));
  const back = loadState(st);
  assert.deepEqual(back.plans.map((x) => x.id), ['vieux']);
  assert.deepEqual(JSON.parse(exportJSON(back)).plans.map((x) => x.id), ['vieux']);
});

test('Fiche d\'un lieu (v281) : Mes étoiles peut se masquer ; gardé, remis à l\'ancienne sauvegarde, étoiles du lieu intactes', () => {
  const st = memStorage();
  const s0 = loadState(st);
  saveState(st, { ...s0, ficheHidden: ['stars'], points: [{ id: 'x', name: 'Musée', lat: 48.88, lng: 2.33, cat: s0.categories[0].id, stars: 4 }] });
  const back = loadState(st);
  assert.deepEqual(back.ficheHidden, ['stars']);
  assert.equal(back.points[0].stars, 4, 'masquer ne retire pas les étoiles');
  assert.deepEqual(readSettings(JSON.parse(exportJSON(back))).ficheHidden, ['stars']);
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /!ficheShows\('stars'\) \? null : starPicker\(p\.stars/, 'la fiche suit le réglage');
  assert.match(app, /\['stars', 'star', 'Mes étoiles', [^\]]+\]\];/, 'la ligne est en dernier sur la page Fiche d\'un lieu');
});
