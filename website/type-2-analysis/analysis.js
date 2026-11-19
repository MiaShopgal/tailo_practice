(function () {
  'use strict';
  const A = window.TypingErrorAnalysis;
  const t = window.LianTailo.t;
  const categoryLabel = (key) => t(`analysis.category.${key}`);
  const records = A.analyze(window.LianTailo.mistakes.list());
  const rows = document.getElementById('analysisRows');
  const cards = document.getElementById('analysisCards');
  const filter = document.getElementById('categoryFilter');
  const search = document.getElementById('searchInput');
  const counts = {};
  records.forEach((record) => record.categories.forEach((category) => { counts[category] = (counts[category] || 0) + 1; }));
  Object.keys(A.CATEGORIES).forEach((key) => {
    if (!counts[key]) return;
    const option = document.createElement('option'); option.value = key; option.textContent = categoryLabel(key); filter.appendChild(option);
  });
  const total = document.getElementById('totalErrors');
  total.textContent = t('analysis.total', { n: records.length });
  const summary = document.getElementById('categorySummary');
  Object.keys(A.CATEGORIES).forEach((key) => {
    if (!counts[key]) return;
    const item = document.createElement('span'); item.textContent = `${categoryLabel(key)}：${counts[key]}`; summary.appendChild(item);
  });
  function render() {
    const query = search.value.trim().toLowerCase();
    const selected = records.filter((r) => (filter.value === 'all' || r.categories.includes(filter.value))
      && `${r.hanzi} ${r.target} ${r.answer}`.toLowerCase().includes(query));
    rows.textContent = ''; cards.textContent = '';
    selected.forEach((r) => {
      const labels = r.categories.map(categoryLabel).join('、');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="analysis-hanzi"></td><td class="analysis-target"></td><td class="analysis-yours"></td><td class="analysis-note"></td><td class="analysis-count"></td>`;
      tr.querySelector('.analysis-hanzi').textContent = r.hanzi;
      tr.querySelector('.analysis-target').innerHTML = A.highlightTarget(r.target, r.answer);
      tr.querySelector('.analysis-yours').innerHTML = A.highlightAnswerExtras(r.target, r.answer);
      tr.querySelector('.analysis-note').textContent = labels;
      tr.querySelector('.analysis-count').textContent = String(r.count);
      rows.appendChild(tr);
      const card = document.createElement('article'); card.className = 'analysis-card card';
      card.innerHTML = '<div class="analysis-card-head"><strong class="analysis-card-hanzi"></strong><span class="analysis-count"></span></div><div><small data-i18n="analysis.card.target"></small><div class="analysis-target"></div></div><div><small data-i18n="analysis.card.answer"></small><div class="analysis-yours"></div></div><div><small data-i18n="analysis.card.note"></small><div class="analysis-note"></div></div>';
      card.querySelector('.analysis-card-hanzi').textContent = r.hanzi;
      card.querySelector('.analysis-count').textContent = t('analysis.attempts', { n: r.count });
      card.querySelector('.analysis-target').innerHTML = A.highlightTarget(r.target, r.answer);
      card.querySelector('.analysis-yours').innerHTML = A.highlightAnswerExtras(r.target, r.answer);
      card.querySelector('.analysis-note').textContent = labels;
      window.LianTailo.i18n.apply(card);
      cards.appendChild(card);
    });
    document.getElementById('emptyMessage').hidden = selected.length > 0;
  }
  filter.addEventListener('change', render); search.addEventListener('input', render);
  window.addEventListener('lian-tailo:mistakes-change', () => window.location.reload());
  render();
})();
