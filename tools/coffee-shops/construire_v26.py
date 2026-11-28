"""Fusion contrôlée des preuves V26 et génération des exports de la V25 enrichie."""
import argparse
from collections import Counter
from copy import deepcopy
import json
from pathlib import Path
import re
from controle_sirene import API, address, valid_siret, save
import gestion_base as base

HELD = {'ferme','ferme_definitivement','fermeture_definitive','ferme_temporairement'}

def read(path, default=None):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default

def merge(rows, checks, geo, commercial, reviews=None, osm=None, date=None):
    result = deepcopy(rows)
    reviews = reviews or {}
    osm_entries = {}
    for item in (osm or {}).get('indices_commerciaux', []):
        osm_entries.setdefault(item['id'], []).append(item)
    for row in result:
        key = row['id']
        check = checks.get(key)
        review = reviews.get(key)
        if key in osm_entries:
            row['indices_osm_v26'] = osm_entries[key]
        if review and review.get('sirene') and date == review.get('date'):
            manual = review['sirene']
            others = (check or {}).get('candidats', [])
            check = {**(check or {}), 'resultat':'actif_administrativement',
                     'methode':'annuaire_enseigne_adresse', 'justification':review['note'],
                     'date':review['date'], 'source':review['source'], 'candidat':manual,
                     'confiance':'forte', 'candidats':[manual,*[x for x in others if x['siret'] != manual['siret']]]}
        if check and check.get('methode') in ('nom_et_adresse_etablissement','annuaire_enseigne_adresse'):
            winner = check['candidat']
            status = check['resultat']
            if winner and row.get('siret') and row['siret'] != winner['siret']:
                winner = None
                status = 'correspondance_ambigue'
                check = dict(check, justification='Le SIRET concordant diffère du SIRET historique ; succession à documenter.')
            if winner:
                row.update(siret=winner['siret'], siren=winner['siren'],
                            denomination_sirene=winner['denomination'], ape_etablissement=winner['activite_principale'],
                            etat_sirene=winner['etat_administratif'], source_sirene=winner['lien'],
                            date_consultation_sirene=check['date'], date_source_sirene=winner['date_mise_a_jour_insee'],
                            adresse_sirene=winner['adresse'], creation_etablissement=winner['date_creation'],
                            fermeture_etablissement=winner['date_fermeture'], enseignes_sirene=winner['liste_enseignes'],
                            nom_commercial_sirene=winner['nom_commercial'])
            row['controle_sirene_v26'] = {**check, 'resultat':status, 'candidat':winner,
                                         'confiance':check['confiance'] if winner else None}
        else:
            row.setdefault('controle_sirene_v26', {'resultat':'non_verifie'})
        if key in geo:
            g = geo[key]
            row['controle_geographique_v26'] = g
            code = g['quartier_officiel']
            if g.get('iris_officiel') and re.fullmatch(r'75\d{7}',g['iris_officiel']):
                row.setdefault('iris_v25',row['iris'])
                row['iris'] = g['iris_officiel']
                if row['iris'] != row['iris_v25']:
                    row['nom_iris'] = None
                    row['iris_source'] = 'IGN / INSEE, Contours IRIS via Géoplateforme, 2026-11-28'

            if code:
                row.update(quartier_officiel=code, nom_quartier_officiel=g['nom_quartier_officiel'],
                           arrondissement_spatial=int(code[3:5]))
            if code and g['coordonnees_ban_a_20m'] and (g['adresse_postale_exacte']
                    or (commercial.get(key,{}).get('adresse_visible') and commercial[key].get('adresse_concordante'))
                    or bool(review and review.get('position_recoupee'))):
                if row.get('geocodage_a_confirmer') or row.get('territoire_a_confirmer'):
                    row.update(geocodage_a_confirmer=False, territoire_a_confirmer=False,
                               geocodage_confiance='forte_adresse', geocodage_precision='Adresse recoupée avec la BAN ; entrée non mesurée',
                               ban_id=g['ban_id'])
        if key in commercial:
            row['controle_commercial_v26'] = commercial[key]
        if review:
            row['revue_manuelle_v26'] = review
            if review.get('doublon_de'):
                row['doublon_de'] = review['doublon_de']
            if review.get('statut_commercial'):
                row['activite_commerciale_effective'] = review['statut_commercial']
                row['date_verification'] = review['date']
            proof = row.setdefault('preuves_champs',{})
            for field in ('site','horaires'):
                if review.get(field):
                    row[field] = review[field]
                    proof[field] = dict(valeur=review[field],url=review['source'],
                                        type_source='officiel',date_consultation=review['date'])
            if review.get('prestations'):
                row.setdefault('prestations_verifiees',{}).update(review['prestations'])
                proof['prestations_verifiees'] = dict(valeur=review['prestations'],url=review['source'],
                                        type_source='officiel',date_consultation=review['date'])
    return result

