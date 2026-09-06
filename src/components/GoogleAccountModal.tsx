import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Download,
  Copy,
  Check,
  X,
  Database,
  ExternalLink,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { AppUser, InteractionDocument } from '../types';

interface GoogleAccountModalProps {
  user: AppUser;
  onClose: () => void;
  onSignOut: () => void;
  interactions: InteractionDocument[];
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  user,
  onClose,
  onSignOut,
  interactions,
}) => {
  const [copiedUid, setCopiedUid] = React.useState(false);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(interactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `journal-reflections-${user.uid}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportMarkdown = () => {
    let mdContent = `# Reflection Journal Archives\n`;
    mdContent += `*Account: ${user.displayName || 'Google User'} (${user.email || 'N/A'})*\n`;
    mdContent += `*Total Entries: ${interactions.length}*\n\n---\n\n`;

    interactions.forEach((entry, idx) => {
      mdContent += `## ${idx + 1}. ${entry.title}\n`;
      mdContent += `**Date:** ${new Date(entry.createdAt).toLocaleDateString()} | **Mode:** ${entry.mode} | **Tags:** ${entry.tags.join(', ')}\n\n`;
      if (entry.summary) {
        mdContent += `> **Executive Synthesis:** ${entry.summary}\n\n`;
      }
      mdContent += `### Conversation Transcript\n\n`;
      entry.turns.forEach((turn) => {
        mdContent += `**${turn.role === 'user' ? 'You' : 'Gemini 3.6 Flash'}:**\n${turn.text}\n\n`;
      });
      mdContent += `---\n\n`;
    });

    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `journal-reflections-${user.uid}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="google-account-modal"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#E5E5E1] rounded-sm max-w-lg w-full p-6 sm:p-8 shadow-xl relative font-sans">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#717171] hover:text-[#1A1A1A] p-1.5 rounded-full hover:bg-[#F4F3F0] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#E5E5E1] pb-5 mb-6">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Google Account'}
              className="w-12 h-12 rounded-full border border-[#D1D1CB] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center font-serif text-lg font-bold">
              {(user.displayName || user.email || 'G')[0].toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#1A1A1A]">
                {user.displayName || 'Google Account User'}
              </h3>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Verified
              </span>
            </div>
            <p className="text-xs text-[#717171] font-mono mt-0.5">{user.email || 'Google Federated Account'}</p>
          </div>
        </div>

        {/* Account Details & Metadata */}
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-[#F9F8F6] border border-[#E5E5E1] rounded-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Identity Provider</span>
              <span className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                Google Identity Services
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Account UID</span>
              <div className="flex items-center gap-1 font-mono text-[#1A1A1A]">
                <span className="truncate max-w-[170px]">{user.uid}</span>
                <button
                  onClick={handleCopyUid}
                  className="p-1 text-[#717171] hover:text-[#1A1A1A]"
                  title="Copy UID"
                >
                  {copiedUid ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Cloud Firestore Path</span>
              <span className="font-mono text-[#4A6D7C] truncate max-w-[200px]">
                /users/{user.uid}/interactions
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Saved Journal Entries</span>
              <span className="font-bold text-[#1A1A1A]">{interactions.length} entries</span>
            </div>
          </div>

          {/* Export Actions */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#717171] mb-2">Export Data</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJson}
                disabled={interactions.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-[#E5E5E1] rounded-sm bg-[#F9F8F6] hover:bg-[#E9E8E4] text-[#1A1A1A] text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={handleExportMarkdown}
                disabled={interactions.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-[#E5E5E1] rounded-sm bg-[#F9F8F6] hover:bg-[#E9E8E4] text-[#1A1A1A] text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Markdown</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 pt-5 border-t border-[#E5E5E1] flex items-center justify-between">
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-800 uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black rounded-full transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
