<div align="center">

# ⚒️ Hephaestus

**Modular API testing automation framework for Postman**

[![Version](https://img.shields.io/badge/version-3.0.0-blue?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Postman](https://img.shields.io/badge/Postman-v10+-orange?style=flat-square&logo=postman&logoColor=white)](https://postman.com)
[![Apidog](https://img.shields.io/badge/Apidog-compatible-9cf?style=flat-square)](https://apidog.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-sandbox-yellow?style=flat-square&logo=javascript&logoColor=black)](engine/)
[![Author](https://img.shields.io/badge/author-Bogdanov_Igor-blueviolet?style=flat-square)](mailto:bogdanov.ig.alex@gmail.com)

**[🇷🇺 Русская версия](README.ru.md)**

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
| 📸 **Snapshot regression** | Automatic baseline, strict/non-strict modes, checkPaths/ignorePaths |
| 🔐 **Auth plugin** | `none`, `basic`, `bearer`, `headers`, `variables` — configurable per request |
| 🔍 **Extract API** | `ctx.api.get()`, `.find()`, `.count()`, `.save()` — works with JSON and XML |
| ✅ **Assertions** | `keysToFind`, `varsToSave`, `keysToCount` with expected values |
| 📋 **Schema validation** | JSON Schema via built-in `tv4` — no external dependencies |
| 🛡️ **Secret masking** | Tokens, passwords, and URL query params masked in logs automatically |
| 📊 **Structured logs** | Emoji, ASCII borders, response preview, CI mode (JSON output) |
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
│   → assertions → snapshot → schema → logger                      │
│                                                                  │
│   • Parses JSON / XML / text response into ctx.response          │
│   • Records response time and body size                          │
│   • Exposes ctx.api for data traversal                           │
│   • Runs assertions, saves variables                             │
│   • Compares to snapshot or saves baseline                       │
│   • Validates JSON Schema                                        │
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
    varsToSave: [
        { path: "data.token", name: "prod.token", scope: "collection" }
    ],
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
| `dateFormat` | string | `"yyyy-MM-dd"` | Date format for dateUtils |
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
| `extractor` | Initializes `ctx.api` — Extract API with `get/find/count/save` |
| `assertions` | Runs `keysToFind`, saves `varsToSave`, counts `keysToCount` |
| `snapshot` | Compares to baseline or saves on `autoSaveMissing` |
| `schema` | Validates response body against a JSON Schema via `tv4` |
| `logger` | Outputs a structured, masked log: status, metrics, assertions, preview |

### Extract API

```javascript
ctx.api.get("data.user.id")                // → value at path
ctx.api.find("data.items", i => i.active)  // → first matching element
ctx.api.count("data.items")                // → element count
ctx.api.save("data.token", {               // → save to pm.variables / env / collection
    name: "prod.token",
    scope: "collection"
})
```

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
├── engine/
│   ├── pre-request.js            — pre-request engine → hephaestus.v3.pre
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

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 👤 Author

**Bogdanov Igor Alexandrovich**  
📞 [+998 90 175 38 36](tel:+998901753836)  
✉️ [bogdanov.ig.alex@gmail.com](mailto:bogdanov.ig.alex@gmail.com)  
🐙 [github.com/bogdanov-igor](https://github.com/bogdanov-igor)

---

## 📄 License

Distributed under the **MIT License** — see [LICENSE](LICENSE).

```
Copyright (c) 2026 Bogdanov Igor Alexandrovich
```
