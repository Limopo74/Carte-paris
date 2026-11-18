import os
HERE = os.path.dirname(os.path.abspath(__file__))
import sys, math, json
sys.path.insert(0, HERE)
from stops import C
def decode(s):
    pts=[]; i=lat=lng=0
    while i < len(s):
        for k in (0,1):
            r=sh=0
            while True:
                b=ord(s[i])-63; i+=1; r|=(b&0x1f)<<sh; sh+=5
                if b<0x20: break
            d=~(r>>1) if r&1 else r>>1
            if k==0: lat+=d
            else: lng+=d
        pts.append((lat/1e5, lng/1e5))
    return pts
def dist(a,b):
    R=6371008.8; p1,p2=math.radians(a[0]),math.radians(b[0]); dp=p2-p1; dl=math.radians(b[1]-a[1])
    return 2*R*math.asin(math.sqrt(math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2))
def check(name):
    raw=open(os.path.join(HERE, 'traces', f'{name}.txt')).read().split('\n')
    want=float(raw[0]); poly=raw[1].strip().replace('\\'*4,'\\')
    pts=decode(poly)
    L=sum(dist(pts[i],pts[i+1]) for i in range(len(pts)-1))
    stops=C[name]
    near=[min(dist((a,g),p) for p in pts) for _,a,g in stops]
    ok = abs(L-want) < max(15, want*0.01) and max(near) < 40 and all(-90<p[0]<90 for p in pts)
    print(name, 'points', len(pts), 'longueur', round(L), 'osrm', want, 'écart max étape', round(max(near)), 'OK' if ok else 'ERREUR')
    return pts if ok else None
if __name__=='__main__':
    for n in sys.argv[1:]: check(n)
