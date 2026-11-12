/* RAG 교안 전용. 결정적 교육용 계산이며 LLM·벡터 DB·SQL·MCP·외부 API를 실행하지 않는다. */
(() => {
  'use strict';
  const C = {input:'#2463a6',output:'#7546a5',valid:'#167453',error:'#bd5a16',ink:'#23364d',line:'#c6d2df',paper:'#f6f8fc'};
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (v, n=6) => v === null ? '정의 안 됨' : Number.isInteger(v) ? String(v) : Number(v).toFixed(n);
  const sum = xs => xs.reduce((a,b)=>a+b,0);
  const dot = (a,b) => sum(a.map((x,i)=>x*b[i]));
  const softmax = xs => { const m=Math.max(...xs), es=xs.map(x=>Math.exp(x-m)), z=sum(es); return es.map(x=>x/z); };
  const rng = (key,label,min,max,step=1) => ({key,label,type:'range',min,max,step});
  const sel = (key,label,options) => ({key,label,type:'select',options:options.map(([value,label])=>({value:String(value),label}))});
  const stages = xs => xs.map(([title,text])=>({title,text}));
  const quiz = (prompt,options,answer,explanation) => ({prompt,options,answer,explanation});
  const table = (headers,rows,caption) => `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(caption)}" style="overflow-x:auto"><table style="min-width:${Math.max(360,headers.length*100)}px"><caption>${esc(caption)}</caption><thead><tr>${headers.map(x=>`<th scope="col" style="overflow-wrap:normal;word-break:normal">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((x,i)=>`<${i?'td':'th scope="row"'} style="overflow-wrap:normal;word-break:normal${typeof x==='number'||/^[+−-]?\d+(?:\.\d+)?$/.test(String(x))?';white-space:nowrap':''}">${esc(x)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const para = text => `<p>${esc(text)}</p>`;
  const advance = (current, previous) => `<section class="rag-current-computation" aria-label="이번 단계 계산" style="border-left:3px solid ${C.output};padding:.5rem .8rem;margin-bottom:.8rem">${current}</section><details class="rag-previous-computations"><summary>입력·앞선 단계 다시 보기</summary>${previous}</details>`;
  const svg = (title,body,h=240) => `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(title)}" style="overflow-x:auto"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" viewBox="0 0 660 ${h}" style="width:100%;height:auto;min-width:600px;max-width:900px"><title>${esc(title)}</title>${body}</svg></div>`;
  const txt = (x,y,text,color=C.ink,size=15) => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-family="sans-serif">${esc(text)}</text>`;
  const bars = (rows,max,title) => svg(title,rows.map(([label,value,color],i)=>txt(8,30+i*43,label)+`<rect x="210" y="${12+i*43}" width="${Math.max(0,value)/max*310}" height="25" fill="${color||C.output}"/>`+txt(530,30+i*43,fmt(value))).join('')+txt(210,rows.length*43+20,`공통 축 0–${fmt(max)} · ${title}`,C.ink,13),rows.length*43+40);
  const note = para('교육용 예제 계산입니다. 실제 LLM·DB·API를 실행하거나 성능·확신도를 측정하지 않습니다. 표시만 반올림하며 중간 계산은 그대로 사용합니다.');
  const out = (html,explanation,metrics,data,context) => ({html:stageHint(context)+html+note,explanation,metrics:stageMetrics(context,data,metrics),data});
  const corpus = ['machine learning basics','machine translation','deep learning machine learning methods','refund policy'];
  const tokens = corpus.map(d=>d.split(' '));
  const vocab = [...new Set(tokens.flat())];
  const postings = t => tokens.flatMap((ts,i)=>ts.includes(t)?[i+1]:[]);

  const modules = {
    'rag-posting': {
      title:'역색인 AND: 두 커서가 놓치지 않는 문서',
      intro:'원문 네 문서의 posting list를 문서 ID 순서로 병합합니다. 같은 ID는 반환하고 작은 ID 쪽만 전진시켜 교집합을 계산합니다. 결과의 ID 순서는 관련성 순위와 다릅니다.',
      defaults:{a:'machine',b:'learning'},
      controls:[sel('a','첫 term',[...vocab,'absent'].map(x=>[x,x])),sel('b','둘째 term',[...vocab,'absent'].map(x=>[x,x]))],
      steps:stages([['목록','각 term이 등장한 문서 ID를 확인합니다.'],['첫 비교','두 커서가 가리키는 ID를 비교합니다.'],['둘째 비교','작은 ID만 옮기는 이유를 확인합니다.'],['셋째 비교','일치한 문서를 결과에 누적합니다.'],['종료','한 목록 끝에서 안전하게 멈춥니다.']]),
      compute(p,step) {
        const a=postings(p.a),b=postings(p.b),trace=[],result=[]; let i=0,j=0;
        while(i<a.length&&j<b.length){const x=a[i],y=b[j],same=x===y;if(same)result.push(x);trace.push({i,j,x,y,action:same?'일치: 반환, 두 커서 전진':x<y?'첫 커서만 전진':'둘째 커서만 전진',result:[...result]});if(x<=y)i++;if(y<=x)j++;}
        const n=step===4?trace.length:Math.min(step,trace.length),frame=trace[Math.min(n,trace.length-1)];
        const draw=(xs,y,label,idx)=>txt(8,y+23,label)+xs.map((x,k)=>`<rect x="${180+k*115}" y="${y}" width="95" height="38" fill="${k===idx?C.input:C.paper}" stroke="${C.input}"/>`+txt(200+k*115,y+25,`d${x}`,k===idx?'white':C.ink)).join('');
        let html=svg('문서 ID 오름차순 posting list와 현재 비교 커서',draw(a,20,p.a,step<4&&frame?frame.i:-1)+draw(b,100,p.b,step<4&&frame?frame.j:-1)+txt(8,198,`현재 반환: ${n?trace[n-1].result.map(x=>'d'+x).join(', ')||'없음':'없음'}`,C.valid),225);
        html+=table(['문서','원문'],corpus.map((d,k)=>['d'+(k+1),d]),'같은 전처리: 소문자·공백 분할');
        if(n)html+=table(['비교','첫 ID','둘째 ID','커서 동작','누적 반환'],trace.slice(0,n).map((t,k)=>[k+1,'d'+t.x,'d'+t.y,t.action,t.result.map(x=>'d'+x).join(', ')||'없음']),'실제로 수행한 비교');
        if(step===4)html+=para(`AND 결과: ${result.map(x=>'d'+x).join(', ')||'없음'}. 한쪽의 남은 원소가 없으므로 추가 일치는 없습니다.`);
        return out(html,`${a.length}개와 ${b.length}개 목록을 ${trace.length}회 비교합니다. ${result.length}개 일치는 포함 조건의 결과이며 BM25 Top-K 확정 조건이 아닙니다. 빈 목록은 비교 없이 빈 교집합을 반환합니다.`,[['전체 비교',trace.length],['교집합 크기',result.length]],{a,b,trace,result},{id:'rag-posting',step,p});
      },
      question:quiz('두 커서의 ID가 d2와 d3이면 어느 쪽을 옮길까요?',['d2 쪽만 전진','두 커서 모두 전진','d3 쪽만 전진'],0,'오름차순이므로 d2는 다른 목록의 현재 d3 및 이후와 같을 수 없습니다. d3은 남겨 두어야 합니다.')
    },

    'rag-bm25': {
      title:'TF-IDF와 BM25: 같은 네 문서, 다른 빈도 가중치',
      intro:'본문과 같은 N=4, 길이 [3,2,5,2], avgdl=3을 고정합니다. TF-IDF는 f/|d|×ln(N/df), BM25는 원시 f와 양수 IDF 변형을 사용하고 질의의 고유 term만 합산합니다.',
      defaults:{query:'machine learning',k1:1.2,b:0.75},
      controls:[sel('query','질의',[['machine learning','machine learning'],['learning','learning'],['machine learning learning','machine learning learning (중복)'],['refund policy','refund policy'],['absent','어휘 밖 absent']]),rng('k1','포화 계수 k₁',0,3,0.1),rng('b','길이 보정 b',0,1,0.05)],
      steps:stages([['빈도','문서별 길이와 원시 term 횟수를 셉니다.'],['희귀도','총 횟수와 문서 수 df를 구별합니다.'],['기여','TF-IDF와 BM25의 term별 기여를 계산합니다.'],['합산과 포화','같은 기준에서 순위와 반복의 포화를 확인합니다.']]),
      compute(p,step) {
        const terms=[...new Set(p.query.trim().split(/\s+/).filter(Boolean))],k1=Number(p.k1),b=Number(p.b),avgdl=sum(tokens.map(x=>x.length))/tokens.length;
        const stats=terms.map(term=>{const fs=tokens.map(ts=>ts.filter(t=>t===term).length),df=fs.filter(x=>x>0).length;return{term,fs,df,idf:df?Math.log(4/df):0,idfb:df?Math.log(1+(4-df+0.5)/(df+0.5)):0};});
        const freq=(f,len)=>f===0?0:f*(k1+1)/(f+k1*(1-b+b*len/avgdl));
        const docs=tokens.map((ts,i)=>{const contributions=stats.map(t=>({term:t.term,f:t.fs[i],tf:t.fs[i]/ts.length,tfidf:t.fs[i]/ts.length*t.idf,bm25:freq(t.fs[i],ts.length)*t.idfb}));return{id:'d'+(i+1),len:ts.length,contributions,tfidf:sum(contributions.map(x=>x.tfidf)),bm25:sum(contributions.map(x=>x.bm25))};});
        let html=table(['문서','공백 토큰 원문','길이',...terms.map(x=>`f(${x})`)],docs.map((d,i)=>[d.id,corpus[i],d.len,...d.contributions.map(x=>x.f)]),'원문 네 문서 · avgdl=3');
        if(step>=1)html=advance(table(['term','df','ln(N/df)','BM25 IDF'],stats.map(t=>[t.term,t.df,fmt(t.idf),fmt(t.idfb)]),'어휘 밖 term(df=0)은 기여 0으로 제외'),html);
        if(step>=2)html=advance(table(['문서','term','TF=f/길이','TF-IDF 기여','BM25 기여'],docs.flatMap(d=>d.contributions.map(x=>[d.id,x.term,fmt(x.tf),fmt(x.tfidf),fmt(x.bm25)])),'다른 정의의 TF를 BM25에 대입하지 않기'),html);
        if(step>=3){
          html=advance(table(['문서','TF-IDF 합','BM25 합','BM25 순위'],docs.map(d=>[d.id,fmt(d.tfidf),fmt(d.bm25),[...docs].sort((a,b)=>b.bm25-a.bm25||a.id.localeCompare(b.id)).findIndex(x=>x.id===d.id)+1]),'동률은 문서 ID 오름차순'),html);
          const curve=len=>Array.from({length:81},(_,i)=>`${85+i*6.5},${205-freq(i/10,len)/4*160}`).join(' ');
          html=advance(svg('BM25 IDF 이전 빈도 항: 고정 축 f 0–8, 값 0–4',`<path d="M85 35V205H605" fill="none" stroke="${C.ink}"/><polyline points="${curve(3)}" fill="none" stroke="${C.input}" stroke-width="3"/><polyline points="${curve(6)}" fill="none" stroke="${C.output}" stroke-width="3" stroke-dasharray="6 4"/>`+txt(10,22,'빈도 항 (0–4)')+txt(60,49,'4')+txt(60,209,'0')+txt(82,230,'0')+txt(600,230,'8')+txt(270,230,'원시 f')+txt(285,28,'실선: 길이 3 / 점선: 길이 6',C.ink,13),250),html);
        }
        return out(html,`고유 질의 term ${terms.length}개를 합산합니다. k₁=${fmt(k1)}, b=${fmt(b)}. f=0은 항상 기여 0이며 k₁=0에서도 0/0을 계산하지 않습니다. 점수와 순위는 관련성 확률이 아닙니다.`,[['평균 길이',avgdl],['d1 BM25',fmt(docs[0].bm25)],['d3 BM25',fmt(docs[2].bm25)]],{terms,stats,docs,avgdl,saturation:[0,1,2,4,8].map(f=>freq(f,3))},{id:'rag-bm25',step,p});
      },
      question:quiz('질의 learning을 두 번 쓰면 이 교안의 BM25 점수는?',['고유 term만 사용하므로 동일','정확히 두 배','df가 두 배'],0,'질의의 고유 term을 한 번씩 합합니다. 질의 빈도 가중치를 따로 쓰는 변형과 구별합니다.')
    },

    'rag-metrics': {
      title:'검색 평가: cutoff와 분모가 바꾸는 다섯 지표',
      intro:'A~F 중 관련 문서는 B·D·E입니다. 등급은 B=2,D=1,E=2이고 나머지는 0입니다. P@K의 빈 슬롯, 전체 관련 수 r로 나누는 AP@K, corpus 전체 이상 순서의 IDCG를 구분합니다.',
      defaults:{order:'baseline',K:3,labels:'normal'},
      controls:[sel('order','반환 순서',[['baseline','A B C D E F'],['poor','A C B D E F'],['best','B E D A C F'],['short','B만 반환']]),rng('K','평가 깊이 K (반환 부족도 포함)',1,8),sel('labels','관련성 정답',[['normal','B·D·E 관련'],['none','관련 문서 0개']])],
      steps:stages([['순위','상위 K와 잘린 영역을 구분합니다.'],['첫 hit와 회수','Success·RR·P·R의 분모를 비교합니다.'],['AP','hit 위치의 precision만 전체 관련 수로 나눕니다.'],['nDCG','등급 gain과 순위 할인, 이상 순서를 비교합니다.']]),
      compute(p,step) {
        const orders={baseline:['A','B','C','D','E','F'],poor:['A','C','B','D','E','F'],best:['B','E','D','A','C','F'],short:['B']};
        const ids=orders[p.order],K=Number(p.K),grades=p.labels==='none'?{}:{B:2,D:1,E:2},r=Object.keys(grades).length;let hits=0,apNumerator=0,dcg=0,first=0;
        const rows=Array.from({length:K},(_,i)=>{const id=ids[i]||'빈 슬롯',g=grades[id]||0,rel=g>0?1:0;if(rel&&!first)first=i+1;hits+=rel;const precision=hits/(i+1),apTerm=precision*rel,gain=2**g-1,discount=Math.log2(i+2);apNumerator+=apTerm;dcg+=gain/discount;return{id,rank:i+1,g,rel,hits,precision,apTerm,gain,discount,dcgTerm:gain/discount};});
        const ideal=Object.values(grades).sort((a,b)=>b-a).slice(0,K),idcg=sum(ideal.map((g,i)=>(2**g-1)/Math.log2(i+2))),P=hits/K,R=r?hits/r:null,RR=first?1/first:0,AP=r?apNumerator/r:null,NDCG=idcg?dcg/idcg:null;
        let html=table(['순위','문서','관련 (등급)','K 안의 누적 hit'],rows.map(x=>[x.rank,x.id,`${x.rel} (${x.g})`,x.hits]),'평가 슬롯은 K개 · 미반환 슬롯은 0 hit');
        if(step>=1)html=advance(table(['지표','분자 / 분모','값'],[['Success@K',first?'첫 hit 존재':'hit 없음',first?1:0],['RR@K',first?`1 / ${first}`:'0',fmt(RR)],['P@K',`${hits} / ${K}`,fmt(P)],['R@K',`${hits} / ${r}`,fmt(R)]],'RR은 K 밖의 첫 hit를 사용하지 않음'),html);
        if(step>=2)html=advance(table(['순위','P@i','관련 여부','AP 분자 기여'],rows.map(x=>[x.rank,fmt(x.precision),x.rel,fmt(x.apTerm)]),`AP@${K} 분모는 전체 관련 수 r=${r}, 찾은 hit 수가 아님`)+para(`AP@K = ${fmt(apNumerator)} / ${r} = ${fmt(AP)}.`),html);
        if(step>=3)html=advance(table(['순위','등급','gain=2^g−1','log₂(i+1)','DCG 기여'],rows.map(x=>[x.rank,x.g,x.gain,fmt(x.discount),fmt(x.dcgTerm)]),'IDCG는 반환 목록이 아니라 corpus 정답 등급으로 정렬')+para(`DCG=${fmt(dcg)}, IDCG=${fmt(idcg)}, nDCG=${fmt(NDCG)}. 관련 문서 0개에서는 Recall·AP·nDCG를 결측으로 두고 평균에서 제외할 수를 따로 보고합니다.`),html);
        return out(html,`K=${K}, hit=${hits}, r=${r}. AP@K는 분모 r 규약입니다. nDCG는 지수 gain·log₂ 할인입니다. ${r?'여러 질의의 MRR·MAP는 질의별 RR·AP의 같은 무게 평균입니다.':'이 질의의 Recall·AP·nDCG는 평균에서 제외합니다. Success와 RR은 0입니다.'}`, [['P@K',fmt(P)],['R@K',fmt(R)],['RR@K',fmt(RR)],['AP@K',fmt(AP)],['nDCG@K',fmt(NDCG)]],{rows,r,K,hits,P,R,RR,AP,dcg,idcg,NDCG},{id:'rag-metrics',step,p});
      },
      question:quiz('관련 문서가 3개인데 B 하나만 반환했다면 AP는?',['1/3','1','0'],0,'hit 위치의 precision=1을 전체 관련 수 3으로 나눕니다. 찾지 못한 문서의 기여는 0입니다.')
    },

    'rag-neural': {
      title:'CE와 DPR: 점수 행렬에서 softmax·loss·gradient까지',
      intro:'B=2의 대각선 positive 예제입니다. CE는 지정된 쌍별 [CLS] 표현과 선형 head로, DPR은 지정한 U·V의 내적으로 점수를 만듭니다. 실제 BERT 인코딩은 실행하지 않습니다.',
      defaults:{mode:'ce',tau:1,bias:0,hard:0},
      controls:[sel('mode','점수 구조',[['ce','Cross-Encoder 쌍별 head'],['dpr','DPR 독립 벡터 내적']]),rng('tau','Temperature τ',0.25,2,0.25),rng('bias','모든 쌍의 공통 bias',-3,3,0.5),rng('hard','비대각 negative 점수 증가',0,4,0.25)],
      steps:stages([['표현과 shape','어떤 입력을 사전 계산할 수 있는지 확인합니다.'],['점수','질문 행·문서 열의 2×2 행렬을 만듭니다.'],['확률과 손실','행 안의 후보 둘로 정규화하고 대각선 CE를 평균합니다.'],['점수 gradient','평균·온도를 포함한 미분과 bias 상쇄를 확인합니다.']]),
      compute(p,step) {
        const mode=p.mode,tau=Number(p.tau),bias=Number(p.bias),hard=Number(p.hard),U=[[1,0],[0,1]],V=[[2,1],[0,3]],pairH=[[[2,1],[0,1]],[[1,1],[3,1]]],w=[1,0];
        const base=mode==='ce'?pairH.map(row=>row.map(h=>dot(w,h))):U.map(u=>V.map(v=>dot(u,v)));
        const S=base.map((row,i)=>row.map((v,j)=>v+bias+(i===j?0:hard))),P=S.map(row=>softmax(row.map(x=>x/tau))),losses=P.map((row,i)=>-Math.log(row[i])),loss=sum(losses)/2,G=P.map((row,i)=>row.map((v,j)=>(v-(i===j?1:0))/(2*tau)));
        let html=mode==='ce'?table(['쌍','지정된 h_CLS (H=2)','head w'],pairH.flatMap((row,i)=>row.map((h,j)=>[`q${i+1}, d${j+1}`,h.join(', '),w.join(', ')])),'CE: B²=4개 쌍 표현, 문서 고정 벡터로 대체 불가'):table(['입력','지정 벡터 (H=2)','질의 전 저장 가능'],[...U.map((u,i)=>['q'+(i+1),u.join(', '),'아니오']),...V.map((v,i)=>['d'+(i+1),v.join(', '),'예'])],'DPR: 질문 2개 + 문서 2개 독립 표현, S=UVᵀ');
        if(step>=1)html=advance(table(['질문 행 / 문서 열','d1 (+ for q1)','d2 (+ for q2)'],S.map((r,i)=>['q'+(i+1),...r.map(x=>fmt(x))]),'점수 S: 공통 bias와 hard negative 조작 포함'),html);
        if(step>=2)html=advance(table(['질문','P(d1|후보)','P(d2|후보)','−ln P(positive)'],P.map((r,i)=>['q'+(i+1),...r.map(x=>fmt(x)),fmt(losses[i])]),'행별 softmax(S/τ), overflow 방지를 위해 행 최댓값 차감')+para(`평균 loss=${fmt(loss)}. 후보 집합 내 확률이며 corpus 관련성 confidence가 아닙니다.`),html);
        if(step>=3)html=advance(table(['질문','∂L/∂S₁','∂L/∂S₂','행 합'],G.map((r,i)=>['q'+(i+1),...r.map(x=>fmt(x)),fmt(sum(r))]),'∂L/∂S=(P−정답)/(Bτ) · 경사하강은 gradient를 뺌')+para(`공통 bias 미분 ΣG=${fmt(sum(G.flat()))}. 행의 상수 이동은 softmax를 바꾸지 않습니다. 모델 가중치 갱신은 이 점수 미분과 별개이며 실제 학습은 실행하지 않습니다.`),html);
        return out(html,`${mode==='ce'?'CE 쌍별 head':'DPR 내적'}로 점수를 만들고 같은 contrastive CE를 계산합니다. 비대각 문서가 실제로도 관련 있다면 이를 낮추는 신호는 false negative입니다.`,[['평균 loss',fmt(loss)],['positive q1',fmt(P[0][0])],['score 개수',4],['CE 쌍 / DPR 입력','4 / 4 (재사용 구조 다름)']],{mode,U,V,pairH,S,P,G,loss,losses,biasGradient:sum(G.flat())},{id:'rag-neural',step,p});
      },
      question:quiz('같은 질문 행의 모든 점수에 +3을 더하면?',['softmax·loss가 유지된다','positive 확률만 오른다','CE가 DPR 구조로 바뀐다'],0,'softmax 분자·분모에서 e³이 상쇄됩니다. 이 손실의 공통 bias gradient는 0입니다.')
    },

    'rag-ann': {
      title:'ANN 그래프: 발견한 노드와 펼친 노드를 나누기',
      intro:'본문의 A→B,C / B→A / C→D / D→C를 그대로 계산합니다. q=(0,0)과 유클리드 거리로 정렬한 폭 L의 후보를 유지합니다. HNSW·DiskANN 구현 전체가 아닌 toy 탐색입니다.',
      defaults:{width:1,start:'A',qx:0},
      controls:[rng('width','유지할 후보 폭 L',1,4),sel('start','시작 노드',[['A','A'],['B','B'],['C','C'],['D','D']]),rng('qx','질의 q의 x 좌표',-1,2,0.25)],
      steps:stages([['그래프와 exact','정확한 거리 순서와 시작 후보를 구분합니다.'],['첫 확장','한 후보의 이웃을 발견하고 폭 L로 잘라냅니다.'],['둘째 확장','유지된 미확장 후보를 이어서 펼칩니다.'],['남은 경로','추가 후보가 열어 주는 경로를 추적합니다.'],['종료와 recall','유지 후보가 모두 확장되었는지, exact와 일치하는지 봅니다.']]),
      compute(p,step) {
        const pts={A:[2,0],B:[1,0],C:[0,1.5],D:[0,0.1]},edges={A:['B','C'],B:['A'],C:['D'],D:['C']},q=[Number(p.qx),0],L=Number(p.width),dist=id=>Math.hypot(pts[id][0]-q[0],pts[id][1]-q[1]),sort=xs=>[...xs].sort((a,b)=>dist(a)-dist(b)||a.localeCompare(b));
        let candidates=[p.start];const seen=new Set(candidates),expanded=new Set(),trace=[{u:'시작',candidates:[...candidates],seen:[...seen],expanded:[],dropped:[]}];
        while(candidates.some(x=>!expanded.has(x))){const u=candidates.find(x=>!expanded.has(x));expanded.add(u);const newly=edges[u].filter(x=>!seen.has(x));newly.forEach(x=>seen.add(x));const all=sort([...candidates,...newly]),dropped=all.slice(L);candidates=all.slice(0,L);trace.push({u,candidates:[...candidates],seen:[...seen],expanded:[...expanded],dropped});}
        const frame=trace[Math.min(step===4?trace.length-1:step,trace.length-1)],exact=sort(Object.keys(pts)),recall=candidates[0]===exact[0]?1:0;
        // Diagram placement shows graph connectivity only. Distances always use pts, not screen pixels.
        const pos={A:[95,65],B:[295,65],C:[95,180],D:[295,180]};
        const body=`<defs><marker id="rag-ann-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="${C.ink}"/></marker></defs>`+Object.entries(edges).map(([a,ns])=>ns.map(b=>{const dx=pos[b][0]-pos[a][0],dy=pos[b][1]-pos[a][1],len=Math.hypot(dx,dy);return `<line x1="${pos[a][0]+dx/len*27}" y1="${pos[a][1]+dy/len*27}" x2="${pos[b][0]-dx/len*28}" y2="${pos[b][1]-dy/len*28}" stroke="${C.line}" stroke-width="2" marker-end="url(#rag-ann-arrow)"/>`;}).join('')).join('')+Object.keys(pts).map(id=>`<circle cx="${pos[id][0]}" cy="${pos[id][1]}" r="24" fill="${frame.expanded.includes(id)?C.valid:frame.candidates.includes(id)?C.input:C.paper}" stroke="${frame.candidates.includes(id)?C.input:C.ink}" stroke-width="${frame.candidates.includes(id)?4:1}"/>`+txt(pos[id][0]-6,pos[id][1]+5,id,frame.expanded.includes(id)||frame.candidates.includes(id)?'white':C.ink)+txt(pos[id][0]+30,pos[id][1]+30,`d=${fmt(dist(id),3)}`,C.ink,13)).join('')+txt(420,50,'청색 테두리: 유지 후보',C.input,14)+txt(420,82,'✓ 녹색: 확장 완료',C.valid,14)+txt(420,118,`q=(${fmt(q[0])},0)`,C.ink,14)+txt(420,150,`exact 1위: ${exact[0]}`,C.output,14)+txt(18,242,'연결 도식 · 화면 간격은 실제 벡터 거리가 아님',C.ink,13);
        const graphic=svg('후보 유지와 확장 상태의 toy ANN 그래프',body+(step>=3?txt(420,186,`확장 종료 ${frame.expanded.length}/${trace.length-1}`,C.valid,14):'')+(step===4?txt(420,218,`반환 ${candidates[0]} / Recall ${recall}`,recall?C.valid:C.error,14):''),265);
        let html=table(['노드','실제 좌표','q까지 거리','지정된 out-neighbor'],Object.keys(pts).map(id=>[id,pts[id].join(', '),fmt(dist(id)),edges[id].join(', ')]),'거리 동률은 노드 ID 오름차순');
        if(step>=1)html=advance(table(['확장 노드','유지 C','발견 seen','확장 expanded','폭 때문에 탈락'],trace.slice(1,Math.min(frame.expanded.length+1,trace.length)).map(t=>[t.u,t.candidates.join(', '),t.seen.join(', '),t.expanded.join(', '),t.dropped.join(', ')||'없음']),'발견은 거리 계산, 확장은 이웃 탐색'),html);
        if(step>=3)html=advance(table(['노드','거리 계산 여부','이웃 확장 여부','유지 후보 여부'],Object.keys(pts).map(id=>[id,frame.seen.includes(id)?'발견됨':'미발견',frame.expanded.includes(id)?'확장 완료':'미확장',frame.candidates.includes(id)?'유지':'목록 밖']),'남아 있는 경로: 발견했어도 탈락한 노드는 이웃을 펼치지 않을 수 있음'),html);
        if(step===4)html=advance(para(`최종 반환 ${candidates[0]}, exact ${exact[0]}, ANN Recall@1=${recall}. ${seen.size}개 거리 계산, ${expanded.size}개 확장. 전체 노드를 확장하지 않아도 종료할 수 있습니다.`),html);
        return out(graphic+html,`폭 L=${L}에서 ${trace.length-1}회 확장합니다. 후보를 버리면 그 노드 뒤의 경로를 잃을 수 있습니다. ANN recall은 벡터 Top-K 재현율이며 사람 관련성 recall과 다릅니다.`,[['L',L],['거리 계산 노드',seen.size],['확장 수',expanded.size],['최종 ANN Recall@1',recall]],{q,L,trace,candidates,exact,recall,distances:Object.fromEntries(Object.keys(pts).map(id=>[id,dist(id)]))},{id:'rag-ann',step,p});
      },
      question:quiz('기본 그래프에서 L=2로 C를 남겨 두는 효과는?',['C를 확장해 D를 발견한다','D가 처음부터 후보에 들어간다','exact 검색이 항상 보장된다'],0,'당장 B보다 먼 C를 버리지 않아 C→D의 경로를 열 수 있습니다. 특정 후보 폭이 일반 exact를 보장하지는 않습니다.')
    },

    'rag-context-budget': {
      title:'RAG 입력 예산: 검색 후보와 최종 근거 수 분리',
      intro:'문서 ID가 붙은 균일 길이 청크를 순위대로 넣는 단순 예산 계산입니다. 전체 window에서 출력 예약을 뺀 뒤 규칙·질문·ID의 고정 입력과 본문을 채웁니다. 실제 토크나이저·검색·생성은 실행하지 않습니다.',
      defaults:{window:4500,reserve:500,fixed:600,chunk:500,retrieved:10},
      controls:[rng('window','전체 window (토큰)',1000,8000,500),rng('reserve','출력 예약 (토큰)',0,2000,100),rng('fixed','규칙·질문·ID (토큰)',0,2000,100),rng('chunk','청크 한 개 (토큰)',100,1000,100),rng('retrieved','검색 후보 수',1,20)],
      steps:stages([['예약','전체 window에서 출력 공간을 먼저 예약합니다.'],['근거 예산','입력에서 고정 규칙·질문을 제외합니다.'],['선택','후보 수와 길이 한도를 함께 적용합니다.'],['경계','하나 더 넣으면 넘치는지 실제 합으로 확인합니다.']]),
      compute(p,step) {
        const W=Number(p.window),O=Number(p.reserve),F=Number(p.fixed),L=Number(p.chunk),R=Number(p.retrieved),input=Math.max(0,W-O),available=Math.max(0,W-O-F),capacity=Math.floor(available/L),feasible=O+F<=W,selected=feasible?Math.min(R,capacity):0,total=O+F+selected*L,overflow=Math.max(0,O+F-W);
        let html=table(['구성','토큰','적용 시점'],[['전체 window',W,'모델 제한의 교육용 가정'],['출력 예약',O,'입력 예산보다 먼저'],['입력 한도',input,'window−출력 (하한 0)']],'단위는 모두 같은 토크나이저의 토큰');
        if(step>=1)html=advance(table(['고정 입력','근거 가용 예산','고정+출력 초과'],[[F,available,overflow]],'근거 예산=max(0, window−출력−고정)'),html);
        if(step>=2)html=advance(table(['검색 후보','청크당 길이','길이 한도','선택 수'],[[R,L,capacity,selected]],'K_context=min(K_retrieve, floor(근거 예산/청크길이)) · 고정 입력이 들어갈 때만'),html);
        if(step>=3)html=advance(bars([['출력 예약',O,C.output],['고정 입력',F,C.input],['선택 청크 본문',selected*L,C.valid],['총 사용',total,total>W?C.error:C.valid]],10000,'토큰 (고정 축 0–10000)')+para(`선택 ${selected}개: ${O}+${F}+${selected}×${L}=${total}토큰. ${!feasible?'고정 입력과 출력 예약부터 window를 초과하므로 요청 구성이 불가능합니다.':selected<R?`다음 청크까지 넣으면 ${total+L}토큰으로 제한 ${W}을 넘습니다.`:'검색 후보를 모두 선택했습니다. 추가 자료의 관련성은 이 계산이 판단하지 않습니다.'}`),html);
        return out(html,`최종 입력 청크는 ${selected}개입니다. ${feasible?'예산을 만족하더라도 예외 조항이 빠지거나 무관한 근거가 남을 수 있습니다.':'본문을 0개 넣어도 요청이 불가능하므로 고정 입력·출력 예약을 줄여야 합니다.'} 근거가 후보·컨텍스트·답변 중 어느 단계에서 사라졌는지 원문 실패 진단표와 함께 확인합니다.`,[['최종 근거',selected],['총 예약+입력',total],['초과',Math.max(0,total-W)]],{W,O,F,L,R,input,available,capacity,feasible,selected,total,overflow},{id:'rag-context-budget',step,p});
      },
      question:quiz('입력 한도 4000, 고정 600, 청크당 500토큰이면 최대 몇 개?',['6개','7개','8개'],0,'floor((4000−600)/500)=6입니다. 7개는 4100토큰이므로 입력 한도를 넘습니다.')
    },

    'rag-chunk': {
      title:'Overlap과 parent: 저장 비용과 읽을 범위 계산',
      intro:'같은 토큰 위치 축에서 실제 [start,end) 범위를 만들고 저장 길이를 합합니다. child 하나를 찾은 뒤 지정한 고정 parent 범위로 확장하며, 검색 점수와 parent 전체 관련성을 구별합니다.',
      defaults:{T:1000,L:400,O:100,child:1,parent:800},
      controls:[rng('T','원문 길이 T (토큰)',0,2000,100),rng('L','청크 크기 L',100,800,100),rng('O','overlap O (L 미만으로 제한)',0,700,100),rng('child','검색 child 번호 (0부터, 넘으면 마지막)',0,19),rng('parent','parent 크기 (토큰)',200,1600,200)],
      steps:stages([['경계','유효 overlap과 시작점 간격을 정합니다.'],['저장량','마지막 짧은 청크까지 실제 길이를 합합니다.'],['parent 확장','선택 child와 겹치는 고정 parent를 가져옵니다.'],['비용 해석','중복 저장과 컨텍스트 확장 비용을 구분합니다.']]),
      compute(p,step) {
        const T=Number(p.T),L=Number(p.L),requested=Number(p.O),O=Math.min(requested,L-1),stride=L-O,chunks=[];
        if(T>0){let start=0;while(true){const end=Math.min(T,start+L);chunks.push([start,end]);if(end===T)break;start+=stride;}}
        const stored=sum(chunks.map(([a,b])=>b-a)),duplicate=stored-T,n=chunks.length,idx=n?Math.min(Number(p.child),n-1):null,child=idx===null?null:chunks[idx],P=Number(p.parent),parents=[];
        if(child){for(let a=Math.floor(child[0]/P)*P;a<child[1];a+=P)parents.push([a,Math.min(T,a+P)]);}
        const parentTokens=sum(parents.map(([a,b])=>b-a)),rangeRows=chunks.map(([a,b],i)=>['C'+i,`[${a}, ${b})`,b-a,i===idx?'선택':'']);
        let html=para(`유효 O=min(요청 ${requested}, L−1)=${O}, 간격 L−O=${stride}. ${requested!==O?'요청 overlap이 L 이상이므로 명시적으로 L−1로 제한했습니다.':''} T=0은 청크 0개, T≤L은 최대 1개입니다.`);
        const visible=step===0?chunks.slice(0,1):chunks.slice(0,12),axis=2000;
        const parentY=visible.length*28+35, costY=parentY+65;
        const parentLayer=step>=2?txt(8,parentY+16,'parent',C.valid,13)+parents.map(([a,b])=>`<rect x="${70+a/axis*540}" y="${parentY}" width="${(b-a)/axis*540}" height="22" fill="${C.valid}" opacity=".25" stroke="${C.valid}"/>`+txt(70+a/axis*540,parentY+43,`[${a},${b})`,C.valid,12)).join(''):'';
        const costLayer=step>=3?txt(8,costY+25,`저장 ${stored} = 원문 ${T} + 중복 ${duplicate} 토큰`,C.output,15)+txt(8,costY+52,`읽기 child ${child?child[1]-child[0]:0} → parent ${parentTokens} 토큰`,C.valid,15):'';
        const graphic=svg('같은 토큰 위치 축 0–2000의 청크·parent·비용 단계',visible.map(([a,b],i)=>txt(8,35+i*28,'C'+i,C.ink,13)+`<rect x="${70+a/axis*540}" y="${18+i*28}" width="${(b-a)/axis*540}" height="20" fill="${i===idx?C.output:C.input}"/>`+txt(70+b/axis*540+4,33+i*28,`[${a},${b})`,C.ink,11)).join('')+parentLayer+costLayer+txt(70,(step>=3?costY+80:step>=2?parentY+65:visible.length*28+48),`토큰 위치 0–2000 · ${n>12?'그림은 앞 12개, 아래 표에 전체 범위':'범위는 반열린 구간 [start,end)'}`,C.ink,12),step>=3?costY+100:step>=2?parentY+85:visible.length*28+65);
        if(step>=1)html=advance(table(['청크','원문 범위','저장 토큰','검색 선택'],rangeRows,'전체 청크 범위 · 화면 위치와 무관한 실제 계산')+para(`청크 ${n}개, 총 저장 ${stored}토큰, 중복 ${duplicate}토큰. 원문은 ${T}토큰 그대로입니다.`),html);
        if(step>=2)html=advance(table(['검색 child','지정 parent 범위','컨텍스트 토큰'],[[child?`C${idx} [${child.join(',')})`:'없음',parents.map(x=>`[${x.join(',')})`).join(' + ')||'없음',parentTokens]],'고정 parent 경계를 가로지르면 겹치는 parent를 모두 포함해 child를 보존'),html);
        if(step>=3)html=advance(para(`저장량 / 원문 길이 = ${T?fmt(stored/T):'원문 0: 정의 안 됨'}배. child ${child?child[1]-child[0]:0}토큰 → parent ${parentTokens}토큰. 같은 parent를 여러 child가 가리켜도 ID·버전 기준으로 한 번만 넣어야 합니다. 여기서는 지정한 parent 구간 계산이며 의미 기반 경계·품질을 측정하지 않습니다.`),html);
        return out(graphic+html,`overlap은 경계 주변 중복을 ${duplicate}토큰 만듭니다. 전체 논리·예외 복원은 보장하지 않습니다. parent 확장은 별도 컨텍스트 비용이며 버전·권한·최종 예산을 다시 확인해야 합니다.`,[['청크 수',n],['총 저장 토큰',stored],['중복 토큰',duplicate],['parent 토큰',parentTokens]],{T,L,O,requested,stride,chunks,stored,duplicate,idx,child,parents,parentTokens},{id:'rag-chunk',step,p});
      },
      question:quiz('1000토큰을 크기400·overlap100으로 나누면 총 저장량은?',['1200토큰','1000토큰','1400토큰'],0,'[0,400),[300,700),[600,1000)의 실제 길이를 합하면 1200입니다. 같은 200토큰이 중복됩니다.')
    },

    'rag-sequence': {
      title:'RAG-Sequence: 문서별 곱을 더하고 posterior로 돌아오기',
      intro:'가상 문서 가중치와 정답 토큰 조건부확률을 사용합니다. Sequence의 Σ문서 Π토큰과 Token의 Π토큰 Σ문서는 다른 모델입니다. 모든 확률은 지정한 교육용 값이며 실제 모델 측정값이 아닙니다.',
      defaults:{preset:'text',top:3,normalization:'inside',first:0.5},
      controls:[sel('preset','가상 확률 조건',[['text','본문: [0.6,0.3,0.1], 생성 [0.5,0.05,0.05]'],['cross','교차 토큰: [0.9,0.1] / [0.1,0.9]'],['zero','모든 문서에서 정답 확률 0']]),rng('top','선택 Top-K 문서',1,3),sel('normalization','가중치 처리',[['inside','선택 집합 내부 재정규화'],['truncate','전체 확률 유지 후 잘라내기']]),rng('first','본문 z1 첫 정답 토큰 확률',0,1,0.05)],
      steps:stages([['문서 분포','Top-K와 가중치 합의 범위를 고정합니다.'],['문서별 곱','출력 전체의 확률을 문서 안에서 곱합니다.'],['주변화','문서 가중치를 곱한 항을 합합니다.'],['posterior와 gradient','정답 기여 비중과 검색 점수 미분을 구별합니다.']]),
      compute(p,step) {
        const prior=p.preset==='cross'?[0.5,0.5]:[0.6,0.3,0.1],tokenProbs=p.preset==='cross'?[[0.9,0.1],[0.1,0.9]]:p.preset==='zero'?[[0,1],[0,1],[0,1]]:[[Number(p.first),1],[0.05,1],[0.05,1]],K=Math.min(Number(p.top),prior.length),mass=sum(prior.slice(0,K)),weights=prior.slice(0,K).map(x=>p.normalization==='inside'?x/mass:x),likelihood=tokenProbs.slice(0,K).map(row=>row.reduce((a,b)=>a*b,1)),terms=weights.map((w,i)=>w*likelihood[i]),sequence=sum(terms),token=tokenProbs[0].reduce((prod,_,t)=>prod*sum(weights.map((w,i)=>w*tokenProbs[i][t])),1),posterior=sequence?terms.map(x=>x/sequence):null,loss=sequence?-Math.log(sequence):null;
        // With full-corpus softmax and truncation, dL/ds uses the FULL prior, including omitted docs.
        const gradient=posterior?(p.normalization==='inside'?weights.map((w,i)=>w-posterior[i]):prior.map((w,i)=>w-(i<K?posterior[i]:0))):null;
        let html=table(['문서','전체 사전확률','포함 여부','현재 혼합 가중치'],prior.map((w,i)=>['z'+(i+1),fmt(w),i<K?'Top-K 내부':'제외',i<K?fmt(weights[i]):0]),`가중치 합 ${fmt(sum(weights))} · ${p.normalization==='inside'?'Top-K 내부 합 1':'전체 정규화 질량 중 일부 유지'}`);
        if(step>=1)html=advance(table(['문서','토큰1 확률','토큰2 확률','시퀀스 확률 Π'],likelihood.map((v,i)=>['z'+(i+1),...tokenProbs[i].map(x=>fmt(x)),fmt(v)]),'같은 문서를 조건으로 teacher forcing한 가상 정답 확률'),html);
        if(step>=2)html=advance(table(['문서','문서 가중치','Π 토큰 확률','가중 기여'],terms.map((v,i)=>['z'+(i+1),fmt(weights[i]),fmt(likelihood[i]),fmt(v)]),'Sequence는 문서별 경로를 마지막에 합산')+para(`Sequence=${fmt(sequence)}, Token=${fmt(token)}, −ln Sequence=${loss===null?'정답 확률 0: 손실 +∞ (표시만, 유한 수치로 바꾸지 않음)':fmt(loss)}. Top-K 잘라내기는 원래 전체 합과 같다고 보장되지 않습니다.`),html);
        if(step>=3)html=advance(table(['문서','사전/혼합 확률','posterior r','검색 logit gradient'],prior.map((w,i)=>['z'+(i+1),fmt(p.normalization==='inside'?(weights[i]||0):w),posterior&&i<K?fmt(posterior[i]):i>=K?'후보 밖':'정의 안 됨',gradient&&i<gradient.length?fmt(gradient[i]):'정의 안 됨']),'내부 softmax: p−r / 전체 softmax 잘라내기: 전체 prior−선택 posterior')+para('후보 ID 선택 자체는 불연속입니다. 이 미분은 고정 후보와 지정된 생성 확률 조건의 검색 logit 미분이며 실제 encoder 갱신이나 정답 confidence가 아닙니다.'),html);
        return out(html,`선택 문서 ${K}개, 유지 질량 ${fmt(mass)}, Sequence ${fmt(sequence)}. ${sequence?'정답을 본 posterior는 사전 검색 확률과 다를 수 있습니다.':'가능도가 0이므로 posterior·logit gradient는 정의하지 않습니다.'} Token과 합·곱 순서를 바꿔 읽지 않습니다.`,[['Sequence',fmt(sequence)],['Token',fmt(token)],['loss',loss===null?'+∞ (가능도 0)':fmt(loss)]],{prior,K,mass,weights,tokenProbs,likelihood,terms,sequence,token,posterior,gradient,loss},{id:'rag-sequence',step,p});
      },
      question:quiz('두 문서의 토큰 확률이 [0.9,0.1], [0.1,0.9], 가중치가 각각 0.5라면?',['Sequence=0.09, Token=0.25','둘 다 0.25','둘 다 0.09'],0,'Sequence는 0.5×0.9×0.1을 두 번 더합니다. Token은 각 위치 혼합 0.5를 두 번 곱합니다.')
    },

    'rag-thorough': {
      title:'Thorough decoding: beam에서 빠진 셀도 채우기',
      intro:'A=서울, B=수원, C=서울시라는 가상 문자열 후보를 문서별 beam에서 발견한 뒤 합칩니다. 고정 가상 확률 행렬로 Fast와 Thorough의 재평가 범위·점수를 계산하며 실제 생성을 실행하지 않습니다.',
      defaults:{beam:1,mode:'thorough'},
      controls:[rng('beam','문서별 beam 후보 수 B',1,2),sel('mode','최종 점수',[['thorough','Thorough: 모든 문서 열 평가'],['fast','Fast: 발견하지 않은 셀 0 근사']])],
      steps:stages([['후보 발견','문서마다 beam의 문자열 ID를 모읍니다.'],['합집합','같은 토큰열 후보를 한 번만 남깁니다.'],['셀 재평가','후보를 발견한 문서 외의 열도 평가합니다.'],['선택과 비용','문서 가중합과 평가 조합 수를 비교합니다.']]),
      compute(p,step) {
        const weights=[0.6,0.3,0.1],likelihood=[[0.5,0.05,0.05],[0.1,0.6,0.2],[0.2,0.1,0.3]],names=['A: 서울','B: 수원','C: 서울시'],beams=[[0,2],[1,2],[2,1]].map(x=>x.slice(0,Number(p.beam))),union=[...new Set(beams.flat())].sort(),mask=likelihood.map((row,i)=>row.map((_,j)=>beams[j].includes(i))),fast=union.map(i=>sum(weights.map((w,j)=>mask[i][j]?w*likelihood[i][j]:0))),thorough=union.map(i=>dot(weights,likelihood[i])),scores=p.mode==='fast'?fast:thorough,winner=union.map((id,i)=>({id,score:scores[i]})).sort((a,b)=>b.score-a.score||a.id-b.id)[0],existing=sum(mask.flat().map(x=>x?1:0)),combinations=union.length*3;
        let html=table(['문서','가중치','beam에서 발견한 후보'],beams.map((xs,i)=>['z'+(i+1),weights[i],xs.map(x=>names[x]).join(', ')]),'후보 발견은 가상 beam 목록 · 열 합 확률은 1 이하');
        if(step>=1)html=advance(para(`중복 제거한 후보: ${union.map(x=>names[x]).join(', ')}. 문자열이 다른 서울과 서울시는 별도 후보입니다.`),html);
        if(step>=2)html=advance(table(['후보','z1 확률','z2 확률','z3 확률'],union.map(i=>[names[i],...likelihood[i].map((x,j)=>`${fmt(p.mode==='fast'&&!mask[i][j]?0:x)} (${mask[i][j]?'발견 셀':p.mode==='fast'?'0 근사':'추가 평가'})`)]),'beam에 없다는 것은 생성 확률 0이라는 뜻이 아님'),html);
        if(step>=3)html=advance(table(['후보','Fast 합','Thorough 합','현재 선택'],union.map((id,i)=>[names[id],fmt(fast[i]),fmt(thorough[i]),id===winner.id?'1위':'']),'동점은 후보 ID 오름차순')+para(`유일 후보 ${union.length}×문서 3=${combinations}조합. 발견 셀 ${existing}개를 재사용하면 추가 ${combinations-existing}셀을 채웁니다. 최대 k²B=${9*Number(p.beam)}는 중복 제거 전 상한이며 GPU 호출 수·시간과 같지 않습니다.`),html);
        return out(html,`현재 ${p.mode==='fast'?'Fast 0 근사':'Thorough 전체 열 재평가'}의 1위는 ${names[winner.id]} (${fmt(winner.score)})입니다. 모든 beam 밖의 문자열은 이 후보 집합에 없어서 어느 방식도 복구하지 못합니다.`,[['후보 수',union.length],['문서-후보 조합',combinations],['추가 재평가 셀',combinations-existing],['선택 점수',fmt(winner.score)]],{weights,likelihood,beams,union,mask,fast,thorough,winner,existing,combinations},{id:'rag-thorough',step,p});
      },
      question:quiz('후보 A가 z2 beam에 없을 때 Thorough는?',['z2 조건의 A 확률도 추가 평가','z2 기여를 반드시 0으로 둠','A를 후보에서 제거'],0,'Fast는 0 근사를 쓰지만 Thorough는 모든 검색 문서 조건의 확률을 더합니다.')
    },

    'rag-rrf': {
      title:'Hybrid RRF: 원점수 대신 전체 유한 순위 합치기',
      intro:'본문의 A(2,1), B(1,5), C(8,2), D(없음,3)를 완전한 두 목록에 넣었습니다. 생략된 X 등도 모두 계산합니다. c와 검색기 후보 깊이 K는 서로 다른 조작입니다.',
      defaults:{c:60,depth:8,mode:'both'},
      controls:[rng('c','RRF 상수 c',0,100,5),rng('depth','각 검색기 후보 깊이',1,8),sel('mode','결합 검색기',[['both','Dense + BM25'],['dense','Dense만'],['bm25','BM25만']])],
      steps:stages([['목록','각 검색기의 문서 순위와 cutoff를 확인합니다.'],['합집합','중복 문서 ID를 한 번만 남깁니다.'],['역순위 기여','없는 문서는 해당 검색기에서 0점을 줍니다.'],['융합','전체 후보를 동점 규칙과 함께 정렬합니다.']]),
      compute(p,step) {
        const c=Number(p.c),depth=Number(p.depth),dense=['B','A','X','Y','Z','U','V','C'].slice(0,depth),bm25=['A','C','D','X','B','Y','Z','W'].slice(0,depth),lists=p.mode==='dense'?[dense]:p.mode==='bm25'?[bm25]:[dense,bm25],ids=[...new Set(lists.flat())].sort(),rows=ids.map(id=>{const dr=p.mode==='bm25'?0:dense.indexOf(id)+1,br=p.mode==='dense'?0:bm25.indexOf(id)+1,dc=dr?1/(c+dr):0,bc=br?1/(c+br):0;return{id,dr,br,dc,bc,score:dc+bc};}),ranked=[...rows].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
        let html=table(['순위','Dense','BM25'],Array.from({length:depth},(_,i)=>[i+1,p.mode==='bm25'?'미사용':dense[i],p.mode==='dense'?'미사용':bm25[i]]),'완전한 유한 후보 목록 · 순위는 1부터');
        if(step>=1)html=advance(para(`ID 합집합 ${ids.length}개: ${ids.join(', ')}. 검색기 둘의 후보 깊이가 같아도 겹침 때문에 합집합은 2K보다 작을 수 있습니다.`),html);
        if(step>=2)html=advance(table(['문서','Dense 순위','BM25 순위','Dense 1/(c+r)','BM25 1/(c+r)'],rows.map(x=>[x.id,x.dr||'없음',x.br||'없음',fmt(x.dc),fmt(x.bc)]),'목록 밖 기여는 0 · c=0도 rank≥1이라 유한'),html);
        if(step>=3)html=advance(table(['융합 순위','문서','RRF 점수'],ranked.map((x,i)=>[i+1,x.id,fmt(x.score)]),'전체 후보 결과 · 동점 문서 ID 오름차순')+para('Reranker는 이 후보 안에서 순서를 바꾸며 누락 문서를 새로 찾지 못합니다. 원점수의 스케일 문제는 피하지만 같은 오류에 대한 두 검색기의 합의도 강화될 수 있습니다.'),html);
        return out(html,`c=${c}, 후보 깊이=${depth}, 합집합=${ids.length}. 1위 ${ranked[0].id} (${fmt(ranked[0].score)}). 이 점수는 순위 역수의 합이며 정답 확률이 아닙니다.`,[['후보 합집합',ids.length],['1위 RRF',fmt(ranked[0].score)],['결합 검색기',lists.length]],{c,depth,dense,bm25,rows,ranked},{id:'rag-rrf',step,p});
      },
      question:quiz('RRF c=60은 무엇인가요?',['순위 차이를 완만하게 하는 상수','최종 반환 문서 60개','관련성 확률 60%'],0,'c는 각 역순위 분모에 더하는 상수입니다. 각 검색기의 깊이와 최종 반환 수는 별도입니다.')
    },

    'rag-claims': {
      title:'주장–근거 행렬: 유효한 인용과 지지되는 주장 구분',
      intro:'정책 P1=일반 상품 14일, P2=전자책 제외, P3=주문 화면 신청이라는 가상 원문과 수작업 지원 라벨을 사용합니다. ID 존재 여부와 주장 의미의 지지는 별도 계산이며 자동 NLI나 RAGAS 실행이 아닙니다.',
      defaults:{context:'p12',answer:'original'},
      controls:[sel('context','제공 근거',[['p12','P1·P2'],['all','P1·P2·P3'],['p1','P1만'],['none','없음']]),sel('answer','가상 답변',[['original','14일·전자책 제외·즉시 입금'],['corrected','14일·전자책 제외·주문 화면'],['fake','14일 주장에 존재하지 않는 P9 인용'],['abstain','확인할 수 없음 (사실 주장 0)']])],
      steps:stages([['입력','근거 원문과 원자적 주장을 분리합니다.'],['인용 ID','주장별 인용 ID가 입력 집합에 있는지 검사합니다.'],['지지 행렬','사전에 부여한 의미 라벨로 지원 여부를 확인합니다.'],['분모','답변 주장과 reference 주장의 분모를 구별합니다.']]),
      compute(p,step) {
        const evidence={P1:'일반 상품은 구매 후 14일 이내 신청 가능',P2:'전자책은 일반 환불 대상에서 제외',P3:'주문 화면에서 환불 요청'},ids={p12:['P1','P2'],all:['P1','P2','P3'],p1:['P1'],none:[]}[p.context],claims=p.answer==='abstain'?[]:p.answer==='fake'?[{text:'일반 상품 기한은 14일',cite:'P9',support:'P1'}]:[{text:'일반 상품 기한은 14일',cite:'P1',support:'P1'},{text:'전자책은 제외',cite:'P2',support:'P2'},p.answer==='original'?{text:'신청 즉시 계좌 입금',cite:'P1',support:null}:{text:'주문 화면에서 신청',cite:'P3',support:'P3'}],valid=claims.map(x=>ids.includes(x.cite)),supported=claims.map(x=>x.support!==null&&ids.includes(x.support)),citedSupported=claims.map((x,i)=>supported[i]&&x.cite===x.support),ref=['P1','P2','P3'],CR=ids.filter(x=>ref.includes(x)).length/3,F=claims.length?sum(supported.map(Number))/claims.length:null,citationValidity=claims.length?sum(valid.map(Number))/claims.length:null,citationSupport=claims.length?sum(citedSupported.map(Number))/claims.length:null;
        let html=table(['근거 ID','원문'],ids.map(id=>[id,evidence[id]]),'가상 정책 · 제공된 근거만 사용')+table(['답변 주장','달린 인용'],claims.map((x,i)=>['주장 '+(i+1)+': '+x.text,x.cite]),'보류 답변은 사실 주장 수 0');
        if(step>=1)html=advance(table(['주장','인용 ID 존재','ID를 통한 확인'],claims.map((x,i)=>[i+1,valid[i]?'유효':'입력에 없음',valid[i]?evidence[x.cite]:'유효하지 않은 인용']),'유효 ID라고 그 문장이 주장을 지지하는 것은 아님'),html);
        if(step>=2)html=advance(table(['주장',...ids,'컨텍스트 지원','달린 인용의 지원'],claims.map((x,i)=>[x.text,...ids.map(id=>x.support===id?'✓ 지지':'근거 없음'),supported[i]?'지원':'미지원',citedSupported[i]?'지원':'미지원']),'지원 관계는 수작업 교육 라벨 · 외부 세계의 참/거짓 판정 아님'),html);
        if(step>=3)html=advance(table(['측정','분자 / 분모','값'],[['답변 단순 지지율',`${sum(supported.map(Number))} / ${claims.length}`,fmt(F)],['인용 ID 유효율',`${sum(valid.map(Number))} / ${claims.length}`,fmt(citationValidity)],['달린 인용의 주장 지지율',`${sum(citedSupported.map(Number))} / ${claims.length}`,fmt(citationSupport)],['Reference 사실 회수 CR',`${ids.length} / 3`,fmt(CR)]],'reference는 14일·전자책 제외·신청 방법의 세 사실')+para('사실 주장 0개는 지지율을 만점 처리하지 않고 결측으로 표시합니다. 답변 가능 질문의 과도한 보류도 따로 평가해야 합니다.'),html);
        return out(html,`현재 근거 ${ids.length}개, 답변 주장 ${claims.length}개입니다. 단순 지지율 ${fmt(F)}와 reference 회수 ${fmt(CR)}는 분모가 다릅니다. 유효하지 않은 인용을 고치고 지원되지 않은 주장은 삭제·한계 표시해야 합니다.`,[['단순 지지율',fmt(F)],['Reference 회수',fmt(CR)],['인용 ID 유효율',fmt(citationValidity)]],{ids,claims,valid,supported,citedSupported,F,CR,citationValidity,citationSupport},{id:'rag-claims',step,p});
      },
      question:quiz('세 주장에 모두 유효한 ID가 있어도 한 주장이 미지원이면?',['인용 유효율 1, 단순 지지율 2/3','둘 다 1','둘 다 2/3'],0,'ID 존재 검사와 의미 지원 검사는 다릅니다. 즉시 입금이라는 주장은 P1의 14일 규정으로 입증되지 않습니다.')
    },

    'rag-toolformer': {
      title:'Toolformer: 같은 후속 토큰의 세 손실 비교',
      intro:'가상의 원문 후속 토큰 두 개에 부여한 세 조건의 확률을 직접 지정합니다. 이 값은 실제 모델 logits나 API 실행 결과를 측정한 것이 아닙니다. 호출 없음·인자만·결과까지의 가중 NLL로 필터를 계산합니다.',
      defaults:{none1:0.15,call1:0.2,plus1:0.8,decay:0.5,threshold:0.5,api:'success'},
      controls:[rng('none1','가정 P(첫 후속 토큰 | 호출 없음)',0.05,0.95,0.05),rng('call1','가정 P(첫 후속 토큰 | 인자만)',0.05,0.95,0.05),rng('plus1','가정 P(첫 후속 토큰 | 결과까지)',0.05,0.95,0.05),rng('decay','둘째 토큰 가중치 w₁ (첫째 w₀=1)',0,1,0.1),rng('threshold','필터 임계값 τf',0,2,0.1),sel('api','가상 도구 실행 상태',[['success','검증 성공'],['error','실패: 유효 결과 없음']])],
      steps:stages([['동일 정답','세 조건에서 같은 원문 후속 토큰을 평가합니다.'],['가중 NLL','확률의 −ln을 같은 가중치로 합산합니다.'],['강한 기준','min(호출 없음, 인자만)을 기준으로 둡니다.'],['필터','실행 유효성과 Δ≥τf를 모두 확인합니다.']]),
      compute(p,step) {
        const w=[1,Number(p.decay)],probabilities=[[Number(p.none1),0.6],[Number(p.call1),0.6],[Number(p.plus1),0.9]],terms=probabilities.map(row=>row.map((x,i)=>-w[i]*Math.log(x))),losses=terms.map(sum),base=Math.min(losses[0],losses[1]),delta=base-losses[2],threshold=Number(p.threshold),pass=p.api==='success'&&delta>=threshold,names=['호출 없음 Lnone','인자만 Lcall','결과까지 Lplus'];
        let html=table(['동일 후속 토큰','가중치','P: 호출 없음','P: 인자만','P: 결과까지'],['432','개다'].map((t,i)=>[t,w[i],...probabilities.map(row=>fmt(row[i]))]),'가정한 확률 · 실제 logits 측정값이 아님');
        if(step>=1)html=advance(table(['조건','−w₀ ln p₀','−w₁ ln p₁','가중 NLL'],terms.map((row,i)=>[names[i],...row.map(x=>fmt(x)),fmt(losses[i])]),'같은 후속 원문 토큰·가중치, 정규화 평균이 아닌 가중합'),html);
        if(step>=2)html=advance(para(`L⁻=min(${fmt(losses[0])}, ${fmt(losses[1])})=${fmt(base)}. Δ=L⁻−Lplus=${fmt(delta)}.`)+bars(names.map((x,i)=>[x,losses[i],i===2?C.valid:C.input]),7,'가중 NLL (nats), 고정 축 0–7'),html);
        if(step>=3)html=advance(table(['도구 결과 상태','Δ','τf','조건 판정'],[[p.api==='success'?'유효한 가상 결과':'실패, 결과 없음',fmt(delta),fmt(threshold),pass?'✓ 유지':'제외']],'실패 결과는 개선이 커 보여도 학습 예제로 채택하지 않음')+para(pass?'현재 가상 예제는 통과한 호출·결과를 원문에 삽입하는 학습 데이터 후보입니다. 실제 미세튜닝은 실행하지 않습니다.':'현재 가상 예제는 유용성 또는 실행 유효성 조건을 만족하지 못해 제외합니다.'),html);
        return out(html,`가정 확률로 계산한 개선 ${fmt(delta)}는 ${pass?'유지':'제외'} 판정입니다. 호출 시작 확률의 높고 낮음만으로 채택하지 않습니다. 필터는 텍스트 예측 유용성을 보며 사실성·권한·비용·계획 성공을 보증하지 않습니다.`,[['L⁻',fmt(base)],['Lplus',fmt(losses[2])],['Δ',fmt(delta)],['판정',pass?'유지':'제외']],{w,probabilities,terms,losses,base,delta,threshold,pass},{id:'rag-toolformer',step,p});
      },
      question:quiz('Lnone=1.3, Lcall=0.8, Lplus=0.6, τf=0.5이면?',['Δ=0.2이므로 제외','Δ=0.7이므로 유지','Lplus가 작으므로 무조건 유지'],0,'더 강한 no-result 기준 min(1.3,0.8)=0.8을 사용합니다. 0.8−0.6=0.2가 임계값보다 작습니다.')
    },

    'rag-agent-mcp': {
      title:'Agent·MCP: 근거 상태와 호출 예산에 따라 종료하기',
      intro:'A사를 인수한 회사와 그 회사의 본사 도시라는 두 의존 사실을 가상 관측으로 누적합니다. Host→Client→Server의 요청·결과 경로와 계획·근거 충분성 판단을 분리합니다. 실제 MCP 연결·SQL·LLM은 실행하지 않습니다.',
      defaults:{maxCalls:3,scenario:'success',permission:'allow'},
      controls:[rng('maxCalls','호출 상한',0,4),sel('scenario','가상 도구 관측',[['success','첫 호출 B사, 둘째 호출 부산'],['missing','둘째 근거 없음'],['error','둘째 도구 오류'],['repeat','같은 질의 반복']]),sel('permission','인자·접근 검증',[['allow','허용'],['deny','차단']])],
      steps:stages([['상태','원질문·미확인 사실·예산을 초기화합니다.'],['첫 요청','인수 회사의 근거를 받습니다.'],['후속 요청','첫 결과를 사용해 본사 도시를 찾습니다.'],['종료','충분한 근거와 예산 소진·오류·반복을 구별합니다.']]),
      compute(p,step) {
        const max=Number(p.maxCalls),log=[],facts=[],queries=new Set();let stop='호출 예산 소진',calls=0;
        for(let hop=0;hop<max;hop++){
          const query=hop===0?'A사 인수 회사':p.scenario==='repeat'?'A사 인수 회사':'B사 본사 도시';
          if(queries.has(query)){stop='동일 질의 반복 감지';break;}
          if(p.permission==='deny'){stop='입력·접근 검증 차단';log.push({id:'req-'+(hop+1),query,status:'차단',observation:'서버 실행 전 차단',fact:null});break;}
          queries.add(query);calls++;let fact=null,status='성공',observation='';
          if(hop===0){fact='A→인수자 B';observation='E1: B사가 A사를 인수 (동일 가상 시점)';}
          else if(p.scenario==='missing'){status='근거 없음';observation='새 근거 0개';stop='근거 부족: 부분 답변·도시 보류';}
          else if(p.scenario==='error'){status='오류';observation='도구 실패: 정상 결과로 사용하지 않음';stop='도구 오류: 확인 미완료';}
          else {fact='B→본사 부산';observation='E2: B사의 본사는 부산';}
          if(fact)facts.push(fact);log.push({id:'req-'+calls,query,status,observation,fact});
          if(facts.length===2){stop='필요 근거 2/2 확보';break;}
          if(status!=='성공')break;
        }
        const n=step===3?log.length:Math.min(step,log.length),shown=log.slice(0,n),currentFacts=shown.filter(x=>x.fact).map(x=>x.fact),hops=[['Host','원질문·계획·예산·종료 판단'],['Client','검색 서버와 요청/결과 연결'],['Server','허용 도구와 원문 데이터 제공']];
        let html=table(['역할','책임'],hops,'MCP는 연결 경로 · 정답 판단 알고리즘이 아님')+para('원질문: A사를 인수한 회사의 본사 도시는? 필요한 사실: 인수 회사, 그 회사의 본사. 두 번째 질의는 첫 관측의 회사명에 의존합니다.');
        if(step>=1)html=advance(table(['호출 ID','질의 인자','검증·실행 상태','같은 ID의 결과'],shown.map(x=>[x.id,x.query,x.status,x.observation]),'요청 생성 → 입력 검증 → 도구 실행 → 호출 ID로 결과 연결'),html);
        if(step>=2)html=advance(table(['현재 근거','미확인 항목','사용 호출/상한'],[[currentFacts.join('; ')||'없음',currentFacts.length<2?'회사 관계 또는 본사 도시':'없음',`${shown.filter(x=>x.status!=='차단').length}/${max}`]],'근거 상태를 갱신한 뒤 다음 행동 결정'),html);
        if(step===3)html=advance(para(`종료 사유: ${stop}. ${facts.length===2?'E1과 E2를 연결하면 B사의 본사는 부산이라고 답할 수 있습니다.':'확인된 부분만 제시하고 미확인 도시를 추측하지 않습니다.'} 모델 파라미터 학습은 수행하지 않으며 Toolformer의 데이터 필터 단계와 구별합니다.`),html);
        return out(html,`호출 ${calls}/${max}, 필요한 사실 ${facts.length}/2. 종료는 '${stop}'입니다. MCP 연결만으로 근거의 사실성·권한·종료가 자동 보장되지 않습니다.`,[['서버 호출',calls],['필요 사실 회수',`${facts.length}/2`],['종료',stop]],{max,log,facts,calls,stop},{id:'rag-agent-mcp',step,p});
      },
      question:quiz('최대 호출 수까지 도시의 근거를 찾지 못하면?',['미확인 부분을 보류하고 종료 사유 기록','마지막 호출이므로 도시 추측','MCP가 자동으로 답을 확정'],0,'예산 소진은 근거 충분성과 다릅니다. 확인된 내용·누락·오류를 구분해 종료합니다.')
    },

    'rag-evaluation': {
      title:'평가 분모: Context Precision과 Recall·답변 지지',
      intro:'수작업 관련성 [1,0,1,0,1]과 세 reference 사실, 세 답변 주장을 분리합니다. 검색 AP의 corpus 분모와 CP의 반환 hit 분모를 비교합니다. 자동 judge·RAGAS 라이브러리를 실행하지 않습니다.',
      defaults:{order:'mixed',reference:3,supported:2,claims:3},
      controls:[sel('order','청크 관련성 순서',[['mixed','1 0 1 0 1'],['front','1 1 1 0 0'],['tail','1 1 1 0 0 0 0'],['none','0 0 0 0 0']]),rng('reference','정답 reference 주장 수',1,6),rng('supported','검색 근거가 지원하는 사실 수',0,3),rng('claims','생성 답변의 주장 수',0,6)],
      steps:stages([['관련성','반환 청크의 관련 순서를 고정합니다.'],['Context Precision','hit 위치 P@i를 반환 hit 수로 나눕니다.'],['두 Recall','청크 recall과 reference 사실 회수를 구분합니다.'],['답변 지지','답변 주장 분모와 reference 분모를 분리합니다.']]),
      compute(p,step) {
        const labels={mixed:[1,0,1,0,1],front:[1,1,1,0,0],tail:[1,1,1,0,0,0,0],none:[0,0,0,0,0]}[p.order];let h=0,numerator=0;const rows=labels.map((v,i)=>{h+=v;const P=h/(i+1),term=P*v;numerator+=term;return{i:i+1,v,P,term};}),CP=h?numerator/h:null,P=h/labels.length,reference=Number(p.reference),supported=h?Math.min(Number(p.supported),reference):0,CR=supported/reference,claims=Number(p.claims),answerSupported=Math.min(supported,claims),F=claims?answerSupported/claims:null,apCorpus=4,AP=numerator/apCorpus;
        let html=table(['순위','수작업 관련 vᵢ','P@i','P@i×vᵢ'],rows.map(x=>[x.i,x.v,step>=1?fmt(x.P):'다음 단계',step>=1?fmt(x.term):'다음 단계']),'같은 관련 청크 세 개라도 앞 순위 배치에 반응');
        if(step>=1)html=advance(para(`단순 Precision=${h}/${labels.length}=${fmt(P)}. CP=${fmt(numerator)}/${h}=${fmt(CP)}. hit가 0이면 CP는 결측으로 보고합니다. 끝에 무관 청크를 붙이면 P는 내려가도 CP는 같을 수 있습니다.`),html);
        if(step>=2)html=advance(table(['기준','회수 단위','값'],[['검색 AP 예시 (전체 관련 청크 4개)',`${fmt(numerator)}/4`,fmt(AP)],['Context Recall (reference 사실)',`${supported}/${reference}`,fmt(CR)]],'AP는 corpus 관련 청크 수, CR은 reference 주장 수를 사용')+para('지원 사실 수는 reference 수를 넘지 않으며 관련 청크가 0개이면 0으로 제한합니다. 청크 하나가 여러 사실을 지원할 수 있어 청크 수와 사실 수는 같은 단위가 아닙니다.'),html);
        if(step>=3)html=advance(table(['평가 대상','지원 수','분모','비율'],[['reference 사실 회수',supported,reference,fmt(CR)],['답변 단순 지지',answerSupported,claims,fmt(F)]],'사실의 연결 라벨은 수작업 가정 · reference와 답변은 서로 다른 목록')+para('Faithfulness가 높아도 근거 자체가 틀리거나 질문의 일부만 답했을 수 있습니다. Answer Relevancy는 질문 주제와의 관련성으로 사실 정확성과 구별하며, 실제 판정기·reference·누락 수·답변률을 함께 기록합니다.'),html);
        return out(html,`CP=${fmt(CP)}, 단순 P=${fmt(P)}, reference 회수=${fmt(CR)}, 답변 단순 지지=${fmt(F)}입니다. 같은 숫자라도 검색 누락과 생성의 근거 밖 주장은 다른 실패입니다.`,[['CP',fmt(CP)],['P',fmt(P)],['CR',fmt(CR)],['답변 지지',fmt(F)]],{labels,rows,h,numerator,CP,P,reference,supported,CR,claims,answerSupported,F,AP},{id:'rag-evaluation',step,p});
      },
      question:quiz('[1,1,1,0,0]일 때 P와 이 교안 CP는?',['P=0.6, CP=1','둘 다 0.6','둘 다 1'],0,'CP의 hit 위치 precision은 1,1,1입니다. 뒤의 노이즈는 단순 precision에 반영되지만 이 순위식 CP 분자에는 기여하지 않습니다.')
    },

    'rag-cost': {
      title:'운영 비용: 캐시 쓰기·읽기와 반복 호출의 합',
      intro:'본문 가상 단가 입력 $3/M, 출력 $15/M, 캐시 쓰기 $3.75/M, 읽기 $0.30/M을 사용합니다. 현재 가격·성능 견적이 아닙니다. 고정 prefix·가변 입력·출력·반복 호출을 분해합니다.',
      defaults:{requests:1000,prefix:5000,variable:3050,output:500,hits:100,calls:1},
      controls:[rng('requests','질문 수',1,1000),rng('prefix','고정 prefix 토큰',0,10000,500),rng('variable','가변 입력 토큰/호출',0,6000,50),rng('output','출력 토큰/호출',0,2000,100),rng('hits','첫 쓰기 이후 가정 캐시 hit (%)',0,100,5),rng('calls','질문당 동일 길이 LLM 호출 수',1,4)],
      steps:stages([['요청 한 번','고정 입력·가변 입력·출력을 구분합니다.'],['세 단가','캐시 없음·첫 쓰기·후속 읽기를 계산합니다.'],['반복 합','실제 정수 hit 수와 miss·쓰기 횟수를 계산합니다.'],['운영 해석','절감률과 남는 비용, 품질 평가 조건을 확인합니다.']]),
      compute(p,step) {
        const requests=Number(p.requests),calls=Number(p.calls),n=requests*calls,I=Number(p.prefix),V=Number(p.variable),O=Number(p.output),hitRate=Number(p.hits)/100,reads=Math.floor((n-1)*hitRate),writes=n-reads,variableCost=V*3/1e6,outputCost=O*15/1e6,plain=I*3/1e6+variableCost+outputCost,write=I*3.75/1e6+variableCost+outputCost,read=I*0.3/1e6+variableCost+outputCost,baseline=plain*n,total=write*writes+read*reads,saving=baseline?1-total/baseline:null;
        let html=table(['구성','토큰/호출','가상 단가 $/M'],[['고정 prefix',I,'기본3 / 쓰기3.75 / 읽기0.30'],['가변 입력',V,3],['출력',O,15]],'동일 prefix·동일 길이 호출의 단순 견적 · 검색/임베딩/저장/판정 비용 별도');
        if(step>=1)html=advance(table(['요청 종류','prefix 비용 $','가변+출력 $','합계 $'],[['캐시 없음',fmt(I*3/1e6),fmt(variableCost+outputCost),fmt(plain)],['캐시 쓰기',fmt(I*3.75/1e6),fmt(variableCost+outputCost),fmt(write)],['캐시 읽기',fmt(I*0.3/1e6),fmt(variableCost+outputCost),fmt(read)]],'단가 비율과 전체 요청 절감률은 다름'),html);
        if(step>=2)html=advance(table(['전체 호출','읽기 수','쓰기 수','캐시 없음 총 $','가정 캐시 총 $'],[[n,reads,writes,fmt(baseline),fmt(total)]],'첫 요청은 쓰기 · 이후 hit 수=floor((호출−1)×hit 비율) · miss는 다시 쓰기로 가정'),html);
        if(step>=3)html=advance(para(`전체 절감률 ${saving===null?'비용 0: 정의 안 됨':fmt(saving*100,4)+'%'}. ${saving!==null&&saving<0?'읽기가 적어 재쓰기 비용 때문에 총비용이 늘었습니다.':''} 캐시 유효기간·쓰기 재시도·지원 조건은 이 단순 모형 밖입니다. 반복 호출마다 같은 길이를 가정했으며 실제 agent에서는 이력이 길어질 수 있습니다.`)+para('같은 Golden Set·corpus·판정 규약으로 질문별 퇴행, 답 없는 질문의 거절, 평가 실패율, p50/p95·TTFT를 함께 비교해야 합니다. 성공한 일부 표본 평균만으로 전체 개선을 확정하지 않습니다.'),html);
        return out(html,`${requests}질문×${calls}호출=${n}회, 읽기 ${reads}회·쓰기 ${writes}회의 가상 총비용 $${fmt(total)}입니다. 출력 비용과 가변 입력은 그대로 남으며 이 수치가 실제 과금·지연·품질을 측정한 것은 아닙니다.`,[['총 호출',n],['캐시 없음 $',fmt(baseline)],['가정 캐시 $',fmt(total)],['절감률',saving===null?'정의 안 됨':fmt(saving*100,2)+'%']],{requests,calls,n,I,V,O,reads,writes,plain,write,read,baseline,total,saving},{id:'rag-cost',step,p});
      },
      question:quiz('캐시 읽기 단가가 기본 입력 단가의 10%라면 전체 요청도 90% 절감되나요?',['가변 입력·출력·쓰기 비용이 남으므로 그렇지 않다','항상 90% 절감된다','출력 토큰도 무료가 된다'],0,'캐시 읽기 할인은 고정 prefix 부분의 단가에만 적용합니다. 전체 비용은 각 부분과 hit 수를 합산해야 합니다.')
    }
  };
  // 추가 원본 교안·실습의 핵심: 그래프 의미 질의, 관계형 집계, 프로토콜 상태.
  const sqlEmployees=[{id:1,name:'김철수'},{id:2,name:'이영희'},{id:3,name:'박지민'},{id:4,name:'최수진'},{id:5,name:'정민호'},{id:6,name:'한소영'},{id:7,name:'오준서'},{id:8,name:'윤지혜'},{id:9,name:'강태현'},{id:10,name:'서미래'}];
  const sqlProducts=[{id:1,category:'클라우드',price:50000},{id:2,category:'클라우드',price:150000},{id:3,category:'데이터',price:300000},{id:4,category:'AI',price:500000},{id:5,category:'보안',price:200000},{id:6,category:'클라우드',price:100000},{id:7,category:'AI',price:400000},{id:8,category:'데이터',price:80000}];
  // [sales.id, product_id, employee_id, 거래총액(원), 수량, 거래일]: sample_db.py 원본 리스트.
  const sqlSales=[[1,1,4,50000,1,'2025-07-15'],[2,2,4,300000,2,'2025-08-20'],[3,4,10,1500000,3,'2025-09-10'],[4,3,7,300000,1,'2025-10-05'],[5,5,4,400000,2,'2025-10-22'],[6,1,7,150000,3,'2025-11-03'],[7,2,10,450000,3,'2025-11-15'],[8,6,4,200000,2,'2025-12-01'],[9,4,10,1000000,2,'2025-12-18'],[10,7,7,400000,1,'2026-01-10'],[11,3,4,600000,2,'2026-01-25'],[12,8,10,240000,3,'2026-02-05'],[13,2,7,150000,1,'2026-02-14'],[14,5,4,600000,3,'2026-02-28'],[15,4,10,2000000,4,'2026-03-05'],[16,1,7,100000,2,'2026-03-12'],[17,6,4,300000,3,'2026-03-18'],[18,7,10,800000,2,'2026-03-19']];
  Object.assign(modules,{
    'rag-graph-path':{
      title:'GraphRAG 관계 경로: 두 hop과 시점·방향 검증',
      intro:'가상 KG의 acquiredBy→headquarters 패턴을 정확히 따라갑니다. 관계 종류·방향·유효 판본이 맞는 경로만 답의 근거가 됩니다. 실제 그래프 DB·entity linking·LLM 실행이 아닙니다.',
      defaults:{hops:2,version:'current',direction:'forward'},
      controls:[rng('hops','최대 관계 hop',0,3),sel('version','유효 판본',[['current','현재 유효 관계만'],['all','이전 관계까지 혼합']]),sel('direction','간선 해석',[['forward','저장된 방향'],['reverse','반대로 해석 (오류 비교)']])],
      steps:stages([['자료','질문의 관계 패턴과 출처·판본을 고정합니다.'],['첫 관계','A의 인수자를 찾습니다.'],['둘째 관계','찾은 인수자의 본사 도시로 연결합니다.'],['근거 경로','완성 경로와 모호함·보류를 판정합니다.']]),
      compute(p,step){
        const edges=[{s:'A',r:'acquiredBy',t:'B',source:'P1',current:true},{s:'B',r:'headquarters',t:'부산',source:'P2',current:true},{s:'A',r:'acquiredBy',t:'C',source:'P3',current:false},{s:'C',r:'headquarters',t:'서울',source:'P4',current:true},{s:'B',r:'donatedTo',t:'C',source:'P5',current:true}],eligible=edges.filter(e=>p.version==='all'||e.current),oriented=eligible.map(e=>({...e,s:p.direction==='forward'?e.s:e.t,t:p.direction==='forward'?e.t:e.s})),pattern=['acquiredBy','headquarters'],limit=Math.min(Number(p.hops),2),frames=[[{nodes:['A'],sources:[],relations:[]}]];
        for(let h=0;h<limit;h++)frames.push(frames[h].flatMap(path=>oriented.filter(e=>e.s===path.nodes[path.nodes.length-1]&&e.r===pattern[h]).map(e=>({nodes:[...path.nodes,e.t],sources:[...path.sources,e.source],relations:[...path.relations,e.r]}))));
        const paths=limit===2?frames[2]:[],cities=[...new Set(paths.map(x=>x.nodes[2]))].sort(),frame=frames[Math.min(step,limit)],state=cities.length===1?'단일 도시의 근거 경로 확보':cities.length>1?'여러 판본 경로 충돌: 적용 시점 확인':'본사 근거 미확보: 보류';
        let html=table(['주어','관계','목적어','출처','현재 유효'],edges.map(e=>[e.s,e.r,e.t,e.source,e.current?'예':'아니오']),'가상 KG · 질의 패턴 acquiredBy → headquarters');
        if(step>=1)html=advance(table(['현재 경로','관계열','원문 출처'],frame.map(x=>[x.nodes.join(' → '),x.relations.join(' → ')||'시작',x.sources.join(' + ')||'없음']),`실제 ${Math.min(step,limit)} hop에서 확보한 바인딩`),html);
        if(step>=2)html=advance(para(`완성 경로 ${paths.length}개, 서로 다른 도시 ${cities.length}개. donatedTo는 연결되어 있어도 headquarters 자리에 사용할 수 없습니다.`),html);
        if(step>=3)html=advance(table(['완성된 관계 경로','원문 조합'],paths.map(x=>[x.nodes.join(' → '),x.sources.join(' + ')]),'경로마다 두 관계의 출처를 보존')+para(state+'. 그래프 추출 결과는 원문 증거를 대신하지 않으며 시점·동명이인·권한을 확인해야 합니다.'),html);
        return out(html,`유효 간선 ${eligible.length}개, 허용 hop ${limit}, 완성 ${paths.length}경로입니다. ${state}. 방향이나 타입을 잃은 단순 연결을 사실 추론으로 바꾸지 않습니다.`,[['완성 경로',paths.length],['도시 수',cities.length],['상태',state]],{edges,eligible,frames,paths,cities,limit,state},{id:'rag-graph-path',step,p});
      },
      question:quiz('A→B만 찾고 B의 본사 관계를 못 찾았다면?',['인수자만 확인하고 본사는 보류','A와 유사한 도시로 답','현재 가장 큰 노드를 본사로 선택'],0,'두 hop 질문은 두 관계를 모두 확보해야 합니다. 연결 방향·관계 종류·원문도 확인합니다.')
    },
    'rag-graph-scope':{
      title:'지역·전역 검색: community 보고서의 근거 합집합',
      intro:'수작업 가상 보고서 C1={F1,F2}, C2={F2,F3,F4}, C3={F5,F6}을 사용합니다. Local은 한 seed 보고서, Global은 모든 보고서를 예산 내에서 읽고 사실 ID를 합칩니다. 실제 커뮤니티 탐지·요약·정답률 측정이 아닙니다.',
      defaults:{mode:'global',seed:'C1',budget:240},
      controls:[sel('mode','검색 범위',[['local','Local: 특정 개체의 보고서'],['global','Global: 전체 보고서']]),sel('seed','Local seed',[['C1','C1 배송'],['C2','C2 환불'],['C3','C3 결제']]),rng('budget','보고서 입력 예산 (가상 토큰)',40,300,20)],
      steps:stages([['보고서','원문 사실 ID·길이를 고정합니다.'],['범위·예산','Local/Global 후보 중 예산에 맞는 보고서를 선택합니다.'],['Map','보고서별로 지원하는 사실을 모읍니다.'],['Reduce','중복 ID를 합쳐 전체 사실 회수를 계산합니다.']]),
      compute(p,step){
        const reports=[{id:'C1',topic:'배송',facts:['F1','F2'],tokens:80},{id:'C2',topic:'환불',facts:['F2','F3','F4'],tokens:100},{id:'C3',topic:'결제',facts:['F5','F6'],tokens:60}],candidates=p.mode==='local'?reports.filter(x=>x.id===p.seed):reports,budget=Number(p.budget),selected=[],skipped=[];let used=0;
        for(const r of candidates){if(used+r.tokens<=budget){selected.push(r);used+=r.tokens;}else skipped.push(r.id);}
        const raw=selected.flatMap(x=>x.facts),union=[...new Set(raw)].sort(),coverage=union.length/6;
        let html=table(['보고서','주제','수작업 지원 사실 ID','지정 길이'],reports.map(x=>[x.id,x.topic,x.facts.join(', '),x.tokens]),'보고서 길이는 같은 단위의 가정값 · 실제 tokenizer 출력 아님');
        if(step>=1)html=advance(table(['후보 순서','선택','예산으로 제외','사용/예산'],[[candidates.map(x=>x.id).join(', '),selected.map(x=>x.id).join(', ')||'없음',skipped.join(', ')||'없음',`${used}/${budget}`]],'지정 순서 C1→C2→C3, 들어가는 보고서를 순서대로 선택'),html);
        if(step>=2)html=advance(table(['Map 입력','부분 사실','원문 확인 필요'],selected.map(x=>[x.id,x.facts.join(', '),'추출·요약 라벨은 수작업 가정']),'실제 LLM 부분 답변을 실행하지 않은 집합 계산'),html);
        if(step>=3)html=advance(para(`Reduce 합집합 {${union.join(', ')}}: ${union.length}/6=${fmt(coverage)}. 보고서별 사실 수 합 ${raw.length}에서 중복 ${raw.length-union.length}개를 제거했습니다. 이는 지정된 사실 집합의 회수율이며 실제 시스템의 answer accuracy가 아닙니다.`),html);
        return out(html,`${p.mode==='local'?'지역':'전역'} 범위에서 ${selected.length}보고서·${used}가상 토큰·${union.length}사실을 모았습니다. 특정 개체 검색과 전체 주제 요약은 필요한 범위가 다르며 생성 보고서를 원문 증거로 혼동하지 않습니다.`,[['선택 보고서',selected.length],['입력 길이',used],['사실 합집합',union.length],['지정 사실 회수',fmt(coverage)]],{reports,candidates,selected,skipped,budget,used,raw,union,coverage},{id:'rag-graph-scope',step,p});
      },
      question:quiz('세 보고서 사실 수 2+3+2가 7인데 합집합은?',['F2가 중복되어 6개','항상 7개','전역 검색이면 확률이 1'],0,'동일 사실 ID F2가 두 보고서에 있어 한 번만 셉니다. 실제 지원 여부는 별도 원문 검증이 필요합니다.')
    },
    'rag-sparql-bindings':{
      title:'SPARQL OPTIONAL: 사실 집합과 결과 행 중복',
      intro:'Alice(30세, email2개), Bob(20세, email없음), Cara(40세,email1개)라는 작은 고정 그래프의 패턴을 배열로 계산합니다. OPTIONAL·필수 email·투영·DISTINCT가 바인딩 수를 어떻게 바꾸는지 봅니다. 실제 SPARQL 엔진 실행은 아닙니다.',
      defaults:{minAge:0,optional:'yes',projection:'bindings'},
      controls:[rng('minAge','최소 나이 (이상)',0,50,5),sel('optional','email 패턴',[['yes','OPTIONAL: 없어도 왼쪽 행 보존'],['no','필수: email 없는 사람 제외']]),sel('projection','SELECT 투영',[['bindings','person·name·email'],['names','name만 (중복 유지)'],['distinct','DISTINCT name']])],
      steps:stages([['이름 패턴','이름·나이와 email 사실을 구분합니다.'],['FILTER','최소 나이 조건의 왼쪽 바인딩을 만듭니다.'],['email 결합','한 사람의 여러 email과 미바인딩을 처리합니다.'],['투영','열을 줄여도 남는 행 중복과 DISTINCT를 계산합니다.']]),
      compute(p,step){
        const people=[{id:'Alice',age:30,emails:['a1@example.org','a2@example.org']},{id:'Bob',age:20,emails:[]},{id:'Cara',age:40,emails:['c@example.org']}],left=people.filter(x=>x.age>=Number(p.minAge)),bindings=left.flatMap(x=>x.emails.length?x.emails.map(email=>({person:x.id,name:x.id,email})):p.optional==='yes'?[{person:x.id,name:x.id,email:null}]:[]),projected=p.projection==='bindings'?bindings.map(x=>[x.person,x.name,x.email===null?'미바인딩':x.email]):p.projection==='names'?bindings.map(x=>[x.name]):[...new Set(bindings.map(x=>x.name))].map(x=>[x]),uniquePeople=[...new Set(bindings.map(x=>x.person))];
        let html=table(['person/name','age','email 사실'],people.map(x=>[x.id,x.age,x.emails.join(', ')||'사실 없음']),'원본 triple은 집합, 결과 바인딩은 여러 조합');
        if(step>=1)html=advance(table(['왼쪽 바인딩','age ≥ 최소나이'],left.map(x=>[x.id,x.age]),'공유 person 변수의 이름·나이 패턴 결합 후 FILTER'),html);
        if(step>=2)html=advance(table(['person','name','email'],bindings.map(x=>[x.person,x.name,x.email===null?'미바인딩':x.email]),'OPTIONAL의 미바인딩은 email 문자열 "null"이라는 사실이 아님'),html);
        if(step>=3)html=advance(table(p.projection==='bindings'?['person','name','email']:['name'],projected,'SELECT 결과 · DISTINCT는 투영된 값 기준')+para(`바인딩 ${bindings.length}행, 서로 다른 사람 ${uniquePeople.length}명, 최종 ${projected.length}행입니다. 이름만 SELECT한다고 같은 사람의 여러 행이 자동으로 없어지지 않습니다.`),html);
        return out(html,`필터 후 ${left.length}명 → email 결합 ${bindings.length}행 → 투영 ${projected.length}행입니다. 미바인딩·중복·OPTIONAL 밖 FILTER의 의미를 구분하며 SELECT 문자열을 실제 DB에 보내지는 않습니다.`,[['왼쪽 사람',left.length],['결합 행',bindings.length],['서로 다른 사람',uniquePeople.length],['결과 행',projected.length]],{people,left,bindings,projected,uniquePeople},{id:'rag-sparql-bindings',step,p});
      },
      question:quiz('Alice email 두 개를 name만 SELECT하면 기본 결과는?',['Alice가 두 행 남는다','자동으로 한 행','email이 없어진 만큼 0행'],0,'투영은 열을 줄이고 DISTINCT는 투영된 행의 중복을 제거합니다. 두 연산은 다릅니다.')
    },
    'rag-sql-join':{
      title:'SQL JOIN·집계: 원본 18거래에서 매출 합계까지',
      intro:'실습 sample_db.py의 직원10명·제품8개·거래18건을 그대로 사용해 JavaScript 배열에서 키 JOIN·필터·LEFT JOIN 집계를 계산합니다. 원본 DB·SQL parser·LLM을 실행하지 않습니다. amount는 거래 총액(원)입니다.',
      defaults:{year:'all',category:'AI',join:'keyed',aggregation:'amount',top:10},
      controls:[sel('year','거래연도',[['all','전체 2025–2026'],['2025','2025년'],['2026','2026년']]),sel('category','제품 category',[['AI','AI'],['all','전체'],['클라우드','클라우드'],['데이터','데이터'],['보안','보안']]),sel('join','제품 결합',[['keyed','정상: product_id=id'],['cartesian','오류 비교: ON 없는 곱집합']]),sel('aggregation','집계식',[['amount','정상 SUM(amount)'],['double','오류 비교 SUM(amount×quantity)']]),rng('top','최종 상위 직원 수',1,10)],
      steps:stages([['원본 행','키·거래총액·수량을 구별합니다.'],['JOIN·조건','제품 키와 날짜·category 조건을 적용합니다.'],['직원별 집계','LEFT JOIN의 COUNT와 SUM을 계산합니다.'],['정렬·한계','동점 ID 순서와 의미 오류를 확인합니다.']]),
      compute(p,step){
        const dated=sqlSales.filter(s=>p.year==='all'||s[5].startsWith(p.year)),joined=dated.flatMap(s=>sqlProducts.filter(product=>(p.join==='cartesian'||product.id===s[1])&&(p.category==='all'||product.category===p.category)).map(product=>({sale:s[0],product:product.id,employee:s[2],amount:s[3],quantity:s[4],date:s[5],value:s[3]*(p.aggregation==='double'?s[4]:1)}))),groups=sqlEmployees.map(e=>{const rows=joined.filter(s=>s.employee===e.id);return{id:e.id,name:e.name,count:rows.length,countStar:Math.max(1,rows.length),sum:sum(rows.map(s=>s.value))};}).sort((a,b)=>b.sum-a.sum||a.id-b.id),total=sum(joined.map(x=>x.value)),top=groups.slice(0,Number(p.top));
        let html=table(['sales.id','product_id','employee_id','amount 원','quantity','sale_date'],sqlSales.map(x=>x),'sample_db.py의 원본 거래18건 · amount에 수량을 다시 곱하지 않기');
        if(step>=1)html=advance(table(['거래','매칭 제품','직원','amount','계산 투입값'],joined.slice(0,24).map(x=>[x.sale,x.product,x.employee,x.amount,x.value]),`조건 후 실제 결합 ${joined.length}행 · 표는 앞24행${joined.length>24?' (전체 합계에는 모든 행 사용)':''}`),html);
        if(step>=2)html=advance(table(['직원 ID','이름','COUNT(f.id)','COUNT(*)','COALESCE(SUM,0) 원'],groups.map(g=>[g.id,g.name,g.count,g.countStar,g.sum]),'필터된 거래를 직원10명에 LEFT JOIN · 거래 없는 직원도 표시'),html);
        if(step>=3)html=advance(table(['최종 순위','직원','집계 원'],top.map((g,i)=>[i+1,g.name,g.sum]),'합계 내림차순·직원 ID 오름차순, 정렬 후 LIMIT')+para(`${p.join==='cartesian'?'ON 없는 제품 곱집합이 거래를 증식시킵니다. ':''}${p.aggregation==='double'?'거래총액에 수량을 다시 곱해 단위·의미가 틀립니다. ':''}총 집계 ${total}원. 페이지 계산이 유한해도 오류 비교 모드는 올바른 매출이 아닙니다. HTML의 별도 시연 데이터와 원본 거래를 섞지 않습니다.`),html);
        return out(html,`날짜 후보 ${dated.length}건 → 제품 조건 결합 ${joined.length}행 → 직원 ${groups.length}묶음입니다. 결과는 ${p.join==='keyed'&&p.aggregation==='amount'?'지정한 조건의 원본 거래 집계':'의도적으로 틀린 결합/집계식의 비교 결과'}이며 실제 DB 실행이나 현재 매출 측정이 아닙니다.`,[['조건 후 결합 행',joined.length],['전체 집계 원',total],['매출 있는 직원',groups.filter(x=>x.count>0).length],['1위 집계 원',groups[0].sum]],{dated,joined,groups,total,top},{id:'rag-sql-join',step,p});
      },
      question:quiz('거래 amount=150만원, quantity=3이면 매출 집계에 넣을 값은?',['150만원','450만원','제품 가격만'],0,'이 원본의 amount는 이미 거래 총액입니다. 수량을 다시 곱하면 잘못된 집계입니다.')
    },
    'rag-mcp-state':{
      title:'MCP 상태: 초기화·Tool 발견·같은 ID의 결과 채택',
      intro:'실제 Text2SQL 코드의 stdio·네 Tool을 기준으로 가상 요청 로그를 만듭니다. 초기화, schema/SQL 준비, 실행 결과와 request ID, 제한 재시도를 계산합니다. 프로토콜·DB·LLM을 실행하지 않습니다.',
      defaults:{initialize:'yes',tool:'known',outcome:'rows',id:'match',retry:1},
      controls:[sel('initialize','초기화 협상',[['yes','initialize·initialized 완료'],['no','초기화 생략']]),sel('tool','생성한 Tool 이름',[['known','query_db: 발견된 Tool'],['unknown','run_magic_sql: 미지원 Tool']]),sel('outcome','가상 실행 관측',[['rows','정상 행 반환'],['empty','정상0행'],['sqlerror','첫 SQL 오류·수정 재시도 시 성공'],['transport','연결/프로토콜 오류']]),sel('id','결과 request ID',[['match','호출과 같은 ID'],['mismatch','다른 ID (채택 금지)']]),rng('retry','SQL 수정 재시도 상한',0,2)],
      steps:stages([['연결 준비','stdio 서버와 초기화의 전제를 구분합니다.'],['기능 탐색','협상 후 tools/list와 네 Tool을 확인합니다.'],['질의 준비','schema를 받아 Host가 SQL을 만드는 시점을 봅니다.'],['실행·연결','동일 ID 결과와 오류·재시도를 구분합니다.'],['종료 상태','성공0행·정상행·오류·보류를 다르게 기록합니다.']]),
      compute(p,step){
        const tools=['get_schema','query_db','list_tables','sample_data'],log=[],maxRetry=Number(p.retry);let requests=0,executions=0,retries=0,accepted=0,state='초기화 미완료: 도구 호출 금지';
        const add=(phase,method,status,detail)=>log.push({phase,method,id:++requests,status,detail});
        if(p.initialize==='yes'){
          add(1,'initialize','완료','버전·capabilities 협상 후 initialized 알림 (알림은 request ID 없음)');add(1,'tools/list','완료',tools.join(', '));add(2,'tools/call get_schema','완료','실제 코드에서는 schema도 Tool, Host가 SQL 생성');
          if(p.tool==='unknown'){state='미지원 Tool: DB 실행 전 차단';add(3,'tools/call run_magic_sql','오류','발견 목록에 없음');}
          else {
            executions++;add(3,'tools/call query_db',p.outcome==='sqlerror'?'SQL 오류':p.outcome==='transport'?'연결 오류':'도구 응답',p.id==='match'?'호출 ID와 같은 응답':'다른 ID의 응답');
            if(p.outcome==='transport')state='연결/프로토콜 오류: 결과 미확인';
            else if(p.id==='mismatch')state='ID 불일치: 현재 호출 결과로 채택 금지';
            else if(p.outcome==='sqlerror'){
              state='SQL 오류: 수정 예산 소진';
              if(maxRetry>0){retries++;executions++;add(3,'tools/call query_db (수정)','완료','같은 schema로 잘못된 열 이름을 수정한 가상 결과');accepted++;state='수정 후 정상 행: 의미·단위 검증 필요';}
            } else {accepted++;state=p.outcome==='empty'?'정상0행: 질문 조건·자료 범위 확인':'정상 행: 의미·단위 검증 필요';}
          }
        }
        const shown=log.filter(x=>x.phase<=step),needsSchema=step>=2;
        let html=table(['서버 예제','Tool 목록','역할'],[['stdio 연결',tools.join(', '),'Server는 schema·DB 조회, SQL 생성은 Host의 LLM']],'개념 상태 모형 · 실제 JSON-RPC 전송 없음');
        if(step>=1)html=advance(table(['단계','method','request ID','상태','관측'],shown.map(x=>[x.phase,x.method,x.id,x.status,x.detail]),'request ID는 요청-응답 연결용, 프로토콜 알림에는 ID 없음'),html);
        if(needsSchema)html=advance(para('스키마 → Host의 SQL 생성 → 인자·권한·길이 검증 → Tool 호출 순서입니다. schema 이름을 안다고 DB 연결이 성공한 것은 아닙니다.'),html);
        if(step>=3)html=advance(table(['DB 실행 시도','SQL 재시도','현재 호출로 채택한 결과'],[[executions,retries,accepted]],'가상 시도 수 · 실제 DB 접속 수가 아님'),html);
        if(step>=4)html=advance(para(`종료: ${state}. 오류·미지원·ID 불일치를 성공이나 사실의 부재로 바꾸지 않습니다. tool 출력이 맞더라도 질문의 날짜·단위·JOIN이 맞는지는 별도로 검증합니다.`),html);
        return out(html,`요청 ${requests}개, DB 실행 가상 시도 ${executions}회, SQL 수정 ${retries}/${maxRetry}회, 채택 결과 ${accepted}개입니다. ${state}. MCP 연결의 성공과 의미적 정답을 구분합니다.`,[['요청 수',requests],['가상 실행 시도',executions],['채택 결과',accepted],['종료',state]],{tools,log,requests,executions,retries,accepted,state,maxRetry},{id:'rag-mcp-state',step,p});
      },
      question:quiz('query_db의 결과 ID가 현재 호출과 다르면?',['현재 호출의 결과로 채택하지 않는다','내용이 그럴듯하면 성공','새 SQL 생성 비용이 0이 된다'],0,'request ID는 요청과 결과를 연결합니다. 다른 호출의 행을 현재 질의의 근거로 사용하면 안 됩니다.')
    },
    'rag-ann-shortcut':{
      title:'ANN α-shortcut: 엄격 부등호와 수축 충분조건',
      intro:'p=(0,0), A=(1,0), B=(2,0), C=(0,2), D=(3,0)의 원본 방식 toy 간선 선택을 계산합니다. 전체 후보를 거리순으로 보고 witness를 남깁니다. 실제 Vamana/DiskANN 구축·성능 보장이 아닙니다.',
      defaults:{alpha:2,epsilon:3},
      controls:[rng('alpha','α (엄격 shortcut 계수)',1.1,5,0.1),rng('epsilon','허용 근사 ε',0.25,4,0.25)],
      steps:stages([['거리','L2 metric과 완전 후보 순서를 정합니다.'],['간선 선택','선택 u와 엄격 D(u,v)<D(p,v)/α를 비교합니다.'],['Witness','각 제거 노드를 대신하는 선택 이웃을 보존합니다.'],['수축 상한','φ와 α>1+2/ε의 충분조건을 계산합니다.']]),
      compute(p,step){
        const alpha=Number(p.alpha),epsilon=Number(p.epsilon),points={A:[1,0],B:[2,0],C:[0,2],D:[3,0]},dp=id=>Math.hypot(...points[id]),d=(a,b)=>Math.hypot(points[a][0]-points[b][0],points[a][1]-points[b][1]),chosen=[],witness={},comparisons=[];let pending=Object.keys(points).sort((a,b)=>dp(a)-dp(b)||a.localeCompare(b));
        while(pending.length){const u=pending.shift();chosen.push(u);const retained=[];for(const v of pending){const uv=d(u,v),threshold=dp(v)/alpha,prune=uv<threshold;comparisons.push({u,v,uv,threshold,prune});if(prune)witness[v]=u;else retained.push(v);}pending=retained;}
        const phi=1/alpha+(1+1/alpha)/(1+epsilon),thresholdAlpha=1+2/epsilon,guaranteed=alpha>thresholdAlpha,property=Object.keys(points).every(v=>chosen.includes(v)||(witness[v]&&d(witness[v],v)<dp(v)/alpha));
        let html=table(['후보','좌표','D(p,v)'],Object.entries(points).map(([id,xy])=>[id,xy.join(', '),fmt(dp(id))]),'완전 후보·L2 metric·동점은 ID 순서');
        if(step>=1)html=advance(table(['선택 u','후보 v','D(u,v)','D(p,v)/α','엄격 < 판정'],comparisons.map(x=>[x.u,x.v,fmt(x.uv),fmt(x.threshold),x.prune?'제거':'유지']),'표시 전 원래 실수로 비교 · 같으면 제거하지 않음'),html);
        if(step>=2)html=advance(table(['v','직접 이웃','제거 witness'],Object.keys(points).map(v=>[v,chosen.includes(v)?'선택':'아님',witness[v]||'불필요']),'모든 v가 직접 이웃 또는 보존된 witness를 가짐'),html);
        if(step>=3)html=advance(para(`φ=1/α+(1+1/α)/(1+ε)=${fmt(phi)}. 충분조건 α>${fmt(thresholdAlpha)}는 ${guaranteed?'충족':'미충족'}입니다. ${guaranteed?'완전 후보와 모든 노드의 shortcut 성질·metric·엄격 greedy 이동이라는 전제가 있어야 수축 보장을 적용합니다.':'이 상한으로 수축을 보장하지 못하지만 실제 탐색 실패를 증명한 것은 아닙니다.'} degree cap·후보 제한을 가진 실용 인덱스로 보장을 확대하지 않습니다.`),html);
        return out(html,`α=${fmt(alpha)}에서 이웃 ${chosen.join(', ')}을 남기고 ${Object.keys(witness).length}개를 witness로 제거합니다. φ=${fmt(phi)}, 수축 충분조건 ${guaranteed?'충족':'미충족'}. 비교식은 엄격 <이고 metric 전제가 필요합니다.`,[['선택 간선',chosen.length],['제거 후보',Object.keys(witness).length],['φ',fmt(phi)],['충분조건',guaranteed?'충족':'미충족']],{points,alpha,epsilon,chosen,witness,comparisons,phi,thresholdAlpha,guaranteed,property},{id:'rag-ann-shortcut',step,p});
      },
      question:quiz('D(u,v)=D(p,v)/α이면 원본의 엄격 규칙은?',['제거하지 않는다','반드시 제거한다','α를 자동으로 0으로 바꾼다'],0,'조건이 <이므로 경계의 동일값은 거짓입니다. ≤로 바꾸면 다른 그래프가 됩니다.')
    },
    'rag-crag-score':{
      title:'CRAG 평가: 네 등급의 벌점과 평가 실패 분모',
      intro:'원본 실습의 perfect=1, acceptable=.5, missing=0, incorrect=−1을 계산합니다. 평가 실패는 의미적 incorrect·정상 거절과 구분해 개수와 가용성을 보고합니다. 실제 모델 응답·judge 평가가 아닙니다.',
      defaults:{perfect:4,acceptable:2,missing:3,incorrect:1,failed:0,policy:'separate'},
      controls:[rng('perfect','완전 정답 P',0,10),rng('acceptable','부분 허용 A',0,10),rng('missing','정상 보류 M',0,10),rng('incorrect','오답 I',0,10),rng('failed','실행/판정 실패 F',0,10),sel('policy','실패 집계 규약',[['separate','실패 별도·성공 표본 평균'],['missing','원본 일부 코드처럼 실패를0점으로 매핑 (명시적 비교)']])],
      steps:stages([['판정 수','배타적 네 판정과 실패 수를 구분합니다.'],['가중 합','오답의 −1 벌점을 포함해 더합니다.'],['분모','평가 성공 수·전체 요청 수·집계 정책을 고정합니다.'],['해석','가용성·거절·동일 표본 비교의 한계를 봅니다.']]),
      compute(p,step){
        const counts=[Number(p.perfect),Number(p.acceptable),Number(p.missing),Number(p.incorrect)],failed=Number(p.failed),valid=sum(counts),total=valid+failed,weights=[1,0.5,0,-1],contributions=counts.map((x,i)=>x*weights[i]),score=sum(contributions),denominator=p.policy==='separate'?valid:total,mean=denominator?score/denominator:null,availability=total?valid/total:null,answerRate=valid?(counts[0]+counts[1]+counts[3])/valid:null,names=['perfect','acceptable','missing','incorrect'];
        let html=table(['판정','개수','질문당 점수'],names.map((name,i)=>[name,counts[i],weights[i]]),'실행/판정 실패는 별도 F='+failed);
        if(step>=1)html=advance(table(['등급','기여'],names.map((name,i)=>[name,contributions[i]]),'합점 S=P+0.5A−I')+para(`합점 ${fmt(score)}. 벌점 없는 가중 accuracy와 다른 식입니다.`),html);
        if(step>=2)html=advance(table(['평가 성공','전체 요청','평균 분모','평균 CRAG score','평가 성공률'],[[valid,total,denominator,fmt(mean),fmt(availability)]],p.policy==='separate'?'실패를 별도 보고하고 성공 표본 평균임을 명시':'실패를0점으로 매핑해 전체 요청 분모를 쓰는 비교 규약'),html);
        if(step>=3)html=advance(para(`답변률(정상 보류 외)=${fmt(answerRate)}. 실패 ${failed}건은 사실 오답 또는 적절한 거절이 확인된 건이 아닙니다. 평균과 함께 실패·null/answerable 유형별 거절을 보고하고, 시스템 간 공통 평가 표본·호출 예산을 맞춰야 합니다. 모든 개수가0이면 평균·가용성은 정의하지 않습니다.`),html);
        return out(html,`네 판정 ${valid}건·실패 ${failed}건, 합점 ${fmt(score)}, 분모 ${denominator}의 평균 ${fmt(mean)}입니다. 집계 규약과 가용성을 숨기면 점수 개선을 잘못 해석할 수 있습니다.`,[['CRAG 합점',fmt(score)],['평균',fmt(mean)],['평가 성공률',fmt(availability)],['실패 수',failed]],{counts,failed,valid,total,weights,contributions,score,denominator,mean,availability,answerRate},{id:'rag-crag-score',step,p});
      },
      question:quiz('P4,A2,M3,I1의 10질문 평균은?',['0.4','0.5','0.6'],0,'(4+0.5×2−1)/10=0.4입니다. incorrect의 −1 벌점을 빼먹지 않습니다.')
    }
  });
  // 원시 계산 data는 항상 전체 경로를 보존하고, 현재 값 패널은 실제 도달 단계만 표시한다.
  function stageMetrics(context,d,finalMetrics) {
    if(!context)return finalMetrics;
    const {id,step,p}=context;
    if(step===modules[id].steps.length-1)return finalMetrics;
    const rows=xs=>xs.map(([k,v])=>[k,v===null?fmt(v):typeof v==='number'?fmt(v):v]);
    switch(id) {
      case 'rag-posting': {const n=Math.min(step,d.trace.length),trace=d.trace[n-1];return rows([['첫 목록 길이',d.a.length],['둘째 목록 길이',d.b.length],['수행한 비교',n],['현재 반환',trace?trace.result.map(x=>'d'+x).join(', ')||'없음':'없음']]);}
      case 'rag-bm25': return rows(step===0?[['고유 질의 term',d.terms.length],['평균 문서 길이',d.avgdl]]:step===1?d.stats.map(t=>[`${t.term}의 df / BM25 IDF`,`${t.df} / ${fmt(t.idfb)}`]):d.docs[2].contributions.map(t=>[`d3 ${t.term} 기여`,t.bm25]));
      case 'rag-metrics': return rows(step===0?[['평가 슬롯 K',d.K],['관련 문서 r',d.r],['K 안의 hit',d.hits]]:step===1?[['P@K',d.P],['R@K',d.R],['RR@K',d.RR]]:[['AP 분자',sum(d.rows.map(r=>r.apTerm))],['AP 분모 r',d.r],['AP@K',d.AP]]);
      case 'rag-neural': return rows(step===0?[['입력 구조',d.mode==='ce'?'쌍별 h_CLS':'질문·문서 독립 벡터'],['질문 / 문서','2 / 2']]:step===1?[['q1의 점수',d.S[0].map(x=>fmt(x)).join(', ')],['q2의 점수',d.S[1].map(x=>fmt(x)).join(', ')]]:[['평균 CE',d.loss],['q1 positive 확률',d.P[0][0]],['q2 positive 확률',d.P[1][1]]]);
      case 'rag-ann': {const f=d.trace[Math.min(step,d.trace.length-1)];return rows([['유지 후보',f.candidates.join(', ')],['발견 수',f.seen.length],['확장 수',f.expanded.length],['남은 미확장 후보',f.candidates.filter(x=>!f.expanded.includes(x)).length]]);}
      case 'rag-context-budget': return rows(step===0?[['전체 window',d.W],['출력 예약',d.O],['입력 한도',d.input]]:step===1?[['고정 입력',d.F],['근거 가용 예산',d.available],['고정 입력 초과',d.overflow]]:[['검색 후보',d.R],['길이상 수용 개수',d.capacity],['선택 청크',d.selected]]);
      case 'rag-chunk': return rows(step===0?[['원문 길이',d.T],['유효 overlap',d.O],['시작점 간격',d.stride]]:step===1?[['청크 수',d.chunks.length],['총 저장 토큰',d.stored],['중복 토큰',d.duplicate]]:[['선택 child',d.idx===null?'없음':'C'+d.idx],['child 토큰',d.child?d.child[1]-d.child[0]:0],['확장 parent 토큰',d.parentTokens]]);
      case 'rag-sequence': return rows(step===0?[['선택 문서 K',d.K],['유지 질량',d.mass],['선택 가중치 합',sum(d.weights)]]:step===1?d.likelihood.map((x,i)=>['z'+(i+1)+' 시퀀스 확률',x]):[['문서 기여 합 Sequence',d.sequence],['Token 비교값',d.token],['NLL',d.loss]]);
      case 'rag-thorough': return rows(step===0?[['문서별 beam 수',p.beam],['발견 셀 수',d.existing]]:step===1?[['후보 합집합',d.union.length],['문서-후보 조합',d.combinations]]:[['이미 발견한 셀',d.existing],['추가 평가 셀',p.mode==='fast'?0:d.combinations-d.existing],['점수 방식',p.mode==='fast'?'Fast 0 근사':'Thorough 재평가']]);
      case 'rag-rrf': return rows(step===0?[['각 목록 깊이',d.depth],['사용 검색기',p.mode]]:step===1?[['문서 합집합',d.rows.length],['문서 ID',d.rows.map(x=>x.id).join(', ')]]:d.rows.slice(0,3).map(x=>[`${x.id}의 Dense / BM25 기여`,`${fmt(x.dc)} / ${fmt(x.bc)}`]));
      case 'rag-claims': return rows(step===0?[['제공 근거',d.ids.length],['답변 사실 주장',d.claims.length]]:step===1?[['유효 인용 ID',d.valid.filter(Boolean).length],['인용 ID 유효율',d.citationValidity]]:[['지원되는 주장',d.supported.filter(Boolean).length],['단순 지지율',d.F],['달린 인용의 지지율',d.citationSupport]]);
      case 'rag-toolformer': return rows(step===0?[['첫 토큰 가중치',d.w[0]],['둘째 토큰 가중치',d.w[1]],['세 조건의 첫 확률',d.probabilities.map(x=>fmt(x[0])).join(', ')]]:step===1?d.losses.map((x,i)=>[['Lnone','Lcall','Lplus'][i],x]):[['강한 기준 L−',d.base],['Lplus',d.losses[2]],['개선 Δ',d.delta]]);
      case 'rag-agent-mcp': {const shown=d.log.slice(0,Math.min(step,d.log.length));return rows([['호출 상한',d.max],['현재 서버 호출',shown.filter(x=>x.status!=='차단').length],['현재 확보 사실',shown.filter(x=>x.fact).length],['현재 관측',shown.length?shown[shown.length-1].status:'아직 요청 전']]);}
      case 'rag-evaluation': return rows(step===0?[['관련성 라벨',d.labels.join(', ')],['관련 컨텍스트',d.h]]:step===1?[['단순 P',d.P],['hit 위치 P 합',d.numerator],['Context Precision',d.CP]]:[['reference 사실',d.reference],['지원된 reference 사실',d.supported],['Context Recall',d.CR]]);
      case 'rag-cost': return rows(step===0?[['고정 prefix 토큰',d.I],['가변 입력 토큰',d.V],['출력 토큰',d.O]]:step===1?[['캐시 없음 1회 $',d.plain],['쓰기 1회 $',d.write],['읽기 1회 $',d.read]]:[['전체 호출',d.n],['읽기 / 쓰기',`${d.reads} / ${d.writes}`],['누적 비용 $',d.total]]);
      case 'rag-graph-path': {const f=d.frames[Math.min(step,d.limit)];return rows(step===0?[['원본 관계',d.edges.length],['필요 관계 패턴','acquiredBy → headquarters']]:[['현재 hop',Math.min(step,d.limit)],['현재 경로 수',f.length],['현재 경로',f.map(x=>x.nodes.join(' → ')).join('; ')||'없음']]);}
      case 'rag-graph-scope': return rows(step===0?[['전체 보고서',d.reports.length],['전체 가상 토큰',sum(d.reports.map(x=>x.tokens))]]:step===1?[['선택 보고서',d.selected.length],['사용 / 예산',`${d.used} / ${d.budget}`],['제외',d.skipped.join(', ')||'없음']]:[['Map 사실 항목',d.raw.length],['Map 입력 보고서',d.selected.map(x=>x.id).join(', ')||'없음']]);
      case 'rag-sparql-bindings': return rows(step===0?[['원본 사람',d.people.length],['email 사실',sum(d.people.map(x=>x.emails.length))]]:step===1?[['FILTER 뒤 사람',d.left.length],['남은 사람',d.left.map(x=>x.id).join(', ')||'없음']]:[['email 결합 행',d.bindings.length],['서로 다른 사람',d.uniquePeople.length],['미바인딩 행',d.bindings.filter(x=>x.email===null).length]]);
      case 'rag-sql-join': return rows(step===0?[['원본 거래',sqlSales.length],['원본 제품',sqlProducts.length],['원본 직원',sqlEmployees.length]]:step===1?[['날짜 후보',d.dated.length],['조건 뒤 결합 행',d.joined.length],['투입 집계값 합',d.total]]:[['직원 묶음',d.groups.length],['거래 있는 직원',d.groups.filter(x=>x.count).length],['집계 매출 합',d.total]]);
      case 'rag-mcp-state': {const shown=d.log.filter(x=>x.phase<=step);return rows(step===0?[['서버 transport','stdio (교육용 모형)'],['초기화 선택',p.initialize==='yes'?'협상 후 진행':'초기화 생략']]:step<3?[['현재 요청 수',shown.length],['현재 method',shown.length?shown[shown.length-1].method:'아직 요청 없음']]:[['가상 DB 시도',d.executions],['SQL 수정 재시도',d.retries],['채택 결과',d.accepted]]);}
      case 'rag-ann-shortcut': return rows(step===0?[['완전 후보',Object.keys(d.points).length],['거리','L2 metric']]:step===1?[['선택 간선',d.chosen.length],['엄격 부등호 비교',d.comparisons.length]]:[['제거 후보',Object.keys(d.witness).length],['witness 성질',d.property?'성립':'미성립']]);
      case 'rag-crag-score': return rows(step===0?[['평가 성공',d.valid],['실행/판정 실패',d.failed],['전체 요청',d.total]]:step===1?[['정답 기여',d.contributions[0]],['부분 허용 기여',d.contributions[1]],['오답 기여',d.contributions[3]],['CRAG 합점',d.score]]:[['평균 분모',d.denominator],['평균',d.mean],['평가 성공률',d.availability]]);
      default:return finalMetrics;
    }
  }
  function stageHint(context) {
    if(!context)return '';
    const {id,step,p}=context;let text='';
    if(id==='rag-bm25'&&step<2)text='현재는 원문 빈도·df를 확인합니다. k₁와 b는 이 통계를 바꾸지 않으며, 3단계 기여와 4단계 점수·곡선에서 효과를 확인합니다.';
    if(id==='rag-neural')text=step<2?'τ는 3단계 softmax부터 적용됩니다. bias·negative 점수는 2단계 점수에서 확인하세요.':'모든 점수에 같은 bias를 더하면 softmax·loss가 같습니다. 이는 정규화의 상쇄 성질이며, 비대각 negative나 τ를 바꾸면 확률이 달라집니다.';
    if(id==='rag-ann'&&step>=3)text='미확장 유지 후보가 0개이면 실제 탐색은 이미 종료됐습니다. 이 단계에서는 가짜 hop을 만들지 않고 남은 경로와 exact 대비 반환 결과를 확인합니다.';
    if(id==='rag-chunk'&&step<2)text='parent 크기는 3단계 확장 범위에 적용됩니다. child 번호가 청크 수를 넘으면 마지막 청크를 유지하므로 더 큰 번호에서도 선택 범위가 같습니다.';
    if(id==='rag-thorough'&&step<2)text='Fast/Thorough는 같은 후보를 발견합니다. 차이는 3단계의 미발견 셀 처리와 4단계 점수에서 확인합니다.';
    if(id==='rag-rrf'&&step<2)text='c는 원래 검색 순위·후보 집합을 바꾸지 않습니다. 3단계 역순위 기여부터 수치가 바뀌며, c를 바꿔도 최종 순위가 유지될 수 있습니다.';
    if(id==='rag-toolformer'&&step<3)text='필터 임계값·도구 성공 여부는 원문 확률과 NLL을 바꾸지 않습니다. 4단계에서 Δ≥τf와 실행 유효성을 함께 판정합니다.';
    if(id==='rag-agent-mcp'&&Number(p.maxCalls)>2)text='필요 근거 두 개를 먼저 확보하면 상한까지 호출하지 않습니다. 호출 상한을 3→4로 늘려도 성공 결과가 같은 이유입니다.';
    if(id==='rag-cost'&&step<2)text='질문 수·호출 수·hit 비율은 요청 1회의 토큰과 단가를 바꾸지 않습니다. 3단계 반복 합에서 효과를 확인합니다.';
    if(id==='rag-graph-path'&&step===0)text='현재는 원본 관계를 그대로 봅니다. hop·판본·방향 조건의 효과는 다음 단계의 실제 경로에서 확인합니다.';
    if(id==='rag-graph-scope'&&p.mode==='global')text='Global은 전체 보고서를 대상으로 하므로 Local seed를 바꿔도 결과가 같습니다. seed의 효과를 보려면 검색 범위를 Local로 바꾸세요.';
    if(id==='rag-sparql-bindings'&&step<3)text=step===0?'현재는 고정 원본입니다. 최소 나이는 2단계 FILTER, email 조건은 3단계 결합, SELECT/DISTINCT는 4단계에 적용됩니다.':'SELECT/DISTINCT는 4단계 투영에서 적용됩니다. 앞선 email 결합 행을 바꾸는 연산이 아닙니다.';
    if(id==='rag-sql-join'&&step<3)text=step===0?'현재는 원본 거래 18건입니다. 입력을 바꿔도 원본 행은 보존하며, 2단계부터 조건·JOIN 결과, 4단계에서 상위 직원 수를 확인합니다.':'상위 직원 수는 4단계 LIMIT에 적용됩니다. 날짜·category·결합/집계식은 현재 조건 결과를 바꿉니다.';
    if(id==='rag-mcp-state'&&(p.outcome!=='sqlerror'||p.initialize!=='yes'||p.tool!=='known'||p.id!=='match'))text='SQL 수정 재시도는 초기화·지원 Tool·ID 확인을 통과한 SQL 오류에서만 사용합니다. 정상 행·초기화 실패·미지원 Tool·ID 불일치에서는 상한을 늘려도 추가 시도하지 않습니다.';
    if(id==='rag-ann-shortcut')text=step===0?'현재는 고정 좌표와 원래 거리입니다. α는 2단계 제거 임계값, ε는 4단계 수축 상한에서 확인합니다.':'α는 연속 임계값을 바꾸지만 선택 간선은 경계를 넘을 때만 바뀝니다. ε는 좌표·간선을 바꾸지 않고 마지막 단계의 충분조건을 바꿉니다.';
    if(id==='rag-crag-score'&&Number(p.failed)===0)text='실행/판정 실패가 0개이면 두 집계 규약의 분모가 같아 평균도 같습니다. 실패 수를 늘린 뒤 3단계에서 분모 차이를 확인하세요.';
    return text?`<p class="rag-interaction-hint" role="note" style="padding:.55rem .75rem;background:#eef4fb;border-left:3px solid ${C.input}">${esc(text)}</p>`:'';
  }
  window.LabModules ||= {};
  Object.assign(window.LabModules,modules);
})();
