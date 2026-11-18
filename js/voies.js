// L'origine du nom d'une rue (v198) : « Dénominations des emprises des voies actuelles », Ville de Paris, Direction de
// l'Urbanisme, licence ODbL. Le robot ne garde que le nom de la voie et le champ « orig » (une phrase), dans data/voies.json
// (tools/maj-voies.py). Rien n'est envoyé : le nom de la rue vient de l'adresse déjà demandée à l'IGN par « Où suis-je ? ».

/** La même clé que le robot : minuscules, sans accents, tirets et apostrophes unifiés (« Rue du Faubourg Saint-Denis » → « rue du faubourg saint denis »). */
export const voieKey = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’`´]/g, '\'').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

/** L'origine du nom de cette rue d'après le fichier du robot, ou '' (rue inconnue du fichier, nom écrit autrement, fichier pas encore arrivé). */
export function voieOrigin(json, street) {
  const k = voieKey(street);
  const v = k && json && typeof json.voies === 'object' && json.voies !== null && Object.hasOwn(json.voies, k) ? json.voies[k] : '';
  return typeof v === 'string' ? v.slice(0, 300) : '';
}
