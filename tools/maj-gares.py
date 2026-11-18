#!/usr/bin/env python3
"""Fabrique data/gares.json : les gares de RER et les arrêts de tramway de Paris et de la proche couronne (v200),
pour Station et Rentrer (le métro garde data/stations.json).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-gares.py emplacement-des-gares-idf.geojson AAAA-MM-JJ

Entrée : le fichier « Emplacement des gares IDF » d'Île-de-France Mobilités, déjà téléchargé par le robot pour le métro
(champs mode = RER ou TRAMWAY, indice_lig, nom_gares, geo_point_2d, date_mise). Une gare de RER qui est déjà, à moins de
400 m, une station de métro portant la même ligne de RER (Châtelet, Auber…) n'est pas répétée. Ni horaires ni sens.
Si la source a changé (moins de 100 gares), rien n'est écrit.
"""
import json, math, re, sys, unicodedata

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = '« Emplacement des gares IDF » (Île-de-France Mobilités, ODbL)'
S, N, W, E = 48.76, 48.94, 2.20, 2.50
KY, KX = 111320, 111320 * math.cos(math.radians(48.86))
def dist_m(a, b): return math.hypot((a[0] - b[0]) * KY, (a[1] - b[1]) * KX)
def norm(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower())
def clean(s): return re.sub(r'\s+', ' ', str(s or '').replace('’', "'")).strip()

metro = json.load(open('data/stations.json', encoding='utf8'))['stations']
gares = {}
for f in json.load(open(SRC, encoding='utf8'))['features']:
    p = f.get('properties') or {}
    mode = {'RER': 'R', 'TRAMWAY': 'T'}.get(p.get('mode'))
    line = clean(p.get('indice_lig'))
    name = clean(p.get('nom_gares'))
    pt = p.get('geo_point_2d') or {}
    lat, lng = pt.get('lat'), pt.get('lon')
    if not mode or not line or not name or not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)): continue
    if p.get('date_mise') and str(p['date_mise'])[:10] > TODAY: continue  # pas encore en service
    if not (S <= lat <= N and W <= lng <= E): continue
    if mode == 'R' and any(line in (m.get('rer') or []) and dist_m((m['lat'], m['lng']), (lat, lng)) < 400 for m in metro): continue
    g = gares.setdefault((mode, norm(name)), {'n': name, 'm': mode, 'l': set(), 'pts': []})
    g['l'].add(line.upper() if mode == 'R' else line.lower()); g['pts'].append((lat, lng))
out = []
for g in gares.values():
    lat = round(sum(a for a, _ in g['pts']) / len(g['pts']), 5); lng = round(sum(b for _, b in g['pts']) / len(g['pts']), 5)
    out.append({'n': g['n'][:60], 'm': g['m'], 'l': sorted(g['l']), 'lat': lat, 'lng': lng})
if len(out) < 100:
    sys.exit(f'Gares RER et tram : seulement {len(out)}, rien écrit (source changée ?)')
out.sort(key=lambda s: (s['m'], s['n']))
json.dump({'source': SOURCE, 'updated': TODAY, 'stations': out}, open('data/gares.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f"{sum(s['m'] == 'R' for s in out)} gares de RER et {sum(s['m'] == 'T' for s in out)} arrêts de tram écrits dans data/gares.json")
