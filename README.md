# Ma carte de Paris

Appli personnelle (appli web installable sur Android) pour garder ses lieux préférés à Paris et s'y rendre à pied ou en métro.

## Ce qu'elle fait
- Ajouter un lieu : à sa position, par nom ou adresse (annuaire OpenStreetMap et adresses IGN), par appui long sur la carte, ou en le partageant depuis une autre appli.
- Fiche d'un lieu : photo (vignette), catégorie, favori, horaires (Ouvert / Fermé), station la plus proche, « Quel métro prendre ? », boussole avec voix, Google Maps.
- Autour de moi : cercles en mètres ou en minutes à pied, suivi en direct avec vibration et voix, sur mon chemin, parcours du jour, autour d'une station.
- En un appui sur la carte : métro le plus proche, fontaine et toilettes, ma position avec cercles de temps, recharger la carte.
- Raccourcis sur l'icône : Métro, Autour de moi, Ajouter ici, Fontaine et WC.
- Plusieurs personnes : chaque lieu exporté porte le prénom de qui l'a ajouté ; bouton 👥 pour n'afficher que ses lieux ou ceux d'un ami.
- Compteur de balade (km et pas estimés, appli ouverte seulement), rappel de sauvegarde, export et import (avec ou sans photos).

## Confidentialité
Les lieux, photos et positions restent sur le téléphone. L'appli ne peut contacter que : tuiles OpenStreetMap, géocodage IGN, Nominatim (OpenStreetMap) et les données ouvertes de la Ville de Paris (sans la position).

## Sources
Carte © OpenStreetMap. Adresses : IGN (Base Adresse Nationale). Annuaire et horaires : OpenStreetMap (Nominatim, ODbL). Fontaines et toilettes : Ville de Paris (ODbL). Stations : jeu de données « metro » de great_tables (d'après Wikipédia, 2024).

## Tests
`npm test`
