#!/usr/bin/env python3
"""Fabrique data/architectes.json : l'auteur et la date des monuments protégés de Paris, pour Monuments (v198).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-architectes.py dossier_des_pages AAAA-MM-JJ

Entrée : les pages JSON de l'API tabulaire de data.gouv.fr pour le jeu « Immeubles protégés au titre des Monuments
historiques » (ministère de la Culture, Licence Ouverte 2.0), filtrées sur Paris et sur un auteur connu, colonnes
Reference, Titre_editorial_de_la_notice, Auteur_de_l_edifice, Datation_de_l_edifice, coordonnees_au_format_WGS84.
Les noms écrits en capitales sont remis en minuscules (« ANTOINE Jacques-Denis » → « Antoine Jacques-Denis ») ; rien
d'autre n'est changé dans l'ordre ni l'orthographe. Si la source a changé (moins de 300 monuments), rien n'est écrit.
"""
import glob, json, os, re, sys

SRC, TODAY = sys.argv[1], sys.argv[2]
SOURCE = '« Immeubles protégés au titre des Monuments historiques » (ministère de la Culture, Licence Ouverte 2.0)'
S, N, W, E = 48.80, 48.91, 2.22, 2.48

def word(w):
    """Un mot tout en capitales prend une capitale initiale (et après un tiret ou une apostrophe) ; « M.L. » reste tel quel."""
    if not re.fullmatch(r"[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý'’-]+", w): return w
    return re.sub(r"(^|[-'’])([a-zà-öø-ý])", lambda m: m.group(1) + m.group(2).upper(), w.lower())

def author(a):
    a = re.sub(r'\s+', ' ', a).strip()
    a = a.replace("maître de l'oeuvre", "maître d'œuvre").replace('maître de l’oeuvre', 'maître d’œuvre')
    m = re.match(r'^(.*?)(\s*\(.*\))?$', a)
    return ' '.join(word(w) for w in m.group(1).split(' ')) + (m.group(2) or '')

items = {}
for f in sorted(glob.glob(os.path.join(SRC, '*.json'))):
    for r in json.load(open(f, encoding='utf8')).get('data', []):
        ref = str(r.get('Reference') or '')
        if not re.fullmatch(r'PA\d{8}', ref) or ref in items: continue
        a = [author(x) for x in str(r.get('Auteur_de_l_edifice') or '').split(';') if x.strip()]
        if not a: continue
        it = {'r': ref, 't': re.sub(r'\s+', ' ', str(r.get('Titre_editorial_de_la_notice') or '')).strip()[:120], 'a': a[:6]}
        d = re.sub(r'\s*;\s*', ', ', str(r.get('Datation_de_l_edifice') or '')).strip()
        if d: it['d'] = d[:30]
        try:
            lat, lng = (float(v) for v in str(r.get('coordonnees_au_format_WGS84') or '').split(','))
            if S <= lat <= N and W <= lng <= E: it['lat'], it['lng'] = round(lat, 5), round(lng, 5)
        except ValueError:
            pass
        items[ref] = it
if len(items) < 300:
    sys.exit(f'Auteurs des monuments : seulement {len(items)} lisibles, rien écrit (source changée ?)')
json.dump({'source': SOURCE, 'updated': TODAY, 'items': [items[k] for k in sorted(items)]}, open('data/architectes.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'{len(items)} monuments de Paris avec leur auteur écrits dans data/architectes.json ({sum("lat" in i for i in items.values())} avec une position)')
