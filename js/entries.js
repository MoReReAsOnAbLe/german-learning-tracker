const Entries = (() => {
  function renderHistory(subjectId) {
    const entries = Store.getEntriesForSubject(subjectId)
      .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

    const list = document.getElementById('history-list');

    if (entries.length === 0) {
      list.innerHTML = '<div class="history-empty">No time logged yet</div>';
      return;
    }

    list.innerHTML = entries.map(e => `
      <div class="history-item">
        <div class="history-item-left">
          <div class="history-item-time">${formatTimestamp(e.loggedAt)}</div>
          ${e.note ? `<div class="history-item-note">${escapeHtml(e.note)}</div>` : ''}
        </div>
        <div class="history-item-duration">${Timer.formatDuration(e.durationSeconds)}</div>
        <button class="delete-entry-btn" data-id="${e.id}" title="Delete entry">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.delete-entry-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Confirm.show('Delete this entry?', '', () => {
          Store.deleteEntry(btn.dataset.id);
          App.refreshView();
        });
      });
    });
  }

  function renderStats(subjectId) {
    const entries = Store.getEntriesForSubject(subjectId);
    const now = new Date();
    const todayStr = now.toDateString();

    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sum = arr => arr.reduce((s, e) => s + e.durationSeconds, 0);

    document.getElementById('stat-today').textContent =
      Timer.formatDuration(sum(entries.filter(e => new Date(e.loggedAt).toDateString() === todayStr)));
    document.getElementById('stat-week').textContent =
      Timer.formatDuration(sum(entries.filter(e => new Date(e.loggedAt) >= monday)));
    document.getElementById('stat-all').textContent =
      Timer.formatDuration(sum(entries));
  }

  function formatTimestamp(iso) {
    const date = new Date(iso);
    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (date.toDateString() === now.toDateString()) return `Today ${timeStr}`;
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${timeStr}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { renderHistory, renderStats };
})();
