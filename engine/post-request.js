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

  // engine/src/shared/i18n.js
  function locOf(ctx2) {
    return ctx2 && ctx2.config && ctx2.config.locale === "en" ? "en" : "ru";
  }
  function statusLabel(ctx2, code2) {
    const loc = locOf(ctx2);
    return STATUS[loc] && STATUS[loc][code2] || (loc === "en" ? "Unknown status" : "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441");
  }
  function t(ctx2, id) {
    const entry2 = M[id];
    if (!entry2) return id;
    const args = Array.prototype.slice.call(arguments, 2);
    const fn = entry2[locOf(ctx2)] || entry2.ru;
    return fn.apply(null, args);
  }
  var STATUS, M;
  var init_i18n = __esm({
    "engine/src/shared/i18n.js"() {
      STATUS = {
        ru: {
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
        },
        en: {
          200: "OK",
          201: "Created",
          202: "Accepted",
          204: "No Content",
          301: "Moved Permanently",
          302: "Found",
          400: "Bad Request",
          401: "Unauthorized",
          403: "Forbidden",
          404: "Not Found",
          405: "Method Not Allowed",
          409: "Conflict",
          422: "Unprocessable Entity",
          429: "Too Many Requests",
          500: "Internal Server Error",
          502: "Bad Gateway",
          503: "Service Unavailable",
          504: "Gateway Timeout"
        }
      };
      M = {
        "metrics.status": {
          ru: function(e2, c, l) {
            return e2 + " \u0421\u0442\u0430\u0442\u0443\u0441: " + c + " \u2014 " + l;
          },
          en: function(e2, c, l) {
            return e2 + " Status: " + c + " \u2014 " + l;
          }
        },
        "metrics.statusExpect": {
          ru: function(c, a) {
            return "\u{1F6AB} \u0421\u0442\u0430\u0442\u0443\u0441 " + c + " \u043D\u0435 \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u044B\u0435: " + a;
          },
          en: function(c, a) {
            return "\u{1F6AB} Status " + c + " not in expected: " + a;
          }
        },
        "metrics.bodyName": {
          ru: function(e2) {
            return "\u{1F4ED} \u0422\u0435\u043B\u043E \u043E\u0442\u0432\u0435\u0442\u0430: " + (e2 ? "\u043F\u0443\u0441\u0442\u043E\u0435 \u2713" : "\u043D\u0435 \u043F\u0443\u0441\u0442\u043E\u0435");
          },
          en: function(e2) {
            return "\u{1F4ED} Response body: " + (e2 ? "empty \u2713" : "not empty");
          }
        },
        "metrics.bodyEmpty": {
          ru: function() {
            return "\u{1F6AB} \u041E\u0442\u0432\u0435\u0442 \u043F\u0443\u0441\u0442\u043E\u0439";
          },
          en: function() {
            return "\u{1F6AB} Response is empty";
          }
        },
        "metrics.bodyNotEmpty": {
          ru: function() {
            return "\u{1F6AB} \u041E\u0442\u0432\u0435\u0442 \u043D\u0435 \u043F\u0443\u0441\u0442\u043E\u0439";
          },
          en: function() {
            return "\u{1F6AB} Response is not empty";
          }
        },
        "metrics.contentType": {
          ru: function(ct) {
            return "\u{1F9FE} Content-Type: " + ct;
          },
          en: function(ct) {
            return "\u{1F9FE} Content-Type: " + ct;
          }
        },
        "metrics.contentTypeExpect": {
          ru: function(t2) {
            return '\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F "' + t2 + '"';
          },
          en: function(t2) {
            return '\u{1F6AB} Expected "' + t2 + '"';
          }
        },
        "headers.absent": {
          ru: function(l) {
            return "\u{1F4E8} Header \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442: " + l;
          },
          en: function(l) {
            return "\u{1F4E8} Header absent: " + l;
          }
        },
        "headers.absentExpect": {
          ru: function(h) {
            return '\u{1F6AB} Header "' + h + '" \u043F\u0440\u0438\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442, \u043D\u043E \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C';
          },
          en: function(h) {
            return '\u{1F6AB} Header "' + h + '" is present but must be absent';
          }
        },
        "headers.exists": {
          ru: function(l) {
            return "\u{1F4E8} Header \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442: " + l;
          },
          en: function(l) {
            return "\u{1F4E8} Header present: " + l;
          }
        },
        "headers.existsExpect": {
          ru: function(h) {
            return '\u{1F6AB} Header "' + h + '" \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0432 \u043E\u0442\u0432\u0435\u0442\u0435';
          },
          en: function(h) {
            return '\u{1F6AB} Header "' + h + '" missing from response';
          }
        },
        "headers.equals": {
          ru: function(l, v2) {
            return '\u{1F4E8} Header "' + l + '" = "' + v2 + '"';
          },
          en: function(l, v2) {
            return '\u{1F4E8} Header "' + l + '" = "' + v2 + '"';
          }
        },
        "headers.equalsExpect": {
          ru: function(e2, g) {
            return '\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C "' + e2 + '", \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E "' + g + '"';
          },
          en: function(e2, g) {
            return '\u{1F6AB} Expected "' + e2 + '", got "' + g + '"';
          }
        },
        "headers.cond": {
          ru: function(l) {
            return '\u{1F4E8} Header "' + l + '": \u0443\u0441\u043B\u043E\u0432\u0438\u0435';
          },
          en: function(l) {
            return '\u{1F4E8} Header "' + l + '": condition';
          }
        },
        "headers.condExpect": {
          ru: function(h, v2) {
            return '\u{1F6AB} Header "' + h + '": \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E (\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: "' + v2 + '")';
          },
          en: function(h, v2) {
            return '\u{1F6AB} Header "' + h + '": condition failed (value: "' + v2 + '")';
          }
        },
        "headers.includes": {
          ru: function(l, e2) {
            return '\u{1F4E8} Header "' + l + '" \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + e2 + '"';
          },
          en: function(l, e2) {
            return '\u{1F4E8} Header "' + l + '" contains "' + e2 + '"';
          }
        },
        "headers.includesExpect": {
          ru: function(h, e2) {
            return '\u{1F6AB} Header "' + h + '" \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + e2 + '"';
          },
          en: function(h, e2) {
            return '\u{1F6AB} Header "' + h + '" does not contain "' + e2 + '"';
          }
        },
        // ─── retryOnStatus ───
        "retryOnStatus.rerunLog": { ru: function(attempt, maxRetries, code2, requestName) {
          return "[HEPHAESTUS] \u26A1 retryOnStatus: \u043F\u043E\u043F\u044B\u0442\u043A\u0430 " + attempt + "/" + maxRetries + ", status=" + code2 + ", re-running: " + requestName;
        }, en: function(attempt, maxRetries, code2, requestName) {
          return "[HEPHAESTUS] \u26A1 retryOnStatus: attempt " + attempt + "/" + maxRetries + ", status=" + code2 + ", re-running: " + requestName;
        } },
        "retryOnStatus.exhausted": { ru: function(maxRetries, code2) {
          return "\u26A1 retryOnStatus: \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B \u0432\u0441\u0435 " + maxRetries + " \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 (status=" + code2 + ")";
        }, en: function(maxRetries, code2) {
          return "\u26A1 retryOnStatus: exhausted all " + maxRetries + " retries (status=" + code2 + ")";
        } },
        "retryOnStatus.allFailed": { ru: function(maxRetries, code2, expected) {
          return "\u0412\u0441\u0435 " + maxRetries + " \u043F\u043E\u043F\u044B\u0442\u043A\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u0438 \u0441\u0442\u0430\u0442\u0443\u0441 " + code2 + ". \u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043D\u0435 " + expected + ".";
        }, en: function(maxRetries, code2, expected) {
          return "All " + maxRetries + " attempts returned status " + code2 + ". Expected not " + expected + ".";
        } },
        "retryOnStatus.retryName": { ru: function(attempt, maxRetries, code2) {
          return "\u26A1 \u041F\u043E\u0432\u0442\u043E\u0440 " + attempt + "/" + maxRetries + " (\u0441\u0442\u0430\u0442\u0443\u0441 " + code2 + ")";
        }, en: function(attempt, maxRetries, code2) {
          return "\u26A1 Retry " + attempt + "/" + maxRetries + " (status " + code2 + ")";
        } },
        "retryOnStatus.retryAfterName": { ru: function(code2) {
          return "\u26A1 Retry-After: \u043F\u0430\u0443\u0437\u0430 \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043F\u0440\u0435\u0434\u0435\u043B (\u0441\u0442\u0430\u0442\u0443\u0441 " + code2 + ")";
        }, en: function(code2) {
          return "\u26A1 Retry-After: wait exceeds cap (status " + code2 + ")";
        } },
        "retryOnStatus.retryAfterExceeds": { ru: function(waitS, capS) {
          return "\u0421\u0435\u0440\u0432\u0435\u0440 \u0437\u0430\u043F\u0440\u043E\u0441\u0438\u043B \u043F\u043E\u0432\u0442\u043E\u0440 \u0447\u0435\u0440\u0435\u0437 " + waitS + " \u0441 (\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A Retry-After), \u044D\u0442\u043E \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u0440\u0435\u0434\u0435\u043B\u0430 " + capS + " \u0441 \u2014 \u043F\u043E\u0432\u0442\u043E\u0440\u044B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u044B.";
        }, en: function(waitS, capS) {
          return "Server asked to retry after " + waitS + "s (Retry-After header), exceeding the " + capS + "s cap \u2014 retries stopped.";
        } },
        "retryOnStatus.retryAfterWait": { ru: function(waitS, requestName) {
          return "[HEPHAESTUS] \u26A1 Retry-After: \u0436\u0434\u0443 " + waitS + " \u0441 \u043F\u0435\u0440\u0435\u0434 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u043C: " + requestName;
        }, en: function(waitS, requestName) {
          return "[HEPHAESTUS] \u26A1 Retry-After: waiting " + waitS + "s before retrying: " + requestName;
        } },
        // ─── assertions ───
        "assertions.found": { ru: function(soft2, name2, path2) {
          return (soft2 ? "\u26AA [soft] " : "\u{1F50E} ") + "\u041D\u0430\u0439\u0434\u0435\u043D\u043E: '" + name2 + "' (" + path2 + ")";
        }, en: function(soft2, name2, path2) {
          return (soft2 ? "\u26AA [soft] " : "\u{1F50E} ") + "Found: '" + name2 + "' (" + path2 + ")";
        } },
        "assertions.softFieldNotFound": { ru: function(path2) {
          return "\u26AA [soft] \u041F\u043E\u043B\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: " + path2 + " \u2014 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E";
        }, en: function(path2) {
          return "\u26AA [soft] Field not found: " + path2 + " \u2014 skipped";
        } },
        "assertions.valueNotFound": { ru: function(path2) {
          return "\u{1F6AB} \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E \u043F\u0443\u0442\u0438: " + path2;
        }, en: function(path2) {
          return "\u{1F6AB} Value not found at path: " + path2;
        } },
        "assertions.conditionFailed": { ru: function(name2) {
          return "\u{1F6AB} '" + name2 + "': \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
        }, en: function(name2) {
          return "\u{1F6AB} '" + name2 + "': condition not met";
        } },
        "assertions.expectedValue": { ru: function(name2, expect2) {
          return "\u{1F6AB} '" + name2 + `': \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C "` + expect2 + '"';
        }, en: function(name2, expect2) {
          return "\u{1F6AB} '" + name2 + `': expected "` + expect2 + '"';
        } },
        "assertions.saved": { ru: function(name2, path2) {
          return "\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: '" + name2 + "' \u2190 " + path2;
        }, en: function(name2, path2) {
          return "\u{1F4BE} Saved: '" + name2 + "' \u2190 " + path2;
        } },
        "assertions.notFoundAtPath": { ru: function(name2, path2) {
          return "\u{1F6AB} '" + name2 + "': \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0442\u0438 '" + path2 + "'";
        }, en: function(name2, path2) {
          return "\u{1F6AB} '" + name2 + "': not found at path '" + path2 + "'";
        } },
        "assertions.maxBytesName": {
          ru: function(max, size) {
            return "\u{1F4E6} \u0420\u0430\u0437\u043C\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0430 \u2264 " + max + " \u0411: " + size + " \u0411 " + (size <= max ? "\u2705" : "\u274C");
          },
          en: function(max, size) {
            return "\u{1F4E6} Response size \u2264 " + max + " B: " + size + " B " + (size <= max ? "\u2705" : "\u274C");
          }
        },
        "assertions.maxBytesExceed": {
          ru: function(size, max) {
            return "\u{1F6AB} \u0420\u0430\u0437\u043C\u0435\u0440 \u043E\u0442\u0432\u0435\u0442\u0430 \u043F\u0440\u0435\u0432\u044B\u0448\u0435\u043D: " + size + " \u0411 > " + max + " \u0411";
          },
          en: function(size, max) {
            return "\u{1F6AB} Response size exceeded: " + size + " B > " + max + " B";
          }
        },
        "assertions.unknownScope": { ru: function(scope, name2) {
          return 'varsToSave: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 scope "' + scope + '" \u0434\u043B\u044F "' + name2 + '", \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D collection';
        }, en: function(scope, name2) {
          return 'varsToSave: unknown scope "' + scope + '" for "' + name2 + '", collection used';
        } },
        "assertions.varsSaveNotFound": { ru: function(name2, path2) {
          return "varsToSave: '" + name2 + "' \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0442\u0438 '" + path2 + "'";
        }, en: function(name2, path2) {
          return "varsToSave: '" + name2 + "' not found at path '" + path2 + "'";
        } },
        "assertions.countLabel": { ru: function(length, expected, ok) {
          return expected !== void 0 ? length + " / " + expected + (ok ? " \u2705" : " \u274C") : length + " \u044D\u043B.";
        }, en: function(length, expected, ok) {
          return expected !== void 0 ? length + " / " + expected + (ok ? " \u2705" : " \u274C") : length + " items";
        } },
        "assertions.countTest": { ru: function(alias, label2) {
          return "\u{1F4CF} \u041A\u043E\u043B-\u0432\u043E '" + alias + "': " + label2;
        }, en: function(alias, label2) {
          return "\u{1F4CF} Count '" + alias + "': " + label2;
        } },
        "assertions.countMismatch": { ru: function(alias, expected, length) {
          return "\u{1F6AB} '" + alias + "': \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C " + expected + ", \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + length;
        }, en: function(alias, expected, length) {
          return "\u{1F6AB} '" + alias + "': expected " + expected + ", got " + length;
        } },
        "assertions.notExists": { ru: function() {
          return "\u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442";
        }, en: function() {
          return "does not exist";
        } },
        "assertions.mustBeAbsent": { ru: function(fieldPath2) {
          return '\u{1F6AB} "' + fieldPath2 + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C';
        }, en: function(fieldPath2) {
          return '\u{1F6AB} "' + fieldPath2 + '" must be absent';
        } },
        "assertions.fieldNotFound": { ru: function(fieldPath2) {
          return '\u{1F6AB} "' + fieldPath2 + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E';
        }, en: function(fieldPath2) {
          return '\u{1F6AB} "' + fieldPath2 + '" not found';
        } },
        "assertions.expectedArray": { ru: function() {
          return "\u{1F6AB} \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F array";
        }, en: function() {
          return "\u{1F6AB} expected array";
        } },
        "assertions.expectedNull": { ru: function() {
          return "\u{1F6AB} \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F null";
        }, en: function() {
          return "\u{1F6AB} expected null";
        } },
        "assertions.expectedType": { ru: function(type) {
          return "\u{1F6AB} \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u0442\u0438\u043F " + type;
        }, en: function(type) {
          return "\u{1F6AB} expected type " + type;
        } },
        "assertions.lenBelow": { ru: function(len, minLen) {
          return "\u{1F6AB} \u0434\u043B\u0438\u043D\u0430 " + len + " < " + minLen;
        }, en: function(len, minLen) {
          return "\u{1F6AB} length " + len + " < " + minLen;
        } },
        "assertions.lenAbove": { ru: function(len, maxLen) {
          return "\u{1F6AB} \u0434\u043B\u0438\u043D\u0430 " + len + " > " + maxLen;
        }, en: function(len, maxLen) {
          return "\u{1F6AB} length " + len + " > " + maxLen;
        } },
        "assertions.notMatch": { ru: function(raw2, re) {
          return '\u{1F6AB} "' + raw2 + '" \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 ' + re;
        }, en: function(raw2, re) {
          return '\u{1F6AB} "' + raw2 + '" does not match ' + re;
        } },
        "assertions.notParsed": { ru: function() {
          return "assertions: \u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0435\u043D, \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u044B";
        }, en: function() {
          return "assertions: response not parsed, checks skipped";
        } },
        // ─── assertEach ───
        "assertEach.ruleAbsentGot": { ru: function(path2, serVal) {
          return path2 + ": \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u043D\u043E = " + serVal;
        }, en: function(path2, serVal) {
          return path2 + ": must be absent, but = " + serVal;
        } },
        "assertEach.ruleFieldMissing": { ru: function(path2) {
          return path2 + ": \u043F\u043E\u043B\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
        }, en: function(path2) {
          return path2 + ": field is missing";
        } },
        "assertEach.ruleAbsent": { ru: function(path2) {
          return path2 + ": \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C";
        }, en: function(path2) {
          return path2 + ": must be absent";
        } },
        "assertEach.notArray": { ru: function(path2) {
          return "\u{1F522} assertEach[" + path2 + "]: \u043D\u0435 \u043C\u0430\u0441\u0441\u0438\u0432";
        }, en: function(path2) {
          return "\u{1F522} assertEach[" + path2 + "]: not an array";
        } },
        "assertEach.notArrayMsg": { ru: function(path2, type) {
          return '\u{1F6AB} "' + path2 + '" \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C (\u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: ' + type + ")";
        }, en: function(path2, type) {
          return '\u{1F6AB} "' + path2 + '" is not an array (received: ' + type + ")";
        } },
        "assertEach.minCount": { ru: function(minCount, count, ok) {
          return "\u{1F522} assertEach: minCount=" + minCount + " (" + count + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432) " + (ok ? "\u2705" : "\u274C");
        }, en: function(minCount, count, ok) {
          return "\u{1F522} assertEach: minCount=" + minCount + " (" + count + " elements) " + (ok ? "\u2705" : "\u274C");
        } },
        "assertEach.minCountMsg": { ru: function(minCount, count) {
          return "\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043C\u0438\u043D\u0438\u043C\u0443\u043C " + minCount + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + count;
        }, en: function(minCount, count) {
          return "\u{1F6AB} Expected at least " + minCount + " elements, got " + count;
        } },
        "assertEach.maxCount": { ru: function(maxCount, count, ok) {
          return "\u{1F522} assertEach: maxCount=" + maxCount + " (" + count + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432) " + (ok ? "\u2705" : "\u274C");
        }, en: function(maxCount, count, ok) {
          return "\u{1F522} assertEach: maxCount=" + maxCount + " (" + count + " elements) " + (ok ? "\u2705" : "\u274C");
        } },
        "assertEach.maxCountMsg": { ru: function(maxCount, count) {
          return "\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C " + maxCount + " \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E " + count;
        }, en: function(maxCount, count) {
          return "\u{1F6AB} Expected at most " + maxCount + " elements, got " + count;
        } },
        "assertEach.label": { ru: function(globalSoft, path2, count, ruleCount) {
          return (globalSoft ? "\u26AA [soft] " : "") + "\u{1F522} assertEach[" + path2 + "]: " + count + " \u044D\u043B. \xD7 " + ruleCount + " \u043F\u0440\u0430\u0432\u0438\u043B";
        }, en: function(globalSoft, path2, count, ruleCount) {
          return (globalSoft ? "\u26AA [soft] " : "") + "\u{1F522} assertEach[" + path2 + "]: " + count + " items \xD7 " + ruleCount + " rules";
        } },
        "assertEach.result": { ru: function(label2, hardFailed) {
          return label2 + " \u2014 " + (hardFailed === 0 ? "\u2705 \u0432\u0441\u0435 \u043F\u0440\u043E\u0448\u043B\u0438" : "\u274C " + hardFailed + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439");
        }, en: function(label2, hardFailed) {
          return label2 + " \u2014 " + (hardFailed === 0 ? "\u2705 all passed" : "\u274C " + hardFailed + " violations");
        } },
        "assertEach.violations": { ru: function(hardFailed, totalChecks, preview, total) {
          return hardFailed + "/" + totalChecks + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439:\n" + preview + (total > 10 ? "\n... +" + (total - 10) + " \u0435\u0449\u0451" : "");
        }, en: function(hardFailed, totalChecks, preview, total) {
          return hardFailed + "/" + totalChecks + " violations:\n" + preview + (total > 10 ? "\n... +" + (total - 10) + " more" : "");
        } },
        // ─── assertShape ───
        "assertShape.mustBeAbsent": { ru: function(fieldPath2, valJson) {
          return '\u{1F6AB} "' + fieldPath2 + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u043D\u043E = ' + valJson;
        }, en: function(fieldPath2, valJson) {
          return '\u{1F6AB} "' + fieldPath2 + '" must be absent, but = ' + valJson;
        } },
        "assertShape.notFound": { ru: function(fieldPath2) {
          return '\u{1F6AB} "' + fieldPath2 + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E';
        }, en: function(fieldPath2) {
          return '\u{1F6AB} "' + fieldPath2 + '" not found';
        } },
        "assertShape.typeMismatch": { ru: function(fieldPath2, expected, actual) {
          return '\u{1F6AB} "' + fieldPath2 + '": \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F ' + expected + ", \u043F\u043E\u043B\u0443\u0447\u0435\u043D " + actual;
        }, en: function(fieldPath2, expected, actual) {
          return '\u{1F6AB} "' + fieldPath2 + '": expected ' + expected + ", got " + actual;
        } },
        // ─── graphql ───
        "graphql.noErrorsName": { ru: function() {
          return "\u{1F517} GraphQL: \u043E\u0442\u0432\u0435\u0442 \u0431\u0435\u0437 \u043E\u0448\u0438\u0431\u043E\u043A";
        }, en: function() {
          return "\u{1F517} GraphQL: no errors";
        } },
        "graphql.hasErrors": { ru: function(count, first) {
          return "\u{1F6AB} \u0412 \u043E\u0442\u0432\u0435\u0442\u0435 \u043E\u0448\u0438\u0431\u043E\u043A GraphQL: " + count + '. \u041F\u0435\u0440\u0432\u0430\u044F: "' + first + '"';
        }, en: function(count, first) {
          return "\u{1F6AB} GraphQL errors in response: " + count + '. First: "' + first + '"';
        } },
        "graphql.errorCountName": { ru: function(n) {
          return "\u{1F517} GraphQL: \u0447\u0438\u0441\u043B\u043E \u043E\u0448\u0438\u0431\u043E\u043A = " + n;
        }, en: function(n) {
          return "\u{1F517} GraphQL: exactly " + n + " error(s)";
        } },
        "graphql.errorCountFail": { ru: function(expected, actual) {
          return "\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0448\u0438\u0431\u043E\u043A: " + expected + ", \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: " + actual;
        }, en: function(expected, actual) {
          return "\u{1F6AB} Expected " + expected + " error(s), got " + actual;
        } },
        "graphql.errorContainsName": { ru: function(needle) {
          return '\u{1F517} GraphQL: \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + needle + '"';
        }, en: function(needle) {
          return '\u{1F517} GraphQL: an error contains "' + needle + '"';
        } },
        "graphql.errorContainsFail": { ru: function(needle) {
          return '\u{1F6AB} \u041D\u0438 \u043E\u0434\u043D\u0430 \u043E\u0448\u0438\u0431\u043A\u0430 \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + needle + '"';
        }, en: function(needle) {
          return '\u{1F6AB} No error message contains "' + needle + '"';
        } },
        // ─── assertOrder ───
        "assertOrder.violationsCount": { ru: function(count) {
          return "\u274C " + count + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439";
        }, en: function(count) {
          return "\u274C " + count + " violations";
        } },
        "assertOrder.violationsMsg": { ru: function(dir, by, violations) {
          return "\u041D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F \u043F\u043E\u0440\u044F\u0434\u043A\u0430 \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438 (" + dir + ' by "' + by + '"):\n' + violations;
        }, en: function(dir, by, violations) {
          return "Sort order violations (" + dir + ' by "' + by + '"):\n' + violations;
        } },
        // ─── assertUnique ───
        "assertUnique.dupeCount": { ru: function(count) {
          return count === 0 ? "\u2705" : "\u274C " + count + " \u0434\u0443\u0431\u043B\u0435\u0439";
        }, en: function(count) {
          return count === 0 ? "\u2705" : "\u274C " + count + " duplicates";
        } },
        "assertUnique.dupesMsg": { ru: function(path2, by, list2) {
          return "\u041D\u0430\u0439\u0434\u0435\u043D\u044B \u0434\u0443\u0431\u043B\u0438 (" + path2 + (by ? "." + by : "") + "):\n" + list2;
        }, en: function(path2, by, list2) {
          return "Duplicates found (" + path2 + (by ? "." + by : "") + "):\n" + list2;
        } },
        // ─── snapshot ───
        "snapshot.storeSizeWarn": { ru: function() {
          return "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 checkPaths \u0434\u043B\u044F \u0441\u043E\u043A\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043E\u0447\u0438\u0441\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 snapshot-clear \u043C\u0435\u0442\u043E\u0434.";
        }, en: function() {
          return "Use checkPaths to shorten it or clear it via the snapshot-clear method.";
        } },
        "snapshot.recordWarn": { ru: function(rkey) {
          return '\u{1F4F8} snapshotRecord: baseline \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u043D \u0434\u043B\u044F "' + rkey + '" \u2014 \u043D\u0435 \u0437\u0430\u0431\u0443\u0434\u044C \u0443\u0431\u0440\u0430\u0442\u044C \u0444\u043B\u0430\u0433 record (\u0438\u043D\u0430\u0447\u0435 \u0440\u0435\u0433\u0440\u0435\u0441\u0441\u0438\u0438 \u043D\u0435 \u043B\u043E\u0432\u044F\u0442\u0441\u044F)';
        }, en: function(rkey) {
          return '\u{1F4F8} snapshotRecord: baseline overwritten for "' + rkey + `" \u2014 don't forget to remove the record flag (otherwise regressions will not be caught)`;
        } },
        "snapshot.recordTest": { ru: function() {
          return "\u{1F4F8} Snapshot: \u{1F534} baseline \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u043D (record)";
        }, en: function() {
          return "\u{1F4F8} Snapshot: \u{1F534} baseline overwritten (record)";
        } },
        "snapshot.postmanApiFallback": { ru: function() {
          return 'snapshot: storage "postman-api" \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D offline \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F collection-vars';
        }, en: function() {
          return 'snapshot: storage "postman-api" is unavailable offline \u2014 falling back to collection-vars';
        } },
        "snapshot.missingTest": { ru: function() {
          return "\u{1F4F8} Snapshot: \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D (autoSaveMissing \u043E\u0442\u043A\u043B\u044E\u0447\u0451\u043D)";
        }, en: function() {
          return "\u{1F4F8} Snapshot: not found (autoSaveMissing disabled)";
        } },
        "snapshot.missingMsg": { ru: function(key) {
          return '\u{1F6AB} \u0421\u043D\u0430\u043F\u0448\u043E\u0442 "' + key + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D';
        }, en: function(key) {
          return '\u{1F6AB} Snapshot "' + key + '" not found';
        } },
        "snapshot.savedTest": { ru: function() {
          return "\u{1F4F8} Snapshot: \u2705 baseline \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D";
        }, en: function() {
          return "\u{1F4F8} Snapshot: \u2705 baseline saved";
        } },
        "snapshot.compareTest": { ru: function(mode, pathsLabel, isEqual) {
          return "\u{1F4F8} Snapshot " + mode + " " + pathsLabel + ": " + (isEqual ? "\u2705 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442" : "\u274C \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435");
        }, en: function(mode, pathsLabel, isEqual) {
          return "\u{1F4F8} Snapshot " + mode + " " + pathsLabel + ": " + (isEqual ? "\u2705 matches" : "\u274C mismatch");
        } },
        "snapshot.diffMsg": { ru: function(diffStr, diffLen) {
          return "\u{1F6AB} Snapshot \u0440\u0430\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435:\n" + diffStr + (diffLen > 5 ? "\n  ... \u0438 \u0435\u0449\u0451 " + (diffLen - 5) : "");
        }, en: function(diffStr, diffLen) {
          return "\u{1F6AB} Snapshot mismatch:\n" + diffStr + (diffLen > 5 ? "\n  ... and " + (diffLen - 5) + " more" : "");
        } },
        "snapshot.diffWarn": { ru: function(count, diffStr) {
          return "\u{1F4F8} Snapshot diff (" + count + " \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u0439):\n" + diffStr;
        }, en: function(count, diffStr) {
          return "\u{1F4F8} Snapshot diff (" + count + " differences):\n" + diffStr;
        } },
        "snapshot.typeDiff_helper_findDiff_noCtx": { ru: function(path2, storedType, currentType) {
          return path2 + ': \u0442\u0438\u043F "' + storedType + '" \u2192 "' + currentType + '"';
        }, en: function(path2, storedType, currentType) {
          return path2 + ': type "' + storedType + '" \u2192 "' + currentType + '"';
        } },
        "snapshot.arrayObjectMismatch_helper_findDiff_noCtx": { ru: function(path2) {
          return path2 + ": array/object \u043D\u0435\u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435";
        }, en: function(path2) {
          return path2 + ": array/object mismatch";
        } },
        "snapshot.keyRemoved_helper_findDiff_noCtx": { ru: function(np, val) {
          return np + ": \u043A\u043B\u044E\u0447 \u0443\u0434\u0430\u043B\u0451\u043D (\u0431\u044B\u043B " + val + ")";
        }, en: function(np, val) {
          return np + ": key removed (was " + val + ")";
        } },
        "snapshot.keyAdded_helper_findDiff_noCtx": { ru: function(np, val) {
          return np + ": \u043A\u043B\u044E\u0447 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D = " + val;
        }, en: function(np, val) {
          return np + ": key added = " + val;
        } },
        "snapshot.expectedArray_helper_nonStrictMatch_noCtx": { ru: function(path2) {
          return path2 + ": \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432";
        }, en: function(path2) {
          return path2 + ": expected an array";
        } },
        "snapshot.keyMissing_helper_nonStrictMatch_noCtx": { ru: function(np) {
          return np + ": \u043A\u043B\u044E\u0447 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
        }, en: function(np) {
          return np + ": key missing";
        } },
        // ─── schema ───
        "schema.noData": { ru: function() {
          return "schema: \u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0434\u043B\u044F \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 (\u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0435\u043D)";
        }, en: function() {
          return "schema: no data to validate (response was not parsed)";
        } },
        "schema.tv4Missing": { ru: function() {
          return "schema: tv4 \u043D\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D \u0432 \u044D\u0442\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438 Postman";
        }, en: function() {
          return "schema: tv4 is not available in this version of Postman";
        } },
        "schema.testName": { ru: function(valid, count) {
          return "\u{1F52C} Schema: " + (valid ? "\u2705 \u0432\u0430\u043B\u0438\u0434\u043D\u0430" : "\u274C \u043E\u0448\u0438\u0431\u043A\u0438 (" + count + ")");
        }, en: function(valid, count) {
          return "\u{1F52C} Schema: " + (valid ? "\u2705 valid" : "\u274C errors (" + count + ")");
        } },
        "schema.validationError": { ru: function(message) {
          return "schema: \u043E\u0448\u0438\u0431\u043A\u0430 \u0432\u0430\u043B\u0438\u0434\u0430\u0446\u0438\u0438 \u2014 " + message;
        }, en: function(message) {
          return "schema: validation error \u2014 " + message;
        } },
        // ─── plugins ───
        "plugins.parseError": { ru: function(message) {
          return "plugins: \u043E\u0448\u0438\u0431\u043A\u0430 \u0440\u0430\u0437\u0431\u043E\u0440\u0430 hephaestus.plugins \u2014 " + message;
        }, en: function(message) {
          return "plugins: error parsing hephaestus.plugins \u2014 " + message;
        } },
        "plugins.readFailed": { ru: function(name2, post, message) {
          return 'plugin "' + name2 + '": \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C "' + post + '" \u2014 ' + message;
        }, en: function(name2, post, message) {
          return 'plugin "' + name2 + '": failed to read "' + post + '" \u2014 ' + message;
        } },
        "plugins.varEmpty": { ru: function(name2, post) {
          return 'plugin "' + name2 + '": \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F "' + post + '" \u043F\u0443\u0441\u0442\u0430';
        }, en: function(name2, post) {
          return 'plugin "' + name2 + '": variable "' + post + '" is empty';
        } },
        "plugins.execError": { ru: function(name2, message) {
          return 'plugin "' + name2 + '": \u043E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u2014 ' + message;
        }, en: function(name2, message) {
          return 'plugin "' + name2 + '": execution error \u2014 ' + message;
        } },
        "plugins.testError": { ru: function(name2) {
          return '\u{1F50C} Plugin "' + name2 + '": \u043E\u0448\u0438\u0431\u043A\u0430';
        }, en: function(name2) {
          return '\u{1F50C} Plugin "' + name2 + '": error';
        } },
        // ─── securityAudit ───
        "securityAudit.requireHeaderName": { ru: function(h) {
          return "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438: " + h;
        }, en: function(h) {
          return "Security header: " + h;
        } },
        "securityAudit.requireHeaderDetail": { ru: function(h) {
          return '\u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u0437\u0430\u0449\u0438\u0442\u043D\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A "' + h + '"';
        }, en: function(h) {
          return 'missing security header "' + h + '"';
        } },
        "securityAudit.forbidHeaderName": { ru: function(h) {
          return "\u041D\u0435\u0442 \u0440\u0430\u0441\u043A\u0440\u044B\u0442\u0438\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u0430: " + h;
        }, en: function(h) {
          return "No server disclosure: " + h;
        } },
        "securityAudit.forbidHeaderDetail": { ru: function(h, v2) {
          return '\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A "' + h + '" \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 "' + v2 + '"';
        }, en: function(h, v2) {
          return 'header "' + h + '" discloses "' + v2 + '"';
        } },
        "securityAudit.bodyLeakName": { ru: function() {
          return "\u041D\u0435\u0442 \u0443\u0442\u0435\u0447\u0435\u043A \u043E\u0442\u043B\u0430\u0434\u043A\u0438 \u0432 \u0442\u0435\u043B\u0435 \u043E\u0442\u0432\u0435\u0442\u0430";
        }, en: function() {
          return "No debug leaks in response body";
        } },
        "securityAudit.bodyLeakDetail": { ru: function(leaks) {
          return "\u043D\u0430\u0439\u0434\u0435\u043D\u044B \u0443\u0442\u0435\u0447\u043A\u0438: " + leaks;
        }, en: function(leaks) {
          return "leaks found: " + leaks;
        } },
        "securityAudit.corsName": { ru: function() {
          return "CORS: \u043D\u0435\u0442 wildcard-origin \u0441 credentials";
        }, en: function() {
          return "CORS: no wildcard-origin with credentials";
        } },
        "securityAudit.corsDetail": { ru: function() {
          return "Access-Control-Allow-Origin: * \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 Allow-Credentials: true";
        }, en: function() {
          return "Access-Control-Allow-Origin: * together with Allow-Credentials: true";
        } },
        "securityAudit.cookieName": { ru: function(name2) {
          return 'Cookie "' + name2 + '": \u0437\u0430\u0449\u0438\u0442\u043D\u044B\u0435 \u0444\u043B\u0430\u0433\u0438';
        }, en: function(name2) {
          return 'Cookie "' + name2 + '": protective flags';
        } },
        "securityAudit.cookieDetail": { ru: function(name2, missing) {
          return '\u0443 cookie "' + name2 + '" \u043D\u0435\u0442 \u0444\u043B\u0430\u0433\u043E\u0432: ' + missing;
        }, en: function(name2, missing) {
          return 'cookie "' + name2 + '" is missing flags: ' + missing;
        } },
        "securityAudit.jwtName": { ru: function(alg) {
          return "JWT (alg: " + (alg || "?") + "): \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u043E\u0441\u0442\u044C";
        }, en: function(alg) {
          return "JWT (alg: " + (alg || "?") + "): sanity";
        } },
        "securityAudit.jwtDetail": { ru: function(why) {
          return "\u043D\u0435\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 JWT: " + why;
        }, en: function(why) {
          return "insecure JWT: " + why;
        } },
        "securityAudit.noStoreName": { ru: function() {
          return "\u041E\u0442\u0432\u0435\u0442 \u043D\u0435 \u043A\u0435\u0448\u0438\u0440\u0443\u0435\u0442\u0441\u044F (Cache-Control: no-store)";
        }, en: function() {
          return "Response is not cacheable (Cache-Control: no-store)";
        } },
        "securityAudit.noStoreDetail": { ru: function(cc) {
          return "Cache-Control \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 no-store: " + cc;
        }, en: function(cc) {
          return "Cache-Control has no no-store: " + cc;
        } },
        // ─── logger ───
        "logger.snapshotDiffCount": { ru: function(count) {
          return " (" + count + " \u0440\u0430\u0437\u043B\u0438\u0447\u0438\u0439)";
        }, en: function(count) {
          return " (" + count + " differences)";
        } },
        "logger.schemaValid": { ru: function() {
          return "\u2705 \u0432\u0430\u043B\u0438\u0434\u043D\u0430";
        }, en: function() {
          return "\u2705 valid";
        } },
        "logger.schemaErrors": { ru: function(count) {
          return "\u274C " + count + " \u043E\u0448\u0438\u0431\u043E\u043A";
        }, en: function(count) {
          return "\u274C " + count + " errors";
        } },
        "logger.emptyResponse": { ru: function() {
          return "\u2014 (\u043F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442)";
        }, en: function() {
          return "\u2014 (empty response)";
        } },
        // ─── envRequired ───
        "envRequired.noEnv": { ru: function() {
          return "(\u043D\u0435\u0442 environment)";
        }, en: function() {
          return "(no environment)";
        } },
        "envRequired.missingTest": { ru: function(missing) {
          return "\u26A0\uFE0F envRequired: \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 [" + missing.join(", ") + "]";
        }, en: function(missing) {
          return "\u26A0\uFE0F envRequired: missing variables [" + missing.join(", ") + "]";
        } },
        "envRequired.missingError": { ru: function(missing, envName) {
          return "\u041E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0435 environment variables \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B:\n" + missing.map(function(n) {
            return "  \u2022 " + n;
          }).join("\n") + "\n\u0422\u0435\u043A\u0443\u0449\u0438\u0439 environment: " + envName + "\n\u041F\u0440\u043E\u0432\u0435\u0440\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 environment \u0432 Postman / Newman.";
        }, en: function(missing, envName) {
          return "Required environment variables not set:\n" + missing.map(function(n) {
            return "  \u2022 " + n;
          }).join("\n") + "\nCurrent environment: " + envName + "\nCheck the environment settings in Postman / Newman.";
        } },
        "envRequired.missingPush": { ru: function(missing, envName) {
          return "envRequired: \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B [" + missing.join(", ") + '] \u0432 environment "' + envName + '"';
        }, en: function(missing, envName) {
          return "envRequired: not set [" + missing.join(", ") + '] in environment "' + envName + '"';
        } },
        // ─── urlBuilder ───
        "urlBuilder.protocolSubstituted": { ru: function(defaultProtocol) {
          return '\u{1F310} urlBuilder: \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D \u2014 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D "' + defaultProtocol + '://"';
        }, en: function(defaultProtocol) {
          return '\u{1F310} urlBuilder: protocol not specified \u2014 substituted "' + defaultProtocol + '://"';
        } },
        "urlBuilder.baseUrlSet": { ru: function() {
          return "\u{1F310} URL: \u0431\u0430\u0437\u043E\u0432\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0434\u0430\u043D";
        }, en: function() {
          return "\u{1F310} URL: base address is set";
        } },
        "urlBuilder.baseUrlMissing": { ru: function() {
          return "\u{1F6AB} baseUrl \u043D\u0435 \u0437\u0430\u0434\u0430\u043D \u043D\u0438 \u0432 defaults, \u043D\u0438 \u0432 override";
        }, en: function() {
          return "\u{1F6AB} baseUrl is not set in either defaults or override";
        } },
        "urlBuilder.insecureHttp": { ru: function() {
          return "\u26A0\uFE0F URL: \u043D\u0435\u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u044B\u0439 \u043F\u0440\u043E\u0442\u043E\u043A\u043E\u043B http";
        }, en: function() {
          return "\u26A0\uFE0F URL: insecure http protocol";
        } },
        "urlBuilder.httpWarning": { ru: function() {
          return "\u26A0\uFE0F baseUrl \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 http:// \u2014 \u0443\u0431\u0435\u0434\u0438\u0441\u044C, \u0447\u0442\u043E \u044D\u0442\u043E \u043D\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u043E.";
        }, en: function() {
          return "\u26A0\uFE0F baseUrl uses http:// \u2014 make sure this is intentional.";
        } },
        // ─── auth ───
        "auth.oauth2ccNoResponse": { ru: function(err) {
          return "oauth2cc: " + (err ? err.message : "\u043D\u0435\u0442 \u043E\u0442\u0432\u0435\u0442\u0430");
        }, en: function(err) {
          return "oauth2cc: " + (err ? err.message : "no response");
        } },
        "auth.oauth2ccInvalidJson": { ru: function() {
          return "oauth2cc: \u043D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0439 JSON \u0432 \u043E\u0442\u0432\u0435\u0442\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438";
        }, en: function() {
          return "oauth2cc: invalid JSON in authorization server response";
        } },
        "auth.oauth2ccNoAccessToken": { ru: function() {
          return "oauth2cc: \u043D\u0435\u0442 access_token \u0432 \u043E\u0442\u0432\u0435\u0442\u0435";
        }, en: function() {
          return "oauth2cc: no access_token in response";
        } },
        "auth.unknownType": { ru: function(type) {
          return 'auth: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0438\u043F "' + type + '". \u0414\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0435: none, basic, bearer, headers, variables, oauth2cc';
        }, en: function(type) {
          return 'auth: unknown type "' + type + '". Allowed: none, basic, bearer, headers, variables, oauth2cc';
        } },
        "auth.error": { ru: function(msg) {
          return "auth: \u043E\u0448\u0438\u0431\u043A\u0430 \u2014 " + msg;
        }, en: function(msg) {
          return "auth: error \u2014 " + msg;
        } },
        // ─── dateUtils ───
        "dateUtils.unknownExpr": { ru: function(expr, varName) {
          return 'dateUtils: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435 "' + expr + '" \u0434\u043B\u044F "' + varName + '"';
        }, en: function(expr, varName) {
          return 'dateUtils: unknown expression "' + expr + '" for "' + varName + '"';
        } },
        // ─── logger ───
        "logger.authNone": { ru: function() {
          return "none (\u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u0430)";
        }, en: function() {
          return "none (disabled)";
        } },
        "logger.unknownAuthType": { ru: function(type) {
          return type + " (\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0442\u0438\u043F)";
        }, en: function(type) {
          return type + " (unknown type)";
        } },
        "logger.initErrors": { ru: function() {
          return "\u26A0\uFE0F  [Hephaestus] \u041E\u0448\u0438\u0431\u043A\u0438 \u0438\u043D\u0438\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438:\n";
        }, en: function() {
          return "\u26A0\uFE0F  [Hephaestus] Initialization errors:\n";
        } },
        // ─── configMerge ───
        "configMerge.parseDefaultsFailed": { ru: function(message) {
          return "configMerge: \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C hephaestus.defaults \u2014 " + message;
        }, en: function(message) {
          return "configMerge: failed to parse hephaestus.defaults \u2014 " + message;
        } },
        "configMerge.unknownKey": {
          ru: function(k) {
            return '\u26A0\uFE0F \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 override: "' + k + '"';
          },
          en: function(k) {
            return '\u26A0\uFE0F Unknown override key: "' + k + '"';
          }
        },
        "configMerge.unknownKeySuggest": {
          ru: function(k, near) {
            return '\u26A0\uFE0F \u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 override: "' + k + '" \u2014 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E, "' + near + '"?';
          },
          en: function(k, near) {
            return '\u26A0\uFE0F Unknown override key: "' + k + '" \u2014 did you mean "' + near + '"?';
          }
        },
        "configMerge.strictFailTest": {
          ru: function() {
            return "\u{1F6AB} strictMode: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u043A\u043B\u044E\u0447\u0438 override";
          },
          en: function() {
            return "\u{1F6AB} strictMode: unknown override key(s)";
          }
        },
        "configMerge.strictFailError": {
          ru: function(keys) {
            return "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u043A\u043B\u044E\u0447\u0438 override (strictMode): " + keys;
          },
          en: function(keys) {
            return "Unknown override key(s) (strictMode): " + keys;
          }
        },
        // ─── engine ───
        "engine.postCritical": { ru: function() {
          return "\u{1F6AB} Hephaestus post-request: \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430";
        }, en: function() {
          return "\u{1F6AB} Hephaestus post-request: critical error";
        } },
        "engine.preCritical": { ru: function() {
          return "\u{1F6AB} Hephaestus pre-request: \u043A\u0440\u0438\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430";
        }, en: function() {
          return "\u{1F6AB} Hephaestus pre-request: critical error";
        } }
      };
    }
  });

  // engine/src/shared/config-merge.js
  var KNOWN_KEYS, configMerge;
  var init_config_merge = __esm({
    "engine/src/shared/config-merge.js"() {
      init_i18n();
      KNOWN_KEYS = [
        "$schema",
        "_comment",
        "strictMode",
        "extraKeys",
        "baseUrl",
        "defaultProtocol",
        "auth",
        "dateFormat",
        "dates",
        "maxResponseTime",
        "maxBytes",
        "expectedStatus",
        "expectEmpty",
        "contentType",
        "snapshot",
        "snapshotRecord",
        "schema",
        "securityAudit",
        "secrets",
        "envRequired",
        "ci",
        "locale",
        "logLevel",
        "softFail",
        "randomData",
        "keysToFind",
        "varsToSave",
        "keysToCount",
        "assertions",
        "assertEach",
        "assertShape",
        "assertOrder",
        "assertUnique",
        "assertHeaders",
        "retryOnStatus",
        "graphql",
        // config for the shipped plugins (read off ctx.config by docs/plugins/*)
        "slackUrl",
        "slackOnlyFailures",
        "teamsUrl",
        "teamsOnlyFailures",
        "slaMsLimit",
        "checkCors",
        "assertJsonApi"
      ];
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
        // Levenshtein distance over short strings — powers the "did you mean" hint.
        _editDistance(a, b) {
          const m = a.length, n = b.length;
          if (!m) return n;
          if (!n) return m;
          let prev = [];
          for (let j = 0; j <= n; j++) prev[j] = j;
          for (let i = 1; i <= m; i++) {
            const cur = [i];
            for (let j = 1; j <= n; j++) {
              const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
              cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            }
            prev = cur;
          }
          return prev[n];
        },
        // Nearest known key, but only when it's close enough to be a real typo.
        _closest(key) {
          let best = null, bestD = Infinity;
          const lk = key.toLowerCase();
          for (let i = 0; i < KNOWN_KEYS.length; i++) {
            const d = this._editDistance(lk, KNOWN_KEYS[i].toLowerCase());
            if (d < bestD) {
              bestD = d;
              best = KNOWN_KEYS[i];
            }
          }
          return bestD <= Math.max(2, Math.ceil(key.length / 3)) ? best : null;
        },
        // Flag override keys the engine does not recognise (e.g. a typo'd `snapshsot`,
        // which used to be silently ignored). Default: a console warning, suppressed at
        // logLevel 'silent'. With strictMode:true it fails a test so CI blocks the run.
        _validateKeys(ctx2, override2) {
          if (!override2 || typeof override2 !== "object") return;
          const extra = Array.isArray(ctx2.config.extraKeys) ? ctx2.config.extraKeys : [];
          const unknown = Object.keys(override2).filter((k) => KNOWN_KEYS.indexOf(k) === -1 && extra.indexOf(k) === -1);
          if (!unknown.length) return;
          if (ctx2.config.strictMode === true) {
            pm.test(t(ctx2, "configMerge.strictFailTest"), function() {
              throw new Error(t(ctx2, "configMerge.strictFailError", unknown.join(", ")));
            });
            return;
          }
          if (ctx2.config.logLevel === "silent") return;
          const self = this;
          unknown.forEach(function(k) {
            const near = self._closest(k);
            console.warn(near ? t(ctx2, "configMerge.unknownKeySuggest", k, near) : t(ctx2, "configMerge.unknownKey", k));
          });
        },
        run(ctx2, override2) {
          let defaults = {};
          try {
            const raw2 = pm.collectionVariables.get("hephaestus.defaults");
            if (raw2) defaults = JSON.parse(raw2);
          } catch (e2) {
            ctx2._meta.errors.push(t(ctx2, "configMerge.parseDefaultsFailed", e2.message));
          }
          ctx2.config = this._merge(defaults, override2 || {});
          this._validateKeys(ctx2, override2);
        }
      };
    }
  });

  // engine/src/shared/iteration-data.js
  var iterationData;
  var init_iteration_data = __esm({
    "engine/src/shared/iteration-data.js"() {
      iterationData = {
        run(ctx2, inject) {
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
          if (inject) {
            Object.keys(data).forEach(function(key) {
              var val = data[key];
              pm.variables.set("iter." + key, val !== null && val !== void 0 ? String(val) : "");
            });
          }
        }
      };
    }
  });

  // engine/src/shared/mask.js
  function isSensitive(key, secrets) {
    if (!secrets || secrets.length === 0) return false;
    const k = String(key).toLowerCase();
    return secrets.some(function(s) {
      return k.includes(String(s).toLowerCase());
    });
  }
  var init_mask = __esm({
    "engine/src/shared/mask.js"() {
    }
  });

  // engine/src/shared/retry-after.js
  function parseRetryAfterMs(value, nowMs) {
    if (value === null || value === void 0) return null;
    const s = String(value).trim();
    if (s === "") return null;
    if (/^\d+$/.test(s)) {
      return parseInt(s, 10) * 1e3;
    }
    if (!/[A-Za-z]/.test(s)) return null;
    const when = Date.parse(s);
    if (isNaN(when)) return null;
    const diff = when - nowMs;
    return diff > 0 ? diff : 0;
  }
  var init_retry_after = __esm({
    "engine/src/shared/retry-after.js"() {
    }
  });

  // engine/src/shared/structure.js
  function structurePaths(obj) {
    const out = /* @__PURE__ */ Object.create(null);
    function add(key, type) {
      if (out[key] === void 0) {
        out[key] = type;
        return;
      }
      if (("|" + out[key] + "|").indexOf("|" + type + "|") === -1) {
        out[key] = out[key].split("|").concat(type).sort().join("|");
      }
    }
    function walk(v2, path2) {
      if (Array.isArray(v2)) {
        if (v2.length === 0) {
          add(path2 + "[*]", "empty-array");
          return;
        }
        for (let i = 0; i < v2.length; i++) walk(v2[i], path2 + "[*]");
        return;
      }
      if (v2 !== null && typeof v2 === "object") {
        const keys = Object.keys(v2);
        if (keys.length === 0) {
          add(path2 || "(root)", "empty-object");
          return;
        }
        keys.forEach(function(k) {
          walk(v2[k], path2 ? path2 + "." + k : k);
        });
        return;
      }
      add(path2 || "(root)", v2 === null ? "null" : typeof v2);
    }
    walk(obj, "");
    return out;
  }
  function structuralDiff(stored, current) {
    const a = structurePaths(stored);
    const b = current === void 0 ? /* @__PURE__ */ Object.create(null) : structurePaths(current);
    const diff = [];
    Object.keys(a).forEach(function(p2) {
      if (!(p2 in b)) diff.push("- " + p2 + " (" + a[p2] + ")");
      else if (a[p2] !== b[p2]) diff.push("~ " + p2 + ": " + a[p2] + " \u2192 " + b[p2]);
    });
    Object.keys(b).forEach(function(p2) {
      if (!(p2 in a)) diff.push("+ " + p2 + " (" + b[p2] + ")");
    });
    return diff.sort();
  }
  var init_structure = __esm({
    "engine/src/shared/structure.js"() {
    }
  });

  // engine/src/post-request.js
  var require_post_request = __commonJS({
    "engine/src/post-request.js"(exports, module) {
      init_config_merge();
      init_iteration_data();
      init_mask();
      init_retry_after();
      init_structure();
      init_i18n();
      (function hephaestusPostRequest() {
        const VERSION = "3.9.0";
        const _override = typeof override !== "undefined" && override !== null ? override : {};
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
            const label2 = statusLabel(ctx2, code2);
            const allowed = this._resolveAllowed(ctx2.config);
            const isOk = allowed.includes(code2);
            const emoji = isOk ? "\u{1F7E2}" : code2 >= 400 && code2 < 500 ? "\u{1F7E1}" : "\u{1F534}";
            ctx2.response._statusLabel = label2;
            ctx2.response._statusEmoji = emoji;
            ctx2.response._sizeFormatted = this._formatSize(size);
            const allowedLabel = allowed.length === 1 ? allowed[0] : "[" + allowed.join(", ") + "]";
            pm.test(t(ctx2, "metrics.status", emoji, code2, label2), () => {
              pm.expect(code2, t(ctx2, "metrics.statusExpect", code2, allowedLabel)).to.be.oneOf(allowed);
            });
            const expectEmpty = ctx2.config.expectEmpty === true;
            pm.test(t(ctx2, "metrics.bodyName", expectEmpty), () => {
              if (!expectEmpty) pm.expect(ctx2.response.raw, t(ctx2, "metrics.bodyEmpty")).to.have.length.above(0);
              else pm.expect(ctx2.response.raw, t(ctx2, "metrics.bodyNotEmpty")).to.have.length.below(10);
            });
            const expectedType = (ctx2.config.contentType || "").toLowerCase();
            if (!expectEmpty && expectedType) {
              pm.test(t(ctx2, "metrics.contentType", ctx2.response.contentType || "\u2014"), () => {
                pm.expect(ctx2.response.contentType, t(ctx2, "metrics.contentTypeExpect", expectedType)).to.include(expectedType);
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
          _transforms(value, t2) {
            if (!t2) return value;
            return (Array.isArray(t2) ? t2 : [t2]).reduce((v2, fn) => {
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
              const label = t(ctx, "assertions.found", soft, name, path);
              pm.test(label, () => {
                if (!found) {
                  if (soft) {
                    console.log(t(ctx, "assertions.softFieldNotFound", path));
                    pm.expect(true).to.be.true;
                    return;
                  }
                  pm.expect(v, t(ctx, "assertions.valueNotFound", path)).to.exist;
                }
                if (found && expect !== void 0) {
                  if (typeof expect === "function") pm.expect((() => {
                    try {
                      return expect(v);
                    } catch (e2) {
                      return false;
                    }
                  })(), t(ctx, "assertions.conditionFailed", name)).to.be.true;
                  else pm.expect(v, t(ctx, "assertions.expectedValue", name, expect)).to.eql(expect);
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
              pm.test(t(ctx2, "assertions.saved", name2, path2), () => {
                pm.expect(raw2, t(ctx2, "assertions.notFoundAtPath", name2, path2)).to.exist;
                ok = true;
              });
              if (v2 !== void 0) {
                const sv = typeof v2 === "object" ? JSON.stringify(v2) : v2;
                if (scope === "environment") pm.environment.set(name2, sv);
                else if (scope === "local") pm.variables.set(name2, sv);
                else pm.collectionVariables.set(name2, sv);
                if (scope !== "collection" && scope !== "environment" && scope !== "local")
                  ctx2._meta.errors.push(t(ctx2, "assertions.unknownScope", scope, name2));
              } else {
                ctx2._meta.errors.push(t(ctx2, "assertions.varsSaveNotFound", name2, path2));
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
              const label2 = t(ctx2, "assertions.countLabel", length, expected, ok);
              pm.test(t(ctx2, "assertions.countTest", alias, label2), () => {
                if (expected !== void 0) pm.expect(length, t(ctx2, "assertions.countMismatch", alias, expected, length)).to.eql(expected);
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
                  pm.expect(raw, t(ctx, "assertions.mustBeAbsent", fieldPath)).to.be.oneOf([void 0, null]);
                });
                ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw === void 0 || raw === null });
                return;
              }
              if (rule.exists === false) {
                check(t(ctx, "assertions.notExists"), function() {
                  pm.expect(raw, t(ctx, "assertions.mustBeAbsent", fieldPath)).to.be.oneOf([void 0, null]);
                });
                ctx._meta.results.found.push({ name: fieldPath, path: fieldPath, ok: raw === void 0 || raw === null });
                return;
              }
              check("exists", function() {
                pm.expect(raw, t(ctx, "assertions.fieldNotFound", fieldPath)).to.not.be.oneOf([void 0, null]);
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
                  if (rule.type === "array") pm.expect(raw, t(ctx, "assertions.expectedArray")).to.be.an("array");
                  else if (rule.type === "null") pm.expect(raw, t(ctx, "assertions.expectedNull")).to.be.null;
                  else pm.expect(typeof raw, t(ctx, "assertions.expectedType", rule.type)).to.equal(rule.type);
                });
              if (rule.minLen !== void 0)
                check("minLen=" + rule.minLen, function() {
                  const len = Array.isArray(raw) ? raw.length : typeof raw === "string" ? raw.length : -1;
                  pm.expect(len, t(ctx, "assertions.lenBelow", len, rule.minLen)).to.be.at.least(rule.minLen);
                });
              if (rule.maxLen !== void 0)
                check("maxLen=" + rule.maxLen, function() {
                  const len = Array.isArray(raw) ? raw.length : typeof raw === "string" ? raw.length : Infinity;
                  pm.expect(len, t(ctx, "assertions.lenAbove", len, rule.maxLen)).to.be.at.most(rule.maxLen);
                });
              if (rule.includes !== void 0)
                check("includes " + JSON.stringify(rule.includes), function() {
                  if (Array.isArray(raw)) pm.expect(raw).to.include(rule.includes);
                  else pm.expect(String(raw)).to.include(String(rule.includes));
                });
              if (rule.matches !== void 0)
                check("matches " + rule.matches, function() {
                  const re = rule.matches instanceof RegExp ? rule.matches : new RegExp(rule.matches);
                  pm.expect(re.test(String(raw)), t(ctx, "assertions.notMatch", raw, re)).to.be.true;
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
          // maxBytes: ctx.config.maxBytes (число) — бюджет размера ответа в байтах.
          runMaxBytes(ctx2) {
            const max = ctx2.config.maxBytes;
            if (typeof max !== "number" || max <= 0) return;
            const size = ctx2.response.size;
            if (typeof size !== "number") return;
            pm.test(t(ctx2, "assertions.maxBytesName", max, size), () => {
              pm.expect(size, t(ctx2, "assertions.maxBytesExceed", size, max)).to.be.at.most(max);
            });
          },
          run(ctx2) {
            this.runMaxBytes(ctx2);
            if (!ctx2.response.parsed && ctx2.response.format !== "text") {
              ctx2._meta.errors.push(t(ctx2, "assertions.notParsed"));
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
              if (val !== void 0 && val !== null) errs.push(t(ctx, "assertEach.ruleAbsentGot", path2, this._serVal(val)));
              return errs;
            }
            if (rule2.exists !== false) {
              if (val === void 0 || val === null) {
                errs.push(t(ctx, "assertEach.ruleFieldMissing", path2));
                return errs;
              }
            } else if (rule2.exists === false) {
              if (val !== void 0 && val !== null) errs.push(t(ctx, "assertEach.ruleAbsent", path2));
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
              pm.test(t(ctx2, "assertEach.notArray", cfg.path), function() {
                pm.expect(arr, t(ctx2, "assertEach.notArrayMsg", cfg.path, typeof arr)).to.be.an("array");
              });
              return;
            }
            if (cfg.minCount !== void 0) {
              const ok = arr.length >= cfg.minCount;
              pm.test(t(ctx2, "assertEach.minCount", cfg.minCount, arr.length, ok), function() {
                pm.expect(arr.length, t(ctx2, "assertEach.minCountMsg", cfg.minCount, arr.length)).to.be.at.least(cfg.minCount);
              });
            }
            if (cfg.maxCount !== void 0) {
              const ok = arr.length <= cfg.maxCount;
              pm.test(t(ctx2, "assertEach.maxCount", cfg.maxCount, arr.length, ok), function() {
                pm.expect(arr.length, t(ctx2, "assertEach.maxCountMsg", cfg.maxCount, arr.length)).to.be.at.most(cfg.maxCount);
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
            const label2 = t(ctx2, "assertEach.label", globalSoft, cfg.path, arr.length, ruleKeys.length);
            pm.test(t(ctx2, "assertEach.result", label2, hardFailed), function() {
              if (hardFailed > 0) {
                const preview = allFailures.slice(0, 10).join("\n");
                throw new Error(
                  t(ctx2, "assertEach.violations", hardFailed, totalChecks, preview, allFailures.length)
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
              if (cfg.respectRetryAfter) {
                const capMs = typeof cfg.retryAfterCapMs === "number" ? cfg.retryAfterCapMs : 1e4;
                const hdrVal = pm.response.headers && pm.response.headers.get ? pm.response.headers.get("Retry-After") : null;
                const waitMs = parseRetryAfterMs(hdrVal, Date.now());
                if (waitMs !== null && waitMs > capMs) {
                  pm.variables.unset(key);
                  pm.test(t(_ctx, "retryOnStatus.retryAfterName", code2), function() {
                    throw new Error(t(
                      _ctx,
                      "retryOnStatus.retryAfterExceeds",
                      Math.round(waitMs / 1e3),
                      Math.round(capMs / 1e3)
                    ));
                  });
                  return false;
                }
                if (waitMs) {
                  console.log(t(_ctx, "retryOnStatus.retryAfterWait", waitMs / 1e3, pm.info.requestName));
                  const _end = Date.now() + waitMs;
                  while (Date.now() < _end) {
                  }
                }
              }
              pm.variables.set(key, String(count + 1));
              pm.test(t(_ctx, "retryOnStatus.retryName", count + 1, maxRetries, code2), function() {
              });
              console.log(t(_ctx, "retryOnStatus.rerunLog", count + 1, maxRetries, code2, pm.info.requestName));
              pm.setNextRequest(pm.info.requestName);
              return true;
            }
            pm.variables.unset(key);
            pm.test(t(_ctx, "retryOnStatus.exhausted", maxRetries, code2), function() {
              throw new Error(
                t(_ctx, "retryOnStatus.allFailed", maxRetries, code2, statuses.join("/"))
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
                  pm.expect(val, t(ctx2, "assertShape.mustBeAbsent", fieldPath2, JSON.stringify(val))).to.be.oneOf([void 0, null]);
                });
                return;
              }
              if (expected === "any") {
                shapeTest('\u{1F9E9} shape "' + fieldPath2 + '": exists', function() {
                  pm.expect(val, t(ctx2, "assertShape.notFound", fieldPath2)).to.not.be.oneOf([void 0, null]);
                });
                return;
              }
              shapeTest('\u{1F9E9} shape "' + fieldPath2 + '": ' + expected, function() {
                pm.expect(val, t(ctx2, "assertShape.notFound", fieldPath2)).to.not.be.oneOf([void 0, null]);
                pm.expect(actual, t(ctx2, "assertShape.typeMismatch", fieldPath2, expected, actual)).to.equal(expected);
              });
            });
          }
        };
        const graphql = {
          _typeOf(v2) {
            if (v2 === null) return "null";
            if (Array.isArray(v2)) return "array";
            return typeof v2;
          },
          run(ctx2) {
            let cfg = _override.graphql;
            if (!cfg) return;
            if (cfg === true) cfg = { noErrors: true };
            if (typeof cfg !== "object") return;
            const isSoft = !!ctx2.config.softFail;
            const self = this;
            function gqlTest(label2, fn) {
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
            const errors = ctx2.api.get("errors");
            const errArr = Array.isArray(errors) ? errors : [];
            const firstMsg = function() {
              return errArr.length ? String(errArr[0] && errArr[0].message || errArr[0]) : "";
            };
            if (cfg.noErrors === true) {
              gqlTest(t(ctx2, "graphql.noErrorsName"), function() {
                pm.expect(errArr.length, t(ctx2, "graphql.hasErrors", errArr.length, firstMsg())).to.equal(0);
              });
            }
            if (typeof cfg.errorCount === "number") {
              gqlTest(t(ctx2, "graphql.errorCountName", cfg.errorCount), function() {
                pm.expect(errArr.length, t(ctx2, "graphql.errorCountFail", cfg.errorCount, errArr.length)).to.equal(cfg.errorCount);
              });
            }
            if (typeof cfg.errorContains === "string") {
              gqlTest(t(ctx2, "graphql.errorContainsName", cfg.errorContains), function() {
                const hit = errArr.some(function(e2) {
                  return String(e2 && e2.message || e2).indexOf(cfg.errorContains) !== -1;
                });
                pm.expect(hit, t(ctx2, "graphql.errorContainsFail", cfg.errorContains)).to.equal(true);
              });
            }
            if (cfg.dataShape && typeof cfg.dataShape === "object" && !Array.isArray(cfg.dataShape)) {
              Object.keys(cfg.dataShape).forEach(function(p2) {
                const expected = cfg.dataShape[p2];
                const fullPath = "data." + p2;
                const val = ctx2.api.get(fullPath);
                const actual = self._typeOf(val);
                gqlTest('\u{1F517} GraphQL data "' + p2 + '": ' + expected, function() {
                  pm.expect(val, t(ctx2, "assertShape.notFound", fullPath)).to.not.be.oneOf([void 0, null]);
                  pm.expect(actual, t(ctx2, "assertShape.typeMismatch", fullPath, expected, actual)).to.equal(expected);
                });
              });
            }
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
            pm.test(label2 + " \u2014 " + (violations.length === 0 ? "\u2705" : t(ctx2, "assertOrder.violationsCount", violations.length)), function() {
              if (violations.length > 0) {
                const msg = t(ctx2, "assertOrder.violationsMsg", dir, by, violations.join("\n"));
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
            pm.test(label2 + " \u2014 " + t(ctx2, "assertUnique.dupeCount", dupes.length), function() {
              if (dupes.length > 0) {
                const msg = t(ctx2, "assertUnique.dupesMsg", cfg.path, by, dupes.slice(0, 5).join("\n"));
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
                pm.test(t(ctx2, "headers.absent", label2), function() {
                  pm.expect(headerValue, t(ctx2, "headers.absentExpect", headerName)).to.be.oneOf([null, void 0, ""]);
                });
                ctx2._meta.results.headers = ctx2._meta.results.headers || [];
                ctx2._meta.results.headers.push({ name: headerName, status: "absent", ok: !headerValue });
                return;
              }
              pm.test(t(ctx2, "headers.exists", label2), function() {
                pm.expect(headerValue, t(ctx2, "headers.existsExpect", headerName)).to.be.a("string").and.have.length.above(0);
              });
              if (entry2.equals !== void 0) {
                pm.test(t(ctx2, "headers.equals", label2, entry2.equals), function() {
                  pm.expect(headerValue, t(ctx2, "headers.equalsExpect", entry2.equals, headerValue)).to.equal(String(entry2.equals));
                });
              } else if (typeof entry2.expect === "function") {
                var fnResult;
                try {
                  fnResult = entry2.expect(headerValue);
                } catch (e2) {
                  fnResult = false;
                }
                pm.test(t(ctx2, "headers.cond", label2), function() {
                  pm.expect(fnResult, t(ctx2, "headers.condExpect", headerName, headerValue)).to.be.true;
                });
              } else if (typeof entry2.expect === "string") {
                pm.test(t(ctx2, "headers.includes", label2, entry2.expect), function() {
                  pm.expect(headerValue, t(ctx2, "headers.includesExpect", headerName, entry2.expect)).to.include(entry2.expect);
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
                "snapshot: hephaestus.snapshots > 900KB. " + t(ctx2, "snapshot.storeSizeWarn")
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
              return [t(ctx, "snapshot.typeDiff_helper_findDiff_noCtx", path2, typeof stored, typeof current)];
            }
            if (typeof stored !== "object" || stored === null) {
              if (stored !== current) diffs.push(path2 + ": " + this._sv(stored) + " \u2192 " + this._sv(current));
              return diffs;
            }
            if (Array.isArray(stored) !== Array.isArray(current)) {
              return [t(ctx, "snapshot.arrayObjectMismatch_helper_findDiff_noCtx", path2)];
            }
            const keys = /* @__PURE__ */ new Set([...Object.keys(stored), ...Object.keys(current || {})]);
            keys.forEach((k) => {
              const np = path2 ? path2 + "." + k : k;
              if (!(k in (current || {}))) diffs.push(t(ctx, "snapshot.keyRemoved_helper_findDiff_noCtx", np, this._sv(stored[k])));
              else if (!(k in stored)) diffs.push(t(ctx, "snapshot.keyAdded_helper_findDiff_noCtx", np, this._sv((current || {})[k])));
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
                diff.push(t(ctx, "snapshot.expectedArray_helper_nonStrictMatch_noCtx", path2));
                return false;
              }
              return stored.every((item, i) => this._nonStrictMatch(item, current[i], diff, path2 + "[" + i + "]"));
            }
            return Object.keys(stored).every((k) => {
              const np = path2 ? path2 + "." + k : k;
              if (!current || !(k in current)) {
                diff.push(t(ctx, "snapshot.keyMissing_helper_nonStrictMatch_noCtx", np));
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
              console.warn(t(ctx2, "snapshot.recordWarn", rkey));
              pm.test(t(ctx2, "snapshot.recordTest"), () => pm.expect(true).to.be.true);
              ctx2._meta.results.snapshot = { status: "recorded", key: rkey };
              return;
            }
            const storage = cfg.storage || "collection-vars";
            if (storage === "postman-api" && !pm.collectionVariables.get("hephaestus.snapshotApiWarned")) {
              pm.collectionVariables.set("hephaestus.snapshotApiWarned", "1");
              ctx2._meta.errors.push(t(ctx2, "snapshot.postmanApiFallback"));
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
                pm.test(t(ctx2, "snapshot.missingTest"), () => {
                  pm.expect(false, t(ctx2, "snapshot.missingMsg", key)).to.be.true;
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
              pm.test(t(ctx2, "snapshot.savedTest"), () => pm.expect(true).to.be.true);
              ctx2._meta.results.snapshot = { status: "saved", key };
              return;
            }
            const storedData = existing.data;
            const diff = [];
            let isEqual = false;
            if (mode === "strict") {
              isEqual = this._deepEqual(storedData, currentData);
              if (!isEqual) this._findDiff(storedData, currentData, "").forEach((d) => diff.push(d));
            } else if (mode === "structural") {
              structuralDiff(storedData, currentData).forEach((d) => diff.push(d));
              isEqual = diff.length === 0;
            } else {
              isEqual = this._nonStrictMatch(storedData, currentData, diff, "");
            }
            const pathsLabel = checkPaths.length > 0 ? "(" + checkPaths.length + " paths)" : "(full)";
            pm.test(
              t(ctx2, "snapshot.compareTest", mode, pathsLabel, isEqual),
              () => {
                if (!isEqual) {
                  const diffStr = diff.slice(0, 5).map((d) => "  \u2022 " + d).join("\n");
                  pm.expect(isEqual, t(ctx2, "snapshot.diffMsg", diffStr, diff.length)).to.be.true;
                }
              }
            );
            if (!isEqual && diff.length > 0) {
              console.warn(t(ctx2, "snapshot.diffWarn", diff.length, diff.slice(0, 10).map((d) => "  \u2022 " + d).join("\n")));
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
              ctx2._meta.errors.push(t(ctx2, "schema.noData"));
              ctx2._meta.results.schema = { valid: false, errors: ["no parsed data"] };
              return;
            }
            if (typeof tv4 === "undefined") {
              ctx2._meta.errors.push(t(ctx2, "schema.tv4Missing"));
              return;
            }
            try {
              const result = tv4.validateMultiple(source, cfg.definition);
              const valid = result.errors.length === 0;
              const count = result.errors.length;
              pm.test(t(ctx2, "schema.testName", valid, count), () => {
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
              ctx2._meta.errors.push(t(ctx2, "schema.validationError", e2.message));
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
              ctx._meta.errors.push(t(ctx, "plugins.parseError", e2.message));
              return;
            }
            list.forEach(function(p) {
              if (!p || typeof p !== "object" || !p.name) return;
              if (!p.post) return;
              var code = "";
              try {
                code = pm.collectionVariables.get(p.post) || "";
              } catch (e2) {
                ctx._meta.errors.push(t(ctx, "plugins.readFailed", p.name, p.post, e2.message));
                return;
              }
              if (!code.trim()) {
                ctx._meta.errors.push(t(ctx, "plugins.varEmpty", p.name, p.post));
                return;
              }
              try {
                eval(code);
              } catch (e2) {
                ctx._meta.errors.push(t(ctx, "plugins.execError", p.name, e2.message));
                pm.test(t(ctx, "plugins.testError", p.name), function() {
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
          // All Set-Cookie header values (headers.get collapses duplicates to one).
          _setCookies() {
            try {
              const all = pm.response.headers && pm.response.headers.all ? pm.response.headers.all() : [];
              return all.filter(function(h) {
                return h && h.key && String(h.key).toLowerCase() === "set-cookie";
              }).map(function(h) {
                return String(h.value);
              });
            } catch (e2) {
              return [];
            }
          },
          // JWT-shaped tokens (header.payload.signature, base64url) in a haystack.
          _findJwts(hay) {
            return String(hay).match(/eyJ[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]*/g) || [];
          },
          // base64url segment → JSON object (or null). atob exists in the sandbox.
          _decodeJwtPart(seg) {
            try {
              let s = String(seg).replace(/-/g, "+").replace(/_/g, "/");
              while (s.length % 4) s += "=";
              return JSON.parse(decodeURIComponent(escape(atob(s))));
            } catch (e2) {
              return null;
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
              secTest(t(ctx2, "securityAudit.requireHeaderName", h), present, t(ctx2, "securityAudit.requireHeaderDetail", h));
            });
            list2(cfg.forbidHeaders, self._defaults.forbidHeaders).forEach(function(h) {
              const v2 = self._headerVal(h);
              const disclosed = typeof v2 === "string" && v2.length > 0;
              if (disclosed) findings.push({ type: "disclosure-header", name: h, value: v2 });
              secTest(t(ctx2, "securityAudit.forbidHeaderName", h), !disclosed, t(ctx2, "securityAudit.forbidHeaderDetail", h, v2));
            });
            const patterns = list2(cfg.forbidBodyPatterns, self._defaults.forbidBodyPatterns);
            const raw2 = ctx2.response && ctx2.response.raw ? String(ctx2.response.raw) : "";
            if (raw2 && patterns && patterns.length) {
              const hit = patterns.filter(function(p2) {
                return raw2.indexOf(p2) !== -1;
              });
              if (hit.length) findings.push({ type: "body-leak", patterns: hit });
              secTest(t(ctx2, "securityAudit.bodyLeakName"), hit.length === 0, t(ctx2, "securityAudit.bodyLeakDetail", hit.join(", ")));
            }
            if (cfg.checkCors !== false) {
              const acao = self._headerVal("access-control-allow-origin");
              const acac = self._headerVal("access-control-allow-credentials");
              if (acao === "*" && String(acac).toLowerCase() === "true") {
                findings.push({ type: "insecure-cors" });
                secTest(t(ctx2, "securityAudit.corsName"), false, t(ctx2, "securityAudit.corsDetail"));
              }
            }
            if (cfg.cookieFlags) {
              const required = Array.isArray(cfg.cookieFlags) ? cfg.cookieFlags : ["Secure", "HttpOnly", "SameSite"];
              self._setCookies().forEach(function(c) {
                const cookieName = c.split("=")[0].trim();
                const firstSemi = c.indexOf(";");
                const attrs = firstSemi === -1 ? "" : c.slice(firstSemi + 1);
                const missing = required.filter(function(f) {
                  const esc = String(f).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  return !new RegExp("(^|;)\\s*" + esc + "\\b", "i").test(attrs);
                });
                const ok = missing.length === 0;
                if (!ok) findings.push({ type: "weak-cookie", name: cookieName, missing });
                secTest(t(ctx2, "securityAudit.cookieName", cookieName), ok, t(ctx2, "securityAudit.cookieDetail", cookieName, missing.join(", ")));
              });
            }
            if (cfg.checkJwt) {
              self._findJwts(raw2 + " " + self._setCookies().join(" ")).forEach(function(jwt) {
                const parts = jwt.split(".");
                const hdr = self._decodeJwtPart(parts[0]);
                const pl = self._decodeJwtPart(parts[1]);
                const algNone = hdr && typeof hdr.alg === "string" && hdr.alg.toLowerCase() === "none";
                const expired = pl && typeof pl.exp === "number" && pl.exp * 1e3 < Date.now();
                const ok = !algNone && !expired;
                if (!ok) findings.push({ type: "weak-jwt", alg: hdr && hdr.alg, expired: !!expired });
                secTest(
                  t(ctx2, "securityAudit.jwtName", hdr && hdr.alg),
                  ok,
                  t(ctx2, "securityAudit.jwtDetail", algNone ? "alg: none" : expired ? "exp in the past" : "")
                );
              });
            }
            if (cfg.requireNoStore) {
              const cc = String(self._headerVal("cache-control") || "").toLowerCase();
              const ok = cc.indexOf("no-store") !== -1;
              if (!ok) findings.push({ type: "cacheable-auth" });
              secTest(t(ctx2, "securityAudit.noStoreName"), ok, t(ctx2, "securityAudit.noStoreDetail", cc || "(missing)"));
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
          // Нужно ли маскировать значение по имени ключа — общий shared/mask.js.
          _isSensitive(key, secrets) {
            return isSensitive(key, secrets);
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
                if (this._isSensitive(key, secrets)) {
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
                  if (this._isSensitive(k, secrets)) {
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
              const det = s.status === "diff" ? t(ctx, "logger.snapshotDiffCount", (s.diff || []).length) : s.status === "saved" ? " baseline" : "";
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
              lines.push("\u{1F52C} SCHEMA   " + (sv.valid ? t(ctx, "logger.schemaValid") : t(ctx, "logger.schemaErrors", sv.errors.length)));
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
              previewStr = t(ctx2, "logger.emptyResponse");
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
            graphql.run(ctx);
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
          pm.test(t(ctx, "engine.postCritical"), () => {
            throw new Error("[v" + VERSION + "] " + e2.message);
          });
        }
      })();
    }
  });
  require_post_request();
})();
