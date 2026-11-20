# Charte « Papier » — Ma carte de Paris

Règles d'apparence de toute l'appli, en place depuis la v103 (16 novembre 2026). Elles remplacent « Plaques & pavés ». Elles sont vérifiées par `tests/charte.test.mjs` (lancé avec `npm test`) : une modification qui s'en écarte fait échouer les tests. Analyse et contrastes détaillés : document « charte-editoriale » du projet.

## 1. Principe
- **Encre sur papier** : texte presque noir sur fond blanc ; en sombre, « papier de nuit ». Lisible dehors, au soleil.
- **La couleur signale, elle ne décore pas** : elle dit la famille d'une action (texte, icône et contour d'un bouton) ou un état (ouvert, fermé). Jamais de fond teinté sur un bouton au repos.
- **Forme = importance** : une seule plaque pleine par écran (l'action principale), des contours pour le reste, des tampons pour les états. Les tampons sont droits, en lettres normales (v177 : plus de majuscules espacées ni d'inclinaison, illisibles au soleil). Sorties n'a plus de grande carte pleine en tête (v177).
- **Filets plutôt que cadres** : les listes et les informations sont séparées par des filets fins, sans boîte ni ombre.
- **Une seule source** : toutes les couleurs et mesures sont des jetons, définis une fois en tête de `css/style.css` (`:root`, puis `:root[data-theme="dark"]`). On ne réécrit jamais une couleur en dur dans une règle d'interface, et on n'ajoute jamais une « couche » qui redéfinit une règle existante : on modifie la règle elle-même.

## 2. Couleurs (jetons)
| Rôle | Jeton | Clair | Sombre | Usage |
|---|---|---|---|---|
| Encre | `--ink`, `--strong` | `#15181D` | `#EEF0F3` | texte, plaque pleine, filet fort |
| Papier | `--bg`, `--surface`, `--btn` | `#FFFFFF` | `#14171D` / `#1C2028` | feuille, boutons |
| Kraft | `--soft` | `#F3F0EA` | `#0E1014` | fond hors feuille |
| Gris | `--muted` | `#5C6370` | `#A9B0BC` | légendes, sous-titres, texte atténué |
| Filet | `--line` | `#D6D0C4` | `#343A46` | séparations (décor seulement, jamais le contour d'un bouton ou d'un champ : 1,5:1) |
| Aller | `--guide` | encre | encre | Y aller, boussole, se guider |
| Transport | `--metro` | `#1B56E8` | `#8CB1FF` | métro, stations, Vélib', Rentrer |
| Découvrir | `--disc` | `#A54A28` | `#FFB08A` | Sorties, Curiosités, surtitres |
| Garder | `--add` | `#2C5B4E` | `#8FD6A5` | Ajouter, Enregistrer, ouvert |
| Favori | `--fav`, `--fav-icon` | `#8A6514`, `#B07B00` | `#FFDC85` | texte, étoiles |
| Réglages | `--info` | `#5C6370` | `#C3CAD6` | Réglages, aide |
| Supprimer | `--danger` | `#9A2620` | `#FF9A92` | supprimer, fermé |

Fonds légers d'un état allumé seulement (Favori, Déjà visité…) : `--fav-bg`, `--add-bg`, `--info-bg`. Messages : `--warn-*`, `--rain-*`, `--heat-*`. Qualité de l'air : `--aq-*`. Boussole : `--compass-bg`, `--compass-ink`, `--compass-muted`. Focus clavier : `--focus`.
Tous les textes atteignent au moins 4,5:1 sur papier et sur kraft ; les étoiles (icônes) au moins 3:1.

