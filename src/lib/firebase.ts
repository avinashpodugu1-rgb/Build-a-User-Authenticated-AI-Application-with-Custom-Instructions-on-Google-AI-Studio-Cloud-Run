import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without providing firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Environment helpers for iframe detection and domain diagnostics
export const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
export const currentHostDomain = typeof window !== 'undefined' ? window.location.hostname : '';
export const firebaseAuthDomain = firebaseConfig.authDomain || '';

// Custom connection test helper
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { success: true, message: 'Connected to Firestore' };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.warn('Firestore is currently offline or uncontactable:', msg);
      return { success: false, message: 'Firestore is offline. Check internet connection.' };
    }
    // Non-fatal or document not found
    return { success: true, message: 'Firestore reachable' };
  }
}

// Initial connection boot test
testFirestoreConnection().catch((err) => {
  console.warn('Initial Firestore connection test notice:', err);
});
