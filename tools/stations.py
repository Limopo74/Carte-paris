"""Télécharge les stations de métro et de RER de Paris et les écrit dans data/stations.json.

Source principale : Île-de-France Mobilités (emplacement des gares IDF, licence ODbL).
Secours : OpenStreetMap via Overpass (licence ODbL).
Lancé par .github/workflows/stations.yml (les serveurs de GitHub ont accès à internet).
"""
import json, math, re, sys, urllib.request, urllib.parse

BBOX = (48.79, 2.20, 48.93, 2.48)  # Paris et la petite couronne proche
OUT = 'data/stations.json'

def get(url, data=None):
    req = urllib.request.Request(url, data=data, headers={'User-Agent': 'carte-paris/1.0 (github.com/Limopo74/carte-paris)'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)

def inside(lat, lng):
    return BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lng <= BBOX[3]

def from_idfm():
    urls = [
        'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/emplacement-des-gares-idf/exports/geojson',
        'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/download/?format=geojson',
    ]
    last = None
    for u in urls:
        try:
            gj = get(u)
            break
        except Exception as e:  # noqa
            last = e
    else:
        raise RuntimeError(f'IDFM indisponible : {last}')
    rows = []
    for f in gj.get('features', []):
        p = f.get('properties') or {}
        c = (f.get('geometry') or {}).get('coordinates')
        if not c:
            continue
        lng, lat = float(c[0]), float(c[1])
        text = ' '.join(str(v) for v in p.values() if isinstance(v, str))
        mode = str(p.get('mode') or p.get('mode_') or '').upper()
        line = str(p.get('res_com') or p.get('indice_lig') or p.get('ligne') or '')
        name = p.get('nom_gares') or p.get('nom_zdc') or p.get('nom') or p.get('nom_long')
        if not name:
            continue
        if 'METRO' in mode or 'METRO' in line.upper():
            m = 'M'
        elif 'RER' in mode or 'RER' in line.upper():
            m = 'RER'
        else:
            continue
        num = re.sub(r'^(METRO|RER)\s*', '', line.upper()).strip() or str(p.get('indice_lig') or '')
        rows.append({'name': str(name).strip(), 'mode': m, 'line': num, 'lat': lat, 'lng': lng})
    if len(rows) < 200:
        raise RuntimeError(f'IDFM : trop peu de stations ({len(rows)}), champs = {list((gj.get("features") or [{}])[0].get("properties", {}).keys())}')
    return rows, '© Île-de-France Mobilités (ODbL)'

def from_osm():
    s, w, n, e = BBOX
    q = f'[out:json][timeout:90];(node["railway"="station"]["station"="subway"]({s},{w},{n},{e});node["railway"="station"]["network"~"RER"]({s},{w},{n},{e}););out;'
    gj = get('https://overpass-api.de/api/interpreter', urllib.parse.urlencode({'data': q}).encode())
    rows = []
    for el in gj.get('elements', []):
        t = el.get('tags', {})
        name = t.get('name')
        if not name:
            continue
        m = 'M' if t.get('station') == 'subway' else 'RER'
        lines = re.split(r'[;,]\s*', t.get('line') or t.get('route_ref') or '')
        for l in lines or ['']:
            rows.append({'name': name, 'mode': m, 'line': l.strip(), 'lat': el['lat'], 'lng': el['lon']})
    if len(rows) < 200:
        raise RuntimeError(f'OSM : trop peu de stations ({len(rows)})')
    return rows, '© les contributeurs d\'OpenStreetMap (ODbL)'

def dist(a, b):
    k = math.pi / 180
    x = (b['lng'] - a['lng']) * k * math.cos((a['lat'] + b['lat']) / 2 * k)
    y = (b['lat'] - a['lat']) * k
    return 6371000 * math.hypot(x, y)

def merge(rows):
    """Une entrée par station (même nom, même mode, à moins de 400 m), avec toutes ses lignes."""
    out = []
    for r in rows:
        if not inside(r['lat'], r['lng']):
            continue
        for s in out:
            if s['n'] == r['name'] and s['m'] == r['mode'] and dist({'lat': s['lat'], 'lng': s['lng']}, r) < 400:
                if r['line'] and r['line'] not in s['l']:
                    s['l'].append(r['line'])
                break
        else:
            out.append({'n': r['name'], 'm': r['mode'], 'l': [r['line']] if r['line'] else [], 'lat': r['lat'], 'lng': r['lng']})
    def key(v):
        return (0, int(re.match(r'\d+', v).group()), v) if re.match(r'\d+', v) else (1, 0, v)
    for s in out:
        s['l'].sort(key=key)
        s['lat'] = round(s['lat'], 5)
        s['lng'] = round(s['lng'], 5)
    out.sort(key=lambda s: (s['m'], s['n']))
    return out

def main():
    errors = []
    for fn in (from_idfm, from_osm):
        try:
            rows, source = fn()
            stations = merge(rows)
            with open(OUT, 'w', encoding='utf-8') as f:
                json.dump({'source': source, 'stations': stations}, f, ensure_ascii=False, separators=(',', ':'))
            print(f'{len(stations)} stations écrites depuis {source}')
            return
        except Exception as e:  # noqa
            errors.append(f'{fn.__name__}: {e}')
            print(errors[-1], file=sys.stderr)
    with open('data/stations-erreur.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(errors) + '\n')
    sys.exit(1)

if __name__ == '__main__':
    main()
