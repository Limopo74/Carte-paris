// v518 (mes choix 1A 2A 3A 4A du 25 nov.) : sur la fiche d'une sortie, glisser de côté ouvre la sortie voisine
// de la liste d'où l'on vient, dans l'ordre affiché ; on s'arrête aux bouts ; repère « 3 / 24 » sous le titre.
// Réglages → Autres réglages → Sorties → Glisser entre les sorties (allumé au départ).
import { swipeIndex } from './photos.js';

/**
 * Suite des sorties d'une page, à partir des lignes dans l'ordre affiché (`entries` : { e, go }).
 * Une sortie montrée deux fois (deux rubriques) ne compte qu'une fois, à sa première place.
 * Rien (null) si la sortie touchée n'y est pas ou si elle est seule.
 */
export function makeDeck(entries, current) {
  const items = []; const seen = new Set();
  for (const x of entries ?? []) {
    if (!x?.e || typeof x.go !== 'function' || seen.has(x.e)) continue;
    seen.add(x.e); items.push(x);
  }
  const i = items.findIndex((x) => x.e === current);
  return i < 0 || items.length < 2 ? null : { items, i };
}

/** La suite après un pas (1 = la suivante, -1 = celle d'avant) ; null au bout ou sans pas : on ne bouge pas. */
export function deckMove(deck, step) {
  if (!deck || !step) return null;
  const j = swipeIndex(deck.i, deck.items.length, step);
  return j === deck.i ? null : { items: deck.items, i: j };
}

/** Repère sous le titre : « 3 / 24 ». */
export const deckCount = (deck) => (deck ? `${deck.i + 1} / ${deck.items.length}` : '');
/** Pour un lecteur d'écran. */
export const deckLabel = (deck) => (deck ? `Sortie ${deck.i + 1} sur ${deck.items.length}. Glisse de côté pour la voisine.` : '');
