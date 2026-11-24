// Mots tout prêts (v226) : des séries de mots à toucher sous « En quelques mots » quand on écrit une impression.
// Chaque catégorie prend une série (champ `words` de la catégorie : l'identifiant d'une série, ou '' pour « Aucun »).
// Une catégorie sans ce champ prend la série de départ qui va avec son nom (Restos → Repas…), tant qu'elle existe.
// Tout reste sur le téléphone et dans la sauvegarde ; rien ne part dans le fichier pour un proche.

export const SERIES_MAX = 20;
export const WORDS_MAX = 100; // v403 (ma demande du 24 nov.) : autant de mots que je veux ; 100, seulement une limite de sécurité (6 avant)
export const SERIES_NAME_MAX = 20;
export const WORD_MAX = 24;
export const WORD_SEP = ' · ';

export const DEFAULT_WORDS = [
  { id: 'repas', name: 'Repas', words: ['Très bon', 'J\'y retourne', 'Trop cher', 'Bon accueil', 'Trop bruyant', 'À éviter'] },
  { id: 'visite', name: 'Visite', words: ['Superbe', 'À revoir', 'Trop de monde', 'Décevant', 'À conseiller'] },
  { id: 'boutique', name: 'Boutique', words: ['Bons prix', 'Trop cher', 'Bon conseil', 'J\'y retourne'] },
  { id: 'streetart', name: 'Street art', words: ['Toujours là', 'Abîmée', 'Nouvelle', 'Superbe'] },
];
export const defaultWords = () => DEFAULT_WORDS.map((s) => ({ ...s, words: [...s.words] }));

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const oneLine = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max).trim();

// Série de départ selon le nom de la catégorie (accents et majuscules ignorés) ou l'identifiant des catégories d'origine.
const GUESS = {
  repas: ['restos', 'resto', 'restaurants', 'cafes', 'douceurs', 'bars'],
  visite: ['culture', 'musees', 'spectacles', 'cinemas', 'expos', 'expositions'],
  boutique: ['boutiques', 'mode', 'librairies'],
  streetart: ['street art'],
};
const GUESS_ID = { resto: 'repas', culture: 'visite', boutique: 'boutique' };

/** Les mots d'une série : une ligne chacun, sans doublon, WORDS_MAX au plus. */
export function cleanSeriesWords(list) {
  const out = [];
  for (const w of Array.isArray(list) ? list : []) {
    const t = oneLine(w, WORD_MAX);
    if (t && !out.some((x) => fold(x) === fold(t))) out.push(t);
    if (out.length >= WORDS_MAX) break;
  }
  return out;
}

/** Les séries gardées : identifiant court, nom unique, au moins un mot ; 20 au plus. */
export function cleanWords(list) {
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (!s || typeof s.id !== 'string' || !/^[\w-]{1,64}$/.test(s.id)) continue;
    const name = oneLine(s.name, SERIES_NAME_MAX);
    const words = cleanSeriesWords(s.words);
    if (!name || !words.length) continue;
    if (out.some((x) => x.id === s.id || fold(x.name) === fold(name))) continue;
    out.push({ id: s.id, name, words });
    if (out.length >= SERIES_MAX) break;
  }
  return out;
}

/** Les séries de l'état : celles d'origine tant que la personne n'a jamais rien enregistré. */
export const wordsOf = (state) => (Array.isArray(state?.words) ? cleanWords(state.words) : defaultWords());

/** Identifiant de la série d'une catégorie ('' : aucune). */
export function seriesIdOf(cat, words) {
  if (!cat) return '';
  const ids = new Set((words ?? []).map((s) => s.id));
  if (typeof cat.words === 'string') return ids.has(cat.words) ? cat.words : '';
  const name = fold(cat.name);
  for (const [id, names] of Object.entries(GUESS)) if (names.includes(name) && ids.has(id)) return id;
  const byId = GUESS_ID[cat.id];
  return byId && ids.has(byId) ? byId : '';
}

/** La série d'une catégorie, ou null. */
export const seriesOf = (cat, words) => (words ?? []).find((s) => s.id === seriesIdOf(cat, words)) ?? null;

/** Les mots déjà dans le texte (séparés par « · »). */
const parts = (text) => String(text ?? '').split('·').map((x) => x.trim()).filter(Boolean);
export const hasWord = (text, word) => parts(text).some((x) => fold(x) === fold(word));

/** Un appui sur un mot : ajouté à la fin du texte, ou retiré s'il y est déjà. Renvoie le nouveau texte. */
export function toggleWord(text, word) {
  const now = parts(text);
  if (now.some((x) => fold(x) === fold(word))) return now.filter((x) => fold(x) !== fold(word)).join(WORD_SEP);
  const base = String(text ?? '').trim().replace(/\s*·\s*$/, '');
  return base ? `${base}${WORD_SEP}${word}` : word;
}

/** Les séries et le choix de chaque catégorie sont-ils ceux du départ ? (pour l'empreinte de la sauvegarde) */
export function wordsAsStart(state) {
  const words = wordsOf(state);
  if (JSON.stringify(words) !== JSON.stringify(DEFAULT_WORDS)) return false;
  return (state.categories ?? []).every((c) => typeof c.words !== 'string' || c.words === seriesIdOf({ ...c, words: undefined }, words));
}

/** Enregistre une série (id null : nouvelle). Renvoie { words, id } ou lève une erreur lisible. */
export function saveSeries(words, id, name, list, makeId) {
  const all = cleanWords(words);
  const n = oneLine(name, SERIES_NAME_MAX);
  if (!n) throw new Error('Donne un nom à la série.');
  const w = cleanSeriesWords(list);
  if (!w.length) throw new Error('Écris au moins un mot.');
  const same = all.find((s) => s.id !== id && fold(s.name) === fold(n));
  if (same) throw new Error(`La série « ${same.name} » existe déjà.`);
  if (id && all.some((s) => s.id === id)) return { words: all.map((s) => (s.id === id ? { id, name: n, words: w } : s)), id };
  if (all.length >= SERIES_MAX) throw new Error(`${SERIES_MAX} séries au plus.`);
  const nid = makeId();
  return { words: [...all, { id: nid, name: n, words: w }], id: nid };
}

/** Supprime une série ; les catégories qui la prenaient passent à « Aucun ». */
export function deleteSeries(state, id) {
  const words = wordsOf(state).filter((s) => s.id !== id);
  const before = wordsOf(state);
  const categories = (state.categories ?? []).map((c) => (seriesIdOf(c, before) === id ? { ...c, words: '' } : c));
  return { ...state, words, categories };
}
