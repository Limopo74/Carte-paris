// Types de sorties, mes artistes et mes thèmes (v554, mes choix du 28 nov. 2026 : 2A 3A 4A 5A 6A, T1 A à T4 A).
// Le choix vaut dans Sorties (Tout, Gratuit) et Ce week-end : seulement les types cochés, plus toute sortie qui cite
// un de mes artistes ou un de mes thèmes (en plus, T1 A). Tout est trié sur le téléphone : rien n'est envoyé.
import { WEEKEND_RUBRIQUES } from './weekend.js';
import { mentions } from './art.js';

export const TYPE_IDS = WEEKEND_RUBRIQUES.map(([id]) => id);

const plain = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const words = (t) => plain(t).replace(/[^a-z0-9]+/g, ' ').trim();

/** Mes thèmes : sans doublon (accents et majuscules ignorés), 2 lettres au moins, 60 signes au plus, 40 au plus. */
export function cleanThemes(list) {
  const seen = new Set();
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (typeof s !== 'string') continue;
    const name = s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const key = words(name);
    if (key.replace(/ /g, '').length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= 40) break;
  }
  return out;
}

/** Le choix : { types: null (tous) ou une liste de types connus, themes: [], nots: [] (v561 : « Je ne veux pas ») }. Les 10 types cochés valent « tous » (null). */
export function cleanEvPick(x) {
  const themes = cleanThemes(x?.themes);
  const nots = cleanThemes(x?.nots);
  let types = Array.isArray(x?.types) ? TYPE_IDS.filter((id) => x.types.includes(id)) : null;
  // v564 : Sport a sa rubrique ; un choix d'avant qui gardait « Autres sorties » (où était le sport) garde aussi Sport
  if (types && x?.typesV !== 2 && types.includes('autre') && !types.includes('sport')) types = TYPE_IDS.filter((id) => id === 'sport' || types.includes(id));
  if (types && types.length === TYPE_IDS.length) types = null;
  return { types, themes, nots, typesV: 2 };
}
/** Un choix masque-t-il quelque chose ? (des types, ou des mots écartés) */
export const pickOn = (pick) => { const p = cleanEvPick(pick); return Array.isArray(p.types) || p.nots.length > 0; };

/** Depuis ma propre sauvegarde : les types du téléphone s'il en a choisi, sinon ceux du fichier ; les thèmes s'ajoutent. */
export function mergeEvPick(mine, file) {
  const a = cleanEvPick(mine);
  const b = cleanEvPick(file);
  return cleanEvPick({ types: a.types ?? b.types, themes: [...a.themes, ...b.themes], nots: [...a.nots, ...b.nots] });
}

/**
 * Le thème figure-t-il dans la sortie (titre, lieu, étiquettes, chapô) ? Début de mot (T4 A : « photo » → photographie,
 * « japon » → japonais) ; 3 lettres ou moins, mot entier (« art » ne trouve pas « artichaut »). Plusieurs mots : la suite.
 */
export function themeHit(e, theme) {
  const needle = words(theme);
  if (needle.replace(/ /g, '').length < 2) return false;
  const hay = ` ${words(`${e?.title ?? ''} ${e?.place ?? ''} ${e?.tags ?? ''} ${e?.lead ?? ''}`)} `;
  const last = needle.split(' ').pop();
  return hay.includes(last.length <= 3 ? ` ${needle} ` : ` ${needle}`);
}

/** Cite-t-elle un de mes artistes (nom entier, comme Mes artistes) ou un de mes thèmes ? */
export function liked(e, pick, artists = []) {
  const p = cleanEvPick(pick);
  return p.themes.some((t) => themeHit(e, t)) || (artists ?? []).some((n) => mentions(e, n));
}

/** Cite-t-elle un de mes mots écartés (même recherche que les thèmes, E2 A) ? */
export const notHit = (e, pick) => cleanEvPick(pick).nots.some((t) => themeHit(e, t));

/**
 * Passe-t-elle le choix ? `genre` : le type de la sortie (null = Autres sorties).
 * Mes artistes et thèmes gagnent toujours (T1 A, E3 A) ; puis un mot écarté masque (v561) ; puis les types.
 */
export function passPick(e, genre, pick, artists = []) {
  const p = cleanEvPick(pick);
  if (liked(e, p, artists)) return true;
  if (notHit(e, p)) return false;
  return !p.types || p.types.includes(genre ?? 'autre');
}

/** Ce que dit la ligne du haut : « Expos, Concerts » (2 types au plus), sinon « 4 types sur 11 » ; null si tout est montré. */
export function pickText(pick) {
  const p = cleanEvPick(pick);
  if (!p.types) return p.nots.length ? `Sauf ${p.nots.slice(0, 2).join(', ')}${p.nots.length > 2 ? '…' : ''}` : null; // v561 : seulement des mots écartés
  if (!p.types.length) return 'Mes artistes et thèmes';
  if (p.types.length <= 2) return p.types.map((id) => WEEKEND_RUBRIQUES.find(([k]) => k === id)[1]).join(', ');
  return `${p.types.length} types sur ${TYPE_IDS.length}`;
}
