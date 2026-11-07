import React, { useState, useRef } from 'react';
import { SourceEvidence, FieldStatus } from '../../types';
import { Check, X } from 'lucide-react';

const STATUS_DOT: Record<FieldStatus, string> = {
  extracted:       'bg-emerald-500',
  doctor_corrected:'bg-blue-500',
  inferred:        'bg-indigo-500',
  unclear:         'bg-amber-500',
  needs_review:    'bg-amber-400',
  not_mentioned:   'bg-slate-300',
};

interface Option { label: string; value: string; }

interface EvidenceFieldProps {
  evidence: SourceEvidence;
  onChange: (updated: SourceEvidence) => void;
  placeholder?: string;
  isEditMode?: boolean;
  type?: 'text' | 'select';
  options?: Option[];
  onSelectPhrase?: (phrase: string) => void;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const EvidenceField: React.FC<EvidenceFieldProps> = ({
  evidence,
  onChange,
  placeholder = '—',
  isEditMode = false,
  type = 'text',
  options = [],
  onSelectPhrase,
  className = '',
  inputRef: externalInputRef,
}) => {
  const [localVal, setLocalVal] = useState(String(evidence.value ?? ''));
  const [editing, setEditing] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setLocalVal(String(evidence.value ?? ''));
    setEditing(true);
    setTimeout(() => {
      (externalInputRef?.current ?? internalRef.current)?.focus();
    }, 0);
  };

  const commit = () => {
    setEditing(false);
    onChange({ ...evidence, value: localVal, status: 'doctor_corrected', confidence: 1.0 });
  };

  const cancel = () => {
    setEditing(false);
    setLocalVal(String(evidence.value ?? ''));
  };

  const displayVal = evidence.value != null && evidence.value !== '' ? String(evidence.value) : null;
  const dot = STATUS_DOT[evidence.status] ?? STATUS_DOT.not_mentioned;

  // READ MODE
  if (!isEditMode && !editing) {
    return (
      <div
        className={`flex items-center gap-1.5 group cursor-pointer min-h-[22px] ${className}`}
        onClick={startEdit}
        title={evidence.source_text ? `Source: "${evidence.source_text}"` : 'Click to edit'}
      >
        <span className={`evidence-dot flex-shrink-0 ${dot}`} />
        {displayVal ? (
          <span
            className="text-xs text-slate-800 font-medium hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (evidence.source_text && onSelectPhrase) onSelectPhrase(evidence.source_text);
            }}
          >
            {displayVal}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 italic">{placeholder}</span>
        )}
      </div>
    );
  }

  // EDIT MODE — select
  if (type === 'select') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <span className={`evidence-dot flex-shrink-0 ${dot}`} />
        <select
          value={String(evidence.value ?? '')}
          onChange={(e) => onChange({ ...evidence, value: e.target.value, status: 'doctor_corrected', confidence: 1.0 })}
          className="text-xs text-slate-800 bg-white border border-blue-400 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
          autoFocus
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // EDIT MODE — text
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className={`evidence-dot flex-shrink-0 ${dot}`} />
      <input
        ref={externalInputRef as React.RefObject<HTMLInputElement> ?? internalRef}
        type="text"
        value={localVal}
        onChange={(e) => setLocalVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') cancel();
        }}
        className="text-xs text-slate-800 bg-white border border-blue-400 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
        placeholder={placeholder}
        autoFocus={!externalInputRef}
      />
      <button type="button" onClick={commit} className="p-0.5 text-emerald-600 hover:text-emerald-700 cursor-pointer flex-shrink-0">
        <Check className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={cancel} className="p-0.5 text-slate-400 hover:text-red-500 cursor-pointer flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
