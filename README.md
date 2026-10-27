# T480 Agent

Workspace for testing the dedicated coding agent VM. It currently contains a
small task-list web app.

## Task list app

Add tasks, mark them complete or incomplete, and delete them. Tasks are saved
in the browser's `localStorage`. Plain HTML/CSS/JS front end in `public/` and a
tiny static server (`server.js`) that uses only built-in Node modules.

### Requirements

- Node.js 20 or newer (verified with Node 22.22.1, npm 9.2.0)
- No runtime or dev dependencies and no build step, so `npm install` isn't
  needed.

### Start

```sh
npm start                 # OS picks a free port; the URL is printed
PORT=8080 npm start       # use a fixed port (handy for keeping the same origin)
```

The server binds to `127.0.0.1` only and prints for example
`Task list running at http://127.0.0.1:36543/`. Stop it with Ctrl+C.

It serves just `/` (`/index.html`), `/styles.css`, `/app.js` and `/tasks.js`.
Every other path returns 404, methods other than GET/HEAD return 405, and
unparsable request targets return 400.
Responses carry a strict Content-Security-Policy and `nosniff`.

### Test

```sh
npm test
```

Runs the `node:test` suites in `test/`:

- `tasks.test.js` covers add/toggle/delete, whitespace and invalid names, literal
  HTML-like text, and parsing of valid, partially invalid and malformed saved
  data.
- `server.test.js` starts the server on a random port and checks the asset
  allowlist, content types, 404s for other paths (including traversal
  attempts), 405 for other methods, HEAD, and 400 (without crashing) for an
  unparsable request target.

### Storage behavior

- Tasks are stored as a JSON array under the `localStorage` key
  `taskList.v1`. Each task has the shape `{ "id": string, "name": string, "done": boolean }`.
- `localStorage` is scoped to the **origin** (scheme + host + port). If you
  start the server on a different port, it opens with an empty list. Use the
  same `PORT` to keep your tasks.
- If the saved value isn't valid JSON or isn't an array, the app starts empty,
  shows "Saved tasks were unreadable and have been cleared.", and overwrites
  the bad value. If only some entries are invalid, those entries are dropped
  and a count is shown. The notice clears after your next successful change.
- If storage is blocked or full, the app keeps working in memory and shows a
  message saying tasks won't be saved.

### Limitations

- Data lives only in the current browser profile on this machine. There's no
  sync, no accounts, no export, and clearing site data deletes it.
- If two tabs are open at once, the last write wins. Tabs don't sync live.
- Task names are trimmed and capped at 200 characters. Editing a name after
  it's created isn't supported.
- The server is meant for local preview only. It has no TLS and no caching,
  and it isn't hardened for exposure beyond `127.0.0.1`.
