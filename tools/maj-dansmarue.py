#!/usr/bin/env python3
"""Fabrique data/dansmarue.json : les signalements « Propreté » et « Objets abandonnés » de DansMaRue, comptés par carré
d'environ 100 m sur les 12 derniers mois publiés, pour la couche « Signalements Dans ma rue » (v471).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-dansmarue.py export.csv AAAA-MM-JJ [sortie]

Entrée : l'export CSV (séparateur « ; ») du jeu « Dans Ma Rue - Anomalies signalées » de Paris Data (Ville de Paris), colonnes
geo_point_2d (« 48.87, 2.35 ») et datedecl, déjà filtré par le robot (types et 12 mois). Les dates de début et de fin écrites
sont celles des signalements lus. Les seuils des trois niveaux (peu, moyen, beaucoup) partagent les carrés en trois parts à peu près égales.
Garde-fou : moins de 50 000 signalements lisibles, ou une période de moins de 300 jours, et rien n'est écrit (fichier d'avant gardé).
"""
import csv, json, math, sys
from datetime import date

SRC, TODAY = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else 'data/dansmarue.json'
MIN_ROWS = int(sys.argv[4]) if len(sys.argv) > 4 else 50000
LAT0, LNG0, DLAT, DLNG = 48.80, 2.22, 0.0009, 0.00136  # environ 100 m sur 100 m à Paris
BOX = (48.80, 48.93, 2.22, 2.48)  # Paris et ses bois
SOURCE = '« Dans Ma Rue - Anomalies signalées » (Paris Data, Ville de Paris) : types Propreté et Objets abandonnés'

counts, days, n = {}, [], 0
with open(SRC, encoding='utf-8-sig', newline='') as f:
    for r in csv.DictReader(f, delimiter=';'):
        try:
            g = str(r.get('geo_point_2d', '')).strip()
            if g.startswith('{'):  # au cas où l'export donne l'objet { "lon": …, "lat": … }
                o = json.loads(g); lat, lng = float(o['lat']), float(o['lon'])
            else:
                lat, lng = (float(x) for x in g.split(','))
            d = date.fromisoformat(str(r.get('datedecl', ''))[:10])
        except (ValueError, KeyError, TypeError):
            continue
        if not (BOX[0] <= lat <= BOX[1] and BOX[2] <= lng <= BOX[3]): continue
        k = (math.floor((lat - LAT0) / DLAT), math.floor((lng - LNG0) / DLNG))
        counts[k] = counts.get(k, 0) + 1
        days.append(d); n += 1
if n < MIN_ROWS: sys.exit(f'{n} signalements lisibles (au moins {MIN_ROWS} attendus) : fichier d\'avant gardé')
d0, d1 = min(days), max(days)
if (d1 - d0).days < 300 and MIN_ROWS >= 50000: sys.exit(f'période trop courte ({d0} → {d1}) : fichier d\'avant gardé')
vals = sorted(counts.values())
c1 = max(2, vals[len(vals) // 3]); c2 = max(c1 + 1, vals[2 * len(vals) // 3])
data = {'source': SOURCE, 'updated': TODAY, 'from': d0.isoformat(), 'to': d1.isoformat(), 'origin': [LAT0, LNG0], 'step': [DLAT, DLNG],
        'cuts': [c1, c2], 'cells': [[i, j, c] for (i, j), c in sorted(counts.items())]}
json.dump(data, open(OUT, 'w', encoding='utf8'), separators=(',', ':'))
print(f'Dans ma rue : {n} signalements, {len(counts)} carrés, seuils {c1} et {c2}, {d0} → {d1}')
