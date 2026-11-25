// v321 (mes choix du 20 nov.) : préparer le démarrage d'un proche. Ce que je choisis pour lui voyage dans le lien
// (…/Carte-paris/#depart=…), compressé ; jamais mes lieux, ma liste TTB, ma clé CARTO, ni le nom de la préparation.
import { cleanSettings, cleanChipOrder, cleanCartoKey, cleanChips, cleanMoreChips, cleanMore, withNewInMore, normalizeTools, cleanCategories, cleanPace, TEXT_SIZES, MAP_STYLES, MAP_TOOLS, freshStart, freshChips, FRESH_TOOLS, DEFAULT_CATEGORIES } from './store.js';
import { cleanFicheHidden } from './reglages.js';
import { SEEN_CAT } from './passage.js';

export const DEPART_KEY = 'carte-paris.demarrages'; // mes préparations, sur mon téléphone ; dans ma sauvegarde depuis la v380, jamais chez un proche
export const DEPART_MAX = 5;
export const MSG_MAX = 120;
export const NAME_MAX = 30;
export const STEP_KEYS = ['taille', 'pourtoi', 'rentrer', 'position']; // les étapes 2 à 5 du circuit (Bienvenue et « C'est prêt » toujours)
/** Fonds sans clé. */
export const FREE_STYLES = ['classic', 'eclairci', 'fr', 'hot', 'pastel', 'night', 'ign', 'photo'];
/** v349 (mes choix 2B et 2A du 21 nov.) : les fonds CARTO aussi ; sans clé chez lui, sa carte reste Classique et « C'est prêt »
 * lui propose de demander la sienne. Ma clé ne part dans le lien que si je coche « Avec ma clé CARTO » (`withKey`) ; elle n'est
 * jamais gardée dans mes préparations, seulement ajoutée au moment de faire le lien. */
export const KEY_STYLES = ['clean', 'positron', 'darkmatter'];
/** v349 (mon choix 4A) : où sa carte s'ouvre (pas « Chez moi » : il n'en a pas encore). */
export const PREP_STARTS = ['me', 'all', 'paris', 'last'];
const str = (v, max) => (typeof v === 'string' ? [...v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, max).join('') : '');
const bool = (v, def) => (typeof v === 'boolean' ? v : def);

/** Le départ standard d'un nouveau venu (v314) : point de départ d'une nouvelle préparation. */
export function defaultPreset(me = '') {
  return {
    de: str(me, NAME_MAX), msg: '', steps: { taille: true, pourtoi: true, rentrer: true, position: true },
    textSize: 'normal', masculin: false, pace: 'normal', side: 'right', labels: false, navigo: true,
    ...(({ hiddenChips, moreChips }) => ({ hiddenChips, moreChips }))(freshChips([...DEFAULT_CATEGORIES.map((c) => c.id), SEEN_CAT.id])), // v440 : le départ de mes captures
    mapTools: [...FRESH_TOOLS.mapTools], hiddenTools: [...FRESH_TOOLS.hiddenTools], moreTools: [...FRESH_TOOLS.moreTools],
    mapStyle: 'eclairci', withKey: false, startView: 'me', chipOrder: freshChips().chipOrder, chipIcons: true, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), lists: [],
    ficheHidden: [], voice: true, vibrateNow: false, suggestNow: true, alertNear: true,
  };
}

/** Une préparation lue d'un lien ou de mon téléphone : tout est revérifié, une valeur inconnue reprend le départ standard. */
export function cleanPreset(o) {
  const d = defaultPreset();
  if (!o || typeof o !== 'object') return d;
  const steps = Object.fromEntries(STEP_KEYS.map((k) => [k, bool(o.steps?.[k], true)]));
  const categories = cleanCategories(Array.isArray(o.categories) ? o.categories.map((c) => ({ id: c?.id, name: c?.name, color: c?.color, icon: c?.icon })) : []).filter((c) => c.id !== SEEN_CAT.id).slice(0, 20);
  const lists = (Array.isArray(o.lists) ? o.lists : []).filter((l) => l && typeof l.id === 'string' && /^[\w-]{1,64}$/.test(l.id) && str(l.name, 30)).slice(0, 20).map((l) => ({ id: l.id, name: str(l.name, 30) }));
  const hiddenChips = cleanChips(o.hiddenChips);
  const hiddenTools = (Array.isArray(o.hiddenTools) ? o.hiddenTools : []).filter((t) => MAP_TOOLS.includes(t));
  return {
    de: str(o.de, NAME_MAX), msg: str(o.msg, MSG_MAX), steps,
    textSize: TEXT_SIZES.includes(o.textSize) ? o.textSize : d.textSize, masculin: o.masculin === true,
    pace: cleanPace({ mode: o.pace }).mode, side: o.side === 'left' ? 'left' : 'right', labels: o.labels === true, navigo: o.navigo !== false,
    hiddenChips, moreChips: Array.isArray(o.moreChips) ? cleanMoreChips(o.moreChips, hiddenChips) : d.moreChips,
    mapTools: Array.isArray(o.mapTools) ? normalizeTools(o.mapTools) : d.mapTools, hiddenTools,
    moreTools: Array.isArray(o.moreTools) ? cleanMore(withNewInMore(o.moreTools, o.mapTools), hiddenTools) : d.moreTools, // v426 : un bouton plus récent que la préparation (Mon Paris) arrive dans ⋯ Plus, jamais sur la carte
    mapStyle: [...FREE_STYLES, ...KEY_STYLES].includes(o.mapStyle) && MAP_STYLES.includes(o.mapStyle) ? o.mapStyle : d.mapStyle,
    withKey: o.withKey === true && KEY_STYLES.includes(o.mapStyle), ...(cleanCartoKey(o.carto) && KEY_STYLES.includes(o.mapStyle) ? { carto: cleanCartoKey(o.carto) } : {}),
    startView: PREP_STARTS.includes(o.startView) ? o.startView : d.startView, chipOrder: cleanChipOrder(o.chipOrder), chipIcons: o.chipIcons === true, // v349 (mes choix 1A, 4A, 5A)
    categories: categories.length ? categories : d.categories, lists,
    ficheHidden: cleanFicheHidden(o.ficheHidden), voice: o.voice !== false, vibrateNow: o.vibrateNow === true, suggestNow: o.suggestNow !== false, alertNear: o.alertNear !== false,
  };
}

