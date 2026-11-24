#!/usr/bin/env python3
"""Fabrique data/sanitaires-ratp.json (toilettes des gares et stations RATP) à partir de l'export GeoJSON
« Sanitaires réseau RATP » (open data RATP).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-sanitaires.py sanitaires-reseau-ratp.geojson AAAA-MM-JJ

Garde seulement les toilettes ouvertes au public, dans Paris et la petite couronne (même zone que les lignes).
"""
import json, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
S, N, W, E = 48.72, 48.96, 2.20, 2.50
yes = lambda v: str(v or '').strip().lower() == 'oui'
# oui → True, non → False, vide ou autre → None : on ne dit rien (v415, Trocadéro sans « en zone contrôlée »)
yes_no = lambda v: {'oui': True, 'non': False}.get(str(v or '').strip().lower())
SMALL = {'de', 'du', 'des', 'la', 'le', 'les', 'et', 'sur', 'sous', 'en', 'aux', 'au'}
def nice(name):
    """« CHATELET LES HALLES » → « Chatelet les Halles » (la source mélange majuscules et casse normale)."""
    name = re.sub(r'\s+', ' ', str(name or '')).strip()
    if not name.isupper(): return name
    words = re.split(r'([ \-])', name.lower())
    return ''.join(w if w in ' -' or (i and w in SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(words))
items = []
for f in json.load(open(SRC, encoding='utf8'))['features']:
    p, g = f['properties'], f.get('geometry') or {}
    if g.get('type') != 'Point' or not yes(p.get('accessible_au_public')): continue
    lng, lat = g['coordinates'][:2]
    if not (S <= lat <= N and W <= lng <= E): continue
    items.append({
        'n': nice(p.get('station'))[:60], 'l': str(p.get('ligne') or '').strip()[:6],
        'lat': round(lat, 5), 'lng': round(lng, 5),
        'zone': yes_no(p.get('en_zone_controlee')),                 # dans la zone payante : il faut un ticket pour y entrer ; None = la RATP ne le dit pas
        'passe': yes(p.get('acces_passe_navigo_ou_ticket_t')),      # la porte s'ouvre avec un passe Navigo ou un ticket
        'payant': str(p.get('tarif_gratuit_payant') or '').lower() == 'payant',
        'pmr': yes(p.get('accessibilite_pmr', p.get('accessibilite_pmr_totale'))),  # nom du champ dans l'API : accessibilite_pmr_totale
        'ou': str(p.get('localisation') or '').strip()[:160],
    })
items.sort(key=lambda x: (x['n'], x['l']))
json.dump({'source': '« Sanitaires réseau RATP » (open data RATP)', 'updated': TODAY, 'items': items},
          open('data/sanitaires-ratp.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(items), 'toilettes gardées ;', sum(i['zone'] is True for i in items), 'dans la zone payante')
