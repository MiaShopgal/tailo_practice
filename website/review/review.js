// 雙音節變調題庫的人工檢查：一筆一筆聽音檔後標記，本機暫存，匯出成 data/sandhi_overrides.csv 供建置腳本套用
(function () {
  'use strict';

  const { audioUrl, TONE_BY_NUMBER, PITCH_NAME, pitchSvg } = window.LianTailo;
  const DATA = window.SANDHI_WORDS || [];
  const STORAGE_KEY = 'lian-tailo:review:sandhi';
  const POOL_PER_RULE = window.LianTailo.POOL_PER_GROUP.sandhiRule;
  const EDIT_PITCHES = ['33', '55', '53', '11', '550', '110', '330', '13', '320', '540'];
  const STATUS_TEXT = { ok: '確認', edit: '修改', exclude: '排除' };
  const BADGE_TEXT = { ok: '已確認', edit: '已修改', exclude: '已排除' };

  const $ = (id) => document.getElementById(id);
  const el = {};
  ['rangeFilter', 'ruleFilter', 'statusFilter', 'progressBar', 'positionText', 'summaryText', 'cardView',
    'card', 'rankText', 'statusBadge', 'romanText', 'hanjiText', 'graph', 'ruleText', 'playBtn', 'unmarkBtn',
    'excludeBtn', 'editBtn', 'okBtn', 'prevBtn', 'skipBtn', 'doneView', 'doneTitle', 'doneText', 'exportBtn',
    'exportBtn2', 'restartBtn', 'resetBtn', 'editSheet', 'editGrid', 'editCancel', 'helpBtn', 'helpSheet',
  ].forEach((id) => { el[id] = $(id); });

  const audio = new Audio();
  audio.preload = 'auto';
  audio.addEventListener('playing', () => el.playBtn.classList.add('is-playing'));
  ['pause', 'ended', 'error'].forEach((ev) => audio.addEventListener(ev, () => el.playBtn.classList.remove('is-playing')));

  // ---------- 本機修改 ----------
  // { [音檔]: { status: '' | 'ok' | 'edit' | 'exclude', sd } }，status 為空字串表示把題庫原有的檢查結果清掉

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  let local = loadLocal();

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch (e) { /* 私密瀏覽模式可能無法寫入 */ }
  }

  const defaultPitch = (w) => w.sd0 || w.sd;

  function effective(w) {
    const l = local[w.a];
    if (l) return { status: l.status, sd: l.status === 'edit' ? l.sd : defaultPitch(w) };
    return { status: w.rv || '', sd: w.sd };
  }

  function setLocal(w, status, sd) {
    if (status === 'edit' && sd === defaultPitch(w)) status = 'ok';
    local[w.a] = { status, sd: status === 'edit' ? sd : '' };
    // 跟題庫原本的狀態一樣就不用另外記
    if ((w.rv || '') === status && (status !== 'edit' || sd === w.sd)) delete local[w.a];
    saveLocal();
  }

  // 出題範圍：每條規則未排除的前 POOL_PER_RULE 個詞，以及夾在其間被排除的詞
  const poolSet = new Set();
  const rankInRule = {};
  (function () {
    const counted = {};
    const seen = {};
    for (const w of DATA) {
      seen[w.rule] = (seen[w.rule] || 0) + 1;
      rankInRule[w.a] = seen[w.rule];
      if ((counted[w.rule] || 0) >= POOL_PER_RULE) continue;
      poolSet.add(w.a);
      if (!w.x) counted[w.rule] = (counted[w.rule] || 0) + 1;
    }
  })();

  // ---------- 佇列 ----------
  // 篩選後先固定成一份清單，標記後就算不再符合篩選條件也不會讓位置亂跳

  let queue = [];
  let pos = 0;

  function buildQueue() {
    const range = el.rangeFilter.value;
    const rule = el.ruleFilter.value;
    const status = el.statusFilter.value;
    queue = [];
    DATA.forEach((w, index) => {
      if (range === 'pool' && !poolSet.has(w.a)) return;
      if (rule !== 'all' && w.rule !== rule) return;
      if (status !== 'all' && effective(w).status !== status) return;
      queue.push(index);
    });
    pos = 0;
  }

  // ---------- 畫面 ----------

  const pitchName = (p) => (PITCH_NAME[p] ? `${p}（${PITCH_NAME[p]}）` : p);

  function renderSummary() {
    const counts = { ok: 0, edit: 0, exclude: 0 };
    DATA.forEach((w) => {
      const s = effective(w).status;
      if (counts[s] !== undefined) counts[s]++;
    });
    const done = counts.ok + counts.edit + counts.exclude;
    const pending = Object.keys(local).length;
    el.summaryText.textContent = `已檢查 ${done} / ${DATA.length}${pending ? `・未匯出 ${pending}` : ''}`;
    return { counts, done, pending };
  }

  function current() {
    return pos < queue.length ? DATA[queue[pos]] : null;
  }

  function show(autoplay) {
    const w = current();
    const n = queue.length;
    el.progressBar.style.width = n ? `${(Math.min(pos, n) / n) * 100}%` : '0%';
    const summary = renderSummary();

    if (!w) {
      el.cardView.hidden = true;
      el.doneView.hidden = false;
      el.positionText.textContent = n ? `${n} / ${n} 筆` : '0 筆';
      el.doneTitle.textContent = n ? '這一批都檢查完了' : '沒有符合條件的詞';
      el.doneText.textContent = `目前已檢查 ${summary.done} / ${DATA.length}（確認 ${summary.counts.ok}、修改 ${summary.counts.edit}、排除 ${summary.counts.exclude}）`
        + (summary.pending ? `，本機有 ${summary.pending} 筆尚未匯出` : '');
      audio.pause();
      return;
    }

    el.cardView.hidden = false;
    el.doneView.hidden = true;
    el.positionText.textContent = `第 ${pos + 1} / ${n} 筆`;

    const e = effective(w);
    el.rankText.textContent = `規則 ${w.rule}・詞頻第 ${rankInRule[w.a]}`;
    el.statusBadge.hidden = !e.status;
    el.statusBadge.textContent = BADGE_TEXT[e.status] || '';
    el.statusBadge.className = `rv-badge is-${e.status}`;
    el.romanText.textContent = w.s;
    el.hanjiText.textContent = w.h;
    el.graph.innerHTML = pitchSvg([e.sd, TONE_BY_NUMBER[w.p[1][2]].pitch], { labels: w.s.split('-') });
    el.ruleText.textContent = `前字 ${pitchName(e.sd)}`
      + (e.status === 'edit' ? `・原規則 ${pitchName(defaultPitch(w))}` : '')
      + (w.nt ? `・備註：${w.nt}` : '');
    el.unmarkBtn.hidden = !e.status;
    el.okBtn.classList.toggle('is-current', e.status === 'ok');
    el.editBtn.classList.toggle('is-current', e.status === 'edit');
    el.excludeBtn.classList.toggle('is-current', e.status === 'exclude');
    el.prevBtn.disabled = pos === 0;

    if (autoplay) play(w);
    const next = queue[pos + 1] !== undefined ? DATA[queue[pos + 1]] : null;
    if (next) new Audio(audioUrl(next.a)).preload = 'auto';
  }

  function play(w) {
    audio.src = audioUrl(w.a);
    const p = audio.play();
    if (p && p.catch) p.catch(() => {});
  }

  function go(delta) {
    pos = Math.max(0, Math.min(queue.length, pos + delta));
    show(true);
  }

  function mark(status, sd) {
    const w = current();
    if (!w) return;
    setLocal(w, status, sd);
    go(1);
  }

  // ---------- 修改面板 ----------

  function openEdit() {
    const w = current();
    if (!w) return;
    const e = effective(w);
    const second = TONE_BY_NUMBER[w.p[1][2]].pitch;
    el.editGrid.textContent = '';
    EDIT_PITCHES.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rv-edit-option${p === e.sd ? ' is-current' : ''}${p === defaultPitch(w) ? ' is-default' : ''}`;
      btn.innerHTML = `${pitchSvg([p, second])}<span>${i + 1}. ${pitchName(p)}${p === defaultPitch(w) ? '・規則' : ''}</span>`;
      btn.addEventListener('click', () => {
        closeEdit();
        mark('edit', p);
      });
      el.editGrid.appendChild(btn);
    });
    el.editSheet.hidden = false;
  }

  function closeEdit() { el.editSheet.hidden = true; }

  // ---------- 匯出 ----------

  function csvCell(value) {
    const s = String(value == null ? '' : value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function exportCsv() {
    const rows = [['音檔', '漢字', '羅馬字', '規則', '處理', '前字變調', '備註']];
    const known = new Set();
    DATA.forEach((w) => {
      known.add(w.a);
      const e = effective(w);
      if (!e.status) return;
      rows.push([w.a, w.h, w.s, w.rule, STATUS_TEXT[e.status], e.status === 'edit' ? e.sd : '', w.nt || '']);
    });
    // 題庫調整後不在目前清單裡的詞，本機紀錄照樣保留，日後回到題庫時仍有效
    Object.keys(local).forEach((a) => {
      const l = local[a];
      if (known.has(a) || !l.status) return;
      rows.push([a, '', '', '', STATUS_TEXT[l.status], l.status === 'edit' ? l.sd : '', '']);
    });
    const csv = '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sandhi_overrides.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- 事件 ----------

  function refilter() {
    buildQueue();
    show(true);
  }

  el.ruleFilter.innerHTML = '<option value="all">全部規則</option>'
    + Array.from(new Set(DATA.map((w) => w.rule))).map((r) => `<option value="${r}">${r}</option>`).join('');
  [el.rangeFilter, el.ruleFilter, el.statusFilter].forEach((s) => s.addEventListener('change', refilter));

  el.playBtn.addEventListener('click', () => current() && play(current()));
  el.okBtn.addEventListener('click', () => mark('ok'));
  el.excludeBtn.addEventListener('click', () => mark('exclude'));
  el.editBtn.addEventListener('click', openEdit);
  el.unmarkBtn.addEventListener('click', () => {
    const w = current();
    if (!w) return;
    setLocal(w, '');
    show(false);
  });
  el.prevBtn.addEventListener('click', () => go(-1));
  el.skipBtn.addEventListener('click', () => go(1));
  el.restartBtn.addEventListener('click', refilter);
  el.exportBtn.addEventListener('click', exportCsv);
  el.exportBtn2.addEventListener('click', exportCsv);
  el.resetBtn.addEventListener('click', () => {
    if (!Object.keys(local).length) return;
    if (!window.confirm('確定要清除這台裝置上尚未匯出的修改嗎？')) return;
    local = {};
    saveLocal();
    refilter();
  });
  el.editCancel.addEventListener('click', closeEdit);
  el.editSheet.addEventListener('click', (e) => { if (e.target === el.editSheet) closeEdit(); });
  el.helpBtn.addEventListener('click', () => { el.helpSheet.hidden = false; });
  el.helpSheet.addEventListener('click', (e) => { if (e.target === el.helpSheet) el.helpSheet.hidden = true; });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('select')) return;
    if (!el.helpSheet.hidden) {
      if (e.key === 'Escape') el.helpSheet.hidden = true;
      return;
    }
    if (!el.editSheet.hidden) {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < EDIT_PITCHES.length) {
        closeEdit();
        mark('edit', EDIT_PITCHES[i]);
      } else if (e.key === 'Escape') {
        closeEdit();
      }
      return;
    }
    if (!current()) return;
    const key = e.key.toLowerCase();
    if (key === ' ') play(current());
    else if (key === 'enter' || key === 'y') mark('ok');
    else if (key === 'e') openEdit();
    else if (key === 'x') mark('exclude');
    else if (key === 'arrowleft') go(-1);
    else if (key === 'arrowright') go(1);
    else return;
    e.preventDefault();
  });

  buildQueue();
  show(true);
})();
