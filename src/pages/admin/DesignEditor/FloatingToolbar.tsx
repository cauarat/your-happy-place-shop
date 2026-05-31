import React, { useEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { useEditor } from './EditorContext';
import { Copy, Trash2 } from 'lucide-react';

export function FloatingToolbar() {
  const { state, dispatch } = useEditor();
  const selectedNodeId = state.selectedNodeId;

  const { refs, floatingStyles } = useFloating({
    placement: 'top-start',
    middleware: [offset(8), flip(), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (selectedNodeId && state.isEditMode) {
      const el = document.getElementById(`editor-node-${selectedNodeId}`);
      if (el) refs.setReference(el);
    } else {
      refs.setReference(null);
    }
  }, [selectedNodeId, state.nodes, state.isEditMode, refs]);

  if (!selectedNodeId || !state.isEditMode) return null;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, zIndex: 50 }}
      className="bg-black text-white rounded-lg shadow-lg flex items-center p-1 pointer-events-auto"
      onClick={e => e.stopPropagation()}
    >
      <button 
        onClick={() => dispatch({ type: 'DUPLICATE_NODE', payload: selectedNodeId })}
        className="p-1.5 hover:bg-gray-800 rounded text-gray-300 hover:text-white transition-colors flex items-center justify-center"
        title="Duplicate"
      >
        <Copy size={14} />
      </button>
      <button 
        onClick={() => {
          if(selectedNodeId !== 'root') dispatch({ type: 'DELETE_NODE', payload: selectedNodeId });
        }}
        className="p-1.5 hover:bg-red-900 rounded text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center"
        title="Delete"
        disabled={selectedNodeId === 'root'}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
