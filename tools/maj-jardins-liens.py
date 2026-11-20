#!/usr/bin/env python3
"""Fabrique data/jardins-liens.json : la page paris.fr de chaque jardin public, quand elle existe (v273).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-jardins-liens.py jardins.json AAAA-MM-JJ [minimum] [sortie]
(minimum et sortie servent aux essais : 50 et data/jardins-liens.json par défaut)

Entrée : le même export que tools/maj-jardins.py (jeu « Îlots de fraîcheur – Espaces verts frais » de Paris Data,
licence ODbL), avec en plus le champ id_dicom : le numéro de la page du jardin sur paris.fr.
La page d'un jardin s'écrit https://www.paris.fr/lieux/<nom>-<id_dicom>, et paris.fr exige le nom exact
(« square-carlo-sarrabezolles-2542 » répond, « jardin-2542 » non). Le nom est fabriqué à partir de celui de la Ville
(minuscules, sans accents, mots reliés par des tirets ; puis la partie avant « - » s'il y en a une), et chaque adresse
est ouverte une fois : seules celles qui répondent par la page du jardin sont gardées. Jamais de lien deviné.
Sortie : { source, date, items: { id du jardin (comme data/jardins.json) : "<nom>-<id_dicom>" } }.
Si paris.fr ne répond pas, ou si moins de `minimum` pages sont trouvées, rien n'est écrit : le fichier d'avant reste.

Pour les essais, sans réseau : la variable JARDINS_LIENS_OK donne un fichier JSON, liste des adresses qui « répondent ».
"""
import json, os, sys, time, unicodedata, re
import urllib.request, urllib.error

SRC, TODAY = sys.argv[1:3]
MIN = int(sys.argv[3]) if len(sys.argv) > 3 else 50
OUT = sys.argv[4] if len(sys.argv) > 4 else 'data/jardins-liens.json'
SOURCE = 'paris.fr, pages des parcs et jardins (adresses vérifiées par le robot) ; numéros : Îlots de fraîcheur – Espaces verts frais (Ville de Paris, licence ODbL)'
KINDS = {'Promenades ouvertes', "Jardins d'Etat", 'Bois'}  # les mêmes que tools/maj-jardins.py
BASE = 'https://www.paris.fr/lieux/'
UA = 'Ma carte de Paris (robot des donnees ; github.com/Limopo74/Carte-paris)'
PAUSE = 0.3


def slug(text):
    t = unicodedata.normalize('NFKD', str(text).replace('œ', 'oe').replace('Œ', 'OE').replace('æ', 'ae'))
    t = ''.join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


def candidates(name, dicom):
    """Les adresses à essayer, dans l'ordre : le nom entier, puis la partie avant « - »."""
    out = []
    for part in (name, name.split(' - ')[0]):
        s = slug(part)
        if s and f'{s}-{dicom}' not in out:
            out.append(f'{s}-{dicom}')
    return out


FAKE = os.environ.get('JARDINS_LIENS_OK')
fake_ok = set(json.load(open(FAKE, encoding='utf8'))) if FAKE else None


def answers(path):
    """True si la page répond (200, même adresse, pas la page d'erreur) ; False si non ; None si paris.fr ne répond pas."""
    if fake_ok is not None:
        return BASE + path in fake_ok
    req = urllib.request.Request(BASE + path, headers={'User-Agent': UA, 'Accept-Language': 'fr'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            if r.status != 200 or not r.geturl().rstrip('/').endswith('/lieux/' + path):
                return False
            head = r.read(30000).decode('utf8', 'replace')
            return 'Erreur 404' not in head and 'Page introuvable' not in head
    except urllib.error.HTTPError as e:
        return False if e.code in (404, 410) else None
    except Exception:  # noqa: BLE001 (réseau coupé, délai dépassé)
        return None
    finally:
        if fake_ok is None:
            time.sleep(PAUSE)


def rows(path):
    data = json.load(open(path, encoding='utf8'))
    return data if isinstance(data, list) else data.get('results', [])


# Les jardins de chaque numéro paris.fr (plusieurs parties d'un même jardin partagent souvent la même page)
by_dicom = {}
for r in rows(SRC):
    if str(r.get('type') or '').strip() not in KINDS:
        continue
    dicom = str(r.get('id_dicom') or '').strip()
    if not dicom.isdigit():
        continue
    rid = str(r.get('identifiant') or '').strip()
    if not rid:
        nsq = r.get('nsq_espace_vert')
        rid = f'EV{nsq}' if isinstance(nsq, (int, float)) else ''
    name = ' '.join(str(r.get('nom') or '').split())
    if rid and name:
        by_dicom.setdefault(dicom, []).append((rid[:20], name))

items, tried, silent = {}, 0, 0
for dicom, jardins in sorted(by_dicom.items()):
    found = None
    for path in dict.fromkeys(p for _, name in jardins for p in candidates(name, dicom)):
        ok = answers(path)
        tried += 1
        if ok is None:
            silent += 1
            if tried >= 30 and silent == tried:
                sys.exit('Jardins, pages paris.fr : paris.fr ne répond pas au robot : fichier d\'avant gardé')
            continue
        if ok:
            found = path
            break
    if found:
        for rid, _ in jardins:
            items[rid] = found

pages = len(set(items.values()))
print(f'Jardins, pages paris.fr : {pages} pages trouvées sur {len(by_dicom)} numéros, pour {len(items)} jardins ({tried} adresses essayées, {silent} sans réponse)')
if len(items) < MIN:
    sys.exit(f'Jardins, pages paris.fr : seulement {len(items)} jardins avec une page (moins de {MIN}) : fichier d\'avant gardé')
out = {'source': SOURCE, 'date': TODAY, 'items': dict(sorted(items.items()))}
text = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w', encoding='utf8').write(text + '\n')
print(f'Jardins, pages paris.fr : {OUT}, {len(text.encode("utf8"))} octets')
