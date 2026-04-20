const Store = (() => {
  const KEY = 'timelogger_data';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { subjects: [], entries: [] };
    } catch {
      return { subjects: [], entries: [] };
    }
  }

  function saveAll(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function addSubject(name) {
    const data = getAll();
    const subject = { id: generateId(), name: name.trim(), createdAt: new Date().toISOString() };
    data.subjects.push(subject);
    saveAll(data);
    return subject;
  }

  function updateSubject(id, name) {
    const data = getAll();
    const s = data.subjects.find(s => s.id === id);
    if (s) { s.name = name.trim(); saveAll(data); }
  }

  function deleteSubject(id) {
    const data = getAll();
    data.subjects = data.subjects.filter(s => s.id !== id);
    data.entries = data.entries.filter(e => e.subjectId !== id);
    saveAll(data);
  }

  function addEntry(subjectId, durationSeconds, loggedAt, note) {
    const data = getAll();
    const entry = {
      id: generateId(),
      subjectId,
      durationSeconds,
      loggedAt: loggedAt || new Date().toISOString(),
      note: note || ''
    };
    data.entries.push(entry);
    saveAll(data);
    return entry;
  }

  function deleteEntry(id) {
    const data = getAll();
    data.entries = data.entries.filter(e => e.id !== id);
    saveAll(data);
  }

  function getEntriesForSubject(subjectId) {
    return getAll().entries.filter(e => e.subjectId === subjectId);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(getAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timelogger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(jsonString) {
    const imported = JSON.parse(jsonString);
    if (!Array.isArray(imported.subjects) || !Array.isArray(imported.entries)) {
      throw new Error('Invalid format');
    }
    const data = getAll();
    const existingSubjectIds = new Set(data.subjects.map(s => s.id));
    const existingEntryIds = new Set(data.entries.map(e => e.id));
    imported.subjects.forEach(s => { if (!existingSubjectIds.has(s.id)) data.subjects.push(s); });
    imported.entries.forEach(e => { if (!existingEntryIds.has(e.id)) data.entries.push(e); });
    saveAll(data);
  }

  return { getAll, addSubject, updateSubject, deleteSubject, addEntry, deleteEntry, getEntriesForSubject, exportData, importData };
})();
