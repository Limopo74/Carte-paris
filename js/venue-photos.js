// v327 (mes choix 2C 3A 4A du 20 nov., puis 1B) : mes photos des salles.
// Une photo par salle, prise ou choisie dans Réglages → Photos des salles, réduite sur le téléphone (EXIF effacé),
// rangée dans la base des photos. Elle remplace l'icône du genre dans les listes de Sorties seulement quand l'agenda
// n'a pas de photo pour une sortie de cette salle, ou que sa photo ne se charge pas. La liste a sa propre clé de stockage ;
// elle va dans la sauvegarde générale (avec les photos), jamais dans l'export de Vu en passant ni dans le fichier pour un proche.
import { artistKey, atVenue } from './art.js';

export const VENUE_PHOTOS_KEY = 'carte-paris.salles-photos';
/** Côté le plus long de la copie gardée : assez pour la vignette de 56 × 76 px et le bandeau de la page de la salle. */
export const VENUE_PHOTO_SIDE = 640;
export const VENUE_PHOTOS_MAX = 100;

/** Liste gardée : [{ name, id, at }], une seule photo par salle (accents, majuscules et ponctuation ignorés). */
export function cleanVenuePhotos(list) {
  const seen = new Set();
  const out = [];
  for (const x of Array.isArray(list) ? list : []) {
    if (!x || typeof x.name !== 'string' || typeof x.id !== 'string' || !/^[\w-]{6,64}$/.test(x.id)) continue;
    const name = x.name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const key = artistKey(name);
    if (key.replace(/ /g, '').length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, id: x.id, at: Number.isFinite(x.at) ? x.at : 0 });
  }
  return out.slice(0, VENUE_PHOTOS_MAX);
}

/** La photo d'une salle pour cette salle (même nom, accents et majuscules ignorés), ou null. */
export const venuePhotoOf = (name, list) => cleanVenuePhotos(list).find((x) => artistKey(x.name) === artistKey(name)) ?? null;

/** La photo de salle d'une sortie : le nom de la salle, mot pour mot, dans son lieu ou son organisateur (comme Mes salles) ;
 * plusieurs : le nom le plus long (« 38Riv Jazz Club » avant « 38Riv »). null sinon. */
export function venuePhotoFor(e, list) {
  const hits = cleanVenuePhotos(list).filter((x) => atVenue(e, x.name));
  return hits.sort((a, b) => b.name.length - a.name.length)[0] ?? null;
}

/** Ajoute ou remplace la photo d'une salle ; rend { list, old } (old : l'id de l'ancienne photo à effacer, ou null). */
export function setVenuePhoto(list, name, id, at = Date.now()) {
  const cur = cleanVenuePhotos(list);
  const old = cur.find((x) => artistKey(x.name) === artistKey(name)) ?? null;
  const rest = cur.filter((x) => x !== old);
  return { list: cleanVenuePhotos([{ name: old?.name ?? name, id, at }, ...rest]), old: old?.id ?? null };
}

/** Retire la photo d'une salle ; rend { list, old }. */
export function removeVenuePhoto(list, name) {
  const cur = cleanVenuePhotos(list);
  const old = cur.find((x) => artistKey(x.name) === artistKey(name)) ?? null;
  return { list: cur.filter((x) => x !== old), old: old?.id ?? null };
}
