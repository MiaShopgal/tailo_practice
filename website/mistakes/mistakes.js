(function () {
  'use strict';

  const { GROUPS, UNITS, audioUrl, mistakes, pitchCompare, t } = window.LianTailo;

  const LEVEL_KEY = {
    'tone-1': 'level.base',
    'tone-2': 'level.sandhi',
    'pitch-1': 'level.base',
    'pitch-2': 'level.sandhi',
    'spell-1': 'level.spell.part',
    'spell-2': 'level.spell.iv',
    'spell-3': 'level.spell.ivt',
    'type-1': 'level.base',
    'type-2': 'level.sandhi',
  };

  const ICON_PLAY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  const ICON_DELETE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  const el = {
    scope: document.getElementById('scopeLabel'),
    filters: document.getElementById('filters'),
    levels: document.getElementById('levelFilters'),
    list: document.getElementById('mistakeList'),
    empty: document.getElementById('emptyState'),
    footer: document.getElementById('footer'),
    hint: document.getElementById('fixedHint'),
    clearBtn: document.getElementById('clearBtn'),
  };

  const audio = new Audio();
  let filter = 'all';

  const groupById = (id) => GROUPS.find((g) => g.id === id);
  const groupName = (id) => {
    const group = groupById(id);
    return group ? t('group.' + id) : id;
  };
  const levelName = (unit) => (LEVEL_KEY[unit] ? t(LEVEL_KEY[unit]) : (UNITS[unit] ? UNITS[unit].level : unit));

  function formatDate(ts) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t('date.today');
    const sameYear = d.getFullYear() === today.getFullYear();
    return `${sameYear ? '' : `${d.getFullYear()}/`}${d.getMonth() + 1}/${d.getDate()}`;
  }

  function unitsInFilter(value) {
    if (value === 'all') return null;
    const group = groupById(value);
    return group ? group.units.slice() : [value];
  }

  function inFilter(unit, value) {
    const units = unitsInFilter(value);
    return !units || units.includes(unit);
  }

  function filterValid(value, counts) {
    if (value === 'all') return true;
    const group = groupById(value);
    if (group) return group.units.some((unit) => counts[unit]);
    return !!counts[value];
  }

  function scopeText(value) {
    if (value === 'all') return t('mistakes.all.scope');
    const group = groupById(value);
    if (group) return t('mistakes.scope.named', { name: t('group.' + group.id) });
    const info = UNITS[value];
    const name = info ? `${groupName(info.group)}・${levelName(value)}` : value;
    return t('mistakes.scope.named', { name });
  }

  function addChip(parent, label, count, active, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip${active ? ' is-active' : ''}`;
    btn.setAttribute('aria-pressed', String(active));
    btn.textContent = `${label} ${count}`;
    btn.addEventListener('click', onClick);
    parent.appendChild(btn);
  }

  function collectGroups(counts) {
    const known = new Set(GROUPS.flatMap((g) => g.units));
    const groups = GROUPS.map((g) => ({
      id: g.id,
      name: t('group.' + g.id),
      units: g.units.filter((unit) => counts[unit]),
      count: g.units.reduce((sum, unit) => sum + (counts[unit] || 0), 0),
    })).filter((g) => g.count);
    const extras = Object.keys(counts).filter((unit) => !known.has(unit)).map((unit) => ({
      id: unit,
      name: unit,
      units: [unit],
      count: counts[unit],
      extra: true,
    }));
    return groups.concat(extras);
  }

  function renderFilters(all) {
    const counts = {};
    all.forEach((m) => { counts[m.unit] = (counts[m.unit] || 0) + 1; });
    if (!filterValid(filter, counts)) filter = 'all';

    const choices = collectGroups(counts);
    const showGroups = choices.length >= 2;
    // 只剩一種練習時沒有練習列，「全部」就是這一種的全部難度
    if (!showGroups && choices.length === 1 && filter === choices[0].id) filter = 'all';
    const active = choices.find((g) => g.id === filter || g.units.includes(filter))
      || (!showGroups && choices.length === 1 && !choices[0].extra ? choices[0] : null);
    const showLevels = !!(active && !active.extra && active.units.length >= 2);
    const levelsAreRoot = showLevels && !showGroups;
    // 練習列收起來時，仍要標出是哪一種練習，難度名稱才不會跟另一種練習撞在一起
    const singlePractice = !!(active && !showGroups && !active.extra);

    el.scope.hidden = !singlePractice;
    el.scope.textContent = singlePractice ? active.name : '';
    el.filters.hidden = !showGroups;
    el.filters.textContent = '';
    if (showGroups) {
      addChip(el.filters, t('mistakes.all'), all.length, filter === 'all', () => {
        filter = 'all';
        render();
      });
      choices.forEach((g) => {
        addChip(el.filters, g.name, g.count, !!(active && active.id === g.id), () => {
          filter = g.id;
          render();
        });
      });
    }

    el.levels.hidden = !showLevels;
    el.levels.textContent = '';
    el.levels.classList.toggle('is-root', levelsAreRoot);
    if (showLevels) {
      el.levels.setAttribute('aria-label', t('mistakes.levels', { name: active.name }));
      if (levelsAreRoot) {
        addChip(el.levels, t('mistakes.all'), all.length, filter === 'all', () => {
          filter = 'all';
          render();
        });
      }
      active.units.forEach((unit) => {
        addChip(el.levels, levelName(unit), counts[unit], filter === unit, () => {
          filter = unit;
          render();
        });
      });
    } else {
      el.levels.removeAttribute('aria-label');
    }

    return { singlePractice };
  }

  function categoryLabel(unit, singlePractice) {
    const info = UNITS[unit];
    if (!info) return unit;
    const pickedUnit = filter !== 'all' && !groupById(filter);
    if (pickedUnit) return '';
    if (groupById(filter) || singlePractice) return levelName(unit);
    return `${groupName(info.group)}・${levelName(unit)}`;
  }

  function renderItem(m, singlePractice) {
    const li = document.createElement('li');
    li.className = 'review-item';
    li.innerHTML = `
      <span class="review-hanji"></span>
      <div class="review-body">
        <div class="review-answer"></div>
        ${m.expectPitch && m.answerPitch ? pitchCompare(m.expectPitch, m.answerPitch) : '<div class="review-yours"></div>'}
        <div class="mistake-meta"></div>
      </div>
      <button class="mini-play" type="button" aria-label="${t('action.play.short')}">${ICON_PLAY}</button>
      <button class="mini-delete" type="button" aria-label="${t('mistakes.remove')}">${ICON_DELETE}</button>`;
    li.querySelector('.review-hanji').textContent = m.h;
    li.querySelector('.review-answer').textContent = m.s;
    const yours = li.querySelector('.review-yours');
    if (yours) yours.textContent = t('quiz.yours', { answer: m.answer });

    const meta = li.querySelector('.mistake-meta');
    const label = categoryLabel(m.unit, singlePractice);
    if (label) {
      const cat = document.createElement('span');
      cat.textContent = label;
      meta.appendChild(cat);
    }
    const stat = document.createElement('span');
    stat.className = 'mistake-stat';
    stat.textContent = t('mistakes.times', { n: m.count, date: formatDate(m.lastAt) });
    meta.appendChild(stat);
    if (m.fixedAt > m.lastAt) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = t('mistakes.fixed');
      meta.prepend(tag);
    }

    li.querySelector('.mini-play').addEventListener('click', () => {
      audio.src = audioUrl(m.a);
      audio.play().catch(() => {});
    });
    li.querySelector('.mini-delete').addEventListener('click', () => {
      mistakes.remove(m.key);
      render();
    });
    return li;
  }

  function render() {
    const all = mistakes.list();
    const { singlePractice } = renderFilters(all);
    const shown = all.filter((m) => inFilter(m.unit, filter));

    el.list.textContent = '';
    shown.forEach((m) => el.list.appendChild(renderItem(m, singlePractice)));
    el.list.hidden = shown.length === 0;
    el.empty.hidden = shown.length > 0;
    el.footer.hidden = shown.length === 0;
    el.hint.hidden = !shown.some((m) => m.fixedAt > m.lastAt);
    el.clearBtn.textContent = filter === 'all' ? t('mistakes.clear.all') : t('mistakes.clear.scope', { scope: scopeText(filter) });
  }

  el.clearBtn.addEventListener('click', () => {
    const scope = scopeText(filter);
    if (!window.confirm(t('mistakes.clear.confirm', { scope }))) return;
    mistakes.clear(unitsInFilter(filter));
    render();
  });

  window.addEventListener('pageshow', render);
  window.addEventListener('lian-tailo:mistakes-change', render);
  window.addEventListener('storage', (event) => {
    if (event.key === 'lian-tailo:mistakes') render();
  });
})();
