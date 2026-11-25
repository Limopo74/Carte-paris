/* v470 (mes choix 1A 2A 3A du 25 nov., « uniquement visuel et comparatif ») : les vols enregistrés dans l'arrondissement où je suis,
   comparés à la moyenne de Paris, dans Où suis-je ?. Source : SSMSI (ministère de l'Intérieur), base statistique communale de la
   délinquance enregistrée, arrondissements de Paris, une fois par an (data/delinquance.json, robot : tools/maj-delinquance.py).
   Aucune donnée publique n'existe à la rue : rien de plus fin que l'arrondissement ne s'affiche. Aucune position n'est envoyée. */

/** Les deux indicateurs « dans la rue » retenus (noms du SSMSI), dans l'ordre de l'écran. « Vols avec armes » est écarté :
 *  il n'est pas publié pour plusieurs arrondissements (secret statistique), une somme serait fausse. */
export const DELINQ_KEYS = [
  ['vv', 'Vols violents sans arme'],
  ['vs', 'Vols sans violence contre des personnes'],
];

const num = (x) => (Number.isFinite(x) && x >= 0 ? x : null);

/** Le fichier relu : { source, updated, year, paris: { vv, vs }, arr: { 1: { vv, vs }, … } } ; null s'il manque ou est faux. */
export function cleanDelinq(j) {
  if (!j || typeof j !== 'object' || !Number.isInteger(j.year) || !j.paris || !Array.isArray(j.arr)) return null;
  const paris = {};
  for (const [k] of DELINQ_KEYS) { paris[k] = num(j.paris[k]); if (!paris[k]) return null; }
  const arr = {};
  for (const a of j.arr) {
    if (!a || !Number.isInteger(a.n) || a.n < 1 || a.n > 20) continue;
    arr[a.n] = Object.fromEntries(DELINQ_KEYS.map(([k]) => [k, num(a[k])]));
  }
  return { source: typeof j.source === 'string' ? j.source : '', updated: typeof j.updated === 'string' ? j.updated : '', year: j.year, paris, arr };
}

const one = (x) => (x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace('.', ',').replace(/,0$/, ''));
/** « 1,8 fois plus que Paris », « 2 fois moins que Paris », « Comme la moyenne de Paris » (écart de moins de 15 %). */
export function compareWords(v, paris) {
  if (!(v >= 0) || !(paris > 0)) return '';
  const r = v / paris;
  if (r >= 1.15) return `${one(r)} fois plus que Paris`;
  if (r > 0 && r <= 1 / 1.15) return `${one(1 / r)} fois moins que Paris`;
  return r > 0 ? 'Comme la moyenne de Paris' : '';
}

/** Les lignes à dessiner pour l'arrondissement `n` : largeurs des deux barres (en %, la plus grande à 100), mots et texte lu. */
export function delinqRows(d, n) {
  const a = d?.arr?.[n];
  if (!a) return [];
  return DELINQ_KEYS.map(([k, label]) => {
    const v = a[k]; const p = d.paris[k];
    if (v == null || !p) return null;
    const max = Math.max(v, p);
    return { key: k, label, here: Math.max(2, Math.round((v / max) * 100)), paris: Math.max(2, Math.round((p / max) * 100)), words: compareWords(v, p),
      aria: `${label} : ${one(v)} pour 1 000 habitants ici, ${one(p)} pour Paris. ${compareWords(v, p)}.` };
  }).filter(Boolean);
}
