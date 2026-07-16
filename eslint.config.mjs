// ESLint flat config (ESLint v9+)
//
//   engine/src/**          — ES modules (source of truth, bundled by esbuild)
//   setup/**, templates/** — Postman sandbox scripts (pasted verbatim)
//   engine/pre-request.js, engine/post-request.js — GENERATED esbuild bundles → ignored

const sandboxGlobals = {
    // Postman sandbox globals
    pm:        'readonly',
    tv4:       'readonly',
    xml2Json:  'readonly',
    CryptoJS:  'readonly',
    btoa:      'readonly',
    require:   'readonly',
    console:   'readonly',
    eval:      'readonly',
    override:  'readonly',
};

const sandboxRules = {
    // Потенциальные баги
    'no-undef':              'error',
    // caughtErrors:'none' — Postman sandbox scripts intentionally swallow many
    // errors (try/catch as guard). varsIgnorePattern/argsIgnorePattern: _ = unused.
    'no-unused-vars':        ['warn', { vars: 'all', args: 'after-used', ignoreRestSiblings: true, caughtErrors: 'none', varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    'no-unreachable':        'error',
    'no-constant-condition': 'warn',
    'no-dupe-keys':          'error',
    'no-duplicate-case':     'error',
    'use-isnan':             'error',

    // Стиль (предупреждения, не ошибки — sandbox-код не всегда следует стандартам)
    'eqeqeq':                ['warn', 'smart'],
    'no-var':                'off',      // var разрешён (ES5-совместимость sandbox)
    'prefer-const':          'off',      // let/const не обязательны в sandbox

    // Безопасность
    'no-eval':               'off',      // eval используется намеренно (engine loader)
};

export default [
    // Generated esbuild bundles — never linted.
    { ignores: ['engine/pre-request.js', 'engine/post-request.js'] },

    // Engine source — ES modules with import/export.
    {
        files: ['engine/src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: sandboxGlobals,
        },
        rules: sandboxRules,
    },

    // Postman sandbox scripts. Postman internally wraps every script in a
    // function, so top-level `return` is valid — tell ESLint to allow it.
    {
        files: ['setup/**/*.js', 'templates/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            parserOptions: { ecmaFeatures: { globalReturn: true } },
            globals: sandboxGlobals,
        },
        rules: sandboxRules,
    },
];
