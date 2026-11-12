/* DATA: 원문 숫자를 사용한 오프라인 교육용 계산. 실제 PyTorch 학습/외부 데이터 실행과 구분한다. */
(function () {
  'use strict';
  const C = {input:'#235eaa', target:'#7352b6', valid:'#087f74', warning:'#b65b16', rule:'#708299', paper:'#ffffff'};
  const SERIES = Object.freeze([10,12,14,16,18,20,24,25]);
  const esc = s => String(s).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const fmt = (x, n=5) => x === null || x === undefined || !Number.isFinite(x) ? '정의되지 않음' : String(Number(x.toFixed(n)));
  const num = (p,k,d,min,max) => {const x=Number(p && p[k] !== undefined ? p[k] : d);return Math.min(max,Math.max(min,Number.isFinite(x)?x:d));};
  const int = (p,k,d,min,max) => Math.round(num(p,k,d,min,max));
  const choice = (p,k,d,items) => items.includes(p && p[k]) ? p[k] : d;
  const stage = (s,n) => Math.round(Math.max(0,Math.min(n-1,Number.isFinite(Number(s))?Number(s):0)));
  const sum = xs => xs.reduce((a,b)=>a+b,0);
  const vector = xs => '['+xs.map(x=>fmt(x)).join(', ')+']';
  const table = (heads,rows) => '<div class="table-scroll" tabindex="0" role="region" aria-label="DATA 계산 표" style="max-width:100%;overflow-x:auto"><table><thead><tr>'+heads.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const eq = text => '<p class="equation">'+esc(text)+'</p>';
  const note = text => '<p class="muted">'+esc(text)+'</p>';
  const svg = (label,height,body) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 '+height+'" role="img" aria-label="'+esc(label)+'" style="display:block;width:100%;min-width:680px;height:auto;font-family:system-ui,sans-serif"><title>'+esc(label)+'</title>'+body+'</svg>';
  const txt = (x,y,text,color='currentColor',anchor='start') => '<text x="'+x+'" y="'+y+'" font-size="16" text-anchor="'+anchor+'" fill="'+color+'">'+esc(text)+'</text>';
  const line = (x1,y1,x2,y2,color=C.rule,dash='') => '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="2"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
  const box = (x,y,w,h,text,color) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5" fill="'+C.paper+'" stroke="'+color+'" stroke-width="2"/>'+txt(x+w/2,y+h/2+6,text,color,'middle');
  const range = (key,label,min,max,step) => ({key,label,type:'range',min,max,step});
  const select = (key,label,items) => ({key,label,type:'select',options:items.map(([value,label])=>({value,label}))});

  function errors(actual,predicted) {
    const rows=actual.map((y,i)=>({y,pred:predicted[i],error:predicted[i]-y}));
    const n=rows.length;
    const mae=n?sum(rows.map(r=>Math.abs(r.error)))/n:null;
    const mse=n?sum(rows.map(r=>r.error*r.error))/n:null;
    const mape=n && rows.every(r=>r.y!==0)?sum(rows.map(r=>Math.abs(r.error/r.y)))/n:null;
    return {rows,n,mae,mse,rmse:mse===null?null:Math.sqrt(mse),mape};
  }
  function windows(p={}) {
    const l=int(p,'length',3,1,8),h=int(p,'horizon',2,1,8),train=int(p,'train',6,1,8);
    const rows=Array.from({length:Math.max(0,SERIES.length-l-h+1)},(_,i)=>({i,x:SERIES.slice(i,i+l),y:SERIES.slice(i+l,i+l+h),end:i+l+h,
      kind:i+l+h<=train?'train':i+l>=train?'evaluation':'crossing'}));
    const training=rows.filter(r=>r.kind==='train'),evaluation=rows.filter(r=>r.kind==='evaluation');
    const first=evaluation.find(r=>r.i+l===train)||null;
    return {l,h,train,rows,training,evaluation,first,count:Math.max(0,train-l-h+1)};
  }
  function windowSvg(r,chosen,showSplit) {
    let body=txt(18,27,'날짜(일) · 판매량(개)');
    SERIES.forEach((v,i)=>{
      const x=28+i*86,kind=chosen && i>=chosen.i && i<chosen.i+r.l?'X':chosen && i>=chosen.i+r.l && i<chosen.end?'y':'';
      const color=kind==='X'?C.input:kind==='y'?C.target:C.rule;
      body+=txt(x+31,57,(i+1)+'일','currentColor','middle')+box(x,72,62,42,v,color)+txt(x+31,141,kind||'관측',color,'middle');
    });
    if(showSplit && r.train<8) {const x=16+r.train*86;body+=line(x,45,x,155,C.warning,'5 4')+txt(Math.min(x,690),185,'훈련 경계: '+r.train+'일',C.warning,'end');}
    return svg('8일 관측에서 X 입력과 y 라벨 및 훈련 경계',202,body);
  }
  function scaling(p={}) {
    const constant=choice(p,'data','normal',['normal','constant'])==='constant';
    const value=num(p,'value',24,0,30);
    const values=(constant?[10,10,10,10,10,10]:SERIES.slice(0,6)).concat([value,25]);
    const fit=choice(p,'fit','train',['train','all']),fitted=fit==='train'?values.slice(0,6):values;
    const min=Math.min(...fitted),max=Math.max(...fitted),span=max-min,denominator=span===0?1:span;
    const transform=x=>(x-min)/denominator,inverse=z=>z*denominator+min;
    const scaled=values.map(transform);
    const rawError=errors([value,25],[22,24]),scaledError=errors([value,25].map(transform),[22,24].map(transform));
    return {values,fit,min,max,span,denominator,constant,value,scaled,transformed:transform(value),restored:inverse(transform(value)),rawError,scaledError};
  }
  function forecast(p={}) {
    const delta=num(p,'delta',2,-2,6),observed=num(p,'observed',24,18,28);
    const first=20+delta,fixed=[first,first+delta],rolling=[first,observed+delta],actual=[observed,25];
    const mode=choice(p,'mode','fixed',['fixed','rolling']);
    return {delta,observed,first,fixed,rolling,actual,mode,chosen:mode==='fixed'?fixed:rolling,fixedError:errors(actual,fixed),rollingError:errors(actual,rolling)};
  }
  function state(p={}) {
    const wx=num(p,'inputWeight',1,0,2),wh=num(p,'stateWeight',0.5,-1,1),xs=[0,0.2,0.4];
    let previous=0;
    const rows=xs.map((x,i)=>{const before=previous,a=wx*x+wh*before;previous=Math.tanh(a);return {day:i+1,raw:SERIES[i],x,before,a,h:previous};});
    return {wx,wh,rows,pred:previous,target:0.6,loss:(previous-0.6)**2};
  }
  function memory(p={}) {
    const previous=2,f=num(p,'forget',0.8,0,1),i=num(p,'inputGate',0.5,0,1),g=num(p,'candidate',0.4,-1,1),o=num(p,'outputGate',0.75,0,1);
    const kept=f*previous,added=i*g,c=kept+added,h=o*Math.tanh(c);
    return {previous,f,i,g,o,kept,added,c,h};
  }
  function ses(p={}) {
    const alpha=num(p,'alpha',0.5,0,1);let level=10;
    const rows=[12,14,16].map((y,i)=>{const before=level,error=y-before;level+=alpha*error;return {day:i+1,y,before,error,update:alpha*error,level};});
    return {alpha,rows,level};
  }
  function score(p={}) {
    const u=[1,num(p,'userSecond',2,-2,3)],v=[0.5,num(p,'itemSecond',1.5,-2,3)];
    const products=u.map((x,i)=>x*v[i]),mf=sum(products),joined=u.concat(v);
    const pre=[joined[0]+joined[2],joined[1]+joined[3]],hidden=pre.map(x=>Math.max(0,x)),ncf=hidden[0]+0.5*hidden[1]-0.25;
    const model=choice(p,'model','mf',['mf','ncf']),target=num(p,'target',3.5,0.5,5),observed=choice(p,'label','known',['known','missing'])==='known';
    const prediction=model==='mf'?mf:ncf;
    return {u,v,products,mf,joined,pre,hidden,ncf,model,target,observed,prediction,loss:observed?(prediction-target)**2:null};
  }
  function bpr(p={}) {
    const gap=num(p,'gap',1,-5,5),shift=num(p,'shift',0,0,5),negative=1+shift,positive=negative+gap;
    const probability=1/(1+Math.exp(-gap)),loss=Math.max(0,-gap)+Math.log1p(Math.exp(-Math.abs(gap)));
    return {gap,shift,negative,positive,probability,loss,dPositive:probability-1,dNegative:1-probability};
  }
  function graph(p={}) {
    const mode=choice(p,'mode','ngcf',['ngcf','gcn','lightgcn']),depth=int(p,'depth',1,1,3),w2=num(p,'interaction',1,0,2);
    const nodes=['u0','u1','i0','i1','i2'],edges=[[0,2],[1,2],[1,3]],degree=[1,2,2,1,0],initial=[2,1,3,4,5];
    const layers=[initial.slice()],records=[];
    for(let l=0;l<depth;l++) {
      const old=layers[l],next=old.map((x,i)=>mode==='ngcf'?x:mode==='gcn'?x/(degree[i]+1):0),messages=[];
      edges.forEach(([a,b])=>{
        const norm=1/Math.sqrt((degree[a]+(mode==='gcn'?1:0))*(degree[b]+(mode==='gcn'?1:0)));
        const interaction=mode==='ngcf'?w2*old[a]*old[b]:0;
        const toA=norm*(old[b]+interaction),toB=norm*(old[a]+interaction);
        next[a]+=toA;next[b]+=toB;
        messages.push({a,b,norm,interaction,toA,toB});
      });
      const output=next.map(x=>mode==='ngcf' && x<0?0.2*x:x);
      records.push({old:old.slice(),messages,pre:next,output});layers.push(output);
    }
    const representations=nodes.map((_,i)=>mode==='ngcf'?layers.map(layer=>layer[i]):mode==='lightgcn'?[sum(layers.map(layer=>layer[i]))/(depth+1)]:[layers[depth][i]]);
    const finalScore=sum(representations[0].map((v,j)=>v*representations[3][j]));
    return {mode,depth,w2,nodes,edges,degree,initial,layers,records,representations,finalScore};
  }
  function ranking(p={}) {
    const order=choice(p,'order','BAE',['BAE','ABE','BEA','tie']),universe=choice(p,'candidates','all',['all','short','seen','empty']);
    const k=int(p,'k',3,1,8),truth=choice(p,'truth','three',['three','four','none']);
    const relevant=truth==='none'?[]:truth==='four'?['A','C','D','G']:['A','C','D'];
    const lists={BAE:['B','A','E','C','D'],ABE:['A','B','E','C','D'],BEA:['B','E','A','C','D'],tie:['A','B','C','D','E']};
    const candidates=universe==='empty'?[]:universe==='short'?['A','B']:universe==='seen'?['A','B','C','D','E','F']:['A','B','C','D','E'];
    const scored=candidates.map(id=>({id,score:order==='tie'?1:id==='F'?6:5-lists[order].indexOf(id)}));
    scored.sort((a,b)=>b.score-a.score || (a.id<b.id?-1:a.id>b.id?1:0));
    const rows=scored.slice(0,k).map((r,i)=>({...r,rank:i+1,relevant:relevant.includes(r.id),gain:relevant.includes(r.id)?1/Math.log2(i+2):0}));
    const hits=rows.filter(r=>r.relevant).length,returned=rows.length;
    const precisionPolicy=choice(p,'precision','fixed',['fixed','returned']),precisionDenominator=precisionPolicy==='fixed'?k:returned;
    const idealPolicy=choice(p,'ideal','global',['global','candidate']),reachable=relevant.filter(x=>candidates.includes(x)).length;
    const idealCount=Math.min(idealPolicy==='global'?relevant.length:reachable,k),dcg=sum(rows.map(r=>r.gain));
    const idcg=sum(Array.from({length:idealCount},(_,i)=>1/Math.log2(i+2)));
    return {order,universe,k,relevant,candidates,scored,rows,hits,returned,precisionPolicy,precisionDenominator,idealPolicy,reachable,idealCount,dcg,idcg,
      precision:precisionDenominator?hits/precisionDenominator:0,recall:relevant.length?hits/relevant.length:0,ndcg:idcg?dcg/idcg:0};
  }
  function errorExample(p={}) {
    const kind=choice(p,'kind','forecast',['forecast','rating','zero']),offset=num(p,'offset',0,-5,5);
    const actual=kind==='rating'?[3.5,5]:kind==='zero'?[0,18]:[16,18],predicted=kind==='rating'?[3+offset,4]:[14+offset,19];
    return {...errors(actual,predicted),kind,offset,unit:kind==='rating'?'점':'개'};
  }
  function training(p={}) {
    const b=int(p,'batch',2,1,4),d=int(p,'hidden',64,2,64),h=int(p,'horizon',2,1,4),model=choice(p,'model','lstm',['lstm','rnn','conv','seq2seq','ncf']);
    const w=num(p,'weight',1,0.8,1.2),eta=num(p,'rate',0.001,0,0.005),xs=Array.from({length:b},(_,i)=>i%2===0?17:19),ys=Array.from({length:b},(_,i)=>i%2===0?16:20);
    const predictions=xs.map(x=>w*x),loss=sum(predictions.map((v,i)=>(v-ys[i])**2))/b,gradient=2*sum(predictions.map((v,i)=>(v-ys[i])*xs[i]))/b;
    const next=w-eta*gradient,nextLoss=sum(xs.map((v,i)=>(next*v-ys[i])**2))/b;
    const shapes=model==='ncf'?[['식별자 users / movies','['+b+'] / ['+b+']','torch.long'],['Embedding 각각','['+b+',32]','float32, 학습 파라미터'],['cat(dim=1)','['+b+',64]','사용자·영화 특성 결합'],['Linear → ReLU','['+b+',32]','은닉 표현'],['Linear → 예측 / 평점 정답','['+b+',1] / ['+b+',1]','float32, 소수 평점 유지']]:
      [['입력 X','['+b+',3,1]','float32: 예, 시간, 특성'],[model==='conv'?'transpose(1,2) → Conv1d(k=2)':'순환층 전체 출력',model==='conv'?'['+b+',1,3] → ['+b+','+d+',2]':'['+b+',3,'+d+']',model==='conv'?'예, 채널, 시간':'예, 시간, 은닉'],[model==='lstm'?'h_n, c_n 각각':model==='conv'?'transpose → Linear':'h_n',model==='conv'?'['+b+',2,'+d+'] → ['+b+',2,1]':'[2,'+b+','+d+']',model==='conv'?'시간 길이 3−2+1=2':'층, 예, 은닉; batch_first와 별개'],[model==='seq2seq'?'decoder 반복 → stack(dim=1)':'Linear 후 마지막 시점 선택',model==='seq2seq'?'['+b+','+h+',1]':'['+b+']','예측 축을 정답과 일치'],['정답 y',model==='seq2seq'?'['+b+','+h+',1]':'['+b+']','동일한 예·날짜·변수']];
    return {b,d,h,model,w,eta,xs,ys,predictions,loss,gradient,next,nextLoss,shapes};
  }

  // 검산용 계산 API: DOM, 시간, 난수 및 네트워크에 의존하지 않는다.
  window.DataLabMath=Object.freeze({windows,scaling,forecast,state,memory,ses,score,bpr,graph,ranking,errorExample,training,errors});
  window.LabModules=window.LabModules||{};
  Object.assign(window.LabModules, {
    'data-window': {
      title:'과거 X와 미래 y를 시간 경계로 나눕니다',
      intro:'본문의 8일 판매량으로 마지막 유효 창까지 만듭니다. 과거 길이 L, 미래 길이 H, 훈련 마지막 날을 바꾸면 창 수와 라벨 날짜가 함께 바뀝니다.',
      defaults:{length:3,horizon:2,train:6},
      controls:[range('length','과거 길이 L (일)',1,8,1),range('horizon','예측 길이 H (일)',1,8,1),range('train','훈련 마지막 날',1,8,1)],
      steps:[{title:'라벨 경계',text:'어느 날까지 훈련 정답으로 쓸 수 있나요?'},{title:'훈련 창',text:'마지막 유효 창까지 포함하면 몇 쌍인가요?'},{title:'최초 평가 창',text:'훈련 과거를 이어 쓰되 평가 정답을 숨겨 보세요.'},{title:'Tensor 축',text:'예·시간·특성 축에서 X와 y를 연결합니다.'}],
      compute(p,s) {
        const r=windows(p),st=stage(s,4),chosen=st>=2?r.first:st===1?r.training[r.training.length-1]:null;
        let html=windowSvg(r,chosen,true)+eq('훈련 창 수 = max(0, N_train−L−H+1) = max(0, '+r.train+'−'+r.l+'−'+r.h+'+1) = '+r.count);
        if(st>=1) html+=table(['시작일','입력 X 날짜·값','정답 y 날짜·값','라벨 구간 판정'],r.rows.map(w=>[w.i+1,(w.i+1)+'~'+(w.i+r.l)+'일 '+vector(w.x),(w.i+r.l+1)+'~'+w.end+'일 '+vector(w.y),w.kind==='train'?'훈련':w.kind==='evaluation'?'평가 (해당 기준일 이후만 정답)':'경계를 가로지름: 두 구간에서 제외']));
        if(st>=2) html+=note(r.first?'첫 평가 X='+vector(r.first.x)+' → y='+vector(r.first.y)+'. X의 마지막 날은 훈련 마지막 날과 같습니다. 더 뒤 평가 창은 그 기준일에 실제 관측이 도착한 반복 평가용입니다.':'현재 설정은 경계 직후 H일의 라벨 또는 L일의 과거가 부족하여 최초 평가 창이 없습니다. L·H를 줄이거나 훈련 경계를 옮기세요.');
        if(st>=3) html+=table(['Tensor','모양','dtype / 축'],[['훈련 X','['+r.count+','+r.l+',1]','float32 / 예, 과거 시간, 특성'],['훈련 y','['+r.count+','+r.h+',1]','float32 / 예, 미래 시간, 목표'],['한 단계 API에서 y','['+r.count+'] (H=1일 때)','같은 예의 바로 다음 날짜만 선택']]);
        return {html,explanation:r.count?'L 또는 H가 커지면 가능한 시작 위치가 줄어듭니다. 경계를 넘는 라벨을 훈련에 넣지 않으며, 겹치는 창의 무작위 분할도 피합니다.':'L+H가 훈련 관측 수보다 커서 훈련 창은 0개입니다. 빈 배열을 유효한 학습 배치로 취급하지 않습니다.',metrics:[['훈련 창',String(r.count)],['전체 유효 창',String(r.rows.length)],['평가 창',String(r.evaluation.length)],['경계 혼합 제외',String(r.rows.filter(w=>w.kind==='crossing').length)]]};
      },
      question:{prompt:'관측이 정확히 L+H개이면 유효한 창은 몇 개인가요?',options:['1개','0개','H개'],answer:0,explanation:'시작 위치 0 하나가 마지막 라벨까지 정확히 포함합니다. 반복 범위에 +1이 필요합니다.'}
    },
    'data-scaler': {
      title:'훈련 눈금으로 평가값을 옮깁니다',intro:'훈련 최솟값 10, 최댓값 20이면 24는 1.4입니다. 전체 8일에 fit한 누수 예와 상수 열을 비교하고, 원 단위로 돌려 오차를 확인합니다.',
      defaults:{fit:'train',data:'normal',value:24},controls:[select('fit','스케일 fit 구간',[['train','훈련 1~6일'],['all','전체 1~8일 (누수 예)']]),select('data','훈련 열',[['normal','10,12,14,16,18,20'],['constant','전부 10 (상수 열)']]),range('value','평가 7일 실제 판매량 (개)',0,30,1)],
      steps:[{title:'fit',text:'눈금 기준은 어느 관측에서 얻었나요?'},{title:'transform',text:'훈련 밖의 값도 같은 눈금으로 옮깁니다.'},{title:'오차와 역변환',text:'눈금 오차와 원 단위 오차를 비교합니다.'}],
      compute(p,s) {
        const r=scaling(p),st=stage(s,3);
        let html=table(['통계','현재 fit','훈련만 fit 기준'],[['읽은 날짜',r.fit==='train'?'1~6일':'1~8일: 미래 평가 정보 포함','1~6일'],['최소',r.min,10],['최대',r.max,r.constant?10:20],['나눌 값',r.denominator,r.constant?1:10]]);
        if(st>=1) html+=eq('z=(x−'+r.min+')/'+r.denominator+'; x='+r.value+' → z='+fmt(r.transformed))+table(['날짜','원 판매량 (개)','같은 눈금의 z','용도'],r.values.map((v,i)=>[i+1,v,fmt(r.scaled[i]),i<6?'훈련':'평가 관측']))+note('7일 실제값을 바꿔도 훈련만 fit한 통계는 그대로입니다. 전체 fit에서는 평가값이 최소·최대까지 바꾸므로 미래 정보가 눈금에 들어갑니다.');
        if(st>=2) html+=table(['지표','현재 눈금에서 계산','원 단위에서 계산'],[['실제값',vector([r.value,25].map(x=>(x-r.min)/r.denominator)),vector([r.value,25])],['예측값',vector([22,24].map(x=>(x-r.min)/r.denominator)),vector([22,24])],['MAE',fmt(r.scaledError.mae),fmt(r.rawError.mae)+'개'],['RMSE',fmt(r.scaledError.rmse),fmt(r.rawError.rmse)+'개'],['MAPE',r.scaledError.mape===null?'0 분모: 정의 안 함':fmt(100*r.scaledError.mape)+'%',r.rawError.mape===null?'0 실제값: 정의 안 함':fmt(100*r.rawError.mape)+'%']])+eq('inverse_transform(z) = z×'+r.denominator+'+'+r.min+'; '+fmt(r.transformed)+' → '+fmt(r.restored)+'개');
        return {html,explanation:(r.fit==='all'?'전체 fit은 평가의 미래 최소·최대 정보를 미리 사용한 누수 예입니다. ':'훈련 fit 이후 평가에서도 눈금을 고정합니다. ')+(r.span===0?'상수 열은 sklearn MinMaxScaler(feature_range=(0,1)) 방식으로 0인 범위 대신 1을 사용합니다. 훈련값은 0, 다른 평가값은 x−10이며 [0,1] 밖도 허용됩니다. ':'평가의 1 초과 값은 오류나 확률이 아닙니다. ')+(st>=2?'MAE·RMSE는 눈금 폭에 비례하지만 최소값을 빼는 변환 뒤의 MAPE는 같은 비율로 복원되지 않습니다.':''),metrics:[['fit 최솟값',String(r.min)],['fit 최댓값',String(r.max)],['평가 z',fmt(r.transformed)],['원 단위 복원 (개)',fmt(r.restored)]]};
      },question:{prompt:'훈련 10~20으로 fit한 뒤 24가 1.4가 되면?',options:['같은 눈금의 정상적인 외삽이다','평가에서 다시 fit해야 한다','반드시 1로 잘라야 한다'],answer:0,explanation:'훈련 때보다 큰 값입니다. 재fit은 눈금을 바꾸며, clip은 별도로 정할 정책입니다. 이 실험은 clip=False입니다.'}
    },
    'data-forecast': {
      title:'실제값을 받는 날이 달라지면 예측도 달라집니다',intro:'6일의 마지막 값 20에서 “마지막 값+증가량”을 계산합니다. 8일 예측 직전에 실제 24를 받는 반복 평가와 7일 예측을 재사용하는 고정 기준일 평가를 비교합니다.',
      defaults:{mode:'fixed',delta:2,observed:24},controls:[select('mode','현재 정보 조건',[['fixed','6일 기준 고정 시점'],['rolling','실제값 도착 후 반복 한 단계']]),range('delta','한 단계 증가량 (개)',-2,6,1),range('observed','7일 실제 판매량 (개)',18,28,1)],
      steps:[{title:'공통 시작',text:'6일까지 같은 입력을 읽습니다.'},{title:'다음 입력',text:'7일 실제값과 예측 중 무엇을 넣나요?'},{title:'8일 예측',text:'정보의 차이가 출력으로 이어집니다.'},{title:'평가',text:'같은 MAE도 서로 다른 과제일 수 있습니다.'}],
      compute(p,s) {
        const r=forecast(p),st=stage(s,4),second=r.chosen[1],feed=r.mode==='fixed'?r.first:r.observed;
        let body=txt(20,26,'6일 기준: X=[16,18,20] · 단위 개')+box(28,55,165,46,'마지막 관측 20',C.input)+line(196,78,250,78,C.input)+box(254,55,180,46,'7일 예측 '+fmt(r.first),C.target);
        if(st>=1) body+=line(345,104,345,145,r.mode==='fixed'?C.target:C.valid)+box(222,147,260,46,(r.mode==='fixed'?'예측 재사용 ':'도착한 실제값 ')+fmt(feed),r.mode==='fixed'?C.target:C.valid)+txt(20,226,'8일 입력: '+vector([18,20,feed]));
        if(st>=2) body+=line(484,170,525,170,C.target)+box(530,147,162,46,'8일 예측 '+fmt(second),C.target);
        let html=svg('예측과 다음 입력의 정보 흐름',252,body);
        if(st>=2) html+=table(['평가 조건','7일 예측','8일 계산 입력 끝','8일 예측'],[['고정 기준일',fmt(r.fixed[0]),fmt(r.first)+' (예측)',fmt(r.fixed[1])],['반복 한 단계',fmt(r.rolling[0]),fmt(r.observed)+' (관측 도착)',fmt(r.rolling[1])]]);
        if(st>=3) html+=table(['조건','실제 7·8일','예측−실제 오차','MAE (개)'],[['고정 기준일',vector(r.actual),vector(r.fixedError.rows.map(x=>x.error)),fmt(r.fixedError.mae)],['반복 한 단계',vector(r.actual),vector(r.rollingError.rows.map(x=>x.error)),fmt(r.rollingError.mae)]]);
        return {html,explanation:r.mode==='fixed'?'7일 실제값을 바꾸어도 6일 기준의 두 예측은 바뀌지 않습니다. 고정 시점에는 아직 그 값을 모릅니다. 실제값은 평가 오차만 바꿉니다.':'7일 실제값을 바꾸면 8일 예측도 같은 폭으로 바뀝니다. 관측이 도착한 뒤의 새 기준일이기 때문입니다. 고정 기준일 예측과 성능을 비교할 때 정보 조건을 맞춥니다.',metrics:[['현재 7일 예측 (개)',fmt(r.chosen[0])],['현재 8일 예측 (개)',st>=2?fmt(second):'다음 단계'],['고정 시점 MAE',st>=3?fmt(r.fixedError.mae):'평가 단계'],['반복 한 단계 MAE',st>=3?fmt(r.rollingError.mae):'평가 단계']]};
      },question:{prompt:'6일 기준으로 7·8일을 예측할 때 7일 실제값은?',options:['8일 입력으로 쓸 수 없다','언제나 써도 된다','MAPE 계산에만 쓰면 누수다'],answer:0,explanation:'정답은 나중에 평가할 때 쓸 수 있지만 6일 기준 예측 입력에는 들어갈 수 없습니다.'}
    },
    'data-state': {
      title:'관측을 읽는 시간축과 상태 전달을 분리합니다',intro:'본문 판매량 10,12,14를 훈련 눈금의 0,0.2,0.4로 옮겨 스칼라 RNN hₜ=tanh(wₓxₜ+wₕhₜ₋₁)을 직접 계산합니다. 고정 교육용 가중치이며 실제 학습 모델의 출력이 아닙니다.',
      defaults:{inputWeight:1,stateWeight:0.5},controls:[range('inputWeight','입력 가중치 wₓ',0,2,0.1),range('stateWeight','이전 상태 가중치 wₕ',-1,1,0.1)],
      steps:[{title:'1일',text:'h₀=0에서 시작합니다.'},{title:'2일',text:'새 관측과 이전 은닉 상태를 더합니다.'},{title:'3일',text:'같은 가중치를 시간축에서 공유합니다.'},{title:'정답 연결',text:'최종 상태를 다음 날짜 정답과 비교합니다.'}],
      compute(p,s) {
        const r=state(p),st=stage(s,4),visible=r.rows.slice(0,Math.min(st+1,3));
        let body=txt(20,26,'은닉 상태 h: 단위 없는 모델 내부 값 · h₀=0');
        visible.forEach((row,i)=>{const x=36+i*232;body+=box(x,59,190,44,'x'+row.day+'='+fmt(row.x),C.input)+line(x+95,105,x+95,137,C.input)+box(x,141,190,48,'h'+row.day+'='+fmt(row.h),C.target);if(i>0)body+=line(x-40,166,x-5,166,C.valid);});
        if(st>=3) body+=line(595,191,595,230,C.target)+line(595,230,360,230,C.target)+box(154,246,412,48,'마지막 h₃ → ŷ='+fmt(r.pred)+' / MSE='+fmt(r.loss),C.target)+txt(20,324,'정답은 다음 날 16개를 옮긴 y=0.6 · 예측과 같은 축에서 비교');
        let html=svg('시점별 관측과 은닉 상태, 마지막 단계의 출력·정답 연결',st>=3?345:218,body)+table(['시점','xₜ','hₜ₋₁','wₓxₜ+wₕhₜ₋₁','tanh → hₜ'],visible.map(row=>[row.day,fmt(row.x),fmt(row.before),fmt(row.a),fmt(row.h)]));
        if(st>=3) html+=eq('교육용 출력층 ŷ=h₃='+fmt(r.pred)+'; 다음 날 16개 → y=0.6; MSE=(ŷ−0.6)²='+fmt(r.loss))+table(['실습 Tensor','축'],[['X [B,L,F] → output [B,L,D]','예·시간·특성 → 예·시간·은닉'],['h_n [layers,B,D]','층·예·은닉: batch_first=True여도 이 순서'],['Linear(output)[:,−1,0] → [B]','마지막 과거 시점의 출력을 같은 예의 다음 날 y와 연결']]);
        return {html,explanation:'x는 해당 날짜 관측이고 h는 과거를 요약한 내부 기억입니다. 상태를 다음 셀에 넘기는 것과 예측한 판매량을 다음 입력으로 쓰는 것은 다른 경로입니다. wₕ를 바꾸면 이전 시점의 영향이 달라지지만 원본 관측 날짜는 바뀌지 않습니다.',metrics:[['표시한 시점',String(visible.length)],['현재 상태',fmt(visible[visible.length-1].h)],['최종 예측',st>=3?fmt(r.pred):'마지막 단계'],['MSE (눈금²)',st>=3?fmt(r.loss):'마지막 단계']]};
      },question:{prompt:'RNN의 hₜ₋₁은 무엇인가요?',options:['직전까지 읽은 기록의 내부 요약','반드시 직전 판매량 예측과 같다','다음 날 실제 정답이다'],answer:0,explanation:'은닉 상태는 입력과 함께 갱신되는 모델 내부 표현입니다. 판매량 출력과 동일할 필요가 없습니다.'}
    },
    'data-memory': {
      title:'LSTM 기억에서 남기는 양과 더하는 양을 계산합니다',intro:'본문의 이전 셀 상태 2, 망각 0.8, 새 후보 0.4, 입력 0.5를 사용합니다. 게이트는 실제 모델에서 학습된 입력과 이전 상태로 정해지며, 여기서는 효과를 분리해 조절합니다.',
      defaults:{forget:0.8,inputGate:0.5,candidate:0.4,outputGate:0.75},controls:[range('forget','망각 게이트 f',0,1,0.1),range('inputGate','입력 게이트 i',0,1,0.1),range('candidate','새 후보 g',-1,1,0.1),range('outputGate','출력 게이트 o',0,1,0.05)],
      steps:[{title:'이전 기억',text:'셀 상태와 은닉 상태를 구분합니다.'},{title:'유지',text:'망각 게이트는 과거 기억에만 곱합니다.'},{title:'새 정보 추가',text:'입력 게이트로 조절한 후보를 더합니다.'},{title:'현재 은닉 상태',text:'출력 게이트로 드러낼 양을 조절합니다.'}],
      compute(p,s) {
        const r=memory(p),st=stage(s,4);
        let body=box(20,50,172,48,'이전 기억 c=2',C.input);
        if(st>=1)body+=line(194,74,246,74,C.valid)+box(250,50,200,48,'× f='+fmt(r.f)+' → '+fmt(r.kept),C.valid);
        if(st>=2)body+=line(452,74,490,74,C.valid)+box(494,50,204,48,'새 c='+fmt(r.c),C.target)+box(250,144,200,48,'i×g='+fmt(r.added),C.input)+line(452,168,595,168,C.input)+line(595,166,595,100,C.input)+txt(605,133,'＋',C.valid);
        if(st>=3)body+=line(699,74,710,74,C.target)+line(710,74,710,268,C.target)+line(710,268,700,268,C.target)+box(382,244,316,48,'o×tanh(c) → h='+fmt(r.h),C.target);
        let html=svg('LSTM 셀의 유지·추가·은닉 출력 경로',st>=3?315:220,body)+eq('이전 셀 상태 cₜ₋₁=2');
        if(st>=1) html+=eq('남기는 기억 f×cₜ₋₁='+fmt(r.f)+'×2='+fmt(r.kept));
        if(st>=2) html+=eq('추가 정보 i×g='+fmt(r.i)+'×'+fmt(r.g)+'='+fmt(r.added))+eq('새 셀 상태 cₜ='+fmt(r.kept)+'+'+fmt(r.added)+'='+fmt(r.c));
        if(st>=3) html+=eq('은닉 상태 hₜ=o×tanh(cₜ)='+fmt(r.o)+'×tanh('+fmt(r.c)+')='+fmt(r.h));
        html+=table(['계산 경로','값','현재 표시'],[['이전 셀 기억',2,'시작'],['망각 후 기억',st>=1?fmt(r.kept):'아직 계산 전','f×이전 기억'],['새 후보 기여',st>=2?fmt(r.added):'아직 계산 전','i×g'],['현재 셀 기억',st>=2?fmt(r.c):'아직 계산 전','유지+추가'],['현재 은닉 상태',st>=3?fmt(r.h):'아직 계산 전','o×tanh(c)']]);
        return {html,explanation:'f와 i의 합이 1일 필요는 없습니다. 망각 게이트는 원본 날짜를 지우지 않고 내부 셀 기억을 조절합니다. 출력 게이트를 0으로 바꾸면 h는 0이지만 c는 그대로 남습니다. LSTM은 h_n과 c_n을 각각 [layers,B,D]로 반환합니다.',metrics:[['유지한 기억',st>=1?fmt(r.kept):'유지 단계'],['추가한 정보',st>=2?fmt(r.added):'추가 단계'],['cₜ',st>=2?fmt(r.c):'추가 단계'],['hₜ',st>=3?fmt(r.h):'출력 단계']]};
      },question:{prompt:'c=1.8에서 출력 게이트를 0으로 바꾸면?',options:['h=0이고 c=1.8은 유지된다','c와 h가 모두 0이 된다','과거 원본 기록이 삭제된다'],answer:0,explanation:'출력 게이트는 o×tanh(c)를 조절하며 c 자체의 유지·추가 계산을 바꾸지 않습니다.'}
    },
    'data-ses': {
      title:'새 관측의 오차를 상태에 조금씩 반영합니다',intro:'수준 10에서 관측 12,14,16을 읽습니다. 반영률 α만 바꾸어 단순 지수평활의 갱신과 관측이 더 없는 미래를 계산합니다.',defaults:{alpha:0.5},controls:[range('alpha','오차 반영률 α',0,1,0.05)],
      steps:[{title:'관측 12',text:'첫 오차의 어느 정도를 반영하나요?'},{title:'관측 14',text:'이전 수준을 다시 사용합니다.'},{title:'관측 16',text:'고정 반영률로 반복 갱신합니다.'},{title:'미래 예측',text:'추세·계절과 새 관측이 없으면 무엇을 내나요?'}],
      compute(p,s) {
        const r=ses(p),st=stage(s,4),rows=r.rows.slice(0,Math.min(3,st+1));
        const xpos=i=>64+i*120,ypos=v=>228-(v-8)*16;
        let body=line(50,228,686,228)+line(50,52,50,228)+txt(20,28,'판매량·수준 (개), 고정 세로축 8~19');
        [8,10,12,14,16,18].forEach(v=>body+=txt(40,ypos(v)+5,v,C.rule,'end'));
        const levels=[[0,10],...rows.map((x,i)=>[i+1,x.level])];
        body+='<polyline points="'+levels.map(([i,v])=>xpos(i)+','+ypos(v)).join(' ')+'" fill="none" stroke="'+C.valid+'" stroke-width="3"/>';
        rows.forEach((x,i)=>{const xx=xpos(i+1);body+='<circle cx="'+xx+'" cy="'+ypos(x.y)+'" r="6" fill="'+C.input+'"/>'+txt(xx,ypos(x.y)-12,'관측 '+x.y,C.input,'middle')+'<circle cx="'+xx+'" cy="'+ypos(x.level)+'" r="5" fill="'+C.valid+'"/>'+txt(xx,ypos(x.level)+23,'수준 '+fmt(x.level),C.valid,'middle')+txt(xx,264,(i+1)+'일','currentColor','middle');});
        if(st>=3)body+='<polyline points="'+[[3,r.level],[4,r.level],[5,r.level]].map(([i,v])=>xpos(i)+','+ypos(v)).join(' ')+'" fill="none" stroke="'+C.target+'" stroke-width="3" stroke-dasharray="7 5"/>'+txt(xpos(4),ypos(r.level)-12,'예측 '+fmt(r.level),C.target,'middle')+txt(xpos(4),264,'미래 1일',C.target,'middle')+txt(xpos(5),264,'미래 2일',C.target,'middle');
        let html=svg('새 관측별 수준 갱신과 새 관측 없는 미래의 일정한 예측',285,body)+eq('수준ₜ=수준ₜ₋₁+α(관측ₜ−수준ₜ₋₁), 초기 수준=10개')+table(['관측 순번','관측 (개)','이전 수준','관측−수준','반영량','새 수준'],rows.map(x=>[x.day,x.y,fmt(x.before),fmt(x.error),fmt(x.update),fmt(x.level)]));
        if(st>=3) html+=table(['관측 이후 미래','1단계','2단계','조건'],[['단순 지수평활 예측',fmt(r.level),fmt(r.level),'새 관측·추세·계절 없음']]);
        return {html,explanation:r.alpha===0?'α=0이면 모든 오차의 반영량이 0이라 초기 수준 10이 유지됩니다.':r.alpha===1?'α=1이면 매번 마지막 실제 관측을 그대로 새 수준으로 사용합니다.':'α가 커지면 최근 관측을 더 빠르게 따라가지만 일시 급등에도 민감해집니다. ETS는 추세·계절까지 표현하는 더 넓은 계열이며 이 계산은 수준만 사용합니다.',metrics:[['α',fmt(r.alpha)],['현재 수준 (개)',fmt(rows[rows.length-1].level)],['마지막 수준 (개)',st>=2?fmt(r.level):'관측 16 단계']]};
      },question:{prompt:'α=0.5의 마지막 수준은?',options:['14.25','16','10'],answer:0,explanation:'10→11→12.5→14.25로 갱신합니다. 새 관측이 없으면 이후에도 14.25를 예측합니다.'}
    },
    'data-score': {
      title:'같은 두 임베딩을 내적과 신경망으로 결합합니다',intro:'본문 u=[1,2], v=[0.5,1.5]의 내적은 3.5입니다. 비교용 2차원 NCF는 모든 고정 가중치를 공개해 concat·ReLU·출력·정답의 연결을 직접 계산합니다.',
      defaults:{model:'mf',userSecond:2,itemSecond:1.5,target:3.5,label:'known'},controls:[select('model','점수 결합',[['mf','MF / UV 내적'],['ncf','NCF 고정 2차원 계산']]),range('userSecond','사용자 두 번째 성분',-2,3,0.5),range('itemSecond','영화 두 번째 성분',-2,3,0.5),range('target','관측 평점 (점)',0.5,5,0.5),select('label','이 칸의 정답',[['known','관측했고 학습에 배정됨'],['missing','미관측: 정답 없음']])],
      steps:[{title:'벡터 조회',text:'ID는 벡터를 찾는 번호입니다.'},{title:'결합',text:'내적과 concat은 무엇이 다른가요?'},{title:'점수',text:'선형·활성화 계산을 끝냅니다.'},{title:'정답과 손실',text:'관측한 평점만 정답으로 사용합니다.'}],
      compute(p,s) {
        const r=score(p),st=stage(s,4);let html=table(['조회한 표현','벡터'],[['사용자 u',vector(r.u)],['영화 v',vector(r.v)]]);
        if(st>=1) html+=r.model==='mf'?table(['성분','u','v','u×v'],r.u.map((x,i)=>[i+1,fmt(x),fmt(r.v[i]),fmt(r.products[i])])):eq('concat(u,v)='+vector(r.joined))+table(['고정 교육용 가중치','값'],[['W₁ 행 1 / 행 2','[1,0,1,0] / [0,1,0,1]'],['b₁','[0,0]'],['W₂ / b₂','[1,0.5] / −0.25']]);
        if(st>=2) html+=r.model==='mf'?eq('점수 = Σ uⱼvⱼ = '+fmt(r.mf)):table(['NCF 계산','실제 값'],[['W₁concat+b₁',vector(r.pre)],['ReLU=max(0,z)',vector(r.hidden)],['[1,0.5]·hidden−0.25',fmt(r.ncf)]]);
        if(st>=3) html+=table(['예측','정답','제곱 오차'],[[fmt(r.prediction),r.observed?fmt(r.target)+'점':'미관측',r.observed?fmt(r.loss):'손실에서 제외']])+note('원본 실습 NCF는 Embedding 각각 [B,32] → cat [B,64] → Linear(64,32) → ReLU → Linear(32,1), 정답 [B,1] float32입니다. 이 표의 고정 2차원 가중치는 계산 비교용이며 학습 성능을 나타내지 않습니다.');
        return {html,explanation:r.observed?'사용자나 영화 벡터를 바꾸면 같은 ID 조합의 현재 점수와 손실이 달라집니다. MSELoss의 기울기가 임베딩과 NCF 층으로 전달됩니다. 회귀 점수는 합이 1일 필요가 없습니다.':'미관측 칸은 0점 정답이 아닙니다. 모델은 점수를 낼 수 있어도 실제 평점을 모르면 이 칸의 회귀 오차를 계산하지 않습니다.',metrics:[['MF 점수',st>=2?fmt(r.mf):'점수 단계'],['NCF 점수',st>=2?fmt(r.ncf):'점수 단계'],['현재 제곱 오차',st>=3?(r.observed?fmt(r.loss):'미관측 제외'):'정답 단계']]};
      },question:{prompt:'기본 벡터에서 MF와 고정 NCF의 점수는?',options:['3.5와 3.0','둘 다 3.5','둘 다 좋아할 확률이다'],answer:0,explanation:'MF는 1×0.5+2×1.5=3.5, NCF는 1.5+0.5×3.5−0.25=3입니다. 점수의 계산 규칙이 다릅니다.'}
    },
    'data-bpr': {
      title:'같은 사용자의 두 후보 점수 차이를 학습합니다',intro:'본문의 점수 차이 −1,0,1과 sigmoid·BPR 손실을 이어 계산합니다. 공통 이동량은 두 점수에 똑같이 더합니다. 출력은 실제 사용자 만족 확률로 해석하지 않습니다.',
      defaults:{gap:1,shift:0},controls:[range('gap','양성−비교 후보 점수 차이 Δ',-5,5,0.5),range('shift','두 점수의 공통 이동량',0,5,0.5)],
      steps:[{title:'비교 쌍',text:'관측 항목과 미관측 비교 항목을 고릅니다.'},{title:'sigmoid',text:'차이를 0과 1 사이로 옮깁니다.'},{title:'순위 손실',text:'역순과 동점의 손실을 비교합니다.'},{title:'기울기',text:'어느 점수를 올리고 내리는 방향인가요?'}],
      compute(p,s) {
        const r=bpr(p),st=stage(s,4);let html=table(['같은 사용자','현재 점수','학습 의미'],[['관측 양성 i⁺',fmt(r.positive),'훈련 기록'],['미관측 비교 i⁻',fmt(r.negative),'실제 비선호로 확정한 항목 아님']])+eq('Δ=s⁺−s⁻='+fmt(r.positive)+'−'+fmt(r.negative)+'='+fmt(r.gap));
        if(st>=1) html+=eq('sigmoid(Δ)=1/(1+exp(−Δ))='+fmt(r.probability));
        if(st>=2) html+=eq('BPR 순위 손실=−log(sigmoid(Δ))='+fmt(r.loss))+note('이 표는 쌍 하나의 순위 항입니다. 원본 NGCF bpr_loss의 L2 정규화 항은 포함하지 않으므로 전체 학습 손실과 구분합니다.');
        if(st>=3) html+=table(['국소 기울기','값','경사하강 방향'],[['∂L/∂s⁺',fmt(r.dPositive),'양성 점수 올리기'],['∂L/∂s⁻',fmt(r.dNegative),'비교 점수 내리기']]);
        return {html,explanation:'두 점수에 같은 수를 더하면 Δ·sigmoid·순위 손실은 그대로입니다. Δ=0인 동점에서는 sigmoid=0.5, 손실=log(2)입니다. 훈련에서 관측한 항목을 음성으로 뽑지 않도록 제외하며, 추천 시 이미 본 항목 제외는 별도의 후보 정책입니다.',metrics:[['점수 차이',fmt(r.gap)],['sigmoid',st>=1?fmt(r.probability):'다음 단계'],['쌍별 순위 손실',st>=2?fmt(r.loss):'손실 단계']]};
      },question:{prompt:'양성·비교 점수를 둘 다 3만큼 올리면 순위 항은?',options:['변하지 않는다','3만큼 줄어든다','sigmoid가 반드시 1이 된다'],answer:0,explanation:'차이는 (s⁺+3)−(s⁻+3)=s⁺−s⁻로 동일합니다. 정규화 항까지 포함한 전체 손실의 불변성을 주장하는 것은 아닙니다.'}
    },
    'data-graph': {
      title:'차수와 양방향 메시지를 계산한 뒤 동시에 갱신합니다',intro:'본문의 u0=2,u1=1,i0=3,i1=4와 간선 3개를 사용합니다. i2=5는 고립 노드 검사용입니다. NGCF·GCN과 단순화 비교용 LightGCN의 정규화·자기 항·층 결합을 나눕니다.',
      defaults:{mode:'ngcf',depth:1,interaction:1},controls:[select('mode','전파 규칙',[['ngcf','NGCF: 자기 항+상호작용'],['gcn','GCN: 자기 루프 포함 차수'],['lightgcn','LightGCN: 비교 확장']]),range('depth','전파 층 수 K',1,3,1),range('interaction','NGCF 성분곱 가중치 W₂',0,2,0.25)],
      steps:[{title:'훈련 그래프와 차수',text:'자기 루프를 차수에 넣는 모델은 무엇인가요?'},{title:'양방향 메시지',text:'비중이 같아도 보내는 값이 다릅니다.'},{title:'동기식 집계',text:'모든 노드는 직전 층을 읽습니다.'},{title:'최종 표현과 점수',text:'층 결과를 결합해 미관측 u0–i1 점수를 계산합니다.'}],
      compute(p,s) {
        const r=graph(p),st=stage(s,4),first=r.records[0],positions=[[84,70],[84,185],[406,70],[406,185],[620,185]];
        const shownLayer=st>=3?r.depth:st>=2?1:0;
        let body=txt(18,26,'사용자 ↔ 영화 · '+(st>=3?'최종 표현 결합':st>=2?'1층 집계 결과':st>=1?'첫 층 양방향 메시지':'초기 임베딩'));
        r.edges.forEach(([a,b])=>body+=line(positions[a][0]+30,positions[a][1],positions[b][0]-30,positions[b][1],st>=1?C.valid:C.rule));
        r.nodes.forEach((n,i)=>{const [x,y]=positions[i],label=st>=3?(r.mode==='ngcf'?'마지막 층 ':'최종 값 ')+fmt(r.mode==='ngcf'?r.layers[r.depth][i]:r.representations[i][0]):(st>=2?'1층 값 ':'초기 값 ')+fmt(r.layers[shownLayer][i]);body+='<circle cx="'+x+'" cy="'+y+'" r="28" fill="'+C.paper+'" stroke="'+(i<2?C.input:C.target)+'" stroke-width="2"/>'+txt(x,y+5,n,i<2?C.input:C.target,'middle')+txt(x,y+53,label,'currentColor','middle');});
        if(st===1)body+=txt(240,51,'i0→u0: '+fmt(first.messages[0].toA),C.valid,'middle')+txt(240,107,'u0→i0: '+fmt(first.messages[0].toB),C.valid,'middle');
        body+=txt(617,275,'i2: 간선 0개',C.warning,'middle');
        if(st>=3)body+=txt(20,313,'미관측 u0–i1의 최종 내적 점수 = '+fmt(r.finalScore),C.target);
        let html=svg('현재 단계의 임베딩·양방향 메시지·최종 추천 점수',st>=3?338:300,body)+table(['노드','원래 차수 d','현재 정규화 차수','시작할 때의 0층 값'],r.nodes.map((n,i)=>[n,r.degree[i],r.degree[i]+(r.mode==='gcn'?1:0),r.initial[i]]));
        if(st>=1) html+=eq(r.mode==='ngcf'?'m(v→u)=(hᵥ+W₂hᵥhᵤ)/√(dᵥdᵤ); 자기 항=hᵤ, W₁=1':r.mode==='gcn'?'m(v→u)=hᵥ/√((dᵥ+1)(dᵤ+1)); 자기 항=hᵤ/(dᵤ+1), W=1':'m(v→u)=hᵥ/√(dᵥdᵤ); 자기 항·변환·활성화 없음')+table(['첫 층 간선','동일 정규화 비중','상호작용 항','영화→사용자','사용자→영화'],first.messages.map(m=>[r.nodes[m.a]+' ↔ '+r.nodes[m.b],fmt(m.norm),fmt(m.interaction),fmt(m.toA),fmt(m.toB)]));
        if(st>=2) html+=table(['노드','초기 0층',...Array.from({length:r.depth},(_,i)=>(i+1)+'층')],r.nodes.map((n,i)=>[n,...r.layers.map(l=>fmt(l[i]))]))+note('각 층은 직전 층 배열을 고정해 읽고, 양방향 메시지를 별도 출력에 합칩니다. NGCF는 합계에 LeakyReLU(negative_slope=0.2)를 적용합니다. 현재 양수 예에서는 값이 유지됩니다.');
        if(st>=3) html+=table(['노드','최종 표현 규칙','실제 최종 표현'],r.nodes.map((n,i)=>[n,r.mode==='ngcf'?'0~K층 concat':r.mode==='lightgcn'?'0~K층 균등 평균':'K층만 사용',vector(r.representations[i])]))+eq('미관측 u0–i1 점수 = 최종 u0 · 최종 i1 = '+fmt(r.finalScore))+note('훈련 간선만 전파에 넣습니다. 이 고정 예제의 전파 자체는 학습이 아니며, 학습 시에는 내적→BPR→초기 Embedding과 NGCF W₁/W₂로 기울기가 흐릅니다.')+table(['원본 NGCF 실습 Library','Tensor / 역할'],[['pandas.read_csv → ID map','사용자·영화를 각각 연속 ID로; 영화 전역 ID=movieId+num_users'],['create_edge_index → train_test_split','long [2,E], 관측 간선 각 1회 저장; 80/10/10 분할, 전파는 train만'],['원본 rating_threshold=1.0','평점 1 이상을 간선으로 처리. NCF 평가의 관련성 3.5와 다른 정책'],['nn.Embedding / nn.ModuleList / nn.Linear','초기 [U+I,d₀]와 층별 W₁/W₂를 학습 파라미터로 등록'],['index_add_ / unsqueeze(1)','양 끝 차수, 양방향 메시지 합; 출력 버퍼 [U+I,d_out]'],['torch.cat(layer_outputs,dim=−1)','초기·각 층 [U+I,d_l] → [U+I,Σd_l], 사용자/항목 분리'],['내적 / F.logsigmoid / Adam','[B] 양·음 점수 → BPR+L2 → zero_grad/backward/step'],['model.eval() / torch.no_grad() / torch.topk','훈련 그래프의 표현으로 후보 평가; 동점·본 항목·K 부족 정책 별도'],['torch_geometric.data.download_url/extract_zip','원본 MovieLens 다운로드 편의 함수. 여기서는 호출 없이 고정 숫자로 계산']]);
        return {html,explanation:(r.mode==='ngcf'?'원래 차수로 양방향 메시지를 조절하고 자기 항은 한 번만 더합니다. W₂를 0으로 해도 자기 항과 층 concat이 남으므로 LightGCN과 같지 않습니다. ':r.mode==='gcn'?'계산용 자기 루프를 추가한 차수로 이웃과 자기 항 모두 정규화합니다. 실제 사용자–사용자 상호작용을 추가한 것이 아닙니다. ':'LightGCN은 본문 필수 NGCF와 구분한 비교 확장입니다. 자기 루프·W 변환·비선형을 빼고 0~K층을 평균합니다. ')+(r.mode==='lightgcn'?'고립 i2의 다음 층은 0, 최종 평균은 5/(K+1)입니다.':'고립 i2는 이웃 합 0에 자기 정보 5만 유지합니다.')+' 존재하는 간선의 양 끝 차수는 양수이므로 0으로 나누지 않습니다.',metrics:[['u0 첫 층',st>=2?fmt(r.layers[1][0]):'집계 단계'],['i0→u0 첫 메시지',st>=1?fmt(first.messages[0].toA):'메시지 단계'],['u0→i0 첫 메시지',st>=1?fmt(first.messages[0].toB):'메시지 단계'],['u0·i1 최종 점수',st>=3?fmt(r.finalScore):'결합 단계']]};
      },question:{prompt:'NGCF 기본값에서 i0→u0 메시지와 갱신값은?',options:['9/√2와 2+9/√2','둘 다 3/√2','GCN과 항상 같다'],answer:0,explanation:'이웃 값 3+성분곱 3×2=9를 √(1×2)로 나누고 자기 값 2를 더합니다. 반대 방향은 (2+6)/√2입니다.'}
    },
    'data-ranking': {
      title:'후보·정답·분모를 공개하고 추천 지표를 계산합니다',intro:'본문의 정답 A·C·D와 상위 [B,A,E]에서 시작합니다. 후보 밖 정답도 전체 정답 분모에 남기며, K 부족·동점·정답 없음 정책을 직접 비교합니다.',
      defaults:{order:'BAE',candidates:'all',k:3,truth:'three',precision:'fixed',ideal:'global'},
      controls:[select('order','고정 점수의 순위',[['BAE','B,A,E,C,D'],['ABE','A,B,E,C,D'],['BEA','B,E,A,C,D'],['tie','전체 동점: ID 오름차순']]),select('candidates','후보 집합',[['all','A~E: 훈련에서 본 F 제외'],['short','A,B만: 후보 부족'],['seen','A~F: 이미 본 F 포함'],['empty','후보 없음']]),range('k','요청한 상위 K',1,8,1),select('truth','전체 평가 정답',[['three','A,C,D'],['four','A,C,D,G (G는 후보 밖)'],['none','정답 없음']]),select('precision','Precision 분모 정책',[['fixed','요청 K (본문 기본)'],['returned','실제 반환 수 min(K,후보 수)']]),select('ideal','IDCG의 이상적 정답 범위',[['global','전체 정답 (본문 기본)'],['candidate','후보 안 정답만 (조건부 비교)']])],
      steps:[{title:'평가 계약',text:'어떤 후보와 정답을 비교하나요?'},{title:'Top-K 적중',text:'분모 K와 반환 수를 구분합니다.'},{title:'순위 할인',text:'적중한 위치에 따라 DCG가 달라집니다.'},{title:'정규화',text:'정답 범위로 IDCG를 계산해 나눕니다.'}],
      compute(p,s) {
        const r=ranking(p),st=stage(s,4);
        let html=table(['고정해야 할 조건','현재 값'],[['후보',r.candidates.join(', ')||'없음'],['전체 평가 정답',r.relevant.join(', ')||'없음'],['후보 안 정답 수 / 전체 정답 수',r.reachable+' / '+r.relevant.length],['정렬','점수 내림차순, 동점은 ID 오름차순'],['요청 K / 실제 반환 수',r.k+' / '+r.returned]])+note('점수는 정답을 보기 전에 정한 고정 교육용 값입니다. 이미 본 F가 후보에 있으면 점수 6으로 선두를 차지합니다. 후보에서 F를 빼는 변화는 모델 개선과 구분합니다.');
        if(st>=1) html+=table(['순위','항목','고정 점수','평가 관련성',...(st>=2?['1/log₂(순위+1) 기여']:[])],r.rows.map(x=>[x.rank,x.id,fmt(x.score),x.relevant?'1 적중':'0',...(st>=2?[fmt(x.gain)]:[])]))+eq('Precision: '+(r.precisionDenominator?r.hits+'/'+r.precisionDenominator+' = '+fmt(r.precision):'반환 수 0: 규칙상 0')+'; Recall: '+(r.relevant.length?r.hits+'/'+r.relevant.length+' = '+fmt(r.recall):'정답 수 0: 규칙상 0'));
        if(st>=2) html+=eq('DCG = Σ 관련성/log₂(순위+1) = '+fmt(r.dcg));
        if(st>=3) html+=table(['IDCG 항목','값'],[['정답 범위',r.idealPolicy==='global'?'전체 정답 수 '+r.relevant.length:'후보 안 정답 수 '+r.reachable],['이상적인 적중 위치 수 min(정답 수,K)',r.idealCount],['IDCG',fmt(r.idcg)],['NDCG=DCG/IDCG',r.idcg?fmt(r.ndcg):'IDCG=0: 규칙상 0']])+note('전체 정답 기준 IDCG를 유지한 채 일부 정답을 후보에서 제외하면 NDCG=1에 도달할 수 없을 수 있습니다. 후보 안 정답 IDCG는 다른 조건부 지표이므로 정책을 맞춰 비교합니다. Recall은 두 경우 모두 전체 정답 수가 분모입니다.');
        return {html,explanation:'이 실험은 이진 관련성, 사용자 한 명 기준입니다. 0인 분모의 지표는 0으로 정하고 정답 없는 사용자도 평균에 0으로 포함하는 정책입니다. 후보가 부족하면 Precision은 선택한 분모를 따릅니다. 여러 사용자는 같은 정책에서 사용자별 지표를 macro 평균합니다. '+(r.order==='tie'?'동점은 ID 오름차순으로 재현되며 정답 여부로 동점을 깨지 않습니다.':''),metrics:[['Precision@'+r.k,st>=1?fmt(r.precision):'적중 단계'],['Recall@'+r.k,st>=1?fmt(r.recall):'적중 단계'],['DCG',st>=2?fmt(r.dcg):'할인 단계'],['NDCG@'+r.k,st>=3?fmt(r.ndcg):'정규화 단계']]};
      },question:{prompt:'[B,A,E]를 [A,B,E]로 바꾸면?',options:['Precision·Recall은 같고 NDCG는 커진다','세 지표가 모두 같다','Recall만 커진다'],answer:0,explanation:'적중 수 1은 그대로입니다. A의 DCG 기여가 1/log₂3에서 1로 커지므로 NDCG는 약 0.296에서 0.469로 올라갑니다.'}
    },
    'data-errors': {
      title:'정답과 같은 위치에서 오차를 모읍니다',intro:'본문의 판매량 실제 [16,18]·예측 [14,19] 또는 평점 실제 [3.5,5]·예측 [3,4]를 사용합니다. 첫 예측을 바꾸어 단위·제곱·비율의 차이를 확인합니다.',defaults:{kind:'forecast',offset:0},controls:[select('kind','평가 예제',[['forecast','판매량 (개)'],['rating','소수 평점 (점)'],['zero','실제 0을 포함한 경계 예']]),range('offset','첫 예측에 더할 값',-5,5,0.5)],
      steps:[{title:'같은 위치',text:'예·날짜·목표가 대응하나요?'},{title:'절대·제곱 오차',text:'부호 상쇄를 피해서 모읍니다.'},{title:'평균과 단위',text:'MSE와 RMSE를 구분합니다.'},{title:'비율과 조건',text:'실제값이 0이면 어떻게 처리하나요?'}],
      compute(p,s) {
        const r=errorExample(p),st=stage(s,4);let html=table(['같은 예/날짜','정답 ('+r.unit+')','예측 ('+r.unit+')',...(st>=1?['예측−정답','절대 오차','제곱 오차']:[])],r.rows.map((x,i)=>[i+1,fmt(x.y),fmt(x.pred),...(st>=1?[fmt(x.error),fmt(Math.abs(x.error)),fmt(x.error*x.error)]:[])]));
        if(st>=2) html+=table(['지표','계산 결과','단위'],[['MAE',fmt(r.mae),r.unit],['MSE',fmt(r.mse),r.unit+'²'],['RMSE=√MSE',fmt(r.rmse),r.unit]])+note('nn.MSELoss(reduction="mean")는 모든 대응 원소를 평균합니다. 여러 배치에서는 제곱 오차 합/전체 원소 수로 집계해야 마지막 작은 배치를 같은 비중으로 세지 않습니다. 다단계는 전체 평균과 예측 거리별 오차를 함께 확인합니다.');
        if(st>=3) html+=table(['MAPE 항','|예측−정답|/|정답|'],r.rows.map((x,i)=>[i+1,x.y===0?'0 분모: 정의되지 않음':fmt(Math.abs(x.error/x.y))]))+eq('MAPE 비율 = '+fmt(r.mape)+(r.mape===null?' (0 실제값이 있어 이 예 전체는 정의 안 함)':' ; 백분율 = '+fmt(r.mape*100)+'%'))+note('sklearn.metrics.mean_squared_error(y_true,y_pred)는 MSE, np.sqrt(...)는 RMSE입니다. mean_absolute_percentage_error는 백분율이 아닌 비율을 반환하며 0인 실제값에는 epsilon으로 매우 큰 유한값을 낼 수 있습니다. 여기서는 수학적 해석을 위해 0 분모를 명시하고 임의로 표본을 버리지 않습니다.');
        return {html,explanation:r.kind==='rating'?'소수 평점을 float32로 보존해야 합니다. 3.5를 long으로 바꾼 다음 float32로 되돌려도 3.5가 복원되지 않습니다. 평점 오차가 낮다는 사실만으로 추천 상위 순위가 좋다고 결론 내리지 않습니다.':'표시한 예측과 정답은 같은 날짜끼리 맞춥니다. MSE는 부호를 상쇄하지 않으며 큰 오차에 민감합니다. MAPE를 원 단위로 보고하려면 스케일된 예측과 정답을 모두 inverse_transform한 뒤 계산합니다.',metrics:[['MAE',st>=2?fmt(r.mae):'평균 단계'],['MSE',st>=2?fmt(r.mse):'평균 단계'],['RMSE',st>=2?fmt(r.rmse):'평균 단계'],['MAPE (%)',st>=3?(r.mape===null?'0 분모: 정의 안 함':fmt(100*r.mape)):'비율 단계']]};
      },question:{prompt:'sklearn mean_absolute_percentage_error가 0.09를 반환하면?',options:['약 9%다','0.09%다','9개 틀렸다는 뜻이다'],answer:0,explanation:'반환값은 비율입니다. %로 표시할 때 100을 곱하며 실제값 0과 단위 변환 조건도 확인합니다.'}
    },
    'data-tensor-training': {
      title:'Tensor 축을 맞추고 손실·기울기·갱신을 연결합니다',intro:'원본 실습의 모델별 Tensor 계약을 먼저 봅니다. 이후 본문 예측 [17,19]와 정답 [16,20]으로 스칼라 출력 가중치의 MSE·미분·SGD 한 번을 계산합니다. 실제 Adam 실행과 구분합니다.',
      defaults:{model:'lstm',batch:2,hidden:64,horizon:2,weight:1,rate:0.001},controls:[select('model','실습 Tensor 흐름',[['lstm','LSTM'],['rnn','RNN'],['conv','Conv1d'],['seq2seq','Optional RNN Encoder–Decoder'],['ncf','NCF']]),range('batch','배치 B',1,4,1),range('hidden','시계열 은닉 폭 D',2,64,2),range('horizon','Encoder–Decoder 미래 H',1,4,1),range('weight','계산용 출력 가중치 w',0.8,1.2,0.02),range('rate','계산용 SGD 학습률 η',0,0.005,0.0005)],
      steps:[{title:'입력과 모델 축',text:'실습 API가 요구하는 축을 확인합니다.'},{title:'예측·정답 정렬',text:'축을 맞춘 뒤 같은 표본끼리 비교합니다.'},{title:'MSE와 미분',text:'backward가 계산할 국소 미분을 봅니다.'},{title:'한 번 갱신',text:'step 이후 같은 입력의 손실을 다시 계산합니다.'}],
      compute(p,s) {
        const r=training(p),st=stage(s,4);let html=table(['실습 위치','Tensor 모양','dtype / 의미'],r.shapes.slice(0,st===0?2:r.shapes.length));
        html+=table(['원본 실습 데이터 Library','입력부터 배치까지'],r.model==='ncf'?
          [['pandas.read_csv','MovieLens 로그의 userId, movieId, rating, timestamp'],['sklearn.preprocessing.LabelEncoder.fit_transform','사용자·영화 ID를 각각 연속 정수로 변환; Embedding 인덱스는 long'],['train_test_split(test_size=0.1, stratify=df.rating.values)','원본은 평점 층화 무작위 분할. 미래 기간 예측 실험의 시간 분할과 구분'],['Dataset.__len__/__getitem__','users·movies long, ratings는 float32로 소수 평점 보존'],['DataLoader(batch_size=128, drop_last=False)','원본은 train/test 모두 shuffle=True. 각 예측·정답·사용자 ID의 대응을 함께 유지'],['defaultdict(list) / sort / mean_squared_error','사용자별 (예측,실제) 모음의 순위와 전체 평점 RMSE를 각각 계산']]:
          [['yfinance.download / pandas','원본 GOOG 시계열을 받아 Open 열 선택. 이 화면은 다운로드하지 않고 본문 판매량 사용'],['math.ceil(N×0.8) / pandas 슬라이스','원본 훈련·평가 시간순 분리. 모델 선택에는 별도 검증 구간 필요'],['sklearn.preprocessing.MinMaxScaler','훈련 fit_transform → 평가 transform → 보고 전 inverse_transform'],['numpy 배열 → torch.tensor(dtype=float32)','원본 L=50, 한 단계 y [B]; Optional H=10이면 y [B,10,1]'],['TensorDataset(X,y) → DataLoader(batch_size=32)','원본 train shuffle=True, test=False. 시간 분할을 끝낸 훈련 쌍만 섞음'],['np.roll / reshape / torch.stack','관측 또는 예측 피드백의 정보 조건을 구분; 미래축은 dim=1'],['sklearn.metrics / numpy.sqrt','mean_squared_error → RMSE, mean_absolute_percentage_error → 비율']]);
        if(st>=1) html+=note('이하 미분은 위 모델을 실행한 결과가 아닌 별도 스칼라 출력층 예제입니다. x는 고정된 출력층 입력이고 w만 학습합니다. 배치가 2보다 크면 본문 두 쌍을 반복합니다.')+table(['예','고정 x','y','ŷ=w×x'],r.xs.map((x,i)=>[i+1,x,r.ys[i],fmt(r.predictions[i])]))+eq('예측과 정답의 같은 축만 비교합니다. [B,1]−[B]의 broadcasting으로 [B,B]가 생기지 않도록 합니다.');
        if(st>=2) html+=eq('L=Σ(w×xᵢ−yᵢ)²/B = '+fmt(r.loss))+eq('∂L/∂w = (2/B)Σ(w×xᵢ−yᵢ)xᵢ = '+fmt(r.gradient))+table(['PyTorch 학습 순서','역할'],[['model.train() / optimizer.zero_grad()','학습 모드 / 이전 gradient 제거'],['pred=model(x); loss=MSELoss(pred,y)','순전파 / 같은 축의 정답 비교'],['loss.backward()','파라미터 gradient 계산, 아직 갱신 전'],['optimizer.step()','원본은 Adam; 아래 수식은 비교용 SGD'],['model.eval(); torch.no_grad()','평가 모드 / gradient 기록 끄기, 파라미터 갱신 없음']]);
        if(st>=3) html+=eq('SGD: w_new=w−η×gradient='+fmt(r.w)+'−'+fmt(r.eta)+'×('+fmt(r.gradient)+')='+fmt(r.next))+table(['같은 고정 표본','갱신 전','갱신 후'],[['가중치',fmt(r.w),fmt(r.next)],['MSE',fmt(r.loss),fmt(r.nextLoss)]]);
        return {html,explanation:(r.model==='seq2seq'?'인코더 h [2,B,D]를 디코더로 넘기고 첫 입력은 마지막 관측 [B,1,1]입니다. 이후 예측을 재입력해 [B,H,1]을 만듭니다. ':r.model==='ncf'?'NCF의 임베딩 폭은 원본대로 32로 고정입니다. 시계열 D·H 슬라이더는 NCF 모양에 적용되지 않습니다. ':'시간 길이는 이 작은 예제에서 3이고, 원본 실습의 sequence_length는 50입니다. ')+(st>=3?(r.nextLoss<r.loss?'이번 한 번의 SGD 갱신에서는 손실이 줄었습니다.':r.nextLoss===r.loss?'현재 조건에서 손실이 그대로입니다.':'이번 학습률은 손실을 키웠습니다. step이 언제나 감소를 보장하지 않습니다.'):'B=1이어도 예 축을 제거하지 않고 마지막 시간·특성 축만 선택합니다.'),metrics:[['계산 예 수 B',String(r.b)],['현재 MSE',st>=2?fmt(r.loss):'미분 단계'],['∂L/∂w',st>=2?fmt(r.gradient):'미분 단계'],['갱신 후 MSE',st>=3?fmt(r.nextLoss):'갱신 단계']]};
      },question:{prompt:'loss.backward()를 호출한 직후에는?',options:['기울기가 계산되고 step을 해야 파라미터가 갱신된다','Adam 갱신까지 끝났다','모델이 자동으로 평가 모드가 된다'],answer:0,explanation:'zero_grad는 초기화, backward는 gradient 계산, optimizer.step은 갱신입니다. 학습/평가 모드는 별도로 정합니다.'}
    }
  });

  // 불변량이나 아직 읽지 않은 입력을 화면 오류처럼 보이게 하지 않는다.
  // 현재 단계가 소비하는 조건을 설명하며, 계산을 꾸며서 바꾸지는 않는다.
  const controlHelp={
    'data-window':(p,s)=>stage(s,4)===0?'현재는 원본 8일과 라벨 경계를 보는 단계입니다. L·H는 아래 창 수 식에 반영되고, 선택한 X/y 색 구간은 2단계 훈련 창·3단계 평가 창에서 표시됩니다.':'원본 날짜·판매량은 고정입니다. L·H·훈련 경계를 바꾸면 유효 창·선택 구간·Tensor 축이 바뀌며, 부족한 창은 새 값을 꾸미지 않고 없음으로 표시합니다.',
    'data-scaler':(p,s)=>stage(s,3)===0?'현재 fit 단계에서는 훈련만 fit한 최소·최대가 평가값 슬라이더와 무관합니다. 평가값의 이동은 2단계 transform에서, 오차는 3단계에서 확인하세요. 전체 fit을 선택하면 평가값이 기존 극값을 넘어설 때만 fit 통계도 달라집니다.':'평가값이 변해도 훈련 눈금이 그대로인 것은 의도한 정보 분리입니다. 같은 눈금에서 변환값·평가 오차가 변하며, 전체 fit은 평가값이 최소·최대를 바꿀 때 눈금도 바뀌는 누수 예입니다.',
    'data-forecast':(p,s)=>stage(s,4)===0?'두 정보 조건 모두 6일까지 같은 관측을 읽으므로 첫 그림과 7일 예측은 같습니다. 조건 선택은 2단계 다음 입력부터, 실제값 변경은 반복 모드의 8일 예측 또는 4단계 오차에서 드러납니다.':'고정 시점 모드의 예측을 바꿔 보려면 증가량을 조절하세요. 도착한 실제값의 영향은 반복 한 단계 모드의 다음 입력에서 확인합니다. 고정 시점의 예측이 실제값 조작에 반응하지 않는 것은 미래 누수를 막은 결과입니다.',
    'data-state':(p,s)=>{
      const st=stage(s,4),r=state(p);
      if(r.wx===0)return '입력 가중치가 0이고 h₀=0이면 세 시점의 상태가 모두 0입니다. 이전 상태 가중치만 바꾸어도 0×wₕ=0이므로 같으며, 입력 가중치를 0보다 크게 하고 3일 단계에서 기억 효과를 확인하세요.';
      return st===0?'첫 관측 x₁=0, h₀=0이므로 두 가중치를 움직여도 h₁=tanh(0)=0입니다. 입력 가중치의 효과는 2일, 이전 상태 가중치의 효과는 이전 상태가 0이 아니게 되는 3일부터 확인하세요.':st===1?'2일은 h₁=0을 읽으므로 이전 상태 가중치는 아직 영향이 없습니다. 3일 단계로 이동하면 h₂가 다음 계산에 곱해지는 경로가 나타납니다.':'현재는 이전에 계산한 상태가 다음 셀 입력으로 전달되는 단계입니다. 정답 연결 단계에서는 같은 h₃를 출력으로 읽으며 원본 관측을 다시 바꾸지 않습니다.';
    },
    'data-memory':(p,s)=>{
      const st=stage(s,4);
      return st===0?'현재 그림은 입력으로 주어진 이전 셀 기억 2만 표시합니다. 망각 게이트는 2단계, 입력 게이트·후보는 3단계, 출력 게이트는 4단계에 적용됩니다.':st===1?'현재 유지 경로는 f만 읽습니다. 입력 게이트·후보의 영향은 다음 추가 단계, 출력 게이트의 영향은 마지막 은닉 출력 단계에서 확인하세요.':st===2?'출력 게이트는 아직 셀 기억 c 계산에 들어가지 않습니다. 마지막 단계에서 o를 바꾸면 c는 유지되고 h만 바뀝니다.':'o는 h만 조절하고 c는 바꾸지 않습니다. i=0이면 후보 g의 경로가 차단되므로 g만 움직여도 새 정보 기여는 0으로 같습니다.';
    },
    'data-ses':(p,s)=>stage(s,4)===3?'미래의 수평 점선은 의도한 예측입니다. 새 관측·추세·계절이 없는 단순 지수평활은 마지막 수준을 반복하며, α는 과거 갱신 곡선과 그 마지막 수준을 바꿉니다.':'반영량 α(관측−이전 수준)이 표와 녹색 수준 경로에 함께 반영됩니다. α=0이면 경로가 수평이어도 계산 정지가 아니라 오차를 반영하지 않는 조건입니다.',
    'data-score':(p,s)=>{
      const st=stage(s,4),r=score(p);
      let text=st===0?'현재는 같은 두 임베딩의 조회 단계이므로 MF/NCF 선택은 벡터 자체를 바꾸지 않습니다. 2단계부터 서로 다른 결합을 봅니다. ':'';
      if(st<3)text+='관측 평점·정답 유무는 마지막 정답과 손실 단계에서 적용하며 점수 계산의 입력으로 쓰지 않습니다. ';
      if(!r.observed)text+='미관측 칸에서는 평점 슬라이더를 회귀 정답으로 사용하지 않으므로 손실이 생기지 않습니다. ';
      if(r.model==='ncf'&&r.pre[1]<=0)text+='현재 두 번째 은닉 가중합이 0 이하라 ReLU 뒤 기여는 0입니다. 사용자·영화 두 번째 성분의 합을 양수로 바꾸어 그 경로의 영향을 확인하세요.';
      return text||'선택한 모델의 결합 결과가 바뀌며, 회귀 정답은 관측된 칸의 손실에만 사용됩니다.';
    },
    'data-bpr':()=> '공통 이동 슬라이더는 두 점수의 표를 함께 바꾸지만 차이·sigmoid·쌍별 순위 손실은 불변입니다. 손실값을 바꾸려면 점수 차이 Δ를 조절하세요. 이는 L2를 제외한 순위 항의 불변성입니다.',
    'data-graph':(p,s)=>{
      const r=graph(p),st=stage(s,4);
      return (r.mode==='ngcf'?'성분곱 W₂는 NGCF의 메시지·집계·최종 내적에 적용됩니다. ':'선택한 '+r.mode.toUpperCase()+' 규칙은 W₂ 성분곱을 사용하지 않습니다. W₂의 영향을 보려면 NGCF를 선택하세요. ')+(st<2?'현재까지는 초기 그래프와 첫 층 메시지이므로 총 층 수를 늘려도 이 부분은 같습니다. 3단계 층별 집계·4단계 최종 표현에서 K의 영향을 확인하세요.':'그림은 현재 단계의 계산값을 표시합니다. 간선 자체는 고정 훈련 구조이고, 임베딩과 최종 점수만 전파 규칙에 따라 바뀝니다.');
    },
    'data-ranking':(p,s)=>{
      const r=ranking(p),st=stage(s,4);
      let text='현재 요청 K='+r.k+', 반환 수='+r.returned+'입니다. ';
      text+=r.k===r.returned?'두 Precision 분모 정책이 모두 '+r.k+'라 값이 같습니다. 차이를 보려면 후보를 A,B만으로 제한하고 K를 3 이상으로 두세요. ':'요청 K와 반환 수가 달라 Precision 정책을 바꾸면 분모가 바뀝니다. ';
      if(st===0)text+='현재는 후보·정답 계약을 보는 단계이고, 순위 변경은 2단계 Top-K에서 드러납니다. ';
      if(st<3)text+='IDCG 정책은 4단계 정규화에서 적용됩니다. ';
      if(r.reachable===r.relevant.length)text+='현재 정답이 모두 후보에 있어 전체·후보 안 IDCG도 같습니다. 후보 밖 정답 G를 추가하거나 후보를 제한하면 차이를 확인할 수 있습니다.';
      return text;
    },
    'data-errors':(p,s)=>stage(s,4)<2?'현재는 대응 값·개별 오차를 확인합니다. MAE·RMSE는 3단계, MAPE는 4단계에서 집계합니다. 같은 크기의 양·음 오차는 집계가 같을 수 있지만 표의 예측값·부호는 달라집니다.':'예측과 정답의 차이는 표에서 바로 확인하고, 지표는 선택한 오차 변환으로 집계합니다. 실제값 0의 MAPE는 슬라이더 변화와 무관하게 정의되지 않습니다.',
    'data-tensor-training':(p,s)=>{
      const r=training(p),st=stage(s,4);
      return (r.model==='seq2seq'?'미래 H는 Encoder–Decoder의 출력·정답 [B,H,1]에 반영됩니다. ':r.model==='ncf'?'NCF는 임베딩 폭 32와 평점 하나를 쓰므로 시계열 D·미래 H를 사용하지 않습니다. D·H의 영향을 보려면 시계열/Encoder–Decoder를 선택하세요. ':'현재 단일 미래 출력 모델은 H를 사용하지 않습니다. H의 영향을 보려면 Optional RNN Encoder–Decoder를 선택하세요. ')+(st===0?'현재는 Tensor 계약 단계이며 계산용 w는 2단계 예측, η는 4단계 갱신에 적용됩니다. ':st<3?'학습률 η는 아직 전방계산·미분에 들어가지 않습니다. 4단계에서 같은 기울기에 적용됩니다. ':'η=0이면 갱신 후 손실이 같은 것이 정상입니다. ')+ 'Tensor 모양 실험과 고정 스칼라 SGD 예제는 별개이므로 D·H로 스칼라 손실을 꾸며 바꾸지 않습니다.';
    }
  };
  Object.entries(controlHelp).forEach(([id,help])=>{
    const module=window.LabModules[id],compute=module.compute;
    module.compute=function(params,step){const result=compute(params,step);return {...result,explanation:result.explanation+' '+help(params,step)};};
  });
})();
