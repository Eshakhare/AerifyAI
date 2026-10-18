/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Firebase Authentication Client Helper
 * Supports Email/Password and Google OAuth Popup sign-in with automatic
 * ID token retrieval and profile extraction (name, email, photoURL).
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

export interface FirebaseAuthResult {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
}

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || 'aerifyai-firebase'}.firebaseapp.com`,
  projectId: env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || 'aerifyai-firebase',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID || 'aerifyai-firebase'}.firebasestorage.app`,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.FIREBASE_MEASUREMENT_ID || ''
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.length > 10 &&
    !firebaseConfig.apiKey.includes('...')
  );
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseClientConfigured()) {
    return null;
  }
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
}

export async function signInWithFirebaseEmail(
  email: string,
  password: string
): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Web API key not configured.');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await cred.user.getIdToken();
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
      idToken
    };
  } catch (err: any) {
    if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/invalid-credential'
    ) {
      try {
        const created = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await created.user.getIdToken();
        return {
          uid: created.user.uid,
          email: created.user.email,
          displayName: created.user.displayName,
          photoURL: created.user.photoURL,
          idToken
        };
      } catch (createErr) {
        throw err;
      }
    }
    throw err;
  }
}

export async function signInWithFirebaseGoogle(): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not configured in client environment.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
    photoURL: cred.user.photoURL,
    idToken
  };
}

export async function signOutFirebaseClient(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth).catch(() => {});
  }
}

export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
