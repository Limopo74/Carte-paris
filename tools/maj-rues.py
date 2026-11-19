#!/usr/bin/env python3
"""Fabrique le plan des rues à pied de Paris pour « Mes parcours » (mesure du 19 nov. 2026, pas encore dans l'appli).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-rues.py demande               -> écrit la demande Overpass (texte) sur la sortie
  python3 -I tools/maj-rues.py REPONSE.json SORTIE.json AAAA-MM-JJ

Entrée : la réponse JSON d'Overpass (OpenStreetMap, licence ODbL) à la demande ci-dessous : les voies où l'on marche
dans Paris (avec leurs nœuds), et les parcs et jardins (pour les éviter : choix 1A du 19 nov.).

Sortie (compacte, un seul fichier) :
  { source, updated, names: [noms des rues],
    nodes: [lat0, lng0, dlat1, dlng1, …]   (entiers en 1e-5 degré, chaque point relatif au précédent),
    edges: [a, b, m, f, k, n, …]            (6 entiers par tronçon : nœud a, nœud b, longueur en m, drapeaux,
                                              numéro du nom + 1 (0 = sans nom), nombre de points de forme),
    shape: [dlat, dlng, …]                  (points de forme des tronçons, dans l'ordre, relatifs au nœud a) }
Drapeaux : 1 = dans un parc ou un jardin, 2 = passage couvert ou sous un immeuble, 4 = escalier.
Seuls les croisements sont des nœuds ; les points entre deux croisements sont des points de forme.
Si la réponse est trop petite (moins de 20 000 tronçons), rien n'est écrit.
"""
import gzip, json, math, sys

SOURCE = 'OpenStreetMap (licence ODbL)'
MIN_EDGES = 20000
WALK = ('footway|pedestrian|path|steps|living_street|residential|tertiary|tertiary_link|secondary|secondary_link'
        '|primary|primary_link|unclassified|service|cycleway|track|corridor')
QUERY = f'''[out:json][timeout:900][maxsize:1073741824];
area["ref:INSEE"="75056"][boundary=administrative]->.p;
way(area.p)[highway~"^({WALK})$"][foot!~"^no$"][access!~"^(private|no)$"]["footway"!~"^(sidewalk|crossing)$"]->.w;
(way(area.p)[leisure~"^(park|garden)$"][access!~"^(private|no)$"]; relation(area.p)[leisure~"^(park|garden)$"][access!~"^(private|no)$"];)->.parcs;
(.w; .parcs;);
out body qt;
(.w; .parcs;); >;
out skel qt;
'''


def length_m(a, b):
    """Distance à plat (juste à l'échelle de Paris), en mètres."""
    ky = 111_320.0
    kx = ky * math.cos(math.radians((a[0] + b[0]) / 2))
    return math.hypot((b[0] - a[0]) * ky, (b[1] - a[1]) * kx)


