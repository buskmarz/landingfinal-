"""Private vector QR sticker export. Reads private print-data.json; never copies secrets to dist."""
import json,sys,os,math
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor,white,black
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('FreakRye','freak/rye.ttf'))
folder=Path(sys.argv[1]).resolve();data=json.loads((folder/'print-data.json').read_text())
assert folder.is_absolute()
INK=HexColor('#231F20');AQUA=HexColor('#8ACCC7');YELLOW=HexColor('#FFDE00')
def sticker(c,t,x,y,w=62*mm,h=85*mm):
 c.saveState();c.translate(x,y);c.setFillColor(white);c.rect(0,0,w,h,fill=1,stroke=0);c.setStrokeColor(INK);c.setLineWidth(.5);c.rect(0,0,w,h,fill=0,stroke=1)
 c.setFillColor(INK);c.setFont('FreakRye',20);c.drawCentredString(w/2,h-9*mm,'FREAK');c.setFont('Helvetica',5.5);c.drawCentredString(w/2,h-12*mm,'BETTER MOOD / LA COLECCION IMPOSIBLE')
 c.drawImage(t['art'],w/2-15*mm,h-52*mm,width=30*mm,height=38*mm,preserveAspectRatio=True,anchor='c',mask='auto')
 # Separate exact black modules on a white 4-module quiet zone. Never overlay art.
 matrix=t['matrix'];n=len(matrix);size=25*mm;unit=size/(n+8);qx=w-27*mm;qy=6*mm
 c.setFillColor(white);c.rect(qx,qy,size,size,fill=1,stroke=0);c.setFillColor(black)
 for row in range(n):
  for col in range(n):
   if matrix[row][col]:c.rect(qx+(col+4)*unit,qy+(n+3-row)*unit,unit,unit,fill=1,stroke=0)
 name=t['name'].replace(' · ',' / ')
 lines=[name]
 c.setFillColor(INK);c.setFont('Helvetica-Bold',7)
 for i,line in enumerate(lines):c.drawString(3*mm,25*mm-i*3.5*mm,line)
 c.setFont('Helvetica',6);c.drawString(3*mm,15*mm,f"SERIE DE {t['edition']}");c.drawString(3*mm,11*mm,f"BOLETO {t['displayNumber']:03d}/100")
 if t['rare']:
  c.setFont('Helvetica-Bold',6);c.drawString(3*mm,7*mm,'EDICION RARA')
 c.setFont('Helvetica',5.5);c.drawCentredString(w/2,2.5*mm,'ESCANEA. ENTRA. CONFIRMA TU CAPTURA.')
 c.restoreState()
for campaign in ['freak-2026','prueba']:
 tickets=[t for t in data if t['campaign']==campaign]
 if campaign=='prueba':tickets=tickets[:18]
 filename=folder/('FREAK-100-STICKERS-REALES-PRIVADO.pdf' if campaign=='freak-2026' else 'FREAK-STICKERS-PRUEBA.pdf')
 c=canvas.Canvas(str(filename),pagesize=A4);c.setTitle('FREAK - inventario privado' if campaign=='freak-2026' else 'FREAK - prueba separada')
 for start in range(0,len(tickets),9):
  batch=tickets[start:start+9]
  c.setFillColor(INK);c.setFont('Helvetica-Bold',8);c.drawString(7*mm,287*mm,'FREAK / 100 REALES - PRIVADO / NO DISTRIBUIR SIN ACTIVACION' if campaign=='freak-2026' else 'FREAK / SOLO PRUEBA - INVENTARIO INDEPENDIENTE')
  for i,t in enumerate(batch):sticker(c,t,(7+(i%3)*67)*mm,(195-(i//3)*90)*mm)
  c.setFont('Helvetica',7);c.drawString(7*mm,8*mm,'A4 - imprimir al 100% / sin ajustar / cada sticker 62 x 85 mm')
  c.drawRightString(203*mm,8*mm,f'{start//9+1} / {math.ceil(len(tickets)/9)}');c.showPage()
 c.save();os.chmod(filename,0o600)
# A shareable proof sheet contains only independent test QR, one per portrait.
proof=[]
for act in range(4):proof.append(next(t for t in data if t['campaign']=='prueba' and t['act']==act and not t['release'].startswith('2099')))
c=canvas.Canvas(str(folder/'FREAK-CUATRO-DISENOS-PRUEBA.pdf'),pagesize=A4);c.setTitle('FREAK - cuatro diseños con QR de prueba')
c.setFillColor(INK);c.setFont('Times-Bold',25);c.drawString(25*mm,278*mm,'FREAK / La coleccion imposible')
c.setFont('Helvetica',10);c.drawString(25*mm,269*mm,'Cuatro retratos originales. QR de prueba. Tirada real: 30 + 30 + 30 + 10.')
for i,t in enumerate(proof):sticker(c,t,(25+(i%2)*95)*mm,(160-(i//2)*105)*mm)
c.setFont('Helvetica',9);c.drawString(25*mm,38*mm,'Los QR de esta hoja pertenecen a PRUEBA y no consumen los 100 reales.')
c.drawString(25*mm,31*mm,'28 octubre 2026 / UPAEP / DJ en vivo / Pumpkin Spice Latte + Maracuya')
c.save()
print('Created real private inventory (100), test stickers (18), and four-design test proof.')
