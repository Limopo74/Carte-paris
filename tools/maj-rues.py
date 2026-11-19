#!/usr/bin/env python3
"""Fabrique data/rues.json, le plan des rues à pied de Paris pour « Mes parcours » (v244).

Usage, depuis la racine du dépôt :
  python3 -I tools/maj-rues.py demandes DOSSIER       -> écrit les demandes Overpass (q-*.txt) dans DOSSIER
  python3 -I tools/maj-rues.py DOSSIER SORTIE.json AAAA-MM-JJ   (lit les réponses DOSSIER/r-*.json)

Entrée : les réponses JSON d'Overpass (OpenStreetMap, licence ODbL) aux demandes ci-dessous : les voies où l'on marche
dans Paris (avec leurs nœuds), et les parcs et jardins (pour les éviter : choix 1A du 19 nov.).

Sortie (format 2, compacte, un seul fichier ; lue par js/rues.js, readPlan) :
  { source, updated, v: 2, names: [noms des rues],
    nodes: [lat0, lng0, dlat1, dlng1, …]   (entiers en 1e-5 degré, chaque point relatif au précédent),
    ea: [écart du nœud a avec le nœud a du tronçon d'avant], eb: [nœud b - nœud a], ef: [drapeaux],
    ek: [numéro du nom + 1 (0 = sans nom)], en: [nombre de points de forme],
    shape: [dlat, dlng, …]                  (points de forme, le 1er relatif au nœud a, les suivants au point d'avant) }
  La longueur d'un tronçon n'est pas écrite : le téléphone la recalcule.
Drapeaux : 1 = dans un parc ou un jardin, 2 = peut fermer (passage sous un immeuble, galerie, voie avec horaires), 4 = escalier.
Seuls les tronçons dont un bout est dans Paris (data/arrondissements.json) sont gardés. Seuls les croisements sont des nœuds ; les points entre deux croisements sont des points de forme.
Si les réponses sont trop petites (moins de 100 000 tronçons) ou le réseau trop morcelé (moins de 90 % d'un seul tenant),
rien n'est écrit : le fichier d'avant reste.
"""
import glob, gzip, json, math, os, sys

SOURCE = 'OpenStreetMap (licence ODbL)'
MIN_EDGES = 100000  # Paris entier, trottoirs compris : environ 300 000 attendus
MIN_SHARE = 90  # % des croisements dans le plus grand morceau d'un seul tenant (97 % mesuré le 19 nov.)
WALK = ('footway|pedestrian|path|steps|living_street|residential|tertiary|tertiary_link|secondary|secondary_link'
        '|primary|primary_link|unclassified|service|cycleway|track|corridor')
# 19 nov. : la demande d'un seul tenant (tout Paris, par la zone de la commune) a été refusée par les trois serveurs
# (504, 502, coupure) ; elle est donc découpée en 9 cases (3 × 3) plus une demande pour les parcs.
BOX = (48.815, 2.224, 48.903, 2.470)  # sud, ouest, nord, est : Paris et un peu autour (le reste est retiré ensuite)
CUTS = 3
# Trottoirs et passages piétons demandés aussi (19 nov. : sans eux, le plus grand morceau d'un seul tenant n'avait que
# 74 % des croisements) ; le script peut les retirer ensuite (SANS_TROTTOIRS=1) pour comparer.
WAY_FILTER = f'[highway~"^({WALK})$"][foot!~"^no$"][access!~"^(private|no)$"]'


