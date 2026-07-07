import { TEST_USERS } from '../utils/testData';
import { getAuthedClient, getAnonClient } from './client';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export type SignInResult = {
  jwt: string;
  refreshToken: string;
  userId: string;
  email: string;
};

export async function signInAs(role: 'buyer' | 'seller' | 'admin'): Promise<SignInResult> {
  const user = TEST_USERS[role];
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`signInAs(${role}) failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return {
    jwt: data.access_token,
    refreshToken: data.refresh_token,
    userId: data.user.id,
    email: data.user.email,
  };
}

export async function signUp(email: string, password: string, fullName?: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    }),
  });

  const data = await response.json();
  return { status: response.status, data, ok: response.ok };
}

export async function signOut(jwt: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  });
  return { status: response.status, ok: response.ok };
}

export function createBuyerClient() {
  return getAuthedClient;
}

export { getAuthedClient, getAnonClient };
