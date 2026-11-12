/* VISION: deterministic teaching examples. No model or remote service is invoked. */
(() => {
  'use strict';
  const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (n, d = 4) => Number.isInteger(n) ? String(n) : n.toFixed(d);
  const table = (headers, rows, caption = '') => `<div class="table-scroll"><table>${caption ? `<caption>${esc(caption)}</caption>` : ''}<thead><tr>${headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((v, i) => i === 0 ? `<th scope="row">${esc(v)}</th>` : `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const matrix = (title, rows, active = []) => `<div class="matrix"><p><strong>${esc(title)}</strong></p><div class="table-scroll"><table aria-label="${esc(title)}"><tbody>${rows.map((r, y) => `<tr>${r.map((v, x) => `<td${active.some(p => p[0] === y && p[1] === x) ? ' class="highlight"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  const steps = items => items.map(([title, text]) => ({ title, text }));
  const softmax = xs => { const max = Math.max(...xs), e = xs.map(x => Math.exp(x - max)), z = e.reduce((a,b) => a+b, 0); return e.map(x => x/z); };
  const range = (key, label, min, max, step = 1) => ({key, label, type:'range', min, max, step});
  const select = (key, label, values) => ({key, label, type:'select', options: values.map(([value,label]) => ({value,label}))});
  const note = '<p class="muted">교육용 수치 계산입니다. 실제 모델의 실행·성능 측정 결과가 아닙니다.</p>';
  function svg(title, body, width = 640, height = 220) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
  }
  function miniBars(items, max, label) {
    return svg(label, items.map((d,i) => `<text x="8" y="${31+i*43}" fill="currentColor" font-size="15">${esc(d[0])}</text><rect x="175" y="${12+i*43}" width="${Math.max(0,d[1]/max*330)}" height="27" rx="3" fill="${i===0?'#17666b':'#7251a1'}"/><text x="${183+Math.max(0,d[1]/max*330)}" y="${31+i*43}" fill="currentColor" font-size="15">${esc(fmt(d[1]))}</text>`).join('') + `<text x="175" y="${items.length*43+24}" fill="currentColor" font-size="13">공통 척도: 0–${esc(fmt(max))}</text>`,640,items.length*43+45);
  }

  const modules = {
    'vision-image': {
      title:'이미지의 값과 축을 따로 바꾸기',
      intro:'빨강·초록·파랑·흰색으로 된 2×2 RGB 이미지를 사용합니다. HWC→CHW 순서 변경과 0–255→실수 정규화가 서로 다른 연산임을 확인합니다.',
      defaults:{mean:0.5,std:0.5},
      controls:[range('mean','모든 채널에 사용할 평균 μ (교육용)',0,1,0.1),range('std','모든 채널에 사용할 표준편차 σ (교육용)',0.1,1,0.1)],
      steps:steps([['이미지와 HWC','각 위치에 R,G,B 세 값이 나란히 있습니다.'],['축 순서 변경','같은 값을 채널별 격자로 재배열합니다.'],['실수 스케일','각 값을 255로 나누어 0–1 실수로 바꿉니다.'],['정규화','훈련에서 정한 μ,σ로 (x−μ)/σ를 계산합니다.']]),
      compute(p,step) {
        const mean=Number(p.mean),std=Number(p.std),hwc=[[[255,0,0],[0,255,0]],[[0,0,255],[255,255,255]]];
        const chw=[0,1,2].map(c=>hwc.map(row=>row.map(pixel=>pixel[c])));
        let html=svg('2×2 RGB 이미지: 빨강 초록 파랑 흰색',hwc.flat().map((pixel,i)=>`<rect x="${18+i%2*100}" y="${15+Math.floor(i/2)*100}" width="94" height="94" fill="rgb(${pixel.join(',')})" stroke="#173746"/><text x="${65+i%2*100}" y="${68+Math.floor(i/2)*100}" text-anchor="middle" font-size="15" fill="${i===2?'white':'#10212a'}">(${Math.floor(i/2)},${i%2})</text>`).join('')+'<text x="235" y="62" fill="currentColor" font-size="17">H=2, W=2, C=3</text><text x="235" y="104" fill="currentColor" font-size="15">픽셀 4개, 스칼라 값 12개</text>',520,230);
        if(step===0)html+=table(['위치 (행,열)','R','G','B'],hwc.flatMap((r,y)=>r.map((pixel,x)=>[`(${y},${x})`,...pixel])),'HWC 값의 의미');
        if(step>=1)html+=chw.map((rows,c)=>matrix(`${['R','G','B'][c]} 채널${step>=3?' 정규화':step>=2?' /255':''}`,rows.map(row=>row.map(x=>step>=3?fmt((x/255-mean)/std):step>=2?fmt(x/255):x)))).join('');
        if(step>=2)html+=`<p class="equation">255 / 255 = 1.0, 0 / 255 = 0.0</p>`;
        if(step>=3)html+=`<p class="equation">원시값 255 → (1−${mean})/${std} = ${fmt((1-mean)/std)}<br>원시값 0 → (0−${mean})/${std} = ${fmt(-mean/std)}</p>`;
        return {html:html+note,explanation:step<2?'HWC [2,2,3]과 CHW [3,2,2]는 같은 12개 값의 축 배치가 다릅니다. 원소 나열을 해석 없이 reshape하는 것과 축을 permute하는 것은 다릅니다.':`축을 바꾸는 것과 값의 눈금을 바꾸는 것은 독립적입니다. 255로 나눈 뒤 μ=${mean}, σ=${std}를 적용하면 최솟값은 ${fmt(-mean/std)}, 최댓값은 ${fmt((1-mean)/std)}입니다. 정규화 결과가 0–1을 벗어나도 오류가 아닙니다. 실제 모델은 훈련·사전학습과 맞는 채널별 통계를 사용합니다.`,metrics:[['원본 HWC','[2,2,3]'],['배치 포함 NCHW','[1,3,2,2]'],['스칼라 값','12개'],['정규화 범위',`${fmt(-mean/std)} ~ ${fmt((1-mean)/std)}`]]};
      },
      question:{prompt:'HWC→CHW 축 변경만 수행하면 255라는 픽셀 값은 어떻게 되나요?',options:['그대로 255이며 위치의 축 의미만 바뀝니다','자동으로 1이 됩니다','자동으로 평균0이 됩니다'],answer:0,explanation:'축 순서 변경은 데이터 배치의 문제입니다. 255로 나누기와 평균·표준편차 정규화는 별도 값 변환입니다.'}
    },
    'vision-training': {
      title:'한 번의 학습: 정답 확률에서 여섯 가중치 갱신까지',
      intro:'입력 x=1, ReLU 하나와 두 클래스 출력만 둔 본문 예제입니다. 학습률과 정답을 바꿔 전방계산·기울기·동시 업데이트를 추적합니다.',
      defaults:{lr:0.1, target:0},
      controls:[range('lr','학습률 η',0,1,0.05),select('target','정답 클래스',[[0,'클래스 1'],[1,'클래스 2']])],
      steps:steps([
        ['입력과 전방계산','같은 x=1을 여섯 초기 파라미터로 계산합니다.'],
        ['확률과 손실','정답 클래스 확률에 자연로그를 취해 CE를 만듭니다.'],
        ['기울기','softmax와 CE의 결합 미분 q−y에서 앞층으로 돌아갑니다.'],
        ['동시 업데이트','모든 기울기를 갱신 전 파라미터로 계산한 뒤 한 번에 바꿉니다.']
      ]),
      compute(p, step) {
        const lr=Number(p.lr), target=Number(p.target), w=1,b=0,v=[Math.log(2),0],c=[0,0],h=1;
        const q=softmax(v), loss=-Math.log(q[target]), g=q.map((x,i)=>x-(i===target?1:0));
        const gh=v.reduce((a,x,i)=>a+x*g[i],0), nw=w-lr*gh, nb=b-lr*gh;
        const nv=v.map((x,i)=>x-lr*g[i]*h),nc=c.map((x,i)=>x-lr*g[i]);
        const nh=Math.max(0,nw+nb),nz=nv.map((x,i)=>x*nh+nc[i]),nq=softmax(nz),nl=-Math.log(nq[target]);
        const forward=table(['계산','shape','값'],[['입력 x','[1]',1],['h = ReLU(wx+b)','[1]',h],['로짓 z','[2]',v.map(x=>fmt(x)).join(', ')]],'입력에서 로짓까지');
        let html=forward;
        if(step>=1)html+=miniBars([['클래스 1 확률',q[0]],['클래스 2 확률',q[1]]],1,'분류 확률, 공통 척도 0–1')+`<p class="equation">L = −ln(${fmt(q[target])}) = ${fmt(loss)}</p>`;
        if(step>=2)html+=table(['파라미터','초기값','기울기','갱신값'],[['w',w,fmt(gh),step>=3?fmt(nw):'다음 단계'],['b',b,fmt(gh),step>=3?fmt(nb):'다음 단계'],...v.map((x,i)=>[`v${i+1}`,fmt(x),fmt(g[i]),step>=3?fmt(nv[i]):'다음 단계']),...c.map((x,i)=>[`c${i+1}`,x,fmt(g[i]),step>=3?fmt(nc[i]):'다음 단계'])],'같은 시점의 기울기를 사용하는 업데이트');
        if(step>=3)html+=`<p class="equation">정답 확률 ${fmt(q[target])} → ${fmt(nq[target])}<br>CE ${fmt(loss)} → ${fmt(nl)}</p>`;
        return {html:html+note, explanation:step<2?`정답은 클래스 ${target+1}입니다. argmax가 이미 맞아도 정답 확률이 1보다 작으므로 CE는 ${fmt(loss)}입니다.`:`∂L/∂z = [${g.map(x=>fmt(x)).join(', ')}]. 학습률 ${lr}로 한 번 갱신하면 CE가 ${fmt(loss)}에서 ${fmt(nl)}로 ${nl<loss?'감소':nl>loss?'증가':'유지'}합니다. 이 한 표본의 결과이며 임의의 학습률·배치에서 감소를 보장하지 않습니다.`, metrics:[['현재 정답 확률',fmt(q[target])],['업데이트 전 CE',fmt(loss)],['업데이트 후 CE',fmt(nl)],['학습 파라미터','6개']]};
      },
      question:{prompt:'현재 argmax가 정답이어도 교차엔트로피가 0이 아닐 수 있는 이유는?',options:['정답 클래스 확률이 아직 1이 아니기 때문','정답 라벨도 역전파로 바뀌기 때문','정확도와 CE는 항상 같은 값이기 때문'],answer:0,explanation:'정확도는 argmax가 맞는지 보고, CE는 정답에 부여한 확률의 −ln 값을 봅니다.'}
    },
    'vision-conv': {
      title:'필터가 읽는 아홉 값과 출력 한 칸',
      intro:'입력은 1부터 H²까지의 한 채널 격자, 필터는 [[1,0,−1],[1,0,−1],[1,0,−1]]입니다. stride·padding·출력 위치를 바꾸며 shape와 실제 합을 연결합니다.',
      defaults:{size:5,stride:1,padding:0,position:0},
      controls:[range('size','입력 한 변 H (픽셀)',3,7),range('stride','Stride S',1,2),range('padding','영 패딩 P',0,1),range('position','출력 칸 번호 (넘으면 마지막 칸)',0,48)],
      steps:steps([
        ['출력 크기','입력 크기와 필터의 유효 범위로 출력 칸 수를 정합니다.'],
        ['국소 영역 선택','출력 한 칸에 대응하는 입력의 3×3 영역을 봅니다.'],
        ['원소별 곱과 합','뒤집지 않은 필터와 입력을 위치별로 곱한 뒤 더합니다.'],
        ['전체 출력','같은 필터를 재사용해 모든 출력 칸을 채웁니다.']
      ]),
      compute(p,step) {
        const n=Number(p.size),s=Number(p.stride),pad=Number(p.padding),out=Math.floor((n+2*pad-3)/s)+1;
        const input=Array.from({length:n},(_,y)=>Array.from({length:n},(_,x)=>y*n+x+1));
        const padded=Array.from({length:n+2*pad},(_,y)=>Array.from({length:n+2*pad},(_,x)=>y>=pad&&y<n+pad&&x>=pad&&x<n+pad?input[y-pad][x-pad]:0));
        const kernel=[[1,0,-1],[1,0,-1],[1,0,-1]],pos=Math.min(Number(p.position),out*out-1),oy=Math.floor(pos/out),ox=pos%out;
        const patch=Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>padded[oy*s+y][ox*s+x]));
        const products=patch.map((r,y)=>r.map((x,i)=>x*kernel[y][i]));
        const sum=products.flat().reduce((a,b)=>a+b,0);
        const result=Array.from({length:out},(_,y)=>Array.from({length:out},(_,x)=>kernel.reduce((a,r,ky)=>a+r.reduce((b,k,kx)=>b+k*padded[y*s+ky][x*s+kx],0),0)));
        const active=step>=1?Array.from({length:9},(_,i)=>[oy*s+Math.floor(i/3),ox*s+i%3]):[];
        let html=`<p class="equation">H_out = floor((${n} + 2×${pad} − 3) / ${s}) + 1 = ${out}</p>`+matrix('영 패딩을 포함한 입력 [행, 열]',padded,active);
        if(step>=1)html+=matrix(`선택 출력 (${oy}, ${ox})이 읽는 영역`,patch)+matrix('공유 필터 W [3,3]',kernel);
        if(step>=2)html+=matrix('원소별 곱',products)+`<p class="equation">합 = ${sum}, bias=0, ReLU 뒤 = ${Math.max(0,sum)}</p>`;
        if(step>=3)html+=matrix('활성화 이전 전체 출력',result,[[oy,ox]]);
        return {html:html+note, explanation:`입력 [1,1,${n},${n}] → 출력 [1,1,${out},${out}]입니다. 선택한 출력 (${oy},${ox})은 패딩 좌표 (${oy*s},${ox*s})에서 시작하는 3×3 영역을 읽습니다. 출력값 ${sum}은 상호상관 결과이며, ReLU를 선택해 뒤에 붙이면 ${Math.max(0,sum)}이 됩니다. 이 예의 가중치는 공유된 9개이고 출력 칸 수와 다릅니다.`, metrics:[['출력 shape',`[1,1,${out},${out}]`],['선택 칸 값',String(sum)],['공유 가중치','9개'],['곱셈 횟수',`${out*out*9}회 (bias 제외)`]]};
      },
      question:{prompt:'공간 출력 칸 수가 늘어나면 이 예제의 필터 파라미터 수도 늘어날까요?',options:['아니요. 같은 3×3 가중치 9개를 공유합니다','네. 출력 칸마다 새 필터를 학습합니다','Stride와 관계없이 언제나 출력은 1칸입니다'],answer:0,explanation:'필터는 위치 사이에 공유됩니다. 연산 횟수·활성화 크기는 변하지만 한 입력·출력 채널의 3×3 가중치는 9개입니다.'}
    },
    'vision-receptive': {
      title:'수용영역과 출력 간격을 함께 누적하기',
      intro:'3×3 Conv → 2×2 Pool → 3×3 Conv 경로를 계산합니다. 마지막 층의 dilation과 중간 stride가 원본 좌표에 미치는 영향을 분리합니다.',
      defaults:{poolStride:2,dilation:1},
      controls:[range('poolStride','중간 Pool stride',1,3),range('dilation','마지막 Conv dilation',1,3)],
      steps:steps([['입력','원본 한 칸의 수용영역과 간격은 각각 1입니다.'],['첫 합성곱','3×3, stride 1이 이웃을 섞습니다.'],['중간 풀링','2×2 Pool이 영역을 합치고 간격을 바꿉니다.'],['마지막 합성곱','유효 커널 폭과 이전 간격의 곱만큼 수용영역이 늘어납니다.']]),
      compute(p,step) {
        const ps=Number(p.poolStride),d=Number(p.dilation),defs=[['입력',1,1],['3×3 Conv',3,1],['2×2 Pool',2,ps],['3×3 Dilated Conv',2*d+1,1]];
        let r=1,j=1;const records=[['입력','—','—',r,j]];
        defs.slice(1).forEach(([name,k,s])=>{const oldj=j;r+=(k-1)*j;j*=s;records.push([name,`${k}칸`,`${s}칸`,r,j,oldj]);});
        const current=records[Math.min(step,3)],width=Number(current[3]),jump=Number(current[4]);
        const drawing=svg(`선택 단계 수용영역 ${width}픽셀, 이웃 중심 간격 ${jump}픽셀`,Array.from({length:32},(_,i)=>`<rect x="${12+i*19}" y="40" width="17" height="34" fill="${i<Math.min(width,32)?'#17666b':'#e4e9ed'}"/>`).join('')+`<text x="12" y="26" font-size="15" fill="currentColor">원본 좌표 기준 이론적 폭: ${width}픽셀</text><text x="12" y="108" font-size="15" fill="currentColor">인접 출력 중심 간격 j = ${jump}픽셀</text><text x="12" y="137" font-size="13" fill="currentColor">격자는 최대 32칸까지 표시. 폭의 숫자가 정확한 계산값입니다.</text>`,640,158);
        return {html:drawing+table(['연산','유효 커널 폭','Stride','r (원본 픽셀)','j (원본 픽셀)'],records.slice(0,step+1).map(x=>x.slice(0,5)),'현재 단계까지 누적')+`<p class="equation">r_new = r_old + (K_eff−1)j_old<br>j_new = j_old S</p>`+note,explanation:`${current[0]}까지 r=${width}, j=${jump}입니다. 이전 간격에 커널의 추가 샘플 범위를 곱해야 합니다. Padding은 실제 이미지와 겹치는 경계 부분을 바꾸지만 이론적 폭 누적식은 바꾸지 않습니다. 마지막 dilation ${d}의 유효 커널 폭은 ${2*d+1}이며 그 영역의 모든 픽셀을 직접 샘플링한다는 뜻은 아닙니다.`,metrics:[['현재 r',`${width}픽셀`],['현재 j',`${jump}픽셀`],['최종 r',`${records[3][3]}픽셀`],['최종 j',`${records[3][4]}픽셀`]]};
      },
      question:{prompt:'Stride가 있는 층을 지난 뒤 다음 수용영역 계산에 필요한 값은?',options:['이전 수용영역 r와 원본 좌표 간격 j','커널 크기의 단순 합만','모델의 정확도만'],answer:0,explanation:'원본 좌표에서 이웃 출력이 얼마나 떨어져 있는지 j를 추적해야 다음 커널이 더하는 범위를 계산할 수 있습니다.'}
    },
    'vision-residual': {
      title:'잔차 두 경로의 shape가 언제 맞을까',
      intro:'ResNet BasicBlock의 두 3×3 경로와 identity 또는 1×1 projection 경로를 비교합니다. 채널과 stride를 독립적으로 바꿉니다.',
      defaults:{inChannels:64,outChannels:128,stride:2},
      controls:[select('inChannels','입력 채널',[[32,'32'],[64,'64'],[128,'128']]),select('outChannels','출력 채널',[[32,'32'],[64,'64'],[128,'128']]),select('stride','첫 Conv stride',[[1,'1'],[2,'2']])],
      steps:steps([['입력','N=1, H=W=56에서 시작합니다.'],['잔차 경로','첫 3×3은 선택한 stride, 다음 3×3은 stride 1입니다.'],['지름길','크기가 다르면 1×1 Conv와 BN으로 shape를 맞춥니다.'],['덧셈','두 텐서의 N,C,H,W를 확인한 뒤 원소별로 더합니다.']]),
      compute(p,step) {
        const ci=Number(p.inChannels),co=Number(p.outChannels),s=Number(p.stride),h=Math.floor((56+2-3)/s)+1,projection=ci!==co||s!==1,main=9*ci*co+9*co*co,skip=projection?ci*co:0;
        let rows=[['입력',`[1,${ci},56,56]`,'—']];
        if(step>=1)rows.push(['잔차 3×3 → 3×3',`[1,${co},${h},${h}]`,`${main}개`]);
        if(step>=2)rows.push([projection?'지름길 1×1 Conv + BN':'지름길 Identity',`[1,${co},${h},${h}]`,`${skip}개`]);
        if(step>=3)rows.push(['원소별 덧셈',`[1,${co},${h},${h}]`,'덧셈 자체 0개']);
        return {html:table(['경로','shape [N,C,H,W]','Conv 가중치 (BN 제외)'],rows,'BasicBlock의 두 경로')+`<p class="equation">${projection?'출력 = F(x) + P(x)':'출력 = F(x) + x'}</p>`+note,explanation:projection?`입력 ${ci}채널·56×56과 잔차 출력 ${co}채널·${h}×${h}가 다릅니다. 1×1 Conv stride ${s}가 지름길을 같은 shape로 맞춥니다. broadcasting으로 강제 덧셈하면 이 블록의 의미와 다릅니다. Conv bias는 없고 BN 학습 파라미터는 이 수에서 제외했습니다.`:`채널과 공간 크기가 모두 같으므로 Identity를 씁니다. 두 경로의 같은 위치끼리 더하며 Concat처럼 채널이 두 배가 되지 않습니다. 이 구성은 확장 배율 1인 BasicBlock입니다.`,metrics:[['Projection 필요',projection?'필요':'불필요'],['출력 shape',`[1,${co},${h},${h}]`],['주 경로 가중치',`${main}개`],['지름길 가중치',`${skip}개`]]};
      },
      question:{prompt:'입력·출력 채널이 같아도 공간 크기를 절반으로 줄였다면 지름길은?',options:['공간도 맞추는 projection이 필요합니다','채널만 같으면 무조건 identity입니다','Concat으로 대체하면 항상 같습니다'],answer:0,explanation:'잔차 덧셈은 모든 축이 맞아야 합니다. 채널이 같아도 stride로 H,W가 달라지면 지름길도 맞춰야 합니다.'}
    },
    'vision-patches': {
      title:'이미지 패치에서 Attention의 두 토큰 축까지',
      intro:'16×16 RGB 이미지의 패치 크기를 바꿉니다. 펼친 패치 길이·토큰 수·한 head의 점수 행렬을 같은 입력에서 계산합니다.',
      defaults:{patch:4,dim:16,cls:1},
      controls:[select('patch','패치 한 변 P (픽셀)',[[2,'2'],[4,'4'],[8,'8']]),select('dim','토큰 임베딩 차원 D',[[8,'8'],[16,'16'],[32,'32']]),select('cls','CLS 토큰',[[1,'포함'],[0,'미포함 (pooling 별도)']])],
      steps:steps([['패치 분할','16을 나눌 수 있는 P로 이미지를 겹치지 않게 나눕니다.'],['펼침과 투영','P×P×3개 값을 D차원 표현으로 선형 투영합니다.'],['토큰 구성','위치 정보를 더하고 선택에 따라 CLS를 추가합니다.'],['Attention 축','각 Query 토큰이 모든 Key 토큰을 비교하므로 T×T가 됩니다.']]),
      compute(p,step) {
        const size=Number(p.patch),dim=Number(p.dim),cls=Number(p.cls),side=16/size,n=side*side,t=n+cls,flat=size*size*3;
        let drawing='';for(let y=0;y<side;y++)for(let x=0;x<side;x++)drawing+=`<rect x="${22+x*240/side}" y="${18+y*240/side}" width="${240/side-2}" height="${240/side-2}" fill="${(x+y)%2?'#dcebed':'#bfd8db'}" stroke="#17666b"/><text x="${22+(x+.5)*240/side}" y="${18+(y+.59)*240/side}" text-anchor="middle" fill="#173746" font-size="${side>4?10:16}">${y*side+x}</text>`;
        drawing+=`<text x="285" y="65" font-size="17" fill="currentColor">${n}개 패치</text><text x="285" y="103" font-size="16" fill="currentColor">패치마다 ${flat}개 값</text><text x="285" y="141" font-size="16" fill="currentColor">${step>=1?`투영: ${flat} → ${dim}`:'16×16×3 이미지'}</text><text x="285" y="179" font-size="16" fill="currentColor">${step>=2?`전체 토큰 T = ${t}`:'행·열 번호는 공간 위치'}</text>`;
        let html=svg('RGB 이미지를 겹치지 않는 패치로 나눈 격자',drawing,600,278);
        if(step>=1)html+=table(['단계','shape (B=1)','의미'],[['패치 펼침',`[1,${n},${flat}]`,'각 패치의 픽셀·채널 값'],['Linear projection',`[1,${n},${dim}]`,'공유 투영 가중치로 D차원 표현'],...(step>=2?[['전체 토큰',`[1,${t},${dim}]`,cls?'CLS 1개 포함':'CLS 없음; pooling 방식은 별도']]:[]),...(step>=3?[['한 head Attention',`[1,${t},${t}]`,'Query 축 × Key 축'],['여러 head',`[1,h,${t},${t}]`,'각 head별 비교']]:[])],'값의 길이와 토큰 수를 분리');
        return {html:html+note,explanation:`P=${size}이면 패치 수는 (16/${size})²=${n}, 한 패치의 원시 길이는 ${size}²×3=${flat}입니다. 임베딩 차원 D=${dim}은 패치 수와 독립적인 설계값입니다. ${cls?'CLS를 더해':'CLS 없이'} T=${t}이며, 한 head의 점수 원소는 ${t*t}개입니다. 여러 head에서는 D가 head 수로 나누어지는 조건을 별도로 확인해야 합니다.`,metrics:[['패치 수 N',String(n)],['패치 원시 길이',String(flat)],['전체 토큰 수 T',String(t)],['점수 원소 / head',String(t*t)]]};
      },
      question:{prompt:'패치 한 변을 4에서 2로 줄이면 CLS 없는 Attention 점수 원소 수는?',options:['16배가 됩니다','2배가 됩니다','같습니다'],answer:0,explanation:'패치 수가 16에서 64로 4배가 되고 점수 행렬의 두 토큰 축이 모두 4배라서 원소 수는 16배입니다.'}
    },
    'vision-clip': {
      title:'CLIP의 배치 정답 쌍과 양방향 손실',
      intro:'이미지 두 개와 문장 두 개를 단위 벡터로 둡니다. 두 번째 문장의 각도와 로짓 배율을 바꿔 이미지→문장·문장→이미지 정규화를 비교합니다.',
      defaults:{angle:90,scale:2},
      controls:[range('angle','문장 2 벡터의 각도 (도)',0,180,15),range('scale','로짓 배율 α',0.5,8,0.5)],
      steps:steps([['짝과 임베딩','정답 쌍은 이미지1–문장1, 이미지2–문장2입니다.'],['유사도 행렬','정규화한 두 벡터의 내적에 같은 배율을 곱합니다.'],['양방향 확률','행과 열을 각각 softmax하여 서로 다른 분모를 확인합니다.'],['대칭 손실','두 방향 정답 CE의 평균을 계산합니다.']]),
      compute(p,step) {
        const a=Number(p.angle)*Math.PI/180,alpha=Number(p.scale),cos=Math.cos(a),sin=Math.sin(a),logits=[[alpha,alpha*cos],[0,alpha*sin]],row=logits.map(softmax),col=[0,1].map(j=>softmax(logits.map(r=>r[j]))),ri=-Math.log(row[0][0])/2-Math.log(row[1][1])/2,ci=-Math.log(col[0][0])/2-Math.log(col[1][1])/2,loss=(ri+ci)/2;
        let html=table(['대상','벡터','배치 정답'],[['이미지1','[1,0]','문장1'],['이미지2','[0,1]','문장2'],['문장1','[1,0]','이미지1'],['문장2',`[${fmt(cos)},${fmt(sin)}]`,'이미지2']],'정규화 임베딩과 배치의 짝');
        if(step>=1)html+=matrix('로짓: 행=이미지, 열=문장',logits.map(r=>r.map(x=>fmt(x))),[[0,0],[1,1]]);
        if(step>=2)html+=matrix('이미지→문장: 각 행 합=1',row.map(r=>r.map(x=>fmt(x))),[[0,0],[1,1]])+matrix('문장→이미지: 각 열 합=1',[[col[0][0],col[1][0]],[col[0][1],col[1][1]]].map(r=>r.map(x=>fmt(x))),[[0,0],[1,1]]);
        if(step>=3)html+=`<p class="equation">L = (${fmt(ri)} + ${fmt(ci)}) / 2 = ${fmt(loss)}</p>`;
        return {html:html+note,explanation:`행 기준 CE는 ${fmt(ri)}, 열 기준 CE는 ${fmt(ci)}, 대칭 평균은 ${fmt(loss)}입니다. 정답은 현재 배치의 짝 인덱스이며 클래스 이름을 고정한 일반 분류와 다릅니다. α=${alpha}는 순위가 같아도 분포의 선명도와 손실을 바꿉니다. 후보 내 확률을 독립적으로 보장된 사실 확률로 읽지 않습니다.`,metrics:[['이미지→문장 CE',fmt(ri)],['문장→이미지 CE',fmt(ci)],['양방향 평균',fmt(loss)],['배치 정답 쌍','2개']]};
      },
      question:{prompt:'CLIP의 배치 대조 학습에서 대각선의 정답은 무엇인가요?',options:['현재 배치에서 함께 제공된 이미지와 문장의 짝','이미지에 수작업으로 매긴 전역 클래스 번호만','교사 모델이 항상 생성한 라벨'],answer:0,explanation:'각 이미지와 짝을 이루는 문장의 배치 인덱스를 맞힙니다. 역방향에서도 문장과 이미지의 짝 인덱스를 맞힙니다.'}
    },
    'vision-nms': {
      title:'IoU·NMS·평가 임계값은 서로 다른 판단',
      intro:'본문의 A·B·C·D 박스를 사용합니다. NMS의 중복 제거와 정답 매칭을 분리하고, 보간 면적 AP가 마지막 Precision과 다른 이유를 확인합니다.',
      defaults:{nms:0.5,eval:0.5},
      controls:[range('nms','NMS: IoU가 이 값보다 크면 억제',0,1,0.05),range('eval','평가: 정답 IoU가 이 값 이상이면 허용',0.05,1,0.05)],
      steps:steps([['후보 박스','모두 같은 클래스, 연속 xyxy 좌표를 사용합니다.'],['중복 제거','점수 내림차순으로 채택하고 같은 클래스의 중복을 억제합니다.'],['정답과 일대일 매칭','아직 연결되지 않은 정답 중 IoU가 가장 높은 허용 쌍을 찾습니다.'],['순위 평가','누적 Precision·Recall과 연속 Recall 보간 면적 AP를 구합니다.']]),
      compute(p,step) {
        const nms=Number(p.nms),threshold=Number(p.eval),gt=[[0,0,10,10],[20,0,30,10]],boxes=[{id:'A',score:.9,box:[0,0,10,10]},{id:'B',score:.8,box:[1,0,11,10]},{id:'C',score:.7,box:[20,0,26,10]},{id:'D',score:.6,box:[40,0,50,10]}];
        const iou=(a,b)=>{const ix=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0])),iy=Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1])),inter=ix*iy,union=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter;return union>0?inter/union:0;};
        const kept=[],removed=[];boxes.forEach(b=>{const prev=kept.find(a=>iou(a.box,b.box)>nms);if(prev)removed.push([b.id,prev.id]);else kept.push(b);});
        const matched=new Set();let tp=0,fp=0;const records=kept.map(b=>{let best=-1,bestIoU=-1;gt.forEach((g,i)=>{const score=iou(b.box,g);if(!matched.has(i)&&score>=threshold&&score>bestIoU){best=i;bestIoU=score;}});if(best>=0){matched.add(best);tp++;}else fp++;return {id:b.id,match:best>=0?`G${best+1}`:'미매칭',verdict:best>=0?'TP':'FP',tp,fp,precision:tp/(tp+fp),recall:tp/gt.length};});
        let prevRecall=0,ap=0;records.forEach((r,i)=>{if(r.recall>prevRecall){ap+=(r.recall-prevRecall)*Math.max(...records.slice(i).map(x=>x.precision));prevRecall=r.recall;}});
        const last=records[records.length-1];
        const drawing=svg('같은 좌표계의 정답 G1,G2와 예측 A,B,C,D xyxy 박스',gt.map((g,i)=>`<rect x="${30+g[0]*10}" y="45" width="${(g[2]-g[0])*10}" height="100" fill="none" stroke="#17666b" stroke-width="3"/><text x="${30+g[0]*10}" y="25" fill="currentColor" font-size="15">G${i+1}</text>`).join('')+boxes.map((b,i)=>`<rect x="${30+b.box[0]*10}" y="45" width="${(b.box[2]-b.box[0])*10}" height="100" fill="none" stroke="${step>=1&&removed.some(x=>x[0]===b.id)?'#8b9298':'#7251a1'}" stroke-width="2" stroke-dasharray="${step>=1&&removed.some(x=>x[0]===b.id)?'3 5':'8 4'}"/><text x="${30+b.box[0]*10}" y="${172+i*17}" fill="currentColor" font-size="14">${b.id} ${b.score}${step>=1&&removed.some(x=>x[0]===b.id)?' 억제':''}</text>`).join(''),620,246);
        let html=drawing+`<p class="equation">IoU(A,B) = 90 / (100+100−90) = ${fmt(iou(boxes[0].box,boxes[1].box))}</p>`;
        if(step>=1)html+=`<p>채택: <strong>${kept.map(b=>b.id).join(', ')}</strong>. 억제: ${removed.length?removed.map(([b,a])=>`${b} (${a}와 중복)`).join(', '):'없음'}</p>`;
        if(step>=2)html+=table(['예측','정답 연결','판정','누적 TP','누적 FP',...(step>=3?['Precision','Recall']:[])],records.map(r=>[r.id,r.match,r.verdict,r.tp,r.fp,...(step>=3?[fmt(r.precision),fmt(r.recall)]:[])]),'점수 내림차순 평가');
        if(step>=3)html+=`<p class="equation">연속 Recall 보간 AP = ${fmt(ap)}</p>`;
        return {html:html+note,explanation:`NMS 임계값 ${nms}와 평가 임계값 ${threshold}는 독립입니다. A,B의 IoU는 ${fmt(9/11)}이므로 ${9/11>nms?'B가 억제됩니다':'B도 남습니다'}. 평가에서는 같은 정답에 중복 매칭하지 않습니다. 마지막 Precision=${fmt(last.precision)}, 최대 Recall=${fmt(last.recall)}, 연속 면적 AP=${fmt(ap)}입니다. COCO의 101점 샘플링·IoU 평균·ignore/crowd를 재현한 값은 아닙니다. 동점은 입력 ID 순서를 유지합니다.`,metrics:[['NMS 후 박스',String(kept.length)],['최종 TP / FP',`${tp} / ${fp}`],['최종 Precision',fmt(last.precision)],['연속 보간 AP',fmt(ap)]]};
      },
      question:{prompt:'NMS 임계값은 그대로 두고 평가 IoU만 높이면 무엇이 바뀌나요?',options:['채택 박스는 같아도 정답 매칭과 AP가 바뀔 수 있습니다','NMS가 자동으로 더 많은 박스를 제거합니다','박스 좌표 자체가 이동합니다'],answer:0,explanation:'NMS는 예측끼리의 중복 판단, 평가 IoU는 예측과 정답의 허용 매칭 기준입니다.'}
    },
    'vision-tracking': {
      title:'Track과 검출의 일대일 연결 및 미매칭',
      intro:'본문의 2×2 IoU 표에서 연결 비용 1−IoU를 만듭니다. 임계값으로 불가능한 쌍을 먼저 제외하고 연결 수가 최대인 일대일 배치 중 최소 비용을 고릅니다.',
      defaults:{gate:0.3,bToD2:0.7},
      controls:[range('gate','연결 허용 IoU 하한',0,1,0.05),range('bToD2','IoU(B,D2)',0,1,0.05)],
      steps:steps([['운동 예측 뒤의 IoU','이 표는 예측 Track 박스와 현재 검출 박스 사이의 유사도입니다.'],['허용 연결','게이트보다 작은 IoU는 금지합니다.'],['일대일 할당','한 검출을 두 Track이 공유할 수 없습니다.'],['상태 갱신','연결된 Track과 미연결 Track·검출을 분리합니다.']]),
      compute(p,step) {
        const gate=Number(p.gate),v=Number(p.bToD2),ious=[[.8,.3],[.4,v]],candidates=[];
        for(let a=-1;a<2;a++)for(let b=-1;b<2;b++){if(a>=0&&a===b)continue;if(a>=0&&ious[0][a]<gate)continue;if(b>=0&&ious[1][b]<gate)continue;const matches=(a>=0?1:0)+(b>=0?1:0),cost=(a>=0?1-ious[0][a]:0)+(b>=0?1-ious[1][b]:0);candidates.push({a,b,matches,cost});}
        candidates.sort((a,b)=>b.matches-a.matches||a.cost-b.cost||a.a-b.a||a.b-b.b);const best=candidates[0];
        let html=matrix('행=Track A,B / 열=검출 D1,D2의 IoU',ious.map(r=>r.map(x=>fmt(x))),step>=3?[[0,best.a],[1,best.b]].filter(x=>x[1]>=0):[]);
        if(step>=1)html+=table(['Track','D1: 비용·허용','D2: 비용·허용'],ious.map((row,i)=>[['A','B'][i],...row.map(x=>x>=gate?`${fmt(1-x)} / 허용`:'금지')]),'비용=1−IoU, 금지 연결은 제외');
        if(step>=2)html+=table(['배치 (A, B)','연결 수','허용 쌍의 비용 합'],candidates.slice(0,6).map(x=>[`${x.a>=0?'D'+(x.a+1):'미매칭'}, ${x.b>=0?'D'+(x.b+1):'미매칭'}`,x.matches,fmt(x.cost)]),'연결 수 최대, 그 안에서 비용 최소');
        if(step>=3)html+=`<p>Track A: ${best.a>=0?`D${best.a+1}와 연결 → 상태 갱신`:'미매칭 → 유지·Lost 여부는 시간 규칙으로 판단'}<br>Track B: ${best.b>=0?`D${best.b+1}와 연결 → 상태 갱신`:'미매칭 → 유지·Lost 여부는 시간 규칙으로 판단'}</p>`;
        return {html:html+note,explanation:`허용 IoU≥${gate}에서 ${best.matches}쌍을 연결하고 비용 합은 ${fmt(best.cost)}입니다. 두 Track이 같은 검출을 차지하지 못하도록 일대일 제약을 둡니다. 임계값을 높여 가능한 검출이 없어지면 가장 싼 불가능 쌍을 강제하지 않고 미매칭으로 남깁니다. 실제 ByteTrack은 높은·낮은 점수 검출에 두 번 연결하며 생존 시간과 신규 Track 정책이 더 필요합니다.`,metrics:[['연결 수',String(best.matches)],['연결 비용 합',fmt(best.cost)],['미매칭 Track',String(2-best.matches)],['허용 IoU',`≥${gate}`]]};
      },
      question:{prompt:'IoU가 가장 높은 후보도 게이트를 통과하지 못했다면?',options:['미매칭으로 남깁니다','항상 그 후보에 강제로 연결합니다','현재 프레임마다 ID를 모두 새로 부여합니다'],answer:0,explanation:'허용 가능한 연결과 최소 비용 연결은 다른 조건입니다. 실제 Track 수명과 Lost 복귀 규칙은 별도로 정합니다.'}
    },
    'vision-segmentation': {
      title:'같은 픽셀 예측에서 정확도·mIoU·FWIoU 비교',
      intro:'전경 5픽셀·배경 15픽셀의 같은 정답을 유지합니다. 놓친 전경과 잘못 켠 배경 수를 바꾸며 혼동행렬과 지표를 함께 계산합니다.',
      defaults:{fn:1,fp:2},
      controls:[range('fn','놓친 전경 FN (5개 중)',0,5),range('fp','잘못 켠 배경 FP (15개 중)',0,15)],
      steps:steps([['정답 격자','앞의 5픽셀은 전경, 나머지 15픽셀은 배경입니다.'],['예측과 오류','전경의 FN개를 끄고 배경의 FP개를 켭니다.'],['클래스별 IoU','전경·배경의 역할을 바꿔 각각 교집합과 합집합을 셉니다.'],['집계','클래스 동등 평균·정답 빈도 가중 평균·전체 정확도를 비교합니다.']]),
      compute(p,step) {
        const fn=Number(p.fn),fp=Number(p.fp),tp=5-fn,tn=15-fp,fg=tp/(tp+fp+fn),bg=tn/(tn+fn+fp),miou=(fg+bg)/2,fwiou=.25*fg+.75*bg,acc=(tp+tn)/20;
        const gt=Array.from({length:20},(_,i)=>i<5?1:0),pred=gt.map((x,i)=>i<5?(i<fn?0:1):(i<5+fp?1:0));
        const grid=(values,name)=>svg(name,values.map((x,i)=>`<rect x="${18+i%5*55}" y="${14+Math.floor(i/5)*44}" width="49" height="38" fill="${x?'#17666b':'#e4e9ed'}"/><text x="${43+i%5*55}" y="${39+Math.floor(i/5)*44}" text-anchor="middle" font-size="15" fill="${x?'white':'#173746'}">${x?'전경':'배경'}</text>`).join(''),300,204);
        let html=`<div><p><strong>정답</strong></p>${grid(gt,'정답: 전경 5개, 배경 15개')}</div>`;
        if(step>=1)html+=`<div><p><strong>예측</strong></p>${grid(pred,'예측 전경과 배경 격자')}</div>`+table(['정답 ↓ / 예측 →','전경','배경','정답 수'],[['전경',tp,fn,5],['배경',fp,tn,15]],'혼동행렬');
        if(step>=2)html+=`<p class="equation">IoU_전경 = ${tp}/(${tp}+${fp}+${fn}) = ${fmt(fg)}<br>IoU_배경 = ${tn}/(${tn}+${fn}+${fp}) = ${fmt(bg)}</p>`;
        if(step>=3)html+=miniBars([['Pixel accuracy',acc],['mIoU',miou],['FWIoU',fwiou]],1,'세 지표 비교: 모두 0–1 고정 척도');
        return {html:html+note,explanation:`전경 TP=${tp}, FP=${fp}, FN=${fn}. mIoU는 (${fmt(fg)}+${fmt(bg)})/2=${fmt(miou)}, FWIoU는 정답 빈도 5/20·15/20으로 가중해 ${fmt(fwiou)}입니다. 픽셀 정확도 ${fmt(acc)}와 다릅니다. 이 예에는 전경·배경 정답이 모두 있어 IoU 분모가 0이 아니며 ignore 픽셀은 없습니다. 배경이 많을 때 전체 정확도 하나로 작은 물체 성능을 판단하지 않습니다.`,metrics:[['전경 IoU',fmt(fg)],['배경 IoU',fmt(bg)],['mIoU',fmt(miou)],['Pixel accuracy',fmt(acc)],['FWIoU',fmt(fwiou)]]};
      },
      question:{prompt:'희귀 전경을 놓쳤는데 Pixel accuracy가 높게 남을 수 있는 이유는?',options:['많은 배경 픽셀의 정답이 전체 평균을 지배하기 때문','Pixel accuracy는 항상 mIoU보다 작기 때문','배경 픽셀은 계산에서 무조건 제외하기 때문'],answer:0,explanation:'전체 맞힌 픽셀 비율은 배경의 빈도에 영향을 받습니다. 클래스별 IoU와 mIoU도 함께 봅니다.'}
    }
  };
  window.LabModules ||= {};
  Object.assign(window.LabModules, modules);
  const controlHelp={
    'vision-image':(_p,s)=>s<3?'현재 단계의 RGB 원본과 축 배치는 평균·표준편차와 무관합니다. μ·σ의 효과는 4단계 정규화의 채널 표에서 확인하세요. 축을 바꾸면서 픽셀 값을 바꾼 것처럼 보이게 만들지 않습니다.':'정규화가 바뀌어도 위의 원본 RGB 그림은 보존됩니다. μ·σ는 채널 표의 실수값을 바꾸며 실제 사진의 색을 재생성한 결과가 아닙니다.',
    'vision-training':(_p,s)=>s===0?'입력·초기 가중치는 고정이므로 정답 선택과 학습률은 첫 전방계산 그림을 바꾸지 않습니다. 정답의 효과는 2단계 CE·3단계 기울기, 학습률의 효과는 4단계 갱신에서 확인하세요.':s<3?'현재 softmax와 기울기는 갱신 전 계산입니다. η를 바꾸어도 이 값은 같고 마지막 업데이트 단계의 파라미터·CE가 달라집니다.':'학습률이 0이면 갱신 전후 값이 같은 것이 정상입니다. 정답 선택은 q−y의 방향을 바꾸며, 원본 입력과 초기 로짓은 바꾸지 않습니다.',
    'vision-conv':(p,s)=>s===0?'현재는 입력과 출력 크기를 정하는 단계입니다. 출력 칸 번호를 움직인 효과는 2단계부터 선택된 입력 영역의 색·값으로 확인하세요.':'출력 칸 번호는 현재 출력 범위를 넘으면 마지막 유효 칸으로 제한됩니다. 내부 위치의 값이 모두 −6일 수 있지만 읽는 입력 영역은 달라집니다. 위치별 숫자가 다른 출력을 보려면 padding=1로 바꾸어 경계 칸과 내부 칸을 비교하세요.',
    'vision-receptive':(_p,s)=>s===0?'입력에서 r=j=1은 뒤층 설정과 무관합니다. Pool stride는 3단계, 마지막 dilation은 4단계에서 처음 적용됩니다.':s===1?'첫 Conv까지는 Pool stride·마지막 dilation을 아직 사용하지 않습니다. Pool의 간격 변화는 다음 단계, dilation의 유효 폭은 마지막 단계에서 확인하세요.':s===2?'Pool stride는 현재 j를 바꿉니다. 마지막 Conv의 dilation은 다음 단계에서 K_eff에 적용되므로 현재 Pool 결과는 같을 수 있습니다.':'Dilation과 Pool stride의 효과는 원본 좌표 기준의 누적 범위·간격으로 나타납니다. 고정 원본 격자를 움직여 값을 꾸미지 않습니다.',
    'vision-residual':(_p,s)=>s===0?'현재는 입력 shape만 표시하므로 출력 채널과 첫 Conv stride의 효과는 2단계 잔차 경로부터 보입니다.':'동일한 출력 채널·공간 크기를 만드는 조건에서는 덧셈 결과 shape가 유지됩니다. 가중치 수와 지름길 종류를 함께 비교하고 실제 픽셀값을 계산한 결과와 구분하세요.',
    'vision-patches':(_p,s)=>s===0?'현재 패치 격자는 P만 사용합니다. 임베딩 차원 D는 2단계 투영, CLS 선택은 3단계 토큰 구성에서 처음 적용됩니다.':s===1?'D는 투영된 벡터의 길이를 바꾸며 공간 패치 수를 바꾸지 않습니다. CLS가 추가하는 토큰은 다음 단계에서 확인하세요.':'D를 바꾸어도 T×T의 두 토큰 축은 같습니다. 이 점수 원소 수를 바꾸려면 패치 P 또는 CLS를 조절하세요. 여러 head 수와 실제 연산량은 별도 조건입니다.',
    'vision-clip':(_p,s)=>s===0?'로짓 배율 α는 임베딩 자체를 바꾸지 않습니다. 2단계 로짓과 3단계 정규화부터 α의 효과가 보이며, 문장 2 각도는 현재 벡터 표에 바로 반영됩니다.':'α를 올려도 모든 경우 argmax가 바뀌는 것은 아닙니다. 같은 순위를 유지하면서 확률과 손실만 바뀔 수 있으므로 해당 표의 수치를 비교하세요.',
    'vision-nms':(p,s)=>{
      const nms=Number(p.nms),threshold=Number(p.eval);
      return s===0?'현재는 고정 예측·정답 좌표를 보는 단계입니다. NMS 임계값은 2단계 중복 제거, 평가 임계값은 3단계 정답 매칭에서 적용됩니다.':`현재 IoU(A,B)=9/11≈0.8182, NMS 기준은 ${nms}입니다. 같은 채택 결과가 유지되는 임계값 구간에서는 박스가 움직이지 않습니다. NMS를 0.9로 바꾸면 B도 남고, 평가 기준을 0.75로 올리면 C의 IoU=0.6이 탈락합니다. 현재 평가 기준은 ${threshold}이며 정답 좌표는 그대로입니다.`;
    },
    'vision-tracking':(p,s)=>s===0?'현재는 주어진 IoU 행렬입니다. 게이트는 값을 바꾸지 않고 다음 단계에서 허용 연결을 제한합니다. IoU(B,D2)는 현재 행렬에서 바로 바뀝니다.':`게이트 ${Number(p.gate)}를 움직여도 허용 쌍의 집합이 바뀌지 않는 구간에서는 배치가 같습니다. 기본 IoU 표에서 0.75로 올리면 B–D2=0.7이 금지되어 B가 미매칭이 됩니다.`,
    'vision-segmentation':(_p,s)=>s===0?'정답 전경 5개·배경 15개는 고정입니다. FN·FP 슬라이더의 효과는 2단계 예측 격자·혼동행렬부터 보이며 정답 자체를 바꾸지 않습니다.':'오류 개수를 바꾸면 예측 격자와 혼동행렬·지표가 함께 바뀝니다. 첫 정답 격자는 비교 기준으로 계속 유지됩니다.'
  };
  Object.entries(controlHelp).forEach(([id,help])=>{
    const module=window.LabModules[id],compute=module.compute;
    module.compute=function(params,step){const result=compute(params,step);return {...result,explanation:result.explanation+' '+help(params,step)};};
  });
})();
