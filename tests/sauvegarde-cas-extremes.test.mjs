// v533 (audit du 25 nov., mon choix 4A) : sauvegarde, restauration, envoi à un proche et fichier de réglages sur 300 cas extrêmes
// (noms piégés, coordonnées fausses, identifiants en double, réglages faux, 2 000 lieux, fichiers abîmés). Tirage fixe : même résultat à chaque fois.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../js/store.js';

function deepStrictEqual(a, b) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja === jb) return;
  let k = 0; while (k < ja.length && ja[k] === jb[k]) k++;
  throw new Error('différent vers : ' + ja.slice(Math.max(0, k - 40), k + 80) + '  ≠  ' + jb.slice(Math.max(0, k - 40), k + 80));
}
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p) => rnd() < p;

const NASTY = ['', ' ', 'Café 🥐', '<img src=x onerror=alert(1)>', '__proto__', 'constructor', 'a'.repeat(10000), '‮gauche', 'zéro​largeur',
  'ligne\nretour', '\u0000nul', 'Ⓜ Châtelet–Les Halles', '"guillemets" \'simples\'', '😀'.repeat(500), 'Œuvre d’art', '\\\\back', '%00%20', 'null', '{"a":1}'];
const NUM = [0, -0, 1, -1, NaN, Infinity, -Infinity, 1e308, -1e308, 2 ** 53, 48.85, 2.35, '48.8', null, undefined, true, [], {}];
let uid = 0;
const id = () => (chance(0.05) ? pick(['', '../x', 'a b', 'x'.repeat(70), 42, null]) : 'id' + (++uid).toString(36));
const name = () => (chance(0.3) ? pick(NASTY) : pick(['Louvre', 'Boulangerie Utopie', 'Chez Gégène', 'Mosaïque PA_12']));
const coord = (lo, hi) => (chance(0.08) ? pick(NUM) : lo + rnd() * (hi - lo));
const time = () => (chance(0.05) ? pick(NUM) : Date.now() + int(-400, 400) * 864e5);
const maybe = (f) => (chance(0.5) ? f() : undefined);

