<div align="center">

<img src="docs/banner.png" alt="Hephaestus" width="100%"/>

# ⚒️ Hephaestus

**Modular API testing automation framework for Postman**

[![Version](https://img.shields.io/badge/version-3.8.0-blue?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Postman](https://img.shields.io/badge/Postman-v10+-orange?style=flat-square&logo=postman&logoColor=white)](https://postman.com)
[![Apidog](https://img.shields.io/badge/Apidog-compatible-9cf?style=flat-square)](https://apidog.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-sandbox-yellow?style=flat-square&logo=javascript&logoColor=black)](engine/)
[![Author](https://img.shields.io/badge/author-Bogdanov_Igor-blueviolet?style=flat-square)](mailto:bogdanov.ig.alex@gmail.com)
[![Docs](https://img.shields.io/badge/docs-live%20site-f77f00?style=flat-square&logo=github)](https://bogdanov-igor.github.io/hephaestus-postman-framework/)

**[🇷🇺 Русская версия](README.ru.md)** · **[🌐 Live Docs](https://bogdanov-igor.github.io/hephaestus-postman-framework/)**

[Quick Start](#-quick-start) · [Configuration](#️-configuration) · [Modules](#-modules) · [Architecture](#️-architecture) · [Apidog](#-apidog-compatibility) · [Author](#-author)

</div>

---

## Overview

**Hephaestus** is an open-source framework for organizing, automating, and standardizing API testing in Postman. It replaces scattered pre/post-request scripts with a single, version-controlled engine — supporting snapshot regression, schema validation, flexible auth, and secret masking.

Each request in a collection contains only a minimal `override` config. All logic is handled by the engine loaded from Git.

**Built for:**
- QA engineers automating REST / XML API testing
- Teams using Postman as their primary tool
- Collections with many endpoints that need a consistent standard
- Projects requiring snapshot regression testing without CI overhead

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔄 **Pipeline architecture** | Orchestrator drives a module chain through a shared `ctx` object |
| ⚙️ **Defaults + Override** | Collection-level config merged with per-request overrides |
| 📸 **Snapshot regression** | Automatic baseline, strict/non-strict modes, checkPaths/ignorePaths, diff preview |
| 🔐 **Auth plugin** | `none`, `basic`, `bearer`, `headers`, `variables` — configurable per request |
| 🔍 **Extract API** | `ctx.api.get()`, `.find()`, `.all()`, `.count()`, `.save()` — JSON and XML |
| ✅ **Assertions** | `keysToFind` (with `soft` mode), `varsToSave`, `keysToCount`, `maxResponseTime` |
| 📨 **Header assertions** | `assertHeaders` — check existence, value, exact match, absence of response headers |
| 🔢 **expectedStatus** | Configurable expected HTTP status — supports negative testing (`400`, `[404, 422]`) |
| 🔌 **Plugin system** | Extend the engine without forking — load custom modules from `collectionVariables` at runtime |
| 📅 **Flexible dates** | `today±Nd/w/m/y`, `startOfMonth`, `endOfYear`, custom variables via `dates` config |
| 📋 **Schema validation** | JSON Schema via built-in `tv4` — no external dependencies |
| 🛡️ **Secret masking** | Tokens, passwords, and URL query params masked in logs automatically |
| 📊 **Structured logs** | Emoji, ASCII borders, response preview, snapshot diff, CI mode (JSON output) |
| 🔄 **Auto-update** | Engine updated from Git with a single `engine-update` request |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         PRE-REQUEST                              │
│                                                                  │
│   configMerge → urlBuilder → auth → dateUtils → logger           │
│                                                                  │
│   • Merges hephaestus.defaults + override                        │
│   • Sets pm.variables.baseUrl (auto-prepends protocol)           │
│   • Applies auth headers / pm.variables                          │
│   • Logs request config with secret masking                      │
└──────────────────────────────────────────────────────────────────┘
                        ⬇  HTTP Request  ⬇
┌──────────────────────────────────────────────────────────────────┐
│                         POST-REQUEST                             │
│                                                                  │
│   configMerge → normalizeResponse → metrics → extractor          │
│   → assertions → assertHeaders → snapshot → schema               │
│   → plugins → logger                                             │
│                                                                  │
│   • Parses JSON / XML / text response into ctx.response          │
│   • Checks expected HTTP status (expectedStatus)                 │
│   • Exposes ctx.api for data traversal                           │
│   • Runs body assertions, saves variables                        │
│   • Validates response headers (assertHeaders)                   │
│   • Compares to snapshot or saves baseline                       │
│   • Validates JSON Schema                                        │
│   • Runs custom plugins from collectionVariables                 │
│   • Outputs a structured, masked log                             │
└──────────────────────────────────────────────────────────────────┘
```

### How the engine works

```
Git (engine/pre-request.js + engine/post-request.js)
         ↓  engine-update (pm.sendRequest)
collectionVariables["hephaestus.v3.pre"]
collectionVariables["hephaestus.v3.post"]
         ↓  each request
eval(pm.collectionVariables.get("hephaestus.v3.pre"))
eval(pm.collectionVariables.get("hephaestus.v3.post"))
```

### The `ctx` object

```javascript
ctx = {
    config:   { /* merged: defaults + override */ },
    request:  { name, method, url },
    response: { parsed, raw, code, time, size, format },
    api:      { get(path), find(path, fn), count(path), save(path, target) }
}
```

---

## 🚀 Quick Start

### Step 1 — Import the collection

```
Postman → Import → collection/hephaestus-template.postman_collection.json
```

### Step 2 — Bind an environment

Create or attach an environment with the variables your requests need:

```
login.*      — user logins
password.*   — user passwords
channel.*    — additional fields (if required)
```

### Step 3 — Configure defaults

Open **⚙️ defaults** in `🛠️ Hephaestus System`, edit the JSON body, and click **Send**:

```json
{
  "baseUrl": "https://your-api.example.com",
  "defaultProtocol": "https",
  "auth": { "enabled": false, "type": "none" },
  "contentType": "json",
  "snapshot": { "enabled": false, "autoSaveMissing": true, "mode": "non-strict" },
  "secrets": ["token", "password", "pass", "key"],
  "ci": false
}
```

### Step 4 — Load the engine

```
🛠️ Hephaestus System → 🔧 engine-update → Send
```

The engine is fetched from Git and saved to `hephaestus.v3.pre` and `hephaestus.v3.post`.  
Re-run after any framework update.

### Step 5 — Write a request

Each request contains only an `override` + engine invocation:

**Pre-request script:**
```javascript
const override = {
    auth: {
        enabled: true,
        type: "bearer",
        token: "{{prod.token}}"
    }
};

eval(pm.collectionVariables.get("hephaestus.v3.pre"));
```

**Tests (Post-request):**
```javascript
const override = {
    contentType: "json",
    keysToFind: [
        { path: "data.id",     name: "ID" },
        { path: "data.status", name: "Status", expect: "active" }
    ],
    varsToSave: {
        token: { path: "data.token", name: "prod.token", scope: "collection" }
    },
    snapshot: { enabled: true, autoSaveMissing: true }
};

eval(pm.collectionVariables.get("hephaestus.v3.post"));
```

---

## ⚙️ Configuration

### Full field reference

| Field | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | string | `""` | API base URL — protocol can be omitted, it will be prepended |
| `defaultProtocol` | string | `"https"` | Default protocol when `baseUrl` has none. `"http"` triggers a warning |
| `auth.enabled` | boolean | `false` | Enable authentication |
| `auth.type` | string | `"none"` | Auth type: `none`, `basic`, `bearer`, `headers`, `variables` |
| `contentType` | string | `"json"` | Expected response format: `json`, `xml`, `text` |
| `expectEmpty` | boolean | `false` | Expect an empty response body |
| `expectedStatus` | number \| number[] | `[200,201,202]` | Expected HTTP status code(s). Use for negative testing: `400`, `[404, 422]` |
| `maxResponseTime` | number | `1000` | Max allowed response time in ms. Fail test if exceeded |
| `dateFormat` | string | `"yyyy-MM-dd"` | Date format used for all date variables |
| `dates` | object | — | Custom date variables — see [dateUtils](#-dateutils) |
| `assertHeaders` | object[] | `[]` | Response header assertions — see [assertHeaders](#-assertheaders) |
| `snapshot.enabled` | boolean | `false` | Enable snapshot comparison |
| `snapshot.mode` | string | `"non-strict"` | `strict` (full diff) or `non-strict` (checkPaths only) |
| `snapshot.autoSaveMissing` | boolean | `true` | Auto-save baseline when missing |
| `snapshot.checkPaths` | string[] | `[]` | Compare only these paths (empty = all) |
| `snapshot.ignorePaths` | string[] | `[]` | Ignore these paths during comparison |
| `schema.enabled` | boolean | `false` | Enable JSON Schema validation |
| `schema.definition` | object | `null` | JSON Schema object |
| `secrets` | string[] | `[...]` | Key names whose values are masked in logs |
| `ci` | boolean | `false` | CI mode: structured JSON log output |

### Auth types

| Type | Behavior |
|---|---|
| `none` | No authentication |
| `basic` | `Authorization: Basic base64(user:pass)` |
| `bearer` | `Authorization: Bearer {token}` |
| `headers` | Injects arbitrary request headers |
| `variables` | Sets `pm.variables` for URL / body substitution |

**Example — `variables` (login + channel + password):**
```javascript
auth: {
    enabled: true,
    type: "variables",
    fields: {
        "login":    "{{login.main}}",
        "channel":  "{{channel.main}}",
        "password": "{{password.main}}"
    }
}
```

### Secret masking

Masking is applied to **log output only** — actual saved values are never altered.

- Keys matching any word in `secrets` are masked: `AAAI3A***MASKED***KMR3ms`
- URL query params with matching key names are masked in the POST-REQUEST log
- Customize the list via `secrets` in defaults or override

---

## 🧩 Modules

### Pre-request pipeline

| Module | Description |
|---|---|
| `configMerge` | Deep merge: `hephaestus.defaults` + `override` → `ctx.config` |
| `urlBuilder` | Sets `pm.variables.baseUrl`; auto-prepends `defaultProtocol` if missing |
| `auth` | Auth plugin — applies the selected type to the outgoing request |
| `dateUtils` | Computes dates (today, tomorrow, etc.) into `pm.variables` |
| `logger` | Logs request config with secret masking |

### Post-request pipeline

| Module | Description |
|---|---|
| `configMerge` | Re-merges config for test-side access |
| `normalizeResponse` | Parses JSON / XML (xml2js) / text → `ctx.response` |
| `metrics` | Records response time and body size |
| `extractor` | Initializes `ctx.api` — Extract API with `get/find/all/count/save` |
| `assertions` | `keysToFind` (soft), `varsToSave`, `keysToCount`, `maxResponseTime` |
| `assertHeaders` | Validates response headers: exists, contains, equals, absent |
| `snapshot` | Compares to baseline or saves on `autoSaveMissing`; diff shown in log |
| `schema` | Validates response body against a JSON Schema via `tv4` |
| `plugins` | Runs custom modules from `collectionVariables` (`hephaestus.plugins`) |
| `logger` | Structured, masked log: status, metrics, assertions, snapshot diff, preview |

### Extract API

```javascript
ctx.api.get("data.user.id")                 // → value at dot-path (any depth)
ctx.api.find("data.items", i => i.active)   // → array filtered by predicate
ctx.api.all("data.items", i => i.active)    // → same as find (explicit alias)
ctx.api.count("data.items")                 // → array length
ctx.api.save("data.token", {                // → save to pm scope
    name: "prod.token",
    scope: "collection"                     // "collection" | "environment" | "local"
})
```

Wildcard traversal is also supported:

```javascript
ctx.api.get("data.items[*].id")   // → array of all `id` values in the list
ctx.api.all("data.items[*]")      // → all items in the list
```

---

## ✅ Assertions

### keysToFind — find and validate fields

```javascript
keysToFind: [
    { path: "data.id",     name: "ID" },                     // field exists
    { path: "data.status", name: "Status", expect: "active" }, // exact match
    { path: "data.count",  name: "Count",  expect: v => v > 0 }, // predicate
    { path: "data.extra",  name: "Extra",  soft: true },     // ⚪ soft: no fail if missing
]
```

`soft: true` — the test passes even if the field is absent. Useful for optional fields.

### varsToSave — save values to variables

```javascript
varsToSave: {
    token: { path: "data.token", name: "prod.token", scope: "collection" }
    // scope: "collection" | "environment" | "local"
}
```

### maxResponseTime — response time assertion

Default value is `1000` ms (set globally in `hephaestus.defaults`). Override per request:

```javascript
// In hephaestus.defaults (collection-level global):
{
    "maxResponseTime": 1000   // ⏱ default for all requests
}

// In a specific request (override):
const override = {
    maxResponseTime: 500   // ⏱ stricter limit for this request only
};
```

### keysToCount — count array elements

```javascript
keysToCount: {
    items: { path: "data.items", expected: 10 }
}
```

### expectedStatus — expected HTTP status

Default: `[200, 201, 202]`. Override per request to test any status:

```javascript
// Single status (e.g. 204 No Content):
const override = { expectedStatus: 204 };

// Multiple statuses:
const override = { expectedStatus: [200, 201] };

// Negative testing — expect a 400 Bad Request:
const override = { expectedStatus: 400 };

// Multiple error codes:
const override = { expectedStatus: [400, 422] };
```

---

## 📨 assertHeaders

Assert response headers directly in `override`:

```javascript
assertHeaders: [
    // Header exists:
    { name: "X-Request-Id" },

    // Header contains a string:
    { name: "Content-Type", expect: "application/json" },

    // Exact match:
    { name: "X-Api-Version", equals: "v2" },

    // Custom predicate:
    { name: "X-Rate-Limit-Remaining", label: "Rate limit > 0", expect: v => Number(v) > 0 },

    // Header must be absent:
    { name: "X-Deprecated", absent: true },
]
```

| Field | Type | Description |
|---|---|---|
| `name` | string | Header name (case-insensitive per HTTP spec) |
| `label` | string | Optional display name in test results |
| `expect` | string \| function | Contains check (string) or custom predicate (function) |
| `equals` | string | Exact value match |
| `absent` | boolean | Assert header is **not** present in the response |

---

## 🔌 Plugin System

Extend the engine without forking. Plugins are JS scripts stored in `collectionVariables` and executed after all built-in modules.

### Setup

1. Write plugin code and save it to a collection variable (e.g. `hephaestus.plugin.slack`):

```javascript
// hephaestus.plugin.slack — contents of the collectionVariable
if (ctx.response.code >= 500) {
    pm.sendRequest({
        url: pm.collectionVariables.get('slack.webhook.url'),
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        body: {
            mode: 'raw',
            raw: JSON.stringify({ text: '🔴 ' + ctx.request.name + ' → HTTP ' + ctx.response.code })
        }
    }, function() {});
}
```

2. Register it in `hephaestus.plugins` (collection variable, JSON array):

```json
[
  { "name": "slack-notifier", "post": "hephaestus.plugin.slack" }
]
```

### Plugin context

Plugins run in the engine scope and have access to:

| Variable | Description |
|---|---|
| `ctx` | Full context: `ctx.config`, `ctx.request`, `ctx.response`, `ctx.api`, `ctx._meta` |
| `pm` | Postman API — `pm.test`, `pm.expect`, `pm.sendRequest`, variables, etc. |
| `_override` | The current request's override config |

---

## 📅 dateUtils

Always available as `pm.variables`:

| Variable | Value |
|---|---|
| `{{currentDate}}` | Today |
| `{{monthsAgo1}}` | 1 month ago |
| `{{monthsAgo3}}` | 3 months ago |
| `{{monthsAgo6}}` | 6 months ago |
| `{{monthsAgo12}}` | 12 months ago |

**Custom variables** via `dates` in override or defaults:

```javascript
const override = {
    dates: {
        "startDate":  "today-7d",          // 7 days ago
        "endDate":    "today",             // today
        "nextMonth":  "today+1m",          // +1 month
        "weekLater":  "today+1w",          // +7 days
        "firstDay":   "startOfMonth",      // first day of current month
        "lastDay":    "endOfMonth",        // last day of current month
        "yearStart":  "startOfYear",       // Jan 1
        "yearEnd":    "endOfYear",         // Dec 31
        "prevStart":  "startOfPrevMonth",
        "nextStart":  "startOfNextMonth",
    }
};
```

Use as `{{startDate}}`, `{{endDate}}` etc. in URL, body, or headers.  
Format is controlled by `dateFormat` (default: `yyyy-MM-dd`).

**Supported expressions:**

| Expression | Description |
|---|---|
| `today` | Current date |
| `yesterday` / `tomorrow` | ±1 day |
| `today+Nd` / `today-Nd` | ±N days |
| `today+Nw` / `today-Nw` | ±N weeks |
| `today+Nm` / `today-Nm` | ±N months |
| `today+Ny` / `today-Ny` | ±N years |
| `startOfMonth` / `endOfMonth` | First/last day of current month |
| `startOfNextMonth` / `endOfNextMonth` | First/last day of next month |
| `startOfPrevMonth` / `endOfPrevMonth` | First/last day of previous month |
| `startOfYear` / `endOfYear` | Jan 1 / Dec 31 |

---

## 📸 Snapshot Regression

Snapshots are stored in `hephaestus.snapshots` (collectionVariables) as a JSON object.

**Snapshot key:** `{collectionName}::{requestName}::{statusCode}::{format}`

| Mode | Behavior |
|---|---|
| `non-strict` | Checks only `checkPaths`, ignores `ignorePaths` |
| `strict` | Full structural diff (with `ignorePaths` applied) |

**Managing snapshots:**

| Action | Location |
|---|---|
| View | `🛠️ Hephaestus System → 📋 snapshot-view` |
| Clear | `🛠️ Hephaestus System → 🗑️ snapshot-clear` |
| Filter | `hephaestus.snapshot.clearFilter` collection variable |

---

## 🔄 Engine Updates

Engine version is controlled by `hephaestus.version` in collectionVariables:

| Value | Result |
|---|---|
| `main` | Loads the latest commit from `main` branch |
| `3.1.0` | Loads tag `v3.1.0` |

After changing the version → run `🔧 engine-update`.

**Private repositories:** set `hephaestus.githubToken` to a GitHub PAT.  
The engine will use the GitHub Contents API instead of raw URLs.

---

## 🔌 Apidog Compatibility

Hephaestus v3 is **fully compatible** with [Apidog](https://apidog.com).

| Hephaestus feature | Postman | Apidog |
|---|---|---|
| `pm.collectionVariables.get/set` | ✅ | ✅ (Module Variables) |
| `pm.sendRequest` | ✅ | ✅ |
| `eval()` | ✅ | ✅ |
| `pm.test` | ✅ | ✅ |
| `pm.response.json/text` | ✅ | ✅ |
| `pm.variables.set/get` | ✅ | ✅ |

> In Apidog, `collectionVariables` are called **Module Variables** in the UI but work identically via `pm.collectionVariables.*`.

**To import into Apidog:** `Import → Postman Collection → select JSON file`. Scripts transfer without changes.

---

## 📁 Repository Structure

```
/
├── README.md                     — documentation (English)
├── README.ru.md                  — documentation (Russian)
├── CHANGELOG.md                  — version history
├── LICENSE                       — MIT license
├── docs/
│   └── banner.png                — project banner
├── .github/
│   ├── ISSUE_TEMPLATE/           — bug report / feature request forms
│   └── workflows/lint.yml        — engine syntax check on push
├── engine/
│   ├── pre-request.js            — pre-request engine  → hephaestus.v3.pre
│   └── post-request.js           — post-request engine → hephaestus.v3.post
├── templates/
│   ├── method.pre-request.js     — method template (pre)
│   └── method.post-request.js    — method template (post)
├── setup/
│   ├── defaults.json             — hephaestus.defaults template
│   ├── engine-update.js          — fetch engine from Git
│   ├── snapshot-clear.js         — clear snapshots
│   └── snapshot-view.js          — view snapshots
└── collection/
    ├── README.md                 — import instructions
    └── hephaestus-template.postman_collection.json
```

---

## 🎲 ctx.random — Test Data Generators (v3.8)

Built-in random data generators available in pre-request plugins and scripts:

```javascript
ctx.random.uuid()           // "550e8400-e29b-41d4-a716-446655440000"
ctx.random.email()          // "user_a3f2c1@test.com"
ctx.random.str(16)          // "xk8mP2nQ7w3bRz9v"
ctx.random.int(1, 1000)     // 742
ctx.random.float(0.1, 9.9)  // 4.37
ctx.random.bool()           // true
ctx.random.pick(["a","b"])  // "b"
ctx.random.date()           // "2025-08-14"
```

Auto-populate pm.variables with `randomData` config:

```javascript
const override = {
    randomData: {
        email:  "random.email",      // → {{email}}
        userId: "random.int:1:9999", // → {{userId}}
        token:  "random.uuid",       // → {{token}}
    }
};
```

## 🔑 assertUnique (v3.8)

```javascript
const override = {
    assertUnique: { path: "data.items", by: "id" }
    // All item.id values must be unique
};
```

## 🔇 softFail + logLevel (v3.8)

```javascript
// In hephaestus.defaults — make all assertions non-blocking:
{ "softFail": true }

// Control console verbosity:
{ "logLevel": "minimal" }  // one line per request
{ "logLevel": "silent"  }  // no console output (CI JSON still emitted)
{ "logLevel": "verbose" }  // box + response headers
```

## 👁️ Watch Mode (v3.8)

```bash
npm run watch -- -c collection.json -e env.json
# Re-runs Newman automatically on file change. Press R to force re-run.
```

## 🔍 Run Comparison (v3.8)

```bash
npm run compare -- before.json after.json
npm run compare -- before.json after.json --md   # Markdown for PRs
```

Highlights: new failures, resolved failures, performance regressions (>20%), status code changes.

---

## ⚡ retryOnStatus (v3.7)

Автоматически повторяет запрос, если статус входит в список. Пропускает assertions и snapshot на промежуточных попытках:

```javascript
const override = {
    retryOnStatus: {
        statuses:   [503, 429],  // retry on these statuses
        maxRetries: 3
    }
};
```

Счётчик хранится в `pm.variables` и автоматически очищается при успехе или исчерпании попыток.

## 📝 API Docs from Collection (v3.7)

```bash
# Generate Markdown docs from your Postman collection
npm run docs -- collection.json -o API.md

# Get raw structured data as JSON (for tooling)
npm run docs -- collection.json --json
```

Output includes: method, URL, expected status, assertShape contract, assertions table, sort order — all extracted automatically from your test scripts.

## 📊 Newman Run Summary (v3.7)

```bash
# Pretty console summary after Newman run
npm run summary -- results.json

# Markdown output (for PR comments, Confluence, etc.)
npm run summary -- results.json --md > summary.md
```

Shows: overall pass rate, per-folder breakdown table, top-5 slowest endpoints, top-5 most-failed assertions.

## 🧙 Interactive Init Wizard (v3.7)

```bash
npm run init
```

Answers a series of questions and generates a ready-to-use `hephaestus.defaults` JSON and a Postman environment file template.

---

## 🧩 assertShape + assertOrder (v3.6)

**`assertShape`** — one-liner type declarations per field, ideal for verifying the response contract before detailed assertions:

```javascript
const override = {
    assertShape: {
        "data":        "object",
        "data.id":     "number",
        "data.name":   "string",
        "data.items":  "array",
        "data.active": "boolean",
        "meta":        "any",     // exists, any type
        "error":       "absent",  // must NOT exist
    }
};
```

**`assertOrder`** — verify array is sorted by a field:

```javascript
const override = {
    assertOrder: {
        path:      "data.items",
        by:        "createdAt",
        direction: "desc",   // "asc" | "desc"
        type:      "date"    // "string" | "number" | "date"
    }
};
```

## 🐳 Docker (v3.6)

Run Newman tests in Docker without a local Node.js install:

```bash
# Build once
docker build -t hephaestus-runner .

# Run collection + generate reports
bash scripts/docker-run.sh -c collection.json -e env.json -o reports/

# Or via compose
docker-compose run --rm newman run /data/collection.json -e /data/env.json \
  --reporter-json-export /data/results.json -r json
```

## 📖 Config Reference (v3.6)

Full searchable reference of every config option with types, defaults, and examples:

👉 **[docs/config-reference.html](https://bogdanov-igor.github.io/hephaestus-postman-framework/config-reference.html)**

## 🔬 npm test (v3.6)

```bash
npm test
```

Runs 18 automated tests across all tooling scripts: syntax check, version consistency, build validation, migrate classification, JUnit XML output, HTML report generation.

---

## 🔢 assertEach — Array item validation (v3.5)

Validate every element of an array against a rule set in a single declaration:

```javascript
const override = {
    assertEach: {
        path:     "data.items",   // JSONPath to the array
        minCount: 1,              // at least 1 element
        maxCount: 200,            // at most 200 elements
        rules: {
            "id":     { type: "number", gt: 0 },
            "name":   { type: "string", minLen: 1 },
            "status": { eq: "active" },
            "email":  { matches: "@", soft: true },  // soft — warn, don't fail
        }
    }
};
```

All violations are aggregated into a single `pm.test`, showing up to 10 problem entries with their index and field path (e.g. `[3].status: eq "active", got "inactive"`).

Supports all operators from the `assertions` shorthand map: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `type`, `minLen`, `maxLen`, `includes`, `matches`, `exists`, `absent`, `soft`.

## ✅ envRequired — Pre-flight env validation (v3.5)

Prevent cryptic failures by declaring which environment variables are required:

```javascript
// In hephaestus.defaults (apply to all requests):
{
    "envRequired": ["BASE_URL", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET"]
}

// Or per-request override:
const override = {
    envRequired: ["PAYMENT_API_KEY"]
};
```

If any variable is empty or missing, the request is blocked with a clear error listing all missing variables and the current environment name.

---

## 🧪 Assertions shorthand (v3.4)

A concise map syntax alongside the classic `keysToFind` array:

```javascript
const override = {
    assertions: {
        "data.id":     { exists: true },
        "data.status": { eq: "active" },
        "data.count":  { gte: 1, lte: 100 },
        "data.items":  { type: "array", minLen: 1 },
        "data.email":  { matches: "@" },
        "meta.error":  { absent: true },

        // Soft assertion — logs warning, doesn't fail pm.test
        "data.extra":  { exists: true, soft: true },

        // Conditional — only runs when status is 200
        "data.token":  { exists: true, when: "ctx.api.status === 200" },
    },
    // keysToFind also supports `when` now
    keysToFind: [
        { path: "data.role", when: "ctx.api.body && ctx.api.body.type !== 'guest'" }
    ]
};
```

Operators: `exists`, `absent`, `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `type`, `minLen`, `maxLen`, `includes`, `matches`, `soft`, `when`.

## 🔐 OAuth2 client_credentials (v3.4)

Auto-refreshing OAuth2 tokens. Add to your pre-request override:

```javascript
const override = {
    auth: {
        enabled: true,
        type: "oauth2cc",
        oauth2cc: {
            tokenUrl:     "https://auth.example.com/oauth/token",
            clientId:     "{{oauth_client_id}}",
            clientSecret: "{{oauth_client_secret}}",
            scope:        "api:read api:write"
        }
    }
};
```

- Token cached in `hephaestus.oauth2.{clientId}.*` collection variables
- Auto-refreshed 60 seconds before expiry
- Supports `extraParams` for additional token request fields (e.g. `audience`)

## 📊 HTML Report (v3.4)

Generate a beautiful standalone HTML report from Newman output:

```bash
# Run Newman with JSON export
newman run collection.json -e env.json --reporter-json-export results.json -r json

# Generate HTML report
node scripts/generate-report.js results.json report.html
```

The report includes: pass-rate SVG gauge, per-request timing bars, expandable assertion details, failed-only filter, and search. Works offline — single self-contained `.html` file.

## 📡 Request Body & Headers in plugins (v3.4)

Access the sent request body and headers inside post-request plugins and assertions:

```javascript
// In a plugin or assertSoft rule:
ctx.request.body       // raw body string
ctx.request.bodyParsed // parsed JSON object (or null)
ctx.request.headers    // { "content-type": "application/json", ... }

// Echo-testing example (assert response echoes the request):
const sent     = ctx.request.bodyParsed;
const received = ctx.api.body;
pm.test("Echo: id matches", () => pm.expect(received.id).to.eql(sent.id));
```

---

## 🛠 Ecosystem Tools (v3.3)

| Tool | Description |
|---|---|
| [**Snapshot Viewer**](https://bogdanov-igor.github.io/hephaestus-postman-framework/snapshot-viewer.html) | Visual browser for `hephaestus.snapshots` — filter, inspect, size gauge |
| [**migrate.js**](scripts/migrate.js) | Scans a Postman collection and reports migration status per request |
| [**ci-to-junit.js**](scripts/ci-to-junit.js) | Converts Newman JSON reporter output to JUnit XML (Jenkins, GitHub, GitLab) |
| [**docs/plugins/**](docs/plugins/) | Ready-to-use plugins: Slack, Teams, custom assertions |
| [**Newman + CI Guide**](docs/newman-ci.md) | GitHub Actions, GitLab CI, Jenkins — full setup guide |

### Migration Assistant

```bash
# Check how many requests need migration
node scripts/migrate.js my-collection.json

# Show scripts for unmigrated requests + suggest override starters
node scripts/migrate.js my-collection.json --verbose --template

# Machine-readable output
node scripts/migrate.js my-collection.json --json > migration.json
```

### Newman → JUnit XML

```bash
# Run Newman with JSON export
newman run collection.json -e env.json --reporter-json-export results.json -r json

# Convert to JUnit XML
node scripts/ci-to-junit.js results.json junit-report.xml
```

```yaml
# GitHub Actions — publish test summary
- uses: dorny/test-reporter@v1
  with:
    files: junit-report.xml
    reporter: java-junit
```

### Data-driven Testing (v3.3)

`ctx.iteration` is now available in all plugins and post-request scripts:

```javascript
// In custom-assertions plugin or override assertHeaders
const userId = ctx.iteration.get('userId');       // from CSV/JSON row
const email   = ctx.iteration.data.email;         // same
const rowNum  = ctx.iteration.index + 1;          // 1-based

// Newman: use {{iter.userId}} in URL / Body / Headers
// newman run col.json --iteration-data data.csv
```

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 👤 Author

**Bogdanov Igor** · ✉️ [bogdanov.ig.alex@gmail.com](mailto:bogdanov.ig.alex@gmail.com)

---

## 📄 License

Distributed under the **MIT License** — see [LICENSE](LICENSE).

```
Copyright (c) 2026 Bogdanov Igor
```
