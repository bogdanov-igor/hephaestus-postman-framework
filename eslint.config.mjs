// ESLint flat config (ESLint v9+)
// Проверяет engine, setup и templates — JS-файлы для Postman sandbox

export default [
    {
        files: ['engine/**/*.js', 'setup/**/*.js', 'templates/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            // Postman internally wraps every script in a function, so top-level
            // `return` is valid. Tell ESLint to allow it.
            parserOptions: {
                ecmaFeatures: { globalReturn: true }
            },
            globals: {
                // Postman sandbox globals
                pm:        'readonly',
                tv4:       'readonly',
                xml2Json:  'readonly',
                btoa:      'readonly',
                require:   'readonly',
                console:   'readonly',
                eval:      'readonly',
                override:  'readonly',
            }
        },
        rules: {
            // Потенциальные баги
            'no-undef':              'error',
            // caughtErrors:'none' — Postman sandbox scripts intentionally swallow
            // many errors (try/catch as guard), so catch binding names are not checked.
            // varsIgnorePattern/argsIgnorePattern: _ prefix = intentionally unused.
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
        }
    }
];
