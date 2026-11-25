#!/usr/bin/env python3
"""Fabrique data/jardins.json : les contours des jardins publics de Paris, pour le calque « Jardins publics » (v261).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-jardins.py jardins.json AAAA-MM-JJ [minimum] [sortie]
(minimum et sortie servent aux essais : 500 et data/jardins.json par défaut)

Entrée : l'export JSON du jeu « Îlots de fraîcheur – Espaces verts frais » de Paris Data (Ville de Paris, licence ODbL),
champs identifiant, nsq_espace_vert, nom, type, geo_point_2d, geo_shape.
Gardés : les « Promenades ouvertes » (squares, jardins, parcs, promenades), les « Jardins d'Etat » (Luxembourg, Tuileries…)
et les « Bois ». Écartés : jardinières et décorations de la voie publique, jardinets décoratifs (on n'y entre pas),
jardins partagés, cimetières, jardins de musées (leurs horaires sont ceux du musée, souvent payant).
v450 : sauf les trois grands cimetières (Père-Lachaise, Montparnasse, Montmartre, par leur identifiant), gardés pour leur contour
seulement (type « c ») : leurs horaires, portes et tombes sont dans data/cimetieres.json, tenu à la main (ceux du jeu sont ceux du bureau).
Chaque contour est simplifié (écart de 1,5 m au plus), arrondi au mètre (5 décimales) ; la surface est calculée sur le
contour (trous retirés) : 4 ha ou plus = « grand jardin » (bandeau « Maintenant »).
Les horaires ne sont pas copiés ici : ils changent avec les saisons, l'appli les lit dans la copie du jour du même jeu.
Si la source a changé (moins de 500 jardins lisibles), rien n'est écrit : le fichier d'avant reste.
"""
import json, math, sys

SRC, TODAY = sys.argv[1:3]
MIN = int(sys.argv[3]) if len(sys.argv) > 3 else 500
OUT = sys.argv[4] if len(sys.argv) > 4 else 'data/jardins.json'
SOURCE = 'Îlots de fraîcheur – Espaces verts frais (Ville de Paris, licence ODbL)'
KINDS = {'Promenades ouvertes': 'j', "Jardins d'Etat": 'e', 'Bois': 'b', 'Cimetières': 'c'}
CIMETIERES = {'ID154', 'ID130', 'ID129'}  # v450 : Père-Lachaise, Montparnasse, Montmartre (data/cimetieres.json, champ jid)
S, N, W, E = 48.80, 48.91, 2.22, 2.48
TOL_M = 1.5
BIG_M2 = 40000
KY = 110540.0


def rows(path):
    data = json.load(open(path, encoding='utf8'))
    return data if isinstance(data, list) else data.get('results', [])


def kx(lat):
    return 111320.0 * math.cos(math.radians(lat))


def simplify(pts, tol, lat0):
    """Douglas-Peucker sur des [lat, lng], distances en mètres autour de lat0."""
    if len(pts) < 3:
        return pts
    fx, fy = kx(lat0), KY

    def dist(p, a, b):
        ax, ay = (a[1] - p[1]) * fx, (a[0] - p[0]) * fy
        bx, by = (b[1] - p[1]) * fx, (b[0] - p[0]) * fy
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return math.hypot(ax, ay)
        t = max(0.0, min(1.0, -(ax * dx + ay * dy) / (dx * dx + dy * dy)))
        return math.hypot(ax + t * dx, ay + t * dy)

    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, k = stack.pop()
        best, idx = 0.0, None
        for m in range(i + 1, k):
            d = dist(pts[m], pts[i], pts[k])
            if d > best:
                best, idx = d, m
        if idx is not None and best > tol:
            keep[idx] = True
            stack += [(i, idx), (idx, k)]
    return [p for p, ok in zip(pts, keep) if ok]


def area_m2(ring, lat0):
    fx = kx(lat0)
    a = 0.0
    for i in range(len(ring)):
        y1, x1 = ring[i]
        y2, x2 = ring[(i + 1) % len(ring)]
        a += (x1 * fx) * (y2 * KY) - (x2 * fx) * (y1 * KY)
    return abs(a) / 2


def polygons(shape):
    g = shape.get('geometry', shape) if isinstance(shape, dict) else None
    if not isinstance(g, dict):
        return []
    if g.get('type') == 'Polygon':
        return [g.get('coordinates') or []]
    if g.get('type') == 'MultiPolygon':
        return g.get('coordinates') or []
    return []


def clean_ring(ring, lat0):
    pts = []
    for p in ring:
        try:
            lng, lat = float(p[0]), float(p[1])
        except (TypeError, ValueError, IndexError):
            return []
        if not (S <= lat <= N and W <= lng <= E):
            return []
        pts.append([lat, lng])
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    if len(pts) < 3:
        return []
    closed = simplify(pts + [pts[0]], TOL_M, lat0)[:-1]
    out = []
    for lat, lng in closed:
        q = [round(lat, 5), round(lng, 5)]
        if not out or out[-1] != q:
            out.append(q)
    return out if len(out) >= 3 else []


items = []
seen = set()
for r in rows(SRC):
    kind = KINDS.get(str(r.get('type') or '').strip())
    if not kind:
        continue
    rid = str(r.get('identifiant') or '').strip()
    if kind == 'c' and rid not in CIMETIERES:
        continue
    if not rid:
        nsq = r.get('nsq_espace_vert')
        rid = f'EV{nsq}' if isinstance(nsq, (int, float)) else ''
    name = ' '.join(str(r.get('nom') or '').split())
    g = r.get('geo_point_2d') or {}
    try:
        lat0, lng0 = float(g['lat']), float(g['lon'])
    except (KeyError, TypeError, ValueError):
        continue
    if not rid or not name or rid in seen or not (S <= lat0 <= N and W <= lng0 <= E):
        continue
    rings, area = [], 0.0
    for poly in polygons(r.get('geo_shape')):
        for i, ring in enumerate(poly):
            c = clean_ring(ring, lat0)
            if not c:
                continue
            rings.append(c)
            area += area_m2(c, lat0) * (1 if i == 0 else -1)
    if not rings:
        continue
    seen.add(rid)
    item = {'id': rid[:20], 'n': name[:120], 't': kind, 'c': [round(lat0, 5), round(lng0, 5)], 's': rings}
    if area >= BIG_M2 and kind != 'c':
        item['big'] = 1
    items.append(item)

if len(items) < MIN:
    sys.exit(f'Jardins : seulement {len(items)} lisibles (moins de {MIN}) : fichier d\'avant gardé')
items.sort(key=lambda x: x['id'])
out = {'source': SOURCE, 'date': TODAY, 'items': items}
text = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w', encoding='utf8').write(text + '\n')
pts = sum(len(r) for x in items for r in x['s'])
print(f'Jardins : {len(items)} ({sum(1 for x in items if x.get("big"))} de 4 ha ou plus), {pts} points, {len(text.encode("utf8"))} octets')
