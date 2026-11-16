# Charte « Papier » — Ma carte de Paris

Règles d'apparence de toute l'appli, en place depuis la v103 (16 novembre 2026). Elles remplacent « Plaques & pavés ». Elles sont vérifiées par `tests/charte.test.mjs` (lancé avec `npm test`) : une modification qui s'en écarte fait échouer les tests. Analyse et contrastes détaillés : document « charte-editoriale » du projet.

## 1. Principe
- **Encre sur papier** : texte presque noir sur fond blanc ; en sombre, « papier de nuit ». Lisible dehors, au soleil.
- **La couleur signale, elle ne décore pas** : elle dit la famille d'une action (texte, icône et contour d'un bouton) ou un état (ouvert, fermé). Jamais de fond teinté sur un bouton au repos.
- **Forme = importance** : une seule plaque pleine par écran (l'action principale), des contours pour le reste, des tampons pour les états.
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
- **Aucune ombre** dans les écrans. Seule exception : une ombre douce `--float`, pour ce qui flotte sur la carte (boutons de la colonne, barres du haut et du bas, météo, « Maintenant ») et la feuille elle-même, sinon ils se perdent dans le fond de carte.

## 4. Mesures
- Hauteur d'un bouton, d'une puce, d'un champ, d'un onglet : **`--h` = 48 px**. Cible compacte : **`--h-s` = 44 px**, jamais moins. Action principale en grand : **`--h-l` = 56 px**.
- Contour d'un bouton, d'un champ ou d'une tuile : 1,5 px. Filet fin entre deux lignes : 1 px `--line`. Filet fort sous un intertitre : 1,5 px encre.

## 5. Texte
- Polices : **Inter** pour le texte, **Archivo** (étroit) pour les titres et les boutons. Pas de police à empattements.
- Échelle : **11,5 · 13 · 14 · 16 · 18 · 22 · 26 px**. 11,5 = intertitres (majuscules espacées) et tampons ; 13 = surtitre, légende, petits boutons ; 14 = aide et sous-titres ; 16 = texte et boutons ; 18 = chapô et grands boutons ; 22 = titre de la feuille ; 26 = nom d'un lieu dans sa fiche.
- **Titraille de la fiche** : surtitre (catégorie · arrondissement) en terre cuite, nom en 26 px, chapô (ton commentaire) en 18 px, intertitres sur filet encre.
- Noms et sous-titres : 2 lignes au plus. **Jamais d'opacité sur un texte** : un texte atténué prend `--muted` (ou `--compass-muted` dans la boussole). Un bouton inactif : texte gris et contour en tirets.

## 6. Listes et informations
- Une liste = des lignes séparées par un filet fin `--line`, sans cadre ni ombre, sous un intertitre souligné d'un filet encre (`.ring-title`, `.fiche-sec`). Pas de filet fin juste avant un intertitre.
- Les boutons d'une ligne (boussole, M, Y aller, +) restent dans la ligne, toujours au même endroit, en simple contour.

## 7. Icônes
- **Dessins Lucide uniquement** dans l'interface (`ico('nom')`, fichier `js/icons.js` ; pour en ajouter : copier depuis lucide-static).
- Les **emoji** ne servent qu'aux icônes de catégories, choisies par la personne. Aucun emoji écrit dans un bouton ou un lien (vérifié).
- Le métro s'écrit avec la pastille « M » (`.m-badge`) ; « Ⓜ » reste permis dans un texte qui nomme une station.
- Seul symbole permis dans un libellé : la flèche de retour « ← Nom de l'écran ».

## 8. Navigation et vocabulaire
- Retour : **« ← Nom de l'écran d'avant »**, jamais « ← Retour » seul ; sur les pages longues, il reste collé en bas (`foot(...)`, barre séparée par un filet encre).
- Formulaires : **Annuler** (contour neutre) à gauche, **Enregistrer** (plaque pleine verte) à droite.
- Placer un point : **Valider ici**. Supprimer : toujours confirmé, bouton brique.
- Interrupteurs (Favori, Déjà visité) : libellé fixe, état dit par `aria-pressed` et un fond léger quand c'est allumé.
- Les boutons ne changent jamais de place d'un écran à l'autre.

## 9. Contrôle après chaque changement
`npm test` (dont ce test de charte), puis `node tools/controle-ecrans.mjs` (voir `tools/README.md`) : 11 écrans à 360 et 412 px, en clair et en sombre, boutons d'au moins 44 px, contraste d'au moins 4,5:1, contrôle axe sans erreur.
