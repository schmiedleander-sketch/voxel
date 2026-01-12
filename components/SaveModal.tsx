
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { X, Save, Box } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(`My Creation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col border-4 border-indigo-100 animate-in fade-in zoom-in duration-200 scale-95 sm:scale-100 overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                <Save size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">Save Creation</h2>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Persistence</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/50 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 bg-white flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Build Name</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your masterpiece..."
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <button 
              onClick={onClose}
              className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 border-b-[4px] border-indigo-700 active:border-b-0 active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Box size={18} />
              Save to Library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
