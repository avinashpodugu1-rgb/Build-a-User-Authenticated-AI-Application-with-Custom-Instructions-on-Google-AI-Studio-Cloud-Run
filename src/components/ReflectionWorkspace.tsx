import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Tag as TagIcon,
  MessageSquare,
  Bot,
  User as UserIcon,
  Flame,
  FileText,
  Lightbulb,
  HelpCircle
} from 'lucide-react';
import { JournalMode, ConversationTurn, InteractionDocument } from '../types';
import { saveInteraction } from '../lib/firestoreUtils';

interface ReflectionWorkspaceProps {
  userId: string;
  activeInteraction: InteractionDocument | null;
  onInteractionSaved: (interaction: InteractionDocument) => void;
  onNewReflection: () => void;
}

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  userId,
  activeInteraction,
  onInteractionSaved,
  onNewReflection,
}) => {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<JournalMode>('deep_reflection');
  const [prompt, setPrompt] = useState('');
  const [followUpText, setFollowUpText] = useState('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>(['reflection']);
  const [newTagInput, setNewTagInput] = useState('');

  // Status indicators
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.6-flash');

  const currentIdRef = useRef<string>(activeInteraction?.id || `entry-${Date.now()}`);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync state when activeInteraction changes
  useEffect(() => {
    if (activeInteraction) {
      currentIdRef.current = activeInteraction.id;
      setTitle(activeInteraction.title || 'Untitled Reflection');
      setMode(activeInteraction.mode || 'deep_reflection');
      setPrompt(activeInteraction.prompt || '');
      setSummary(activeInteraction.summary || '');
      setTags(activeInteraction.tags || ['reflection']);
      setTurns(activeInteraction.turns || [
        { role: 'user', text: activeInteraction.prompt, timestamp: activeInteraction.createdAt },
        { role: 'model', text: activeInteraction.response, timestamp: activeInteraction.updatedAt },
      ]);
      setSaveStatus('saved');
    } else {
      currentIdRef.current = `entry-${Date.now()}`;
      setTitle('');
      setMode('deep_reflection');
      setPrompt('');
      setSummary('');
      setTags(['reflection']);
      setTurns([]);
      setSaveStatus('idle');
      setErrorMessage(null);
    }
  }, [activeInteraction]);

  // Scroll to bottom when new turn arrives
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleModeChange = (selectedMode: JournalMode) => {
    setMode(selectedMode);
    if (!tags.includes(selectedMode.replace('_', ' '))) {
      setTags((prev) => [...prev.filter((t) => !['deep reflection', 'brainstorm', 'summary', 'inquiry'].includes(t)), selectedMode.replace('_', ' ')]);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Helper to persist interaction to Firestore with Guaranteed Transaction Verification
  const persistToFirestore = async (
    customTurns: ConversationTurn[],
    customSummary?: string,
    customTitle?: string
  ): Promise<boolean> => {
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage(null);

    const firstUserTurn = customTurns.find((t) => t.role === 'user');
    const firstModelTurn = customTurns.find((t) => t.role === 'model');

    const entryTitle =
      customTitle ||
      title.trim() ||
      (firstUserTurn ? firstUserTurn.text.slice(0, 45) + '...' : 'Journal Entry');

    const payload: InteractionDocument = {
      id: currentIdRef.current,
      userId,
      title: entryTitle,
      mode,
      prompt: firstUserTurn?.text || prompt,
      response: firstModelTurn?.text || '',
      summary: customSummary !== undefined ? customSummary : summary,
      tags,
      turns: customTurns,
      createdAt: activeInteraction?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveInteraction(payload);
      setTitle(entryTitle);
      setSaveStatus('saved');
      setIsSaving(false);
      onInteractionSaved(payload);
      return true;
    } catch (err: any) {
      console.error('Firestore save failed:', err);
      setSaveStatus('error');
      setIsSaving(false);
      setErrorMessage(
        err?.message ? `Failed to save entry to Firestore: ${err.message}` : 'Failed to save entry to Firestore.'
      );
      return false;
    }
  };

  // Submit initial reflection
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    setIsGenerating(true);
    setErrorMessage(null);

    const userTurn: ConversationTurn = {
      role: 'user',
      text: cleanPrompt,
      timestamp: new Date().toISOString(),
    };

    const newTurns = [userTurn];
    setTurns(newTurns);

    try {
      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          mode,
          history: [],
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      const modelTurn: ConversationTurn = {
        role: 'model',
        text: data.response || 'No response generated.',
        timestamp: new Date().toISOString(),
      };

      const finalTurns = [...newTurns, modelTurn];
      setTurns(finalTurns);
      setSummary(data.summary || '');
      setModelUsed(data.modelUsed || 'gemini-3.6-flash');

      // Guaranteed transaction verification: persist immediately upon successful generation
      await persistToFirestore(finalTurns, data.summary);
    } catch (err: any) {
      console.error('Gemini generation error:', err);
      setErrorMessage(
        err?.message || 'Error generating reflection with Gemini. Ensure server environment is ready and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit multi-turn follow-up question
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFollowUp = followUpText.trim();
    if (!cleanFollowUp || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setFollowUpText('');

    const userTurn: ConversationTurn = {
      role: 'user',
      text: cleanFollowUp,
      timestamp: new Date().toISOString(),
    };

    const updatedTurns = [...turns, userTurn];
    setTurns(updatedTurns);

    try {
      // Map prior turns for API context
      const historyPayload = turns.map((t) => ({
        role: t.role,
        text: t.text,
      }));

      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanFollowUp,
          mode,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      const modelTurn: ConversationTurn = {
        role: 'model',
        text: data.response || 'No response generated.',
        timestamp: new Date().toISOString(),
      };

      const finalTurns = [...updatedTurns, modelTurn];
      setTurns(finalTurns);
      setModelUsed(data.modelUsed || 'gemini-3.6-flash');

      // Update Firestore with the new multi-turn conversation
      await persistToFirestore(finalTurns);
    } catch (err: any) {
      console.error('Gemini follow-up error:', err);
      setErrorMessage(
        err?.message || 'Error continuing conversation. Check your network connection and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual explicit save action
  const handleManualSave = () => {
    if (turns.length === 0 && !prompt.trim()) {
      setErrorMessage('Cannot save an empty reflection. Please write an entry first.');
      return;
    }
    persistToFirestore(turns);
  };

  return (
    <div id="reflection-workspace" className="max-w-4xl mx-auto py-10 px-4 sm:px-6 relative font-sans">
      {/* Editorial Watermark */}
      <div className="absolute top-12 right-6 sm:right-12 opacity-5 pointer-events-none select-none">
        <p className="text-[110px] sm:text-[140px] font-serif font-black leading-none uppercase">Reflect</p>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-[#E5E5E1] rounded-sm p-6 sm:p-8 shadow-xs mb-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E1] pb-6">
          <div className="flex-1">
            <p className="text-[11px] font-bold text-[#4A6D7C] uppercase tracking-[0.2em] mb-2">
              {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} &bull; Editorial Reflection
            </p>
            <input
              id="input-reflection-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Reflections on Mid-Year Progress & Scaling..."
              className="w-full text-2xl sm:text-4xl font-serif italic text-[#1A1A1A] placeholder:text-[#A1A19A] bg-transparent border-none focus:outline-none focus:ring-0 p-0 leading-tight"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-new-reflection"
              onClick={onNewReflection}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#1A1A1A] bg-[#F4F3F0] hover:bg-[#E9E8E4] rounded-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            <button
              id="btn-manual-save"
              onClick={handleManualSave}
              disabled={isSaving}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-all ${
                saveStatus === 'saved'
                  ? 'bg-[#F4F3F0] text-[#4A6D7C] border border-[#D1D1CB]'
                  : 'bg-[#1A1A1A] text-white hover:bg-black'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4A6D7C]" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reflection Mode Switcher */}
        <div className="mt-6">
          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171] mb-2.5">
            Select Reflection Mode
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              id="mode-btn-deep-reflection"
              type="button"
              onClick={() => handleModeChange('deep_reflection')}
              className={`flex items-center gap-2.5 p-3 rounded-sm text-left border text-xs transition-all ${
                mode === 'deep_reflection'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-[#F4F3F0] hover:bg-[#E9E8E4] text-[#333333] border-[#E5E5E1]'
              }`}
            >
              <Flame className={`w-4 h-4 ${mode === 'deep_reflection' ? 'text-[#E5E5E1]' : 'text-[#717171]'}`} />
              <div>
                <p className="font-bold uppercase tracking-wider text-[11px] leading-tight">Deep Reflection</p>
                <p className="text-[10px] opacity-70 leading-tight">Emotional clarity</p>
              </div>
            </button>

            <button
              id="mode-btn-brainstorm"
              type="button"
              onClick={() => handleModeChange('brainstorm')}
              className={`flex items-center gap-2.5 p-3 rounded-sm text-left border text-xs transition-all ${
                mode === 'brainstorm'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-[#F4F3F0] hover:bg-[#E9E8E4] text-[#333333] border-[#E5E5E1]'
              }`}
            >
              <Lightbulb className={`w-4 h-4 ${mode === 'brainstorm' ? 'text-[#E5E5E1]' : 'text-[#717171]'}`} />
              <div>
                <p className="font-bold uppercase tracking-wider text-[11px] leading-tight">Brainstorming</p>
                <p className="text-[10px] opacity-70 leading-tight">Ideas & options</p>
              </div>
            </button>

            <button
              id="mode-btn-summary"
              type="button"
              onClick={() => handleModeChange('summary')}
              className={`flex items-center gap-2.5 p-3 rounded-sm text-left border text-xs transition-all ${
                mode === 'summary'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-[#F4F3F0] hover:bg-[#E9E8E4] text-[#333333] border-[#E5E5E1]'
              }`}
            >
              <FileText className={`w-4 h-4 ${mode === 'summary' ? 'text-[#E5E5E1]' : 'text-[#717171]'}`} />
              <div>
                <p className="font-bold uppercase tracking-wider text-[11px] leading-tight">Executive Summary</p>
                <p className="text-[10px] opacity-70 leading-tight">Key takeaways</p>
              </div>
            </button>

            <button
              id="mode-btn-inquiry"
              type="button"
              onClick={() => handleModeChange('inquiry')}
              className={`flex items-center gap-2.5 p-3 rounded-sm text-left border text-xs transition-all ${
                mode === 'inquiry'
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-[#F4F3F0] hover:bg-[#E9E8E4] text-[#333333] border-[#E5E5E1]'
              }`}
            >
              <HelpCircle className={`w-4 h-4 ${mode === 'inquiry' ? 'text-[#E5E5E1]' : 'text-[#717171]'}`} />
              <div>
                <p className="font-bold uppercase tracking-wider text-[11px] leading-tight">Socratic Inquiry</p>
                <p className="text-[10px] opacity-70 leading-tight">Probing questions</p>
              </div>
            </button>
          </div>
        </div>

        {/* Tags bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-[#E5E5E1]">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#717171]">
            <TagIcon className="w-3 h-3" />
            <span>Tags:</span>
          </div>
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm bg-[#E9E8E4] text-[#1A1A1A] border border-[#D1D1CB]"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-[#717171] hover:text-[#1A1A1A] ml-1 leading-none font-bold"
              >
                &times;
              </button>
            </span>
          ))}

          <div className="flex items-center gap-1">
            <input
              id="input-new-tag"
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="+ tag"
              className="text-xs px-2.5 py-1 rounded-sm bg-[#F9F8F6] border border-dashed border-[#D1D1CB] text-[#1A1A1A] focus:outline-none focus:border-[#4A6D7C] w-20 uppercase font-medium"
            />
            {newTagInput && (
              <button
                type="button"
                onClick={handleAddTag}
                className="text-[10px] font-bold uppercase tracking-wider text-[#4A6D7C] hover:text-[#1A1A1A]"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {errorMessage && (
        <div
          id="workspace-error-banner"
          className="mb-8 p-5 bg-[#FDF2F2] border border-[#F0D5D5] rounded-sm flex items-start justify-between gap-3 text-[#7E2424]"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#B83232] shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold uppercase tracking-wider">Operation Notice</p>
              <p className="mt-1 text-[#661D1D] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            id="btn-retry-save"
            onClick={handleManualSave}
            className="shrink-0 px-4 py-1.5 bg-[#B83232] hover:bg-[#962626] text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
          >
            Retry Save
          </button>
        </div>
      )}

      {/* Initial Journal Entry Form (if no turns exist yet) */}
      {turns.length === 0 ? (
        <form onSubmit={handleInitialSubmit} className="bg-white border border-[#E5E5E1] rounded-sm p-8 shadow-xs">
          <label htmlFor="textarea-initial-prompt" className="block text-sm font-bold uppercase tracking-wider text-[#1A1A1A] mb-3">
            Journal Reflection &bull; What is on your mind today?
          </label>
          <textarea
            id="textarea-initial-prompt"
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={10000}
            placeholder="Write freely here. What happened today? What challenges or creative thoughts are you turning over in your head? Gemini will reflect back with you..."
            className="w-full p-6 rounded-sm bg-[#F9F8F6] border border-[#E5E5E1] text-[#333333] font-serif text-lg leading-relaxed placeholder:text-[#A1A19A] focus:outline-none focus:bg-white focus:border-[#4A6D7C] focus:ring-1 focus:ring-[#4A6D7C] transition-all"
          />

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] font-mono text-[#717171] uppercase tracking-wider">
              {prompt.length} / 10,000 characters &bull; Gemini 3.6 Flash
            </span>

            <button
              id="btn-submit-initial-reflection"
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black rounded-full shadow-sm transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E5E5E1]" />
                  <span>Reflecting with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D1D1CB]" />
                  <span>Reflect with Gemini</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Multi-Turn Conversation Thread */
        <div className="space-y-8">
          {summary && (
            <div id="ai-summary-card" className="p-6 bg-[#F4F3F0] border-l-4 border-[#4A6D7C] border-y border-r border-[#E5E5E1] rounded-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#4A6D7C] mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#4A6D7C]" />
                <span>Executive Synthesis</span>
              </div>
              <p className="font-serif text-lg text-[#1A1A1A] italic leading-relaxed">&ldquo;{summary}&rdquo;</p>
            </div>
          )}

          <div id="conversation-thread" className="space-y-6">
            {turns.map((turn, index) => (
              <div
                key={index}
                className={`p-8 rounded-sm ${
                  turn.role === 'user'
                    ? 'bg-white border border-[#E5E5E1] shadow-xs'
                    : 'bg-[#F9F8F6] border-l-4 border-[#4A6D7C] border-y border-r border-[#E5E5E1] shadow-sm'
                }`}
              >
                {turn.role === 'user' ? (
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-[#E5E5E1] pb-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#717171]">
                        <UserIcon className="w-3.5 h-3.5 text-[#1A1A1A]" />
                        <span>Journal Entry</span>
                      </div>
                      <span className="text-[10px] text-[#A1A19A] uppercase tracking-wider font-mono">
                        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-serif text-lg leading-relaxed text-[#333333] italic whitespace-pre-wrap">
                      &ldquo;{turn.text}&rdquo;
                    </div>

                    <p className="text-[10px] font-bold uppercase text-[#A1A19A] tracking-wider mt-4">
                      &mdash; Your Reflection
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-[#E5E5E1] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#4A6D7C]"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A6D7C]">
                          Gemini Synthesis
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#E9E8E4] text-[#717171] font-mono uppercase tracking-wider">
                          {modelUsed}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#717171] uppercase tracking-wider font-mono">
                        {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-serif text-lg leading-relaxed text-[#1A1A1A] whitespace-pre-wrap">
                      {turn.text}
                    </div>

                    {/* Editorial Takeaway Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-5 border-t border-[#E5E5E1]">
                      <div className="p-4 bg-white border border-[#E5E5E1] rounded-sm">
                        <p className="text-[9px] font-bold uppercase mb-1 text-[#4A6D7C] tracking-widest">Key Insight</p>
                        <p className="text-xs text-[#333333] leading-relaxed">
                          Reflective synthesis extracted from your multi-turn entry.
                        </p>
                      </div>
                      <div className="p-4 bg-white border border-[#E5E5E1] rounded-sm">
                        <p className="text-[9px] font-bold uppercase mb-1 text-[#4A6D7C] tracking-widest">Next Step</p>
                        <p className="text-xs text-[#333333] leading-relaxed">
                          Ask a follow-up inquiry below to explore this thread deeper.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Follow-up / Continuing Turn Box */}
          <form onSubmit={handleFollowUpSubmit} className="bg-white border border-[#E5E5E1] rounded-sm p-6 shadow-xs">
            <label htmlFor="input-followup" className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#717171] mb-3">
              Inquire Deeper &bull; Continue the reflection
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="input-followup"
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                placeholder="Ask Gemini to elaborate, offer action steps, or explore a new question..."
                disabled={isGenerating}
                className="flex-1 bg-[#F4F3F0] border border-[#E5E5E1] px-6 py-3.5 rounded-full text-sm text-[#1A1A1A] placeholder:text-[#A1A19A] focus:ring-1 focus:ring-[#4A6D7C] focus:border-[#4A6D7C] outline-none font-medium"
              />
              <button
                id="btn-submit-followup"
                type="submit"
                disabled={isGenerating || !followUpText.trim()}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-[#1A1A1A] hover:bg-black rounded-full shadow-xs transition-colors disabled:opacity-50 shrink-0"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E5E5E1]" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
