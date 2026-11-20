// 「選音值」模式：看音節與漢字，從四個音值圖中選出正確的，送出後才播放音檔
//   kind 'single'：單音節本調
//   kind 'sandhi'：雙音節詞，前字變調、後字本調（變調音值 sd 由題庫提供，可人工修正）
(function () {
  'use strict';

  const {
    shuffle, TONES, TONE_BY_NUMBER, PITCH_NAME, acceptedPitches, pitchSvg, t, pitchLabel,
  } = window.LianTailo;

  const CITATIONS = TONES.map((t) => t.pitch);
  const SANDHI_PITCHES = ['33', '55', '53', '11', '550', '110', '330'];
  const FIRST_PITCHES = Array.from(new Set(SANDHI_PITCHES.concat(CITATIONS)));
  const CHOICE_KEYS = ['1', '2', '3', '4'];

  const citation = (tone) => TONE_BY_NUMBER[tone].pitch;
  const keyOf = (option) => option.join('-');
  const nameOf = (pitch) => pitchLabel(pitch);

  function singleOptions(item) {
    const tone = item.p[0][2];
    const correct = [citation(tone)];
    // 第八調的各腔調變體也算對，不能當錯誤選項
    const banned = new Set(acceptedPitches(tone));
    const others = shuffle(CITATIONS.filter((v) => !banned.has(v))).slice(0, 3).map((v) => [v]);
    return { correct, list: shuffle([correct].concat(others)) };
  }

  function sandhiOptions(item) {
    const tone1 = item.p[0][2];
    const tone2 = item.p[1][2];
    const first = item.sd;
    const second = citation(tone2);
    const correct = [first, second];

    // 也算正確的說法（泉腔 5→3、第八調各腔調）不能當錯誤選項
    const invalid = new Set();
    const firstOk = tone1 === 5 ? [first, '11'] : [first];
    firstOk.forEach((f) => acceptedPitches(tone2).forEach((s) => invalid.add(keyOf([f, s]))));

    const picks = [];
    const tryAdd = (option) => {
      const k = keyOf(option);
      if (invalid.has(k) || picks.some((p) => keyOf(p) === k)) return false;
      picks.push(option);
      return true;
    };
    tryAdd([citation(tone1), second]); // 忘了變調
    shuffle(FIRST_PITCHES).some((f) => tryAdd([f, second])); // 前字變錯
    shuffle(CITATIONS).some((s) => tryAdd([first, s])); // 後字錯
    for (let guard = 0; picks.length < 3 && guard < 200; guard++) {
      tryAdd([shuffle(FIRST_PITCHES)[0], shuffle(CITATIONS)[0]]);
    }
    return { correct, list: shuffle([correct].concat(picks.slice(0, 3))) };
  }

  function sandhiRuleText(item) {
    const [, final1, tone1] = item.p[0];
    let from = String(tone1);
    if (tone1 === 4 || tone1 === 8) from += final1.endsWith('h') ? 'h' : 'ptk';
    const named = PITCH_NAME[item.sd];
    const to = named === '高促' || named === '低促' || named === '中促' ? pitchLabel(item.sd) : (named || item.sd);
    return `${from} → ${to}`;
  }

  function create(options) {
    const kind = (options && options.kind) || 'single';
    let api = null;
    let item = null;
    let choices = [];
    let correctIndex = -1;
    let chosen = -1;

    function render(it) {
      item = it;
      chosen = -1;
      const built = kind === 'sandhi' ? sandhiOptions(it) : singleOptions(it);
      choices = built.list;
      correctIndex = choices.findIndex((c) => keyOf(c) === keyOf(built.correct));

      const grid = api.el.choiceGrid;
      grid.textContent = '';
      grid.classList.toggle('is-pair', kind === 'sandhi');
      choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice';
        btn.setAttribute('aria-label', t('pitch.choice', { n: i + 1 }));
        btn.innerHTML = pitchSvg(choice);
        btn.addEventListener('click', () => {
          if (api.isAnswered()) return;
          chosen = i;
          api.submit('choice');
        });
        grid.appendChild(btn);
      });
    }

    function refresh() {
      if (api.isAnswered()) return;
      if (kind === 'sandhi') {
        api.setStatus(t('pitch.status.word'));
        return;
      }
      if (item.p[0][2] === 8) api.setStatus(t('note.tone8'));
      else api.setStatus(t('pitch.status.one'));
    }

    function submit() {
      if (chosen < 0) return null;
      const ok = chosen === correctIndex;
      const answer = choices[chosen];
      const correct = choices[correctIndex];

      [...api.el.choiceGrid.children].forEach((btn, i) => {
        btn.disabled = true;
        btn.classList.toggle('is-correct', i === correctIndex);
        btn.classList.toggle('is-wrong', i === chosen && !ok);
      });

      let verdict = '';
      let meta;
      const notes = [];
      if (kind === 'single') {
        const tone = item.p[0][2];
        if (!ok) verdict = t('pitch.wrong');
        meta = t('tone.nth', { n: tone });
        if (tone === 8) notes.push(t('note.tone8'));
      } else {
        const [tone1, tone2] = [item.p[0][2], item.p[1][2]];
        if (!ok) {
          const firstOk = answer[0] === correct[0];
          const secondOk = answer[1] === correct[1];
          if (firstOk) verdict = t('pitch.wrong.second');
          else if (secondOk) verdict = answer[0] === citation(tone1) ? t('pitch.wrong.need') : t('pitch.wrong.first');
          else verdict = t('pitch.wrong.both');
        }
        if (item.ia) {
          meta = t('pitch.meta.aSandhi', { rule: sandhiRuleText(item) });
        } else {
          meta = t('pitch.meta.sandhi', { rule: sandhiRuleText(item), n: tone2 });
          if (tone1 === 5) notes.push(t('note.sandhi5'));
          if (tone2 === 8) notes.push(t('note.tone8'));
        }
      }
      if (notes.length) meta += `\n${notes.join('；')}`;

      return {
        ok,
        verdict,
        meta,
        answer: answer.map(nameOf).join(' + '),
        answerPitch: answer,
        expectPitch: correct,
      };
    }

    return {
      top: 'prompt',
      stage: 'choices',
      actions: [],
      mount(shellApi) { api = shellApi; },
      render,
      refresh,
      clear() {},
      onStroke() {},
      onKey(key) {
        const i = CHOICE_KEYS.indexOf(key);
        if (i < 0 || i >= choices.length) return false;
        chosen = i;
        api.submit('choice');
        return true;
      },
      submit,
    };
  }

  window.PitchChoiceMode = { create };
})();
