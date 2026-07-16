(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e2) {
      throw err = [e2], e2;
    }
  };
  var __commonJS = (cb, mod) => function __require2() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e2) {
      throw mod = 0, e2;
    }
  };

  // engine/src/shared/config-merge.js
  var configMerge;
  var init_config_merge = __esm({
    "engine/src/shared/config-merge.js"() {
      configMerge = {
        _merge(target, source) {
          const out = Object.assign({}, target);
          Object.keys(source).forEach((k) => {
            const sv = source[k];
            if (sv !== null && sv !== void 0 && typeof sv === "object" && !Array.isArray(sv)) {
              out[k] = this._merge(typeof out[k] === "object" && out[k] !== null ? out[k] : {}, sv);
            } else if (sv !== void 0) {
              out[k] = sv;
            }
          });
          return out;
        },
        run(ctx2, override2) {
          let defaults = {};
          try {
            const raw2 = pm.collectionVariables.get("hephaestus.defaults");
            if (raw2) defaults = JSON.parse(raw2);
          } catch (e2) {
            ctx2._meta.errors.push("configMerge: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C hephaestus.defaults \u2014 " + e2.message);
          }
          ctx2.config = this._merge(defaults, override2 || {});
        }
      };
    }
  });

  // engine/src/post-request.js
  var require_post_request = __commonJS({
    "engine/src/post-request.js"(exports, module) {
      init_config_merge();
      (function hephaestusPostRequest() {
        const VERSION = "3.9.0";
        const _override = typeof override !== "undefined" && override !== null ? override : {};
        const STATUS_LABELS = {
          200: "\u0423\u0441\u043F\u0435\u0448\u043D\u043E",
          201: "\u0421\u043E\u0437\u0434\u0430\u043D",
          202: "\u041F\u0440\u0438\u043D\u044F\u0442\u043E",
          204: "\u041D\u0435\u0442 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0433\u043E",
          301: "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0451\u043D",
          302: "\u041D\u0430\u0439\u0434\u0435\u043D",
          400: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441",
          401: "\u041D\u0435\u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D",
          403: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D",
          404: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D",
          405: "\u041C\u0435\u0442\u043E\u0434 \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D",
          409: "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442",
          422: "\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435",
          429: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u043D\u043E\u0433\u043E \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432",
          500: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430",
          502: "\u041F\u043B\u043E\u0445\u043E\u0439 \u0448\u043B\u044E\u0437",
          503: "\u0421\u0435\u0440\u0432\u0438\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
          504: "\u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u0448\u043B\u044E\u0437\u0430"
        };
        const ctx = {
          config: {},
          request: {
            method: pm.request.method,
            name: pm.info.requestName,
            url: (pm.request.url || "").toString()
          },
          response: {
            code: pm.response.code,
            time: pm.response.responseTime,
            size: pm.response.responseSize,
            raw: pm.response.text(),
            parsed: null,
            contentType: (pm.response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase(),
            format: "unknown",
            _statusLabel: "",
            _statusEmoji: "",
            _sizeFormatted: ""
          },
          api: null,
          _meta: {
            version: VERSION,
            processedAt: (/* @__PURE__ */ new Date()).toISOString(),
            errors: [],
            results: {
              found: [],
              // [{ name, path, ok }]
              saved: [],
              // [{ name, scope, ok }]
              counts: [],
              // [{ alias, length, expected, ok }]
              headers: [],
              // [{ name, value?, ok, status? }]
              snapshot: null,
              // { status, key, diff? }
              schema: null
              // { valid, errors }
            }
          }
        };
        const iterationData = {
          run(ctx2) {
            var data = {};
            try {
              if (typeof pm.iterationData !== "undefined" && pm.iterationData) {
                data = (pm.iterationData.toObject ? pm.iterationData.toObject() : {}) || {};
              }
            } catch (e2) {
            }
            ctx2.iteration = {
              index: pm.info.iteration || 0,
              count: pm.info.iterationCount || 1,
              data,
              get: function(key) {
                try {
                  return pm.iterationData ? pm.iterationData.get(key) : void 0;
                } catch (e2) {
                  return void 0;
                }
              }
            };
          }
        };
        const normalizeResponse = {
          _tryXml(ctx2, raw2) {
            try {
              const xml2js = __require("xml2js");
              const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
              var xmlParsed = null;
              parser.parseString(raw2, function(err, result) {
                if (!err && result) xmlParsed = result;
              });
              if (xmlParsed !== null) {
                ctx2.response.parsed = xmlParsed;
                ctx2.response.format = "xml";
                return true;
              }
            } catch (e2) {
            }
            try {
              ctx2.response.parsed = xml2Json(raw2);
              ctx2.response.format = "xml";
              return true;
            } catch (e2) {
              return false;
            }
          },
          run(ctx2) {
            const raw2 = ctx2.response.raw;
            const ct = ctx2.response.contentType;
            if (ct.includes("json") || ct.includes("javascript")) {
              try {
                ctx2.response.parsed = pm.response.json();
                ctx2.response.format = "json";
                return;
              } catch (e2) {
              }
            }
            if (ct.includes("xml") || ct.includes("html")) {
              if (this._tryXml(ctx2, raw2)) return;
            }
            if (ct === "text/plain") {
              ctx2.response.format = "text";
              return;
            }
            try {
              ctx2.response.parsed = JSON.parse(raw2);
              ctx2.response.format = "json";
              return;
            } catch (e2) {
            }
            if (this._tryXml(ctx2, raw2)) return;
            if (raw2 && raw2.length > 0) ctx2.response.format = "text";
          },
          // Экспонирует тело и заголовки запроса в ctx.request
          // для echo-тестирования и плагинов:
          //   ctx.request.body       — raw string тела запроса
          //   ctx.request.bodyParsed — распарсенный объект (если JSON)
          //   ctx.request.headers    — объект заголовков запроса (ключи в нижнем регистре)
          runRequestContext(ctx2) {
            try {
              const reqBody = pm.request.body;
              const rawBody = reqBody ? reqBody.raw || null : null;
              ctx2.request.body = rawBody;
              ctx2.request.bodyParsed = null;
              if (rawBody) {
                try {
                  ctx2.request.bodyParsed = JSON.parse(rawBody);
                } catch (e2) {
                }
              }
            } catch (e2) {
              ctx2.request.body = null;
              ctx2.request.bodyParsed = null;
            }
            ctx2.request.headers = {};
            try {
              pm.request.headers.each(function(h) {
                if (h && h.key) ctx2.request.headers[h.key.toLowerCase()] = h.value;
              });
            } catch (e2) {
            }
          }
        };
        const metrics = {
          _formatSize(bytes) {
            if (!bytes || bytes === 0) return "0 B";
            if (bytes < 1024) return bytes + " B";
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
            return (bytes / 1024 / 1024).toFixed(2) + " MB";
          },
          _resolveAllowed(cfg) {
            const es = cfg.expectedStatus;
            if (Array.isArray(es) && es.length > 0) return es;
            if (typeof es === "number") return [es];
            return [200, 201, 202];
          },
          run(ctx2) {
            const { code: code2, size } = ctx2.response;
            const label2 = STATUS_LABELS[code2] || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441";
            const allowed = this._resolveAllowed(ctx2.config);
            const isOk = allowed.includes(code2);
            const emoji = isOk ? "\u{1F7E2}" : code2 >= 400 && code2 < 500 ? "\u{1F7E1}" : "\u{1F534}";
            ctx2.response._statusLabel = label2;
            ctx2.response._statusEmoji = emoji;
            ctx2.response._sizeFormatted = this._formatSize(size);
            const allowedLabel = allowed.length === 1 ? allowed[0] : "[" + allowed.join(", ") + "]";
            pm.test(emoji + " \u0421\u0442\u0430\u0442\u0443\u0441: " + code2 + " \u2014 " + label2, () => {
              pm.expect(code2, "\u{1F6AB} \u0421\u0442\u0430\u0442\u0443\u0441 " + code2 + " \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0435: " + allowedLabel).to.be.oneOf(allowed);
            });
            const expectEmpty = ctx2.config.expectEmpty === true;
            pm.test("\u{1F4ED} \u0422\u0435\u043B\u043E \u043E\u0442\u0432\u0435\u0442\u0430: " + (expectEmpty ? "\u043F\u0443\u0441\u0442\u043E\u0435 \u2713" : "\u043D\u0435 \u043F\u0443\u0441\u0442\u043E\u0435"), () => {
              if (!expectEmpty) pm.expect(ctx2.response.raw, "\u{1F6AB} \u041E\u0442\u0432\u0435\u0442 \u043F\u0443\u0441\u0442\u043E\u0439").to.have.length.above(0);
              else pm.expect(ctx2.response.raw, "\u{1F6AB} \u041E\u0442\u0432\u0435\u0442 \u043D\u0435 \u043F\u0443\u0441\u0442\u043E\u0439").to.have.length.below(10);
            });
            const expectedType = (ctx2.config.contentType || "").toLowerCase();
            if (!expectEmpty && expectedType) {
              pm.test("\u{1F9FE} Content-Type: " + (ctx2.response.contentType || "\u2014"), () => {
                pm.expect(ctx2.response.contentType, '\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F "' + expectedType + '"').to.include(expectedType);
              });
            }
          }
        };
        const extractor = {
          _getDeep(obj, path2) {
            if (!path2) return void 0;
            const parts = path2.replace(/\[(\d+)\]/g, ".$1").replace(/\[\*\]|\[\]/g, ".*").split(".").filter((p2) => p2.length > 0);
            const go = (target, idx) => {
              if (idx === parts.length) return target;
              const key = parts[idx];
              if (key === "*") {
                if (!Array.isArray(target)) return [];
                return target.flatMap((i) => {
                  const r = go(i, idx + 1);
                  return r === void 0 ? [] : r;
                });
              }
              if (target === void 0 || target === null) return void 0;
              return go(target[key], idx + 1);
            };
            return go(obj, 0);
          },
          _extractArray(data, path2) {
            if (!path2 || path2 === "") return Array.isArray(data) ? data : [data];
            const parts = path2.replace(/\[(\d+)\]/g, ".$1").replace(/\[\*\]|\[\]/g, ".*").split(".").filter((p2) => p2.length > 0);
            const go = (target, idx) => {
              if (idx === parts.length) return Array.isArray(target) ? target : [target];
              const key = parts[idx];
              if (key === "*") {
                if (!Array.isArray(target)) return [];
                return target.flatMap((i) => go(i, idx + 1));
              }
              if (target === void 0 || target === null) return [];
              return go(target[key], idx + 1);
            };
            return go(data, 0);
          },
          _toLowerDeep(obj) {
            if (typeof obj === "string") return obj.toLowerCase();
            if (Array.isArray(obj)) return obj.map((i) => this._toLowerDeep(i));
            if (typeof obj === "object" && obj !== null)
              return Object.fromEntries(Object.entries(obj).map(([k, v2]) => [k, this._toLowerDeep(v2)]));
            return obj;
          },
          run(ctx2) {
            const self = this;
            const source = ctx2.response.parsed;
            ctx2.api = {
              get: (path2) => self._getDeep(source, path2),
              // find(path, fn) — массив элементов по пути, опционально фильтрованный
              find: (path2, fn) => {
                const a = self._extractArray(source, path2);
                return typeof fn === "function" ? a.filter(fn) : a;
              },
              // all(path, fn)  — явный синоним find: все элементы (опц. с фильтром)
              all: (path2, fn) => {
                const a = self._extractArray(source, path2);
                return typeof fn === "function" ? a.filter(fn) : a;
              },
              count: (path2) => {
                const a = self._extractArray(source, path2);
                return Array.isArray(a) ? a.length : 0;
              },
              save: (path2, target) => {
                const v2 = self._getDeep(source, path2);
                if (v2 !== void 0 && target && target.name) {
                  const sv = typeof v2 === "object" ? JSON.stringify(v2) : v2;
                  if (target.scope === "environment") pm.environment.set(target.name, sv);
                  else if (target.scope === "local") pm.variables.set(target.name, sv);
                  else pm.collectionVariables.set(target.name, sv);
                }
                return v2;
              }
            };
          }
        };
        const assertions = {
          _transforms(value, t) {
            if (!t) return value;
            return (Array.isArray(t) ? t : [t]).reduce((v2, fn) => {
              try {
                return typeof fn === "function" ? fn(v2) : v2;
              } catch (e2) {
                return v2;
              }
            }, value);
          },
          _filters(arr, f, ic) {
            if (!f || !Array.isArray(arr)) return arr;
            return (Array.isArray(f) ? f : [f]).reduce((a, fn) => {
              if (typeof fn !== "function") return a;
              try {
                return a.filter((item) => fn(ic ? extractor._toLowerDeep(item) : item));
              } catch (e2) {
                return a;
              }
            }, arr);
          },
          runFind(ctx) {
            const entries = _override.keysToFind || [];
            if (!entries.length) return;
            entries.forEach((entry) => {
              const e = typeof entry === "string" ? { path: entry, name: entry } : entry;
              const { path, name = path, expect, transform, filter, ignoreCase = false, soft: _eSoft = false, when: whenExpr } = e;
              const soft = _eSoft || !!ctx.config.softFail;
              if (whenExpr !== void 0) {
                let condResult = true;
                try {
                  condResult = typeof whenExpr === "function" ? whenExpr(ctx) : eval(String(whenExpr));
                } catch (condErr) {
                }
                if (!condResult) {
                  ctx._meta.results.found.push({ name, path, ok: true, skipped: true });
                  return;
                }
              }
              let v = ctx.api.get(path);
              if (ignoreCase && v !== void 0) v = extractor._toLowerDeep(v);
              if (Array.isArray(v) && filter) v = this._filters(v, filter, false);
              if (v !== void 0 && transform) v = this._transforms(v, transform);
              const found = v !== void 0 && v !== null;
              const label = (soft ? "\u26AA [soft] " : "\u{1F50E} ") + "\u041D\u0430\u0439\u0434\u0435\u043D\u043E: '" + name + "' (" + path + ")";
              pm.test(label, () => {
                if (!found) {
                  if (soft) {
                    console.log("\u26AA [soft] \u041F\u043E\u043B\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: " + path + " \u2014 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E");
                    pm.expect(true).to.be.true;
                    return;
                  }
                  pm.expect(v, "\u{1F6AB} \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E \u043F\u0443\u0442\u0438: " + path).to.exist;
                }
                if (found && expect !== void 0) {
                  if (typeof expect === "function") pm.expect((() => {
                    try {
                      return expect(v);
                    } catch (e2) {
                      return false;
                    }
                  })(), "\u{1F6AB} '" + name + "': \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E").to.be.true;
                  else pm.expect(v, "\u{1F6AB} '" + name + `': \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C "` + expect + '"').to.eql(expect);
                }
              });
              ctx._meta.results.found.push({ name, path, ok: soft || found });
            });
          },
          runSave(ctx2) {
            const entries2 = Object.entries(_override.varsToSave || {});
            if (!entries2.length) return;
            entries2.forEach(([, opts]) => {
              const { path: path2, scope = "collection", name: name2, transform: transform2, filter: filter2, ignoreCase: ignoreCase2 = false } = opts;
              let v2 = ctx2.api.get(path2);
              const raw2 = v2;
              if (ignoreCase2 && v2 !== void 0) v2 = extractor._toLowerDeep(v2);
              if (Array.isArray(v2) && filter2) v2 = this._filters(v2, filter2, ignoreCase2);
              if (v2 !== void 0 && transform2) v2 = this._transforms(v2, transform2);
              let ok = false;
              pm.test("\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: '" + name2 + "' \u2190 " + path2, () => {
                pm.expect(raw2, "\u{1F6AB} '" + name2 + "': \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0442\u0438 '" + path2 + "'").to.exist;
                ok = true;
              });
              if (v2 !== void 0) {
                const sv = typeof v2 === "object" ? JSON.stringify(v2) : v2;
                if (scope === "environment") pm.environment.set(name2, sv);
                else if (scope === "local") pm.variables.set(name2, sv);
                else pm.collectionVariables.set(name2, sv);
                if (scope !== "collection" && scope !== "environment" && scope !== "local")
                  ctx2._meta.errors.push('varsToSave: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 scope "' + scope + '" \u0434\u043B\u044F "' + name2 + '", \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D collection');
              } else {
                ctx2._meta.errors.push("varsToSave: '" + name2 + "' \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0442\u0438 '" + path2 + "'");
              }
              ctx2._meta.results.saved.push({ name: name2, scope, ok });
            });
          },
          runCount(ctx2) {
            const entries2 = Object.entries(_override.keysToCount || {});
            if (!entries2.length) return;
            entries2.forEach(([alias, opts]) => {
              let { path: path2, expected, filter: filter2, type = "array", transformBefore, transformAfter, ignoreCase: ignoreCase2 = false } = opts;
              let extracted = extractor._extractArray(ctx2.response.parsed, path2);
              if (type === "object") {
                if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) extracted = Object.entries(extracted);
                else if (Array.isArray(extracted) && extracted.length === 1 && typeof extracted[0] === "object" && !Array.isArray(extracted[0])) extracted = Object.entries(extracted[0]);
                else extracted = [];
              }
              if (!Array.isArray(extracted)) extracted = [];
              if (typeof transformBefore === "function") {
                try {
                  extracted = extracted.map((i) => transformBefore(i) != null ? transformBefore(i) : i).filter(Boolean);
                } catch (e2) {
                  ctx2._meta.errors.push("keysToCount[" + alias + "] transformBefore: " + e2.message);
                }
              }
              if (ignoreCase2) extracted = extractor._toLowerDeep(extracted);
              if (typeof filter2 === "function") {
                try {
                  extracted = extracted.filter(filter2);
                } catch (e2) {
                  ctx2._meta.errors.push("keysToCount[" + alias + "] filter: " + e2.message);
                }
              }
              if (typeof transformAfter === "function") {
                try {
                  extracted = transformAfter(extracted);
                } catch (e2) {
                  ctx2._meta.errors.push("keysToCount[" + alias + "] transformAfter: " + e2.message);
                }
              }
              const length = Array.isArray(extracted) ? extracted.length : 0;
              const ok = expected === void 0 || length === expected;
              const label2 = expected !== void 0 ? length + " / " + expected + (ok ? " \u2705" : " \u274C") : length + " \u044D\u043B.";
              pm.test("\u{1F4CF} \u041A\u043E\u043B-\u0432\u043E '" + alias + "': " + label2, () => {
                if (expected !== void 0) pm.expect(length, "\u{1F6AB} '" + alias + "': \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C " + expected + ", \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + length).to.eql(expected);
                else pm.expect(length).to.be.a("number");
              });
              ctx2._meta.results.counts.push({ alias, length, expected, ok });
            });
          },
          // ── assertions shorthand map ───────────────────────────────────────────
          // Формат: assertions: { "path.to.field": { exists, eq, ne, gt, gte, lt, lte,
          //                                          type, minLen, maxLen, includes, matches,
          //                                          absent, soft, when } }
          // Все операторы можно комбинировать.
          // ──────────────────────────────────────────────────────────────────────
          runAssertMap(ctx) {
            const map = _override.assertions;
            if (!map || typeof map !== "object" || Array.isArray(map)) return;
            Object.keys(map).forEach(function(fieldPath) {
              const rule = map[fieldPath];
              if (!rule || typeof rule !== "object") return;
              const soft = rule.soft === true || !!ctx.config.softFail;
              if (rule.when !== void 0) {
                let condResult = true;
                try {
                  condResult = typeof rule.when === "function" ? rule.when(ctx) : eval(String(rule.when));
                } catch (condErr) {
                }
                if (!condResult) {
                  ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: true, skipped: true });
                  return;
                }
              }
              const raw = ctx.api.get(fieldPath);
              function check(label2, fn) {
                if (soft) {
                  pm.test((soft ? "\u26AA [soft] " : "\u{1F52C} ") + label2 + " [" + fieldPath + "]", function() {
                    let ok = true;
                    try {
                      fn();
                    } catch (e2) {
                      ok = false;
                      console.warn("\u26AA soft: " + e2.message);
                    }
                    pm.expect(ok).to.be.true;
                  });
                } else {
                  pm.test("\u{1F52C} " + label2 + " [" + fieldPath + "]", function() {
                    fn();
                  });
                }
              }
              if (rule.absent === true) {
                check("absent", function() {
                  pm.expect(raw, '\u{1F6AB} "' + fieldPath + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C').to.be.oneOf([void 0, null]);
                });
                ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw === void 0 || raw === null });
                return;
              }
              if (rule.exists === false) {
                check("\u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442", function() {
                  pm.expect(raw, '\u{1F6AB} "' + fieldPath + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C').to.be.oneOf([void 0, null]);
                });
                ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw === void 0 || raw === null });
                return;
              }
              check("exists", function() {
                pm.expect(raw, '\u{1F6AB} "' + fieldPath + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E').to.not.be.oneOf([void 0, null]);
              });
              ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw !== void 0 && raw !== null });
              if (raw === void 0 || raw === null) return;
              if (rule.eq !== void 0)
                check("eq " + JSON.stringify(rule.eq), function() {
                  pm.expect(raw).to.eql(rule.eq);
                });
              if (rule.ne !== void 0)
                check("ne " + JSON.stringify(rule.ne), function() {
                  pm.expect(raw).to.not.eql(rule.ne);
                });
              if (rule.gt !== void 0)
                check("> " + rule.gt, function() {
                  pm.expect(raw).to.be.above(rule.gt);
                });
              if (rule.gte !== void 0)
                check(">= " + rule.gte, function() {
                  pm.expect(raw).to.be.at.least(rule.gte);
                });
              if (rule.lt !== void 0)
                check("< " + rule.lt, function() {
                  pm.expect(raw).to.be.below(rule.lt);
                });
              if (rule.lte !== void 0)
                check("<= " + rule.lte, function() {
                  pm.expect(raw).to.be.at.most(rule.lte);
                });
              if (rule.type !== void 0)
                check("type=" + rule.type, function() {
                  if (rule.type === "array") pm.expect(raw, "\u{1F6AB} \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F array").to.be.an("array");
                  else if (rule.type === "null") pm.expect(raw, "\u{1F6AB} \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F null").to.be.null;
                  else pm.expect(typeof raw, "\u{1F6AB} \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u0442\u0438\u043F " + rule.type).to.equal(rule.type);
                });
              if (rule.minLen !== void 0)
                check("minLen=" + rule.minLen, function() {
                  const len = Array.isArray(raw) ? raw.length : typeof raw === "string" ? raw.length : -1;
                  pm.expect(len, "\u{1F6AB} \u0434\u043B\u0438\u043D\u0430 " + len + " < " + rule.minLen).to.be.at.least(rule.minLen);
                });
              if (rule.maxLen !== void 0)
                check("maxLen=" + rule.maxLen, function() {
                  const len = Array.isArray(raw) ? raw.length : typeof raw === "string" ? raw.length : Infinity;
                  pm.expect(len, "\u{1F6AB} \u0434\u043B\u0438\u043D\u0430 " + len + " > " + rule.maxLen).to.be.at.most(rule.maxLen);
                });
              if (rule.includes !== void 0)
                check("includes " + JSON.stringify(rule.includes), function() {
                  if (Array.isArray(raw)) pm.expect(raw).to.include(rule.includes);
                  else pm.expect(String(raw)).to.include(String(rule.includes));
                });
              if (rule.matches !== void 0)
                check("matches " + rule.matches, function() {
                  const re = rule.matches instanceof RegExp ? rule.matches : new RegExp(rule.matches);
                  pm.expect(re.test(String(raw)), '\u{1F6AB} "' + raw + '" \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 ' + re).to.be.true;
                });
            });
          },
          // maxResponseTime: ctx.config.maxResponseTime (число, мс)
          runMaxTime(ctx2) {
            const max = ctx2.config.maxResponseTime;
            if (!max || typeof max !== "number") return;
            const time = ctx2.response.time;
            const ok = time <= max;
            pm.test("\u23F1 Time < " + max + "ms: " + time + "ms " + (ok ? "\u2705" : "\u274C"), () => {
              pm.expect(time, "\u{1F6AB} Response time exceeded: " + time + "ms > " + max + "ms").to.be.at.most(max);
            });
          },
          run(ctx2) {
            if (!ctx2.response.parsed && ctx2.response.format !== "text") {
              ctx2._meta.errors.push("assertions: \u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0435\u043D, \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u044B");
              return;
            }
            this.runFind(ctx2);
            this.runSave(ctx2);
            this.runCount(ctx2);
            this.runAssertMap(ctx2);
            this.runMaxTime(ctx2);
          }
        };
        const assertEach = {
          _serVal(v2) {
            if (v2 === void 0) return "undefined";
            if (v2 === null) return "null";
            if (typeof v2 !== "object") return JSON.stringify(v2);
            var s = JSON.stringify(v2);
            return s.length > 80 ? s.slice(0, 77) + "..." : s;
          },
          _checkRule(field, rule2, item, idx) {
            const val = extractor._getDeep(item, field);
            const path2 = "[" + idx + "]." + field;
            const errs = [];
            if (rule2.absent === true) {
              if (val !== void 0 && val !== null) errs.push(path2 + ": \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u043D\u043E = " + this._serVal(val));
              return errs;
            }
            if (rule2.exists !== false) {
              if (val === void 0 || val === null) {
                errs.push(path2 + ": \u043F\u043E\u043B\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442");
                return errs;
              }
            } else if (rule2.exists === false) {
              if (val !== void 0 && val !== null) errs.push(path2 + ": \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C");
              return errs;
            }
            if (val === void 0 || val === null) return errs;
            if (rule2.eq !== void 0 && val !== rule2.eq) errs.push(path2 + ": eq " + this._serVal(rule2.eq) + ", got " + this._serVal(val));
            if (rule2.ne !== void 0 && val === rule2.ne) errs.push(path2 + ": ne " + this._serVal(rule2.ne) + ", got " + this._serVal(val));
            if (rule2.gt !== void 0 && !(val > rule2.gt)) errs.push(path2 + ": > " + rule2.gt + ", got " + this._serVal(val));
            if (rule2.gte !== void 0 && !(val >= rule2.gte)) errs.push(path2 + ": >= " + rule2.gte + ", got " + this._serVal(val));
            if (rule2.lt !== void 0 && !(val < rule2.lt)) errs.push(path2 + ": < " + rule2.lt + ", got " + this._serVal(val));
            if (rule2.lte !== void 0 && !(val <= rule2.lte)) errs.push(path2 + ": <= " + rule2.lte + ", got " + this._serVal(val));
            if (rule2.type !== void 0) {
              const actual = Array.isArray(val) ? "array" : val === null ? "null" : typeof val;
              if (actual !== rule2.type) errs.push(path2 + ": type=" + rule2.type + ", got " + actual);
            }
            const len = Array.isArray(val) ? val.length : typeof val === "string" ? val.length : null;
            if (rule2.minLen !== void 0 && len !== null && len < rule2.minLen) errs.push(path2 + ": minLen=" + rule2.minLen + ", got " + len);
            if (rule2.maxLen !== void 0 && len !== null && len > rule2.maxLen) errs.push(path2 + ": maxLen=" + rule2.maxLen + ", got " + len);
            if (rule2.includes !== void 0) {
              const ok = Array.isArray(val) ? val.indexOf(rule2.includes) !== -1 : String(val).indexOf(String(rule2.includes)) !== -1;
              if (!ok) errs.push(path2 + ": includes " + this._serVal(rule2.includes) + " \u2014 not found");
            }
            if (rule2.matches !== void 0) {
              const re = rule2.matches instanceof RegExp ? rule2.matches : new RegExp(rule2.matches);
              if (!re.test(String(val))) errs.push(path2 + ": matches " + rule2.matches + " \u2014 no match on " + this._serVal(val));
            }
            return errs;
          },
          run(ctx2) {
            const cfg = _override.assertEach;
            if (!cfg || typeof cfg !== "object") return;
            const arr = ctx2.api.get(cfg.path);
            if (!Array.isArray(arr)) {
              pm.test("\u{1F522} assertEach[" + cfg.path + "]: \u043D\u0435 \u043C\u0430\u0441\u0441\u0438\u0432", function() {
                pm.expect(arr, '\u{1F6AB} "' + cfg.path + '" \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C (\u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: ' + typeof arr + ")").to.be.an("array");
              });
              return;
            }
            if (cfg.minCount !== void 0) {
              const ok = arr.length >= cfg.minCount;
              pm.test("\u{1F522} assertEach: minCount=" + cfg.minCount + " (" + arr.length + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432) " + (ok ? "\u2705" : "\u274C"), function() {
                pm.expect(arr.length, "\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C " + cfg.minCount + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + arr.length).to.be.at.least(cfg.minCount);
              });
            }
            if (cfg.maxCount !== void 0) {
              const ok = arr.length <= cfg.maxCount;
              pm.test("\u{1F522} assertEach: maxCount=" + cfg.maxCount + " (" + arr.length + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432) " + (ok ? "\u2705" : "\u274C"), function() {
                pm.expect(arr.length, "\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C " + cfg.maxCount + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + arr.length).to.be.at.most(cfg.maxCount);
              });
            }
            const rules = cfg.rules || {};
            const ruleKeys = Object.keys(rules);
            if (!ruleKeys.length) return;
            const self = this;
            const globalSoft = !!ctx2.config.softFail;
            const allFailures = [];
            const softFailures = [];
            arr.forEach(function(item, idx) {
              ruleKeys.forEach(function(field) {
                const rule2 = rules[field];
                if (!rule2 || typeof rule2 !== "object") return;
                const errs = self._checkRule(field, rule2, item, idx);
                if (errs.length > 0) {
                  if (globalSoft || rule2.soft === true) softFailures.push.apply(softFailures, errs);
                  else allFailures.push.apply(allFailures, errs);
                }
              });
            });
            const totalChecks = arr.length * ruleKeys.length;
            const hardFailed = allFailures.length;
            const softFailed = softFailures.length;
            const label2 = (globalSoft ? "\u26AA [soft] " : "") + "\u{1F522} assertEach[" + cfg.path + "]: " + arr.length + " \u044D\u043B. \xD7 " + ruleKeys.length + " \u043F\u0440\u0430\u0432\u0438\u043B";
            pm.test(label2 + " \u2014 " + (hardFailed === 0 ? "\u2705 \u0432\u0441\u0435 \u043F\u0440\u043E\u0448\u043B\u0438" : "\u274C " + hardFailed + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439"), function() {
              if (hardFailed > 0) {
                const preview = allFailures.slice(0, 10).join("\n");
                throw new Error(
                  hardFailed + "/" + totalChecks + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439:\n" + preview + (allFailures.length > 10 ? "\n... +" + (allFailures.length - 10) + " \u0435\u0449\u0451" : "")
                );
              }
            });
            if (softFailed > 0) {
              softFailures.slice(0, 5).forEach(function(msg) {
                console.warn("\u26AA [assertEach soft] " + msg);
              });
            }
            ctx2._meta.results.found.push({
              name: "assertEach:" + cfg.path,
              path: cfg.path,
              ok: hardFailed === 0,
              count: arr.length,
              failed: hardFailed
            });
          }
        };
        const retryOnStatus = {
          run(_ctx) {
            const cfg = _override.retryOnStatus;
            if (!cfg) return false;
            const statuses = Array.isArray(cfg.statuses) ? cfg.statuses : [cfg.statuses];
            const maxRetries = typeof cfg.maxRetries === "number" ? cfg.maxRetries : 3;
            const code2 = pm.response.code;
            if (!statuses.includes(code2)) {
              pm.variables.unset("hephaestus.retry." + pm.info.requestName);
              return false;
            }
            const key = "hephaestus.retry." + pm.info.requestName;
            const count = parseInt(pm.variables.get(key) || "0", 10);
            if (count < maxRetries) {
              pm.variables.set(key, String(count + 1));
              pm.test("\u26A1 Retry " + (count + 1) + "/" + maxRetries + " (status " + code2 + ")", function() {
              });
              console.log("[HEPHAESTUS] \u26A1 retryOnStatus: \u043F\u043E\u043F\u044B\u0442\u043A\u0430 " + (count + 1) + "/" + maxRetries + ", status=" + code2 + ", re-running: " + pm.info.requestName);
              pm.setNextRequest(pm.info.requestName);
              return true;
            }
            pm.variables.unset(key);
            pm.test("\u26A1 retryOnStatus: \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B \u0432\u0441\u0435 " + maxRetries + " \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 (status=" + code2 + ")", function() {
              throw new Error(
                "\u0412\u0441\u0435 " + maxRetries + " \u043F\u043E\u043F\u044B\u0442\u043A\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u0438 \u0441\u0442\u0430\u0442\u0443\u0441 " + code2 + ". \u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043D\u0435 " + statuses.join("/") + "."
              );
            });
            return false;
          }
        };
        const assertShape = {
          _typeOf(v2) {
            if (v2 === null) return "null";
            if (Array.isArray(v2)) return "array";
            return typeof v2;
          },
          run(ctx2) {
            const shape = _override.assertShape;
            if (!shape || typeof shape !== "object" || Array.isArray(shape)) return;
            const isSoft = !!ctx2.config.softFail;
            const self = this;
            function shapeTest(label2, fn) {
              pm.test((isSoft ? "\u26AA [soft] " : "") + label2, function() {
                if (isSoft) {
                  try {
                    fn();
                  } catch (e2) {
                    console.warn("\u26AA [soft] " + label2 + ": " + e2.message);
                  }
                } else {
                  fn();
                }
              });
            }
            Object.keys(shape).forEach(function(fieldPath2) {
              const expected = shape[fieldPath2];
              const val = ctx2.api.get(fieldPath2);
              const actual = self._typeOf(val);
              if (expected === "absent") {
                shapeTest('\u{1F9E9} shape "' + fieldPath2 + '": absent', function() {
                  pm.expect(val, '\u{1F6AB} "' + fieldPath2 + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u043D\u043E = ' + JSON.stringify(val)).to.be.oneOf([void 0, null]);
                });
                return;
              }
              if (expected === "any") {
                shapeTest('\u{1F9E9} shape "' + fieldPath2 + '": exists', function() {
                  pm.expect(val, '\u{1F6AB} "' + fieldPath2 + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E').to.not.be.oneOf([void 0, null]);
                });
                return;
              }
              shapeTest('\u{1F9E9} shape "' + fieldPath2 + '": ' + expected, function() {
                pm.expect(val, '\u{1F6AB} "' + fieldPath2 + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E').to.not.be.oneOf([void 0, null]);
                pm.expect(actual, '\u{1F6AB} "' + fieldPath2 + '": \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F ' + expected + ", \u043F\u043E\u043B\u0443\u0447\u0435\u043D " + actual).to.equal(expected);
              });
            });
          }
        };
        const assertOrder = {
          _extract(item, field) {
            return field.split(".").reduce(function(acc, k) {
              return acc !== null && acc !== void 0 ? acc[k] : void 0;
            }, item);
          },
          _toComparable(v2, type) {
            if (type === "number") return Number(v2);
            if (type === "date") return v2 ? new Date(v2).getTime() : 0;
            return String(v2);
          },
          run(ctx2) {
            const cfg = _override.assertOrder;
            if (!cfg || typeof cfg !== "object") return;
            const arr = ctx2.api.get(cfg.path);
            if (!Array.isArray(arr) || arr.length < 2) return;
            const by = cfg.by;
            const dir = (cfg.direction || "asc").toLowerCase();
            const type = cfg.type || "string";
            const self = this;
            const violations = [];
            for (var i = 0; i < arr.length - 1; i++) {
              var a = self._toComparable(self._extract(arr[i], by), type);
              var b = self._toComparable(self._extract(arr[i + 1], by), type);
              var ordered = dir === "asc" ? a <= b : a >= b;
              if (!ordered) {
                violations.push("[" + i + "] " + JSON.stringify(self._extract(arr[i], by)) + " \u2192 [" + (i + 1) + "] " + JSON.stringify(self._extract(arr[i + 1], by)));
                if (violations.length >= 5) break;
              }
            }
            const isSoft = !!ctx2.config.softFail;
            const label2 = (isSoft ? "\u26AA [soft] " : "") + "\u{1F4CA} assertOrder[" + cfg.path + '] by "' + by + '" ' + dir;
            pm.test(label2 + " \u2014 " + (violations.length === 0 ? "\u2705" : "\u274C " + violations.length + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439"), function() {
              if (violations.length > 0) {
                const msg = "\u041D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F \u043F\u043E\u0440\u044F\u0434\u043A\u0430 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438 (" + dir + ' by "' + by + '"):\n' + violations.join("\n");
                if (isSoft) {
                  console.warn("\u26AA [soft] assertOrder: " + msg);
                } else {
                  throw new Error(msg);
                }
              }
            });
          }
        };
        const assertUnique = {
          run(ctx2) {
            const cfg = _override.assertUnique;
            if (!cfg || typeof cfg !== "object") return;
            const arr = ctx2.api.get(cfg.path);
            if (!Array.isArray(arr)) return;
            const by = cfg.by;
            const isSoft = !!ctx2.config.softFail;
            const label2 = (isSoft ? "\u26AA [soft] " : "") + "\u{1F511} assertUnique[" + cfg.path + "]" + (by ? '.by("' + by + '")' : "") + (cfg.label ? " \u2014 " + cfg.label : "");
            const seen = [];
            const dupes = [];
            arr.forEach(function(item, i) {
              const val = by ? item !== null && item !== void 0 ? item[by] : void 0 : item;
              const key = JSON.stringify(val);
              if (seen.includes(key)) {
                dupes.push("[" + i + "] " + key);
              } else {
                seen.push(key);
              }
            });
            pm.test(label2 + " \u2014 " + (dupes.length === 0 ? "\u2705" : "\u274C " + dupes.length + " \u0434\u0443\u0431\u043B\u0435\u0439"), function() {
              if (dupes.length > 0) {
                const msg = "\u041D\u0430\u0439\u0434\u0435\u043D\u044B \u0434\u0443\u0431\u043B\u0438 (" + cfg.path + (by ? "." + by : "") + "):\n" + dupes.slice(0, 5).join("\n");
                if (isSoft) {
                  console.warn("\u26AA [soft] assertUnique: " + msg);
                } else {
                  throw new Error(msg);
                }
              }
            });
          }
        };
        const assertHeaders = {
          run(ctx2) {
            const entries2 = _override.assertHeaders || [];
            if (!entries2.length) return;
            entries2.forEach(function(entry2) {
              if (!entry2 || !entry2.name) return;
              const headerName = entry2.name;
              const headerValue = pm.response.headers.get(headerName);
              const label2 = entry2.label || headerName;
              if (entry2.absent) {
                pm.test("\u{1F4E8} Header \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442: " + label2, function() {
                  pm.expect(headerValue, '\u{1F6AB} Header "' + headerName + '" \u043F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442, \u043D\u043E \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C').to.be.oneOf([null, void 0, ""]);
                });
                ctx2._meta.results.headers = ctx2._meta.results.headers || [];
                ctx2._meta.results.headers.push({ name: headerName, status: "absent", ok: !headerValue });
                return;
              }
              pm.test("\u{1F4E8} Header \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442: " + label2, function() {
                pm.expect(headerValue, '\u{1F6AB} Header "' + headerName + '" \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0432 \u043E\u0442\u0432\u0435\u0442\u0435').to.be.a("string").and.have.length.above(0);
              });
              if (entry2.equals !== void 0) {
                pm.test('\u{1F4E8} Header "' + label2 + '" = "' + entry2.equals + '"', function() {
                  pm.expect(headerValue, '\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C "' + entry2.equals + '", \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E "' + headerValue + '"').to.equal(String(entry2.equals));
                });
              } else if (typeof entry2.expect === "function") {
                var fnResult;
                try {
                  fnResult = entry2.expect(headerValue);
                } catch (e2) {
                  fnResult = false;
                }
                pm.test('\u{1F4E8} Header "' + label2 + '": \u0443\u0441\u043B\u043E\u0432\u0438\u0435', function() {
                  pm.expect(fnResult, '\u{1F6AB} Header "' + headerName + '": \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E (\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: "' + headerValue + '")').to.be.true;
                });
              } else if (typeof entry2.expect === "string") {
                pm.test('\u{1F4E8} Header "' + label2 + '" \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + entry2.expect + '"', function() {
                  pm.expect(headerValue, '\u{1F6AB} Header "' + headerName + '" \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + entry2.expect + '"').to.include(entry2.expect);
                });
              }
              ctx2._meta.results.headers = ctx2._meta.results.headers || [];
              ctx2._meta.results.headers.push({ name: headerName, value: headerValue, ok: !!headerValue });
            });
          }
        };
        const snapshot = {
          _key(ctx2) {
            const col = pm.collectionVariables.get("hephaestus.collectionName") || "col";
            return [col, ctx2.request.name, ctx2.response.code, ctx2.response.format].join("::");
          },
          _loadStore() {
            try {
              const raw2 = pm.collectionVariables.get("hephaestus.snapshots");
              return raw2 ? JSON.parse(raw2) : {};
            } catch (e2) {
              return {};
            }
          },
          _saveStore(store, ctx2) {
            const str = JSON.stringify(store);
            if (str.length > 9e5) {
              ctx2._meta.errors.push(
                "snapshot: hephaestus.snapshots > 900KB. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 checkPaths \u0434\u043B\u044F \u0441\u043E\u043A\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043E\u0447\u0438\u0441\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 snapshot-clear \u043C\u0435\u0442\u043E\u0434."
              );
            }
            pm.collectionVariables.set("hephaestus.snapshots", str);
          },
          // Строим данные для сравнения:
          // если checkPaths задан — берём только эти пути
          // иначе — весь parsed с удалёнными ignorePaths
          _buildData(ctx2) {
            const cfg = ctx2.config.snapshot || {};
            const source = ctx2.response.parsed;
            const checkPaths = cfg.checkPaths || [];
            const ignorePaths = cfg.ignorePaths || [];
            if (checkPaths.length > 0) {
              const data = {};
              checkPaths.forEach((p2) => {
                data[p2] = extractor._getDeep(source, p2);
              });
              return data;
            }
            if (!source) return ctx2.response.raw ? { _rawPreview: ctx2.response.raw.slice(0, 500) } : {};
            try {
              const clone = JSON.parse(JSON.stringify(source));
              ignorePaths.forEach((p2) => this._deletePath(clone, p2));
              return clone;
            } catch (e2) {
              return source;
            }
          },
          _deletePath(obj, path2) {
            const parts = path2.replace(/\[(\d+)\]/g, ".$1").split(".").filter((p2) => p2.length);
            if (!parts.length) return;
            let cur = obj;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!cur || typeof cur !== "object") return;
              cur = cur[parts[i]];
            }
            if (cur && typeof cur === "object") delete cur[parts[parts.length - 1]];
          },
          // Strict: точное deep-equal
          _deepEqual(a, b) {
            if (a === b) return true;
            if (typeof a !== typeof b || typeof a !== "object" || a === null || b === null) return false;
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            const ka = Object.keys(a), kb = Object.keys(b);
            if (ka.length !== kb.length) return false;
            return ka.every((k) => this._deepEqual(a[k], b[k]));
          },
          // Compact JSON representation for diff output — no [object Object] surprise
          _sv(v2) {
            if (v2 === void 0) return "undefined";
            if (v2 === null) return "null";
            if (typeof v2 !== "object") return JSON.stringify(v2);
            try {
              var s = JSON.stringify(v2);
              return s.length > 80 ? s.slice(0, 77) + "..." : s;
            } catch (e2) {
              return String(v2);
            }
          },
          // Собираем список различий для strict
          _findDiff(stored, current, path2) {
            const diffs = [];
            if (typeof stored !== typeof current) {
              return [path2 + ': \u0442\u0438\u043F "' + typeof stored + '" \u2192 "' + typeof current + '"'];
            }
            if (typeof stored !== "object" || stored === null) {
              if (stored !== current) diffs.push(path2 + ": " + this._sv(stored) + " \u2192 " + this._sv(current));
              return diffs;
            }
            if (Array.isArray(stored) !== Array.isArray(current)) {
              return [path2 + ": array/object \u043D\u0435\u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435"];
            }
            const keys = /* @__PURE__ */ new Set([...Object.keys(stored), ...Object.keys(current || {})]);
            keys.forEach((k) => {
              const np = path2 ? path2 + "." + k : k;
              if (!(k in (current || {}))) diffs.push(np + ": \u043A\u043B\u044E\u0447 \u0443\u0434\u0430\u043B\u0451\u043D (\u0431\u044B\u043B " + this._sv(stored[k]) + ")");
              else if (!(k in stored)) diffs.push(np + ": \u043A\u043B\u044E\u0447 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D = " + this._sv((current || {})[k]));
              else diffs.push(...this._findDiff(stored[k], (current || {})[k], np));
            });
            return diffs;
          },
          // Non-strict: все ключи из baseline должны присутствовать в current
          _nonStrictMatch(stored, current, diff, path2) {
            if (stored === null || stored === void 0) {
              if (stored !== current) {
                diff.push(path2 + ": " + this._sv(stored) + " \u2192 " + this._sv(current));
                return false;
              }
              return true;
            }
            if (typeof stored !== "object") {
              if (stored !== current) {
                diff.push(path2 + ": " + this._sv(stored) + " \u2192 " + this._sv(current));
                return false;
              }
              return true;
            }
            if (Array.isArray(stored)) {
              if (!Array.isArray(current)) {
                diff.push(path2 + ": \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432");
                return false;
              }
              return stored.every((item, i) => this._nonStrictMatch(item, current[i], diff, path2 + "[" + i + "]"));
            }
            return Object.keys(stored).every((k) => {
              const np = path2 ? path2 + "." + k : k;
              if (!current || !(k in current)) {
                diff.push(np + ": \u043A\u043B\u044E\u0447 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442");
                return false;
              }
              return this._nonStrictMatch(stored[k], current[k], diff, np);
            });
          },
          run(ctx2) {
            const cfg = ctx2.config.snapshot || {};
            const wantRecord = cfg.record === true || ctx2.config.snapshotRecord === true;
            if (!cfg.enabled && !wantRecord) return;
            if (wantRecord) {
              const rkey = this._key(ctx2);
              const rstore = this._loadStore();
              rstore[rkey] = {
                savedAt: (/* @__PURE__ */ new Date()).toISOString(),
                statusCode: ctx2.response.code,
                format: ctx2.response.format,
                mode: cfg.mode || "non-strict",
                checkPaths: cfg.checkPaths || [],
                data: this._buildData(ctx2)
              };
              this._saveStore(rstore, ctx2);
              console.warn('\u{1F4F8} snapshotRecord: baseline \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u043D \u0434\u043B\u044F "' + rkey + '" \u2014 \u043D\u0435 \u0437\u0430\u0431\u0443\u0434\u044C \u0443\u0431\u0440\u0430\u0442\u044C \u0444\u043B\u0430\u0433 record (\u0438\u043D\u0430\u0447\u0435 \u0440\u0435\u0433\u0440\u0435\u0441\u0441\u0438\u0438 \u043D\u0435 \u043B\u043E\u0432\u044F\u0442\u0441\u044F)');
              pm.test("\u{1F4F8} Snapshot: \u{1F534} baseline \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u043D (record)", () => pm.expect(true).to.be.true);
              ctx2._meta.results.snapshot = { status: "recorded", key: rkey };
              return;
            }
            const storage = cfg.storage || "collection-vars";
            if (storage === "postman-api") {
              ctx2._meta.errors.push('snapshot: storage "postman-api" \u0435\u0449\u0451 \u043D\u0435 \u0440\u0435\u0430\u043B\u0438\u0437\u043E\u0432\u0430\u043D');
              return;
            }
            const key = this._key(ctx2);
            const store = this._loadStore();
            const existing = store[key];
            const currentData = this._buildData(ctx2);
            const mode = cfg.mode || "non-strict";
            const autoSave = cfg.autoSaveMissing !== false;
            const checkPaths = cfg.checkPaths || [];
            if (!existing) {
              if (!autoSave) {
                pm.test("\u{1F4F8} Snapshot: \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (autoSaveMissing \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D)", () => {
                  pm.expect(false, '\u{1F6AB} \u0421\u043D\u0430\u043F\u0448\u043E\u0442 "' + key + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D').to.be.true;
                });
                ctx2._meta.results.snapshot = { status: "missing", key };
                return;
              }
              store[key] = {
                savedAt: (/* @__PURE__ */ new Date()).toISOString(),
                statusCode: ctx2.response.code,
                format: ctx2.response.format,
                mode,
                checkPaths,
                data: currentData
              };
              this._saveStore(store, ctx2);
              pm.test("\u{1F4F8} Snapshot: \u2705 baseline \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D", () => pm.expect(true).to.be.true);
              ctx2._meta.results.snapshot = { status: "saved", key };
              return;
            }
            const storedData = existing.data;
            const diff = [];
            let isEqual = false;
            if (mode === "strict") {
              isEqual = this._deepEqual(storedData, currentData);
              if (!isEqual) this._findDiff(storedData, currentData, "").forEach((d) => diff.push(d));
            } else {
              isEqual = this._nonStrictMatch(storedData, currentData, diff, "");
            }
            const pathsLabel = checkPaths.length > 0 ? "(" + checkPaths.length + " paths)" : "(full)";
            pm.test(
              "\u{1F4F8} Snapshot " + mode + " " + pathsLabel + ": " + (isEqual ? "\u2705 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442" : "\u274C \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435"),
              () => {
                if (!isEqual) {
                  const diffStr = diff.slice(0, 5).map((d) => "  \u2022 " + d).join("\n");
                  pm.expect(isEqual, "\u{1F6AB} Snapshot \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435:\n" + diffStr + (diff.length > 5 ? "\n  ... \u0438 \u0435\u0449\u0451 " + (diff.length - 5) : "")).to.be.true;
                }
              }
            );
            if (!isEqual && diff.length > 0) {
              console.warn("\u{1F4F8} Snapshot diff (" + diff.length + " \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u0439):\n" + diff.slice(0, 10).map((d) => "  \u2022 " + d).join("\n"));
            }
            ctx2._meta.results.snapshot = { status: isEqual ? "match" : "diff", key, mode, diff };
          }
        };
        const schema = {
          run(ctx2) {
            const cfg = ctx2.config.schema;
            if (!cfg || !cfg.enabled || !cfg.definition) return;
            const source = ctx2.response.parsed;
            if (!source) {
              ctx2._meta.errors.push("schema: \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 (\u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0435\u043D)");
              ctx2._meta.results.schema = { valid: false, errors: ["no parsed data"] };
              return;
            }
            if (typeof tv4 === "undefined") {
              ctx2._meta.errors.push("schema: tv4 \u043D\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432 \u044D\u0442\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 Postman");
              return;
            }
            try {
              const result = tv4.validateMultiple(source, cfg.definition);
              const valid = result.errors.length === 0;
              const count = result.errors.length;
              pm.test("\u{1F52C} Schema: " + (valid ? "\u2705 \u0432\u0430\u043B\u0438\u0434\u043D\u0430" : "\u274C \u043E\u0448\u0438\u0431\u043A\u0438 (" + count + ")"), () => {
                if (!valid) {
                  const errStr = result.errors.slice(0, 3).map((e2) => "  \u2022 [" + (e2.dataPath || "/") + "] " + e2.message).join("\n");
                  pm.expect(valid, "\u{1F6AB} Schema validation failed:\n" + errStr).to.be.true;
                }
              });
              if (!valid) {
                console.warn("\u{1F52C} Schema errors:\n" + result.errors.slice(0, 5).map((e2) => "  \u2022 [" + (e2.dataPath || "/") + "] " + e2.message).join("\n"));
              }
              ctx2._meta.results.schema = {
                valid,
                errors: result.errors.map((e2) => ({ path: e2.dataPath, message: e2.message }))
              };
            } catch (e2) {
              ctx2._meta.errors.push("schema: \u043E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u2014 " + e2.message);
            }
          }
        };
        const plugins = {
          run(ctx) {
            var raw = "";
            try {
              raw = pm.collectionVariables.get("hephaestus.plugins") || "";
              if (!raw.trim()) return;
            } catch (e2) {
              return;
            }
            var list;
            try {
              list = JSON.parse(raw);
              if (!Array.isArray(list) || list.length === 0) return;
            } catch (e2) {
              ctx._meta.errors.push("plugins: \u043E\u0448\u0438\u0431\u043A\u0430 \u0440\u0430\u0437\u0431\u043E\u0440\u0430 hephaestus.plugins \u2014 " + e2.message);
              return;
            }
            list.forEach(function(p) {
              if (!p || typeof p !== "object" || !p.name) return;
              if (!p.post) return;
              var code = "";
              try {
                code = pm.collectionVariables.get(p.post) || "";
              } catch (e2) {
                ctx._meta.errors.push('plugin "' + p.name + '": \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C "' + p.post + '" \u2014 ' + e2.message);
                return;
              }
              if (!code.trim()) {
                ctx._meta.errors.push('plugin "' + p.name + '": \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F "' + p.post + '" \u043F\u0443\u0441\u0442\u0430');
                return;
              }
              try {
                eval(code);
              } catch (e2) {
                ctx._meta.errors.push('plugin "' + p.name + '": \u043E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u2014 ' + e2.message);
                pm.test('\u{1F50C} Plugin "' + p.name + '": \u043E\u0448\u0438\u0431\u043A\u0430', function() {
                  throw new Error(e2.message);
                });
              }
            });
          }
        };
        const securityAudit = {
          _defaults: {
            requireHeaders: ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options"],
            forbidHeaders: ["server", "x-powered-by", "x-aspnet-version"],
            forbidBodyPatterns: ["SQLSTATE", "stack trace", "Traceback (most recent call last)", "ORA-0", "db error", "Warning: mysql"],
            checkCors: true
          },
          _headerVal(name2) {
            try {
              return pm.response.headers.get(name2);
            } catch (e2) {
              return void 0;
            }
          },
          run(ctx2) {
            const cfg = ctx2.config.securityAudit;
            if (!cfg || !cfg.enabled) return;
            const soft2 = cfg.soft === true;
            const self = this;
            const findings = [];
            function list2(v2, dflt) {
              return Array.isArray(v2) ? v2 : dflt;
            }
            function secTest(label2, ok, detail) {
              const name2 = (soft2 ? "\u{1F6E1}\uFE0F [soft] " : "\u{1F6E1}\uFE0F ") + label2;
              if (soft2) {
                pm.test(name2, function() {
                  if (!ok) console.warn("\u{1F6E1}\uFE0F [soft] " + label2 + ": " + detail);
                  pm.expect(true).to.be.true;
                });
              } else {
                pm.test(name2, function() {
                  pm.expect(ok, "\u{1F6AB} " + detail).to.be.true;
                });
              }
            }
            list2(cfg.requireHeaders, self._defaults.requireHeaders).forEach(function(h) {
              const v2 = self._headerVal(h);
              const present = typeof v2 === "string" && v2.length > 0;
              if (!present) findings.push({ type: "missing-header", name: h });
              secTest("\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438: " + h, present, '\u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0437\u0430\u0449\u0438\u0442\u043D\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A "' + h + '"');
            });
            list2(cfg.forbidHeaders, self._defaults.forbidHeaders).forEach(function(h) {
              const v2 = self._headerVal(h);
              const disclosed = typeof v2 === "string" && v2.length > 0;
              if (disclosed) findings.push({ type: "disclosure-header", name: h, value: v2 });
              secTest("\u041D\u0435\u0442 \u0440\u0430\u0441\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u0430: " + h, !disclosed, '\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A "' + h + '" \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 "' + v2 + '"');
            });
            const patterns = list2(cfg.forbidBodyPatterns, self._defaults.forbidBodyPatterns);
            const raw2 = ctx2.response && ctx2.response.raw ? String(ctx2.response.raw) : "";
            if (raw2 && patterns && patterns.length) {
              const hit = patterns.filter(function(p2) {
                return raw2.indexOf(p2) !== -1;
              });
              if (hit.length) findings.push({ type: "body-leak", patterns: hit });
              secTest("\u041D\u0435\u0442 \u0443\u0442\u0435\u0447\u0435\u043A \u043E\u0442\u043B\u0430\u0434\u043A\u0438 \u0432 \u0442\u0435\u043B\u0435 \u043E\u0442\u0432\u0435\u0442\u0430", hit.length === 0, "\u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0443\u0442\u0435\u0447\u043A\u0438: " + hit.join(", "));
            }
            if (cfg.checkCors !== false) {
              const acao = self._headerVal("access-control-allow-origin");
              const acac = self._headerVal("access-control-allow-credentials");
              if (acao === "*" && String(acac).toLowerCase() === "true") {
                findings.push({ type: "insecure-cors" });
                secTest("CORS: \u043D\u0435\u0442 wildcard-origin \u0441 credentials", false, "Access-Control-Allow-Origin: * \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 Allow-Credentials: true");
              }
            }
            ctx2._meta.results.security = { findings, ok: findings.length === 0 };
          }
        };
        const logger = {
          _maskStr(str) {
            if (!str || typeof str !== "string" || str.length < 6) return "***";
            const keep = Math.max(1, Math.floor(str.length * 0.2));
            return str.slice(0, keep) + "***MASKED***" + str.slice(-keep);
          },
          // Маскирует query-параметры URL, чьи ключи совпадают с secrets
          _maskUrl(url, secrets) {
            if (!url || !secrets || !secrets.length) return url;
            try {
              const qi = url.indexOf("?");
              if (qi === -1) return url;
              const base = url.slice(0, qi);
              const query = url.slice(qi + 1).split("&").map(function(param) {
                const ei = param.indexOf("=");
                if (ei === -1) return param;
                const key = param.slice(0, ei);
                const val = param.slice(ei + 1);
                const kl = key.toLowerCase();
                if (secrets.some(function(s) {
                  return kl.includes(s.toLowerCase());
                })) {
                  return key + "=" + this._maskStr(val);
                }
                return param;
              }, this).join("&");
              return base + "?" + query;
            } catch (e2) {
              return url;
            }
          },
          // Маскирует чувствительные ключи в объекте (рекурсивно)
          // secrets — список слов; если ключ содержит любое из них — значение маскируется
          _maskObj(obj, secrets) {
            if (!obj || !secrets || secrets.length === 0) return obj;
            try {
              const clone = JSON.parse(JSON.stringify(obj));
              const walk = (o) => {
                if (typeof o !== "object" || o === null) return;
                Object.keys(o).forEach((k) => {
                  if (secrets.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
                    if (typeof o[k] === "string") o[k] = this._maskStr(o[k]);
                  } else {
                    walk(o[k]);
                  }
                });
              };
              walk(clone);
              return clone;
            } catch (e2) {
              return obj;
            }
          },
          _resultLines(results) {
            const lines = [];
            if (results.found.length > 0) {
              lines.push("\u{1F50E} FOUND    " + results.found.map((r) => "'" + r.name + "' \u2705").join("  |  "));
            }
            if (results.saved.length > 0) {
              lines.push("\u{1F4BE} SAVED    " + results.saved.map((r) => "'" + r.name + "' \u2192 " + r.scope + (r.ok ? " \u2705" : " \u274C")).join("  |  "));
            }
            if (results.counts.length > 0) {
              lines.push("\u{1F4CF} COUNT    " + results.counts.map((r) => {
                const val = r.expected !== void 0 ? r.length + "/" + r.expected + (r.ok ? " \u2705" : " \u274C") : r.length;
                return "'" + r.alias + "': " + val;
              }).join("  |  "));
            }
            if (results.snapshot) {
              const s = results.snapshot;
              const icon = s.status === "match" ? "\u2705" : s.status === "saved" ? "\u{1F195}" : s.status === "recorded" ? "\u{1F534}" : s.status === "diff" ? "\u274C" : "\u26A0\uFE0F";
              const det = s.status === "diff" ? " (" + (s.diff || []).length + " \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u0439)" : s.status === "saved" ? " baseline" : "";
              lines.push("\u{1F4F8} SNAPSHOT " + icon + " " + (s.mode || "") + det);
              if (s.status === "diff" && s.diff && s.diff.length > 0) {
                s.diff.slice(0, 5).forEach(function(d) {
                  lines.push("    \u21B3 " + d);
                });
                if (s.diff.length > 5) lines.push("    \u21B3 ... +" + (s.diff.length - 5) + " more");
              }
            }
            if (results.headers && results.headers.length > 0) {
              lines.push("\u{1F4E8} HEADERS  " + results.headers.map((h) => '"' + h.name + '" ' + (h.ok ? "\u2705" : "\u274C")).join("  |  "));
            }
            if (results.schema) {
              const sv = results.schema;
              lines.push("\u{1F52C} SCHEMA   " + (sv.valid ? "\u2705 \u0432\u0430\u043B\u0438\u0434\u043D\u0430" : "\u274C " + sv.errors.length + " \u043E\u0448\u0438\u0431\u043E\u043A"));
            }
            return lines;
          },
          summary(ctx2) {
            const c = ctx2.config;
            const r = ctx2.request;
            const res = ctx2.response;
            const secrets = c.secrets || [];
            const ts = ctx2._meta.processedAt.replace("T", " ").slice(0, 19);
            const level = c.logLevel || "normal";
            if (c.ci === true) {
              console.log("[HEPHAESTUS_CI] " + JSON.stringify({
                v: VERSION,
                request: r.name,
                method: r.method,
                status: res.code,
                time: res.time,
                size: res.size,
                format: res.format,
                found: ctx2._meta.results.found.map((x) => x.name),
                saved: ctx2._meta.results.saved.map((x) => x.name),
                counts: ctx2._meta.results.counts.map((x) => ({ alias: x.alias, length: x.length, expected: x.expected, ok: x.ok })),
                headers: ctx2._meta.results.headers.map((x) => ({ name: x.name, ok: x.ok })),
                snapshot: ctx2._meta.results.snapshot,
                schema: ctx2._meta.results.schema ? { valid: ctx2._meta.results.schema.valid } : null,
                security: ctx2._meta.results.security ? { findings: ctx2._meta.results.security.findings.length, ok: ctx2._meta.results.security.ok } : null,
                errors: ctx2._meta.errors
              }));
            }
            if (level === "silent") return;
            if (level === "minimal") {
              const found2 = ctx2._meta.results.found.filter(function(f) {
                return f.ok;
              }).length;
              const saved = ctx2._meta.results.saved.length;
              const snap = ctx2._meta.results.snapshot;
              const snapIco = snap ? snap.status === "match" ? "\u{1F4F8}\u2705" : snap.status === "saved" ? "\u{1F4F8}\u{1F195}" : snap.status === "recorded" ? "\u{1F4F8}\u{1F534}" : "\u{1F4F8}\u274C" : "";
              const parts = [res._statusEmoji + " " + res.code, res.time + "ms"];
              if (found2) parts.push("\u{1F50E}\xD7" + found2);
              if (saved) parts.push("\u{1F4BE}\xD7" + saved);
              if (snapIco) parts.push(snapIco);
              if (ctx2._meta.errors.length) parts.push("\u26A0\uFE0F\xD7" + ctx2._meta.errors.length);
              console.log("[H] " + r.method + " " + r.name + " \u2192 " + parts.join(" | "));
              return;
            }
            const W = 62;
            const HR = "\u2560" + "\u2550".repeat(W) + "\u2563";
            const TOP = "\u2554" + "\u2550".repeat(W) + "\u2557";
            const BOT = "\u255A" + "\u2550".repeat(W) + "\u255D";
            const DIV = "\u2500".repeat(W + 2);
            const maskedUrl = this._maskUrl(r.url || "\u2014", secrets);
            const urlLine = maskedUrl.length > W - 6 ? maskedUrl.slice(0, W - 9) + "..." : maskedUrl;
            const masked = this._maskObj(res.parsed, secrets);
            var previewStr;
            if (masked !== null && masked !== void 0) {
              var ps = JSON.stringify(masked, null, 2);
              previewStr = ps.length > 800 ? ps.slice(0, 800) + "\n... [+" + (ps.length - 800) + " chars]" : ps;
            } else if (res.raw && res.raw.length > 0) {
              previewStr = res.raw.length > 800 ? res.raw.slice(0, 800) + "\n... [+" + (res.raw.length - 800) + " chars]" : res.raw;
            } else {
              previewStr = "\u2014 (\u043F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442)";
            }
            const resultLines = this._resultLines(ctx2._meta.results);
            var lines = [
              TOP,
              "\u2551  HEPHAESTUS v" + VERSION + "  \xB7  POST-REQUEST",
              "\u2551  \u{1F4C5} " + ts + " UTC",
              HR,
              "\u2551  \u{1F4CB}  " + r.method + "  " + r.name,
              "\u2551  \u{1F310}  " + urlLine,
              HR,
              "\u2551  " + res._statusEmoji + " STATUS  " + res.code + " \u2014 " + (res._statusLabel || "\u2014"),
              "\u2551  \u23F1   " + res.time + " ms   \u{1F4E6} " + (res._sizeFormatted || "\u2014") + "   \u{1F4C4} " + res.format.toUpperCase(),
              HR,
              "\u2551  \u{1F4E4} RESPONSE PREVIEW",
              DIV,
              previewStr,
              DIV
            ];
            if (level === "verbose" && res.headers) {
              lines.push("\u2551  \u{1F4EC} RESPONSE HEADERS");
              const hdrs = typeof res.headers.toObject === "function" ? res.headers.toObject() : {};
              Object.keys(hdrs).slice(0, 10).forEach(function(k) {
                lines.push("\u2551    " + k + ": " + String(hdrs[k]).slice(0, 60));
              });
              lines.push(DIV);
            }
            if (resultLines.length > 0) {
              resultLines.forEach(function(l) {
                lines.push("\u2551  " + l);
              });
            }
            if (ctx2._meta.errors.length > 0) {
              ctx2._meta.errors.forEach(function(e2) {
                lines.push("\u2551  \u26A0\uFE0F  " + e2);
              });
            }
            lines.push(BOT);
            console.log(lines.join("\n"));
          }
        };
        try {
          configMerge.run(ctx, _override);
          iterationData.run(ctx);
          normalizeResponse.run(ctx);
          normalizeResponse.runRequestContext(ctx);
          const _retrying = retryOnStatus.run(ctx);
          if (!_retrying) {
            metrics.run(ctx);
            extractor.run(ctx);
            assertions.run(ctx);
            assertEach.run(ctx);
            assertShape.run(ctx);
            assertOrder.run(ctx);
            assertUnique.run(ctx);
            assertHeaders.run(ctx);
            snapshot.run(ctx);
            schema.run(ctx);
            securityAudit.run(ctx);
            plugins.run(ctx);
            logger.summary(ctx);
          }
        } catch (e2) {
          pm.test("\u{1F6AB} Hephaestus post-request: \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430", () => {
            throw new Error("[v" + VERSION + "] " + e2.message);
          });
        }
      })();
    }
  });
  require_post_request();
})();
