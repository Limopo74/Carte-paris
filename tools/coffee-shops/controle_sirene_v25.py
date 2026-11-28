"""Contrôle prudent des établissements, Python 3, sans dépendance externe."""
import argparse, collections, csv, datetime, json, pathlib, re, time, unicodedata, urllib.parse, urllib.request, urllib.error
ROOT=pathlib.Path(__file__).resolve().parent
API='https://recherche-entreprises.api.gouv.fr/search'
def norm(s):
    return ' '.join(re.findall(r'[a-z0-9]+',unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()))
def address(s):
    return re.sub(r'\s+750\d\d(?:\s+paris.*)?$','',norm(s)).strip()
def names(e,u):
    vals=[u.get('nom_complet'),u.get('nom_raison_sociale'),e.get('nom_commercial'),e.get('enseigne')]
    for k in ('liste_enseignes','enseignes'):
        if isinstance(e.get(k),list): vals.extend(x for x in e[k] if isinstance(x,str))
    return {norm(x) for x in vals if x}
def match(row, payloads):
    candidates={}
    for payload in payloads:
        for u in payload.get('results',[]):
            for e in [u.get('siege') or {},*(u.get('matching_etablissements') or [])]:
                s=str(e.get('siret') or '')
                if not re.fullmatch(r'\d{14}',s) or str(e.get('code_postal'))!=str(row['code_postal']): continue
                a=address(e.get('adresse')); b=address(row['adresse'])
                if not a or a!=b: continue
                n=norm(row['nom']); exact=n in names(e,u) and len(n)>2
                candidates[s]={'siret':s,'siren':s[:9],'ape':e.get('activite_principale'),'etat':e.get('etat_administratif'),'adresse':e.get('adresse'),'nom_exact':exact,'date_source':e.get('date_mise_a_jour')}
    exact=[x for x in candidates.values() if x['nom_exact']]
    if len(exact)==1 and exact[0]['etat'] in ('A','F'): return 'correspondance_exacte',exact[0],list(candidates.values())
    return ('ambigu' if candidates else 'non_trouve_dans_api'),None,list(candidates.values())
def save(p,obj):
    t=p.with_suffix(p.suffix+'.tmp'); t.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8'); t.replace(p)
def fetch(q,cp):
    url=API+'?'+urllib.parse.urlencode({'q':q,'code_postal':cp,'per_page':25,'limite_matching_etablissements':100,'minimal':'true','include':'siege,matching_etablissements'})
    for attempt in range(3):
        time.sleep(0.5)
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Ma-carte-de-Paris/1.0 verification-adresses','Accept':'application/json'}),timeout=15) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429,500,502,503,504): raise
            try: delay=int(e.headers.get('Retry-After','5'))
            except ValueError: delay=5
            time.sleep(max(delay,2))
    raise RuntimeError('API indisponible')
def run(limit):
    rows=json.loads((ROOT/'coffee_shops_paris.json').read_text()); day=datetime.date.today().isoformat(); out=ROOT/('controle_sirene_'+day+'.json'); journal=json.loads(out.read_text()) if out.exists() else {}; done=0
    for row in rows:
        if row['id'] in journal and journal[row['id']]['resultat']!='erreur_reseau': continue
        if limit and done>=limit: break
        try:
            queries=[row['nom']+' '+row['adresse'],row['adresse']]
            if row.get('siret'): queries.insert(0,row['siret'])
            payloads=[fetch(q,row['code_postal']) for q in dict.fromkeys(queries)]
            result,selected,candidates=match(row,payloads)
            # La recherche n'est pas exhaustive : le résultat est un candidat à valider, même si unique.
            journal[row['id']]={'resultat':result,'candidat':selected,'candidats':candidates,'date':day,'source':API}
        except (OSError,ValueError,RuntimeError) as e:
            journal[row['id']]={'resultat':'erreur_reseau','date':day,'detail':str(e)};save(out,journal);print('Interruption réseau, reprise possible :',e);break
        save(out,journal);done+=1
    print(collections.Counter(x['resultat'] for x in journal.values()))
    with (ROOT/'candidats_sirene_a_valider.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f,delimiter=';');w.writerow(['id','nom','adresse','resultat','siret_candidat','etat_candidat','ape_candidat','date','source'])
        for row in rows:
            x=journal.get(row['id'],{}); c=x.get('candidat') or {};w.writerow([row['id'],row['nom'],row['adresse'],x.get('resultat','non_verifie'),c.get('siret',''),c.get('etat',''),c.get('ape',''),x.get('date',''),x.get('source','')])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=0);run(p.parse_args().limit)
