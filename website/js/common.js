(function () {
  'use strict';

  const AUDIO_BASE = 'https://static.kiantiong.com/sutiau/';
  const MISTAKES_KEY = 'lian-tailo:mistakes';
  const MISTAKE_DEVICE_KEY = 'lian-tailo:mistakes:device';
  const MISTAKE_CHANGE_EVENT = 'lian-tailo:mistakes-change';
  const COMMON_SCRIPT_URL = document.currentScript && document.currentScript.src;
  const syncCore = window.LianTailoSyncCore;

  if (!syncCore) throw new Error('mistake-sync-core.js must load before common.js');

  function newId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function readDeviceId() {
    try {
      let id = localStorage.getItem(MISTAKE_DEVICE_KEY);
      if (!id) {
        id = newId();
        localStorage.setItem(MISTAKE_DEVICE_KEY, id);
      }
      return id;
    } catch (e) {
      return newId();
    }
  }

  const DEVICE_ID = readDeviceId();

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
  // 格式：{ version: 2, items, tombstones, deviceId }
  // countsByDevice 以裝置計數，合併時取各裝置較大的值，避免重複合併造成計數膨脹。
  // answer 為文字版的作答；音值題另存 answerPitch、expectPitch（各音節的音值陣列）以畫出音值圖

  function readMistakes() {
    try {
      const db = JSON.parse(localStorage.getItem(MISTAKES_KEY));
      if (db && db.items && typeof db.items === 'object') return syncCore.normalizeState(db, DEVICE_ID);
    } catch (e) { /* 資料損毀就重來 */ }
    return syncCore.normalizeState({ version: 2, items: {}, tombstones: {} }, DEVICE_ID);
  }

  function writeMistakes(db) {
    try {
      localStorage.setItem(MISTAKES_KEY, JSON.stringify(syncCore.normalizeState(db, DEVICE_ID)));
    } catch (e) { /* 私密瀏覽模式可能無法寫入 */ }
    window.dispatchEvent(new CustomEvent(MISTAKE_CHANGE_EVENT));
  }

  function nextActivityTime(record, tombstone) {
    return Math.max(
      Date.now(),
      (record ? record.activityAt : 0) + 1,
      (tombstone ? tombstone.deletedAt : 0) + 1
    );
  }

  function deleteMistake(db, key) {
    const item = db.items[key];
    if (!syncCore.isVisible(item, db.tombstones[key])) return;
    const deletedAt = nextActivityTime(item, db.tombstones[key]);
    db.tombstones[key] = { unit: item.unit, a: item.a, deletedAt, activityId: newId() };
    delete db.items[key];
  }

  const mistakes = {
    record(unit, item, detail) {
      const db = readMistakes();
      const key = `${unit}|${item.a}`;
      const current = db.items[key];
      const prev = syncCore.isVisible(current, db.tombstones[key]) ? current : null;
      const now = nextActivityTime(prev, db.tombstones[key]);
      const countsByDevice = Object.assign({}, prev ? prev.countsByDevice : {});
      countsByDevice[DEVICE_ID] = (countsByDevice[DEVICE_ID] || 0) + 1;
      db.items[key] = {
        unit,
        a: item.a,
        s: item.s,
        h: item.h,
        answer: detail.answer,
        answerPitch: detail.answerPitch || null,
        expectPitch: detail.expectPitch || null,
        countsByDevice,
        count: Object.values(countsByDevice).reduce((sum, count) => sum + count, 0),
        firstAt: prev ? prev.firstAt : now,
        lastAt: now,
        fixedAt: 0,
        activityAt: now,
        activityId: newId(),
        activityType: 'wrong',
      };
      writeMistakes(db);
    },

    // 錯過的題目之後答對，記下時間，錯題本會標示「已答對」
    markCorrect(unit, item) {
      const db = readMistakes();
      const key = `${unit}|${item.a}`;
      const entry = db.items[key];
      if (!syncCore.isVisible(entry, db.tombstones[key])) return;
      entry.activityAt = nextActivityTime(entry, db.tombstones[key]);
      entry.activityId = newId();
      entry.activityType = 'correct';
      entry.fixedAt = entry.activityAt;
      writeMistakes(db);
    },

    list() {
      const db = readMistakes();
      return Object.keys(db.items)
        .filter((key) => syncCore.isVisible(db.items[key], db.tombstones[key]))
        .map((key) => Object.assign({ key }, db.items[key]))
        .sort((x, y) => y.lastAt - x.lastAt);
    },

    remove(key) {
      const db = readMistakes();
      deleteMistake(db, key);
      writeMistakes(db);
    },

    clear(unit) {
      const db = readMistakes();
      const units = unit == null ? null : (Array.isArray(unit) ? unit : [unit]);
      Object.keys(db.items).forEach((key) => {
        if (!units || units.includes(db.items[key].unit)) deleteMistake(db, key);
      });
      writeMistakes(db);
    },

    syncSnapshot() {
      return readMistakes();
    },

    mergeCloudState(remote) {
      const local = readMistakes();
      const merged = syncCore.mergeStates(local, remote, DEVICE_ID);
      if (!syncCore.statesEqual(local, merged)) writeMistakes(merged);
      return merged;
    },

    hasSyncHistory() {
      const db = readMistakes();
      return Object.keys(db.tombstones).length > 0
        || Object.keys(db.items).some((key) => syncCore.isVisible(db.items[key], db.tombstones[key]));
    },
  };

  window.LianTailo = Object.assign(window.LianTailo || {}, { GROUPS, UNITS, POOL_PER_GROUP, audioUrl, shuffle, mistakes, settings, applyTheme });

  if (COMMON_SCRIPT_URL && !window.location.pathname.split('/').includes('review')) {
    const syncScript = document.createElement('script');
    syncScript.type = 'module';
    syncScript.src = new URL('./mistake-sync.js', COMMON_SCRIPT_URL).href;
    syncScript.onerror = () => {
      document.querySelectorAll('[data-sync-button]').forEach((button) => { button.disabled = true; });
      document.querySelectorAll('[data-sync-status]').forEach((status) => {
        status.textContent = window.LianTailo.t('sync.status.error');
      });
      console.error('Unable to load the mistake-history sync module.');
    };
    document.head.appendChild(syncScript);
  }
})();
