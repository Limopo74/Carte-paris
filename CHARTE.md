# Charte « Plaques & pavés » — Ma carte de Paris

> **En transition vers la charte « Papier »** (décidée le 16 novembre 2026). Décisions : couleurs « Papier » (encre `#15181D` sur papier blanc, « papier de nuit » en sombre), la couleur signale sans décorer (plus de fond teinté sur un bouton au repos), boutons à contour de la couleur de leur famille, Favori et Déjà visité restent des boutons, filets fins à la place des cadres de liste, **un seul rayon de 4 px**, aucune ombre, pas de police à empattements. Migration par étapes : 1 couleurs (fait, v94) · 2 fiche d'un lieu (fait, v95 : version A « Sommaire », règles `.detail` et `.fiche-*` ; échelle de texte + 26 px pour le nom) · 3 listes (fait, v96 : lignes à filet `--line`, intertitres `.ring-title` sur filet encre, rubriques sans liseré ni pastille teintée, icônes de genre sans fond, petites actions de ligne en contour 1,5 px) · 4 réglages et formulaires (fait, v99 : tous les `.btn` en contour 1,5 px de leur famille, 4 px, sans fond au repos ni ombre ; tuiles `.tool` sans médaillon ; champs, onglets `.seg`, en-tête et barre du bas de la feuille) · 5 carte (fait, v102 : colonne, barre du haut, barre du bas, météo, « Maintenant » ; ombre douce `--float` seulement pour ce qui flotte sur la carte ; « Ajouter » en contour, « Autour de moi » seule plaque) · 6 nettoyage, puis réécriture de ce fichier et du test. Tant qu'une étape n'est pas faite, les règles ci-dessous restent valables pour les écrans concernés.

Règles d'apparence de toute l'appli. Elles sont vérifiées par `tests/charte.test.mjs` (lancé avec `npm test`) : une modification qui s'en écarte fait échouer les tests.

## 1. Principe
- **Couleur = famille d'action** (jamais une décoration).
- **Forme = importance** : une seule plaque pleine par écran (l'action principale), des contours teintés pour le reste, des tampons pour les états.
- **Une seule source** : toutes les couleurs et mesures sont des jetons, définis une fois en tête de `css/style.css` (`:root`, puis `:root[data-theme="dark"]` pour le mode sombre). On ne réécrit jamais une couleur en dur dans une règle d'interface, et on n'ajoute jamais une « couche » qui redéfinit une règle existante : on modifie la règle elle-même.

## 2. Couleurs (jetons)
| Famille | Jeton | Usage |
|---|---|---|
| Aller | `--strong`, `--aller-bg` | Y aller, Où suis-je, se guider |
| Transport | `--metro` (#1B56E8), `--metro-bg` | Métro, stations, Vélib', Rentrer |
| Découvrir | `--disc` (terre cuite), `--disc-bg` | Sorties, Curiosités, Monuments, marchés |
| Garder | `--add` (vert Wallace), `--add-bg` | Ajouter, Enregistrer, Exporter, Importer |
| Favori | `--fav` (texte), `--fav-icon` (étoile), `--fav-bg` | Favoris |
| Réglages | `--info`, `--info-bg` | Réglages, aide, choix d'affichage |
| Supprimer | `--danger`, `--danger-bg` | Supprimer, effacer |
| Neutre | `--neutral-bg`, `--neutral-bd` | Annuler, retours « ← … » |

États et messages : `--warn-*` (avertissement), `--rain-*` (pluie), `--heat-*` (chaleur), `--aq-*` (qualité de l'air : bon bleu-vert, moyen orange, mauvais prune — les mêmes partout, Météo comme Mon Paris), `--g-*` (fond d'icône de genre des sorties, jamais sur un bouton).
Texte : `--ink`, `--muted` (aide, sous-titres), `--on-strong` (texte posé sur une plaque pleine). Lignes : `--line` (séparateurs), `--btn-bd` (contour des cartes), `--field` (contour des champs, interrupteur éteint, étoiles vides). Focus clavier : `--focus`.

## 3. Formes
- **Un seul rayon : `--r` = 8 px** pour tout ce qui est rectangulaire (boutons, champs, puces, onglets, cartes, tuiles, encadrés, boutons de la carte).
- `--r-s` = 4 px pour les **tampons** et petites étiquettes.
- **Rond** (50 % ou pilule 999 px) pour les pastilles, médaillons, interrupteurs.
- Exceptions : coins hauts de la feuille (18 px), goutte des épingles, pastilles de lignes métro/RER (signalétique IDFM), barres des graphiques.

## 4. Mesures
- Hauteur d'un bouton, d'une puce, d'un champ, d'un onglet : **`--h` = 48 px**. Cible compacte (flèches ↑↓, étoiles, copier, pastille météo) : **`--h-s` = 44 px**, jamais moins. Action principale en grand : **`--h-l` = 56 px**.
- Contour d'un bouton : 2 px. Contour d'une carte ou d'un champ : 1,5 px.
- Ombre « pavé » `--pave` (0 2 px 0, dure) pour tout ce qui est posé : boutons, cartes, puces — en clair comme en sombre. Pas d'ombre floue dans l'interface (seulement pour ce qui flotte sur la carte : feuille, message).

## 5. Texte
- Polices : **Inter** pour le texte, **Archivo** pour les titres et les boutons.
- Échelle : **11,5 · 13 · 14 · 16 · 18 · 22 px**. 11,5 = titres de section (majuscules espacées) et tampons ; 13 = petits boutons ; 14 = aide et sous-titres ; 16 = texte et boutons ; 18 = grands boutons ; 22 = titre de la feuille et sortie vedette.
- Les tailles d'icônes et les étiquettes posées sur la carte ne suivent pas cette échelle.
- Noms et sous-titres : 2 lignes au plus. Jamais d'opacité sur un texte : un texte atténué prend `--muted`.

## 6. Listes
- **Un seul cadre** pour toute liste et tout encadré (Autour de moi, Chercher, Curiosités, Sorties, résultats, rubriques, plis d'aide, styles de carte) : fond `--surface`, contour 1,5 px `--btn-bd`, rayon `--r`, ombre `--pave`.
- Les boutons d'une ligne (boussole, M, +) restent dans la ligne, toujours au même endroit.

## 7. Icônes
- **Dessins Lucide uniquement** dans l'interface (`ico('nom')`, fichier `js/icons.js` ; pour en ajouter : copier depuis lucide-static).
- Les **emoji** ne servent qu'aux icônes de catégories, choisies par la personne.
- Le métro s'écrit avec la pastille « M » (`.m-badge`) ; « Ⓜ » reste permis dans un texte qui nomme une station.
- Seul symbole permis dans un libellé : la flèche de retour « ← Nom de l'écran ».

## 8. Navigation et vocabulaire
- Retour : **« ← Nom de l'écran d'avant »**, jamais « ← Retour » seul ; sur les pages longues, il reste collé en bas (`foot(...)`).
- Formulaires : **Annuler** (neutre) à gauche, **Enregistrer** (plaque pleine verte) à droite.
- Placer un point : **Valider ici**. Supprimer : toujours confirmé, bouton brique.
- Les boutons ne changent jamais de place d'un écran à l'autre.

## 9. Contrôle après chaque changement
`npm test` (dont ce test de charte), puis à 360 et 412 px en clair et en sombre : boutons d'au moins 44 px, contraste d'au moins 4,5:1, contrôle axe sans erreur.
