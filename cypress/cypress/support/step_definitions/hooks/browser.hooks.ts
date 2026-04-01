import { Before } from "@badeball/cypress-cucumber-preprocessor";

Before({ tags: '@chromeOnly' }, function () {
  if (!Cypress.isBrowser('chrome')) {
    this.skip()
  }
});

export function browserGuardAny<T extends any[]>(
  browsers: string[],
  fn: (this: Mocha.Context, ...args: T) => any
) {
  return function (this: Mocha.Context, ...args: T) {
    if (!browsers.some((b) => Cypress.isBrowser(b))) {
      this.skip();
    }
    return fn.apply(this, args);
  };
}

