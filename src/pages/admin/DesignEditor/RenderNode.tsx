import React from 'react';
import { PageNode } from './schema';
import { useEditor } from './EditorContext';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RenderNodeProps {
  node: PageNode;
}

export function RenderNode({ node }: RenderNodeProps) {
  const { state, dispatch } = useEditor();
  const isSelected = state.selectedNodeId === node.id;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id, disabled: !state.isEditMode });

  const style = {
    ...node.styles,
    transform: CSS.Transform.toString(transform),
    transition,
    outline: (state.isEditMode && isSelected) ? '2px solid #3b82f6' : ((state.isEditMode && isDragging) ? '2px dashed #3b82f6' : 'none'),
    outlineOffset: '-2px',
    cursor: state.isEditMode ? 'pointer' : 'default',
    position: 'relative' as const,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!state.isEditMode) return;
    e.stopPropagation();
    dispatch({ type: 'SELECT_NODE', payload: node.id });
  };

  const renderContent = () => {
    switch (node.type) {
      case 'Text':
        return node.props?.text || 'Text Node';
      case 'Button':
        return <button style={{ all: 'inherit', cursor: 'pointer' }}>{node.props?.text || 'Button'}</button>;
      case 'Image':
        return <img src={node.props?.src || 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
      case 'Container':
        return node.children?.map(child => (
          <RenderNode key={child.id} node={child} />
        ));
      case 'ProductCard':
        return (
          <div className="group block w-full pointer-events-none">
            <div className="relative aspect-[4/5] overflow-hidden mb-3 bg-[#ffffff] border border-transparent group-hover:border-border transition-colors">
              {node.props?.oldPrice && node.props?.price && (
                <span className="absolute top-4 left-4 text-[10px] font-medium text-black">
                  -{Math.round(((node.props.oldPrice - node.props.price) / node.props.oldPrice) * 100)}%
                </span>
              )}
              <img src={node.props?.image} alt={node.props?.name} className="w-full h-full object-contain p-1" />
            </div>
            <div className="flex flex-col space-y-1">
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">{node.props?.category}</p>
              <p className="text-[12px] text-black tracking-tight leading-tight"><span className="font-bold">{node.props?.designer}</span> {node.props?.name}</p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[12px] font-bold text-black">${node.props?.price?.toFixed(2)}</span>
                {node.props?.oldPrice && <span className="text-[11px] text-muted-foreground line-through decoration-muted-foreground/30 font-light">${node.props?.oldPrice?.toFixed(2)}</span>}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // The id is needed to attach floating toolbar to it
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      id={`editor-node-${node.id}`}
      className={`editor-node transition-shadow ${state.isEditMode && isSelected ? 'z-10 shadow-lg ring-2 ring-blue-500' : ''} ${state.isEditMode && !isSelected ? 'hover:ring-1 hover:ring-gray-300' : ''}`}
    >
      {renderContent()}
    </div>
  );
}
