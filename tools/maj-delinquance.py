#!/usr/bin/env python3
"""Fabrique data/delinquance.json : les vols enregistrés par arrondissement de Paris, pour Où suis-je ? (v470).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-delinquance.py arr.json paris.json AAAA-MM-JJ [sortie]

Entrées : deux réponses de l'API tabulaire de data.gouv.fr sur la « Base statistique communale de la délinquance enregistrée
par la police et la gendarmerie nationales » (SSMSI, Licence Ouverte 2.0, ressource CSV 44ef4323-1097-48d5-8719-3c544b55d294),
colonnes CODGEO_2026, annee, indicateur, nombre, est_diffuse, insee_pop : arr.json pour 75101 à 75120, paris.json pour 75056.
Seuls « Vols violents sans arme » et « Vols sans violence contre des personnes » sont gardés (les vols avec armes ne sont pas
publiés pour plusieurs arrondissements). Le taux est recalculé : nombre / population × 1 000.
Garde-fou : s'il manque un arrondissement, un indicateur non publié ou une population, rien n'est écrit (fichier d'avant gardé).
"""
import json, sys

ARR, PARIS, TODAY = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = sys.argv[4] if len(sys.argv) > 4 else 'data/delinquance.json'
KEYS = {'Vols violents sans arme': 'v', 'Vols sans violence contre des personnes': 's'}
SOURCE = ("SSMSI (ministère de l'Intérieur), base statistique communale de la délinquance enregistrée par la police "
          "et la gendarmerie nationales, data.gouv.fr, Licence Ouverte 2.0")

def rows(path):
    j = json.load(open(path, encoding='utf8'))
    return j.get('data', j) if isinstance(j, dict) else j

def table(path, codes):
    out, years = {}, set()
    for r in rows(path):
        code, ind = str(r.get('CODGEO_2026', '')), r.get('indicateur')
        if code not in codes or ind not in KEYS: continue
        if r.get('est_diffuse') != 'diff' or not isinstance(r.get('nombre'), int) or not isinstance(r.get('insee_pop'), int) or r['insee_pop'] <= 0:
            sys.exit(f'{code} {ind} : pas publié ou incomplet')
        years.add(r.get('annee'))
        out.setdefault(code, {'pop': r['insee_pop']})[KEYS[ind]] = r['nombre']
    for c in codes:
        if c not in out or not all(k in out[c] for k in KEYS.values()): sys.exit(f'{c} : manque un indicateur')
    return out, years

codes = [f'751{n:02d}' for n in range(1, 21)]
arr, y1 = table(ARR, codes)
paris, y2 = table(PARIS, ['75056'])
years = {y for y in y1 | y2 if y is not None}
if len(years) != 1: sys.exit(f'années mêlées ou absentes : {sorted(years)}')
year = int(years.pop())
rate = lambda n, p: round(n / p * 1000, 2)
p = paris['75056']
data = {
    'source': SOURCE, 'updated': TODAY, 'year': year,
    'paris': {'vv': rate(p['v'], p['pop']), 'vs': rate(p['s'], p['pop']), 'nv': p['v'], 'ns': p['s'], 'pop': p['pop']},
    'arr': [{'n': i + 1, 'vv': rate(arr[c]['v'], arr[c]['pop']), 'vs': rate(arr[c]['s'], arr[c]['pop']), 'nv': arr[c]['v'], 'ns': arr[c]['s'], 'pop': arr[c]['pop']} for i, c in enumerate(codes)],
}
json.dump(data, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'Vols enregistrés : {year}, 20 arrondissements → {OUT}')
