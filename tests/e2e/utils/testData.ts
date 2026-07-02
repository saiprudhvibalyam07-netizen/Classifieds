export const TEST_USERS = {
  buyer: {
    email: process.env.TEST_BUYER_EMAIL || 'buyer@test.com',
    password: process.env.TEST_BUYER_PASSWORD || 'TestPass123!',
    name: 'Test Buyer',
  },
  seller: {
    email: process.env.TEST_SELLER_EMAIL || 'seller@test.com',
    password: process.env.TEST_SELLER_PASSWORD || 'TestPass123!',
    name: 'Test Seller',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'AdminPass123!',
    name: 'Test Admin',
  },
} as const;

export const TEST_LISTING = {
  title: 'Test Listing - Vintage Camera',
  description: 'A vintage film camera in excellent condition. Fully functional.',
  price: '150',
  category: 'Items for Sale',
  city: 'Austin',
  state: 'TX',
} as const;

export const SEARCH_QUERIES = {
  keyword: 'camera',
  category: 'Vehicles',
  city: 'Austin',
  priceMin: '100',
  priceMax: '500',
} as const;
