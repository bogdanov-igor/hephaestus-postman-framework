# Changelog

---

## [3.8.0] — 2026-04-07

### Added
- **`softFail`** global config flag — when `true`, all assertion failures are logged to console but do not fail the Postman test run. Ideal for smoke testing and development. Applies to `keysToFind`, `assertions` map, `assertShape`, `assertOrder`, `assertUnique`.
- **`logLevel`** — controls console verbosity in both engines. Values: `silent` (no output), `minimal` (one compact line per request), `normal` (default box layout), `verbose` (box + response headers).
- **`assertUnique`** — asserts all values at a path within an array are unique. Optionally extract a sub-field: `{ path: "data.items", by: "id" }`.
- **`ctx.random`** — built-in test data generators available in pre-request plugins and scripts:
  - `uuid()`, `email()`, `str(n)`, `int(min, max)`, `float(min, max, dec)`, `bool()`, `pick(arr)`, `date(from?, to?)`
  - Auto-sets `pm.variables` keys defined in `randomData: { email: "random.email" }` config.
- **`scripts/watch.js`** — watch mode: monitors collection + environment files for changes and re-runs Newman automatically. `npm run watch -- -c col.json -e env.json`.
- **`scripts/compare.js`** — side-by-side comparison of two Newman result files. Highlights new failures, resolved failures, and performance regressions (>20% slower). Supports `--md`. `npm run compare -- before.json after.json`.

### Changed
- Post-request pipeline: `assertUnique` added after `assertOrder`
- Pre-request pipeline: `random` module added before `dateUtils`, exposes `ctx.random`
- `npm test`: 5 new tests for compare.js → total 30/30
- `package.json`: added `watch`, `compare` scripts

---

## [3.7.0] — 2026-04-07

### Added
- **`retryOnStatus`** — automatic request retry when response status matches configured codes. Skips assertion pipeline on intermediate retries; fails with a clear message when all retries exhausted.
  ```js
  retryOnStatus: { statuses: [503, 429], maxRetries: 3 }
  ```
- **`scripts/docs.js`** — generates Markdown API documentation from a Postman collection. Outputs method, URL, expected status, assertShape/assertions contract, and description for every request. Run: `npm run docs -- collection.json`.
- **`scripts/summary.js`** — rich Newman run summary: overall stats, per-folder pass rate table, top-5 slowest endpoints, top-5 most-failed assertions. Supports `--md` flag for Markdown output. Run: `npm run summary -- results.json`.
- **`scripts/init.js`** — interactive project setup wizard. Asks for base URL, auth type, environment names, CI mode. Generates `hephaestus.defaults` JSON and an environment file template. Run: `npm run init`.

### Changed
- Post-request pipeline: `retryOnStatus` checked immediately after `configMerge`; assertion/snapshot/plugin pipeline is skipped on retry
- `package.json`: added `docs`, `summary`, `init` scripts
- `npm test`: 6 new tests for docs.js and summary.js (total 24)

---

## [3.6.0] — 2026-04-07

### Added
- **`assertShape`** — one-liner structural type assertions: `{ "data": "object", "data.id": "number", "data.items": "array", "error": "absent" }`. Supports `string | number | boolean | object | array | null | any | absent`.
- **`assertOrder`** — asserts array is sorted by a field: `{ path: "data.items", by: "createdAt", direction: "desc", type: "date" }`. Supports `string | number | date` comparison types.
- **`scripts/test.js`** — `npm test` suite: validates all tooling scripts (build, migrate, ci-to-junit, generate-report) against fixtures; checks version consistency and defaults.json validity; exits 0 on success.
- **Docker integration** — `Dockerfile`, `docker-compose.yml`, `scripts/docker-run.sh` for running Newman tests in containers without a local Node.js install.
- **`docs/config-reference.html`** — full searchable config reference: every option with type, default value, examples, and compatibility version; dark theme, search, category nav.

### Changed
- Post-request pipeline: `assertShape` and `assertOrder` added between `assertEach` and `assertHeaders`
- `docs/index.html` updated with link to Config Reference
- `package.json`: added `test` script
- `.gitignore`: added `junit-report.xml`, `hephaestus-report.html`, `*.html` temp outputs to ignore

---

## [3.5.0] — 2026-04-07

### Added
- **`assertEach`** — validate every item in an array against a rule set:
  - `path` — JSONPath to the array in the response body
  - `rules` — same shorthand operators as `assertions` (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `type`, `minLen`, `maxLen`, `includes`, `matches`, `exists`, `absent`)
  - `minCount` / `maxCount` — assert array length bounds
  - Failures are aggregated and reported as a single `pm.test` showing up to 10 violations
