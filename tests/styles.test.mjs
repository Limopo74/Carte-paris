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
const STYLES = { papier: PAPIER, verre: { ...PAPIER, ...block(':root[data-look="verre"]') }, signal: { ...PAPIER, ...block(':root[data-theme="dark"]') } };

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
    if (/data-look="verre"/.test(r.sel)) assert.ok(topLevel(r.sel).every((s) => s.startsWith(':root[data-look="verre"]')), r.sel);
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
  for (const r of rules) if (/data-(look|theme)=/.test(r.sel) && /^:root\[data-(look|theme)="[a-z]+"\] /.test(r.sel)) {
    assert.ok(!/(^|;)\s*(min-height|height|width|font-size)\s*:/.test(r.body), `${r.sel} : un style ne change pas les tailles`);
  }
});

test('le réglage : Papier au départ, Verre gardé, une valeur inconnue redevient Papier', () => {
  assert.deepEqual(LOOKS, ['papier', 'verre']);
  assert.equal(cleanLook('verre'), 'verre');
  for (const v of [undefined, null, '', 'signal', 'VERRE', 3]) assert.equal(cleanLook(v), 'papier');
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
  assert.equal(cleanSettings({ look: 'pop' }).look, 'papier');
});

test('l\'appli : data-look porte le style affiché, Signalétique dès que le mode sombre est là', () => {
  assert.match(app, /const lookNow = \(\) => \(isDark\(\) \? 'signal' : cleanLook\(state\.look\)\);/);
  assert.match(app, /document\.documentElement\.dataset\.look = lookNow\(\);/);
  // applyAllSettings (restauration, réglages de référence) passe par applyTheme
  assert.match(app, /function applyAllSettings\(\) \{[^\n]*applyTheme\(\)/);
});

test('Réglages → Autres réglages → Style de l\'appli : tout en bas de « Ce qui s\'affiche », une page à deux choix', () => {
  const page = app.slice(app.indexOf("if (section === 'autres') {"), app.indexOf("), { name: 'settings:autres'"));
  const a = page.indexOf("onOff('compassOn'");
  const b = page.indexOf("row('palette', 'Style de l\\'appli'");
  const c = page.indexOf("'ring-title menu-group' }, 'Appli')");
  assert.ok(a > 0 && b > a && c > b);
  assert.ok(!page.slice(b + 10, c).includes('row(') && !page.slice(b, c).includes('onOff('), 'la dernière ligne du groupe');
  const look = app.slice(app.indexOf("if (section === 'look') {"), app.indexOf("if (section === 'vu') {"));
  assert.match(look, /role: 'radiogroup'/);
  assert.match(look, /LOOKS\.map/);
  assert.match(look, /Signalétique/);
  assert.match(look, /backBtn/);
  assert.match(app, /const OTHER_SECTIONS = \[[^\]]*'look'\]/);
});