function cats() {
  const base = S.DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  const n = int(0, 6);
  for (let i = 0; i < n; i++) base.push({ id: id(), name: name(), color: chance(0.85) ? pick(S.PALETTE) : pick(['red', '#zzzzzz', '#ABCDEF', 1]), icon: pick([...S.ICONS, '💩', '📷', undefined]), log: maybe(name), did: maybe(name),
    subs: maybe(() => Array.from({ length: int(0, 50) }, () => ({ id: id(), name: name() }))), photo: chance(0.2) || undefined, words: maybe(() => pick(['', 'serie1', '../'])) });
  if (chance(0.1)) base.push(base[1]); // en double
  if (chance(0.05)) return pick([null, 'texte', [], [{}]]);
  return base;
}
function point(catIds, lists) {
  const p = {
    id: id(), name: name(), cat: chance(0.9) ? pick(catIds) : pick(['inconnue', null, 7]),
    note: chance(0.2) ? pick(NASTY) : 'mon commentaire', done: chance(0.3) ? true : pick([false, 'oui', 1]), visited: maybe(time),
    fav: chance(0.2) ? true : pick([false, 'x']), lat: coord(48.8, 48.9), lng: coord(2.25, 2.42), address: maybe(name), hours: chance(0.2) ? 'Lun-Ven 9h-18h ' + 'x'.repeat(int(0, 400)) : undefined,
    hoursAt: maybe(time), owner: chance(0.2) ? pick(['Paul', 'Anne', ' Anne ', 'x'.repeat(50)]) : '', stars: pick([0, 3, 5, 6, -1, 2.5, '4']),
    ticket: maybe(() => ({ at: time(), with: maybe(name), part: maybe(() => pick(['matin', 'soir', 'nuit'])) })), lists: maybe(() => Array.from({ length: int(0, 40) }, () => (chance(0.8) && lists.length ? pick(lists).id : id()))),
    covered: chance(0.2), cafe: chance(0.2) || undefined, shop: chance(0.2) || undefined, cafeNote: maybe(name), shopNote: maybe(name),
    arr: pick([null, 1, 20, 0, 21, 3.5, '9']), photos: maybe(() => Array.from({ length: int(0, 10) }, id)),
    passages: maybe(() => Array.from({ length: int(0, 30) }, () => ({ at: time(), text: maybe(name), photo: maybe(id), stars: pick([1, 5, 0, 9]), pass: chance(0.3) || undefined }))),
    moments: maybe(() => ['matin', 'soir', 'hiver', 'zzz']), artist: maybe(name), gone: maybe(time), checked: maybe(time), rub: maybe(() => pick(['La Table', '', 'Autre'])),
    pass: chance(0.2) || undefined, shot: maybe(() => pick([0, time(), -5])), sub: maybe(id),
    line: maybe(() => Array.from({ length: pick([1, 2, 5, 400, 401]) }, () => [coord(48.8, 48.9), coord(2.25, 2.42)])), created: maybe(time),
  };
  if (chance(0.03)) return pick([null, 5, 'lieu', [], { id: 'x' }]);
  return p;
}
function randomObj(big = false) {
  const categories = cats();
  const catIds = Array.isArray(categories) ? categories.filter((c) => c && typeof c.id === 'string').map((c) => c.id) : ['resto'];
  const lists = Array.from({ length: int(0, 8) }, () => ({ id: id(), name: name() }));
  const n = big ? 2000 : pick([0, 0, 1, 2, 10, 50, int(0, 300)]);
  const points = Array.from({ length: n }, () => point(catIds.length ? catIds : ['resto'], lists));
  if (chance(0.1) && points.length > 1) points.push({ ...points[0] }); // même id deux fois
  return {
    points, categories, lists, me: chance(0.5) ? pick(['Anne', 'Paul', ' Anne ', '', 'x'.repeat(60), '<b>']) : undefined,
    plans: Array.from({ length: int(0, 5) }, () => ({ id: id(), name: name(), lat: coord(48.8, 48.9), lng: coord(2.25, 2.42), ticket: { at: time() } })),
    artists: Array.from({ length: int(0, 5) }, name), venues: Array.from({ length: int(0, 3) }, name),
    artistLinks: { a: { n: 'Invader', u: 'https://www.instagram.com/invaderwashere' }, b: { n: 'x', u: 'javascript:alert(1)' } },
    outings: Array.from({ length: int(0, 3) }, () => ({ id: id(), name: name(), at: time(), lat: coord(48.8, 48.9), lng: coord(2.25, 2.42) })),
    notes: Array.from({ length: int(0, 5) }, () => ({ day: pick(['2026-11-25', '2026-02-30', 'hier', '2026-01-01']), at: time(), text: name() })),
    home: maybe(() => ({ lat: coord(48.8, 48.9), lng: coord(2.25, 2.42), label: name() })),
    alertContacts: maybe(() => [{ name: name(), tel: pick(['0612345678', '+33 6 12 34 56 78', 'abc', '15']) }, { name: 'B', tel: '0698765432' }, { name: 'C', tel: '0611111111' }]),
    kit: maybe(() => ({ ok: ['eau', 'zzz'], at: time(), n: pick([1, 9, 10, 0]) })),
    myStations: maybe(() => [{ id: id(), station: name(), label: name(), bus: { n: 'Mairie', c: '75056' }, moreBus: [{ n: 'Gare', c: '75056' }, { n: 'X', c: 'abc' }] }]),
    mapStyle: pick([...S.MAP_STYLES, 'zzz']), theme: pick(['light', 'dark', 'auto', 'x']), look: pick([...S.LOOKS, 'x']), textSize: pick([...S.TEXT_SIZES, 'enorme']),
    masculin: chance(0.5), hiddenChips: maybe(() => ['ttb', 'zzz', 'lines']), moreChips: maybe(() => ['velib', 'ttb']), chipOrder: maybe(() => ['ttb', 'fav', 'zzz', 'ttb']),
    hiddenFilters: maybe(() => ['open', 'zzz']), wx: maybe(() => ({ arr: true, seine: 'oui' })), pace: maybe(() => ({ mode: pick(['rapide', 'x']), kmh: { rapide: pick([7, -3, 100]) } })),
    runPace: maybe(() => pick([300, 0, 1e9, 'x', null])), rings: maybe(() => [100, -5, 'x', 1e9]), minuteRings: maybe(() => [5, 10, 1000]),
    toolNames: maybe(() => ({ metro: name(), zzz: 'a', __proto__: { evil: 1 } })), tuning: maybe(() => ({ askDays: pick([1, 30, 999, -2]) })),
    mySettings: maybe(() => ({ at: time(), settings: { textSize: 'grand', theme: 'dark', hiddenChips: ['ttb'] } })),
    lastExport: maybe(time), backup: maybe(() => ({ n: pick([0, 3, -1]), since: time(), saved: 'h', last: 'h' })),
    words: maybe(() => [{ id: 'serie1', name: name(), words: ['Bon', 'Cher', name()] }, { id: 'bad id', name: 'x', words: [] }]),
    layoutV: pick([undefined, 1, 4]), chipsV: pick([undefined, 2, 7, 99]),
  };
}

