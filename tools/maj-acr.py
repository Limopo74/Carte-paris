#!/usr/bin/env python3
"""Fabrique data/acr.json : les édifices de Paris labellisés « Architecture contemporaine remarquable », pour Monuments (v245).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-acr.py dossier_des_pages AAAA-MM-JJ

Entrée : les pages JSON de l'API tabulaire de data.gouv.fr pour la « Liste des édifices labellisés Architecture
contemporaine remarquable (ACR) » (ministère de la Culture, Licence Ouverte 2.0, ressource
80b6ac20-41b1-400c-8860-af201ff7dcb6), filtrées sur Paris, colonnes Reference_de_la_notice, Titre_courant,
Auteur_de_l_edifice, Datation_de_l_edifice, Coordonnees, Date_de_Label. 64 édifices à Paris le 19 novembre 2026.
Le label ne vise que des édifices de moins de 100 ans qui ne sont pas protégés au titre des monuments historiques :
aucun doublon avec Monuments. Si la source a changé (moins de 50 édifices lisibles), rien n'est écrit.
"""
import glob, json, os, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = 'Label « Architecture contemporaine remarquable » (ministère de la Culture, Licence Ouverte 2.0)'
S, N, W, E = 48.80, 48.91, 2.22, 2.48
MIN = 50

items = {}
for f in sorted(glob.glob(os.path.join(SRC, '*.json'))):
    for r in json.load(open(f, encoding='utf8')).get('data', []):
        ref = str(r.get('Reference_de_la_notice') or '').strip()
        t = re.sub(r'\s+', ' ', str(r.get('Titre_courant') or '')).strip()[:140]
        if not re.fullmatch(r'ACR\d{7}', ref) or not t or ref in items:
            continue
        try:
            lat, lng = (float(v) for v in str(r.get('Coordonnees') or '').split(','))
        except ValueError:
            continue
        if not (S <= lat <= N and W <= lng <= E):
            continue
        a = [re.sub(r'\s+', ' ', x).strip()[:80] for x in str(r.get('Auteur_de_l_edifice') or '').split(';') if x.strip()]
        it = {'r': ref, 't': t, 'a': a[:6], 'lat': round(lat, 5), 'lng': round(lng, 5)}
        d = re.sub(r'\s*;\s*', ', ', str(r.get('Datation_de_l_edifice') or '')).strip()
        if d: it['d'] = d[:30]
        m = re.match(r'\s*(\d{4})', str(r.get('Date_de_Label') or ''))
        if m: it['l'] = m.group(1)
        items[ref] = it

if len(items) < MIN:
    sys.exit(f'Architecture contemporaine remarquable : seulement {len(items)} édifices lisibles, rien écrit (source changée ?)')
json.dump({'source': SOURCE, 'updated': TODAY, 'items': [items[k] for k in sorted(items)]},
          open('data/acr.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(items)} édifices labellisés « Architecture contemporaine remarquable » écrits dans data/acr.json')
