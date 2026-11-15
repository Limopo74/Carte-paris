# Ma carte de Paris — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** appli web installable (Android, Chrome) pour placer ses points d'intérêt sur une carte de Paris et voir ceux qui sont proches, rangés par cercles.

**Architecture :** dossier statique hébergé sur GitHub Pages. Une logique pure (distances, cercles, stockage), testée avec `node --test`, et une interface Leaflet par-dessus. Un service worker garde en cache l'appli, mais pas les fonds de carte.

**Tech Stack :** HTML, CSS, JavaScript en modules ES sans framework ; Leaflet 1.9 copié dans le dépôt ; tuiles OpenStreetMap ; géocodage IGN (`https://data.geopf.fr/geocodage`, ex-API Adresse).

**Spec :** `docs/superpowers/specs/2026-11-15-carte-paris-design.md`

## Global Constraints
- Catégories : `resto` (Restos, cafés, bars), `boutique` (Boutiques, commerces), `culture` (Culture, visites).
- Cercles par défaut : `[100, 300, 500, 1000]` m ; 100 m au minimum.
- Temps de marche : 12 min par km, arrondi à la minute supérieure, 1 min au minimum.
- « Y aller » : `travelmode=walking` si la distance est inférieure à 1000 m, `transit` sinon ; URL `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=MODE`.
- Données en localStorage sous la clé `carte-paris.v1` ; l'export JSON est `{app:"carte-paris", version:1, points:[…], rings:[…]}`.
- Tous les textes en français, en « tu ».
- Aucun compte, aucun envoi des points à un serveur.

## Review Focus
1. Localisation refusée, indisponible ou trop lente : message clair, la carte reste utilisable, l'ajout par adresse fonctionne toujours.
2. Localisation imprécise (plus de 100 m de marge) : afficher la marge pour qu'on ne se fie pas au cercle de 100 m.
3. Fichier d'import invalide ou d'une autre appli : il est refusé et les points existants ne sont pas touchés.
4. Réglage des cercles saisi n'importe comment (moins de 100, doublons, désordre, texte) : les valeurs sont normalisées.
5. Recherche d'adresse sans résultat ou sans réseau : message, et le point n'est pas créé à une position fausse.

---

### Task 1 : logique de distance et de cercles (`js/geo.js`)
**Produces :** `distanceM(a, b) -> number` (haversine, `{lat,lng}`) ; `walkMinutes(m) -> int` ; `normalizeRings(input) -> number[]` (trié, sans doublon, ≥ 100, entiers, défaut si vide) ; `groupByRings(points, here, rings) -> [{ring, items:[{point, d}]}]` (bornes incluses, trié par distance, points au-delà exclus) ; `mapsUrl(point, d) -> string`.
- [ ] Tests `tests/geo.test.mjs` : Notre-Dame↔Tour Eiffel ≈ 4 100 m ±100 ; `walkMinutes(0)=1`, `walkMinutes(1000)=12`, `walkMinutes(1001)=13` ; `normalizeRings([50,"300",300,"x",1000,200])=[100,200,300,1000]` ; `normalizeRings([])=[100,300,500,1000]` ; un point à 100 m exactement va dans le cercle 100 ; un point à 5 km est exclu de `[100,300,500,1000]` ; `mapsUrl` à 999 m contient `walking`, à 1000 m `transit`.
- [ ] Vérifier qu'ils échouent, implémenter, vérifier qu'ils passent, commit.

### Task 2 : stockage et export/import (`js/store.js`)
**Produces :** `newPoint(fields) -> Point` (`id`, `name`, `cat`, `note`, `done:boolean`, `lat`, `lng`, `address`, `created`) ; `validatePoint(p) -> boolean` ; `loadState(storage) -> {points, rings, ok}` ; `saveState(storage, state) -> boolean` ; `exportJSON(state) -> string` ; `mergeImport(state, text) -> {state, added, skipped}`, qui lève une `Error` avec un message en français si le fichier est invalide.
- [ ] Tests `tests/store.test.mjs` : un `storage` qui lève une erreur donne `ok:false` sans plantage ; aller-retour export → import sur un état vide donne les mêmes points ; réimporter le même fichier donne `added:0` ; un JSON invalide ou `app` ≠ `carte-paris` lève une erreur et l'état d'origine n'est pas modifié ; un point avec lat hors [-90,90] ou une catégorie inconnue est ignoré (`skipped`).
- [ ] Vérifier qu'ils échouent, implémenter, vérifier qu'ils passent, commit.

### Task 3 : interface (`index.html`, `css/style.css`, `js/adresse.js`, `js/app.js`)
**Consumes :** Tasks 1 et 2. `adresse.js` : `searchAddress(q) -> [{label, lat, lng}]` (5 au plus, `autocomplete=1`, biais vers Paris avec `lat=48.8566&lon=2.3522`), `reverseAddress(lat,lng) -> string|null`.
- Carte plein écran centrée sur Paris, zoom 13, points en `circleMarker` colorés par catégorie, les « déjà visité » en contour seulement.
- Barre du bas : `+` et `Autour de moi`. Le `+` ouvre une feuille « Ma position » / « Une adresse », puis le formulaire nom/catégorie/note/état.
- « Autour de moi » : localisation (`enableHighAccuracy`, délai 15 s), cercles dessinés, filtres de catégorie, liste par cercle avec la distance, les minutes à pied et un lien « Y aller ». Si la marge dépasse 100 m, l'afficher.
- Fiche d'un point : modifier, supprimer (avec confirmation dans la page), « Y aller ».
- Réglages : cercles (saisie de nombres séparés par des virgules), Exporter (téléchargement d'un fichier `.json`), Importer (choix d'un fichier), compteur de points.
- [ ] Contrôle dans Chromium sans écran à 360 × 800 : pas d'erreur dans la console, chaque écran s'ouvre. Commit.

### Task 4 : installation (`manifest.webmanifest`, `sw.js`, `icons/`)
- Manifest : nom « Ma carte de Paris », nom court « Ma carte », `display:standalone`, icônes PNG 192 et 512 (dont une maskable).
- Service worker : met en cache l'appli à l'installation, la sert d'abord depuis le réseau puis depuis le cache ; ne met jamais en cache les tuiles ni l'API Adresse.
- [ ] Contrôle : manifest valide, service worker enregistré dans Chromium. Commit.
