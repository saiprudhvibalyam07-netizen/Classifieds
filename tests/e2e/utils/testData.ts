export const TEST_USERS = {
  buyer: {
    email: process.env.TEST_BUYER_EMAIL || 'rajesh.kumar@valclassifieds.test',
    password: process.env.TEST_BUYER_PASSWORD || 'Rajesh#99Kumar',
    name: 'Rajesh Kumar',
  },
  seller: {
    email: process.env.TEST_SELLER_EMAIL || 'priya.sharma@valclassifieds.test',
    password: process.env.TEST_SELLER_PASSWORD || 'Pass123!',
    name: 'Priya Sharma',
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'arun.pillai@valclassifieds.test',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin@2024Secure!',
    name: 'Dr. Arun Pillai',
  },
} as const;

export const TEST_LISTING = {
  title: 'Vintage Royal Enfield Bullet 350 1998',
  description: 'A classic Royal Enfield motorcycle in excellent condition. Fully restored.',
  price: '185000',
  category: 'Vehicles',
  city: 'Pune',
  state: 'MH',
} as const;

export const SEARCH_QUERIES = {
  keyword: 'Camera',
  category: 'Vehicles',
  city: 'Mumbai',
  priceMin: '100',
  priceMax: '5000',
} as const;
