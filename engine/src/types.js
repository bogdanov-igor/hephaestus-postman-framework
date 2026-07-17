// ════════════════════════════════════════════════════════════
// Engine type definitions (JSDoc) — dev-time IntelliSense only.
//
// No runtime code: esbuild strips this file from the bundle (it is referenced
// only from JSDoc comments, never imported as code). Reference from a source
// file with e.g.  /** @type {import('./types.js').Ctx} */
// ════════════════════════════════════════════════════════════

/**
 * @typedef {Object} AuthConfig
 * @property {boolean} [enabled]
 * @property {'none'|'basic'|'bearer'|'headers'|'variables'|'oauth2cc'} [type]
 * @property {string} [user]
 * @property {string} [pass]
 * @property {string} [token]
 * @property {Object.<string,string>} [fields]
 * @property {Object} [oauth2cc]
 */

/**
 * @typedef {Object} SnapshotConfig
 * @property {boolean} [enabled]
 * @property {'collection-vars'|'postman-api'} [storage]
 * @property {'strict'|'non-strict'} [mode]
 * @property {boolean} [autoSaveMissing]
 * @property {string[]} [checkPaths]
 * @property {string[]} [ignorePaths]
 */

/**
 * @typedef {Object} SchemaConfig
 * @property {boolean} [enabled]
 * @property {Object|null} [definition]
 */

/**
 * Effective per-request config: setup/defaults.json deep-merged with the
 * per-request `override` object.
 * @typedef {Object} Config
 * @property {string} [baseUrl]
 * @property {string} [defaultProtocol]
 * @property {AuthConfig} [auth]
 * @property {string} [dateFormat]
 * @property {number} [maxResponseTime]
 * @property {number} [maxBytes]
 * @property {number|number[]} [expectedStatus]
 * @property {boolean} [expectEmpty]
 * @property {'json'|'xml'|'text'} [contentType]
 * @property {SnapshotConfig} [snapshot]
 * @property {SchemaConfig} [schema]
 * @property {string[]} [secrets]
 * @property {string[]} [envRequired]
 * @property {boolean} [ci]
 * @property {'silent'|'minimal'|'normal'|'verbose'} [logLevel]
 * @property {boolean} [softFail]
 * @property {Object.<string,string>} [randomData]
 * @property {Object.<string,string>} [dates]
 */

/**
 * Extract API exposed on `ctx.api` by the extractor module.
 * @typedef {Object} Api
 * @property {(path: string) => *} get         - value at a JSONPath-lite path
 * @property {(path: string, fn: Function) => *} find   - first array element matching fn
 * @property {(path: string, fn?: Function) => Array<*>} all - all matching elements
 * @property {(path: string) => number} count  - length of the array at path
 * @property {(path: string, opts: {name: string, scope?: string}) => void} save
 */

/**
 * @typedef {Object} RequestCtx
 * @property {string} method
 * @property {string} [name]
 * @property {string} [url]
 * @property {string|null} [body]
 * @property {Object|null} [bodyParsed]
 * @property {Object.<string,string>} [headers]
 */

/**
 * @typedef {Object} ResponseCtx
 * @property {number} [code]
 * @property {number} [time]
 * @property {number} [size]
 * @property {string} [raw]
 * @property {string} [contentType]
 * @property {*} [parsed]
 * @property {'json'|'xml'|'text'} [format]
 */

/**
 * @typedef {Object} Iteration
 * @property {number} index
 * @property {number} count
 * @property {Object} data
 * @property {(key: string) => *} get
 */

/**
 * @typedef {Object} MetaResults
 * @property {Array<*>} found
 * @property {Array<*>} saved
 * @property {Array<*>} counts
 * @property {Array<*>} headers
 * @property {Object|null} snapshot
 * @property {Object|null} schema
 */

/**
 * @typedef {Object} Meta
 * @property {string} version
 * @property {string[]} errors
 * @property {MetaResults} results
 */

/**
 * Random test-data generators (pre-request only), exposed on `ctx.random`.
 * @typedef {Object} Random
 * @property {() => string} uuid
 * @property {() => string} email
 * @property {(n?: number) => string} str
 * @property {(min?: number, max?: number) => number} int
 * @property {(min?: number, max?: number, dec?: number) => number} float
 * @property {() => boolean} bool
 * @property {(arr: Array<*>) => *} pick
 * @property {(from?: *, to?: *) => string} date
 */

/**
 * Shared context object threaded through every engine module's `run(ctx)`.
 * @typedef {Object} Ctx
 * @property {Config} config
 * @property {RequestCtx} request
 * @property {ResponseCtx} [response]
 * @property {Api} [api]
 * @property {Iteration} [iteration]
 * @property {Random} [random]
 * @property {Meta} _meta
 */

export {};
