function lighthouseToMarkdown(data) {  
  const reportsByUrl = buildLighthouseReportByUrl(data.checks);

  let md = `## Lighthouse Quality Report

`;

  for (const [url, report] of Object.entries(reportsByUrl)) {
    md += generateLighthouseMarkdownForUrl(report);
    md += "\n---\n\n";
  }


  return md.slice(0, -1);
};

const generateLighthouseMarkdownForUrl = (report) => {
  const {
    url,
    categories,
    metrics,
    failuresByScenario,
  } = report;

  const md = [];
  
  md.push(`### Path ${url}`);
  md.push("");
  md.push(`| Category | Metric | Value | Threshold | Result | Severity | Taxonomy |`);
  md.push(`| -------- | ------ | --------- | ------- | -------- | -------- | -------- |`);

  for (const c of categories) {
    md.push(
      `| ${c.category} | - | ${c.value} | ${c.comparison} ${c.threshold} | ${c.passed ? "✅ PASS" : "❌ FAIL"} | ${c.severity} | baseline |`
    );
  }

  for (const m of metrics) {
    md.push(
      `| - | ${m.metric} | ${formatTiming(m.value)} | ${m.comparison} ${formatTiming(m.threshold)} | ${m.passed ? "✅ PASS" : "❌ FAIL"} | ${m.severity} | ${m.taxonomy} |`
    );
  }

  md.push("");

  // Failures by scenario
  
  const scenarioNames = Object.keys(failuresByScenario);

  if (scenarioNames.length > 0) {
    for (const scenario of scenarioNames) {
      md.push(`#### Failures in ${scenario}`);
      md.push("");
      md.push(`| Type | Name | Value | Threshold | Severity |`);
      md.push(`| ---- | ----- | ----- | --------- | -------- |`);

      for (const f of failuresByScenario[scenario]) {
        md.push(
          `| ${f.type} | ${f.name} | ${formatTiming(f.value)} | ${f.comparison} ${formatTiming(f.threshold)} | ${f.severity} |`
        );
      }

      md.push("");
    }
  }

  return md.join("\n");
};

const buildCategoryTable = (categories) => {
  return categories.map(c => ({
    category: c.name,
    value: c.value,
    threshold: c.threshold,
    comparison: c.comparison,
    passed: c.passed,
    severity: c.severity,
    taxonomy: c.taxonomy,
    scenario: c.scenario,
    url: c.url,
  }));
};

const buildMetricTable = (metrics) => {
  return metrics.map(m => ({
    metric: m.name,
    id: m.id,
    value: m.value,
    threshold: m.threshold,
    comparison: m.comparison,
    passed: m.passed,
    severity: m.severity,
    taxonomy: m.taxonomy,
    scenario: m.scenario,
    url: m.url,
  }));
};

const buildScenarioFailures = (events) => {
  const failures = events.filter(e => !e.passed);

  const grouped = {};

  for (const f of failures) {
    if (!grouped[f.scenario]) grouped[f.scenario] = [];    
    grouped[f.scenario].push({
      type: f.type,
      id: f.id,
      name: f.name,
      value: f.value,
      threshold: f.threshold,
      comparison: f.comparison,
      severity: f.severity,
      taxonomy: f.taxonomy,
      url: f.url,
    });
  }

  return grouped;
};

const buildSeveritySummary = (events) => {
  const summary = {
    info: 0,
    minor: 0,
    major: 0,
    critical: 0,
  };

  for (const e of events) {
    summary[e.severity] = (summary[e.severity] || 0) + 1;
  }

  return summary;
};

const buildTaxonomySummary = (events) => {
  const grouped = {};

  for (const e of events) {
    if (!grouped[e.taxonomy]) grouped[e.taxonomy] = [];
    grouped[e.taxonomy].push(e);
  }

  return grouped;
};

const buildLighthouseReportByUrl = (checks) => {
  const events = checks.flat();
  const seen = new Map();

  for(const e of events) {
    const key = [
      e.type,
      e.id,
      e.url,
      e.scenario,
      e.threshold ?? "none",
      e.comparison ?? "none",
    ].join("|");

    if(!seen.has(key)) {      
      seen.set(key, e);
    }
  }  

  const grouped = groupEventsByUrl(Array.from(seen.values()));

  const reports = {};

  for (const [url, urlEvents] of Object.entries(grouped)) {
    const categories = urlEvents.filter(e => e.type === "category");
    const metrics = urlEvents.filter(e => e.type === "metric");

    reports[url] = {
      url,      
      categories: buildCategoryTable(categories),
      metrics: buildMetricTable(metrics),
      failuresByScenario: buildScenarioFailures(urlEvents),
      severitySummary: buildSeveritySummary(urlEvents),
      taxonomySummary: buildTaxonomySummary(urlEvents),
      rawEvents: urlEvents,
    };
  }

  return reports;
};

const groupEventsByUrl = (events) => {
  const grouped = {};

  for (const e of events) {
    const normalized = normalizeUrl(e.url);

    if (!grouped[normalized]) grouped[normalized] = [];
    grouped[normalized].push(e);
  }

  return grouped;
};

const formatTiming = (value) => {
  if (value == null) return "N/A";

  if (value < 1) return `${Math.round(value * 1000)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
};

const normalizeUrl = (url) => {
  try {
    const u = new URL(url);

    // Remove hash (#/something)
    u.hash = "";

    // Remove query params (?foo=bar)
    u.search = "";

    // Normalize trailing slash
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }

    return u.toString();
  } catch {
    return url; // fallback
  }
};


module.exports = {
  lighthouseToMarkdown
};