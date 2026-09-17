import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, User, Award, X, Sparkles, Zap } from 'lucide-react';
import { Member } from '../types';
import { searchMembers } from '../api/client';

interface MemberLookupProps {
  selectedMember: Member | null;
  onSelectMember: (member: Member | null) => void;
  onOpenNewMember: () => void;
}

export const MemberLookup: React.FC<MemberLookupProps> = ({
  selectedMember,
  onSelectMember,
  onOpenNewMember
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const members = await searchMembers(query, 8);
        setResults(members);
        setIsOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (member: Member) => {
    onSelectMember(member);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelectMember(null);
    setQuery('');
    if (inputRef.current) inputRef.current.focus();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD':
        return 'bg-amber-400/10 text-amber-400 border-amber-400/30';
      case 'SILVER':
        return 'bg-slate-300/10 text-slate-200 border-slate-300/30';
      case 'BRONZE':
      default:
        return 'bg-amber-700/10 text-amber-600 border-amber-700/30';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Phone className="w-4 h-4 text-amber-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Look up member by phone number or name... (e.g. 555-123)"
          className="w-full pl-10 pr-20 py-2.5 bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 rounded-xl text-sm font-medium placeholder:text-slate-500 text-slate-100 transition-all outline-none"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {query ? (
            <button
              onClick={() => { setQuery(''); setIsOpen(false); }}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Instant
            </span>
          )}
        </div>
      </div>

      {/* Quick Demo Shortcuts Pill Row */}
      {!selectedMember && (
        <div className="flex items-center gap-2 mt-2 px-1 text-xs text-slate-400 overflow-x-auto pb-1">
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <Zap className="w-3 h-3 text-amber-400" /> Quick Test:
          </span>
          <button
            onClick={() => setQuery('5551234567')}
            className="px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-[11px] transition-colors"
          >
            Alice (Silver • 420 pts)
          </button>
          <button
            onClick={() => setQuery('5559876543')}
            className="px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-[11px] transition-colors"
          >
            Gerald (Gold • 1,350 pts)
          </button>
          <button
            onClick={() => setQuery('5554443322')}
            className="px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-[11px] transition-colors"
          >
            Sarah (Bronze 480/500 to Silver)
          </button>
        </div>
      )}

      {/* Search Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-50 divide-y divide-slate-800">
          {results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-950/60 text-[11px] font-semibold text-slate-400 flex justify-between">
                <span>Matching Members ({results.length})</span>
                <span>Live Balance</span>
              </div>
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-amber-400/10 group-hover:text-amber-400 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100 group-hover:text-amber-400 transition-colors">
                          {m.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getTierColor(m.tier)}`}>
                          {m.tier}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {m.formattedPhone}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-amber-400">
                      {m.currentBalance.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 block font-medium">points</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-slate-400">No member found with query "{query}"</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenNewMember();
                }}
                className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
              >
                + Register new member with this phone number
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
