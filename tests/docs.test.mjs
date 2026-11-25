// v513 (mes réponses 25 et 25 ter C, maquette validée le 25 nov.) : Mes documents : mes PDF (téléphone, 20 Mo au plus) et mes liens
// (https) ; la liste toujours dans ma sauvegarde, jamais pour un proche ; les PDF seulement avec « Avec mes PDF » (décochée).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanDocs, mergeDocs, cleanUrl, sizeText, hostOf, pdfDataUrlToBlob, looksLikePdf, DOC_MAX_BYTES } from '../js/docs.js';
import { loadState, saveState, exportJSON, mergeImport, exportForFriend, backupHash } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('nettoyage : PDF et liens https seulement, noms courts, pas de doublon', () => {
  const l = cleanDocs([
    { id: 'doc-abc123', kind: 'pdf', name: '  Plan   familial ', size: 1200000, at: 1 },
    { id: 'doc-abc123', kind: 'pdf', name: 'doublon' },
    { id: 'doc-lien01', kind: 'link', name: 'Mairie', url: 'https://mairie11.paris.fr/crue' },
    { id: 'doc-lien02', kind: 'link', name: 'Piège', url: 'javascript:alert(1)' },
    { id: 'doc-lien03', kind: 'link', name: 'Http', url: 'http://exemple.fr' },
    { id: 'pirate', kind: 'pdf', name: 'x' }, { id: 'doc-zzzz', kind: 'exe', name: 'x' },
    { id: 'doc-big000', kind: 'pdf', name: 'Gros', size: DOC_MAX_BYTES + 1 },
  ]);
  assert.deepEqual(l.map((d) => d.id), ['doc-abc123', 'doc-lien01', 'doc-big000']);
  assert.equal(l[0].name, 'Plan familial');
  assert.equal(l[2].size, 0, 'taille impossible : non gardée');
  assert.equal(cleanUrl(' https://www.paris.fr/crue '), 'https://www.paris.fr/crue');
  assert.equal(sizeText(1200000), '1,1 Mo');
  assert.equal(sizeText(340 * 1024), '340 Ko');
  assert.equal(hostOf('https://www.paris.fr/crue'), 'paris.fr');
  assert.deepEqual(mergeDocs([{ id: 'doc-aaaa', kind: 'link', name: 'A', url: 'https://a.fr' }], [{ id: 'doc-aaaa', kind: 'link', name: 'B', url: 'https://b.fr' }, { id: 'doc-bbbb', kind: 'link', name: 'C', url: 'https://c.fr' }]).map((d) => d.name), ['A', 'C'], 'le téléphone garde les siens');
});

test('un vrai PDF seulement ; décodage d\'une sauvegarde', () => {
  assert.ok(looksLikePdf(new TextEncoder().encode('%PDF-1.7')));
  assert.ok(!looksLikePdf(new TextEncoder().encode('<html')));
  const b = pdfDataUrlToBlob(`data:application/pdf;base64,${btoa('%PDF-1.4 essai')}`);
  assert.equal(b.type, 'application/pdf');
  assert.equal(pdfDataUrlToBlob('data:image/png;base64,AAAA'), null);
});

test('sauvegarde : la liste oui ; fichier pour un proche : jamais', () => {
  let raw = null; const st = { getItem: () => raw, setItem: (_k, v) => { raw = v; } };
  const s0 = loadState(st);
  assert.deepEqual(s0.docs, []);
  const docs = [{ id: 'doc-abc123', kind: 'pdf', name: 'Plan familial', size: 1000, at: 5 }, { id: 'doc-lien01', kind: 'link', name: 'Mairie', url: 'https://mairie11.paris.fr/', at: 6 }];
  saveState(st, { ...s0, docs });
  const s1 = loadState(st);
  assert.deepEqual(s1.docs, docs);
  assert.deepEqual(JSON.parse(exportJSON(s1)).docs, docs);
  assert.notEqual(backupHash(s1), backupHash(s0));
  assert.ok(!JSON.stringify(exportForFriend(s1)).includes('Plan familial'));
  assert.deepEqual(mergeImport(s0, exportJSON(s1)).state.docs, docs);
});

test('page, case « Avec mes PDF » décochée, restauration, cache', () => {
  assert.match(app, /const withPdf = el\('input', \{ type: 'checkbox', class: 'check' \}\);/);
  assert.match(app, /if \(withPdf\) \{ \/\/ v513/);
  assert.match(app, /if \(!owner\) importDocFiles\(text\);/);
  assert.match(app, /'Mes documents'\), el\('span', \{ class: 'menu-sub' \}, docsSub\(\)\)/);
  assert.match(app, /Séisme : Paris est en zone de sismicité très faible \(1 sur 5, Géorisques\)\./);
  assert.match(sw, /'js\/docs\.js'/);
});

test('ma consigne du 25 nov. : rien ne se partage depuis Mes documents (gardés sur le téléphone seulement)', () => {
  const page = app.slice(app.indexOf('const docsNow ='), app.indexOf('/** v509 (18 A et B) : une fiche'));
  assert.doesNotMatch(page, /navigator\.share|shareLink|share-2/);
  assert.match(page, /rien ne se partage d\\'ici/);
});
