// lib/authState.ts
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

let authPromise: Promise<User | null> | null = null;

export async function getCurrentUser(): Promise<User | null> {
  // Return cached promise if it exists
  if (authPromise) {
    return authPromise;
  }

  // Create new promise
  authPromise = new Promise((resolve) => {
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
      try {
        const auth = getAuth();
        
        // If user is already available, return immediately
        if (auth.currentUser) {
          resolve(auth.currentUser);
          return;
        }
        
        // Otherwise wait for auth state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      } catch (error) {
        console.error('Firebase auth error:', error);
        resolve(null);
      }
    }, 100);
  });

  return authPromise;
}