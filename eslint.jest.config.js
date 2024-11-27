const packageJson = require('./package.json')

module.exports = {
  displayName: packageJson.name,
  roots: [
    '<rootDir>'
  ],
  moduleFileExtensions: [
    'js',
    'vue',
    'ts'
  ],
  testMatch: [
    '**/*.js', '**/*.vue', '**/*.ts'
  ],
  testPathIgnorePatterns: [
    '/.nuxt/',
    '/dist/',
    '/node_modules/',
    '/storybook-static/',
    '/coverage/',
    '/jest-html-reporters-attach'
  ],
  runner: 'jest-runner-eslint',
  watchPlugins: ['jest-runner-eslint/watch-fix']
}
