// 練習單元共用外殼：出題流程、畫筆捕捉、音檔、作答回饋、結果、簿仔紙、聲調說明（help.js）
//
// 各單元以「模式」掛上來，模式物件需提供：
//   top: 'listen'（先聽音檔再作答）或 'prompt'（先看音節與漢字，作答後才播放）
//   stage: 'svg'（畫在 SVG 上）、'choices'（選擇題）或 'type'（文字輸入）
//   actions: 作答按鈕 [{ action, label, style }]，action 為 clear / submit；選擇題可留空
//   mount(api)、render(item)、refresh()、clear()、onStroke(stroke)
//   submit(action) → null（不能送出）或 { ok, verdict, meta, answer, expect, answerPitch, expectPitch }
(function () {
  'use strict';

  const {
    audioUrl, shuffle, mistakes, pitchCompare, t,
  } = window.LianTailo;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MIN_STROKE = 14;

  const ICON_BACK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>';
  const ICON_HELP = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.2h.01"/></svg>';
  const ICON_SPEAKER = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const ICON_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function pathLength(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return len;
  }

  function topMarkup(mode) {
    if (mode.top === 'prompt') {
      return `
        <div class="prompt">
          <p class="prompt-word"><span id="promptRoman"></span><span class="hanji" id="promptHanji"></span></p>
          <button class="play-btn is-small" id="playBtn" type="button" aria-label="${t('action.play')}" disabled>${ICON_SPEAKER}</button>
        </div>`;
    }
    return `
      <div class="play-wrap">
        <button class="play-btn" id="playBtn" type="button" aria-label="${t('action.play')}">${ICON_SPEAKER}</button>
        <span class="play-hanji" id="hintHanji" hidden></span>
      </div>`;
  }

  function template(cfg, mode) {
    // 選擇題沒有作答按鈕，仍保留同高的空列，作答後「下一題」才不會讓版面跳動
    const actions = mode.actions.length
      ? mode.actions.map((a) => `
        <button class="btn btn-${a.style}" type="button" data-action="${a.action}"${a.action === 'submit' ? ' id="submitBtn" disabled' : ''}>${a.label}</button>`).join('')
      : '<span class="btn btn-placeholder" aria-hidden="true"></span>';
    const stage = mode.stage === 'choices'
      ? '<div class="stage card is-choices" id="stage"><div class="choice-grid" id="choiceGrid"></div></div>'
      : mode.stage === 'type'
        ? `<div class="stage card is-type" id="stage"><input class="type-input" id="typeInput" type="text" inputmode="text" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="${t('aria.type')}"></div>`
        : `<div class="stage card" id="stage"><svg id="stageSvg" xmlns="http://www.w3.org/2000/svg" aria-label="${t('aria.stage')}"></svg></div>`;
    return `
    <div class="app">
      <header class="topbar">
        <a class="icon-btn" href="../" aria-label="${t('nav.home')}">${ICON_BACK}</a>
        <h1 class="topbar-title">${cfg.title}</h1>
        <button class="icon-btn" id="helpBtn" type="button" aria-label="${t('nav.help')}">${ICON_HELP}</button>
      </header>

      <section class="view" id="quizView">
        <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
        <div class="quiz-meta"><span id="progressText"></span><span id="scoreText"></span></div>
        ${topMarkup(mode)}
        ${stage}
        <div class="feedback">
          <p class="status" id="status"></p>
          <div class="answer card" id="answerPanel" hidden>
            <p class="answer-verdict" id="answerVerdict"></p>
            <p class="answer-word" id="answerWord"></p>
            <p class="answer-meta" id="answerMeta"></p>
            <div class="answer-audio" id="answerAudio" hidden></div>
          </div>
        </div>
        <div class="actions" id="drawActions">${actions}</div>
        <div class="actions" id="nextActions" hidden>
          <button class="btn btn-primary btn-block" id="nextBtn" type="button">${t('action.next')}</button>
        </div>
      </section>

      <section class="view" id="resultView" hidden>
        <div class="result-hero">
          <div class="result-score" id="resultScore"></div>
          <div class="result-text" id="resultText"></div>
        </div>
        <div class="review-wrap" id="reviewWrap">
          <p class="review-title">${t('quiz.review.title')}</p>
          <ul class="review-list card" id="reviewList"></ul>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary btn-block" id="againBtn" type="button">${t('action.again')}</button>
          <a class="btn btn-ghost btn-block" href="../">${t('nav.home')}</a>
        </div>
      </section>
    </div>

    <div class="help-screen" id="helpSheet" hidden>
      <div class="help-frame" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
        <header class="topbar">
          <span class="icon-btn" aria-hidden="true"></span>
          <h2 class="topbar-title" id="helpTitle">${t('nav.help')}</h2>
          <button class="icon-btn" id="helpClose" type="button" aria-label="${t('nav.back')}">${ICON_BACK}</button>
        </header>
        ${window.LianTailo.help.tabsMarkup()}
        <div class="help-body">${window.LianTailo.help.panelsMarkup()}
        </div>
      </div>
    </div>`;
  }

  function create(cfg, mode) {
    const userSettings = window.LianTailo.settings.get();
    const config = Object.assign({ poolSize: 300 }, cfg, { count: userSettings.count });
    const DATA = config.data || [];
    const mistakesOnly = new URLSearchParams(window.location.search).get('practice') === 'mistakes';

    document.title = t('page.doc', { title: config.title, brand: t('brand.short') });
    document.body.insertAdjacentHTML('afterbegin', template(config, mode));
    const $ = (id) => document.getElementById(id);
    const el = {};
    ['helpBtn', 'quizView', 'resultView', 'progressBar', 'progressText', 'scoreText', 'playBtn', 'stage',
      'status', 'answerPanel', 'answerVerdict', 'answerWord', 'answerMeta', 'answerAudio', 'drawActions', 'nextActions',
      'submitBtn', 'nextBtn', 'resultScore', 'resultText', 'reviewWrap', 'reviewList', 'againBtn',
      'helpSheet', 'helpClose', 'promptRoman', 'promptHanji', 'hintHanji', 'choiceGrid', 'typeInput'].forEach((id) => { el[id] = $(id); });
    el.svg = $('stageSvg');

    const state = {
      view: 'quiz',
      items: [],
      index: 0,
      score: 0,
      wrong: [],
      item: null,
      inkLayer: null,
      active: null,
      activePointer: null,
      answered: false,
      needsTap: false,
      preload: null,
    };

    const audio = new Audio();
    audio.preload = 'auto';
    let audioName = '';

    function showView(name) {
      state.view = name;
      el.quizView.hidden = name !== 'quiz';
      el.resultView.hidden = name !== 'result';
    }

    function setStatus(text, warn) {
      if (state.needsTap && !warn && !state.answered && mode.top === 'listen') text = t('quiz.tap');
      el.status.textContent = text;
      el.status.classList.toggle('is-warn', !!warn);
    }

    function play(fileName) {
      if (!fileName) return;
      if (audioName !== fileName) {
        audioName = fileName;
        audio.src = mediaUrl(fileName);
      }
      try { audio.currentTime = 0; } catch (e) { /* 尚未載入 metadata */ }
      const p = audio.play();
      if (p && p.catch) {
        p.catch((err) => {
          // 剛進頁面時瀏覽器不允許自動播放，要等使用者點一下
          if (err && err.name === 'NotAllowedError') {
            state.needsTap = true;
            el.playBtn.classList.add('is-waiting');
            if (state.view === 'quiz' && !state.answered) mode.refresh();
          }
        });
      }
    }

    function mediaUrl(fileName) {
      if (/^(https?:|\.\.|\/)/.test(fileName)) return fileName;
      return audioUrl(fileName);
    }

    function preload(fileName) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = mediaUrl(fileName);
      state.preload = a;
    }

    const api = {
      el,
      svgEl,
      setStatus,
      setSubmitEnabled(enabled) { if (el.submitBtn) el.submitBtn.disabled = !enabled; },
      isAnswered: () => state.answered,
      submit: (action) => submit(action),
      play,
      pauseAudio() { audio.pause(); },
      clearInk() { if (state.inkLayer) state.inkLayer.textContent = ''; },
    };

    // ---------- 出題 ----------

    // 本單元答錯過、之後還沒答對的題目。簿仔紙只存音檔檔名，題目內容從題庫補回
    function unreviewedItems() {
      const byAudio = new Map();
      DATA.forEach((d) => {
        if (!byAudio.has(d.a)) byAudio.set(d.a, d);
      });
      const seen = new Set();
      const items = [];
      mistakes.list().forEach((m) => {
        if (m.unit !== config.unit || m.fixedAt) return;
        const item = byAudio.get(m.a);
        if (!item || seen.has(m.a)) return;
        seen.add(m.a);
        items.push(item);
      });
      return items;
    }

    // 有 groupBy 時各組（聲調、變調規則）各取詞頻前 poolPerGroup 個，再輪流從各組抽題，讓每組出現的機會平均
    function pickFresh(n, skip) {
      if (n <= 0) return [];
      if (!config.groupBy) {
        return shuffle(DATA.slice(0, config.poolSize).filter((d) => !skip.has(d.a))).slice(0, n);
      }
      const groups = new Map();
      DATA.forEach((d) => {
        if (skip.has(d.a)) return;
        const key = config.groupBy(d);
        if (key == null) return;
        if (!groups.has(key)) groups.set(key, []);
        const g = groups.get(key);
        if (g.length < config.poolPerGroup) g.push(d);
      });
      const pools = Array.from(groups.values()).map(shuffle);
      const items = [];
      while (items.length < n && pools.some((p) => p.length)) {
        for (const p of shuffle(pools)) {
          if (items.length >= n) break;
          if (p.length) items.push(p.pop());
        }
      }
      return items;
    }

    // 每輪最多一半題目用來複習尚未答對的錯題，其餘照原規則抽新題
    function pickItems() {
      if (mistakesOnly) {
        const byAudio = new Map();
        DATA.forEach((item) => { if (!byAudio.has(item.a)) byAudio.set(item.a, item); });
        const seen = new Set();
        return shuffle(mistakes.list().filter((m) => m.unit === config.unit && !seen.has(m.a) && seen.add(m.a))
          .map((m) => byAudio.get(m.a)).filter(Boolean));
      }
      const dueCap = Math.min(config.count, Math.max(1, Math.floor(config.count / 2)));
      const review = shuffle(unreviewedItems()).slice(0, dueCap);
      const skip = new Set(review.map((d) => d.a));
      return shuffle(review.concat(pickFresh(config.count - review.length, skip)));
    }

    function startSession() {
      state.items = pickItems();
      state.index = 0;
      state.score = 0;
      state.wrong = [];
      showView('quiz');
      if (!state.items.length && mistakesOnly) {
        el.progressBar.style.width = '0';
        el.progressText.textContent = '';
        el.scoreText.textContent = '';
        el.playBtn.disabled = true;
        const top = el.playBtn.closest('.play-wrap, .prompt');
        if (top) top.hidden = true;
        el.stage.hidden = true;
        el.status.hidden = false;
        setStatus(t('mistakes.practice.empty'));
        el.answerPanel.hidden = true;
        el.drawActions.hidden = true;
        el.nextActions.hidden = true;
        return;
      }
      el.stage.hidden = false;
      const top = el.playBtn.closest('.play-wrap, .prompt');
      if (top) top.hidden = false;
      el.playBtn.disabled = false;
      renderQuestion();
    }

    function layoutStage(item) {
      if (!el.svg) {
        mode.render(item);
        return;
      }
      el.svg.textContent = '';
      mode.render(item);
      state.inkLayer = svgEl('g', {});
      el.svg.appendChild(state.inkLayer);
    }

    function renderQuestion() {
      const item = state.items[state.index];
      state.item = item;
      state.active = null;
      state.activePointer = null;
      state.answered = false;

      el.stage.classList.remove('is-correct', 'is-wrong');
      el.status.hidden = false;
      el.answerPanel.hidden = true;
      el.drawActions.hidden = false;
      el.nextActions.hidden = true;
      const showHanji = userSettings.showHanji;
      if (mode.top === 'prompt') {
        el.promptRoman.textContent = item.s;
        el.promptHanji.textContent = item.h;
        el.promptHanji.hidden = !showHanji;
        el.promptRoman.parentElement.classList.toggle('is-long', item.s.length + (showHanji ? item.h.length * 2 : 0) > 12);
        el.playBtn.disabled = true;
      } else {
        el.hintHanji.textContent = item.h;
        el.hintHanji.hidden = !showHanji;
      }

      layoutStage(item);
      mode.refresh();
      // 畫聲調會依字母寬度排版。芫荽晚到的話，用系統字量到的位置會偏，字型到了再排一次
      if (el.svg && document.fonts && !document.fonts.check('100px "Iansui"')) {
        document.fonts.load('100px "Iansui"').then(() => {
          if (state.item !== item || state.answered || state.active) return;
          if (state.inkLayer && state.inkLayer.childNodes.length) return;
          layoutStage(item);
        }).catch(() => {});
      }
      updateProgress();

      if (mode.top === 'listen') play(item.a);
      const next = state.items[state.index + 1];
      if (next) preload(next.a);
    }

    function updateProgress() {
      const n = state.items.length;
      const done = state.index + (state.answered ? 1 : 0);
      el.progressBar.style.width = `${(done / n) * 100}%`;
      el.progressText.textContent = t('quiz.progress', { i: state.index + 1, n });
      el.scoreText.textContent = t('quiz.score', { n: state.score });
    }

    // ---------- 畫筆 ----------

    function toSvgPoint(e) {
      const pt = el.svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const p = pt.matrixTransform(el.svg.getScreenCTM().inverse());
      return { x: p.x, y: p.y };
    }

    function strokeD(pts) {
      return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    }

    function endStroke(e) {
      if (e.pointerId !== state.activePointer) return;
      state.activePointer = null;
      const stroke = state.active;
      state.active = null;
      if (!stroke) return;
      if (pathLength(stroke.pts) < MIN_STROKE) stroke.node.remove();
      else mode.onStroke(stroke);
      mode.refresh();
    }

    if (el.svg) {
      el.svg.addEventListener('pointerdown', (e) => {
        if (state.view !== 'quiz' || state.answered || state.activePointer !== null) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        try { el.svg.setPointerCapture(e.pointerId); } catch (err) { /* 指標已失效 */ }
        state.activePointer = e.pointerId;
        const node = svgEl('path', { class: 'ink' });
        state.inkLayer.appendChild(node);
        state.active = { pts: [toSvgPoint(e)], node };
        node.setAttribute('d', strokeD(state.active.pts));
      });

      el.svg.addEventListener('pointermove', (e) => {
        if (e.pointerId !== state.activePointer || !state.active) return;
        e.preventDefault();
        const events = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
        (events.length ? events : [e]).forEach((ev) => state.active.pts.push(toSvgPoint(ev)));
        state.active.node.setAttribute('d', strokeD(state.active.pts));
      });

      el.svg.addEventListener('pointerup', endStroke);
      el.svg.addEventListener('pointercancel', endStroke);
    }

    // ---------- 作答 ----------

    function submit(action) {
      if (state.view !== 'quiz' || state.answered) return;
      const item = state.item;
      const r = mode.submit(action);
      if (!r) return;

      state.answered = true;
      const detail = { answer: r.answer, expect: r.expect, answerPitch: r.answerPitch, expectPitch: r.expectPitch };
      if (r.ok) {
        state.score++;
        mistakes.markCorrect(config.unit, item);
      } else {
        state.wrong.push(Object.assign({ item }, detail));
        mistakes.record(config.unit, item, detail);
      }

      el.stage.classList.add(r.ok ? 'is-correct' : 'is-wrong');
      el.answerVerdict.textContent = r.ok ? t('quiz.correct') : r.verdict;
      el.answerVerdict.className = `answer-verdict ${r.ok ? 'is-correct' : 'is-wrong'}`;
      el.answerWord.textContent = item.s;
      const hanji = document.createElement('span');
      hanji.className = 'hanji';
      hanji.textContent = item.h;
      el.answerWord.append(hanji);
      el.answerMeta.textContent = r.meta;
      el.answerAudio.textContent = '';
      el.answerAudio.hidden = true;
      if (r.audioParts && r.audioParts.some((part) => part.file)) {
        r.audioParts.forEach((part) => {
          const syllable = document.createElement('span');
          syllable.className = 'answer-audio-syllable';
          const text = document.createElement('span');
          text.textContent = part.text;
          syllable.append(text);
          if (part.file) {
            const button = document.createElement('button');
            button.className = 'answer-audio-play';
            button.type = 'button';
            button.setAttribute('aria-label', t('action.play.this'));
            button.innerHTML = ICON_SPEAKER.replace('<svg ', '<svg aria-hidden="true" ');
            button.addEventListener('click', () => play(part.file));
            syllable.append(button);
          }
          el.answerAudio.append(syllable);
        });
        el.answerAudio.hidden = false;
      }

      el.status.hidden = true;
      el.answerPanel.hidden = false;
      el.drawActions.hidden = true;
      el.nextActions.hidden = false;
      updateProgress();
      if (mode.top === 'prompt') {
        el.playBtn.disabled = false;
        play(item.a);
      } else if (!r.ok) {
        play(item.a);
      }
    }

    function nextQuestion() {
      if (!state.answered) return;
      state.index++;
      if (state.index >= state.items.length) showResult();
      else renderQuestion();
    }

    // ---------- 結果 ----------

    function showResult() {
      const n = state.items.length;
      const rate = state.score / n;
      el.resultScore.textContent = String(state.score);
      const total = document.createElement('small');
      total.textContent = ` / ${n}`;
      el.resultScore.append(total);
      el.resultText.textContent =
        rate === 1 ? t('quiz.result.perfect')
          : rate >= 0.8 ? t('quiz.result.great')
            : rate >= 0.5 ? t('quiz.result.ok')
              : t('quiz.result.more');

      el.reviewList.textContent = '';
      el.reviewWrap.hidden = state.wrong.length === 0;
      state.wrong.forEach((w) => {
        const li = document.createElement('li');
        li.className = 'review-item';
        li.innerHTML = `
          <span class="review-hanji"></span>
          <div class="review-body">
            <div class="review-answer"></div>
            ${w.expectPitch ? pitchCompare(w.expectPitch, w.answerPitch) : '<div class="review-yours"></div>'}
          </div>
          <button class="mini-play" type="button" aria-label="${t('action.play.short')}">${ICON_PLAY}</button>`;
        li.querySelector('.review-hanji').textContent = w.item.h;
        li.querySelector('.review-answer').textContent = w.item.s;
        const yours = li.querySelector('.review-yours');
        if (yours) yours.textContent = t('quiz.yours', { answer: w.answer });
        li.querySelector('.mini-play').addEventListener('click', () => play(w.item.a));
        el.reviewList.appendChild(li);
      });

      el.progressBar.style.width = '100%';
      showView('result');
    }

    // ---------- 說明面板（內容見 help.js） ----------

    const openHelp = () => { el.helpSheet.hidden = false; };
    const closeHelp = () => { el.helpSheet.hidden = true; };

    // ---------- 事件 ----------

    audio.addEventListener('playing', () => {
      el.playBtn.classList.add('is-playing');
      if (!state.needsTap) return;
      state.needsTap = false;
      el.playBtn.classList.remove('is-waiting');
      if (state.view === 'quiz' && !state.answered) mode.refresh();
    });
    ['pause', 'ended', 'error'].forEach((ev) => {
      audio.addEventListener(ev, () => el.playBtn.classList.remove('is-playing'));
    });
    audio.addEventListener('error', () => {
      if (state.view === 'quiz' && (mode.top === 'listen' ? !state.answered : state.answered)) {
        el.status.hidden = false;
        setStatus(t('quiz.audio.fail'), true);
      }
    });

    // 自動播放被擋時，使用者第一次碰觸畫面就補播
    function resumeAfterGesture(e) {
      if (!state.needsTap || state.view !== 'quiz' || !state.item) return;
      if (e.target.closest && e.target.closest('#playBtn')) return;
      play(state.item.a);
    }
    document.addEventListener('pointerup', resumeAfterGesture, true);
    document.addEventListener('keydown', resumeAfterGesture, true);

    function clearDrawing() {
      api.clearInk();
      mode.clear();
      mode.refresh();
    }

    el.drawActions.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || state.answered) return;
      if (btn.dataset.action === 'clear') clearDrawing();
      else submit(btn.dataset.action);
    });
    el.playBtn.addEventListener('click', () => state.item && play(state.item.a));
    el.nextBtn.addEventListener('click', nextQuestion);
    el.againBtn.addEventListener('click', startSession);
    el.helpBtn.addEventListener('click', openHelp);
    el.helpClose.addEventListener('click', closeHelp);

    document.addEventListener('keydown', (e) => {
      if (!el.helpSheet.hidden) {
        if (e.key === 'Escape') closeHelp();
        return;
      }
      if (state.view !== 'quiz') return;
      const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
      if (e.key === ' ' && !typing) {
        e.preventDefault();
        if (state.item && !el.playBtn.disabled) play(state.item.a);
      } else if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (state.answered) nextQuestion();
        else if (el.submitBtn && !el.submitBtn.disabled) submit('submit');
      } else if (!state.answered && mode.onKey && mode.onKey(e.key)) {
        e.preventDefault();
      } else if (!state.answered && el.svg && (e.key === 'Backspace' || e.key === 'Escape')) {
        clearDrawing();
      }
    });

    mode.mount(api);
    window.LianTailo.help.build(el.helpSheet, play);
    startSession();
  }

  window.QuizShell = { create, svgEl };
})();
