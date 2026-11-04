import React, { useState } from 'react';
import { Mic, Send, MessageSquare, Check, AlertCircle } from 'lucide-react';

interface VoiceEditPanelProps {
  onApplyCommand: (command: string) => Promise<any>;
}

export const VoiceEditPanel: React.FC<VoiceEditPanelProps> = ({ onApplyCommand }) => {
  const [command, setCommand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<Array<{ command: string; success: boolean; message: string }>>([]);

  const handleSubmit = async (cmdText?: string) => {
    const textToRun = cmdText || command;
    if (!textToRun.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await onApplyCommand(textToRun.trim());
      const audit = res.audit_entry || {};
      setHistory((prev) => [
        {
          command: textToRun,
          success: audit.success ?? true,
          message: audit.message || 'Command executed successfully.',
        },
        ...prev.slice(0, 4),
      ]);
      setCommand('');
    } catch (err: any) {
      setHistory((prev) => [
        {
          command: textToRun,
          success: false,
          message: err.response?.data?.detail || err.message || 'Failed to apply voice edit command.',
        },
        ...prev.slice(0, 4),
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleCommands = [
    'Change Dolo to 500',
    'Remove the second medicine',
    'Add Pan-D before breakfast for 5 days',
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-800">Voice Command Editing</h3>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder="Speak or type command (e.g. Change Dolo to 500mg)..."
          disabled={isSubmitting}
          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSubmitting || !command.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Apply
        </button>
      </div>

      <div>
        <p className="text-[11px] text-slate-400 mb-1.5">Quick Examples:</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleCommands.map((cmd, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSubmit(cmd)}
              className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              &ldquo;{cmd}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Recent Voice Edits:
          </p>
          {history.map((h, i) => (
            <div
              key={i}
              className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                h.success ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' : 'bg-rose-50 text-rose-900 border border-rose-100'
              }`}
            >
              {h.success ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold">&ldquo;{h.command}&rdquo;: </span>
                <span>{h.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

