import React from 'react';
import { User } from 'lucide-react';
import { PatientInfo } from '../../types';
import { EvidenceField } from './EvidenceField';

const SEX_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

interface PatientInfoCardProps {
  patient: PatientInfo;
  onChange: (p: PatientInfo) => void;
  onSelectPhrase?: (phrase: string) => void;
  isGlobalEditMode?: boolean;
}

export const PatientInfoCard: React.FC<PatientInfoCardProps> = ({
  patient, onChange, onSelectPhrase, isGlobalEditMode = false,
}) => {
  return (
    <div className="clinical-card p-4">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Patient Demographics</h3>
          <p className="text-[10px] text-slate-400">Click any field to edit inline</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Patient Name
          </label>
          <EvidenceField
            evidence={patient.name}
            onChange={(ev) => onChange({ ...patient, name: ev })}
            placeholder="Full name"
            isEditMode={isGlobalEditMode}
            onSelectPhrase={onSelectPhrase}
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Age
          </label>
          <EvidenceField
            evidence={patient.age}
            onChange={(ev) => onChange({ ...patient, age: ev })}
            placeholder="Years"
            isEditMode={isGlobalEditMode}
            onSelectPhrase={onSelectPhrase}
            className="font-tabular"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Sex
            <span className="ml-1 text-[9px] text-slate-400 normal-case font-normal">(never inferred)</span>
          </label>
          <EvidenceField
            evidence={patient.sex}
            onChange={(ev) => onChange({ ...patient, sex: ev })}
            placeholder="Not stated"
            isEditMode={isGlobalEditMode}
            type="select"
            options={SEX_OPTIONS}
            onSelectPhrase={onSelectPhrase}
          />
        </div>
      </div>

      {/* Evidence legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-50">
        {[
          { dot: 'bg-emerald-500', label: 'Extracted' },
          { dot: 'bg-amber-400',   label: 'Needs review' },
          { dot: 'bg-blue-500',    label: 'Doctor edited' },
          { dot: 'bg-slate-300',   label: 'Not mentioned' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${item.dot}`} />
            <span className="text-[10px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