def inside(pt, ring):
    """Point dans un polygone (règle pair-impair) ; ring = [(lat, lng), …]."""
    y, x = pt
    hit = False
    for i in range(len(ring)):
        y1, x1 = ring[i]
        y2, x2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def build(data):
    els = data.get('elements', []) if isinstance(data, dict) else []
    nodes = {e['id']: (e['lat'], e['lon']) for e in els if e.get('type') == 'node' and 'lat' in e}
    ways = {e['id']: e for e in els if e.get('type') == 'way'}
    walk = [w for w in ways.values() if 'highway' in w.get('tags', {})]

    # Parcs : anneaux extérieurs des chemins fermés et des relations (assemblés bout à bout)
    rings = []
    def ring_of(ids):
        pts = [nodes[i] for i in ids if i in nodes]
        return pts if len(pts) >= 4 else None
    for w in ways.values():
        t = w.get('tags', {})
        if t.get('leisure') in ('park', 'garden') and w['nodes'][0] == w['nodes'][-1]:
            r = ring_of(w['nodes'])
            if r: rings.append(r)
    for rel in (e for e in els if e.get('type') == 'relation'):
        parts = [list(ways[m['ref']]['nodes']) for m in rel.get('members', []) if m.get('type') == 'way' and m.get('role') in ('outer', '') and m['ref'] in ways]
        while parts:
            cur = parts.pop(0)
            grown = True
            while cur[0] != cur[-1] and grown:
                grown = False
                for i, p in enumerate(parts):
                    if p[0] == cur[-1]: cur += p[1:]
                    elif p[-1] == cur[-1]: cur += p[-2::-1]
                    else: continue
                    parts.pop(i); grown = True; break
            if cur[0] == cur[-1]:
                r = ring_of(cur)
                if r: rings.append(r)
    boxes = [(min(p[0] for p in r), max(p[0] for p in r), min(p[1] for p in r), max(p[1] for p in r), r) for r in rings]
    def in_park(pt):
        return any(a <= pt[0] <= b and c <= pt[1] <= d and inside(pt, r) for a, b, c, d, r in boxes)

    # Nœuds du graphe : bouts de voies et points partagés par plusieurs voies
    use = {}
    for w in walk:
        for i, n in enumerate(w['nodes']):
            use[n] = use.get(n, 0) + (2 if i in (0, len(w['nodes']) - 1) else 1)
    names, name_ix = [], {}
    index, order = {}, []
    edges, shape = [], []
    for w in walk:
        t = w['tags']
        flag = (2 if t.get('covered') == 'yes' or t.get('tunnel') == 'building_passage' or t.get('indoor') == 'yes' else 0) \
            | (4 if t.get('highway') == 'steps' else 0)
        nm = t.get('name', '').strip()
        if nm and nm not in name_ix:
            name_ix[nm] = len(names); names.append(nm)
        k = name_ix[nm] + 1 if nm else 0
        seg = []
        for n in w['nodes']:
            if n not in nodes: seg = []; continue
            seg.append(n)
            if len(seg) > 1 and use.get(n, 0) >= 2:
                pts = [nodes[x] for x in seg]
                m = round(sum(length_m(pts[i], pts[i + 1]) for i in range(len(pts) - 1)))
                if m > 0:
                    mid = pts[len(pts) // 2] if len(pts) > 2 else ((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2)
                    f = flag | (1 if in_park(mid) else 0)
                    for x in (seg[0], seg[-1]):
                        if x not in index: index[x] = len(order); order.append(x)
                    a = nodes[seg[0]]
                    a5 = (round(a[0] * 1e5), round(a[1] * 1e5))
                    mids = seg[1:-1]
                    edges += [index[seg[0]], index[seg[-1]], m, f, k, len(mids)]
                    for x in mids:
                        q = nodes[x]
                        shape += [round(q[0] * 1e5) - a5[0], round(q[1] * 1e5) - a5[1]]
                seg = [n]
    flat, prev = [], (0, 0)
    for n in order:
        q = (round(nodes[n][0] * 1e5), round(nodes[n][1] * 1e5))
        flat += [q[0] - prev[0], q[1] - prev[1]]
        prev = q
    return {'names': names, 'nodes': flat, 'edges': edges, 'shape': shape}, len(rings)


def main():
    if sys.argv[1:] == ['demande']:
        print(QUERY)
        return
    src, out, today = sys.argv[1], sys.argv[2], sys.argv[3]
    g, parks = build(json.load(open(src, encoding='utf8')))
    n_edges = len(g['edges']) // 6
    if n_edges < MIN_EDGES:
        sys.exit(f'Plan des rues : seulement {n_edges} tronçons, rien écrit (source coupée ?)')
    doc = {'source': SOURCE, 'updated': today, **g}
    raw = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf8')
    open(out, 'wb').write(raw)
    gz = len(gzip.compress(raw, 9))
    flags = g['edges'][3::6]
    print(f"Plan des rues : {len(g['nodes']) // 2} croisements, {n_edges} tronçons, {len(g['shape']) // 2} points de forme, "
          f"{len(g['names'])} noms, {parks} parcs et jardins")
    print(f"  dans un parc : {sum(1 for f in flags if f & 1)} ; couverts : {sum(1 for f in flags if f & 2)} ; escaliers : {sum(1 for f in flags if f & 4)}")
    # Part du réseau d'un seul tenant (les morceaux isolés ne servent à rien pour un chemin)
    parent = list(range(len(g['nodes']) // 2))
    def root(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for i in range(0, len(g['edges']), 6):
        a, b = root(g['edges'][i]), root(g['edges'][i + 1])
        if a != b: parent[a] = b
    sizes = {}
    for x in range(len(parent)): sizes[root(x)] = sizes.get(root(x), 0) + 1
    print(f"  plus grand morceau d'un seul tenant : {max(sizes.values()) * 100 // len(parent)} % des croisements ({len(sizes)} morceaux)")
    print(f"  longueur totale : {round(sum(g['edges'][2::6]) / 1000)} km")
    print(f"  POIDS : {len(raw) / 1e6:.2f} Mo tel quel, {gz / 1e6:.2f} Mo compressé (ce que le téléphone télécharge)")


if __name__ == '__main__':
    main()
