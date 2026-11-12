/* OnDevice 교육용 순수 계산. 표시 직전만 반올림한다. 원본·계산 가정은 대응검토 참조. */
(() => {
  'use strict';
  const C = { input: '#175EA8', target: '#7544AB', ok: '#21836B', error: '#BB560A', ink: '#183449', line: '#C8D8E5' };
  const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (x, d = 7) => Number.isFinite(x) ? (Object.is(x, -0) ? '0' : Number(x.toPrecision(d)).toString()) : '계산 불가';
  const sum = xs => xs.reduce((a,b) => a+b,0);
  const clip = (x,a,b) => Math.max(a,Math.min(b,x));
  const num = (p,k,d,a,b) => { const x = Number(p?.[k] ?? d); return clip(Number.isFinite(x) ? x : d,a,b); };
  const choice = (p,k,d,opts) => opts.includes(String(p?.[k])) ? String(p[k]) : d;
  const phase = s => Math.floor(clip(Number.isFinite(Number(s)) ? Number(s) : 0,0,3));
  // JS Math.round의 음수 tie 규칙 대신 nearest, ties-to-even을 명시적으로 사용.
  const even = x => { const lo = Math.floor(x), f = x-lo; return f < .5 ? lo : f > .5 ? lo+1 : lo % 2 === 0 ? lo : lo+1; };
  const mse = (a,b) => sum(a.map((x,i) => (x-b[i])**2))/a.length;
  const table = (heads,rows,caption='') => `<div class="od-scroll" tabindex="0" role="region" aria-label="${esc(caption||'계산 표')}"><table><caption>${esc(caption)}</caption><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const svg = (label,body,h=240) => `<div class="od-scroll od-plot" tabindex="0" role="region" aria-label="${esc(label)}"><svg viewBox="0 0 600 ${h}" role="img" aria-label="${esc(label)}" style="display:block;width:100%;height:auto"><title>${esc(label)}</title>${body}</svg></div>`;
  const label = (x,y,t,color=C.ink,anchor='start',size=17) => `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-size="${size}">${esc(t)}</text>`;
  const legend = '<p class="od-legend">청색: 입력 · 보라: 목표/복원 출력 · 녹색: 유효/완료 · 주황: 제거/포화/오차</p>';
  const style = `<style>.odlab{color:${C.ink};line-height:1.65;max-width:100%;font-variant-numeric:tabular-nums}.odlab p{max-width:76ch}.odlab .od-scroll{max-width:100%;overflow-x:auto;margin:12px 0}.odlab .od-scroll:focus-visible{outline:3px solid ${C.input};outline-offset:3px}.odlab table{border-collapse:collapse;width:100%;font-size:14px;white-space:normal}.odlab caption{text-align:left;font-weight:700;margin-bottom:6px;color:${C.ink}}.odlab th,.odlab td{border-bottom:1px solid ${C.line};text-align:left;vertical-align:top;padding:7px 9px;min-width:64px}.odlab td{white-space:nowrap;overflow-wrap:normal}.odlab th{background:#EDF4FA}.odlab .od-formula{padding:12px;border-left:4px solid ${C.target};background:#F3EFF8;overflow-wrap:anywhere}.odlab .od-note{padding:9px 12px;border-left:4px solid ${C.error};background:#FFF4EA}.odlab .od-legend{font-size:13px}.odlab svg{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif}.odlab .od-plot svg{min-width:560px}.odlab .od-sequence{display:flex;gap:5px;flex-wrap:wrap;margin:10px 0}.odlab .od-sequence span{border-bottom:3px solid ${C.line};padding:5px 8px}.odlab .od-sequence .active{border-color:${C.ok};font-weight:700}@media(max-width:480px){.odlab th,.odlab td{padding:6px}.odlab .od-formula{font-size:14px}}</style>`;
  const wrap = (s,names,html,note) => `${style}<section class="odlab">${legend}<div class="od-sequence" aria-label="계산 단계">${names.map((n,i)=>`<span class="${i===s?'active':''}"${i===s?' aria-current="step"':''}>${i+1}. ${esc(n)}</span>`).join('')}</div>${html}<p class="od-note">${esc(note)}</p></section>`;
  const steps = names => names.map(title=>({title,text:`${title} 단계의 입력과 결과를 표·그림에서 확인하세요.`}));
  const range = (key,label,min,max,step) => ({key,label,type:'range',min,max,step});
  const select = (key,label,items) => ({key,label,type:'select',options:items.map(x=>({value:String(x[0]),label:x[1]}))});
  const question = (prompt,options,answer,explanation) => ({prompt,options,answer,explanation});
  function bars(items,max,caption,stage=3) {
    const h=58+items.length*44;
    return svg(caption, label(15,23,caption)+items.map((v,i)=>{
      const y=44+i*44, width=clip(Math.abs(v.value)/Math.max(max,1e-300),0,1)*285;
      const color=v.color||C.target;
      return label(15,y+19,v.label)+`<rect x="175" y="${y}" width="285" height="24" fill="#EDF2F7"/><rect x="175" y="${y}" width="${width}" height="24" fill="${color}" opacity="${stage===0?.55:1}"/>`+label(475,y+19,fmt(v.value),color);
    }).join('')+label(175,h-4,'0',C.ink,'start',13)+label(460,h-4,`축 상한 ${fmt(max)}`,C.ink,'end',13),h);
  }
  function qdq(x,scale,z,qmin,qmax) {
    const raw=even(x/scale)+z, q=clip(raw,qmin,qmax), restored=scale*(q-z);
    return {raw,q,restored,error:restored-x,saturated:raw!==q};
  }
  const mods={};

  const affineNames=['범위와 눈금','정수 코드와 포화','역양자화','복원 오차'];
  mods['od-affine']={
    title:'Affine Q/DQ: 같은 코드, 다른 복원값',
    intro:'원문의 −7.59~10.8 범위와 5.47 예제를 재현합니다. 입력·범위·코드 폭을 바꾸며 scale, zero point, 포화와 오차를 계산합니다.',
    defaults:{lo:-7.59,hi:10.8,x:5.47,bits:'8',mode:'affine'},
    controls:[range('lo','보정 범위 하한',-16,0,.01),range('hi','보정 범위 상한',0,16,.01),range('x','양자화할 실수 r',-20,20,.01),select('bits','코드 비트 수',[[8,'INT8'],[4,'INT4']]),select('mode','원점 정책',[['affine','비대칭: 전체 signed 범위'],['symmetric','대칭: −qmax~qmax']])],
    steps:steps(affineNames),
    compute(p,s){
      s=phase(s); const lo=num(p,'lo',-7.59,-16,0),hi=num(p,'hi',10.8,0,16),x=num(p,'x',5.47,-20,20),bits=Number(choice(p,'bits','8',['4','8'])),mode=choice(p,'mode','affine',['affine','symmetric']);
      const qmax=2**(bits-1)-1,qmin=mode==='symmetric'?-qmax:-(2**(bits-1)),constant=lo===hi;
      const scale=constant?1:mode==='symmetric'?Math.max(-lo,hi)/qmax:(hi-lo)/(qmax-qmin);
      const z=mode==='symmetric'||constant?0:clip(even(qmin-lo/scale),qmin,qmax),r=qdq(x,scale,z,qmin,qmax);
      const a=scale*(qmin-z),b=scale*(qmax-z),px=t=>40+(t+20)/40*520;
      const tick=(v,t,c)=>`<line x1="${px(v)}" x2="${px(v)}" y1="82" y2="123" stroke="${c}" stroke-width="2"/>`+label(px(v),145,t,c,'middle',14);
      let body=`<line x1="40" x2="560" y1="100" y2="100" stroke="${C.ink}"/>${tick(-20,'−20',C.ink)}${tick(20,'20',C.ink)}<line x1="${px(a)}" x2="${px(b)}" y1="100" y2="100" stroke="${C.ok}" stroke-width="8"/>`+label(20,27,`실수 축 r: 표현 가능 범위 [${fmt(a)}, ${fmt(b)}]`,C.ink);
      body+=`<circle cx="${px(x)}" cy="65" r="7" fill="${C.input}"/>`+label(px(x),51,`입력 ${fmt(x)}`,C.input,'middle',15);
      if(s>=1) body+=label(30,178,`round(r/S)+Z = ${r.raw} → clip = ${r.q}`,r.saturated?C.error:C.ok);
      if(s>=2) body+=`<path d="M${px(r.restored)},104 l-8,16 h16 z" fill="${C.target}"/>`+label(30,208,`복원 S(q−Z) = ${fmt(r.restored)}`,C.target);
      const rows=[['정수 범위',`${qmin}~${qmax}`],['S',fmt(scale,13)],['Z',z]];
      if(s>=1)rows.push(['반올림 전 r/S',fmt(x/scale,13)],['포화 전 / 후 코드',`${r.raw} / ${r.q}`]);
      if(s>=2)rows.push(['복원 r̂',fmt(r.restored,13)]);
      if(s>=3)rows.push(['e=r̂−r',fmt(r.error,13)],['오차 한계 S/2 (포화 없음)',fmt(scale/2,13)]);
      return {html:wrap(s,affineNames,svg('−20~20 고정 실수 축의 입력과 복원',body)+table(['항목','현재 계산'],rows,'중간값은 binary64 정밀도 유지'), 'nearest ties-to-even. 비대칭 보정 범위는 0 포함. [0,0]이면 S=1, Z=0 대체. 녹색 범위는 정수 Z로 결정되는 실제 복원 범위이며 지정한 양 끝점과 약간 다를 수 있습니다.'),explanation:constant?'보정 범위가 모두 0이므로 나눗셈을 피하도록 S=1을 사용했습니다. 새로운 0 이외 입력의 적합성을 보장하지 않습니다.':`S=${fmt(scale,10)}, Z=${z}. ${r.saturated?'코드가 포화되어 S/2 오차 보장이 적용되지 않습니다.':'이 입력은 코드 포화 없이 최근접 눈금으로 대응됩니다.'} 복원 오차는 ${fmt(r.error,10)}입니다.`,metrics:[['Scale',fmt(scale,10)],['Zero point',String(z)],['코드 q',String(r.q)],['복원 오차',fmt(r.error,10)]],data:{scale,z,qmin,qmax,...r}};
    },
    question:question('포화가 생긴 값도 항상 |복원 오차|≤S/2인가요?',['아니요. 범위 밖 값은 더 큰 오차가 생길 수 있습니다.','예. nearest rounding이면 항상 성립합니다.'],0,'S/2는 포화가 없는 최근접 양자화의 경계입니다.')
  };

  function granularity(mode,w,bits){
    const qmax=2**(bits-1)-1,groups=mode==='tensor'?[w.flat().map((_,i)=>i)]:mode==='channel'?[ [0,1,2,3],[4,5,6,7] ]:[[0,1],[2,3],[4,5],[6,7]],flat=w.flat(),rec=Array(8),codes=Array(8);
    const scales=groups.map(g=>{ const m=Math.max(...g.map(i=>Math.abs(flat[i]))),sc=m===0?1:m/qmax;g.forEach(i=>{const v=qdq(flat[i],sc,0,-qmax,qmax);rec[i]=v.restored;codes[i]=v.q;});return sc;});
    return {mode,groups,scales,rec,codes,mse:mse(flat,rec),maxError:Math.max(...flat.map((x,i)=>Math.abs(rec[i]-x))),payloadBits:8*bits,metadataBits:groups.length*16};
  }
  const granNames=['출력 채널별 입력','공유 범위와 S','정수 코드와 복원','오차와 scale 저장량'];
  mods['od-granularity']={
    title:'공유 눈금: per-tensor·channel·group 오차',
    intro:'W는 [출력 채널 2, 입력 feature 4]입니다. 같은 비트 수에서 공유 범위를 바꾸고 오차와 FP16 scale 저장량을 동시에 비교합니다.',
    defaults:{ratio:100,bits:'8',policy:'channel',values:'normal'},
    controls:[range('ratio','두 번째 출력 채널의 배율',1,200,1),select('bits','원소 코드 폭',[[4,'4 bit'],[8,'8 bit']]),select('policy','현재 강조하는 공유 범위',[['tensor','Per-tensor: 8개 공유'],['channel','Per-output-channel: 각 행 4개'],['group','각 행의 입력축 group=2']]),select('values','입력 텐서',[['normal','서로 다른 범위'],['zeros','모든 원소 0'],['constant','행별 상수']])],
    steps:steps(granNames),
    compute(p,s){
      s=phase(s);const ratio=num(p,'ratio',100,1,200),bits=Number(choice(p,'bits','8',['4','8'])),policy=choice(p,'policy','channel',['tensor','channel','group']),values=choice(p,'values','normal',['normal','zeros','constant']);
      const base=values==='zeros'?[0,0,0,0]:values==='constant'?[.1,.1,.1,.1]:[.02,-.1,.05,.08],w=[base,base.map(x=>x*ratio)],all=['tensor','channel','group'].map(m=>granularity(m,w,bits)),r=all.find(x=>x.mode===policy);
      let html=table(['출력 채널 / 입력축','j=0','j=1','j=2','j=3'],w.map((row,i)=>[`W[${i},:]`,...row.map(x=>fmt(x))]),'입력 W: 출력 채널은 행');
      if(s>=1)html+=table(['공유 그룹','평탄화 위치 (0~7)','Scale S'],r.groups.map((g,i)=>[i,g.join(', '),fmt(r.scales[i],12)]),'선택한 정책: '+policy+' / signed 좁은 대칭 범위');
      if(s>=2)html+=table(['위치','원래 값','q','복원','오차'],w.flat().map((x,i)=>[i,fmt(x),r.codes[i],fmt(r.rec[i],10),fmt(r.rec[i]-x,10)]),'각 원소의 코드와 복원');
      if(s>=3)html+=bars(all.map(x=>({label:x.mode,value:x.mse,color:x.mode===policy?C.target:C.input})),Math.max(...w.flat().map(x=>x*x),1e-12),'MSE 비교: 같은 입력에서 고정한 제곱값 축')+table(['공유 정책','MSE','최대 |오차|','코드 bits','FP16 scale bits','총 bits'],all.map(x=>[x.mode,fmt(x.mse,11),fmt(x.maxError,9),x.payloadBits,x.metadataBits,x.payloadBits+x.metadataBits]),'8개 값에 대한 순수 코드+scale 비용');
      return {html:wrap(s,granNames,html,'그룹은 행을 넘지 않고 입력축의 연속 2개입니다. FP16은 scale 저장 비용 계산에만 적용하며 S 값 자체의 FP16 반올림 오차는 모사하지 않습니다. all-zero 그룹은 S=1. 작은 그룹이 모든 데이터에서 MSE를 단조 감소시킨다는 보장은 없습니다. KIVI의 K/V별 다른 축을 구현한 모듈이 아닙니다.'),explanation:`${policy}의 MSE=${fmt(r.mse,10)}, scale ${r.groups.length}개입니다. 원소 코드 ${r.payloadBits} bits 외에 scale ${r.metadataBits} bits가 필요합니다.`,metrics:[['선택 MSE',fmt(r.mse,10)],['최대 |오차|',fmt(r.maxError,10)],['Scale 수',String(r.scales.length)],['코드+scale',`${r.payloadBits+r.metadataBits} bits`]],data:{w,selected:r,all}};
    },
    question:question('Per-token과 dynamic은 같은 분류인가요?',['아니요. 공유 범위와 결정 시점입니다.','예. 실행 중 계산한다는 같은 뜻입니다.'],0,'하나의 설정에서 per-token과 dynamic을 함께 지정할 수 있습니다.')
  };

  const outNames=['작은 값과 outlier','Clip 범위 선택','포화와 반올림','전체·일반값 오차'];
  mods['od-outlier']={
    title:'Outlier와 clipping: 누구의 오차를 줄였을까?',
    intro:'일반 값 다섯 개와 큰 값 하나를 같은 눈금으로 표현합니다. min/max 기준과 clip 범위를 비교해 작은 값의 개선과 큰 값의 손실을 따로 봅니다.',
    defaults:{outlier:16,bound:2,bits:'4'},
    controls:[range('outlier','마지막 큰 값',1,20,.5),range('bound','대칭 clip 경계 C',.25,20,.25),select('bits','코드 폭',[[4,'4 bit (−7~7)'],[8,'8 bit (−127~127)']])],steps:steps(outNames),
    compute(p,s){
      s=phase(s);const outlier=num(p,'outlier',16,1,20),bound=num(p,'bound',2,.25,20),bits=Number(choice(p,'bits','4',['4','8'])),x=[-.8,-.4,.2,.5,.8,outlier],qmax=2**(bits-1)-1;
      const calc=c=>{const scale=c/qmax,rows=x.map(v=>{const clamped=clip(v,-c,c),q=qdq(clamped,scale,0,-qmax,qmax);return {x:v,clamped,clipping:clamped-v,rounding:q.restored-clamped,...q,error:q.restored-v};});return {scale,rows,mse:mse(x,rows.map(v=>v.restored)),bodyMse:mse(x.slice(0,5),rows.slice(0,5).map(v=>v.restored)),clipped:rows.filter(v=>v.x!==v.clamped).length};};
      const r=calc(bound),baseline=calc(Math.max(...x.map(Math.abs)));
      let html=table(['위치','원래 값 r'],x.map((v,i)=>[i===5?'큰 값':`일반 ${i}`,fmt(v)]),'6개 값: 단일 tensor scale');
      if(s>=1)html+=`<p class="od-formula">S=C/qmax=${fmt(r.scale,12)} · clip(r, −${fmt(bound)}, ${fmt(bound)})</p>`;
      if(s>=2)html+=table(['입력','clip 후','q','복원','clip 오차','round 오차','총 오차'],r.rows.map(v=>[fmt(v.x),fmt(v.clamped),v.q,fmt(v.restored,9),fmt(v.clipping,9),fmt(v.rounding,9),fmt(v.error,9)]),'총 오차 = clip 오차 + rounding 오차');
      if(s>=3)html+=bars([{label:'전체 min/max',value:baseline.bodyMse,color:C.input},{label:'선택 clip',value:r.bodyMse,color:C.target}],1,'일반 값 5개 MSE: 0~1 고정 축')+table(['기준','일반 5개 MSE','전체 6개 MSE','범위 밖 개수'],[['min/max',fmt(baseline.bodyMse,12),fmt(baseline.mse,12),baseline.clipped],['선택 clip',fmt(r.bodyMse,12),fmt(r.mse,12),r.clipped]],'표의 전체 MSE에는 마지막 큰 값 포함');
      return {html:wrap(s,outNames,html,'입력은 교육용이며 분포를 대표하는 calibration 세트가 아닙니다. MSE와 실제 task accuracy는 다릅니다. 마지막 큰 값도 정보일 수 있습니다. 바 차트는 일반값 오차만, 표는 전체 오차까지 비교합니다.'),explanation:`C=${fmt(bound)}에서 ${r.clipped}개가 범위 밖입니다. 일반값 MSE ${fmt(baseline.bodyMse,9)}→${fmt(r.bodyMse,9)}, 전체 MSE ${fmt(baseline.mse,9)}→${fmt(r.mse,9)}입니다.`,metrics:[['일반값 MSE',fmt(r.bodyMse,10)],['전체 MSE',fmt(r.mse,10)],['범위 밖',`${r.clipped}/6`]],data:{x,...r,baseline}};
    },question:question('일반값 MSE가 줄면 최종 과제 품질도 항상 좋아지나요?',['아니요. 중요한 outlier를 잘랐을 수 있습니다.','예. MSE는 최종 정확도와 같습니다.'],0,'별도 평가 입력에서 최종 과제 품질을 확인해야 합니다.')
  };

  const qatNames=['Master와 fake quant','손실과 대체 기울기','반복 업데이트','배포값과 학습값'];
  mods['od-qat']={
    title:'QAT: 작은 변화는 master weight에 쌓인다',
    intro:'스칼라 y=w, 손실 (ŵ−target)²로 QAT 한 경로를 직접 계산합니다. 순전파의 양자화와 역전파의 대체 gradient를 분리합니다.',
    defaults:{weight:.26,target:0,rate:.02,iterations:6,ste:'masked'},controls:[range('weight','시작 master w',-.6,.6,.01),range('target','목표 출력',-.5,.5,.01),range('rate','학습률 η',0,.2,.005),range('iterations','반복 수',1,12,1),select('ste','대체 gradient',[['masked','표현 구간 내부만 1 (경계 포함)'],['identity','모든 구간 1']])],steps:steps(qatNames),
    compute(p,s){
      s=phase(s);const start=num(p,'weight',.26,-.6,.6),target=num(p,'target',0,-.5,.5),rate=num(p,'rate',.02,0,.2),iterations=Math.round(num(p,'iterations',6,1,12)),ste=choice(p,'ste','masked',['masked','identity']);let w=start,quantOnly=qdq(start,.1,0,-3,3).restored;const history=[];
      for(let i=0;i<iterations;i++){const q=qdq(w,.1,0,-3,3),mask=ste==='identity'||(w>=-.3&&w<=.3)?1:0,gradient=2*(q.restored-target)*mask,next=w-rate*gradient,naiveNext=qdq(quantOnly-rate*2*(quantOnly-target),.1,0,-3,3).restored;history.push({i,w,...q,loss:(q.restored-target)**2,mask,gradient,next,quantOnly,naiveNext});w=next;quantOnly=naiveNext;}
      const first=history[0],last=qdq(w,.1,0,-3,3);let html=table(['역할','값'],[['FP master 시작값',fmt(start,12)],['Fake quant 코드 / 복원',`${first.q} / ${fmt(first.restored,12)}`],['고정 S / 코드 범위','0.1 / −3~3']],'순전파 값과 업데이트할 값');
      if(s>=1)html+=`<p class="od-formula">L=(ŵ−t)²=${fmt(first.loss,12)}<br>g=2(ŵ−t)×STE=${fmt(first.gradient,12)}<br>w_next=w−ηg=${fmt(first.next,12)}</p>`;
      if(s>=2)html+=table(['반복','Master w','Forward ŵ','STE','Gradient','다음 master','코드만 보존한 다음 값'],history.map(v=>[v.i+1,fmt(v.w,10),fmt(v.restored,10),v.mask,fmt(v.gradient,10),fmt(v.next,10),fmt(v.naiveNext,10)]),'코드만 보존 비교는 매번 정수 격자로 재투영하는 별도 알고리즘');
      if(s>=3)html+=table(['최종 항목','결과'],[['학습 후 master',fmt(w,13)],['배포 코드 q',last.q],['배포 복원값',fmt(last.restored,13)],['코드만 보존한 비교값',fmt(quantOnly,13)]],'학습 메모리와 배포 표현은 별도');
      return {html:wrap(s,qatNames,html,'학습용 스칼라 모형으로 실제 QAT 학습이나 정수 커널 속도 측정이 아닙니다. STE는 정확한 미분이 아닙니다. Masked STE는 w∈[−0.3,0.3]에서 1로 정한 규칙입니다. 코드만 보존한 비교 경로는 설명용으로 clipping mask를 적용하지 않습니다. Scale 학습·optimizer 상태는 생략합니다.'),explanation:`${iterations}회 후 master=${fmt(w,10)}, 배포 복원값=${fmt(last.restored,10)}입니다. ${first.mask===0?'초기값이 clipping 구간 밖이어서 masked STE가 첫 gradient를 차단합니다.':'작은 업데이트는 master에 누적되며 경계를 넘을 때 순전파 코드가 바뀝니다.'}`,metrics:[['최종 master',fmt(w,10)],['배포 q',String(last.q)],['배포 복원',fmt(last.restored,10)]],data:{history,w,last,quantOnly}};
    },question:question('STE를 쓰면 순전파 반올림도 생략하나요?',['아니요. 순전파 오차는 유지하고 역전파 규칙을 대체합니다.','예. 학습 동안 전부 실수 원본으로 계산합니다.'],0,'Forward는 fake quantization으로 양자화 오차를 경험합니다.')
  };

  const pruneNames=['가중치와 보정 입력','두 중요도 점수','동률 규칙과 마스크','출력 재구성 손실'];
  mods['od-pruning']={
    title:'Magnitude와 Wanda: 작은 가중치가 중요한 경우',
    intro:'같은 1×4 선형층에 대해 가중치 크기와 입력 norm을 곱한 점수로 제거 위치를 고릅니다. 두 보정 표본의 실제 출력 손실까지 계산합니다.',
    defaults:{activation:10,remove:2,method:'wanda'},controls:[range('activation','입력 feature 0의 배율 a',0,20,.5),range('remove','4개 중 제거할 개수',0,4,1),select('method','현재 마스크',[['magnitude','Magnitude |w|'],['wanda','Wanda |w|×입력 L2 norm']])],steps:steps(pruneNames),
    compute(p,s){
      s=phase(s);const a=num(p,'activation',10,0,20),remove=Math.round(num(p,'remove',2,0,4)),method=choice(p,'method','wanda',['magnitude','wanda']),w=[.1,.5,-.5,.1],x=[[a,a/2],[1,-1],[2,0],[1,1]],norms=x.map(row=>Math.hypot(...row)),magnitude=w.map(Math.abs),wanda=w.map((v,i)=>Math.abs(v)*norms[i]),original=[0,1].map(t=>sum(w.map((v,i)=>v*x[i][t])));
      const calc=(name,scores)=>{const order=scores.map((v,i)=>({v,i})).sort((u,v)=>u.v-v.v||u.i-v.i).map(v=>v.i),mask=w.map((_,i)=>order.slice(0,remove).includes(i)?0:1),pruned=w.map((v,i)=>v*mask[i]),output=[0,1].map(t=>sum(pruned.map((v,i)=>v*x[i][t]))),sse=sum(output.map((v,i)=>(v-original[i])**2));return {name,scores,order,mask,pruned,output,sse};};
      const all=[calc('magnitude',magnitude),calc('wanda',wanda)],r=all.find(v=>v.name===method);let html=table(['입력 feature j','w[j]','X[j,0]','X[j,1]'],w.map((v,i)=>[i,v,x[i][0],x[i][1]]),'W [출력1,입력4] × X [입력4,표본2]');
      if(s>=1)html+=table(['j','|w|','||X[j,:]||₂','Wanda 점수'],w.map((_,i)=>[i,fmt(magnitude[i]),fmt(norms[i],10),fmt(wanda[i],10)]),'점수의 단위가 달라 magnitude와 Wanda의 수치를 직접 우열 비교하지 않음');
      if(s>=2)html+=table(['j','선택 점수','Mask 1=유지','변경 후 w'],w.map((_,i)=>[i,fmt(r.scores[i],10),r.mask[i],r.pruned[i]]),'오름차순: '+r.order.join(' → ')+' / 동점이면 작은 입력 인덱스 우선');
      if(s>=3)html+=bars(all.map(v=>({label:v.name,value:v.sse,color:v.name===method?C.target:C.input})),(sum(w.map((v,i)=>Math.abs(v)*norms[i])))**2 ||1,'두 표본 출력 SSE: 동일 입력으로 정한 공통 상한')+table(['방법','출력 표본0','출력 표본1','출력 SSE'],[['원래 출력',...original.map(v=>fmt(v,10)),0],...all.map(v=>[v.name,...v.output.map(z=>fmt(z,10)),fmt(v.sse,12)])],'SSE=Σₜ(y_pruned[t]−y_original[t])²');
      return {html:wrap(s,pruneNames,html,'Wanda 기본형처럼 남은 가중치 보상은 없습니다. 두 표본만 사용한 교육용 보정이며 우열을 일반화하지 않습니다. Cancellation과 feature 상관 때문에 작은 점수의 합이 최종 오차 최솟값을 보장하지 않습니다. 0 마스크는 sparse 커널 실행·연산 생략을 보장하지 않습니다.'),explanation:`${method}는 입력 위치 ${r.order.slice(0,remove).join(', ')||'없음'}을 제거합니다. 같은 가중치라도 a가 바뀌면 Wanda 순위가 달라집니다. 선택 결과의 출력 SSE=${fmt(r.sse,10)}입니다.`,metrics:[['제거',`${remove}/4`],['출력 SSE',fmt(r.sse,10)],['최종 밀도',`${(4-remove)*25}%`]],data:{w,x,norms,original,all,selected:r}};
    },question:question('Wanda 점수가 크면 모든 입력에서 중요한 연결인가요?',['아니요. 관측한 보정 입력 분포에 의존합니다.','예. 입력과 무관한 가중치 고유 성질입니다.'],0,'입력 norm이 바뀌면 점수와 제거 순위가 바뀝니다.')
  };

  const sparseNames=['행렬과 비영 개수','CSR 값과 위치','Payload와 metadata','Dense 대비 손익'];
  mods['od-sparse']={
    title:'Sparse 저장: 0을 빼도 위치는 남는다',
    intro:'원문의 3×4 CSR 예제를 배열과 출력으로 따라갑니다. 1000×1000 예산 모드에서는 밀도에 따른 값·열 인덱스·행 포인터 비용을 계산합니다.',
    defaults:{scenario:'toy',density:20,valueBits:'16',indexBits:'32'},controls:[select('scenario','계산 사례',[['toy','원문 예제: 3×4, nnz=4'],['budget','예산: 1000×1000']]),range('density','예산 모드의 비영 밀도 (%)',0,100,1),select('valueBits','값 저장 폭',[[16,'16 bit (2 byte)'],[32,'32 bit (4 byte)']]),select('indexBits','열 인덱스 폭',[[32,'32 bit'],[16,'16 bit']])],steps:steps(sparseNames),
    compute(p,s){
      s=phase(s);const scenario=choice(p,'scenario','toy',['toy','budget']),density=num(p,'density',20,0,100),bv=Number(choice(p,'valueBits','16',['16','32']))/8,bi=Number(choice(p,'indexBits','32',['16','32']))/8,R=scenario==='toy'?3:1000,Cc=scenario==='toy'?4:1000;
      const A=[[0,5,0,2],[0,0,0,0],[7,0,3,0]],values=[],col_idx=[],row_ptr=[0],x=[1,2,3,4];
      A.forEach(row=>{row.forEach((v,j)=>{if(v!==0){values.push(v);col_idx.push(j);}});row_ptr.push(values.length);});
      const y=A.map((_,i)=>{let out=0;for(let k=row_ptr[i];k<row_ptr[i+1];k++)out+=values[k]*x[col_idx[k]];return out;});
      const nnz=scenario==='toy'?values.length:Math.floor(R*Cc*density/100),payload=nnz*bv,indices=nnz*bi,pointers=(R+1)*4,total=payload+indices+pointers,dense=R*Cc*bv,ratio=total/dense,threshold=(dense-pointers)/(bv+bi);
      let html=table(['행 R','열 C','nnz','최종 희소성'],[[R,Cc,nnz,`${fmt((1-nnz/(R*Cc))*100)}%`]],'0-based CSR / 행 포인터는 항상 32 bit');
      if(scenario==='toy'&&s===0)html+=table(['A의 행','열0','열1','열2','열3'],[[0,0,5,0,2],[1,0,0,0,0],[2,7,0,3,0]],'원본 작은 행렬');
      if(s>=1)html+=scenario==='toy'?table(['배열','원소'],[['values',JSON.stringify(values)],['col_idx',JSON.stringify(col_idx)],['row_ptr',JSON.stringify(row_ptr)],['입력 x',JSON.stringify(x)],['출력 Ax',JSON.stringify(y)]],'두 번째 행: values[2:2]는 빈 합이므로 출력 0'):table(['예산 항목','필요한 원소 수'],[['values',nnz],['col_idx',nnz],['row_ptr',R+1]],'실제 행렬 배치를 생성하지 않고 저장 개수만 산정');
      if(s>=2)html+=table(['항목','식','bytes'],[['값 본체',`${nnz}×${bv}`,payload],['열 인덱스',`${nnz}×${bi}`,indices],['행 포인터',`${R+1}×4`,pointers],['CSR 합계','본체+위치+경계',total]],'32-bit row_ptr는 최대 nnz=1,000,000을 표현 가능');
      if(s>=3)html+=bars([{label:'Dense bytes',value:dense,color:C.input},{label:'CSR bytes',value:total,color:C.target}],Math.max(R*Cc*(bv+bi)+pointers,dense),'Bytes 비교: 해당 shape·dtype에서 100% 밀도 상한')+`<p class="od-formula">CSR / dense = ${fmt(ratio,12)}<br>저장 이득 조건: nnz &lt; ${fmt(threshold,12)} (엄격 부등식)</p>`;
      return {html:wrap(s,sparseNames,html,'Payload와 metadata만 산정하며 배열 header·정렬·실행 workspace는 제외합니다. 열 인덱스와 행 포인터는 폭을 구분합니다. 예산 모드의 값 분포와 실제 sparse 실행 시간은 모델링하지 않습니다. 0% 밀도라도 R+1개 행 포인터가 남습니다.'),explanation:`CSR ${total.toLocaleString('en-US')} bytes, dense ${dense.toLocaleString('en-US')} bytes로 비율은 ${fmt(ratio*100)}%입니다. ${total<dense?'현재 조건에서는 저장량을 줄입니다.':total===dense?'현재 조건에서 저장량이 같습니다.':'위치 metadata 때문에 CSR가 더 큽니다.'}`,metrics:[['CSR',`${total} bytes`],['Dense',`${dense} bytes`],['CSR/dense',`${fmt(ratio*100,10)}%`]],data:{R,C:Cc,nnz,bv,bi,payload,indices,pointers,total,dense,ratio,threshold,values:scenario==='toy'?values:null,col_idx:scenario==='toy'?col_idx:null,row_ptr:scenario==='toy'?row_ptr:null,y:scenario==='toy'?y:null}};
    },question:question('전체 밀도 50%면 자동으로 2:4 패턴인가요?',['아니요. 지정된 각 4개 묶음에서 2개를 유지해야 합니다.','예. 전체 비영 개수만 맞으면 됩니다.'],0,'3개 유지 묶음과 1개 유지 묶음은 합계 50%여도 2:4 지역 제약을 위반합니다.')
  };

  function soft(z,t){const a=z.map(v=>v/t),m=Math.max(...a),exps=a.map(v=>Math.exp(v-m)),l=sum(exps),logp=a.map(v=>v-m-Math.log(l));return {m,exps,l,logp,p:logp.map(Math.exp)};}
  const kdNames=['Teacher·student logits','같은 온도의 softmax','KL의 항과 방향','정답 CE와 T² 혼합'];
  mods['od-distill']={
    title:'지식 증류: 온도·KL·정답을 함께 계산',
    intro:'Teacher [2,1,0]을 고정하고 student의 첫 logit·온도·정답 비중을 바꿉니다. 확률뿐 아니라 KL 항, CE, T²와 student gradient까지 추적합니다.',
    defaults:{temperature:2,alpha:.5,student:1.5,target:'0'},controls:[range('temperature','증류 온도 T',.25,10,.25),range('alpha','정답 CE 비중 α',0,1,.05),range('student','Student 첫 logit',-4,6,.1),select('target','실제 정답 클래스',[[0,'클래스 0'],[1,'클래스 1'],[2,'클래스 2']])],steps:steps(kdNames),
    compute(p,s){
      s=phase(s);const temperature=num(p,'temperature',2,.25,10),alpha=num(p,'alpha',.5,0,1),zs=[num(p,'student',1.5,-4,6),1,.5],zt=[2,1,0],target=Number(choice(p,'target','0',['0','1','2'])),teacher=soft(zt,temperature),student=soft(zs,temperature),hard=soft(zs,1),terms=teacher.p.map((v,i)=>v*(teacher.logp[i]-student.logp[i])),kl=Math.max(0,sum(terms)),ce=-hard.logp[target],scaled=temperature**2*kl,loss=alpha*ce+(1-alpha)*scaled,gradient=student.p.map((v,i)=>alpha*(hard.p[i]-(i===target?1:0))+(1-alpha)*temperature*(v-teacher.p[i]));
      let html=table(['클래스','Teacher logit (고정)','Student logit','실제 정답'],zt.map((v,i)=>[i,v,zs[i],i===target?1:0]),'3클래스 한 표본 / teacher gradient는 계산하지 않음');
      if(s>=1)html+=bars(teacher.p.flatMap((v,i)=>[{label:`T 클래스${i}`,value:v,color:C.target},{label:`S 클래스${i}`,value:student.p[i],color:C.input}]),1,'확률: 모든 온도에서 0~1 고정 축')+table(['클래스','exp((zT−max)/T)','Teacher pT','Student pS'],zt.map((_,i)=>[i,fmt(teacher.exps[i],10),fmt(teacher.p[i],10),fmt(student.p[i],10)]),'Teacher와 student에 같은 증류 온도 적용');
      if(s>=2)html+=table(['클래스','pT','ln(pT/pS)','KL 항'],zt.map((_,i)=>[i,fmt(teacher.p[i],10),fmt(teacher.logp[i]-student.logp[i],10),fmt(terms[i],10)]),'KL(pT∥pS)=Σ pT ln(pT/pS), 자연로그 / 개별 항은 음수 가능');
      if(s>=3)html+=table(['손실 구성','현재 값'],[['CE(y, student T=1)',fmt(ce,13)],['증류 KL',fmt(kl,13)],['T²×KL',fmt(scaled,13)],['αCE+(1−α)T²KL',fmt(loss,13)],['dL/d student logits',gradient.map(v=>fmt(v,10)).join(', ')]],'Reduction: 1표본의 클래스 합, 배치 평균 없음');
      return {html:wrap(s,kdNames,html,'정답 CE는 T=1, 증류는 같은 T를 적용합니다. α는 정답 CE의 비중입니다. T²는 gradient 규모 보정이며 손실을 온도와 무관하게 만드는 연산이 아닙니다. Teacher의 확률은 실제 정답 confidence가 아닙니다. 전체 학습·projection·어휘 정렬·teacher 오류는 모사하지 않습니다.'),explanation:`T=${fmt(temperature)}에서 KL=${fmt(kl,10)}, CE=${fmt(ce,10)}, 혼합 손실=${fmt(loss,10)}입니다. Gradient의 합은 ${fmt(sum(gradient),5)}로 수치 오차 범위에서 0입니다.`,metrics:[['KL(T∥S)',fmt(kl,10)],['정답 CE (T=1)',fmt(ce,10)],['T² KL',fmt(scaled,10)],['혼합 손실',fmt(loss,10)]],data:{temperature,alpha,zs,zt,target,teacher,student,hard,terms,kl,ce,scaled,loss,gradient}};
    },question:question('교사 응답 문자열만으로 전체 어휘 KL을 정확히 계산할 수 있나요?',['아니요. 전체 분포 정보가 더 필요합니다.','예. 생성된 토큰이 전체 분포입니다.'],0,'응답 기반 지도 학습과 같은 prefix의 token-level 분포 증류를 구별합니다.')
  };

  const kvNames=['토큰·층·KV head','K와 V 원소 수','본체·최근 구간·metadata','구조와 정밀도 비교'];
  mods['od-kv']={
    title:'KV cache 예산: head 공유와 비트 수를 분리',
    intro:'Query head는 32개로 고정합니다. 실제 KV head 수, 길이, batch와 최근 FP16 구간을 바꾸며 값 본체와 scale·zero metadata를 나눠 계산합니다.',
    defaults:{batch:1,tokens:4096,layers:32,heads:'8',bits:'16',recent:0,group:'32'},controls:[range('batch','캐시 시퀀스 수 B',1,8,1),range('tokens','보관 토큰 S (시퀀스당)',0,16384,256),range('layers','동일 구조 층 L',1,80,1),select('heads','KV head 수 (Query=32)',[[32,'MHA: 32'],[8,'GQA: 8'],[1,'MQA: 1']]),select('bits','과거 KV 코드 폭',[[16,'FP16: 16 bit'],[8,'8 bit'],[4,'4 bit'],[2,'2 bit']]),range('recent','시퀀스당 최근 FP16 토큰',0,512,32),select('group','토큰·head별 feature group 크기',[[32,'32 elements'],[64,'64 elements']])],steps:steps(kvNames),
    compute(p,s){
      s=phase(s);const batch=Math.round(num(p,'batch',1,1,8)),tokens=Math.round(num(p,'tokens',4096,0,16384)),layers=Math.round(num(p,'layers',32,1,80)),heads=Number(choice(p,'heads','8',['1','8','32'])),bits=Number(choice(p,'bits','16',['2','4','8','16'])),recent=Math.min(tokens,Math.round(num(p,'recent',0,0,512))),group=Number(choice(p,'group','32',['32','64'])),d=128;
      const calc=h=>{const allElements=2*batch*tokens*layers*h*d,old=tokens-recent,oldElements=2*batch*old*layers*h*d,recentElements=2*batch*recent*layers*h*d,oldPayload=oldElements*bits/8,recentPayload=recentElements*2,groups=bits===16?0:2*batch*old*layers*h*Math.ceil(d/group),metadata=groups*4,payload=oldPayload+recentPayload;return {heads:h,allElements,oldElements,recentElements,oldPayload,recentPayload,payload,groups,metadata,total:payload+metadata,fp16:allElements*2};};
      const r=calc(heads),all=[calc(32),calc(8),calc(1)];let html=table(['B','S tokens','L layers','H_KV','d_h'],[[batch,tokens,layers,heads,d]],'전 층 동일·요청 길이 동일 / Query heads=32 고정');
      if(s>=1)html+=`<p class="od-formula">K+V 원소 수 = 2×${batch}×${tokens}×${layers}×${heads}×128 = ${r.allElements}<br>앞의 2는 K와 V 두 텐서입니다.</p>`;
      if(s>=2)html+=table(['항목','계산 결과 bytes','MiB'],[['과거 코드 payload',r.oldPayload,fmt(r.oldPayload/2**20,12)],['최근 FP16 payload',r.recentPayload,fmt(r.recentPayload/2**20,12)],['그룹 metadata (scale16+zero16)',r.metadata,fmt(r.metadata/2**20,12)],['합계',r.total,fmt(r.total/2**20,12)]],'최근 토큰은 min(요청 길이, 설정 예산) / FP16 모드에는 metadata 0');
      if(s>=3)html+=bars(all.map(v=>({label:`H_KV=${v.heads}`,value:v.total/2**20,color:v.heads===heads?C.target:C.input})),all[0].fp16/2**20||1,'같은 길이·정밀도·최근 예산: MiB, MHA FP16 상한')+table(['구조','선택 정책 bytes','모두 FP16 bytes','정책/FP16'],all.map(v=>[v.heads===32?'MHA':v.heads===8?'GQA':'MQA',v.total,v.fp16,v.fp16?fmt(v.total/v.fp16,10):'토큰 0: 비율 정의 안 함']),'구조 비교는 서로 다른 학습 모델의 설계 비교');
      return {html:wrap(s,kvNames,html,'GB=10⁹, GiB=2³⁰, MiB=2²⁰ bytes. 그룹은 각 token·KV head의 feature 128개 안에서만 나눕니다. K/V가 같은 정책을 쓰는 예산 모형이며 KIVI 전체 구현이 아닙니다. 페이지 빈 공간·padding·분산 복제·workspace·allocator는 제외합니다. 기존 MHA를 설정만 바꿔 무손실 GQA로 전환할 수 없습니다.'),explanation:`값 본체 ${fmt(r.payload/2**20,10)} MiB + metadata ${fmt(r.metadata/2**20,10)} MiB = ${fmt(r.total/2**20,10)} MiB입니다. KV head가 ${heads}개이므로 query head 32를 용량 식에 대신 넣지 않습니다.`,metrics:[['KV 합계',`${fmt(r.total/2**20,10)} MiB`],['본체',`${r.payload} bytes`],['Metadata',`${r.metadata} bytes`],['모두 FP16',`${fmt(r.fp16/2**30,10)} GiB`]],data:{batch,tokens,layers,heads,bits,recent,group,...r,all}};
    },question:question('Quest가 이번 query에서 읽지 않은 page는 저장 공간에서도 없어진 것인가요?',['아니요. 읽기 선택과 영구 퇴거는 다릅니다.','예. 읽기량 감소율과 저장량 감소율은 같습니다.'],0,'Quest는 원 KV를 유지하므로 다음 query가 다른 page를 선택할 수 있습니다.')
  };

  const specNames=['동일 prefix의 p와 q','확률비로 수용','양의 잔차로 보정','기대 길이와 비용'];
  mods['od-speculative']={
    title:'투기적 디코딩: 수용확률부터 비용까지',
    intro:'두 토큰 공간에서 exact sampling의 수용·거절·보정을 계산합니다. 평균 수용확률을 일정 조건부 수용률로 가정했을 때만 기대 길이·비용으로 확장합니다.',
    defaults:{pA:.6,qA:.8,gamma:4,draft:1,verify:12,baseline:10},controls:[range('pA','목표 p(A)',0,1,.05),range('qA','초안 q(A)',0,1,.05),range('gamma','초안 길이 γ',0,8,1),range('draft','초안 1 token 비용 (ms)',0,5,.25),range('verify','한 라운드 검증 총비용 (ms)',1,80,1),range('baseline','목표 단독 1 token (ms)',1,30,1)],steps:steps(specNames),
    compute(p,s){
      s=phase(s);const pA=num(p,'pA',.6,0,1),qA=num(p,'qA',.8,0,1),target=[pA,1-pA],draftP=[qA,1-qA],gamma=Math.round(num(p,'gamma',4,0,8)),draftCost=num(p,'draft',1,0,5),verify=num(p,'verify',12,1,80),baseline=num(p,'baseline',10,1,30),accept=target.map((v,i)=>draftP[i]===0?null:Math.min(1,v/draftP[i])),direct=target.map((v,i)=>Math.min(v,draftP[i])),a=sum(direct),residual=target.map((v,i)=>Math.max(0,v-draftP[i])),residualSum=sum(residual),rejected=1-a,correction=residual.map(v=>residualSum===0?0:v/residualSum),final=direct.map((v,i)=>v+rejected*correction[i]),prefix=Array.from({length:gamma+1},(_,i)=>a**i),expected=sum(prefix),roundMs=gamma*draftCost+verify,msPerToken=roundMs/expected,speedup=baseline/msPerToken;
      let html=table(['Token','목표 p','초안 q'],target.map((v,i)=>[i?'B':'A',fmt(v),fmt(draftP[i])]),'같은 토큰 공간·같은 prefix의 정규화된 확률');
      if(s>=1)html+=table(['Token','min(1,p/q)','직접 수용 질량 min(p,q)'],target.map((_,i)=>[i?'B':'A',accept[i]===null?'q=0: 제안되지 않음':fmt(accept[i],12),fmt(direct[i],12)]),'0/0 나눗셈을 하지 않음 / 평균 수용확률 a=Σmin(p,q)');
      if(s>=2)html+=table(['Token','양의 잔차','거절 시 보정분포','최종 확률','목표 p'],target.map((v,i)=>[i?'B':'A',fmt(residual[i],12),residualSum===0?'거절 없음: 불필요':fmt(correction[i],12),fmt(final[i],12),fmt(v,12)]),'최종=min(p,q)+(1−a)×정규화 양의 잔차');
      if(s>=3)html+=table(['길이 항 i','앞 i개 연속 수용 확률 a^i'],prefix.map((v,i)=>[i,fmt(v,12)]),'E[N]=Σᵢ₌₀^γ a^i / a=1도 기하급수 합으로 처리')+table(['비용 항목','결과'],[['E[확정 token/round]',fmt(expected,13)],['γ×초안+검증',`${fmt(roundMs,12)} ms`],['평균 시간/token',`${fmt(msPerToken,12)} ms`],['기준 대비 가속률',`${fmt(speedup,12)}배`]],'각 입력 비용은 사용자가 정한 가상 총비용');
      return {html:wrap(s,specNames,html,'수용은 모델 confidence가 아닙니다. Exact 분포 보존은 일관된 sampling·tokenizer·prefix·잔차 보정·KV 관리가 전제입니다. 기대 길이는 모든 위치에서 조건부 수용률 a가 일정하다는 별도 가정이며 한 prefix의 확률만으로 실제 생성 성능을 예측하지 않습니다. 검증 총비용은 γ와 장치 부하에 따라 다시 측정해야 합니다. γ=0은 초안 없는 단일 목표 호출입니다.'),explanation:`a=${fmt(a,10)}, E[N]=${fmt(expected,10)}, ${fmt(roundMs)} ms/round에서 ${fmt(msPerToken,10)} ms/token입니다. ${speedup>1?'가정한 비용에서는 기준보다 빠릅니다.':speedup===1?'기준과 같은 비용입니다.':'가정한 비용에서는 기준보다 느립니다.'} 분포 보존과 속도 이득은 서로 다른 조건입니다.`,metrics:[['평균 수용확률',fmt(a,10)],['기대 확정 길이',fmt(expected,10)],['ms/token',fmt(msPerToken,10)],['가상 가속률',`${fmt(speedup,10)}배`]],data:{target,draftP,accept,direct,a,residual,residualSum,rejected,correction,final,prefix,expected,gamma,roundMs,msPerToken,speedup}};
    },question:question('q(A)=0일 때 p(A)/q(A)를 계산해야 하나요?',['아니요. A는 초안에서 제안되지 않고 잔차 보정에만 올 수 있습니다.','예. 무한대 확률로 수용합니다.'],0,'수용 검사는 q(x)>0인 실제 제안 token에 적용합니다.')
  };

  const roofNames=['연산과 이동량','두 시간 하한','Roofline과 병목','고정 overhead 포함'];
  mods['od-roofline']={
    title:'Roofline: FLOPs와 bytes가 만드는 비용',
    intro:'선택한 메모리 계층의 실제 이동량과 해당 dtype의 연산 상한을 입력합니다. 연산·대역폭 시간 하한과 별도 고정 overhead를 함께 봅니다.',
    defaults:{gflops:100,megabytes:10000,bandwidth:100,peak:10,overhead:1},controls:[range('gflops','작업 연산량 F (GFLOPs)',0,1000,10),range('megabytes','선택 계층 이동량 (MB)',0,10000,100),range('bandwidth','대역폭 BW (GB/s)',10,1000,10),range('peak','같은 dtype peak (TFLOP/s)',1,100,1),range('overhead','직렬 고정 overhead (ms)',0,20,.5)],steps:steps(roofNames),
    compute(p,s){
      s=phase(s);const F=num(p,'gflops',100,0,1000)*1e9,T=num(p,'megabytes',10000,0,10000)*1e6,BW=num(p,'bandwidth',100,10,1000)*1e9,peak=num(p,'peak',10,1,100)*1e12,overhead=num(p,'overhead',1,0,20),computeMs=F/peak*1000,memoryMs=T/BW*1000,idealMs=Math.max(computeMs,memoryMs),modelMs=idealMs+overhead,ai=T===0?null:F/T,ceiling=ai===null?(F===0?null:peak):Math.min(peak,BW*ai),bottleneck=computeMs===memoryMs?'두 하한 같음':computeMs>memoryMs?'연산 하한 지배':'이동 하한 지배';
      let html=table(['F (FLOPs)','T (bytes)','Peak FLOP/s','BW bytes/s'],[[F,T,peak,BW]],'Decimal 단위: G=10⁹, Tera=10¹², MB=10⁶');
      if(s>=1)html+=table(['시간 하한','식','ms'],[['연산','F / peak',fmt(computeMs,12)],['이동','T / BW',fmt(memoryMs,12)],['둘을 완전히 겹친 이상적 하한','max(연산, 이동)',fmt(idealMs,12)]],'실제 실행 시간 예측이 아닌 자원 하한');
      if(s>=2){const xx=v=>55+clip(v,0,2000)/2000*500,yy=v=>225-clip(v,0,100)/100*180,pts=Array.from({length:101},(_,i)=>{const intensity=i*20;return `${xx(intensity)},${yy(Math.min(peak,BW*intensity)/1e12)}`;}).join(' ');html+=svg('Roofline 고정 축: 0~2000 FLOPs/byte, 0~100 TFLOP/s',`<path d="M55,45 V225 H555" fill="none" stroke="${C.ink}"/><polyline points="${pts}" fill="none" stroke="${C.target}" stroke-width="3"/>`+label(56,23,'성능 상한 TFLOP/s (0~100)')+label(555,258,'연산 집약도 FLOPs/byte (0~2000)',C.ink,'end',14)+[0,1000,2000].map(v=>label(xx(v),243,v,C.ink,'middle',13)).join('')+label(45,50,'100',C.ink,'end',13)+label(45,225,'0',C.ink,'end',13)+(ceiling===null?'':`<circle cx="${xx(ai===null?2000:ai)}" cy="${yy(ceiling/1e12)}" r="6" fill="${C.input}"/>`)+label(65,285,ai===null?(F===0?'F=T=0: AI는 정의되지 않음':'T=0, F>0: 이동 하한 0인 가상 경계'): `AI=${fmt(ai)}${ai>2000?' (차트 오른쪽 범위 밖)':''}, P≤${fmt(ceiling/1e12)} TFLOP/s`,C.input),305);}
      if(s>=3)html+=bars([{label:'연산 하한 ms',value:computeMs,color:C.input},{label:'이동 하한 ms',value:memoryMs,color:C.input},{label:'하한+overhead',value:modelMs,color:C.target}],1020,'시간 비교: 0~1020 ms 고정 축')+`<p class="od-formula">설명용 비용 = max(F/Ppeak, T/BW) + overhead = ${fmt(modelMs,12)} ms</p>`;
      return {html:wrap(s,roofNames,html,'T는 모델 파일 크기가 아닌 선택 계층에서 이동한 bytes입니다. 동일 dtype·dense/sparse·MAC 산정 조건을 맞춰야 합니다. 이상적 겹침을 가정하며 커널 효율·의존성·Q/DQ·통신·발열은 별도입니다. 고정 overhead는 직렬 가산하는 가정입니다. F=T=0의 AI와 성능 비율은 정의하지 않습니다.'),explanation:`${bottleneck}: 연산 ${fmt(computeMs)} ms, 이동 ${fmt(memoryMs)} ms. 이상적 하한 ${fmt(idealMs)} ms에 overhead ${fmt(overhead)} ms를 더한 설명용 비용은 ${fmt(modelMs)} ms입니다.`,metrics:[['연산 하한',`${fmt(computeMs)} ms`],['이동 하한',`${fmt(memoryMs)} ms`],['병목',bottleneck],['가정한 총비용',`${fmt(modelMs)} ms`]],data:{F,T,BW,peak,overhead,computeMs,memoryMs,idealMs,modelMs,ai,ceiling,bottleneck}};
    },question:question('INT4 저장량이 FP16의 1/4이면 시간도 1/4인가요?',['아니요. 전체 이동·계산·복원·고정 비용을 함께 봅니다.','예. peak 성능과 관계없이 4배 빨라집니다.'],0,'압축 비율과 end-to-end 지연 비율은 다른 수치입니다.')
  };

  const tileNames=['점수와 tile','각 tile의 m·l·u','공통 최대값으로 병합','전체 softmax와 출력'];
  mods['od-tiled-softmax']={
    title:'타일 softmax: 분모와 value를 함께 병합',
    intro:'원문 [1,4,2,2,3,5]를 작은 타일로 나눕니다. 각 타일의 최대값·지수합·미정규화 value 합을 같은 기준으로 병합해 dense 결과와 대조합니다.',
    defaults:{last:5,tile:'3',mask:'none'},controls:[range('last','마지막 점수',-5,10,.5),select('tile','타일 원소 수',[[2,'2개'],[3,'3개'],[6,'6개 (전체)']]),select('mask','허용 위치',[['none','모두 허용'],['prefix','첫 3개만 허용'],['all','모두 마스킹: 별도 처리']])],steps:steps(tileNames),
    compute(p,s){
      s=phase(s);const x=[1,4,2,2,3,num(p,'last',5,-5,10)],v=[10,2,4,1,3,7],tile=Number(choice(p,'tile','3',['2','3','6'])),mask=choice(p,'mask','none',['none','prefix','all']),valid=x.map((_,i)=>mask==='none'||(mask==='prefix'&&i<3));
      if(!valid.some(Boolean)){
        let emptyHtml=table(['위치','점수','상태'],x.map((z,i)=>[i,z,'masked']),'허용된 key가 없는 행');
        if(s>=1)emptyHtml+=table(['타일','대상 위치','유효 key 수'],Array.from({length:Math.ceil(x.length/tile)},(_,i)=>[i,Array.from({length:Math.min(tile,x.length-i*tile)},(_,j)=>i*tile+j).join(', '),0]),'현재 타일 크기 '+tile+': 모든 타일이 비어 있습니다.');
        if(s>=2)emptyHtml+=table(['누적 대상','최댓값 m','분모 l','분자 u','처리'],[['모든 빈 타일','없음',0,0,'갱신 없이 건너뜀']],'−∞−(−∞)를 계산하지 않고 빈 타일을 제외합니다.');
        if(s>=3)emptyHtml+=table(['최종 대상','결과','원인'],[['softmax 분포','정의되지 않음','정규화할 유효 key 없음'],['attention 출력','null','분모 l=0이므로 나누지 않음']],'가짜 확률 0 또는 수치 0을 계산 결과로 만들지 않습니다.');
        return {html:wrap(s,tileNames,emptyHtml,'전부 masked인 행의 softmax는 수학적으로 정의되지 않습니다. 이 데모는 0/0을 수행하거나 가짜 확률을 출력하지 않고 멈춥니다. 실제 커널의 정책은 구현별 확인이 필요합니다.'),explanation:'허용된 key가 0개입니다. 확률과 attention 출력이 정의되지 않으므로 계산을 수행하지 않습니다.',metrics:[['허용 위치','0/6'],['Softmax','정의되지 않음']],data:{x,v,valid,defined:false,probabilities:null,output:null}};
      }
      const tiles=[];for(let begin=0;begin<x.length;begin+=tile){const ids=x.map((_,i)=>i).filter(i=>i>=begin&&i<begin+tile&&valid[i]);if(!ids.length){tiles.push({begin,ids,empty:true,m:null,l:0,u:0});continue;}const m=Math.max(...ids.map(i=>x[i])),l=sum(ids.map(i=>Math.exp(x[i]-m))),u=sum(ids.map(i=>Math.exp(x[i]-m)*v[i]));tiles.push({begin,ids,empty:false,m,l,u});}
      let m=null,l=0,u=0;const merges=[];tiles.forEach((t,i)=>{if(t.empty){merges.push({tile:i,skipped:true,m,l,u,alpha:0,beta:0});return;}const next=m===null?t.m:Math.max(m,t.m),alpha=m===null?0:Math.exp(m-next),beta=Math.exp(t.m-next);l=alpha*l+beta*t.l;u=alpha*u+beta*t.u;m=next;merges.push({tile:i,skipped:false,m,l,u,alpha,beta});});
      const probabilities=x.map((z,i)=>valid[i]?Math.exp(z-m)/l:0),output=u/l,ids=x.map((_,i)=>i).filter(i=>valid[i]),direct=soft(ids.map(i=>x[i]),1),directOutput=sum(ids.map((id,j)=>direct.p[j]*v[id])),maxDifference=Math.max(...ids.map((id,j)=>Math.abs(probabilities[id]-direct.p[j])));
      let html=table(['위치','점수 x','Value v','허용','타일'],x.map((z,i)=>[i,z,v[i],valid[i]?'유효':'masked',Math.floor(i/tile)]),'단일 query의 점수: QKᵀ/√d와 mask 적용 이후를 가정');
      if(s>=1)html+=table(['타일','유효 위치','m_local','l_local','u_local'],tiles.map((t,i)=>[i,t.ids.join(', ')||'빈 타일',t.m===null?'없음':fmt(t.m),fmt(t.l,12),fmt(t.u,12)]),'l=Σexp(x−m), u=Σexp(x−m)×v / 아직 전체 분모로 나누지 않음');
      if(s>=2)html+=table(['추가 tile','이전합 보정 α','새 tile 보정 β','전체 m','누적 l','누적 u'],merges.map(t=>[`${t.tile}${t.skipped?' (skip)':''}`,fmt(t.alpha,10),fmt(t.beta,10),t.m===null?'없음':fmt(t.m),fmt(t.l,12),fmt(t.u,12)]),'m_new=max(m_old,m_tile), (l,u)_new=α(l,u)_old+β(l,u)_tile');
      if(s>=3)html+=bars(probabilities.map((z,i)=>({label:`위치 ${i}${valid[i]?'':' masked'}`,value:z,color:C.target})),1,'전체 확률: 0~1 고정 축')+table(['검산 항목','값'],[['확률합',fmt(sum(probabilities),14)],['타일 출력 u/l',fmt(output,14)],['직접 dense 출력',fmt(directOutput,14)],['확률 최대 차이',fmt(maxDifference,8)],['원문 두 번째 확률 (index 1)',fmt(probabilities[1],12)]],'표시값을 재사용하지 않고 원래 정밀도로 검산');
      return {html:wrap(s,tileNames,html,'Value는 추가 교육용 스칼라입니다. 원문 점수 예제의 두 번째 확률 0.27은 기본 입력에서 약 0.226931로 정정합니다. 빈 타일은 건너뛰며 전부 masked는 별도로 처리합니다. 타일 순서만 바꾼 dense 계산으로 희소 attention이나 실제 FlashAttention 커널 속도 시험이 아닙니다.'),explanation:`허용 위치 ${ids.length}개, 전체 최대 m=${m}, 지수합 l=${fmt(l,11)}. 타일 출력=${fmt(output,11)}, dense 출력=${fmt(directOutput,11)}로 같은 계산을 다른 순서로 수행합니다.`,metrics:[['확률합',fmt(sum(probabilities),12)],['타일 출력',fmt(output,10)],['Dense 출력',fmt(directOutput,10)],['최대 확률 차이',fmt(maxDifference,7)]],data:{x,v,valid,defined:true,tiles,merges,m,l,u,probabilities,output,directOutput,maxDifference}};
    },question:question('두 tile을 각각 softmax한 뒤 이어 붙여도 되나요?',['아니요. 전체 최대값과 분모를 공유해야 합니다.','예. 각 타일 확률합이 1이므로 정확합니다.'],0,'각 타일을 따로 정규화하면 두 타일의 합이 2가 됩니다. u도 l과 같은 기준으로 보정해야 합니다.')
  };

  // 숫자를 바꾸기 위해 잘못된 계산을 만들지 않는다. 새로 공개한 실제 계산 블록을
  // 앞에 놓고, 아직 적용되지 않은 조작과 수학적으로 불변인 조건을 직접 설명한다.
  function splitViews(html){
    const out=[],rx=/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g,voids=/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
    let depth=0,start=0,t;
    while((t=rx.exec(html))){const tag=t[0];if(tag.startsWith('<!--'))continue;const name=/^<\/?([\w:-]+)/.exec(tag)?.[1];if(tag.startsWith('</'))depth--;else if(!tag.endsWith('/>')&&!voids.test(name||''))depth++;if(depth===0){out.push(html.slice(start,rx.lastIndex));start=rx.lastIndex;}}
    if(html.slice(start).trim())out.push(html.slice(start));return out;
  }
  function extractViews(html){
    const mark=html.indexOf('<div class="od-sequence"'),a=html.indexOf('</div>',mark)+6,b=html.lastIndexOf('<p class="od-note">');
    return {prefix:html.slice(0,a),views:splitViews(html.slice(a,b)),suffix:html.slice(b)};
  }
  const firstUse={
    'od-affine':{lo:0,hi:0,x:0,bits:0,mode:0},
    'od-granularity':{ratio:0,bits:1,policy:1,values:0},
    'od-outlier':{outlier:0,bound:1,bits:1},
    'od-qat':{weight:0,target:1,rate:1,iterations:2,ste:1},
    'od-pruning':{activation:0,remove:2,method:2},
    'od-sparse':{scenario:0,density:0,valueBits:2,indexBits:2},
    'od-distill':{temperature:1,alpha:3,student:0,target:0},
    'od-kv':{batch:0,tokens:0,layers:0,heads:0,bits:2,recent:2,group:2},
    'od-speculative':{pA:0,qA:0,gamma:3,draft:3,verify:3,baseline:3},
    'od-roofline':{gflops:0,megabytes:0,bandwidth:0,peak:0,overhead:3},
    'od-tiled-softmax':{last:0,tile:0,mask:0}
  };
  function invariantNotes(id,p,r){
    if(id==='od-affine')return r.data.saturated?'입력이 코드 범위를 벗어나 포화됐습니다. 같은 포화 코드가 유지되어도 입력과 복원 오차는 달라집니다.':'최근접 눈금 안의 작은 입력 변화는 같은 코드에 대응할 수 있습니다. 실수 입력과 복원 오차를 함께 확인하세요.';
    if(id==='od-granularity')return p.values==='zeros'?'모든 입력이 0이어서 배율·코드 폭을 바꿔도 코드와 MSE=0은 같습니다. 공유 정책의 scale 수와 metadata 비용은 4단계에서 비교합니다.':p.values==='constant'?'각 그룹이 동일한 상수면 여러 공유 정책의 복원 오차가 같을 수 있습니다. 4단계의 저장 비용도 함께 비교하세요.':'공유 정책은 2단계의 그룹 구성부터, 코드 폭은 scale·복원부터 반영됩니다. 그룹 수를 늘려도 이론상 오차의 엄격한 감소를 보장하지 않습니다.';
    if(id==='od-outlier')return 'Clip 경계와 코드 폭은 2단계부터 적용합니다. 같은 격자에 대응하면 복원값이 유지될 수 있고, 큰 값을 자르지 않는 경계에서는 clipping 오차가 0입니다.';
    if(id==='od-qat')return r.data.history.every(v=>v.w>=-.3&&v.w<=.3)?'현재 이력의 master가 모두 [−0.3,0.3] 내부라 masked·identity STE의 gradient와 결과가 같습니다. 시작값을 0.5처럼 구간 밖으로 옮겨 두 규칙의 차이를 확인하세요. 반복 수는 3단계 전체 이력에 적용합니다.':'표현 구간 밖에서 masked STE는 기울기를 0으로, identity STE는 1배로 전달합니다. 학습률 0이면 업데이트가 없으며 작은 master 변화는 같은 코드에 대응할 수 있습니다.';
    if(id==='od-pruning')return Number(p.remove)===0?'제거 수가 0이라 어떤 점수 방식도 원래 출력을 유지합니다. 제거 수와 방식은 3단계의 마스크에서 확인하세요.':Number(p.remove)===4?'4개를 모두 제거하므로 방법과 관계없이 출력은 0입니다. 점수·순서의 차이는 2단계에 남습니다.':'제거 수와 선택 방식은 3단계부터 마스크에 반영됩니다. Magnitude 순위는 입력 배율과 무관하지만 출력 재구성 오차는 입력에 의존합니다. 동점은 입력 인덱스로 결정합니다.';
    if(id==='od-sparse')return p.scenario==='toy'?'현재는 원문의 3×4 고정 행렬입니다. 밀도 슬라이더는 이 사례의 nnz=4를 바꾸지 않습니다. 계산 사례를 «예산: 1000×1000»으로 바꾸면 밀도가 바로 적용됩니다. 값·인덱스 폭은 3단계 bytes 계산에서 사용합니다.':'밀도는 비영 원소 개수를 바꾸며 값 분포나 실제 행렬을 생성하지 않습니다. 값·인덱스 폭은 3단계의 저장 비용에 적용됩니다. 밀도 0%도 행 포인터는 남습니다.';
    if(id==='od-distill')return '온도는 2단계의 확률부터, α는 4단계 혼합 손실부터 적용됩니다. 정답 CE는 T=1로 고정하므로 증류 온도만 바꿔도 CE 자체는 그대로입니다. α=0이면 정답 선택은 최종 혼합 손실에 기여하지 않습니다.';
    if(id==='od-kv')return Number(p.tokens)===0?'저장 토큰이 0개이므로 코드 폭·최근 예산·그룹을 바꿔도 본체와 metadata가 모두 0입니다. 길이를 늘려 저장 비용을 확인하세요.':String(p.bits)==='16'?'과거와 최근 모두 FP16이므로 최근 예산을 옮겨도 총 payload는 같습니다. 이 모드의 metadata는 0이라 group 크기도 총량을 바꾸지 않습니다. 8·4·2 bit로 바꾸면 두 설정이 3단계 비용에 반영됩니다.':r.data.recent===r.data.tokens?'모든 보관 토큰이 최근 FP16 구간에 들어 있습니다. 과거 저비트 코드가 없어 group과 과거 비트 수는 현재 총량에 영향이 없습니다. 최근 예산을 줄이면 적용됩니다.':'비트 수·최근 FP16 예산·group은 3단계의 본체와 metadata에 적용됩니다. Query head는 32개로 고정해 용량 식에는 실제 KV head만 사용합니다.';
    if(id==='od-speculative')return 'γ·초안 비용·검증 비용·단독 기준 비용은 4단계 기대 길이·시간 계산에 적용됩니다. 1~3단계의 p·q 분포 보존은 이 비용값과 무관합니다. p=q이면 a=1, 거절·잔차 보정은 필요하지 않습니다.';
    if(id==='od-roofline')return '고정 overhead는 4단계의 설명용 총비용에만 더합니다. F·T와 장치 peak·BW가 같으면 1~3단계의 자원 하한·roofline은 그대로입니다. 한 하한을 낮춰도 다른 하한이 지배하면 max 비용은 유지됩니다.';
    if(id==='od-tiled-softmax')return p.mask==='all'?'모든 key가 차단돼 출력이 정의되지 않습니다. 단계 이동은 빈 타일 구성→누적 skip→최종 null을 보여주며 가짜 숫자 변화를 만들지 않습니다.':p.mask==='prefix'?'마지막 점수는 masked 위치여서 확률·출력에 기여하지 않습니다. «모두 허용»으로 바꾸면 마지막 점수의 영향이 보입니다. 타일 크기는 계산 순서·누적 상태를 바꾸지만 최종 dense 결과는 같아야 합니다.':'타일 크기는 그룹과 병합 순서를 바꿉니다. 같은 점수·Value라면 최종 확률·출력은 부동소수점 오차 내에서 유지됩니다. 2~3단계의 local·merge 상태로 실제 차이를 확인하세요.';
    return '';
  }
  for(const [id,module]of Object.entries(mods)){
    const calculate=module.compute;
    module.compute=(params,step)=>{
      const s=phase(step),p={...module.defaults,...params},r=calculate(params,s),current=extractViews(r.html),previous=s?new Set(extractViews(calculate(params,s-1).html).views):new Set(),fresh=current.views.filter(v=>!previous.has(v)),earlier=current.views.filter(v=>previous.has(v));
      const values=module.controls.map(c=>{
        const raw=p[c.key],value=c.type==='select'?(c.options.some(o=>String(o.value)===String(raw))?String(raw):String(module.defaults[c.key])):num(p,c.key,module.defaults[c.key],c.min,c.max);
        const text=c.type==='select'?c.options.find(o=>String(o.value)===value).label:fmt(value),at=firstUse[id][c.key]??0;
        return `${c.label}: ${text}${s<at?` (${at+1}단계에서 적용)`:''}`;
      }).join(' / ');
      r.html=current.prefix+`<div class="od-active-calculation" data-stage-visual="${s}" style="border-left:4px solid ${C.target};padding-left:12px"><p><strong>현재 계산: ${esc(module.steps[s].title)}</strong></p>${(fresh.length?fresh:current.views).join('')}</div><p class="od-formula" data-control-readiness>${esc(values)}</p><p class="od-note">${esc(invariantNotes(id,p,r))}</p>`+(fresh.length&&earlier.length?`<details><summary>앞 단계의 입력과 계산 다시 보기</summary>${earlier.join('')}</details>`:'')+current.suffix;
      return r;
    };
  }
  window.LabModules ||= {};
  Object.assign(window.LabModules,mods);
})();