- **`envRequired`** — list of environment variable names to validate before each request; missing variables fail loudly with actionable error messages (pre-request module)
- **`envRequired`** added to `setup/defaults.json` template (default: `[]`)

### Fixed
- Snapshot diff: object/array values now serialized as compact JSON (truncated at 80 chars) instead of `[object Object]` — much more readable diffs
- `setup/snapshot-view.js`: corrected storage limit reference from `~900 KB` to `~256 KB per variable`; added compatibility with both `savedAt` and `_saved` / `_meta.saved` timestamp fields
- `setup/engine-update.js`: added post-load VERSION verification (confirms loaded code contains a valid `VERSION` constant), file size display per engine file

### Changed
- Post-request pipeline now includes `assertEach` between `assertions` and `assertHeaders`
- Pre-request pipeline: `envRequired` runs after `configMerge`, before `iterationData`
- Collection template updated to v3.5.0: `envRequired: []` in defaults, updated description, added assertEach and envRequired usage examples

---

## [3.4.0] — 2026-04-07

### Added
- **HTML Report Generator** (`scripts/generate-report.js`) — converts Newman JSON export to a fully self-contained, beautiful HTML test report with summary stats, SVG pass-rate gauge, per-request timing bars, and expandable assertion details
- **`assertions` shorthand map** — concise JSONPath assertions in post-request engine:
  - `{ "$.data.id": { exists: true } }` — field exists
  - `{ "$.count": { gte: 1, lte: 100 } }` — comparisons (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`)
  - `{ "$.status": { type: "string" } }` — type checks
  - `{ "$.items": { minLen: 1, maxLen: 50 } }` — array/string length
  - `{ "$.email": { matches: "@" } }` — regex/substring match
  - `{ "$.error": { absent: true } }` — field must NOT exist
  - `{ "$.field": { soft: true } }` — soft assertion (logs, doesn't fail)
  - `{ "$.field": { when: "ctx.api.status === 200" } }` — conditional skip
- **`when` condition for `keysToFind`** — `{ path: "data.role", when: "ctx.api.status !== 404" }` — assertion runs only when condition is truthy
- **OAuth2 client_credentials** auth type — auto-fetches and caches access tokens; tokens cached in `hephaestus.oauth2.{clientId}` collection variables with expiry
- **`ctx.request.body`** and **`ctx.request.headers`** in post-request — request body (parsed + raw) and headers exposed for echo-testing and custom assertions

### Changed
- Post-request pipeline: `assertions.run()` now also calls `runAssertMap()` for the `assertions` shorthand
- `normalizeResponse` module: now populates `ctx.request.body`, `ctx.request.bodyParsed`, `ctx.request.headers`
- Auth module: supports new `oauth2cc` type alongside `none | basic | bearer | headers | variables`

---

## [3.3.0] — 2026-04-07

### Added
- **Data-driven testing** — `ctx.iteration` object exposed in both engines:
  - `ctx.iteration.index` — current iteration index (0-based)
  - `ctx.iteration.count` — total iteration count
  - `ctx.iteration.data` — full current row as object (Newman `--iteration-data`)
  - `ctx.iteration.get(key)` — typed accessor for a single data field
  - Variables auto-injected as `{{iter.fieldName}}` for use in URL / Body / Headers
  - Logged in pre-request summary when iteration > 0
- **Migration assistant** (`scripts/migrate.js`) — scans any Postman collection JSON and reports migration status per request (migrated / partial / needs-migration / no-scripts)
- **Newman → JUnit XML** (`scripts/ci-to-junit.js`) — converts Newman `--reporter-json-export` output to JUnit XML for CI dashboards (Jenkins, GitHub Actions, GitLab)
- **Ready-to-use plugins** (`docs/plugins/`):
  - `slack-notifier.js` — Slack webhook on HTTP 5xx or assertion failure
  - `teams-notifier.js` — Microsoft Teams Adaptive Card on failure
  - `custom-assertions.js` — reusable custom assertion library
  - `README.md` — how to install and register plugins
- **Snapshot Viewer** (`docs/snapshot-viewer.html`) — standalone visual tool: paste `hephaestus.snapshots` JSON, view and search snapshots with syntax highlighting, size gauge, expandable data cards
- **GitHub Pages** (`.github/workflows/pages.yml`) — deploys `docs/` on push to `main`

### Changed
- Pre-request pipeline: `configMerge → iterationData → urlBuilder → auth → dateUtils → logger`
- Post-request pipeline: `iterationData` added after `configMerge`
- `package.json`: new scripts `migrate`, `ci-to-junit`

---

## [3.2.0] — 2026-04-07

### Added
- `expectedStatus` — configurable expected HTTP status code(s) in `override` / `hephaestus.defaults`
  - Accepts a single number (`204`) or array (`[400, 422]`) — enables negative testing scenarios
  - Default: `[200, 201, 202]`
  - Fixed assertion to use `pm.expect(code).to.be.oneOf(allowed)` (clearer error messages)
- `assertHeaders` — new post-request module for response header assertions
  - Modes: `exists`, `contains` (string), `equals` (exact), `absent`, `function` predicate
  - Integrated into pipeline, logger output, and CI JSON
- Plugin system (`hephaestus.plugins`) — lightweight extensibility for post-request engine
  - Load custom modules from `collectionVariables` at runtime
  - Plugins receive full access to `ctx`, `pm`, and all engine internals
- `package.json` — project is now an npm package with dev scripts:
  - `npm run lint` — ESLint check
  - `npm run syntax` — Node.js syntax validation
  - `npm run validate:defaults` — JSON schema of `setup/defaults.json`
  - `npm run build` — configMerge sync validation
- `eslint.config.js` — ESLint v9 flat config with Postman sandbox globals
- `docs/banner.png` — project banner (replaces broken reference)
- `docs/newman-ci.md` — comprehensive Newman + CI integration guide (GitHub Actions, GitLab CI)
- `.github/workflows/release.yml` — automatic GitHub Release on `v*.*.*` tag push
- `scripts/build.js` — configMerge sync-check utility
- `CONTRIBUTING.md` — contributor guide
- `SECURITY.md` — security policy

### Fixed
- Badge version synchronized with engine `VERSION` constant (was `3.0.0`, now tracks releases)
- `defaults.json` — removed invalid `//` comments; file is now valid JSON
- `varsToSave` format in README Quick Start: corrected from array to object (matches engine)
- `auth` module: added `case 'none': break;` — no longer emits a spurious error when `auth.type = "none"` with `auth.enabled = true`
- `logger._maskStr` unified between `pre-request.js` and `post-request.js` — short strings now consistently return `'***'` in both engines (security fix)

### Changed
- CI workflow (`.github/workflows/lint.yml`) extended: `npm install` → syntax check → ESLint → `validate:defaults`
- `configMerge` module marked as `SHARED` in both engine files with explicit sync warning
- `method.post-request.js` template updated with `expectedStatus`, `assertHeaders` examples

---

## [3.1.0] — 2026-02-20

### Added
- `maxResponseTime` — response time assertion (`maxResponseTime: 500` in override/defaults)
- `soft: true` on `keysToFind` items — test passes even if field is absent (warning only)
- `ctx.api.all(path, filterFn)` — explicit "return all" alias for `ctx.api.find`
- `dates` config in override/defaults — flexible custom date variables:
  - Offset expressions: `today±Nd/w/m/y` (days, weeks, months, years)
  - Named: `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear`, `yesterday`, `tomorrow`, etc.
- Snapshot diff-preview in post-request log — specific changed paths shown directly in the console block
- `.github/ISSUE_TEMPLATE/` — bug report and feature request forms
- `.github/workflows/lint.yml` — GitHub Actions: syntax check for all engine/setup/template files

### Changed
- `dateUtils._shift` renamed to `_shiftMonths` (internal, no API change)
- `normalizeResponse`: `xml2Json` (deprecated) replaced with `require('xml2js')` + fallback
- Engine version bumped to `3.1.0` in both `pre-request.js` and `post-request.js`
- Repository structure: `v3/engine`, `v3/setup`, `v3/templates`, `v3/collection` moved to root level
- `README.md` rewritten in English; `README.ru.md` added (Russian)
- GitHub About description and topics set

---

## [3.0.0] — 2026-02-20 — Initial release

First public release of Hephaestus v3.

### Features
- Pipeline architecture: `orchestrator → ctx → modules`
- Config system: `hephaestus.defaults` (collection) + `override` (per-request)
- Auth plugin: `none`, `basic`, `bearer`, `headers`, `variables`
- Extract API: `ctx.api.get / find / count / save`
- Assertions: `keysToFind`, `varsToSave`, `keysToCount`
- Snapshot regression: `strict` / `non-strict`, `checkPaths`, `ignorePaths`, `autoSaveMissing`
- Schema validation via `tv4`
- Secret masking: keys and URL query params
- Structured logs: ASCII borders, response preview, CI mode (JSON)
- Auto-update engine from Git: `engine-update` (public + private repos via PAT)
- `urlBuilder`: auto-prepends `defaultProtocol`, warns on `http://`
- Postman collection template with system methods
- Full Apidog compatibility
