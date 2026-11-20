// Écrire au masculin (v286) : éteint au départ (l'appli s'adresse à moi au féminin, choix 1A de la v223) ;
// allumé, chaque tournure adressée à moi passe au masculin, à l'affichage et pour TalkBack. Jamais le nom d'un lieu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { typo, accord, setMasculin } from '../js/typo.js';
import { loadState, saveState, readSettings, exportJSON, cleanSettings, KEY } from '../js/store.js';
import { memoryTitle } from '../js/passage.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const dir = new URL('../js/', import.meta.url);

test('Masculin éteint : rien ne change', () => {
  setMasculin(false);
  assert.equal(accord('« Tu y es allée ? »'), '« Tu y es allée ? »');
  assert.equal(memoryTitle(50, 1), 'Tu es déjà passée ici');
});

test('Masculin allumé : les tournures adressées à moi, jamais un nom de lieu', () => {
  setMasculin(true);
  try {
    assert.equal(typo('« Tu y es allée ? »'), '« Tu y es allé ? »');
    assert.equal(accord(memoryTitle(50, 1)), 'Tu es déjà passé ici');
    assert.equal(accord(memoryTitle(300, 4)), 'Déjà passé · 4 min à pied');
    assert.equal(accord('Pas allée · l\'expo est finie'), 'Pas allé · l\'expo est finie');
    assert.equal(accord('Oui, je suis allée à Orsay'), 'Oui, je suis allé à Orsay');
    assert.equal(accord('Tu seras prévenue près d\'un de tes lieux'), 'Tu seras prévenu près d\'un de tes lieux');
    assert.equal(accord('Perdue ?'), 'Perdu ?');
    for (const name of ['Allée des Cygnes', 'Mémoire perdue', 'Une adresse passée', 'La sortie est passée']) assert.equal(typo(name), name);
  } finally { setMasculin(false); }
});

test('Aucune phrase au féminin adressée à moi n\'échappe au réglage (tous les fichiers de js/)', () => {
  // Féminins qui ne parlent pas de moi : gardés tels quels
  const ALLOWED = ['une sortie passée', 'adresse passée', 'n\'est pas déjà passée', '|Allée|', '/allée|passée|prévenue|Perdue/'];
  setMasculin(true);
  const left = [];
  try {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.js'))) {
      readFileSync(new URL(f, dir), 'utf8').split('\n').forEach((l, i) => {
        if (/^\s*(\/\/|\/\*|\*)/.test(l)) return; // commentaires
        const a = accord(l);
        if (/\b(allée|passée|prévenue|perdue)\b/iu.test(a) && !ALLOWED.some((x) => a.includes(x))) left.push(`${f}:${i + 1}`);
        if (/\b[Tt]u (?:es|seras|étais|y es)(?: déjà| bien)? [a-zà-ÿ]+(?:ée|ue)\b/u.test(a)) left.push(`${f}:${i + 1} (tu …ée)`);
      });
    }
  } finally { setMasculin(false); }
  assert.deepEqual(left, [], 'ajoute la phrase à ACCORDS (js/typo.js)');
});

test('Le réglage est gardé : téléphone, sauvegarde, réglages par défaut ; éteint au départ', () => {
  const st = memStorage();
  assert.equal(loadState(st).masculin, false);
  st.setItem(KEY, JSON.stringify({ points: [] }));
  assert.equal(loadState(st).masculin, false, 'ancienne sauvegarde');
  saveState(st, { ...loadState(st), masculin: true });
  const s = loadState(st);
  assert.equal(s.masculin, true);
  assert.equal(readSettings(JSON.parse(exportJSON(s))).masculin, true);
  assert.equal(cleanSettings({ masculin: 'oui' }).masculin, false);
});

test('L\'appli applique le réglage au démarrage, à la restauration, et aux libellés lus par TalkBack', () => {
  const app = readFileSync(new URL('app.js', dir), 'utf8');
  assert.match(app, /setMasculin\(state\.masculin === true\); \/\/ v286 : avant le premier écran/);
  assert.match(app, /function applyAllSettings\(\) \{ setMasculin\(state\.masculin === true\);/);
  assert.match(app, /k === 'aria-label' \|\| k === 'title'\) n\.setAttribute\(k, accord\(v\)\)/);
  const a = app.indexOf("onOff('navigo'"), b = app.indexOf("onOff('masculin'");
  assert.ok(a > 0 && b > a, 'tout en bas de Réglages, après le passe Navigo');
});
