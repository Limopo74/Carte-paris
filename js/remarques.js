// Période de test (v313, mes choix 1A à 6A du 20 nov.) : une personne qui découvre l'appli touche le porte-voix,
// choisit ce qui ne va pas, écrit un mot si elle veut, puis l'envoie par le menu de partage du téléphone (SMS, WhatsApp,
// courriel). Le texte est prêt à coller dans une conversation avec Claude. Rien ne part tout seul : aucun serveur.
// Rangé à part dans localStorage (`carte-paris.test`), jamais dans la sauvegarde, jamais chez un proche.
// Ce qui part avec la remarque : l'écran, la version, la taille du texte, le côté des boutons, Android et Chrome
// quand Chrome les donne vraiment. Jamais la position, jamais « Ce que j'utilise ».

export const TEST_KEY = 'carte-paris.test';
export const REMARK_TEXT_MAX = 600;
export const REMARKS_MAX = 100;
export const REMARK_KINDS = [
  ['comprends', 'Je ne comprends pas'],
  ['complique', 'Trop compliqué'],
  ['marche', 'Ne marche pas ou faux'],
  ['manque', 'Il manque quelque chose'],
  ['autre', 'Autre'],
];
const KINDS = new Map(REMARK_KINDS);
export const remarkLabel = (k) => KINDS.get(k) ?? '';

const str = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Une remarque propre, ou null : type connu, date valable, rien d'autre que ces champs (aucune position). */
export function cleanRemark(r) {
  if (!r || typeof r !== 'object' || !KINDS.has(r.k)) return null;
  const at = Number(r.at);
  if (!Number.isFinite(at) || at <= 0) return null;
  const id = /^rq-[\w-]{1,40}$/.test(r.id) ? r.id : `rq-${Math.round(at).toString(36)}`;
  return { id, k: r.k, t: str(r.t, REMARK_TEXT_MAX), s: str(r.s, 80) || 'la carte', w: str(r.w, 40), c: str(r.c, 200), at, sent: r.sent === true };
}

/** Les remarques, de la plus récente, sans doublon, 100 au plus. */
export function cleanRemarks(list) {
  const seen = new Set();
  const out = [];
  for (const r of (Array.isArray(list) ? list : []).map(cleanRemark).filter(Boolean).sort((a, b) => b.at - a.at)) {
    if (seen.has(r.id)) continue;
    seen.add(r.id); out.push(r);
  }
  return out.slice(0, REMARKS_MAX);
}

/** Lecture tolérante de `carte-paris.test` : un contenu abîmé repart éteint, sans remarque. */
export function readTest(raw) {
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return { on: false, remarks: [] };
    return { on: o.on === true, remarks: cleanRemarks(o.remarks) };
  } catch { return { on: false, remarks: [] }; }
}

export function addRemark(test, r) {
  return { ...test, remarks: cleanRemarks([r, ...(test.remarks ?? [])]) };
}

export function markSent(test, ids) {
  const set = new Set(ids);
  return { ...test, remarks: test.remarks.map((r) => (set.has(r.id) ? { ...r, sent: true } : r)) };
}

/** Android et Chrome : seulement ce que Chrome donne vraiment. Le texte d'identification de Chrome sur Android dit
 * toujours « Android 10 » (réduit) : il ne sert que pour Chrome ; Android vient de `platformVersion`. */
export function platformInfo(hints, ua = '') {
  const out = {};
  const pv = hints?.platform === 'Android' ? /^(\d+)/.exec(String(hints.platformVersion ?? '')) : null;
  if (pv && Number(pv[1]) > 0) out.android = pv[1];
  const full = (hints?.fullVersionList ?? []).find((b) => /^(Google Chrome|Chromium)$/.test(b?.brand ?? ''));
  const m = /^(\d+)/.exec(String(full?.version ?? '')) ?? /Chrome\/(\d+)/.exec(String(ua));
  if (m) out.chrome = m[1];
  return out;
}

/** « Version 313 · texte Très grand · boutons à droite · Android 14 · Chrome 131 » (ce qui est inconnu n'est pas écrit). */
export function contextLine({ version = '', size = '', side = '', android = '', chrome = '' } = {}) {
  return [version && `Version ${version}`, size && `texte ${size}`, side && `boutons ${side === 'left' ? 'à gauche' : 'à droite'}`,
    android && `Android ${android}`, chrome && `Chrome ${chrome}`].filter(Boolean).join(' · ');
}

const when = (at) => {
  const d = new Date(at);
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}, ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Le texte envoyé : un titre, puis chaque remarque (de la plus ancienne), son écran, sa date, son mot et son contexte. */
export function remarksText(remarks) {
  const list = cleanRemarks(remarks).reverse();
  if (!list.length) return '';
  const head = list.length > 1 ? `${list.length} remarques sur « Ma carte de Paris » (période de test) :` : 'Remarque sur « Ma carte de Paris » (période de test) :';
  const blocks = list.map((r) => [
    `- ${remarkLabel(r.k)} · sur : ${r.s}${r.w ? ` [${r.w}]` : ''} · ${when(r.at)}`,
    r.t ? `  « ${r.t} »` : '',
    r.c ? `  ${r.c}` : '',
  ].filter(Boolean).join('\n'));
  return [head, ...blocks].join('\n');
}

/** v378 (mon choix 10A du 24 nov.) : les remarques d'une sauvegarde rejoignent les miennes (même id = une seule), rien n'est retiré. */
export function mergeRemarks(mine, theirs) {
  return cleanRemarks([...(Array.isArray(mine) ? mine : []), ...(Array.isArray(theirs) ? theirs : [])]);
}
