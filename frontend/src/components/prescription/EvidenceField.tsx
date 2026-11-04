import React, { useState } from 'react';
import { Check, AlertTriangle, XCircle, Edit3, Info, CheckCheck } from 'lucide-react';
import { FieldStatus, SourceEvidence } from '../../types';

interface EvidenceFieldProps {
  label?: string;
  evidence: SourceEvidence;
  onChange: (newEvidence: SourceEvidence) => void;
  type?: 'text' | 'number' | 'select';
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  className?: string;
  isEditMode?: boolean;
  onSelectPhrase?: (sourceText: string) => void;
}

export const EvidenceField: React.FC<EvidenceFieldProps> = ({
  label,
  evidence,
  onChange,
  type = 'text',
  options,
  placeholder = 'Not mentioned',
  className = '',
  isEditMode = false,
  onSelectPhrase,
}) => {
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(evidence.value ?? '');

  const statusIcons: Record<FieldStatus, { icon: any; color: string; badge: string }> = {
    extracted: {
      icon: Check,
      color: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    doctor_corrected: {
      icon: Edit3,
      color: 'text-blue-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    needs_review: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    unclear: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    not_mentioned: {
      icon: XCircle,
      color: 'text-slate-400',
      badge: 'bg-slate-50 text-slate-500 border-slate-200',
    },
  };

  const statusConfig = statusIcons[evidence.status] || statusIcons.not_mentioned;
  const StatusIcon = statusConfig.icon;

  const handleSave = (valToSave?: any) => {
    setIsInlineEditing(false);
    const value = valToSave !== undefined ? valToSave : draftValue;
    if (value !== evidence.value) {
      onChange({
        ...evidence,
        value: value === '' ? null : value,
        status: 'doctor_corrected',
        confidence: 1.0,
      });
    }
  };

  // If in global edit mode or local inline editing
  const isEditing = isEditMode || isInlineEditing;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">{label}</label>
          <div className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${statusConfig.badge}`}
              title={evidence.source_text ? `Source phrase: "${evidence.source_text}"` : 'Status'}
            >
              <StatusIcon className="w-3 h-3" />
              <span className="capitalize">{evidence.status.replace('_', ' ')}</span>
            </span>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="flex items-center gap-1.5">
          {type === 'select' && options ? (
            <select
              value={draftValue}
              onChange={(e) => {
                setDraftValue(e.target.value);
                if (isEditMode) handleSave(e.target.value);
              }}
              onBlur={() => handleSave()}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            >
              <option value="">-- Select --</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              onBlur={() => handleSave()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setDraftValue(evidence.value ?? '');
                  setIsInlineEditing(false);
                }
              }}
              placeholder={placeholder}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              autoFocus={isInlineEditing}
            />
          )}
          {isInlineEditing && (
            <button
              type="button"
              onClick={() => handleSave()}
              className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
              title="Apply"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => {
            setDraftValue(evidence.value ?? '');
            setIsInlineEditing(true);
          }}
          className={`group flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
            evidence.status === 'not_mentioned'
              ? 'border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100'
              : evidence.status === 'doctor_corrected'
              ? 'border-blue-200 bg-blue-50/30 hover:bg-blue-50'
              : evidence.status === 'needs_review'
              ? 'border-amber-300 bg-amber-50/40 hover:bg-amber-50'
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
          title="Click to edit field directly"
        >
          <span
            className={
              evidence.value
                ? 'text-slate-900 font-medium'
                : 'text-slate-400 italic text-[11px]'
            }
          >
            {evidence.value ? String(evidence.value) : placeholder}
          </span>

          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
            {evidence.source_text && onSelectPhrase && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPhrase(evidence.source_text!);
                }}
                className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                title={`Spoken source text: "${evidence.source_text}"`}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}
            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
          </div>
        </div>
      )}

      {evidence.source_text && !isEditing && (
        <span className="text-[10px] text-slate-400 truncate px-0.5">
          Dictated: &ldquo;{evidence.source_text}&rdquo;
        </span>
      )}
    </div>
  );
};
