from pathlib import Path
import re
source=Path(__file__).resolve().parents[2]
docs=source/'ODAI-1'
if docs.is_dir():
    for file in docs.glob('ODAI-1_*.md'):
        text=file.read_text(encoding='utf-8')
        text=re.sub(r'\]\((?:\.\./)?assets/','](../assets/',text)
        text=text.replace('](삼성전자AI전문가교육-ODAI-1.pdf)','](../삼성전자AI전문가교육-ODAI-1.pdf)')
        file.write_text(text,encoding='utf-8')
    print('Document links updated for ODAI-1 subfolder.')
