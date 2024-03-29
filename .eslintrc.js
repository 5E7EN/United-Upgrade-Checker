module.exports = {
    env: {
        es2020: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:optimize-regex/all',
        'plugin:import/errors',
        'plugin:import/warnings',
        'prettier'
    ],
    overrides: [
        {
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'plugin:import/typescript',
                'prettier'
            ],
            files: ['**/*.ts?(x)', '**/.*.ts?(x)'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: ['./tsconfig.json'],
                sourceType: 'module',
                tsconfigRootDir: __dirname,
                warnOnUnsupportedTypeScriptVersion: false
            },
            plugins: ['@typescript-eslint'],
            rules: {
                '@typescript-eslint/ban-ts-comment': [
                    'warn',
                    {
                        minimumDescriptionLength: 5,
                        'ts-check': false,
                        'ts-expect-error': 'allow-with-description',
                        'ts-ignore': true,
                        'ts-nocheck': true
                    }
                ],
                '@typescript-eslint/ban-types': [
                    'warn',
                    {
                        extendDefaults: false,
                        types: {
                            Boolean: {
                                fixWith: 'boolean',
                                message: 'Use boolean instead'
                            },
                            Function: {
                                message: [
                                    'The `Function` type accepts any function-like value.',
                                    'It provides no type safety when calling the function, which can be a common source of bugs.',
                                    'It also accepts things like class declarations, which will throw at runtime as they will not be called with `new`.',
                                    'If you are expecting the function to accept certain arguments, you should explicitly define the function shape.'
                                ].join('\n')
                            },
                            Number: {
                                fixWith: 'number',
                                message: 'Use number instead'
                            },
                            Object: {
                                message: [
                                    'The `Object` type actually means "any non-nullish value", so it is marginally better than `unknown`.',
                                    '- If you want a type meaning "any object", you probably want `Record<string, unknown>` instead.',
                                    '- If you want a type meaning "any value", you probably want `unknown` instead.'
                                ].join('\n')
                            },
                            String: {
                                fixWith: 'string',
                                message: 'Use string instead'
                            },
                            Symbol: {
                                fixWith: 'symbol',
                                message: 'Use symbol instead'
                            }
                        }
                    }
                ],
                '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
                '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-duplicate-imports': 'warn',
                '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],
                '@typescript-eslint/no-explicit-any': 'warn',
                '@typescript-eslint/no-floating-promises': 'off',
                '@typescript-eslint/no-misused-promises': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-unsafe-assignment': 'off',
                '@typescript-eslint/no-unsafe-call': 'off',
                '@typescript-eslint/no-unsafe-member-access': 'off',
                '@typescript-eslint/no-unsafe-return': 'off',
                '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
                '@typescript-eslint/no-var-requires': 'off',
                '@typescript-eslint/prefer-as-const': 'warn',
                '@typescript-eslint/prefer-nullish-coalescing': 'warn',
                '@typescript-eslint/prefer-optional-chain': 'warn',
                '@typescript-eslint/restrict-plus-operands': 'warn',
                '@typescript-eslint/restrict-template-expressions': 'off',
                '@typescript-eslint/unbound-method': 'off',
                'no-duplicate-imports': 'off'
            }
        }
    ],
    plugins: ['eslint-comments', 'import', 'prettier'],
    root: true,
    rules: {
        curly: ['warn', 'all'],
        'eslint-comments/disable-enable-pair': ['warn', { allowWholeFile: true }],
        'eslint-comments/no-aggregating-enable': 'warn',
        'eslint-comments/no-duplicate-disable': 'warn',
        'eslint-comments/no-unlimited-disable': 'warn',
        'eslint-comments/no-unused-disable': 'warn',
        'eslint-comments/no-unused-enable': 'warn',
        'eslint-comments/no-use': [
            'warn',
            {
                allow: [
                    'eslint-disable',
                    'eslint-disable-line',
                    'eslint-disable-next-line',
                    'eslint-enable'
                ]
            }
        ],
        'import/default': 'off',
        'import/first': 'warn',
        'import/named': 'off',
        'import/namespace': 'off',
        'import/newline-after-import': 'warn',
        'import/no-absolute-path': 'warn',
        'import/no-amd': 'warn',
        'import/no-default-export': 'off',
        'import/no-extraneous-dependencies': [
            'warn',
            { devDependencies: true, optionalDependencies: false, peerDependencies: true }
        ],
        'import/no-mutable-exports': 'warn',
        'import/no-named-as-default-member': 'off',
        'import/no-named-default': 'warn',
        'import/no-named-export': 'off',
        'import/no-self-import': 'warn',
        'import/no-unresolved': 'warn',
        'no-constant-condition': 'off',
        'no-mixed-operators': [
            'warn',
            {
                allowSamePrecedence: true,
                groups: [
                    ['&', '|', '^', '~', '<<', '>>', '>>>'],
                    ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
                    ['&&', '||'],
                    ['in', 'instanceof']
                ]
            }
        ],
        'no-useless-escape': 'warn',
        'object-shorthand': ['warn', 'always', { avoidQuotes: true }],
        'prettier/prettier': ['warn', { endOfLine: 'auto' }]
    }
};
