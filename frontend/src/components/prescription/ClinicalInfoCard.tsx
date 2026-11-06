import React from 'react';
import { Clipboard } from 'lucide-react';
import { ClinicalInfo } from '../../types';
import { EvidenceField } from './EvidenceField';

interface ClinicalInfoCardProps {
  clinical: ClinicalInfo;
  onChange: (c: ClinicalInfo) => void;
  onSelectPhrase?: (phrase: string) => void;
  isGlobalEditMode?: boolean;
}

const FIELD_LABELS: { key: keyof ClinicalInfo; label: string; placeholder: string }[] = [
  { key: 'chief_complaints', label: 'Chief Complaints',    placeholder: 'e.g. fever, cough' },
  { key: 'diagnosis',        label: 'Diagnosis',           placeholder: 'Clinical diagnosis' },
  { key: 'investigations',   label: 'Investigations',      placeholder: 'CBC, X-ray, etc.' },
  { key: 'advice',           label: 'Advice',              placeholder: 'Patient instructions' },
  { key: 'follow_up',        label: 'Follow-up',           placeholder: 'e.g. After 5 days' },
];

export const ClinicalInfoCard: React.FC<ClinicalInfoCardProps> = ({
  clinical, onChange, onSelectPhrase, isGlobalEditMode = false,
}) => {
  return (
    <div className="clinical-card p-4">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <Clipboard className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Clinical Information</h3>
          <p className="text-[10px] text-slate-400">Source-grounded fields — click to edit</p>
        </div>
      </div>

      <div className="space-y-3">
        {FIELD_LABELS.map(({ key, label, placeholder }) => {
          const ev = clinical[key];
          if (!ev || Array.isArray(ev)) return null;
          return (
            <div key={key} className="flex gap-3 items-start group">
              <label className="w-28 text-[10px] font-semibold text-slate-500 uppercase tracking-wider pt-1.5 flex-shrink-0">
                {label}
              </label>
              <div className="flex-1">
                <EvidenceField
                  evidence={ev}
                  onChange={(newEv) => onChange({ ...clinical, [key]: newEv })}
                  placeholder={placeholder}
                  isEditMode={isGlobalEditMode}
                  onSelectPhrase={onSelectPhrase}
                />
                {ev.source_text && !isGlobalEditMode && (
                  <details className="mt-1">
                    <summary className="text-[9px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                      Source evidence
                    </summary>
                    <p className="text-[10px] text-slate-500 italic mt-1 pl-2 border-l-2 border-slate-200">
                      "{ev.source_text}"
                    </p>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
