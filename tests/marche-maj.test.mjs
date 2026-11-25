// v522 (mes choix A et A du 25 nov.) : bloc Marche de Mise à jour et confidentialité — le vrai nom du bouton, un bouton « Mes chiffres »
// qui ramène là d'où l'on vient ; l'Aide parle de la marche et lance le robot depuis cette page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { helpWithoutCompass } from '../js/reglages.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const page = app.slice(app.indexOf("if (section === 'appli') {"), app.indexOf("name: 'settings:appli'"));
const lines = [...app.matchAll(/^ {4}'(.*)',$/gm)].map((m) => m[1].replace(/\\'/g, '\''));

test('Marche : « Ma position et direction », plus « le suivi en direct », et le bouton Mes chiffres juste sous la phrase', () => {
  assert.ok(!page.includes('suivi en direct'));
  const a = page.indexOf('Compté seulement avec Ma position et direction');
  const b = page.indexOf("ico('timer'), 'Mes chiffres')");
  const c = page.indexOf('podomètre');
  assert.ok(a > 0 && b > a && c > b, 'phrase, bouton, puis la ligne du podomètre');
  assert.match(page, /openMyStats\(named\('Mise à jour et confidentialité', \(\) => openSettings\('appli'\)\)\)/);
});

test('Mes chiffres : « ← » ramène là d\'où l\'on vient (Mon Paris ou Mise à jour et confidentialité)', () => {
  assert.match(app, /function openMyStats\(back\) \{\n {2}if \(back\) statsBack = back;/);
  assert.match(app, /foot\(backBtn\(statsBack \?\? toMyParis\)\)/);
  assert.match(app, /'Mes chiffres', 'Marche, air et lieux', \(\) => openMyStats\(toMyParis\)\)/);
  assert.ok(!app.includes('ou une balade guidée ;'));
});

test('Aide : une ligne sur la marche, et le robot se lance depuis Mise à jour et confidentialité', () => {
  assert.ok(lines.some((l) => l.startsWith('{footprints} **Ta marche**') && l.includes('70 cm')));
  assert.ok(!lines.some((l) => l.includes('Lancer le robot maintenant')), 'plus le détour par Données de l\'appli');
  assert.equal(lines.filter((l) => l.includes('Mise à jour et confidentialité → Lancer le robot (GitHub)')).length, 2);
  const off = helpWithoutCompass(lines).find((l) => l.startsWith('{footprints} **Ta marche**'));
  assert.ok(off && !off.includes('oussole'), 'boussole éteinte : la ligne ne la cite plus');
});

// v528 : chaque ligne de Réglages et d'Autres réglages est citée dans l'Aide (avant : 7 n'y étaient pas, dont Photos des salles,
// À mettre à jour sur place, Préparer le démarrage d'un proche) ; « Position refusée » donne aussi le chemin de l'appli installée.
test('Aide : chaque ligne de Réglages et d\'Autres réglages y est citée', () => {
  const s = app.replace(/\\'/g, '\'');
  const help = s.slice(s.indexOf('const HELP = ['), s.indexOf('\n];', s.indexOf('const HELP = [')));
  const autres = s.slice(s.indexOf("if (section === 'autres') {"), s.indexOf("), { name: 'settings:autres'"));
  const main = s.slice(s.indexOf("openSheet([ico('settings'), ' Réglages'"), s.indexOf("), { name: 'settings', again: () => openSettings(), tall: true });"));
  const titles = [...[...autres.matchAll(/row\('[^']*', '([^']+)'/g)], ...[...autres.matchAll(/onOff\('[^']*', '[^']*', '([^']+)'/g)], ...[...main.matchAll(/row\('[^']*', '([^']+)'/g)]].map((m) => m[1]);
  assert.ok(titles.length > 30, String(titles.length));
  const missing = titles.filter((t) => !help.toLowerCase().includes(t.toLowerCase()) && !t.startsWith('Aide de l'));
  assert.deepEqual(missing, []);
  assert.ok(lines.some((l) => l.startsWith('**Position refusée**') && l.includes('Infos sur l\'appli') && l.includes('Paramètres des sites')));
});
