const config = {
  extends: ['stylelint-config-recommended-scss'],
  rules: {
    // Empty `//` lines are used as visual separators inside documentation
    // comment blocks (see e.g. FormulaInput's stylesheet header).
    'scss/comment-no-empty': null,
    // Extending concrete sibling classes (e.g. ReadonlyInput extends
    // .card-item-content) is accepted; forcing %placeholders would restructure
    // stylesheets without a quality gain.
    'scss/at-extend-no-missing-placeholder': null,
  },
};

export default config;
