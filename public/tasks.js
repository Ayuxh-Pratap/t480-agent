// Pure task-list logic shared by the browser app and the Node tests.
// Every function returns a new array; inputs are never mutated.

export const STORAGE_KEY = 'taskList.v1';
export const MAX_NAME_LENGTH = 200;

// Returns the trimmed name, or null when it is not a usable task name.
export function normalizeName(name) {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed === '') return null;
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Returns { tasks, error }. On invalid input, tasks is the original array.
export function addTask(tasks, name, id = newId()) {
  const clean = normalizeName(name);
  if (clean === null) return { tasks, error: 'Enter a task name.' };
  return { tasks: [...tasks, { id, name: clean, done: false }], error: null };
}

export function toggleTask(tasks, id) {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

export function deleteTask(tasks, id) {
  return tasks.filter((t) => t.id !== id);
}

function isValidTask(t) {
  return (
    t !== null &&
    typeof t === 'object' &&
    typeof t.id === 'string' &&
    t.id !== '' &&
    normalizeName(t.name) !== null &&
    typeof t.done === 'boolean'
  );
}

// Parses the raw localStorage value. Returns { tasks, error } where error is a
// user-facing message when some or all saved data could not be used.
export function parseStoredTasks(raw) {
  if (raw === null || raw === undefined) return { tasks: [], error: null };
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { tasks: [], error: 'Saved tasks were unreadable and have been cleared.' };
  }
  if (!Array.isArray(data)) {
    return { tasks: [], error: 'Saved tasks were unreadable and have been cleared.' };
  }
  const seen = new Set();
  const tasks = [];
  for (const t of data) {
    if (!isValidTask(t) || seen.has(t.id)) continue;
    seen.add(t.id);
    tasks.push({ id: t.id, name: normalizeName(t.name), done: t.done });
  }
  const dropped = data.length - tasks.length;
  const error = dropped
    ? `${dropped} saved task${dropped === 1 ? ' was' : 's were'} invalid and skipped.`
    : null;
  return { tasks, error };
}
