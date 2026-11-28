"""Confronte la V25 à la BAN, aux quartiers de Paris et aux pages officielles connues."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import csv
import gzip
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import urllib.request
from affecter_territoires import load_layer, locate
from controle_sirene import address, norm, save

QUARTIERS = 'https://opendata.paris.fr/explore/dataset/quartier_paris/'
BAN = 'https://adresse.data.gouv.fr/'

class PageText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ('script','style'): self.hidden = max(0,self.hidden-1)

    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)

def official_pages(rows, date):
    grouped = {}
    for row in rows:
        proof = row.get('preuves_champs',{}).get('site',{})
        url = proof.get('url')
        if proof.get('type_source') == 'officiel' and isinstance(url,str) and url.startswith('https://'):
            grouped.setdefault(url,[]).append(row)
    def inspect(item):
        url, related = item
        result = {}
        try:
            request = urllib.request.Request(url,headers={'User-Agent':'Ma-carte-de-Paris/26 verification documentaire'})
            with urllib.request.urlopen(request,timeout=10) as response:
                parser = PageText()
                parser.feed(response.read(3_000_000).decode(response.headers.get_content_charset() or 'utf-8', errors='replace'))
                text = norm(' '.join(parser.parts))
                final_url = response.geturl()
            for row in related:
                target = row.get('adresse_documentee') or row['adresse']
                same = address(target) == address(row['adresse'])
                result[row['id']] = {'source':url,'url_finale':final_url,'date':date,
                    'adresse_visible': bool(re.search(r'\b'+re.escape(norm(target))+r'\b',text)),
                    'adresse_concordante':bool(same)}
        except (OSError, ValueError) as error:
            for row in related: result[row['id']] = {'source':url,'date':date,'erreur':str(error)}
        return result
    with ThreadPoolExecutor(max_workers=6) as pool:
        return {k:v for result in pool.map(inspect,grouped.items()) for k,v in result.items()}

def verify(rows, banpath, district_path, iris_path=None):
    districts = load_layer(district_path,'c_quinsee')
    iris = load_layer(iris_path,'code_iris') if iris_path else None
    names = {str(x['properties']['c_quinsee']):x['properties']['l_qu']
             for x in json.loads(district_path.read_text())['features']}
    needed = {address(r['adresse']) for r in rows}
    ids = {r.get('ban_id') for r in rows}
    matches, by_id = {}, {}
    with gzip.open(banpath,'rt',encoding='utf-8-sig',newline='') as f:
        for row in csv.DictReader(f,delimiter=';'):
            key = address(' '.join(filter(None,(row['numero'],row['rep'],row['nom_voie']))))
            if key in needed:
                matches.setdefault((key,row['code_postal']),[]).append(row)
            if row['id'] in ids: by_id[row['id']] = row
    report = {}
    for row in rows:
        key = (address(row['adresse']),row['code_postal'])
        candidates = matches.get(key,[])
        existing = by_id.get(row.get('ban_id'))
        choices = {(x['lat'],x['lon']):x for x in candidates}
        exact = next(iter(choices.values())) if len(choices) == 1 else None
        lat,lon = row['latitude'],row['longitude']
        district = locate(lon,lat,districts)
        location = district[0] if isinstance(district,tuple) and district[1]=='attribue' else None
        proof = exact or existing
        close = False
        if proof:
            close = math.hypot((float(proof['lat'])-lat)*111200,(float(proof['lon'])-lon)*73000) <= 20
        report[row['id']] = {'ban_id':proof['id'] if proof else None,'adresse_postale_exacte':bool(exact),
            'coordonnees_ban_a_20m':close,'quartier_officiel':location,'nom_quartier_officiel':names.get(location),
            'statut_spatial':district[1] if isinstance(district,tuple) else None}
        if iris:
            found, status = locate(lon, lat, iris)
            report[row['id']].update(iris_officiel=found, statut_iris=status,
                iris_concordant=found == row.get('iris'))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('ban',type=Path)
    p.add_argument('quartiers',type=Path)
    p.add_argument('--date',required=True)
    p.add_argument('--iris',type=Path)
    p.add_argument('--sans-sites',action='store_true')
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parent)
    args=p.parse_args()
    rows=json.loads((args.root/'coffee_shops_paris.json').read_text())
    save(args.root/'controle_geographique.json',verify(rows,args.ban,args.quartiers,args.iris))
    if not args.sans_sites: save(args.root/'controle_commercial.json',official_pages(rows,args.date))
