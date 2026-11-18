#!/usr/bin/env python3
"""Fabrique data/voies.json : l'origine du nom des voies de Paris, pour « Où suis-je ? » (v198).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-voies.py voies.json AAAA-MM-JJ

Entrée : l'export JSON du jeu « Dénominations des emprises des voies actuelles » de Paris Data (Direction de l'Urbanisme,
licence ODbL), champs typo_min (« rue des Archives ») et orig (« Cette voie longe les bâtiments des Archives nationales. »).
Seuls ces deux champs sont gardés ; une origine de plus de 220 signes est coupée à la fin d'une phrase.
Si la source a changé (moins de 500 voies lisibles), rien n'est écrit : le fichier d'avant reste.
"""
import json, re, sys, unicodedata

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = '« Dénominations des emprises des voies actuelles » (Paris Data, licence ODbL)'
MAX = 220

def key(s):
    """La même clé que js/voies.js (voieKey)."""
    s = ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if not '̀' <= c <= 'ͯ').lower()
    s = re.sub("[’`´]", "'", s).replace('-', ' ')
    return re.sub(r'\s+', ' ', s).strip()

def cut(t):
    t = re.sub(r'\s+', ' ', str(t or '')).strip()
    if len(t) <= MAX: return t
    end = t.rfind('. ', 0, MAX)
    return t[:end + 1] if end > 40 else t[:MAX - 1].rstrip() + '…'

rows = json.load(open(SRC, encoding='utf8'))
voies = {}
for r in rows if isinstance(rows, list) else []:
    k, o = key(r.get('typo_min')), cut(r.get('orig'))
    if k and o and k not in voies: voies[k] = o
if len(voies) < 500:
    sys.exit(f'Voies : seulement {len(voies)} origines lisibles, rien écrit (source changée ?)')
json.dump({'source': SOURCE, 'updated': TODAY, 'voies': dict(sorted(voies.items()))}, open('data/voies.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f"{len(voies)} voies avec l'origine de leur nom écrites dans data/voies.json")
