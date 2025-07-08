import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend .env.test
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env.test') });

export const TEST_CONFIG = {
  // Admin user (moderator and admin privileges)
  ADMIN_USER: {
    email: process.env.FIREBASE_TEST_EMAIL || 'wifade8269@finfave.com',
    password: process.env.FIREBASE_TEST_PASSWORD || 'Ab_12345678'
  },
  
  // Regular user (no special privileges)
  REGULAR_USER: {
    email: process.env.FIREBASE_USUAL_EMAIL || 'sewif98534@fenexy.com', 
    password: process.env.FIREBASE_USUAL_PASSWORD || 'Ab_12345678'
  },
  
  // URLs for local development
  FRONTEND_URL: 'http://localhost:3000',
  BACKEND_URL: 'http://localhost:8000',
  
  // Firebase config
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'AIzaSyAGnyZMkRiND0anY2ogT40DM1dL7vAOXvA'
};

export default TEST_CONFIG;
