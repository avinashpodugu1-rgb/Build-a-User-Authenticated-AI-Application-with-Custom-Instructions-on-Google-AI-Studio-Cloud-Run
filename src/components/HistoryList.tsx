import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Sparkles,
  Trash2,
  ArrowRight,
  BookOpen,
  Filter,
  Flame,
  Lightbulb,
  FileText,
  HelpCircle,
  Clock
} from 'lucide-react';
import { InteractionDocument, JournalMode } from '../types';

interface HistoryListProps {
  interactions: InteractionDocument[];
  onSelectInteraction: (interaction: InteractionDocument) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onNewReflection: () => void;
  isLoading: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  interactions,
  onSelectInteraction,
  onDeleteInteraction,
  onNewReflection,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMode =
        selectedModeFilter === 'all' || item.mode === selectedModeFilter;

      return matchesSearch && matchesMode;
    });
  }, [interactions, searchTerm, selectedModeFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this reflection entry? This action cannot be undone.')) {
      setDeletingId(id);
      try {
        await onDeleteInteraction(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getModeIcon = (mode: JournalMode) => {
    switch (mode) {
      case 'deep_reflection':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'brainstorm':
        return <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />;
      case 'summary':
        return <FileText className="w-3.5 h-3.5 text-emerald-500" />;
      case 'inquiry':
        return <HelpCircle className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const formatModeLabel = (mode: string) => {
    return mode.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div id="history-list-view" className="max-w-4xl mx-auto py-10 px-4 sm:px-6 font-sans">
      {/* Search and Filters Header */}
      <div className="bg-white border border-[#E5E5E1] rounded-sm p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-[#A1A19A] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="input-history-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search past reflections, themes, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-full bg-[#F4F3F0] border border-[#E5E5E1] text-[#1A1A1A] placeholder:text-[#A1A19A] focus:outline-none focus:ring-1 focus:ring-[#4A6D7C] font-medium"
            />
          </div>

          {/* Mode Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-[#717171] shrink-0" />
            <select
              id="select-mode-filter"
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value)}
              className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-full bg-[#F4F3F0] border border-[#E5E5E1] text-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#4A6D7C]"
            >
              <option value="all">All Modes ({interactions.length})</option>
              <option value="deep_reflection">Deep Reflection</option>
              <option value="brainstorm">Brainstorming</option>
              <option value="summary">Executive Summary</option>
              <option value="inquiry">Socratic Inquiry</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Content */}
      {isLoading ? (
        <div className="text-center py-20 bg-white border border-[#E5E5E1] rounded-sm shadow-xs">
          <div className="w-8 h-8 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#717171]">Querying isolated Firestore archive...</p>
        </div>
      ) : filteredInteractions.length === 0 ? (
        <div id="history-empty-state" className="text-center py-20 bg-white border border-[#E5E5E1] rounded-sm shadow-xs px-6">
          <div className="w-12 h-12 rounded-full bg-[#F4F3F0] flex items-center justify-center text-[#717171] mx-auto mb-4 border border-[#E5E5E1]">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-2xl italic text-[#1A1A1A]">
            {searchTerm || selectedModeFilter !== 'all' ? 'No matching entries found' : 'The archive is empty'}
          </h3>
          <p className="mt-2 text-xs text-[#717171] max-w-md mx-auto leading-relaxed uppercase tracking-wider">
            {searchTerm || selectedModeFilter !== 'all'
              ? 'Try modifying your search term or selecting all modes.'
              : 'Begin your first conversation or journal entry. Every reflection is isolated under your authenticated path.'}
          </p>
          <div className="mt-6">
            <button
              id="btn-empty-state-new-entry"
              onClick={onNewReflection}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5E5E1]" />
              <span>Begin a New Reflection</span>
            </button>
          </div>
        </div>
      ) : (
        <div id="history-items-grid" className="space-y-4">
          {filteredInteractions.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectInteraction(entry)}
              className="group bg-white border border-[#E5E5E1] hover:border-[#1A1A1A] hover:shadow-xs rounded-sm p-6 sm:p-8 transition-all cursor-pointer relative"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Mode & Date Meta */}
                  <div className="flex flex-wrap items-center gap-3 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm bg-[#E9E8E4] text-[#1A1A1A] border border-[#D1D1CB]">
                      {getModeIcon(entry.mode)}
                      <span>{formatModeLabel(entry.mode)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#717171] uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#A1A19A] uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>

                    {entry.turns && entry.turns.length > 2 && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-[#F4F3F0] text-[#4A6D7C] font-bold border border-[#E5E5E1]">
                        {entry.turns.length} turns
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-2xl text-[#1A1A1A] group-hover:text-[#4A6D7C] transition-colors leading-snug">
                    {entry.title}
                  </h3>

                  {/* Summary / Snippet */}
                  {entry.summary ? (
                    <p className="mt-2 font-serif text-base text-[#4A4A4A] line-clamp-2 italic leading-relaxed">
                      &ldquo;{entry.summary}&rdquo;
                    </p>
                  ) : (
                    <p className="mt-2 font-serif text-base text-[#4A4A4A] line-clamp-2 leading-relaxed">
                      {entry.prompt}
                    </p>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-[#F4F3F0] text-[#717171] border border-[#E5E5E1]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <button
                    id={`btn-delete-entry-${entry.id}`}
                    type="button"
                    onClick={(e) => handleDelete(e, entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete Entry"
                    className="p-2 text-[#A1A19A] hover:text-[#B83232] hover:bg-[#FDF2F2] rounded-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-full bg-[#F4F3F0] group-hover:bg-[#1A1A1A] group-hover:text-white flex items-center justify-center text-[#1A1A1A] transition-all">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
