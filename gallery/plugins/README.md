# Plugin Gallery

Drop-in plugins for the Hephaestus post-request pipeline. Zero dependencies, no
engine fork, no build step — each one is a single file you paste into a
collection variable.

## The plugins

| Plugin | What it does | Engine surfaces used |
|---|---|---|
| [`response-budget.js`](./response-budget.js) | Fails the run when a response misses its latency budget. Per-request budgets, soft mode, and a warning band before the hard limit. | `ctx.config`, `ctx.request.name`, `ctx.response.time`, `ctx._meta.errors`, `pm.test` |
| [`timing-histogram.js`](./timing-histogram.js) | Collects response times across a run and prints an ASCII histogram with p50/p90/p95/max and the three slowest requests. | `ctx.response.time`, `ctx.request.name`, `ctx.iteration`, `pm.collectionVariables`, `console.log` |
| [`pii-redactor.js`](./pii-redactor.js) | Finds credential- and PII-shaped values in the response, reports them masked, and registers their field names so the engine summary redacts them too. | `ctx.response.parsed`/`.raw`, `ctx.config.secrets`, `ctx._meta.errors`, `pm.test` |
| [`csv-metrics.js`](./csv-metrics.js) | Appends one CSV row per request — timing, size, and every module's verdict — and prints the whole table between cut markers at the end of the run. | `ctx.request`, `ctx.response`, `ctx.iteration`, `ctx._meta.results`, `pm.collectionVariables` |
| [`_template.js`](./_template.js) | Commented skeleton documenting every surface a plugin can touch. Copy, rename, delete the rest. | — |

## How a plugin runs

There is no hook system. The engine has exactly one extension point —
`plugins.run(ctx)` in `engine/src/post-request.js` — which `eval`s your code
inside the post-request IIFE. Your file runs **once per request**, second to
last in the pipeline:

```
configMerge → iterationData → normalizeResponse → [retryOnStatus?]
  → metrics → extractor → assertions → assertEach → assertShape
  → graphql → assertOrder → assertUnique → assertHeaders
  → snapshot → schema → securityAudit → ►PLUGINS◄ → logger.summary
```

Running there is what makes these plugins possible: every assertion verdict is
already in `ctx._meta.results`, and `logger.summary` has not printed yet, so
`ctx.config` is still live (that is how `pii-redactor` extends the engine's own
redaction list).

If `retryOnStatus` fires, the pipeline stops before plugins and your code does
not run that iteration.

## Installing a plugin

**1. Paste the file's text into a collection variable.**

```
hephaestus.plugin.budget  →  <contents of response-budget.js>
```

**2. Register it in the collection's Pre-request script**, so it is set before
any request runs:

```javascript
pm.collectionVariables.set('hephaestus.plugins', JSON.stringify([
    { name: 'response-budget',  post: 'hephaestus.plugin.budget' },
    { name: 'timing-histogram', post: 'hephaestus.plugin.histogram' },
    { name: 'pii-redactor',     post: 'hephaestus.plugin.pii' }
]));
```

The descriptor key is **`post`**, and its value is the **name of the variable**
holding the code — not the code itself. The engine reads
`pm.collectionVariables.get(p.post)` and skips any descriptor without a `post`
field.

**3. Configure it through the request's `override` object.** Every key lands in
`ctx.config`:

```javascript
const override = {
    budgetMs: 800,
    budgets:  { 'Login': 2000, 'Health check': 200 },
    piiSoft:  false,
    csvPrint: true
};
```

Plugins that accumulate state across requests (`timing-histogram`, `csv-metrics`)
store it in collection variables, which **persist between runs**. Clear them at
the top of the same Pre-request script:

```javascript
if (!pm.info.iteration) {
    pm.collectionVariables.unset('hephaestus.plugin.timings');
    pm.collectionVariables.unset('hephaestus.plugin.csvRows');
}
```

## Configuration keys and `strictMode`

Every plugin here reads its settings off `ctx.config`, which means the keys live
in your `hephaestus.defaults` or in a request's `override`. **None of them are
keys the engine knows about.** The engine keeps an allowlist (`KNOWN_KEYS` in
`engine/src/shared/config-merge.js`) covering its own options plus the shipped
first-party plugins, and anything outside it is flagged:

```
⚠️ Unknown override key: "budgetMs"
```

That is only a warning by default. Under `strictMode: true` it **fails the run**:

```
🚫 strictMode: unknown override key(s)
```

Declare gallery keys with `extraKeys` and both go away:

```json
{
  "strictMode": true,
  "extraKeys": ["budgetMs", "budgets", "budgetSoft", "budgetWarnAt"],
  "budgetMs": 800
}
```

The keys each plugin reads:

| Plugin | Keys to declare |
|---|---|
| `response-budget` | `budgetMs`, `budgets`, `budgetSoft`, `budgetWarnAt` |
| `timing-histogram` | `histogramVar`, `histogramMax`, `histogramBuckets`, `histogramPrint` |
| `pii-redactor` | `piiRedact`, `piiKinds`, `piiIgnore`, `piiMaxDepth`, `piiSoft` |
| `csv-metrics` | `csvVar`, `csvMaxRows`, `csvUrl`, `csvPrint` |

## Errors

A throw inside a plugin is caught by the engine, reported as a failing test
named after the plugin, and the remaining plugins still run — one broken plugin
cannot take down the pipeline. Callbacks (`pm.sendRequest`) escape that guard,
so wrap those yourself.

## Write your own

Start from [`_template.js`](./_template.js). It walks through `ctx.config`,
`ctx.request`, `ctx.response`, `ctx.api`, `ctx.iteration`, `ctx._meta`,
`_override`, and the `pm` surfaces that matter, with one line on each.

Two things that trip up first plugins:

- **`ctx.api` carries only `get` / `find` / `all` / `count` / `save`** — path
  accessors over the parsed body. Status and timing live on `ctx.response`
  (`ctx.response.code`, `ctx.response.time`), not on `ctx.api`.
- **`ctx._meta.results` entries use `ok`, not `passed`**, and modules that did
  not run leave their slot `null` or empty. Guard before reading:

```javascript
var failed = ctx._meta.results.found.filter(function(f) { return !f.ok; });
var schemaOk = ctx._meta.results.schema ? ctx._meta.results.schema.valid : null;
```

See [`docs/plugins/`](../../docs/plugins/) for the notifier plugins
(Slack, Teams) and the custom-assertions starter.
