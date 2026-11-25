// Page d'une personne (v457, mes choix « tout conseillé » du 25 nov. 2026 : 1A 2A 4A 5A, puis A A A des maquettes).
// La page Artiste réunit tout ce que l'appli connaît sous un même nom : sa tombe (data/cimetieres.json), les plaques dont le titre
// porte son nom (data/plaques.json), la rue à son nom (data/voies.json), ses œuvres dans la rue (data/oeuvres.json).
// Règle « pas d'information plutôt qu'une information fausse » (mon choix 2A) : aucun de ces fichiers n'a d'identifiant commun, tout se
// relie par le NOM COMPLET (deux mots au moins), écrit pareil aux accents, majuscules et tirets près ; un nom seul (« Rodin »,
// « Colette ») ne relie rien ; un nom porté par plusieurs personnes (deux tombes de personnes différentes, une rue dont les années ne
// sont pas celles de la tombe) n'est pas relié. Tout se fait sur le téléphone, rien n'est envoyé.

/** Clé de comparaison : minuscules, sans accents, tirets et apostrophes en espaces (« Jean-Baptiste » = « jean baptiste »). */
export const personKey = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();
const words = (s) => personKey(s).split(' ').filter(Boolean);
/** Un nom complet : deux mots au moins, dont un de 3 lettres ou plus (« Frédéric Chopin », pas « Rodin » ni « Le Ny »). */
export const isFullName = (n) => { const w = words(n); return w.length >= 2 && w.some((x) => x.length >= 3); };

/** Les tombes de ce nom : [{ c, t }] ; [] si le nom n'est pas complet ou s'il désigne plusieurs personnes. */
export function tombsOf(cims, name) {
  if (!isFullName(name)) return [];
  const k = personKey(name);
  const out = [];
  for (const c of cims ?? []) for (const t of c.tombs ?? []) if (personKey(t.name) === k) out.push({ c, t });
  const who = new Set(out.map(({ c, t }) => t.q ?? `${c.id}:${t.div}`));
  return who.size === 1 ? out : [];
}

/** « 1810-1849 » → [1810, 1849] ; null si l'écriture n'est pas celle-là. */
const yearsOf = (s) => { const m = /(\d{4})\D+(\d{4})/.exec(String(s ?? '')); return m ? [Number(m[1]), Number(m[2])] : null; };

/** Mots qui disent qu'une phrase parle d'un lieu, pas d'une personne (« Voisinage de l'avenue… »). */
const NOT_PERSON = new Set(['voisinage', 'proximite', 'avenue', 'rue', 'place', 'boulevard', 'quai', 'square', 'villa', 'passage', 'impasse', 'cite', 'allee', 'ancienne', 'ancien', 'chateau', 'eglise', 'hotel', 'jardin', 'ile']);
/**
 * Les rues à son nom (clés de data/voies.json, comme « place chopin ») : la clé contient son nom de famille (dernier mot), et la phrase
 * de la Ville cite tous les mots de son nom avant la première parenthèse ou virgule (« Frédéric François Chopin (1810-1849)… »,
 * « Marie Victor Hugo (1802-1885)… ») ; une phrase qui parle d'un lieu (« Voisinage de l'avenue… ») est écartée. Quand la tombe
 * donne des années et la phrase aussi, elles doivent être les mêmes (sinon c'est un homonyme).
 */
export function streetsOf(voies, name, years = '') {
  if (!isFullName(name) || !voies || typeof voies !== 'object') return [];
  const w = words(name); const last = w.at(-1);
  const y = yearsOf(years);
  const out = [];
  for (const [k, v] of Object.entries(voies)) {
    if (typeof v !== 'string' || !` ${k} `.includes(` ${last} `)) continue;
    const head = words(v.split(/[(,]/)[0]);
    if (head.some((x) => NOT_PERSON.has(x)) || !w.every((x) => head.includes(x))) continue;
    const vy = yearsOf(v);
    if (y && vy && (y[0] !== vy[0] || y[1] !== vy[1])) continue;
    out.push(k);
  }
  return out.sort();
}

/** Les œuvres dans la rue qu'il ou elle signe (« Jean Tinguely; Niki de Saint Phalle » : deux artistes) ; [] pour un nom incomplet. */
export function streetWorksOf(list, name) {
  if (!isFullName(name)) return [];
  const k = personKey(name);
  return (list ?? []).filter((a) => String(a.artist ?? '').split(/\s*[;/]\s*/).some((x) => personKey(x) === k));
}

/** Les œuvres d'un même nom à moins de 300 m (« Les enfants du monde » : 16 statues d'un même groupe dans OpenStreetMap) en une
 * seule : la première de la liste (la plus proche quand la liste est triée), avec `n` = leur nombre. */
export function groupWorks(list) {
  const out = [];
  for (const x of list ?? []) {
    const a = x.a ?? x;
    const g = out.find((y) => personKey((y.a ?? y).name) === personKey(a.name) && Math.abs((y.a ?? y).lat - a.lat) < 0.0027 && Math.abs((y.a ?? y).lng - a.lng) < 0.004);
    if (g) g.n += 1; else out.push({ ...x, n: 1 });
  }
  return out;
}

/** Les noms de personnes dans le titre d'une plaque (« George Sand et Frédéric Chopin » → les deux), seulement les noms complets. */
export function namesInTitle(title) {
  return String(title ?? '').split(/\s+(?:et|&)\s+|\s*,\s*/).map((x) => x.trim()).filter(isFullName);
}

/** « Sa tombe, ses plaques, sa rue » : ce que montre sa page, d'après ce qui a été trouvé. */
export function personSub(f) {
  const parts = [f.tomb ? 'sa tombe' : '', f.works ? 'ses œuvres' : '', f.plaques ? 'ses plaques' : '', f.street ? 'sa rue' : ''].filter(Boolean);
  const s = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, ${parts.at(-1)}` : parts[0] ?? '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
