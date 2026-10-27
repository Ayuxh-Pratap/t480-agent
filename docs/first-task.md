# First task: task-list web app

## Design

- **Static front end** in `public/`: `index.html`, `styles.css`, `app.js` (DOM +
  storage wiring) and `tasks.js` (pure task logic, no DOM, shared with tests).
  Plain ES modules; no framework, no build step, no runtime packages.
- **Task model:** `{ id: string, name: string, done: boolean }`, stored as a JSON
  array under the localStorage key `taskList.v1`.
- **Rendering:** DOM APIs with `textContent` only (never `innerHTML` for user
  data), so HTML-like input is shown literally.
- **Validation:** names are trimmed; empty/whitespace-only names are rejected
  with an inline message tied to the input via `aria-describedby`. Long names
  are capped at 200 characters by `maxlength` and in the logic.
- **Malformed storage:** invalid JSON or a non-array value loads as an empty
  list; individually invalid entries are dropped. A visible status message
  explains what happened. Unreadable/unwritable storage (blocked or quota) is
  also reported instead of throwing.
- **Accessibility:** native `<form>`, `<input>`, `<button>` and checkbox
  controls with labels; per-task delete buttons carry an accessible name
  including the task; a visible `:focus-visible` outline; a polite live region
  for status messages; responsive single-column layout.
- **Server:** `server.js` using only `node:http`/`node:fs`. Binds to
  `127.0.0.1`. Serves a fixed allowlist (`/`, `/index.html`, `/styles.css`,
  `/app.js`, `/tasks.js`) with explicit content types; everything else is 404,
  non-GET/HEAD is 405. `PORT` env var selects a port; default `0` lets the OS
  choose a free port. The actual URL is printed on start.

## Implementation plan

1. `tasks.js` pure functions: `normalizeName`, `addTask`, `toggleTask`,
   `deleteTask`, `parseStoredTasks`.
2. `index.html`, `styles.css`, `app.js` UI wired to the functions.
3. `server.js` with allowlist and `createServer` export for tests.
4. `node:test` suites for task logic and server.
5. README, `.gitignore` for logs/screenshots/Playwright output.

## Test checklist

Automated (`npm test`):
- [x] add task trims name, rejects empty / whitespace-only / non-string
- [x] toggle completion both ways; unknown id is a no-op
- [x] delete task; unknown id is a no-op
- [x] immutability of input arrays
- [x] parse: null, valid data, invalid JSON, non-array, mixed invalid entries
- [x] server: serves each allowed asset with correct type, 404 for unknown
      paths and traversal attempts, 405 for POST, binds 127.0.0.1

Manual in visible Chrome via Playwright MCP:
- [x] add two tasks, toggle one done and back, delete one, reload → state kept
- [x] blank / whitespace input rejected with message
- [x] `<img src=x onerror=alert(1)>` rendered literally, no element created
- [x] malformed localStorage → clear message, app usable
- [x] keyboard-only: Tab order, Enter to add, Space to toggle, focus visible
- [x] narrow viewport (~360px) layout
- [x] no console errors; no failed local requests
- [x] restart server on same port → tasks persist

## Verification notes

- `npm test`: 20/20 passing on Node 22.22.1.
- Browser checks ran in visible Chrome via the Playwright MCP against
  `http://127.0.0.1:36543/`, and every manual checklist item above passed.
- Issue found and fixed while testing: toggling a checkbox re-rendered the
  list and dropped keyboard focus to `<body>`. Focus now returns to the
  toggled checkbox. Re-verified with Space toggling both ways.
- Follow-up: the malformed-data notice now clears after the next successful
  change (re-verified).
- Review finding, fixed: an unparsable request target (e.g. `GET http://[`)
  threw inside the async handler and crashed the server process. It now gets
  a 400. A regression test times out (fails) against the old code and passes
  with the fix. The preview server was restarted on the same port and
  persistence was re-checked.
