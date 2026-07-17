# Recipes

Ten common API-testing tasks, each as a ready-to-paste `override` block. An
`override` is a small config object the engine reads: declare *what* to check,
and one version-controlled engine does the merge, the assertions and the
logging. No per-request scripting.

**How to paste.** Open a request, go to the **Tests** tab (post-request) or the
**Pre-request** tab, and drop the block above the engine line that ships in the
[template](../templates/method.post-request.js):

```javascript
const override = { /* … a recipe below … */ };
eval(pm.collectionVariables.get("hephaestus.v3.post"));   // Pre-request: hephaestus.v3.pre
```

Blocks below are post-request (Tests tab) unless noted. `locale: "en"` switches
the engine's own output — test names, logs, status labels — to English; set it
once in `hephaestus.defaults` or per request. The default is `"ru"`. The full
field-by-field reference is [`config-reference.html`](config-reference.html).

---

## 1. Assert a paginated list

Validate every item in an array, its shape, and its ordering in one pass.

```javascript
const override = {
  locale: "en",
  assertShape: {
    "data.items": "array",
    "data.total": "number"
  },
  assertEach: {
    path:     "data.items",
    minCount: 1,
    maxCount: 100,
    rules: {
      "id":        { type: "number", gt: 0 },
      "status":    { eq: "active" },
      "email":     { matches: "@", soft: true }
    }
  },
  assertOrder: {
    path:      "data.items",
    by:        "createdAt",
    direction: "desc",
    type:      "date"
  }
};
```

Note: `assertEach` aggregates all element violations into a single test; `soft: true` on a rule warns instead of failing.

---

## 2. Auth chaining — token from a login response

Two requests. The login request saves the token; the next one sends it.

Login request — **Tests** tab:

```javascript
const override = {
  varsToSave: {
    token: { path: "data.accessToken", name: "prod.token", scope: "collection" }
  }
};
```

Next request — **Pre-request** tab (keep the `hephaestus.v3.pre` engine line):

```javascript
const override = {
  auth: { enabled: true, type: "bearer", token: "{{prod.token}}" }
};
```

Note: `scope: "collection"` persists the token across the whole run; `{{prod.token}}` resolves it. Use `"environment"` or `"local"` for other scopes.

---

## 3. Poll with retries

Re-send the request while the status is still "not ready", up to a cap.

```javascript
const override = {
  retryOnStatus: {
    statuses:   [202, 429, 503],
    maxRetries: 5
  },
  keysToFind: [
    { path: "data.status", name: "Job status", expect: "done" }
  ]
};
```

Note: on a matching status the engine re-runs the request and skips the rest of the pipeline; after `maxRetries` it fails with a clear message.

---

## 4. Snapshot regression + re-baseline

Compare each response to a saved baseline; re-baseline in one run when the API legitimately changed.

```javascript
const override = {
  snapshot: {
    enabled:         true,
    mode:            "non-strict",
    autoSaveMissing: true,
    checkPaths:      ["data.status", "data.items[*].id"],
    ignorePaths:     ["data.timestamp", "data.requestId"]
  }
};
```

Re-baseline — set `record: true`, run the request once, then remove it:

```javascript
const override = {
  snapshot: { enabled: true, record: true }   // or top-level: snapshotRecord: true
};
```

Note: `non-strict` requires every baseline key to still be present (new keys are allowed); `strict` diffs the whole body. Baselines live in the `hephaestus.snapshots` collection variable.

---

## 5. JSON Schema validation

Validate the body against a JSON Schema (draft-07 via the bundled `tv4`).

```javascript
const override = {
  schema: {
    enabled: true,
    definition: {
      type: "object",
      required: ["id", "status"],
      properties: {
        id:     { type: "number" },
        status: { type: "string", enum: ["active", "inactive"] }
      }
    }
  }
};
```

Note: `enabled` and `definition` are both required; without a `definition` the module is a no-op.

---

## 6. Security audit

Passive checks on the response — protective headers, server disclosure, body leaks, CORS.

```javascript
const override = {
  securityAudit: {
    enabled:        true,
    requireHeaders: ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"],
    forbidHeaders:  ["server", "x-powered-by", "x-aspnet-version"],
    checkCors:      true
  }
};
```

Note: each check emits its own test, so a policy breach fails the run. Omit any list to fall back to the built-in default; `securityAudit: { enabled: true }` uses all defaults.

---

## 7. Performance / SLA gate

Fail a request that responds too slowly.

```javascript
const override = {
  maxResponseTime: 800   // ms
};
```

Note: this gates each request. For a run-wide p95 gate, pipe Newman results through the CLI:
`node bin/hephaestus.js summary results.json --sla=500` — exits 1 when p95 is over budget.

---

## 8. Negative testing

Assert a request *should* fail with a specific status.

```javascript
const override = {
  expectedStatus: [400, 422]   // a number or a list; passes only on these
};
```

For a `204 No Content` (empty body):

```javascript
const override = {
  expectedStatus: 204,
  expectEmpty:    true
};
```

Note: the default expected set is `[200, 201, 202]`; naming a 4xx makes that the pass condition. `expectEmpty: true` asserts an (almost) empty body.

---

## 9. Extract + count fields

Read a few fields, count a filtered subset, and stash one for later.

```javascript
const override = {
  keysToFind: [
    { path: "data.id",     name: "Order ID" },
    { path: "data.status", name: "Status", expect: "paid" }
  ],
  keysToCount: {
    lineItems: { path: "data.items", expected: 3 },
    inStock:   { path: "data.items", filter: i => i.available === true }
  },
  varsToSave: {
    orderId: { path: "data.id", name: "prod.orderId", scope: "collection" }
  }
};
```

Note: `keysToCount` with `expected` asserts an exact length; without it, it just reports the count. `filter` narrows the array first.

---

## 10. Header assertions

Assert response headers — present, contains, exact, or absent.

```javascript
const override = {
  assertHeaders: [
    { name: "X-Request-Id" },                              // exists
    { name: "Content-Type", expect: "application/json" },  // contains
    { name: "X-Api-Version", equals: "v2" },               // exact match
    { name: "X-Deprecated", absent: true }                 // must be absent
  ]
};
```

Note: `expect` as a string matches a substring; `equals` requires an exact value; `absent: true` fails if the header is present. A function `expect: v => Number(v) > 0` runs a custom predicate.
</content>
</invoke>
