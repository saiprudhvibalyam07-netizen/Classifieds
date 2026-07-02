import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/auth/LoginPage';
import { ListingsPage } from '../pages/listings/ListingsPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { Navbar } from '../components/Navbar';
import { ListingCard } from '../components/ListingCard';

type MyFixtures = {
  loginPage: LoginPage;
  listingsPage: ListingsPage;
  chatPage: ChatPage;
  navbar: Navbar;
  listingCard: ListingCard;
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
  navbar: async ({ page }, use) => {
    await use(new Navbar(page));
  },
  listingCard: async ({ page }, use) => {
    await use(new ListingCard(page));
  },
});

export { expect } from '@playwright/test';
