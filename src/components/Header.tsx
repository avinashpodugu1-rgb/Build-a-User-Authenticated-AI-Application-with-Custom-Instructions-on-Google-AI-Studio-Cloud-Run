import React from 'react';
import { Sparkles, BookOpen, History, ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';
import { AppUser } from '../types';

interface HeaderProps {
  user: AppUser;
  activeTab: 'workspace' | 'history' | 'security';
  setActiveTab: (tab: 'workspace' | 'history' | 'security') => void;
  onSignOut: () => void;
  onOpenAccountModal: () => void;
  entriesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onSignOut,
  onOpenAccountModal,
  entriesCount,
}) => {
  return (
    <header id="main-header" className="bg-white border-b border-[#E5E5E1] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center shadow-xs">
              <div className="w-3 h-3 bg-white rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-widest uppercase text-[#1A1A1A]">Reflect.ai</span>
                <span className="text-[10px] font-bold text-[#4A6D7C] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#F4F3F0] border border-[#E5E5E1]">
                  Gemini 3.6 &bull; Firestore
                </span>
              </div>
              <p className="text-[10px] text-[#717171] uppercase tracking-wider hidden sm:block">Private Editorial Journal</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="nav-btn-workspace"
              onClick={() => setActiveTab('workspace')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#F4F3F0]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Reflect</span>
            </button>

            <button
              id="nav-btn-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'history'
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#F4F3F0]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Entries</span>
              {entriesCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono font-bold ${
                    activeTab === 'history' ? 'bg-[#333333] text-white' : 'bg-[#E9E8E4] text-[#1A1A1A]'
                  }`}
                >
                  {entriesCount}
                </span>
              )}
            </button>

            <button
              id="nav-btn-security"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'security'
                  ? 'bg-[#1A1A1A] text-white'
                  : 'text-[#717171] hover:text-[#1A1A1A] hover:bg-[#F4F3F0]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#4A6D7C]" />
              <span className="hidden md:inline">Security & Path</span>
            </button>
          </nav>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              id="btn-user-profile"
              onClick={onOpenAccountModal}
              className="flex items-center gap-3 border-l border-[#E5E5E1] pl-4 sm:pl-6 text-left hover:opacity-80 transition-opacity cursor-pointer group"
              title="View Google Account details & export options"
            >
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold leading-none text-[#1A1A1A] group-hover:text-[#4A6D7C] transition-colors">
                  {user.displayName || 'Authenticated User'}
                </p>
                <p className="text-[10px] text-[#717171] uppercase tracking-wider mt-1 truncate max-w-[140px]">
                  {user.email || 'Cloud Firestore'}
                </p>
              </div>

              <div className="relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-[#D1D1CB] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif text-xs font-bold">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full p-0.5 shadow-xs border border-[#E5E5E1] flex items-center justify-center">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
              </div>
            </button>

            <button
              id="btn-sign-out"
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 text-[#717171] hover:text-[#1A1A1A] hover:bg-[#F4F3F0] rounded-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
