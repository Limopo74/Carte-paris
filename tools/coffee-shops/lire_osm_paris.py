"""Repli hors API. Lit un extrait OSM PBF de Paris avec GDAL et contrôle ses points."""
import argparse
from collections import Counter
import json
from pathlib import Path
import subprocess
import tempfile
from affecter_territoires import load_layer, locate
from controle_sirene import norm, save
from decouvrir_osm import proposals

SOURCE = 'https://download.openstreetmap.fr/extracts/europe/france/ile_de_france/paris.osm.pbf'
POINTS = """SELECT osm_id, name, other_tags, geometry FROM points WHERE name IS NOT NULL
AND (other_tags LIKE '%"amenity"=>"cafe"%' OR other_tags LIKE '%"shop"=>"coffee"%'
OR other_tags LIKE '%"disused:amenity"=>"cafe"%' OR other_tags LIKE '%"was:amenity"=>"cafe"%')"""
AREAS = """SELECT osm_id, osm_way_id, name, other_tags, ST_PointOnSurface(geometry) AS geometry FROM multipolygons
WHERE name IS NOT NULL AND (amenity='cafe' OR shop='coffee' OR other_tags LIKE '%"disused:amenity"=>"cafe"%'
OR other_tags LIKE '%"was:amenity"=>"cafe"%')"""

def osm_tags(raw):
    import re
    return dict(re.findall(r'"([^"\\]+)"=>"([^"\\]+)"', raw or ''))

def read_pbf(pbf, districts):
    elements = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, sql in enumerate([POINTS, AREAS]):
            out = Path(tmp)/f'cafe-{i}.json'
            subprocess.run(['ogr2ogr','-f','GeoJSON',str(out),str(pbf),'-dialect','SQLite','-sql',sql],check=True)
            for feature in json.loads(out.read_text())['features']:
                point = feature.get('geometry') or {}
                if point.get('type') != 'Point': continue
                lon,lat = point['coordinates'][:2]
                code, status = locate(lon,lat,districts)
                if status != 'attribue': continue
                p = feature['properties']
                tags = osm_tags(p.get('other_tags'))
                tags['name'] = p['name']
                typ = 'node' if i==0 else 'way' if p.get('osm_way_id') else 'relation'
                ident = p.get('osm_way_id') or p.get('osm_id')
                if ident: elements.append(dict(id=ident,type=typ,lat=lat,lon=lon,tags=tags))
    return elements

def discovery(rows, elements):
    entries = [e for e in elements if not {'was:amenity','disused:amenity'} & e['tags'].keys()]
    recent = proposals(rows,{'elements':entries})
    groups = {}
    for e in elements: groups.setdefault(norm(e['tags']['name']),[]).append(e)
    reviews = []
    for r in rows:
        for e in groups.get(norm(r['nom']),[]):
            if abs(e['lat']-r['latitude']) > .00027 or abs(e['lon']-r['longitude']) > .0004: continue
            tags = e['tags']
            reviews.append(dict(id=r['id'],osm=f"{e['type']}/{e['id']}",
                source=f"https://www.openstreetmap.org/{e['type']}/{e['id']}",
                ancien_cafe=bool({'was:amenity','disused:amenity'} & tags.keys()),
                horaires_osm=tags.get('opening_hours'),
                prestations_osm={k:tags[k] for k in ('outdoor_seating','wheelchair','takeaway','internet_access') if k in tags},
                preuve='Nom exact et proximité, revue nécessaire'))
    return dict(source=SOURCE,licence='ODbL — © les contributeurs OpenStreetMap',
                points_lus=len(elements),candidats=recent,indices_commerciaux=reviews)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('pbf',type=Path)
    p.add_argument('quartiers',type=Path)
    p.add_argument('--root',type=Path,required=True)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    rows=json.loads((args.root/'coffee_shops_paris.json').read_text())
    result=discovery(rows,read_pbf(args.pbf,load_layer(args.quartiers,'c_quinsee')))
    save(args.output,result)
    print(Counter({'candidats':len(result['candidats']),'rapprochements':len(result['indices_commerciaux']),
        'fermetures_a_revoir':sum(r['ancien_cafe'] for r in result['indices_commerciaux'])}))
