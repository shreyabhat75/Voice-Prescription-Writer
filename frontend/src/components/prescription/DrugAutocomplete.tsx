import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDrugSearch } from '../../hooks/useDrugSearch';
import { Search } from 'lucide-react';

interface DrugAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (drugName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-blue-700">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export const DrugAutocomplete: React.FC<DrugAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Drug name…',
  autoFocus = false,
  inputRef: externalRef,
}) => {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = (externalRef as React.RefObject<HTMLInputElement>) || internalRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, loading } = useDrugSearch(open ? value : '');

  useEffect(() => {
    if (results.length > 0 && value.length >= 2) setOpen(true);
    else setOpen(false);
    setCursor(-1);
  }, [results, value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (cursor >= 0 && results[cursor]) {
        e.preventDefault();
        onSelect(results[cursor]);
        onChange(results[cursor]);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }, [open, cursor, results, onSelect, onChange]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (value.length >= 2 && results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-400"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        {!loading && value.length >= 2 && (
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 pointer-events-none" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="autocomplete-dropdown animate-in" role="listbox">
          {results.map((drug, idx) => (
            <div
              key={drug}
              role="option"
              aria-selected={idx === cursor}
              className={`autocomplete-item ${idx === cursor ? 'selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(drug);
                onChange(drug);
                setOpen(false);
              }}
            >
              {highlightMatch(drug, value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
