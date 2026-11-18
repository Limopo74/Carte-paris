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
