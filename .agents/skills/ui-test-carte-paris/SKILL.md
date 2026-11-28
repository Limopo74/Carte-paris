---
name: ui-test-carte-paris
description: Tester et améliorer l'interface mobile de Ma carte de Paris sans régression, avec Playwright et exploration manuelle.
---
# UI Test — Ma carte de Paris
Lire CHARTE.md, index.html et les tests existants avant intervention. Travailler sur une branche, jamais directement sur main. Préserver npm test.
## Procédure
1. Lancer npm test puis installer localement @playwright/test@1.56.1 (npm install --no-save --package-lock=false @playwright/test@1.56.1), npx playwright install chromium et npx playwright test.
2. Explorer sur serveur local, profil vierge, GPS fictif, sans données personnelles. Vérifier recherche, position, itinéraire, ajout, favoris, réglages, retour carte. Ne jamais déclencher un appel SOS réel, un partage réel ou une suppression de données réelles.
3. Vérifier les quatre styles existants, clair/sombre, texte très grand, portrait/paysage, cibles 44 px minimum, boutons stables, contraste et 1 à 3 appuis. Vérifier refus GPS, réseau absent, rechargement et conservation des données fictives.
4. Tester le cache PWA après activation effective du service worker; distinguer ressources locales et fonds de carte distants. Ne pas promettre un fond hors ligne sans preuve.
5. Pour chaque anomalie: version/commit, appareil simulé, étapes, attendu, observé, gravité, capture ou trace anonymisée. Ajouter un test reproductible avant correction lorsque possible.
6. Relancer les tests existants et nouveaux. Ne pas fusionner si échec ou absence de résultats. Indiquer les tests non exécutés et limites de simulation; vérifier sur Android réel avant validation terrain.
## Priorités
P0 perte de données ou secours inaccessible; P1 GPS/navigation bloqués; P2 ergonomie; P3 cosmétique. Aucun changement de charte ou de fonctionnalité sans justification.
