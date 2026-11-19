(function (root) {
  'use strict';

  const CATEGORIES = {
    tone: 'Tone / tone sandhi',
    spelling: 'Initial / medial / vowel spelling',
    coda: 'Nasal / entering-tone coda',
    missingTone: 'Missing tone mark',
  };

  function syllables(value) {
    return String(value || '').trim().toLowerCase().normalize('NFD')
      .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0))
      .split(/[\s\-‐‑‒–—―−]+/).filter(Boolean);
  }

  function parseSyllable(value) {
    const chars = [...String(value).normalize('NFD')];
    const base = [];
    let toneMark = 0;
    let digit = 0;
    const markTones = { '\u0301': 2, '\u0300': 3, '\u0302': 5, '\u0304': 7, '\u030d': 8, '\u030c': 6, '\u030b': 9 };
    chars.forEach((ch) => {
      if (markTones[ch]) toneMark = markTones[ch];
      else if (/^[1-9]$/.test(ch)) digit = Number(ch);
      else if (!/[\u0300-\u036f]/.test(ch)) base.push(ch);
    });
    const spelling = base.join('');
    const codaMatch = spelling.match(/(?:ng|nn|[mnptkh])$/);
    return { base: spelling, coda: codaMatch ? codaMatch[0] : '', tone: digit || toneMark || 0 };
  }

  function categories(target, answer) {
    const wanted = syllables(target).map(parseSyllable);
    const typed = syllables(answer).map(parseSyllable);
    const result = new Set();
    if (wanted.length !== typed.length) result.add('spelling');
    const n = Math.max(wanted.length, typed.length);
    for (let i = 0; i < n; i++) {
      const a = wanted[i] || { base: '', tone: 0 };
      const b = typed[i] || { base: '', tone: 0 };
      const toneMatches = a.tone === b.tone || (a.tone === 0 && b.tone === 1) || (a.tone === 1 && b.tone === 0);
      if (!toneMatches) result.add(b.tone ? 'tone' : 'missingTone');
      if (a.base !== b.base) {
        if (a.coda !== b.coda) result.add('coda');
        else result.add('spelling');
      }
    }
    return [...result];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // LCS marks only target code points that do not participate in a match.
  function highlightTarget(target, answer) {
    const isSeparator = (ch) => /[\s\-‐‑‒–—―−]/.test(ch);
    const a = [...String(target).normalize('NFD')].filter((ch) => !isSeparator(ch));
    const b = [...String(answer).normalize('NFD')].filter((ch) => !isSeparator(ch));
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    const marked = new Set(); let i = 0; let j = 0;
    while (i < a.length) {
      if (j < b.length && a[i] === b[j]) { i++; j++; }
      else if (j >= b.length || dp[i + 1][j] >= dp[i][j + 1]) marked.add(i++);
      else j++;
    }
    // Separators are intentionally ignored, so present the canonical target unmarked at separators.
    const raw = [...String(target)]; let normalizedIndex = 0; let html = '';
    raw.forEach((ch) => {
      if (isSeparator(ch)) { html += escapeHtml(ch); return; }
      const chars = [...ch.normalize('NFD')];
      chars.forEach((part) => {
        const isWrong = marked.has(normalizedIndex++);
        const safe = escapeHtml(part);
        html += isWrong ? `<span class="typing-error-char">${safe}</span>` : safe;
      });
    });
    return html.normalize('NFC');
  }

  function analyze(records) {
    return (records || []).filter((r) => r.unit === 'type-2').map((r) => ({
      hanzi: r.h || '', target: r.s || '', answer: r.answer || '', count: r.count || 1,
      categories: categories(r.s, r.answer), lastAt: r.lastAt || 0,
    }));
  }

  root.TypingErrorAnalysis = { CATEGORIES, syllables, parseSyllable, categories, highlightTarget, analyze };
})(typeof window === 'undefined' ? globalThis : window);
