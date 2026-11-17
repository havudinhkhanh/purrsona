"""Dựng seq-*.json từ raw.json của sheet-extract.py. Mũi đặt ở x=113, chân ở y≈0, cỡ ×1.42 khớp mèo na."""
import json, math, sys, os
os.chdir(sys.argv[1])
import numpy as np
raw=json.load(open('raw.json'))
S=1.42
def resample(pts, step):
    p=np.array(pts+[pts[0]]); seg=np.hypot(*np.diff(p,axis=0).T); L=seg.sum()
    n=max(8,int(L/step)); t=np.linspace(0,L,n,endpoint=False); cum=np.concatenate([[0],np.cumsum(seg)])
    out=[]
    for v in t:
        i=np.searchsorted(cum,v,side='right')-1; u=(v-cum[i])/max(seg[i],1e-9); out.append(p[i]+(p[i+1]-p[i])*u)
    return np.array(out)
def area(q): x,y=q[:,0],q[:,1]; return 0.5*np.sum(x*np.roll(y,-1)-np.roll(x,-1)*y)
def frame(k):
    f=raw[k-1]; o=np.array([p for p in f if p['outer']][0]['pts'])
    ymax=o[:,1].max(); xmax=o[:,0].max(); ymin=o[:,1].min()
    T=lambda q:(np.array(q)-[xmax,ymax])*S+[113,4]
    polys=[]; eye=None
    oo=resample(T(o).tolist(),1.4)
    if area(oo)>0: oo=oo[::-1]
    polys.append((0,oo))
    holes=[]
    for p in f:
        if p['outer']: continue
        h=resample(T(p['pts']).tolist(),1.2)
        if area(h)<0: h=h[::-1]
        polys.append((1,h)); holes.append(h)
    # mắt: lỗ trong vùng đầu (gần mũi, phía trên), lấy lỗ lớn nhất ở đó
    hx=113; top=min(q[:,1].min() for t,q in polys)
    cands=[h for h in holes if h[:,0].mean()>hx-60 and h[:,1].mean()<-50]
    if cands:
        h=max(cands,key=lambda h:abs(area(h))); eye=[int(round(h[:,0].mean())),int(round(h[:,1].mean()))]
    allp=np.concatenate([q for t,q in polys]); w=int(allp[:,0].max()-allp[:,0].min()); hh=int(-allp[:,1].min())
    enc=[]
    for t,q in polys:
        q=np.round(q).astype(int); keep=[q[0]]
        for r in q[1:]:
            if (r!=keep[-1]).any(): keep.append(r)
        q=np.array(keep); d=np.diff(q,axis=0)
        enc.append([t,int(q[0,0]),int(q[0,1])]+d.flatten().astype(int).tolist())
    return [w,hh,eye or [95,-130],enc]
def sheet(ids, loop, w=None):
    return {"n":len(ids),"loop":loop,"w":w or [1]*len(ids),"hard":[],"f":[frame(k) for k in ids]}
spec=json.loads(sys.argv[2])
for name,(ids,loop) in spec.items():
    d=sheet(ids,loop); json.dump(d,open(f'seq-{name}.json','w'),separators=(',',':'))
    print(name,len(json.dumps(d)),[f[:3] for f in d['f']][:3])
