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
const MONTHS = '(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv\\.|févr\\.|avr\\.|juil\\.|sept\\.|oct\\.|nov\\.|déc\\.)';
const FIRST = new RegExp(`(?<![\\d,.])\\b1[ \u00a0](?=${MONTHS}(?![\\p{L}]))`, 'gu');
const HOUR = /(?<![\p{L}\d,.:/])(\d{1,2})(?:[  ]?h)(?:[  ]?(\d{2}))?(?![\p{L}\d])/gu;
const BEFORE = / ([:;!?»%])/g;
const AFTER = /« /g;

/** Le texte avec les espaces, les heures et le « 1er » de la typographie française. */
export function typo(text) {
  const s = String(text);
  if (!/[ :;!?»%«h1]/.test(s)) return s;
  return s
    .replace(FIRST, `1er${NB}`)
    .replace(HOUR, (_, h, m) => `${h}${NB}h${m ? `${NB}${m}` : ''}`)
    .replace(BEFORE, `${NB}$1`)
    .replace(AFTER, `«${NB}`);
}
