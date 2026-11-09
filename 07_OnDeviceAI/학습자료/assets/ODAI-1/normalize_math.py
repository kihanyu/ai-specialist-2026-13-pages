from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
if (root/'ODAI-1').is_dir(): root=root/'ODAI-1'
for f in sorted(root.glob('ODAI-1_0[1-6]_*.md')):
    text=f.read_text(encoding='utf-8-sig')
    text=text.replace('\\[','$$').replace('\\]','$$').replace('\\(','$').replace('\\)','$')
    parts=re.split(r'(\n\s*\n)',text)
    restored=0
    for i in range(0,len(parts),2):
        s=parts[i].strip()
        if s and not s.startswith(('$','#','|','`','!','>','-')) and '\\' in s and '=' in s and not re.search('[가-힣]',s):
            parts[i]='$$\n'+s+'\n$$'
            restored+=1
    f.write_text(''.join(parts),encoding='utf-8')
    print(f.name,'display blocks', ''.join(parts).count('\n$$'),'restored',restored)
