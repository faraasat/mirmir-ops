import React, { useState, useEffect } from 'react';
import {
  getShortcuts,
  updateShortcut,
  resetAllShortcuts,
  formatKeyCombo,
  checkConflicts,
  SHORTCUT_CATEGORIES,
  type KeyboardShortcut,
} from '@/lib/keyboard';

interface KeyboardShortcutsViewProps {
  isModal?: boolean;
  onClose?: () => void;
}

export const KeyboardShortcutsView: React.FC<KeyboardShortcutsViewProps> = ({
  isModal = false,
  onClose,
}) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string>('');
  const [conflict, setConflict] = useState<KeyboardShortcut | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    const loaded = await getShortcuts();
    setShortcuts(loaded);
  };

  const handleEdit = (shortcut: KeyboardShortcut) => {
    if (!shortcut.customizable) return;
    setEditingId(shortcut.id);
    setRecordedKeys(shortcut.keys);
    setRecording(true);
    setConflict(null);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (!recording || !editingId) return;

    e.preventDefault();
    e.stopPropagation();

    // Build key combo
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    // Get key name
    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';

    // Skip modifier-only presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return;

    parts.push(key);
    const newKeys = parts.join('+');
    setRecordedKeys(newKeys);

    // Check for conflicts
    const conflicts = await checkConflicts(editingId, newKeys);
    if (conflicts.length > 0) {
      setConflict(conflicts[0]);
    } else {
      setConflict(null);
    }
  };

  const handleSave = async () => {
    if (!editingId || conflict) return;

    await updateShortcut(editingId, { keys: recordedKeys });
    await loadShortcuts();
    setEditingId(null);
    setRecording(false);
    setRecordedKeys('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setRecording(false);
    setRecordedKeys('');
    setConflict(null);
  };

  const handleResetAll = async () => {
    if (confirm('Reset all shortcuts to defaults?')) {
      await resetAllShortcuts();
      await loadShortcuts();
    }
  };

  const handleToggle = async (shortcut: KeyboardShortcut) => {
    await updateShortcut(shortcut.id, { enabled: !shortcut.enabled });
    await loadShortcuts();
  };

  // Filter shortcuts by search query
  const filteredCategories = SHORTCUT_CATEGORIES.map(category => ({
    ...category,
    shortcuts: shortcuts.filter(s => 
      category.shortcuts.some(cs => cs.id === s.id) &&
      (searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.keys.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(cat => cat.shortcuts.length > 0);

  const content = (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Keyboard Shortcuts
        </h2>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search shortcuts..."
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />

      {/* Recording overlay */}
      {recording && editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          autoFocus
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Press new shortcut
            </h3>
            <div className="py-4">
              <kbd className="px-4 py-2 text-lg font-mono bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                {recordedKeys || 'Waiting...'}
              </kbd>
            </div>
            {conflict && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                Conflicts with "{conflict.name}"
              </p>
            )}
            <div className="flex justify-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!recordedKeys || !!conflict}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-6">
        {filteredCategories.map(category => (
          <div key={category.id}>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {category.name}
            </h3>
            <div className="space-y-1">
              {category.shortcuts.map(shortcut => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  onEdit={() => handleEdit(shortcut)}
                  onToggle={() => handleToggle(shortcut)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reset all button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleResetAll}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Reset all to defaults
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto mx-4">
          {content}
        </div>
      </div>
    );
  }

  return <div className="h-full overflow-y-auto">{content}</div>;
};

// Shortcut row component
const ShortcutRow: React.FC<{
  shortcut: KeyboardShortcut;
  onEdit: () => void;
  onToggle: () => void;
}> = ({ shortcut, onEdit, onToggle }) => (
  <div
    className={`flex items-center justify-between p-2 rounded-lg ${
      shortcut.enabled
        ? 'bg-gray-50 dark:bg-gray-800'
        : 'bg-gray-100 dark:bg-gray-900 opacity-60'
    }`}
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {shortcut.name}
        </span>
        {!shortcut.customizable && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
            Fixed
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
        {shortcut.description}
      </p>
    </div>

    <div className="flex items-center gap-2 ml-2">
      <button
        onClick={onEdit}
        disabled={!shortcut.customizable}
        className={`px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded ${
          shortcut.customizable
            ? 'hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
            : 'cursor-default'
        }`}
      >
        {formatKeyCombo(shortcut.keys)}
      </button>

      {shortcut.customizable && (
        <button
          onClick={onToggle}
          className={`p-1 rounded ${
            shortcut.enabled
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
          title={shortcut.enabled ? 'Disable' : 'Enable'}
        >
          {shortcut.enabled ? (
            <CheckIcon className="w-4 h-4" />
          ) : (
            <XIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  </div>
);

// Icons
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default KeyboardShortcutsView;
