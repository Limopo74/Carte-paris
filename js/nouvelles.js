// Sorties nouvelles (v556, mes choix N1 A, N2 A, N3 A du 28 nov. 2026).
// Est nouvelle une sortie de l'agenda de la Ville absente à ma dernière ouverture de Sorties. Le téléphone garde la liste
// des identifiants déjà vus (rien n'est envoyé). Pas d'encart à la toute première ouverture : rien à comparer.
// Une nouvelle le reste jusqu'à ce que j'ouvre la liste des nouvelles ; les suivantes s'ajoutent en attendant.
// La date de modification de l'agenda (`updated_at`) n'est pas utilisée : une ancienne sortie corrigée paraîtrait nouvelle.

const ids = (x) => (Array.isArray(x) ? x.map(String).filter((s) => /^\d{1,12}$/.test(s)) : []);

/** Ce qui est gardé : { at (dernière ouverture), seen, fresh, since (la date à partir de laquelle elles sont nouvelles) } ou null. */
export function cleanNews(x) {
  if (!x || typeof x !== 'object' || !Number.isFinite(x.at)) return null;
  return { at: x.at, seen: ids(x.seen), fresh: ids(x.fresh), since: Number.isFinite(x.since) ? x.since : null };
}

/** Une ouverture de Sorties : `now` (ms), `current` : les identifiants de l'agenda maintenant. */
export function stepNews(store, current, now) {
  const cur = ids(current);
  const st = cleanNews(store);
  if (!cur.length) return st; // l'agenda n'a rien rendu : rien ne change
  if (!st) return { at: now, seen: cur, fresh: [], since: null }; // première fois : la référence, sans encart
  const here = new Set(cur);
  const seen = new Set(st.seen);
  const fresh = st.fresh.filter((k) => here.has(k)); // une nouvelle finie disparaît
  const known = new Set([...seen, ...fresh]);
  const added = cur.filter((k) => !known.has(k));
  return {
    at: now,
    seen: [...seen].filter((k) => here.has(k)),
    fresh: [...fresh, ...added],
    since: fresh.length || added.length ? (st.fresh.length && st.since ? st.since : st.at) : null,
  };
}

/** J'ouvre la liste des nouvelles : elles deviennent vues (N3 A). */
export function readNews(store) {
  const st = cleanNews(store);
  if (!st) return null;
  return { ...st, seen: [...new Set([...st.seen, ...st.fresh])], fresh: [], since: null };
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
/** « depuis mercredi », « depuis hier », « depuis 9 h » (le jour même), « depuis le 12 nov. » (plus d'une semaine). */
export function sinceText(since, now = new Date()) {
  const d = new Date(since);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const gap = Math.round((day(now) - day(d)) / 864e5);
  if (gap <= 0) return `depuis ${d.getHours()} h${d.getMinutes() ? ` ${String(d.getMinutes()).padStart(2, '0')}` : ''}`;
  if (gap === 1) return 'depuis hier';
  if (gap < 7) return `depuis ${DAYS[d.getDay()]}`;
  return `depuis le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}
