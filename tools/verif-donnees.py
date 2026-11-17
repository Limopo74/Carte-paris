#!/usr/bin/env python3
"""Garde-fou du robot de mise à jour : compare les données refaites à celles d'avant (copie dans un dossier).

Usage : python3 -I tools/verif-donnees.py DOSSIER_AVANT
Échoue (code 1) si un fichier est illisible, vide, ou s'il a perdu plus de 20 % de ses éléments : une source
coupée ou changée ne doit jamais vider l'appli. Le robot ne publie alors rien.
"""
import json, os, sys

BEFORE = sys.argv[1]
FILES = {  # fichier : (clé de la liste, minimum absolu)
    'data/lignes.json': ('lines', 16),
    'data/stations.json': ('stations', 280),
    'data/navigo.json': ('items', 50),
    'data/sanitaires-ratp.json': ('items', 20),
    'data/arrondissements.json': ('arr', 20),
    'data/bus.json': ('stops', 1500),          # v148 : Paris et petite couronne (plusieurs milliers attendus)
    'data/plaques.json': ('items', 2000),      # v159 : plaques commémoratives de la Ville (2 619 en novembre 2026)
}
ok = True
for path, (key, floor) in FILES.items():
    try:
        new = json.load(open(path, encoding='utf8'))
        n = len(new[key])
    except Exception as e:  # noqa: BLE001
        print(f'ÉCHEC {path} : illisible ({e})'); ok = False; continue
    old_path = os.path.join(BEFORE, os.path.basename(path))
    try:
        old = len(json.load(open(old_path, encoding='utf8'))[key])
    except Exception:  # noqa: BLE001
        old = 0
    if n < floor:
        print(f'ÉCHEC {path} : {n} éléments (au moins {floor} attendus)'); ok = False
    elif old and n < old * 0.8:
        print(f'ÉCHEC {path} : {n} éléments contre {old} avant (perte de plus de 20 %)'); ok = False
    else:
        print(f'ok {path} : {n} éléments (avant : {old})')
# Un champ renommé à la source passerait inaperçu : quelques champs doivent garder au moins une valeur « oui ».
try:
    ratp = json.load(open('data/sanitaires-ratp.json', encoding='utf8'))['items']
    for field in ('pmr', 'passe'):
        if ratp and not any(x.get(field) for x in ratp):
            print(f'ÉCHEC data/sanitaires-ratp.json : plus aucun « {field} » (champ renommé à la source ?)'); ok = False
except Exception:  # noqa: BLE001
    pass
# Arrêts de bus : des lignes, et des arrêts à Paris comme en petite couronne (un filtre changé à la source viderait l'un des deux).
try:
    bus = json.load(open('data/bus.json', encoding='utf8'))
    if bus['stops']:
        paris = sum(1 for x in bus['stops'] if x[3].startswith('75'))
        if not bus['lines'] or paris < 500 or len(bus['stops']) - paris < 500:
            print(f"ÉCHEC data/bus.json : {len(bus['lines'])} lignes, {paris} arrêts à Paris, {len(bus['stops']) - paris} en petite couronne"); ok = False
except Exception:  # noqa: BLE001
    pass
# Plaques : l'endroit sur l'immeuble et l'adresse doivent rester remplis pour une bonne partie (champ renommé à la source ?).
try:
    pl = json.load(open('data/plaques.json', encoding='utf8'))['items']
    for field, part in (('o', 0.5), ('a', 0.9)):
        if pl and sum(1 for x in pl if x.get(field)) < len(pl) * part:
            print(f'ÉCHEC data/plaques.json : « {field} » vide sur trop de plaques (champ renommé à la source ?)'); ok = False
except Exception:  # noqa: BLE001
    pass
sys.exit(0 if ok else 1)
