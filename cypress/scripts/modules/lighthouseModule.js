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
    lighthouseOptions,
    lighthouseConfigSettings,
    categories,
    metrics,
    failuresByScenario,
  } = report;

  const md = [];
  
  md.push(`### Path ${url}`);
  md.push(`- Profile: ${formatLighthouseProfile(lighthouseOptions)}`);
  md.push(`- Form Factor: ${lighthouseOptions?.formFactor || "unknown"}`);
  md.push(`- Screen Emulation: ${formatScreenEmulation(lighthouseOptions?.screenEmulation)}`);
  md.push(`- Effective Config: ${formatConfigSettingsSummary(lighthouseConfigSettings)}`);
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
    const optionsKey = serializeLighthouseOptions(e.lighthouseOptions);
    const configSettingsKey = serializeConfigSettings(e.lighthouseConfigSettings);
    const key = [
      e.type,
      e.id,
      e.url,
      e.scenario,
      e.threshold ?? "none",
      e.comparison ?? "none",
      optionsKey,
      configSettingsKey,
    ].join("|");

    if(!seen.has(key)) {      
      seen.set(key, e);
    }
  }  

  const grouped = groupEventsByUrl(Array.from(seen.values()));

  const reports = {};

  for (const [, urlEvents] of Object.entries(grouped)) {
    const categories = urlEvents.filter(e => e.type === "category");
    const metrics = urlEvents.filter(e => e.type === "metric");
    const lighthouseOptions = pickLighthouseOptions(urlEvents);
    const lighthouseConfigSettings = pickLighthouseConfigSettings(urlEvents);
    const normalizedUrl = normalizeUrl(urlEvents[0]?.url);
    const reportKey = `${normalizedUrl}::${serializeLighthouseOptions(lighthouseOptions)}::${serializeConfigSettings(lighthouseConfigSettings)}`;

    reports[reportKey] = {
      url: normalizedUrl,
      lighthouseOptions,
      lighthouseConfigSettings,
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
    const optionsKey = serializeLighthouseOptions(e.lighthouseOptions);
    const configSettingsKey = serializeConfigSettings(e.lighthouseConfigSettings);
    const groupKey = `${normalized}::${optionsKey}::${configSettingsKey}`;

    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(e);
  }

  return grouped;
};

const pickLighthouseOptions = (events) => {
  for (const event of events) {
    if (event?.lighthouseOptions) {
      return event.lighthouseOptions;
    }
  }

  return null;
};

const serializeLighthouseOptions = (options) => {
  if (!options) return "unknown";

  const formFactor = options.formFactor || "unknown";
  const screen = options.screenEmulation;

  if (!screen) {
    return `${formFactor}|no-screen-emulation`;
  }

  return [
    formFactor,
    `mobile:${String(screen.mobile)}`,
    `width:${screen.width ?? "na"}`,
    `height:${screen.height ?? "na"}`,
    `dpr:${screen.deviceScaleFactor ?? "na"}`,
    `disabled:${String(screen.disabled)}`,
  ].join("|");
};

const pickLighthouseConfigSettings = (events) => {
  for (const event of events) {
    if (event?.lighthouseConfigSettings) {
      return event.lighthouseConfigSettings;
    }
  }

  return null;
};

const serializeConfigSettings = (settings) => {
  if (!settings || typeof settings !== "object") return "unknown";

  return JSON.stringify({
    emulatedFormFactor: settings.emulatedFormFactor ?? "unknown",
    throttlingMethod: settings.throttlingMethod ?? "unknown",
    screenEmulation: settings.screenEmulation ?? null,
  });
};

const formatConfigSettingsSummary = (settings) => {
  if (!settings || typeof settings !== "object") return "unknown";

  const emulatedFormFactor = settings.emulatedFormFactor ?? "unknown";
  const throttlingMethod = settings.throttlingMethod ?? "unknown";
  const screen = settings.screenEmulation;
  const screenSummary = screen
    ? `mobile=${String(screen.mobile)}, ${screen.width ?? "?"}x${screen.height ?? "?"}, dpr=${screen.deviceScaleFactor ?? "?"}`
    : "not provided";

  return `emulatedFormFactor=${emulatedFormFactor}; throttlingMethod=${throttlingMethod}; screenEmulation=${screenSummary}`;
};

const formatLighthouseProfile = (options) => {
  if (!options) return "unknown";

  const formFactor = options.formFactor || "unknown";
  const screen = options.screenEmulation;

  if (!screen) return `${formFactor} (screen emulation: not provided)`;

  return `${formFactor} (${screen.width ?? "?"}x${screen.height ?? "?"}, dpr ${screen.deviceScaleFactor ?? "?"})`;
};

const formatScreenEmulation = (screen) => {
  if (!screen) return "not provided";

  return [
    `mobile=${String(screen.mobile)}`,
    `width=${screen.width ?? "?"}`,
    `height=${screen.height ?? "?"}`,
    `dpr=${screen.deviceScaleFactor ?? "?"}`,
    `disabled=${String(screen.disabled)}`,
  ].join(", ");
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