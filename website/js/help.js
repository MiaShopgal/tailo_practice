// 教材：聲調、調符的位置、變調規則、仔前變調。
// 首頁「教材」分頁與練習頁右上角的說明面板共用同一份內容。
(function () {
  'use strict';

  const {
    audioUrl, TONES, TONE_BY_NUMBER, SANDHI_RULES, A_SANDHI_RULES,
    miniPitchSvg, sandhiChartSvg, t, sandhiNote,
  } = window.LianTailo;

  function tabsMarkup(cls) {
    return `
      <div class="segmented help-tabs${cls ? ' ' + cls : ''}" role="tablist" aria-label="${t('aria.help.tabs')}">
        <button type="button" role="tab" id="helpTabTone" aria-controls="helpPanelTone" aria-selected="true" class="is-active">${t('help.tab.tone')}</button>
        <button type="button" role="tab" id="helpTabMark" aria-controls="helpPanelMark" aria-selected="false">${t('help.tab.mark')}</button>
        <button type="button" role="tab" id="helpTabSandhi" aria-controls="helpPanelSandhi" aria-selected="false">${t('help.tab.sandhi')}</button>
        <button type="button" role="tab" id="helpTabASandhi" aria-controls="helpPanelASandhi" aria-selected="false">${t('help.tab.aSandhi')}</button>
      </div>`;
  }

  function panelsMarkup() {
    return `
      <div id="helpPanelTone" role="tabpanel" aria-labelledby="helpTabTone">
        <div class="tone-grid" id="toneTable"></div>
        <p class="sheet-text">${t('help.tone.lead', { note: t('note.tone8') })}</p>
      </div>
      <div id="helpPanelMark" role="tabpanel" aria-labelledby="helpTabMark" hidden>
        <section class="mark-block">
          <h3>${t('help.mark.h1')}</h3>
          <p class="sheet-text">${t('help.mark.p1')}</p>
          <ul class="mark-order">
            <li><span class="roman">oo</span><span class="mark-ex">koo → kóo</span></li>
            <li><span class="roman">ng</span><span class="mark-ex">ng → ńg</span></li>
            <li><span class="roman">m</span><span class="mark-ex">m → ḿ</span></li>
          </ul>
        </section>
        <section class="mark-block">
          <h3>${t('help.mark.h2')}</h3>
          <p class="sheet-text">${t('help.mark.p2')}</p>
          <ol class="mark-order">
            <li><span class="mark-key roman">a</span><span class="mark-ex">ai → ái、au → áu、ia → iá、ua → uá、iau → iáu</span></li>
            <li><span class="mark-key"><span class="roman">o</span>、<span class="roman">e</span></span><span class="mark-ex">io → ió、ue → ué</span></li>
            <li><span class="mark-key"><span class="roman">i</span>、<span class="roman">u</span></span><span class="mark-ex">ki → kí、ku → kú</span></li>
          </ol>
        </section>
        <section class="mark-block">
          <h3>${t('help.mark.h3')}</h3>
          <p class="sheet-text">${t('help.mark.p3')}</p>
          <ul class="mark-order">
            <li><span class="roman">iu</span><span class="mark-ex">kiu → kiú</span></li>
            <li><span class="roman">ui</span><span class="mark-ex">kui → kuí</span></li>
          </ul>
        </section>
        <p class="sheet-text">${t('help.mark.plain')}</p>
      </div>
      <div id="helpPanelSandhi" role="tabpanel" aria-labelledby="helpTabSandhi" hidden>
        <div class="sandhi-chart-wrap card" id="sandhiChart"></div>
        <p class="sheet-text">${t('help.sandhi.lead')}</p>
        <div class="sandhi-table card" id="sandhiTable"></div>
        <p class="sheet-text">${t('help.sandhi.tail')}</p>
      </div>
      <div id="helpPanelASandhi" role="tabpanel" aria-labelledby="helpTabASandhi" hidden>
        <p class="sheet-text is-first">${t('help.aSandhi.lead')}</p>
        <div class="sandhi-table card" id="aSandhiTable"></div>
      </div>`;
  }

  function pitchText(value) {
    return String(value).replace(/0$/, '');
  }

  function toneLabel(tone) {
    return t('tone.nth', { n: tone });
  }

  // 站內音檔以練習頁（下一層目錄）為基準寫成 ../audio/…，在首頁要換成相對網站根目錄
  function siteRoot() {
    const css = document.querySelector('link[rel="stylesheet"][href*="style.css"]');
    return css ? css.getAttribute('href').replace(/css\/style\.css(?:\?.*)?$/, '') : './';
  }

  function mediaUrl(fileName) {
    if (/^\.\.\//.test(fileName)) return siteRoot() + fileName.slice(3);
    if (/^(https?:|\/)/.test(fileName)) return fileName;
    return audioUrl(fileName);
  }

  // 沒有傳入播放函式時（首頁）用自己的 Audio
  function defaultPlayer() {
    const audio = new Audio();
    let current = '';
    return (fileName) => {
      if (!fileName) return;
      if (current !== fileName) {
        current = fileName;
        audio.src = mediaUrl(fileName);
      }
      try { audio.currentTime = 0; } catch (e) { /* 尚未載入 metadata */ }
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    };
  }

  // 仔前變調表的一列：前字、仔前變調、同一字的一般變調、本調，各欄點按鈕聽音檔
  function aSandhiRow(r, play) {
    const base = r.base || Number(r.from);
    const toName = (to) => (/^\d+$/.test(String(to)) ? toneLabel(to) : sandhiNote(to));
    const col = (cls, label, pitch, word, audio) => {
      const div = document.createElement('div');
      div.className = `sandhi-pitch${cls}`;
      div.innerHTML = `
        <small>${label}</small>
        ${miniPitchSvg(pitch)}
        <b>${pitchText(pitch)}</b>
        <button type="button" class="sandhi-play"></button>`;
      const btn = div.querySelector('button');
      btn.textContent = word;
      btn.addEventListener('click', () => play(audio));
      return div;
    };
    const row = document.createElement('div');
    // 仔前變調跟一般變調結果不同的規則加底色強調
    row.className = `sandhi-row is-compare${String(r.to) !== String(r.gto) ? ' is-diff' : ''}`;
    row.innerHTML = `
      <div class="sandhi-word">
        <strong></strong>
        <span class="roman"></span>
        <small>${toneLabel(base)}</small>
        ${r.note ? `<small>${sandhiNote(r.note)}</small>` : ''}
      </div>`;
    row.querySelector('strong').textContent = r.hanji;
    row.querySelector('.roman').textContent = r.s;
    row.appendChild(col(' is-changed', t('aSandhi.col.a', { name: toName(r.to) }), r.pitch, r.word, r.wa));
    row.appendChild(col('', t('aSandhi.col.general', { name: toName(r.gto) }), r.gpitch, r.gword, r.gwa));
    row.appendChild(col('', t('sandhi.base', { name: toneLabel(base) }), TONE_BY_NUMBER[base].pitch, r.hanji, r.a));
    return row;
  }

  // 變調規則表的一列：例詞、變調後音值（點例詞聽）、本調音值（點前字聽）
  function sandhiRow(r, play) {
    const base = r.base || Number(r.from);
    const citation = TONE_BY_NUMBER[base].pitch;
    const changedName = /^\d+$/.test(String(r.to)) ? toneLabel(r.to) : sandhiNote(r.to);
    const row = document.createElement('div');
    row.className = 'sandhi-row';
    const sandhiPlay = r.wa
      ? `<button type="button" class="sandhi-play" data-audio="sandhi">${r.word}</button>`
      : `<span class="sandhi-missing">${t('sandhi.missing')}</span>`;
    row.innerHTML = `
      <div class="sandhi-word">
        <strong></strong>
        <span class="roman"></span>
        <small>${toneLabel(base)}${r.note ? `・${sandhiNote(r.note)}` : ''}</small>
      </div>
      <div class="sandhi-pitch is-changed">
        <small>${t('sandhi.changed', { name: changedName })}</small>
        ${miniPitchSvg(r.pitch)}
        <b>${pitchText(r.pitch)}</b>
        ${sandhiPlay}
      </div>
      <div class="sandhi-pitch">
        <small>${t('sandhi.base', { name: toneLabel(base) })}</small>
        ${miniPitchSvg(citation)}
        <b>${pitchText(citation)}</b>
        <button type="button" class="sandhi-play" data-audio="base"></button>
      </div>`;
    row.querySelector('strong').textContent = r.word;
    row.querySelector('.roman').textContent = r.ws;
    row.querySelector('[data-audio="base"]').textContent = r.hanji;
    const sandhiBtn = row.querySelector('[data-audio="sandhi"]');
    if (sandhiBtn) sandhiBtn.addEventListener('click', () => play(r.wa));
    row.querySelector('[data-audio="base"]').addEventListener('click', () => play(r.a));
    return row;
  }

  // root 內需已放入 tabsMarkup() 與 panelsMarkup()；onTab 在切換分頁後呼叫
  function build(root, play, onTab) {
    const player = play || defaultPlayer();
    const $ = (id) => root.querySelector('#' + id);

    const toneTable = $('toneTable');
    const toneByNumber = {};
    TONES.forEach((tone) => { toneByNumber[tone.tone] = tone; });
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((n) => {
      const tone = toneByNumber[n];
      if (!tone) {
        const gap = document.createElement('div');
        gap.className = 'tone-cell-gap';
        gap.setAttribute('aria-hidden', 'true');
        toneTable.appendChild(gap);
        return;
      }
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'tone-cell';
      cell.innerHTML = `
        <span class="tone-cell-no">${tone.tone}</span>
        <span class="tone-cell-name">${t('toneName.' + tone.tone)}</span>
        <span class="tone-cell-word"><b></b> <span class="roman"></span></span>
        ${miniPitchSvg(tone.pitch)}
        <span class="tone-cell-value">${pitchText(tone.pitch)}</span>`;
      cell.querySelector('b').textContent = tone.hanji;
      cell.querySelector('.roman').textContent = tone.s;
      cell.setAttribute('aria-label', t('help.listen', { n: tone.tone, hanji: tone.hanji, s: tone.s }));
      cell.addEventListener('click', () => player(tone.a));
      toneTable.appendChild(cell);
    });

    $('sandhiChart').innerHTML = sandhiChartSvg();
    SANDHI_RULES.forEach((r) => $('sandhiTable').appendChild(sandhiRow(r, player)));
    A_SANDHI_RULES.forEach((r) => $('aSandhiTable').appendChild(aSandhiRow(r, player)));

    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabs.forEach((other, j) => {
          const on = j === i;
          other.classList.toggle('is-active', on);
          other.setAttribute('aria-selected', String(on));
          panels[j].hidden = !on;
        });
        if (onTab) onTab(i);
      });
    });
  }

  window.LianTailo.help = { tabsMarkup, panelsMarkup, build };
})();
