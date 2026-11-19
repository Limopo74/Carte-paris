#!/usr/bin/env python3
"""Fabrique data/merimee.json : pour chaque monument historique de Paris (référence PA de la base Mérimée),
la protection (classé ou inscrit), le siècle, le type d'édifice, « façade seulement » quand seul l'extérieur
est protégé, et le musée qu'il abrite. L'appli l'affiche dans Monuments, en joignant par la référence PA
que Wikidata renvoie déjà (aucune position n'est envoyée).

Fabrique aussi data/musees.json (v231) : les musées de Paris ouverts et les artistes que la Région cite pour
leurs collections, pour « Toute l'année dans les musées » (page d'un artiste).

Usage, depuis la racine du dépôt (openpyxl est nécessaire : pip install openpyxl) :
  python3 -I tools/maj-merimee.py merimee_AAAAMMJJ.xlsx liste_des_musees_franciliens.geojson AAAA-MM-JJ
  python3 -I tools/maj-merimee.py --musees liste_des_musees_franciliens.geojson AAAA-MM-JJ   (data/musees.json seul)

- merimee_….xlsx : export de pop.culture.gouv.fr, base Mérimée, filtre « Localisation : Paris » (bouton Exporter).
- liste_des_musees_franciliens.geojson : « Liste des musées franciliens » (Région Île-de-France), export GeoJSON.
  Pour data/merimee.json, seul son champ refmer (références Mérimée du bâtiment) sert ; pour data/musees.json, le nom,
  l'adresse, le site, la position (corrigée par COORDS quand elle est fausse) et le champ artiste.
"""
import json, re, sys

ONLY_MUSEES = sys.argv[1] == '--musees'
if ONLY_MUSEES:
    SRC, MUSEES, TODAY = None, sys.argv[2], sys.argv[3]
else:
    SRC, MUSEES, TODAY = sys.argv[1], sys.argv[2], sys.argv[3]
OUT, OUT_MUSEES = 'data/merimee.json', 'data/musees.json'
txt = lambda v: re.sub(r'\s+', ' ', str(v or '')).strip()

# Types : le vocabulaire Mérimée, rendu lisible (« hôtel » est un hôtel particulier).
TYPES = {
    'hôtel': 'hôtel particulier', 'hôtel de voyageurs': 'hôtel', 'magasin de commerce': 'boutique',
    "fortification d'agglomération": 'rempart', 'débit de boissons': 'café', 'établissement conventuel': 'couvent',
    'lotissement concerté': 'lotissement', 'regard': 'regard de source',
}
EXT = r"fa[cç]ade|toiture|devanture|porte|portail|grille|\bmurs?\b|cl[oô]ture|vantaux|balcon|lucarne|corniche|pignon|ferronnerie|enseigne"
INT = r"int[ée]rieur|escalier|salon|\bsalles?\b|d[ée]cor|\bcours?\b|jardin|vestibule|chapelle|plafond|boiserie|cave|passage|galerie|appartement|chambre|\bhall|ensemble|totalit|cabinet|pi[èe]ce|lambris|sous-sol|crypte|vestige|reste|nef|\bbar\b"


def protection(nature):
    n = nature.lower()
    return 'C' if 'classé' in n else 'I' if 'inscrit' in n else ''


def outside_only(nature, precision):
    """« façade » ou « devanture » quand seule une partie extérieure est protégée (prudent : sinon rien)."""
    if not re.search(r'(classé|inscrit) MH partiellement', nature) or re.search(r'(classé|inscrit) MH(?! partiellement)', nature):
        return ''
    p = re.sub(r'sur (rue|cour|jardin|les cours?)', '', precision.lower())  # « façade sur cour » reste l'extérieur
    if re.search(INT, p) or not re.search(EXT, p):
        return ''
    return 'devanture' if re.search(r'devanture|enseigne|boutique', p) and not re.search(r'fa[cç]ade|toiture', p) else 'façade'


