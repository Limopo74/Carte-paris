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
sys.exit(0 if ok else 1)
