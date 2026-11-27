# Charte « Papier » — Ma carte de Paris

Règles d'apparence de toute l'appli, en place depuis la v103 (16 novembre 2026). Elles remplacent « Plaques & pavés ». Elles sont vérifiées par `tests/charte.test.mjs` (lancé avec `npm test`) : une modification qui s'en écarte fait échouer les tests. Analyse et contrastes détaillés : document « charte-editoriale » du projet.

## 1. Principe
- **Encre sur papier** : texte presque noir sur fond blanc ; en sombre, « papier de nuit ». Lisible dehors, au soleil.
- **La couleur signale, elle ne décore pas** : elle dit la famille d'une action (texte, icône et contour d'un bouton) ou un état (ouvert, fermé). Jamais de fond teinté sur un bouton au repos.
- **Forme = importance** : une seule plaque pleine par écran (l'action principale), des contours pour le reste, des tampons pour les états. Les tampons sont droits, en lettres normales (v177 : plus de majuscules espacées ni d'inclinaison, illisibles au soleil). Sorties n'a plus de grande carte pleine en tête (v177).
- **Filets plutôt que cadres** : les listes et les informations sont séparées par des filets fins, sans boîte ni ombre.
- **Une seule source** : toutes les couleurs et mesures sont des jetons, définis une fois en tête de `css/style.css` (`:root`, puis `:root[data-theme="dark"]`). On ne réécrit jamais une couleur en dur dans une règle d'interface, et on n'ajoute jamais une « couche » qui redéfinit une règle existante : on modifie la règle elle-même.

## 2. Couleurs (jetons)
| Rôle | Jeton | Clair | Sombre (Signalétique, v452) | Usage |
|---|---|---|---|---|
| Encre | `--ink`, `--strong` | `#15181D` | `#F5F5F2`, plaque `--strong` `#FFD23F` | texte, plaque pleine, filet fort |
| Papier | `--bg`, `--surface`, `--btn` | `#FFFFFF` | `#131418` / `#1B1D23` | feuille, boutons |
| Kraft | `--soft` | `#F3F0EA` | `#0B0C0F` | fond hors feuille |
| Gris | `--muted` | `#5C6370` | `#B4B8C0` | légendes, sous-titres, texte atténué |
| Filet | `--line` | `#D6D0C4` | `#2E323B` | séparations (décor seulement, jamais le contour d'un bouton ou d'un champ : 1,5:1) |
| Aller | `--guide` | encre | jaune `#FFD23F` | Y aller, boussole, se guider |
| Transport | `--metro` | `#1B56E8` | `#86ADFF` | métro, stations, Vélib', Rentrer |
| Découvrir | `--disc` | `#A54A28` | `#FF9466` | Sorties, Curiosités, surtitres |
| Garder | `--add` | `#2C5B4E` | `#5FE3A1` | Ajouter, Enregistrer, ouvert |
| Favori | `--fav`, `--fav-icon` | `#8A6514`, `#B07B00` | `#FFC24A` | texte, étoiles |
| Réglages | `--info` | `#5C6370` | `#C7CCD6` | Réglages, aide |
| Supprimer | `--danger` | `#9A2620` | `#FF7272` | supprimer, fermé |

**Mode crise** (v499, mes choix du 25 nov. 2026) : `--crisis-a` jaune `#FFD23F` et `--crisis-b` encre `#15181D`, mêmes en sombre, en bandes rayées de 12 px en haut et en bas de l'écran tant que le mode crise est allumé, sauf en Abri (confinement, attentat). Le jaune et noir rayé ne veut rien dire d'autre et ne sert nulle part ailleurs.

Fonds légers d'un état allumé seulement (Favori, Déjà visité…) : `--fav-bg`, `--add-bg`, `--info-bg`. Messages : `--warn-*`, `--rain-*`, `--heat-*`. Qualité de l'air : `--aq-*`. Boussole : `--compass-bg`, `--compass-ink`, `--compass-muted`. Focus clavier : `--focus`.
Tous les textes atteignent au moins 4,5:1 sur papier et sur kraft ; les étoiles (icônes) au moins 3:1.

