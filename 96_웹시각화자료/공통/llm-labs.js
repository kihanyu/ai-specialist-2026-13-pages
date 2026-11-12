/* LLM 교육용 계산. 고정 예제는 실제 학습 모델의 측정 결과가 아니다. */
(function () {
  'use strict';
  const fmt = (v, n = 4) => Number.isFinite(v) ? Number(v.toFixed(n)).toString() : (v === -Infinity ? '−∞' : '정의되지 않음');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const table = (heads, rows) => '<div class="table-scroll" role="region" aria-label="현재 계산표" tabindex="0" style="max-width:100%;overflow-x:auto"><table><thead><tr>' + heads.map(x => `<th scope="col" style="min-width:76px">${esc(x)}</th>`).join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(x => `<td style="white-space:nowrap">${esc(x)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
  const matrix = (label, rows) => `<div class="matrix"><strong>${esc(label)}</strong>${table(rows[0].map((_, i) => '열 ' + (i + 1)), rows.map(r => r.map(x => typeof x === 'number' ? fmt(x) : x)))}</div>`;
  const equation = s => `<p class="equation">${esc(s)}</p>`;
  const note = s => `<p class="muted">${esc(s)}</p>`;
  const bars = (labels, values, max = 1) => `<svg viewBox="0 0 560 ${labels.length * 52 + 48}" role="img" aria-label="${esc(labels.map((x, i) => x + ' ' + fmt(values[i])).join(', '))}"><line x1="118" y1="12" x2="118" y2="${labels.length * 52 + 2}" stroke="#74849a"/>${labels.map((x, i) => `<text x="8" y="${i * 52 + 35}" font-size="16" fill="currentColor">${esc(x)}</text><rect x="120" y="${i * 52 + 15}" width="${Math.max(0, Math.min(1, values[i] / max)) * 330}" height="26" rx="3" fill="${i === 0 ? '#235eaa' : '#087f74'}"/><text x="${Math.min(454, 130 + Math.max(0, values[i] / max) * 330)}" y="${i * 52 + 35}" font-size="16" fill="currentColor">${fmt(values[i])}</text>`).join('')}<text x="120" y="${labels.length * 52 + 31}" font-size="15" fill="currentColor">0</text><text x="421" y="${labels.length * 52 + 31}" font-size="15" fill="currentColor">${fmt(max)}</text></svg>`;
  function softmax(xs) {
    const valid = xs.filter(Number.isFinite);
    if (!valid.length) return null;
    const max = Math.max(...valid), exps = xs.map(x => Number.isFinite(x) ? Math.exp(x - max) : 0);
    const total = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / total);
  }
  function attention(p) {
    const raw = [[Number(p.strength), 0], [0, 1]];
    const masked = raw.map((r, i) => r.map((x, j) => p.causal === 'on' && j > i ? -Infinity : x));
    const weights = masked.map(softmax);
    const out = weights.map(r => [2 * r[0], 4 * r[1]]);
    return {raw, masked, weights, out};
  }
  function temperature(p) {
    const logits = [2, 1, 0], scaled = logits.map(x => x / Number(p.temperature));
    const probabilities = softmax(scaled), target = Number(p.target);
    return {logits, scaled, probabilities, target, loss: -Math.log(probabilities[target]), entropy: -probabilities.reduce((s, v) => s + v * Math.log(v), 0)};
  }
  function rotation(p) {
    const theta = Math.PI / 4;
    const rotate = (x, pos) => [Math.cos(pos * theta) * x[0] - Math.sin(pos * theta) * x[1], Math.sin(pos * theta) * x[0] + Math.cos(pos * theta) * x[1]];
    const m = Number(p.query), n = Number(p.key), shift = Number(p.shift);
    const q = rotate([1, 0], m), k = rotate([0, 1], n);
    const sq = rotate([1, 0], m + shift), sk = rotate([0, 1], n + shift);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
    return {m, n, shift, theta, q, k, sq, sk, score: dot(q, k), shifted: dot(sq, sk)};
  }
  function cache(p) {
    const tokens = Number(p.tokens), kvHeads = Number(p.heads), bytes = Number(p.bytes);
    const batch = 1, layers = 4, queryHeads = 8, dim = 16;
    const payload = 2 * batch * layers * tokens * kvHeads * dim * bytes;
    const full = 2 * batch * layers * tokens * queryHeads * dim * bytes;
    return {tokens, kvHeads, bytes, batch, layers, queryHeads, dim, payload, full};
  }
  function online(p) {
    const offset = Number(p.offset);
    const scores = [offset, offset + Math.log(3)], values = [2, 6];
    if (p.mask === 'first' || p.mask === 'all') scores[0] = -Infinity;
    if (p.mask === 'all') scores[1] = -Infinity;
    let m = -Infinity, l = 0, u = 0;
    const records = scores.map((x, i) => {
      if (x !== -Infinity) {
        const next = Math.max(m, x), a = Math.exp(m - next), b = Math.exp(x - next);
        l = a * l + b; u = a * u + b * values[i]; m = next;
      }
      return {score: x, value: values[i], m, l, u, output: l > 0 ? u / l : null};
    });
    const probabilities = softmax(scores);
    return {scores, values, records, probabilities, output: l > 0 ? u / l : null};
  }
  function lossMask(p) {
    // 각 행은 한 입력 위치에서 예측하는 다음 정답의 감독 위치다.
    const labels = ['지시문 1', '지시문 2', '응답 1', '응답 2', '응답 3', 'padding'];
    const probabilities = [0.9, 0.8, 0.6, 0.7, 0.5, 0.9];
    const active = labels.map((_, i) => i < 5 && (p.mode === 'all' || i >= 2));
    const losses = probabilities.map(x => -Math.log(x));
    const count = active.filter(Boolean).length;
    const sum = losses.reduce((s, l, i) => s + (active[i] ? l : 0), 0);
    return {labels, probabilities, active, losses, count, sum, average: count ? sum / count : null};
  }
  function lora(p) {
    const width = Number(p.width), rank = Number(p.rank), full = width * width, adapters = 2 * width * rank;
    return {width, rank, full, adapters, ratio: adapters / full, baseFrozen: true};
  }
  function gradient(p) {
    const x = 2, y = 3, w = Number(p.weight), eta = Number(p.rate);
    const prediction = w * x, loss = (prediction - y) ** 2, grad = 2 * (prediction - y) * x;
    const next = w - eta * grad, nextPrediction = next * x, nextLoss = (nextPrediction - y) ** 2;
    return {x, y, w, eta, prediction, loss, grad, next, nextPrediction, nextLoss};
  }
  window.LLMMath = {softmax, attention, temperature, rotation, cache, online, lossMask, lora, gradient};
  window.LabModules = window.LabModules || {};
  Object.assign(window.LabModules, {
    'llm-gradient': {
      title: '역전파 다음에 가중치를 갱신해야 합니다',
      intro: '교육용 한 표본 x=2, y=3에서 예측·손실·기울기·갱신을 분리합니다. 실제 모델 학습 실행이 아닌 식의 직접 계산입니다.',
      defaults: {weight: 1, rate: 0.1},
      controls: [{key: 'weight', label: '현재 가중치 w', type: 'range', min: 0, max: 3, step: 0.1}, {key: 'rate', label: '학습률 η', type: 'range', min: 0, max: 0.5, step: 0.01}],
      steps: [{title: '순전파', text: '고정 입력에 현재 가중치를 곱합니다.'}, {title: '손실', text: '예측과 실제값의 제곱 차이를 계산합니다.'}, {title: '역전파', text: '국소 미분 두 개를 곱해 가중치 기울기를 구합니다.'}, {title: '갱신과 재평가', text: '새 가중치로 같은 입력을 다시 평가합니다.'}],
      compute(p, step) {
        const r = gradient(p);
        let html = equation(`x=${r.x} → × w=${fmt(r.w)} → ŷ=${fmt(r.prediction)}; 실제값 y=${r.y}`);
        if (step >= 1) html += equation(`L=(ŷ−y)²=(${fmt(r.prediction)}−3)²=${fmt(r.loss)}`);
        if (step >= 2) html += table(['국소 미분', '값'], [['dL/dŷ = 2(ŷ−y)', fmt(2 * (r.prediction - r.y))], ['dŷ/dw = x', '2'], ['dL/dw = 2(ŷ−y)x', fmt(r.grad)]]);
        if (step >= 3) html += equation(`w_new=${fmt(r.w)}−${fmt(r.eta)}×(${fmt(r.grad)})=${fmt(r.next)}`) + table(['같은 표본', '갱신 전', '갱신 후'], [['예측', fmt(r.prediction), fmt(r.nextPrediction)], ['제곱 손실', fmt(r.loss), fmt(r.nextLoss)]]);
        return {html, explanation: step < 3 ? '기울기 계산과 가중치 갱신은 별개입니다. 다음 단계에서 같은 표본으로 갱신 효과를 확인하세요.' : `손실 ${fmt(r.loss)} → ${fmt(r.nextLoss)}. ${r.nextLoss < r.loss ? '이번 갱신에서는 손실이 감소했습니다.' : r.nextLoss === r.loss ? '이번 조건에서는 손실이 줄지 않았습니다.' : '학습률이 커서 최적값을 지나쳤습니다.'} 이 이차식의 반복 갱신은 0<η<0.25에서 수렴합니다. 모든 신경망에 같은 안정 범위를 적용하지 않습니다.`, metrics: [['예측 ŷ', fmt(r.prediction)], ['현재 손실', fmt(r.loss)], ['현재 기울기', fmt(r.grad)], ['갱신 후 손실', step >= 3 ? fmt(r.nextLoss) : '다음 단계에서 확인']]};
      },
      question: {prompt: '기본값 w=1에서 η=0.25로 한 번 갱신하면 손실은?', options: ['0이 된다', '1로 그대로다', '항상 감소한다'], answer: 1, explanation: '기울기는 −4, 새 w는 2, 예측은 4입니다. (4−3)²=1로 시작 손실과 같습니다.'}
    },
    'llm-attention': {
      title: '점수와 가중치, 출력은 서로 다른 값입니다',
      intro: '두 위치와 한 head만 사용합니다. 기본 Q=[[√2,0],[0,√2]], K=I, V=[[2,0],[0,4]], dₖ=2에서 출발하는 교육용 계산입니다.',
      defaults: {strength: 1, causal: 'on'},
      controls: [{key: 'strength', label: '첫 query의 크기 배수', type: 'range', min: 0, max: 3, step: 0.1}, {key: 'causal', label: '미래 위치 차단', type: 'select', options: [{value: 'on', label: 'Causal mask 적용'}, {value: 'off', label: 'Mask 없이 비교'}]}],
      steps: [{title: '내적과 scaling', text: 'QKᵀ를 √dₖ로 나눕니다. 행은 query, 열은 key입니다.'}, {title: '참조 범위 제한', text: '미래의 key를 softmax 전에 −∞로 바꿉니다.'}, {title: '행별 softmax', text: '유효한 key에 대해서만 가중치 합을 1로 만듭니다.'}, {title: 'Value 가중합', text: '같은 가중치로 Value를 섞어 각 query의 출력을 만듭니다.'}],
      compute(p, step) {
        const r = attention(p);
        let html = matrix('S=QKᵀ/√2 [query 위치, key 위치]', r.raw);
        if (step >= 1) html += matrix('mask 이후 점수', r.masked);
        if (step >= 2) html += matrix('A=softmax(S), 열 방향으로 정규화', r.weights);
        if (step >= 3) html += matrix('O=AV [query 위치, Value 특성]', r.out);
        html += note('표의 값은 소수 넷째 자리까지 표시하며 중간 계산은 반올림하지 않습니다. 실제 head는 학습된 Q·K·V를 사용합니다.');
        return {html, explanation: p.causal === 'on' ? `첫 query는 미래 위치를 볼 수 없어 가중치가 [1,0], 출력은 [2,0]입니다. 첫 query 크기를 바꿔도 유효 key가 하나라 이 출력은 유지됩니다. 두 번째 출력은 [${r.out[1].map(x => fmt(x)).join(', ')}]입니다.` : `첫 query가 두 위치를 모두 볼 때 첫 가중치는 ${fmt(r.weights[0][0])}입니다. query 크기가 확률의 집중도를 바꾸지만, Attention 가중치를 사실성이나 인과 중요도의 완전한 설명으로 읽지는 않습니다.`, metrics: [['행 1 가중치 합', step >= 2 ? fmt(r.weights[0].reduce((a, b) => a + b, 0)) : 'softmax 단계에서 확인'], ['미래 가중치 A₁₂', step >= 2 ? fmt(r.weights[0][1]) : 'softmax 단계에서 확인'], ['출력 O₁', step >= 3 ? `[${r.out[0].map(x => fmt(x)).join(', ')}]` : '가중합 단계에서 확인']]};
      },
      question: {prompt: '미래 점수를 0으로 덮으면 미래 가중치도 0이 될까요?', options: ['그렇다. 점수 0은 확률 0이다', '아니다. exp(0)=1이므로 −∞로 차단해야 한다', 'mask는 반드시 softmax 뒤에 곱한다'], answer: 1, explanation: 'softmax 전 점수 0은 양의 지수값 1을 만듭니다. −∞를 넣으면 exp(−∞)=0이 되어 참조가 차단됩니다.'}
    },
    'llm-temperature': {
      title: 'Temperature는 같은 점수를 다른 분포로 바꿉니다',
      intro: '가상 어휘 A·B·C의 logits [2,1,0]을 사용합니다. 실제 모델 응답 확률을 측정한 값이 아닙니다.',
      defaults: {temperature: 1, target: '0'},
      controls: [{key: 'temperature', label: 'Temperature T', type: 'range', min: 0.2, max: 2, step: 0.1}, {key: 'target', label: '평가할 정답 토큰', type: 'select', options: [{value: '0', label: 'A'}, {value: '1', label: 'B'}, {value: '2', label: 'C'}]}],
      steps: [{title: '어휘별 점수', text: 'logits는 아직 확률이 아닙니다.'}, {title: 'Temperature 적용', text: '각 logit을 양수 T로 나눕니다.'}, {title: '분포 만들기', text: '최댓값을 빼 안정적으로 softmax합니다.'}, {title: '정답 손실', text: '지정한 정답의 확률에 −ln을 적용합니다.'}],
      compute(p, step) {
        const r = temperature(p);
        let html = table(['어휘', 'logit z', ...(step >= 1 ? ['z/T'] : []), ...(step >= 2 ? ['확률 p'] : [])], ['A', 'B', 'C'].map((x, i) => [x + (i === r.target ? ' (정답)' : ''), fmt(r.logits[i]), ...(step >= 1 ? [fmt(r.scaled[i])] : []), ...(step >= 2 ? [fmt(r.probabilities[i])] : [])]));
        if (step >= 2) html += bars(['A 확률', 'B 확률', 'C 확률'], r.probabilities, 1);
        if (step >= 3) html += equation(`CE=−ln p(${'ABC'[r.target]})=−ln ${fmt(r.probabilities[r.target])}=${fmt(r.loss)} nat`);
        return {html, explanation: `T=${fmt(Number(p.temperature))}에서 가장 높은 확률의 토큰은 A입니다. 양수 T를 바꿔도 logits의 순서는 유지되며 분포의 집중도만 바뀝니다. ${step >= 3 ? `정답을 ${'ABC'[r.target]}로 정했으므로 손실은 ${fmt(r.loss)} nat입니다.` : '정답 토큰을 바꾸어 손실이 어떻게 달라질지 먼저 예상해 보세요.'} 이 화면은 sampling을 실행하거나 가중치를 학습하지 않습니다.`, metrics: [['확률합', step >= 2 ? fmt(r.probabilities.reduce((a, b) => a + b, 0)) : '분포 단계에서 확인'], ['분포 엔트로피', step >= 2 ? `${fmt(r.entropy)} nat` : '분포 단계에서 확인'], ['정답 CE', step >= 3 ? `${fmt(r.loss)} nat` : '손실 단계에서 확인']]};
      },
      question: {prompt: '양수 T를 낮추면 항상 정답 손실이 줄어들까요?', options: ['그렇다', '아니다. 정답이 낮은 logit이면 손실이 더 커질 수 있다', '정답과 무관하게 확률이 균등해진다'], answer: 1, explanation: 'T 감소는 최대 logit 쪽으로 분포를 집중시킵니다. 이 예에서 C가 정답이면 오히려 정답 확률이 낮아집니다.'}
    },
    'llm-rope': {
      title: '함께 이동해도 상대 위치의 내적은 유지됩니다',
      intro: '한 좌표쌍 q=(1,0), k=(0,1), 각도 주파수 θ=π/4인 교육용 RoPE 계산입니다. 실제 모델의 여러 주파수 중 한 쌍만 설명합니다.',
      defaults: {query: 0, key: 1, shift: 0},
      controls: [{key: 'query', label: 'query 위치 m', type: 'range', min: 0, max: 7, step: 1}, {key: 'key', label: 'key 위치 n', type: 'range', min: 0, max: 7, step: 1}, {key: 'shift', label: '두 위치의 공통 이동량', type: 'range', min: 0, max: 7, step: 1}],
      steps: [{title: '위치 없는 벡터', text: '원래 벡터 q·k는 직교합니다.'}, {title: '각 위치에서 회전', text: '같은 좌표쌍에 위치별 각도를 적용합니다.'}, {title: '회전 후 내적', text: '서로 다른 위치의 회전 차이가 점수에 남습니다.'}, {title: '같이 이동해 비교', text: '두 위치에 같은 이동량을 더해도 상대 거리는 같습니다.'}],
      compute(p, step) {
        const r = rotation(p), q = step >= 3 ? r.sq : step ? r.q : [1, 0], k = step >= 3 ? r.sk : step ? r.k : [0, 1];
        const arrow = (v, color, label) => `<line x1="280" y1="140" x2="${280 + v[0] * 105}" y2="${140 - v[1] * 105}" stroke="${color}" stroke-width="4"/><circle cx="${280 + v[0] * 105}" cy="${140 - v[1] * 105}" r="5" fill="${color}"/><text x="${280 + v[0] * 117}" y="${140 - v[1] * 117 + (label === 'q' ? -8 : 15)}" fill="${color}" font-size="18">${label}</text>`;
        const projection = step === 2 ? `<line x1="${280 + q[0] * 105}" y1="${140 - q[1] * 105}" x2="${280 + r.score * k[0] * 105}" y2="${140 - r.score * k[1] * 105}" stroke="#b65f20" stroke-dasharray="5 4" stroke-width="2"/><circle cx="${280 + r.score * k[0] * 105}" cy="${140 - r.score * k[1] * 105}" r="5" fill="#b65f20"/><text x="18" y="278" font-size="16" fill="currentColor">k 방향 q의 성분 = 내적 ${fmt(r.score)}</text>` : '';
        const ghosts = step >= 3 ? `<line x1="280" y1="140" x2="${280 + r.q[0] * 105}" y2="${140 - r.q[1] * 105}" stroke="#235eaa" stroke-dasharray="4 5" opacity="0.4"/><line x1="280" y1="140" x2="${280 + r.k[0] * 105}" y2="${140 - r.k[1] * 105}" stroke="#7048a4" stroke-dasharray="4 5" opacity="0.4"/><text x="18" y="278" font-size="16" fill="currentColor">실선: 공통 ${r.shift}칸 이동 후 · 점선: 이동 전</text>` : '';
        let html = `<svg viewBox="0 0 560 295" role="img" aria-label="${step >= 3 ? '공통 이동 후' : step === 2 ? '내적 투영을 표시한' : ''} 단위 원 위 query와 key 벡터. 좌표는 아래 표에 표시합니다."><circle cx="280" cy="140" r="105" fill="none" stroke="#b8c6d5"/><line x1="115" y1="140" x2="445" y2="140" stroke="#9daabc"/><line x1="280" y1="10" x2="280" y2="270" stroke="#9daabc"/><text x="448" y="158" font-size="16" fill="currentColor">x</text><text x="290" y="22" font-size="16" fill="currentColor">y</text>${ghosts}${projection}${arrow(q, '#235eaa', 'q')}${arrow(k, '#7048a4', 'k')}</svg>`;
        html += table(['벡터', 'x 좌표', 'y 좌표', '길이'], [['q', fmt(q[0]), fmt(q[1]), '1'], ['k', fmt(k[0]), fmt(k[1]), '1']]);
        if (step >= 2) html += equation(`R(mθ)q · R(nθ)k = sin((m−n)θ) = ${fmt(r.score)}`);
        if (step >= 3) html += table(['공통 이동 비교', 'query 위치', 'key 위치', '내적'], [['이동 전', r.m, r.n, fmt(r.score)], ['함께 이동 후', r.m + r.shift, r.n + r.shift, fmt(r.shifted)]]);
        return {html, explanation: step === 0 ? '위치가 없으면 q·k=0입니다. 위치는 원래 내용 벡터와 별개의 계산 요소입니다.' : `상대 위치 n−m=${r.n - r.m}. 두 벡터 길이는 1을 유지하지만 서로 다른 각도로 회전하므로 원래 내적 0이 항상 유지되는 것은 아닙니다. ${step >= 3 ? `공통 ${r.shift}칸 이동 후에도 내적 ${fmt(r.shifted)}로 같습니다.` : '두 위치를 같은 양만큼 이동하면 내적이 유지되는지 다음 단계에서 확인하세요.'}`, metrics: [['상대 위치 n−m', r.n - r.m], ['회전 내적', step >= 2 ? fmt(r.score) : '내적 단계에서 확인'], ['이동 후 내적', step >= 3 ? fmt(r.shifted) : '비교 단계에서 확인']]};
      },
      question: {prompt: 'RoPE에서 두 위치를 함께 같은 양만큼 이동하면 무엇이 유지될까요?', options: ['각 벡터의 좌표', '상대 위치에 의존하는 내적', '모든 토큰의 의미와 모델 답변'], answer: 1, explanation: '같은 직교 회전을 양쪽에 더하면 내적이 유지됩니다. 벡터 좌표 자체는 바뀔 수 있고 실제 모델의 최종 답변 불변을 보장하지 않습니다.'}
    },
    'llm-lora': {
      title: 'LoRA는 기반 가중치와 학습할 수정분을 분리합니다',
      intro: '정방형 선형층 W[d,d] 하나의 파라미터 수를 계산합니다. adapter는 A[r,d], B[d,r]이며 편향·optimizer·activation 메모리는 제외합니다.',
      defaults: {width: 512, rank: 8},
      controls: [{key: 'width', label: '입출력 폭 d', type: 'select', options: [{value: '512', label: '512'}, {value: '1024', label: '1024'}, {value: '4096', label: '4096'}]}, {key: 'rank', label: '수정분 rank r', type: 'range', min: 1, max: 64, step: 1}],
      steps: [{title: '기반 선형층', text: '전체 미세튜닝은 W의 d²개 원소를 학습합니다.'}, {title: '수정분 분해', text: 'BA는 원래 W와 같은 모양이지만 낮은 rank로 제한됩니다.'}, {title: '학습 대상 분리', text: 'LoRA는 기반 W를 고정하고 A·B를 학습합니다.'}, {title: '비용과 한계', text: '학습 대상 감소와 실제 peak memory·시간 감소는 구분합니다.'}],
      compute(p, step) {
        const r = lora(p);
        let html = equation(`기반 W[${r.width},${r.width}]: ${r.full.toLocaleString('ko-KR')}개`);
        if (step >= 1) html += equation(`A[${r.rank},${r.width}] → B[${r.width},${r.rank}] → BA[${r.width},${r.width}]`);
        if (step >= 2) html += table(['학습 방식', '고정 파라미터', '학습 대상'], [['전체 미세튜닝', '이 층에서는 없음', r.full.toLocaleString('ko-KR')], ['LoRA', `W: ${r.full.toLocaleString('ko-KR')}`, `A+B: ${r.adapters.toLocaleString('ko-KR')}`]]);
        if (step >= 3) html += equation(`학습 대상 비율=2dr/d²=2r/d=${fmt(r.ratio * 100, 2)}%`) + note('W의 저장·순전파는 남습니다. QLoRA는 기반 W의 저비트 저장을 결합하며, adapter 학습 자체와 구별합니다. 이 식을 곧바로 속도 배수나 전체 메모리 비율로 읽지 마세요.');
        return {html, explanation: `d=${r.width}, r=${r.rank}에서 adapter는 ${r.adapters.toLocaleString('ko-KR')}개로 전체 ${r.full.toLocaleString('ko-KR')}개의 ${fmt(r.ratio * 100, 2)}%입니다. rank를 늘리면 수정분 표현의 자유도가 커지지만 학습할 원소도 선형으로 늘어납니다. rank만으로 성능 향상을 보장하지 않습니다.`, metrics: [['기반 원소', r.full.toLocaleString('ko-KR')], ['adapter 원소', step >= 1 ? r.adapters.toLocaleString('ko-KR') : '분해 단계에서 확인'], ['학습 대상 비율', step >= 3 ? `${fmt(r.ratio * 100, 2)}%` : '비교 단계에서 확인']]};
      },
      question: {prompt: 'adapter가 전체 W의 1%라면 전체 실행 메모리도 반드시 1%일까요?', options: ['그렇다', '아니다. 기반 가중치·activation 등도 남는다', 'LoRA에서는 순전파를 하지 않는다'], answer: 1, explanation: '학습 대상 파라미터 수의 비율입니다. 기반 가중치 저장, activation, 임시 버퍼 등은 별도로 계산해야 합니다.'}
    },
    'llm-kv-cache': {
      title: 'KV 캐시는 과거 K·V를 저장해 재계산을 줄입니다',
      intro: '배치 1, 층 4, query head 8, head 폭 16인 교육용 구성입니다. 토큰 수·KV head 수·원소 bytes를 바꿔 순수 KV payload를 계산합니다.',
      defaults: {tokens: 128, heads: '8', bytes: '2'},
      controls: [{key: 'tokens', label: '저장 토큰 수 T', type: 'range', min: 8, max: 512, step: 8}, {key: 'heads', label: 'KV head 수', type: 'select', options: [{value: '8', label: '8: MHA'}, {value: '4', label: '4: GQA'}, {value: '2', label: '2: GQA'}, {value: '1', label: '1: MQA'}]}, {key: 'bytes', label: '원소 저장 크기', type: 'select', options: [{value: '2', label: '2 bytes: FP16 payload'}, {value: '1', label: '1 byte: 저비트 코드 payload'}]}],
      steps: [{title: '저장 대상', text: '각 층에서 이미 계산한 K와 V를 보관합니다.'}, {title: 'Tensor 축', text: 'K와 V 각각 [B,Hkv,T,dhead]를 셉니다.'}, {title: 'Bytes 계산', text: '두 Tensor의 원소 수에 층 수와 원소 bytes를 곱합니다.'}, {title: '같은 조건 비교', text: 'query head 8개인 MHA payload와 비교합니다.'}],
      compute(p, step) {
        const r = cache(p), kib = x => `${fmt(x / 1024, 2)} KiB`;
        let html = equation(`과거 ${r.tokens}개 토큰 × KV head ${r.kvHeads}개 → K 저장 + V 저장 → 새 query가 과거 K·V를 조회`);
        if (step >= 1) html += table(['대상', '층별 shape', '원소 수'], [['K', `[1,${r.kvHeads},${r.tokens},16]`, r.kvHeads * r.tokens * r.dim], ['V', `[1,${r.kvHeads},${r.tokens},16]`, r.kvHeads * r.tokens * r.dim]]);
        if (step >= 2) html += equation(`2×B×L×T×Hkv×dhead×bytes = 2×1×4×${r.tokens}×${r.kvHeads}×16×${r.bytes} = ${r.payload.toLocaleString('ko-KR')} bytes`);
        if (step >= 3) html += table(['같은 T·dtype 조건', 'MHA (KV head 8)', '현재 KV head 수 ' + r.kvHeads], [['순수 KV payload', kib(r.full), kib(r.payload)], ['MHA 대비 비율', '100%', `${fmt(r.payload / r.full * 100, 2)}%`]]);
        return {html, explanation: `토큰 수에 선형으로 늘어나는 순수 KV payload입니다. KV head가 ${r.kvHeads}개인 구조는 같은 dtype의 MHA 대비 ${fmt(r.kvHeads / 8 * 100, 2)}%입니다. 이미 학습된 MHA에서 head만 삭제해 같은 결과를 얻는다는 뜻은 아닙니다. ${r.bytes === 1 ? '1 byte는 코드 payload 가정입니다. scale·zero point·packing 정보와 역양자화 비용은 제외합니다. ' : ''}query별 과거 조회와 새 토큰의 K·V 계산은 남으며, 이 비율이 전체 지연의 비율은 아닙니다.`, metrics: [['저장 토큰', r.tokens], ['KV payload', step >= 2 ? kib(r.payload) : 'bytes 단계에서 확인'], ['MHA payload', step >= 3 ? kib(r.full) : '비교 단계에서 확인']]};
      },
      question: {prompt: 'KV 캐시를 사용하면 과거 토큰을 조회하는 Attention도 없어질까요?', options: ['그렇다', '아니다. 과거 K·V의 재계산을 줄여도 조회는 남는다', '새 토큰의 K·V도 계산하지 않는다'], answer: 1, explanation: '캐시는 과거 표현을 재사용합니다. 새 query와 저장된 key의 점수, value 가중합은 계산해야 합니다.'}
    },
    'llm-loss-mask': {
      title: '입력에 보이는 토큰과 손실에 포함하는 토큰은 다릅니다',
      intro: '다음 정답 토큰의 확률을 가상으로 고정한 6개 감독 위치를 비교합니다. 토큰별 확률은 교육용이며 실제 모델 측정값이 아닙니다.',
      defaults: {mode: 'answer'},
      controls: [{key: 'mode', label: '손실에 포함할 정답 위치', type: 'select', options: [{value: 'answer', label: '응답 위치만'}, {value: 'all', label: '지시문과 응답 전체 (padding 제외)'}]}],
      steps: [{title: '입력과 다음 정답', text: '각 입력 위치는 한 칸 뒤의 정답을 예측합니다.'}, {title: '손실 선택', text: '문맥으로 읽더라도 지시문 정답을 loss에서 제외할 수 있습니다.'}, {title: '토큰별 기여', text: '선택한 정답 위치에서만 −ln p를 합합니다.'}, {title: '선택 수로 평균', text: '전체 길이가 아니라 유효 감독 위치 수로 나눕니다.'}],
      compute(p, step) {
        const r = lossMask(p);
        let html = table(['다음 정답의 소속', '정답 확률', ...(step >= 1 ? ['loss 포함'] : []), ...(step >= 2 ? ['−ln p 기여'] : [])], r.labels.map((x, i) => [x, fmt(r.probabilities[i]), ...(step >= 1 ? [r.active[i] ? '포함' : '제외'] : []), ...(step >= 2 ? [r.active[i] ? fmt(r.losses[i]) : '0 (제외)'] : [])]));
        if (step >= 3) html += equation(`평균 CE=유효 loss 합/유효 위치 수=${fmt(r.sum)}/${r.count}=${fmt(r.average)} nat`);
        html += note('표의 6개 항목은 shift 후 정답 위치입니다. padding은 항상 제외합니다. 실제 전처리에서는 EOS 포함 여부와 빈 응답 규약도 고정해야 합니다.');
        return {html, explanation: `현재 ${p.mode === 'answer' ? '응답만' : '지시문과 응답'} 선택으로 유효 위치는 ${r.count}개입니다. 평균 손실은 ${fmt(r.average)} nat입니다. 손실에서 지시문을 제외해도 문맥 입력에서 제거한다는 뜻은 아니며, causal mask·padding mask·loss mask는 다른 제약입니다.`, metrics: [['유효 정답 수', step >= 1 ? r.count : '선택 단계에서 확인'], ['loss 합', step >= 2 ? fmt(r.sum) : '합산 단계에서 확인'], ['평균 CE', step >= 3 ? `${fmt(r.average)} nat` : '평균 단계에서 확인']]};
      },
      question: {prompt: '응답 3개만 감독하고 padding까지 총 6개 위치라면 loss 합을 무엇으로 나눌까요?', options: ['6', '3', 'padding 개수'], answer: 1, explanation: '선택된 유효 정답 위치 3개가 분모입니다. 전체 길이로 나누면 padding·지시문 비율에 따라 손실 척도가 달라집니다.'}
    },
    'llm-online-softmax': {
      title: '전체 점수 배열 없이 같은 가중합을 누적합니다',
      intro: '원문 예제 scores=[0,ln 3], values=[2,6]을 사용합니다. GPU 커널 실행이나 속도 측정 대신 online softmax의 누적식을 계산합니다.',
      defaults: {offset: 0, mask: 'none'},
      controls: [{key: 'offset', label: '모든 유효 점수의 공통 상수', type: 'range', min: 0, max: 1000, step: 100}, {key: 'mask', label: 'Mask 조건', type: 'select', options: [{value: 'none', label: '두 key 모두 유효'}, {value: 'first', label: '첫 key만 차단'}, {value: 'all', label: '모든 key 차단'}]}],
      steps: [{title: '누적 상태 초기화', text: 'm=−∞, l=0, u=0에서 시작합니다.'}, {title: '첫 key 처리', text: '유효한 점수만 누적하고 masked 항은 건너뜁니다.'}, {title: '두 번째 key 처리', text: '최댓값이 바뀌면 이전 분모와 분자를 같은 배수로 보정합니다.'}, {title: '일괄 계산과 비교', text: 'u/l과 일반 softmax 가중합을 비교합니다.'}],
      compute(p, step) {
        const r = online(p);
        let html = table(['key', '점수 (scale·mask 적용 후)', 'Value'], r.scores.map((x, i) => [i + 1, fmt(x), r.values[i]]));
        const rows = [['초기', '−∞', '0', '0', '미정의']];
        r.records.slice(0, Math.min(step, 2)).forEach((x, i) => rows.push([`key ${i + 1}${x.score === -Infinity ? ' 건너뜀' : ''}`, fmt(x.m), fmt(x.l), fmt(x.u), x.output === null ? '미정의' : fmt(x.output)]));
        html += table(['상태', '최댓값 m', '분모 l', '분자 u', '현재 u/l'], rows);
        if (step >= 2) html += equation('m′=max(m,x); l′=exp(m−m′)l+exp(x−m′); u′=exp(m−m′)u+exp(x−m′)v');
        if (step >= 3) html += r.probabilities ? equation(`일괄 확률=[${r.probabilities.map(x => fmt(x)).join(', ')}]; 가중합=${fmt(r.probabilities.reduce((s, a, i) => s + a * r.values[i], 0))}; 누적 출력=${fmt(r.output)}`) : note('모든 key가 차단되어 확률분포와 가중합이 정의되지 않습니다. 이 예제는 0/0 대신 null을 반환합니다. 실제 커널의 규약은 별도로 확인합니다.');
        return {html, explanation: p.mask === 'all' ? '모든 항을 건너뛰므로 l=0이며 유효한 정규화 결과가 없습니다. −∞−(−∞)를 계산하지 않도록 먼저 mask를 처리합니다.' : `공통 상수 ${Number(p.offset)}을 더해도 확률 비율은 같습니다. ${p.mask === 'first' ? '남은 key 하나의 Value 6이 출력입니다.' : '두 유효 key의 가중치는 [1/4,3/4]이고 출력은 5입니다.'} FlashAttention은 이 누적 원리를 타일로 확장해 큰 중간 행렬의 메모리 왕복을 줄이며 full attention의 쌍별 계산은 남습니다.`, metrics: [['처리 key 수', Math.min(step, 2)], ['최종 출력', step >= 3 ? r.output === null ? 'null (유효 key 없음)' : fmt(r.output) : '최종 단계에서 확인'], ['공통 offset', Number(p.offset)]]};
      },
      question: {prompt: '두 타일의 개별 출력 2와 6을 단순 평균하면 올바를까요?', options: ['그렇다. 출력은 4다', '아니다. 분모·최댓값을 함께 병합해야 한다', '타일마다 점수는 항상 같다'], answer: 1, explanation: '점수 [0,ln 3]의 가중치는 [1/4,3/4]이므로 올바른 출력은 5입니다. 타일별 정규화 출력을 단순 평균하면 정보가 사라집니다.'}
    }
  });

  // 새 계산을 첫 화면에 놓는다. 누적 입력은 접어 현재 단계의 변화가 가려지지 않게 한다.
  function topLevelViews(html) {
    const chunks = [], tokens = /<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g;
    const voidTag = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
    let depth = 0, start = 0, token;
    while ((token = tokens.exec(html))) {
      const tag = token[0];
      if (tag.startsWith('<!--')) continue;
      const name = /^<\/?([\w:-]+)/.exec(tag)?.[1];
      if (tag.startsWith('</')) depth--;
      else if (!tag.endsWith('/>') && !voidTag.test(name || '')) depth++;
      if (depth === 0) { chunks.push(html.slice(start, tokens.lastIndex)); start = tokens.lastIndex; }
    }
    if (html.slice(start).trim()) chunks.push(html.slice(start));
    return chunks;
  }
  const appliesAt = {
    'llm-gradient': {weight: 0, rate: 3}, 'llm-attention': {strength: 0, causal: 1},
    'llm-temperature': {temperature: 1, target: 0}, 'llm-rope': {query: 1, key: 1, shift: 3},
    'llm-lora': {width: 0, rank: 1}, 'llm-kv-cache': {tokens: 0, heads: 0, bytes: 2},
    'llm-loss-mask': {mode: 1}, 'llm-online-softmax': {offset: 0, mask: 0}
  };
  const pendingReason = {
    'llm-gradient': '학습률은 순전파나 현재 기울기를 바꾸지 않습니다. 4단계의 갱신량·새 손실에 적용합니다.',
    'llm-attention': 'Mask는 2단계부터 적용합니다. causal 행의 유효 key가 하나면 query 크기를 바꿔도 출력 [2,0]은 유지됩니다. Mask 없이 비교하면 가중치 변화가 보입니다.',
    'llm-temperature': '원시 logits [2,1,0]은 고정입니다. Temperature는 2단계의 z/T부터 적용하며 정답 선택은 4단계 CE를 바꿉니다.',
    'llm-rope': '1단계는 위치 없는 벡터입니다. 위치는 2단계부터, 공통 이동은 4단계의 실선 벡터에 적용합니다. 공통 회전에서 내적이 같은 것은 계산의 불변 성질입니다.',
    'llm-lora': 'Rank는 기반 W를 바꾸지 않습니다. 2단계에서 A·B 모양과 학습 대상 수를 확인합니다.',
    'llm-kv-cache': '저장 원소 수와 bytes를 구분합니다. 원소 저장 폭은 3단계의 payload 계산에 적용합니다.',
    'llm-loss-mask': '현재 정답 확률은 고정한 교육용 값입니다. 감독 위치 선택은 2단계부터 loss 포함 여부에 적용됩니다.',
    'llm-online-softmax': '공통 상수는 점수와 누적 최댓값을 바꾸지만 최종 확률·가중합은 유지합니다. Mask된 항은 어느 단계에서도 누적하지 않습니다.'
  };
  for (const [id, module] of Object.entries(window.LabModules)) {
    if (!id.startsWith('llm-') || !appliesAt[id]) continue;
    const calculate = module.compute;
    module.compute = function (p, step) {
      const s = Math.max(0, Math.min(module.steps.length - 1, Math.floor(Number(step) || 0)));
      const result = calculate(p, s), views = topLevelViews(result.html);
      const previous = s > 0 ? new Set(topLevelViews(calculate(p, s - 1).html)) : new Set();
      const current = views.filter(x => !previous.has(x)), earlier = views.filter(x => previous.has(x));
      const setting = module.controls.map(c => {
        const value = p[c.key] ?? module.defaults[c.key];
        const display = c.type === 'select' ? c.options.find(o => String(o.value) === String(value))?.label || c.options.find(o => String(o.value) === String(module.defaults[c.key]))?.label : fmt(Number.isFinite(Number(value)) ? Number(value) : Number(module.defaults[c.key]));
        const at = appliesAt[id][c.key];
        return `${c.label} ${display}${s < at ? ` (${at + 1}단계부터 계산에 적용)` : ''}`;
      }).join(' / ');
      const focus = current.length ? current.join('') : views.join('');
      result.html = `<div class="llm-stage-focus" data-stage-visual="${s}" style="border-left:4px solid #7048a4;padding-left:12px"><p><strong>현재 계산: ${esc(module.steps[s].title)}</strong></p>${focus}</div><p class="muted" data-control-readiness>${esc(setting)}</p><p class="muted">${esc(pendingReason[id])}</p>${earlier.length && current.length ? `<details><summary>앞 단계의 입력과 계산 다시 보기</summary>${earlier.join('')}</details>` : ''}`;
      return result;
    };
  }
})();
