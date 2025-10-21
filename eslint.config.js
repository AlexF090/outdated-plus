const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const nxEslintPlugin = require('@nx/eslint-plugin');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintPluginImport = require('eslint-plugin-import');
const eslintPluginRisxss = require('eslint-plugin-risxss');
const eslintPluginReact = require('eslint-plugin-react');
const eslintPluginReactHooks = require('eslint-plugin-react-hooks');
const eslintPluginJsxA11y = require('eslint-plugin-jsx-a11y');
const eslintPluginTypescript = require('@typescript-eslint/eslint-plugin');
const unicodeCommentsPlugin = require('eslint-plugin-unicode-comments');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  js.configs.recommended,
  ...compat.extends(
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/strict',
  ),
  {
    plugins: {
      '@nx': nxEslintPlugin,
      prettier: eslintPluginPrettier,
      import: eslintPluginImport,
      '@typescript-eslint': eslintPluginTypescript,
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      risxss: eslintPluginRisxss,
      'jsx-a11y': eslintPluginJsxA11y,
      'unicode-comments': unicodeCommentsPlugin,
    },
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.base.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Unicode Security Rules - Basis Unicode-Kontrolle
      'no-irregular-whitespace': [
        'error',
        { skipComments: false, skipStrings: false, skipTemplates: false },
      ],
      'unicode-bom': ['error', 'never'],
      'no-misleading-character-class': 'error',

      // TypeScript-specific rules
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unnecessary-condition': [
        'off',
        {
          allowConstantLoopConditions: true,
        },
      ],
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // React-specific rules
      'react/button-has-type': 'error',
      'react/display-name': 'off',
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'react/jsx-props-no-spreading': 'off',
      'react/no-danger': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      // JSX-a11y rules
      'jsx-a11y/control-has-associated-label': 'error',
      'jsx-a11y/label-has-associated-control': [
        'error',
        {
          assert: 'either',
        },
      ],

      // Import rules
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      'import/no-default-export': 'error',
      'import/order': [
        'error',
        {
          'newlines-between': 'never',
          groups: [],
          alphabetize: { order: 'ignore' },
        },
      ],
      'import/prefer-default-export': 'off',
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'never', prev: 'import', next: 'import' },
      ],

      // General JavaScript rules
      'arrow-body-style': ['error', 'as-needed'],
      'class-methods-use-this': 'off',
      'consistent-return': 'error',
      'init-declarations': ['error', 'always'],
      'no-await-in-loop': 'off',
      'no-console': ['error', { allow: ['error'] }],
      'no-else-return': ['error', { allowElseIf: false }],
      'no-eval': 'error',
      'no-implicit-globals': 'error',
      'no-implied-eval': 'error',
      'no-nested-ternary': 'error',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'clsx',
              message:
                'Please use `cn` from `@webid-portals/utils/cn` instead of `clsx`.',
            },
            {
              name: 'yup',
              message:
                "Please use `import * as Yup from '@webid-portals/schemas/yup'` instead of `import * as Yup from 'yup'`.",
            },
          ],
        },
      ],
      'object-shorthand': ['error', 'always'],
      'quote-props': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],

      // Custom plugin rules
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '@webid-portals/components',
            '@webid-portals/modules',
            '@webid-portals/partials',
            '@webid-portals/components/utils',
            '@webid-portals/utils',
          ],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
      'prettier/prettier': [
        'error',
        {
          tailwindConfig: './tailwind.config.js',
        },
      ],
      'risxss/catch-potential-xss-react': 'error',

      // Unicode security rules
      'unicode-comments/dangerous-unicode': 'error',
      'unicode-comments/dangerous-unicode-literals': 'error',
      'unicode-comments/dangerous-unicode-template-literals': 'error',
      'unicode-comments/dangerous-unicode-identifiers': 'error',
    },
  },
  {
    files: ['**/*.test.{js,ts,jsx,tsx}', '**/*.spec.{js,ts,jsx,tsx}'],
    rules: {
      // Unicode security rules also apply to tests
      'unicode-comments/dangerous-unicode': 'error',
      'unicode-comments/dangerous-unicode-literals': 'error',
      'unicode-comments/dangerous-unicode-template-literals': 'error',
      'unicode-comments/dangerous-unicode-identifiers': 'error',
    },
  },
  {
    ignores: [
      '/dist',
      '.gitignore',
      '**/*.config.*',
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '/apps/business-web/src/assets/*',
    ],
  },
];
