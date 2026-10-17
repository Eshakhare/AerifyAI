/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Aerify AI - Firebase Authentication Client Helper
 * Supports Email/Password and Google OAuth Popup sign-in with automatic
 * ID token retrieval for backend Cloud SQL `app_users` role resolution.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  Auth
} from 'firebase/auth';

export interface FirebaseAuthResult {
  uid: string;
  email: string | null;
  displayName: string | null;
  idToken: string;
}

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID || 'aerifyai'}.firebaseapp.com`,
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'aerifyai'
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('AIzaSy...'));
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
    throw new Error('Firebase Web API key not configured; using Cloud SQL direct identity session.');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await cred.user.getIdToken();
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      idToken
    };
  } catch (err: any) {
    if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/invalid-credential'
    ) {
      const created = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await created.user.getIdToken();
      return {
        uid: created.user.uid,
        email: created.user.email,
        displayName: created.user.displayName,
        idToken
      };
    }
    throw err;
  }
}

export async function signInWithFirebaseGoogle(): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error('Firebase Web API key not configured; using Cloud SQL direct identity session.');
  }

  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return {
    uid: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName,
    idToken
  };
}

export async function signOutFirebaseClient(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) {
    await signOut(auth).catch(() => {});
  }
}
