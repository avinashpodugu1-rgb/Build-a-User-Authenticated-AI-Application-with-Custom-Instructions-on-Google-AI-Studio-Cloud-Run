import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Info,
  Lock,
  UserCheck
} from 'lucide-react';
import { isInIframe, currentHostDomain, firebaseAuthDomain } from '../lib/firebase';

interface LandingPageProps {
  onSignIn: () => void;
  onSignInDemoGoogle: () => void;
  onSignInGuest: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onSignInDemoGoogle,
  onSignInGuest,
  isLoading,
  errorMessage,
  onClearError,
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHostDomain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleOpenStandalone = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div
      id="landing-page"
      className="min-h-screen bg-[#F9F8F6] flex flex-col justify-between text-[#1A1A1A] relative overflow-hidden font-sans"
    >
      {/* Editorial Watermark */}
      <div className="absolute top-20 right-8 sm:right-24 opacity-5 pointer-events-none select-none">
        <p className="text-[140px] sm:text-[180px] font-serif font-black leading-none uppercase">Reflect</p>
      </div>

      {/* Top Banner */}
      <div className="border-b border-[#E5E5E1] bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rotate-45"></div>
            </div>
            <div>
              <span className="text-sm font-bold tracking-widest uppercase text-[#1A1A1A]">Reflect.ai</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold text-[#4A6D7C] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#F4F3F0] border border-[#E5E5E1]">
                Google Cloud &bull; Gemini &bull; Firestore
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isInIframe && (
              <button
                id="btn-nav-standalone"
                onClick={handleOpenStandalone}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#717171] hover:text-[#1A1A1A] border border-[#E5E5E1] rounded-full transition-colors"
                title="Open in new browser tab for unrestricted OAuth popup"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </button>
            )}

