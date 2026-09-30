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
    // reporting/scripts/*.js are plain Node/CommonJS, not TypeScript -- they need Node globals.
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
      // Assertions mostly live inside page-object methods (BasePage.expectVisible, etc.), not as
      // raw expect() calls in the spec -- assertFunctionPatterns (regex) catches that; the default
      // assertFunctionNames only matches exact strings.
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^expect'] }],
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Playwright's fixture signature is `(fixtures, use) => ...` -- `{}` for a fixture with no
    // dependencies is intentional, not an accidental empty destructure.
    files: ['fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  prettierConfig,
);
