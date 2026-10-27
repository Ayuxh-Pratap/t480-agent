import {
  STORAGE_KEY,
  addTask,
  toggleTask,
  deleteTask,
  parseStoredTasks,
} from './tasks.js';

const form = document.getElementById('add-form');
const input = document.getElementById('task-name');
const formError = document.getElementById('form-error');
const status = document.getElementById('status');
const list = document.getElementById('task-list');
const empty = document.getElementById('empty');
const count = document.getElementById('count');

let tasks = [];

function showStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    showStatus('Browser storage is unavailable; tasks will not be saved.');
    return [];
  }
  const result = parseStoredTasks(raw);
  if (result.error) {
    showStatus(result.error);
    save(result.tasks); // replace the bad data with what could be recovered
  }
  return result.tasks;
}

function save(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    showStatus('Could not save tasks to browser storage.');
    return false;
  }
}

function update(next) {
  tasks = next;
  showStatus(''); // a successful change supersedes any earlier notice
  save(tasks);
  render();
}

function render() {
  const items = tasks.map((task) => {
    const li = document.createElement('li');
    li.className = task.done ? 'done' : '';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.dataset.id = task.id;
    checkbox.addEventListener('change', () => {
      update(toggleTask(tasks, task.id));
      // Re-rendering replaces the checkbox; return focus to its replacement.
      list.querySelector(`input[data-id="${CSS.escape(task.id)}"]`)?.focus();
    });
    const name = document.createElement('span');
    name.className = 'task-name';
    name.textContent = task.name;
    label.append(checkbox, name);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'delete';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete task: ${task.name}`);
    del.addEventListener('click', () => {
      const index = tasks.findIndex((t) => t.id === task.id);
      update(deleteTask(tasks, task.id));
      // Keep keyboard users in the list instead of dropping focus to <body>.
      const buttons = list.querySelectorAll('button.delete');
      (buttons[Math.min(index, buttons.length - 1)] ?? input).focus();
    });

    li.append(label, del);
    return li;
  });
  list.replaceChildren(...items);
  empty.hidden = tasks.length > 0;
  const remaining = tasks.filter((t) => !t.done).length;
  count.textContent = tasks.length ? `(${remaining} of ${tasks.length} open)` : '';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const result = addTask(tasks, input.value);
  if (result.error) {
    formError.textContent = result.error;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  formError.textContent = '';
  input.removeAttribute('aria-invalid');
  input.value = '';
  update(result.tasks);
  input.focus();
});

input.addEventListener('input', () => {
  if (formError.textContent) {
    formError.textContent = '';
    input.removeAttribute('aria-invalid');
  }
});

tasks = load();
render();
