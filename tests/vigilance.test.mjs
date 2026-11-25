// v511 (ma réponse 9 B, mes choix A et A du 25 nov.) : vigilance Météo-France à Paris avec MA clé ; orange et rouge seulement
// dans la pastille ; rien si la carte est trop vieille ou bizarre ; la clé reste sur le téléphone (ni GitHub, ni sauvegarde).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readVigi, vigiShort, vigiText, validVigiKey, VIGI_URL, VIGI_KEY } from '../js/vigilance.js';
import { exportJSON, loadState } from '../js/store.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const T = Date.parse('2026-11-25T15:00:00Z');
const carte = (dom = '75', color = 3, items = [{ phenomenon_id: '3', phenomenon_max_color_id: 3 }, { phenomenon_id: '1', phenomenon_max_color_id: 2 }], upd = '2026-11-25T14:00:00Z') => ({ product: {
  update_time: upd, periods: [
    { echeance: 'J', begin_validity_time: '2026-11-24T23:00:00Z', end_validity_time: '2026-11-25T23:00:00Z', timelaps: { domain_ids: [{ domain_id: '92', max_color_id: 4, phenomenon_items: [] }, { domain_id: dom, max_color_id: color, phenomenon_items: items }] } },
    { echeance: 'J1', begin_validity_time: '2026-11-25T23:00:00Z', end_validity_time: '2026-11-26T23:00:00Z', timelaps: { domain_ids: [{ domain_id: '75', max_color_id: 4, phenomenon_items: [{ phenomenon_id: '6', phenomenon_max_color_id: 4 }] }] } },
  ] } });

test('lecture : Paris, la période en cours, orange et rouge seulement', () => {
  const v = readVigi(carte(), T);
  assert.deepEqual(v, { color: 3, risks: [{ name: 'orages', color: 3 }], at: Date.parse('2026-11-25T14:00:00Z') });
  assert.equal(vigiShort(v), 'Orages');
  assert.equal(vigiText(v), 'Vigilance orange à Paris : orages.');
  assert.equal(readVigi(carte(), Date.parse('2026-11-26T01:00:00Z')).color, 4, 'demain devient aujourd\'hui');
  assert.equal(readVigi(carte('75', 2, []), T).risks.length, 0, 'jaune : aucun danger affiché');
  const two = readVigi(carte('75', 4, [{ phenomenon_id: 3, phenomenon_max_color_id: 3 }, { phenomenon_id: 6, phenomenon_max_color_id: 4 }]), T);
  assert.equal(vigiShort(two), 'Canicule +1', 'le plus fort d\'abord');
});

test('pas d\'information plutôt qu\'une fausse', () => {
  assert.equal(readVigi(carte('75', 3, [], '2026-11-24T05:00:00Z'), T), null, 'plus de 30 h');
  assert.equal(readVigi(carte('13'), T), null, 'Paris absent');
  assert.equal(readVigi(carte('75', 9), T), null, 'couleur inconnue');
  assert.equal(readVigi({}, T), null);
  assert.equal(readVigi(null, T), null);
});

test('la clé : sur le téléphone seulement ; appel déclaré à la page ; orange et rouge dans la pastille', () => {
  assert.ok(validVigiKey('a'.repeat(40)) && !validVigiKey('court') && !validVigiKey('a b c d e f g h i j k l m n'));
  assert.equal(VIGI_URL, 'https://public-api.meteofrance.fr/public/DPVigilance/v1/cartevigilance/encours');
  assert.match(html, /connect-src[^;]*https:\/\/public-api\.meteofrance\.fr/);
  assert.match(app, /headers: \{ apikey: k, accept: 'application\/json' \}/);
  assert.match(app, /const vg = vigi\?\.color >= 3 \? vigi : null;/);
  assert.ok(!exportJSON(loadState({ getItem: () => null, setItem() {} })).includes(VIGI_KEY), 'jamais dans la sauvegarde');
});
