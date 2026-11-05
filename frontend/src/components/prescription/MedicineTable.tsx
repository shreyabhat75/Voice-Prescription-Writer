import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Pill, Plus, Trash2, Check, X, ShieldAlert } from 'lucide-react';
import { MedicineItem, SourceEvidence } from '../../types';
import { EvidenceField } from './EvidenceField';
import { DrugAutocomplete } from './DrugAutocomplete';
import { CandidatePill } from './CandidatePill';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

const FORM_OPTIONS = [
  { label: 'Tablet', value: 'tablet' },
  { label: 'Capsule', value: 'capsule' },
  { label: 'Syrup', value: 'syrup' },
  { label: 'Injection', value: 'injection' },
  { label: 'Inhaler / Respule', value: 'inhaler' },
  { label: 'Drops', value: 'drops' },
  { label: 'Ointment', value: 'ointment' },
  { label: 'Sachet', value: 'sachet' },
  { label: 'IV Fluid', value: 'iv fluid' },
  { label: 'Nebulization', value: 'nebulization' },
];

const FREQUENCY_OPTIONS = [
  { label: 'OD — Once Daily', value: 'OD' },
  { label: 'BD — Twice Daily', value: 'BD' },
  { label: 'TDS — Three Times Daily', value: 'TDS' },
  { label: 'QID — Four Times Daily', value: 'QID' },
  { label: 'HS — At Bedtime', value: 'HS' },
  { label: 'SOS — As Needed', value: 'SOS' },
  { label: 'STAT — Immediately', value: 'STAT' },
  { label: '1-0-1 (Morning & Night)', value: '1-0-1' },
  { label: '1-1-1 (Morning, Noon, Night)', value: '1-1-1' },
  { label: '1-0-0 (Morning Only)', value: '1-0-0' },
  { label: '0-0-1 (Night Only)', value: '0-0-1' },
];

const TIMING_OPTIONS = [
  { label: 'Before Food (AC)', value: 'before food (AC)' },
  { label: 'After Food (PC)', value: 'after food (PC)' },
  { label: 'Before Breakfast', value: 'before breakfast (AC)' },
  { label: 'With Meals', value: 'with food' },
  { label: 'On Empty Stomach', value: 'empty stomach' },
  { label: 'At Bedtime', value: 'at bedtime' },
  { label: 'When Required', value: 'when required' },
];

const ROUTE_OPTIONS = [
  { label: 'Oral', value: 'oral' },
  { label: 'Intravenous (IV)', value: 'intravenous' },
  { label: 'Intramuscular (IM)', value: 'intramuscular' },
  { label: 'Inhalation', value: 'inhalation' },
  { label: 'Nebulization', value: 'nebulization' },
  { label: 'Sublingual', value: 'sublingual' },
  { label: 'Topical', value: 'topical' },
];

function emptyMed(): MedicineItem {
  const ev = (val = ''): SourceEvidence => ({ value: val, source_text: null, status: 'doctor_corrected', confidence: 1.0 });
  return {
    name: ev(''), strength: ev(''), form: ev('tablet'),
    dose: ev('1 tablet'), frequency: ev('OD'), frequency_normalized: 'Once Daily (OD)',
    timing: ev('after food (PC)'), duration: ev(''), route: ev('oral'), special_instructions: null,
  };
}

interface MedicineTableProps {
  medicines: MedicineItem[];
  onChange: (meds: MedicineItem[]) => void;
  onSelectPhrase?: (phrase: string) => void;
  isGlobalEditMode?: boolean;
}

