// Période de test (v313) : le porte-voix, une remarque, envoyée par le menu de partage ; sans position. Dans ma sauvegarde depuis la v380.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEST_KEY, REMARK_KINDS, REMARKS_MAX, REMARK_TEXT_MAX, remarkLabel, cleanRemark, cleanRemarks, readTest, addRemark, markSent, platformInfo, contextLine, remarksText } from '../js/remarques.js';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const store = readFileSync(new URL('../js/store.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const AT = new Date(2026, 10, 20, 18, 40).getTime();
const rq = (over = {}) => ({ id: 'rq-a', k: 'complique', t: 'Je ne trouve pas où on change la station Maison', s: 'Réglages', w: 'settings', c: 'Version 313 · texte Normal', at: AT, ...over });

test('une remarque : type connu, date valable, aucun autre champ (ni position)', () => {
  const r = cleanRemark({ ...rq(), lat: 48.85, lng: 2.35, pos: [1, 2] });
  assert.deepEqual(Object.keys(r).sort(), ['at', 'c', 'id', 'k', 's', 'sent', 't', 'w']);
  assert.equal(cleanRemark(rq({ k: 'inconnu' })), null);
  assert.equal(cleanRemark(rq({ at: 'hier' })), null);
  assert.equal(cleanRemark(rq({ t: 'x'.repeat(2000) })).t.length, REMARK_TEXT_MAX);
  assert.equal(cleanRemark(rq({ s: '' })).s, 'la carte');
  for (const [k] of REMARK_KINDS) assert.notEqual(remarkLabel(k), '');
});

test('les remarques : de la plus récente, sans doublon, 100 au plus ; un contenu abîmé repart éteint', () => {
  const list = cleanRemarks([rq(), rq({ id: 'rq-b', at: AT + 1 }), rq()]);
  assert.deepEqual(list.map((r) => r.id), ['rq-b', 'rq-a']);
  assert.equal(cleanRemarks(Array.from({ length: 150 }, (_, i) => rq({ id: `rq-${i}`, at: AT + i }))).length, REMARKS_MAX);
  assert.deepEqual(readTest('{abîmé'), { on: false, remarks: [] });
  assert.deepEqual(readTest(null), { on: false, remarks: [] });
  const t = addRemark(readTest(JSON.stringify({ on: true, remarks: [rq()] })), rq({ id: 'rq-c', at: AT + 5 }));
  assert.equal(t.on, true);
  assert.deepEqual(t.remarks.map((r) => r.id), ['rq-c', 'rq-a']);
  assert.deepEqual(markSent(t, ['rq-a']).remarks.map((r) => r.sent), [false, true]);
});

test('Android seulement quand Chrome le donne vraiment ; jamais le « Android 10 » du texte réduit', () => {
  const ua = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
  assert.deepEqual(platformInfo(null, ua), { chrome: '131' });
  assert.deepEqual(platformInfo({ platform: 'Android', platformVersion: '14.0.0', fullVersionList: [{ brand: 'Not A Brand', version: '99' }, { brand: 'Google Chrome', version: '131.0.6778.81' }] }, ua), { android: '14', chrome: '131' });
  assert.deepEqual(platformInfo({ platform: 'Windows', platformVersion: '15.0.0' }, ua), { chrome: '131' });
  assert.equal(contextLine({ version: '313', size: 'Très grand', side: 'left', chrome: '131' }), 'Version 313 · texte Très grand · boutons à gauche · Chrome 131');
  assert.equal(contextLine({}), '');
});

test('le texte envoyé : prêt à coller pour Claude, de la plus ancienne', () => {
  const t = remarksText([rq({ id: 'rq-b', k: 'marche', t: '', c: '', at: AT + 60000 }), rq()]).split('\n');
  assert.equal(t[0], '2 remarques sur « Ma carte de Paris » (période de test) :');
  assert.equal(t[1], '- Trop compliqué · sur : Réglages [settings] · 20 novembre 2026, 18h40');
  assert.equal(t[2], '  « Je ne trouve pas où on change la station Maison »');
  assert.equal(t[3], '  Version 313 · texte Normal');
  assert.equal(t[4], '- Ne marche pas ou faux · sur : Réglages [settings] · 20 novembre 2026, 18h41');
  assert.equal(t.length, 5);
  assert.match(remarksText([rq()]), /^Remarque sur « Ma carte de Paris »/);
  assert.equal(remarksText([]), '');
});

test('rangé à part, jamais dans store.js (donc jamais dans le fichier pour un proche ; ma sauvegarde les ajoute dans app.js, v380)', () => {
  assert.equal(TEST_KEY, 'carte-paris.test');
  assert.doesNotMatch(store, /remarques|carte-paris\.test|testState/);
});

test('dans l\'appli : porte-voix caché au départ, sous la barre du haut, au-dessus des pages ; lien ?test lu avant le lancement', () => {
  assert.match(html, /<button type="button" id="btnRemark" class="map-btn remark-btn" hidden/);
  assert.match(css, /\.map-btn\.remark-btn \{ position: fixed; right: 10px; top: 68px; z-index: 810;/);
  assert.match(css, /body:has\(\.remark-btn:not\(\[hidden\]\)\) \.sheet\.tall \{ max-height: min\(85vh, calc\(100vh - 122px\)\); \}/, 'une page en grand ne passe jamais sous le porte-voix');
  const link = app.indexOf("new URLSearchParams(location.search).has('test')");
  assert.ok(link > 0 && link < app.indexOf('runLaunchAction();\n'), 'lu avant que runLaunchAction n\'efface l\'adresse');
  // Réglages : tout en bas, juste avant mes réglages par défaut
  const sw = app.indexOf("onOff('test', 'megaphone', 'Période de test'");
  assert.ok(sw > app.indexOf("row('camera', 'Vu en passant'") && sw < app.indexOf('mySettingsBlock(),', sw));
  assert.match(app, /'Part avec : la version, cet écran, la taille du texte, Android et Chrome\. Jamais ta position\.'/);
  assert.doesNotMatch(app.slice(app.indexOf('function openRemark()'), app.indexOf('function openRemarks(')), /myPos|lastFix|coords|getCurrentPosition/, 'aucune position dans une remarque');
});
