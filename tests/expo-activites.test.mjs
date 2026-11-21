// v367 : « Dernière chance » et les listes d'expos ne montrent plus les ateliers, visites, projections et spectacles
// des lieux d'expo. Cas : vrais titres et mots-clés de l'agenda « Que faire à Paris ? » (sorties qui finissent
// entre le 21 et le 28 nov. 2026, marquées Expo, Photo ou Art contemporain), lus le 21 nov. 2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExpo, lastChance } from '../js/art.js';

const CAS = [
  [true, "Exposition solo « Reliefs » : Sophie Bloch", "Art contemporain;Expo"],
  [true, "Derniers jours de l'expo « Entre deux vertiges » de Gloria Friedmann", "Art contemporain;Expo"],
  [true, "Récits d’ogresses avec la Cour des Contes", "Art contemporain;Expo"],
  [true, "Thủy Tiên Nguyễn: Quel mois sommes-nous, mon amour?", "Art contemporain;Expo"],
  [false, "Concert · Sonic Tapestry", "Art contemporain;Concert;Expo"],
  [true, "Paper Routes", "Art contemporain;Atelier;Expo"],
  [true, "Exposition d'art et ateliers : découvrez la beauté de voyager", "Art contemporain;Atelier;Expo"],
  [true, "expo \"pluriel·le·s\"", "Art contemporain;Expo"],
  [true, "La SLOW Galerie fête les 1 an de son espace Luxembourg !", "Art contemporain;Expo"],
  [true, "105 artistes plasticiens d'Anvers aux Abbesses ouvrent leurs ateliers", "Art contemporain;Peinture;Photo"],
  [true, "Âmes insulaires", "Art contemporain;Expo;Peinture"],
  [true, "Exposition « Ce qui nous restera »", "Art contemporain;Expo;LGBT"],
  [true, "Exposition Âmes insulaires : Les îles par l'artiste Marielle Durand", "Art contemporain;Expo;Peinture"],
  [true, "Salon Artisans d'Excellence 3e Edition", "Art contemporain;Expo;Salon"],
  [true, "Quand l'art réécrit votre vie", "Art contemporain;Atelier;Expo"],
  [true, "TitreBiennale de Dakar 2026 – OFF à Paris : ENSEMBLE’, 30 ans de peinture de Babacar Badiane", "Art contemporain;Expo;Peinture"],
  [true, "Park Chan-wook : Quand l’horloger immobilise le temps", "Expo;Photo"],
  [false, "Production : Balade photographique pour chasse chromatique", "Art contemporain;Loisirs;Photo"],
  [true, "L\\'ANGLE MORT", "Art contemporain;Expo;Solidarité"],
  [false, "Table ronde – Photographier la mode aujourd’hui : de l’héritage d’Irving Penn aux nouvelles générations", "Expo;Photo"],
  [false, "Atelier de pratique en famille — Le coin des portraits avec Claire Pathé", "Expo;Photo"],
  [false, "Philo en famille – S’habiller : une nécessité, un art ou un jeu ?", "Expo;Photo"],
  [true, "Lucky Jim : James Barnor", "Expo;Photo"],
  [true, "Around the World, l'expo dédiée au Daft Punk", "Expo;Photo"],
  [false, "Visite dansée en famille", "Expo;Photo"],
  [false, "[VISITES] Studios – Artistes & boursiers du 5e étage", "Art contemporain"],
  [false, "Projection du film «Falbalas» de Jacques Becker en VOSTFR", "Expo;Photo"],
  [false, "Le téléphone du vent – 風の電話, Kaze No Denwa - Félix Loizillon", "Art contemporain;Théâtre"],
  [false, "«Make Them Stop You» avec Sarah Schulman", "Art contemporain;Conférence"],
  [false, "Mercredi créatif : autour de Basquiat", "Art contemporain;Atelier;Enfants"],
  [true, "Vernissage exposition photo « Métamorphoses silencieuses (Infiniment petit) »", "Expo;Loisirs;Photo"],
  [true, "Walid Raad - Festival of (in)gratitude", "Expo;Festival;Photo"],
  [true, "\"Le changement climatique est sexiste ! Les femmes ripostent et agissent\", une exposition de CARE France et de l'Agence MYOP", "Balade urbaine;Expo;Photo"],
  [false, "Soirée de clôture de la Compagnie Les Orpailleurs", "Art contemporain;Danse;Festival"],
  [false, "Spectacle de danse : Such a Devoted Bunch de Ruth Childs et Cécile Bouffard", "Art contemporain;Danse"],
  [false, "Stage Dessin-Peinture", "Art contemporain;Atelier"],
  [false, "Cerfs-volants, Catherine Gendre", "Art contemporain;Danse;Enfants"],
  [false, "Transformez votre image favorite en gravure sur tetra pak !", "Art contemporain;Atelier;Enfants"],
  [false, "Same Old Songs", "Art contemporain;Danse;Théâtre"],
  [false, "VIBRATION : un spectacle immersif de danse au Cirque Théâtre Bormann à Paris", "Art contemporain;Cirque;Danse"],
  [false, "Atelier de carnet de vacances illustré", "Art contemporain;Atelier;Loisirs"],
  [false, "Atelier | Collage \"Crée ta 1ère de couverture\"", "Art contemporain;Atelier;Littérature"],
  [true, "Exposition \"Femmes sujets, non objets\" organisée par la Maison des Femmes de l'APHP", "Art contemporain;Santé;Solidarité"],
  [false, "Conversation musicale", "Art contemporain;Concert;Conférence"],
  [false, "Soirée partagée : Yasminee Lepe & Delphine Mothes", "Art contemporain;Danse;Festival"],
  [false, "Très chair corps, un seule en scène improvisé", "Art contemporain;Danse;Théâtre"],
  [false, "Visites performées Créoles 2026", "Expo"],
  [true, "L’expérience Hello Kitty: Beyond Cute arrive à Paris", "Expo"],
  [true, "Vernissage et restitution des ateliers \"Ici et ailleurs : histoires de cuisine\"", "Photo;Solidarité"],
  [true, "Vernissage de l'exposition «Souvenirs d'été» d'Agnès Decourchelle", "Expo"],
  [true, "Journée contre les violences faites aux femmes", "Expo"],
  [false, "Henri Manuel, photographe des prisons dans l’entre-deux guerres", "Conférence;Histoire;Photo"],
  [false, "La photographie d'hier à aujourd'hui", "Atelier;Histoire;Photo"],
  [true, "Expositions \"Dans une composition, une fleur est une personne\"", "Expo;Nature"],
  [true, "Exposition de peinture de Joël Denece à l’Espace 7", "Expo;Peinture"],
  [false, "Visite du Musée national Jean-Jacques Henner", "Expo;Peinture"],
  [true, "Vies minuscules, des vies à la Bpi", "Conférence;Expo"],
  [true, "Manger et être mangé : retour sur un projet mené en détention", "Conférence;Expo"],
  [true, "EXPOSITION D'ART JAPONAIS", "Brocante;Expo;Peinture"],
  [true, "Les humanités en formes : sciences humaines et sociales", "Conférence;Expo;Littérature"],
  [false, "Festival Close-Up : Ville, Architecture et Paysage au cinéma", "Concert;Ecrans;Expo"],
  [true, "Nocturne festive avec Élysée Moon", "Expo;LGBT;Nuit"],
  [true, "Exposition Portraits de Résistantes : Mémoire et Liberté au Centre Paris Anim' Maurice Ravel", "Conférence;Expo;Peinture"],
  [true, "Vivant·e : un festival d'art engagé pour faire fleurir de nouveaux imaginaires !", "Conférence;Expo;Loisirs"],
  [true, "3 femmes, 3 artistes", "Expo;Street-art"],
  [true, "La semaine de l'industrie au Musée des Egouts !", "Balade urbaine;Expo;Sciences"],
];

