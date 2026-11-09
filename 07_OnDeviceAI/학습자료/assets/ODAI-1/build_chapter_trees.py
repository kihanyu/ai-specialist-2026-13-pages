"""Add conceptual trees only where they complement the existing tables/flows."""
from pathlib import Path
import re
from build_flows import make

BASE=Path(__file__).resolve().parent
DOCS=BASE.parents[1]/'ODAI-1'

make('deployment-components-tree','온디바이스 실행 구성 — 구성요소의 역할을 구분하는 지도',[
 ('root',620,100,500,150,['온디바이스 AI 실행 구성','모델 + 실행 소프트웨어 + 하드웨어','각 가지를 함께 맞춰야 실행 가능']),
 ('model',40,370,500,150,['1. 모델 — 무엇을 계산하는가?','과제 품질과 자원 요구를 결정','관련: 2.2–2.3절']),
 ('software',620,370,500,150,['2. 실행 소프트웨어 — 어떻게 실행하는가?','모델 준비·변환·연산 호출을 담당','관련: 2.4–2.6, 2.8절']),
 ('hardware',1200,370,500,150,['3. 하드웨어 — 어디에서 실행하는가?','연산·메모리·전력 제약을 제공','관련: 2.7–2.8절']),
 ('m',40,650,500,240,['소형 모델: 과제에 맞는 크기 선택','모델 압축 수단의 예','양자화 / pruning / 저랭크 분해','지식 증류 / 파라미터 공유','여러 압축 수단을 함께 적용 가능']),
 ('s',620,650,500,240,['실행 체계 예: llama.cpp / ExecuTorch','개발 측: export·compiler·SDK','장치 측: runtime·backend·driver','GGUF: 파일 형식 / GGML: 연산 라이브러리','Hailo 스택: 개발·실행 환경 사례']),
 ('h',1200,650,500,240,['연산 장치 예: CPU / GPU / NPU','내부 메모리와 외부 메모리의 협력','커널·자료형·대역폭·전력 지원 확인','PIM: 메모리 내부·근처 연산 접근','PIM은 CPU/GPU/NPU와 다른 설계 관점']),
 ('note',40,990,1660,150,['읽는 법: 화살표는 구성·예시 관계이며 실행 순서가 아니다. 각 목록은 대표 예이며 서로 배타적인 선택지가 아니다.','모델 파일이 작아도 backend가 연산·shape·양자화 형식을 지원하지 않으면 원하는 가속기를 쓰지 못할 수 있다.','실제 준비·실행 순서는 본문의 export·compile·runtime 설명과 기존 흐름도를 함께 읽는다.'])
],[('root','bottom','model','top'),('root','bottom','software','top'),('root','bottom','hardware','top'),('model','bottom','m','top'),('software','bottom','s','top'),('hardware','bottom','h','top')],1750,1190)

make('ptq-error-control-tree','PTQ 오차 제어 — 무엇을 조정하는지에 따라 수단을 묶어 보기',[
 ('root',620,100,500,150,['PTQ 오차를 줄이는 세 가지 관점','양자화 설정과 보정 수단을 조합','원인 확인 후 필요한 수단 선택']),
 ('range',40,370,500,150,['1. 대표 입력과 범위를 조정','값이 잘리거나 한 코드에 뭉치는가?','관련: 4.5절']),
 ('round',620,370,500,150,['2. 반올림·출력 오차를 조정','가중치 오차가 출력에 크게 전파되는가?','관련: 4.6절']),
 ('scale',1200,370,500,150,['3. 공유 단위와 분포를 조정','서로 다른 채널 범위를 함께 쓰는가?','관련: 4.7–4.8절']),
 ('r',40,650,500,240,['Calibration: 대표 입력·통계 수집','범위 선택: min/max·percentile·MSE','Clipping: 극단값과 보통 값의 오차 절충','Static / dynamic: 범위 결정 시점','Dynamic이 항상 더 정확한 것은 아님']),
 ('q',620,650,500,240,['RTN: 각 값의 최근접 반올림','AdaRound: 반올림 방향 최적화','BRECQ: 여러 연산의 block 재구성','OBQ: 2차 정보와 남은 가중치 보상','각 기법의 비용과 목적함수는 다름']),
 ('g',1200,650,500,240,['Per-channel / group: scale 공유 범위','Weight equalization: 채널 범위 균등화','Bias correction: 평균적인 출력 이동 보정','Granularity와 static/dynamic은 별도 축','ReLU equalization은 양의 동차성 활용']),
 ('note',40,990,1660,150,['읽는 법: 관점별 도구 지도다. 세 가지는 배타적인 알고리즘 분류나 고정된 처리 순서가 아니며 서로 조합할 수 있다.','NF4·INQ·codebook·QuIP#·AQLM의 표현 분류는 3장 상단 지도와 이 장 4.2–4.4절에서 별도로 확인한다.','목표 미달 시 QAT를 검토하되, calibration에서의 오차와 별도 평가·실제 장치에서의 품질·성능을 구별한다.'])
],[('root','bottom','range','top'),('root','bottom','round','top'),('root','bottom','scale','top'),('range','bottom','r','top'),('round','bottom','q','top'),('scale','bottom','g','top')],1750,1190)

