import "./commands";
import "@testing-library/cypress/add-commands";
import "cypress-axe";
import "cypress-real-events";

type PageDiagnostic = {
  kind: string;
  message: string;
};

let currentPage: Window | undefined;
let pageDiagnostics: PageDiagnostic[] = [];

const stringify = (value: unknown): string => {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const recordDiagnostic = (kind: string, message: string) => {
  pageDiagnostics.push({ kind, message });
};

const getPageState = () => {
  if (!currentPage) {
    return { url: "unavailable" };
  }

  const navigation = currentPage.performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming | undefined;

  return {
    url: currentPage.location.href,
    readyState: currentPage.document.readyState,
    title: currentPage.document.title,
    bodyTextLength: currentPage.document.body?.innerText.length ?? 0,
    bodyHtml: currentPage.document.body?.innerHTML.slice(0, 2000) ?? "",
    resourceCount: currentPage.performance.getEntriesByType("resource").length,
    navigation: navigation
      ? {
          domContentLoaded: navigation.domContentLoadedEventEnd,
          loadEventEnd: navigation.loadEventEnd,
          responseEnd: navigation.responseEnd,
          transferSize: navigation.transferSize,
        }
      : undefined,
  };
};

Cypress.on("window:before:load", (win) => {
  currentPage = win;
  pageDiagnostics = [];

  // Preserve browser console output and retain warnings/errors for failure diagnostics.
  const originalConsoleLog = win.console.log;
  const originalConsoleWarn = win.console.warn;
  const originalConsoleError = win.console.error;

  win.console.log = (...args) => {
    originalConsoleLog(...args);
    Cypress.log({
      name: "console.log",
      message: args.map(stringify),
    });
  };

  win.console.warn = (...args) => {
    originalConsoleWarn(...args);
    recordDiagnostic("console.warn", args.map(stringify).join(" "));
  };

  win.console.error = (...args) => {
    originalConsoleError(...args);
    recordDiagnostic("console.error", args.map(stringify).join(" "));
  };

  win.addEventListener("error", (event) => {
    recordDiagnostic("window.error", event.message || "Unknown browser error");
  });

  win.addEventListener("unhandledrejection", (event) => {
    recordDiagnostic("unhandledrejection", stringify(event.reason));
  });
});

beforeEach(() => {
  cy.intercept({ url: "**", middleware: true }, (request) => {
    request.on("response", (response) => {
      if (response.statusCode >= 400) {
        recordDiagnostic(
          "http",
          `${response.statusCode} ${request.method} ${request.url}`,
        );
      }
    });

    request.continue();
  });
});

Cypress.on("uncaught:exception", (err, runnable) => {
  recordDiagnostic("uncaught:exception", err.message);
  console.error(`[uncaught:exception] ${err.message}`);

  // Only ignore known, non-breaking third-party errors.
  // Adjust the condition below to match specific benign errors in your app.
  if (err?.message?.includes("ResizeObserver")) {
    return false;
  }

  // Let all other errors fail the test so real regressions are not hidden.
  return true;
});

Cypress.on("fail", (error) => {
  console.error(
    "[Cypress failure diagnostics]",
    JSON.stringify({
      error: error.message,
      pageState: getPageState(),
      diagnostics: pageDiagnostics,
    }),
  );

  throw error;
});
