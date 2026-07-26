# Contributing

## Development

Requirements: Node.js 20 or newer.

```sh
npm ci
npm test
npm start
```

Keep MCP responses compact, preserve useful full output behind cache keys, and add regression coverage for behavior changes. Do not commit `dist/`, `node_modules/`, `.token-saver-cache/`, local environment files, or command output containing secrets.

## Pull requests

- Explain the user-facing behavior change.
- Add or update tests.
- Run `npm test` locally.
- Update `CHANGELOG.md` for notable changes.
- Do not include credentials, private project data, or generated artifacts.
