"""Repère des cafés à examiner, sans ajout automatique et sans données de l'application."""
import argparse
import json
from pathlib import Path
import urllib.parse
import urllib.request
from controle_sirene import norm, save

APIS = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
QUERY = '''[out:json][timeout:50];
area["boundary"="administrative"]["ref:INSEE"="75056"]->.paris;
nwr["amenity"="cafe"]["name"](area.paris);
out center tags;'''

def proposals(rows, osm):
    seen = {(norm(r['nom']), str(r['code_postal'])) for r in rows}
    names = {}
    for row in rows: names.setdefault(norm(row['nom']), []).append(row)
    result = {}
    for element in osm['elements']:
        tags = element.get('tags',{})
        name, postal = tags.get('name'),tags.get('addr:postcode')
        if not name or (norm(name),str(postal)) in seen: continue
        point = element.get('center') or element
        lat, lon = point.get('lat'), point.get('lon')
        if not lat or not lon: continue
        if any(abs(lat - r['latitude']) < .0003 and abs(lon - r['longitude']) < .00045
               for r in names.get(norm(name),[])): continue
        item = f"{element['type']}/{element['id']}"
        result[item] = dict(id_osm=item,nom=name,code_postal=postal,latitude=lat,longitude=lon,
            adresse=' '.join(tags.get(k,'') for k in ('addr:housenumber','addr:street')).strip(),
            source='https://www.openstreetmap.org/'+item, licence='ODbL',
            statut='candidat_a_verifier')
    return list(result.values())

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    rows=json.loads((args.root/'coffee_shops_paris.json').read_text())
    errors = {}
    result = dict(candidats=[], erreurs=errors)
    for api in APIS:
        request = urllib.request.Request(api+'?'+urllib.parse.urlencode({'data':QUERY}),
            headers={'User-Agent':'Ma-carte-de-Paris/26 referentiel prive'})
        try:
            with urllib.request.urlopen(request,timeout=24) as response:
                result.update(source=api,candidats=proposals(rows,json.load(response)))
            break
        except (OSError, ValueError, KeyError) as error:
            errors[api] = str(error)
    save(args.output,result)
    print(len(result['candidats']), 'candidats OpenStreetMap',result.get('erreurs',''))
