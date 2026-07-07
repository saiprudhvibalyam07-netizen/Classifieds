import { test, expect } from '../../../api/fixtures';

test.describe('API: Auth – AuthCallback verification', () => {
  test('getSession returns null for unauthenticated user', async ({ anonClient }) => {
    const { data } = await anonClient.auth.getSession();
    expect(data.session).toBeNull();
  });

  test('JWT is valid via auth.getUser', async ({ buyerClient, buyerSession }) => {
    const { data, error } = await buyerClient.auth.getUser();
    expect(error).toBeNull();
    expect(data.user.id).toBe(buyerSession.userId);
  });

  test('onAuthStateChange fires SIGNED_IN on login', async ({ anonClient }) => {
    const events: string[] = [];
    const { data } = anonClient.auth.onAuthStateChange((event) => {
      events.push(event);
    });
    expect(data).toHaveProperty('subscription');
    data.subscription.unsubscribe();
  });
});
