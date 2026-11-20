// v307 (mes choix du 20 nov.) : exporter mes photos Vu en passant, sur le téléphone, sans serveur.
// Un dossier compressé (.zip, sans compression) : chaque photo en JPEG avec sa position, sa date et sa ligne remises
// dedans (EXIF), et un tableau (CSV, « ; », lisible par un tableur). Fonctions sans interface : tests/export-vu.test.mjs.

const enc = new TextEncoder();

/* ---------- EXIF : position (GPS), date et ligne, écrits dans un segment APP1 juste après le début du JPEG ---------- */

/** Degrés décimaux → trois rationnels (degrés, minutes, secondes au centième). */
function dms(x) {
  const a = Math.abs(x);
  const d = Math.floor(a);
  const mf = (a - d) * 60;
  const m = Math.floor(mf);
  const s = Math.round((mf - m) * 60 * 10000);
  return [[d, 1], [m, 1], [s, 10000]];
}
/** « 2026:11:20 15:07:00 », l'heure du téléphone (EXIF n'a pas de fuseau). */
export function exifDate(t) {
  const d = new Date(t);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${z(d.getMonth() + 1)}:${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

/**
 * Le segment APP1 « Exif » : IFD0 (ImageDescription, DateTime, pointeurs Exif et GPS), sous-IFD Exif (DateTimeOriginal),
 * IFD GPS (version, latitude, longitude). Gros-boutiste (« MM »). `lat`/`lng` absents : pas de position.
 */
export function exifSegment({ lat = null, lng = null, date = null, text = '' } = {}) {
  const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
  const desc = enc.encode(`${String(text ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200)}\0`);
  const dt = date ? enc.encode(`${exifDate(date)}\0`) : null;
  // Entrées : [tag, type, count, valeur (octets) ou nombre (LONG/SHORT)]
  const ifd0 = [];
  if (desc.length > 1) ifd0.push([0x010e, 2, desc.length, desc]);
  if (dt) ifd0.push([0x0132, 2, dt.length, dt]);
  ifd0.push([0x8769, 4, 1, 'exif']);
  if (hasGps) ifd0.push([0x8825, 4, 1, 'gps']);
  const exif = dt ? [[0x9003, 2, dt.length, dt]] : [];
  const rat = (list) => { const b = new Uint8Array(list.length * 8); const v = new DataView(b.buffer); list.forEach(([n, d], i) => { v.setUint32(i * 8, n); v.setUint32(i * 8 + 4, d); }); return b; };
  const gps = hasGps ? [
    [0x0000, 1, 4, new Uint8Array([2, 3, 0, 0])],
    [0x0001, 2, 2, enc.encode(lat >= 0 ? 'N\0' : 'S\0')],
    [0x0002, 5, 3, rat(dms(lat))],
    [0x0003, 2, 2, enc.encode(lng >= 0 ? 'E\0' : 'W\0')],
    [0x0004, 5, 3, rat(dms(lng))],
  ] : [];
  // Mise en place : en-tête TIFF (8) puis chaque IFD (2 + 12 n + 4) suivi de ses valeurs longues
  const sizeOf = (ifd) => 2 + ifd.length * 12 + 4 + ifd.reduce((n, e) => n + (e[3] instanceof Uint8Array && e[3].length > 4 ? e[3].length + (e[3].length % 2) : 0), 0);
  const at = { ifd0: 8 };
  at.exif = at.ifd0 + sizeOf(ifd0);
  at.gps = at.exif + sizeOf(exif);
  const tiffLen = at.gps + (hasGps ? sizeOf(gps) : 0);
  const tiff = new Uint8Array(tiffLen);
  const v = new DataView(tiff.buffer);
  tiff.set([0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8]);
  const write = (ifd, start) => {
    v.setUint16(start, ifd.length);
    let extra = start + 2 + ifd.length * 12 + 4;
    ifd.forEach(([tag, type, count, val], i) => {
      const e = start + 2 + i * 12;
      v.setUint16(e, tag); v.setUint16(e + 2, type); v.setUint32(e + 4, count);
      if (typeof val === 'string') v.setUint32(e + 8, at[val]);
      else if (val.length <= 4) tiff.set(val, e + 8);
      else { v.setUint32(e + 8, extra); tiff.set(val, extra); extra += val.length + (val.length % 2); }
    });
    v.setUint32(start + 2 + ifd.length * 12, 0); // pas d'IFD suivant
  };
  write(ifd0, at.ifd0);
  write(exif, at.exif);
  if (hasGps) write(gps, at.gps);
  const seg = new Uint8Array(4 + 6 + tiff.length);
  const sv = new DataView(seg.buffer);
  sv.setUint16(0, 0xffe1); sv.setUint16(2, 2 + 6 + tiff.length);
  seg.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
  seg.set(tiff, 10);
  return seg;
}

/** Le JPEG avec son segment Exif (un Exif déjà présent est remplacé). Renvoie un nouveau tableau d'octets. */
export function jpegWithExif(bytes, meta) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error('Ce n\'est pas une photo JPEG.');
  // retirer les APP1 existants en tête de fichier
  let off = 2;
  const keep = [];
  while (off + 4 <= b.length && b[off] === 0xff && b[off + 1] >= 0xe0 && b[off + 1] <= 0xef) {
    const len = (b[off + 2] << 8) | b[off + 3];
    if (b[off + 1] !== 0xe1) keep.push(b.subarray(off, off + 2 + len));
    off += 2 + len;
  }
  const seg = exifSegment(meta);
  const head = keep.reduce((n, x) => n + x.length, 0);
  const out = new Uint8Array(2 + head + seg.length + (b.length - off));
  out.set([0xff, 0xd8]);
  let o = 2;
  for (const x of keep) { out.set(x, o); o += x.length; } // APP0 (JFIF) d'abord, comme il se doit
  out.set(seg, o); o += seg.length;
  out.set(b.subarray(off), o);
  return out;
}

/* ---------- ZIP sans compression (les JPEG sont déjà compressés) ---------- */

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(bytes) { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const dosTime = (d) => ({ time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() });

/** `files` : [{ name, bytes }] → les octets du .zip (noms en UTF-8). */
export function zipStore(files, when = new Date()) {
  const { time, date } = dosTime(when);
  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = f.bytes instanceof Uint8Array ? f.bytes : enc.encode(String(f.bytes));
    const crc = crc32(data);
    const h = new Uint8Array(30 + name.length); const hv = new DataView(h.buffer);
    hv.setUint32(0, 0x04034b50, true); hv.setUint16(4, 20, true); hv.setUint16(6, 0x0800, true); hv.setUint16(8, 0, true);
    hv.setUint16(10, time, true); hv.setUint16(12, date, true); hv.setUint32(14, crc, true); hv.setUint32(18, data.length, true); hv.setUint32(22, data.length, true);
    hv.setUint16(26, name.length, true); hv.setUint16(28, 0, true); h.set(name, 30);
    const c = new Uint8Array(46 + name.length); const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); c.set(name, 46);
    parts.push(h, data); central.push(c);
    offset += h.length + data.length;
  }
  const cSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22); const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cSize, true); ev.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, x) => n + x.length, 0));
  let o = 0; for (const x of all) { out.set(x, o); o += x.length; }
  return out;
}

