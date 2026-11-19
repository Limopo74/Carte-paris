#!/usr/bin/env python3
"""Fabrique data/patrimoine.json : les immeubles protégés par la Ville de Paris, pour Monuments (v245).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-patrimoine.py pvp.json pvp-geos.json pvp-surf.json AAAA-MM-JJ

Entrées : trois exports JSON de Paris Data (plan local d'urbanisme bioclimatique voté le 16 juin 2026, Direction de
l'Urbanisme, licence ODbL, sans valeur réglementaire) :
- plub_pvp : une protection par ligne : num_ca (arrondissement), num_pvp, adr_ori (adresse), motiv_txt (le texte) ;
- plub_pvp_geos : le lien entre une protection (n_sq_ca, num_pvp) et ses polygones (n_sq_spvp) ;
- plub_surf_pvp : les polygones, avec leur point central geo_point_2d.
Une protection peut couvrir plusieurs bâtiments : tous leurs points sont gardés (« p »), le téléphone prend le plus proche.
Le texte est gardé en entier (« Lire la suite »), espaces et guillemets réparés (« «?la tour Piano?» »).
Si la source a changé (moins de 5 000 protections avec adresse, texte et point), rien n'est écrit : le fichier d'avant reste.
"""
import json, re, sys

PVP, GEOS, SURF, TODAY = sys.argv[1:5]
SOURCE = 'Protections patrimoniales du plan local d\'urbanisme bioclimatique (Ville de Paris, licence ODbL, sans valeur réglementaire)'
S, N, W, E = 48.80, 48.91, 2.22, 2.48
MIN = 5000


def rows(path):
    data = json.load(open(path, encoding='utf8'))
    return data if isinstance(data, list) else data.get('results', [])


def text(t):
    t = re.sub(r'«\s*\?\s*', '« ', str(t or ''))
    t = re.sub(r'\s*\?\s*»', ' »', t)
    return re.sub(r'\s+', ' ', t).strip()[:6000]


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


points = {}
for r in rows(SURF):
    g = r.get('geo_point_2d') or {}
    try:
        lat, lng = float(g['lat']), float(g['lon'])
    except (KeyError, TypeError, ValueError):
        continue
    if S <= lat <= N and W <= lng <= E and num(r.get('n_sq_spvp')) is not None:
        points[num(r['n_sq_spvp'])] = (round(lat, 5), round(lng, 5))

shapes = {}
for r in rows(GEOS):
    k = (num(r.get('n_sq_ca')), num(r.get('num_pvp')))
    p = points.get(num(r.get('n_sq_spvp')))
    if None not in k and p and p not in shapes.setdefault(k, []):
        shapes[k].append(p)

items = {}
for r in rows(PVP):
    k = (num(r.get('num_ca')), num(r.get('num_pvp')))
    a = re.sub(r'\s+', ' ', str(r.get('adr_ori') or '')).strip()[:120]
    t = text(r.get('motiv_txt'))
    p = shapes.get(k)
    if None in k or not a or not t or not p:
        continue
    n = f'{k[0]:02d}-{k[1]:04d}'
    items[n] = {'n': n, 'a': a, 't': t, 'p': [list(x) for x in p[:12]]}

if len(items) < MIN:
    sys.exit(f'Immeubles protégés par la Ville : seulement {len(items)} lisibles, rien écrit (source changée ?)')
json.dump({'source': SOURCE, 'updated': TODAY, 'items': [items[k] for k in sorted(items)]},
          open('data/patrimoine.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(items)} immeubles protégés par la Ville écrits dans data/patrimoine.json')
