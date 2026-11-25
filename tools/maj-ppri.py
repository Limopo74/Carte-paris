#!/usr/bin/env python3
"""Fabrique data/ppri.json : la zone inondable du PPRI de Paris (crue de référence de 1910), d'un seul tenant, pour le
mode crise Crue (v503, mes choix 8 A et 23 A du 25 nov.).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-ppri.py plub_pprizone.geojson AAAA-MM-JJ

Entrée : l'export GeoJSON du jeu « PLU bioclimatique - Secteurs de risque - Inondations » de Paris Data (plub_pprizone,
champ zonage : BC, BCH, BS, BSH, R, V ; environ 1 650 morceaux). Toutes les zones du PPRI sont inondables en 1910 : leur
couleur réglementaire n'est pas gardée, seulement leur réunion. La source dit : « sans valeur réglementaire ».
Les morceaux sont réunis (bibliothèque shapely), les fentes de moins d'un mètre bouchées, le contour simplifié à 3 m.
Si la source a changé (moins de 1 000 morceaux lisibles, surface hors de 5 à 60 km²), rien n'est écrit.
"""
import json, math, sys

from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import unary_union, transform

SRC, TODAY = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else 'data/ppri.json'
SOURCE = '« PLU bioclimatique – Secteurs de risque – Inondations » (Paris Data, zonage du PPRI de la Seine, licence ODbL)'
ZONES = {'BC', 'BCH', 'BS', 'BSH', 'R', 'V'}
R = 6371008.8
LAT0 = math.radians(48.86)
K = math.cos(LAT0)

def to_m(x, y, z=None):
    return (math.radians(x) * R * K, math.radians(y) * R)

def to_deg(x, y, z=None):
    return (math.degrees(x / (R * K)), math.degrees(y / R))

src = json.load(open(SRC, encoding='utf-8'))
parts = []
for f in src.get('features', []):
    if (f.get('properties') or {}).get('zonage') not in ZONES: continue
    try:
        g = transform(to_m, shape(f['geometry']))
    except Exception:
        continue
    if not g.is_valid: g = g.buffer(0)
    if not g.is_empty: parts.append(g)
if len(parts) < 1000:
    sys.exit(f'PPRI : {len(parts)} morceaux lisibles seulement, la source a peut-être changé : fichier d\'avant gardé')

u = unary_union([p.buffer(0.5) for p in parts]).buffer(-0.5).simplify(3)
polys = list(u.geoms) if isinstance(u, MultiPolygon) else [u]
polys = [p for p in polys if isinstance(p, Polygon) and p.area >= 50]
area = sum(p.area for p in polys) / 1e6
if not 5 <= area <= 60:
    sys.exit(f'PPRI : surface de {area:.1f} km², hors de 5 à 60 : fichier d\'avant gardé')

def ring(r):
    pts = [to_deg(x, y) for x, y in r.coords][:-1]  # le dernier point répète le premier
    return [[round(lat, 5), round(lng, 5)] for lng, lat in pts]

zones = []
for p in sorted(polys, key=lambda p: -p.area):
    holes = [h for h in p.interiors if Polygon(h).area >= 100]
    zones.append([ring(p.exterior)] + [ring(h) for h in holes])

json.dump({'source': SOURCE, 'updated': TODAY, 'km2': round(area, 1), 'zones': zones}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'PPRI : {len(parts)} morceaux réunis en {len(zones)} zones, {area:.1f} km², {sum(len(r) for z in zones for r in z)} points')