test('isExpo : les 66 vrais cas de l\'agenda du 21 nov.', () => {
  for (const [expo, title, tags] of CAS) assert.equal(isExpo({ title, tags }), expo, title);
});

test('Dernière chance : les deux ateliers de la capture du 21 nov. n\'y sont plus', () => {
  const now = new Date(2026, 10, 21, 10);
  const end = new Date(2026, 10, 22, 18);
  const ev = [
    { title: 'Production : Balade photographique pour chasse chromatique', tags: 'Art contemporain;Loisirs;Photo', end },
    { title: 'Philo en famille – S’habiller : une nécessité, un art ou un jeu ?', tags: 'Expo;Photo', end },
    { title: 'Lucky Jim : James Barnor', tags: 'Expo;Photo', end },
  ];
  assert.deepEqual(lastChance(ev, now).map((e) => e.title), ['Lucky Jim : James Barnor']);
});

test('isExpo : un titre qui commence par Expo, Vernissage ou Derniers jours reste une expo', () => {
  assert.ok(isExpo({ title: 'Exposition : visites et ateliers de Noël', tags: 'Expo' }));
  assert.ok(isExpo({ title: 'Vernissage et rencontre avec l\'artiste', tags: 'Expo' }));
  assert.ok(!isExpo({ title: 'Visite guidée de l\'exposition Hockney', tags: 'Expo' }));
  assert.ok(isExpo({ title: 'Parcours de sculptures', tags: 'Expo' }), 'parcours n\'est pas « cours »');
});
