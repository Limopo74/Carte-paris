// v234 : les explications de chaque écran sont rangées dans une ligne « Aide » repliée (mes choix 1A 2A 3A 4A du 19 nov.).
// Garde-fou de la règle « pas d'info plutôt qu'une info fausse » : une mise en garde sur ce que l'écran affiche
// (horaires inconnus, chemin sans horaires, liste incomplète, estimation…) ne doit jamais être repliée.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const lines = app.split('\n');
const tips = lines.map((l, i) => [i + 1, l]).filter(([, l]) => l.includes("class: 'help tip'"));

test('aide repliée : les explications sont marquées « help tip »', () => {
  assert.ok(tips.length >= 50, `${tips.length} explications seulement`);
});

test('aide repliée : aucune mise en garde n\'est repliée', () => {
  const WARN = /vérifie (avant|sur)|inconnu|deviné|estimation|pas toutes|ne cite pas|déviation|indicatif|pas complète|peut avoir été|prévisions|sans horaires|n'apparaîtront pas|n'y sont (souvent )?pas/i;
  const bad = tips.filter(([, l]) => WARN.test(l)).map(([n, l]) => `${n} : ${l.trim().slice(0, 100)}`);
  assert.deepEqual(bad, [], `Mise en garde repliée (elle doit rester visible) :\n${bad.join('\n')}`);
});

test('aide repliée : l\'aide d\'un champ reste à côté du champ', () => {
  const bad = tips.filter(([, l]) => /\bid: '/.test(l) || /aria-live/.test(l)).map(([n]) => n);
  assert.deepEqual(bad, [], 'une explication avec un id (aria-describedby) ou annoncée (aria-live) ne se replie pas');
});

test('aide repliée : une seule ligne « Aide » par écran, au même endroit', () => {
  assert.equal((app.match(/^function pageHelp\(/gm) ?? []).length, 1);
  assert.ok(/function gatherTips\(\)[\s\S]*?\.sheet-foot[\s\S]*?ft\.before\(box\)/.test(app), 'l\'Aide va juste au-dessus de la barre du bas');
  assert.ok(/fill\(sheetBody, \.\.\.\[body\]\.flat\(\)\.filter\(Boolean\)\);\n\s*gatherTips\(\);/.test(app), 'rangée avant de remettre la hauteur de lecture');
  assert.ok(!app.includes('Aide, sources et mise à jour'), 'un seul mot : « Aide » (choix 4A)');
});

test('aide repliée : la page d\'aide elle-même n\'en a pas', () => {
  const i = app.indexOf('function openHelp(');
  const body = app.slice(i, app.indexOf('\n}\n', i));
  assert.ok(!body.includes("'help tip'"));
});

// v250 : « dès qu'il y a quelques lignes de texte secondaire, le replier » (ma demande du 19 nov.).
// Un texte gris resté visible (mise en garde, ce qui part du téléphone, état) tient en une ou deux phrases courtes :
// son explication et sa source vont dans un `help tip` à côté. Au-delà de 200 signes, le test échoue.
// Exceptions voulues : les textes déjà dans un bloc replié (Sorties → Aide, Confidentialité) et les listes datées de Données de l'appli.
test('aide repliée : aucun texte gris visible de plus de 200 signes', () => {
  const DEJA_REPLIE = ['Mise à jour automatique : l', 'Sources : marchés et agenda', 'Listes tenues par Claude, vérifiées le', 'Tes lieux, tes photos et ta position restent sur ce téléphone'];
  const bad = [];
  for (const [i, l] of lines.entries()) {
    const k = l.indexOf("el('p', { class: 'help' }, ");
    if (k < 0) continue;
    const rest = l.slice(k + 27);
    const q = rest[0];
    if (q !== "'" && q !== '`') continue;
    let j = 1;
    while (j < rest.length && !(rest[j] === q && rest[j - 1] !== '\\')) j++;
    const lit = rest.slice(1, j).replace(/\$\{[^}]*\}/g, '…').replace(/\\'/g, "'");
    if (lit.length > 200 && !DEJA_REPLIE.some((d) => lit.startsWith(d))) bad.push(`${i + 1} (${lit.length} signes) : ${lit.slice(0, 70)}`);
  }
  assert.deepEqual(bad, [], `Texte gris trop long : garde la phrase utile, range le reste dans un « help tip »\n${bad.join('\n')}`);
});