def queries():
    """Les demandes Overpass : {nom: texte}."""
    s, w, n, e = BOX
    out = {}
    for i in range(CUTS):
        for j in range(CUTS):
            b = (s + (n - s) * i / CUTS, w + (e - w) * j / CUTS, s + (n - s) * (i + 1) / CUTS, w + (e - w) * (j + 1) / CUTS)
            bb = ','.join(f'{x:.5f}' for x in b)
            out[f'q-{i}{j}'] = f'[out:json][timeout:300];way({bb}){WAY_FILTER};out body qt;>;out skel qt;'
    bb = ','.join(f'{x:.5f}' for x in BOX)
    # Parcs : contours donnés directement (« out geom »), sans redemander leurs points un à un ; jamais bloquant.
    out['q-parcs'] = (f'[out:json][timeout:300];(way({bb})[leisure~"^(park|garden)$"][access!~"^(private|no)$"];'
                      f'relation({bb})[leisure~"^(park|garden)$"][access!~"^(private|no)$"];);out geom qt;')
    return out


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


def paris_test():
    """Fonction (lat, lng) -> dans Paris ? d'après data/arrondissements.json (anneaux en [lng, lat])."""
    rings = []
    for a in json.load(open('data/arrondissements.json', encoding='utf8'))['arr']:
        for r in a['rings']:
            pts = [(p[1], p[0]) for p in r]
            rings.append((min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts), pts))
    return lambda pt: any(a <= pt[0] <= b and c <= pt[1] <= d and inside(pt, r) for a, b, c, d, r in rings)


def build(data, in_paris=lambda pt: True):
    els = data.get('elements', []) if isinstance(data, dict) else []
    nodes = {e['id']: (e['lat'], e['lon']) for e in els if e.get('type') == 'node' and 'lat' in e}
    ways = {e['id']: e for e in els if e.get('type') == 'way'}
    skip = ('sidewalk', 'crossing') if os.environ.get('SANS_TROTTOIRS') == '1' else ()
    walk = [w for w in ways.values() if 'highway' in w.get('tags', {}) and w['tags'].get('footway') not in skip]

    # Parcs : anneaux extérieurs des chemins fermés et des relations (assemblés bout à bout)
    rings = []
    def pts_of(w):
        if 'geometry' in w: return [(q['lat'], q['lon']) for q in w['geometry'] if q]
        return [nodes[i] for i in w.get('nodes', []) if i in nodes]
    for w in ways.values():
        t = w.get('tags', {})
        if t.get('leisure') in ('park', 'garden'):
            r = pts_of(w)
            if len(r) >= 4 and r[0] == r[-1]: rings.append(r)
    for rel in (e for e in els if e.get('type') == 'relation'):
        parts = [pts_of(m) for m in rel.get('members', []) if m.get('type') == 'way' and m.get('role') in ('outer', '')]
        parts = [p for p in parts if len(p) >= 2]
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
            if cur[0] == cur[-1] and len(cur) >= 4:
                rings.append(cur)
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
        # « Peut fermer » : passage sous un immeuble, intérieur, couloir, ou voie avec des horaires (galeries, cours).
        # Pas une simple arcade toujours ouverte (covered=yes sans horaires, rue de Rivoli).
        closes = t.get('tunnel') == 'building_passage' or t.get('indoor') == 'yes' or t.get('highway') == 'corridor' or bool(t.get('opening_hours'))
        flag = (2 if closes else 0) | (4 if t.get('highway') == 'steps' else 0)
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
                if m > 0 and (in_paris(nodes[seg[0]]) or in_paris(nodes[seg[-1]])):
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


def keep_main(g, roots, big):
    """Garde seulement le plus grand morceau d'un seul tenant : une étape posée sur un bout isolé n'aurait aucun chemin.
    Les croisements sont renumérotés, les points de forme suivent leurs tronçons."""
    lat, lng, prev, q = [], [], (0, 0), 0
    for i in range(0, len(g['nodes']), 2):
        prev = (prev[0] + g['nodes'][i], prev[1] + g['nodes'][i + 1]); lat.append(prev[0]); lng.append(prev[1])
    new, order = {}, []
    edges, shape, si = [], [], 0
    for i in range(0, len(g['edges']), 6):
        a, b, m, f, k, ns = g['edges'][i:i + 6]
        part = g['shape'][2 * si:2 * (si + ns)]; si += ns
        if roots[a] != big: continue
        for x in (a, b):
            if x not in new: new[x] = len(order); order.append(x)
        edges += [new[a], new[b], m, f, k, ns]; shape += part
    flat, prev = [], (0, 0)
    for x in order:
        flat += [lat[x] - prev[0], lng[x] - prev[1]]; prev = (lat[x], lng[x])
    return {'names': g['names'], 'nodes': flat, 'edges': edges, 'shape': shape}


