"""Contrôle par établissement physique. Relancer avec la même date pour reprendre."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import json
from pathlib import Path
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from controle_sirene_v25 import norm, save, API
from gestion_base import norm as voie

ROOT = Path(__file__).resolve().parent
gate = threading.Lock()
next_call = 0.0
cache_gate = threading.Lock()

def address(value):
    return re.sub(r'\s+75\d{3}(?:\s+paris(?:\s+\d+)?(?:e|eme)?)?$', '', voie(value)).strip()

def valid_siret(s):
    return bool(re.fullmatch(r'\d{14}', s)) and sum(
        sum(map(int, str(int(d) * (2 if i % 2 == 0 else 1)))) for i, d in enumerate(s)
    ) % 10 == 0

def clean(payload):
    fields = ['siret','code_postal','commune','adresse','activite_principale','etat_administratif',
              'date_creation','date_fermeture','date_mise_a_jour_insee','nom_commercial',
              'liste_enseignes','latitude','longitude']
    return {'total_pages': payload.get('total_pages', 0), 'results': [
        {'siren': u.get('siren'), 'denomination': u.get('nom_raison_sociale') or u.get('nom_complet'),
         'nom_complet': u.get('nom_complet'),
         'sites': [{k: e.get(k) for k in fields} for e in
                   [*(u.get('matching_etablissements') or []), u.get('siege') or {}] if e.get('siret')]}
        for u in payload['results']]}

def get(params, cache):
    global next_call
    url = API + '?' + urllib.parse.urlencode(params)
    import hashlib
    path = cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    with cache_gate:
        if path.exists(): return json.loads(path.read_text())
    for attempt in range(3):
        with gate:
            now = time.monotonic()
            delay = max(0, next_call - now)
            next_call = now + delay + .22
        time.sleep(delay)
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Ma-carte-de-Paris/26','Accept':'application/json'})
            with urllib.request.urlopen(req, timeout=12) as response:
                payload = clean(json.load(response))
            with cache_gate: save(path, payload)
            return payload
        except (OSError, ValueError, KeyError) as error:
            if attempt == 2 or isinstance(error, urllib.error.HTTPError) and error.code == 400: raise
            if isinstance(error, urllib.error.HTTPError) and error.code == 429:
                try: retry = min(60,max(2,int(error.headers.get('Retry-After','5'))))
                except ValueError: retry = 5
                with gate: next_call = max(next_call,time.monotonic()+retry)
            else: time.sleep(attempt + 1)

def evidence(row, payloads):
    candidates = {}
    cp = str(row.get('code_postal'))
    cp_ban = str(row.get('ban_code_postal') or cp)
    addresses = {(cp,address(row['adresse']))}
    if row.get('ban_adresse'):
        addresses.add((cp_ban,address(row['ban_adresse'])))
    for payload in payloads:
        for unit in payload['results']:
            for e in unit['sites']:
                s = e['siret']
                if not valid_siret(s) or s[:9] != unit['siren']: continue
                if (e['code_postal'],address(e['adresse'])) not in addresses: continue
                names = [unit['denomination'],unit['nom_complet'],e['nom_commercial'],*(e['liste_enseignes'] or [])]
                exact = len(norm(row['nom'])) > 2 and norm(row['nom']) in {norm(n) for n in names}
                exact = exact or s == row.get('siret_documente')
                runner = dict(e,siren=unit['siren'],denomination=unit['denomination'],
                              nom_exact=exact,lien='https://annuaire-entreprises.data.gouv.fr/etablissement/'+s)
                previous = candidates.get(s)
                if previous:
                    runner = {**previous, **{k:v for k,v in runner.items() if v is not None}}
                    runner['nom_exact'] = exact or previous['nom_exact']
                candidates[s] = runner
    exact = [e for e in candidates.values() if e['nom_exact']]
    if len(exact) == 1 and exact[0]['etat_administratif'] in ('A','F'):
        winner = exact[0]
        return ('actif_administrativement' if winner['etat_administratif']=='A' else 'ferme_administrativement'), winner, list(candidates.values()), 'Nom et numéro de voie concordants, SIRET et code postal validés'
    return ('correspondance_ambigue' if candidates else 'aucune_correspondance_trouvee'), None, list(candidates.values()), ('Plusieurs SIRET concordants ou identité commerciale insuffisamment établie' if candidates else 'Aucune concordance parmi les résultats retournés par l’API')

def check(row, cache, day):
    queries = [(row['nom'], str(row['code_postal'])), (row['adresse'],str(row['code_postal']))]
    if row.get('ban_adresse') and (address(row['ban_adresse']),row.get('ban_code_postal')) != (address(row['adresse']),row['code_postal']):
        queries.append((row['ban_adresse'],str(row.get('ban_code_postal') or row['code_postal'])))
    prior = row.get('siret_documente') or row.get('siret')
    if prior: queries.insert(0,(prior,''))
    payloads, errors = [], []
    for q, cp in dict.fromkeys(queries):
        if not q: continue
        try:
            params = dict(q=q,per_page=25,limite_matching_etablissements=100)
            if cp: params['code_postal'] = cp
            payloads.append(get(params,cache))
        except (OSError, ValueError, KeyError) as error: errors.append(type(error).__name__ + ': ' + str(error))
    status, selected, candidates, note = evidence(row,payloads)
    if errors:
        status = 'verification_impossible'
        selected = None
        note = 'Au moins une recherche officielle a échoué'
    return dict(resultat=status,candidat=selected,candidats=candidates,date=day,source=API,
                methode='nom_et_adresse_etablissement',confiance='forte' if selected else None,
                justification=note,recherches=queries,erreurs=errors,
                reponses_tronquees=sum(p['total_pages']>1 for p in payloads))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=ROOT)
    p.add_argument('--date',default=dt.date.today().isoformat(),type=lambda d:dt.date.fromisoformat(d).isoformat())
    p.add_argument('--limit',type=int,default=0)
    args=p.parse_args()
    cache=args.root/'.cache-sirene'/args.date
    cache.mkdir(parents=True,exist_ok=True)
    path=args.root/f'controle_sirene_{args.date}.json'
    rows=json.loads((args.root/'coffee_shops_paris.json').read_text())
    review_path = args.root/'revue_manuelle.json'
    reviews = json.loads(review_path.read_text()) if review_path.exists() else {}
    for row in rows:
        manual = reviews.get(row['id'],{}).get('sirene')
        if manual: row['siret_documente'] = manual['siret']
    journal=json.loads(path.read_text()) if path.exists() else {}
    pending=[r for r in rows if journal.get(r['id'],{}).get('methode')!='nom_et_adresse_etablissement' or journal[r['id']]['resultat']=='verification_impossible']
    if args.limit: pending=pending[:args.limit]
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i,(row,result) in enumerate(zip(pending,pool.map(lambda row:check(row,cache,args.date),pending)),1):
            journal[row['id']]=result
            save(path,journal)
            if i%20==0 or i==len(pending): print(f'{i}/{len(pending)}',flush=True)

if __name__=='__main__': main()
