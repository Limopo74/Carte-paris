// « Ce que j'utilise » (v254) : compte, sur le téléphone seulement, les écrans ouverts et les boutons touchés,
// pour voir après quelques semaines ce qui ne sert jamais et le masquer. Ni lieu, ni heure, ni position :
// seulement le nom de l'écran, le nom du bouton et deux nombres (vu, touché). Rangé à part dans localStorage
// (`carte-paris.usage`), jamais dans la sauvegarde, jamais envoyé, jamais chez un proche.

export const USAGE_KEY = 'carte-paris.usage';
export const USAGE_MAX_LABELS = 1500; // au-delà, un bouton nouveau n'est plus compté (le fichier reste petit)

/** Écrans dont le titre dit un lieu, une sortie ou une personne : on ne garde jamais ce titre, seulement ce nom. */
export const SCREEN_LABEL = {
  carte: 'La carte',
  detail: 'Fiche d\'un lieu',
  photos: 'Photos d\'un lieu',
  plan: 'Prévoir un lieu',
  hours: 'Horaires d\'un lieu',
  passages: 'Impressions d\'un lieu',
  move: 'Déplacer un lieu',
  list: 'Une de mes listes',
  near: 'Autour de moi',
  dest: 'Y aller',
  way: 'Vers un lieu',
  arrlist: 'Mes lieux d\'un arrondissement',
  sortie: 'Page d\'une sortie',
  market: 'Page d\'un marché',
  navigo: 'Lieu Navigo',
  circuit: 'Un circuit',
  artiste: 'Page d\'un artiste',
  'same-author': 'Du même auteur',
  busstop: 'Arrêt de bus',
  metro: 'Station de métro',
  serie: 'Une série de Mots tout prêts',
  'import-proche': 'Lieux d\'un proche',
  gratuitjour: 'Gratuit ce jour-là',
  chercher: 'Chercher dans Sorties',
};

/** `detail:12` → `detail` ; `settings:chezmoi` reste entier (chaque page des Réglages est une fonction) ; `Ⓜ Bastille` → `metro`. */
export function screenKey(name) {
  const s = String(name ?? '');
  if (/^settings:[a-z-]+$/.test(s)) return s;
  if (/^Ⓜ/.test(s)) return 'metro';
  if (/^chercher-/.test(s)) return 'chercher'; // `chercher-${onglet}` de Sorties
  const m = /^[a-z][a-z-]*/.exec(s);
  return m ? m[0].replace(/-$/, '') : 'autre';
}

/** Nom d'un bouton à compter : « Y aller · ≈ 9 min » → « Y aller » ; « Mes salles (3) » → « Mes salles » ; '' si rien d'utile. */
export function cleanLabel(text) {
  let s = String(text ?? '').replace(/\s+/g, ' ').trim();
  s = s.split(/\s[·:]\s/u)[0]; // « Mon planning : aucune sortie prévue » → « Mon planning » (l'état, parfois un nom, est retiré)
  s = s.replace(/\(\s*[\d\s.,]+\s*\)/g, ' ').replace(/[≈~]/g, ' ')
    .replace(/\d+([.,]\d+)?\s*(min|km|m|h|°)?(?![\p{L}])/gu, ' ')
    .replace(/\s+/g, ' ').replace(/[\s:·,–-]+$/u, '').trim();
  if (s.length < 2 || s.length > 40 || !/\p{L}/u.test(s)) return '';
  return s;
}

export function emptyUsage(now = Date.now()) {
  return { v: 1, since: now, opens: 0, s: {}, b: {} };
}

/** Lecture tolérante : un fichier abîmé repart de zéro. */
export function readUsage(raw, now = Date.now()) {
  try {
    const u = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!u || u.v !== 1 || typeof u.s !== 'object' || typeof u.b !== 'object' || !u.s || !u.b) return emptyUsage(now);
    return { v: 1, since: Number(u.since) || now, opens: Math.max(0, Number(u.opens) || 0), off: u.off === true || undefined, s: u.s, b: u.b };
  } catch { return emptyUsage(now); }
}

const nLabels = (u) => Object.values(u.b).reduce((n, x) => n + Object.keys(x).length, 0);
function slot(u, screen, label) {
  const row = (u.b[screen] ??= {});
  if (!row[label]) {
    if (nLabels(u) >= USAGE_MAX_LABELS) return null;
    row[label] = [0, 0];
  }
  return row[label];
}

/** Un écran ouvert. Le titre n'est gardé que pour un écran qui n'est pas dans SCREEN_LABEL ; s'il change, il est oublié. */
export function noteOpen(u, name, title = '') {
  if (u.off) return u;
  const k = screenKey(name);
  const s = (u.s[k] ??= { n: 0 });
  s.n += 1;
  const t = String(title).replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!SCREEN_LABEL[k] && !s.varies && t) {
    if (s.t == null) s.t = t;
    else if (s.t !== t) { delete s.t; s.varies = true; }
  }
  return u;
}

/** Les boutons visibles à l'ouverture d'un écran (chacun compté une fois par ouverture). */
export function noteSeen(u, name, labels) {
  if (u.off) return u;
  const k = screenKey(name);
  for (const l of new Set(labels.map(cleanLabel).filter(Boolean))) { const x = slot(u, k, l); if (x) x[0] += 1; }
  return u;
}

/** Un bouton touché. Un bouton touché sans avoir été vu (arrivé après l'ouverture) compte aussi comme vu. */
export function noteUsed(u, name, label) {
  if (u.off) return u;
  const l = cleanLabel(label);
  if (!l) return u;
  const x = slot(u, screenKey(name), l);
  if (x) { x[1] += 1; if (x[0] < x[1]) x[0] = x[1]; }
  return u;
}

export function screenName(u, k) {
  return SCREEN_LABEL[k] ?? u.s[k]?.t ?? (k.startsWith('settings:') ? `Réglages : ${k.slice(9)}` : `Écran « ${k} »`);
}

/**
 * Ce que montre la page : `never` = par écran ouvert au moins `minOpens` fois, les boutons vus au moins `minSeen` fois
 * et jamais touchés ; `top` = les boutons les plus touchés ; `touches` = le total des appuis comptés.
 */
export function usageReport(u, { minOpens = 3, minSeen = 3, top = 10 } = {}) {
  const opensOf = (k) => (k === 'carte' ? u.opens : u.s[k]?.n ?? 0);
  const never = []; const all = []; let touches = 0;
  for (const [k, row] of Object.entries(u.b)) {
    const labels = [];
    for (const [l, [seen, used]] of Object.entries(row)) {
      touches += used;
      if (used) all.push({ screen: screenName(u, k), label: l, used });
      else if (seen >= minSeen) labels.push({ label: l, seen });
    }
    if (labels.length && opensOf(k) >= minOpens) never.push({ key: k, screen: screenName(u, k), opens: opensOf(k), labels: labels.sort((a, b) => b.seen - a.seen).map((x) => x.label) });
  }
  never.sort((a, b) => b.opens - a.opens);
  all.sort((a, b) => b.used - a.used || a.label.localeCompare(b.label, 'fr'));
  return { never, top: all.slice(0, top), touches };
}
