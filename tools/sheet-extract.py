"""
TÁCH KHUNG từ một tấm hình nhiều dáng mèo (nền trắng, mèo đen, xếp lưới) → đường viền.
  python3 tools/sheet-extract.py <ảnh.png> <thư-mục-ra>      → <thư-mục-ra>/raw.json + fNN.png để xem
  python3 tools/sheet-build.py <thư-mục-ra> '{"walk":[[1,2,3,4],true],"stalk":[[13,14,15,16],true]}'
       → seq-<tên>.json (cùng dạng assets/cats/nana/seq-*.json), chép vào assets/cats/nana/ rồi khai trong cat.json
Mảnh rời (đuôi đứt nét) được nối vào thân; nét gió nhỏ bị bỏ. Cần: opencv-python, numpy, scipy.
"""
import cv2, numpy as np, json, sys, os
os.makedirs(sys.argv[2], exist_ok=True); os.chdir(sys.argv[2])
im = cv2.imread(sys.argv[1], cv2.IMREAD_GRAYSCALE)
S=4
g=cv2.resize(im,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
_,b=cv2.threshold(g,128,255,cv2.THRESH_BINARY_INV)
n,lab,st,cen=cv2.connectedComponentsWithStats(b)
big=[i for i in range(1,n) if st[i,4]>2000*S*S]
items=sorted([(st[i,1]+st[i,3]/2, st[i,0]+st[i,2]/2, i) for i in big])
rows=[]
for it in items:
    if rows and abs(rows[-1][0][0]-it[0])<150*S: rows[-1].append(it)
    else: rows.append([it])
order=[i for r in rows for (_,_,i) in sorted(r,key=lambda t:t[1])]
# cell bounds: midpoint between neighbouring big components
H,W=b.shape
cents=[(cen[i][0],cen[i][1]) for i in order]
out=[]
for k,i in enumerate(order):
    cx,cy=cents[k]
    def owner(j):
        x,y=cen[j]; return min(range(len(order)),key=lambda q:(cents[q][0]-x)**2+((cents[q][1]-y)*1.5)**2)
    parts=[j for j in range(1,n) if st[j,4]>150*S*S and owner(j)==k]
    m=np.isin(lab,parts).astype(np.uint8)*255
    # nối các mảnh rời (đuôi) vào thân: nối 2 điểm gần nhất bằng nét dày
    while True:
        nn,l2,s2,c2=cv2.connectedComponentsWithStats(m)
        if nn<=2: break
        main=1+int(np.argmax(s2[1:,4])); others=[q for q in range(1,nn) if q!=main]
        q=others[0]
        A=np.argwhere(l2==main); B=np.argwhere(l2==q)
        A=A[::7]; B=B[::3]
        from scipy.spatial import cKDTree
        t=cKDTree(A); dd,ii=t.query(B); bi=int(np.argmin(dd)); pa=A[ii[bi]]; pb=B[bi]
        cv2.line(m,(int(pa[1]),int(pa[0])),(int(pb[1]),int(pb[0])),255,int(5*S))
    ys,xs=np.nonzero(m); x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
    sub=m[y0-2:y1+3,x0-2:x1+3]
    cs,hier=cv2.findContours(sub,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    polys=[]
    for ci,c in enumerate(cs):
        c=c[:,0,:].astype(float)+[x0-2,y0-2]; c/=S
        outer=hier[0][ci][3]<0
        area=cv2.contourArea((c*S).astype(np.float32))/S/S
        if not outer and area<4: continue
        polys.append({'outer':bool(outer),'pts':c.tolist(),'area':float(area)})
    out.append(polys)
    cv2.imwrite(f'f{k+1:02d}.png',cv2.resize(255-sub,None,fx=1/S,fy=1/S,interpolation=cv2.INTER_AREA))
json.dump(out,open('raw.json','w'))
print([sum(p['outer'] for p in f) for f in out])
