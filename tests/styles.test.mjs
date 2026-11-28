// v452 (mes choix 1B 2A 3A 4A du 25 nov.) : styles de l'appli. Le jour : Papier (CHARTE.md) ou Verre (CHARTE.md § 10.1) ;
// le soir, le mode sombre est toujours Signalétique (§ 10.2). Une charte et des tests pour chaque style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanLook, LOOKS, loadState, saveState, cleanSettings, exportJSON, exportSettingsJSON, readSettingsFile } from '../js/store.js';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] }));
const block = (sel) => Object.fromEntries([...rules.find((r) => r.sel === sel).body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const PAPIER = block(':root');
const STYLES = { papier: PAPIER, verre: { ...PAPIER, ...block(':root[data-look="verre"]') }, signal: { ...PAPIER, ...block(':root[data-theme="dark"]') }, pop: { ...PAPIER, ...block(':root[data-look="pop"]') } }; // v464 : Pop

const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
/** Les sélecteurs d'une liste, sans couper dans :is( … ) ni :not( … ). */
const topLevel = (sel) => { const out = []; let depth = 0; let cur = ''; for (const ch of sel) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
const hex = (v) => (/^#[0-9A-Fa-f]{6}$/.test(v) ? v : null);

test('chaque style : les textes lisibles sur la feuille, le papier et le kraft (4,5:1), les étoiles et les contours de champ (3:1)', () => {
  const bad = [];
  for (const [name, t] of Object.entries(STYLES)) {
    for (const fond of ['--bg', '--surface', '--soft'].map((k) => hex(t[k])).filter(Boolean)) {
      for (const k of ['--ink', '--muted', '--disc', '--add', '--metro', '--danger', '--fav', '--info']) if (ratio(t[k], fond) < 4.5) bad.push(`${name} ${k} sur ${fond} : ${ratio(t[k], fond).toFixed(2)}`);
      for (const k of ['--fav-icon', '--field']) if (ratio(t[k], fond) < 3) bad.push(`${name} ${k} sur ${fond} : ${ratio(t[k], fond).toFixed(2)}`);
    }
    for (const fond of ['--info-bg', '--add-bg', '--fav-bg']) if (ratio(t['--ink'], t[fond]) < 4.5) bad.push(`${name} encre sur ${fond}`);
    for (const k of ['--strong', '--guide']) if (ratio(t['--on-strong'], t[k]) < 4.5) bad.push(`${name} texte de plaque sur ${k} : ${ratio(t['--on-strong'], t[k]).toFixed(2)}`);
  }
  assert.deepEqual(bad, []);
});

test('Verre : le texte blanc de la plaque en dégradé se lit sur ses deux couleurs ; Signalétique : plaques jaunes, texte presque noir', () => {
  const ends = STYLES.verre['--plaque-img'].match(/#[0-9A-Fa-f]{6}/g);
  assert.equal(ends.length, 2);
  for (const c of ends) assert.ok(ratio('#FFFFFF', c) >= 4.5, c);
  assert.equal(STYLES.verre['--on-strong'], '#FFFFFF');
  assert.equal(STYLES.signal['--strong'], '#FFD23F');
  assert.equal(STYLES.signal['--guide'], '#FFD23F');
  assert.ok(ratio(STYLES.signal['--on-strong'], '#FFD23F') >= 10);
});

test('les règles d\'un style ne valent que pour lui, et Verre ne touche que l\'appli posée sur la carte', () => {
  for (const r of rules) {
    for (const k of ['verre', 'pop']) if (r.sel.includes(`data-look="${k}"`)) assert.ok(topLevel(r.sel).every((s) => s.startsWith(`:root[data-look="${k}"]`) || s.startsWith(':root:is([data-')), r.sel); // v467 : :root:is([data-look=…], …) pour plusieurs styles à la fois
  }
  const verre = rules.filter((r) => r.sel.startsWith(':root[data-look="verre"] ')).map((r) => r.sel).join('\n');
  assert.ok(!/\.compass\b|viewer/.test(verre), 'la boussole et la photo en grand gardent leur aspect');
  assert.match(verre, /:is\(\.top, \.map-tools, \.bottom, \.sheet, \.peek-card, \.now-card\) :is\(\.btn/);
  // un choix allumé, une plaque, un bouton inactif gardent leur aspect
  assert.match(verre, /:not\(\.solid\):not\(\.primary\):not\(\[aria-pressed="true"\]\):not\(\.on\):not\(:disabled\)/);
  // le flou seulement sur ce qui flotte sur la carte et la feuille (le flou coûte : pas sur chaque bouton de la feuille)
  const blur = rules.filter((r) => /backdrop-filter/.test(r.body)).map((r) => r.sel);
  assert.deepEqual(blur, [':root[data-look="verre"] :is(.top .chip, .map-btn, .big-btn, .peek-card, .now-card)', ':root[data-look="verre"] .sheet']);
});

test('les tailles ne changent pas d\'un style à l\'autre : mêmes hauteurs de bouton, même échelle de texte', () => {
  for (const [name, t] of Object.entries(STYLES)) for (const k of ['--h', '--h-s', '--h-l', '--t16', '--ts']) assert.equal(t[k], PAPIER[k], `${name} ${k}`);
  // v467 : seule exception, le dessin des icônes de ligne de Sorties (disque, anneau, case de 36 px dans leur colonne de 36 px)
  for (const r of rules) if (/^:root(\[data-(look|theme)="[a-z]+"\] |:is\(\[data-(look|theme))/.test(r.sel) && !/\.genre[^,]*(\.ico|svg)\s*$/.test(r.sel)) {
    assert.ok(!/(^|;)\s*(min-height|height|width|font-size)\s*:/.test(r.body), `${r.sel} : un style ne change pas les tailles`);
  }
});

test('le réglage : Papier au départ, les quatre styles gardés, une valeur inconnue redevient Papier', () => {
  assert.deepEqual(LOOKS, ['papier', 'verre', 'signal', 'pop']); // v464 (mon choix A) : les quatre au choix
  for (const v of LOOKS) assert.equal(cleanLook(v), v);
  for (const v of [undefined, null, '', 'gazette', 'VERRE', 3]) assert.equal(cleanLook(v), 'papier');
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(loadState(storage).look, 'papier');
  const st = { ...loadState(storage), look: 'verre' };
  saveState(storage, st);
  assert.equal(loadState(storage).look, 'verre', 'gardé après un rechargement');
});

test('le style suit la sauvegarde, mes réglages de référence et le fichier de réglages', () => {
  const st = { ...loadState({ getItem: () => null, setItem() {} }), look: 'verre' };
  assert.equal(cleanSettings(st).look, 'verre');
  assert.equal(JSON.parse(exportJSON(st)).settings.look, 'verre');
  const file = readSettingsFile(exportSettingsJSON(st));
  assert.equal(file.settings.look, 'verre');
  assert.equal(cleanSettings({ look: 'gazette' }).look, 'papier');
  assert.equal(cleanSettings({ look: 'pop' }).look, 'pop');
});

test('l\'appli : data-look porte le style affiché, Signalétique dès que le mode sombre est là', () => {
  assert.match(app, /const lookNow = \(\) => \(isDark\(\) \? 'signal' : cleanLook\(state\.look\)\);/);
  // v464 : Signalétique choisi le jour s'affiche en sombre (jetons, fond de carte, traits de la carte)
  assert.match(app, /const shownDark = \(\) => lookNow\(\) === 'signal';/);
  assert.match(app, /dataset\.theme = shownDark\(\) \? 'dark' : 'light'/);
  assert.match(app, /const ink = \(\) => \(shownDark\(\)/);
  assert.match(app, /document\.documentElement\.dataset\.look = lookNow\(\);/);
  // applyAllSettings (restauration, réglages de référence) passe par applyTheme
  assert.match(app, /function applyAllSettings\(\) \{[^\n]*applyTheme\(\)/);
});

test('Réglages → Apparence (1A du 25 nov.) : à la place de Mode sombre ; Le jour (Papier, Verre) puis Clair ou sombre ; plus dans Autres réglages', () => {
  const autres = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  assert.ok(!autres.includes("'Style de l\\'appli'"), 'plus dans Autres réglages');
  const main = app.slice(app.indexOf("openSheet([ico('settings'), ' Réglages'"), app.indexOf("), { name: 'settings', again: () => openSettings(), tall: true });"));
  const t = main.indexOf("'TTB'"); const a = main.indexOf("row('sun', 'Apparence', appearanceSub(), () => openSettings('apparence')"); const c = main.indexOf("'ring-title menu-group' }, 'Ce qui s\\'affiche')");
  assert.ok(t > 0 && a > t && c > a, 'même place que Mode sombre : après TTB, avant « Ce qui s\'affiche »');
  assert.ok(!main.slice(a, c).includes("'Comme le téléphone'"), 'plus de ligne qui apparaît et pousse la suite');
  const page = app.slice(app.indexOf("if (section === 'apparence') {"), app.indexOf("if (section === 'vu') {"));
  assert.ok(page.indexOf("'Le jour'") < page.indexOf("'Clair ou sombre'"));
  assert.match(page, /LOOKS\.map/);
  for (const k of ['light', 'dark', 'auto']) assert.match(page, new RegExp(`chooseTheme\\('${k}'\\)`));
  assert.match(page, /Signalétique/);
  assert.match(page, /backBtn,\n\s*\), \{ tall: true, name: 'settings:apparence'/);
  assert.match(app, /if \(section === 'look'\) section = 'apparence';/, 'l\'ancien nom mène à la page');
  assert.match(app, /const OTHER_SECTIONS = \[[^\]]*'ouverture', 'pastille', 'astuces', 'sorties'\];/, 'Apparence revient à Réglages');
  assert.ok(!/const OTHER_SECTIONS = \[[^\]]*'apparence'/.test(app), 'Apparence pas dans Autres réglages');
});

test('v464 : Pop, plaque rose à texte encre, aplats des familles lisibles, seulement sur l\'appli posée sur la carte', () => {
  const t = STYLES.pop;
  const rose = t['--plaque-img'].match(/#[0-9A-Fa-f]{6}/g);
  for (const c of rose) assert.ok(ratio(t['--plaque-ink'], c) >= 4.5, c);
  for (const k of ['--pop-yellow', '--pop-metro', '--pop-add', '--pop-disc']) assert.ok(ratio(t['--ink'], t[k]) >= 4.5, k);
  const pop = rules.filter((r) => r.sel.startsWith(':root[data-look="pop"] ')).map((r) => r.sel).join('\n');
  assert.ok(!/\.compass\b|viewer/.test(pop));
  assert.match(pop, /:is\(\.top, \.map-tools, \.bottom, \.sheet, \.peek-card, \.now-card\) :is\(\.btn/);
  const look = app.slice(app.indexOf("if (section === 'apparence') {"), app.indexOf("if (section === 'vu') {"));
  for (const k of ['papier', 'verre', 'signal', 'pop']) assert.match(look, new RegExp(`${k}: '`));
});

