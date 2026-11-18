// Garde-fou de la charte « Plaques & pavés » (voir CHARTE.md) : échoue si une modification s'en écarte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

/** Règles CSS les plus internes : [{ sel, body }] (les @media sont ouvertes). */
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].replace(/@media[^{]*$/, '').trim().replace(/\s+/g, ' '), body: m[2] }));
const decls = (r, prop) => [...r.body.matchAll(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'g'))].map((m) => m[1].trim());
const isTokens = (r) => r.sel === ':root' || r.sel === ':root[data-theme="dark"]';

// Ce qui est dessiné SUR la carte (épingles, tracés, cercles…) et les aperçus garde ses couleurs propres.
const MAP = /pin|line-|st-dot|st-name|st-line|me-dot|me-cone|ring-label|swatch|\.s-|\.arr|crosshair|viewer|qr-box|thumb|photo|cat-ico|step-|compass-arrow|\.chips|#map|leaflet|\.dot\b|knob|\.toast|\.sheet\b/;

test('charte : un seul bloc de jetons clair et un seul sombre, en tête', () => {
  assert.equal(rules.filter((r) => r.sel === ':root').length, 1, ':root doit être défini une seule fois');
  assert.equal(rules.filter((r) => r.sel === ':root[data-theme="dark"]').length, 1);
  assert.ok(css.trimStart().startsWith(':root'), 'les jetons doivent être en tête du fichier');
});

test('charte : aucune couleur écrite en dur dans une règle d\'interface', () => {
  const bad = [];
  for (const r of rules) {
    if (isTokens(r) || MAP.test(r.sel)) continue;
    for (const m of r.body.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) bad.push(`${r.sel} → ${m[0]}`);
  }
  assert.deepEqual(bad, [], `Utilise un jeton (CHARTE.md §2) :\n${bad.join('\n')}`);
});

test('charte : un seul rayon (4 px), rond pour les pastilles', () => {
  const KEEP = /^(\.sheet|\.pin|\.line-badge|\.line-tag|\.st-line|\.hbar)\b/;
  const ok = /^(var\(--r\)|50%|999px|0)( (var\(--r\)|0))*$/;
  const bad = [];
  for (const r of rules) for (const v of decls(r, 'border(?:-top|-bottom)?(?:-left|-right)?-radius')) if (!KEEP.test(r.sel) && !ok.test(v)) bad.push(`${r.sel} → ${v}`);
  assert.deepEqual(bad, [], `Rayon hors charte (CHARTE.md §3) :\n${bad.join('\n')}`);
});

test('charte : tailles de texte dans l\'échelle 11,5 · 13 · 14 · 15 · 16 · 18 · 22 · 26', () => {
  // v144 : les jetons --t115… valent l'échelle multipliée par --ts (Taille du texte)
  const SCALE = new Set(['11.5px', '13px', '14px', '15px', '16px', '18px', '22px', '26px', 'inherit', '1em', ...['115', '13', '14', '15', '16', '18', '22', '26'].map((n) => `var(--t${n})`)]);
  const ICON_OR_MAP = /(pin|ico\b|-ico|chev|close(?!d)|plus\b|icon|star-pick|thumb|swatch|metro-btn|go-compass|tool-ico|line-|st-|ring-label|stats-tick|attribution|compass-(name|dist|arrow)|plan-ico|::after|arr\b|step-|metro-mini|metro-pin|pr-|paris-btn|cat-ico|stars-ro|tool-prev)/;
  const bad = [];
  for (const r of rules) for (const v of decls(r, 'font-size')) if (!ICON_OR_MAP.test(r.sel) && !SCALE.has(v)) bad.push(`${r.sel} → ${v}`);
  assert.deepEqual(bad, [], `Taille de texte hors échelle (CHARTE.md §5) :\n${bad.join('\n')}`);
});

