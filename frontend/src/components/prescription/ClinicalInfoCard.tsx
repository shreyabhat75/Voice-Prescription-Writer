import React, { useState } from 'react';
import { Activity, Edit3, Check, ShieldAlert } from 'lucide-react';
import { ClinicalInfo } from '../../types';
import { EvidenceField } from './EvidenceField';

interface ClinicalInfoCardProps {
  clinical: ClinicalInfo;
  onChange: (updatedClinical: ClinicalInfo) => void;
  onSelectPhrase?: (phrase: string) => void;
  isGlobalEditMode?: boolean;
}

export const ClinicalInfoCard: React.FC<ClinicalInfoCardProps> = ({
  clinical,
  onChange,
  onSelectPhrase,
  isGlobalEditMode = false,
}) => {
  const [localEdit, setLocalEdit] = useState(false);
  const isEditing = isGlobalEditMode || localEdit;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Clinical Presentation & Diagnosis</h3>
            <p className="text-[11px] text-slate-400">Dictated symptoms, findings, and lab orders</p>
          </div>
        </div>

        {!isGlobalEditMode && (
          <button
            type="button"
            onClick={() => setLocalEdit(!localEdit)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              localEdit
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50 border border-slate-200'
            }`}
          >
            {localEdit ? (
              <>
                <Check className="w-3.5 h-3.5" /> Done Editing
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" /> Edit Clinical Info
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <EvidenceField
          label="Chief Complaints & Symptoms"
          evidence={clinical.chief_complaints}
          onChange={(newEv) => onChange({ ...clinical, chief_complaints: newEv })}
          placeholder="e.g. fever and body ache since 3 days"
          isEditMode={isEditing}
          onSelectPhrase={onSelectPhrase}
        />

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <EvidenceField
            label="Clinical Diagnosis"
            evidence={clinical.diagnosis}
            onChange={(newEv) => onChange({ ...clinical, diagnosis: newEv })}
            placeholder="Dictate or type confirmed clinical diagnosis..."
            isEditMode={isEditing}
            onSelectPhrase={onSelectPhrase}
          />
          {clinical.diagnosis.status === 'not_mentioned' && !isEditing && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-700">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                Safety Rule Active: Diagnosis was not explicitly stated in dictation and was left empty.
                Click &ldquo;Edit&rdquo; above to input diagnosis if desired.
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EvidenceField
            label="Lab & Imaging Investigations"
            evidence={clinical.investigations}
            onChange={(newEv) => onChange({ ...clinical, investigations: newEv })}
            placeholder="e.g. CBC, Chest X-ray, Sputum AFB"
            isEditMode={isEditing}
            onSelectPhrase={onSelectPhrase}
          />
          <EvidenceField
            label="Physician Advice & Diet"
            evidence={clinical.advice}
            onChange={(newEv) => onChange({ ...clinical, advice: newEv })}
            placeholder="e.g. steam inhalation, avoid cold food"
            isEditMode={isEditing}
            onSelectPhrase={onSelectPhrase}
          />
          <EvidenceField
            label="Follow-Up Schedule"
            evidence={clinical.follow_up}
            onChange={(newEv) => onChange({ ...clinical, follow_up: newEv })}
            placeholder="e.g. after 5 days with reports"
            isEditMode={isEditing}
            onSelectPhrase={onSelectPhrase}
          />
        </div>

        {clinical.unclear_phrases && clinical.unclear_phrases.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Unclear Non-Medical Remarks Detected (Flagged for Doctor Review):</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {clinical.unclear_phrases.map((phrase, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-amber-100/80 text-amber-800 border border-amber-300 font-mono text-[11px]"
                >
                  &ldquo;{phrase.value}&rdquo;
                </span>
              ))}
            </div>
            <p className="text-[10px] text-amber-700 italic">
              These remarks were excluded from clinical advice. Click &ldquo;Edit Clinical Info&rdquo; above to incorporate them if intended.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
