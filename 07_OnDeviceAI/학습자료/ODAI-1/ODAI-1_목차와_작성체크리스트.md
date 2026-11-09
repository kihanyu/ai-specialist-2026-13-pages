# On-Device AI Part 1 — 목차와 집필 기준

원본: `삼성전자AI전문가교육-ODAI-1.pdf`, 총 80쪽. 페이지 번호는 PDF의 1부터 시작하는 실제 페이지 번호다.

## 구성 분석

원본 p.2는 이틀 전체 과정의 계획이다. 이 PDF의 실질 범위는 첫날의 AI 연산·성능, 온디바이스 실행 환경, 양자화 기초와 고급 LLM 양자화다. Pruning, KD, KV 최적화, speculative decoding, FlashAttention은 Part 2 예고이며 이 문서에서 학습 완료한 주제로 취급하지 않는다.

원본의 흐름을 유지하면서 선수 개념을 먼저 설명한다. **연산 이해 → 메모리·성능 병목 → 실행 환경 → 수 표현과 선형 양자화 → 양자화 오차 제어 → QAT → LLM 적용·선택**으로 연결한다. 제목이 없고 이미지가 대부분인 p.7, 8, 20, 22, 23, 29, 43, 47, 52, 59, 61, 62, 67, 74도 누락하지 않는다.

## 최종 목차

1. **AI 연산과 성능·메모리 병목** — p.1–15
   - 강의 목표와 Part 1/2 범위
   - DNN, CNN, Transformer, LLM, VLM
   - Prefill·Decode·KV cache와 GEMM·GEMV
   - Cloud/On-Device 비교와 가중치 용량 산정
   - Roofline, 파라미터·활성값·MACs·FLOPs
   - Peak memory, LLM 메모리, MHA·MQA·GQA
2. **온디바이스 AI 실행 환경** — p.16–23
   - 모델·프레임워크·하드웨어의 세 축
   - 모델 압축 지도와 소형 LLM
   - llama.cpp, GGUF와 GGML의 구분
   - ExecuTorch와 AOT·backend delegation
   - NPU 및 Hailo 개발·실행 스택
3. **수 표현과 선형 양자화의 원리** — p.24–38
   - 상단: Linear / Nonlinear 양자화 가지치기 Canvas와 분류표
   - 비트 수·표현 범위·정밀도
   - FP32·FP16·BF16·INT8, MXFP4·NVFP4
   - p.29 설계 선택 지도
   - 균일·비균일 양자화
   - Scale·zero point·clipping·복원 오차
   - 선형 양자화 수치 예제와 정수 행렬곱
   - 대칭·비대칭, Q/DQ 및 fusion 비용
4. **비균일 양자화와 PTQ 오차 제어** — p.39–54
   - NF4, INQ, binary code, learned codebook
   - QuIP#·AQLM 벡터 양자화
   - PTQ와 calibration·clipping
   - Static·dynamic, RTN·AdaRound·BRECQ·OBQ
   - Per-tensor·channel·group·token granularity
   - Weight equalization과 PTQ의 한계
5. **QAT와 정수 추론** — p.55–62
   - PTQ와 QAT 비교, 학습 비용과 선택 조건
   - Fake quantization, FP master weight
   - STE의 forward/backward와 근사 한계
   - 학습과 실제 정수 추론의 구분
   - Integer-only nonlinear 연산과 I-BERT
6. **고급 LLM 양자화와 적용 판단** — p.63–80
   - Weight-only·W/A·KV 양자화와 outlier
   - LLM.int8·SmoothQuant
   - QuaRot·SpinQuant와 회전 불변성
   - GPTQ·AWQ와 선택 비교
   - LoRA·QLoRA·NF4·double quantization
   - llama.cpp 형식 분류와 배포 전 검증
   - 종합 선택 시나리오, 용어 색인, 최종 복습

별도 부록에는 장 사이의 학습 연결, 적용 시나리오, 측정 기록 양식, 통합 용어 색인과 종합 복습을 둔다. 통합본 끝에는 원본 80쪽의 찾아보기를 제공한다.

