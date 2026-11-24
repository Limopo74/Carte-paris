#!/usr/bin/env python3
"""Fabrique data/acces.json : les sorties des stations de métro (RATP), pour la fiche d'un lieu (v199).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-acces.py acces.json AAAA-MM-JJ

Entrée : l'export JSON du jeu « Référentiel des arrêts : Accès » d'Île-de-France Mobilités (Licence Ouverte 2.0), filtré sur
le fournisseur RATP, champs accname (« pl. de la Bastille »), accshortname (numéro de la sortie), accgeopoint,
accisentry et accisexit (v395 : 137 accès RATP sont des sorties seules et 10 des entrées seules, comptés le 24 nov. 2026).
Seuls les accès dans Paris et sa proche couronne, avec un nom et un numéro, sont gardés ; un accès ni entrée ni sortie est écarté.
Chaque accès garde e (entrée) et x (sortie), 1 ou 0.
Si la source a changé (moins de 800 accès), rien n'est écrit : le fichier d'avant reste.
"""
import json, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = '« Référentiel des arrêts : Accès » (Île-de-France Mobilités, Licence Ouverte 2.0)'
S, N, W, E = 48.78, 48.95, 2.18, 2.52
def flag(v):
    return 1 if v is True or str(v).strip().lower() in ('true', '1', 'oui') else 0

items, seen = [], {}
for r in json.load(open(SRC, encoding='utf8')):
    g = r.get('accgeopoint') or {}
    lat, lng = g.get('lat'), g.get('lon')
    n = re.sub(r'\s+', ' ', str(r.get('accname') or '')).strip()
    s = str(r.get('accshortname') if r.get('accshortname') is not None else '').strip()
    if not (isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and S <= lat <= N and W <= lng <= E): continue
    if not n or not s: continue
    e, x = flag(r.get('accisentry')), flag(r.get('accisexit'))
    if not e and not x: continue
    k = (n, s, round(lat, 4), round(lng, 4))
    if k in seen:  # même accès deux fois : il est entrée si l'une des deux lignes le dit, sortie de même
        seen[k]['e'] |= e; seen[k]['x'] |= x
        continue
    a = {'n': n[:60], 's': s[:6], 'lat': round(lat, 5), 'lng': round(lng, 5), 'e': e, 'x': x}
    seen[k] = a
    items.append(a)
if len(items) < 800:
    sys.exit(f'Accès du métro : seulement {len(items)} lisibles, rien écrit (source changée ?)')
items.sort(key=lambda a: (a['lat'], a['lng']))
json.dump({'source': SOURCE, 'updated': TODAY, 'items': items}, open('data/acces.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f"{len(items)} accès du métro écrits dans data/acces.json ({sum(1 for a in items if not a['e'])} sorties seules, {sum(1 for a in items if not a['x'])} entrées seules)")
