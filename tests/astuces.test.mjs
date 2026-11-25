// Astuces au démarrage (v512, claude/idee-astuces.md) : une par jour au plus, jamais une fonction déjà touchée, plafond réglable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TIPS, readTips, tipUsed, pickTip, markTip } from '../js/astuces.js';
import { emptyUsage, noteUsed, noteOpen, cleanLabel } from '../js/usage.js';
import { cleanTuning, TUNING } from '../js/reglages.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const icons = new Set([...readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8').matchAll(/^"([a-z0-9-]+)":/gm)].map((m) => m[1]));
const T0 = new Date(2026, 10, 25, 9, 0).getTime();
const DAY = 864e5;

test('20 astuces, chacune avec une icône qui existe, un titre et une petite ligne courts, un endroit où la montrer', () => {
  assert.equal(TIPS.length, 20);
  assert.equal(new Set(TIPS.map((t) => t.id)).size, 20);
  for (const t of TIPS) {
    assert.ok(icons.has(t.icon), `${t.id} : icône ${t.icon}`);
    assert.ok(t.title.length <= 22, `${t.id} : titre court`);
    assert.ok(t.sub.length <= 40, `${t.id} : petite ligne courte (${t.sub.length})`);
    const g = t.go;
    assert.equal([g.tool, g.chip, g.open, g.el].filter(Boolean).length, 1, `${t.id} : un seul endroit`);
    if (g.open) assert.ok(g.find, `${t.id} : la ligne à entourer`);
    if (g.tool) assert.match(app, new RegExp(`^\\s+${g.tool}: \\{ el: '`, 'm'), `${t.id} : bouton de la colonne`);
    if (g.el) assert.match(html, new RegExp(`id="${g.el}"`), `${t.id} : bouton de la carte`);
    for (const u of t.used) assert.ok(cleanLabel(u), `${t.id} : « ${u} » se compte dans Ce que j'utilise`);
    assert.ok(t.used.length || t.screens?.length || t.id === 'crue', `${t.id} : sait si la fonction sert déjà`); // Zones inondables : nom de bouton trop long pour être compté
  }
  assert.ok(!TIPS.some((t) => /démarrage d'un proche/i.test(t.title)), 'pas « Préparer le démarrage d\'un proche » (mon choix 3A)');
});

test('les lignes à entourer existent dans l\'appli', () => {
  for (const t of TIPS.filter((x) => x.go.find)) assert.ok(app.includes(`'${t.go.find.replace(/'/g, "\\'")}'`), `${t.id} : « ${t.go.find} »`);
});

test('réglage : 0 à 40 par 5, 20 au départ ; 0 éteint tout', () => {
  assert.deepEqual({ ...TUNING.tipsMax }, { def: 20, min: 0, max: 40, step: 5, unit: 'astuces' });
  assert.equal(cleanTuning({}).tipsMax, 20);
  assert.equal(cleanTuning({ tipsMax: 0 }).tipsMax, 0);
  assert.equal(cleanTuning({ tipsMax: 7 }).tipsMax, 20, 'entre deux crans : valeur de départ');
  assert.equal(pickTip(null, emptyUsage(), 0, T0), null);
});

test('une par jour au plus, jamais deux fois la même, dans l\'ordre de la liste', () => {
  const u = emptyUsage();
  const a = pickTip(null, u, 20, T0);
  assert.equal(a.tip.id, TIPS[0].id); assert.equal(a.n, 1); assert.equal(a.total, 20);
  let p = markTip(null, a.tip.id, T0);
  assert.equal(pickTip(p, u, 20, T0 + 3600e3), null, 'le même jour : rien');
  assert.equal(pickTip(p, u, 20, new Date(2026, 10, 25, 23, 59).getTime()), null, 'jusqu\'à minuit');
  const b = pickTip(p, u, 20, T0 + DAY);
  assert.equal(b.tip.id, TIPS[1].id); assert.equal(b.n, 2);
  p = markTip(p, b.tip.id, T0 + DAY);
  assert.deepEqual(p.seen, [TIPS[0].id, TIPS[1].id]);
});

test('une fonction déjà touchée (Ce que j\'utilise) ne sort pas, et le total le dit', () => {
  const u = emptyUsage();
  noteUsed(u, 'carte', 'Note du jour (sans lieu)'); // le nom du bouton de la colonne ne compte pas…
  assert.equal(tipUsed(TIPS[0], u), false);
  noteUsed(u, 'carte', 'Note du jour');
  assert.equal(tipUsed(TIPS[0], u), true);
  noteUsed(u, 'myparis', 'Mes chiffres · Marche, air et lieux');
  const r = pickTip(null, u, 40, T0);
  assert.equal(r.tip.id, TIPS[1].id);
  assert.equal(r.total, 18, '20 moins les 2 déjà touchées');
  const meteo = TIPS.find((t) => t.id === 'meteo');
  assert.equal(tipUsed(meteo, u), false);
  noteOpen(u, 'meteo'); assert.equal(tipUsed(meteo, u), true, 'la page Météo et air déjà ouverte');
});

test('vu mais jamais touché : l\'astuce sort ; « Ce que j\'utilise » éteint : on ne sait pas, elles sortent toutes', () => {
  const u = emptyUsage();
  u.b.carte = { 'Note du jour': [12, 0] };
  assert.equal(tipUsed(TIPS[0], u), false);
  const off = { ...emptyUsage(), off: true, b: { carte: { 'Note du jour': [3, 3] } } };
  assert.equal(tipUsed(TIPS[0], off), false);
});

test('plafond : le réglage arrête les astuces ; le total ne dépasse jamais le réglage', () => {
  let p = null; let t = T0;
  for (let i = 0; i < 5; i += 1) { const r = pickTip(p, null, 5, t); assert.equal(r.n, i + 1); assert.equal(r.total, 5); p = markTip(p, r.tip.id, t); t += DAY; }
  assert.equal(pickTip(p, null, 5, t), null);
  assert.equal(pickTip(p, null, 10, t).n, 6, 'réglage remonté : elles reprennent');
});

test('une astuce impossible sur ce téléphone est sautée sans être marquée vue', () => {
  const r = pickTip(null, null, 20, T0, (x) => x.id !== 'notes');
  assert.equal(r.tip.id, TIPS[1].id); assert.equal(r.total, 19);
  assert.equal(pickTip(null, null, 20, T0, () => false), null);
});

test('mémoire abîmée ou ancienne : rien de vu ; une astuce retirée de la liste est oubliée', () => {
  assert.deepEqual(readTips('pas du json'), { seen: [], day: '' });
  assert.deepEqual(readTips({ seen: ['notes', 'notes', 'inconnue', 3], day: 'hier' }), { seen: ['notes'], day: '' });
});

test('branchement : carte à part de « Maintenant », jamais en même temps, sous elle dans la page ; Montre-moi entoure le vrai bouton', () => {
  assert.ok(html.indexOf('id="nowCard"') < html.indexOf('id="tipCard"'));
  assert.match(css, /#nowCard:not\(\[hidden\]\) ~ #tipCard \{ display: none; \}/);
  assert.match(css, /prefers-reduced-motion: no-preference\) \{ \.tip-ring \{ animation/);
  assert.match(app, /if \(ESSAI \|\| crisis \|\| !firstDone\(\) \|\| !state\.ok \|\| !sheet\.hidden/, 'jamais en essai, en mode crise, au premier lancement, par-dessus un écran');
  assert.match(app, /if \(!launched && !departCode\) setTimeout\(showTip, 5000\)/, 'pas par-dessus un lien reçu');
  assert.match(app, /saveTips\(markTip\(progress, tip\.id\)\); \/\/ vue dès qu'elle s'affiche/);
  assert.match(sw, /'js\/astuces\.js'/, 'gardé hors ligne');
  assert.ok(!/TIPS_KEY/.test(readFileSync(new URL('../js/store.js', import.meta.url), 'utf8')), 'hors sauvegarde');
});
