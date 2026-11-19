# Outils de contrôle

Scripts de vérification des écrans, à lancer après un changement visible. Ils ne font pas partie de `npm test` (qui reste rapide et sans navigateur).

## Installer une fois

```sh
cd tools
npm install
npx playwright install chromium
```

## Lancer

Dans un premier terminal, à la racine du dépôt :

```sh
python3 -m http.server 8765
```

Dans un second, à la racine du dépôt :

```sh
node tools/controle-ecrans.mjs
```

Le script ouvre la carte, la fiche d'un lieu, Autour de moi, Sorties, Chercher, Nouveau lieu, Réglages, Application, Données des transports, la station la plus proche, l'onglet Navigo de Sorties, la fiche d'un lieu Navigo, Mon planning, l'Aide, les calques Vélib' et Fontaines et WC (de près, de loin, une station, une toilette ; données simulées, dont une station muette depuis 3 h) Filtres, ⋯ Plus de la barre du haut et son réglage, à 360 et 412 px, en clair et en sombre. Pour chaque écran : contrôle axe (contraste compris), boutons de moins de 44 px, erreurs JavaScript. Il range une capture par écran dans `captures/` (non versionné) et se termine en erreur s'il trouve un défaut.

Options (variables d'environnement) :

- `ECRANS=fiche,sorties` : seulement ces écrans ;
- `LARGEURS=360x740` : seulement cette taille ;
- `THEMES=dark` : seulement le mode sombre ;
- `URL=http://localhost:8765/` : adresse de l'appli ;
- `SORTIE=captures` : dossier des captures.
- `TEXTE=grand` ou `TEXTE=tresgrand` : contrôle avec la taille du texte choisie (v144). Le contrôle signale aussi un bouton qui sort de l'écran ou dont le texte dépasse.
- `STYLES=dossier` : relève en plus les styles calculés de chaque élément (un fichier .json par écran). Pour un nettoyage du CSS : relevé avant, relevé après, puis comparer les fichiers ; il ne doit y avoir aucune différence. Les états absents des écrans (bouton enfoncé, survol, pluie, marchés) se vérifient à part dans une petite page.

Rien ne part sur Internet pendant le contrôle : les fonds de carte et les services en ligne sont coupés, et l'agenda de Sorties est simulé avec cinq sorties fictives. Les vrais services (agenda, galeries, météo, Vélib') ne sont donc **pas** vérifiés ici.

## Robot du plan des rues (Mes parcours, v244)

`.github/workflows/maj-rues.yml` refait `data/rues.json` le 2 de chaque mois (ou à la demande : onglet Actions → « Plan des rues » → Run workflow) avec `tools/maj-rues.py` : les rues où l'on marche dans Paris, trottoirs compris, et les parcs, demandés à OpenStreetMap en 10 morceaux. Jamais bloquant : s'il manque un morceau, ou si le plan est trop petit ou trop morcelé, le plan d'avant reste. Le fichier (format 2, environ 6 Mo, 1,7 Mo compressé en novembre 2026) n'est pas installé avec l'appli : il est téléchargé la première fois que « Mes parcours » sert, puis gardé à part sur le téléphone.

## Robot de mise à jour des données (GitHub Actions)

`.github/workflows/maj-donnees.yml` refait chaque 1er du mois (ou à la demande : onglet Actions → « Mise à jour des données » → Run workflow) les lignes et gares, les avantages Navigo, les toilettes RATP et les contours des arrondissements (`maj-arrondissements.py`, pour Mon Paris). Il télécharge les exports officiels (API Opendatasoft d'IDFM et de la RATP), relance `maj-lignes.py`, `maj-navigo.py` et `maj-sanitaires.py`, puis `verif-donnees.py` (aucun fichier vide, pas plus de 20 % d'éléments perdus, champs « oui » encore présents) et `npm test`. Il ne publie que si tout passe. Mérimée, marchés couverts et listes annuelles restent à faire avec Claude.
