import { useEffect } from 'react';

/**
 * Register a global keyboard shortcut.
 * Keys format: 'Alt+N', 'Ctrl+Shift+A', 'Escape', 'Enter'
 */
export function useKeyboardShortcut(keys: string, callback: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const parts = keys.split('+').map((k) => k.trim().toLowerCase());
    const targetKey = parts[parts.length - 1];
    const needsAlt = parts.includes('alt');
    const needsCtrl = parts.includes('ctrl') || parts.includes('control');
    const needsShift = parts.includes('shift');
    const needsMeta = parts.includes('meta') || parts.includes('cmd');

    const handler = (e: KeyboardEvent) => {
      const keyMatch = e.key.toLowerCase() === targetKey || e.code.toLowerCase() === `key${targetKey}`;
      if (
        keyMatch &&
        e.altKey === needsAlt &&
        e.ctrlKey === needsCtrl &&
        e.shiftKey === needsShift &&
        e.metaKey === needsMeta
      ) {
        // Don't fire when typing in an input unless it's Escape/Enter
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        const isInputField = ['input', 'textarea', 'select'].includes(tag);
        if (isInputField && !['escape', 'enter'].includes(targetKey)) return;

        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keys, callback, enabled]);
}
