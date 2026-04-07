# Contributing to Hephaestus

Thank you for your interest in contributing! This guide covers everything you need to get started.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style](#code-style)
- [Testing Your Changes](#testing-your-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Release Process](#release-process)

---

## Development Setup

```bash
git clone https://github.com/bogdanov-igor/hephaestus-postman-framework.git
cd hephaestus-postman-framework
npm install
```

Available scripts:

```bash
npm run syntax           # node --check on all JS files
npm run lint             # ESLint check
npm run lint:fix         # ESLint autofix
npm run validate:defaults  # Validate setup/defaults.json is valid JSON
npm run build            # Check configMerge sync between engine files
```

---

## Project Structure

```
engine/
  pre-request.js    ← Pre-request engine (eval'd before each request)
  post-request.js   ← Post-request engine (eval'd in Tests tab)
setup/
  defaults.json     ← Template for hephaestus.defaults (must be valid JSON)
  engine-update.js  ← Script to fetch engine from GitHub into collectionVariables
  snapshot-*.js     ← Snapshot management utilities
templates/
  method.pre-request.js   ← Starter template for new requests (pre)
  method.post-request.js  ← Starter template for new requests (post)
scripts/
  build.js          ← Build utilities (configMerge sync check)
docs/
  banner.png
  newman-ci.md      ← Newman + CI integration guide
```

---

## Making Changes

### Engine changes (`engine/*.js`)

The engine files are **single-file monoliths** that get fetched via `engine-update` and stored as strings in Postman `collectionVariables`. Keep this in mind:

- All code must work in the **Postman sandbox** (ES5-compatible + limited globals)
- Available sandbox globals: `pm`, `tv4`, `xml2Json`, `btoa`, `require` (xml2js only), `eval`, `console`
- No `import`/`export`, no Node.js built-ins, no npm packages
- Avoid `let`/`const` in block scopes if targeting older Postman versions (ES5 issues)

**⚠️ `configMerge` is shared** — `_merge()` and `run()` are identical in both engine files. If you change this module, **update both files**. See `scripts/build.js` for the sync check.

### Adding a new module

1. Add the module object (`const myModule = { run(ctx) { ... } }`) inside the IIFE in the engine file
2. Add a call to `myModule.run(ctx)` in the ORCHESTRATOR section
3. Initialize any new result fields in `ctx._meta.results` at the top of the IIFE
4. Add result output to `logger._resultLines()` if the module produces assertions
5. Add the field to the CI JSON output in `logger.summary()`
6. Document the new `override` fields in both README.md and README.ru.md
7. Add an example to `templates/method.post-request.js`

### Configuration changes (`setup/defaults.json`)

- The file **must be valid JSON** — no `//` comments
- Run `npm run validate:defaults` after editing
- Add new fields with sensible defaults (disabled by default)
- Update the configuration table in both READMEs

---

## Code Style

- **Tabs vs spaces**: 4 spaces (match existing code)
- **Quotes**: single quotes in JS
- **Comments**: only for non-obvious intent — no "// Increment counter" style
- **Module headers**: use the existing `// ═══ MODULE: name ═══` style
- **Russian in comments**: the engine uses Russian for user-facing messages; internal logic comments can be in English
- Run `npm run lint` before committing; ESLint will catch common issues

---

## Testing Your Changes

Since the engine runs inside the Postman sandbox, testing requires Postman itself:

1. Import `collection/hephaestus-template.postman_collection.json` into Postman
2. Run `🔧 engine-update` — it loads the engine from GitHub (or use your local fork's raw URL)
3. For local testing, paste your modified engine code directly into `hephaestus.v3.pre` / `hephaestus.v3.post` collection variables
4. Use the example requests in `📦 Collection → 📁 Авторизация` to verify behavior
5. Check the Postman Console for log output

**For Newman (CLI) testing**, see [`docs/newman-ci.md`](docs/newman-ci.md).

---

## Submitting a Pull Request

1. Fork the repository and create a branch:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/issue-description
   ```

2. Make your changes. Run all checks:
   ```bash
   npm run syntax && npm run lint && npm run validate:defaults && npm run build
   ```

3. Open a Pull Request against `main`. Fill in the PR template.

4. The CI pipeline will automatically run syntax check, ESLint, and JSON validation.

### Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/description` | `feat/graphql-support` |
| Bug fix | `fix/description` | `fix/snapshot-array-diff` |
| Documentation | `docs/description` | `docs/newman-guide` |
| Refactor | `refactor/description` | `refactor/build-step` |

---

## Release Process

Releases are created automatically when a version tag is pushed:

```bash
# Bump version in package.json, engine files, README badges
# Update CHANGELOG.md

git tag v3.2.0
git push origin v3.2.0
# GitHub Actions creates the Release automatically
```

See `.github/workflows/release.yml` for the release workflow.