test('charte : chaque jeton de taille vaut l\'échelle × --ts, et seuls 3 réglages existent', () => {
  const root = rules.find((r) => r.sel === ':root').body;
  for (const [n, px] of [['115', '11.5'], ['13', '13'], ['14', '14'], ['15', '15'], ['16', '16'], ['18', '18'], ['22', '22'], ['26', '26']]) {
    assert.ok(new RegExp(`--t${n}:\\s*calc\\(${px.replace('.', '\\.')}px \\* var\\(--ts\\)\\)`).test(root), `--t${n}`);
  }
  const sizes = rules.filter((r) => /^:root\[data-text=/.test(r.sel)).map((r) => `${r.sel} ${decls(r, '--ts')[0]}`);
  assert.deepEqual(sizes, [':root[data-text="grand"] 1.15', ':root[data-text="tresgrand"] 1.3']);
});

test('charte : icônes Lucide seulement dans les boutons (pas d\'emoji ni de symbole)', () => {
  const FORBIDDEN = ['⬇', '⬆', '✉', '🚇', '↻', '🔎', '👤', '📍\'), whereText', '🔊', '🔇', '🚶'];
  const found = FORBIDDEN.filter((c) => app.includes(c));
  assert.deepEqual(found, [], `Remplace par ico('…') (CHARTE.md §7) : ${found.join(' ')}`);
  // libellés de boutons : seul « ← » est permis en tête
  const labels = [...app.matchAll(/el\('(?:button|a)', \{[^}]*\}, '([^']{1,40})'\)/g)].map((m) => m[1]);
  const bad = labels.filter((t) => /^[^\p{L}\p{N}«(←]/u.test(t));
  assert.deepEqual(bad, [], `Libellé qui commence par un symbole : ${bad.join(' | ')}`);
});

test('charte : jamais « ← Retour » sans destination', () => {
  assert.ok(!/'←\s*Retour'/.test(app), 'Écris « ← Nom de l\'écran d\'avant » (CHARTE.md §8)');
});

test('aide : 10 nouveautés au plus (les plus anciennes restent dans l\'historique du dépôt)', () => {
  const block = app.slice(app.indexOf("['sparkles', 'Nouveautés', ["), app.indexOf(']],', app.indexOf("['sparkles', 'Nouveautés', [")));
  const n = block.split('\n').filter((l) => l.startsWith("    '")).length;
  assert.ok(n > 0 && n <= 10, `${n} nouveautés : garde les 10 dernières`);
});

test('charte : aucun emoji écrit dans un bouton ou un lien (Ⓜ seul permis, pour nommer une station)', () => {
  const bad = app.split('\n').filter((l) => /el\('(?:button|a)'/.test(l) && /\p{Extended_Pictographic}/u.test(l.replace(/Ⓜ/g, '')));
  assert.deepEqual(bad.map((l) => l.trim().slice(0, 90)), [], 'Remplace l\'emoji par ico(\'…\') (CHARTE.md §7)');
});

test('charte « Papier » : 4 px, aucune ombre « pavé », pas de fond teinté au repos, contours jamais en filet', () => {
  assert.match(css, /--r:\s*4px/, 'le rayon unique est 4 px');
  assert.ok(!/--r-s|--pave|--plaque-line/.test(css), 'jetons de l\'ancienne charte encore présents');
  const CTRL = /\.(btn|map-btn|chip|tool|big-btn|icon-btn|go-compass)(?![\w-])|\.seg button/;
  const bad = [];
  for (const r of rules) {
    if (!CTRL.test(r.sel) || /aria-pressed|:active|\.on\b|\.solid|\.primary|focus/.test(r.sel)) continue;
    for (const v of decls(r, 'background(?:-color)?')) if (/--[a-z]+-bg\)/.test(v)) bad.push(`${r.sel} → fond ${v}`);
    for (const v of decls(r, 'border(?:-color)?')) if (/var\(--line\)/.test(v) && !/disabled/.test(r.sel)) bad.push(`${r.sel} → contour ${v}`);
  }
  assert.deepEqual(bad, [], `Charte « Papier » (CHARTE.md) :\n${bad.join('\n')}`);
});

test('charte : jamais d\'opacité sur un texte de l\'interface (une couleur atténuée à la place)', () => {
  const TEXT = /\.(btn|compass-(label|hint|walk|step)|help|item-sub|menu-sub|fiche-|now-)/;
  const bad = rules.filter((r) => TEXT.test(r.sel) && decls(r, 'opacity').length).map((r) => r.sel);
  assert.deepEqual(bad, [], `Remplace l'opacité par var(--muted) : ${bad.join(' | ')}`);
});

test('charte : dans une barre du bas, le retour « ← … » est toujours le dernier bouton (v185)', () => {
  const bad = [...app.matchAll(/foot\((el\('button'[^\n]*?'← [^']*'\)|backBtn\([^\n]*?\)), *(el|ico)\(/g)].map((m) => m[0].slice(0, 80));
  assert.deepEqual(bad, [], `Mets le bouton de retour en dernier dans foot(...) :\n${bad.join('\n')}`);
});