make('llm-methods-tree','고급 LLM 기법 — 추론 양자화 수단과 미세조정 목적을 구분',[
 ('root',760,100,500,150,['고급 LLM 기법의 개념 지도','기법의 주된 수단과 목적을 구분','비트·대상·커널 선택은 함께 검토']),
 ('inference',310,370,1000,150,['추론 양자화 — 아래는 주된 오차 제어 수단별 묶음','가중치·활성값·KV 중 실제 대상과 비트 수는 기법별로 다름','LLM.int8 / SmoothQuant / 회전 / GPTQ / AWQ']),
 ('training',1530,370,500,150,['업무 미세조정 — 학습 메모리 절약','추론 가속 기법과 목적을 구별','QLoRA']),
 ('split',40,670,340,250,['고정밀 경로로 분리','LLM.int8()','일반 feature: INT8 경로','outlier: 고정밀 경로','관련: 6.3절']),
 ('scaling',410,670,340,250,['Scaling으로 오차 완화','SmoothQuant: W/A 난도 이전','AWQ: 중요 weight 채널 보호','같은 상쇄식, 다른 목표','관련: 6.4, 6.7절']),
 ('rotation',780,670,340,250,['회전으로 outlier 분산','QuaRot: 회전 변환 활용','SpinQuant: 회전 행렬 학습','구조에 맞춰 삽입·상쇄','관련: 6.5절']),
 ('reconstruct',1150,670,340,250,['재구성과 오차 보상','GPTQ','국소 출력 재구성 목적','근사 2차 정보로 보정','관련: 6.6절']),
 ('qlora',1530,670,500,250,['QLoRA: 고정한 저비트 base + LoRA 학습','NF4: 기반 가중치의 대표 저장 표현','Double quant: scale 상수 추가 양자화','Paged optimizer: 메모리 급증 관리','저장 dtype·계산 dtype·학습 대상 구분','관련: 6.8절']),
 ('note',40,1030,1990,150,['읽는 법: 주된 설명 수단을 기준으로 묶은 학습 지도이며 서로 배타적인 분류나 성능 순위가 아니다. 기법을 조합할 수도 있다.','W/A/KV는 대상 텐서의 축, W4A16 등의 표기는 정밀도 축이다. 위 알고리즘 이름만으로 모든 실행 조건이 정해지지는 않는다.','llama.cpp의 Q4·K·IQ·TQ·FP4는 저장·실행 형식의 분류이며 이 알고리즘들과 별도 축이다. 6.9절에서 확인한다.'])
],[('root','bottom','inference','top'),('root','bottom','training','top'),('inference','bottom','split','top'),('inference','bottom','scaling','top'),('inference','bottom','rotation','top'),('inference','bottom','reconstruct','top'),('training','bottom','qlora','top')],2080,1230)

sections=[
 ('ODAI-1_02_실행환경.md','실행 구성요소 가지치기 지도','deployment-components-tree',
  '모델·실행 소프트웨어·하드웨어는 함께 맞춰야 하는 구성요소다. 아래 그림은 각 요소의 역할과 대표 예를 묶어 보여준다. 화살표는 실행 순서나 소프트웨어가 하드웨어를 포함한다는 뜻이 아니다. 상세 배포 순서는 본문의 흐름 설명을 따른다.'),
 ('ODAI-1_04_PTQ와비균일양자화.md','PTQ 오차 제어 가지치기 지도','ptq-error-control-tree',
  '여러 오차 제어 수단을 무엇을 조정하는지에 따라 묶었다. 대표 입력·범위, 반올림·출력 재구성, 공유 단위·분포는 서로 조합하는 관점이며 배타적인 알고리즘 계열이나 고정 절차가 아니다. 표현 방식 자체의 분류는 3장 기존 지도와 이 장 4.2–4.4절을 함께 읽는다.'),
 ('ODAI-1_06_LLM양자화.md','고급 LLM 기법 가지치기 지도','llm-methods-tree',
  '여러 기법의 이름을 외우기 전에 주된 수단과 목적을 구분한다. 추론 양자화의 오차 제어 수단과 QLoRA의 업무 미세조정 목적을 나누었다. 기법 간 조합이 가능하므로 이 그림을 배타적인 분류나 성능 순위로 읽지 않는다. W/A/KV 대상과 llama.cpp 저장 형식은 별도 설계축이다.')
]
for filename,title,asset,description in sections:
    file=DOCS/filename
    text=file.read_text(encoding='utf-8')
    block=f'## {title}\n\n![{title}](../assets/ODAI-1/{asset}.png)\n\n[편집 가능한 Canvas](../assets/ODAI-1/{asset}.canvas) · [확대용 SVG](../assets/ODAI-1/{asset}.svg)\n\n{description}\n\n'
    marker=f'## {title}\n'
    if marker not in text:
        first,rest=text.split('\n',1)
        text=first+'\n\n'+block+rest.lstrip()
    else:
        text=re.sub(re.escape(marker)+r'.*?(?=\n(?:원본 범위:|\*\*원본 범위:|> 원본 범위:))',lambda _:block.rstrip(),text,flags=re.S)
    file.write_text(text,encoding='utf-8')
print('Trees added to chapters 2, 4 and 6 only; chapter 3 existing tree retained.')
