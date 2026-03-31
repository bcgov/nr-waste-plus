import { Then } from "@badeball/cypress-cucumber-preprocessor";
import { browserGuardAny } from "../hooks/browser.hooks";
import { 
  type DataTableLike,
  parseThresholdTable,
  runReportTo,
  normalizeMetricKey,
  parseTiming,
  expectLighthouse
} from "../helpers";

const defaultValues = {
  performance: 50, //Temporary value
  accessibility: 85,
  "best-practices": 90,
  seo: 80,
  pwa: 0,
  ttfb: 800, //Temporary value
  lcp: 18000, //Temporary value
  cls: 0.9 //Temporary value
}

Then(
  "the lighthouse {string} score should be above {int}",
  browserGuardAny(["chrome", "chromium"],
  (category: string, threshold: number) => runReportTo((report) => 
    expectLighthouse(report)
        .category(category)
        .toBeAtLeast(threshold)
  )
));

Then("the lighthouse score should be at least:",
  browserGuardAny(["chrome", "chromium"],
  (table: DataTableLike) => {
  const thresholds = parseThresholdTable(table);

    runReportTo((report) => {
      for (const [category, minValue] of Object.entries(thresholds)) {
        expectLighthouse(report)
          .category(category)
          .toBeAtLeast(minValue);
      }
    });
  })
);

Then(
  "the page should load quickly",
  browserGuardAny(["chrome", "chromium"], () => {
    runReportTo((report) => {
      expectLighthouse(report)
        .category("performance")
        .toBeAtLeast(defaultValues.performance);
      expectLighthouse(report)
        .metric("server-response-time")
        .toBeAtMost(defaultValues.ttfb);
      expectLighthouse(report)
        .metric("largest-contentful-paint")
        .toBeAtMost(defaultValues.lcp);
      expectLighthouse(report)
        .metric("cumulative-layout-shift")
        .toBeAtMost(defaultValues.cls);
    });
  })
);

Then("the page should be mobile friendly",
  browserGuardAny(["chrome", "chromium"],() => {
    runReportTo((report) => {
      expect(report.categories.accessibility).to.be.gte(defaultValues.accessibility);
      expect(report.categories.seo).to.be.gte(defaultValues.seo);
      expectLighthouse(report)
        .category("performance")
        .toBeAtLeast(defaultValues.performance);
      expectLighthouse(report)
        .metric("cumulative-layout-shift")
        .toBeAtMost(defaultValues.cls);
    });
}));

Then("the page should follow best practices",
  browserGuardAny(["chrome", "chromium"],() => {
  runReportTo((report) => {
      expectLighthouse(report)
        .category("best-practices")
        .toBeAtLeast(defaultValues["best-practices"]);
    });
}));

Then("the page should be accessible to most users",
  browserGuardAny(["chrome", "chromium"],() => {
  runReportTo((report) => {
      expectLighthouse(report)
        .category("accessibility")
        .toBeAtLeast(defaultValues.accessibility);
    });
}));

Then("the UX quality score should be acceptable",
  browserGuardAny(["chrome", "chromium"],() => {
    runReportTo((report) => {
      expectLighthouse(report)
        .category("accessibility")
        .toBeAtLeast(defaultValues.accessibility);
      expectLighthouse(report)
        .category("seo")
        .toBeAtLeast(defaultValues.seo);
      expectLighthouse(report)
        .category("performance")
        .toBeAtLeast(defaultValues.performance);
      expectLighthouse(report)
        .category("best-practices")
        .toBeAtLeast(defaultValues["best-practices"]);

      expectLighthouse(report)
        .metric("cumulative-layout-shift")
        .toBeAtMost(defaultValues.cls);
      expectLighthouse(report)
        .metric("largest-contentful-paint")
        .toBeAtMost(defaultValues.lcp);
      expectLighthouse(report)
        .metric("server-response-time")
        .toBeAtMost(defaultValues.ttfb);
    });
}));

Then("the lighthouse {string} score should be at least {int}",
  browserGuardAny(["chrome", "chromium"],(metric: string, minimum: number) => runReportTo((report) => {    
    expectLighthouse(report)
      .metric(normalizeMetricKey(metric))
      .toBeAtLeast(parseTiming(minimum));
  })
));

Then("the lighthouse {string} should be at most {int}",
  browserGuardAny(["chrome", "chromium"],(metric: string, maximum: number)  => runReportTo((report) => {    
    expectLighthouse(report)
      .metric(normalizeMetricKey(metric))
      .toBeAtMost(parseTiming(maximum));
  })
));

Then(
  "the lighthouse metric {string} should be at most {string}",
  browserGuardAny(["chrome", "chromium"], (metricAlias: string, rawMax: string) => {
    runReportTo((report) => {
      const metricId = normalizeMetricKey(metricAlias);
      const max = parseTiming(rawMax);
      
      expectLighthouse(report)
        .metric(metricId)
        .toBeAtMost(max);
    });
  })
);

Then(
  "the lighthouse metric {string} should be at least {string}",
  browserGuardAny(["chrome", "chromium"], (metricAlias: string, rawMin: string) => {
    runReportTo((report) => {
      const metricId = normalizeMetricKey(metricAlias);
      const min = parseTiming(rawMin);

      expectLighthouse(report)
        .metric(metricId)
        .toBeAtLeast(min);
    });
  })
);

Then(
  "the lighthouse metrics should be at most:",
  browserGuardAny(["chrome", "chromium"], (table: DataTableLike) => {
    const thresholds = parseThresholdTable(table);

    runReportTo((report) => {
      for (const [metricAlias, rawMax] of Object.entries(thresholds)) {
        const metricId = normalizeMetricKey(metricAlias);
        const max = parseTiming(rawMax);

        expectLighthouse(report)
        .metric(metricId)
        .toBeAtMost(max);
      }
    });
  })
);

Then(
  "the lighthouse metrics should be at least:",
  browserGuardAny(["chrome", "chromium"], (table: DataTableLike) => {
    const thresholds = parseThresholdTable(table);

    runReportTo((report) => {
      for (const [metricAlias, rawMin] of Object.entries(thresholds)) {
        const metricId = normalizeMetricKey(metricAlias);
        const min = parseTiming(rawMin);

        expectLighthouse(report)
        .metric(metricId)
        .toBeAtLeast(min);
      }
    });
  })
);
