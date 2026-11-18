# Ma carte de Paris

Appli personnelle en français (appli web installable sur Android, Chrome) pour garder ses lieux à Paris, se repérer et s'y rendre à pied ou en métro. Publiée sur https://limopo74.github.io/Carte-paris/.

Le mode d'emploi complet est dans l'appli : Réglages → Aide.

## Ce qu'elle fait
- **Mes lieux** : ajouter un lieu (à ma position, par nom ou adresse, par appui long, depuis une photo ou un partage), catégories, listes, favoris, « Déjà visité », étoiles, photos, impressions datées ; une note du jour, sans lieu.
- **Se repérer et y aller** : ma position, Autour de moi, boussole avec voix, station et sortie de métro les plus proches, Rentrer (métro, bus, RER et tram), Google Maps sur un appui.
- **Sorties** : agenda de la Ville de Paris, expos, lieux gratuits, avantages Navigo, galeries, art dans la rue ; Mon planning et la liste du jour.
- **Balades** : circuits de visite, J'ai du temps, passages couverts, rues sans voitures, plaques commémoratives, monuments.
- **Pratique** : fontaines et toilettes, Vélib', météo et qualité de l'air.
- **Garder et partager** : sauvegarde dans un fichier (avec ou sans photos), restauration, envoi d'un choix de lieux à un proche, lien ou QR code d'un lieu.

## Confidentialité
Les lieux, les photos et la position restent sur le téléphone : aucun serveur, aucun compte, aucun tracé des déplacements. L'appli ne contacte des services que pour ce qui est demandé :
- fonds de carte : OpenStreetMap (ou CARTO et OpenStreetMap France selon le style choisi) ;
- adresses : IGN (position exacte, après un appui) ; annuaire : Nominatim (OpenStreetMap) ;
- données ouvertes de la Ville de Paris (agenda, marchés, fontaines, toilettes), sans la position ;
- Wikidata (monuments, sans la position) et Wikipédia (position arrondie à 100 m) ;
- Open-Meteo (météo et air, position arrondie à 1 km) ; Vélib' Métropole (aucune position).

Google Maps, Avis Google et Uber ne reçoivent quelque chose que sur un appui. Le texte complet et à jour est dans l'appli : Réglages → Appli → Confidentialité.

## Données
Les listes rangées dans l'appli (dossier `data/`) portent chacune leur source et leur date : Île-de-France Mobilités (lignes, gares, sorties du métro, arrêts de bus, avantages Navigo), RATP (toilettes), Paris Data (arrondissements, plaques commémoratives, noms des voies, secteurs Paris Respire), ministère de la Culture (monuments historiques, base Mérimée), OpenStreetMap (œuvres dans la rue, galeries ; © les contributeurs d'OpenStreetMap, ODbL). Stations de métro : jeu de données « metro » de great_tables (d'après Wikipédia, 2024), positions vérifiées avec « Emplacement des gares IDF » (IDFM). Circuits et passages couverts : établis et vérifiés à la main.

Un robot (`.github/workflows/maj-donnees.yml`) refait ces listes le 1er de chaque mois, les contrôle (`tools/verif-donnees.py`) et ne publie que ce qui passe : une source coupée ou changée ne vide jamais l'appli.

Carte © OpenStreetMap. Icônes : Lucide.

## Technique
JavaScript en modules, sans framework ; Leaflet ; hors ligne grâce à `sw.js`. Charte graphique : `CHARTE.md`.

- Tests : `npm test`
- Contrôle des écrans (accessibilité, tailles, débordements) : voir `tools/README.md`
