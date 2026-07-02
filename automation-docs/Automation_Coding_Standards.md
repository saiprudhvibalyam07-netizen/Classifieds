# Automation Coding Standards — Valclassifieds

## 1. Language & Tooling
- **Language**: TypeScript (strict mode)
- **Test framework**: Playwright Test
- **Assertions**: Playwright `expect` (no third-party assertion libs)
- **Reporting**: Allure Playwright
- **Linting**: ESLint with Playwright plugin

## 2. File & Folder Naming

```
tests/e2e/
├── pages/
│   ├── auth/
│   │   └── LoginPage.ts        # PascalCase file for class
│   ├── listings/
│   │   └── ListingsPage.ts
│   └── chat/
│       └── ChatPage.ts
├── components/
│   └── Navbar.ts
├── fixtures/
│   └── testContext.ts
├── utils/
│   ├── testData.ts
│   └── selectors.ts
├── specs/
│   ├── auth/
│   │   └── login.spec.ts       # kebab-case for spec files
│   ├── listings/
│   │   └── search.spec.ts
│   └── chat/
│       └── messaging.spec.ts
├── global-setup.ts
├── global-teardown.ts
└── playwright.config.ts
```

## 3. Naming Conventions

### Tests
```typescript
// Descriptive, Given-When-Then style
test('should login successfully with valid credentials', ...);
test('should show validation error for empty email field', ...);

// Use test.describe for grouping
test.describe('Listing Search', () => { ... });
test.describe('when user is not authenticated', () => { ... });
```

### Page Object Methods
```typescript
// Action methods: verb + noun
async login(email: string, password: string): Promise<void>;
async searchListings(query: string): Promise<void>;
async clickListingCard(index: number): Promise<void>;

// Query methods: get + noun
async getListingCount(): Promise<number>;
async getErrorMessage(): Promise<string>;

// Assertion methods: expect + state
async expectListingsVisible(): Promise<void>;
async expectErrorMessage(message: string): Promise<void>;
```

## 4. Selectors
- **Preferred**: `data-testid` attributes
- **Fallback**: `role` selectors, `label` text
- **Avoid**: CSS class names, XPath, index-based selectors
- **Format**: `data-testid="<feature>-<component>-<element>"`

```typescript
// Good
this.page.locator('[data-testid="listing-card-title"]');
this.page.getByRole('button', { name: 'Submit' });

// Avoid
this.page.locator('.card-title');
this.page.locator('div > div:nth-child(3) > button');
```

## 5. Locator Best Practices
- Chain locators for precision: `page.locator('[data-testid="listing-card"]').locator('[data-testid="title"]')`
- Use `.first()`, `.last()`, `.nth()` sparingly; prefer unique data-testid
- Prefer `getByRole`, `getByLabel`, `getByText` for user-facing elements
- Use `locator.or()` for handling multiple states

## 6. Assertion Style
```typescript
// Direct assertions on locators
await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
await expect(page.locator('[data-testid="error-message"]')).toHaveText('Email is required');

// Soft assertions for non-critical checks
await expect.soft(page.locator('[data-testid="listing-count"]')).toHaveText('10');
```

## 7. Waits & Timing
- Avoid `page.waitForTimeout()` — use locator assertions instead (auto-waiting)
- Use `waitForResponse` for navigation-dependent waits
- Set timeouts per test (30s) and per assertion (10s) in config
- Use `toPass` for polling assertions (e.g., database state)

## 8. Data Management
- Never hardcode test data in spec files
- Use fixture factories in `utils/testData.ts`
- Clean up created data in `afterEach` or `global-teardown`
- Use `storageState` for auth session reuse

## 9. Code Review Checklist
- [ ] No hardcoded waits (`waitForTimeout`)
- [ ] All selectors use `data-testid` or semantic locators
- [ ] Tests are independent (no shared state)
- [ ] Page/Component objects encapsulate selectors
- [ ] No test logic in Page Objects (pure interaction)
- [ ] Sensitive data (passwords) sourced from env vars
- [ ] Allure annotations present for major test groups
- [ ] Proper cleanup in `afterEach` or fixture teardown
