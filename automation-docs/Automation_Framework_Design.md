# Automation Framework Design — Valclassifieds

## 1. Design Principles
- **Readability over cleverness**: Tests should read like natural language
- **Isolation**: Each test is independent; no shared mutable state
- **Resilience**: Prefer data-testid over fragile CSS/XPath selectors
- **Speed**: Parallel execution, minimal waits, efficient selectors
- **Maintainability**: DRY through Page Objects, not through test inheritance

## 2. Page Object Design Pattern

```typescript
// Example: tests/e2e/pages/listings/ListingsPage.ts
import { Page, expect } from '@playwright/test';

export class ListingsPage {
  constructor(private page: Page) {}

  // Locators (data-testid preferred)
  private searchInput = () => this.page.locator('[data-testid="search-input"]');
  private categorySelect = () => this.page.locator('[data-testid="category-select"]');
  private listingCards = () => this.page.locator('[data-testid="listing-card"]');

  // Actions
  async search(query: string) {
    await this.searchInput().fill(query);
    await this.searchInput().press('Enter');
  }

  async filterByCategory(category: string) {
    await this.categorySelect().selectOption(category);
  }

  async getListingCount(): Promise<number> {
    return this.listingCards().count();
  }

  // Assertions
  async expectListingsVisible() {
    await expect(this.listingCards().first()).toBeVisible();
  }
}
```

## 3. Component Object Design

```typescript
// Example: tests/e2e/components/Navbar.ts
import { Page, expect } from '@playwright/test';

export class Navbar {
  constructor(private page: Page) {}

  private logo = () => this.page.locator('[data-testid="navbar-logo"]');
  private loginLink = () => this.page.locator('[data-testid="navbar-login"]');
  private userMenu = () => this.page.locator('[data-testid="user-menu"]');

  async clickLogin() {
    await this.loginLink().click();
  }

  async expectLoggedIn(username: string) {
    await expect(this.userMenu()).toContainText(username);
  }
}
```

## 4. Test Structure Convention

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/auth/LoginPage';
import { ListingsPage } from './pages/listings/ListingsPage';

test.describe('Listing Search', () => {
  test('should filter listings by city', async ({ page }) => {
    // Arrange
    const loginPage = new LoginPage(page);
    const listingsPage = new ListingsPage(page);
    await loginPage.loginAsBuyer();

    // Act
    await listingsPage.filterByCity('Austin');

    // Assert
    const count = await listingsPage.getListingCount();
    expect(count).toBeGreaterThan(0);
    for (const card of await listingsPage.listingCards().all()) {
      await expect(card).toContainText('Austin');
    }
  });
});
```

## 5. Data Attributes Convention

All interactive elements must include `data-testid`:
- `data-testid="<feature>-<component>-<element>"`
- Examples: `data-testid="listing-card-title"`, `data-testid="chat-send-button"`
- Kebab-case, consistent with the codebase convention

## 6. Fixture Design

```typescript
// tests/e2e/fixtures/testContext.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/auth/LoginPage';
import { ListingsPage } from './pages/listings/ListingsPage';
import { ChatPage } from './pages/chat/ChatPage';

type MyFixtures = {
  loginPage: LoginPage;
  listingsPage: ListingsPage;
  chatPage: ChatPage;
  authenticatedPage: Page;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  listingsPage: async ({ page }, use) => {
    await use(new ListingsPage(page));
  },
  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'auth.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
```

## 7. Error Handling
- Allure attachments on failure: screenshot, page source, video
- Soft assertions for non-critical validations
- Retry mechanism for flaky network-dependent tests (max 2 retries)
- Timeout exceptions include locator trace for debugging

## 8. Mocking Strategy
- **API mocking**: Use Playwright `page.route()` for external API calls during local runs
- **Authentication**: Use `storageState` for authenticated sessions (not real logins every test)
- **Database**: Direct SQL seed via Supabase client for deterministic test data
