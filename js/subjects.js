const Subjects = (() => {
  let onSelectCb = null;
  let activeId = null;

  function init(onSelect) {
    onSelectCb = onSelect;
  }

  function setActive(id) {
    activeId = id;
  }

  function render() {
    const { subjects } = Store.getAll();
    const list = document.getElementById('subject-list');
    const mobileTabs = document.getElementById('mobile-subject-tabs');

    list.innerHTML = '';
    mobileTabs.innerHTML = '';

    subjects.forEach(s => {
      // Sidebar item
      const item = document.createElement('div');
      item.className = 'subject-item' + (s.id === activeId ? ' active' : '');
      item.dataset.id = s.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'subject-item-name';
      nameSpan.textContent = s.name;
      nameSpan.addEventListener('dblclick', e => {
        e.stopPropagation();
        startRename(item, nameSpan, s.id, s.name);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-subject-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.title = 'Delete subject';
      deleteBtn.addEventListener('click', e => {
        e.stopPropagation();
        Confirm.show(
          `Delete "${s.name}"?`,
          'All logged time for this subject will also be deleted.',
          () => {
            Store.deleteSubject(s.id);
            const remaining = Store.getAll().subjects;
            onSelectCb(remaining.length > 0 ? remaining[0].id : null);
          }
        );
      });

      item.appendChild(nameSpan);
      item.appendChild(deleteBtn);
      item.addEventListener('click', () => onSelectCb(s.id));
      list.appendChild(item);

      // Mobile tab
      const tab = document.createElement('button');
      tab.className = 'mobile-tab' + (s.id === activeId ? ' active' : '');
      tab.textContent = s.name;
      tab.addEventListener('click', () => onSelectCb(s.id));
      mobileTabs.appendChild(tab);
    });
  }

  function startRename(item, nameSpan, id, currentName) {
    const input = document.createElement('input');
    input.className = 'input';
    input.value = currentName;
    input.style.cssText = 'padding:3px 6px;height:28px;font-size:13px;';
    item.replaceChild(input, nameSpan);
    input.focus();
    input.select();

    const finish = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) Store.updateSubject(id, newName);
      render();
    };
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') render();
    });
  }

  return { init, render, setActive };
})();
