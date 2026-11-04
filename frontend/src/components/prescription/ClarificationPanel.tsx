import React, { useState } from 'react';
import { HelpCircle, Send } from 'lucide-react';
import { ClarificationQuestion } from '../../types';

interface ClarificationPanelProps {
  questions: ClarificationQuestion[];
  onAnswer: (field: string, answer: string, medicineIndex?: number) => void;
}

export const ClarificationPanel: React.FC<ClarificationPanelProps> = ({
  questions,
  onAnswer,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (questions.length === 0) return null;

  const handleSubmit = (q: ClarificationQuestion) => {
    const key = `${q.field}_${q.medicine_index ?? ''}`;
    const ans = answers[key]?.trim();
    if (ans) {
      onAnswer(q.field, ans, q.medicine_index);
      setAnswers((prev) => ({ ...prev, [key]: '' }));
    }
  };

  return (
    <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">
          System Clarification Queries ({questions.length})
        </h3>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const key = `${q.field}_${q.medicine_index ?? ''}`;

          return (
            <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
              <p className="text-xs text-indigo-950 font-medium mb-2">{q.question}</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Doctor's response (e.g. 500mg, 5 days)..."
                  value={answers[key] || ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit(q);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleSubmit(q)}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer"
                  title="Submit clarification"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

