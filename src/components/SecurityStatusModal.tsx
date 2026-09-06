import React, { useState, useEffect } from 'react';
import { ShieldCheck, Database, Key, Server, CheckCircle2, RefreshCw, Lock, Terminal } from 'lucide-react';
import { AppUser } from '../types';
import { testFirestoreConnection } from '../lib/firebase';

interface SecurityStatusModalProps {
  user: AppUser;
}

export const SecurityStatusModal: React.FC<SecurityStatusModalProps> = ({ user }) => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbMessage, setDbMessage] = useState<string>('Testing Firestore connection...');

  const runConnectionCheck = async () => {
    setDbStatus('checking');
    setDbMessage('Pinging Firestore server...');
    const result = await testFirestoreConnection();
    if (result.success) {
      setDbStatus('connected');
      setDbMessage(result.message);
    } else {
      setDbStatus('error');
      setDbMessage(result.message);
    }
  };

  useEffect(() => {
    runConnectionCheck();
  }, []);

  return (
    <div id="security-status-view" className="max-w-4xl mx-auto py-10 px-4 sm:px-6 font-sans">
      <div className="bg-white border border-[#E5E5E1] rounded-sm p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 border-b border-[#E5E5E1] pb-6 mb-8">
          <div className="w-10 h-10 rounded-sm bg-[#F4F3F0] border border-[#E5E5E1] flex items-center justify-center text-[#4A6D7C]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A1A] italic">Security &amp; Isolation Architecture</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#717171]">Verified Zero-Trust Boundaries &bull; Google Cloud Run / Firestore</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Identity Boundary */}
          <div className="p-6 bg-[#F9F8F6] border border-[#E5E5E1] rounded-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A6D7C] mb-3">
              <Lock className="w-3.5 h-3.5" />
              <span>1. User Identity Boundary</span>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Authenticated UID</span>
                <p className="font-mono text-[#1A1A1A] break-all font-semibold mt-0.5 bg-white p-2 rounded-sm border border-[#E5E5E1]">{user.uid}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Email</span>
                <p className="text-[#1A1A1A] font-medium">{user.email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Authentication Method</span>
                <p className="text-[#1A1A1A] font-medium">Firebase Auth (Google Federated Identity &bull; Zero Password Storage)</p>
              </div>
            </div>
          </div>

          {/* Database Path & Isolation */}
          <div className="p-6 bg-[#F9F8F6] border border-[#E5E5E1] rounded-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A6D7C] mb-3">
              <Database className="w-3.5 h-3.5" />
              <span>2. Isolated Firestore Collection</span>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Owner-Bound Path</span>
                <p className="font-mono text-[#4A6D7C] bg-white px-2.5 py-1.5 rounded-sm border border-[#E5E5E1] break-all font-semibold mt-0.5">
                  /users/{user.uid}/interactions/*
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Active Security Rule</span>
                <p className="font-mono text-[11px] text-[#1A1A1A] bg-white p-2 rounded-sm border border-[#E5E5E1] mt-1">
                  allow read, write: if request.auth != null &amp;&amp; request.auth.uid == userId;
                </p>
              </div>
            </div>
          </div>

          {/* Cloud Firestore Health Check */}
          <div className="p-6 bg-[#F9F8F6] border border-[#E5E5E1] rounded-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A6D7C]">
                <Server className="w-3.5 h-3.5" />
                <span>3. Firestore Connection Health</span>
              </div>
              <button
                id="btn-recheck-db"
                onClick={runConnectionCheck}
                className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] hover:text-[#4A6D7C] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Re-check</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              {dbStatus === 'checking' ? (
                <div className="flex items-center gap-2 text-xs text-[#717171]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#717171]" />
                  <span>{dbMessage}</span>
                </div>
              ) : dbStatus === 'connected' ? (
                <div className="flex items-center gap-2 text-xs text-[#2A5C43] font-medium bg-emerald-50/70 p-2 rounded-sm border border-emerald-200 w-full">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{dbMessage}</span>
                </div>
              ) : (
                <div className="text-xs text-[#8A2626] font-medium bg-rose-50/70 p-2 rounded-sm border border-rose-200 w-full">
                  {dbMessage}
                </div>
              )}
            </div>
          </div>

          {/* AI Processing & Secret Management */}
          <div className="p-6 bg-[#F9F8F6] border border-[#E5E5E1] rounded-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#4A6D7C] mb-3">
              <Key className="w-3.5 h-3.5" />
              <span>4. AI Engine &amp; Secret Isolation</span>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Primary AI Engine</span>
                <p className="font-semibold text-[#1A1A1A]">Gemini 3.6 Flash</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Resilient Fallback Ladder</span>
                <p className="font-mono text-[11px] text-[#717171] mt-0.5">
                  gemini-3.6-flash &rarr; gemini-3.1-flash-lite &rarr; gemini-flash-latest &rarr; gemini-3.7-flash
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#717171] tracking-wider">Secret Management</span>
                <p className="text-[#1A1A1A] font-medium">
                  Zero client exposure &bull; Container-side proxy via <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded-sm border border-[#E5E5E1]">/api/gemini/reflect</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Summary Code Snippet */}
        <div className="mt-8 pt-6 border-t border-[#E5E5E1]">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171] mb-3">
            <Terminal className="w-3.5 h-3.5" />
            <span>Active firestore.rules Definition</span>
          </div>
          <pre className="bg-[#1A1A1A] text-[#E5E5E1] p-5 rounded-sm text-xs font-mono overflow-x-auto leading-relaxed border border-[#333333]">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /test/connection {
      allow read: if true;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
