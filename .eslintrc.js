module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    node: true
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn'
  },
  overrides: [
    {
      files: ['webpack.config.js', 'scripts/**/*.js'],
      env: {
        node: true,
        browser: false,
        webextensions: false
      },
      parserOptions: {
        sourceType: 'script'
      }
    }
  ]
};
