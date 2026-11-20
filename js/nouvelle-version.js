// v333 (mes choix 1A 3A du 20 nov.) : savoir qu'une nouvelle version est publiée, sans aller dans Réglages.
// Android garde l'appli en mémoire : sans redémarrage, elle reste sur l'ancienne version. Quand on revient sur l'appli,
// elle relit sw.js sur le site (le même que celui qui envoie l'appli, sans rien de toi : ni position, ni lieux)
// et compare son numéro au sien. Pas d'information plutôt qu'une fausse : rien ne s'affiche si la lecture échoue,
// si le numéro est illisible, ou s'il n'est pas plus grand.

/** Pas plus d'une lecture tous les quarts d'heure. */
export const CHECK_EVERY_MS = 15 * 60e3;

/** Le numéro de version écrit dans sw.js (« carte-paris-v332 »), ou null. */
export function remoteVersionOf(text) {
  const m = /const CACHE = 'carte-paris-v(\d+)'/.exec(typeof text === 'string' ? text : '');
  return m ? Number(m[1]) : null;
}

/** Vrai seulement si le numéro lu est un entier strictement plus grand que celui de l'appli ouverte. */
export function isNewer(remote, local) {
  const l = Number(local);
  return Number.isInteger(remote) && Number.isInteger(l) && l > 0 && remote > l;
}

/** Faut-il relire la version maintenant ? */
export function shouldCheck({ lastAt = 0, now = Date.now(), online = true, hidden = false } = {}) {
  return online && !hidden && (!lastAt || now - lastAt >= CHECK_EVERY_MS);
}

// L'étiquette sous la barre du haut : les mêmes mots que le bouton de Réglages, qui fait la même chose.
// « Nouvelle version · Mettre à jour l'appli » passait sur deux lignes à 360 px, même en Normal (mesuré le 20 nov.).
export const versionNote = (newer) => (newer ? { text: 'Mettre à jour l\'appli', act: 'update' } : null);
