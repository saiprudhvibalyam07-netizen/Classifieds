# Automation Maintenance Guide — Valclassifieds

## 1. Adding a New Page Object

```bash
# Create file in tests/e2e/pages/<feature>/<PageName>.ts
```

1. Create class with `page: Page` constructor parameter
2. Define private locator methods (arrow functions returning locators)
3. Implement action methods (user-facing interactions)
4. Implement assertion methods (expect wrappers)
5. Export the class as default export

## 2. Adding a New Component Object

```bash
# Create file in tests/e2e/components/<ComponentName>.ts
```

Same pattern as Page Object but focused on a reusable UI snippet.
Register in `tests/e2e/fixtures/testContext.ts` if widely used.

## 3. Adding a New Spec

```bash
# Create file in tests/e2e/specs/<feature>/<name>.spec.ts
```

1. Import `test` from fixtures (`test` from `../fixtures/testContext`)
2. Import required Page/Component objects
3. Use `test.describe` for grouping
4. Write individual `test` blocks
5. Add Allure annotations for feature, severity, story, tags

## 4. Handling Application Changes

### When selectors change
1. Update the locator in the Page/Component Object
2. Run the affected spec locally to verify fix
3. Submit PR with "Maintenance" label

### When page layout changes
1. Identify affected Page Objects
2. Update locators and interaction methods
3. Verify all specs in the feature module pass
4. Update test data if required

### When API behavior changes
1. Update test data seed scripts in `tests/seed/`
2. Update mock handlers in `tests/e2e/utils/apiMocks.ts` (if using mocks)
3. Verify integration tests still pass

## 5. Test Data Management

### Seed Scripts
- Located in `tests/seed/`
- Run via `supabase db execute` against test database
- Must be idempotent (use `ON CONFLICT` / upsert)
- Clean up via `tests/seed/cleanup.sql` after test run

### Adding new test data
1. Add SQL insert to appropriate seed file
2. If referencing existing data, document foreign key dependencies
3. Run seed script against local database and verify
4. Update test fixtures if applicable

## 6. CI Maintenance

### Updating Playwright
```bash
npm install @playwright/test@latest
npx playwright install
# Update browser binaries in CI Docker image
```

### Updating GitHub Actions workflow
- Edit `.github/workflows/e2e.yml`
- Test changes on a branch before merging to main

## 7. Debugging Flaky Tests

### Common causes
- Timing issues (missing auto-wait)
- Shared state between tests
- Network latency (Supabase/3rd party APIs)
- Browser-specific behavior

### Debugging process
1. Re-run test 10 times locally: `npx playwright test --repeat-each=10`
2. Check trace viewer: `npx playwright show-trace`
3. Add logging but remove before commit
4. Consider using `test.fixme` for known issues
5. Report flaky test in #qa-flaky Slack channel

### Quarantine process
```typescript
// Tag flaky tests
test('should ...', async () => {
  test.info().annotations.push({
    type: 'issue',
    description: 'https://github.com/org/valclassifieds/issues/123',
  });
  // ... test body
});
```

## 8. Regular Maintenance Tasks

| Frequency | Task |
|-----------|------|
| Weekly | Review flaky test dashboard |
| Sprint | Update test data, review coverage gaps |
| Per release | Full regression run, update traceability matrix |
| Monthly | Review selector health (data-testid audit) |
| Quarterly | Performance review of test suite duration |

## 9. Onboarding New Team Members

1. Read this maintenance guide
2. Review Automation_Coding_Standards.md
3. Set up local environment (see README)
4. Run existing test suite: `npx playwright test`
5. Pair on fixing 1-2 failing tests
6. Write 1 new test independently
7. Submit PR for review

## 10. Deprecation & Cleanup

### Removing obsolete tests
1. Verify feature is truly removed (not just renamed)
2. Remove spec file
3. Clean up any seed data no longer needed
4. Update Traceability Matrix
5. Remove Page/Component objects if no longer referenced
6. Run full suite to confirm no orphaned references