def century(s):
    m = re.search(r'(\d+)e siècle', s)
    return f'{m.group(1)}e siècle' if m else 'Moyen Âge' if 'moyen age' in s.lower() else ''


def museum_name(n):
    """« Petit Palais, Musée des Beaux-Arts… » → « Petit Palais » ; « Musée de L'Armée » → « Musée de l'Armée »."""
    n = re.sub(r'\s*\(.*?\)', '', txt(n))
    n = re.split(r' - |, ', n)[0]
    n = re.sub(r" L'", " l'", n).replace('Xxe', 'XXe').replace('Xviiie', 'XVIIIe')
    return n[:80]


# Musées de France que la liste de la Région garde alors qu'ils ne se visitent pas : jamais de « Se visite » pour eux.
# Vérifié le 19 nov. 2026 : Hébert fermé depuis 2004 (Conseil du 6e, 5 nov. 2024) ; AP-HP fermé au public (aphp.fr) ;
# Musée national d'Art moderne : Centre Pompidou fermé jusqu'en 2030 (voir ART_PLACES, js/art.js). À revoir à chaque mise à jour.
CLOSED = {'M5007', 'M1076', 'M5050'}

# --- data/musees.json : musées ouverts et artistes de leurs collections (v231) ---
# Positions fausses dans le fichier de la Région : celle de Wikidata (P625, trouvée par l'identifiant Muséofile P539), lue le 19 nov. 2026.
COORDS = {'M5026': (48.861944, 2.2875)}  # musée de la Marine : le fichier donne la position du musée Guimet, à 500 m
# Noms mal écrits ou mal coupés dans le champ artiste ; None = morceau sans nom d'artiste.
NAME_FIX = {
    'Lucien': None, 'Mainssieux': 'Lucien Mainssieux', 'Fautrier Gontcharova': ['Fautrier', 'Gontcharova'],
    'Villon Vlaminck': ['Villon', 'Vlaminck'], 'gris': 'Gris', 'Couston': None, 'Le douanier Rousseau': 'Henri Rousseau',
    'le douanier Rousseau': 'Henri Rousseau', 'Hokusai Katsushika': 'Katsushika Hokusai', 'Utamaro Kitagawa': 'Kitagawa Utamaro',
    'Hiroshige Andô': 'Andô Hiroshige', 'Ary Sheffer': 'Ary Scheffer', 'Brueghel de velours': 'Brueghel de Velours',
}
NOT_A_NAME = re.compile(r'artistes|élève|maître|polonais|richier|école', re.I)


def artist_names(raw):
    """Le champ artiste (liste ou texte) -> noms propres, sans dates ni phrases ; seulement le site de Paris."""
    items = raw.split(',') if isinstance(raw, str) else list(raw or [])
    out = []
    for item in items:
        item = txt(item)
        stop = 'Site de Toulon' in item  # le musée de la Marine cite aussi les peintres de son site de Toulon : on s'arrête là
        item = item.split('Site de Toulon')[0]
        for piece in re.split(r'\.\s+', item):
            piece = piece.split(':')[-1]
            piece = re.sub(r'\([^)]*(\)|$)', '', piece)  # dates, même sans parenthèse fermante
            piece = re.sub(r'\s+dit\s+.*$', '', piece)
            piece = re.sub(r'^([A-Z]\.-?[A-Z]?\.?\s*)+(?=[A-Z][a-zé])', '', piece.strip())  # « J.-B Huet » -> « Huet »
            piece = re.sub(r'^(fonds|et|notamment)\s+', '', piece, flags=re.I).strip(' .…').replace('- ', '-')
            if not piece or NOT_A_NAME.search(piece) or '.' in piece:
                continue
            fixed = NAME_FIX.get(piece, piece)
            for name in ([fixed] if isinstance(fixed, str) else fixed or []):
                if name[0].isupper() and len(name) <= 40 and name not in out:
                    out.append(name)
        if stop:
            break
    return out


