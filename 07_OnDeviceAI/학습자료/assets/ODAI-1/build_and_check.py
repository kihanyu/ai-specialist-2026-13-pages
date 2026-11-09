from pathlib import Path
import json,re,html
from urllib.parse import unquote
import mistune

BASE=Path(__file__).resolve().parent
ROOT=BASE.parents[1]
SOURCE=ROOT
if (ROOT/'ODAI-1').is_dir(): ROOT=ROOT/'ODAI-1'
PREFIX='../' if ROOT!=SOURCE else ''
FILES=[
 'ODAI-1_01_AI연산과성능.md','ODAI-1_02_실행환경.md',
 'ODAI-1_03_양자화기초.md','ODAI-1_04_PTQ와비균일양자화.md',
 'ODAI-1_05_QAT와정수추론.md','ODAI-1_06_LLM양자화.md']
TITLES=['AI 연산과 성능·메모리 병목','온디바이스 AI 실행 환경','수 표현과 선형 양자화의 원리','비균일 양자화와 PTQ 오차 제어','QAT와 정수 추론','고급 LLM 양자화와 적용 판단']
RANGES=[(1,15),(16,23),(24,38),(39,54),(55,62),(63,80)]
missing=[f for f in FILES if not (ROOT/f).exists()]
if missing: raise SystemExit('Waiting for chapters: '+str(missing))

intro='''# On-Device AI Part 1 — 교육생용 설명자료

원본: [삼성전자AI전문가교육-ODAI-1.pdf](삼성전자AI전문가교육-ODAI-1.pdf), 80쪽. 이 문서는 원본을 대체하는 실험 보고서가 아니라, 강의 내용을 이해하기 위한 해설과 교육용 보충 자료다. **원문 설명·보충·정정**을 구분하고 페이지 번호를 병기했다. 모델·장치 목록과 실험 결과는 원본에서 제시한 사례이며 최신 지원이나 보편적 우열을 뜻하지 않는다.

## 학습 방법과 목차

처음에는 1→6장 순서로 읽는다. 각 장의 목표와 용어를 확인하고 그림·예제를 따라간 다음 복습 문제를 풀어 본다. 장별 파일만 열어도 읽을 수 있으며, 이 파일에는 모든 장의 본문을 합쳤다.

'''
for i,(title,(start,end),file) in enumerate(zip(TITLES,RANGES,FILES),1):
    intro+=f'{i}. [{title}](#chapter-{i}) — 원본 p.{start}–{end} · [장별 파일]({file})\n'
intro+='''
- [부록: 학습 연결·선택 시나리오·용어 색인·종합 복습](#appendix)
- [원본 페이지별 찾아보기](#page-map)
- [목차 설계와 작성 체크리스트](ODAI-1_목차와_작성체크리스트.md)
- [최종 품질 검토서](ODAI-1_품질검토.md)

## 흐름도 보기

아래 그림은 편집 가능한 Obsidian Canvas와 같은 내용의 미리보기다. Canvas는 이 작업 폴더를 Obsidian 보관함으로 열거나 파일을 보관함 안에 복사해 편집할 수 있다. 일반 Markdown 뷰어에서는 PNG 미리보기로 확인한다. SVG는 확대용이다.

![전체 학습 흐름](assets/ODAI-1/learning-flow.png)

[학습 흐름 Canvas](assets/ODAI-1/learning-flow.canvas) · [SVG](assets/ODAI-1/learning-flow.svg)

![LLM 추론 흐름](assets/ODAI-1/inference-flow.png)

[추론 흐름 Canvas](assets/ODAI-1/inference-flow.canvas) · [SVG](assets/ODAI-1/inference-flow.svg)

![PTQ와 QAT 처리 흐름](assets/ODAI-1/quantization-flow.png)

[양자화 흐름 Canvas](assets/ODAI-1/quantization-flow.canvas) · [SVG](assets/ODAI-1/quantization-flow.svg)

이미지는 원본을 렌더링한 후 핵심 그림·표 영역을 선별해 Crop했다. 조밀하거나 여러 영역이 연결된 페이지, 그림이 없는 텍스트 페이지는 내용 전체를 보존한 여백 Crop을 사용했다. 각 그림 아래의 전체 내용 Crop 링크로 맥락을 대조할 수 있다. 조밀한 표·그림은 이미지를 열어 확대하고 본문의 재작성 표·수식을 함께 읽는다. 표지와 장 구분 페이지도 원본 대응을 위해 포함했다.

'''
intro=intro.replace('(assets/',f'({PREFIX}assets/').replace('](삼성전자AI전문가교육-ODAI-1.pdf)',f']({PREFIX}삼성전자AI전문가교육-ODAI-1.pdf)')
out=intro
statistics=[]
for i,(file,(start,end)) in enumerate(zip(FILES,RANGES),1):
    body=(ROOT/file).read_text(encoding='utf-8-sig')
    # Demote headings one level while preserving code fences.
    lines=[]; fenced=False
    for line in body.splitlines():
        if line.startswith('```'): fenced=not fenced
        if not fenced and re.match(r'^#{1,5} ',line): line='#'+line
        lines.append(line)
    out+=f'\n\n---\n\n<a id="chapter-{i}"></a>\n\n'+'\n'.join(lines)+'\n'
    imgs={int(x) for x in re.findall(r'p(\d{3})-crop\.png',body)}
    figures={int(x) for x in re.findall(r'p(\d{3})-figure\.png',body)}
    statistics.append(dict(chapter=i,file=file,chars=len(body),pages=sorted(imgs),missing_pages=sorted(set(range(start,end+1))-imgs),missing_figures=sorted(set(range(start,end+1))-figures),tables=len(re.findall(r'^\|\s*:?-',body,re.M))))
