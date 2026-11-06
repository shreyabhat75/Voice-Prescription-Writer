import React, { useState } from 'react';
import { Mic, Send, Command } from 'lucide-react';

const EXAMPLE_COMMANDS = [
  'Change Dolo to 500mg',
  'Remove second medicine',
  'Set duration to 7 days for all',
  'Add Pantoprazole 40mg OD',
];

interface VoiceEditPanelProps {
  onApplyCommand: (command: string) => Promise<any>;
}

export const VoiceEditPanel: React.FC<VoiceEditPanelProps> = ({ onApplyCommand }) => {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (cmd = command) => {
    const trimmed = cmd.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setResult(null);
    try {
      await onApplyCommand(trimmed);
      setRecentCommands((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)].slice(0, 5));
      setCommand('');
      setResult('Command applied successfully.');
    } catch {
      setResult('Command failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clinical-card p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Command className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-slate-800">Voice Edit Commands</h3>
      </div>

      {/* Text input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="e.g. Change Dolo to 500mg…"
          className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!command.trim() || loading}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Result */}
      {result && (
        <p className={`text-[11px] font-medium ${result.includes('failed') ? 'text-red-600' : 'text-emerald-600'}`}>
          {result}
        </p>
      )}

      {/* Example commands */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Examples</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_COMMANDS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setCommand(ex); handleSubmit(ex); }}
              className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Recent */}
      {recentCommands.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Recent</p>
          <div className="flex flex-wrap gap-1.5">
            {recentCommands.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => { setCommand(cmd); }}
                className="px-2 py-1 rounded-md text-[10px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
