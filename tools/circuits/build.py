import os
HERE = os.path.dirname(os.path.abspath(__file__))
import json, sys
sys.path.insert(0, HERE)
from stops import C
from verif import check

S = {  # textes vérifiés le 18 nov. 2026 et leur source
 'marais': dict(titre='Le Marais', quartier='centre', themes=['histoire', 'art'], depart='Saint-Paul', arrivee='Rambuteau', confort='Plat, sans escalier.', note='Carnavalet et Cognacq-Jay ferment le lundi.', t=[
  ('Ligne 1.', None, True),
  ('La plus longue portion conservée du mur bâti autour de Paris à la fin du XIIe siècle : près de 60 m et deux tours.', 'https://www.pariszigzag.fr/insolite/histoire-insolite-paris/vestiges-enceinte-philippe-auguste/', False),
  ('Hôtel particulier bâti de 1624 à 1630. On traverse la cour et le jardin, aux heures d\'ouverture, pour rejoindre la place des Vosges.', 'https://parisjetaime.com/musee-monument-paris/71312/Hotel-de-B%c3%a9thune-Sully', False),
  ('Inaugurée en 1612 sous le nom de place Royale. Victor Hugo a vécu au n° 6 de 1832 à 1848 : sa maison est un musée de la Ville.', 'https://www.lonelyplanet.com/france/paris/attractions/hotel-de-sully/a/poi-sig/372489/359279', False),
  ('Le musée de l\'histoire de Paris. Collections permanentes gratuites ; fermé le lundi.', 'https://www.carnavalet.paris.fr/sites/default/files/2026-08/plan_guide_carnavalet_2026_vweb_1.pdf', False),
  ('L\'art du XVIIIe siècle réuni par Ernest Cognacq, fondateur de la Samaritaine, et son épouse Marie-Louise Jay. Musée de la Ville, gratuit ; fermé le lundi.', 'https://pro.visitparisregion.com/offre-loisirs-et-affaires/offre-de-la-destination/une-activite/musees-monuments-chateaux/musees/musee-cognacq-jay', False),
  ('Le cœur du Pletzl (« petite place » en yiddish), le quartier juif historique du Marais.', 'https://www.evous.fr/paris/le-marais/Visiter-le-Marais/Quartiers-du-Marais/Le-Marais-Juif/Histoire-de-la-rue-des-Rosiers,1175205/', False),
  ('L\'hôtel de Soubise, au décor rocaille de Germain Boffrand, abrite les Archives nationales depuis 1808.', 'https://www.offi.fr/expositions-musees/archives-nationales-3615.html', False),
  ('Ligne 11.', None, True)]),
 'iles': dict(titre='Les îles', quartier='centre', themes=['histoire', 'nature'], depart='Pont Marie', arrivee='Pont Neuf', confort='Plat. Un escalier pour descendre au square du Vert-Galant, et le même pour remonter.', note='', t=[
  ('Ligne 7.', None, True),
  ('Hôtel particulier construit en 1658, 17 quai d\'Anjou. Baudelaire et Théophile Gautier y ont habité au XIXe siècle.', 'https://parisjetaime.com/article/au-coeur-des-iles-parisiennes-a702', False),
  ('Construite de 1664 à 1726. Son horloge est posée perpendiculairement à la façade, comme une enseigne.', 'https://parisjetaime.com/article/au-coeur-des-iles-parisiennes-a702', False),
  ('Le jardin derrière Notre-Dame, avec la vue sur le chevet de la cathédrale.', None, False),
  ('Sur le parvis de Notre-Dame, une rose des vents en laiton : c\'est d\'ici que sont comptées les distances entre Paris et les autres villes.', 'https://www.paris.fr/pages/le-point-zero-reinstalle-sur-le-parvis-de-notre-dame-de-paris-31306', False),
  ('Au coin du palais de la Cité, la première horloge publique de Paris, réalisée vers 1370 par Henri de Vic.', 'https://www.pariszigzag.fr/insolite/histoire-insolite-paris/tour-de-lhorloge-palais-de-la-cite/', False),
  ('Place en triangle décidée par Henri IV en 1606, quand s\'achevait le Pont Neuf.', 'https://www.techno-science.net/fr/definitions/pont-neuf', False),
  ('Malgré son nom, le plus ancien pont de Paris : Henri IV l\'a inauguré en 1607. Sa statue est au milieu.', 'https://www.bonjour-ratp.fr/en/lieux/pont-neuf/', False),
  ('À la pointe de l\'île, au ras de l\'eau. On y descend par l\'escalier derrière la statue d\'Henri IV.', 'https://bonjourparis.com/paris-neighbourhoods/flaneries-in-paris-a-riverside-loop-from-chatelet/', False),
  ('Ligne 7.', None, True)]),
 'passages': dict(titre='Les passages couverts', quartier='centre', themes=['passages', 'histoire'], depart='Grands Boulevards', arrivee='Palais-Royal', confort='Plat, en partie à l\'abri de la pluie.', note='La plupart des passages ferment le soir : fais ce circuit en journée.', t=[
  ('Lignes 8 et 9.', None, True),
  ('Inauguré en 1847, le premier passage bâti entièrement en fer et en verre.', 'https://www.paris.fr/en/pages/discover-the-magic-of-parisian-galleries-and-arcades-29672', False),
  ('Construit en 1847 dans le prolongement du passage Jouffroy : livres anciens, cartes postales, objets de collection.', 'https://www.visitparisregion.com/fr/parcours/parcours-tops/passage-couvert-paris', False),
  ('Ouvert en 1799 : le plus ancien passage couvert de Paris.', 'https://www.paris.fr/pages/decouvrez-la-magie-des-galeries-et-des-passages-18889', False),
  ('Construite en 1823 : mosaïques au sol et décor néoclassique sous une verrière.', 'https://www.evous.fr/paris/2eme-Arrondissement/Guide-Paris-2e/Ce-qu-il-faut-visiter-dans-le-2e/Galerie-Colbert-et-Galerie-Vivienne-a-Paris,1119386/', False),
  ('La rivale de la galerie Vivienne : une grande rotonde sous une coupole de verre. Elle abrite l\'Institut national d\'histoire de l\'art.', 'https://parisjetaime.com/culture/galerie-colbert-p1585', False),
  ('Le jardin entouré d\'arcades du Palais-Royal.', None, False),
  ('« Les Deux Plateaux », les colonnes rayées noir et blanc de Daniel Buren, dans la cour d\'honneur.', None, False),
  ('Lignes 1 et 7.', None, True)]),
 'montmartre': dict(titre='Montmartre', quartier='nord', themes=['histoire', 'art'], depart='Abbesses', arrivee='Lamarck-Caulaincourt', confort='Fortes pentes jusqu\'au Sacré-Cœur, puis une descente. Le chemin peut passer par des escaliers.', note='', t=[
  ('Ligne 12. La station la plus profonde de Paris (36 m) : prends l\'ascenseur. Son entrée est un des deux édicules d\'Hector Guimard encore en place.', 'https://www.ratp.fr/decouvrir/patrimoine/histoire-station-abbesses', True),
  ('Picasso y a vécu de 1904 à 1909 et y a peint Les Demoiselles d\'Avignon (1907). Incendié en 1970, reconstruit en 1978 : des ateliers privés, à voir de la place.', 'https://www.routard.com/fr/guide/france/ile-de-france/paris/18eme-arrondissement/montmartre/bateau-lavoir', False),
  ('Un homme qui sort du mur : statue de Jean Marais (1989) d\'après la nouvelle de Marcel Aymé, qui habitait l\'immeuble.', 'https://www.lonelyplanet.com/points-of-interest/le-passe-muraille/1535927', False),
  ('La place du village de Montmartre, où les peintres installent leurs chevalets.', None, False),
  ('Commencée en 1875, achevée en 1914, consacrée en 1919. Entrée gratuite ; vue sur Paris depuis le parvis.', 'https://www.lonelyplanet.fr/destinations/france/paris/que-faire/le-sacre-coeur', False),
  ('Le café rose au coin de la rue de l\'Abreuvoir, peint par Maurice Utrillo.', 'https://worldcitytrail.com/2025/04/26/le-passe-muraille-in-montmartre/', False),
  ('Plantée en 1933, fermée au public : on la voit depuis la rue des Saules. Les vendanges sont fêtées chaque année en octobre.', 'https://www.sortiraparis.com/arts-culture/balades/articles/298016-en-balade-au-vignoble-du-clos-montmartre-les-plus-anciennes-vignes-de-paris', False),
  ('Le cabaret de la butte, fréquenté par les artistes, dont Picasso.', 'https://www.untappedcities.com/clos-montmartre/', False),
  ('Ligne 12.', None, True)]),
 'canal': dict(titre='Le canal Saint-Martin', quartier='est', themes=['nature', 'histoire'], depart='République', arrivee='Jaurès', confort='Presque plat. Les passerelles en fer ont des marches.', note='', t=[
  ('Lignes 3, 5, 8, 9 et 11.', None, True),
  ('Le canal sort ici de sa voûte. Inauguré en 1825, il fait 4,5 km, dont plus de 2 km sous terre, avec neuf écluses et deux ponts tournants.', 'https://www.paris.fr/services-et-infos-pratiques/environnement-et-espaces-verts/nature-et-espaces-verts/les-canaux-90', False),
  ('102 quai de Jemmapes : l\'hôtel qui a donné son nom au film de Marcel Carné (1938), tourné surtout en studio.', 'https://www.pariszigzag.fr/insolite/histoire-insolite-paris/histoire-hotel-du-nord', False),
  ('Un jardin public au bord du canal, pour une pause.', None, False),
  ('Bâtie de 1784 à 1788 par Claude-Nicolas Ledoux : un bureau d\'octroi, où l\'on payait l\'impôt sur les marchandises qui entraient dans Paris.', 'https://www.techno-science.net/fr/definitions/rotonde-de-la-villette', False),
  ('Lignes 2, 5 et 7 bis.', None, True)]),
 'luxembourg': dict(titre='Saint-Germain et le Luxembourg', quartier='rive-gauche', themes=['histoire', 'nature', 'art'], depart='Odéon', arrivee='Notre-Dame-des-Champs', confort='Plat, sans escalier.', note='Le jardin du Luxembourg ferme la nuit. Le musée Zadkine ferme le lundi.', t=[
  ('Lignes 4 et 10.', None, True),
  ('Un passage pavé qui garde un vestige de l\'enceinte de Philippe Auguste. Le Procope, l\'un des plus anciens cafés de Paris, y a une entrée.', 'https://parisjetaime.com/transport/quartier-de-l-odeon-p1993', False),
  ('À droite en entrant, la chapelle des Saints-Anges, peinte par Delacroix de 1849 à 1861. Entrée libre.', 'https://www.paris.fr/pages/retrouvez-les-splendeurs-de-delacroix-a-la-chapelle-des-saints-anges-de-saint-sulpice-4241', False),
  ('Le théâtre de l\'Odéon, aujourd\'hui Odéon-Théâtre de l\'Europe, au centre de sa place.', 'https://parisjetaime.com/transports/93224/Quartier-de-l-Odeon', False),
  ('Bâti dans les années 1620 pour Marie de Médicis ; c\'est aujourd\'hui le Sénat.', 'https://www.lonelyplanet.com/france/paris/st-germain-and-les-invalides/attractions/eglise-st-sulpice/a/poi-sig/372411/1322788', False),
  ('Une grotte à l\'italienne élevée vers 1630 pour Marie de Médicis.', 'https://jardin.senat.fr/en/history-heritage/heritage.html', False),
  ('Le jardin créé pour Marie de Médicis, inspiré du jardin Boboli de Florence.', 'https://secure.webpublication.fr/42102/1020942/index-34.html', False),
  ('La maison-atelier du sculpteur Ossip Zadkine. Musée de la Ville, collections gratuites ; fermé le lundi.', 'https://www.laculturegenerale.com/?p=79693', False),
  ('Ligne 12.', None, True)]),
 'butte': dict(titre='La Butte-aux-Cailles', quartier='rive-gauche', themes=['histoire', 'art'], depart='Corvisart', arrivee='Place d\'Italie', confort='Quelques rues en pente douce.', note='', t=[
  ('Ligne 6.', None, True),
  ('40 maisons à colombages autour d\'une cour arborée, bâties en 1912 par l\'architecte Jean Walter pour loger des ouvriers. La cour est privée : on la regarde depuis l\'entrée.', 'https://parisjetaime.com/transport/la-petite-alsace-p2040', False),
  ('Son nom rappelle que la Butte-aux-Cailles fut une place forte des fédérés pendant la Commune de Paris, en 1871.', 'https://www.paris.fr/pages/les-150-ans-de-la-commune-les-lieux-emblematiques-2-5-16972', False),
  ('La rue du « village » : petites maisons, cafés, et des œuvres de street art, dont certaines rendent hommage à la Commune.', 'https://www.pariszigzag.fr/insolite/histoire-insolite-paris/butte-aux-cailles/', False),
  ('La piscine de briques rouges, ouverte en 1924, est classée monument historique depuis 1990. Devant elle, la fontaine est alimentée par le puits artésien qui alimentait autrefois la piscine.', 'https://www.paris.fr/pages/plongee-dans-la-piscine-de-la-butte-aux-cailles-27903', False),
  ('Lignes 5, 6 et 7.', None, True)]),
 'coulee': dict(titre='La Coulée verte', quartier='est', themes=['nature', 'histoire'], depart='Bastille', arrivee='Porte Dorée', confort='On monte sur l\'ancien viaduc par un escalier (la Ville indique aussi des ascenseurs, 34 rue de Lyon et rue Jacques-Hillairet). Plus loin, la promenade passe par des tunnels et des tranchées.', note='', t=[
  ('Lignes 1, 5 et 8.', None, True),
  ('Une ancienne voie ferrée, fermée en 1969, devenue une promenade de 4,5 km. En dessous, les 71 arcades du viaduc, réhabilitées à partir de 1989, forment le Viaduc des Arts.', 'https://www.paris.fr/lieux/coulee-verte-rene-dumont-1772', False),
  ('En face, en haut de l\'immeuble du commissariat, 13 copies de l\'Esclave mourant de Michel-Ange, dont l\'original est au Louvre. L\'immeuble a été bâti au début des années 1990.', 'https://www.pariszigzag.fr/insolite/lieux-insolites/le-commissariat-de-police-le-plus-insolite-de-paris/', False),
  ('La promenade le traverse sur une passerelle en bois, au-dessus d\'une pelouse de 4 200 m². Jardin créé de 1992 à 1998 à la place d\'une gare de marchandises.', 'https://www.paris.fr/lieux/jardin-de-reuilly-paul-pernin-2573', False),
  ('L\'ancienne gare de voyageurs de la ligne est devenue la maison des associations du 12e, avec un jardin partagé.', 'https://www.paris.fr/pages/terminus-jardin-apres-les-trains-de-grands-parcs-urbains-18883', False),
  ('Le dernier des jardins de la Coulée verte, avant le bois de Vincennes.', 'https://www.paris.fr/lieux/coulee-verte-rene-dumont-1772', False),
  ('Bâti en style Art déco pour l\'Exposition coloniale de 1931. Il abrite le Musée national de l\'histoire de l\'immigration et un aquarium tropical.', 'https://www.visitparisregion.com/fr/musee-national-de-l-histoire-de-l-immigration-palais-de-la-porte-doree', False),
  ('Ligne 8.', None, True)]),
}
out = []
for cid, d in S.items():
    pts = check(cid)
    assert pts, cid
    stops = C[cid]
    assert len(stops) == len(d['t']), (cid, len(stops), len(d['t']))
    raw = open(os.path.join(HERE, 'traces', f'{cid}.txt')).read().split('\n')
    poly = raw[1].strip().replace('\\' * 4, '\\')
    etapes = []
    for (n, a, g), (t, s, m) in zip(stops, d['t']):
        e = {'n': n, 'lat': a, 'lng': g, 't': t}
        if s: e['s'] = s
        if m: e['m'] = True
        etapes.append(e)
    c = {'id': cid, 'titre': d['titre'], 'quartier': d['quartier'], 'themes': d['themes'], 'depart': d['depart'], 'arrivee': d['arrivee'],
         'm': round(float(raw[0])), 'confort': d['confort'], 'etapes': etapes, 'trace': poly}
    if d['note']: c['note'] = d['note']
    out.append(c)
json.dump({'source': 'Étapes vérifiées le 18 novembre 2026 ; tracés à pied calculés avec OpenStreetMap (routing.openstreetmap.de, ODbL).', 'updated': '2026-11-18', 'items': out},
          open(os.path.join(HERE, '..', '..', 'data', 'circuits.json'), 'w'), ensure_ascii=False, indent=1)
print('ok', len(out))
