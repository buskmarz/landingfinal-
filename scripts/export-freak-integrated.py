"""Variable-data PDF composition: image-generated masters plus exact vector QR and code."""
import json,sys,os
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
import fitz
folder=Path(sys.argv[1]);data=json.loads((folder/'integrated-print.json').read_text())
arts=['chiquita','annie','lobster','rare']
# Pixel coordinates inspected on the 1024 x 1536 masters; QR stays inside costume.
slots=[(387,900,250,1180),(387,900,250,1185),(388,710,250,967),(387,850,250,1132)]
def sticker(c,t,x,y,w=90*mm,h=135*mm,preview=False):
 c.saveState();c.translate(x,y);c.drawImage('freak/sticker-masters/'+arts[t['act']]+'.png',0,0,w,h)
 px,py,size,codey=slots[t['act']];scale=w/1024;matrix=t['matrix'];n=len(matrix);unit=size*scale/(n+8);qx=px*scale;qy=h-(py+size)*scale
 c.setFillColorRGB(1,1,1);c.rect(qx,qy,size*scale,size*scale,fill=1,stroke=0);c.setFillColorRGB(0,0,0)
 for row in range(n):
  for col in range(n):
   if matrix[row][col]:c.rect(qx+(col+4)*unit,qy+(n+3-row)*unit,unit,unit,fill=1,stroke=0)
 if not preview:c.setFont('Courier-Bold',7);c.drawCentredString(w/2,h-codey*scale,t['code'])
 c.restoreState()
filename=folder/'FREAK-100-QR-INTEGRADOS.pdf';c=canvas.Canvas(str(filename),pagesize=A4)
for i,t in enumerate(data['tickets']):
 j=i%4;sticker(c,t,(10+(j%2)*100)*mm,(152-(j//2)*140)*mm)
 if j==3:c.showPage()
c.save();os.chmod(filename,0o600)
# Public design previews use only the common homepage QR, never a claim secret.
for act in range(4):
 p=folder/('preview-'+arts[act]+'.pdf');c=canvas.Canvas(str(p),pagesize=(90*mm,135*mm));sticker(c,{'act':act,'matrix':data['previewMatrix']},0,0,preview=True);c.save()
 doc=fitz.open(p);doc[0].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save('freak/'+arts[act]+'-integrated.png')
proof=folder/'FREAK-COLECCION-VISTA.pdf';c=canvas.Canvas(str(proof),pagesize=A4)
for act in range(4):sticker(c,{'act':act,'matrix':data['previewMatrix']},(10+(act%2)*100)*mm,(152-(act//2)*140)*mm,preview=True)
c.save();doc=fitz.open(proof);doc[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(str(folder/'FREAK-COLECCION-VISTA.png'))
# Render each actual QR region at print resolution for decoding verification.
out=folder/'integrated-qr-check';out.mkdir(exist_ok=True)
doc=fitz.open(filename)
for i,t in enumerate(data['tickets']):
 j=i%4;x=(10+(j%2)*100)*mm;y=(152-(j//2)*140)*mm;px,py,size,_=slots[t['act']];scale=90*mm/1024
 top=A4[1]-y-135*mm+py*scale
 clip=fitz.Rect(x+px*scale,top,x+(px+size)*scale,top+size*scale)
 doc[i//4].get_pixmap(matrix=fitz.Matrix(300/72,300/72),clip=clip,alpha=False).save(str(out/f'{i:03}.png'))
print('Created 25-page private print PDF, 4-design proof and 100 QR validation renders.')
