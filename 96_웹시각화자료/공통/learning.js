/* 공통 학습 엔진. 모듈 계산은 순수 함수이며 본문은 이 파일 없이도 읽을 수 있습니다. */
(function () {
  'use strict';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fmt = value => Number.isFinite(value) ? Number(value.toPrecision(7)).toLocaleString('ko-KR', {maximumFractionDigits: 7}) : '계산 범위 밖';
  const table = (headers, rows, caption = '') => '<div class="table-scroll" tabindex="0" role="region" aria-label="' + esc(caption || '계산 표') + '"><table>' + (caption ? '<caption>' + esc(caption) + '</caption>' : '') + '<thead><tr>' + headers.map(x => '<th scope="col">' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const matrix = (label, rows) => '<div class="matrix"><p><strong>' + esc(label) + '</strong></p>' + table(['행 / 열'].concat((rows[0] || []).map((_, i) => i + 1)), rows.map((r, i) => [i + 1].concat(r.map(x => typeof x === 'number' ? fmt(x) : x))), label) + '</div>';
  function bars(items, maximum = 1) {
    const max = Number.isFinite(Number(maximum)) && Number(maximum) > 0 ? Number(maximum) : 1;
    const negative = items.some(x => Number(x.value) < 0), min = negative ? -max : 0;
    const left = 190, width = 390, height = items.length * 48 + 64;
    const xpos = v => left + (v - min) / (max - min) * width;
    const zero = xpos(0), clipped = v => Math.max(min, Math.min(max, v));
    return '<svg class="lab-bars" viewBox="0 0 720 ' + height + '" role="img" aria-label="' + esc('고정 축 ' + min + '부터 ' + max + '. ' + items.map(x => x.label + ': ' + x.value).join(', ')) + '">' +
      '<line x1="' + zero + '" y1="8" x2="' + zero + '" y2="' + (height - 42) + '" stroke="currentColor"/>' + items.map((x, i) => {
        const val = Number(x.value), y = i * 48 + 16, end = xpos(clipped(Number.isFinite(val) ? val : 0));
        return '<text x="0" y="' + (y + 19) + '">' + esc(x.label) + '</text><rect x="' + Math.min(zero, end) + '" y="' + y + '" width="' + Math.abs(end - zero) + '" height="27" fill="var(--output)"/><text x="595" y="' + (y + 19) + '">' + esc(Number.isFinite(val) ? fmt(val) : '정의 안 됨') + (val > max || val < min ? ' (축 밖)' : '') + '</text>';
      }).join('') + '<text x="' + left + '" y="' + (height - 10) + '">' + esc(min) + '</text><text x="' + (left + width) + '" y="' + (height - 10) + '" text-anchor="end">' + esc(max) + '</text></svg>';
  }
  const instances = new Map();
  let active = null;
  let booted = false;
  const version = '1';
  const speeds = [0.5, 1, 2];
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function math(root) {
    if (!window.renderMathInElement || !root) return;
    window.renderMathInElement(root, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '\\[', right: '\\]', display: true}, {left: '\\(', right: '\\)', display: false}, {left: '$', right: '$', display: false}], throwOnError: false, trust: false, strict: 'warn', ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']});
  }
  function normalise(control, raw, fallback) {
    if (control.type === 'select') {
      const choices = (control.options || []).map(x => String(x.value));
      const value = String(raw);
      return choices.includes(value) ? {value, valid: true} : {value: String(fallback), valid: false};
    }
    const number = typeof raw === 'number' ? raw : (String(raw).trim() === '' ? NaN : Number(raw));
    const min = Number(control.min), max = Number(control.max), step = Number(control.step || 1);
    if (!Number.isFinite(number) || number < min || number > max) return {value: Number(fallback), valid: false};
    const snapped = min + Math.round((number - min) / step) * step;
    const tolerance = Math.max(1, Math.abs(number)) * 1e-8;
    if (Math.abs(snapped - number) > tolerance) return {value: Number(fallback), valid: false};
    return {value: Math.max(min, Math.min(max, Number(snapped.toPrecision(12)))), valid: true};
  }
  function validModule(module) {
    if (!module || typeof module.compute !== 'function' || !Array.isArray(module.steps) || !module.steps.length || !Array.isArray(module.controls)) return false;
    const keys = new Set();
    return module.controls.every(c => {
      if (!/^[a-zA-Z][\w-]*$/.test(c.key) || keys.has(c.key)) return false;
      keys.add(c.key);
      if (c.type === 'select') return Array.isArray(c.options) && c.options.length && c.options.some(x => String(x.value) === String(module.defaults[c.key]));
      return (c.type === 'range' || c.type === 'number') && Number.isFinite(Number(c.min)) && Number.isFinite(Number(c.max)) && Number(c.min) <= Number(c.max) && Number(c.step || 1) > 0 && normalise(c, module.defaults[c.key], c.min).valid;
    });
  }
  function readState(lab) {
    const query = new URL(window.location.href).searchParams, prefix = lab.id + '.';
    const state = {p: {...lab.module.defaults}, step: 0, speed: 1, baseline: null, choice: null, submitted: false, compare: true};
    let repaired = false;
    if (query.has(prefix + '_v') && query.get(prefix + '_v') !== version) return {state, repaired: true};
    for (const control of lab.module.controls) {
      if (!query.has(prefix + control.key)) continue;
      const item = normalise(control, query.get(prefix + control.key), lab.module.defaults[control.key]);
      state.p[control.key] = item.value;
      repaired = repaired || !item.valid;
    }
    if (query.has(prefix + '_step')) {
      const step = Number(query.get(prefix + '_step'));
      if (Number.isInteger(step) && step >= 0 && step < lab.module.steps.length) state.step = step;
      else repaired = true;
    }
    if (query.has(prefix + '_speed')) {
      const speed = Number(query.get(prefix + '_speed'));
      if (speeds.includes(speed)) state.speed = speed; else repaired = true;
    }
    if (query.has(prefix + '_base')) {
      try {
        const raw = query.get(prefix + '_base');
        if (raw.length > 12000) throw new Error('baseline size');
        const b = JSON.parse(raw);
        if (!b || !b.p || !Number.isInteger(b.step) || b.step < 0 || b.step >= lab.module.steps.length) throw new Error('baseline shape');
        const p = {...lab.module.defaults};
        for (const control of lab.module.controls) {
          if (!Object.prototype.hasOwnProperty.call(b.p, control.key)) throw new Error('baseline missing');
          const item = normalise(control, b.p[control.key], lab.module.defaults[control.key]);
          if (!item.valid) throw new Error('baseline range');
          p[control.key] = item.value;
        }
        state.baseline = {p, step: b.step};
      } catch (_) { repaired = true; }
    }
    if (query.has(prefix + '_quiz')) {
      const choice = Number(query.get(prefix + '_quiz'));
      if (lab.module.question && Number.isInteger(choice) && choice >= 0 && choice < lab.module.question.options.length) {state.choice = choice; state.submitted = true;}
      else repaired = true;
    }
    return {state, repaired};
  }
  function address(mode = 'push') {
    const url = new URL(window.location.href);
    for (const lab of instances.values()) {
      const prefix = lab.id + '.';
      [...url.searchParams.keys()].filter(k => k.startsWith(prefix)).forEach(k => url.searchParams.delete(k));
      url.searchParams.set(prefix + '_v', version);
      for (const control of lab.module.controls) url.searchParams.set(prefix + control.key, lab.state.p[control.key]);
      url.searchParams.set(prefix + '_step', lab.state.step);
      url.searchParams.set(prefix + '_speed', lab.state.speed);
      if (lab.state.baseline) url.searchParams.set(prefix + '_base', JSON.stringify(lab.state.baseline));
      if (lab.state.submitted && lab.state.choice !== null) url.searchParams.set(prefix + '_quiz', lab.state.choice);
    }
    url.searchParams.delete('reading');
    if (document.body.classList.contains('reading-mode')) url.searchParams.set('reading', '1');
    if (url.href === window.location.href) return;
    try {window.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', url);} catch (_) { /* file: 또는 제한된 history 환경에서도 학습은 계속합니다. */ }
  }
  function stop(lab) {
    if (!lab) return;
    window.clearTimeout(lab.timer);
    lab.timer = null;
    const button = lab.element.querySelector('[data-action="play"]');
    if (button) {button.textContent = '재생'; button.setAttribute('aria-pressed', 'false');}
    if (active === lab) active = null;
  }
  function focusLab(lab) {
    if (active && active !== lab) stop(active);
    document.querySelectorAll('.lab-shell.is-selected').forEach(x => x.classList.remove('is-selected'));
    lab.element.classList.add('is-selected');
  }
  function resultOf(lab, p, step) {
    const result = lab.module.compute({...p}, step);
    if (!result || typeof result.html !== 'string' || typeof result.explanation !== 'string' || !Array.isArray(result.metrics)) throw new Error('결과 계약');
    return result;
  }
  function difference(oldValue, value) {
    const numeric = x => {
      if (typeof x === 'number') return Number.isFinite(x) ? x : null;
      const text = String(x).replace(/,/g, '').trim();
      return /^[+−-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text.replace('−', '-')) : null;
    };
    const oldNumber = numeric(oldValue), number = numeric(value);
    if (oldNumber !== null && number !== null) {const d = number - oldNumber; return d === 0 ? '변화 없음 (0)' : (d > 0 ? '+' : '') + fmt(d);}
    return String(oldValue) === String(value) ? '변화 없음' : '값 변경';
  }
  function compare(lab, result) {
    const panel = lab.element.querySelector('.lab-comparison'), button = lab.element.querySelector('[data-action="compare"]');
    button.disabled = !lab.state.baseline;
    button.setAttribute('aria-expanded', String(!!lab.state.baseline && lab.state.compare));
    panel.hidden = !lab.state.baseline || !lab.state.compare;
    if (!lab.state.baseline) {panel.innerHTML = ''; return;}
    const b = lab.state.baseline, before = resultOf(lab, b.p, b.step);
    const old = new Map(before.metrics.map(row => [String(row[0]), row[1]])), now = new Map(result.metrics.map(row => [String(row[0]), row[1]]));
    const keys = [...new Set([...old.keys(), ...now.keys()])];
    const settings = lab.module.controls.map(c => c.label + ': ' + b.p[c.key] + ' → ' + lab.state.p[c.key]).join('; ');
    panel.innerHTML = '<h4>저장한 기준과 현재 결과</h4><p class="comparison-settings">' + esc(settings) + '</p><p>기준 단계 ' + (b.step + 1) + ' / 현재 단계 ' + (lab.state.step + 1) + '</p>' + table(['지표', '저장 기준', '현재', '변화 (현재 − 기준)'], keys.map(key => [key, old.has(key) ? old.get(key) : '해당 단계에 없음', now.has(key) ? now.get(key) : '해당 단계에 없음', old.has(key) && now.has(key) ? difference(old.get(key), now.get(key)) : '단계 표시 범위 변경']), '기준 대비 현재 계산값') + '<details><summary>기준 해설 다시 보기</summary><p>' + esc(before.explanation) + '</p></details><p><strong>현재 해설</strong> ' + esc(result.explanation) + '</p>';
    math(panel);
  }
  function quizFeedback(lab) {
    const question = lab.module.question, feedback = lab.element.querySelector('.quiz-feedback');
    if (!question || !feedback) return;
    const chosen = lab.state.choice;
    if (!lab.state.submitted || chosen === null) {feedback.textContent = ''; feedback.className = 'quiz-feedback'; return;}
    const correct = chosen === Number(question.answer);
    feedback.className = 'quiz-feedback ' + (correct ? 'is-correct' : 'is-incorrect');
    feedback.innerHTML = '<strong>' + (correct ? '정답입니다.' : '다시 살펴보세요.') + '</strong> 선택: ' + esc(question.options[chosen]) + '<br>' + esc(question.explanation);
    math(feedback);
  }
  function render(lab, announce = false) {
    const state = lab.state, module = lab.module;
    for (const control of module.controls) {
      const input = lab.element.querySelector('[data-param="' + control.key + '"]');
      input.value = state.p[control.key];
      const output = lab.element.querySelector('[data-value="' + control.key + '"]');
      if (output) output.textContent = typeof state.p[control.key] === 'number' ? fmt(state.p[control.key]) : state.p[control.key];
    }
    lab.element.querySelector('[data-action="speed"]').value = state.speed;
    const seek = lab.element.querySelector('[data-action="seek"]');
    if (seek) {
      seek.value = state.step;
      seek.setAttribute('aria-valuetext', (state.step + 1) + ' / ' + module.steps.length + ' · ' + module.steps[state.step].title);
      lab.element.querySelector('.lab-seek-value').textContent = (state.step + 1) + ' / ' + module.steps.length;
    }
    const inputSummary = lab.element.querySelector('.lab-input-summary');
    if (inputSummary) inputSummary.textContent = module.controls.map(c => {
      const option = c.type === 'select' && c.options.find(o => String(o.value) === String(state.p[c.key]));
      return c.label + ': ' + (option ? option.label : fmt(Number(state.p[c.key])));
    }).join(' · ');
    lab.element.querySelectorAll('[data-step]').forEach((button, index) => {
      button.setAttribute('aria-current', index === state.step ? 'step' : 'false');
      button.classList.toggle('is-current', index === state.step);
    });
    lab.element.querySelector('[data-action="prev"]').disabled = state.step === 0;
    lab.element.querySelector('[data-action="next"]').disabled = state.step === module.steps.length - 1;
    lab.element.querySelector('.lab-stage-title').textContent = (state.step + 1) + ' / ' + module.steps.length + ' · ' + module.steps[state.step].title;
    lab.element.querySelector('.lab-stage-question').textContent = module.steps[state.step].text || '';
    try {
      const result = resultOf(lab, state.p, state.step);
      lab.element.querySelector('.lab-visual').innerHTML = result.html;
      lab.element.querySelector('.lab-explanation').textContent = result.explanation;
      lab.element.querySelector('.lab-metrics').innerHTML = result.metrics.length ? '<dl>' + result.metrics.map(row => '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>').join('') + '</dl>' : '<p>이 단계는 입력과 구조를 확인합니다.</p>';
      compare(lab, result);
      math(lab.element.querySelector('.lab-visual'));
      math(lab.element.querySelector('.lab-explanation'));
    } catch (error) {
      stop(lab);
      lab.element.querySelector('.lab-visual').innerHTML = '<p class="lab-error">이 입력의 계산 결과를 표시하지 못했습니다. 초기화 후 다시 확인하세요. 아래 이론 본문은 계속 읽을 수 있습니다.</p>';
      lab.element.querySelector('.lab-explanation').textContent = '';
      lab.element.querySelector('.lab-metrics').textContent = '계산 결과 없음';
      lab.element.querySelector('.lab-comparison').hidden = true;
      if (window.console) console.error('Lab compute failed:', lab.id, error);
    }
    lab.element.querySelectorAll('input[type="radio"]').forEach(x => {x.checked = Number(x.value) === state.choice;});
    quizFeedback(lab);
    if (announce) lab.element.querySelector('.lab-announcement').textContent = module.steps[state.step].title + ' 단계로 이동했습니다.';
  }
  function schedule(lab) {
    stop(lab);
    active = lab;
    const button = lab.element.querySelector('[data-action="play"]');
    button.textContent = '정지'; button.setAttribute('aria-pressed', 'true');
    lab.timer = window.setTimeout(() => {
      if (document.hidden) {stop(lab); return;}
      if (lab.state.step >= lab.module.steps.length - 1) {stop(lab); return;}
      lab.state.step += 1; render(lab, true); address('replace');
      if (lab.state.step < lab.module.steps.length - 1) schedule(lab); else stop(lab);
    }, 2000 / lab.state.speed);
  }
  function controlsHTML(lab) {
    return lab.module.controls.map(c => {
      const id = lab.id + '-control-' + c.key;
      const field = c.type === 'select' ? '<select id="' + id + '" data-param="' + c.key + '">' + c.options.map(o => '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>').join('') + '</select>' : '<input id="' + id + '" data-param="' + c.key + '" type="' + (c.type === 'number' ? 'number' : 'range') + '" min="' + c.min + '" max="' + c.max + '" step="' + (c.step || 1) + '"><output for="' + id + '" data-value="' + c.key + '"></output>';
      return '<div class="lab-control"><label for="' + id + '">' + esc(c.label) + '</label>' + field + '</div>';
    }).join('');
  }
  function mount(element) {
    const id = element.dataset.lab, module = (window.LabModules || {})[id];
    if (instances.has(id) || !/^[\w-]+$/.test(id || '')) return;
    if (!validModule(module)) {
      element.classList.add('lab-unavailable');
      element.innerHTML = '<p>계산 실습을 불러오지 못했습니다. 이론 본문과 예제는 아래에서 확인할 수 있습니다.</p>';
      return;
    }
    const lab = {id, module, element, timer: null};
    const restored = readState(lab); lab.state = restored.state;
    element.classList.add('lab-shell'); element.id = 'lab-' + id;
    element.innerHTML = '<header class="lab-heading"><h3 id="' + id + '-title">' + esc(module.title) + '</h3><p>' + esc(module.intro || '') + '</p></header><p class="lab-notice" role="status">' + (restored.repaired ? '주소의 입력 범위나 버전을 확인할 수 없어 해당 값을 기본값으로 복구했습니다.' : '') + '</p><div class="lab-controls" aria-label="실습 입력">' + controlsHTML(lab) + '</div><ol class="lab-steps" aria-label="계산 순서">' + module.steps.map((s, i) => '<li><button type="button" data-step="' + i + '"><span>' + (i + 1) + '</span> ' + esc(s.title) + '</button></li>').join('') + '</ol><div class="lab-toolbar"><div class="lab-seek"><label for="' + id + '-seek">단계 이동</label><input id="' + id + '-seek" data-action="seek" type="range" min="0" max="' + (module.steps.length - 1) + '" step="1"><output class="lab-seek-value" for="' + id + '-seek"></output></div><button type="button" data-action="prev">이전 단계</button><button type="button" data-action="play" aria-pressed="false">재생</button><button type="button" data-action="next">다음 단계</button><label for="' + id + '-speed">재생 속도</label><select id="' + id + '-speed" data-action="speed"><option value="0.5">0.5배</option><option value="1">1배</option><option value="2">2배</option></select><button type="button" data-action="reset">초기화</button></div><div class="lab-workspace"><div class="lab-stage"><h4 class="lab-stage-title"></h4><p class="lab-stage-question"></p><div class="lab-visual"></div><p class="lab-explanation"></p></div><aside class="lab-status" aria-label="현재 계산 상태"><h4>현재 값</h4><div class="lab-metrics"></div></aside></div><div class="lab-toolbar comparison-toolbar"><button type="button" data-action="baseline">현재를 기준으로 저장</button><button type="button" data-action="compare" aria-expanded="false" aria-controls="' + id + '-comparison">전후 비교</button><button type="button" data-action="share">현재 주소 복사</button></div><section class="lab-comparison" id="' + id + '-comparison" hidden></section>' + (module.question ? '<form class="lab-quiz"><fieldset><legend>먼저 예측해 보세요</legend><p>' + esc(module.question.prompt) + '</p>' + module.question.options.map((option, index) => '<label><input type="radio" name="' + id + '-quiz" value="' + index + '"> ' + esc(option) + '</label>').join('') + '<button type="submit">예측 확인</button><div class="quiz-feedback" role="status" aria-live="polite"></div></fieldset></form>' : '') + '<p class="lab-announcement sr-only" role="status" aria-live="polite"></p>';
    element.setAttribute('aria-labelledby', id + '-title');
    const inputPanel = element.querySelector('.lab-controls');
    const inputDetails = document.createElement('details');
    inputDetails.className = 'lab-inputs';
    inputDetails.open = !(window.matchMedia && window.matchMedia('(max-width:700px)').matches);
    const inputSummary = document.createElement('summary');
    inputSummary.innerHTML = '입력 설정 <span class="lab-input-summary"></span>';
    inputPanel.before(inputDetails);
    inputDetails.append(inputSummary, inputPanel);
    instances.set(id, lab);
    element.addEventListener('focusin', () => focusLab(lab));
    element.addEventListener('input', event => {
      if (event.target.dataset.action === 'seek') {
        stop(lab); focusLab(lab);
        lab.state.step = Math.max(0, Math.min(module.steps.length - 1, Number(event.target.value)));
        render(lab, true); return;
      }
      const key = event.target.dataset.param;
      if (!key) return;
      stop(lab); focusLab(lab);
      const control = module.controls.find(c => c.key === key);
      lab.state.p[key] = normalise(control, event.target.value, module.defaults[key]).value;
      render(lab);
    });
    element.addEventListener('change', event => {
      if (event.target.dataset.action === 'seek') address();
      if (event.target.dataset.param) address();
      if (event.target.dataset.action === 'speed') {const playing = !!lab.timer; lab.state.speed = Number(event.target.value); if (playing) schedule(lab); address();}
      if (event.target.type === 'radio') {stop(lab); lab.state.choice = Number(event.target.value); lab.state.submitted = false; quizFeedback(lab);}
    });
    element.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      focusLab(lab);
      const action = button.dataset.action;
      if (button.hasAttribute('data-step')) {stop(lab); lab.state.step = Number(button.dataset.step); render(lab, true); address(); return;}
      if (!action) return;
      if (action === 'play') {
        if (lab.timer) {stop(lab); return;}
        if (reduced()) lab.element.querySelector('.lab-notice').textContent = '동작 줄이기 설정에 따라 전환 효과 없이 단계별로 재생합니다. 정지 버튼으로 멈출 수 있습니다.';
        if (lab.state.step === module.steps.length - 1) {lab.state.step = 0; render(lab);}
        address(); schedule(lab); return;
      }
      if (action !== 'share') stop(lab);
      if (action === 'prev') lab.state.step = Math.max(0, lab.state.step - 1);
      if (action === 'next') lab.state.step = Math.min(module.steps.length - 1, lab.state.step + 1);
      if (action === 'reset') {lab.state = {p: {...module.defaults}, step: 0, speed: 1, baseline: null, choice: null, submitted: false, compare: true}; lab.element.querySelector('.lab-notice').textContent = '기본 입력과 첫 단계로 돌아왔습니다.';}
      if (action === 'baseline') {lab.state.baseline = {p: {...lab.state.p}, step: lab.state.step}; lab.state.compare = true; lab.element.querySelector('.lab-notice').textContent = '현재 입력과 단계를 비교 기준으로 저장했습니다. 입력을 바꾸어 차이를 확인하세요.';}
      if (action === 'compare') lab.state.compare = !lab.state.compare;
      if (action === 'share') {
        address('replace');
        try {await navigator.clipboard.writeText(window.location.href); lab.element.querySelector('.lab-notice').textContent = '현재 입력·단계·비교 기준이 담긴 주소를 복사했습니다.';}
        catch (_) {lab.element.querySelector('.lab-notice').textContent = '주소 표시줄의 현재 주소를 복사하면 입력과 비교 기준을 다시 열 수 있습니다.';}
        return;
      }
      render(lab, action === 'prev' || action === 'next'); address();
    });
    const quiz = element.querySelector('.lab-quiz');
    if (quiz) quiz.addEventListener('submit', event => {
      event.preventDefault(); stop(lab);
      if (lab.state.choice === null) {element.querySelector('.quiz-feedback').textContent = '선택지를 먼저 고르세요.'; return;}
      lab.state.submitted = true; quizFeedback(lab); address();
    });
    render(lab);
  }
  function reading(value, save = true) {
    document.body.classList.toggle('reading-mode', value);
    document.querySelectorAll('[data-reading]').forEach(b => {b.setAttribute('aria-pressed', String(value)); b.textContent = value ? '실습 조작 펼치기' : '읽기 모드';});
    if (value) instances.forEach(stop);
    if (save) address();
  }
  function restore() {
    instances.forEach(lab => {stop(lab); const restored = readState(lab); lab.state = restored.state; lab.element.querySelector('.lab-notice').textContent = restored.repaired ? '주소의 올바르지 않은 값을 기본값으로 복구했습니다.' : ''; render(lab);});
    reading(new URL(window.location.href).searchParams.get('reading') === '1', false);
  }
  function mountAll() {document.querySelectorAll('[data-lab]').forEach(mount);}
  function boot() {
    if (booted) return; booted = true;
    document.documentElement.classList.add('js');
    mountAll(); math(document.querySelector('.source-content'));
    reading(new URL(window.location.href).searchParams.get('reading') === '1', false);
    document.querySelectorAll('[data-reading]').forEach(b => b.addEventListener('click', () => reading(!document.body.classList.contains('reading-mode'))));
    const sidebar = document.querySelector('.course-nav'), toggle = document.querySelector('[data-nav-toggle]');
    if (sidebar && toggle) toggle.addEventListener('click', () => {const open = !sidebar.classList.contains('is-open'); sidebar.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open));});
    document.querySelectorAll('[data-chapter-search]').forEach(input => input.addEventListener('input', () => {
      const query = input.value.trim().toLocaleLowerCase('ko');
      document.querySelectorAll('[data-chapter-row]').forEach(row => {row.hidden = !row.textContent.toLocaleLowerCase('ko').includes(query);});
    }));
    document.addEventListener('visibilitychange', () => {if (document.hidden) instances.forEach(stop);});
    window.addEventListener('popstate', restore); window.addEventListener('hashchange', restore);
    window.addEventListener('labmodulesready', mountAll);
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-image-zoom]');
      if (!trigger) return;
      const image = document.getElementById(trigger.dataset.imageZoom), dialog = document.querySelector('#image-dialog');
      if (!image || !dialog || typeof dialog.showModal !== 'function') return;
      const clone = image.cloneNode(true); clone.removeAttribute('id'); clone.removeAttribute('loading');
      dialog.querySelector('.dialog-image').replaceChildren(clone);
      dialog.querySelector('.dialog-caption').textContent = image.alt || image.title || '확대한 그림';
      dialog.querySelector('.dialog-original').href = image.src;
      dialog.showModal();
    });
    const dialog = document.querySelector('#image-dialog');
    if (dialog) {dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close()); dialog.addEventListener('click', event => {if (event.target === dialog) dialog.close();});}
    let printDetails = [];
    window.addEventListener('beforeprint', () => {instances.forEach(stop); printDetails = [...document.querySelectorAll('.source-content details')].map(d => [d, d.open]); printDetails.forEach(([d]) => {d.open = true;});});
    window.addEventListener('afterprint', () => {printDetails.forEach(([d, wasOpen]) => {d.open = wasOpen;});});
  }
  window.LabKit = Object.assign(window.LabKit || {}, {escape: esc, table, matrix, bars, mountAll, version, normalise});
  // defer 실행 중에는 readyState가 interactive이지만 뒤의 분야 script는 아직 실행 전일 수 있다.
  if (document.readyState !== 'complete') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
    window.addEventListener('load', boot, {once: true});
  } else boot();
})();
