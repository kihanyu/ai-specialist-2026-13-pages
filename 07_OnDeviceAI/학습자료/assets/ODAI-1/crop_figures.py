from pathlib import Path
import json,re
import pymupdf as fitz
from PIL import Image,ImageDraw

base=Path(__file__).resolve().parent; root=base.parents[1]
doc=fitz.open(root/'삼성전자AI전문가교육-ODAI-1.pdf')
# Normalized coordinates selected from visual inspection of the original pages.
# Pages consisting of a single figure/table retain its entire body; text-only pages retain the content crop.
regions={
3:(.04,.28,.97,.89),4:(.03,.39,.97,.91),5:(.02,.17,.98,.94),6:(.51,.17,.98,.92),
7:(.13,.17,.85,.96),8:(.04,.17,.97,.94),9:(.02,.17,.98,.94),10:(.08,.61,.94,.93),
11:(.04,.27,.60,.94),12:(.02,.17,.99,.94),13:(.04,.18,.96,.94),14:(.02,.19,.98,.94),
15:(.65,.62,.98,.94),16:(.20,.18,.82,.94),17:(.17,.19,.86,.91),20:(.12,.19,.73,.94),
21:(.59,.12,.98,.95),22:(.02,.25,.98,.91),23:(.015,.20,.75,.86),24:(.34,.40,.70,.91),
25:(.54,.22,.98,.91),26:(.02,.17,.98,.94),27:(.26,.59,.90,.93),28:(.03,.65,.99,.91),
30:(.02,.66,.99,.94),31:(.03,.22,.98,.93),32:(.03,.20,.99,.93),33:(.03,.24,.97,.93),
34:(.03,.17,.98,.93),35:(.03,.19,.98,.94),36:(.02,.23,.98,.56),37:(.03,.20,.99,.94),
38:(.03,.18,.99,.93),39:(.68,.16,.96,.95),40:(.67,.44,.99,.92),41:(.03,.46,.98,.92),
42:(.61,.19,.98,.89),43:(.03,.25,.99,.89),44:(.59,.02,.99,.94),45:(.03,.39,.98,.94),
47:(.10,.25,.88,.94),49:(.03,.60,.98,.93),50:(.03,.40,.98,.94),51:(.60,.43,.99,.93),
52:(.25,.17,.80,.93),53:(.66,.18,.99,.93),54:(.05,.16,.96,.78),56:(.27,.60,.85,.91),
57:(.01,.46,.99,.94),58:(.57,.67,.99,.94),59:(.25,.26,.85,.91),60:(.03,.23,.98,.94),
61:(.03,.25,.99,.89),62:(.01,.16,.99,.94),64:(.16,.66,.98,.94),65:(.03,.45,.99,.94),
66:(.04,.40,.99,.94),67:(.28,.17,.83,.93),68:(.12,.26,.94,.93),69:(.02,.37,.99,.93),
70:(.03,.53,.99,.94),71:(.15,.37,.99,.93),73:(.58,.02,.99,.93),74:(.01,.17,.99,.94),
75:(.07,.43,.98,.93),76:(.03,.44,.99,.93),77:(.03,.61,.99,.91),78:(.04,.44,.99,.93),
79:(.20,.31,.99,.94),80:(.02,.14,.99,.94)
}
# Conservative overrides after checking all four figure contact sheets: retain
# complete context wherever a tight rectangle could truncate axes or diagrams.
for n in [3,4,11,15,17,20,25,27,39,40,42,49,50,53,56,59,64,65,69,73,75,77,79]:
    regions.pop(n,None)
regions[6]=(.55,.15,.99,.95)
regions[28]=(.03,.56,.99,.94)
regions[30]=(.02,.55,.99,.95)
regions[36]=(.02,.17,.99,.62)
regions[54]=(.03,.15,.99,.90)
regions[70]=(.02,.56,.99,.95)
for n in range(1,81):
    if n not in regions:
        im=Image.open(base/f'p{n:03d}-crop.png')
    else:
        p=doc[n-1]; a,b,c,d=regions[n]
        clip=fitz.Rect(p.rect.width*a,p.rect.height*b,p.rect.width*c,p.rect.height*d)
        pix=p.get_pixmap(matrix=fitz.Matrix(2,2),clip=clip,alpha=False)
        im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    im.save(base/f'p{n:03d}-figure.png')
for start in range(0,80,20):
    sheet=Image.new('RGB',(1600,1250),'#dde3eb'); draw=ImageDraw.Draw(sheet)
    for j in range(start,start+20):
        im=Image.open(base/f'p{j+1:03d}-figure.png');im.thumbnail((390,215))
        x=(j-start)%4*400;y=(j-start)//4*250
        sheet.paste(im,(x,y+25));draw.text((x+5,y+5),f'p.{j+1} / figure crop',fill='black')
    sheet.save(base/f'figures-contact-{start+1:03d}.jpg')
(base/'figure-regions.json').write_text(json.dumps({str(k):v for k,v in regions.items()},indent=2),encoding='utf-8')
docroot=root/'ODAI-1' if (root/'ODAI-1').is_dir() else root
for f in docroot.glob('ODAI-1_0[1-6]_*.md'):
    text=f.read_text(encoding='utf-8')
    # Preserve the original full-content crop as a linked context reference.
    text=re.sub(r'(!\[[^\]]*\]\(assets/ODAI-1/p(\d{3}))-crop\.png\)',r'\1-figure.png)\n\n[원본 전체 내용 Crop](assets/ODAI-1/p\2-crop.png)',text)
    f.write_text(text,encoding='utf-8')
print('80 figure crops saved; full-content context links retained.')
