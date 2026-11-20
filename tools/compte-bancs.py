#!/usr/bin/env python3
"""Compte les bancs d'OpenStreetMap à Paris, par arrondissement (20 nov. 2026, après la v255).

Une mesure seulement : rien n'est écrit dans data/, l'appli ne change pas. Le robot des données lance ce script une
fois par mois et le résultat se lit dans son journal (étape « Compter les bancs d'OpenStreetMap »). Il sert à décider
si l'idée « le banc le plus proche » (claude/idees-donnees.md, idée 1) tient : le fichier « Jardinières, Bancs,
Corbeilles » de la Ville ne distingue pas les bancs (traits du plan de voirie sans type).

Usage, depuis la racine du dépôt :
  python3 -I tools/compte-bancs.py requete FICHIER     écrit la demande Overpass dans FICHIER
  python3 -I tools/compte-bancs.py REPONSE.json        affiche les comptes (ne fait jamais échouer le robot)

Compté : `amenity=bench` (point ou forme) ; à part, les arrêts de bus et abris notés `bench=yes`.
Chaque élément est rangé dans son arrondissement par data/arrondissements.json ; hors de Paris, il est ignoré.
"""
import json
import math
import sys

BBOX = '48.815,2.224,48.902,2.470'  # la même que les autres demandes du robot (js/art.js)
QUERY = (
    '[out:json][timeout:180];'
    f'nwr["amenity"="bench"]({BBOX});out center tags;'
    f'(node["highway"="bus_stop"]["bench"="yes"]({BBOX});nwr["amenity"="shelter"]["bench"="yes"]({BBOX}););out center tags;'
)


def inside(x, y, ring):
    """Point dans un polygone (anneau de [lng, lat]), par le tracé d'un rayon."""
    n, ok, j = len(ring), False, len(ring) - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            ok = not ok
        j = i
    return ok


def area_km2(ring):
    """Surface approchée d'un anneau [lng, lat] (projection locale, assez juste à l'échelle de Paris)."""
    lat0 = math.radians(48.86)
    k = 111.32
    pts = [(x * k * math.cos(lat0), y * 110.57) for x, y in ring]
    s = sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))
    return abs(s) / 2


def point(e):
    if isinstance(e.get('lat'), (int, float)):
        return e['lon'], e['lat']
    c = e.get('center') or {}
    if isinstance(c.get('lat'), (int, float)):
        return c['lon'], c['lat']
    return None


def arr_of(p, arrs):
    for a in arrs:
        if any(inside(p[0], p[1], r) for r in a['rings']):
            return a['n']
    return None


def report(resp, arrs):
    """{ n: { 'bancs': k, 'dossier': k, 'abris': k } }, plus le total des éléments lus et ceux hors de Paris."""
    counts = {a['n']: {'bancs': 0, 'dossier': 0, 'abris': 0} for a in arrs}
    seen, outside = set(), 0
    for e in resp.get('elements', []) if isinstance(resp, dict) else []:
        key = (e.get('type'), e.get('id'))
        if key in seen:
            continue
        seen.add(key)
        p = point(e)
        if not p:
            continue
        n = arr_of(p, arrs)
        if n is None:
            outside += 1
            continue
        t = e.get('tags') or {}
        if t.get('amenity') == 'bench':
            counts[n]['bancs'] += 1
            if t.get('backrest') == 'yes':
                counts[n]['dossier'] += 1
        elif t.get('bench') == 'yes':
            counts[n]['abris'] += 1
    return counts, len(seen), outside


def main(argv):
    if len(argv) == 3 and argv[1] == 'requete':
        with open(argv[2], 'w', encoding='utf-8') as f:
            f.write(QUERY)
        return 0
    if len(argv) != 2:
        print(__doc__)
        return 0
    try:
        with open(argv[1], encoding='utf-8') as f:
            resp = json.load(f)
        with open('data/arrondissements.json', encoding='utf-8') as f:
            arrs = json.load(f)['arr']
    except Exception as err:  # jamais bloquant
        print(f'Bancs : réponse illisible ({err}) ; rien à compter.')
        return 0
    if isinstance(resp.get('remark'), str) and resp['remark']:
        print(f'Bancs : remarque du serveur : {resp["remark"][:160]}')
    counts, total, outside = report(resp, arrs)
    surf = {a['n']: sum(area_km2(r) for r in a['rings']) for a in arrs}
    b = sum(c['bancs'] for c in counts.values())
    print(f'Bancs d\'OpenStreetMap à Paris : {b} ; avec dossier noté : {sum(c["dossier"] for c in counts.values())} ; '
          f'arrêts ou abris de bus avec banc noté : {sum(c["abris"] for c in counts.values())} '
          f'({total} éléments lus, {outside} hors de Paris ignorés).')
    print('Arr. | bancs | par km² | dossier | abris avec banc')
    for n in sorted(counts):
        c = counts[n]
        print(f'{n:>4} | {c["bancs"]:>5} | {c["bancs"] / surf[n]:>7.0f} | {c["dossier"]:>7} | {c["abris"]:>5}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
