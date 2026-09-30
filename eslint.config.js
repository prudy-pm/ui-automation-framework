const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const playwright = require('eslint-plugin-playwright');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'playwright/**',
      'allure-results/**',
      'allure-report-single/**',
      'monocart-report/**',
      'reports-archive/**',
      'release-summary/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // scripts/*.js are plain Node/CommonJS report-generation scripts, not part of the TypeScript project --
    // they need Node globals (require, process, console, __dirname) that the TS-oriented rules above don't assume.
    files: ['**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // This project's assertions mostly live inside page-object methods (BasePage.expectVisible, etc.),
      // not as raw expect() calls in the spec itself -- the default only recognises the latter. Confirmed
      // via the rule's own source (dist/index.cjs) that assertFunctionNames only does exact string matches;
      // assertFunctionPatterns is the regex-based option that actually supports a prefix match like this.
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^expect'] }],
    },
  },
  {
    rules: {
      // Faker/JSON-driven data flows through plenty of `any` at the edges (Excel rows, API responses);
      // the project already type-checks the parts that matter and doesn't want blanket `any` bans.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Playwright's fixture signature is `(fixtures, use) => ...` -- an empty `{}` first param is the
    // documented way to declare a fixture with no dependencies, not an accidental empty destructure.
    files: ['fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  prettierConfig,
);
