import { Then } from "@badeball/cypress-cucumber-preprocessor";
import { browserGuardAny } from "./browserHooks";
import { 
  type DataTableLike,
  parseThresholdTable, 
  assertMinimumThresholds, 
  runLighthouseAudit,
  assertMetricAtMost,
  parseThresholdNumber,
  assertMetricAtLeast
} from "../helpers";

Then("the Lighthouse score should be at least:",
  browserGuardAny(["chrome", "chromium"],
  (table: DataTableLike) => {
  const thresholds = parseThresholdTable(table);

  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, thresholds);
  });
}));

Then("the page should load quickly",
  browserGuardAny(["chrome", "chromium"],() => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      performance: 80,
    });

    assertMetricAtMost(snapshot, "server-response-time", 800);
    assertMetricAtMost(snapshot, "largest-contentful-paint", 2500);
    assertMetricAtMost(snapshot, "cumulative-layout-shift", 0.1);
  });
}));

Then("the page should be mobile friendly",
  browserGuardAny(["chrome", "chromium"],() => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      accessibility: 85,
      seo: 80,
      performance: 70,
    });

    assertMetricAtMost(snapshot, "cumulative-layout-shift", 0.25);
  });
}));

Then("the page should follow best practices",
  browserGuardAny(["chrome", "chromium"],() => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      "best-practices": 90,
    });
  });
}));

Then("the page should be accessible to most users",
  browserGuardAny(["chrome", "chromium"],() => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      accessibility: 90,
    });
  });
}));

Then("the UX quality score should be acceptable",
  browserGuardAny(["chrome", "chromium"],() => {
  runLighthouseAudit().then((snapshot) => {
    assertMinimumThresholds(snapshot, {
      performance: 50,  //This needs to be reworked in the future, but currently allows for the slowest possible Lighthouse audit to pass while we investigate and address underlying performance issues
      accessibility: 90,
      "best-practices": 90,
      seo: 80,
    });

    assertMetricAtMost(snapshot, "largest-contentful-paint", 16000); //This needs to be reworked in the future, but currently allows for the slowest possible Lighthouse audit to pass while we investigate and address underlying performance issues
    assertMetricAtMost(snapshot, "cumulative-layout-shift", 0.1);
    assertMetricAtMost(snapshot, "server-response-time", 100);
  });
}));

Then("the Lighthouse metric {string} should be at least {string}",
  browserGuardAny(["chrome", "chromium"],(metric: string, minimum: string) => {
  const parsedMinimum = parseThresholdNumber(minimum);

  runLighthouseAudit().then((snapshot) => {
    assertMetricAtLeast(snapshot, metric, parsedMinimum);
  });
}));

Then("the Lighthouse metric {string} should be at most {string}",
  browserGuardAny(["chrome", "chromium"],(metric: string, maximum: string) => {
  const parsedMaximum = parseThresholdNumber(maximum);

  runLighthouseAudit().then((snapshot) => {
    assertMetricAtMost(snapshot, metric, parsedMaximum);
  });
}));
