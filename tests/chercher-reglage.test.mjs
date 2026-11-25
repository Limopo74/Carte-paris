// Chercher un réglage (ma demande du 25 nov. 2026) : la loupe du titre de Réglages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const start = app.indexOf('const SETTINGS_FIND = [');
const end = app.indexOf('];', start);
const block = app.slice(start, end);
const rest = app.slice(0, start) + app.slice(end);
const entries = [...block.matchAll(/^\s*\['([a-z0-9-]+)', '((?:[^'\\]|\\.)*)', ([^,]+), '([^']*)', (\([^)]*\)) => ([^\]]+)\],$/gm)]
  .map(([, icon, title, path, kw, args, open]) => ({ icon, title: title.replace(/\\'/g, '\''), path, kw, args, open }));
const icons = new Set([...readFileSync(new URL('../js/icons.js', import.meta.url), 'utf8').matchAll(/^"([a-z0-9-]+)":/gm)].map((m) => m[1]));
const sections = new Set([...app.matchAll(/section === '([a-z]+)'/g)].map((m) => m[1]));

test('l\'index a toutes ses lignes lues (aucune mal écrite)', () => {
  const lines = block.split('\n').filter((l) => l.trim().startsWith("['"));
  assert.equal(entries.length, lines.length);
  assert.ok(entries.length >= 45);
});

test('chaque ligne : une icône qui existe, un nom écrit ailleurs dans l\'appli, une page qui existe, un chemin sans nom de groupe', () => {
  for (const e of entries) {
    assert.ok(icons.has(e.icon), `${e.title} : icône ${e.icon}`);
    const esc = e.title.replace(/'/g, "\\'");
    assert.ok(rest.includes(`'${esc}'`) || rest.includes(`'${esc}`) || rest.includes(esc), `${e.title} : le nom est sur sa page`);
    for (const m of e.open.matchAll(/openSettings\('([a-z]+)'/g)) assert.ok(sections.has(m[1]), `${e.title} : page ${m[1]}`);
    assert.ok(!/Mes lieux|La carte|Ce qui s'affiche|Mes données|Appli'/.test(e.path), `${e.title} : chemin sans groupe`);
    assert.equal(e.kw, e.kw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), `${e.title} : mots sans accent`);
  }
});

test('une page qui sait revenir reçoit le retour vers la recherche', () => {
  for (const e of entries) {
    if (/openSettings\('(?!autres)[a-z]+'/.test(e.open) || /openTtb|openFilterChoice|openVenuePhotos|openSeenPhotos|openWordSeries/.test(e.open)) assert.equal(e.args, '(b)', e.title);
  }
});

test('les réglages qu\'on cherche le plus sont trouvés (noms des pages et des lignes)', () => {
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const find = (q) => entries.filter((e) => fold(q).split(/\s+/).every((w) => fold(`${e.title} ${e.kw} ${e.path.split(' → ').pop()}`).includes(w))).map((e) => e.title);
  assert.ok(find('voix').includes('Voix'));
  assert.ok(find('gouttes').includes('Gouttes de mes lieux sur la carte'));
  assert.ok(find('navigo').includes('J\'ai un passe Navigo'));
  assert.ok(find('sombre').includes('Apparence') && find('sombre').includes('Clair ou sombre')); // 1A
  assert.ok(find('uber').includes('Fiche d\'un lieu'));
  assert.ok(find('vitesse').includes('Mon pas'));
  assert.ok(find('gaucher').includes('Boutons de la carte'));
  assert.ok(find('Écrire').length > 0, 'accents ignorés');
  assert.deepEqual(find('zzz'), []);
});

test('la loupe : dans le titre de Réglages, après ⋯ (rien ne bouge), zone d\'appui de 44 px, retour « ← Réglages »', () => {
  const t = app.slice(app.indexOf("openSheet([ico('settings'), ' Réglages'"), app.indexOf("el('div', { class: 'menu' }, /* v342"));
  const dots = t.indexOf("'aria-label': 'Autres réglages'"); const loupe = t.indexOf("'aria-label': 'Chercher un réglage'");
  assert.ok(dots > 0 && loupe > dots);
  assert.match(t.slice(loupe - 80, loupe), /class: 'title-maj'/);
  const page = app.slice(app.indexOf('function openSettingsSearch('), app.indexOf("name: 'settings:chercher'"));
  assert.match(page, /foot\(el\('button', \{ type: 'button', class: 'btn', onclick: \(\) => openSettings\(\) \}, '← Réglages'\)\)/);
  assert.match(page, /Aucun réglage pour « \$\{v\} »/);
});
