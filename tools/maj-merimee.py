#!/usr/bin/env python3
"""Fabrique data/merimee.json : pour chaque monument historique de Paris (référence PA de la base Mérimée),
la protection (classé ou inscrit), le siècle, le type d'édifice, « façade seulement » quand seul l'extérieur
est protégé, et le musée qu'il abrite. L'appli l'affiche dans Monuments, en joignant par la référence PA
que Wikidata renvoie déjà (aucune position n'est envoyée).

Usage, depuis la racine du dépôt (openpyxl est nécessaire : pip install openpyxl) :
  python3 -I tools/maj-merimee.py merimee_AAAAMMJJ.xlsx liste_des_musees_franciliens.geojson AAAA-MM-JJ

- merimee_….xlsx : export de pop.culture.gouv.fr, base Mérimée, filtre « Localisation : Paris » (bouton Exporter).
- liste_des_musees_franciliens.geojson : « Liste des musées franciliens » (Région Île-de-France), export GeoJSON.
  Seul son champ refmer (références Mérimée du bâtiment) sert : les coordonnées du fichier ne sont pas utilisées.
"""
import json, re, sys
import openpyxl

SRC, MUSEES, TODAY, OUT = sys.argv[1], sys.argv[2], sys.argv[3], 'data/merimee.json'

rows = list(openpyxl.load_workbook(SRC, read_only=True).worksheets[0].iter_rows(values_only=True))
head = next(i for i, r in enumerate(rows) if r and r[0] == 'Référence de la notice')  # la 1re ligne rappelle les critères
cols = rows[head]
notices = [dict(zip(cols, r)) for r in rows[head + 1:] if r and str(r[0] or '').startswith('PA')]
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


museums = {}
for f in json.load(open(MUSEES, encoding='utf8'))['features']:
    p = f.get('properties') or {}
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
