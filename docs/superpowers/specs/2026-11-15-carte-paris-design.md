# Ma carte de Paris — design court

Date : 15 novembre 2026

## Intention
Une appli personnelle sur un téléphone Android pour placer ses points d'intérêt sur une carte de Paris et voir rapidement ce qui est près de soi. Elle sert sur le moment, quand on a envie de faire quelque chose ou qu'on cherche un type de lieu précis. Déplacements à pied ou en métro.

## Objectifs
- Ajouter un point en un geste : à sa position actuelle, ou en tapant une adresse.
- Bouton « Autour de moi » : des cercles autour de soi (largeurs réglables, 100 m au minimum), avec la carte et en dessous la liste rangée par cercle.
- Chaque point : nom, catégorie (Restos-cafés-bars / Boutiques-commerces / Culture-visites), note libre, état « À faire » ou « Déjà visité ».
- Filtrer par catégorie dans « Autour de moi ».
- Bouton « Y aller » qui ouvre Google Maps avec l'itinéraire.
- Export et import des points dans un fichier, pour la sauvegarde.

## Hors du projet
Pas de compte, pas de synchronisation entre appareils, pas de temps de trajet en métro calculés dans l'appli, pas de photos, pas de mode sans connexion pour la carte.

## Échecs à éviter même si l'appli « marche »
- Des points perdus sans moyen de les récupérer.
- Ajouter un point demande plus de deux ou trois gestes.
- Une adresse mal placée sans que la personne s'en rende compte.

## Contraintes
- Android, navigateur Chrome, internet disponible.
- Mise en place uniquement depuis le téléphone.
- Les pages Claude bloquent la localisation, les fonds de carte et les appels réseau : l'appli doit être hébergée ailleurs.

## Approches considérées
1. **GitHub Pages (choisie par l'utilisatrice)** : gratuit, adresse sécurisée, installable sur l'écran d'accueil. Demande un compte GitHub. Le code est public, mais les points restent sur le téléphone, ils ne sont pas dans le dépôt.
2. Netlify : équivalent, mais le dépôt par glisser-déposer est plus simple depuis un ordinateur, et elle n'en a pas.
3. Fichier HTML ouvert sur le téléphone : sans compte, mais localisation souvent refusée sur Android, pas de vraie icône, stockage fragile. Écartée.
4. Page Claude : impossible (localisation, carte et recherche d'adresse bloquées).

## Ce qui a été décidé avec l'utilisatrice
- Internet accepté, pas de compte dans l'appli.
- Cercles réglables, en commençant à 100 m.
- Cercles en distance avec un temps de marche estimé ; le vrai temps en métro vient de Google Maps.
- Affichage « Autour de moi » : carte et liste.
- Sauvegarde par export et import de fichier.

## Choix de construction (proposés par Claude)
- Appli web installable : un seul dossier statique, HTML, CSS et JavaScript sans framework.
- Carte : Leaflet avec les fonds OpenStreetMap, centrée sur Paris.
- Adresses : service de géocodage de l’IGN, qui reprend l’API Adresse de la Base Adresse Nationale (data.geopf.fr/geocodage ; l’ancienne adresse api-adresse.data.gouv.fr a été arrêtée fin janvier 2026), avec suggestions pendant la saisie. Quand on ajoute un point à sa position, l'adresse est retrouvée automatiquement.
- Points enregistrés dans le stockage du navigateur (localStorage).
- Cercles par défaut : 100 m, 300 m, 500 m, 1 km, modifiables dans les réglages.
- Temps de marche estimé : 12 min par km.
- « Y aller » : Google Maps en mode à pied pour moins de 1 km, en transports au-delà.
- Modifier ou supprimer un point depuis sa fiche (suppression confirmée).
- Le fichier d'export est en JSON ; l'import ajoute les points sans créer de doublons.

## Laissé au constructeur
Couleurs et icônes des catégories, détail des écrans, textes.
