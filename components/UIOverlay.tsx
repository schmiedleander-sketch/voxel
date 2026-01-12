
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { AppState, SavedModel, VoxelData } from '../types';
import { COLORS } from '../utils/voxelConstants';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, Hammer, FolderOpen, ChevronUp, FileJson, History, Play, Pause, Info, Wrench, Loader2, MousePointer2, Paintbrush, Trash2, Save, Grid3X3, Eraser, Pencil } from 'lucide-react';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel: string;
  customBuilds: SavedModel[];
  customRebuilds: SavedModel[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  isEditMode: boolean;
  buildTool: 'add' | 'delete';
  isGridVisible: boolean;
  selectedColor: number;
  onDismantle: () => void;
  onRebuild: (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => void;
  onNewScene: (type: 'Eagle') => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onSelectCustomRebuild: (model: SavedModel) => void;
  onDeleteBuild: (idx: number) => void;
  onDeleteRebuild: (idx: number) => void;
  onPromptCreate: () => void;
  onPromptMorph: () => void;
  onSaveCurrent: () => void;
  onShowJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleGrid: () => void;
  onToggleInfo: () => void;
  onToggleEdit: () => void;
  onSetBuildTool: (tool: 'add' | 'delete') => void;
  onSelectColor: (color: number) => void;
}

const LOADING_MESSAGES = [
    "Crafting voxels...",
    "Designing structure...",
    "Calculating physics...",
    "Mixing colors...",
    "Assembling geometry...",
    "Applying polish..."
];

const PALETTE = [
  COLORS.WHITE, COLORS.GOLD, COLORS.DARK, COLORS.LIGHT,
  COLORS.GREEN, COLORS.WOOD, COLORS.TALON, COLORS.BLACK,
  0xFF5555, 0x55FF55, 0x5555FF
];

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  appState,
  currentBaseModel,
  customBuilds,
  customRebuilds,
  isAutoRotate,
  isInfoVisible,
  isGenerating,
  isEditMode,
  buildTool,
  isGridVisible,
  selectedColor,
  onDismantle,
  onRebuild,
  onNewScene,
  onSelectCustomBuild,
  onSelectCustomRebuild,
  onDeleteBuild,
  onDeleteRebuild,
  onPromptCreate,
  onPromptMorph,
  onSaveCurrent,
  onShowJson,
  onImportJson,
  onToggleRotation,
  onToggleGrid,
  onToggleInfo,
  onToggleEdit,
  onSetBuildTool,
  onSelectColor
}) => {
  const isStable = appState === AppState.STABLE;
  const isDismantling = appState === AppState.DISMANTLING;
  const isRebuilding = appState === AppState.REBUILDING;
  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (isGenerating) {
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    } else {
        setLoadingMsgIndex(0);
    }
  }, [isGenerating]);
  
  const isEagle = currentBaseModel === 'Eagle';

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
      
      {/* --- Top Bar (Stats & Tools) --- */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        
        {/* Global Scene Controls */}
        <div className="pointer-events-auto flex flex-col gap-2">
            <DropdownMenu 
                icon={<FolderOpen size={20} />}
                label="Builds"
                color="indigo"
            >
                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">LIBRARY</div>
                <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Eagle" />
                <DropdownItem onClick={onPromptCreate} icon={<Wand2 size={16}/>} label="Create with AI" highlight />
                <DropdownItem onClick={onSaveCurrent} icon={<Save size={16}/>} label="Save current" />
                
                <div className="h-px bg-slate-100 my-1" />
                
                {customBuilds.length > 0 && (
                    <>
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">YOUR CREATIONS</div>
                        {customBuilds.map((model, idx) => (
                            <DropdownItem 
                                key={`build-${idx}`} 
                                onClick={() => onSelectCustomBuild(model)} 
                                icon={<History size={16}/>} 
                                label={model.name} 
                                truncate
                                onDelete={(e) => { e.stopPropagation(); onDeleteBuild(idx); }}
                            />
                        ))}
                        <div className="h-px bg-slate-100 my-1" />
                    </>
                )}

                <DropdownItem onClick={onImportJson} icon={<FileJson size={16}/>} label="Import JSON" />
            </DropdownMenu>

            <div className="flex items-center gap-3 px-4 py-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-xl border border-slate-200 text-slate-500 font-bold w-fit mt-2">
                <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                    <Box size={16} strokeWidth={3} />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase tracking-wider opacity-60">Voxels</span>
                    <span className="text-lg text-slate-800 font-extrabold font-mono">{voxelCount}</span>
                </div>
            </div>
        </div>

        {/* Utilities */}
        <div className="pointer-events-auto flex gap-2">
            <TactileButton
                onClick={onToggleEdit}
                color={isEditMode ? 'emerald' : 'slate'}
                icon={isEditMode ? <MousePointer2 size={18} strokeWidth={2.5} /> : <Paintbrush size={18} strokeWidth={2.5} />}
                label={isEditMode ? "Build Mode" : "View Mode"}
                compact={!isEditMode}
            />
            <TactileButton
                onClick={onToggleGrid}
                color={isGridVisible ? 'indigo' : 'slate'}
                icon={<Grid3X3 size={18} strokeWidth={2.5} />}
                label="Grid"
                compact
            />
            <TactileButton
                onClick={onToggleInfo}
                color={isInfoVisible ? 'indigo' : 'slate'}
                icon={<Info size={18} strokeWidth={2.5} />}
                label="Info"
                compact
            />
            <TactileButton
                onClick={onToggleRotation}
                color={isAutoRotate ? 'sky' : 'slate'}
                icon={isAutoRotate ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                label={isAutoRotate ? "Pause Cam" : "Play Cam"}
                compact
            />
            <TactileButton
                onClick={onShowJson}
                color="slate"
                icon={<Code2 size={18} strokeWidth={2.5} />}
                label="Share"
                compact
            />
        </div>
      </div>

      {/* --- Build Mode Controls --- */}
      {isEditMode && (
        <div className="absolute top-20 right-4 pointer-events-auto flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
          
          {/* Tool Switcher */}
          <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-xl flex flex-col gap-1">
             <button 
                onClick={() => onSetBuildTool('add')}
                className={`p-3 rounded-xl transition-all ${buildTool === 'add' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Pencil Tool (Add)"
             >
                <Pencil size={20} />
             </button>
             <button 
                onClick={() => onSetBuildTool('delete')}
                className={`p-3 rounded-xl transition-all ${buildTool === 'delete' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}
                title="Eraser Tool (Delete)"
             >
                <Eraser size={20} />
             </button>
          </div>

          {/* Color Palette (only show when adding) */}
          <div className={`bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-xl flex flex-col gap-2 transition-all duration-300 ${buildTool === 'delete' ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-1">Colors</p>
            <div className="flex flex-col gap-2">
              {PALETTE.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${selectedColor === color ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                  title={`#${color.toString(16).padStart(6, '0')}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- Loading Indicator --- */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white/90 backdrop-blur-md border-2 border-indigo-100 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                  <div className="relative">
                      <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-20"></div>
                      <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  </div>
                  <div className="text-center">
                      <h3 className="text-lg font-extrabold text-slate-800">Gemini is Building...</h3>
                      <p className="text-slate-500 font-bold text-sm transition-all duration-300">
                          {LOADING_MESSAGES[loadingMsgIndex]}
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* --- Bottom Control Center --- */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-end pointer-events-none">
        
        <div className="pointer-events-auto transition-all duration-500 ease-in-out transform">
            
            {/* STATE 1: STABLE -> DISMANTLE */}
            {isStable && !isEditMode && (
                 <div className="animate-in slide-in-from-bottom-10 fade-in duration-300">
                     <BigActionButton 
                        onClick={onDismantle} 
                        icon={<Hammer size={32} strokeWidth={2.5} />} 
                        label="BREAK" 
                        color="rose" 
                     />
                 </div>
            )}

            {/* Build Mode Tip */}
            {isEditMode && (
              <div className={`px-6 py-3 rounded-2xl shadow-xl font-bold text-sm border-b-4 animate-in slide-in-from-bottom-4 duration-300 text-white ${buildTool === 'add' ? 'bg-emerald-500 border-emerald-700' : 'bg-rose-500 border-rose-700'}`}>
                {buildTool === 'add' ? 'Click to place blocks' : 'Click to delete blocks'} • {voxelCount} voxels
              </div>
            )}

            {/* STATE 2: DISMANTLED -> REBUILD */}
            {isDismantling && !isGenerating && !isEditMode && (
                <div className="flex items-end gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
                     <DropdownMenu 
                        icon={<Wrench size={24} />}
                        label="Rebuild"
                        color="emerald"
                        direction="up"
                        big
                     >
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">REBUILD</div>
                        
                        {isEagle && (
                            <>
                                <DropdownItem onClick={() => onRebuild('Cat')} icon={<Cat size={18}/>} label="Cat" />
                                <DropdownItem onClick={() => onRebuild('Rabbit')} icon={<Rabbit size={18}/>} label="Rabbit" />
                                <DropdownItem onClick={() => onRebuild('Twins')} icon={<Users size={18}/>} label="Eagles x2" />
                                <div className="h-px bg-slate-100 my-1" />
                            </>
                        )}

                        {customRebuilds.length > 0 && (
                            <>
                                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">CUSTOM REBUILDS</div>
                                {customRebuilds.map((model, idx) => (
                                    <DropdownItem 
                                        key={`rebuild-${idx}`} 
                                        onClick={() => onSelectCustomRebuild(model)} 
                                        icon={<History size={18}/>} 
                                        label={model.name}
                                        truncate 
                                        onDelete={(e) => { e.stopPropagation(); onDeleteRebuild(idx); }}
                                    />
                                ))}
                                <div className="h-px bg-slate-100 my-1" />
                            </>
                        )}

                        <DropdownItem onClick={onPromptMorph} icon={<Wand2 size={18}/>} label="New rebuild" highlight />
                     </DropdownMenu>
                </div>
            )}
        </div>
      </div>

    </div>
  );
};

// --- Components ---

interface TactileButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  color: 'slate' | 'rose' | 'sky' | 'emerald' | 'amber' | 'indigo';
  compact?: boolean;
}

const TactileButton: React.FC<TactileButtonProps> = ({ onClick, disabled, icon, label, color, compact }) => {
  const colorStyles = {
    slate:   'bg-slate-200 text-slate-600 shadow-slate-300 hover:bg-slate-300',
    rose:    'bg-rose-500 text-white shadow-rose-700 hover:bg-rose-600',
    sky:     'bg-sky-500 text-white shadow-sky-700 hover:bg-sky-600',
    emerald: 'bg-emerald-500 text-white shadow-emerald-700 hover:bg-emerald-600',
    amber:   'bg-amber-400 text-amber-900 shadow-amber-600 hover:bg-amber-500',
    indigo:  'bg-indigo-500 text-white shadow-indigo-700 hover:bg-indigo-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all duration-100
        border-b-[4px] active:border-b-0 active:translate-y-[4px]
        ${compact ? 'p-2.5' : 'px-4 py-3'}
        ${disabled 
          ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed shadow-none' 
          : `${colorStyles[color]} border-black/20 shadow-lg`}
      `}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  );
};

const BigActionButton: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, color: 'rose'}> = ({ onClick, icon, label, color }) => {
    return (
        <button 
            onClick={onClick}
            className="group relative flex flex-col items-center justify-center w-32 h-32 rounded-3xl bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-900/30 border-b-[8px] border-rose-800 active:border-b-0 active:translate-y-[8px] transition-all duration-150"
        >
            <div className="mb-2">{icon}</div>
            <div className="text-sm font-black tracking-wider">{label}</div>
        </button>
    )
}

// --- Dropdown Components ---

interface DropdownProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    color: 'indigo' | 'emerald';
    direction?: 'up' | 'down';
    big?: boolean;
}

const DropdownMenu: React.FC<DropdownProps> = ({ icon, label, children, color, direction = 'down', big }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const bgClass = color === 'indigo' ? 'bg-indigo-500 hover:bg-indigo-600 border-indigo-800' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-800';

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 font-bold text-white shadow-lg rounded-2xl transition-all active:scale-95
                    ${bgClass}
                    ${big ? 'px-8 py-4 text-lg border-b-[6px] active:border-b-0 active:translate-y-[6px]' : 'px-4 py-3 text-sm border-b-[4px] active:border-b-0 active:translate-y-[4px]'}
                `}
            >
                {icon}
                {label}
                <ChevronUp size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${direction === 'down' ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`
                    absolute left-0 ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-3'} 
                    w-56 max-h-[60vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-slate-100 p-2 flex flex-col gap-1 animate-in fade-in zoom-in duration-200 z-50
                `}>
                    {children}
                </div>
            )}
        </div>
    )
}

const DropdownItem: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean, truncate?: boolean, onDelete?: (e: React.MouseEvent) => void }> = ({ onClick, icon, label, highlight, truncate, onDelete }) => {
    return (
        <button 
            onClick={onClick}
            className={`
                group w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-colors text-left
                ${highlight 
                    ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-600 hover:from-sky-100 hover:to-blue-100' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
            `}
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0">{icon}</div>
                <span className={truncate ? "truncate w-full" : ""}>{label}</span>
            </div>
            {onDelete && (
                <div 
                    onClick={onDelete}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 size={14} />
                </div>
            )}
        </button>
    )
}
