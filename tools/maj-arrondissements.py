#!/usr/bin/env python3
"""Fabrique data/arrondissements.json (contours simplifiés des 20 arrondissements) pour « Mon Paris ».

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-arrondissements.py arrondissements.geojson AAAA-MM-JJ [source]

Accepte l'export GeoJSON « Arrondissements » de Paris Data (champ c_ar) ou un export OpenStreetMap (champ ref:INSEE 751xx).
Les contours sont simplifiés à 4 m près : l'appli trouve l'arrondissement de chaque lieu sur le téléphone, sans rien envoyer.
"""
import json, math, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = sys.argv[3] if len(sys.argv) > 3 else '« Arrondissements » (Paris Data, licence ODbL)'
TOL_M = 4
LAT0 = math.radians(48.86)

def xy(p):
    return (math.radians(p[0]) * 6371008.8 * math.cos(LAT0), math.radians(p[1]) * 6371008.8)

def simplify(pts):
    """Douglas-Peucker (sans récursion profonde). Un contour fermé est coupé en deux à son point le plus éloigné."""
    if len(pts) < 4: return pts
    if pts[0] == pts[-1]:
        P0 = xy(pts[0])
        far = max(range(len(pts)), key=lambda i: math.dist(P0, xy(pts[i])))
        return simplify_open(pts[:far + 1])[:-1] + simplify_open(pts[far:])
    return simplify_open(pts)

def simplify_open(pts):
    if len(pts) < 3: return [[round(p[0], 6), round(p[1], 6)] for p in pts]
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    P = [xy(p) for p in pts]
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = P[a]; bx, by = P[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, idx = -1, None
        for i in range(a + 1, b):
            px, py = P[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best: best, idx = d, i
        if idx is not None and best > TOL_M:
            keep[idx] = True; stack += [(a, idx), (idx, b)]
    return [[round(p[0], 6), round(p[1], 6)] for p, k in zip(pts, keep) if k]

def num(props):
    if 'c_ar' in props: return int(props['c_ar'])
    ref = str(props.get('ref:INSEE') or props.get('code_insee') or '')
    return int(ref[3:]) if ref.startswith('751') and len(ref) == 5 else None

out = {}
for f in json.load(open(SRC, encoding='utf8'))['features']:
    g = f.get('geometry') or {}
    n = num(f.get('properties') or {})
    if not n or not 1 <= n <= 20 or g.get('type') not in ('Polygon', 'MultiPolygon'): continue
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    out.setdefault(n, []).extend(simplify(poly[0]) for poly in polys)  # contour extérieur (pas d'îlot enclavé dans Paris)
if sorted(out) != list(range(1, 21)):
    sys.exit(f'Il manque des arrondissements : {sorted(set(range(1, 21)) - set(out))}')
json.dump({'source': SOURCE, 'updated': TODAY, 'arr': [{'n': n, 'rings': out[n]} for n in sorted(out)]},
          open('data/arrondissements.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f"20 arrondissements, {sum(len(r) for rs in out.values() for r in rs)} points écrits dans data/arrondissements.json")
