# LLM 원 실습

[LLM 전체 안내](../04_LLM/README.md) · [이론 학습 경로](../04_LLM/학습자료/00_학습안내.md)

LLM 실습의 기준 폴더입니다. Chapter 1~7과 추가 시각화 노트북을 보관합니다. 일부 노트북에는 학습용 미완성 빈칸이 있습니다. 이번 폴더 정리에서 노트북 전체 실행이나 모델 학습을 수행하지 않았습니다.

| 순서 | 원 실습 | 함께 읽을 이론 |
| --- | --- | --- |
| 1 | [벡터 공간](<Chapter_1_Exercise_Vector Space.ipynb>) | [관련 본문](../04_LLM/학습자료/02_AI_기본_수학.md) |
| 2 | [데이터셋](<Chapter_2_Exercise_Dataset.ipynb>) | [관련 본문](../04_LLM/학습자료/04_언어_모델_입력.md) |
| 3 | [Attention](<Chapter_3_Excercise_Attention.ipynb>) | [관련 본문](../04_LLM/학습자료/05_Attention_이해.md) |
| 4 | [GPT](<Chapter_4_Excercise_GPT.ipynb>) | [관련 본문](../04_LLM/학습자료/07_GPT_Layer들.md) |
| 5 | [사전학습](<Chapter_5_Excercise_Pretraining.ipynb>) | [관련 본문](../04_LLM/학습자료/10_모델_학습.md) |
| 6 | [분류 미세튜닝](<Chapter_6_Excercise_Finetuning_Classification.ipynb>) | [관련 본문](../04_LLM/학습자료/11_Fine_tuning과_LoRA_QLoRA.md) |
| 6 보충 | [LoRA](<Chapter_6_Excercise_Finetuning_Classification_LoRA.ipynb>) | [관련 본문](../04_LLM/학습자료/11_Fine_tuning과_LoRA_QLoRA.md) |
| 7 | [지시 미세튜닝](<Chapter_7_Exercise_Follow_Instructions.ipynb>) | [관련 본문](../04_LLM/학습자료/12_지시미세튜닝과_선호학습.md) |
| 7 보충 | [DPO](<Chapter_7_Exercise_Follow_Instructions_dpo.ipynb>) | [관련 본문](../04_LLM/학습자료/12_지시미세튜닝과_선호학습.md) |

[Multi-head Attention 추가 시각화](<Chapter_3_Excercise_Viz_Multi_head_attention(시험에 안나옴).ipynb>)는 파일명에 시험 제외 표시가 있는 보충 실습입니다. 기본 Attention의 head 분리·축 변환까지 제외된다고 해석하지 않습니다.

## 실행과 학습 점검

이 폴더를 작업 디렉터리로 사용하고 노트북의 준비 셀부터 실행하세요. Chapter 2는 `datas/`를 만들고 예제 텍스트를 내려받습니다. 사전학습 벡터·토크나이저·모델·데이터는 처음 사용할 때 외부 다운로드가 필요할 수 있습니다. 각 실습의 설치·메모리·실행 조건을 먼저 확인합니다.

| 실습 | 해설 없이 확인할 일 |
| --- | --- |
| 벡터 | 내적·norm·cosine과 영벡터 조건 설명 |
| 데이터셋 | 입력/정답 shift와 [B,T]→[B,T,C] 추적 |
| Attention | QKV·scale·미래 mask·softmax 축·head 결합 설명 |
| GPT | 정규화·FFN·두 잔차·LM head와 생성 반복 재구성 |
| 학습·미세튜닝 | 손실·기울기·갱신, 분류/응답 정답, LoRA의 학습 대상 구별 |
| SFT·DPO | 유효 정답 위치·EOS/PAD·응답 로그확률·reference 구별 |

시험 범위는 [출제포인트](../00_시험안내/13차수_AI인증시험_출제포인트.md)와 [실습 연관표](../00_시험안내/13차수_시험예상_체크리스트_이론_문항_연관표.md)를 참고하세요. 위 표는 자체 학습 점검 기준입니다.
