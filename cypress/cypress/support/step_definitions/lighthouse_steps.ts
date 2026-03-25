import { Then, AfterAll } from "@badeball/cypress-cucumber-preprocessor";
import { browserGuardAny } from "./browserHooks";
import { 
  type DataTableLike,
  parseThresholdTable,
  runReportTo
} from "../helpers";

const defaultValues = {
  performance: 50,
  accessibility: 85,
  "best-practices": 90,
  seo: 80,
  pwa: 0,
}

Then(
  "the lighthouse {string} score should be above {int}",
  browserGuardAny(["chrome", "chromium"],
  (category: string, threshold: number) => runReportTo((report) => {    
    expect(report.categories[category]).to.be.greaterThan(threshold);
  })
));

Then("the Lighthouse score should be at least:",
  browserGuardAny(["chrome", "chromium"],
  (table: DataTableLike) => {
  const thresholds = parseThresholdTable(table);

    runReportTo((report) => {
      for (const [category, minValue] of Object.entries(thresholds)) {
        const score = report.categories[category];
        expect(score, `Lighthouse ${category} score`).to.be.greaterThan(minValue);
      }
    });
  })
);

Then(
  "the page should load quickly",
  browserGuardAny(["chrome", "chromium"], () => {
    runReportTo((report) => {
      expect(report.categories.performance).to.be.gte(defaultValues.performance);
      expect(report.metrics["server-response-time"]).to.be.lte(800);
      expect(report.metrics["largest-contentful-paint"]).to.be.lte(2500);
      expect(report.metrics["cumulative-layout-shift"]).to.be.lte(0.1);
    });
  })
);

Then("the page should be mobile friendly",
  browserGuardAny(["chrome", "chromium"],() => {
    runReportTo((report) => {
      expect(report.categories.accessibility).to.be.gte(defaultValues.accessibility);
      expect(report.categories.seo).to.be.gte(defaultValues.seo);
      expect(report.categories.performance).to.be.gte(defaultValues.performance);
      expect(report.metrics["cumulative-layout-shift"]).to.be.lte(0.1);
    });
}));

Then("the page should follow best practices",
  browserGuardAny(["chrome", "chromium"],() => {
  runReportTo((report) => {
      expect(report.categories["best-practices"]).to.be.gte(defaultValues["best-practices"]);
    });
}));

Then("the page should be accessible to most users",
  browserGuardAny(["chrome", "chromium"],() => {
  runReportTo((report) => {
      expect(report.categories.accessibility).to.be.gte(defaultValues.accessibility);
    });
}));

Then("the UX quality score should be acceptable",
  browserGuardAny(["chrome", "chromium"],() => {
    runReportTo((report) => {
      expect(report.categories.accessibility).to.be.gte(defaultValues.accessibility);
      expect(report.categories.seo).to.be.gte(defaultValues.seo);
      expect(report.categories.performance).to.be.gte(defaultValues.performance);
      expect(report.categories["best-practices"]).to.be.gte(defaultValues["best-practices"]);

      expect(report.metrics["cumulative-layout-shift"]).to.be.lte(0.1);
      expect(report.metrics["largest-contentful-paint"]).to.be.lte(2500);
      expect(report.metrics["server-response-time"]).to.be.lte(800);
    });
}));

Then("the lighthouse {string} score should be at least {int}",
  browserGuardAny(["chrome", "chromium"],(metric: string, minimum: number) => runReportTo((report) => {    
    expect(report.categories[metric]).to.be.gte(minimum);
  })
));

Then("the lighthouse {string} should be at most {int}",
  browserGuardAny(["chrome", "chromium"],(metric: string, maximum: number)  => runReportTo((report) => {    
    expect(report.categories[metric]).to.be.lte(maximum);
  })
));


AfterAll(() => {
  cy.task("lighthouse:reset");
});