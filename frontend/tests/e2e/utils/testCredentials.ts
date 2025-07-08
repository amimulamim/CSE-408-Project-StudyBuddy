/**
 * Test credentials utility for e2e tests
 * Uses the actual test users from backend/.env.test
 */

export interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'moderator' | 'user';
}

// Admin/Moderator user from your .env.test
export const ADMIN_USER: TestUser = {
  email: process.env.FIREBASE_TEST_EMAIL || 'wifade8269@finfave.com',
  password: process.env.FIREBASE_TEST_PASSWORD || 'Ab_12345678',
  role: 'admin'
};

// Regular user from your .env.test  
export const REGULAR_USER: TestUser = {
  email: process.env.FIREBASE_USUAL_EMAIL || 'sewif98534@fenexy.com',
  password: process.env.FIREBASE_USUAL_PASSWORD || 'Ab_12345678',
  role: 'user'
};

export const TEST_USERS = {
  admin: ADMIN_USER,
  user: REGULAR_USER
} as const;

export type UserType = keyof typeof TEST_USERS;
