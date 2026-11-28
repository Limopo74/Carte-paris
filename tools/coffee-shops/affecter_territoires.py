"""Affectation hors ligne depuis des GeoJSON WGS84. Python 3, sans dépendance."""
import argparse,json,pathlib,copy,datetime
from gestion_base import export,validpoint
P=pathlib.Path(__file__).parent

def ring_state(x,y,ring):
    inside=False
    for a,b in zip(ring,ring[1:]+ring[:1]):
        ax,ay=a[:2]; bx,by=b[:2]
        if abs((x-ax)*(by-ay)-(y-ay)*(bx-ax))<1e-12 and min(ax,bx)-1e-10<=x<=max(ax,bx)+1e-10 and min(ay,by)-1e-10<=y<=max(ay,by)+1e-10:return 0
        if (ay>y)!=(by>y) and x<(bx-ax)*(y-ay)/(by-ay)+ax:inside=not inside
    return 1 if inside else -1

def polygon_state(x,y,p):
    outer=ring_state(x,y,p[0]);
    if outer!=1:return outer
    for hole in p[1:]:
        s=ring_state(x,y,hole)
        if s==0:return 0
        if s==1:return -1
    return 1

def load_layer(path,field):
    obj=json.loads(pathlib.Path(path).read_text(encoding='utf-8-sig'))
    if obj.get('type')!='FeatureCollection':raise ValueError('FeatureCollection attendue')
    out=[]
    for f in obj['features']:
        g=f.get('geometry') or {}; props=f.get('properties') or {}; value=props.get(field)
        if g.get('type') not in ('Polygon','MultiPolygon'):continue
        if value is None:raise ValueError('Champ absent : '+field)
        polys=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
        for p in polys:
            if not p or not p[0]:raise ValueError('Polygone vide')
            coords=[v for ring in p for v in ring]
            if any(not (-180<=v[0]<=180 and -90<=v[1]<=90) for v in coords):raise ValueError('Coordonnées WGS84 requises')
            xs,ys=zip(*[v[:2] for v in coords]);out.append((str(value),p,(min(xs),min(ys),max(xs),max(ys))))
    if not out:raise ValueError('Aucun polygone utilisable')
    return out

def locate(x,y,layer):
    found=set(); boundary=False
    for value,p,(a,b,c,d) in layer:
        if a<=x<=c and b<=y<=d:
            s=polygon_state(x,y,p)
            if s==0:boundary=True
            elif s==1:found.add(value)
    if boundary or len(found)>1:return None,'ambigu'
    if found:return next(iter(found)),'attribue'
    return None,'hors_contours'

def apply(rows,layer,target,source):
    counts={}
    for r in rows:
        v,status=locate(float(r['longitude']),float(r['latitude']),layer) if validpoint(r) else (None,'sans_coordonnees')
        r[target+'_affectation_statut']=status
        if v is not None:r[target]=v;r[target+'_source']=source
        elif r.get(target) is not None:r[target+'_affectation_statut']=status+'_ancienne_valeur_conservee'
        counts[status]=counts.get(status,0)+1
    return counts

def main():
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('--iris');a.add_argument('--champ-iris',default='CODE_IRIS');a.add_argument('--quartiers');a.add_argument('--champ-quartier',default='l_qu');a.add_argument('--appliquer',action='store_true');args=a.parse_args()
    if not(args.iris or args.quartiers):a.error('Fournir au moins une couche')
    rows=json.loads((P/'coffee_shops_paris.json').read_text());original=copy.deepcopy(rows);report={}
    for target,path,field in [('iris',args.iris,args.champ_iris),('quartier',args.quartiers,args.champ_quartier)]:
        if path:report[target]=apply(rows,load_layer(path,field),target,pathlib.Path(path).name)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if args.appliquer:
        stamp=datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f');(P/('sauvegarde_territoires_'+stamp+'.json')).write_text(json.dumps(original,ensure_ascii=False));export(rows);(P/'rapport_affectation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
