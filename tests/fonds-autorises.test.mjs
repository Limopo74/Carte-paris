// v388 (mon signalement du 24 nov. : « Plan IGN et Photo aérienne ne fonctionnent pas ») : la règle de sécurité de la page
// (Content-Security-Policy, img-src) doit autoriser le site de chaque fond de carte, sinon le téléphone refuse ses images.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const img = (/img-src ([^;]*);/.exec(html) ?? [])[1]?.split(/\s+/) ?? [];
const styles = app.slice(app.indexOf('const STYLE_INFO = {'), app.indexOf('};', app.indexOf('const STYLE_INFO = {')));
const hosts = new Set([...styles.matchAll(/url: `?'?(?:\$\{IGN_WMTS\}|https:\/\/([^/'`]+)\/)/g)].map((m) => m[1] ?? 'data.geopf.fr'));

test('chaque fond de carte a son site dans img-src', () => {
  assert.ok(hosts.size >= 4, [...hosts].join(' '));
  for (const h of hosts) {
    const list = h.startsWith('{s}.') ? ['a', 'b', 'c'].map((x) => h.replace('{s}', x)) : [h];
    for (const x of list) assert.ok(img.includes(`https://${x}`), `img-src doit contenir https://${x}`);
  }
  assert.ok(img.includes('https://data.geopf.fr'), 'Plan IGN et Photo aérienne');
});
