module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  extends: [
    'standard',
    'eslint:recommended',
    'plugin:vue/vue3-essential',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: [
    'vue',
    'workspaces',
    '@typescript-eslint'
  ],
  globals: {
    IntersectionObserver: 'readonly',
    $: true,
    $$: true,
    browser: true,
    before: true,
    after: true,
    describe: true,
    MouseEvent: true,
    defineNuxtConfig: true,
    defineNuxtPlugin: true,
    defineEventHandler: true,
    useHead: true,
    useRequestHeaders: true,
    useRequestURL: true,
    defineOptions: true,
    useRoute: true,
    useRouter: true,
    useNuxtApp: true,
    useSeoMeta: true,
    useState: true,
    nextTick: true,
    useRuntimeConfig: true,
    computed: true,
    onBeforeMount: true,
    onBeforeUnmount: true,
    onBeforeRouteLeave: true,
    onBeforeRouteUpdate: true,
    onServerPrefetch: true,
    onMounted: true,
    inject: true,
    ref: true,
    watch: true
  },
  env: {
    browser: true,
    jest: true
  },
  rules: {
    '@typescript-eslint/no-var-requires': 0,
    'workspaces/require-dependency': 'error',
    'no-useless-catch': 'off',
    'object-shorthand': [2, 'always'],
    'vue/multi-word-component-names': 'off',
    'vue/object-curly-spacing': ['error', 'always'],
    'vue/array-bracket-spacing': ['error', 'always'],
    'vue/key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'vue/html-indent': ['error', 2, {
      attribute: 1,
      alignAttributesVertically: false
    }], // 2 spaces for html indent
    'vue/html-closing-bracket-spacing': ['error', {
      selfClosingTag: 'never'
    }],
    'vue/html-closing-bracket-newline': ['error', {
      singleline: 'never',
      multiline: 'never'
    }],
    'vue/html-self-closing': ['error', {
      html: {
        void: 'never',
        normal: 'never',
        component: 'always'
      },
      svg: 'always',
      math: 'always'
    }],
    'vue/order-in-components': ['error', {
      order: [
        'el',
        'name',
        'key',
        'parent',
        'functional',
        ['delimiters', 'comments'],
        ['components', 'directives', 'filters'],
        'extends',
        'mixins',
        ['provide', 'inject'],
        'ROUTER_GUARDS',
        'layout',
        'middleware',
        'validate',
        'scrollToTop',
        'transition',
        'loading',
        'inheritAttrs',
        'model',
        ['props', 'propsData'],
        'emits',
        'setup',
        'asyncData',
        'data',
        'fetch',
        'head',
        'computed',
        'watch',
        'watchQuery',
        'LIFECYCLE_HOOKS',
        'methods',
        ['template', 'render'],
        'renderError'
      ]
    }],
    'vue/no-reserved-component-names': ['error', {
      disallowVueBuiltInComponents: false,
      disallowVue3BuiltInComponents: false
    }]
  }
}
