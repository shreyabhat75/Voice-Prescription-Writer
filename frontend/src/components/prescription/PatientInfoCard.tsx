import React, { useState } from 'react';
import { User, Edit3, Check, X } from 'lucide-react';
import { PatientInfo } from '../../types';
import { EvidenceField } from './EvidenceField';

interface PatientInfoCardProps {
  patient: PatientInfo;
  onChange: (updatedPatient: PatientInfo) => void;
  onSelectPhrase?: (phrase: string) => void;
  isGlobalEditMode?: boolean;
}

export const PatientInfoCard: React.FC<PatientInfoCardProps> = ({
  patient,
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
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Patient Demographics</h3>
            <p className="text-[11px] text-slate-400">Basic patient information</p>
          </div>
        </div>

        {!isGlobalEditMode && (
          <button
            type="button"
            onClick={() => setLocalEdit(!localEdit)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              localEdit
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200'
            }`}
          >
            {localEdit ? (
              <>
                <Check className="w-3.5 h-3.5" /> Done Editing
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" /> Edit Patient
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EvidenceField
          label="Full Name"
          evidence={patient.name}
          onChange={(newEv) => onChange({ ...patient, name: newEv })}
          placeholder="e.g. Ramesh Kumar"
          isEditMode={isEditing}
          onSelectPhrase={onSelectPhrase}
        />
        <EvidenceField
          label="Age (Years)"
          type="number"
          evidence={patient.age}
          onChange={(newEv) => onChange({ ...patient, age: newEv })}
          placeholder="e.g. 45"
          isEditMode={isEditing}
          onSelectPhrase={onSelectPhrase}
        />
        <EvidenceField
          label="Sex"
          type="select"
          options={[
            { label: 'Male', value: 'male' },
            { label: 'Female', value: 'female' },
            { label: 'Other', value: 'other' },
          ]}
          evidence={patient.sex}
          onChange={(newEv) => onChange({ ...patient, sex: newEv })}
          placeholder="Select sex"
          isEditMode={isEditing}
          onSelectPhrase={onSelectPhrase}
        />
      </div>
    </div>
  );
};