## 3. Formes
- **Un seul rayon : `--r` = 4 px** pour tout ce qui est rectangulaire.
- **Rond** (50 % ou pilule 999 px) pour les pastilles, médaillons, interrupteurs.
- Exceptions : coins hauts de la feuille (18 px), goutte des épingles, pastilles de lignes métro/RER (signalétique IDFM), barres des graphiques.
- **Groupes de mes lieux** (v178, js/groupes.js) : de loin (zoom 15 et moins), 3 lieux ou plus dans une case de 84 px deviennent une goutte encre `--ink` de 36 px avec leur nombre (`.pin-group`, Archivo 800) ; jamais réduite de loin ; un appui zoome dessus. Jamais de groupe à la vue « rue » (zoom 16) ; un favori n'est jamais regroupé. Une forme de mes lieux, donc une goutte.
- **Lieu ouvert** (v331, js/lieu-ouvert.js) : tant que la fiche d'un de mes lieux est ouverte, sa goutte grossit de 40 % (pointe au même endroit), prend un anneau encre `--ink` de 6 px par-dessus le liseré blanc (même sur un favori) et passe devant les autres ; deux palpitations à l'ouverture, aucune si le téléphone supprime les animations. Anneau encre autour d'une goutte = « fiche ouverte », rien d'autre. Depuis une liste, la loupe ou Autour de moi, la carte ne se place sur le lieu que si sa goutte ne se voit pas entre la barre du haut et la fiche.
- **Arrondissement filtré** (v182, Filtres → Arrondissement) : contour en pointillés encre `ink()` 3 px et voile gris sur tout le reste (28 %, noir à 45 % en sombre) ; l'intérieur garde la vraie carte. Grille de choix = plan schématique de Mon Paris (`.arr-pick`). v202 : la case ouvre la liste de mes lieux sous la carte (titres de catégorie `.ring-title`, lignes sans bouton) ; l'arrondissement ne dure que le temps de cette liste, donc plus de case pleine.
- **Numéros des arrondissements** (v193) : de loin seulement (zoom 12 à 14), grand numéro encre `--ink` en Archivo 800 `--t26` sur un halo plein `--bg` de 8 px (v194 : le style Classique écrit déjà « 3e Arrondissement » en petit gris au même endroit ; le halo le cache), limites en trait fin `--muted` 1,5 px ; sous tout le reste (volet `arrNums`), jamais touchables ; réglage pour les masquer. Pas de couleur : ils ne doivent pas se confondre avec une forme de mes lieux ou le contour en pointillés d'un arrondissement filtré.
- **Numéros des divisions d'un cimetière** (v454) : de près seulement (zoom 17 et plus), petit chiffre gris `--muted` en Archivo 700 `--t14` sur un halo `--bg` de 4 px, sans pastille, au centre de la division (Wikidata) ; quand Jardins publics est allumé, ou pour le cimetière de la tombe dont la page est ouverte. La division de cette tombe : encre, 800, `--t18`, au-dessus du rond choisi. Un numéro qui touche un autre numéro, un bouton, une goutte ou la page se cache (jamais celui de la tombe). Jamais au même zoom que les numéros des arrondissements. La fleur (`flower-2`) veut dire « cimetière ou tombe », et rien d'autre.
- Épingles **TTB** (v120) : la seule épingle ronde et pleine, terre cuite `--disc` avec l'icône de la rubrique (`TTB_ICONS` dans js/ttb.js : couverts, bol, sandwich, croissant, panier, verre ; `.ttb-pin`, 28 px, petit rond de 14 px sans icône vue de loin). Le bouton du haut porte « TTB » (`TTB_MARK` dans app.js), pour les distinguer des gouttes de mes lieux. La même marque (`.ttb-dot`) sert au bouton du haut et aux listes. **Adresse vérifiée par moi** (v218, marque « ok » de moins de 6 mois) : pastille `--bg` de 16 px à coche `--ink`, en haut à droite du rond (`.ttb-ok`) ; vue de loin, le bord du petit rond passe à `--ink`. Jamais la coche verte, réservée à « Déjà visité ».
- **Circuits de visite** (v168) : le tracé est un trait plein terre cuite (`--disc`, 5 px) et chaque étape une pastille ronde numérotée terre cuite (`.step-pin.circuit`, 28 px). Une balade reçue par lien garde son trait pointillé encre. Le tracé n'apparaît qu'avec « Voir sur la carte » et part avec la croix du bandeau.
- **Passages couverts** (v168) : pictogramme porte ouverte terre cuite sur fond surface, carré arrondi de 26 px (`.arc-pin`, zone d'appui 40 px) à partir du zoom 15 ; de plus loin, un point rond de 14 px (`.arc-pin.far`) qui zoome quand on le touche, car les passages sont trop proches les uns des autres. À partir du zoom 16, une bande terre cuite large et transparente (9 px, 45 %) relie les entrées : plus large et plus pâle que le trait d'un circuit, pour ne pas les confondre. Pas de bande si le chemin n'est pas sûr.
- **Chez moi** (v222) : le canapé (`sofa`, Lucide) veut dire « les distances partent de mon adresse », et rien d'autre. Dans la pastille météo, à la place de l'arrondissement, tant que Chez moi est allumé (`.wx-home`) ; au départ d'Autour de moi, rond surface à bord encre `--ink` (`.metro-pin.home-pin`), jamais le point bleu, qui reste ma vraie position. La maison (`house`) reste à Rentrer et à Mes stations.
- **Rues d'intérêt** (v384 ; v402, mon choix A du 24 nov.) : un trait plein de la couleur de la catégorie du lieu, 7 px, sans transparence, **bordé d'encre** (un trait encre `ink()` de 11 px dessous, `.rue-casing` ; clair en mode sombre), bouts arrondis (`.rue-line`), le tout à 35 % pour un lieu noté fermé, sous les gouttes ; touchable, il ouvre la fiche. **Le liseré encre ne veut dire que « rue d'intérêt »** : il la distingue de la bande pâle terre cuite d'un passage couvert ; aucun autre trait de la carte ne le prend. La goutte du lieu reste au milieu du morceau. Pendant la création, le morceau est en encre `ink()` 8 px, ses deux bouts en ronds blancs bordés d'encre.
- **Zone inondable** (v503, mon choix 8 A du 25 nov.) : la zone de la crue de 1910 (PPRI de Paris) en **gris encre** (`.ppri-zone` : contour encre à 35 %, intérieur encre à 10 %), sous les gouttes et sous le plan de secours ; **jamais en bleu** (le bleu veut dire métro). Pas touchable. Seulement allumée par ⋯ Plus → Zones inondables ou en mode crise Crue.
- **Pistes à vélo** (v259, couche « Pistes à vélo ») : trait plein vert `--add` (séparé des voitures : pistes, voies vertes, chemins des bois) et pointillé vert plus fin (rues calmes : voies piétonnes, vélorues, voies fermées aux voitures), sous tout le reste, jamais touchables. **Exception voulue** : le vert de « Garder » sert ici sur la carte seulement, comme sur toutes les cartes vélo ; un trait fin ne se confond ni avec un bouton ni avec la coche verte de « Déjà visité ». De loin (sous le zoom 14), les pistes seules, en trait fin. Le bouton du haut porte le mot « Vélo » (le vélo dessiné reste à Vélib') ; dans les listes, l'icône `spline`.
- **Jardins publics** (v261, couche « Jardins publics », sous ⋯ Plus) : à partir du zoom 15, le contour de chaque square, jardin, parc ou bois de la Ville. **Ouvert maintenant** (horaires de la saison connus, pas de grand vent) : contour vert `--add` 2 px et intérieur vert à 30 % ; **fermé ou horaires inconnus** : contour gris `--muted` seul, jamais vert, pour ne pas se confondre avec le trait vert d'une piste à vélo ni dire « ouvert » sans le savoir. Touchable : un appui ouvre la page du jardin. Icône `trees` (comme le bloc « Jardin ouvert » ou « Lieu frais » de Fontaine et WC). **Cimetières** (v545, mes choix 1A 2A du 27 nov. 2026) : contour encre `--ink` 3 px, ouvert ou fermé (on les distingue des squares, et ils ne disparaissent pas le soir) ; l'intérieur vert à 30 % dit toujours « ouvert ». Du zoom 12 au zoom 16, une étiquette papier à contour encre 1,5 px, la fleur `flower-2` et le nom court (« Père-Lachaise ») au centre du cimetière ; touchable (page du cimetière), sous mes gouttes ; elle se cache sous un bouton de la carte ou sous la page ; un numéro d'arrondissement qu'elle touche se cache. À partir du zoom 17, les numéros des divisions prennent la place.
- **Boulangeries primées** (v265, bas d'Autour de moi) : épis de blé (`wheat`, Lucide) terre cuite `--disc` dans un rond fond `--bg` bordé de terre cuite 1,5 px (`.cat-ico.prized-ico`), jamais le rond plein d'une adresse TTB. L'icône `wheat` ne veut rien dire d'autre. Pas sur la carte.
- **Aucune ombre** dans les écrans. Seule exception : une ombre douce `--float`, pour ce qui flotte sur la carte (boutons de la colonne, barres du haut et du bas, météo, « Maintenant ») et la feuille elle-même, sinon ils se perdent dans le fond de carte.

## 4. Mesures
- Hauteur d'un bouton, d'une puce, d'un champ, d'un onglet : **`--h` = 48 px**. Cible compacte : **`--h-s` = 44 px**, jamais moins. Action principale en grand : **`--h-l` = 56 px**.
- Contour d'un bouton, d'un champ ou d'une tuile : **2 px** (v297 : Chrome dessinait le 1,5 px d'avant comme 1 px, la différence ne se voyait pas). Filet fin entre deux lignes : 1 px `--line`. Filet fort sous un intertitre : 2 px encre. Les tampons (`.tag`), pastilles et épingles gardent 1,5 px.

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
- **Exception voulue : les dessins des monuments** (v386, mes choix du 24 nov. 2026, claude/idee-reperes.md). 19 grands monuments dessinés pour l'appli (`js/reperes.js`, pas copiés d'un autre service), seulement sur la carte vue de loin (zooms 12 et 13), 48 px, pied du monument sur sa position Wikidata. Trait encre, intérieur kraft ou papier, un seul détail terre cuite, **pas de bleu** (le bleu veut dire métro), sans pastille (le rond veut dire métro, le carré arrondi passage couvert), liseré papier. Pas touchables. Un dessin qui touche un bouton, une goutte ou un dessin plus important se cache ; un numéro d'arrondissement qu'il touche se cache à sa place. Réglages → Autres réglages → La carte → Dessins des monuments (allumé au départ). Nulle part ailleurs que sur la carte.
- Les **emoji** ne servent qu'aux icônes de catégories, choisies par la personne. Aucun emoji écrit dans un bouton ou un lien (vérifié).
- Le métro s'écrit avec la pastille « M » (`.m-badge`) ; « Ⓜ » reste permis dans un texte qui nomme une station.
- Seul symbole permis dans un libellé : la flèche de retour « ← Nom de l'écran ».
- **La grosse lettre terre cuite** (« Édito lettrine », v327) ne veut dire qu'une chose : **le genre d'une sortie sans photo**, dans sa vignette de 56 × 76 (« Photos dans Sorties » allumé), le genre écrit dessous à l'horizontale. Nulle part ailleurs : ni titres, fiches, listes de lieux, carte, Aide, écrans vides, premier lancement, ni icône de l'appli ; ni mot vertical ou empilé (mes choix du 20 nov. 2026, essayés en maquette puis écartés).

## 7 bis. Photos (règle du 20 novembre 2026, mon choix A)
1. **Ma photo d'abord** : elle seule va sur mes lieux. Réduite à 1280 px, sans position (EXIF effacé), gardée sur le téléphone, jamais envoyée par l'appli. Exception (mon choix du 20 nov. 2026, v307) : « Exporter » de Mes Vu en passant, que je lance moi-même, remet la position, la date et ma ligne dans chaque photo du fichier, avec un rappel visible (« qui les reçoit le voit »).
2. **Une photo officielle** seulement si la source de la donnée la fournit (agenda de la Ville) ou si la liste est courte et chaque photo choisie à la main. **Jamais appariée automatiquement** (une photo de Wikidata n'est pas toujours le bon lieu).
3. Copiée dans l'appli ou servie par la source de la donnée : pas de nouveau service d'images (seule exception aujourd'hui : cdn.paris.fr, pour l'agenda).
4. **Jamais** dans une ligne de liste, le bandeau « Parcourir », une plaque ou sur la carte : seulement sur la page d'un lieu ou d'une sortie, et elle ne fait jamais bouger les boutons une fois la page ouverte. **Deux exceptions** : la vignette de mes « Vu en passant » sur la carte ; la page **Mes Vu en passant** (+ Ajouter), mosaïque de mes photos prises en passant, 3 par rangée (mon choix du 20 nov. 2026, v306) ; depuis la v329 (mes choix A + B), les catégories en onglets texte, la plus récente « à la une » en 4:3 sur toute la largeur avec son cartel, les autres rangées par jour. Seulement mes photos, jamais une photo officielle. **Troisième exception** (mes choix 1B 6A 7A du 20 nov. 2026, v327) : « Photos dans Sorties » (Réglages, tout en bas, **éteint au départ**) met la photo de l'agenda à la place de l'icône du genre dans chaque liste de sorties de l'agenda, en vignette de 56 × 76 px calée en haut de la ligne ; sans elle, ma photo de la salle (Réglages → Autres réglages → Photos des salles), sinon une vignette de la même taille dessinée dans l'appli (« Édito lettrine », mon choix 7 du 20 nov. 2026) : la grande initiale du genre en terre cuite, le genre écrit dessous sous un filet ; les circuits gardent leur icône. Ici, **la photo de l'agenda passe avant la mienne** (mon choix 2C) : ma photo d'une salle n'est qu'un secours.
5. **Crédit visible** sous une photo officielle (« © … »), jamais replié dans « Aide ». La vignette d'une liste de sorties n'a pas de crédit (illisible à 56 px) : il reste sous la photo, sur la page de la sortie, à un appui (v327).
6. Formats en usage : ma photo en bandeau de 150 px sur la fiche ; en tête d'un passage couvert ou d'un jardin, 100 px (84 en Grand, 60 en Très grand) ; la photo de l'agenda en tête d'une sortie, même bandeau de 100 px (84, 60) depuis la v279 (mon choix B du 20 nov. ; avant : 16:9, 182 px) ; sur la fiche d'une photo prise en passant, la photo en 4:3 sur toute la largeur, juste sous Y aller (v326, mon choix 2A du 20 nov. : la photo est le sujet de cette fiche). Vignette d'une liste de sorties : 56 × 76 px, en haut de la ligne, la distance reste centrée (v327). Un toucher l'ouvre en grand : fond noir, « 1 / 2 » et une croix en haut, la pellicule (vignettes de 56 px) et le cartel en bas (v329). Pas de nouveau format sans mon accord.
7. Monuments, œuvres et musées : **pas de photo** dans l'appli ; le lien Wikipédia (qui s'ouvre souvent sur une photo) suffit (mon choix A du 20 nov.).

## 8. Navigation et vocabulaire
- Retour : **« ← Nom de l'écran d'avant »**, jamais « ← Retour » seul ; sur les pages longues, il reste collé en bas (`foot(...)`, barre séparée par un filet encre).
- Formulaires : **Annuler** (contour neutre) à gauche, **Enregistrer** (plaque pleine verte) à droite.
- Placer un point : **Valider ici**. Supprimer : toujours confirmé, bouton brique.
- Interrupteurs (Favori, Déjà visité) : libellé fixe, état dit par `aria-pressed` et un fond léger quand c'est allumé.
- **Choix sélectionné dans une page** (segments, puces, icônes, jours ; v297, mon choix du 20 nov.) : fond léger `--info-bg`, contour encre, texte gras, comme Favori. Il n'y a donc qu'une plaque pleine par écran. Sur la carte (barre du haut, bandeau « Maintenant »), le bouton allumé reste plein : un fond clair s'y verrait mal.
- **Oui / non dans un formulaire** (Favori et Abrité de Modifier le lieu, v297) : un interrupteur, comme dans Filtres et Réglages ; la fiche garde ses boutons Favori et Déjà visité.
- **Enregistrer** : toujours la plaque pleine verte (`btn c-add solid`), même dans les Réglages (v297), et un seul par écran (Cercles : un seul « Enregistrer » en bas pour les deux champs). Exception : « Enregistrer le prénom » reste en contour vert là où l'envoi est la plaque de l'écran (Sauvegarde, Envoyer à un proche).
- **Contour en tirets** = bouton inactif, et rien d'autre (v297 : « Prendre une photo » et « + Nouvelle » passés en contour plein).
- Un choix parmi plusieurs (Matin, Midi, Soir…) : des puces de 48 px, partout la même forme (v297).
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
  | une visite datée d'un de mes lieux | **impression** (« Écrire une impression » pour la page, « Impression » pour le bouton de la fiche, v297 ; « Mes impressions ») | passage (réservé aux **passages couverts**) |
  | mon texte sur un lieu / les étoiles / la page du jour | **Commentaire** / **Mes étoiles** / **Note du jour** | note (pour les deux premiers) |
  | message électronique | **courriel** | mail |
  | les mots à toucher sous « En quelques mots » (v226, nommé ainsi depuis la v404) | **Mots tout prêts**, rangés en **séries** (« Repas », « Visite ») | liste (réservé aux listes de lieux), modèle |
  | ce qu'est un resto, comme dans TTB : La Table, Boui-boui, Street-food (v288) | **Genre**, dans la ligne au-dessus du nom de la fiche et en bas de Modifier | rubrique (réservé aux parties d'un écran et au guide TTB), type, catégorie |
  | une photo et une ligne posées là où je suis (v302 à v312) | **Vu en passant** ; la note : **prise en passant** ; ma mosaïque : **Mes Vu en passant** ; le niveau sous la catégorie : **sous-catégorie** (Street art : l'artiste) | |
  | faire d'une photo prise en passant l'impression d'un de mes lieux (v310) | **Rattacher** (à un de mes lieux) | |
  | sortir mes photos en .zip (v307) | **Exporter** (« Télécharger », « Envoyer ») | |
  | une rue tracée sur la carte comme un de mes lieux (v384) | **rue d'intérêt** (« Une rue d'intérêt », « Toute la rue ») | |
  | le chemin par les rues, calculé sur le téléphone (v383) | **Chemin à pied** (Y aller ouvre toujours Google Maps) | |
  | la page d'un point touché sur la carte doigt appuyé, ou d'une adresse de la loupe (v378, v399) | **Ce point** | |
  | mes réglages figés pour y revenir, sans mes lieux (v414) | **Réglages de référence** | réglages par défaut (ancien nom), sauvegarde |
  | mes lieux retirés de la carte le temps de la session (v427) | **Lieux masqués · Afficher** | Cacher |
  | ce qu'un lieu offre en plus, coché par moi (v422) | **Café ou snack sur place**, **Boutique sur place** dans Modifier ; « Café », « Boutique » sur la fiche | |
  | les stations autour d'un lieu ou de moi (v393, v394) | **Stations proches** (page) ; **Autres stations près de toi** (sous Métro) | |
  | les fonds de carte sans clé de l'IGN (v382) | **Plan IGN**, **Photo aérienne** | |
  | l'aspect de toute l'appli (v452, v464) : **Papier**, **Verre**, **Signalétique**, **Pop** ; en sombre toujours Signalétique | **Style** dans **Apparence** (Réglages → Apparence → Le jour) | thème, design, apparence ; « Style de la carte » reste le fond de carte |