def compact(g):
    """Format 2 (19 nov. : un tiers plus léger que le format 1) : tronçons en colonnes et en écarts, sans longueur
    (le téléphone la recalcule depuis les points) ; points de forme chaînés (le 1er relatif au nœud a, les suivants au
    point d'avant)."""
    E, S = g['edges'], g['shape']
    ea, eb, ef, ek, en, sh = [], [], [], [], [], []
    pa, si = 0, 0
    for i in range(0, len(E), 6):
        a, b, _m, f, k, n = E[i:i + 6]
        ea.append(a - pa); eb.append(b - a); ef.append(f); ek.append(k); en.append(n); pa = a
        px = py = 0
        for j in range(n):
            x, y = S[2 * (si + j)], S[2 * (si + j) + 1]
            sh += [x - px, y - py]; px, py = x, y
        si += n
    return {'names': g['names'], 'nodes': g['nodes'], 'ea': ea, 'eb': eb, 'ef': ef, 'ek': ek, 'en': en, 'shape': sh}


def main():
    if sys.argv[1] == 'demandes':
        os.makedirs(sys.argv[2], exist_ok=True)
        for k, q in queries().items():
            open(os.path.join(sys.argv[2], k + '.txt'), 'w', encoding='utf8').write(q)
        return
    src, out, today = sys.argv[1], sys.argv[2], sys.argv[3]
    seen, els = set(), []
    for f in sorted(glob.glob(os.path.join(src, 'r-*.json'))):
        for e in json.load(open(f, encoding='utf8')).get('elements', []):
            key = (e.get('type'), e.get('id'))
            if key not in seen:
                seen.add(key); els.append(e)
    g, parks = build({'elements': els}, paris_test())
    n_edges = len(g['edges']) // 6
    if n_edges < MIN_EDGES:
        sys.exit(f'Plan des rues : seulement {n_edges} tronçons, rien écrit (source coupée ?)')
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
    share = max(sizes.values()) * 100 // len(parent)
    if share < MIN_SHARE:
        sys.exit(f'Plan des rues : le plus grand morceau d\'un seul tenant n\'a que {share} % des croisements, rien écrit')
    g = keep_main(g, [root(x) for x in range(len(parent))], max(sizes, key=sizes.get))
    n_edges = len(g['edges']) // 6
    doc = {'source': SOURCE, 'updated': today, 'v': 2, **compact(g)}
    raw = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf8')
    open(out, 'wb').write(raw)
    gz = len(gzip.compress(raw, 9))
    flags = doc['ef']
    print(f"Plan des rues : {len(g['nodes']) // 2} croisements, {n_edges} tronçons, {len(g['shape']) // 2} points de forme, "
          f"{len(g['names'])} noms, {parks} parcs et jardins")
    print(f"  dans un parc : {sum(1 for f in flags if f & 1)} ; couverts : {sum(1 for f in flags if f & 2)} ; escaliers : {sum(1 for f in flags if f & 4)}")
    print(f"  plus grand morceau d'un seul tenant : {share} % des croisements ({len(sizes)} morceaux) : seul gardé")
    print(f"  longueur totale : {round(sum(g['edges'][2::6]) / 1000)} km (longueurs calculées ici, pas écrites)")
    print(f"  POIDS : {len(raw) / 1e6:.2f} Mo tel quel, {gz / 1e6:.2f} Mo compressé (ce que le téléphone télécharge)")


if __name__ == '__main__':
    main()
