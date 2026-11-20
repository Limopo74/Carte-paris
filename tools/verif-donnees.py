#!/usr/bin/env python3
"""Garde-fou du robot de mise à jour : compare les données refaites à celles d'avant (copie dans un dossier).

Usage : python3 -I tools/verif-donnees.py DOSSIER_AVANT
Échoue (code 1) si un fichier est illisible, vide, ou s'il a perdu plus de 20 % de ses éléments : une source
coupée ou changée ne doit jamais vider l'appli. Le robot ne publie alors rien.

Les listes de SOFT (v197 à v200) ne bloquent jamais : illisible, sous son minimum ou en perte de plus de 20 %,
la liste d'avant est remise à sa place et le reste est publié.
"""
import json, os, shutil, sys

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
# v170 : listes d'OpenStreetMap, vides tant que le robot n'a jamais réussi à les obtenir (tools/maj-art.mjs garde
# l'ancienne liste quand le serveur ne répond pas) : vides avant et après = pas encore là, ce n'est pas un échec.
OPTIONAL = {'data/oeuvres.json': ('elements', 100), 'data/galeries.json': ('elements', 100)}
# v207 : listes non bloquantes (clé de la liste, minimum : le même que dans leur script tools/maj-….py)
SOFT = {
    'data/respire.json': ('secteurs', 15),
    'data/voies.json': ('voies', 500),
    'data/architectes.json': ('items', 300),
    'data/acces.json': ('items', 800),
    'data/gares.json': ('stations', 100),
    'data/bus-traces.json': ('lines', 400),   # v228 : chemin des lignes de bus (856 en septembre 2026)
    'data/patrimoine.json': ('items', 5000),  # v245 : immeubles protégés par la Ville (5 729 protections en novembre 2026)
    'data/acr.json': ('items', 50),           # v245 : architecture contemporaine remarquable à Paris (64 en novembre 2026)
    'data/velo.json': ('s', 3000),            # v259 : pistes à vélo, traits séparés des voitures (environ 8 800 en novembre 2026)
    'data/jardins.json': ('items', 500),      # v261 : jardins publics de la Ville (contours ; vide tant que le robot n'est pas passé)
    'data/jardins-liens.json': ('items', 50), # v273 : pages paris.fr des jardins (vide tant que le robot n'est pas passé)
}


def count(path, key):
    """Nombre d'éléments de la liste, ou None si le fichier est illisible."""
    try:
        return len(json.load(open(path, encoding='utf8'))[key])
    except Exception:  # noqa: BLE001
        return None


for path, (key, floor) in SOFT.items():
    old_path = os.path.join(BEFORE, os.path.basename(path))
    n, old = count(path, key), count(old_path, key)
    if n == 0 and not old:
        print(f'ok {path} : encore vide'); continue
    why = 'illisible' if n is None else f'{n} éléments (au moins {floor} attendus)' if n < floor else f'{n} éléments contre {old} avant (perte de plus de 20 %)' if old and n < old * 0.8 else ''
    if not why:
        print(f'ok {path} : {n} éléments (avant : {old or 0})')
    elif old is None:
        print(f'ATTENTION {path} : {why}, et pas de liste d\'avant à remettre')
    else:
        shutil.copyfile(old_path, path)
        print(f'GARDÉ {path} : {why} ; la liste d\'avant ({old} éléments) est remise')

ok = True
for path, (key, floor) in {**FILES, **OPTIONAL}.items():
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
    if path in OPTIONAL and n == 0 and old == 0:
        print(f'ok {path} : encore vide (OpenStreetMap n\'a pas encore répondu au robot)')
    elif n < floor:
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