- **Deux voix** : les noms d'écrans et de boutons parlent comme moi (Mon planning, Autour de moi, J'ai du temps, Où suis-je ?) ; les phrases me tutoient (« touche… », « tes lieux »). Jamais de vouvoiement. Claude est toujours nommé à la 3e personne.
- **Accords au féminin** : l'appli s'adresse à moi au féminin (« Tu y es allée ? », « Tu es déjà passée ici ») ; l'autre personne, un homme, allume « Écrire au masculin » (v286 ; les phrases sont dans `ACCORDS` de js/typo.js).
- **Typographie à l'affichage** (`js/typo.js`, appliquée par `el()` et `toast()`, jamais dans un champ) : espace insécable avant « : ; ? ! » % » et après « « » ; heures « 9 h 30 » (un module peut écrire « 9h30 », l'écran montre « 9 h 30 ») ; « 1er » pour le premier jour du mois. Un texte posé autrement (`textContent`) passe aussi par `typo()`.
- **Aide d'un écran** (v234) : les explications (comment faire, astuces, sources) sont marquées `help tip` et rangées par `gatherTips()` dans une seule ligne « Aide » (`ico('info')`), repliée, en bas de la page, juste au-dessus de la barre du bas ; elle reste ouverte si l'écran est redessiné. Restent à leur place : alertes, comptes, « Recherche… », pages vides, aide d'un champ, mises en garde sur ce qui est affiché, ce qui part du téléphone (vérifié par `tests/aide-repliee.test.mjs`). **Pas de texte gris de plusieurs lignes** (v250) : ce qui reste visible tient en une ou deux phrases courtes (la mise en garde, ce qui part du téléphone, l'état) ; son explication, sa source et sa date vont dans un `help tip` juste à côté, donc dans l'Aide (au-delà de 200 signes, le test échoue).
- **Retour à la même hauteur** (v150) : revenir à un écran (« ← Nom », bouton retour du téléphone) ou le redessiner le rouvre là où on l'avait laissé ; un écran ouvert pour la première fois commence en haut (`openSheet`, pile `navStack`).