def allowed(row):
    return (not row.get('doublon_de') and not row.get('geocodage_a_confirmer') and not row.get('territoire_a_confirmer')
            and row.get('geocodage_confiance') == 'forte_adresse'
            and row.get('activite_commerciale_effective') not in HELD
            and bool(row.get('quartier_officiel')))

def check_points(rows):
    ids = [r['id'] for r in rows]
    assert len(set(ids)) == len(ids)
    for r in rows:
        if r.get('doublon_de'): assert r['doublon_de'] in ids and r['doublon_de'] != r['id']
        assert re.fullmatch(r'pd-[a-f0-9]{16}',r['id'])
        assert base.validpoint(r) and re.fullmatch(r'75\d{7}',str(r.get('iris')))
        winner = r['controle_sirene_v26'].get('candidat')
        if winner: assert valid_siret(winner['siret']) and winner['siret'].startswith(winner['siren'])

def layer(rows, date):
    places = []
    for r in rows:
        if not allowed(r): continue
        evidence = r.get('preuves_champs',{})
        hours = evidence.get('horaires',{})
        site = evidence.get('site',{})
        p = dict(id=r['id'],name=r['nom'],address=r['adresse'],arr=r['arrondissement_spatial'],
                 quarterId=r['quartier_officiel'],quarter=r['nom_quartier_officiel'],
                 lat=r['latitude'],lng=r['longitude'])
        if r.get('activite_commerciale_effective') == 'ouvert_verifie':
            p['openingVerified'] = True
        if r.get('horaires') and hours.get('valeur') == r['horaires'] and hours.get('type_source') == 'officiel' and hours.get('url'):
            p.update(hours=r['horaires'],hoursSource=hours['url'])
        if r.get('site') and site.get('type_source') == 'officiel' and site.get('url'):
            p['url'] = r['site']
        places.append(p)
    return dict(version=26, date=date, places=places)

def feature(r):
    return dict(type='Feature',id=r['id'],geometry={'type':'Point','coordinates':[r['longitude'],r['latitude']]},properties=r)

