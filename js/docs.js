/* v513 (mes réponses 25 et 25 ter C, maquette validée le 25 nov. 2026) : « Mes documents », en bas des fiches « Les bons gestes » :
   mes PDF et mes liens, ajoutés par moi (aucun site proposé par l'appli). Les PDF restent sur ce téléphone (base locale, comme les
   photos), 20 Mo au plus chacun, jamais chez un proche. La sauvegarde garde toujours la liste (noms, liens) ; les fichiers
   seulement avec la case « Avec mes PDF », décochée au départ. */

export const DOC_MAX_BYTES = 20 * 1024 * 1024;
export const DOCS_MAX = 40;
const NAME_MAX = 80;

const cleanName = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
/** Lien accepté : https seulement (un lien http ou javascript: n'est pas gardé). */
export const cleanUrl = (u) => { try { const x = new URL(String(u ?? '').trim()); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };

/** [{ id, kind: 'pdf' | 'link', name, url (lien), size (octets, PDF), at }] : nettoyée, sans doublon d'identifiant. */
export function cleanDocs(list) {
  const out = []; const seen = new Set();
  for (const d of Array.isArray(list) ? list : []) {
    const id = typeof d?.id === 'string' && /^doc-[a-z0-9-]{4,60}$/.test(d.id) ? d.id : null;
    const name = cleanName(d?.name);
    if (!id || !name || seen.has(id)) continue;
    const at = Number.isFinite(d.at) ? d.at : 0;
    if (d.kind === 'link') { const url = cleanUrl(d.url); if (url) out.push({ id, kind: 'link', name, url, at }); }
    else if (d.kind === 'pdf') { const size = Number.isFinite(d.size) && d.size > 0 && d.size <= DOC_MAX_BYTES ? Math.round(d.size) : 0; out.push({ id, kind: 'pdf', name, size, at }); }
    else continue;
    seen.add(id);
    if (out.length >= DOCS_MAX) break;
  }
  return out;
}
/** Restauration de ma sauvegarde : ceux du téléphone restent, ceux du fichier s'ajoutent (rien de remplacé). */
export const mergeDocs = (mine, file) => cleanDocs([...cleanDocs(mine), ...cleanDocs(file)]);
export const newDocId = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
/** « 1,2 Mo », « 340 Ko » */
export function sizeText(n) {
  if (!(n > 0)) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} Ko`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',').replace(',0', '')} Mo`;
}
/** Le nom de domaine d'un lien, pour la petite ligne : « mairie11.paris.fr ». */
export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
/** Un PDF lu depuis une sauvegarde (data:application/pdf;base64,…) → Blob, ou null. Décodé ici (la CSP refuse fetch(data:)). */
export function pdfDataUrlToBlob(url) {
  const m = typeof url === 'string' ? /^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/.exec(url) : null;
  if (!m) return null;
  const bin = atob(m[1]); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (bytes.length > DOC_MAX_BYTES) return null;
  return new Blob([bytes], { type: 'application/pdf' });
}
/** Les 5 premiers octets d'un vrai PDF : « %PDF- ». */
export const looksLikePdf = (bytes) => bytes?.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
