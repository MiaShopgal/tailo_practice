(function (root) {
  'use strict';

  const CATEGORIES = {
    tone: 'Tone / tone sandhi',
    spelling: 'Initial / medial / vowel spelling',
    coda: 'Nasal coda mismatch',
    enteringTone: 'Entering tone (入聲)',
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
        if (a.coda !== b.coda) {
          if (/[ptkh]/.test(a.coda) || /[ptkh]/.test(b.coda)) result.add('enteringTone');
          else result.add('coda');
        }
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
    const toneMarks = new Set(['\u0301', '\u0300', '\u0302', '\u0304', '\u030d', '\u030c', '\u030b']);
    const targetParts = String(target).normalize('NFD').split(/([\s\-‐‑‒–—―−]+)/).filter(Boolean);
    const answerParts = syllables(answer);
    let syllableIndex = 0;
    let html = '';
    targetParts.forEach((part) => {
      if ([...part].every(isSeparator)) { html += escapeHtml(part); return; }
      const targetChars = [...part];
      const targetBaseIndices = [];
      const targetBase = [];
      targetChars.forEach((ch, index) => {
        if (!toneMarks.has(ch) && !/^[1-9]$/.test(ch)) {
          targetBaseIndices.push(index);
          targetBase.push(ch);
        }
      });
      const answerSyllable = answerParts[syllableIndex++] || '';
      const parsedTarget = parseSyllable(part);
      const parsedAnswer = parseSyllable(answerSyllable);
      const wrong = new Set();
      if (parsedTarget.base !== parsedAnswer.base) {
        const a = targetBase;
        const b = [...parsedAnswer.base];
        const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
        for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
          dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
        let i = 0; let j = 0;
        while (i < a.length) {
          if (j < b.length && a[i] === b[j]) { i++; j++; }
          else if (j >= b.length || dp[i + 1][j] >= dp[i][j + 1]) wrong.add(targetBaseIndices[i++]);
          else j++;
        }
      }
      const toneMatches = parsedTarget.tone === parsedAnswer.tone
        || (parsedTarget.tone === 0 && parsedAnswer.tone === 1)
        || (parsedTarget.tone === 1 && parsedAnswer.tone === 0);
      if (!toneMatches) targetChars.forEach((ch, index) => {
        if (toneMarks.has(ch) || /^[1-9]$/.test(ch)) wrong.add(index);
      });

      // Keep combining marks with their base letter so a highlighted tone remains legible.
      for (let i = 0; i < targetChars.length;) {
        let cluster = targetChars[i];
        let marked = wrong.has(i);
        i++;
        while (i < targetChars.length && /[\u0300-\u036f]/.test(targetChars[i])) {
          cluster += targetChars[i];
          marked = marked || wrong.has(i);
          i++;
        }
        const safe = escapeHtml(cluster.normalize('NFC'));
        html += marked ? `<span class="typing-error-char">${safe}</span>` : safe;
      }
    });
    return html;
  }

  function highlightAnswerExtras(target, answer) {
    const isSeparator = (ch) => /[\s\-‐‑‒–—―−]/.test(ch);
    const toneMarks = new Set(['\u0301', '\u0300', '\u0302', '\u0304', '\u030d', '\u030c', '\u030b']);
    const targetParts = syllables(target);
    const answerParts = String(answer || '').normalize('NFD').split(/([\s\-‐‑‒–—―−]+)/).filter(Boolean);
    let syllableIndex = 0;
    let html = '';
    answerParts.forEach((part) => {
      if ([...part].every(isSeparator)) { html += escapeHtml(part); return; }
      const answerChars = [...part];
      const answerBaseIndices = [];
      const answerBase = [];
      answerChars.forEach((ch, index) => {
        if (!toneMarks.has(ch) && !/^[1-9]$/.test(ch)) {
          answerBaseIndices.push(index);
          answerBase.push(ch);
        }
      });
      const targetSyllable = targetParts[syllableIndex++] || '';
      const parsedTarget = parseSyllable(targetSyllable);
      const parsedAnswer = parseSyllable(part);
      const wrong = new Set();
      if (!targetSyllable) answerChars.forEach((_, index) => wrong.add(index));
      else if (parsedTarget.base !== parsedAnswer.base) {
        const a = answerBase;
        const b = [...parsedTarget.base];
        const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
        for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
          dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
        let i = 0; let j = 0;
        while (i < a.length) {
          if (j < b.length && a[i] === b[j]) { i++; j++; }
          else if (j >= b.length || dp[i + 1][j] >= dp[i][j + 1]) wrong.add(answerBaseIndices[i++]);
          else j++;
        }
      }
      const toneMatches = parsedTarget.tone === parsedAnswer.tone
        || (parsedTarget.tone === 0 && parsedAnswer.tone === 1)
        || (parsedTarget.tone === 1 && parsedAnswer.tone === 0);
      if (!toneMatches) answerChars.forEach((ch, index) => {
        if (toneMarks.has(ch) || /^[1-9]$/.test(ch)) wrong.add(index);
      });
      for (let i = 0; i < answerChars.length;) {
        let cluster = answerChars[i];
        let marked = wrong.has(i);
        i++;
        while (i < answerChars.length && /[\u0300-\u036f]/.test(answerChars[i])) {
          cluster += answerChars[i];
          marked = marked || wrong.has(i);
          i++;
        }
        const safe = escapeHtml(cluster.normalize('NFC'));
        html += marked ? `<span class="typing-error-char">${safe}</span>` : safe;
      }
    });
    return html;
  }

  function analyze(records) {
    return (records || []).filter((r) => r.unit === 'type-2').map((r) => ({
      hanzi: r.h || '', target: r.s || '', answer: r.answer || '', count: r.count || 1,
      categories: categories(r.s, r.answer), lastAt: r.lastAt || 0,
    }));
  }

  root.TypingErrorAnalysis = { CATEGORIES, syllables, parseSyllable, categories, highlightTarget, highlightAnswerExtras, analyze };
})(typeof window === 'undefined' ? globalThis : window);
