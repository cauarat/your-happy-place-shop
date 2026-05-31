import React, { useEffect, useState } from 'react';
import { useEditor } from './EditorContext';
import { Monitor, Tablet, Smartphone, Undo, Redo, Check, Save } from 'lucide-react';

export function TopBar() {
  const { state, dispatch } = useEditor();
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (state.lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.lastSaved]);

  return (
    <div className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-6">
        <h1 className="font-bold text-lg">Design Editor</h1>
        
        <div className="flex items-center gap-2 border-l pl-6">
          <button 
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
            className={`p-2 rounded hover:bg-gray-100 ${!canUndo ? 'opacity-30' : ''}`}
          >
            <Undo size={16} />
          </button>
          <button 
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
            className={`p-2 rounded hover:bg-gray-100 ${!canRedo ? 'opacity-30' : ''}`}
          >
            <Redo size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center bg-gray-100 p-1 rounded-md">
        <button
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'desktop' })}
          className={`p-1.5 rounded ${state.viewMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
        >
          <Monitor size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'tablet' })}
          className={`p-1.5 rounded ${state.viewMode === 'tablet' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
        >
          <Tablet size={16} />
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'mobile' })}
          className={`p-1.5 rounded ${state.viewMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-black'}`}
        >
          <Smartphone size={16} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Saved Feedback Micro-interaction */}
        <div className={`flex items-center gap-1 text-xs text-green-600 font-medium transition-opacity duration-300 ${showSaved ? 'opacity-100' : 'opacity-0'}`}>
          <Check size={14} />
          All changes saved
        </div>

        <div className="flex items-center gap-2 mr-4 border-l pl-4">
          <span className="text-xs font-medium text-gray-500">Edit Mode</span>
          <button 
            onClick={() => dispatch({ type: 'SET_EDIT_MODE', payload: !state.isEditMode })}
            className={`w-10 h-5 rounded-full relative transition-colors ${state.isEditMode ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${state.isEditMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <button className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors">
          <Save size={16} />
          <span>Publish</span>
        </button>
      </div>
    </div>
  );
}
