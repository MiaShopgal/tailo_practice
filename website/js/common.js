(function () {
  'use strict';

  const AUDIO_BASE = 'https://static.kiantiong.com/sutiau/';
  const MISTAKES_KEY = 'lian-tailo:mistakes';

  // 錯題本的收納跟首頁標題同一套：先分練習，再分難度。新增單元時兩邊一起登記
  const GROUPS = [
    { id: 'spell', name: '練拼寫', units: ['spell-1', 'spell-2', 'spell-3'] },
    { id: 'tone', name: '標聲調', units: ['tone-1', 'tone-2'] },
    { id: 'pitch', name: '選音值', units: ['pitch-1', 'pitch-2'] },
    { id: 'type', name: '練打字', units: ['type-1', 'type-2'] },
  ];

  const UNITS = {
    'tone-1': { group: 'tone', level: '本調（單音節）', href: 'tone-draw/' },
    'tone-2': { group: 'tone', level: '本調＋變調（雙音節）', href: 'tone-draw-2/' },
    'pitch-1': { group: 'pitch', level: '本調（單音節）', href: 'pitch-choice/' },
    'pitch-2': { group: 'pitch', level: '本調＋變調（雙音節）', href: 'pitch-choice-2/' },
    'spell-1': { group: 'spell', level: '聲母／韻母', href: 'spell-part/' },
    'spell-2': { group: 'spell', level: '聲母＋韻母', href: 'spell-iv/' },
    'spell-3': { group: 'spell', level: '聲＋韻＋聲調', href: 'spell-ivt/' },
    'type-1': { group: 'type', level: '本調（單音節）', href: 'type/' },
    'type-2': { group: 'type', level: '本調＋變調（雙音節）', href: 'type-2/' },
  };

  // 分組平均出題時，每組（聲調或變調規則）取詞頻最高的幾個當題庫；題庫檢查頁的「出題範圍」也依此計算
  const POOL_PER_GROUP = { tone: 50, sandhiRule: 40 };

  function audioUrl(fileName) {
    return AUDIO_BASE + encodeURIComponent(fileName) + '.mp3';
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- 練習設定（各單元通用） ----------

  const SETTINGS_KEY = 'lian-tailo:settings';
  const LEVEL_DEFAULT = { tone: '1', pitch: '1', spell: 'part', type: '1' };
  const LEVEL_OPTIONS = {
    tone: ['1', '2'],
    pitch: ['1', '2'],
    spell: ['part', 'iv', 'ivt'],
    type: ['1', '2'],
  };
  const LANG_OPTIONS = ['zh', 'tai'];
  const THEME_OPTIONS = ['system', 'light', 'dark'];
  const SETTINGS_DEFAULT = { count: 10, showHanji: true, lang: 'zh', theme: 'system', level: LEVEL_DEFAULT };
  const COUNT_OPTIONS = [5, 10, 20, 30];

  function normalizeLevel(raw) {
    const level = Object.assign({}, LEVEL_DEFAULT, raw && typeof raw === 'object' ? raw : {});
    Object.keys(LEVEL_DEFAULT).forEach((key) => {
      if (!LEVEL_OPTIONS[key].includes(level[key])) level[key] = LEVEL_DEFAULT[key];
    });
    return level;
  }

  const settings = {
    COUNT_OPTIONS,
    LANG_OPTIONS,
    THEME_OPTIONS,
    get() {
      try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        const s = Object.assign({}, SETTINGS_DEFAULT, saved);
        if (!COUNT_OPTIONS.includes(s.count)) s.count = SETTINGS_DEFAULT.count;
        if (!LANG_OPTIONS.includes(s.lang)) s.lang = SETTINGS_DEFAULT.lang;
        if (!THEME_OPTIONS.includes(s.theme)) s.theme = SETTINGS_DEFAULT.theme;
        s.showHanji = !!s.showHanji;
        s.level = normalizeLevel(s.level);
        return s;
      } catch (e) {
        return Object.assign({}, SETTINGS_DEFAULT, { level: Object.assign({}, LEVEL_DEFAULT) });
      }
    },
    set(patch) {
      const prev = settings.get();
      const next = Object.assign({}, prev, patch);
      if (patch && patch.level) next.level = normalizeLevel(Object.assign({}, prev.level, patch.level));
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch (e) { /* 私密瀏覽模式可能無法寫入 */ }
      return next;
    },
  };

  const THEME_COLOR = { light: '#efefef', dark: '#171c1a' };

  function resolvedTheme(theme) {
    if (theme === 'dark' || theme === 'light') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const mode = resolvedTheme(theme == null ? settings.get().theme : theme);
    document.documentElement.setAttribute('data-theme', mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[mode]);
  }

  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.get().theme === 'system') applyTheme('system');
  });

  // ---------- 錯題本 ----------
  // 格式：{ version: 1, items: { "<單元>|<音檔檔名>": { unit, a, s, h, answer, answerPitch, expectPitch, count, firstAt, lastAt, fixedAt } } }
  // answer 為文字版的作答；音值題另存 answerPitch、expectPitch（各音節的音值陣列）以畫出音值圖

  function readMistakes() {
    try {
      const db = JSON.parse(localStorage.getItem(MISTAKES_KEY));
      if (db && db.items && typeof db.items === 'object') return db;
    } catch (e) { /* 資料損毀就重來 */ }
    return { version: 1, items: {} };
  }

  function writeMistakes(db) {
    try {
      localStorage.setItem(MISTAKES_KEY, JSON.stringify(db));
    } catch (e) { /* 私密瀏覽模式可能無法寫入 */ }
  }

  const mistakes = {
    record(unit, item, detail) {
      const db = readMistakes();
      const key = `${unit}|${item.a}`;
      const prev = db.items[key];
      const now = Date.now();
      db.items[key] = {
        unit,
        a: item.a,
        s: item.s,
        h: item.h,
        answer: detail.answer,
        answerPitch: detail.answerPitch || null,
        expectPitch: detail.expectPitch || null,
        count: (prev ? prev.count : 0) + 1,
        firstAt: prev ? prev.firstAt : now,
        lastAt: now,
        fixedAt: 0,
      };
      writeMistakes(db);
    },

    // 錯過的題目之後答對，記下時間，錯題本會標示「已答對」
    markCorrect(unit, item) {
      const db = readMistakes();
      const entry = db.items[`${unit}|${item.a}`];
      if (!entry) return;
      entry.fixedAt = Date.now();
      writeMistakes(db);
    },

    list() {
      const db = readMistakes();
      return Object.keys(db.items)
        .map((key) => Object.assign({ key }, db.items[key]))
        .sort((x, y) => y.lastAt - x.lastAt);
    },

    remove(key) {
      const db = readMistakes();
      delete db.items[key];
      writeMistakes(db);
    },

    clear(unit) {
      const db = readMistakes();
      const units = unit == null ? null : (Array.isArray(unit) ? unit : [unit]);
      Object.keys(db.items).forEach((key) => {
        if (!units || units.includes(db.items[key].unit)) delete db.items[key];
      });
      writeMistakes(db);
    },
  };

  window.LianTailo = Object.assign(window.LianTailo || {}, { GROUPS, UNITS, POOL_PER_GROUP, audioUrl, shuffle, mistakes, settings, applyTheme });
})();
