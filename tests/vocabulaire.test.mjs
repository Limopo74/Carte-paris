// v222 : typographie française à l'affichage et lexique de l'appli (analyse du vocabulaire du 19 nov., CHARTE.md § 8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { typo } from '../js/typo.js';

const NB = ' ';
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const js = readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => [f, read(`js/${f}`)]);
const app = read('js/app.js');

test('typo : espace insécable avant « : ; ? ! » % » et après « « »', () => {
  assert.equal(typo('Ex. : la glycine'), `Ex.${NB}: la glycine`);
  assert.equal(typo('Où suis-je ? Ici !'), `Où suis-je${NB}? Ici${NB}!`);
  assert.equal(typo('touche « Ajuster »'), `touche «${NB}Ajuster${NB}»`);
  assert.equal(typo('à −50 %'), `à −50${NB}%`);
  assert.equal(typo('https://exemple.fr/a?b=1'), 'https://exemple.fr/a?b=1', 'une adresse ne change pas');
});

test('typo : une seule écriture des heures, « 9 h 30 »', () => {
  assert.equal(typo('Ouvre à 9h'), `Ouvre à 9${NB}h`);
  assert.equal(typo('7h–13h30'), `7${NB}h–13${NB}h${NB}30`);
  assert.equal(typo('jusqu\'à 21 h 45'), `jusqu'à 21${NB}h${NB}45`);
  assert.equal(typo('Mon pas : 4,5 km/h'), `Mon pas${NB}: 4,5 km/h`, 'km/h n\'est pas une heure');
  assert.equal(typo('10 hôtels'), '10 hôtels');
});

test('typo : « 1er » pour le premier jour du mois, jamais pour le 11 ou le 21', () => {
  assert.equal(typo('mardi 1 déc.'), `mardi 1er${NB}déc.`);
  assert.equal(typo('Vu le 1 janvier'), `Vu le 1er${NB}janvier`);
  assert.equal(typo('jusqu\'au 11 décembre'), 'jusqu\'au 11 décembre');
  assert.equal(typo('le 21 mars'), 'le 21 mars');
  const d = new Date(2026, 11, 1).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  assert.match(typo(d), /^mardi 1er décembre$/, 'la date du navigateur');
});

test('typo : branchée sur el() et toast(), jamais sur un champ, gardée hors réseau', () => {
  assert.match(app, /import \{ typo(, [\w, ]+)? \} from '\.\/typo\.js';/); // v286 : avec accord et setMasculin
  assert.match(app, /createTextNode\(raw \? String\(c\) : typo\(c\)\)/);
  assert.match(app, /const RAW_TAGS = new Set\(\['textarea', 'option', 'pre', 'code'\]\);/);
  assert.match(app, /t\.textContent = typo\(msg\);/);
  assert.match(read('sw.js'), /'js\/typo\.js'/);
});

test('lexique : un mot par chose (CHARTE.md § 8)', () => {
  const banned = [
    [/Vouliez-vous/, 'tutoiement partout : « Tu voulais dire… ? »'],
    [/Tu y es allé \?|tu y es allé(?!e)|Tu es déjà passé ici|Déjà passé (ici|·)|Tu seras prévenu\b|\*\*Perdu\b/, 'accords au féminin'],
    [/ico\('check'\), 'Garder'\)/, 'un formulaire s\'enregistre : « Enregistrer »'],
    [/'Cacher |'Caché'|'caché'|Noms cachés|Plus ou [Cc]aché/, '« Masquer », jamais « Cacher »'],
    [/Supprimer ce passage|Passage supprimé|Passage corrigé|passage noté|Mes passages'/, 'une visite datée est une « impression »'],
    [/Effacer ce signalement|Effacer ces/, 'détruire : « Supprimer »'],
    [/Localisation refusée/, '« Position »'],
    [/'[^']*\b[Aa]ppuie sur\b/, 'le verbe est « touche »'],
    [/'[^'\n]*\bmail\b[^'\n]*'/, '« courriel »'],
  ];
  for (const [f, src] of js) {
    for (const [rx, why] of banned) {
      if (f.endsWith('typo.js') && why === 'accords au féminin') continue; // v286 : la table « Écrire au masculin » (ACCORDS)
      assert.doesNotMatch(src, rx, `${f} : ${why}`);
    }
  }
});
