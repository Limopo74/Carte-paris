#!/usr/bin/env python3
"""Fabrique data/respire.json : les contours simplifiés des secteurs « Paris Respire » (rues sans voitures), pour la v197.

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-respire.py secteurs-paris-respire.geojson AAAA-MM-JJ

Entrée : l'export GeoJSON du jeu « Paris Respire – Secteurs » de Paris Data (champ nom, contour Polygon ou MultiPolygon).
Seuls le nom et le contour sont gardés. Les jours et les heures ne sont PAS lus ici : le jeu les donne en codes sans légende
et en texte libre ; ils sont tenus à la main dans js/respire.js, d'après la page paris.fr/parisrespire.
Si la source a changé (moins de 15 secteurs lisibles), rien n'est écrit : le fichier d'avant reste.
"""
import json, math, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = '« Paris Respire – Secteurs » (Paris Data, licence ODbL)'
TOL_M = 4
LAT0 = math.radians(48.86)

def xy(p):  # p = [lng, lat] (ordre du GeoJSON)
    return (math.radians(p[0]) * 6371008.8 * math.cos(LAT0), math.radians(p[1]) * 6371008.8)

def simplify_open(pts):
    if len(pts) < 3: return list(pts)
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
    return [p for p, k in zip(pts, keep) if k]

def simplify(pts):
    """Douglas-Peucker ; un contour fermé est coupé en deux à son point le plus éloigné du premier."""
    if len(pts) < 4: return list(pts)
    if pts[0] == pts[-1]:
        P0 = xy(pts[0])
        far = max(range(len(pts)), key=lambda i: math.dist(P0, xy(pts[i])))
        return simplify_open(pts[:far + 1])[:-1] + simplify_open(pts[far:])
    return simplify_open(pts)

out = []
for f in json.load(open(SRC, encoding='utf8')).get('features', []):
    g = f.get('geometry') or {}
    nom = str((f.get('properties') or {}).get('nom') or '').strip()
    if not nom or g.get('type') not in ('Polygon', 'MultiPolygon'): continue
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    rings = []
    for poly in polys:
        ring = simplify(poly[0])  # contour extérieur
        if ring and ring[0] == ring[-1]: ring = ring[:-1]
        if len(ring) >= 3: rings.append([[round(p[1], 5), round(p[0], 5)] for p in ring])  # [lat, lng] dans l'appli
    if rings: out.append({'nom': nom, 'rings': rings})
if len(out) < 15:
    sys.exit(f'Paris Respire : seulement {len(out)} secteurs lisibles, rien écrit (source changée ?)')
out.sort(key=lambda s: s['nom'].lower())
json.dump({'source': SOURCE, 'updated': TODAY, 'secteurs': out}, open('data/respire.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f"{len(out)} secteurs Paris Respire, {sum(len(r) for s in out for r in s['rings'])} points écrits dans data/respire.json")
