#!/usr/bin/env node
// Range dans l'appli les œuvres dans la rue et les galeries de Paris (OpenStreetMap, licence ODbL), v170.
// Le téléphone ne demande plus rien à OpenStreetMap : le robot des données envoie ces deux demandes une fois par mois.
//
// Usage, depuis la racine du dépôt :
//   node tools/maj-art.mjs demandes DOSSIER                  écrit DOSSIER/q-oeuvres.txt et DOSSIER/q-galeries.txt
//   node tools/maj-art.mjs OEUVRES.json GALERIES.json AAAA-MM-JJ   refait data/oeuvres.json et data/galeries.json
//
// Une réponse absente, illisible, coupée par le serveur (« remark » d'erreur), trop petite ou qui perd plus de 20 %
// des éléments ne remplace jamais la liste d'avant : l'appli garde l'ancienne. Ce script ne fait jamais échouer le robot.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { STREET_ART_QUERY, STREET_ART_TAGS, parseStreetArt, GALLERIES_QUERY, GALLERY_TAGS, parseGalleries } from '../js/art.js';

export const MIN_ITEMS = 100; // tout Paris : bien plus attendus pour l'un comme pour l'autre
export const SOURCE = 'OpenStreetMap (© les contributeurs d\'OpenStreetMap, licence ODbL)';
export const KINDS = {
  oeuvres: { file: 'data/oeuvres.json', query: STREET_ART_QUERY, tags: STREET_ART_TAGS, parse: parseStreetArt },
  galeries: { file: 'data/galeries.json', query: GALLERIES_QUERY, tags: GALLERY_TAGS, parse: parseGalleries },
};

const round = (x) => (Number.isFinite(x) ? Math.round(x * 1e6) / 1e6 : undefined);

/** Ne garde de chaque élément que ce que l'appli lit, et seulement les éléments qu'elle accepte. */
export function slim(json, kind) {
  const { tags, parse } = KINDS[kind];
  const out = [];
  for (const e of Array.isArray(json?.elements) ? json.elements : []) {
    const t = {};
    for (const k of tags) if (typeof e?.tags?.[k] === 'string') t[k] = e.tags[k];
    const x = { type: e?.type, id: e?.id, tags: t };
    if (Number.isFinite(e?.lat)) { x.lat = round(e.lat); x.lon = round(e.lon); } else if (e?.center) x.center = { lat: round(e.center.lat), lon: round(e.center.lon) };
    if (parse({ elements: [x] }).length === 1) out.push(x);
  }
  return out;
}

/** Motif de refus de la nouvelle liste, ou '' si elle peut remplacer l'ancienne. */
export function refusal(json, n, before) {
  const remark = typeof json?.remark === 'string' ? json.remark : '';
  if (/error|timed out|timeout/i.test(remark)) return `réponse coupée par le serveur (${remark.slice(0, 120)})`;
  if (n < MIN_ITEMS) return `${n} éléments (au moins ${MIN_ITEMS} attendus)`;
  if (before && n < before * 0.8) return `${n} éléments contre ${before} avant (perte de plus de 20 %)`;
  return '';
}

const readJson = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };

function update(kind, src, today) {
  const { file, parse } = KINDS[kind];
  const before = parse(readJson(file)).length;
  const json = readJson(src);
  if (!json) { console.log(`${kind} : pas de réponse lisible, la liste d'avant reste (${before})`); return; }
  const elements = slim(json, kind);
  const n = parse({ elements }).length;
  const why = refusal(json, n, before);
  if (why) { console.log(`${kind} : refusé, ${why} ; la liste d'avant reste (${before})`); return; }
  writeFileSync(file, JSON.stringify({ source: SOURCE, updated: today, elements }));
  console.log(`${kind} : ${n} gardés (avant : ${before})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [a, b, c] = process.argv.slice(2);
  if (a === 'demandes') {
    for (const [kind, { query }] of Object.entries(KINDS)) writeFileSync(`${b}/q-${kind}.txt`, query);
  } else if (a && b && /^\d{4}-\d{2}-\d{2}$/.test(c ?? '')) {
    update('oeuvres', a, c);
    update('galeries', b, c);
  } else {
    console.log('Usage : node tools/maj-art.mjs demandes DOSSIER | OEUVRES.json GALERIES.json AAAA-MM-JJ');
    process.exit(2);
  }
}
