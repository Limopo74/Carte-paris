// v406 (mes choix 3A 4A et 1A 2A 3A du 24 nov. 2026) : ajoute au plan des rues (data/rues.json) l'altitude du sol de
// chaque croisement, d'après l'IGN (RGE ALTI, Licence Ouverte), pour « ça monte de 40 m » (Mes parcours, Chemin à pied)
// et l'altitude de la page Météo et air. Le téléphone calcule tout ; rien de moi n'est envoyé (ici, le robot ne demande
// que les croisements du plan, des données publiques).
//
//   node tools/maj-altitudes.mjs data/rues.json [ANCIEN.json]
//
// Le champ `alt` : une valeur par croisement, en mètres entiers, écrite par écart avec la dernière connue ; null = inconnue.
// Un croisement qui ne touche que des ponts ou des tunnels (drapeau 8 de tools/maj-rues.py) n'a pas d'altitude : le
// modèle de l'IGN y donnerait l'eau ou les voies dessous (Pont au Change : 26,85 m, quai : 36 m, mesuré le 24 nov.).
// Les altitudes d'ANCIEN.json sont reprises pour les croisements au même endroit : seuls les nouveaux sont demandés.
// Jamais bloquant : sans réponse de l'IGN, le plan est écrit avec ce qui est connu (le téléphone ne dit alors rien là où
// une altitude manque) ; si le fichier est illisible, il n'est pas touché.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { igAltitudes } from './mesure-denivele.mjs';

export const OFFGROUND = 8;
export const SOURCE = 'IGN, RGE ALTI (Licence Ouverte)';

/** Les croisements du fichier en 1e-5 degré : [[lat5, lng5], …]. */
export function nodes5(doc) {
  const n = doc.nodes; const out = []; let a = 0; let g = 0;
  for (let i = 0; i < n.length; i += 2) { a += n[i]; g += n[i + 1]; out.push([a, g]); }
  return out;
}

/** Pour chaque croisement : touche-t-il au moins un tronçon au sol ? */
export function onGround(doc, N) {
  const g = new Uint8Array(N); let pa = 0;
  for (let i = 0; i < doc.ea.length; i++) {
    pa += doc.ea[i]; const a = pa; const b = pa + doc.eb[i];
    if (!(doc.ef[i] & OFFGROUND)) { g[a] = 1; g[b] = 1; }
  }
  return g;
}

/** Altitudes en clair (mètres entiers ou null) → champ `alt` (écarts avec la dernière connue). */
export function encodeAlt(z) {
  const out = []; let prev = 0;
  for (const v of z) {
    if (v === null || !Number.isFinite(v)) { out.push(null); continue; }
    out.push(v - prev); prev = v;
  }
  return out;
}
/** Le champ `alt` → altitudes en clair (null si absent ou de la mauvaise longueur). */
export function decodeAlt(a, N) {
  if (!Array.isArray(a) || a.length !== N) return null;
  const out = []; let z = 0;
  for (const d of a) { if (d === null || !Number.isFinite(d)) out.push(null); else { z += d; out.push(z); } }
  return out;
}

/** Les altitudes de l'ancien plan, rangées par endroit (« lat5,lng5 »). */
export function oldByPlace(old) {
  const m = new Map();
  if (!old || old.v !== 2 || !Array.isArray(old.nodes)) return m;
  const pts = nodes5(old); const z = decodeAlt(old.alt, pts.length);
  if (!z) return m;
  pts.forEach((p, i) => { if (z[i] !== null) m.set(`${p[0]},${p[1]}`, z[i]); });
  return m;
}

/** Ajoute `alt` au document. `getAlt(points [[lat, lng]]) → altitudes (null si pas de donnée)`, par paquets de 100 ;
 *  un paquet qui échoue est retenté deux fois, puis laissé inconnu ; après 20 paquets perdus d'affilée, on s'arrête. */
export async function addAltitudes(doc, getAlt, old = null, log = () => {}, wait = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const pts = nodes5(doc); const N = pts.length;
  const ground = onGround(doc, N);
  const prev = oldByPlace(old);
  const z = new Array(N).fill(null);
  const need = [];
  let reused = 0;
  for (let i = 0; i < N; i++) {
    if (!ground[i]) continue;
    const k = `${pts[i][0]},${pts[i][1]}`;
    if (prev.has(k)) { z[i] = prev.get(k); reused++; } else need.push(i);
  }
  let asked = 0; let lost = 0; let lostRow = 0;
  for (let s = 0; s < need.length; s += 100) {
    const part = need.slice(s, s + 100);
    let got = null;
    for (let t = 0; t < 3 && !got; t++) {
      try { got = await getAlt(part.map((i) => [pts[i][0] / 1e5, pts[i][1] / 1e5])); }
      catch (e) { if (t < 2) await wait(t ? 20000 : 5000); else log(`  paquet ${s / 100 + 1} perdu (${e?.message ?? e})`); }
    }
    asked += part.length;
    if (!got) { lost += part.length; if (++lostRow >= 20) { log('  l\'IGN ne répond plus : arrêt, le reste reste inconnu'); break; } continue; }
    lostRow = 0;
    part.forEach((i, j) => { const v = got[j]; z[i] = Number.isFinite(v) ? Math.round(v) : null; });
  }
  doc.alt = encodeAlt(z);
  doc.altsource = SOURCE;
  const known = z.filter((v) => v !== null).length;
  const groundN = ground.reduce((s, x) => s + x, 0);
  return { N, ground: groundN, offGround: N - groundN, reused, asked, lost, known, missing: groundN - known };
}

async function main([file, oldFile]) {
  let doc;
  try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch { console.log('Altitudes : plan illisible, rien de changé'); return; }
  if (doc?.v !== 2 || !Array.isArray(doc.nodes)) { console.log('Altitudes : plan inattendu, rien de changé'); return; }
  let old = null;
  if (oldFile) { try { old = JSON.parse(readFileSync(oldFile, 'utf8')); } catch { old = null; } }
  const t0 = Date.now();
  const r = await addAltitudes(doc, (pts) => igAltitudes(pts), old, (m) => console.log(m));
  const raw = Buffer.from(JSON.stringify(doc));
  writeFileSync(`${file}.tmp`, raw); renameSync(`${file}.tmp`, file);
  console.log(`Altitudes (${SOURCE}) : ${r.N} croisements, ${r.ground} au sol, ${r.offGround} seulement sur des ponts ou tunnels (sans altitude) ;`);
  console.log(`  reprises de l'ancien plan : ${r.reused} ; demandées à l'IGN : ${r.asked} (perdues : ${r.lost}) ; inconnues au sol : ${r.missing} ; ${Math.round((Date.now() - t0) / 1000)} s`);
  console.log(`  POIDS : ${(raw.length / 1e6).toFixed(2)} Mo tel quel, ${(gzipSync(raw, { level: 9 }).length / 1e6).toFixed(2)} Mo compressé`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((e) => console.log(`Altitudes : arrêt (${e?.message ?? e}), plan d'avant gardé`)).finally(() => process.exit(0));
}
