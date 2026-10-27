import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_NAME_LENGTH,
  normalizeName,
  addTask,
  toggleTask,
  deleteTask,
  parseStoredTasks,
} from '../public/tasks.js';

test('addTask appends a trimmed, incomplete task', () => {
  const { tasks, error } = addTask([], '  Buy milk  ', 'a');
  assert.equal(error, null);
  assert.deepEqual(tasks, [{ id: 'a', name: 'Buy milk', done: false }]);
});

test('addTask generates unique ids when none are given', () => {
  let tasks = addTask([], 'one').tasks;
  tasks = addTask(tasks, 'two').tasks;
  assert.equal(tasks.length, 2);
  assert.notEqual(tasks[0].id, tasks[1].id);
});

test('addTask rejects empty, whitespace-only and non-string names', () => {
  const start = [{ id: 'a', name: 'x', done: false }];
  for (const bad of ['', '   ', '\t\n  ', null, undefined, 42, {}]) {
    const result = addTask(start, bad);
    assert.equal(result.error, 'Enter a task name.', `input: ${JSON.stringify(bad)}`);
    assert.equal(result.tasks, start);
  }
});

test('addTask keeps HTML-like text verbatim', () => {
  const name = '<img src=x onerror=alert(1)> & "quotes"';
  assert.equal(addTask([], name, 'a').tasks[0].name, name);
});

test('normalizeName caps length', () => {
  assert.equal(normalizeName('x'.repeat(500)).length, MAX_NAME_LENGTH);
});

test('toggleTask flips completion both ways without mutating input', () => {
  const start = [
    { id: 'a', name: 'A', done: false },
    { id: 'b', name: 'B', done: false },
  ];
  const once = toggleTask(start, 'a');
  assert.equal(once[0].done, true);
  assert.equal(once[1].done, false);
  assert.equal(start[0].done, false);
  assert.equal(toggleTask(once, 'a')[0].done, false);
});

test('toggleTask and deleteTask ignore unknown ids', () => {
  const start = [{ id: 'a', name: 'A', done: false }];
  assert.deepEqual(toggleTask(start, 'zzz'), start);
  assert.deepEqual(deleteTask(start, 'zzz'), start);
});

test('deleteTask removes only the matching task', () => {
  const start = [
    { id: 'a', name: 'A', done: false },
    { id: 'b', name: 'B', done: true },
  ];
  assert.deepEqual(deleteTask(start, 'a'), [{ id: 'b', name: 'B', done: true }]);
  assert.equal(start.length, 2);
});

test('parseStoredTasks treats missing data as an empty list', () => {
  assert.deepEqual(parseStoredTasks(null), { tasks: [], error: null });
});

test('parseStoredTasks round-trips valid data', () => {
  const tasks = [
    { id: 'a', name: 'A', done: false },
    { id: 'b', name: '<b>B</b>', done: true },
  ];
  assert.deepEqual(parseStoredTasks(JSON.stringify(tasks)), { tasks, error: null });
});

test('parseStoredTasks recovers from invalid JSON and non-arrays', () => {
  for (const raw of ['{not json', '', '"text"', '{"a":1}', 'null', '42']) {
    const result = parseStoredTasks(raw);
    assert.deepEqual(result.tasks, [], `raw: ${raw}`);
    assert.match(result.error, /unreadable/, `raw: ${raw}`);
  }
});

test('parseStoredTasks keeps valid entries and reports skipped ones', () => {
  const raw = JSON.stringify([
    { id: 'a', name: 'ok', done: false },
    { id: 'b', name: '   ', done: false },
    { id: 'c', name: 'no done flag' },
    null,
    'string',
    { id: 'a', name: 'duplicate id', done: true },
    { id: 'd', name: '  trimmed  ', done: true, extra: 'dropped' },
  ]);
  const result = parseStoredTasks(raw);
  assert.deepEqual(result.tasks, [
    { id: 'a', name: 'ok', done: false },
    { id: 'd', name: 'trimmed', done: true },
  ]);
  assert.equal(result.error, '5 saved tasks were invalid and skipped.');
});

test('parseStoredTasks uses singular wording for one skipped entry', () => {
  const result = parseStoredTasks(JSON.stringify([{ id: 'a', name: 'ok', done: false }, {}]));
  assert.equal(result.error, '1 saved task was invalid and skipped.');
});
