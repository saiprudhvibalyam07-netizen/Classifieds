# Automation Reporting Strategy — Valclassifieds

## 1. Reporting Tool: Allure
Allure provides rich, interactive test reports with trends, categories, and history.

## 2. Report Structure

### Dashboard Overview
- Total tests passed/failed/skipped/broken
- Test duration trend (last 10 runs)
- Failure rate trend
- Environment info (OS, browser, URL)

### Test Results by Feature
- Auth (login, register, OAuth, password reset)
- Listings (search, filter, CRUD)
- Chat (messages, conversations, presence)
- Profile (view, edit, avatar)
- Admin (user management, moderation)

### Test Categories (in Allure)
- `@critical` — Smoke tests, blocks deployment if failed
- `@high` — Core functionality, investigated within 4 hours
- `@medium` — Secondary flows, investigated within 24 hours
- `@low` — Edge cases, cosmetic issues

### Failure Analysis
- Test name and full steps
- Error message and stack trace
- Screenshot at failure moment
- Page source HTML at failure
- Video recording (if enabled)
- Browser console logs

## 3. Allure Annotations

```typescript
import { allure } from 'allure-playwright';

test('should create a listing', async () => {
  await allure.feature('Listings');
  await allure.story('Create Listing');
  await allure.severity('critical');
  await allure.tag('smoke');
  await allure.link('https://valclassifieds.app/requirements#REQ-LIST-01', 'REQ-LIST-01');

  await allure.step('Navigate to create listing page', async () => { ... });
  await allure.step('Fill in listing form', async () => { ... });
  await allure.step('Upload image', async () => { ... });
  await allure.step('Submit listing', async () => { ... });
  await allure.step('Verify listing appears on listings page', async () => { ... });
});
```

## 4. CI Report Workflow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  GitHub Actions   │────▶│  Allure Results   │────▶│  Allure Report   │
│  Run Tests         │     │  (allure-results) │     │  (allure-report) │
└──────────────────┘     └──────────────────┘     └──────┬───────────┘
                                                          │
                                              ┌───────────▼───────────┐
                                              │  GitHub Pages / S3    │
                                              │  (Hosted Report)      │
                                              └───────────────────────┘
```

## 5. Report Distribution
- **PR Comments**: Allure report URL posted as PR comment with summary
- **Slack Notifications**: Test summary with pass/fail count and link to report
- **Email**: Weekly regression report sent to QA distribution list
- **Dashboard**: Historical trends visible on Allure Server

## 6. Retention Policy
- **CI runs**: Keep last 30 days of allure-results
- **Release runs**: Keep permanently (tagged with version)
- **Screenshots**: Deleted after 90 days
- **Videos**: Deleted after 30 days

## 7. Failures Triage Process
1. **Test failure detected in CI**
2. Alert sent to Slack #qa-alerts channel
3. Developer assigned within 4 hours (critical) / 24 hours (non-critical)
4. Root cause identified: application bug vs. test flakiness
5. If application bug: create JIRA ticket, link to Allure report
6. If flaky test: quarantine in `@flaky` tag, fix within 1 sprint
7. Updated test result reflected in next CI run

## 8. Metrics Dashboard (Allure Trends)
- Pass rate over time
- Average test duration
- Top 10 flakiest tests
- Feature-wise pass percentage
- Regression detection time (PR merge → test failure)
