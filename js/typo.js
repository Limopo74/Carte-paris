/* Typographie française à l'affichage (v222, analyse du vocabulaire du 19 nov.).
 * Tous les textes posés par el() et toast() passent par typo() :
 * - espace insécable avant « : ; ? ! » » et « % », et après « « » (règles de l'Imprimerie nationale) :
 *   la ponctuation ne passe jamais seule au début d'une ligne ;
 * - heures écrites « 9 h 30 » (symbole h entre deux espaces insécables), quelle que soit la façon dont
 *   un module les a écrites (« 9h30 », « 9 h 30 ») ;
 * - « 1er » pour le premier jour du mois (« 1er décembre », « mardi 1er déc. ») : le navigateur écrit « 1 ».
 * Les modules gardent leurs textes bruts (et leurs tests) : seule la page affichée change.
 * Jamais pour un champ (textarea, option) : le texte que je tape n'est pas modifié. */

const NB = ' ';

/* Écrire au masculin (v286, Réglages, éteint au départ) : l'appli s'adresse à moi au féminin (choix 1A de la v223) ;
 * allumé, ces tournures passent au masculin à l'affichage. Seulement ces phrases entières, pour ne jamais toucher
 * au nom d'un lieu ou d'une sortie (une « Allée », une expo « Perdue… »). tests/masculin.test.mjs échoue si une
 * phrase au féminin adressée à moi est ajoutée sans être ici. */
const ACCORDS = [
  ['Tu y es allée', 'Tu y es allé'], ['tu y es allée', 'tu y es allé'], ['où tu es allée', 'où tu es allé'],
  ['Pas allée ·', 'Pas allé ·'], ['je suis allée à', 'je suis allé à'], ['pas allée à', 'pas allé à'],
  ['Tu es déjà passée ici', 'Tu es déjà passé ici'], ['Déjà passée ici', 'Déjà passé ici'], ['Déjà passée ·', 'Déjà passé ·'],
  ['Tu seras prévenue', 'Tu seras prévenu'],
  ['Perdue dans un écran', 'Perdu dans un écran'], ['Perdue sur la carte', 'Perdu sur la carte'], ['Perdue ?', 'Perdu ?'],
];
let masc = false;
/** Allume ou éteint « Écrire au masculin ». */
export const setMasculin = (on) => { masc = on === true; };
/** Le texte accordé : au masculin si le réglage est allumé, sinon tel quel. */
export function accord(text) {
  let s = String(text);
  if (!masc || !/allée|passée|prévenue|Perdue/.test(s)) return s;
  for (const [f, m] of ACCORDS) s = s.split(f).join(m);
  return s;
}
const MONTHS = '(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv\\.|févr\\.|avr\\.|juil\\.|sept\\.|oct\\.|nov\\.|déc\\.)';
const FIRST = new RegExp(`(?<![\\d,.])\\b1[ \u00a0](?=${MONTHS}(?![\\p{L}]))`, 'gu');
const HOUR = /(?<![\p{L}\d,.:/])(\d{1,2})(?:[  ]?h)(?:[  ]?(\d{2}))?(?![\p{L}\d])/gu;
const BEFORE = / ([:;!?»%])/g;
const AFTER = /« /g;

/** Le texte avec les espaces, les heures et le « 1er » de la typographie française. */
export function typo(text) {
  const s = accord(text);
  if (!/[ :;!?»%«h1]/.test(s)) return s;
  return s
    .replace(FIRST, `1er${NB}`)
    .replace(HOUR, (_, h, m) => `${h}${NB}h${m ? `${NB}${m}` : ''}`)
    .replace(BEFORE, `${NB}$1`)
    .replace(AFTER, `«${NB}`);
}