appendix=(ROOT/'ODAI-1_부록_학습연결과복습.md').read_text(encoding='utf-8')
out+='\n\n---\n\n<a id="appendix"></a>\n\n'+re.sub(r'^(#{1,5}) ',r'#\1 ',appendix,flags=re.M)
out+='\n\n<a id="page-map"></a>\n\n## 원본 페이지별 찾아보기\n\n| 원본 페이지 | 원본 주제 | 해설 장 | 원본 이미지 |\n|---|---|---|---|\n'
pages=json.loads((BASE/'pages.json').read_text(encoding='utf-8'))
overrides={1:'표지',2:'강의 구성',29:'Design Choices in LLM Quantization'}
for page in pages:
    n=page['page']; title=overrides.get(n,page['text'].splitlines()[0] if page['text'].splitlines() else '이미지 중심 슬라이드')
    ch=next(i for i,(a,b) in enumerate(RANGES,1) if a<=n<=b)
    out+=f'| p.{n} | {title.strip()} | [{ch}장](#chapter-{ch}) | [Crop]({PREFIX}assets/ODAI-1/p{n:03d}-crop.png) |\n'
target=ROOT/'ODAI-1_설명자료.md'
target.write_text(out,encoding='utf-8')

# Validate all authored Markdown, allowing the pending review report until the last run.
issues=[]; anchors=set(re.findall(r'<a id="([^"]+)"',out))
docs=list(ROOT.glob('ODAI-1_*.md'))
links_count=0
for f in docs:
    text=f.read_text(encoding='utf-8-sig')
    for url in re.findall(r'!?\[[^\]]*\]\(([^\n]+?)\)',text):
        url=url.strip().strip('<>')
        if re.match(r'^[a-zA-Z]+://',url) or url.startswith('mailto:'): continue
        path=unquote(url.split('#')[0])
        if not path: continue
        links_count+=1
        if not (f.parent/path).exists(): issues.append(dict(file=f.name,issue='missing local link',target=url))
    if '\ufffd' in text: issues.append(dict(file=f.name,issue='replacement character'))
    if text.count('```')%2: issues.append(dict(file=f.name,issue='unbalanced code fence'))
    if len(re.findall(r'^\$\$\s*$',text,re.M))%2: issues.append(dict(file=f.name,issue='unbalanced display math'))
    # A table row must have the same unescaped pipe count as its header.
    table=[]
    for lineno,line in enumerate(text.splitlines()+[''],1):
        if line.startswith('|'):
            count=len(re.findall(r'(?<!\\)\|',line))
            if table and count!=table[0][1]: issues.append(dict(file=f.name,line=lineno,issue='table pipe count mismatch',expected=table[0][1],actual=count))
            table.append((lineno,count))
        else: table=[]
for stat in statistics:
    if stat['missing_pages']: issues.append(dict(file=stat['file'],issue='missing page crops',pages=stat['missing_pages']))
    if stat['missing_figures']: issues.append(dict(file=stat['file'],issue='missing figure crops',pages=stat['missing_figures']))
canvas_stats=[]
for file in BASE.glob('*.canvas'):
    c=json.loads(file.read_text(encoding='utf-8')); nd={n['id']:n for n in c['nodes']}
    for edge in c['edges']:
        if edge['fromNode'] not in nd or edge['toNode'] not in nd: issues.append(dict(file=file.name,issue='invalid canvas endpoint'))
    nodes=list(nd.values())
    for i,a in enumerate(nodes):
        for b in nodes[i+1:]:
            if a['x']<b['x']+b['width'] and b['x']<a['x']+a['width'] and a['y']<b['y']+b['height'] and b['y']<a['y']+a['height']:
                issues.append(dict(file=file.name,issue='overlapping canvas nodes',nodes=[a['id'],b['id']]))
    canvas_stats.append(dict(file=file.name,nodes=len(nodes),edges=len(c['edges'])))
report=dict(chapters=statistics,total_pdf_pages=80,crop_files=len(list(BASE.glob('p???-crop.png'))),figure_files=len(list(BASE.glob('p???-figure.png'))),canvas=canvas_stats,local_links_checked=links_count,issues=issues)
(BASE/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')

md=mistune.create_markdown(escape=False,plugins=['table','strikethrough','task_lists','math'])
rendered=md(out)
preview='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><base href="../../"><style>
body{font:17px/1.8 'Malgun Gothic',sans-serif;color:#172439;max-width:1100px;margin:40px auto;padding:0 30px}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:15px;display:block;overflow:auto}th,td{border:1px solid #b8c5d3;padding:9px;text-align:left}th{background:#edf3fb}h1,h2,h3{line-height:1.5}h2{border-bottom:2px solid #c6d5e6;padding-top:30px}pre{white-space:pre-wrap;background:#f3f5f8;padding:15px}blockquote{border-left:4px solid #678bb3;padding-left:18px;color:#3e526d}a{color:#175bab}.math{overflow:auto}
</style><script>window.MathJax={tex:{inlineMath:[['$','$'],['\\\\(','\\\\)']]},options:{skipHtmlTags:['script','noscript','style','textarea','pre','code']}};</script><script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script></head><body>'''+rendered+'</body></html>'
if PREFIX: preview=preview.replace('<base href="../../">','<base href="../../ODAI-1/">')
(BASE/'preview.html').write_text(preview,encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
