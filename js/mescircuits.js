// Mes circuits (Mes parcours, version 2) : un de mes parcours devenu circuit de visite, avec un titre, des thèmes et,
// si je veux, un texte par étape (mes mots, pas vérifiés). Gardés sur le téléphone et dans ma sauvegarde ;
// partagés par un lien (tout dans le #, rien ne passe par un serveur) ou dans le fichier pour un proche.
// Aucune dépendance au navigateur : testé par tests/mescircuits.test.mjs.
import { decodeTrace, CIRCUIT_THEMES } from './circuits.js';

export const MY_CIRCUITS_MAX = 30;
export const STEP_TEXT_MAX = 260;
const THEMES = new Set(CIRCUIT_THEMES.map(([k]) => k));
const ID = /^m-[a-z0-9]{4,30}$/;
const inParis = (lat, lng) => lat > 48.7 && lat < 49 && lng > 2.1 && lng < 2.6;
const txt = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const r5 = (x) => Math.round(x * 1e5) / 1e5;

/** Identifiant d'un de mes circuits (« m- » : jamais le même qu'un circuit de Claude). */
export const myCircuitId = () => `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Tracé [[lat, lng], …] → texte « polyline » (précision 5), le format des circuits de Claude (decodeTrace). */
export function encodeTrace(points) {
  let out = ''; let pa = 0; let pg = 0;
  const enc = (v) => {
    let x = v < 0 ? ~(v << 1) : v << 1; let s = '';
    while (x >= 0x20) { s += String.fromCharCode((0x20 | (x & 0x1f)) + 63); x >>= 5; }
    return s + String.fromCharCode(x + 63);
  };
  for (const [lat, lng] of points) {
    const a = Math.round(lat * 1e5); const g = Math.round(lng * 1e5);
    if (out && a === pa && g === pg) continue; // point en double
    out += enc(a - pa) + enc(g - pg); pa = a; pg = g;
  }
  return out;
}

/** Une étape lisible : { n, lat, lng, t? } ou null. */
function cleanEtape(e) {
  const lat = Number(e?.lat); const lng = Number(e?.lng); const n = txt(e?.n, 80);
  if (!n || !inParis(lat, lng)) return null;
  const t = txt(e.t, STEP_TEXT_MAX);
  return { n, lat: r5(lat), lng: r5(lng), ...(t ? { t } : {}) };
}

/** Mes circuits nettoyés : un titre, 2 à 20 étapes dans Paris, un tracé lisible, une longueur ; 30 au plus, les plus récents d'abord. */
export function cleanMyCircuits(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).map((c) => {
    const id = typeof c?.id === 'string' && ID.test(c.id) ? c.id : null;
    if (!id || seen.has(id)) return null;
    const etapes = (Array.isArray(c.etapes) ? c.etapes : []).map(cleanEtape).filter(Boolean).slice(0, 20);
    const tr = typeof c.tr === 'string' ? c.tr.slice(0, 20000) : '';
    const m = Number(c.m);
    if (!txt(c.titre, 80) || etapes.length < 2 || decodeTrace(tr).length < 2 || !(m > 0 && m < 50000)) return null;
    seen.add(id);
    const at = Number(c.at);
    return { id, titre: txt(c.titre, 80), themes: [...new Set((Array.isArray(c.themes) ? c.themes : []).filter((t) => THEMES.has(t)))],
      depart: txt(c.depart, 60), arrivee: txt(c.arrivee, 60), m: Math.round(m), at: Number.isFinite(at) && at > 0 ? at : 0, etapes, tr,
      ...(typeof c.from === 'string' && /^[\w-]{1,64}$/.test(c.from) ? { from: c.from } : {}),
      ...(txt(c.by, 40) ? { by: txt(c.by, 40) } : {}) }; // by : le prénom du proche qui me l'a envoyé
  }).filter(Boolean).sort((a, b) => b.at - a.at).slice(0, MY_CIRCUITS_MAX);
}

/** Un de mes circuits sous la forme d'un circuit de visite (pour la page, la carte, Balade guidée, « Je l'ai fait »). */
export const asCircuit = (c) => ({ id: c.id, titre: c.titre, quartier: '', themes: c.themes, depart: c.depart, arrivee: c.arrivee, m: c.m,
  confort: '', note: '', etapes: c.etapes, trace: decodeTrace(c.tr), mine: true });

/* ---------- Partage par lien ---------- */
const b64url = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)));

/** Lien vers un de mes circuits : titre, thèmes, étapes, tracé ; mes textes seulement si `withTexts` (choix 9C). */
export function myCircuitLink(base, c, withTexts = false) {
  const o = { v: 1, t: c.titre, h: c.themes, d: c.depart, a: c.arrivee, m: c.m, r: c.tr,
    s: c.etapes.map((e) => [e.n, e.lat, e.lng, ...(withTexts && e.t ? [e.t] : [])]) };
  return `${base.split('#')[0]}#circuit=${b64url(JSON.stringify(o))}`;
}
/** Le circuit d'un lien reçu (sans id : il en reçoit un s'il est ajouté), ou null. */
export function readMyCircuitLink(hash) {
  const m = /(?:^|[#&])circuit=([\w-]+)/.exec(hash ?? '');
  if (!m) return null;
  try {
    const o = JSON.parse(unb64url(m[1]));
    const [c] = cleanMyCircuits([{ id: 'm-recu', titre: o.t, themes: o.h, depart: o.d, arrivee: o.a, m: o.m, tr: o.r, at: 1,
      etapes: (Array.isArray(o.s) ? o.s : []).map(([n, lat, lng, t]) => ({ n, lat, lng, t })) }]);
    return c ?? null;
  } catch { return null; }
}