const memStorage = (raw) => { const m = new Map(raw === undefined ? [] : [[S.KEY, raw]]); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
const fails = [];
const fail = (i, what, e) => fails.push(`cas ${i} : ${what}${e ? ' — ' + String(e?.message ?? e).slice(0, 300) : ''}`);
const strip = (s) => { const { backup, ok, fresh, ...rest } = s; return rest; };
const byId = (a) => [...a].sort((x, y) => (x.id < y.id ? -1 : 1));
const fresh = () => S.loadState(memStorage());
const sameSet = (a, b) => JSON.stringify([...(a ?? [])].map((x) => JSON.stringify(x)).sort()) === JSON.stringify([...(b ?? [])].map((x) => JSON.stringify(x)).sort());

function checkState(i, obj) {
  let s1;
  try { s1 = S.loadState(memStorage(JSON.stringify(obj))); } catch (e) { return fail(i, 'loadState plante', e); }
  if (!s1.ok) return fail(i, 'loadState rend ok:false sur un objet JSON');
  // 1. enregistrer puis relire = la même chose (deux fois)
  try {
    const st = memStorage(); S.saveState(st, s1); const s2 = S.loadState(st);
    const st2 = memStorage(); S.saveState(st2, s2); const s3 = S.loadState(st2);
    deepStrictEqual(strip(s3), strip(s2));
    deepStrictEqual(byId(s2.points), byId(s1.points));
  } catch (e) { fail(i, 'enregistrer puis relire change l\'état', e); }
  // 2. sauvegarde -> restauration sur une appli vide
  const seenIds = new Set(); const uniq = s1.points.filter((p) => !seenIds.has(p.id) && seenIds.add(p.id));
  let text, r;
  try { text = S.exportJSON(s1); JSON.parse(text); } catch (e) { return fail(i, 'exportJSON plante', e); }
  try { r = S.mergeImport(fresh(), text, ''); } catch (e) { return fail(i, 'restauration plante', e); }
  if (r.added !== uniq.length || r.skipped) fail(i, `restauration : ${r.added} lieux ajoutés, ${r.skipped} écartés, sur ${s1.points.length}`);
  const listIds = new Set((s1.lists ?? []).map((l) => l.id));
  const me = s1.me || '';
  const want = byId(uniq.map((p) => ({ ...p, lists: p.lists.filter((x) => listIds.has(x)), ...(me && p.owner === me ? { owner: '' } : {}) })));
  try { deepStrictEqual(byId(r.state.points), want); } catch (e) { fail(i, 'restauration : un lieu revient différent', e); }
  try { deepStrictEqual(r.state.categories, s1.categories); } catch (e) { fail(i, 'restauration : catégories différentes', e); }
  for (const k of ['lists', 'plans', 'artists', 'venues', 'outings', 'notes', 'routes', 'myCircuits', 'myStations', 'alertContacts', 'docs', 'busLines', 'circuitNotes', 'hiddenCircuits']) {
    if (!sameSet(r.state[k], s1[k])) fail(i, `restauration : « ${k} » différent (${(s1[k] ?? []).length} avant, ${(r.state[k] ?? []).length} après)`);
  }
  for (const k of ['home', 'crisisPoints', 'kit', 'artistLinks']) if (JSON.stringify(r.state[k] ?? null) !== JSON.stringify(s1[k] ?? null)) fail(i, `restauration : « ${k} » différent`);
  if (s1.words && JSON.stringify(r.state.words) !== JSON.stringify(s1.words)) fail(i, 'restauration : Mots tout prêts différents');
  if (s1.mySettings && JSON.stringify(r.state.mySettings?.settings) !== JSON.stringify(s1.mySettings.settings)) fail(i, 'restauration : réglages de référence différents');
  const set = r.settings ?? {};
  for (const [k, v] of Object.entries(S.cleanSettings(s1))) if (JSON.stringify(set[k]) !== JSON.stringify(v)) { fail(i, `restauration : réglage « ${k} » différent : ${JSON.stringify(v)?.slice(0, 80)} → ${JSON.stringify(set[k])?.slice(0, 80)}`); break; }
  // 3. restaurer deux fois n'ajoute rien
  try { const r2 = S.mergeImport(r.state, text, ''); if (r2.added || r2.already < uniq.length) fail(i, `deuxième restauration : ${r2.added} ajoutés, ${r2.already} déjà là`); } catch (e) { fail(i, 'deuxième restauration plante', e); }
  // 4. le fichier pour un proche
  try {
    const all = { lieux: true, notes: true, passages: true, photos: true, plans: true, artists: true, venues: true, ttb: true, circuits: true, words: true };
    const f = JSON.parse(JSON.stringify(S.exportForFriend(s1, all)));
    for (const k of ['home', 'alertContacts', 'crisisPoints', 'kit', 'docs', 'myStations', 'busLines', 'settings', 'mySettings', 'notes', 'routes']) if (k in f) fail(i, `fichier pour un proche : contient « ${k} »`);
    if (f.points.some((p) => 'fav' in p || 'done' in p || 'visited' in p || 'ticket' in p)) fail(i, 'fichier pour un proche : favori, déjà visité ou billet');
    const none = S.exportForFriend(s1, { ...S.SEND_DEFAULT, notes: false });
    if (none.points.some((p) => p.note || p.cafeNote || p.shopNote)) fail(i, 'fichier pour un proche sans commentaires : un commentaire part');
    const choice = { lieux: true, notes: true, passages: true, photos: true, cats: null, artists: new Set(f.artists ?? []), venues: new Set(f.venues ?? []), plans: new Set((f.plans ?? []).map((x) => x.id)), words: true };
    const g = S.mergeFriend(fresh(), f, 'Ami', choice);
    if (g.state.points.some((p) => p.owner && (p.fav || p.done || p.ticket))) fail(i, 'chez le proche : un favori, déjà visité ou billet arrive');
    if (g.added + g.dups + g.skipped < new Set(f.points.map((p) => p.id)).size) fail(i, `chez le proche : ${g.added} ajoutés, ${g.dups} doublons, ${g.skipped} écartés sur ${f.points.length}`);
    const g2 = S.mergeFriend(g.state, f, 'Ami', choice); if (g2.added) fail(i, `deuxième envoi au proche : ${g2.added} lieux ajoutés en double`);
  } catch (e) { fail(i, 'envoi à un proche plante', e); }
  // 5. le fichier de réglages
  try {
    const key = pick(['', 'abcdefgh1234', 'mauvaise clé!']);
    const file = S.readSettingsFile(S.exportSettingsJSON(s1, key));
    if (!file) throw new Error('relu comme vide');
    if (file.carto !== S.cleanCartoKey(key)) fail(i, 'fichier de réglages : clé CARTO différente');
    const a = S.applySettingsFile(fresh(), file).state;
    for (const [k, v] of Object.entries(S.cleanSettings(s1))) if (!S.SETTINGS_OWN.includes(k) && JSON.stringify(S.cleanSettings(a)[k]) !== JSON.stringify(v)) { fail(i, `fichier de réglages : « ${k} » différent : ${JSON.stringify(v)?.slice(0, 60)} → ${JSON.stringify(S.cleanSettings(a)[k])?.slice(0, 60)}`); break; }
    for (const k of S.SETTINGS_OWN) if (JSON.stringify(a[k]) !== JSON.stringify(fresh()[k])) fail(i, `fichier de réglages : « ${k} » passe d'un téléphone à l'autre`);
  } catch (e) { fail(i, 'fichier de réglages plante', e); }
  return s1;
}


test('sauvegarde, restauration, proche, réglages : 300 cas extrêmes sans défaut', () => {
  let n = 0;
  for (let i = 0; i < 257; i++, n++) checkState(i, randomObj());
  checkState(n++, randomObj(true)); // 2 000 lieux
// cas limites écrits à la main
  const hand = [
    {}, { points: [] }, { points: null }, { points: 'x' }, { categories: [] }, { categories: [{ id: 'a', name: 'A', color: '#ffffff' }], points: [{ id: 'p', name: 'P', cat: 'a', lat: 48.85, lng: 2.35 }] },
    { points: [{ id: 'p', name: 'P', cat: 'resto', lat: 90, lng: 180 }, { id: 'q', name: 'Q', cat: 'resto', lat: -90, lng: -180 }] },
    { points: [{ id: 'p', name: '   ', cat: 'resto', lat: 48.8, lng: 2.3 }] }, { points: [{ id: 'p', name: 'P', cat: 'resto', lat: '48.8', lng: 2.3 }] },
    { me: 'Anne', points: [{ id: 'p', name: 'P', cat: 'resto', lat: 48.8, lng: 2.3, owner: 'Anne' }] },
    { points: Array.from({ length: 3 }, (_, k) => ({ id: 'same', name: 'Doublon ' + k, cat: 'resto', lat: 48.8, lng: 2.3 })) },
    { __proto__: { points: [{ id: 'evil' }] } }, JSON.parse('{"__proto__":{"polluted":1},"points":[]}'),
  ];
  for (const o of hand) { checkState(n, o); n++; }
  // fichiers abîmés ou étrangers donnés à l'import
  const garbage = ['', ' ', 'null', '[]', '{}', '"texte"', '42', '{"app":"autre","points":[]}', '{"app":"carte-paris"}', '{"app":"carte-paris","points":{}}', '{"app":"carte-paris","points":[null,1,"x"]}',
    '{"app":"carte-paris","points":[],"categories":"x"}', '{"app":"carte-paris","points":[],"settings":"x"}', '{"app":"carte-paris","points":[],"settings":{"textSize":5,"rings":"x"}}',
    '{"app":"carte-paris","points":[],"mySettings":{"settings":null}}', '{"app":"carte-paris","points":[],"lists":[{"id":"a"}]}', '{"app":"carte-paris","points":[],"words":"x"}',
    '{"app":"carte-paris","points":[],"plans":[{"ticket":null}]}', '{"app":"carte-paris","points":[],"home":{"lat":"x"}}', '{"app":"carte-paris","points":[],"myCircuits":[{"id":"x","etapes":"y"}]}',
    '{"app":"carte-paris","kind":"reglages","settings":{}}', '{"app":"carte-paris","kind":"reglages","settings":[]}', '{"app":"carte-paris","kind":"reglages","settings":{"chipOrder":"x"},"categories":5}',
    '﻿{"app":"carte-paris","points":[]}', '{"app":"carte-paris","points":[]', 'PK\u0003\u0004', 'x'.repeat(1e6),
    JSON.stringify({ app: 'carte-paris', points: Array.from({ length: 20000 }, (_, k) => ({ id: 'p' + k, name: 'L' + k, cat: 'resto', lat: 48.8 + k * 1e-6, lng: 2.3 })) }),
    JSON.stringify({ app: 'carte-paris', kind: 'proche', points: [{ id: 'p', name: 'P', cat: 'resto', lat: 48.8, lng: 2.3, fav: true, done: true, ticket: { at: 1 } }] }),
  ];
  for (const t of garbage) {
    const i = n++;
    for (const [what, f] of [['restauration', () => S.mergeImport(fresh(), t, '')], ['import d\'un proche', () => S.mergeImport(fresh(), t, 'Ami')]]) {
      try { const r = f(); if (r.state.points.some((p) => p.owner && (p.fav || p.done))) fail(i, `${what} : favori d'un proche gardé`); }
      catch (e) { if (!(e instanceof Error) || e instanceof TypeError || e instanceof RangeError || !/fichier/i.test(e.message)) fail(i, `${what} d'un fichier abîmé : erreur brute`, e); }
    }
    try { S.readSettingsFile(t); S.fileOwner(t); } catch (e) { fail(i, 'lecture d\'un fichier de réglages abîmé plante', e); }
    try { let o; try { o = JSON.parse(t); } catch { o = null; } if (o && o.app === 'carte-paris' && Array.isArray(o.points)) S.mergeFriend(fresh(), o, 'Ami', { lieux: true, notes: true, cats: null }); }
    catch (e) { fail(i, 'proche : fichier abîmé, erreur brute', e); }
  }
  
  assert.equal(n, 300);
  assert.deepEqual(fails.slice(0, 5), [], `${fails.length} défauts`);
});
