// Contrôle des écrans de « Ma carte de Paris » : axe (contraste compris), cibles de moins de 44 px,
// erreurs JavaScript, et une capture par écran (fiche entière, défilée).
// Lancement : voir tools/README.md. Ne fait pas partie de `npm test` (il faut un navigateur).
//
//   node tools/controle-ecrans.mjs                     → 360 et 412 px, clair et sombre, tous les écrans
//   ECRANS=fiche,sorties THEMES=dark node tools/controle-ecrans.mjs
//   URL=http://localhost:8765/ SORTIE=captures node tools/controle-ecrans.mjs
//
// Rien ne part sur Internet : les fonds de carte et les services sont coupés, l'agenda de Sorties est simulé.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const URL_APPLI = process.env.URL || 'http://localhost:8765/';
const SORTIE = process.env.SORTIE || 'captures';
const LARGEURS = (process.env.LARGEURS || '360x740,412x860').split(',').map((s) => s.split('x').map(Number));
const THEMES = (process.env.THEMES || 'light,dark').split(',');
mkdirSync(SORTIE, { recursive: true });

const now = Date.now();
const lieu = (id, name, lat, lng, extra = {}) => ({ id, name, lat, lng, address: '16 rue Chaptal, 75009 Paris', hours: 'Mo-Su 09:00-23:00', created: now - 864e5 * 10, ...extra });
const LIEUX = [
  lieu('a', 'Musée de la Vie romantique', 48.8818, 2.3337, { fav: true, stars: 4, note: 'Le jardin et son salon de thé, au calme.', ticket: { at: now + 3 * 3600e3 } }),
  lieu('b', 'Café des Deux Moulins', 48.8848, 2.3335),
  lieu('c', 'Square d\'Anvers', 48.8829, 2.3446, { done: true, covered: true }),
  lieu('d', 'Librairie Les Abbesses', 48.8845, 2.3380),
  lieu('e', 'Marché Saint-Quentin', 48.8774, 2.3567),
];
const iso = (t) => new Date(t).toISOString();
const AGENDA = [
  ['Concert de jazz au square', 48.8800, 2.3360, 'Concerts -> Jazz'], ['Exposition photo : Paris la nuit', 48.8810, 2.3290, 'Expositions -> Photographie'],
  ['Brocante de la rue des Martyrs', 48.8790, 2.3390, 'Brocante'], ['Atelier dessin en famille', 48.8770, 2.3320, 'Enfants'],
  ['Balade commentée Pigalle', 48.8820, 2.3370, 'Balade urbaine'],
].map(([title, lat, lon, tags], i) => ({ title, lat_lon: { lat, lon }, date_start: iso(now - 3600e3), date_end: iso(now + (2 + i) * 3600e3),
  address_name: 'Paris 9e', address_street: 'rue des Martyrs', address_zipcode: '75009', address_city: 'Paris', price_type: i % 2 ? 'gratuit' : 'payant', qfap_tags: tags, url: 'https://quefaire.paris.fr/' }));

const feuille = (p) => p.locator('#sheet');
const ECRANS = {
  carte: async () => {},
  fiche: async (p) => { await p.locator('.leaflet-marker-icon').first().click(); await p.waitForSelector('#sheet .go-bar'); },
  autour: async (p) => { await p.locator('#btnNear').click(); await p.waitForTimeout(900); },
  sorties: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); },
  chercher: async (p) => { await p.locator('#btnSearch').click(); await feuille(p).locator('input').first().fill('Mus'); await p.waitForTimeout(600); },
  nouveau: async (p) => { await p.locator('#btnAdd').click(); },
  reglages: async (p) => { await p.locator('#btnSettings').click(); },
  application: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Application' }).click(); },
  aide: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Aide' }).first().click(); await feuille(p).locator('.help-item summary').first().click(); },
};
const choisis = (process.env.ECRANS || Object.keys(ECRANS).join(',')).split(',');

const b = await chromium.launch();
const lignes = []; let defauts = 0;
for (const [vw, vh] of LARGEURS) for (const theme of THEMES) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, geolocation: { latitude: 48.8812, longitude: 2.3361 }, permissions: ['geolocation'], colorScheme: theme, serviceWorkers: 'block', bypassCSP: true });
  const page = await ctx.newPage(); const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  await page.route(/opendata\.paris\.fr/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AGENDA) }));
  await page.route(/tile|cartocdn|openstreetmap|open-meteo|wikidata|overpass|nominatim|geopf|wikipedia|velib|smoove/, (r) => r.abort());
  await page.goto(URL_APPLI);
  await page.evaluate((pts) => localStorage.setItem('carte-paris.v1', JSON.stringify({ points: pts, layoutV: 3 })), LIEUX);
  for (const nom of choisis) {
    await page.setViewportSize({ width: vw, height: vh });
    await page.goto(URL_APPLI); await page.waitForTimeout(600);
    if (await page.locator('#sheet:not([hidden])').count()) await page.locator('#sheetClose').click();
    try { await ECRANS[nom](page); } catch (e) { lignes.push(`${vw} ${theme} ${nom} : ouverture impossible (${e.message.split('\n')[0]})`); defauts++; continue; }
    await page.waitForTimeout(400);
    await page.addScriptTag({ path: AXE });
    const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations
      .map((v) => `${v.id} : ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
    const petits = await page.evaluate(() => [...document.querySelectorAll('#sheet button, #sheet a, #sheet summary, .map-btn, .chip, .big-btn')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && (r.height < 44 || r.width < 44) && getComputedStyle(e).visibility !== 'hidden'; })
      .map((e) => (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 25)));
    if (axe.length || petits.length) defauts++;
    // capture : la feuille entière, défilée, si elle est ouverte ; sinon l'écran
    if (await page.locator('#sheet:not([hidden])').count()) {
      await page.setViewportSize({ width: vw, height: 2400 });
      await page.evaluate(() => { const s = document.querySelector('#sheet'); s.style.maxHeight = 'none'; s.style.top = '0'; s.style.bottom = 'auto';
        document.querySelector('#sheetBody').style.overflow = 'visible'; document.querySelectorAll('.sheet-foot').forEach((f) => { f.style.position = 'static'; }); });
      await page.waitForTimeout(250);
      await feuille(page).screenshot({ path: `${SORTIE}/${nom}-${vw}-${theme}.png` });
    } else await page.screenshot({ path: `${SORTIE}/${nom}-${vw}-${theme}.png` });
    lignes.push(`${vw} ${theme} ${nom} : axe ${axe.length ? axe.join(' ; ') : 'OK'} · moins de 44 px : ${petits.length ? petits.join(', ') : 'aucun'}`);
  }
  if (erreurs.length) { lignes.push(`ERREURS JS ${vw} ${theme} : ${erreurs.join(' | ')}`); defauts++; }
  await ctx.close();
}
await b.close();
console.log(lignes.join('\n'));
console.log(defauts ? `\n${defauts} défaut(s). Captures dans ${SORTIE}/` : `\nAucun défaut. Captures dans ${SORTIE}/`);
process.exitCode = defauts ? 1 : 0;