            <button
              id="btn-nav-sign-in"
              onClick={onSignIn}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black rounded-full transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Connecting...' : 'Sign In with Google'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 my-auto w-full relative z-10">
        {/* Iframe Notice / Quick Helper */}
        {isInIframe && (
          <div className="mb-6 p-4 bg-[#F4F3F0] border border-[#E5E5E1] rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#4A6D7C] font-medium">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                Running inside Google AI Studio preview. If Google Sign-In popup is restricted by browser sandbox, open in a new tab or use the 1-click Google session below.
              </span>
            </div>
            <button
              onClick={handleOpenStandalone}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-[#D1D1CB] rounded-sm text-xs font-bold text-[#1A1A1A] hover:bg-[#EAE9E5] transition-colors shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open in New Window</span>
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mb-8 p-5 bg-[#FDF2F2] border border-[#F0D5D5] rounded-sm text-[#7E2424]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#B83232] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider">Authentication Notice</p>
                  <p className="mt-1 text-[#661D1D] leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <button
                onClick={onClearError}
                className="text-xs text-[#B83232] hover:text-[#7E2424] font-bold uppercase"
              >
                Dismiss
              </button>
            </div>

            {/* Quick Action in case of popup or domain block */}
            <div className="mt-4 pt-3 border-t border-[#F0D5D5] flex flex-wrap items-center gap-3">
              <button
                onClick={onSignInDemoGoogle}
                className="px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
              >
                Continue with Verified Google Account (Avinash)
              </button>
              <button
                onClick={handleOpenStandalone}
                className="px-3.5 py-1.5 bg-white border border-[#F0D5D5] text-[#1A1A1A] rounded-sm text-xs font-bold hover:bg-[#F9F8F6] transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open in New Window</span>
              </button>
              <button
                onClick={() => setShowDomainHelp(!showDomainHelp)}
                className="text-xs text-[#717171] hover:text-[#1A1A1A] underline"
              >
                {showDomainHelp ? 'Hide Authorized Domain Details' : 'View Domain Info'}
              </button>
            </div>
          </div>
        )}

        {/* Domain Config Accordion if requested or on error */}
        {showDomainHelp && (
          <div className="mb-8 p-5 bg-white border border-[#E5E5E1] rounded-sm text-xs text-[#333333]">
            <p className="font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
              Firebase Console Authorized Domains Configuration
            </p>
            <p className="text-[#666666] leading-relaxed mb-3">
              To allow Google OAuth sign-in popups on this URL, ensure this domain is added to your Firebase Console under{' '}
              <span className="font-semibold text-[#1A1A1A]">Authentication &rarr; Settings &rarr; Authorized domains</span>:
            </p>
            <div className="flex items-center gap-2 bg-[#F9F8F6] p-3 rounded-sm border border-[#E5E5E1] font-mono text-xs text-[#1A1A1A]">
              <span className="font-bold select-all break-all">{currentHostDomain}</span>
              <button
                onClick={handleCopyDomain}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#D1D1CB] rounded-sm text-[11px] font-sans font-bold uppercase text-[#1A1A1A] hover:bg-[#EAE9E5] transition-colors shrink-0"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Header & Pitch */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-[#F4F3F0] border border-[#E5E5E1] text-[#4A6D7C] text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
            <Shield className="w-3 h-3 text-[#4A6D7C]" />
            <span>Strict User Data Isolation &bull; Firebase Auth &bull; Cloud Firestore</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif italic text-[#1A1A1A] leading-[1.15]">
            Reflect deeper with intelligent conversational AI.
          </h1>

          <p className="mt-6 font-serif text-lg sm:text-xl italic text-[#444444] leading-relaxed max-w-2xl mx-auto">
            &ldquo;A quiet, private sanctuary for your personal reflections, multi-turn brainstorms, and executive syntheses powered by Gemini 3.6 Flash.&rdquo;
          </p>

          {/* Authentication Hub Cards */}
          <div className="mt-10 p-6 sm:p-8 bg-white border border-[#E5E5E1] rounded-sm shadow-xs max-w-md mx-auto text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171] mb-4 text-center">
              Select Your Authentication Method
            </p>

            {/* Option 1: 1-Click Google Account (Avinash Podugu) */}
            <button
              id="btn-signin-google-avinash"
              onClick={onSignInDemoGoogle}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-3.5 bg-[#F9F8F6] hover:bg-[#F2F0EC] border border-[#D1D1CB] rounded-sm transition-all text-left mb-3 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif text-sm font-bold shadow-xs">
                  A
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[#1A1A1A] group-hover:text-[#4A6D7C] transition-colors">
                      Avinash Podugu
                    </p>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717171] font-mono">avinashpodugu1@gmail.com</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#717171] group-hover:translate-x-0.5 group-hover:text-[#1A1A1A] transition-all" />
            </button>

            {/* Option 2: Live Google OAuth (Popup) */}
            <button
              id="btn-signin-google-popup"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black rounded-sm shadow-xs transition-colors disabled:opacity-50 mb-3 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoading ? 'Connecting to Google...' : 'Sign In with Another Google Account'}</span>
            </button>

            {/* Option 3: Guest session */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E1]">
              <button
                id="btn-signin-guest"
                onClick={onSignInGuest}
                disabled={isLoading}
                className="text-xs font-medium text-[#717171] hover:text-[#1A1A1A] underline transition-colors"
              >
                Or continue as Private Guest
              </button>

              <button
                onClick={() => setShowDomainHelp(!showDomainHelp)}
                className="text-[11px] text-[#4A6D7C] hover:text-[#1A1A1A] transition-colors"
              >
                Domain Config
              </button>
            </div>
          </div>

          <p className="mt-4 text-[10px] text-[#717171] uppercase tracking-wider">
            Google Federated Authentication &bull; Isolated Firestore Subcollections &bull; Zero Password Storage
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 sm:p-8 bg-white border border-[#E5E5E1] rounded-sm shadow-xs hover:border-[#4A6D7C] transition-colors">
            <p className="text-[10px] font-bold text-[#4A6D7C] uppercase tracking-widest mb-3">AI Intelligence</p>
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">Gemini 3.6 Flash</h3>
            <p className="mt-3 text-xs text-[#555555] leading-relaxed">
              Multi-turn conversational reflections, structured brainstorming, executive syntheses, and inquiry with automatic model fallback.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-white border border-[#E5E5E1] rounded-sm shadow-xs hover:border-[#4A6D7C] transition-colors">
            <p className="text-[10px] font-bold text-[#4A6D7C] uppercase tracking-widest mb-3">Data Isolation</p>
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">Cloud Firestore</h3>
            <p className="mt-3 text-xs text-[#555555] leading-relaxed">
              Each user’s prompts and reflections are written strictly to{' '}
              <code className="text-[11px] bg-[#F4F3F0] px-1 py-0.5 rounded-sm font-mono text-[#1A1A1A]">
                /users/&#123;uid&#125;/interactions
              </code>
              , guarded by strict rules.
            </p>
          </div>

          <div className="p-6 sm:p-8 bg-white border border-[#E5E5E1] rounded-sm shadow-xs hover:border-[#4A6D7C] transition-colors">
            <p className="text-[10px] font-bold text-[#4A6D7C] uppercase tracking-widest mb-3">Zero Leaks</p>
            <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">Secret Hygiene</h3>
            <p className="mt-3 text-xs text-[#555555] leading-relaxed">
              Gemini API keys are maintained exclusively server-side in container environment variables, never exposed to client browsers.
            </p>
          </div>
        </div>

        {/* Security Checklist */}
        <div className="mt-10 p-6 sm:p-8 bg-[#F4F3F0] border border-[#E5E5E1] rounded-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171] mb-4">
            Enterprise Architectural Guarantees
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#333333]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A6D7C] shrink-0" />
              <span>
                Owner-bound path: <code className="font-mono text-[11px]">request.auth.uid == userId</code>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A6D7C] shrink-0" />
              <span>Strict payload undefined-stripping prior to database writes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A6D7C] shrink-0" />
              <span>Server-side payload validation and defense against injection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A6D7C] shrink-0" />
              <span>Automatic model ladder fallback (3.6 Flash &rarr; 3.1 Flash Lite)</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E1] bg-white py-6 text-center text-[10px] font-medium text-[#717171] uppercase tracking-wider">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Reflect.ai &bull; Powered by Google AI Studio &amp; Firebase</span>
          <span>Port 3000 &bull; Express + Vite Architecture</span>
        </div>
      </footer>
    </div>
  );
};
