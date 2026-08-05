/**
 * ESLint configuration.
 *
 * ESLint 8 with @typescript-eslint 7 — uses the classic .eslintrc format
 * (flat config is ESLint 9+). Deliberately minimal: it only depends on
 * packages already in devDependencies, so `npm run lint` works on a fresh
 * clone with no extra installs.
 */

module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    'node_modules/',
    'backend/node_modules/',
    'coverage/',
    'dist/',
    'web-build/',
    'ios/',
    'android/',
    '.expo/',
    'babel.config.js',
    'jest.config.js',
    'jest.setup.js',
    '.eslintrc.js',
  ],
  rules: {
    // Unused vars are errors, but an underscore prefix marks a deliberate discard
    // (used throughout for things like `const { userId: _ignored, ...clean }`).
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // React Native's fetch/console/etc. are globals; don't fight the platform.
    'no-undef': 'off',
    // Explicit `any` is pragmatic in a few error handlers here.
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  overrides: [
    {
      // Backend is CommonJS JavaScript, not TypeScript modules.
      files: ['backend/**/*.js'],
      parserOptions: { sourceType: 'script' },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      // Jest tests legitimately use require() for lazy/mocked module loading.
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
