from pathlib import Path
from build_flows import make

make('quantization-taxonomy','양자화 가지치기 지도 — 스칼라 대표값 배치와 벡터 부호화를 구별',[
 ('root',780,100,400,160,['Quantization 양자화','실수 → 유한한 대표값','배치 / 부호화 단위 구분']),
 ('linear',40,370,630,170,['Linear / Uniform — 선형·균일 스칼라','공유 scale 안에서 대표값 간격이 일정','복원: r ~ S(q - Z)']),
 ('nonlinear',720,370,630,170,['Nonlinear / Non-uniform — 비균일 스칼라','대표값 위치에 따라 간격이 달라짐','이 자료에서는 비균일이라는 의미로 사용']),
 ('vqaxis',1400,370,480,170,['Vector Quantization — 별도 분류축','분류 기준: 여러 원소의 공동 부호화','스칼라 간격 분류의 하위집합 아님']),
 ('sym',40,700,300,260,['대칭 선형','Zero point Z = 0','INT8 / INT4 등','q = round(r / S)','최종 코드 범위로 clip']),
 ('asym',370,700,300,260,['비대칭 선형','범위에 맞게 Z 선택','Z는 0일 수도 있음','q = round(r / S) + Z','최종 코드 범위로 clip']),
 ('log',720,700,300,260,['로그 · 거듭제곱','Log quantization','INQ: 0 또는 ±2^k','INQ는 점진 양자화와','재학습을 함께 사용']),
 ('scalar',1050,700,300,260,['기타 비균일 스칼라','NF4 / learned codebook','Binary-code: 강의의 예','FP4(E2M1), MX/NV','원소 대표값 간격 비균일']),
 ('vector',1400,700,480,260,['벡터 양자화의 강의 예','QuIP#: E8 격자 기반 codebook','AQLM: 여러 codebook 벡터의 합','여러 원소를 벡터로 묶어 공동 부호화','1차원 간격 기준을 그대로 적용하지 않음']),
 ('axis',40,1060,850,190,['별도 설계축 — 위 가지와 조합 가능','PTQ / QAT: 변환·학습 방식; static / dynamic: 결정 시점','per-tensor / channel / group / token: scale 공유 단위','Weight / Activation / KV: 양자화 대상']),
 ('methods',940,1060,940,190,['오차 제어·전처리 기법 — 독립적인 대표값 분류가 아님','RTN·AdaRound·BRECQ·OBQ·GPTQ: 반올림·재구성·오차 보상','SmoothQuant·AWQ: scaling; QuaRot·SpinQuant: 회전','블록 선형 형식 예: Q4_0 / Q4_1 / K-quant (구체 정의 확인)'])
],[('root','bottom','linear','top'),('root','bottom','nonlinear','top'),('root','bottom','vqaxis','top'),('linear','bottom','sym','top'),('linear','bottom','asym','top'),('nonlinear','bottom','log','top'),('nonlinear','bottom','scalar','top'),('vqaxis','bottom','vector','top')],1930,1300)

root=Path(__file__).resolve().parents[2]
if (root/'ODAI-1').is_dir(): root=root/'ODAI-1'
file=root/'ODAI-1_03_양자화기초.md'
text=file.read_text(encoding='utf-8')
heading='## 한눈에 보는 Linear / Nonlinear 양자화 가지치기 지도'
block='''## 한눈에 보는 Linear / Nonlinear 양자화 가지치기 지도

![Linear와 Nonlinear 양자화 기법의 가지치기 분류도](assets/ODAI-1/quantization-taxonomy.png)

[편집 가능한 Canvas 열기](assets/ODAI-1/quantization-taxonomy.canvas) · [확대용 SVG](assets/ODAI-1/quantization-taxonomy.svg)

**분류 기준:** 이 그림의 Linear는 공유 scale 안에서 대표값 간격이 일정한 **uniform/affine 양자화**, Nonlinear는 대표값 간격이 달라지는 **non-uniform 양자화**를 뜻한다. 신경망의 비선형 활성함수 분류와는 다르다. 아래 지도는 강의에서 다룬 대표 기법을 정리한 것이며 모든 양자화 방법을 망라한 목록은 아니다.

| 가지 | 대표 기법·표현 | 핵심 차이 | 본문 연결 |
|---|---|---|---|
| 선형·대칭 | Z=0인 INT8·INT4 affine 표현 | 실수 0을 코드 0으로 표현 | 이 장 3.7–3.8 |
| 선형·비대칭 | 범위에 따라 Z를 선택하는 affine 표현 | 치우친 범위를 활용; Z가 0일 수도 있음 | 이 장 3.7–3.8 |
| 비균일·로그 | Log quantization, INQ의 거듭제곱 값 | 0 또는 ±2^k 등 비균일 대표값 | 이 장 3.6, 4장 4.3 |
| 비균일·스칼라 | NF4, 학습 codebook, binary-code 조합, FP4 | 원소마다 비균일 대표값·조합값 선택 | 이 장 3.4, 4장 4.2–4.3 |
| 벡터 단위의 별도 분류 | QuIP#, AQLM | 여러 값을 공동 codeword로 표현; 스칼라 간격 기준과 구별 | 4장 4.4 |

**다른 분류축과 구별하기:** PTQ/QAT는 변환·학습 방식이고, per-channel/group은 scale 공유 단위다. GPTQ·AWQ·SmoothQuant·QuaRot 등은 오차 제어나 사전 변환 기법이며, 그 이름만으로 대표값이 선형인지 비균일인지 정해지는 것은 아니다. FP4는 지수 때문에 원소 대표값 간격이 일정하지 않으며 MXFP4·NVFP4는 FP4 원소에 블록 scale을 결합한 표현이다. VQ는 벡터 단위의 별도 분류축이므로 Non-uniform의 엄밀한 하위집합으로 두지 않았다. 특히 E8 격자에는 1차원 대표값 간격 기준을 그대로 적용하지 않는다. Binary-code 조합도 계수 선택에 따라 균일해질 수 있으며, 여기서는 4장의 비균일 예제를 가리킨다.

'''
if root.name=='ODAI-1': block=block.replace('(assets/','(../assets/')
if heading not in text:
    first,rest=text.split('\n',1)
    file.write_text(first+'\n\n'+block+rest.lstrip(),encoding='utf-8')
else:
    import re
    text=re.sub(r'## 한눈에 보는 Linear / Nonlinear 양자화 가지치기 지도\n.*?(?=> 원본 범위:)',lambda m:block,text,flags=re.S)
    file.write_text(text,encoding='utf-8')
print('Taxonomy inserted at top of chapter 3.')
