import csv,json,re,unicodedata,collections,pathlib,datetime,math,os
P=pathlib.Path(__file__).parent
DATE=datetime.date.today().isoformat()
def norm(s):
 s=unicodedata.normalize('NFKD',str(s or '').lower()).encode('ascii','ignore').decode(); s=re.sub(r'[^a-z0-9]+',' ',s).strip(); return re.sub(r'\b(av|bd|pl|r)\b',lambda m:{'av':'avenue','bd':'boulevard','pl':'place','r':'rue'}[m[0]],s)
def save(name,obj):
 p=P/name;t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8');os.replace(t,p)
def csvsave(name,rows,fields):
 with (P/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields,delimiter=';',extrasaction='ignore');w.writeheader();w.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(dict,list)) else v for k,v in r.items()} for r in rows)
def validpoint(r):
 try:return 48.80<float(r['latitude'])<48.92 and 2.22<float(r['longitude'])<2.48
 except (ValueError,TypeError,KeyError):return False
def export(rows):
 assert len({r['id'] for r in rows})==len(rows),'Identifiants dupliqués'
 groups=collections.defaultdict(list)
 for r in rows:
  for k in ('nom','adresse','code_postal','site','horaires','source'):
   if isinstance(r.get(k),str):r[k]=' '.join(r[k].split()) or None
  cp=r.get('code_postal') or ''; r['arrondissement']=16 if cp=='75116' else int(cp[-2:]) if re.fullmatch(r'750(?:0[1-9]|1[0-9]|20)',cp) else None
  r['adresse_normalisee']=norm(r.get('adresse'));r['nom_normalise']=norm(r.get('nom'))
  groups[(cp,r['adresse_normalisee'])].append(r)
  r['geocodage_statut']='localise' if validpoint(r) else 'a_geocoder'
  if validpoint(r):
   r['latitude']=float(r['latitude']);r['longitude']=float(r['longitude']);r.setdefault('geocodage_source','OSM (source historique)');r.setdefault('geocodage_precision','point cartographique historique')
  else:r['latitude']=r['longitude']=None
  r.setdefault('geocodage_source',None);r.setdefault('geocodage_precision',None);r.setdefault('geocodage_score',None)
  r.setdefault('geocodage_date',None);r.setdefault('verification_commerciale','a_verifier')
  r.setdefault('licence_republication','a_verifier');r['sources_urls']=list(dict.fromkeys((r.get('sources_urls') or [])+re.findall(r'https?://[^\s;]+',r.get('source') or '')))
  r.setdefault('categorie_verifiee',None); r['recherche']=norm(' '.join(str(r.get(k) or '') for k in ('nom','adresse','code_postal')))
 for r in rows:r['doublon_potentiel']=len(groups[(r.get('code_postal') or '',r['adresse_normalisee'])])>1
 rows.sort(key=lambda r:(r.get('arrondissement') or 99,r['nom_normalise'],r['id']))
 fields=list(dict.fromkeys(k for r in rows for k in r)); flat=[dict(r,sources_urls=' ; '.join(r['sources_urls'])) for r in rows]
 save('coffee_shops_paris.json',rows);csvsave('coffee_shops_paris.csv',flat,fields)
 pts=[r for r in rows if validpoint(r)];missing=[r for r in rows if not validpoint(r)]
 def geo(rs):return {'type':'FeatureCollection','features':[{'type':'Feature','id':r['id'],'geometry':{'type':'Point','coordinates':[r['longitude'],r['latitude']]} if validpoint(r) else None,'properties':r} for r in rs]}
 save('coffee_shops_paris.geojson',geo(rows));save('coffee_shops_points.geojson',geo(pts));save('coffee_shops_a_geocoder.json',missing)
 csvsave('coffee_shops_a_geocoder.csv',[dict(r,requete=' '.join(filter(None,[r.get('adresse'),r.get('code_postal'),'Paris']))) for r in missing],['id','nom','adresse','code_postal','requete'])
 suspects=[r for r in flat if r['doublon_potentiel']];csvsave('doublons_a_verifier.csv',suspects,fields)
 stats=[{'arrondissement':a,'total':sum(r['arrondissement']==a for r in rows),'localises':sum(r['arrondissement']==a for r in pts)} for a in range(1,21)]
 csvsave('statistiques_arrondissements.csv',stats,['arrondissement','total','localises'])
 save('rapport_qualite.json',{'version':'17','date':DATE,'total':len(rows),'localises':len(pts),'a_geocoder':len(missing),'doublons_potentiels':len(suspects),'iris_renseignes':sum(bool(r.get('iris')) for r in rows),'arrondissements':stats,'statuts_verifies':sum(bool(r.get('date_verification')) for r in rows),'limites':['Coordonnées historiques non revérifiées','Droits de republication à vérifier','Statuts commerciaux non confirmés']})
if __name__=='__main__':export(json.loads((P/'coffee_shops_paris.json').read_text(encoding='utf-8')))