/* ---------- Le tableau ---------- */

/** Un nom de fichier sûr et lisible : « 003-porte-bleue.jpg ». */
export function photoFileName(i, name) {
  const slug = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
  return `${String(i + 1).padStart(3, '0')}-${slug}.jpg`;
}
const cell = (x) => { const t = String(x ?? '').replace(/\r?\n/g, ' '); return /[;"\n]/.test(t) || /^[=+\-@]/.test(t) ? `"${(/^[=+\-@]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"` : t; };
export const CSV_HEAD = ['Photo', 'Nom', 'Ma ligne', 'Date', 'Heure', 'Catégorie', 'Sous-catégorie', 'Artiste', 'Listes', 'Étoiles', 'Adresse', 'Arrondissement', 'Latitude', 'Longitude', 'Google Maps'];
/** `rows` : [{ file, name, note, at, cat, sub, artist, lists, stars, address, arr, lat, lng }] → texte CSV (« ; », BOM pour les tableurs). */
export function csvText(rows) {
  const z = (n) => String(n).padStart(2, '0');
  const lines = rows.map((r) => {
    const d = new Date(r.at);
    const pos = Number.isFinite(r.lat) && Number.isFinite(r.lng);
    return [r.file, r.name, r.note, `${z(d.getDate())}/${z(d.getMonth() + 1)}/${d.getFullYear()}`, `${z(d.getHours())}:${z(d.getMinutes())}`, r.cat, r.sub, r.artist, (r.lists ?? []).join(', '),
      r.stars || '', r.address, r.arr ? `${r.arr}e` : '', pos ? r.lat.toFixed(6) : '', pos ? r.lng.toFixed(6) : '', pos ? `https://www.google.com/maps/search/?api=1&query=${r.lat.toFixed(6)},${r.lng.toFixed(6)}` : ''].map(cell).join(';');
  });
  return `﻿${[CSV_HEAD.join(';'), ...lines].join('\r\n')}\r\n`;
}
