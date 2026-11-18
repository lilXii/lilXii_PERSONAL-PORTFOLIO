"""Procedural visual prototypes, not engineering CAD. Python stdlib; Pillow for preview."""
import math, json, struct
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).parent
COLORS={'black':(0.055,.065,.085),'rubber':(.025,.028,.035),'metal':(.36,.40,.46),'pink':(.96,.035,.43),'white':(.88,.91,.94),'blue':(.025,.12,.48),'yellow':(.96,.76,.04),'seat':(.08,.085,.10)}
def sub(a,b): return tuple(x-y for x,y in zip(a,b))
def cross(a,b): return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def unit(a):
 n=math.sqrt(sum(x*x for x in a)); return tuple(x/n for x in a)
class Car:
 def __init__(self): self.parts=[]
 def part(self,name,vs,fs,mat): self.parts.append((name,vs,fs,mat))
 def box(self,name,c,s,mat):
  vs=[(c[0]+x*s[0]/2,c[1]+y*s[1]/2,c[2]+z*s[2]/2) for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
  self.part(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],mat)
 def beam(self,name,a,b,r,mat,n=8):
  axis=unit(sub(b,a)); u=unit(cross(axis,(0,1,0) if abs(axis[1])<.9 else (1,0,0))); v=cross(axis,u)
  vs=[tuple(p[j]+r*(u[j]*math.cos(i*2*math.pi/n)+v[j]*math.sin(i*2*math.pi/n)) for j in range(3)) for p in [a,b] for i in range(n)]
  fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  self.part(name,vs,fs,mat)
 def shell(self,name,sections,mat):
  # x, half-width, bottom, top; open-wheel tapered nose
  vs=[]
  for x,w,b,t in sections: vs += [(x,b,-w),(x,b,w),(x,t,w*.72),(x,t,-w*.72)]
  fs=[(3,2,1,0),tuple(range(len(vs)-4,len(vs)))]+[(i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j) for i in range(len(sections)-1) for j in range(4)]
  self.part(name,vs,fs,mat)
def make(variant):
 c=Car(); body='white' if variant=='a' else 'black'
 c.box('floor',(0,.16,0),(2.25,.07,.66),'black')
 c.shell('nose',[(-1.52,.13,.26,.36),(-1.16,.21,.24,.48),(-.70,.32,.20,.64),(-.34,.34,.19,.67)],body)
 c.shell('nose-pink-stripe',[(-1.48,.045,.365,.38),(-1.16,.065,.485,.50),(-.70,.075,.645,.66),(-.35,.08,.675,.69)],'pink' if variant=='a' else 'black')
 for s in [-1,1]:
  c.box('sidepod',(0.35,.32,s*.40),(1.02,.29,.22),'blue' if variant=='a' else 'black')
  c.box('sidepod-livery',(0.32,.27,s*.516),(.92,.12,.009),'yellow' if variant=='a' else 'pink')
  c.beam('cockpit-side',(-.35,.61,s*.28),(.58,.57,s*.28),.025,'metal')
  c.beam('roll-hoop',(.55,.30,s*.29),(.55,1.12,s*.24),.029,'metal')
  c.beam('rear-brace',(.55,1.12,s*.24),(1.03,.30,s*.30),.024,'metal')
  c.beam('frame-diagonal',(-.28,.22,s*.30),(.55,.59,s*.29),.018,'metal')
 c.beam('roll-hoop-top',(.55,1.12,-.24),(.55,1.12,.24),.029,'metal')
 c.box('seat-bottom',(.18,.25,0),(.46,.08,.37),'seat');c.box('seat-back',(.43,.49,0),(.09,.49,.37),'seat')
 c.beam('steering-column',(-.40,.40,0),(-.21,.58,0),.018,'metal')
 c.beam('steering-wheel',(-.21,.58,-.13),(-.21,.58,.13),.026,'black')
 for x in [-.93,.92]:
  for s in [-1,1]:
   z=s*.72
   c.beam('tire',(x,.29,z-.12),(x,.29,z+.12),.29,'rubber',20)
   c.beam('rim',(x,.29,z+s*.121),(x,.29,z+s*.128),.175,'metal',12)
   c.beam('hub',(x,.29,z+s*.13),(x,.29,z+s*.15),.065,'black',12)
   for h in [.20,.39]:
    for dx in [-.25,.25]: c.beam('wishbone',(x+dx,h,s*.28),(x,.29,z),.012,'metal')
   for i in range(6):
    t=i*math.pi/3
    c.beam('wheel-spoke',(x,.29,z+s*.135),(x+.145*math.cos(t),.29+.145*math.sin(t),z+s*.135),.012,'black')
 for x,y,w in [(-1.43,.16,1.48),(1.20,.99,1.14)]:
  for k in range(2): c.box('wing-element',(x+k*.13,y+k*.045,0),(.22,.035,w),'black' if x<0 else body)
  for s in [-1,1]: c.box('wing-endplate',(x+.065,y+.095,s*w/2),(.43,.28,.025),'pink' if variant=='b' else 'white')
 for s in [-1,1]: c.beam('rear-wing-mount',(.92,.30,s*.19),(1.23,.99,s*.19),.018,'metal')
 return c