export const MedicineTable: React.FC<MedicineTableProps> = ({
  medicines, onChange, onSelectPhrase, isGlobalEditMode = false,
}) => {
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [deletingRowIdx, setDeletingRowIdx] = useState<number | null>(null);
  const [drugNameValues, setDrugNameValues] = useState<string[]>(() => medicines.map((m) => String(m.name.value ?? '')));
  const drugNameRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync drug name input values when medicines change externally
  useEffect(() => {
    setDrugNameValues(medicines.map((m) => String(m.name.value ?? '')));
  }, [medicines.length]);

  const update = useCallback((index: number, med: MedicineItem) => {
    const copy = [...medicines];
    copy[index] = med;
    onChange(copy);
  }, [medicines, onChange]);

  const handleAddMedicine = useCallback(() => {
    const newMed = emptyMed();
    onChange([...medicines, newMed]);
    const newIdx = medicines.length;
    setEditingRowIdx(newIdx);
    setDrugNameValues((prev) => [...prev, '']);
    setTimeout(() => drugNameRefs.current[newIdx]?.focus(), 80);
  }, [medicines, onChange]);

  const handleRemove = (idx: number) => {
    onChange(medicines.filter((_, i) => i !== idx));
    setDrugNameValues((prev) => prev.filter((_, i) => i !== idx));
    if (editingRowIdx === idx) setEditingRowIdx(null);
    setDeletingRowIdx(null);
  };

  // Alt+N global shortcut
  useKeyboardShortcut('Alt+N', handleAddMedicine);

  const isRowEditing = (idx: number) => isGlobalEditMode || editingRowIdx === idx;

  return (
    <div className="clinical-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Medication Orders ({medicines.length})
            </h3>
            <p className="text-[10px] text-slate-400">
              Inline edit · <kbd className="kbd-hint">Alt+N</kbd> add row · <kbd className="kbd-hint">Tab</kbd> navigate · <kbd className="kbd-hint">Enter</kbd> commit · <kbd className="kbd-hint">Esc</kbd> cancel
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddMedicine}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Add medication (Alt+N)"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Medication
        </button>
      </div>

      {medicines.length === 0 ? (
        <div className="py-12 text-center space-y-3 border-2 border-dashed border-slate-200 rounded-xl">
          <Pill className="w-8 h-8 text-slate-200 mx-auto" />
          <p className="text-sm font-semibold text-slate-500">No medications prescribed yet</p>
          <p className="text-xs text-slate-400">
            Click "Add Medication" or press <kbd className="kbd-hint">Alt+N</kbd>
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-left border-collapse" style={{ minWidth: 820 }}>
            <thead>
              <tr className="border-b border-slate-200">
                <th className="clinical-th w-8">#</th>
                <th className="clinical-th w-44">Drug Name</th>
                <th className="clinical-th w-24">Strength</th>
                <th className="clinical-th w-28">Form</th>
                <th className="clinical-th w-20">Dose</th>
                <th className="clinical-th w-32">Route</th>
                <th className="clinical-th w-36">Frequency</th>
                <th className="clinical-th w-32">Timing</th>
                <th className="clinical-th w-24">Duration</th>
                <th className="clinical-th w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {medicines.map((med, idx) => {
                const rowEditing = isRowEditing(idx);
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${rowEditing ? 'bg-blue-50/40 border-l-medical' : 'hover:bg-slate-50/60'}`}
                  >
                    {/* # */}
                    <td className="py-3 px-3 text-xs font-bold text-slate-400 font-tabular">{idx + 1}</td>

                    {/* Drug Name + Autocomplete + Candidates */}
                    <td className="py-3 px-3">
                      {rowEditing ? (
                        <DrugAutocomplete
                          value={drugNameValues[idx] ?? String(med.name.value ?? '')}
                          onChange={(val) => {
                            const copy = [...drugNameValues];
                            copy[idx] = val;
                            setDrugNameValues(copy);
                          }}
                          onSelect={(drug) => {
                            const copy = [...drugNameValues];
                            copy[idx] = drug;
                            setDrugNameValues(copy);
                            update(idx, { ...med, name: { value: drug, source_text: null, status: 'doctor_corrected', confidence: 1.0 }, candidate_matches: [] });
                          }}
                          inputRef={{ current: drugNameRefs.current[idx] } as React.RefObject<HTMLInputElement | null>}
                        />
                      ) : (
                        <div className="space-y-1">
                          <EvidenceField
                            evidence={med.name}
                            onChange={(ev) => update(idx, { ...med, name: ev })}
                            placeholder="Drug name"
                            isEditMode={false}
                            onSelectPhrase={onSelectPhrase}
                          />
                          {med.raw_phrase && med.raw_phrase !== med.name.value && (
                            <p className="text-[10px] text-slate-400 italic truncate max-w-[180px]" title={med.raw_phrase}>
                              Spoken: "{med.raw_phrase}"
                            </p>
                          )}
                        </div>
                      )}
                      {/* Candidate pills */}
                      {med.candidate_matches && med.candidate_matches.length > 0 && med.name.status === 'needs_review' && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[9px] font-semibold text-amber-700">Suggestions:</span>
                          {med.candidate_matches.map((cand) => (
                            <CandidatePill
                              key={cand}
                              candidate={cand}
                              onConfirm={(name) => {
                                const copy = [...drugNameValues];
                                copy[idx] = name;
                                setDrugNameValues(copy);
                                update(idx, { ...med, name: { value: name, source_text: null, status: 'doctor_corrected', confidence: 1.0 }, candidate_matches: [] });
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Strength */}
                    <td className="py-3 px-3 font-tabular">
                      <EvidenceField evidence={med.strength} onChange={(ev) => update(idx, { ...med, strength: ev })} placeholder="e.g. 500mg" isEditMode={rowEditing} onSelectPhrase={onSelectPhrase} />
                    </td>

                    {/* Form */}
                    <td className="py-3 px-3">
                      <EvidenceField evidence={med.form} type="select" options={FORM_OPTIONS} onChange={(ev) => update(idx, { ...med, form: ev })} placeholder="Form" isEditMode={rowEditing} onSelectPhrase={onSelectPhrase} />
                    </td>

                    {/* Dose */}
                    <td className="py-3 px-3 font-tabular">
                      <EvidenceField evidence={med.dose} onChange={(ev) => update(idx, { ...med, dose: ev })} placeholder="1 tab" isEditMode={rowEditing} onSelectPhrase={onSelectPhrase} />
                    </td>

                    {/* Route */}
                    <td className="py-3 px-3">
                      <EvidenceField evidence={med.route} type="select" options={ROUTE_OPTIONS} onChange={(ev) => update(idx, { ...med, route: ev })} placeholder="Route" isEditMode={rowEditing} onSelectPhrase={onSelectPhrase} />
                    </td>

                    {/* Frequency */}
                    <td className="py-3 px-3">
                      <EvidenceField
                        evidence={med.frequency}
                        type="select"
                        options={FREQUENCY_OPTIONS}
                        onChange={(ev) => update(idx, { ...med, frequency: ev, frequency_normalized: ev.value })}
                        placeholder="Frequency"
                        isEditMode={rowEditing}
                        onSelectPhrase={onSelectPhrase}
                      />
                      {med.frequency_normalized && !rowEditing && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold border border-slate-200 font-tabular">
                          {med.frequency_normalized}
                        </span>
                      )}
                    </td>

                    {/* Timing */}
                    <td className="py-3 px-3">
                      <EvidenceField evidence={med.timing} type="select" options={TIMING_OPTIONS} onChange={(ev) => update(idx, { ...med, timing: ev })} placeholder="Timing" isEditMode={rowEditing} onSelectPhrase={onSelectPhrase} />
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-3 font-tabular">
                      <EvidenceField evidence={med.duration} onChange={(ev) => update(idx, { ...med, duration: ev })} placeholder="e.g. 5 days" isEditMode={rowEditing} onSelectPhrase={onSelectPhrase} />
                      {med.duration.status === 'not_mentioned' && !rowEditing && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-slate-400 italic">
                          <ShieldAlert className="w-3 h-3" /> Unspecified
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Row edit toggle */}
                        {!isGlobalEditMode && (
                          <button
                            type="button"
                            onClick={() => {
                              if (editingRowIdx === idx) {
                                // commit drug name on close
                                if (drugNameValues[idx] !== undefined) {
                                  update(idx, { ...med, name: { value: drugNameValues[idx], source_text: null, status: 'doctor_corrected', confidence: 1.0 } });
                                }
                                setEditingRowIdx(null);
                              } else {
                                setEditingRowIdx(idx);
                              }
                            }}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              editingRowIdx === idx
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={editingRowIdx === idx ? 'Done editing' : 'Edit row'}
                          >
                            {editingRowIdx === idx ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">Edit</span>}
                          </button>
                        )}

                        {/* Delete with inline confirmation */}
                        {deletingRowIdx === idx ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemove(idx)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-600 text-white cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingRowIdx(null)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingRowIdx(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete medication"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
