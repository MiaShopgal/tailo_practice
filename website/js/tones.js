// 台語聲調資料與音值圖繪製
(function () {
  'use strict';

  // 例字的 a 為教育部辭典同音詞目的音檔；mark 以標在 a 上的樣子呈現調符
  // pitch 為五度標音，結尾 0 表示入聲（短促）
  const TONES = [
    { tone: 1, name: '陰平', hanji: '獅', s: 'sai', a: '2831(1)', mark: '無', pitch: '55' },
    { tone: 2, name: '陰上', hanji: '虎', s: 'hóo', a: '4482(1)', mark: 'á', pitch: '53' },
    { tone: 3, name: '陰去', hanji: '豹', s: 'pà', a: '13132(1)', mark: 'à', pitch: '11' },
    { tone: 4, name: '陰入', hanji: '鱉', s: 'pih', a: '13254(1)', mark: '無', pitch: '320' },
    { tone: 5, name: '陽平', hanji: '猴', s: 'kâu', a: '8571(1)', mark: 'â', pitch: '13' },
    { tone: 7, name: '陽去', hanji: '象', s: 'tshiūnn', a: '10372(1)', mark: 'ā', pitch: '33' },
    {
      tone: 8, name: '陽入', hanji: '鹿', s: 'lo̍k', a: '11111(1)', mark: 'a̍', pitch: '540',
      variants: ['550', '540', '340', '330', '320', '130'],
    },
  ];

  const TONE_BY_NUMBER = {};
  TONES.forEach((t) => { TONE_BY_NUMBER[t.tone] = t; });

  // 前字變調規則（說明面板用；實際題目的變調音值由建置腳本算好，可人工修正）
  // a 是前字單音節本調音檔，wa 是雙音節變調音檔。泉腔紅茶用站內音檔。
  const SANDHI_RULES = [
    { from: '1', to: '7', pitch: '33', hanji: '心', s: 'sim', a: '792(1)', word: '心肝', ws: 'sim-kuann', wa: '934(1)' },
    { from: '2', to: '1', pitch: '55', hanji: '等', s: 'tán', a: '8817(1)', word: '等待', ws: 'tán-thāi', wa: '8858(1)' },
    { from: '3', to: '2', pitch: '53', hanji: '愛', s: 'ài', a: '9427(1)', word: '愛情', ws: 'ài-tsîng', wa: '9452(1)' },
    { from: '4h', to: '2', pitch: '53', base: 4, note: '-h', hanji: '拍', s: 'phah', a: '3956(1)', word: '拍拚', ws: 'phah-piànn', wa: '4035(1)' },
    { from: '4ptk', to: '高促', pitch: '550', base: 4, note: '非 -h', hanji: '國', s: 'kok', a: '7071(1)', word: '國家', ws: 'kok-ka', wa: '22125(1)' },
    { from: '5', to: '7', pitch: '33', note: '漳', hanji: '紅', s: 'âng', a: '5365(1)', word: '紅茶', ws: 'âng-tê', wa: '5409(1)' },
    { from: '5', to: '3', pitch: '11', note: '泉', hanji: '紅', s: 'âng', a: '5365(1)', word: '紅茶', ws: 'âng-tê', wa: '../audio/ang-te-tshuan.wav' },
    { from: '7', to: '3', pitch: '11', hanji: '想', s: 'siūnn', a: '9422(1)', word: '想欲', ws: 'siūnn-beh', wa: '14370(1)' },
    { from: '8h', to: '3', pitch: '11', base: 8, note: '-h', hanji: '月', s: 'gue̍h', a: '803(1)', word: '月娘', ws: 'gue̍h-niû', wa: '1012(1)' },
    { from: '8ptk', to: '低促', pitch: '110', base: 8, note: '非 -h', hanji: '日', s: 'ji̍t', a: '801(1)', word: '日子', ws: 'ji̍t-tsí', wa: '828(1)' },
  ];

  // 音值對應的調名（變調後的音值也以調名稱呼，例如 1 → 7）
  const PITCH_NAME = { 55: '1', 53: '2', 11: '3', 320: '4', 13: '5', 33: '7', 540: '8', 550: '高促', 110: '低促' };

  const TONE_8_NOTE = '第八調各地腔調不同，音檔以高降調為範例';
  const SANDHI_5_NOTE = '第五調變調漳腔 5→7、泉腔 5→3，音檔以漳腔為範例';

  // ---------- 調符 ----------

  const COMBINING = { 2: '\u0301', 3: '\u0300', 5: '\u0302', 6: '\u030C', 7: '\u0304', 8: '\u030D', 9: '\u030B' };

  // 依台羅規則找調符要標的字母位置（在聲母＋韻母字串中的索引）：
  // a → oo（第一個 o）、o、e → iu 標 u、ui 標 i → i、u → 成音節的 ng 標 n、m
  function markIndexFor(initial, final) {
    const at = (i) => (i >= 0 ? initial.length + i : -1);
    const f = final;
    const order = [f.indexOf('a'), f.indexOf('oo'), f.indexOf('o'), f.indexOf('e')];
    for (const i of order) if (i >= 0) return at(i);
    if (f.includes('iu')) return at(f.indexOf('iu') + 1);
    if (f.includes('ui')) return at(f.indexOf('ui') + 1);
    for (const v of ['i', 'u']) if (f.includes(v)) return at(f.indexOf(v));
    if (f.includes('ng')) return at(f.indexOf('ng'));
    if (f.includes('m')) return at(f.indexOf('m'));
    return at(0);
  }

  // 組出帶調符的音節；第 1、4 調不標
  function withTone(initial, final, tone) {
    const base = initial + final;
    const mark = COMBINING[tone];
    if (!mark) return base;
    const i = markIndexFor(initial, final);
    return (base.slice(0, i + 1) + mark + base.slice(i + 1)).normalize('NFC');
  }

  function parsePitch(value) {
    return { from: Number(value[0]), to: Number(value[1]), short: value.length > 2, value };
  }

  function acceptedPitches(tone) {
    const t = TONE_BY_NUMBER[tone];
    return t.variants || [t.pitch];
  }

  // 在五線座標上畫出音值線，回傳 SVG 片段字串
  // geo: { top, gap, x0, x1, shortRatio }，第 5 度在最上面
  function contourShape(pitch, geo) {
    const p = typeof pitch === 'string' ? parsePitch(pitch) : pitch;
    const y = (level) => geo.top + (5 - level) * geo.gap;
    const x0 = geo.x0;
    const x1 = p.short ? geo.x0 + (geo.x1 - geo.x0) * geo.shortRatio : geo.x1;
    const y0 = y(p.from);
    const y1 = y(p.to);
    return { x0, y0, x1, y1, short: p.short, angle: Math.atan2(y1 - y0, x1 - x0) };
  }

  function contourMarkup(pitch, geo, cls, size) {
    const c = contourShape(pitch, geo);
    const s = size || 1;
    let end;
    let lineX = c.x1;
    let lineY = c.y1;
    if (c.short) {
      end = `<circle class="contour-stop" cx="${c.x1}" cy="${c.y1}" r="${4.5 * s}"/>`;
    } else {
      const len = 18 * s;
      const spread = 0.45;
      const ax = (a) => c.x1 - len * Math.cos(c.angle + a);
      const ay = (a) => c.y1 - len * Math.sin(c.angle + a);
      end = `<path class="contour-head" d="M ${c.x1} ${c.y1} L ${ax(spread)} ${ay(spread)} L ${ax(-spread)} ${ay(-spread)} Z"/>`;
      // 線條收在箭頭裡，圓頭線帽才不會從箭尖露出來
      const back = len * Math.cos(spread) * 0.75;
      lineX = c.x1 - back * Math.cos(c.angle);
      lineY = c.y1 - back * Math.sin(c.angle);
    }
    return `<g class="contour ${cls || ''}"><line x1="${c.x0}" y1="${c.y0}" x2="${lineX}" y2="${lineY}"/>${end}</g>`;
  }

  // 一段或多段音值圖（多音節詞依序排列），labels 為各段下方的音節文字
  function pitchSvg(values, opts) {
    const o = Object.assign({ cls: '', labels: null }, opts);
    const seg = 100;
    const top = 10;
    const gap = 14;
    const bottom = top + gap * 4;
    const height = o.labels ? bottom + 28 : bottom + 10;
    const width = seg * values.length;
    let body = '';
    for (let level = 1; level <= 5; level++) {
      const y = top + (5 - level) * gap;
      body += `<line class="staff-line" x1="4" x2="${width - 4}" y1="${y}" y2="${y}"/>`;
    }
    values.forEach((v, k) => {
      if (k > 0) body += `<line class="staff-divider" x1="${k * seg}" x2="${k * seg}" y1="${top - 4}" y2="${bottom + 4}"/>`;
      const geo = { top, gap, x0: k * seg + 14, x1: (k + 1) * seg - 14, shortRatio: 0.5 };
      body += contourMarkup(v, geo, 'is-main', 0.62);
      if (o.labels && o.labels[k]) {
        const label = String(o.labels[k]).replace(/[&<>]/g, '');
        body += `<text class="staff-caption" x="${k * seg + seg / 2}" y="${height - 6}" text-anchor="middle">${label}</text>`;
      }
    });
    return `<svg class="pitch-svg ${o.cls}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${body}</svg>`;
  }

  // 錯題用：並列正解與作答的音值圖
  function pitchCompare(expectPitch, answerPitch) {
    return `
      <div class="pitch-compare">
        <span class="pitch-compare-item"><small>${window.LianTailo.t('pitch.correct')}</small>${pitchSvg(expectPitch, { cls: 'is-tiny' })}</span>
        <span class="pitch-compare-item is-wrong"><small>${window.LianTailo.t('pitch.yours')}</small>${pitchSvg(answerPitch, { cls: 'is-tiny' })}</span>
      </div>`;
  }

  // 變調記憶圖。四個舒聲調放在同一個圓上，弧線彼此對稱；4、8 與 2、3 同高
  function sandhiChartSvg() {
    const num = (x, y, t) => `<text class="sandhi-chart-num" x="${x}" y="${y}">${t}</text>`;
    const arc = (d) => `<path class="sandhi-chart-arrow" d="${d}"/>`;
    const label = (x, y, t) => `<text class="sandhi-chart-label" x="${x}" y="${y}">${t}</text>`;
    const tr = window.LianTailo.t;
    const note = window.LianTailo.sandhiNote;
    return `<svg class="sandhi-chart" viewBox="0 0 372 196" role="img" aria-label="${tr('sandhi.chart.aria')}">
      <defs>
        <marker id="sandhiHead" markerUnits="userSpaceOnUse" viewBox="0 0 12 12" refX="0" refY="6" markerWidth="11" markerHeight="11" orient="auto">
          <path d="M0 1.2 L11 6 L0 10.8 Z" fill="currentColor"/>
        </marker>
      </defs>
      ${arc('M86 52 H142')}
      ${arc('M164 74 V129')}
      ${arc('M142 152 H87')}
      ${arc('M64 130 V74')}
      ${arc('M102.2 96.4 L80.3 70.9')}
      ${arc('M125.8 96.4 L147.7 70.9')}
      ${arc('M228 52 H186')}
      ${arc('M272 52 H312')}
      ${arc('M228 152 H187')}
      ${arc('M272 152 H312')}
      ${num(64, 52, '7')}
      ${num(164, 52, '3')}
      ${num(164, 152, '2')}
      ${num(64, 152, '1')}
      ${num(114, 110, '5')}
      ${num(250, 52, '8')}
      ${num(250, 152, '4')}
      ${label(86, 108, note('漳'))}
      ${label(142, 108, note('泉'))}
      ${label(207, 36, note('-h'))}
      ${label(207, 170, note('-h'))}
      ${label(290, 36, note('非 -h'))}
      ${label(290, 136, note('非 -h'))}
      ${label(338, 52, note('低促'))}
      ${label(338, 152, note('高促'))}
    </svg>`;
  }

  // 說明面板用的小音值圖
  function miniPitchSvg(pitch) {
    const geo = { top: 4, gap: 7, x0: 4, x1: 52, shortRatio: 0.5 };
    let lines = '';
    for (let level = 1; level <= 5; level++) {
      const y = geo.top + (5 - level) * geo.gap;
      lines += `<line class="staff-line" x1="2" x2="56" y1="${y}" y2="${y}"/>`;
    }
    return `<svg class="mini-pitch" viewBox="0 0 58 36" aria-hidden="true">${lines}${contourMarkup(pitch, geo, 'is-main', 0.5)}</svg>`;
  }

  window.LianTailo = Object.assign(window.LianTailo || {}, {
    TONES, TONE_BY_NUMBER, SANDHI_RULES, PITCH_NAME, TONE_8_NOTE, SANDHI_5_NOTE, sandhiChartSvg,
    markIndexFor, withTone, parsePitch, acceptedPitches, contourShape, contourMarkup, pitchSvg, pitchCompare, miniPitchSvg,
  });
})();
