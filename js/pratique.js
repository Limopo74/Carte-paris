// Fontaines à boire et toilettes publiques : données ouvertes de la Ville de Paris (licence ODbL).
import { distanceM } from './geo.js';

const BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets';
export const DATASETS = {
  fontaines: 'fontaines-a-boire',
  toilettes: 'sanisettesparis',
};

export function exportUrl(kind) {
  return `${BASE}/${DATASETS[kind]}/exports/json`;
}

/** Position d'un enregistrement, quelle que soit la forme du champ géographique. */
function latLngOf(r) {
  const g = r?.geo_point_2d;
  if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) return { lat: g.lat, lng: g.lon };
  if (Array.isArray(g) && g.length === 2) return { lat: Number(g[0]), lng: Number(g[1]) };
  const c = r?.geo_shape?.geometry?.coordinates;
  if (Array.isArray(c) && c.length === 2 && typeof c[0] === 'number') return { lat: c[1], lng: c[0] };
  return null;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

/** Transforme la réponse en [{ lat, lng, label, detail, ok }], en écartant ce qui est illisible. */
export function parseRecords(json, kind) {
  const out = [];
  for (const r of Array.isArray(json) ? json : []) {
    const p = latLngOf(r);
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180) continue;
    if (kind === 'fontaines') {
      const num = str(r.no_voirie_pair) || str(r.no_voirie_impair);
      const street = [num, cap(str(r.voie))].filter(Boolean).join(' ');
      out.push({
        ...p,
        label: cap(str(r.modele)) || cap(str(r.type_objet)) || 'Fontaine',
        detail: [street, str(r.commune)].filter(Boolean).join(', '),
        ok: str(r.dispo).toUpperCase() !== 'NON',
      });
    } else {
      out.push({
        ...p,
        label: cap(str(r.type)) || 'Toilettes',
        detail: [str(r.adresse), str(r.horaire) ? `Horaires : ${str(r.horaire)}` : '', str(r.acces_pmr).toLowerCase() === 'oui' ? 'Accès fauteuil' : '']
          .filter(Boolean).join(' · '),
        ok: !/hors service|fermé/i.test(str(r.statut)),
      });
    }
  }
  return out;
}

/** Les `n` plus proches en état de marche : [{ item, d }]. */
export function nearestOf(items, here, n = 3) {
  return items
    .filter((i) => i.ok)
    .map((item) => ({ item, d: distanceM(here, item) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n);
}
