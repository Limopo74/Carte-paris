#!/usr/bin/env python3
"""Fabrique data/velo.json : les pistes et les rues calmes à vélo, pour la couche « Pistes à vélo » de la carte.

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-velo.py velo-ville.json

Entrée : export JSON de Paris Data, jeu « amenagements-cyclables » (Linéaires d'aménagement cyclable, Direction de la
Voirie et des Déplacements, données OpenStreetMap contrôlées par la Mission Vélo, licence ODbL), champs amenagement,
date_export et geo_shape. Le jeu garde un export par année : seul le plus récent est lu.

Deux familles seulement, rien d'autre n'est gardé :
- « s » (séparé des voitures) : piste cyclable, voie verte, chemin fermé à la circulation générale (bois) ;
- « c » (rue calme) : voie piétonne, vélorue, voie fermée à la circulation générale (bus inclus).
Bandes, couloirs de bus et doubles sens cyclables ne sont pas gardés : la voiture ou le bus y roule à côté.
Deux aménagements superposés (côté droit et côté gauche) donnent le même trait : un seul est gardé ; un trait « s »
l'emporte sur le même trait « c ».
Si la source a changé (moins de 300 km séparés des voitures), rien n'est écrit : le fichier d'avant reste.
"""
import json, math, sys

SRC = sys.argv[1]
OUT = 'data/velo.json'
SOURCE = 'Linéaires d\'aménagement cyclable (Ville de Paris, d\'après OpenStreetMap, licence ODbL)'
SEP = {'piste cyclable', 'voie verte', 'chemin fermé à la circulation générale (bois)'}
CALM = {'voie piétonne', 'vélorue', 'voie fermée à la circulation générale (bus inclus)'}
S, N, W, E = 48.80, 48.91, 2.22, 2.48
MIN_KM = 300


def rows(path):
    data = json.load(open(path, encoding='utf8'))
    return data if isinstance(data, list) else data.get('results', [])


def lines(shape):
    g = (shape or {}).get('geometry') or shape or {}
    if g.get('type') == 'LineString':
        return [g.get('coordinates') or []]
    if g.get('type') == 'MultiLineString':
        return g.get('coordinates') or []
    return []


def enc(v):
    x = ~(v << 1) if v < 0 else v << 1
    s = ''
    while x >= 0x20:
        s += chr((0x20 | (x & 0x1f)) + 63)
        x >>= 5
    return s + chr(x + 63)


def encode(pts):
    out, pa, pg = '', 0, 0
    for lat, lng in pts:
        a, g = round(lat * 1e5), round(lng * 1e5)
        if out and a == pa and g == pg:
            continue
        out += enc(a - pa) + enc(g - pg)
        pa, pg = a, g
    return out


def metres(pts):
    m = 0
    for (a1, g1), (a2, g2) in zip(pts, pts[1:]):
        m += math.hypot((a2 - a1) * 111320, (g2 - g1) * 111320 * math.cos(math.radians(a1)))
    return m


data = rows(SRC)
dates = sorted({str(r.get('date_export') or '')[:10] for r in data if r.get('date_export')})
if not dates:
    sys.exit('maj-velo : aucune date d\'export, fichier d\'avant gardé')
last = dates[-1]

seen, keep, km = {}, {'s': [], 'c': []}, {'s': 0.0, 'c': 0.0}
for r in data:
    if str(r.get('date_export') or '')[:10] != last:
        continue
    kind = 's' if r.get('amenagement') in SEP else 'c' if r.get('amenagement') in CALM else None
    if not kind:
        continue
    for line in lines(r.get('geo_shape')):
        pts = []
        for p in line:
            try:
                lng, lat = float(p[0]), float(p[1])
            except (TypeError, ValueError, IndexError):
                pts = []
                break
            pts.append((lat, lng))
        if len(pts) < 2 or not all(S <= a <= N and W <= g <= E for a, g in pts):
            continue
        if len({(round(a * 1e5), round(g * 1e5)) for a, g in pts}) < 2:
            continue
        code = encode(pts)
        back = encode(pts[::-1])
        key = min(code, back)
        if key in seen:
            if kind == 's' and seen[key] == 'c':
                seen[key] = 's'
            continue
        seen[key] = kind
        km[kind] += metres(pts) / 1000

for key, kind in seen.items():
    keep[kind].append(key)
km_s = round(km['s'])
if km_s < MIN_KM:
    sys.exit(f'maj-velo : seulement {km_s} km séparés des voitures (au moins {MIN_KM} attendus), fichier d\'avant gardé')

json.dump({'source': SOURCE, 'updated': last, 'km': {'s': km_s, 'c': round(km['c'])}, 's': sorted(keep['s']), 'c': sorted(keep['c'])},
          open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'{OUT} : export du {last}, {len(keep["s"])} traits séparés ({km_s} km), {len(keep["c"])} rues calmes ({round(km["c"])} km)')
