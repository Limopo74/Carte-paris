# Reprise technique

Les blobs restent dans IndexedDB. Les associations de lieux, de salles et de la corbeille sont enregistrées ensemble dans l’état local. La clé historique des photos de salles reste lisible pour les anciennes installations. Une écriture qui échoue laisse les associations précédentes en place. Les nouveaux blobs préparés par une opération annulée sont retirés.

Les imports d’images passent par le canevas et sont réencodés sans EXIF. Les miniatures de galerie sont réduites à 240 px et chargées à proximité de l’écran. Le ZIP contient des JPEG et un index JSON des associations. Les sauvegardes générales continuent à lire les anciennes versions et conservent les albums de plus de six photos. La corbeille garde les références pendant 30 jours. Le nettoyage s’exécute à l’ouverture du gestionnaire et préserve tout blob encore référencé.

Tout Paris réemploie l’agenda du jour utilisé par Ce week-end et les contours des arrondissements pour exclure la banlieue. Les marqueurs sont regroupés à partir de leurs coordonnées projetées et recalculés au changement de zoom.