## 모든 장에 적용할 내용 구성 체크리스트

- [x] 학습 목표와 필요한 선수 개념을 먼저 설명한다.
- [x] 원본 페이지와 소절의 대응을 명시한다.
- [x] 새 용어를 영문·한글·정의·역할 순으로 설명한다.
- [x] 개념 → 필요한 이유 → 동작 원리 → 예시 → 한계 순으로 전개한다.
- [x] 원문 설명, 교육용 보충, 원문 정정·주의를 구별한다.
- [x] 모든 배정 페이지의 핵심 본문 Crop을 상대 경로로 삽입하고 읽는 방법을 설명한다. 표지·구분 페이지는 그 성격을 밝힌다.
- [x] 비교가 필요한 개념은 동일한 비교축을 갖는 Markdown 표로 작성한다.
- [x] 식의 모든 변수와 단위를 정의하고, 전제·배치 크기·비트 수를 밝힌다.
- [x] 계산 예제는 직접 검산하고 GB/GiB, MAC/FLOP, 저장/실행 메모리를 구분한다.
- [x] 흐름이 필요한 곳은 통합 Canvas의 관련 흐름을 참조한다. Canvas는 assets에 두고 SVG 미리보기를 제공한다.
- [x] 실험 결과는 해당 모델·데이터·하드웨어 조건의 결과로 설명하고 일반화하지 않는다.
- [x] 소프트웨어 지원·모델 목록은 원본 시점의 예시임을 밝히고 최신 지원을 단정하지 않는다.
- [x] 장 요약, 흔한 오해, 복습 질문과 해설을 포함한다.
- [x] 다음 장으로 연결되는 설명을 제공한다.

## 장별 추가 검토 항목

| 장 | 반드시 확인할 사항 |
|---|---|
| 1 | KV cache의 일반식에서 KV head 수를 정의한다. p.12의 244/224 혼용과 파라미터·용량 오기를 검산한다. batch=1 decode 병목을 보편 명제로 쓰지 않는다. |
| 2 | GGUF는 파일 형식, GGML은 텐서 연산 라이브러리다. NPU TOPS를 실제 지연시간으로 등치하지 않는다. 모델 이름·버전은 강의 원문 예시로 취급한다. |
| 3 | clipping을 포함한 식을 사용한다. FP4 scale metadata를 포함한 유효 bits/value를 계산한다. p.34의 반올림 근사를 설명한다. |
| 4 | NF4의 분포 가정을 밝힌다. PTQ가 모든 최적화·보정까지 금지하는 것은 아님을 설명한다. ReLU는 선형이 아닌 양의 동차 함수다. |
| 5 | QAT는 반드시 전체 모델을 처음부터 학습하는 것이 아니다. STE는 정확한 미분이 아니다. QAT가 모든 연산의 정수 실행을 보장하지 않는다. |
| 6 | AWQ의 관찰용 FP16 보존과 최종 scaling 기법을 구별한다. 회전 행렬의 역행렬은 전치이지 행렬 자체나 원소별 역수가 아니다. QLoRA의 저장·계산·학습 대상을 구분한다. IQ 전체를 GPTQ와 동일시하지 않는다. |

## 통합·최종 품질 검토 체크리스트

- [x] p.1–80 모두 대응 소절과 이미지가 있는지 기계적으로 확인한다.
- [x] 각 장이 공통 구성 기준을 충족하는지 검토한다.
- [x] 용어·행렬 방향·기호·페이지 표기를 통일한다.
- [x] Markdown 링크·이미지·Canvas 참조가 실제 파일로 연결되는지 확인한다.
- [x] Canvas 노드가 겹치지 않고 화살표·텍스트가 잘리지 않는지 확인한다.
- [x] 선수 개념 → 본론 → 적용 판단 간 지식의 공백을 점검한다.
- [x] 원본의 오류·불명확한 주장·시점 의존 정보가 확정적 사실로 옮겨지지 않았는지 점검한다.
- [x] 검토 결과, 수정 사항, 검증 범위와 남은 한계를 별도 품질 검토서에 기록한다.
