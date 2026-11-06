import React, { useState } from 'react';
import { HelpCircle, CheckCircle, Send } from 'lucide-react';
import { ClarificationQuestion } from '../../types';

interface ClarificationPanelProps {
  questions: ClarificationQuestion[];
  onAnswer: (field: string, answer: string, medicineIndex?: number) => void;
}

export const ClarificationPanel: React.FC<ClarificationPanelProps> = ({ questions, onAnswer }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  if (!questions || questions.length === 0) return null;

  const handleSubmit = (idx: number, q: ClarificationQuestion) => {
    const ans = answers[idx]?.trim();
    if (!ans) return;
    onAnswer(q.field, ans, q.medicine_index);
    setAnswered((prev) => new Set([...prev, idx]));
  };

  return (
    <div className="clinical-card p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <HelpCircle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-slate-800">Clarification Needed ({questions.length})</h3>
      </div>

      {questions.map((q, idx) => {
        const isAnswered = answered.has(idx);
        return (
          <div
            key={idx}
            className={`rounded-xl border p-3 space-y-2.5 transition-all ${
              isAnswered
                ? 'bg-emerald-50 border-emerald-200 opacity-75'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {isAnswered
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                : <HelpCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              }
              <div>
                <p className="text-xs font-semibold text-slate-700">{q.question}</p>
                {q.original_value && (
                  <p className="text-[10px] text-slate-500 italic mt-0.5">Heard: "{q.original_value}"</p>
                )}
              </div>
            </div>

            {!isAnswered && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={answers[idx] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(idx, q); }}
                  placeholder="Your answer…"
                  className="flex-1 text-xs border border-amber-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleSubmit(idx, q)}
                  disabled={!answers[idx]?.trim()}
                  className="p-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
