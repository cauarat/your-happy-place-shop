import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEditor } from './EditorContext';
import { RenderNode } from './RenderNode';

export function Canvas() {
  const { state, dispatch } = useEditor();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts, allows onClick to fire!
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    // A complete implementation would reorder nodes in the JSON tree here.
    // For now, we are skipping complex AST reordering logic for brevity
    // but the UI visual drag-n-drop feedback will work.
  };

  // Helper to get flat array of ids for SortableContext
  const getFlatIds = (nodes: any[]): string[] => {
    let ids: string[] = [];
    nodes.forEach(n => {
      ids.push(n.id);
      if (n.children) {
        ids = ids.concat(getFlatIds(n.children));
      }
    });
    return ids;
  };

  const getWidth = () => {
    switch (state.viewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div 
      className="flex-1 bg-gray-100 overflow-auto flex justify-center p-8"
      onClick={() => dispatch({ type: 'SELECT_NODE', payload: null })} // Deselect on clicking empty canvas
    >
      <div 
        style={{ 
          width: getWidth(),
          transition: 'width 0.3s ease-in-out',
          boxShadow: '0 0 20px rgba(0,0,0,0.05)',
          minHeight: '100%',
          backgroundColor: '#fff'
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={getFlatIds(state.nodes)} strategy={verticalListSortingStrategy}>
            {state.nodes.map(node => (
              <RenderNode key={node.id} node={node} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
