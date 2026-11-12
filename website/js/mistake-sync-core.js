(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LianTailoSyncCore = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  function number(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function sumCounts(counts) {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  function normalizeRecord(raw, key, deviceId) {
    if (!raw || typeof raw !== 'object') return null;
    const unit = String(raw.unit || key.split('|')[0] || '');
    const audio = String(raw.a || key.slice(key.indexOf('|') + 1) || '');
    if (!unit || !audio) return null;

    const lastAt = number(raw.lastAt);
    const fixedAt = number(raw.fixedAt);
    const activityAt = Math.max(number(raw.activityAt), lastAt, fixedAt);
    const activityType = raw.activityType === 'correct' || raw.activityType === 'wrong'
      ? raw.activityType
      : (fixedAt > lastAt ? 'correct' : 'wrong');
    const activityId = typeof raw.activityId === 'string' && raw.activityId
      ? raw.activityId
      : `legacy:${key}:${activityAt}:${activityType}`;
    const countsByDevice = {};

    if (raw.countsByDevice && typeof raw.countsByDevice === 'object') {
      Object.entries(raw.countsByDevice).forEach(([id, count]) => {
        const n = Math.floor(number(count));
        if (id && n > 0) countsByDevice[id] = n;
      });
    } else {
      const count = Math.floor(number(raw.count));
      if (count > 0) countsByDevice[deviceId] = count;
    }

    return Object.assign({}, raw, {
      unit,
      a: audio,
      count: sumCounts(countsByDevice),
      countsByDevice,
      firstAt: number(raw.firstAt) || lastAt || activityAt,
      lastAt,
      fixedAt: activityType === 'correct' ? activityAt : 0,
      activityAt,
      activityId,
      activityType,
    });
  }

  function normalizeTombstone(raw, key) {
    if (typeof raw === 'number') raw = { deletedAt: raw };
    if (!raw || typeof raw !== 'object') return null;
    const deletedAt = number(raw.deletedAt);
    if (!deletedAt) return null;
    const split = key.indexOf('|');
    return {
      unit: String(raw.unit || (split >= 0 ? key.slice(0, split) : '')),
      a: String(raw.a || (split >= 0 ? key.slice(split + 1) : '')),
      deletedAt,
      activityId: typeof raw.activityId === 'string' ? raw.activityId : `delete:${key}:${deletedAt}`,
    };
  }

  function normalizeState(raw, deviceId) {
    const state = raw && typeof raw === 'object' ? raw : {};
    const id = String(state.deviceId || deviceId || 'unknown-device');
    const items = {};
    const tombstones = {};
    Object.entries(state.items && typeof state.items === 'object' ? state.items : {}).forEach(([key, value]) => {
      const record = normalizeRecord(value, key, id);
      if (record) items[key] = record;
    });
    Object.entries(state.tombstones && typeof state.tombstones === 'object' ? state.tombstones : {}).forEach(([key, value]) => {
      const tombstone = normalizeTombstone(value, key);
      if (tombstone) tombstones[key] = tombstone;
    });
    return { version: 2, deviceId: id, items, tombstones };
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function activityOrder(a, b) {
    if (a.activityAt !== b.activityAt) return a.activityAt - b.activityAt;
    return a.activityId.localeCompare(b.activityId);
  }

  function mergeRecord(a, b) {
    const countsByDevice = Object.assign({}, a.countsByDevice);
    Object.entries(b.countsByDevice).forEach(([id, count]) => {
      countsByDevice[id] = Math.max(countsByDevice[id] || 0, count);
    });

    const newestAnswer = a.lastAt !== b.lastAt
      ? (a.lastAt > b.lastAt ? a : b)
      : (a.activityId >= b.activityId ? a : b);
    const newestActivity = activityOrder(a, b) >= 0 ? a : b;
    return Object.assign({}, newestAnswer, {
      count: sumCounts(countsByDevice),
      countsByDevice,
      firstAt: Math.min(a.firstAt || a.lastAt, b.firstAt || b.lastAt),
      lastAt: Math.max(a.lastAt, b.lastAt),
      activityAt: newestActivity.activityAt,
      activityId: newestActivity.activityId,
      activityType: newestActivity.activityType,
      fixedAt: newestActivity.activityType === 'correct' ? newestActivity.activityAt : 0,
    });
  }

  function mergeTombstone(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.deletedAt !== b.deletedAt) return a.deletedAt > b.deletedAt ? a : b;
    return a.activityId >= b.activityId ? a : b;
  }

  function isVisible(record, tombstone) {
    return !!record && (!tombstone || record.activityAt > tombstone.deletedAt);
  }

  function mergeStates(leftRaw, rightRaw, deviceId) {
    const left = normalizeState(leftRaw, deviceId);
    const right = normalizeState(rightRaw, deviceId);
    const merged = { version: 2, deviceId: left.deviceId || right.deviceId, items: {}, tombstones: {} };
    const keys = new Set([
      ...Object.keys(left.items), ...Object.keys(right.items),
      ...Object.keys(left.tombstones), ...Object.keys(right.tombstones),
    ]);

    keys.forEach((key) => {
      const tombstone = mergeTombstone(left.tombstones[key], right.tombstones[key]);
      if (tombstone) merged.tombstones[key] = tombstone;
      const candidates = [
        isVisible(left.items[key], tombstone) ? left.items[key] : null,
        isVisible(right.items[key], tombstone) ? right.items[key] : null,
      ].filter(Boolean);
      let record = candidates[0] || null;
      if (candidates[1]) record = record ? mergeRecord(record, candidates[1]) : candidates[1];
      if (isVisible(record, tombstone)) merged.items[key] = record;
    });
    return merged;
  }

  function stateToDocuments(raw, deviceId) {
    const state = normalizeState(raw, deviceId);
    const keys = new Set([...Object.keys(state.items), ...Object.keys(state.tombstones)]);
    return Array.from(keys).map((key) => {
      const record = state.items[key];
      const tombstone = state.tombstones[key];
      if (isVisible(record, tombstone)) {
        return {
          key,
          data: Object.assign({}, record, { key, deletedAt: tombstone ? tombstone.deletedAt : 0 }),
        };
      }
      return { key, data: Object.assign({ key }, tombstone) };
    });
  }

  function documentsToState(documents, deviceId) {
    const state = { version: 2, deviceId, items: {}, tombstones: {} };
    documents.forEach((document) => {
      const data = document.data || {};
      let key = data.key || document.id || '';
      try { key = decodeURIComponent(key); } catch (e) { /* Keep the original document ID. */ }
      if (!key) return;
      if (number(data.deletedAt)) {
        state.tombstones[key] = {
          unit: data.unit,
          a: data.a,
          deletedAt: number(data.deletedAt),
          activityId: typeof data.activityId === 'string'
            ? data.activityId
            : `delete:${key}:${number(data.deletedAt)}`,
        };
      }
      if (data.unit && data.a && data.lastAt) state.items[key] = data;
    });
    return normalizeState(state, deviceId);
  }

  function statesEqual(a, b) {
    return stableStringify(normalizeState(a)) === stableStringify(normalizeState(b));
  }

  function documentsEqual(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  return {
    documentsEqual,
    documentsToState,
    isVisible,
    mergeStates,
    normalizeState,
    stateToDocuments,
    statesEqual,
  };
});
