# Ma carte de Paris v2 — design court

Date : 15 novembre 2026. Fait suite à `2026-11-15-carte-paris-design.md`. L'appli doit rester simple.

## Choix de l'utilisatrice
- Ajouter un lieu par **appui long** sur la carte.
- **Chercher dans mes lieux.**
- **Déplacer un point** avec un **viseur fixe** : la carte glisse sous le viseur, puis « Valider ici ».
- **Catégories personnelles**, toutes modifiables (nom, couleur, suppression), avec au moins une catégorie restante. Supprimer une catégorie qui contient des lieux demande dans quelle autre catégorie les ranger.
- **Favoris ⭐.**
- Écartés : filtre « À faire », partage, horaires, étiquettes.

## Approches considérées
- Appui court ou appui long : appui long choisi (comme Google Maps et Mapstr), pour éviter les ajouts involontaires.
- Glisser le point ou viseur fixe : viseur choisi, plus précis au doigt.
- Catégories libres ou les 3 fixes plus des catégories ajoutées : tout modifiable choisi.

## Choix de construction (proposés par Claude)
- L'appui long ouvre directement le formulaire « Nouveau lieu » à cet endroit, avec l'adresse retrouvée automatiquement. Le bouton « Annuler » suffit si l'appui était involontaire.
- Barre du haut : 🔍 puis les puces Tout, ⭐ Favoris, puis une puce par catégorie (la barre défile si les catégories sont nombreuses). ⭐ s'ajoute au filtre de catégorie.
- La recherche porte sur le nom, la note, l'adresse et la catégorie, sans tenir compte des accents ni des majuscules. Les résultats sont triés par distance si la position est connue, sinon par ordre alphabétique.
- Favori : interrupteur dans le formulaire et bouton dans la fiche. Sur la carte, les favoris ont un contour doré.
- Catégories : 8 couleurs au choix, nom de 20 caractères au plus. La gestion se fait dans Réglages.
- Données : `categories: [{id, name, color}]` ajouté à l'état. Un ancien état sans catégories reçoit les 3 catégories d'origine (mêmes identifiants : resto, boutique, culture). L'export contient les catégories. L'import ajoute les catégories inconnues du fichier, et les lieux d'une catégorie inexistante sont ignorés.