## 9. Contrôle après chaque changement
`npm test` (dont ce test de charte), puis `node tools/controle-ecrans.mjs` (voir `tools/README.md`) : 14 écrans à 360 et 412 px, en clair et en sombre, boutons d'au moins 44 px, contraste d'au moins 4,5:1, contrôle axe sans erreur.

## 10. Styles de l'appli (v452, mes choix 1B 2A 3A 4A du 25 novembre 2026)
Quatre styles (v464), **mêmes écrans, mêmes boutons aux mêmes places, mêmes tailles** (hauteurs `--h`, `--h-s`, `--h-l`, échelle du texte) ; seuls changent couleurs, formes, ombres et police des titres. Au choix dans Réglages → Apparence → Le jour (v463 : page Apparence, à la place de l'interrupteur Mode sombre) : **Papier** (§ 1 à 8, au départ), **Verre**, **Signalétique** ou **Pop** (v464, mon choix A du 25 nov. : les quatre au choix) ; quand le mode sombre est allumé, c'est toujours **Signalétique**. L'attribut `data-look` (`papier`, `verre`, `signal`, `pop`) porte le style affiché ; `data-theme` vaut `dark` en mode sombre et quand Signalétique est choisi (`shownDark()`). Le style va dans la sauvegarde, les réglages de référence et le fichier de réglages. Vérifié par `tests/styles.test.mjs` et `tests/charte.test.mjs` ; contrôle des écrans : `LOOK=verre node tools/controle-ecrans.mjs` (Verre), `THEMES=dark` (Signalétique).
- **Règles communes** : les couleurs restent des jetons ; chaque style a **un seul bloc de jetons** (`:root`, `:root[data-look="verre"]`, `:root[data-theme="dark"]`, `:root[data-look="pop"]`) et une **section de règles à part, en fin de `css/style.css`**, dont chaque sélecteur commence par son attribut. Exception voulue au § 1 (« pas de couche ») : c'est la seule couche permise, une par style. Un style ne touche jamais une hauteur, une largeur ni une taille de texte. Les sens restent : bleu = métro, vert = garder et ouvert, rouge = fermé et supprimer, or = favori, une seule plaque pleine par écran, tirets = inactif. Contrastes : textes 4,5:1 sur la feuille, le papier et le kraft, étoiles et contours de champ 3:1, texte de plaque 4,5:1.

### 10.1 Verre (le jour)
- **Esprit** : panneaux clairs et translucides posés sur la carte, formes douces, une seule police (Inter, `--display` aussi), pas de filets forts.
- **Couleurs** : encre `#1A1D2B`, gris `#5A6072`, feuille `#F3F2F8` (translucide à 86 % sur la carte), kraft `#E9E7F2`, Découvrir prune `#8B2C7A`, métro `#1F4FD6`, vert `#1E6B4E`, fermé `#B3261E`, favori `#7A5A0C` (étoiles `#A87400`).
- **Formes** : rayon `--r` 14 px ; puces et tampons en pilule ; boutons ronds de la carte et boutons ronds des titres en cercle ; feuille arrondie de 26 px en haut. Boutons au repos : fond blanc translucide `--btn`, bord clair 1 px `--glass-edge`, ombre douce `--glass-shadow` ; la couleur de la famille reste sur le texte et l'icône. Un choix allumé, une plaque, un bouton inactif gardent l'aspect Papier.
- **La plaque** (Y aller, Autour de moi, toute `.primary`) : dégradé corail-prune `--plaque-img` (`#C8381F` → `#8A1F6E`), texte blanc, ombre `--plaque-shadow`. Enregistrer reste la plaque verte.
- **Flou** (`--glass-blur`) seulement sur ce qui flotte sur la carte (barre du haut, colonne, barre du bas, bandeaux) et la feuille : jamais sur chaque bouton d'une page (il coûte sur un vieux téléphone).
- **Pas touchés** : la boussole et la photo en grand ; ce qui est dessiné sur la carte (gouttes, tracés, cercles).
- **Défaut connu** : sur une carte très chargée et en plein soleil, un panneau translucide se lit moins bien que le papier ; d'où une feuille presque opaque (86 %).

### 10.2 Signalétique (le mode sombre, ou choisi jour et nuit)
- **Esprit** : panneaux de signalisation la nuit : fond nuit, grandes plaques jaunes, boutons en pilule, filets forts jaunes. Remplace « papier de nuit » (avant la v452).
- **Couleurs** : voir le tableau du § 2 (colonne Sombre). La plaque pleine (`--strong`) et la famille Aller (`--guide` : Y aller, Boussole, bouton allumé de la barre du haut) sont jaunes `#FFD23F`, texte `#111111` (13:1).
- **Formes** : boutons, puces, boutons de la carte et tampons en pilule (999 px) ; rayon `--r` 10 px pour le reste ; feuille arrondie de 26 px en haut, poignée jaune ; intertitres, colonnes de la fiche, barre du bas et onglets soulignés en jaune. Titres d'Archivo en pleine largeur (100 %, le nom d'un lieu 96 %) ; boutons en gras 800.
- **Défaut connu** : un fond sombre se lit moins bien en plein soleil (le mode sombre suit le téléphone par défaut) ; le jaune des étoiles est proche du jaune des plaques (l'étoile garde sa forme).

### 10.3 Pop (v464, mon choix A du 25 novembre 2026)
- **Esprit** : néo-brutal : contours noirs épais, ombre dure décalée, aplats vifs, titres serrés en capitales.
- **Couleurs** : encre `#0A0A0A`, blanc, kraft jaune `#FFE45C` ; familles en texte foncé (Découvrir `#A82E08`, métro `#1440D6`, vert `#0B6B43`, fermé `#B4161B`, favori `#7A5000`, étoiles `#9A6A00`). **Exception voulue au § 1** (« jamais de fond teinté au repos ») : les boutons des familles ont un aplat clair (métro `#D6E2FF`, vert `#B7F5D5`, favori jaune, Découvrir `#FFD2BF`), texte encre dessus.
- **Formes** : rayon `--r` 12 px ; contours de 3 px en encre (boutons, puces, colonne, barre du bas, feuille) ; ombre dure `4px 4px 0` encre ; appuyé, le bouton s'enfonce (l'ombre disparaît). Choix allumé de la barre du haut et onglet choisi : jaune.
- **La plaque** (`.primary` : Y aller, Autour de moi) : rose `#FF7AB0`, texte encre (8:1). Enregistrer reste la plaque verte.
- **Titres** : Archivo noir 900 très serré (66 %), **en capitales** ; intertitres en capitales sur filet de 3 px ; surtitre en pastille encre, lettres jaunes.
- **Pas touchés** : comme Verre (boussole, photo en grand, carte).
- **Défaut connu** : capitales et lettres serrées moins lisibles avec des lunettes (v177, v186 l'avaient constaté) ; le style le plus chargé.


### 10.4 Puces et icônes selon le style (v467, mes choix 1A 2A du 25 novembre 2026, sur la planche)
- **Traits des icônes** (`--icon-stroke`, seulement dans l'appli posée sur la carte) : Papier 2, Verre 1,6, Signalétique et Pop 2,6.
- **Icône d'une ligne de Sorties** (`.genre`, 36 px dans sa colonne de 36 px) : Papier nue ; Verre dans un disque teinté prune ; Signalétique dans un anneau de sa couleur ; Pop dans une case à contour noir et ombre dure.
- **Tampons** : Papier rectangle à contour ; Verre pastille teintée sans contour (« Gratuit » sur fond vert pâle) ; Signalétique pilule à contour ; Pop case blanche à contour noir (« Gratuit » menthe).
- **Choix parmi plusieurs** (`.seg`) : Verre pastilles grises, le choix en plaque encre ; Signalétique pilules, le choix en jaune ; Pop cases à contour noir, le choix jaune avec ombre. **Exception voulue au § 8** (choix sélectionné en fond léger) pour Verre, Signalétique et Pop. **Interrupteur** allumé : Verre dégradé corail-prune, Signalétique jaune (bouton nuit), Pop rose à contour noir.
- **Colonne de la carte en Pop** : aplats des familles (métro bleu pâle, vert menthe, Découvrir pêche).
- **Gouttes de mes lieux** : même forme et même couleur partout ; seul leur contour change (`--pin-edge`) : Verre liseré blanc et ombre douce, Signalétique liseré nuit, Pop liseré noir et ombre dure.
