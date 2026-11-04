import React, { useState } from 'react';
import { Pill, Plus, Trash2, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { MedicineItem, SourceEvidence } from '../../types';
import { EvidenceField } from './EvidenceField';

interface MedicineTableProps {
  medicines: MedicineItem[];
  onChange: (updatedMedicines: MedicineItem[]) => void;
  onSelectPhrase?: (phrase: string) => void;
  isGlobalEditMode?: boolean;
}

const FORM_OPTIONS = [
  { label: 'Tablet (Tab)', value: 'tablet' },
  { label: 'Capsule (Cap)', value: 'capsule' },
  { label: 'Syrup (Syp)', value: 'syrup' },
  { label: 'Injection (Inj)', value: 'injection' },
  { label: 'Inhaler / Respule', value: 'inhaler' },
  { label: 'Drops', value: 'drops' },
  { label: 'Ointment', value: 'ointment' },
  { label: 'Sachet', value: 'sachet' },
  { label: 'IV Fluid', value: 'iv fluid' },
];

const FREQUENCY_OPTIONS = [
  { label: 'OD - Once Daily (1x/day)', value: 'OD' },
  { label: 'BD - Twice Daily (2x/day)', value: 'BD' },
  { label: 'TDS - Three Times Daily (3x/day)', value: 'TDS' },
  { label: 'QID - Four Times Daily (4x/day)', value: 'QID' },
  { label: 'HS - At Bedtime (Night)', value: 'HS' },
  { label: 'SOS - As Needed / For Pain', value: 'SOS' },
  { label: 'STAT - Immediately (Single Dose)', value: 'STAT' },
  { label: '1-0-1 (Morning & Night)', value: '1-0-1' },
  { label: '1-1-1 (Morning, Noon, Night)', value: '1-1-1' },
  { label: '1-0-0 (Morning Only)', value: '1-0-0' },
  { label: '0-0-1 (Night Only)', value: '0-0-1' },
];

const TIMING_OPTIONS = [
  { label: 'Before Food (AC)', value: 'before food (AC)' },
  { label: 'After Food (PC)', value: 'after food (PC)' },
  { label: 'Before Breakfast (AC)', value: 'before breakfast (AC)' },
  { label: 'With Meals', value: 'with food' },
  { label: 'On Empty Stomach', value: 'empty stomach' },
  { label: 'At Bedtime', value: 'at bedtime' },
  { label: 'When Required', value: 'when required' },
];

const ROUTE_OPTIONS = [
  { label: 'Oral (By Mouth)', value: 'oral' },
  { label: 'Intravenous (IV)', value: 'intravenous' },
  { label: 'Intramuscular (IM)', value: 'intramuscular' },
  { label: 'Inhalation', value: 'inhalation' },
  { label: 'Nebulization', value: 'nebulization' },
  { label: 'Sublingual', value: 'sublingual' },
  { label: 'Topical', value: 'topical' },
];

export const MedicineTable: React.FC<MedicineTableProps> = ({
  medicines,
  onChange,
  onSelectPhrase,
  isGlobalEditMode = false,
}) => {
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);

  const handleUpdateMedicine = (index: number, updatedItem: MedicineItem) => {
    const copy = [...medicines];
    copy[index] = updatedItem;
    onChange(copy);
  };

  const handleRemoveMedicine = (index: number) => {
    const copy = medicines.filter((_, idx) => idx !== index);
    onChange(copy);
    if (editingRowIdx === index) setEditingRowIdx(null);
  };

  const handleAddMedicine = () => {
    const newMed: MedicineItem = {
      name: { value: 'New Medicine', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      strength: { value: '500mg', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      form: { value: 'tablet', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      dose: { value: '1 tablet', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      frequency: { value: 'OD', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      frequency_normalized: 'Once Daily (OD)',
      timing: { value: 'after food (PC)', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      duration: { value: '5 days', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      route: { value: 'oral', source_text: null, status: 'doctor_corrected', confidence: 1.0 },
      special_instructions: null,
    };
    onChange([...medicines, newMed]);
    setEditingRowIdx(medicines.length);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all">
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Medication Orders ({medicines.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Directly editable prescription table with medical shorthand codes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddMedicine}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Medication
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="py-10 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
          <Pill className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-600">No medications currently prescribed</p>
          <p className="text-xs text-slate-400">Click &ldquo;Add Medication&rdquo; above to insert a new drug order.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                <th className="py-2.5 px-3 w-10">#</th>
                <th className="py-2.5 px-3 w-40">Drug Name</th>
                <th className="py-2.5 px-3 w-24">Strength</th>
                <th className="py-2.5 px-3 w-28">Form</th>
                <th className="py-2.5 px-3 w-28">Dose / Route</th>
                <th className="py-2.5 px-3 w-44">Frequency / Shorthand</th>
                <th className="py-2.5 px-3 w-36">Timing</th>
                <th className="py-2.5 px-3 w-28">Duration</th>
                <th className="py-2.5 px-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {medicines.map((med, idx) => {
                const isRowEditing = isGlobalEditMode || editingRowIdx === idx;

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isRowEditing ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>

                    {/* Drug Name */}
                    <td className="py-3 px-3 space-y-1">
                      <EvidenceField
                        evidence={med.name}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, name: newEv })
                        }
                        placeholder="Drug name"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                      {med.raw_phrase && med.raw_phrase !== med.name.value && (
                        <p className="text-[10px] text-slate-400 italic truncate max-w-[180px]" title={med.raw_phrase}>
                          Spoken: &ldquo;{med.raw_phrase}&rdquo;
                        </p>
                      )}
                      {med.candidate_matches && med.candidate_matches.length > 0 && med.name.status === 'needs_review' && (
                        <div className="flex flex-wrap gap-1 items-center pt-0.5">
                          <span className="text-[9px] font-semibold text-amber-700">Suggestions:</span>
                          {med.candidate_matches.map((cand) => (
                            <button
                              key={cand}
                              type="button"
                              onClick={() => {
                                handleUpdateMedicine(idx, {
                                  ...med,
                                  name: {
                                    ...med.name,
                                    value: cand,
                                    status: 'doctor_corrected',
                                    confidence: 1.0,
                                  },
                                  candidate_matches: [],
                                });
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium transition-colors cursor-pointer"
                              title={`Click to confirm ${cand}`}
                            >
                              {cand} ✓
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Strength */}
                    <td className="py-3 px-3">
                      <EvidenceField
                        evidence={med.strength}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, strength: newEv })
                        }
                        placeholder="e.g. 500mg"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                    </td>

                    {/* Form */}
                    <td className="py-3 px-3">
                      <EvidenceField
                        evidence={med.form}
                        type="select"
                        options={FORM_OPTIONS}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, form: newEv })
                        }
                        placeholder="Form"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                    </td>

                    {/* Dose & Route */}
                    <td className="py-3 px-3 space-y-1.5">
                      <EvidenceField
                        evidence={med.dose}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, dose: newEv })
                        }
                        placeholder="1 tablet"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                      <EvidenceField
                        evidence={med.route}
                        type="select"
                        options={ROUTE_OPTIONS}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, route: newEv })
                        }
                        placeholder="Route"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                    </td>

                    {/* Frequency */}
                    <td className="py-3 px-3">
                      <EvidenceField
                        evidence={med.frequency}
                        type="select"
                        options={FREQUENCY_OPTIONS}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, {
                            ...med,
                            frequency: newEv,
                            frequency_normalized: newEv.value,
                          })
                        }
                        placeholder="Select frequency"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                      {med.frequency_normalized && !isRowEditing && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {med.frequency_normalized}
                        </span>
                      )}
                    </td>

                    {/* Timing */}
                    <td className="py-3 px-3">
                      <EvidenceField
                        evidence={med.timing}
                        type="select"
                        options={TIMING_OPTIONS}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, timing: newEv })
                        }
                        placeholder="Meal timing"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3">
                      <EvidenceField
                        evidence={med.duration}
                        onChange={(newEv) =>
                          handleUpdateMedicine(idx, { ...med, duration: newEv })
                        }
                        placeholder="Leave empty if omitted"
                        isEditMode={isRowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                      {med.duration.status === 'not_mentioned' && !isRowEditing && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-slate-400 italic">
                          <ShieldAlert className="w-3 h-3 text-slate-400" />
                          Unspecified
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isGlobalEditMode && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRowIdx(editingRowIdx === idx ? null : idx)
                            }
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              editingRowIdx === idx
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={editingRowIdx === idx ? 'Done' : 'Edit Row'}
                          >
                            {editingRowIdx === idx ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Edit2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Medicine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
