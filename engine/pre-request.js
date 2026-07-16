(() => {
  // engine/src/shared/config-merge.js
  var configMerge = {
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
    run(ctx, override2) {
      let defaults = {};
      try {
        const raw = pm.collectionVariables.get("hephaestus.defaults");
        if (raw) defaults = JSON.parse(raw);
      } catch (e) {
        ctx._meta.errors.push("configMerge: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C hephaestus.defaults \u2014 " + e.message);
      }
      ctx.config = this._merge(defaults, override2 || {});
    }
  };

  // engine/src/pre-request.js
  (function hephaestusPreRequest() {
    const VERSION = "3.8.0";
    const _override = typeof override !== "undefined" && override !== null ? override : {};
    const _random = {
      uuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0;
          return (c === "x" ? r : r & 3 | 8).toString(16);
        });
      },
      email() {
        return "user_" + Math.random().toString(16).slice(2, 8) + "@test.com";
      },
      str(n) {
        n = n || 12;
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        var s = "";
        for (var i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
      },
      int(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      },
      float(min, max, dec) {
        dec = dec !== void 0 ? dec : 2;
        return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
      },
      bool() {
        return Math.random() >= 0.5;
      },
      pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
      },
      date(from, to) {
        var f = from ? new Date(from).getTime() : Date.now() - 365 * 24 * 3600 * 1e3;
        var t = to ? new Date(to).getTime() : Date.now();
        return new Date(f + Math.random() * (t - f)).toISOString().slice(0, 10);
      }
    };
    const ctx = {
      config: {},
      request: {
        method: pm.request.method,
        name: pm.info.requestName,
        url: ""
      },
      random: _random,
      _meta: {
        version: VERSION,
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        errors: []
      }
    };
    const envRequired = {
      run(ctx2) {
        const required = ctx2.config.envRequired;
        if (!required || !Array.isArray(required) || required.length === 0) return;
        const missing = required.filter(function(name) {
          var v = pm.environment.get(name);
          return v === null || v === void 0 || v === "";
        });
        if (missing.length === 0) return;
        const envName = pm.environment.name || "(\u043D\u0435\u0442 environment)";
        pm.test("\u26A0\uFE0F envRequired: \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 [" + missing.join(", ") + "]", function() {
          throw new Error(
            "\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 environment variables \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B:\n" + missing.map(function(n) {
              return "  \u2022 " + n;
            }).join("\n") + "\n\u0422\u0435\u043A\u0443\u0449\u0438\u0439 environment: " + envName + "\n\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 environment \u0432 Postman / Newman."
          );
        });
        ctx2._meta.errors.push("envRequired: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B [" + missing.join(", ") + '] \u0432 environment "' + envName + '"');
      }
    };
    const iterationData = {
      run(ctx2) {
        var data = {};
        try {
          if (typeof pm.iterationData !== "undefined" && pm.iterationData) {
            data = (pm.iterationData.toObject ? pm.iterationData.toObject() : {}) || {};
          }
        } catch (e) {
        }
        ctx2.iteration = {
          index: pm.info.iteration || 0,
          count: pm.info.iterationCount || 1,
          data,
          get: function(key) {
            try {
              return pm.iterationData ? pm.iterationData.get(key) : void 0;
            } catch (e) {
              return void 0;
            }
          }
        };
        Object.keys(data).forEach(function(key) {
          var val = data[key];
          pm.variables.set("iter." + key, val !== null && val !== void 0 ? String(val) : "");
        });
      }
    };
    const random = {
      run(ctx2) {
        const r = ctx2.random;
        const rd = _override.randomData || ctx2.config.randomData;
        if (!rd || typeof rd !== "object") return;
        Object.keys(rd).forEach(function(varName) {
          const expr = String(rd[varName]);
          let val;
          if (expr === "random.uuid") val = r.uuid();
          else if (expr === "random.email") val = r.email();
          else if (expr === "random.bool") val = String(r.bool());
          else if (expr === "random.str") val = r.str(12);
          else if (expr.startsWith("random.str:")) val = r.str(parseInt(expr.split(":")[1], 10) || 12);
          else if (expr.startsWith("random.int:")) {
            const p = expr.split(":");
            val = String(r.int(parseInt(p[1], 10), parseInt(p[2], 10)));
          } else if (expr.startsWith("random.float:")) {
            const p = expr.split(":");
            val = String(r.float(parseFloat(p[1]), parseFloat(p[2]), parseInt(p[3], 10) || 2));
          } else if (expr === "random.date") val = r.date();
          else val = expr;
          pm.variables.set(varName, val !== null && val !== void 0 ? String(val) : "");
        });
      }
    };
    const urlBuilder = {
      run(ctx2) {
        const defaultProtocol = (ctx2.config.defaultProtocol || "https").replace(/:\/\/$/, "").toLowerCase();
        let rawUrl = (ctx2.config.baseUrl || "").trim().replace(/\/$/, "");
        if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
          rawUrl = defaultProtocol + "://" + rawUrl;
          console.log('\u{1F310} urlBuilder: \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u2014 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D "' + defaultProtocol + '://"');
        }
        pm.test("\u{1F310} URL: \u0431\u0430\u0437\u043E\u0432\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0434\u0430\u043D", () => {
          pm.expect(rawUrl, "\u{1F6AB} baseUrl \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u043D\u0438 \u0432 defaults, \u043D\u0438 \u0432 override").to.be.a("string").and.have.length.above(0);
        });
        if (/^http:\/\//i.test(rawUrl)) {
          pm.test("\u26A0\uFE0F URL: \u043D\u0435\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B http", () => {
            console.warn("\u26A0\uFE0F baseUrl \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 http:// \u2014 \u0443\u0431\u0435\u0434\u0438\u0441\u044C, \u0447\u0442\u043E \u044D\u0442\u043E \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u043E.");
            pm.expect(true).to.be.true;
          });
        }
        pm.variables.set("baseUrl", rawUrl);
        ctx2.request.url = rawUrl;
      }
    };
    const auth = {
      run(ctx2) {
        const a = ctx2.config.auth;
        if (!a || !a.enabled) return;
        try {
          switch (a.type) {
            case "none":
              break;
            case "basic": {
              const raw = (a.user || "") + ":" + (a.pass || "");
              const encoded = btoa(unescape(encodeURIComponent(raw)));
              pm.request.headers.upsert({ key: "Authorization", value: "Basic " + encoded });
              break;
            }
            case "bearer": {
              pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + (a.token || "") });
              break;
            }
            case "headers": {
              Object.entries(a.fields || {}).forEach(([k, v]) => {
                pm.request.headers.upsert({ key: k, value: v });
              });
              break;
            }
            case "variables": {
              Object.entries(a.fields || {}).forEach(([k, v]) => {
                pm.variables.set(k, v);
              });
              break;
            }
            case "oauth2cc": {
              const oa = a.oauth2cc || {};
              const ns = "hephaestus.oauth2." + (oa.clientId || "default");
              const tok = pm.collectionVariables.get(ns + ".token");
              const exp = parseInt(pm.collectionVariables.get(ns + ".expiry") || "0");
              const now = Date.now();
              if (tok && exp > now + 6e4) {
                pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + tok });
                break;
              }
              const body = [
                { key: "grant_type", value: "client_credentials" },
                { key: "client_id", value: oa.clientId || "" },
                { key: "client_secret", value: oa.clientSecret || ctx2.config.secrets && ctx2.config.secrets.oauthClientSecret || pm.environment.get("OAUTH_CLIENT_SECRET") || "" }
              ];
              if (oa.scope) body.push({ key: "scope", value: oa.scope });
              Object.entries(oa.extraParams || {}).forEach(([k, v]) => body.push({ key: k, value: v }));
              pm.sendRequest({
                url: oa.tokenUrl,
                method: "POST",
                header: { "Content-Type": "application/x-www-form-urlencoded" },
                body: { mode: "urlencoded", urlencoded: body.filter((p) => p.value) }
              }, function(err, response) {
                if (err || !response) {
                  ctx2._meta.errors.push("oauth2cc: " + (err ? err.message : "\u043D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430"));
                  return;
                }
                var tokenBody;
                try {
                  tokenBody = response.json();
                } catch (je) {
                  ctx2._meta.errors.push("oauth2cc: \u043D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0439 JSON \u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438");
                  return;
                }
                var accessToken = tokenBody.access_token;
                if (!accessToken) {
                  ctx2._meta.errors.push("oauth2cc: \u043D\u0435\u0442 access_token \u0432 \u043E\u0442\u0432\u0435\u0442\u0435");
                  return;
                }
                var expiresIn = (tokenBody.expires_in || 3600) * 1e3;
                pm.collectionVariables.set(ns + ".token", accessToken);
                pm.collectionVariables.set(ns + ".expiry", String(now + expiresIn));
                pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + accessToken });
              });
              break;
            }
            default:
              ctx2._meta.errors.push('auth: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0438\u043F "' + a.type + '". \u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435: none, basic, bearer, headers, variables, oauth2cc');
          }
        } catch (e) {
          ctx2._meta.errors.push("auth: \u043E\u0448\u0438\u0431\u043A\u0430 \u2014 " + e.message);
        }
      }
    };
    const dateUtils = {
      _format(date, fmt) {
        const pad = (v, n) => String(v).padStart(n || 2, "0");
        const off = -date.getTimezoneOffset(), sign = off >= 0 ? "+" : "-", abs = Math.abs(off);
        return [
          ["yyyy", date.getFullYear()],
          ["MM", pad(date.getMonth() + 1)],
          ["dd", pad(date.getDate())],
          ["hh", pad(date.getHours())],
          ["mm", pad(date.getMinutes())],
          ["ss", pad(date.getSeconds())],
          ["nnn", pad(date.getMilliseconds(), 3)],
          ["tt00", sign + pad(Math.floor(abs / 60)) + pad(abs % 60)]
        ].reduce((s, [t, v]) => s.split(t).join(String(v)), fmt);
      },
      // Сдвиг на N месяцев с учётом граничных дат месяца (обратная совместимость)
      _shiftMonths(date, months) {
        const d = new Date(date), day = d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth() - months);
        d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
        return d;
      },
      // Последний день месяца для заданного года/месяца
      _lastDay(y, m) {
        return new Date(y, m + 1, 0).getDate();
      },
      // Парсит выражение в Date (или null если не распознано)
      _parse(expr, now) {
        const e = (expr || "").trim().toLowerCase();
        const cp = () => new Date(now);
        if (e === "today") return cp();
        if (e === "yesterday") {
          const d = cp();
          d.setDate(d.getDate() - 1);
          return d;
        }
        if (e === "tomorrow") {
          const d = cp();
          d.setDate(d.getDate() + 1);
          return d;
        }
        if (e === "startofmonth") {
          const d = cp();
          d.setDate(1);
          return d;
        }
        if (e === "endofmonth") {
          const d = cp();
          d.setDate(this._lastDay(d.getFullYear(), d.getMonth()));
          return d;
        }
        if (e === "startofnextmonth") {
          const d = cp();
          d.setDate(1);
          d.setMonth(d.getMonth() + 1);
          return d;
        }
        if (e === "endofnextmonth") {
          const d = cp();
          d.setDate(1);
          d.setMonth(d.getMonth() + 2);
          d.setDate(0);
          return d;
        }
        if (e === "startofprevmonth") {
          const d = cp();
          d.setDate(1);
          d.setMonth(d.getMonth() - 1);
          return d;
        }
        if (e === "endofprevmonth") {
          const d = cp();
          d.setDate(1);
          d.setDate(0);
          return d;
        }
        if (e === "startofyear") {
          return new Date(now.getFullYear(), 0, 1);
        }
        if (e === "endofyear") {
          return new Date(now.getFullYear(), 11, 31);
        }
        const m = e.match(/^today([+-])(\d+)([dwmy])$/);
        if (m) {
          const n = parseInt(m[2]) * (m[1] === "+" ? 1 : -1);
          const d = cp();
          if (m[3] === "d") {
            d.setDate(d.getDate() + n);
          } else if (m[3] === "w") {
            d.setDate(d.getDate() + n * 7);
          } else if (m[3] === "m") {
            const day = d.getDate();
            d.setDate(1);
            d.setMonth(d.getMonth() + n);
            d.setDate(Math.min(day, this._lastDay(d.getFullYear(), d.getMonth())));
          } else if (m[3] === "y") {
            d.setFullYear(d.getFullYear() + n);
          }
          return d;
        }
        return null;
      },
      run(ctx2) {
        const fmt = ctx2.config.dateFormat || "yyyy-MM-dd";
        const now = /* @__PURE__ */ new Date();
        [["currentDate", 0], ["monthsAgo1", 1], ["monthsAgo3", 3], ["monthsAgo6", 6], ["monthsAgo12", 12]].forEach(([key, n]) => pm.variables.set(key, this._format(n === 0 ? now : this._shiftMonths(now, n), fmt)));
        const dates = ctx2.config.dates;
        if (dates && typeof dates === "object") {
          Object.keys(dates).forEach((varName) => {
            const d = this._parse(dates[varName], now);
            if (d) {
              pm.variables.set(varName, this._format(d, fmt));
            } else {
              ctx2._meta.errors.push('dateUtils: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435 "' + dates[varName] + '" \u0434\u043B\u044F "' + varName + '"');
            }
          });
        }
      }
    };
    const logger = {
      // Маскирует середину строки: первые и последние 20% остаются
      _maskStr(str) {
        if (!str || typeof str !== "string" || str.length < 6) return "***";
        const keep = Math.max(1, Math.floor(str.length * 0.2));
        return str.slice(0, keep) + "***MASKED***" + str.slice(-keep);
      },
      // Проверяет, нужно ли маскировать значение по имени ключа
      _isSensitive(key, secrets) {
        if (!secrets || secrets.length === 0) return false;
        const k = key.toLowerCase();
        return secrets.some((s) => k.includes(s.toLowerCase()));
      },
      // Рекурсивно маскирует чувствительные поля объекта
      _maskObj(obj, secrets) {
        if (!obj || typeof obj !== "object") return obj;
        const result = {};
        Object.keys(obj).forEach((k) => {
          if (this._isSensitive(k, secrets)) {
            result[k] = typeof obj[k] === "string" ? this._maskStr(obj[k]) : "***";
          } else if (typeof obj[k] === "object" && obj[k] !== null) {
            result[k] = this._maskObj(obj[k], secrets);
          } else {
            result[k] = obj[k];
          }
        });
        return result;
      },
      // Формирует безопасное описание auth-конфига для отображения в логах.
      // Значения credentials никогда не попадают в console в открытом виде.
      _authInfo(auth2, secrets) {
        if (!auth2 || !auth2.enabled) return "none (\u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430)";
        const ALL_SECRETS = ["token", "pass", "password", "secret", "key", "authorization"].concat(secrets || []);
        switch (auth2.type) {
          case "basic":
            return "basic \u2192 Authorization: Basic [user=" + (auth2.user || "?") + ", pass=" + this._maskStr(auth2.pass || "") + "]";
          case "bearer":
            return "bearer \u2192 Authorization: Bearer " + this._maskStr(auth2.token || "");
          case "headers": {
            const fields = Object.entries(auth2.fields || {}).map(([k, v]) => {
              return k + "=" + (this._isSensitive(k, ALL_SECRETS) ? this._maskStr(v) : v);
            });
            return "headers [" + fields.join(", ") + "]";
          }
          case "variables": {
            const fields = Object.entries(auth2.fields || {}).map(([k, v]) => {
              return k + "=" + (this._isSensitive(k, ALL_SECRETS) ? this._maskStr(v) : v);
            });
            return "variables [" + fields.join(", ") + "]";
          }
          default:
            return auth2.type + " (\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0438\u043F)";
        }
      },
      summary(ctx2) {
        const c = ctx2.config;
        const r = ctx2.request;
        const ts = ctx2._meta.startedAt.replace("T", " ").slice(0, 19);
        const level = c.logLevel || "normal";
        if (level === "silent") return;
        if (level === "minimal") {
          console.log("[H\u2192] " + r.method + " " + r.name + " \xB7 " + (r.url || "\u2014").slice(0, 80));
          return;
        }
        const iter = ctx2.iteration;
        const iterLine = iter && iter.count > 1 ? "\u2551  \u{1F504} ITERATION  " + (iter.index + 1) + " / " + iter.count + (Object.keys(iter.data).length > 0 ? "  [" + Object.keys(iter.data).join(", ") + "]" : "") : null;
        const logLines = [
          "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557",
          "\u2551  \u{1F680} HEPHAESTUS v" + VERSION + "  \xB7  PRE-REQUEST",
          "\u2551  \u{1F4C5} " + ts + " UTC",
          "\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563",
          "\u2551  \u{1F4CB} REQUEST  " + r.method + "  " + r.name,
          "\u2551  \u{1F310} URL      " + (r.url || "\u2014"),
          "\u2551  \u{1F464} AUTH     " + this._authInfo(c.auth, c.secrets),
          "\u2551  \u{1F4C5} DATE     " + (pm.variables.get("currentDate") || "\u2014") + "  (fmt: " + (c.dateFormat || "yyyy-MM-dd") + ")"
        ];
        if (iterLine) logLines.push(iterLine);
        logLines.push("\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D");
        console.log(logLines.join("\n"));
        if (ctx2._meta.errors.length > 0) {
          console.warn(
            "\u26A0\uFE0F  [Hephaestus] \u041E\u0448\u0438\u0431\u043A\u0438 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438:\n" + ctx2._meta.errors.map((e) => "  \u2022 " + e).join("\n")
          );
        }
      }
    };
    try {
      configMerge.run(ctx, _override);
      envRequired.run(ctx);
      iterationData.run(ctx);
      random.run(ctx);
      urlBuilder.run(ctx);
      auth.run(ctx);
      dateUtils.run(ctx);
      logger.summary(ctx);
    } catch (e) {
      pm.test("\u{1F6AB} Hephaestus pre-request: \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430", () => {
        throw new Error("[v" + VERSION + "] " + e.message);
      });
    }
  })();
})();
