// ════════════════════════════════════════════════════════════
// SHARED MODULE: mask — secret-key detection
//
// Single source of truth for "should this field's value be redacted from logs?"
// Bundled into BOTH engine planes by `npm run build:emit` (esbuild inline).
//
// DESIGN — substring match on the key name is INTENTIONALLY broad:
//   for a redaction feature, over-masking a harmless field in a log is safe,
//   but UNDER-masking a real secret leaks it. A boundary-precise variant
//   (camelCase/delimiter tokenising) was evaluated and REJECTED — it under-masks
//   concatenated lowercase names (passwd, apikey, privatekey, passphrase, …),
//   which are exactly the values that must be hidden. So the rule stays:
//   mask when the lowercased key CONTAINS any configured secret word.
//   (Trade-off: names like "monkey"/"keyword" also get masked — harmless.)
//
// Depends on nothing but its (key, secrets) arguments.
// ════════════════════════════════════════════════════════════
export function isSensitive(key, secrets) {
    if (!secrets || secrets.length === 0) return false;
    const k = String(key).toLowerCase();
    return secrets.some(function(s) { return k.includes(String(s).toLowerCase()); });
}
