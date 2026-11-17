#!/usr/bin/env python3
"""Fabrique data/bus.json (arrêts de bus et leurs lignes, Paris et petite couronne) à partir de l'export JSON
« Arrêts et lignes associées » d'Île-de-France Mobilités (jeu arrets-lignes, filtré sur le mode Bus).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-bus.py arrets-lignes.json AAAA-MM-JJ

Un arrêt = un nom dans une commune (les deux côtés de la rue et les quais d'un même arrêt sont réunis, à leur
position moyenne), avec la liste des lignes qui s'y arrêtent. Ni horaires ni sens : le fichier ne les donne pas.
Format : { source, updated, lines: [« 38 », « N14 »…], communes: { insee: nom } (hors Paris),
          stops: [[lat, lng, nom, insee, [indices des lignes]]…] }
"""
import json, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
DEPTS = ('75', '92', '93', '94')                     # Paris et petite couronne (choix du 17 nov. 2026)
S, N, W, E = 48.70, 49.00, 2.10, 2.65                # garde-fou : une position hors de cette zone est fausse

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def clean(v, n):
    return re.sub(r'\s+', ' ', str(v or '')).strip()[:n]

# À Paris, la source donne le code de la commune (75056) : l'arrondissement (75101…75120) est calculé avec les
# contours officiels du dépôt (data/arrondissements.json, refaits par le même robot juste avant).
ARR = json.load(open('data/arrondissements.json', encoding='utf8'))['arr']
def in_ring(x, y, ring):
    inside, j = False, len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside
def arr_insee(lat, lng):
    for a in ARR:
        if any(in_ring(lng, lat, r) for r in a['rings']):
            return f"751{int(a['n']):02d}"
    return None

rows = json.load(open(SRC, encoding='utf8'))
if isinstance(rows, dict):                           # export GeoJSON plutôt que JSON : on prend les propriétés
    rows = [f.get('properties', {}) for f in rows.get('features', [])]
lines, line_idx, groups, communes = [], {}, {}, {}
for r in rows:
    if str(r.get('mode') or 'Bus') != 'Bus':
        continue
    insee = clean(r.get('code_insee'), 5)
    if not re.fullmatch(r'\d{5}', insee) or not insee.startswith(DEPTS):
        continue
    lat, lng = num(r.get('stop_lat')), num(r.get('stop_lon'))
    if lat is None or lng is None:
        g = r.get('pointgeo') or {}
        lat, lng = num(g.get('lat')), num(g.get('lon'))
    name, line = clean(r.get('stop_name'), 60), clean(r.get('shortname') or r.get('route_long_name'), 12)
    if lat is None or lng is None or not (S <= lat <= N and W <= lng <= E) or not name or not line:
        continue
    if insee == '75056':                             # Paris : l'arrondissement d'après la position (bois compris : 12e, 16e)
        insee = arr_insee(lat, lng) or insee
    if not insee.startswith('75') and r.get('nom_commune'):
        communes[insee] = clean(r.get('nom_commune'), 40)   # Paris : l'arrondissement suffit (75115 → 15e)
    if line not in line_idx:
        line_idx[line] = len(lines); lines.append(line)
    g = groups.setdefault((name, insee), {'pts': {}, 'l': set()})
    g['pts'][clean(r.get('stop_id'), 40) or f'{lat},{lng}'] = (lat, lng)   # un point par quai, compté une fois
    g['l'].add(line_idx[line])

# Lignes triées (2, 20, 38, N01…) : indices recalculés
order = sorted(range(len(lines)), key=lambda i: (not lines[i][:1].isdigit(), int(re.match(r'\d*', lines[i]).group() or 0), lines[i]))
new_idx = {old: k for k, old in enumerate(order)}
lines = [lines[i] for i in order]
stops = []
for (name, insee), g in groups.items():
    pts = list(g['pts'].values())
    lat = sum(p[0] for p in pts) / len(pts); lng = sum(p[1] for p in pts) / len(pts)
    stops.append([round(lat, 5), round(lng, 5), name, insee, sorted(new_idx[i] for i in g['l'])])
stops.sort(key=lambda s: (s[3], s[2]))
json.dump({'source': '« Arrêts et lignes associées » (Île-de-France Mobilités, licence ODbL)', 'updated': TODAY,
           'lines': lines, 'communes': dict(sorted(communes.items())), 'stops': stops},
          open('data/bus.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(stops), 'arrêts ;', len(lines), 'lignes ;', sum(1 for s in stops if s[3].startswith('75')), 'à Paris')
