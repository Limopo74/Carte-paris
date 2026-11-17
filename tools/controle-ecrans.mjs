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
import { mkdirSync, writeFileSync } from 'node:fs';

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
  lieu('a', 'Musée de la Vie romantique', 48.8818, 2.3337, { fav: true, stars: 4, note: 'Le jardin et son salon de thé, au calme.', ticket: { at: now + 3 * 3600e3 },
    passages: [{ at: now - 20 * 864e5, text: 'La glycine en fleur dans la cour', stars: 5 }, { at: now - 60 * 864e5 }, { at: now - 200 * 864e5, text: 'Salon de thé fermé' }] }),
  lieu('b', 'Café des Deux Moulins', 48.8848, 2.3335, { ticket: { at: new Date(now - 864e5).setHours(9, 0, 0, 0), part: 'matin', with: 'Léa' } }), // hier : « Tu y es allé ? »
  lieu('c', 'Square d\'Anvers', 48.8829, 2.3446, { done: true, covered: true }),
  lieu('d', 'Librairie Les Abbesses', 48.8845, 2.3380, { ticket: { at: now + 3 * 864e5 } }),
  lieu('e', 'Marché Saint-Quentin', 48.8774, 2.3567, { ticket: { at: new Date(now + 864e5).setHours(14, 0, 0, 0), part: 'aprem' } }),
];
// Une sortie de l'agenda prévue (v153) : dans Mon planning, pas sur la carte
const PLANS = [{ id: 'ev1', name: 'Concert de jazz au square', lat: 48.8800, lng: 2.3360, place: 'Square Montholon', url: 'https://quefaire.paris.fr/', ticket: { at: new Date(now + 2 * 864e5).setHours(20, 30, 0, 0) } }];
const iso = (t) => new Date(t).toISOString();
// Créneau au format de l'agenda (v140) : heure de Paris écrite telle quelle, avec un faux fuseau
const wall = (t) => { const d = new Date(t); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00+02:00`; };
const AGENDA = [
  ['Concert de jazz au square', 48.8800, 2.3360, 'Concerts -> Jazz'], ['Exposition photo : Paris la nuit', 48.8810, 2.3290, 'Expositions -> Photographie'],
  ['Brocante de la rue des Martyrs', 48.8790, 2.3390, 'Brocante'], ['Atelier dessin en famille', 48.8770, 2.3320, 'Enfants'],
  ['Balade commentée Pigalle', 48.8820, 2.3370, 'Balade urbaine'],
].map(([title, lat, lon, tags], i) => ({ title, lat_lon: { lat, lon }, date_start: iso(now - 3600e3), date_end: iso(now + (2 + i) * 3600e3), occurrences: `${wall(now - 3600e3)}_${wall(now + (2 + i) * 3600e3)}`, date_description: 'Le mardi 17 novembre 2026<br />de 14h00 à 18h00<br />',
  address_name: 'Paris 9e', address_street: 'rue des Martyrs', address_zipcode: '75009', address_city: 'Paris', price_type: i % 2 ? 'gratuit' : 'payant', event_indoor: i % 2, cover_url: `https://cdn.paris.fr/qfapv4/2026/11/17/huge-test${i}.jpg`, cover_credit: 'Photo de test', cover_alt: title, qfap_tags: tags, url: 'https://quefaire.paris.fr/' }));

// Monuments : réponse Wikidata simulée (un musée, un immeuble protégé en façade seulement).
const WIKIDATA = { results: { bindings: [
  ['Q1', 'Hôtel Scheffer-Renan', 'Point(2.3337 48.8818)', 'PA00088936'], ['Q2', 'Immeuble', 'Point(2.3350 48.8805)', 'PA00085808'],
].map(([id, label, coord, ref]) => ({ item: { value: `http://www.wikidata.org/entity/${id}` }, itemLabel: { value: label }, coord: { value: coord }, merimee: { value: ref } })) } };
// Vélib' (v150) : 6 stations autour du point de test, dont une à 0 vélo et une muette depuis 3 h
// (+ 120 stations loin, côté Bastille : l'appli n'accepte la liste de Paris Data qu'au-delà de 100 stations)
const VELIB = [[48.8815, 2.3365, 7, 12, 0], [48.8822, 2.3348, 0, 20, 0], [48.8806, 2.3378, 15, 3, 0], [48.8830, 2.3372, 3, 9, 3 * 3600e3], [48.8800, 2.3340, 22, 1, 0], [48.8839, 2.3355, 5, 30, 0], ...Array.from({ length: 120 }, (_, i) => [48.85 + (i % 12) * 0.001, 2.37 + Math.floor(i / 12) * 0.001, 4, 4, 0])]
  .map(([lat, lon, b, d, late], i) => ({ stationcode: String(9000 + i), name: `Station de test ${i + 1}`, numbikesavailable: b, mechanical: Math.ceil(b / 2), ebike: Math.floor(b / 2), numdocksavailable: d, is_renting: 'OUI', is_returning: 'OUI', duedate: iso(now - 60e3 - late), coordonnees_geo: { lat, lon } }));
const FONTAINES = [[48.8816, 2.3352, 'BORNE_FONTAINE', 'Wallace'], [48.8826, 2.3375, 'BORNE_FONTAINE', 'Arceau']].map(([lat, lon, type_objet, modele]) => ({ geo_point_2d: { lat, lon }, type_objet, modele, voie: 'RUE DES MARTYRS', commune: 'PARIS 9EME ARRDT', dispo: 'OUI' }));
const SANISETTES = [[48.8809, 2.3358, '24 h / 24'], [48.8834, 2.3341, '06 h - 22 h']].map(([lat, lon, horaire]) => ({ geo_point_2d: { lat, lon }, type: 'SANISETTE', adresse: 'rue de Douai', horaire, acces_pmr: 'Oui', statut: 'Ouvert' }));
const feuille = (p) => p.locator('#sheet');
// Dézoomer la carte à la molette, au centre de l'écran (aucun crochet de test dans l'appli)
const dezoome = async (p, fois) => { const v = p.viewportSize(); await p.mouse.move(v.width / 2, v.height / 3); for (let i = 0; i < fois; i++) { await p.mouse.wheel(0, 240); await p.waitForTimeout(350); } await p.waitForTimeout(400); };
const ECRANS = {
  carte: async () => {},
  fiche: async (p) => { await p.locator('.leaflet-marker-icon').first().click(); await p.waitForSelector('#sheet .go-bar'); },
  autour: async (p) => { await p.locator('#btnNear').click(); await p.waitForTimeout(900); },
  sorties: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); },
  chercher: async (p) => { await p.locator('#btnSearch').click(); await feuille(p).locator('input').first().fill('Mus'); await p.waitForTimeout(600); },
  nouveau: async (p) => { await p.locator('#btnAdd').click(); },
  reglages: async (p) => { await p.locator('#btnSettings').click(); },
  application: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: /^\s*Appli(?![a-z])/ }).click(); },
  navigo: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.tabs-line button', { hasText: 'Navigo' }).click(); await p.waitForTimeout(800); },
  expos: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.tabs-line button', { hasText: 'Expos' }).click(); await p.waitForTimeout(800); },
  grandslieux: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.tabs-line button', { hasText: 'Expos' }).click(); await p.waitForTimeout(600); await feuille(p).locator('.menu-row', { hasText: 'Grands lieux' }).click(); await p.waitForTimeout(1500); await feuille(p).locator('details.week-arr summary').first().click(); await p.waitForTimeout(300); },
  sortie: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.ev:not(.feat) .ev-main').first().click(); await p.waitForTimeout(800); },
  dehors: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.chip', { hasText: 'Dehors' }).click(); await p.waitForTimeout(800); },
  gratuit: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.tabs-line button', { hasText: 'Gratuit' }).click(); await p.waitForTimeout(800); },
  navigolieu: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.tabs-line button', { hasText: 'Navigo' }).click(); await p.waitForTimeout(800); await feuille(p).locator('.ev-main').first().click(); await p.waitForTimeout(400); },
  donnees: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: /^\s*Appli(?![a-z])/ }).click(); await feuille(p).locator('button', { hasText: 'Données de l' }).click(); await p.waitForTimeout(400); },
  donneelignes: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: /^\s*Appli(?![a-z])/ }).click(); await feuille(p).locator('button', { hasText: 'Données de l' }).click(); await feuille(p).locator('.menu-row', { hasText: 'Lignes et gares' }).click(); await p.waitForTimeout(400); },
  monuments: async (p) => { await p.locator('#btnNear').click(); await p.waitForTimeout(900); await feuille(p).locator('button', { hasText: 'Monuments' }).first().click(); await p.waitForSelector('#sheet .items'); await p.waitForTimeout(400); },
  planning: async (p) => { await p.locator('#btnPlanning').click(); await p.waitForTimeout(400); },
  sortieprevoir: async (p) => { await p.locator('#btnSorties').click(); await p.waitForTimeout(1200); await feuille(p).locator('.ev:not(.feat) .ev-main').first().click(); await p.waitForTimeout(600); await feuille(p).locator('.row3 .btn', { hasText: /Prévoir|Prévu/ }).click(); await p.waitForTimeout(300); },
  joursortie: async (p) => { await p.locator('#btnPlanning').click(); await p.waitForTimeout(400); await feuille(p).locator('button', { hasText: 'Trouver une sortie' }).click(); await p.waitForTimeout(1200); },
  sortieprevue: async (p) => { await p.locator('#btnPlanning').click(); await p.waitForTimeout(400); await feuille(p).locator('.item-main', { hasText: 'Concert de jazz' }).click(); await p.waitForTimeout(300); },
  vuenpassant: async (p) => { await p.locator('#btnAdd').click(); await p.waitForTimeout(300); const fc = p.waitForEvent('filechooser'); await feuille(p).locator('button', { hasText: 'Vu en passant' }).click(); await (await fc).setFiles('icons/icon-512.png'); await p.waitForTimeout(1500); },
  passage: async (p) => { await p.locator('.leaflet-marker-icon').first().click(); await p.waitForSelector('#sheet .go-bar'); await feuille(p).locator('button', { hasText: 'J\'y suis passé' }).click(); await p.waitForTimeout(300); },
  fichepassages: async (p) => { await p.locator('.leaflet-marker-icon').first().click(); await p.waitForSelector('#sheet .go-bar'); await feuille(p).locator('.fiche-sec', { hasText: /passages/i }).scrollIntoViewIfNeeded(); await p.waitForTimeout(300); },
  journal: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Mon Paris' }).first().click(); await p.waitForTimeout(400); await feuille(p).locator('.menu-row', { hasText: 'Mon journal' }).click(); await p.waitForTimeout(400); },
  prevoir: async (p) => { await p.locator('.leaflet-marker-icon').first().click(); await p.waitForSelector('#sheet .go-bar'); await feuille(p).locator('.btn.c-disc', { hasText: /Prévoir|Prévu/ }).click(); await p.waitForTimeout(300); },
  prevoirautre: async (p) => { await p.locator('.leaflet-marker-icon').first().click(); await p.waitForSelector('#sheet .go-bar'); await feuille(p).locator('.btn.c-disc', { hasText: /Prévoir|Prévu/ }).click(); await feuille(p).locator('.seg button', { hasText: 'Autre jour' }).click(); await feuille(p).locator('.seg button', { hasText: 'Heure précise' }).click(); await p.waitForTimeout(300); },
  station: async (p) => { await p.locator('#btnMetro').click(); await p.waitForSelector('#sheet .stack'); await p.waitForTimeout(400); },
  sauvegarde: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Sauvegarde' }).first().click(); await p.waitForTimeout(300); },
  restaurer: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Restaurer ou importer' }).click(); await p.waitForTimeout(300); },
  aide: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Aide' }).first().click(); await feuille(p).locator('.help-item summary').first().click(); },
  boutons: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Boutons de la carte' }).click(); await p.waitForTimeout(300); },
  texte: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Taille du texte' }).click(); await p.waitForTimeout(300); },
  pas: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Mon pas' }).click(); await p.waitForTimeout(300); },
  essentiel: async (p) => { await ECRANS.boutons(p); await feuille(p).locator('.menu-row', { hasText: 'Choisir l\'essentiel' }).click(); await p.waitForTimeout(300); },
  nombouton: async (p) => { await ECRANS.boutons(p); await feuille(p).locator('.tool-rename').nth(1).click(); await p.waitForTimeout(300); },
  nomscarte: async (p) => { // v139 : « Noms à côté des boutons » allumé, avec un nom choisi
    await p.evaluate(() => { const k = 'carte-paris.v1'; const o = JSON.parse(localStorage.getItem(k) || '{}'); o.toolLabels = true; o.toolNames = { home: 'Chez moi', pratique: 'Eau et toilettes' }; o.moreTools = ['velib']; localStorage.setItem(k, JSON.stringify(o)); });
    await p.goto(URL_APPLI); await p.waitForTimeout(700);
  },
  velibcarte: async (p) => { await p.evaluate(() => document.getElementById('btnVelib').click()); /* le bouton peut être rangé dans ⋯ Plus */ await p.waitForSelector('#sheet .items'); await feuille(p).locator('button', { hasText: 'Toutes les stations sur la carte' }).click(); await p.waitForTimeout(600); },
  velibloin: async (p) => { await ECRANS.velibcarte(p); await dezoome(p, 4); },
  velibstation: async (p) => { await ECRANS.velibcarte(p); await p.locator('.vb-pin').first().click(); await p.waitForSelector('#sheet .go-bar'); },
  pratcarte: async (p) => { await p.evaluate(() => document.getElementById('btnPratique').click()); await p.waitForSelector('#sheet .items'); const allumer = feuille(p).locator('button', { hasText: 'Toutes les fontaines' }); if (await allumer.count()) await allumer.click(); else await p.locator('#sheetClose').click(); /* calque gardé allumé par l'écran d'avant */ await p.waitForTimeout(600); if (await p.locator('#layerNote:not([hidden])').count()) await p.locator('#layerNote').click(); await p.waitForTimeout(700); },
  pratlieu: async (p) => { await ECRANS.pratcarte(p); await p.locator('.pr-pin.lite').first().dispatchEvent('click'); await p.waitForSelector('#sheet .go-bar'); },
  filtrescalques: async (p) => { await p.locator('.chip.filters').click(); await p.waitForTimeout(300); await feuille(p).locator('.menu-group', { hasText: 'Ajouter sur la carte' }).scrollIntoViewIfNeeded(); },
  plushaut: async (p) => { await p.locator('.chip.more-chip').click(); await p.waitForTimeout(300); },
  barrehaut: async (p) => { await p.locator('#btnSettings').click(); await feuille(p).locator('.menu-row', { hasText: 'Barre du haut' }).click(); await p.waitForTimeout(300); },
  vide: async (p) => { await p.evaluate(() => localStorage.removeItem('carte-paris.v1')); await p.goto(URL_APPLI); await p.waitForTimeout(700); }, // en dernier : efface les lieux de ce contexte
};
const choisis = (process.env.ECRANS || Object.keys(ECRANS).join(',')).split(',');

