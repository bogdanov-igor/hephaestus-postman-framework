(() => {
  // engine/src/shared/i18n.js
  function locOf(ctx) {
    return ctx && ctx.config && ctx.config.locale === "en" ? "en" : "ru";
  }
  var M = {
    "metrics.status": {
      ru: function(e, c, l) {
        return e + " \u0421\u0442\u0430\u0442\u0443\u0441: " + c + " \u2014 " + l;
      },
      en: function(e, c, l) {
        return e + " Status: " + c + " \u2014 " + l;
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
      ru: function(e) {
        return "\u{1F4ED} \u0422\u0435\u043B\u043E \u043E\u0442\u0432\u0435\u0442\u0430: " + (e ? "\u043F\u0443\u0441\u0442\u043E\u0435 \u2713" : "\u043D\u0435 \u043F\u0443\u0441\u0442\u043E\u0435");
      },
      en: function(e) {
        return "\u{1F4ED} Response body: " + (e ? "empty \u2713" : "not empty");
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
      ru: function(l, v) {
        return '\u{1F4E8} Header "' + l + '" = "' + v + '"';
      },
      en: function(l, v) {
        return '\u{1F4E8} Header "' + l + '" = "' + v + '"';
      }
    },
    "headers.equalsExpect": {
      ru: function(e, g) {
        return '\u{1F6AB} \u041E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C "' + e + '", \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E "' + g + '"';
      },
      en: function(e, g) {
        return '\u{1F6AB} Expected "' + e + '", got "' + g + '"';
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
      ru: function(h, v) {
        return '\u{1F6AB} Header "' + h + '": \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E (\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: "' + v + '")';
      },
      en: function(h, v) {
        return '\u{1F6AB} Header "' + h + '": condition failed (value: "' + v + '")';
      }
    },
    "headers.includes": {
      ru: function(l, e) {
        return '\u{1F4E8} Header "' + l + '" \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + e + '"';
      },
      en: function(l, e) {
        return '\u{1F4E8} Header "' + l + '" contains "' + e + '"';
      }
    },
    "headers.includesExpect": {
      ru: function(h, e) {
        return '\u{1F6AB} Header "' + h + '" \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 "' + e + '"';
      },
      en: function(h, e) {
        return '\u{1F6AB} Header "' + h + '" does not contain "' + e + '"';
      }
    },
    // ─── retryOnStatus ───
    "retryOnStatus.rerunLog": { ru: function(attempt, maxRetries, code, requestName) {
      return "[HEPHAESTUS] \u26A1 retryOnStatus: \u043F\u043E\u043F\u044B\u0442\u043A\u0430 " + attempt + "/" + maxRetries + ", status=" + code + ", re-running: " + requestName;
    }, en: function(attempt, maxRetries, code, requestName) {
      return "[HEPHAESTUS] \u26A1 retryOnStatus: attempt " + attempt + "/" + maxRetries + ", status=" + code + ", re-running: " + requestName;
    } },
    "retryOnStatus.exhausted": { ru: function(maxRetries, code) {
      return "\u26A1 retryOnStatus: \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u044B \u0432\u0441\u0435 " + maxRetries + " \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 (status=" + code + ")";
    }, en: function(maxRetries, code) {
      return "\u26A1 retryOnStatus: exhausted all " + maxRetries + " retries (status=" + code + ")";
    } },
    "retryOnStatus.allFailed": { ru: function(maxRetries, code, expected) {
      return "\u0412\u0441\u0435 " + maxRetries + " \u043F\u043E\u043F\u044B\u0442\u043A\u0438 \u0432\u0435\u0440\u043D\u0443\u043B\u0438 \u0441\u0442\u0430\u0442\u0443\u0441 " + code + ". \u041E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043D\u0435 " + expected + ".";
    }, en: function(maxRetries, code, expected) {
      return "All " + maxRetries + " attempts returned status " + code + ". Expected not " + expected + ".";
    } },
    // ─── assertions ───
    "assertions.found": { ru: function(soft, name, path) {
      return (soft ? "\u26AA [soft] " : "\u{1F50E} ") + "\u041D\u0430\u0439\u0434\u0435\u043D\u043E: '" + name + "' (" + path + ")";
    }, en: function(soft, name, path) {
      return (soft ? "\u26AA [soft] " : "\u{1F50E} ") + "Found: '" + name + "' (" + path + ")";
    } },
    "assertions.softFieldNotFound": { ru: function(path) {
      return "\u26AA [soft] \u041F\u043E\u043B\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E: " + path + " \u2014 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E";
    }, en: function(path) {
      return "\u26AA [soft] Field not found: " + path + " \u2014 skipped";
    } },
    "assertions.valueNotFound": { ru: function(path) {
      return "\u{1F6AB} \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u043F\u043E \u043F\u0443\u0442\u0438: " + path;
    }, en: function(path) {
      return "\u{1F6AB} Value not found at path: " + path;
    } },
    "assertions.conditionFailed": { ru: function(name) {
      return "\u{1F6AB} '" + name + "': \u0443\u0441\u043B\u043E\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
    }, en: function(name) {
      return "\u{1F6AB} '" + name + "': condition not met";
    } },
    "assertions.expectedValue": { ru: function(name, expect) {
      return "\u{1F6AB} '" + name + `': \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C "` + expect + '"';
    }, en: function(name, expect) {
      return "\u{1F6AB} '" + name + `': expected "` + expect + '"';
    } },
    "assertions.saved": { ru: function(name, path) {
      return "\u{1F4BE} \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: '" + name + "' \u2190 " + path;
    }, en: function(name, path) {
      return "\u{1F4BE} Saved: '" + name + "' \u2190 " + path;
    } },
    "assertions.notFoundAtPath": { ru: function(name, path) {
      return "\u{1F6AB} '" + name + "': \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0442\u0438 '" + path + "'";
    }, en: function(name, path) {
      return "\u{1F6AB} '" + name + "': not found at path '" + path + "'";
    } },
    "assertions.unknownScope": { ru: function(scope, name) {
      return 'varsToSave: \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 scope "' + scope + '" \u0434\u043B\u044F "' + name + '", \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D collection';
    }, en: function(scope, name) {
      return 'varsToSave: unknown scope "' + scope + '" for "' + name + '", collection used';
    } },
    "assertions.varsSaveNotFound": { ru: function(name, path) {
      return "varsToSave: '" + name + "' \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \u043F\u043E \u043F\u0443\u0442\u0438 '" + path + "'";
    }, en: function(name, path) {
      return "varsToSave: '" + name + "' not found at path '" + path + "'";
    } },
    "assertions.countLabel": { ru: function(length, expected, ok) {
      return expected !== void 0 ? length + " / " + expected + (ok ? " \u2705" : " \u274C") : length + " \u044D\u043B.";
    }, en: function(length, expected, ok) {
      return expected !== void 0 ? length + " / " + expected + (ok ? " \u2705" : " \u274C") : length + " items";
    } },
    "assertions.countTest": { ru: function(alias, label) {
      return "\u{1F4CF} \u041A\u043E\u043B-\u0432\u043E '" + alias + "': " + label;
    }, en: function(alias, label) {
      return "\u{1F4CF} Count '" + alias + "': " + label;
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
    "assertions.mustBeAbsent": { ru: function(fieldPath) {
      return '\u{1F6AB} "' + fieldPath + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C';
    }, en: function(fieldPath) {
      return '\u{1F6AB} "' + fieldPath + '" must be absent';
    } },
    "assertions.fieldNotFound": { ru: function(fieldPath) {
      return '\u{1F6AB} "' + fieldPath + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E';
    }, en: function(fieldPath) {
      return '\u{1F6AB} "' + fieldPath + '" not found';
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
    "assertions.notMatch": { ru: function(raw, re) {
      return '\u{1F6AB} "' + raw + '" \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 ' + re;
    }, en: function(raw, re) {
      return '\u{1F6AB} "' + raw + '" does not match ' + re;
    } },
    "assertions.notParsed": { ru: function() {
      return "assertions: \u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0435\u043D, \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u044B";
    }, en: function() {
      return "assertions: response not parsed, checks skipped";
    } },
    // ─── assertEach ───
    "assertEach.ruleAbsentGot": { ru: function(path, serVal) {
      return path + ": \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u043D\u043E = " + serVal;
    }, en: function(path, serVal) {
      return path + ": must be absent, but = " + serVal;
    } },
    "assertEach.ruleFieldMissing": { ru: function(path) {
      return path + ": \u043F\u043E\u043B\u0435 \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442";
    }, en: function(path) {
      return path + ": field is missing";
    } },
    "assertEach.ruleAbsent": { ru: function(path) {
      return path + ": \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C";
    }, en: function(path) {
      return path + ": must be absent";
    } },
    "assertEach.notArray": { ru: function(path) {
      return "\u{1F522} assertEach[" + path + "]: \u043D\u0435 \u043C\u0430\u0441\u0441\u0438\u0432";
    }, en: function(path) {
      return "\u{1F522} assertEach[" + path + "]: not an array";
    } },
    "assertEach.notArrayMsg": { ru: function(path, type) {
      return '\u{1F6AB} "' + path + '" \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C (\u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E: ' + type + ")";
    }, en: function(path, type) {
      return '\u{1F6AB} "' + path + '" is not an array (received: ' + type + ")";
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
    "assertEach.label": { ru: function(globalSoft, path, count, ruleCount) {
      return (globalSoft ? "\u26AA [soft] " : "") + "\u{1F522} assertEach[" + path + "]: " + count + " \u044D\u043B. \xD7 " + ruleCount + " \u043F\u0440\u0430\u0432\u0438\u043B";
    }, en: function(globalSoft, path, count, ruleCount) {
      return (globalSoft ? "\u26AA [soft] " : "") + "\u{1F522} assertEach[" + path + "]: " + count + " items \xD7 " + ruleCount + " rules";
    } },
    "assertEach.result": { ru: function(label, hardFailed) {
      return label + " \u2014 " + (hardFailed === 0 ? "\u2705 \u0432\u0441\u0435 \u043F\u0440\u043E\u0448\u043B\u0438" : "\u274C " + hardFailed + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439");
    }, en: function(label, hardFailed) {
      return label + " \u2014 " + (hardFailed === 0 ? "\u2705 all passed" : "\u274C " + hardFailed + " violations");
    } },
    "assertEach.violations": { ru: function(hardFailed, totalChecks, preview, total) {
      return hardFailed + "/" + totalChecks + " \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439:\n" + preview + (total > 10 ? "\n... +" + (total - 10) + " \u0435\u0449\u0451" : "");
    }, en: function(hardFailed, totalChecks, preview, total) {
      return hardFailed + "/" + totalChecks + " violations:\n" + preview + (total > 10 ? "\n... +" + (total - 10) + " more" : "");
    } },
    // ─── assertShape ───
    "assertShape.mustBeAbsent": { ru: function(fieldPath, valJson) {
      return '\u{1F6AB} "' + fieldPath + '" \u0434\u043E\u043B\u0436\u0435\u043D \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u043D\u043E = ' + valJson;
    }, en: function(fieldPath, valJson) {
      return '\u{1F6AB} "' + fieldPath + '" must be absent, but = ' + valJson;
    } },
    "assertShape.notFound": { ru: function(fieldPath) {
      return '\u{1F6AB} "' + fieldPath + '" \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E';
    }, en: function(fieldPath) {
      return '\u{1F6AB} "' + fieldPath + '" not found';
    } },
    "assertShape.typeMismatch": { ru: function(fieldPath, expected, actual) {
      return '\u{1F6AB} "' + fieldPath + '": \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F ' + expected + ", \u043F\u043E\u043B\u0443\u0447\u0435\u043D " + actual;
    }, en: function(fieldPath, expected, actual) {
      return '\u{1F6AB} "' + fieldPath + '": expected ' + expected + ", got " + actual;
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
    "assertUnique.dupesMsg": { ru: function(path, by, list) {
      return "\u041D\u0430\u0439\u0434\u0435\u043D\u044B \u0434\u0443\u0431\u043B\u0438 (" + path + (by ? "." + by : "") + "):\n" + list;
    }, en: function(path, by, list) {
      return "Duplicates found (" + path + (by ? "." + by : "") + "):\n" + list;
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
    "snapshot.typeDiff_helper_findDiff_noCtx": { ru: function(path, storedType, currentType) {
      return path + ': \u0442\u0438\u043F "' + storedType + '" \u2192 "' + currentType + '"';
    }, en: function(path, storedType, currentType) {
      return path + ': type "' + storedType + '" \u2192 "' + currentType + '"';
    } },
    "snapshot.arrayObjectMismatch_helper_findDiff_noCtx": { ru: function(path) {
      return path + ": array/object \u043D\u0435\u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435";
    }, en: function(path) {
      return path + ": array/object mismatch";
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
    "snapshot.expectedArray_helper_nonStrictMatch_noCtx": { ru: function(path) {
      return path + ": \u043E\u0436\u0438\u0434\u0430\u043B\u0441\u044F \u043C\u0430\u0441\u0441\u0438\u0432";
    }, en: function(path) {
      return path + ": expected an array";
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
    "plugins.readFailed": { ru: function(name, post, message) {
      return 'plugin "' + name + '": \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C "' + post + '" \u2014 ' + message;
    }, en: function(name, post, message) {
      return 'plugin "' + name + '": failed to read "' + post + '" \u2014 ' + message;
    } },
    "plugins.varEmpty": { ru: function(name, post) {
      return 'plugin "' + name + '": \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F "' + post + '" \u043F\u0443\u0441\u0442\u0430';
    }, en: function(name, post) {
      return 'plugin "' + name + '": variable "' + post + '" is empty';
    } },
    "plugins.execError": { ru: function(name, message) {
      return 'plugin "' + name + '": \u043E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u2014 ' + message;
    }, en: function(name, message) {
      return 'plugin "' + name + '": execution error \u2014 ' + message;
    } },
    "plugins.testError": { ru: function(name) {
      return '\u{1F50C} Plugin "' + name + '": \u043E\u0448\u0438\u0431\u043A\u0430';
    }, en: function(name) {
      return '\u{1F50C} Plugin "' + name + '": error';
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
    "securityAudit.forbidHeaderDetail": { ru: function(h, v) {
      return '\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A "' + h + '" \u0440\u0430\u0441\u043A\u0440\u044B\u0432\u0430\u0435\u0442 "' + v + '"';
    }, en: function(h, v) {
      return 'header "' + h + '" discloses "' + v + '"';
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
  function t(ctx, id) {
    const entry = M[id];
    if (!entry) return id;
    const args = Array.prototype.slice.call(arguments, 2);
    const fn = entry[locOf(ctx)] || entry.ru;
    return fn.apply(null, args);
  }

  // engine/src/shared/config-merge.js
  var KNOWN_KEYS = [
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
    // config for the shipped plugins (read off ctx.config by docs/plugins/*)
    "slackUrl",
    "slackOnlyFailures",
    "teamsUrl",
    "teamsOnlyFailures",
    "slaMsLimit",
    "checkCors",
    "assertJsonApi"
  ];
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
    _validateKeys(ctx, override2) {
      if (!override2 || typeof override2 !== "object") return;
      const extra = Array.isArray(ctx.config.extraKeys) ? ctx.config.extraKeys : [];
      const unknown = Object.keys(override2).filter((k) => KNOWN_KEYS.indexOf(k) === -1 && extra.indexOf(k) === -1);
      if (!unknown.length) return;
      if (ctx.config.strictMode === true) {
        pm.test(t(ctx, "configMerge.strictFailTest"), function() {
          throw new Error(t(ctx, "configMerge.strictFailError", unknown.join(", ")));
        });
        return;
      }
      if (ctx.config.logLevel === "silent") return;
      const self = this;
      unknown.forEach(function(k) {
        const near = self._closest(k);
        console.warn(near ? t(ctx, "configMerge.unknownKeySuggest", k, near) : t(ctx, "configMerge.unknownKey", k));
      });
    },
    run(ctx, override2) {
      let defaults = {};
      try {
        const raw = pm.collectionVariables.get("hephaestus.defaults");
        if (raw) defaults = JSON.parse(raw);
      } catch (e) {
        ctx._meta.errors.push(t(ctx, "configMerge.parseDefaultsFailed", e.message));
      }
      ctx.config = this._merge(defaults, override2 || {});
      this._validateKeys(ctx, override2);
    }
  };

  // engine/src/shared/iteration-data.js
  var iterationData = {
    run(ctx, inject) {
      var data = {};
      try {
        if (typeof pm.iterationData !== "undefined" && pm.iterationData) {
          data = (pm.iterationData.toObject ? pm.iterationData.toObject() : {}) || {};
        }
      } catch (e) {
      }
      ctx.iteration = {
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
      if (inject) {
        Object.keys(data).forEach(function(key) {
          var val = data[key];
          pm.variables.set("iter." + key, val !== null && val !== void 0 ? String(val) : "");
        });
      }
    }
  };

  // engine/src/shared/mask.js
  function isSensitive(key, secrets) {
    if (!secrets || secrets.length === 0) return false;
    const k = String(key).toLowerCase();
    return secrets.some(function(s) {
      return k.includes(String(s).toLowerCase());
    });
  }

  // engine/src/pre-request.js
  (function hephaestusPreRequest() {
    const VERSION = "3.9.0";
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
        var t2 = to ? new Date(to).getTime() : Date.now();
        return new Date(f + Math.random() * (t2 - f)).toISOString().slice(0, 10);
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
        const envName = pm.environment.name || t(ctx2, "envRequired.noEnv");
        pm.test(t(ctx2, "envRequired.missingTest", missing), function() {
          throw new Error(
            t(ctx2, "envRequired.missingError", missing, envName)
          );
        });
        ctx2._meta.errors.push(t(ctx2, "envRequired.missingPush", missing, envName));
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
          console.log(t(ctx2, "urlBuilder.protocolSubstituted", defaultProtocol));
        }
        pm.test(t(ctx2, "urlBuilder.baseUrlSet"), () => {
          pm.expect(rawUrl, t(ctx2, "urlBuilder.baseUrlMissing")).to.be.a("string").and.have.length.above(0);
        });
        if (/^http:\/\//i.test(rawUrl)) {
          pm.test(t(ctx2, "urlBuilder.insecureHttp"), () => {
            console.warn(t(ctx2, "urlBuilder.httpWarning"));
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
                  ctx2._meta.errors.push(t(ctx2, "auth.oauth2ccNoResponse", err));
                  return;
                }
                var tokenBody;
                try {
                  tokenBody = response.json();
                } catch (je) {
                  ctx2._meta.errors.push(t(ctx2, "auth.oauth2ccInvalidJson"));
                  return;
                }
                var accessToken = tokenBody.access_token;
                if (!accessToken) {
                  ctx2._meta.errors.push(t(ctx2, "auth.oauth2ccNoAccessToken"));
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
              ctx2._meta.errors.push(t(ctx2, "auth.unknownType", a.type));
          }
        } catch (e) {
          ctx2._meta.errors.push(t(ctx2, "auth.error", e.message));
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
        ].reduce((s, [t2, v]) => s.split(t2).join(String(v)), fmt);
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
              ctx2._meta.errors.push(t(ctx2, "dateUtils.unknownExpr", dates[varName], varName));
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
      // Нужно ли маскировать значение по имени ключа.
      // Делегирует в общий shared/mask.js (substring — fail-safe для redaction:
      // лучше замаскировать лишнее в логе, чем утечь секрет).
      _isSensitive(key, secrets) {
        return isSensitive(key, secrets);
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
        if (!auth2 || !auth2.enabled) return t(ctx, "logger.authNone");
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
            return t(ctx, "logger.unknownAuthType", auth2.type);
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
            t(ctx2, "logger.initErrors") + ctx2._meta.errors.map((e) => "  \u2022 " + e).join("\n")
          );
        }
      }
    };
    try {
      configMerge.run(ctx, _override);
      envRequired.run(ctx);
      iterationData.run(ctx, true);
      random.run(ctx);
      urlBuilder.run(ctx);
      auth.run(ctx);
      dateUtils.run(ctx);
      logger.summary(ctx);
    } catch (e) {
      pm.test(t(ctx, "engine.preCritical"), () => {
        throw new Error("[v" + VERSION + "] " + e.message);
      });
    }
  })();
})();
