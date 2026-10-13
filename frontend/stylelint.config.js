// stylelint.config.js
/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-recommended-scss'],

  ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'],

  rules: {
    // Empty `//` lines are used as visual separators inside documentation
    // comment blocks (see e.g. FormulaInput's stylesheet header).
    'scss/comment-no-empty': null,
    // Extending concrete sibling classes (e.g. ReadonlyInput extends
    // .card-item-content) is accepted; forcing %placeholders would restructure
    // stylesheets without a quality gain.
    'scss/at-extend-no-missing-placeholder': null,

    // Overriding .cds--* selectors triggers this constantly with no real benefit
    'no-descending-specificity': null,

    // Carbon v11 uses the Sass module system; map-get() -> map.get() etc.
    'scss/no-global-function-names': true,
    'at-rule-disallowed-list': [
      ['import'],
      { severity: 'warning', message: 'Use @use / @forward instead of @import' },
    ],

    // Guardrail, not a blocker
    'declaration-no-important': [true, { severity: 'warning' }],
  },

  overrides: [
    {
      // CSS Modules: :global/:local and composes are valid
      files: ['**/*.module.{css,scss}'],
      rules: {
        'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
        'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
      },
    },
    {
      // Carbon theme/token partials often need !important or raw values
      files: ['**/styles/**/_*.scss', '**/theme/**/*.scss'],
      rules: {
        'declaration-no-important': null,
      },
    },
  ],
};

export default config;
