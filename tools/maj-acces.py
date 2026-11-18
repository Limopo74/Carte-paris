#!/usr/bin/env python3
"""Fabrique data/acces.json : les sorties des stations de métro (RATP), pour la fiche d'un lieu (v199).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-acces.py acces.json AAAA-MM-JJ

Entrée : l'export JSON du jeu « Référentiel des arrêts : Accès » d'Île-de-France Mobilités (Licence Ouverte 2.0), filtré sur
le fournisseur RATP, champs accname (« pl. de la Bastille »), accshortname (numéro de la sortie) et accgeopoint.
Seuls les accès dans Paris et sa proche couronne, avec un nom et un numéro, sont gardés.
Si la source a changé (moins de 800 accès), rien n'est écrit : le fichier d'avant reste.
"""
import json, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = '« Référentiel des arrêts : Accès » (Île-de-France Mobilités, Licence Ouverte 2.0)'
S, N, W, E = 48.78, 48.95, 2.18, 2.52
items, seen = [], set()
for r in json.load(open(SRC, encoding='utf8')):
    g = r.get('accgeopoint') or {}
    lat, lng = g.get('lat'), g.get('lon')
    n = re.sub(r'\s+', ' ', str(r.get('accname') or '')).strip()
    s = str(r.get('accshortname') if r.get('accshortname') is not None else '').strip()
    if not (isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and S <= lat <= N and W <= lng <= E): continue
    if not n or not s: continue
    k = (n, s, round(lat, 4), round(lng, 4))
    if k in seen: continue
    seen.add(k)
    items.append({'n': n[:60], 's': s[:6], 'lat': round(lat, 5), 'lng': round(lng, 5)})
if len(items) < 800:
    sys.exit(f'Accès du métro : seulement {len(items)} lisibles, rien écrit (source changée ?)')
items.sort(key=lambda a: (a['lat'], a['lng']))
json.dump({'source': SOURCE, 'updated': TODAY, 'items': items}, open('data/acces.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(items)} sorties de métro écrites dans data/acces.json')