def export(c,path):
 blob=bytearray(); views=[]; access=[]; meshes=[]; nodes=[]; mats=list(COLORS)
 def data(vals,typ,count,kind,mins=None,maxs=None):
  while len(blob)%4: blob.append(0)
  offset=len(blob); blob.extend(struct.pack('<'+typ*len(vals),*vals)); views.append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)-offset})
  a={'bufferView':len(views)-1,'componentType':5126,'count':count,'type':kind}
  if mins is not None: a.update(min=mins,max=maxs)
  access.append(a); return len(access)-1
 for name,vs,fs,mat in c.parts:
  p=[]; ns=[]
  for f in fs:
   for k in range(1,len(f)-1):
    tri=[vs[f[i]] for i in [0,k,k+1]]; n=unit(cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])))
    for v in tri:p.extend(v);ns.extend(n)
  pa=data(p,'f',len(p)//3,'VEC3',[min(p[j::3]) for j in range(3)],[max(p[j::3]) for j in range(3)])
  na=data(ns,'f',len(ns)//3,'VEC3')
  meshes.append({'name':name,'primitives':[{'attributes':{'POSITION':pa,'NORMAL':na},'material':mats.index(mat)}]});nodes.append({'name':name,'mesh':len(meshes)-1})
 doc={'asset':{'version':'2.0','generator':'Procedural FSAE visual prototype v0.1'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':[{'name':m,'doubleSided':True,'pbrMetallicRoughness':{'baseColorFactor':[*COLORS[m],1],'metallicFactor':.35 if m=='metal' else .05,'roughnessFactor':.8 if m=='rubber' else .4}} for m in mats],'buffers':[{'byteLength':len(blob)}],'bufferViews':views,'accessors':access}
 js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 raw=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
 path.write_bytes(raw)
 # Structural sanity checks, not a full Khronos validator.
 assert struct.unpack_from('<I',raw,8)[0]==len(raw)
 assert all(v['byteOffset']+v['byteLength']<=len(blob) for v in views)
 print(path.name,len(raw),'bytes',len(meshes),'parts')
def preview(cars):
 im=Image.new('RGB',(1500,790),(10,13,22));d=ImageDraw.Draw(im)
 view=unit((-4,2.6,5)); right=unit(cross((0,1,0),view));up=cross(view,right)
 for idx,c in enumerate(cars):
  ox=380+idx*740;oy=490;scale=195
  def project(v):return (ox+scale*sum(v[j]*right[j] for j in range(3)),oy-scale*sum(v[j]*up[j] for j in range(3)))
  faces=[]
  for name,vs,fs,mat in c.parts:
   for f in fs:
    points=[vs[i] for i in f];depth=sum(sum(v[j]*view[j] for j in range(3)) for v in points)/len(points)
    n=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));shade=.43+.57*abs(sum(n[j]*unit((-1,3,2))[j] for j in range(3)))
    color=tuple(int(255*x*shade) for x in COLORS[mat]);faces.append((depth,points,color))
  for _,points,color in sorted(faces,key=lambda f:f[0]):d.polygon([project(v) for v in points],fill=color)
  d.text((ox-280,100),'CAR '+('A / MULTICOLOR' if idx==0 else 'B / BLACK + MAGENTA'),fill=(240,240,250),font_size=26)
 d.text((48,32),'FSAE  /  PROCEDURAL MODEL STUDY 01',fill=(242,54,151),font_size=30)
 d.text((48,700),'Shape + livery blockout. Approximate geometry; no sponsor decals or engineering accuracy.',fill=(174,187,207),font_size=22)
 d.text((48,738),'GLB models: meters / Y up / nose toward -X. Preview is a simple software projection.',fill=(130,145,169),font_size=19)
 im.save(ROOT/'preview.png')
if __name__=='__main__':
 cars=[make('a'),make('b')]
 for k,c in zip('ab',cars):export(c,ROOT/f'fsae-car-{k}-prototype.glb')
 preview(cars)