def arrondissement(cp):
    cp = txt(cp)
    n = 16 if cp == '75116' else int(cp[3:]) if re.fullmatch(r'750(0[1-9]|1\d|20)', cp) else 0
    return '' if not n else '1er' if n == 1 else f'{n}e'


def musees_file():
    out = []
    for f in json.load(open(MUSEES, encoding='utf8'))['features']:
        p = f.get('properties') or {}
        if p.get('departement') not in (None, 'Paris') or p.get('identifiant') in CLOSED:
            continue
        art = artist_names(p.get('artiste'))
        coords = (f.get('geometry') or {}).get('coordinates') or [(p.get('coordonnees') or {}).get('lon'), (p.get('coordonnees') or {}).get('lat')]
        lat, lng = COORDS.get(p.get('identifiant'), (coords[1], coords[0]))
        url = txt(p.get('url'))
        if not art or lat is None or not url.startswith('https://'):
            continue
        name = museum_name(p.get('nom_officiel'))
        addr = txt(p.get('adresse'))
        addr = '' if addr.lower() in name.lower() else addr[:1].upper() + addr[1:]
        arr = arrondissement(p.get('code_postal'))
        out.append({'id': p['identifiant'], 'n': name, 'a': ', '.join(x for x in [addr, arr] if x), 'url': url,
                    'lat': round(float(lat), 6), 'lng': round(float(lng), 6), 'art': art})
    out.sort(key=lambda m: m['n'])
    json.dump({'source': 'Liste des musées franciliens (Région Île-de-France, data.iledefrance.fr), champ artiste', 'updated': TODAY, 'items': out},
              open(OUT_MUSEES, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(len(out), 'musées écrits dans', OUT_MUSEES, f'({sum(len(m["art"]) for m in out)} noms d\'artistes)')


musees_file()
if ONLY_MUSEES:
    sys.exit()

import openpyxl  # noqa: E402 (seulement pour l'export Mérimée)
rows = list(openpyxl.load_workbook(SRC, read_only=True).worksheets[0].iter_rows(values_only=True))
head = next(i for i, r in enumerate(rows) if r and r[0] == 'Référence de la notice')  # la 1re ligne rappelle les critères
cols = rows[head]
notices = [dict(zip(cols, r)) for r in rows[head + 1:] if r and str(r[0] or '').startswith('PA')]

museums = {}
for f in json.load(open(MUSEES, encoding='utf8'))['features']:
    p = f.get('properties') or {}
    if p.get('identifiant') in CLOSED:
        continue
    for ref in txt(p.get('refmer')).split(';'):
        ref = ref.strip()
        if re.fullmatch(r'PA\w{8}', ref):
            museums.setdefault(ref, [])
            name = museum_name(p.get('nom_officiel'))
            if name and name not in museums[ref]:
                museums[ref].append(name)

items, facade, with_museum = {}, 0, 0
for d in notices:
    ref = txt(d['Référence de la notice'])
    nature = txt(d["Nature de la protection de l'édifice"])
    kind = txt(d["Dénomination de l'édifice"]).split(';')[0].strip().lower()
    x = {
        'p': protection(nature),
        's': century(txt(d['Siècle de campagne principale de construction'])),
        't': TYPES.get(kind, kind)[:40],
        'f': outside_only(nature, txt(d['Précision sur la protection'])),
        'm': sorted(museums.get(ref, []), key=len)[:3],  # le plus court d'abord : « Musée du Louvre » avant « Musée de l'Orangerie… »
    }
    x = {k: v for k, v in x.items() if v}
    if x:
        items[ref] = x
        facade += bool(x.get('f'))
        with_museum += bool(x.get('m'))

json.dump({'source': 'Base Mérimée (ministère de la Culture, pop.culture.gouv.fr) et liste des musées franciliens (Région Île-de-France)',
           'updated': TODAY, 'items': items},
          open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(items), 'monuments écrits dans', OUT, f'({facade} « façade seulement », {with_museum} avec un musée)')
