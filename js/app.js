// Confirm dialog
const Confirm = (() => {
  let okCb = null;

  function show(title, message, onOk) {
    okCb = onOk;
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-modal').classList.remove('hidden');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirm-ok').addEventListener('click', () => {
      document.getElementById('confirm-modal').classList.add('hidden');
      if (okCb) okCb();
    });
    document.getElementById('confirm-cancel').addEventListener('click', () => {
      document.getElementById('confirm-modal').classList.add('hidden');
    });
  });

  return { show };
})();

// Toast
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Main App
const App = (() => {
  let activeSubjectId = null;

  function selectSubject(id) {
    activeSubjectId = id;
    Timer.reset();
    Subjects.setActive(id);
    Subjects.render();
    renderView();
  }

  function renderView() {
    const { subjects } = Store.getAll();
    const emptyState = document.getElementById('empty-state');
    const subjectView = document.getElementById('subject-view');
    const subject = subjects.find(s => s.id === activeSubjectId);

    if (!subject) {
      emptyState.classList.remove('hidden');
      subjectView.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    subjectView.classList.remove('hidden');
    document.getElementById('subject-name').textContent = subject.name;
    resetTimerUI();
    Entries.renderStats(activeSubjectId);
    Entries.renderHistory(activeSubjectId);
  }

  function refreshView() {
    if (!activeSubjectId) return;
    Entries.renderStats(activeSubjectId);
    Entries.renderHistory(activeSubjectId);
  }

  function resetTimerUI() {
    document.getElementById('timer-display').textContent = '00:00:00';
    document.getElementById('timer-display').classList.remove('warning');
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    document.getElementById('resume-btn').classList.add('hidden');
    document.getElementById('stop-btn').classList.add('hidden');
  }

  function logAndCelebrate(subjectId, seconds) {
    if (!seconds || seconds < 1) return;
    Store.addEntry(subjectId, seconds, new Date().toISOString(), '');
    Effects.celebrate();
    showToast('Time logged! 🎉');
    refreshView();
  }

  function openAddSubjectModal() {
    document.getElementById('add-subject-input').value = '';
    document.getElementById('add-subject-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('add-subject-input').focus(), 50);
  }

  function initEvents() {
    // ── Add subject ──
    document.getElementById('add-subject-btn').addEventListener('click', openAddSubjectModal);
    document.getElementById('empty-add-btn').addEventListener('click', openAddSubjectModal);
    document.getElementById('mobile-add-btn').addEventListener('click', openAddSubjectModal);

    document.getElementById('add-subject-cancel').addEventListener('click', () =>
      document.getElementById('add-subject-modal').classList.add('hidden'));

    document.getElementById('add-subject-confirm').addEventListener('click', () => {
      const name = document.getElementById('add-subject-input').value.trim();
      if (!name) return;
      const subject = Store.addSubject(name);
      document.getElementById('add-subject-modal').classList.add('hidden');
      selectSubject(subject.id);
    });

    document.getElementById('add-subject-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('add-subject-confirm').click();
      if (e.key === 'Escape') document.getElementById('add-subject-cancel').click();
    });

    // ── Count-up timer ──
    document.getElementById('start-btn').addEventListener('click', () => {
      Timer.startCountUp((display) => {
        document.getElementById('timer-display').textContent = display;
      });
      document.getElementById('start-btn').classList.add('hidden');
      document.getElementById('pause-btn').classList.remove('hidden');
      document.getElementById('stop-btn').classList.remove('hidden');
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      Timer.pause();
      document.getElementById('pause-btn').classList.add('hidden');
      document.getElementById('resume-btn').classList.remove('hidden');
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      Timer.resume((display) => {
        document.getElementById('timer-display').textContent = display;
      });
      document.getElementById('resume-btn').classList.add('hidden');
      document.getElementById('pause-btn').classList.remove('hidden');
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      const seconds = Timer.stop();
      resetTimerUI();
      logAndCelebrate(activeSubjectId, seconds);
    });

    // ── Log time manually ──
    document.getElementById('log-time-btn').addEventListener('click', () => {
      document.getElementById('log-duration-input').value = '';
      document.getElementById('log-date-input').value = new Date().toISOString().slice(0, 10);
      document.getElementById('log-note-input').value = '';
      document.getElementById('log-duration-input').style.borderColor = '';
      document.getElementById('log-time-modal').classList.remove('hidden');
      setTimeout(() => document.getElementById('log-duration-input').focus(), 50);
    });

    document.getElementById('log-time-cancel').addEventListener('click', () =>
      document.getElementById('log-time-modal').classList.add('hidden'));

    document.getElementById('log-time-confirm').addEventListener('click', () => {
      const raw = document.getElementById('log-duration-input').value;
      const seconds = Timer.parseDuration(raw);
      if (!seconds || seconds < 1) {
        document.getElementById('log-duration-input').style.borderColor = '#dc2626';
        return;
      }
      document.getElementById('log-duration-input').style.borderColor = '';
      const dateVal = document.getElementById('log-date-input').value;
      const note = document.getElementById('log-note-input').value.trim();
      const loggedAt = dateVal
        ? new Date(dateVal + 'T12:00:00').toISOString()
        : new Date().toISOString();
      Store.addEntry(activeSubjectId, seconds, loggedAt, note);
      document.getElementById('log-time-modal').classList.add('hidden');
      Effects.celebrate();
      showToast('Time logged! 🎉');
      refreshView();
    });

    document.getElementById('log-duration-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('log-time-confirm').click();
      if (e.key === 'Escape') document.getElementById('log-time-cancel').click();
    });

    // ── Countdown ──
    document.getElementById('countdown-btn').addEventListener('click', () => {
      document.getElementById('countdown-input').value = '';
      document.getElementById('countdown-input').style.borderColor = '';
      document.getElementById('countdown-modal').classList.remove('hidden');
      setTimeout(() => document.getElementById('countdown-input').focus(), 50);
    });

    document.getElementById('countdown-cancel').addEventListener('click', () =>
      document.getElementById('countdown-modal').classList.add('hidden'));

    document.getElementById('countdown-confirm').addEventListener('click', () => {
      const raw = document.getElementById('countdown-input').value;
      const seconds = Timer.parseDuration(raw);
      if (!seconds || seconds < 1) {
        document.getElementById('countdown-input').style.borderColor = '#dc2626';
        return;
      }
      document.getElementById('countdown-input').style.borderColor = '';
      document.getElementById('countdown-modal').classList.add('hidden');

      const display = document.getElementById('timer-display');
      display.textContent = Timer.formatDisplay(seconds);
      display.classList.remove('warning');

      Timer.startCountDown(
        seconds,
        (disp, _remaining, warning) => {
          display.textContent = disp;
          display.classList.toggle('warning', warning);
        },
        (targetSeconds) => {
          resetTimerUI();
          logAndCelebrate(activeSubjectId, targetSeconds);
        }
      );

      document.getElementById('start-btn').classList.add('hidden');
      document.getElementById('pause-btn').classList.remove('hidden');
      document.getElementById('stop-btn').classList.remove('hidden');
    });

    document.getElementById('countdown-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('countdown-confirm').click();
      if (e.key === 'Escape') document.getElementById('countdown-cancel').click();
    });

    // ── Export / Import ──
    document.getElementById('export-btn').addEventListener('click', () => Store.exportData());

    document.getElementById('import-input').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          Store.importData(ev.target.result);
          e.target.value = '';
          const { subjects } = Store.getAll();
          selectSubject(subjects.length > 0 ? subjects[0].id : null);
          showToast('Data imported!');
        } catch {
          alert('Import failed: invalid file format.');
        }
      };
      reader.readAsText(file);
    });

    // ── Click outside modal to close ──
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.add('hidden');
      });
    });
  }

  function init() {
    Subjects.init(selectSubject);
    initEvents();
    const { subjects } = Store.getAll();
    if (subjects.length > 0) {
      selectSubject(subjects[0].id);
    } else {
      Subjects.render();
      renderView();
    }
  }

  return { init, refreshView, selectSubject };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
