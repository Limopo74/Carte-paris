#!/usr/bin/env python3
"""Fabrique data/plaques.json (plaques commémoratives de Paris) à partir de l'export GeoJSON
« Plaques commémoratives » (Ville de Paris, Direction des Affaires Culturelles, licence ODbL).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-plaques.py plaques_commemoratives.geojson AAAA-MM-JJ

Garde le texte gravé en entier, l'endroit sur l'immeuble et l'adresse. Position : celle de la géométrie
(les champs x_4326 / y_4326 manquent sur une partie des fiches).
"""
import json, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
S, N, W, E = 48.80, 48.91, 2.22, 2.48
SMALL = {'d', 'l', 'de', 'du', 'des', 'la', 'le', 'les', 'et', 'sur', 'sous', 'en', 'aux', 'au', 'à', "d'", "l'"}
def quotes(v):
    """La source double ou quadruple les guillemets (« """"Lorraine"""" ») : un seul suffit (18 nov. 2026, 71 plaques)."""
    return re.sub(r'"{2,}', '"', str(v or ''))
def clean(v, n):
    return re.sub(r'\s+', ' ', quotes(v)).strip()[:n]
def lines(v):
    """Le texte gravé : la source marque les retours à la ligne par « / » ou « | » ; on les rend en vrais retours."""
    t = quotes(v).replace('\r', '')
    t = re.sub(r'\s*\|\s*|\s+/\s*|\s*/\s+', '\n', t)
    t = re.sub(r'/(?=[A-ZÀ-Ý])', '\n', t)          # « ISRAELITES/ET LA » : barre collée devant une majuscule
    t = '\n'.join(re.sub(r'[ \t]+', ' ', l).strip() for l in t.split('\n'))
    return re.sub(r'\n{2,}', '\n', t).strip()[:2500]
def place(v):
    """« REZ-DE-CHAUSSEE » → « Rez-de-chaussee » (l'endroit sur l'immeuble, parfois en majuscules)."""
    v = clean(v, 80)
    if not v.isupper(): return v
    v = v.lower()
    for a, b in (('rdc\\b', 'rez-de-chaussée'), ('chaussee', 'chaussée'), ('chausse ', 'chaussée '), ('etage', 'étage'), ('facade', 'façade'), ('cote', 'côté'), ('ecole', 'école')):
        v = re.sub(rf'\b{a}', b, v)                         # la source en majuscules a perdu ses accents
    return v[:1].upper() + v[1:]
def nice(name):
    """« 21 RUE DES ECOUFFES » → « 21 rue des Ecouffes » (la source écrit les adresses en majuscules)."""
    name = re.sub(r'\b(SAINTE?)- ', r'\1-', clean(name, 120))      # « SAINT- DENIS »
    name = re.sub(r'\b([DL]) (?=[AEIOUYH])', r"\1'", name)          # « QUAI D ORSAY » → « QUAI D'ORSAY »
    name = re.sub(r'\bDE (?=[AEIOUY])', "D'", name)                 # « RUE DE ASSAS » → « RUE D'ASSAS »
    if not name.isupper(): return name
    words = re.split(r"([ \-']+)", name.lower())
    out = []
    for w in words:
        if not w.strip(" -'"): out.append(w); continue
        if w in {'rue', 'avenue', 'boulevard', 'place', 'quai', 'impasse', 'passage', 'square', 'cité', 'villa', 'allée', 'cour', 'pont', 'port', 'rond-point', 'chaussée', 'galerie', 'parvis', 'jardin', 'esplanade', 'sentier', 'chemin', 'ruelle', 'carrefour', 'promenade', 'bis', 'ter'} or w in SMALL or w[:1].isdigit():
            out.append(w)
        else:
            out.append(w[:1].upper() + w[1:])
    return ''.join(out)
items = []
for f in json.load(open(SRC, encoding='utf8'))['features']:
    p, g = f.get('properties') or {}, f.get('geometry') or {}
    if g.get('type') != 'Point': continue
    lng, lat = g['coordinates'][:2]
    if not (S <= lat <= N and W <= lng <= E): continue
    text = lines(p.get('retranscription'))
    if not text: continue
    title = clean(p.get('titre') or p.get('personnalite'), 90) or text[:60]
    item = {'t': title, 'x': text, 'a': nice(p.get('adresse')), 'lat': round(lat, 5), 'lng': round(lng, 5)}
    if place(p.get('emplacement')): item['o'] = place(p.get('emplacement'))   # « 1er étage Façade »
    items.append(item)
items.sort(key=lambda i: (i['lat'], i['lng']))
json.dump({'source': '« Plaques commémoratives » (Ville de Paris, Direction des Affaires Culturelles, licence ODbL)',
           'updated': TODAY, 'items': items},
          open('data/plaques.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(items), 'plaques gardées')