def regenerate(root, output, date):
    rows = read(root/'coffee_shops_paris.json')
    checks = read(root/f'controle_sirene_{date}.json',{})
    geo = read(root/'controle_geographique.json',{})
    commercial = read(root/'controle_commercial.json',{})
    reviews = read(root/'revue_manuelle.json',{})
    osm = read(root/'controle_osm_paris.json',{})
    upgraded = merge(rows,checks,geo,commercial,reviews,osm,date)
    check_points(upgraded)
    output.mkdir(parents=True,exist_ok=True)
    base.P = output
    for name, subset in [('coffee_shops_paris',upgraded),('coffee_shops_points',upgraded),
                         ('coffee_shops_points_prudents',[r for r in upgraded if allowed(r)]),
                         ('coffee_shops_points_a_confirmer',[r for r in upgraded if r.get('territoire_a_confirmer') or r.get('geocodage_a_confirmer')])]:
        base.save(name+'.geojson',dict(type='FeatureCollection',features=[feature(r) for r in subset]))
    fields = list(dict.fromkeys(k for r in upgraded for k in r))
    base.save('coffee_shops_paris.json',upgraded)
    base.csvsave('coffee_shops_paris.csv',[dict(r,sources_urls=' ; '.join(r.get('sources_urls',[]))) for r in upgraded],fields)
    for col,name in [('arrondissement','arrondissements'),('iris','iris')]:
        groups = Counter(r[col] for r in upgraded if r.get(col))
        rows_stats = [{col:key,'total':n,**({'localises':n} if col=='arrondissement' else {})} for key,n in sorted(groups.items())]
        base.csvsave('statistiques_'+name+'.csv',rows_stats,list(rows_stats[0]))
    quartiers = {}
    for row in upgraded:
        code = row.get('quartier_officiel')
        if not code: continue
        q = quartiers.setdefault(code, dict(code_quartier=code[-2:],quartier=row['nom_quartier_officiel'],
            arrondissement=row['arrondissement_spatial'],total=0,a_confirmer=0,code_quartier_insee=code))
        q['total'] += 1
        q['a_confirmer'] += bool(row.get('territoire_a_confirmer') or row.get('geocodage_a_confirmer'))
    if quartiers:
        base.csvsave('statistiques_quartiers.csv',sorted(quartiers.values(),key=lambda q:q['code_quartier_insee']),
                     list(next(iter(quartiers.values()))))
    queue, remaining = [], []
    for r in upgraded:
        check = r['controle_sirene_v26']
        chosen = check.get('candidat') or {}
        queue.append(dict(id=r['id'],nom=r['nom'],adresse=r['adresse'],resultat=check['resultat'],
                          siret_candidat=chosen.get('siret'),etat_candidat=chosen.get('etat_administratif'),
                          ape_candidat=chosen.get('activite_principale'),date=check.get('date'),
                          source=check.get('source'),justification=check.get('justification'),
                          siret_alternatifs=[c['siret'] for c in check.get('candidats',[])]))
        if not chosen: remaining.append(r)
    base.csvsave('candidats_sirene_a_valider.csv',queue,list(queue[0]))
    base.csvsave('sirene_a_verifier.csv',remaining,fields)
    counts = Counter(r['controle_sirene_v26']['resultat'] for r in upgraded)
    public = layer(upgraded,date)
    old = read(root/'rapport_qualite.json',{})
    quality = {**old,'version':'26','date':date,'total':len(upgraded),'localises':len(upgraded),
               'import_prudent':len(public['places']), 'alias_historiques':sum(bool(r.get('doublon_de')) for r in upgraded),
               'siret_distincts_verifies':len({r['controle_sirene_v26']['candidat']['siret'] for r in upgraded if r['controle_sirene_v26'].get('candidat')}),'import_a_confirmer':sum(bool(r.get('territoire_a_confirmer') or r.get('geocodage_a_confirmer')) for r in upgraded),
               'sirene_v26':dict(counts),'requetes_sirene':sum(len(x.get('recherches',[])) for x in checks.values()),
               'quartiers_officiels_representes':len({r.get('quartier_officiel') for r in upgraded if r.get('quartier_officiel')}),
               'quartiers_officiels_affectes':sum(bool(r.get('quartier_officiel')) for r in upgraded),
               'horaires_affichables':sum('hours' in p for p in public['places']),
               'sites_officiels_controles':len(commercial),
               'revues_manuelles':len(reviews),
               'ouvertures_commerciales_verifiees':sum(r.get('activite_commerciale_effective')=='ouvert_verifie' for r in upgraded),
               'indices_osm':len(osm.get('indices_commerciaux',[])),
               'candidats_osm':len(osm.get('candidats',[])),
               'iris_officiels_affectes':sum(bool(x.get('iris_officiel')) for x in geo.values()),
               'iris_officiels_divergents':sum(x.get('iris_officiel') is not None and not x.get('iris_concordant') for x in geo.values()),
               'recherches_sirene_tronquees':sum(x.get('reponses_tronquees',0) for x in checks.values()),'limites_v26':[
                   'Recherche API pour chaque fiche ; les listes de résultats peuvent être tronquées.',
                   'Un état SIRENE ne suffit pas à prouver une ouverture ou fermeture au public.',
                   'Droits de republication du corpus hérité à vérifier avant publication.']}
    base.save('rapport_qualite.json',quality)
    history = read(root/'coffee_shops_evolutions.json',{})
    history['v26'] = {'date':date,'edition':26,'sirene':dict(counts),'masques_geographiques':quality['import_a_confirmer'],
                      'identifiants_retires':[], 'preuves':f'controle_sirene_{date}.json'}
    base.save('coffee_shops_evolutions.json',history)
    save(output/'coffee-shops.json',public)
    print(json.dumps({'situations':dict(counts),'affichables':len(public['places']),
                      'quartiers_officiels':quality['quartiers_officiels_representes'],'horaires':quality['horaires_affichables']},ensure_ascii=False))

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent)
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--date',required=True)
    args=p.parse_args()
    regenerate(args.root,args.output,args.date)