## 3. Formes
- **Un seul rayon : `--r` = 4 px** pour tout ce qui est rectangulaire.
- **Rond** (50 % ou pilule 999 px) pour les pastilles, médaillons, interrupteurs.
- Exceptions : coins hauts de la feuille (18 px), goutte des épingles, pastilles de lignes métro/RER (signalétique IDFM), barres des graphiques.
- **Groupes de mes lieux** (v178, js/groupes.js) : de loin (zoom 15 et moins), 3 lieux ou plus dans une case de 84 px deviennent une goutte encre `--ink` de 36 px avec leur nombre (`.pin-group`, Archivo 800) ; jamais réduite de loin ; un appui zoome dessus. Jamais de groupe à la vue « rue » (zoom 16) ; un favori n'est jamais regroupé. Une forme de mes lieux, donc une goutte.
- **Arrondissement filtré** (v182, Filtres → Arrondissement) : contour en pointillés encre `ink()` 3 px et voile gris sur tout le reste (28 %, noir à 45 % en sombre) ; l'intérieur garde la vraie carte. Grille de choix = plan schématique de Mon Paris (`.arr-pick`). v202 : la case ouvre la liste de mes lieux sous la carte (titres de catégorie `.ring-title`, lignes sans bouton) ; l'arrondissement ne dure que le temps de cette liste, donc plus de case pleine.
- **Numéros des arrondissements** (v193) : de loin seulement (zoom 12 à 14), grand numéro encre `--ink` en Archivo 800 `--t26` sur un halo plein `--bg` de 8 px (v194 : le style Classique écrit déjà « 3e Arrondissement » en petit gris au même endroit ; le halo le cache), limites en trait fin `--muted` 1,5 px ; sous tout le reste (volet `arrNums`), jamais touchables ; réglage pour les masquer. Pas de couleur : ils ne doivent pas se confondre avec une forme de mes lieux ou le contour en pointillés d'un arrondissement filtré.
- Épingles **TTB** (v120) : la seule épingle ronde et pleine, terre cuite `--disc` avec l'icône de la rubrique (`TTB_ICONS` dans js/ttb.js : couverts, bol, sandwich, croissant, panier, verre ; `.ttb-pin`, 28 px, petit rond de 14 px sans icône vue de loin). Le bouton du haut porte « TTB » (`TTB_MARK` dans app.js), pour les distinguer des gouttes de mes lieux. La même marque (`.ttb-dot`) sert au bouton du haut et aux listes. **Adresse vérifiée par moi** (v218, marque « ok » de moins de 6 mois) : pastille `--bg` de 16 px à coche `--ink`, en haut à droite du rond (`.ttb-ok`) ; vue de loin, le bord du petit rond passe à `--ink`. Jamais la coche verte, réservée à « Déjà visité ».
- **Circuits de visite** (v168) : le tracé est un trait plein terre cuite (`--disc`, 5 px) et chaque étape une pastille ronde numérotée terre cuite (`.step-pin.circuit`, 28 px). Une balade reçue par lien garde son trait pointillé encre. Le tracé n'apparaît qu'avec « Voir sur la carte » et part avec la croix du bandeau.
- **Passages couverts** (v168) : pictogramme porte ouverte terre cuite sur fond surface, carré arrondi de 26 px (`.arc-pin`, zone d'appui 40 px) à partir du zoom 15 ; de plus loin, un point rond de 14 px (`.arc-pin.far`) qui zoome quand on le touche, car les passages sont trop proches les uns des autres. À partir du zoom 16, une bande terre cuite large et transparente (9 px, 45 %) relie les entrées : plus large et plus pâle que le trait d'un circuit, pour ne pas les confondre. Pas de bande si le chemin n'est pas sûr.
- **Chez moi** (v222) : le canapé (`sofa`, Lucide) veut dire « les distances partent de mon adresse », et rien d'autre. Dans la pastille météo, à la place de l'arrondissement, tant que Chez moi est allumé (`.wx-home`) ; au départ d'Autour de moi, rond surface à bord encre `--ink` (`.metro-pin.home-pin`), jamais le point bleu, qui reste ma vraie position. La maison (`house`) reste à Rentrer et à Mes stations.
- **Pistes à vélo** (v259, couche « Pistes à vélo ») : trait plein vert `--add` (séparé des voitures : pistes, voies vertes, chemins des bois) et pointillé vert plus fin (rues calmes : voies piétonnes, vélorues, voies fermées aux voitures), sous tout le reste, jamais touchables. **Exception voulue** : le vert de « Garder » sert ici sur la carte seulement, comme sur toutes les cartes vélo ; un trait fin ne se confond ni avec un bouton ni avec la coche verte de « Déjà visité ». De loin (sous le zoom 14), les pistes seules, en trait fin. Le bouton du haut porte le mot « Vélo » (le vélo dessiné reste à Vélib') ; dans les listes, l'icône `spline`.
- **Jardins publics** (v261, couche « Jardins publics », sous ⋯ Plus) : à partir du zoom 15, le contour de chaque square, jardin, parc ou bois de la Ville. **Ouvert maintenant** (horaires de la saison connus, pas de grand vent) : contour vert `--add` 2 px et intérieur vert à 30 % ; **fermé ou horaires inconnus** : contour gris `--muted` seul, jamais vert, pour ne pas se confondre avec le trait vert d'une piste à vélo ni dire « ouvert » sans le savoir. Touchable : un appui ouvre la page du jardin. Icône `trees` (comme le bloc « Jardin ouvert » ou « Lieu frais » de Fontaine et WC).
- **Boulangeries primées** (v265, bas d'Autour de moi) : épis de blé (`wheat`, Lucide) terre cuite `--disc` dans un rond fond `--bg` bordé de terre cuite 1,5 px (`.cat-ico.prized-ico`), jamais le rond plein d'une adresse TTB. L'icône `wheat` ne veut rien dire d'autre. Pas sur la carte.
- **Aucune ombre** dans les écrans. Seule exception : une ombre douce `--float`, pour ce qui flotte sur la carte (boutons de la colonne, barres du haut et du bas, météo, « Maintenant ») et la feuille elle-même, sinon ils se perdent dans le fond de carte.

## 4. Mesures
- Hauteur d'un bouton, d'une puce, d'un champ, d'un onglet : **`--h` = 48 px**. Cible compacte : **`--h-s` = 44 px**, jamais moins. Action principale en grand : **`--h-l` = 56 px**.
- Contour d'un bouton, d'un champ ou d'une tuile : 1,5 px. Filet fin entre deux lignes : 1 px `--line`. Filet fort sous un intertitre : 1,5 px encre.

## 5. Texte
- Polices : **Inter** pour le texte, **Archivo** (étroit) pour les titres et les boutons. Pas de police à empattements.
- Échelle : **11,5 · 13 · 14 · 15 · 16 · 18 · 22 · 26 px**. 15 = intertitres et légendes de formulaire, en minuscules, sans lettres espacées (v186 : les majuscules espacées à 11,5 se lisaient mal au soleil) ; 11,5 = seulement les petites pastilles chiffrées et les noms des stations sur la carte (plus aucun texte en majuscules espacées depuis la v191) ; 13 = surtitre, petit titre du bandeau « Maintenant », « Aujourd'hui » et « Métro » de la fiche, légende, petits boutons, tampons ; 14 = aide et sous-titres ; 16 = texte et boutons ; 18 = chapô et grands boutons ; 22 = titre de la feuille ; 26 = nom d'un lieu dans sa fiche.
- **Taille du texte** (v144, Réglages → Ce qui s'affiche) : Normal, Grand (× 1,15) ou Très grand (× 1,3). En CSS, une taille de texte s'écrit avec son jeton (`var(--t13)`… `var(--t26)`, `--t115` pour 11,5, `--t15` pour 15), qui vaut l'échelle × `--ts`. Restent en px fixes : les icônes, ce qui est dessiné sur la carte (sauf ses étiquettes de texte : numéros des lignes, noms des stations, cercles, qui suivent `--ts` depuis v177), la grille de Mon Paris, la barre du bas et les rangées de 3 boutons (`.row3`), dont la largeur est fixe. Avant de publier un écran : contrôle avec `TEXTE=tresgrand` (texte trop large, bouton hors de l'écran).
- **Titraille de la fiche** : surtitre (catégorie · arrondissement) en terre cuite, nom en 26 px, chapô (ton commentaire) en 18 px, intertitres sur filet encre.
- Noms et sous-titres : 2 lignes au plus. **Jamais d'opacité sur un texte** : un texte atténué prend `--muted` (ou `--compass-muted` dans la boussole). Un bouton inactif : texte gris et contour en tirets.

## 6. Listes et informations
- Une liste = des lignes séparées par un filet fin `--line`, sans cadre ni ombre, sous un intertitre souligné d'un filet encre (`.ring-title`, `.fiche-sec`). Pas de filet fin juste avant un intertitre.
- Une ligne de liste n'a pas de boutons (v136) : toute la ligne s'ouvre sur une page qui porte les actions (Y aller, Boussole, Métro, Ajouter), toujours dans cet ordre et au même endroit. La distance (minutes à pied, puis mètres) est toujours à droite. **Exception** : les lignes d'Autour de moi gardent Boussole et Y aller, pour aller à un lieu en un appui depuis la liste (décision du 18 novembre 2026).
- **Exception voulue** (v265, mon choix du 20 nov.) : une ligne « Boulangeries primées » d'Autour de moi ne s'ouvre pas (aucune page de boulangerie) ; elle n'a que Boussole et Y aller, et n'est pas un bouton.
- Une rubrique longue montre ses 3 premières lignes puis un lien « Tous les … (N) » qui déroule la suite (`.ev-more`), pas plus d'une rangée de filtres par écran (`.chips-scroll`, qui défile de côté).
- Onglets d'un écran : texte souligné (`.tabs-line`), pas de boutons en plaque.

## 7. Icônes
- **Dessins Lucide uniquement** dans l'interface (`ico('nom')`, fichier `js/icons.js` ; pour en ajouter : copier depuis lucide-static).
- Les **emoji** ne servent qu'aux icônes de catégories, choisies par la personne. Aucun emoji écrit dans un bouton ou un lien (vérifié).
- Le métro s'écrit avec la pastille « M » (`.m-badge`) ; « Ⓜ » reste permis dans un texte qui nomme une station.
- Seul symbole permis dans un libellé : la flèche de retour « ← Nom de l'écran ».

## 7 bis. Photos (règle du 20 novembre 2026, mon choix A)
1. **Ma photo d'abord** : elle seule va sur mes lieux. Réduite à 1280 px, sans position (EXIF effacé), gardée sur le téléphone, jamais envoyée.
2. **Une photo officielle** seulement si la source de la donnée la fournit (agenda de la Ville) ou si la liste est courte et chaque photo choisie à la main. **Jamais appariée automatiquement** (une photo de Wikidata n'est pas toujours le bon lieu).
3. Copiée dans l'appli ou servie par la source de la donnée : pas de nouveau service d'images (seule exception aujourd'hui : cdn.paris.fr, pour l'agenda).
4. **Jamais** dans une ligne de liste, le bandeau « Parcourir », une plaque ou sur la carte (sauf la vignette de mes « Vu en passant ») : seulement sur la page d'un lieu ou d'une sortie, et elle ne fait jamais bouger les boutons une fois la page ouverte.
5. **Crédit visible** sous une photo officielle (« © … »), jamais replié dans « Aide ».
6. Formats en usage : ma photo en bandeau de 150 px sur la fiche ; en tête d'un passage couvert ou d'un jardin, 100 px (84 en Grand, 60 en Très grand) ; la photo de l'agenda en tête d'une sortie, même bandeau de 100 px (84, 60) depuis la v279 (mon choix B du 20 nov. ; avant : 16:9, 182 px). Un toucher l'ouvre en grand. Pas de nouveau format sans mon accord.
7. Monuments, œuvres et musées : **pas de photo** dans l'appli ; le lien Wikipédia (qui s'ouvre souvent sur une photo) suffit (mon choix A du 20 nov.).

## 8. Navigation et vocabulaire
- Retour : **« ← Nom de l'écran d'avant »**, jamais « ← Retour » seul ; sur les pages longues, il reste collé en bas (`foot(...)`, barre séparée par un filet encre).
- Formulaires : **Annuler** (contour neutre) à gauche, **Enregistrer** (plaque pleine verte) à droite.
- Placer un point : **Valider ici**. Supprimer : toujours confirmé, bouton brique.
- Interrupteurs (Favori, Déjà visité) : libellé fixe, état dit par `aria-pressed` et un fond léger quand c'est allumé.
- Les boutons ne changent jamais de place d'un écran à l'autre.
- **Lexique** (v222, vérifié par `tests/vocabulaire.test.mjs`) : un mot par chose, une chose par mot.
  | Chose | Mot | Jamais |
  |---|---|---|
  | se placer sur la carte | **Position** | localisation, géolocalisation |
  | un de mes points | **lieu** (adresse : l'adresse postale, ou une adresse du guide TTB) | endroit |
  | le geste | **touche** (verbe) ; **appui long** (nom) | appuie, clique |
  | valider un formulaire | **Enregistrer** | Garder, Valider (sauf « Valider ici » pour placer un point) |
  | détruire un objet (lieu, photo, impression, signalement) | **Supprimer**, toujours confirmé, bouton brique | Effacer |
  | sortir d'une liste, l'objet reste | **Retirer** | Supprimer |
  | vider un texte ou des choix (note du jour, filtres) | **Effacer** | |
  | ne plus afficher | **Masquer** / **Réafficher** | Cacher |
  | une visite datée d'un de mes lieux | **impression** (« Écrire une impression », « Mes impressions ») | passage (réservé aux **passages couverts**) |
  | mon texte sur un lieu / les étoiles / la page du jour | **Commentaire** / **Mes étoiles** / **Note du jour** | note (pour les deux premiers) |
  | message électronique | **courriel** | mail |
  | les mots à toucher sous « Ce que j'ai vu » (v226) | **Mots tout prêts**, rangés en **séries** (« Repas », « Visite ») | liste (réservé aux listes de lieux), modèle |
  | ce qu'est un resto, comme dans TTB : La Table, Boui-boui, Street-food (v288) | **Genre**, dans la ligne au-dessus du nom de la fiche et en bas de Modifier | rubrique (réservé aux parties d'un écran et au guide TTB), type, catégorie |
- **Deux voix** : les noms d'écrans et de boutons parlent comme moi (Mon planning, Autour de moi, J'ai du temps, Où suis-je ?) ; les phrases me tutoient (« touche… », « tes lieux »). Jamais de vouvoiement. Claude est toujours nommé à la 3e personne.
- **Accords au féminin** : l'appli sert à deux utilisatrices (« Tu y es allée ? », « Tu es déjà passée ici »).
- **Typographie à l'affichage** (`js/typo.js`, appliquée par `el()` et `toast()`, jamais dans un champ) : espace insécable avant « : ; ? ! » % » et après « « » ; heures « 9 h 30 » (un module peut écrire « 9h30 », l'écran montre « 9 h 30 ») ; « 1er » pour le premier jour du mois. Un texte posé autrement (`textContent`) passe aussi par `typo()`.
- **Aide d'un écran** (v234) : les explications (comment faire, astuces, sources) sont marquées `help tip` et rangées par `gatherTips()` dans une seule ligne « Aide » (`ico('info')`), repliée, en bas de la page, juste au-dessus de la barre du bas ; elle reste ouverte si l'écran est redessiné. Restent à leur place : alertes, comptes, « Recherche… », pages vides, aide d'un champ, mises en garde sur ce qui est affiché, ce qui part du téléphone (vérifié par `tests/aide-repliee.test.mjs`). **Pas de texte gris de plusieurs lignes** (v250) : ce qui reste visible tient en une ou deux phrases courtes (la mise en garde, ce qui part du téléphone, l'état) ; son explication, sa source et sa date vont dans un `help tip` juste à côté, donc dans l'Aide (au-delà de 200 signes, le test échoue).
- **Retour à la même hauteur** (v150) : revenir à un écran (« ← Nom », bouton retour du téléphone) ou le redessiner le rouvre là où on l'avait laissé ; un écran ouvert pour la première fois commence en haut (`openSheet`, pile `navStack`).

## 9. Contrôle après chaque changement
`npm test` (dont ce test de charte), puis `node tools/controle-ecrans.mjs` (voir `tools/README.md`) : 14 écrans à 360 et 412 px, en clair et en sombre, boutons d'au moins 44 px, contraste d'au moins 4,5:1, contrôle axe sans erreur.
