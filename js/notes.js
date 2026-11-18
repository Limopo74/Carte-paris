// Note du jour (v205) : une page de texte par jour, sans lieu ni position.
// Elle reste sur le téléphone, part dans ma sauvegarde, jamais dans le fichier pour un proche ; rien n'est envoyé.

export const NOTE_MAX = 2000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Notes relues : jour « AAAA-MM-JJ », heure de la première écriture, texte non vide (2 000 signes au plus) ; une par jour, la plus récente d'abord. */
export function cleanNotes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const n of list) {
    if (!n || typeof n !== 'object' || typeof n.day !== 'string' || !DAY.test(n.day) || seen.has(n.day)) continue;
    const at = Number(n.at);
    const text = typeof n.text === 'string' ? n.text.trim().slice(0, NOTE_MAX) : '';
    if (!Number.isFinite(at) || at <= 0 || !text) continue;
    seen.add(n.day);
    out.push({ day: n.day, at, text });
  }
  return out.sort((a, b) => b.at - a.at);
}

/** La note d'un jour, ou null. */
export const noteOf = (notes, day) => cleanNotes(notes).find((n) => n.day === day) ?? null;

/** Écrit la note d'un jour (nouvelle liste) : compléter garde l'heure de la première écriture ; un texte vide l'efface. */
export function setNote(notes, day, text, at = Date.now()) {
  const old = noteOf(notes, day);
  const rest = cleanNotes(notes).filter((n) => n.day !== day);
  const t = String(text ?? '').trim();
  return cleanNotes(t ? [...rest, { day, at: old?.at ?? at, text: t }] : rest);
}
