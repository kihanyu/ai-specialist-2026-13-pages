from pathlib import Path
import json
import pymupdf as fitz
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[2]
assets=root/'assets'/'ODAI-1'
assets.mkdir(parents=True,exist_ok=True)
doc=fitz.open(root/'삼성전자AI전문가교육-ODAI-1.pdf')
pages=[]
for i,p in enumerate(doc):
    text=p.get_text()
    pages.append({'page':i+1,'text':text})
    # Content-aware whitespace crop: do not cut off dense figures (especially p.29).
    pix=p.get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False)
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    mask=im.convert('L').point(lambda x:255 if x<242 else 0)
    bbox=mask.getbbox()
    if bbox:
        l,t,r,b=bbox
        im=im.crop((max(0,l-15),max(0,t-15),min(im.width,r+15),min(im.height,b+15)))
    im.save(assets/f'p{i+1:03d}-crop.png')
    p.get_pixmap(matrix=fitz.Matrix(.7,.7)).save(assets/f'p{i+1:03d}-overview.png')
(assets/'pages.json').write_text(json.dumps(pages,ensure_ascii=False,indent=2),encoding='utf-8')
for start in range(0,len(doc),20):
    sheet=Image.new('RGB',(1400,1100),'#dddddd')
    draw=ImageDraw.Draw(sheet)
    for j in range(start,min(start+20,len(doc))):
        im=Image.open(assets/f'p{j+1:03d}-overview.png'); im.thumbnail((340,190))
        x=(j-start)%4*350; y=(j-start)//4*220
        sheet.paste(im,(x,y+22)); draw.text((x+5,y+4),f'PDF p.{j+1}',fill='black')
    sheet.save(assets/f'contact-{start+1:03d}.jpg')
print(assets)
