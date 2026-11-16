#!/usr/bin/env python3
"""Met à jour data/lignes.json (tracés simplifiés du métro et du RER) et data/stations.json (stations de métro)
à partir de deux exports GeoJSON d'Île-de-France Mobilités (data.iledefrance-mobilites.fr, licence ODbL) :

  « Tracés du réseau ferré IDF »  et  « Emplacement des gares IDF ».

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-lignes.py traces-du-reseau-ferre-idf.geojson emplacement-des-gares-idf.geojson AAAA-MM-JJ

Rien n'est téléchargé : le script lit les deux fichiers fournis. Il garde les couleurs déjà dans data/lignes.json
(référentiel des lignes IDFM) et n'ajoute que des lignes déjà en service à la date donnée.
"""
import json, math, re, sys, unicodedata

TRACES, GARES, TODAY = sys.argv[1], sys.argv[2], sys.argv[3]
# Zone gardée : Paris et la petite couronne, d'Orly (sud) à Saint-Denis Université (nord).
S, N, W, E = 48.72, 48.96, 2.20, 2.50
METRO = ['1', '2', '3', '3bis', '4', '5', '6', '7', '7bis', '8', '9', '10', '11', '12', '13', '14']
RER = ['A', 'B', 'C', 'D', 'E']
TOL_M = 18  # simplification : écart toléré au tracé réel, en mètres

KY, KX = 111_320, 111_320 * math.cos(math.radians(48.86))
def dist_m(a, b): return math.hypot((a[0] - b[0]) * KY, (a[1] - b[1]) * KX)

def seg_dist(p, a, b):
    ax, ay, bx, by, px, py = a[1] * KX, a[0] * KY, b[1] * KX, b[0] * KY, p[1] * KX, p[0] * KY
    dx, dy = bx - ax, by - ay
    if dx == dy == 0: return math.hypot(px - ax, py - ay)
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def simplify(pts, tol):  # Douglas-Peucker
    if len(pts) < 3: return pts
    i, dmax = max(((i, seg_dist(pts[i], pts[0], pts[-1])) for i in range(1, len(pts) - 1)), key=lambda x: x[1])
    if dmax <= tol: return [pts[0], pts[-1]]
    return simplify(pts[:i + 1], tol)[:-1] + simplify(pts[i:], tol)

inside = lambda p: S <= p[0] <= N and W <= p[1] <= E

def clip(line):  # coupe un tracé là où il sort de la zone
    out, cur = [], []
    for p in line:
        if inside(p): cur.append(p)
        else:
            if len(cur) > 1: out.append(cur)
            cur = []
    if len(cur) > 1: out.append(cur)
    return out

def in_service(props):
    d = (props.get('date_mes') or '')[:10]
    return not d or d <= TODAY

# ---------- tracés ----------
old = json.load(open('data/lignes.json', encoding='utf8'))
colors = {(l['mode'], l['ref']): l['color'] for l in old['lines']}
by_line = {}
for f in json.load(open(TRACES, encoding='utf8'))['features']:
    p, g = f['properties'], f['geometry']
    if not g or not in_service(p): continue
    ref = p.get('indice_lig')
    if p.get('mode') == 'METRO' and ref in METRO: key = ('M', ref)
    elif p.get('rer') == 1 and ref in RER: key = ('R', ref)
    else: continue
    lines = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    for ln in lines:
        for part in clip([(round(y, 6), round(x, 6)) for x, y in ln]):
            path = [[round(a, 5), round(b, 5)] for a, b in simplify(part, TOL_M)]
            by_line.setdefault(key, []).append(path)

lines = []
for mode, refs in (('M', METRO), ('R', RER)):
    for ref in refs:
        paths = by_line.get((mode, ref))
        if not paths: sys.exit(f'Ligne {mode} {ref} absente du fichier des tracés : rien n\'est écrit.')
        lines.append({'mode': mode, 'ref': ref, 'color': colors[(mode, ref)], 'paths': paths})
src = f"Île-de-France Mobilités, « Tracés du réseau ferré IDF » (ODbL), simplifié à {TOL_M} m, mis à jour le {TODAY} ; couleurs du métro : référentiel des lignes IDFM"
json.dump({'source': src, 'updated': TODAY, 'lines': lines}, open('data/lignes.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('tracés :', ', '.join(f"{l['mode']}{l['ref']}={sum(len(p) for p in l['paths'])} pts" for l in lines))

# ---------- stations de métro ----------
def norm(s): return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower())
def clean(s): return re.sub(r'\s+', ' ', s.replace('​', '').replace('’', '\'')).strip()
def app_name(s): return clean(s).replace(' - ', '—').replace(' – ', '—')

gares = {}
for f in json.load(open(GARES, encoding='utf8'))['features']:
    p = f['properties']
    if p.get('mode') != 'METRO' or p.get('indice_lig') not in METRO: continue
    if p.get('date_mise') and p['date_mise'][:10] > TODAY: continue
    pt = p['geo_point_2d']
    if not inside((pt['lat'], pt['lon'])): continue
    g = gares.setdefault(norm(clean(p['nom_gares'])), {'n': app_name(p['nom_gares']), 'l': set(), 'pts': []})
    g['l'].add(p['indice_lig']); g['pts'].append((pt['lat'], pt['lon']))

st = json.load(open('data/stations.json', encoding='utf8'))
order = {r: i for i, r in enumerate(METRO)}
known = {norm(s['n']): s for s in st['stations']}
moved, added, relined = [], [], []
for k, g in gares.items():
    lat = round(sum(a for a, _ in g['pts']) / len(g['pts']), 5); lng = round(sum(b for _, b in g['pts']) / len(g['pts']), 5)
    s = known.get(k)
    if s is None:  # même station sous un nom un peu différent (« Pereire » / « Pereire-Levallois ») : la plus proche à moins de 200 m
        near = min(st['stations'], key=lambda x: dist_m((x['lat'], x['lng']), (lat, lng)))
        if dist_m((near['lat'], near['lng']), (lat, lng)) < 200 and norm(near['n']) not in gares: s = near; known[k] = near
    if s is None:
        s = {'n': g['n'], 'm': 'M', 'l': sorted(g['l'], key=order.get), 'lat': lat, 'lng': lng}
        st['stations'].append(s); known[k] = s; added.append(f"{s['n']} ({', '.join(s['l'])})"); continue
    if dist_m((s['lat'], s['lng']), (lat, lng)) > 150:
        moved.append(f"{s['n']} : {round(dist_m((s['lat'], s['lng']), (lat, lng)))} m"); s['lat'], s['lng'] = lat, lng
    new = sorted(set(s['l']) | g['l'], key=order.get)
    if new != s['l']: relined.append(f"{s['n']} : {', '.join(s['l'])} → {', '.join(new)}"); s['l'] = new
st['stations'].sort(key=lambda s: (order.get(s['l'][0], 99), s['n']))
st['source'] = st['source'].split(' ; positions vérifiées')[0] + f" ; positions vérifiées d'après « Emplacement des gares IDF » (IDFM, ODbL), le {TODAY}"
st['updated'] = TODAY
json.dump(st, open('data/stations.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('stations ajoutées :', added or 'aucune')
print('stations déplacées (plus de 150 m) :', moved or 'aucune')
print('lignes ajoutées à une station :', relined or 'aucune')
print('stations de l\'appli absentes du fichier IDFM :', sorted(x['n'] for x in st['stations'] if all(x is not v for kk, v in known.items() if kk in gares)) or 'aucune')
