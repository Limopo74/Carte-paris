# Écrit data/passages.json : les passages couverts de Paris (liste fixe, vérifiée le 18 nov. 2026).
# Lancer : python3 -I tools/passages/build.py
# Le trait d'une entrée à l'autre n'est gardé que si le chemin à pied calculé (OSRM, routing.openstreetmap.de)
# fait au plus 1,3 fois la ligne droite entre les deux entrées géocodées par l'IGN, et passe à moins de 40 m du repère.
# Sinon : le pictogramme seul.
import os, sys, json, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from entrees import P

PF = 'https://www.paris.fr/pages/decouvrez-la-magie-des-galeries-et-des-passages-18889'
TXT = {
  'vero-dodat': ('rue Jean-Jacques-Rousseau et rue du Bouloi', 'Ouverte en 1826 par deux charcutiers, Véro et Dodat. Son sol en damier de marbre noir et blanc est posé en diagonale.', PF),
  'vivienne': ('rue des Petits-Champs, rue de la Banque et rue Vivienne', 'Inaugurée en 1826, dessinée par l\'architecte Delannoy. Sol en mosaïque de l\'atelier Facchina. Vidocq a habité au n° 13 en 1840.', PF),
  'colbert': ('rue des Petits-Champs et rue Vivienne', 'La rivale de la galerie Vivienne : une grande rotonde sous une coupole de verre. Elle abrite l\'Institut national d\'histoire de l\'art.', 'https://parisjetaime.com/culture/galerie-colbert-p1585'),
  'panoramas': ('boulevard Montmartre et rue Saint-Marc', 'Ouvert en 1799 : le plus ancien passage couvert de Paris. Son nom vient des deux tours où l\'on montrait des panoramas peints.', PF),
  'choiseul': ('rue des Petits-Champs et rue Saint-Augustin', 'Long d\'environ 190 m. Le premier éditeur de Verlaine y était installé, et Céline y a passé son enfance.', PF),
  'jouffroy': ('boulevard Montmartre et rue de la Grange-Batelière', 'Ouvert en 1847 : le premier passage bâti tout en fer et en verre. Le musée Grévin y est installé depuis 1882.', PF),
  'verdeau': ('rue de la Grange-Batelière et rue du Faubourg-Montmartre', 'Construit en 1847 dans le prolongement du passage Jouffroy : livres anciens, cartes postales, objets de collection.', 'https://www.visitparisregion.com/fr/parcours/parcours-tops/passage-couvert-paris'),
  'grand-cerf': ('rue Saint-Denis et rue Dussoubs', 'Près de 12 m sous verrière : le plus haut des passages de Paris. Construit avant 1827, rénové en 1990.', PF),
  'bourg-labbe': ('rue Saint-Denis et rue de Palestro', 'Ouvert en 1828, raccourci par le percement du boulevard de Sébastopol. Ses couleurs d\'origine ont été retrouvées.', PF),
  'caire': ('place du Caire, rue Saint-Denis, rue d\'Alexandrie et rue Sainte-Foy', 'Environ 370 m : le plus long des passages de Paris. Son nom rappelle la mode de l\'Égypte après l\'expédition de 1798.', PF),
  'brady': ('rue du Faubourg-Saint-Denis et boulevard de Strasbourg', 'Ouvert en 1828 par le marchand Brady, coupé en deux en 1854 par le boulevard de Strasbourg. Boutiques et restaurants indiens et pakistanais.', PF),
  'prado': ('rue du Faubourg-Saint-Denis et boulevard Saint-Denis', 'Couvert en 1925 : le plus récent des passages de Paris.', PF),
}

def decode(s):
    pts = []; i = lat = lng = 0
    while i < len(s):
        for k in (0, 1):
            r = sh = 0
            while True:
                b = ord(s[i]) - 63; i += 1; r |= (b & 0x1f) << sh; sh += 5
                if b < 0x20: break
            d = ~(r >> 1) if r & 1 else r >> 1
            if k == 0: lat += d
            else: lng += d
        pts.append((lat / 1e5, lng / 1e5))
    return pts

def dist(a, b):
    R = 6371008.8; p1, p2 = math.radians(a[0]), math.radians(b[0]); dp = p2 - p1; dl = math.radians(b[1] - a[1])
    return 2 * R * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))

def length(pts):
    return sum(dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))

traces = {}
for line in open(os.path.join(HERE, 'traces.txt'), encoding='utf-8').read().splitlines():
    if line.strip():
        pid, osrm, poly = line.split(' ', 2)
        traces[pid] = (float(osrm), poly.strip())

def encode(pts):
    out = ''; pa = pg = 0
    for la, lg in pts:
        a, g = round(la * 1e5), round(lg * 1e5)
        for v in (a - pa, g - pg):
            x = ~(v << 1) if v < 0 else v << 1
            while x >= 0x20: out += chr((0x20 | (x & 0x1f)) + 63); x >>= 5
            out += chr(x + 63)
        pa, pg = a, g
    return out

# v385 (ma demande du 24 nov. : « Panoramas faux, Verdeau, Vivienne, Colbert, Prado non dessinés ») : l'axe lu dans OpenStreetMap passe avant
# le chemin calculé par OSRM ; gardé s'il passe à moins de 60 m du repère et mesure de 20 à 400 m.
OSM = json.load(open(os.path.join(HERE, 'traces-osm.json'), encoding='utf-8'))

items = []
for pid, nom, lat, lng, A, B in P:
    rues, t, s = TXT[pid]
    it = {'id': pid, 'nom': nom, 'lat': lat, 'lng': lng, 'rues': rues, 't': t, 's': s}
    if pid in OSM:
        pts = [tuple(x) for x in OSM[pid]['pts']]
        L = length(pts); pin = min(dist((lat, lng), p) for p in pts)
        ok = 20 <= L <= 400 and pin <= 60
        print(f'{pid:12} trait OpenStreetMap {round(L):4} m, repère à {round(pin):3} m :', 'gardé' if ok else 'pictogramme seul')
        if ok:
            it['trace'] = encode(pts)
            mid = pts[len(pts) // 2]
            it['lat'], it['lng'] = round(mid[0], 5), round(mid[1], 5)
    elif A and pid in traces:
        osrm, poly = traces[pid]
        pts = decode(poly)
        L = length(pts)
        straight = dist(A, B)
        pin = min(dist((lat, lng), p) for p in pts)
        ok = abs(L - osrm) < 15 and L <= straight * 1.3 and pin <= 40
        print(f'{pid:12} trait {round(L):4} m, ligne droite {round(straight):4} m, repère à {round(pin):3} m :', 'gardé' if ok else 'pictogramme seul')
        if ok:
            it['trace'] = poly
            mid = pts[len(pts) // 2]
            it['lat'], it['lng'] = round(mid[0], 5), round(mid[1], 5)
    else:
        print(f'{pid:12} pas de chemin calculé : pictogramme seul')
    items.append(it)

out = {'source': 'Liste établie à la main ; textes : Ville de Paris (paris.fr) et offices de tourisme. Entrées géocodées par l\'IGN ; tracé des passages lu dans OpenStreetMap (24 nov. 2026), sinon chemins à pied calculés par OSRM (routing.openstreetmap.de, données OpenStreetMap).',
       'updated': '2026-11-24', 'items': items}
with open(os.path.join(HERE, '..', '..', 'data', 'passages.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
    f.write('\n')
print(len(items), 'passages,', sum(1 for x in items if 'trace' in x), 'avec un trait')
