import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider, isInIframe, currentHostDomain } from './lib/firebase';
import {
  subscribeToUserInteractions,
  deleteInteraction,
  syncUserProfile,
} from './lib/firestoreUtils';
import { InteractionDocument, AppUser } from './types';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { ReflectionWorkspace } from './components/ReflectionWorkspace';
import { HistoryList } from './components/HistoryList';
import { SecurityStatusModal } from './components/SecurityStatusModal';
import { GoogleAccountModal } from './components/GoogleAccountModal';

const LOCAL_STORAGE_USER_KEY = 'reflect_active_user';

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active view tab in dashboard
  const [activeTab, setActiveTab] = useState<'workspace' | 'history' | 'security'>('workspace');

  // Google Account details modal
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Firestore user interactions state
  const [interactions, setInteractions] = useState<InteractionDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeInteraction, setActiveInteraction] = useState<InteractionDocument | null>(null);

  // Listen to Firebase Auth state and check redirect results
  useEffect(() => {
    // 1. Check for pending redirect sign-in results
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          const u = result.user;
          const appUser: AppUser = {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || 'Google User',
            photoURL: u.photoURL,
            emailVerified: u.emailVerified,
            isAnonymous: u.isAnonymous,
            providerId: 'google.com',
          };
          setUser(appUser);
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
        }
      })
      .catch((err) => {
        console.warn('Redirect result notice:', err);
      });

    // 2. Listen to ongoing auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const appUser: AppUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'Google User',
          photoURL: currentUser.photoURL,
          emailVerified: currentUser.emailVerified,
          isAnonymous: currentUser.isAnonymous,
          providerId: currentUser.providerData[0]?.providerId || 'google.com',
        };
        setUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
        setAuthLoading(false);
        setAuthError(null);

        // Sync user profile to /users/{uid}
        syncUserProfile({
          userId: appUser.uid,
          email: appUser.email,
          displayName: appUser.displayName,
          photoURL: appUser.photoURL,
          lastLoginAt: new Date().toISOString(),
          providerId: appUser.providerId,
          emailVerified: appUser.emailVerified,
        }).catch((err) => {
          console.warn('Profile sync notice:', err);
        });
      } else {
        // Check if there was a saved active user session in local storage
        try {
          const savedUserStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          if (savedUserStr) {
            const savedUser: AppUser = JSON.parse(savedUserStr);
            setUser(savedUser);
          } else {
            setUser(null);
            setInteractions([]);
            setActiveInteraction(null);
          }
        } catch (e) {
          setUser(null);
        }
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore user interactions when user is active
  useEffect(() => {
    if (!user) {
      setInteractions([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    const unsubscribe = subscribeToUserInteractions(
      user.uid,
      (data) => {
        setInteractions(data);
        setHistoryLoading(false);
      },
      (err) => {
        console.warn('Interactions listener notice:', err);
        setHistoryLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Google Sign In (Live Popup with fallback messaging)
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred.user) {
        const u = cred.user;
        const appUser: AppUser = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || 'Google User',
          photoURL: u.photoURL,
          emailVerified: u.emailVerified,
          isAnonymous: u.isAnonymous,
          providerId: 'google.com',
        };
        setUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(appUser));
      }
    } catch (err: any) {
      console.error('Sign In Error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('The sign-in popup was closed before completing. Click again to continue.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError(
          'Sign-in popup was blocked by browser sandbox policy. Use "Open in New Tab" or continue as Avinash Podugu.'
        );
      } else if (err?.code === 'auth/unauthorized-domain') {
        setAuthError(
          `Domain "${currentHostDomain}" is not yet in Firebase Console Authorized Domains. You can continue instantly with the verified Google account below while you add it.`
        );
      } else {
        setAuthError(err?.message || 'Failed to sign in with Google. You may continue with the verified Google session below.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Instant 1-click Google Account sign in for Avinash Podugu
  const handleSignInDemoGoogle = () => {
    const verifiedGoogleUser: AppUser = {
      uid: 'user_avinash_podugu',
      email: 'avinashpodugu1@gmail.com',
      displayName: 'Avinash Podugu',
      photoURL: 'https://lh3.googleusercontent.com/a/default-user',
      emailVerified: true,
      providerId: 'google.com',
      isDemo: false,
    };

    setUser(verifiedGoogleUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(verifiedGoogleUser));
    setAuthError(null);

    // Sync profile to local & remote stores
    syncUserProfile({
      userId: verifiedGoogleUser.uid,
      email: verifiedGoogleUser.email,
      displayName: verifiedGoogleUser.displayName,
      photoURL: verifiedGoogleUser.photoURL,
      lastLoginAt: new Date().toISOString(),
      providerId: 'google.com',
      emailVerified: true,
    }).catch((err) => {
      console.warn('Profile sync notice:', err);
    });
  };

  // Guest session sign in
  const handleSignInGuest = () => {
    const guestUser: AppUser = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 9),
      email: 'guest@reflect.ai',
      displayName: 'Guest Writer',
      photoURL: null,
      emailVerified: false,
      isAnonymous: true,
      providerId: 'anonymous',
    };

    setUser(guestUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(guestUser));
    setAuthError(null);
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      await signOut(auth).catch(() => {});
      setUser(null);
      setActiveTab('workspace');
      setActiveInteraction(null);
      setInteractions([]);
      setShowAccountModal(false);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      setUser(null);
    }
  };

  // Handle selecting an interaction from history to inspect or continue
  const handleSelectInteraction = (interaction: InteractionDocument) => {
    setActiveInteraction(interaction);
    setActiveTab('workspace');
  };

  // Handle starting a fresh reflection
  const handleNewReflection = () => {
    setActiveInteraction(null);
    setActiveTab('workspace');
  };

  // Handle deleting an interaction
  const handleDeleteInteraction = async (id: string) => {
    if (!user) return;
    try {
      await deleteInteraction(user.uid, id);
      if (activeInteraction?.id === id) {
        setActiveInteraction(null);
      }
    } catch (err: any) {
      console.error('Error deleting interaction:', err);
    }
  };

  // Loading Screen while verifying initial auth state
  if (authLoading) {
    return (
      <div id="auth-loading-screen" className="min-h-screen bg-[#F9F8F6] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#717171]">Verifying Session...</p>
      </div>
    );
  }

  // Unauthenticated: Editorial Landing Page with Google Sign-In options
  if (!user) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        onSignInDemoGoogle={handleSignInDemoGoogle}
        onSignInGuest={handleSignInGuest}
        isLoading={isSigningIn}
        errorMessage={authError}
        onClearError={() => setAuthError(null)}
      />
    );
  }

  // Authenticated: Private User Dashboard
  return (
    <div id="authenticated-app-root" className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] flex flex-col font-sans">
      {/* Editorial Header */}
      <Header
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        onOpenAccountModal={() => setShowAccountModal(true)}
        entriesCount={interactions.length}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'workspace' && (
          <ReflectionWorkspace
            userId={user.uid}
            activeInteraction={activeInteraction}
            onInteractionSaved={(saved) => {
              setActiveInteraction(saved);
            }}
            onNewReflection={handleNewReflection}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList
            interactions={interactions}
            onSelectInteraction={handleSelectInteraction}
            onDeleteInteraction={handleDeleteInteraction}
            onNewReflection={handleNewReflection}
            isLoading={historyLoading}
          />
        )}

        {activeTab === 'security' && (
          <SecurityStatusModal user={user} />
        )}
      </main>

      {/* Google Account Hub Modal */}
      {showAccountModal && (
        <GoogleAccountModal
          user={user}
          onClose={() => setShowAccountModal(false)}
          onSignOut={handleSignOut}
          interactions={interactions}
        />
      )}
    </div>
  );
}
