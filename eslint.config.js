const js = require('@eslint/js');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
      'no-nested-ternary': 'off',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'object-shorthand': ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.test.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: eslintPluginPrettier,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': 'off',
      'no-nested-ternary': 'off',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'object-shorthand': ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'no-console': 'off',
      'no-nested-ternary': 'off',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'object-shorthand': ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['dist', 'node_modules', '**/*.config.*'],
  },
];
