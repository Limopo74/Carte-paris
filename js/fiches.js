/* v509 (ma réponse 18 A et B du 25 nov. 2026, maquette validée) : une fiche « Les bons gestes » par crise, 5 à 7 gestes, lisible
   sans réseau (dans l'appli), chaque fiche reprise d'une source officielle nommée en bas, avec le lien vers le guide entier.
   Pas de fiche Grève (mon choix A) : aucune source officielle de « bons gestes » trouvée. Relues le 25 nov. 2026. */

export const FICHES_CHECKED = '25 novembre 2026';

export const FICHES = {
  // paris.fr, « Que faire en cas de crue de la Seine à Paris ? » (mise à jour le 10/03/2026), « pendant l'inondation »
  crue: {
    gestes: [
      ['Suis les consignes officielles', 'Paris.fr, Vigicrues, Préfecture de police, radio.'],
      ['Coupe le gaz et l\'électricité', 'Surtout en bas de l\'immeuble.'],
      ['Pas d\'ascenseur', 'Ni porte automatique, ni appareil électrique.'],
      ['Jamais sur une rue inondée', 'Ni à pied, ni en voiture.'],
      ['Téléphone : seulement en urgence', 'Les lignes restent libres pour les secours.'],
      ['Eau du robinet : attends les consignes', ''],
      ['Prends des nouvelles de tes proches', 'Famille, amis, voisins.'],
    ],
    source: '« Que faire en cas de crue de la Seine à Paris ? », paris.fr, mise à jour le 10/03/2026',
    url: 'https://www.paris.fr/crue', label: 'Tout le guide (paris.fr)',
  },
  // Guide « Tous responsables » du Gouvernement (SGDSN, 20/11/2025) : kit 72 h (p. 8-9), réflexes d'alerte (p. 19) ;
  // ma réponse 19 B : l'économie d'énergie du téléphone, rappelée ici plutôt qu'un bouton batterie
  coupure: {
    gestes: [
      ['Écoute la radio à piles', 'Les consignes des autorités : franceinfo 105.5, France Inter 87.8.'],
      ['Ne crois que les annonces officielles', 'Ne relaie pas les rumeurs.'],
      ['Téléphone : appels courts, seulement l\'utile', 'Les lignes restent libres pour les secours.'],
      ['Garde ta batterie', 'Économie d\'énergie du téléphone (Paramètres, Batterie) ; batterie externe et chargeur.'],
      ['Reste au chaud', 'Vêtements chauds, couverture de survie.'],
      ['Lampe de poche', 'Avec des piles de rechange.'],
    ],
    source: 'Guide « Tous responsables » du Gouvernement (SGDSN), novembre 2025',
    url: 'https://www.info.gouv.fr/actualite/tous-responsables-un-guide-pour-mieux-faire-face-aux-risques', label: 'Le guide « Tous responsables »',
  },
  // sante.fr (Service public d'information en santé) et ministère de la Santé : « Canicule… les bons réflexes »
  canicule: {
    gestes: [
      ['Reste au frais', 'Chez toi, ou plusieurs heures dans un lieu rafraîchi : « Lieux frais près de moi ».'],
      ['Bois de l\'eau sans attendre d\'avoir soif', 'Évite l\'alcool.'],
      ['Mouille-toi le corps', 'Au moins le visage et les avant-bras.'],
      ['Volets fermés le jour, aère la nuit', ''],
      ['Évite les efforts entre 12 h et 18 h', ''],
      ['Prends des nouvelles de tes proches', 'Surtout des plus fragiles.'],
      ['Malaise : appelle le 15', ''],
    ],
    source: 'sante.fr (Service public d\'information en santé) et ministère de la Santé',
    url: 'https://www.sante.fr/fortes-chaleurs-et-canicule-se-proteger-et-proteger-ses-proches', label: 'Tout le dossier (sante.fr)',
  },
  // info.gouv.fr, « Réagir en cas d'attaque terroriste » (modifiée le 22/06/2026) ; guide « Tous responsables », mise à l'abri (p. 19)
  abri: {
    gestes: [
      ['T\'échapper, si c\'est sans risque', 'C\'est la priorité quand c\'est possible.'],
      ['Sinon, te cacher', 'Barricade-toi ; coupe la sonnerie et la vibration.'],
      ['Alerter, une fois en sécurité', '17 ou 112 ; sans parler : SMS au 114 (Alerter en silence).'],
      ['En dernier recours, à plusieurs', 'Si ta vie est en danger : neutraliser l\'assaillant.'],
      ['À l\'abri : ne sors pas sans consigne', 'Loin des fenêtres, ne les ouvre pas.'],
      ['Ne va pas chercher les enfants à l\'école', 'L\'école et les secours s\'en occupent.'],
    ],
    source: '« Réagir en cas d\'attaque terroriste », info.gouv.fr, et guide « Tous responsables »',
    url: 'https://www.info.gouv.fr/risques/reagir-en-cas-dattaque-terroriste', label: 'Toute la page (info.gouv.fr)',
  },
};

export const ficheOf = (k) => FICHES[k] ?? null;
