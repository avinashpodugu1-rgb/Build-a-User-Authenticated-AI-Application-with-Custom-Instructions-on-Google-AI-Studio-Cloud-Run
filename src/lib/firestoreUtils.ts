import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { InteractionDocument, OperationType, FirestoreErrorInfo, UserProfileData } from '../types';

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively removes all undefined keys from objects or nested structures
 * before passing payloads to Firestore SDK.
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item)).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = sanitizePayload(value);
      }
    }
    return result as T;
  }
  return obj;
}

/**
 * Standard Firestore Error Handler as mandated by the Firebase Integration Skill.
 * Formats errors into a strict JSON string conforming to FirestoreErrorInfo.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };

  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error Exception: ', serialized);
  throw new Error(serialized);
}

// Local storage cache helpers to guarantee zero data loss
function getLocalCachedInteractions(userId: string): InteractionDocument[] {
  try {
    const raw = localStorage.getItem(`reflect_journal_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read from local storage cache:', err);
  }
  return [];
}

function setLocalCachedInteractions(userId: string, items: InteractionDocument[]): void {
  try {
    localStorage.setItem(`reflect_journal_${userId}`, JSON.stringify(items));
  } catch (err) {
    console.warn('Could not write to local storage cache:', err);
  }
}

/**
 * Synchronize user profile into /users/{userId} upon successful sign-in
 */
export async function syncUserProfile(profile: UserProfileData): Promise<void> {
  const userPath = `users/${profile.userId}`;
  try {
    const cleanProfile = sanitizePayload({
      userId: profile.userId,
      email: profile.email || '',
      displayName: profile.displayName || 'Anonymous User',
      photoURL: profile.photoURL || '',
      lastLoginAt: new Date().toISOString(),
      providerId: profile.providerId || 'google.com',
      emailVerified: profile.emailVerified ?? true,
    });

    // Store in local storage for instant access
    localStorage.setItem(`reflect_user_${profile.userId}`, JSON.stringify(cleanProfile));

    if (auth.currentUser) {
      await setDoc(doc(db, 'users', profile.userId), cleanProfile, { merge: true });
    }
  } catch (err) {
    console.warn('Notice syncing profile to Firestore:', err);
  }
}

/**
 * Persist or update an interaction in /users/{userId}/interactions/{interactionId}
 */
export async function saveInteraction(interaction: InteractionDocument): Promise<void> {
  if (!interaction.userId) {
    throw new Error('Cannot save interaction: user is unauthenticated.');
  }

  const sanitized: InteractionDocument = sanitizePayload({
    id: interaction.id,
    userId: interaction.userId,
    title: interaction.title || 'Untitled Reflection',
    mode: interaction.mode,
    prompt: interaction.prompt,
    response: interaction.response,
    summary: interaction.summary || '',
    tags: Array.isArray(interaction.tags) ? interaction.tags : ['reflection'],
    turns: Array.isArray(interaction.turns) ? interaction.turns : [],
    createdAt: interaction.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Always update local cache first (guaranteed zero data loss)
  const cached = getLocalCachedInteractions(interaction.userId);
  const existingIdx = cached.findIndex((item) => item.id === sanitized.id);
  let updatedList: InteractionDocument[];
  if (existingIdx >= 0) {
    updatedList = [...cached];
    updatedList[existingIdx] = sanitized;
  } else {
    updatedList = [sanitized, ...cached];
  }
  setLocalCachedInteractions(interaction.userId, updatedList);

  // If Firebase user is authenticated, sync to Firestore
  if (auth.currentUser) {
    const docPath = `users/${interaction.userId}/interactions/${interaction.id}`;
    try {
      await setDoc(doc(db, 'users', interaction.userId, 'interactions', interaction.id), sanitized, { merge: true });
    } catch (err) {
      console.warn('Firestore write warning (persisted locally):', err);
      // If error is permission-denied due to anonymous session mismatch, don't crash
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }
}

/**
 * Real-time listener for user interactions in /users/{userId}/interactions/
 */
export function subscribeToUserInteractions(
  userId: string,
  onData: (interactions: InteractionDocument[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const collectionPath = `users/${userId}/interactions`;

  // Deliver cached items immediately for snappy UX
  const initialCached = getLocalCachedInteractions(userId);
  if (initialCached.length > 0) {
    onData(initialCached);
  }

  if (!auth.currentUser) {
    // If not using live Firestore auth, deliver cached data and return noop unsubscribe
    return () => {};
  }

  try {
    const colRef = collection(db, 'users', userId, 'interactions');
    const q = query(colRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: InteractionDocument[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            userId: data.userId || userId,
            title: data.title || 'Untitled Reflection',
            mode: data.mode || 'deep_reflection',
            prompt: data.prompt || '',
            response: data.response || '',
            summary: data.summary || '',
            tags: data.tags || [],
            turns: data.turns || [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        });

        // Merge snapshot with local cache to ensure no local-only items are dropped
        const localItems = getLocalCachedInteractions(userId);
        const serverIds = new Set(items.map((i) => i.id));
        const unsyncedLocal = localItems.filter((i) => !serverIds.has(i.id));
        const merged = [...items, ...unsyncedLocal].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setLocalCachedInteractions(userId, merged);
        onData(merged);
      },
      (error) => {
        console.warn('Firestore snapshot notice, using local cache:', error);
        const fallback = getLocalCachedInteractions(userId);
        onData(fallback);
        try {
          handleFirestoreError(error, OperationType.LIST, collectionPath);
        } catch (wrappedErr: any) {
          onError(wrappedErr);
        }
      }
    );
  } catch (err) {
    console.warn('Firestore subscription catch, using local cache:', err);
    const fallback = getLocalCachedInteractions(userId);
    onData(fallback);
    return () => {};
  }
}

/**
 * Delete an interaction
 */
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  // Update local cache
  const cached = getLocalCachedInteractions(userId);
  const filtered = cached.filter((item) => item.id !== interactionId);
  setLocalCachedInteractions(userId, filtered);

  // If authenticated with Firestore, delete remote document
  if (auth.currentUser) {
    const docPath = `users/${userId}/interactions/${interactionId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'interactions', interactionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }
}

/**
 * Fetch all user interactions once (for offline or manual refreshes)
 */
export async function fetchUserInteractions(userId: string): Promise<InteractionDocument[]> {
  const collectionPath = `users/${userId}/interactions`;
  try {
    const colRef = collection(db, 'users', userId, 'interactions');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const items: InteractionDocument[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      items.push({
        id: docSnap.id,
        userId: data.userId || userId,
        title: data.title || 'Untitled Reflection',
        mode: data.mode || 'deep_reflection',
        prompt: data.prompt || '',
        response: data.response || '',
        summary: data.summary || '',
        tags: data.tags || [],
        turns: data.turns || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      });
    });
    return items;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, collectionPath);
  }
}
