// Mon planning (v285) : le moment « Après-midi » tient sur une ligne dans la colonne de l'heure (avant : « Après- / midi »,
// mesuré à 360 px en Normal, Grand et Très grand). Les dates de Mon journal gardent leur colonne étroite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARTS } from '../js/planning.js';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const rule = (sel) => { const m = new RegExp(`(?:^|\\n)${sel.replace(/\./g, '\\.')} \\{([^}]*)\\}`).exec(css); return m ? m[1] : ''; };

test('Colonne de l\'heure : une seule ligne, assez large pour le plus long moment', () => {
  const r = rule('.plan-time');
  assert.match(r, /white-space: nowrap/);
  const em = Number(/max-width: ([\d.]+)em/.exec(r)?.[1]);
  const longest = Math.max(...Object.values(PARTS).map((p) => p.label.length));
  assert.equal(longest, 'Après-midi'.length);
  assert.ok(em >= 6, `max-width ${em} em : « Après-midi » en gras mesure 5,6 em`);
});

test('Dates de Mon journal : colonne étroite, retour à la ligne permis (date et étoiles)', () => {
  const r = rule('.plan-time.passage-date');
  assert.match(r, /white-space: normal/);
  assert.match(r, /max-width: 4\.8em/);
});
