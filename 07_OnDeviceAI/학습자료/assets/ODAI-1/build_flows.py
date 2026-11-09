from pathlib import Path
import json, html
from PIL import Image, ImageDraw, ImageFont

BASE=Path(__file__).resolve().parent
FONT='C:/Windows/Fonts/malgun.ttf'
def make(name,title,nodes,edges,width,height):
    canvas_nodes=[]
    for ident,x,y,w,h,lines in nodes:
        canvas_nodes.append(dict(id=ident,type='text',x=x,y=y,width=w,height=h,text='\n\n'.join(lines),color='4'))
    canvas_edges=[dict(id=f'e{i}',fromNode=a,fromSide=sa,toNode=b,toSide=sb,toEnd='arrow') for i,(a,sa,b,sb) in enumerate(edges)]
    (BASE/f'{name}.canvas').write_text(json.dumps(dict(nodes=canvas_nodes,edges=canvas_edges),ensure_ascii=False,indent=2),encoding='utf-8')
    font=ImageFont.truetype(FONT,22); heading=ImageFont.truetype(FONT,28)
    im=Image.new('RGB',(width,height),'#f6f8fc'); d=ImageDraw.Draw(im)
    d.text((35,20),title,font=heading,fill='#10243e')
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">', '<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#375c85"/></marker></defs>',f'<rect width="100%" height="100%" fill="#f6f8fc"/><text x="35" y="50" font-family="Malgun Gothic,sans-serif" font-size="28" fill="#10243e">{html.escape(title)}</text>']
    nd={n[0]:n for n in nodes}
    def point(n,side):
        _,x,y,w,h,_=n
        return {'right':(x+w,y+h/2),'left':(x,y+h/2),'top':(x+w/2,y),'bottom':(x+w/2,y+h)}[side]
    for a,sa,b,sb in edges:
        p=point(nd[a],sa); q=point(nd[b],sb)
        d.line([p,q],fill='#375c85',width=3)
        import math
        ang=math.atan2(q[1]-p[1],q[0]-p[0]); length=12
        pts=[q,(q[0]-length*math.cos(ang-.45),q[1]-length*math.sin(ang-.45)),(q[0]-length*math.cos(ang+.45),q[1]-length*math.sin(ang+.45))]
        d.polygon(pts,fill='#375c85')
        svg.append(f'<path d="M{p[0]},{p[1]} L{q[0]},{q[1]}" stroke="#375c85" stroke-width="3" marker-end="url(#arr)"/>')
    for ident,x,y,w,h,lines in nodes:
        d.rounded_rectangle((x,y,x+w,y+h),radius=15,fill='white',outline='#557aa4',width=2)
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="15" fill="white" stroke="#557aa4" stroke-width="2"/>')
        assert len(lines)*35+30<=h,(name,ident,'text height')
        for i,line in enumerate(lines):
            assert d.textbbox((0,0),line,font=font)[2]<=w-32,(name,ident,line,'text width')
            d.text((x+16,y+15+i*35),line,font=font,fill='#10243e')
            svg.append(f'<text x="{x+16}" y="{y+40+i*35}" font-family="Malgun Gothic,sans-serif" font-size="22" fill="#10243e">{html.escape(line)}</text>')
    for i,a in enumerate(nodes):
        assert a[1]>=0 and a[2]>=0 and a[1]+a[3]<=width and a[2]+a[4]<=height
        for b in nodes[i+1:]:
            assert not (a[1]<b[1]+b[3] and b[1]<a[1]+a[3] and a[2]<b[2]+b[4] and b[2]<a[2]+a[4]),(name,a[0],b[0],'overlap')
    svg.append('</svg>')
    (BASE/f'{name}.svg').write_text('\n'.join(svg),encoding='utf-8')
    im.save(BASE/f'{name}.png')

make('learning-flow','Part 1 학습 흐름: 연산 이해에서 배포 판단까지',[
 ('a',40,110,340,160,['1. AI 연산과 병목','CNN / Transformer','메모리와 Roofline']),
 ('b',470,110,340,160,['2. 실행 환경','모델 / 프레임워크','GPU·NPU / 지원 커널']),
 ('c',900,110,340,160,['3. 양자화 기초','비트·scale·zero point','정수 연산과 Q/DQ']),
 ('d',900,410,340,160,['4. PTQ 오차 제어','분포·calibration','rounding·granularity']),
 ('e',470,410,340,160,['5. QAT','fake quantization','STE와 재학습']),
 ('f',40,410,340,160,['6. LLM 적용 판단','outlier와 고급 기법','정확도·용량·실측 성능'])
],[('a','right','b','left'),('b','right','c','left'),('c','bottom','d','top'),('d','left','e','right'),('e','left','f','right')],1290,630)

make('inference-flow','LLM 추론 흐름: Prefill에서 Decode로 (batch=1 예시)',[
 ('p1',40,110,320,160,['Prefill: 입력 토큰들','프롬프트를 함께 처리','여러 토큰의 병렬 연산']),
 ('p2',440,110,320,160,['GEMM + Attention','Q·K·V 계산','causal mask 적용']),
 ('p3',840,110,320,160,['KV cache 생성','레이어별 K·V 보관','첫 출력 토큰 선택']),
 ('d1',840,440,320,160,['Decode: 새 토큰 1개','직전 출력 토큰 입력','순차 생성 단계']),
 ('d2',440,440,320,160,['가중치 읽기 + GEMV','새 Q·K·V 계산','KV cache 읽기·추가']),
 ('d3',40,440,320,160,['Attention + 다음 토큰','과거 K·V 활용','종료까지 Decode 반복'])
],[('p1','right','p2','left'),('p2','right','p3','left'),('p3','bottom','d1','top'),('d1','left','d2','right'),('d2','left','d3','right')],1210,660)

make('quantization-flow','PTQ / QAT 처리 흐름: 둘 다 실제 장치 검증이 필요',[
 ('p1',30,120,310,160,['PTQ: 사전학습 모델','대표 calibration 데이터','목표 비트·범위 선택']),
 ('p2',400,120,310,160,['오프라인 보정','clipping / scale 탐색','rounding·가중치 보정']),
 ('p3',770,120,310,160,['양자화·변환','대상 backend 연산 변환','packing·커널 연결']),
 ('q1',30,430,310,160,['QAT: 사전학습 모델','학습·검증 데이터','fake quantization 삽입']),
 ('q2',400,430,310,160,['학습 / fine-tuning','forward: 양자화 모사','backward: STE 근사']),
 ('q3',770,430,310,160,['내보내기·변환','학습된 범위 반영','정수 커널·fallback 확인']),
 ('v',1170,270,340,180,['공통: 실제 장치 평가','품질·TTFT·토큰 지연','peak RAM·전력·발열','미달 시 설정 재선택'])
],[('p1','right','p2','left'),('p2','right','p3','left'),('q1','right','q2','left'),('q2','right','q3','left'),('p3','right','v','top'),('q3','right','v','bottom')],1560,650)
print('Created 3 Canvas, 3 SVG and 3 PNG; geometry and text-fit checks passed.')
