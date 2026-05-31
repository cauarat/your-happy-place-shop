import React, { useState } from 'react';
import { useEditor } from './EditorContext';
import { Settings, Type, Layout, Palette, AlignLeft, AlignCenter, AlignRight, Columns, List, Grid3X3, ArrowUpToLine, ArrowDownToLine, Minus, ToggleLeft, ToggleRight } from 'lucide-react';

export function RightPanel() {
  const { state, dispatch } = useEditor();
  const selectedNodeId = state.selectedNodeId;
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  if (!state.isEditMode || !selectedNodeId) return null;

  let selectedNode = null;
  const findNode = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.id === selectedNodeId) selectedNode = node;
      if (node.children) findNode(node.children);
    }
  };
  findNode(state.nodes);

  if (!selectedNode) return null;

  const handleStyleChange = (key: string, value: string) => {
    dispatch({
      type: 'UPDATE_NODE_STYLE',
      payload: { id: selectedNodeId, styles: { [key]: value } }
    });
  };

  const handlePropChange = (key: string, value: string) => {
    dispatch({
      type: 'UPDATE_NODE_PROPS',
      payload: { id: selectedNodeId, props: { [key]: value } }
    });
  };

  const applyPreset = (type: string) => {
    switch (type) {
      case '1-col':
        handleStyleChange('gridTemplateColumns', '1fr');
        handleStyleChange('display', 'grid');
        break;
      case '2-col':
        handleStyleChange('gridTemplateColumns', 'repeat(2, 1fr)');
        handleStyleChange('display', 'grid');
        break;
      case '3-col':
        handleStyleChange('gridTemplateColumns', 'repeat(3, 1fr)');
        handleStyleChange('display', 'grid');
        break;
      case '4-col':
        handleStyleChange('gridTemplateColumns', 'repeat(4, 1fr)');
        handleStyleChange('display', 'grid');
        break;
    }
  };

  const applyGap = (type: 'tight' | 'normal' | 'spacious') => {
    const values = { tight: '0.5rem', normal: '1.5rem', spacious: '3rem' };
    handleStyleChange('gap', values[type]);
  };

  const toggleAutoLayout = () => {
    const isAuto = selectedNode?.styles?.width === 'auto' || !selectedNode?.styles?.width;
    if (isAuto) {
      handleStyleChange('width', '100%');
      handleStyleChange('height', '100%');
    } else {
      handleStyleChange('width', 'auto');
      handleStyleChange('height', 'auto');
    }
  };

  const isAutoLayout = selectedNode?.styles?.width === 'auto' || !selectedNode?.styles?.width;

  return (
    <div className="w-80 bg-white border-l h-full overflow-y-auto flex flex-col shrink-0 pb-10">
      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <span className="font-medium text-sm flex items-center gap-2">
          <Settings size={16} /> Edit {selectedNode.type}
        </span>
        <button 
          onClick={() => setIsAdvancedMode(!isAdvancedMode)}
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded transition-colors ${isAdvancedMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Advanced
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* VISUAL DECISIONS MODE */}
        {!isAdvancedMode && (
          <>
            {selectedNode.type === 'Container' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Layout size={14} /> Structure
                  </h3>
                  <button onClick={toggleAutoLayout} className="text-gray-400 hover:text-black">
                    {isAutoLayout ? <ToggleRight size={16} className="text-blue-500" /> : <ToggleLeft size={16} />}
                  </button>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500">Layout Presets</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => applyPreset('1-col')} className="flex flex-col items-center gap-1 p-2 border rounded hover:border-black hover:bg-gray-50 transition-colors">
                      <List size={16} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500">1 Col</span>
                    </button>
                    <button onClick={() => applyPreset('2-col')} className="flex flex-col items-center gap-1 p-2 border rounded hover:border-black hover:bg-gray-50 transition-colors">
                      <Columns size={16} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500">2 Col</span>
                    </button>
                    <button onClick={() => applyPreset('3-col')} className="flex flex-col items-center gap-1 p-2 border rounded hover:border-black hover:bg-gray-50 transition-colors">
                      <Grid3X3 size={16} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500">3 Col</span>
                    </button>
                    <button onClick={() => applyPreset('4-col')} className="flex flex-col items-center gap-1 p-2 border rounded hover:border-black hover:bg-gray-50 transition-colors">
                      <Grid3X3 size={16} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500">4 Col</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500">Distribution</label>
                  <div className="flex gap-2">
                    <button onClick={() => applyGap('tight')} className={`flex-1 py-1.5 text-xs border rounded transition-colors ${selectedNode?.styles?.gap === '0.5rem' ? 'border-black bg-gray-50' : 'hover:border-black'}`}>
                      Tight
                    </button>
                    <button onClick={() => applyGap('normal')} className={`flex-1 py-1.5 text-xs border rounded transition-colors ${selectedNode?.styles?.gap === '1.5rem' || !selectedNode?.styles?.gap ? 'border-black bg-gray-50' : 'hover:border-black'}`}>
                      Normal
                    </button>
                    <button onClick={() => applyGap('spacious')} className={`flex-1 py-1.5 text-xs border rounded transition-colors ${selectedNode?.styles?.gap === '3rem' ? 'border-black bg-gray-50' : 'hover:border-black'}`}>
                      Spacious
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500">Alignment</label>
                  <div className="flex gap-2">
                    <div className="flex bg-gray-100 p-1 rounded">
                      <button onClick={() => handleStyleChange('justifyContent', 'flex-start')} className={`p-1.5 rounded ${selectedNode?.styles?.justifyContent === 'flex-start' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}><AlignLeft size={14} /></button>
                      <button onClick={() => handleStyleChange('justifyContent', 'center')} className={`p-1.5 rounded ${selectedNode?.styles?.justifyContent === 'center' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}><AlignCenter size={14} /></button>
                      <button onClick={() => handleStyleChange('justifyContent', 'flex-end')} className={`p-1.5 rounded ${selectedNode?.styles?.justifyContent === 'flex-end' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}><AlignRight size={14} /></button>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded">
                      <button onClick={() => handleStyleChange('alignItems', 'flex-start')} className={`p-1.5 rounded ${selectedNode?.styles?.alignItems === 'flex-start' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}><ArrowUpToLine size={14} /></button>
                      <button onClick={() => handleStyleChange('alignItems', 'center')} className={`p-1.5 rounded ${selectedNode?.styles?.alignItems === 'center' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}><Minus size={14} /></button>
                      <button onClick={() => handleStyleChange('alignItems', 'flex-end')} className={`p-1.5 rounded ${selectedNode?.styles?.alignItems === 'flex-end' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-black'}`}><ArrowDownToLine size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedNode.type === 'Container' && <div className="h-px bg-gray-100" />}

            {/* TYPOGRAPHY SECTION VISUAL */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Type size={14} /> Typography
              </h3>
              {(selectedNode.type === 'Text' || selectedNode.type === 'Button') && (
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-500">Content</label>
                  <textarea 
                    value={selectedNode?.props?.text || ''}
                    onChange={e => handlePropChange('text', e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none min-h-[60px]"
                    placeholder="Enter text..."
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Size</label>
                  <select 
                    value={selectedNode?.styles?.fontSize || ''}
                    onChange={e => handleStyleChange('fontSize', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-black outline-none"
                  >
                    <option value="">Default</option>
                    <option value="0.7rem">Small</option>
                    <option value="1rem">Normal</option>
                    <option value="1.25rem">Large</option>
                    <option value="1.5rem">Heading 3</option>
                    <option value="2rem">Heading 2</option>
                    <option value="3rem">Heading 1</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Weight</label>
                  <select 
                    value={selectedNode?.styles?.fontWeight || ''}
                    onChange={e => handleStyleChange('fontWeight', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-black outline-none"
                  >
                    <option value="">Default</option>
                    <option value="normal">Normal</option>
                    <option value="500">Medium</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* AESTHETICS SECTION VISUAL */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Palette size={14} /> Style
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Background</label>
                  <div className="flex items-center gap-2 border rounded p-1">
                    <input 
                      type="color" 
                      value={selectedNode?.styles?.backgroundColor || '#ffffff'}
                      onChange={e => handleStyleChange('backgroundColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0 shrink-0"
                    />
                    <span className="text-xs text-gray-500 uppercase flex-1">{selectedNode?.styles?.backgroundColor || 'None'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Text Color</label>
                  <div className="flex items-center gap-2 border rounded p-1">
                    <input 
                      type="color" 
                      value={selectedNode?.styles?.color || '#000000'}
                      onChange={e => handleStyleChange('color', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0 shrink-0"
                    />
                    <span className="text-xs text-gray-500 uppercase flex-1">{selectedNode?.styles?.color || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ADVANCED MODE */}
        {isAdvancedMode && (
          <>
            {/* RAW CSS INPUTS */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Layout size={14} /> Layout (CSS)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Width</label>
                  <input 
                    type="text" 
                    value={selectedNode?.styles?.width || ''}
                    onChange={e => handleStyleChange('width', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="auto"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Height</label>
                  <input 
                    type="text" 
                    value={selectedNode?.styles?.height || ''}
                    onChange={e => handleStyleChange('height', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="auto"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Padding</label>
                <input 
                  type="text" 
                  value={selectedNode?.styles?.padding || ''}
                  onChange={e => handleStyleChange('padding', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="1rem 2rem"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Margin</label>
                <input 
                  type="text" 
                  value={selectedNode?.styles?.margin || ''}
                  onChange={e => handleStyleChange('margin', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="0 auto"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Layout size={14} /> Flex/Grid (CSS)
              </h3>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Display</label>
                <select 
                  value={selectedNode?.styles?.display || ''}
                  onChange={e => handleStyleChange('display', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                >
                  <option value="">Default</option>
                  <option value="flex">Flex</option>
                  <option value="grid">Grid</option>
                  <option value="block">Block</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Grid Columns</label>
                <input 
                  type="text" 
                  value={selectedNode?.styles?.gridTemplateColumns || ''}
                  onChange={e => handleStyleChange('gridTemplateColumns', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="repeat(4, 1fr)"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Gap</label>
                <input 
                  type="text" 
                  value={selectedNode?.styles?.gap || ''}
                  onChange={e => handleStyleChange('gap', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="1.5rem"
                />
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* STYLE SECTION */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Palette size={14} /> Aesthetics (CSS)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Border Radius</label>
                  <input 
                    type="text" 
                    value={selectedNode?.styles?.borderRadius || ''}
                    onChange={e => handleStyleChange('borderRadius', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="0px"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Border Color</label>
                  <input 
                    type="text" 
                    value={selectedNode?.styles?.borderColor || ''}
                    onChange={e => handleStyleChange('borderColor', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="#eaeaea"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Border Width</label>
                  <input 
                    type="text" 
                    value={selectedNode?.styles?.borderWidth || ''}
                    onChange={e => handleStyleChange('borderWidth', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                    placeholder="1px"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Border Style</label>
                  <select 
                    value={selectedNode?.styles?.borderStyle || ''}
                    onChange={e => handleStyleChange('borderStyle', e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                  >
                    <option value="">None</option>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
