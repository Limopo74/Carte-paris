#!/usr/bin/env python3
"""Fabrique data/bus-traces.json (le chemin des lignes de bus de Paris et de la petite couronne, v228) à partir de
l'export JSON « Tracés des lignes régulières commerciales de bus en Île-de-France » d'Île-de-France Mobilités
(jeu traces-des-lignes-regulieres-de-bus-en-ile-de-france, licence ODbL, © les contributeurs OpenStreetMap).

Usage, depuis la racine du dépôt (après tools/maj-bus.py, dont il lit data/bus.json) :
  python3 -I tools/maj-bus-traces.py traces-bus.json AAAA-MM-JJ

Le téléphone ne télécharge ce fichier que lorsque j'ajoute une ligne dans Réglages → Mes lignes de bus, puis il
ne garde que mes lignes. Ni horaires ni sens : le fichier ne les donne pas (aller et retour sont dessinés tous
les deux). Une ligne = un tracé qui passe dans la zone ci-dessous, simplifié à 15 m (Douglas-Peucker).
Format : { source, updated, data, lines: [{ id, ref, op, c, t, v: [communes], p: [[[lat, lng]…]…] }] }
  id = identifiant IDFM (« C01083 »), le même que dans le référentiel des lignes ; ref = numéro affiché (« 38 ») ;
  op = transporteur ; c, t = couleurs de la ligne et de son numéro ; v = 3 communes traversées au plus, dans
  l'ordre du tracé (« Paris », « Montrouge »), d'après les arrêts de data/bus.json à moins de 150 m.
Refuse d'écrire (code 1) si la source est illisible ou donne moins de MIN lignes : le fichier d'avant reste.
"""
import json, math, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
OUT = 'data/bus-traces.json'
MIN = 400                                            # 761 lignes en septembre 2026
S, N, W, E = 48.68, 49.02, 2.14, 2.64                # Paris et petite couronne, avec une petite marge
EPS = 15                                             # mètres : la simplification du tracé
HEX = re.compile(r'#?[0-9A-Fa-f]{6}')


def clean(v, n):
    return re.sub(r'\s+', ' ', str(v or '')).strip()[:n]


def colour(v, default):
    v = clean(v, 7)
    return ('#' + v.lstrip('#')).upper() if HEX.fullmatch(v) else default


def simplify(pts):
    """Douglas-Peucker en mètres (projection locale), extrémités gardées."""
    if len(pts) < 3:
        return pts
    kx, ky = 111320 * math.cos(math.radians(pts[0][1])), 110540
    xy = [(x * kx, y * ky) for x, y in pts]
    keep = [False] * len(xy); keep[0] = keep[-1] = True
    stack = [(0, len(xy) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = xy[a], xy[b]
        dx, dy = bx - ax, by - ay
        ll = dx * dx + dy * dy
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = xy[i]
            t = 0 if ll == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / ll))
            d = math.hypot(px - ax - t * dx, py - ay - t * dy)
            if d > best:
                best, bi = d, i
        if best > EPS:
            keep[bi] = True
            stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]


def parts(shape):
    """Les morceaux [[lng, lat]…] d'un geo_shape (Feature ou géométrie), en LineString ou MultiLineString."""
    g = (shape or {}).get('geometry', shape) or {}
    cs = g.get('coordinates') or []
    if g.get('type') == 'LineString':
        cs = [cs]
    out = []
    for c in cs:
        pts = [(float(p[0]), float(p[1])) for p in c if isinstance(p, (list, tuple)) and len(p) >= 2]
        if len(pts) >= 2:
            out.append(pts)
    return out


# Communes traversées : arrêts de bus du dépôt rangés dans une grille de 0,005° (environ 400 m)
try:
    BUS = json.load(open('data/bus.json', encoding='utf8'))
except (OSError, ValueError):
    BUS = {'stops': [], 'communes': {}}
GRID = {}
for s in BUS.get('stops', []):
    GRID.setdefault((int(s[0] / 0.005), int(s[1] / 0.005)), []).append(s)


def commune_at(lat, lng):
    best, name = 150.0, None
    gi, gj = int(lat / 0.005), int(lng / 0.005)
    for i in (gi - 1, gi, gi + 1):
        for j in (gj - 1, gj, gj + 1):
            for s in GRID.get((i, j), ()):
                d = math.hypot((s[0] - lat) * 110540, (s[1] - lng) * 111320 * math.cos(math.radians(lat)))
                if d < best:
                    best, name = d, 'Paris' if s[3].startswith('75') else BUS.get('communes', {}).get(s[3])
    return name


try:
    rows = json.load(open(SRC, encoding='utf8'))
except (OSError, ValueError) as e:
    sys.exit(f'Tracés des bus : source illisible ({e}) ; fichier d\'avant gardé')
if isinstance(rows, dict):                           # export GeoJSON : les propriétés, avec la géométrie
    rows = [{**(f.get('properties') or {}), 'geo_shape': f.get('geometry')} for f in rows.get('features', [])]

lines, dates = [], []
for r in rows:
    lid, ref = clean(r.get('lineid'), 12), clean(r.get('lineshortn') or r.get('linename'), 12)
    segs = parts(r.get('geo_shape'))
    if not re.fullmatch(r'C\d{5}', lid) or not ref or not segs:
        continue
    if ref.lower().startswith('tàd'):                # transport à la demande : pas de chemin fixe
        continue
    if not any(S <= lat <= N and W <= lng <= E for seg in segs for lng, lat in seg):
        continue
    p = [[[round(lat, 5), round(lng, 5)] for lng, lat in simplify(seg)] for seg in segs]
    towns = []
    longest = max(segs, key=len)
    for lng, lat in longest[:: max(1, len(longest) // 40)] + [longest[-1]]:
        t = commune_at(lat, lng)
        if t and t not in towns:
            towns.append(t)
    m = re.fullmatch(r'(\d{2})/(\d{2})/(\d{4})', clean(r.get('updated'), 10))
    if m:
        dates.append(f'{m[3]}-{m[2]}-{m[1]}')
    lines.append({'id': lid, 'ref': ref, 'op': clean(r.get('operatorid'), 50), 'c': colour(r.get('linecolor'), '#1B56E8'),
                  't': colour(r.get('linetextco'), '#FFFFFF'), 'v': towns[:3], 'p': p})

if len(lines) < MIN:
    sys.exit(f'Tracés des bus : {len(lines)} lignes seulement (au moins {MIN} attendues) ; fichier d\'avant gardé')
lines.sort(key=lambda x: (not x['ref'][:1].isdigit(), int(re.match(r'\d*', x['ref']).group() or 0), x['ref'], x['id']))
out = {'source': '« Tracés des lignes régulières commerciales de bus en Île-de-France » (Île-de-France Mobilités, licence ODbL ; tracés © les contributeurs OpenStreetMap)',
       'updated': TODAY, 'data': max(dates) if dates else None, 'lines': lines}
with open(OUT, 'w', encoding='utf8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
print(f'{OUT} : {len(lines)} lignes, tracés du {out["data"]}')