/** Une préparation sans clé : ma clé n'est jamais gardée avec mes préparations. */
export const noKey = ({ carto: _, ...p }) => p;
/** Mes préparations nommées : [{ id, name, at, p }], 5 au plus. */
export function cleanPreps(list) {
  return (Array.isArray(list) ? list : []).filter((x) => x && typeof x.id === 'string' && /^[\w-]{1,64}$/.test(x.id) && str(x.name, NAME_MAX))
    .slice(0, DEPART_MAX).map((x) => ({ id: x.id, name: str(x.name, NAME_MAX), at: Number.isFinite(x.at) ? x.at : 0, p: noKey(cleanPreset(x.p)) }));
}

/** Le départ du proche, posé sur une appli (mémoire vide : son départ entier ; appli déjà là : ses lieux et ses réglages
 * par défaut restent, mes catégories et listes qui lui manquent s'ajoutent). */
export function applyPreset(state, preset, { fresh = true } = {}) {
  const p = cleanPreset(preset);
  const base = fresh ? freshStart(state) : state;
  const seen = (base.categories ?? []).find((c) => c.id === SEEN_CAT.id) ?? { ...SEEN_CAT };
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let categories; let lists;
  if (fresh) { categories = [...p.categories.map((c) => ({ ...c })), seen]; lists = p.lists.map((l) => ({ ...l })); }
  else {
    const have = base.categories ?? [];
    categories = [...have, ...p.categories.filter((c) => !have.some((h) => h.id === c.id || fold(h.name) === fold(c.name))).map((c) => ({ ...c }))];
    const hl = base.lists ?? [];
    lists = [...hl, ...p.lists.filter((l) => !hl.some((h) => h.id === l.id || fold(h.name) === fold(l.name))).map((l) => ({ ...l }))];
  }
  return {
    ...base, categories, lists,
    textSize: p.textSize, masculin: p.masculin, pace: { ...cleanPace(base.pace), mode: p.pace }, toolsSide: p.side, toolLabels: p.labels, navigo: p.navigo,
    hiddenChips: [...p.hiddenChips], moreChips: [...p.moreChips], mapTools: [...p.mapTools], hiddenTools: [...p.hiddenTools], moreTools: [...p.moreTools],
    mapStyle: p.mapStyle, startView: p.startView, startOnMe: p.startView === 'me', chipIcons: p.chipIcons, chipOrder: p.chipOrder, ficheHidden: [...p.ficheHidden], voice: p.voice, vibrateNow: p.vibrateNow, suggestNow: p.suggestNow, alertNear: p.alertNear,
  };
}

/** Un proche qui a déjà l'appli et dit « Remplacer » : ses réglages d'avant deviennent ses réglages par défaut (« Revenir aux miens »). */
export function replaceWithPreset(state, preset, now = Date.now()) {
  return { ...applyPreset(state, preset, { fresh: false }), mySettings: { at: now, settings: cleanSettings(state) } };
}

/** Résumé d'une préparation, pour sa ligne dans la liste. */
export function presetSummary(p, names = {}) {
  const size = { normal: 'Normal', grand: 'Grand', tresgrand: 'Très grand' }[p.textSize];
  return [size, p.masculin ? 'au masculin' : 'au féminin', names[p.mapStyle] ?? ''].filter(Boolean).join(', ');
}

// Lien : JSON compressé (deflate, fait par le téléphone), en base64 « url ». Rien n'est envoyé à un serveur : tout est après le #.
const toB64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = (t) => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
async function pipe(bytes, stream) { const w = stream.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {}); return new Uint8Array(await new Response(stream.readable).arrayBuffer()); }
export async function encodePreset(preset, carto = '') {
  const p = noKey(cleanPreset(preset));
  const key = p.withKey ? cleanCartoKey(carto) : ''; // v349 : seulement si j'ai coché, et pour un fond CARTO
  const json = new TextEncoder().encode(JSON.stringify(key ? { ...p, carto: key } : p));
  return toB64(await pipe(json, new CompressionStream('deflate-raw')));
}
export async function decodePreset(code) {
  if (typeof code !== 'string' || !/^[\w-]{10,4000}$/.test(code)) return null;
  try { return cleanPreset(JSON.parse(new TextDecoder().decode(await pipe(fromB64(code), new DecompressionStream('deflate-raw'))))); } catch { return null; }
}
export const presetLink = (appUrl, code) => `${appUrl}#depart=${code}`;
export const readPresetCode = (hash) => (/[#&]depart=([\w-]+)/.exec(hash ?? '') ?? [])[1] ?? null;

/** v380 (mon choix 11A du 24 nov.) : les préparations d'une sauvegarde ; une préparation déjà là (même id) reste telle quelle. */
export function mergePreps(mine, theirs) {
  const a = cleanPreps(mine); const ids = new Set(a.map((x) => x.id));
  return cleanPreps([...a, ...cleanPreps(theirs).filter((x) => !ids.has(x.id))]);
}
