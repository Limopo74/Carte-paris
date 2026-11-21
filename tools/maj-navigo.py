#!/usr/bin/env python3
"""Fabrique data/navigo.json (lieux partenaires des avantages culture Navigo) à partir de l'export GeoJSON
« Lieux bénéficiant des avantages culture Navigo » (Île-de-France Mobilités, portail PRIM).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-navigo.py lieux-avantages-cultures-navigo.geojson AAAA-MM-JJ

Garde Paris et la petite couronne (même zone que les lignes), et seulement les lieux dont l'offre est connue
(« Offre en cours d'élaboration », « Offre à venir » et « Mise en place des offres en cours » sont écartées).
"""
import json, re, sys

SRC, TODAY, OUT = sys.argv[1], sys.argv[2], 'data/navigo.json'
S, N, W, E = 48.72, 48.96, 2.20, 2.50
# v367 : lieux fermés pour longtemps, encore dans la liste (même liste que NAVIGO_CLOSED de js/navigo.js)
CLOSED = {'centre pompidou'}  # fermé pour travaux jusqu'en 2030
clean = lambda v, n: re.sub(r'\s+', ' ', str(v or '')).strip()[:n]
items = []
for f in json.load(open(SRC, encoding='utf8'))['features']:
    p, g = f['properties'], f.get('geometry') or {}
    if g.get('type') != 'Point': continue
    lng, lat = g['coordinates'][:2]
    if not (S <= lat <= N and W <= lng <= E): continue
    offre = clean(p.get('offre'), 500)
    low = offre.lower()
    if clean(p.get('nom_du_lieu'), 80).lower() in CLOSED: continue  # fermé pour longtemps
    if not offre or 'laboration' in low or low.startswith(('offre à venir', 'mise en place des offres')): continue  # pas encore d'offre
    url = clean(p.get('url'), 200)
    items.append({
        'n': clean(p.get('nom_du_lieu'), 80),
        'k': clean((p.get('discipline') or [''])[0], 30),         # discipline principale (Cinéma, Musique, Musée…)
        'o': offre,                                               # l'avantage, tel qu'écrit par le lieu
        'a': ', '.join(x for x in [clean(p.get('adresse'), 100), clean(p.get('code_postal'), 5) + ' ' + clean(p.get('commune'), 40)] if x.strip()),
        'lat': round(lat, 5), 'lng': round(lng, 5),
        'url': url if url.startswith(('https://', 'http://')) else '',
    })
items.sort(key=lambda x: x['n'])
json.dump({'source': '« Lieux bénéficiant des avantages culture Navigo » (Île-de-France Mobilités)', 'updated': TODAY, 'items': items},
          open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(items), 'lieux écrits dans', OUT)