const b = await chromium.launch();
const lignes = []; let defauts = 0;
for (const [vw, vh] of LARGEURS) for (const theme of THEMES) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, geolocation: { latitude: 48.8812, longitude: 2.3361 }, permissions: ['geolocation'], colorScheme: theme, serviceWorkers: 'block', bypassCSP: true });
  const page = await ctx.newPage(); const erreurs = []; page.on('pageerror', (e) => erreurs.push(e.message));
  await page.route(/opendata\.paris\.fr/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(AGENDA) }));
  await page.route(/cdn\.paris\.fr/, (r) => r.fulfill({ status: 200, contentType: 'image/png', path: 'icons/icon-512.png' })); // photo de sortie simulée
  await page.route(/tile|cartocdn|openstreetmap|open-meteo|wikidata|overpass|nominatim|geopf|wikipedia|velib|smoove/, (r) => r.abort());
  await page.route(/velib-disponibilite/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VELIB) }));
  await page.route(/fontaines-a-boire/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FONTAINES) }));
  await page.route(/sanisettesparis/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SANISETTES) }));
  await page.route(/query\.wikidata\.org/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WIKIDATA) })); // la dernière route enregistrée gagne
  await page.goto(URL_APPLI);
  // TEXTE=grand ou tresgrand (v144) : contrôle avec la taille du texte choisie
  await page.evaluate(([pts, plans, textSize]) => localStorage.setItem('carte-paris.v1', JSON.stringify({ points: pts, plans, layoutV: 3, lastExport: Date.now(), textSize })), [LIEUX, PLANS, process.env.TEXTE || 'normal']);
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
    // Débordements : la page ne doit jamais défiler de côté ; un élément ne doit pas sortir de la feuille ;
    // les textes coupés (« … ») sont listés pour relecture, sans compter comme défaut.
    const deborde = await page.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`page large de ${document.documentElement.scrollWidth} px`);
      const sh = document.querySelector('#sheet:not([hidden])');
      if (sh) {
        const R = sh.getBoundingClientRect();
        for (const e of sh.querySelectorAll('*')) {
          const r = e.getBoundingClientRect();
          const inScroll = (x) => { for (let q = x.parentElement; q && q !== sh; q = q.parentElement) if (/auto|scroll/.test(getComputedStyle(q).overflowX)) return true; return false; }; // une rangée qui défile de côté (puces) n'est pas un débordement
          if (r.width && (r.right > R.right + 1 || r.left < R.left - 1) && getComputedStyle(e).position !== 'absolute' && !inScroll(e)) out.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')} sort de ${Math.round(Math.max(r.right - R.right, R.left - r.left))} px`);
        }
      }
      // v144 : hors de la feuille aussi (barre du bas, colonne) — un bouton qui sort de l'écran, ou dont le texte dépasse
      const scrolls = (x) => { for (let q = x.parentElement; q; q = q.parentElement) if (/auto|scroll/.test(getComputedStyle(q).overflowX)) return true; return false; };
      for (const b of document.querySelectorAll('button, a.go, a.btn')) {
        if (b.closest('[hidden]') || b.closest('.leaflet-container') || !b.getClientRects().length || b.classList.contains('map-btn')) continue; // la pastille d'un bouton de la colonne dépasse exprès
        const r = b.getBoundingClientRect();
        if (!scrolls(b) && (r.right > innerWidth + 1 || r.left < -1)) out.push(`${b.tagName.toLowerCase()}#${b.id || [...b.classList].join('.')} sort de l'écran`);
        if (b.scrollWidth > b.clientWidth + 2 && b.clientWidth > 20) out.push(`texte trop large dans ${b.tagName.toLowerCase()}${b.id ? `#${b.id}` : `.${[...b.classList].join('.')}`} « ${b.textContent.trim().slice(0, 20)} »`);
      }
      return [...new Set(out)].slice(0, 6);
    });
    const coupes = await page.evaluate(() => [...document.querySelectorAll('#sheet:not([hidden]) *')]
      .filter((e) => e.children.length === 0 && !e.closest('.sr-only') && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 2 && getComputedStyle(e).overflow !== 'visible')
      .map((e) => e.textContent.trim().slice(0, 30)).slice(0, 8));
    const horsFeuille = await page.evaluate(() => [...document.querySelectorAll('button, a[href], summary')]
      .filter((e) => !e.closest('#sheet') && !e.closest('.leaflet-control-attribution') && !e.closest('[hidden]'))
      .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight && (r.height < 44 || r.width < 44); })
      .map((e) => (e.getAttribute('aria-label') || e.title || e.textContent).trim().slice(0, 25)));
    if (axe.length || petits.length || deborde.length) defauts++;
    // STYLES=dossier : relevé des styles calculés de chaque élément (vérifie qu'un nettoyage du CSS ne change rien à l'écran)
    if (process.env.STYLES) {
      const st = await page.evaluate(() => { const skip = /^(width|height|inline-size|block-size|min-|max-|perspective-origin|transform-origin|d$|r$|cx|cy|x$|y$)/; const out = [];
        for (const e of document.querySelectorAll('body *')) { const cs = getComputedStyle(e); const o = {}; for (const k of cs) if (!skip.test(k)) o[k] = cs.getPropertyValue(k);
          out.push([e.tagName + '.' + [...e.classList].join('.'), o]); }
        return out; });
      writeFileSync(`${process.env.STYLES}/${nom}-${vw}-${theme}.json`, JSON.stringify(st));
    }
    // capture : la feuille entière, défilée, si elle est ouverte ; sinon l'écran
    if (await page.locator('#sheet:not([hidden])').count()) {
      await page.setViewportSize({ width: vw, height: 2400 });
      await page.evaluate(() => { const s = document.querySelector('#sheet'); s.style.maxHeight = 'none'; s.style.top = '0'; s.style.bottom = 'auto';
        document.querySelector('#sheetBody').style.overflow = 'visible'; document.querySelectorAll('.sheet-foot').forEach((f) => { f.style.position = 'static'; }); });
      await page.waitForTimeout(250);
      await feuille(page).screenshot({ path: `${SORTIE}/${nom}-${vw}-${theme}.png` });
    } else await page.screenshot({ path: `${SORTIE}/${nom}-${vw}-${theme}.png` });
    lignes.push(`${vw} ${theme} ${nom} : axe ${axe.length ? axe.join(' ; ') : 'OK'} · moins de 44 px : ${petits.length ? petits.join(', ') : 'aucun'}${deborde.length ? ` · DÉBORDE : ${deborde.join(', ')}` : ''}${coupes.length ? ` · coupés : ${coupes.join(' | ')}` : ''}${horsFeuille.length ? ` · hors feuille < 44 px : ${[...new Set(horsFeuille)].join(', ')}` : ''}`);
  }
  if (erreurs.length) { lignes.push(`ERREURS JS ${vw} ${theme} : ${erreurs.join(' | ')}`); defauts++; }
  await ctx.close();
}
await b.close();
console.log(lignes.join('\n'));
console.log(defauts ? `\n${defauts} défaut(s). Captures dans ${SORTIE}/` : `\nAucun défaut. Captures dans ${SORTIE}/`);
process.exitCode = defauts ? 1 : 0;
