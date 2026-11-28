# Test Summary

**Generated At:** 2026-11-26T12:00:00.000Z

| Metric | Value |
| --- | ---: |
| Total tests | 5 |
| Passed | 2 |
| Failed | 1 |
| Skipped | 1 |
| Flaky (passed after retry) | 1 |
| Duration | 1m 5s |

## Accessibility checks

- Checks executed: 1
- Total violations: 2

### Accessibility test errors

## Top accessibility violations

- **color-contrast** (serious) - 4 impacted node(s) across 1 check(s)
  - Elements must have sufficient color contrast
  - https://dequeuniversity.com/rules/axe/4.10/color-contrast
- **image-alt** (critical) - 2 impacted node(s) across 1 check(s)
  - Images must have alternate text
  - https://dequeuniversity.com/rules/axe/4.10/image-alt

## Lighthouse Quality Report

### Path https://example.gov.bc.ca/
- Profile: mobile (412x823, dpr 1.75)
- Form Factor: mobile
- Screen Emulation: mobile=true, width=412, height=823, dpr=1.75, disabled=false
- Effective Config: emulatedFormFactor=mobile; throttlingMethod=simulate; screenEmulation=mobile=true, 412x823, dpr=1.75

| Category | Metric | Value | Threshold | Result | Severity | Taxonomy |
| -------- | ------ | --------- | ------- | -------- | -------- | -------- |
| Performance | - | 0.92 | >= 0.9 | ✅ PASS | major | baseline |
| - | LCP | 2.10s | <= 2.50s | ✅ PASS | info | web-vitals |
| - | CLS | 200ms | <= 100ms | ❌ FAIL | major | web-vitals |

#### Failures in audits the home page

| Type | Name | Value | Threshold | Severity |
| ---- | ----- | ----- | --------- | -------- |
| metric | CLS | 200ms | <= 100ms | major |

---


## UI/UX Report Summary

Checks executed: 2 | Total violations: 1

### 📊 Summary Totals

| Category | Count |
| ---------- | ------- |
| ✔️ Checks Passed | 1 |
| ❌ Violations | 1 |
| 🔥 Major | 1 |
| ⚠️ Minor | 0 |
| ℹ️ Info | 0 |

#### 🎯 Scenario: **the theme can be toggled**

| Status | Severity | Taxonomy | Property | Expected | Actual | Element |
| ------ | ---------- | ---------- | ---------- | ---------- | -------- | --------- |
| ✔️ Passed | minor | color | background-color | rgb(255, 255, 255) | rgb(255, 255, 255) | body:body |
| ❌ Violation | major | spacing | margin | 1rem | 2rem | header:#root header |

---

## Other failed tests

- **search.feature > finds a record** (cypress/cypress/e2e/search.feature) - 3210ms
  - locator.resolve: expected visible