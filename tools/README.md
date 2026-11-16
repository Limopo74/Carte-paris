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

Le script ouvre la carte, la fiche d'un lieu, Autour de moi, Sorties, Chercher, Nouveau lieu, Réglages, Application, Données des transports, la station la plus proche, l'onglet Navigo de Sorties et la fiche d'un lieu Navigo, et l'Aide, à 360 et 412 px, en clair et en sombre. Pour chaque écran : contrôle axe (contraste compris), boutons de moins de 44 px, erreurs JavaScript. Il range une capture par écran dans `captures/` (non versionné) et se termine en erreur s'il trouve un défaut.

Options (variables d'environnement) :

- `ECRANS=fiche,sorties` : seulement ces écrans ;
- `LARGEURS=360x740` : seulement cette taille ;
- `THEMES=dark` : seulement le mode sombre ;
- `URL=http://localhost:8765/` : adresse de l'appli ;
- `SORTIE=captures` : dossier des captures.

Rien ne part sur Internet pendant le contrôle : les fonds de carte et les services en ligne sont coupés, et l'agenda de Sorties est simulé avec cinq sorties fictives. Les vrais services (agenda, galeries, météo, Vélib') ne sont donc **pas** vérifiés ici.
