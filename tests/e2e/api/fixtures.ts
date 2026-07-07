import { test as base, expect } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { signInAs, getAuthedClient, SignInResult } from './auth';
import { getAnonClient } from './client';

type ApiFixtures = {
  buyerClient: SupabaseClient;
  sellerClient: SupabaseClient;
  adminClient: SupabaseClient;
  anonClient: SupabaseClient;
  buyerSession: SignInResult;
  sellerSession: SignInResult;
  adminSession: SignInResult;
};

export const test = base.extend<ApiFixtures>({
  buyerSession: async ({}, use) => {
    const session = await signInAs('buyer');
    await use(session);
  },
  sellerSession: async ({}, use) => {
    const session = await signInAs('seller');
    await use(session);
  },
  adminSession: async ({}, use) => {
    const session = await signInAs('admin');
    await use(session);
  },
  buyerClient: async ({ buyerSession }, use) => {
    await use(getAuthedClient(buyerSession.jwt));
  },
  sellerClient: async ({ sellerSession }, use) => {
    await use(getAuthedClient(sellerSession.jwt));
  },
  adminClient: async ({ adminSession }, use) => {
    await use(getAuthedClient(adminSession.jwt));
  },
  anonClient: async ({}, use) => {
    await use(getAnonClient());
  },
});

export { expect };
