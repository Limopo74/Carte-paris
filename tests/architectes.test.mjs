import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanArch, archLine, sameAuthor, authorName, authorKey } from '../js/architectes.js';

const json = { items: [
  { r: 'PA00085808', t: 'Immeuble', a: ['Guimard Hector (architecte)'], d: '1898', lat: 48.8805, lng: 2.335 },
  { r: 'PA00086001', t: 'Castel Béranger', a: ['GUIMARD Hector (architecte)'], d: '1895, 1898', lat: 48.8527, lng: 2.2742 },
  { r: 'PA00086002', t: 'Synagogue', a: ['Guimard Hector (architecte)'], lat: 48.8554, lng: 2.3601 },
  { r: 'PA00086003', t: 'Sans position', a: ['Guimard Hector (architecte)'] },
  { r: 'PA00085836', t: 'Hôtel de Talleyrand', a: ['Chalgrin Jean-François (architecte)', 'Gabriel Jacques-Ange (architecte)', 'X Y (sculpteur)'], d: '1767', lat: 48.8668, lng: 2.3218 },
  { r: 'PA0008', a: ['Faux'] }, { r: 'PA00099999', a: [] }, null] };

test('auteur et date d\'un monument, et « du même auteur »', () => {
  const m = cleanArch(json);
  assert.equal(m.size, 5, 'référence et auteur obligatoires');
  assert.equal(archLine(m.get('PA00085808')), 'Guimard Hector (architecte) · 1898');
  assert.equal(archLine(m.get('PA00085836')), 'Chalgrin Jean-François (architecte), Gabriel Jacques-Ange (architecte)… · 1767', 'deux auteurs au plus');
  assert.equal(archLine(undefined), '');
  assert.equal(authorName('Guimard Hector (architecte)'), 'Guimard Hector');
  assert.equal(authorKey('GUIMARD Hector (architecte)'), authorKey('Guimard Hector (sculpteur)'));
  const same = sameAuthor(m, m.get('PA00085808'), { lat: 48.8812, lng: 2.3361 });
  assert.deepEqual(same.map((x) => x.r), ['PA00086002', 'PA00086001'], 'avec une position seulement, la plus proche d\'abord');
  assert.ok(same[0].m > 0); assert.equal(same[1].d, '1895, 1898', 'la date reste la date');
  assert.deepEqual(sameAuthor(m, m.get('PA00085836'), null).map((x) => x.r), [], 'le premier auteur seulement');
  assert.deepEqual(sameAuthor(new Map(), undefined, null), []);
});

test('« ou » et « dit » de la base Mérimée ne sont pas des auteurs (v244)', () => {
  const m = cleanArch({ items: [
    { r: 'PA00088880', t: 'Place de la Concorde', a: ['Gabriel Jacques-Ange', 'ou', 'Gabriel Ange-Jacques (architecte)', 'Hittorff Jacques Ignace (architecte)'], d: '1757', lat: 48.8656, lng: 2.3212 },
    { r: 'PA00088697', t: 'Hôtel de Biron', a: ['Gabriel Jacques-Ange', 'ou', 'Gabriel Ange-Jacques (architecte)'], lat: 48.855, lng: 2.3158 },
    { r: 'PA00086613', t: 'Pavillon suisse', a: ['Jeanneret Charles-Edouard', 'dit', 'Le Corbusier (architecte)', 'Jeanneret Pierre (architecte)'], d: '1931', lat: 48.819, lng: 2.337 },
    { r: 'PA00086591', t: 'Cité-refuge', a: ['Jeanneret Charles-Edouard', 'dit Le Corbusier (architecte)'], lat: 48.829, lng: 2.373 },
    { r: 'PA00086129', t: 'Hôtel Donon', a: ['Delorme Philibert', 'dit', "L'Orme Philibert de", "(maître d'œuvre)"] },
    { r: 'PA00088671', t: 'Penthemont', a: ['Contant Pierre', 'ou', 'Content Pierre', 'ou', 'Constant Pierre', 'dit'] },
    { r: 'PA00099998', a: ['ou', 'dit'] }] });
  assert.equal(archLine(m.get('PA00088880')), 'Gabriel Jacques-Ange (architecte), Hittorff Jacques Ignace (architecte) · 1757');
  assert.equal(archLine(m.get('PA00086613')), 'Jeanneret Charles-Edouard dit Le Corbusier (architecte), Jeanneret Pierre (architecte) · 1931');
  assert.equal(archLine(m.get('PA00086591')), 'Jeanneret Charles-Edouard dit Le Corbusier (architecte)');
  assert.equal(archLine(m.get('PA00086129')), "Delorme Philibert dit L'Orme Philibert de (maître d'œuvre)");
  assert.equal(archLine(m.get('PA00088671')), 'Contant Pierre', 'variantes et « dit » sans suite retirés');
  assert.ok(!m.has('PA00099998'), 'rien que « ou » et « dit » : pas d\'auteur');
  for (const x of m.values()) assert.ok(x.a.every((s) => !/^(ou|dit)\b/.test(s) && !s.startsWith('(')), x.r);
  assert.deepEqual(sameAuthor(m, m.get('PA00088880'), null).map((x) => x.r), ['PA00088697']);
  assert.deepEqual(sameAuthor(m, m.get('PA00086613'), null).map((x) => x.r), ['PA00086591'], 'Le Corbusier retrouvé par son premier nom');
});

test('le vrai fichier : plus aucun « ou » ni « dit » affiché comme auteur', async () => {
  const fs = await import('node:fs');
  const m = cleanArch(JSON.parse(fs.readFileSync(new URL('../data/architectes.json', import.meta.url))));
  for (const x of m.values()) assert.ok(x.a.every((s) => !/^(ou|dit)\b/.test(s) && !s.startsWith('(')), `${x.r} ${x.a}`);
});
