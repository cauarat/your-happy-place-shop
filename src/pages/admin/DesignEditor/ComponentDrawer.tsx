import { Type, Image, Layout, MousePointerClick, Package } from 'lucide-react';
import { useEditor } from './EditorContext';
import { NodeType, PageNode } from './schema';

export function ComponentDrawer() {
  const { state, dispatch } = useEditor();

  const handleAddComponent = (type: NodeType) => {
    // Basic logic to add a new component at the end of root for now.
    // In a full implementation, you would drag and drop it exactly where you want.
    
    const createNewNode = (): PageNode => {
      const id = `node-${Date.now()}`;
      switch (type) {
        case 'Text':
          return { id, type, props: { text: 'New Text Block' }, styles: { fontSize: '1rem', color: '#000' } };
        case 'Image':
          return { id, type, props: { src: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80' }, styles: { width: '100%', height: '200px' } };
        case 'Button':
          return { id, type, props: { text: 'New Button' }, styles: { padding: '0.75rem 1.5rem', backgroundColor: '#000', color: '#fff', borderRadius: '4px' } };
        case 'Container':
          return { id, type, styles: { padding: '2rem', display: 'flex', gap: '1rem', border: '1px dashed #ccc' }, children: [] };
        case 'ProductCard':
          return { id, type, props: { text: 'Product Card Placeholder' }, styles: { padding: '1rem', border: '1px solid #eaeaea', borderRadius: '8px' } };
      }
    };

    const newNode = createNewNode();

    // Helper to append to root
    const addNodeToRoot = (nodes: PageNode[]): PageNode[] => {
      return nodes.map((node) => {
        if (node.id === 'root') {
          return { ...node, children: [...(node.children || []), newNode] };
        }
        return node;
      });
    };

    dispatch({ type: 'SET_NODES', payload: addNodeToRoot(state.nodes) });
  };

  const components = [
    { type: 'Container' as NodeType, icon: <Layout size={18} />, label: 'Container' },
    { type: 'Text' as NodeType, icon: <Type size={18} />, label: 'Text' },
    { type: 'Image' as NodeType, icon: <Image size={18} />, label: 'Image' },
    { type: 'Button' as NodeType, icon: <MousePointerClick size={18} />, label: 'Button' },
    { type: 'ProductCard' as NodeType, icon: <Package size={18} />, label: 'Product Card' },
  ];

  return (
    <div className="w-16 hover:w-64 transition-all duration-300 bg-white border-r h-full flex flex-col group overflow-hidden z-20 shrink-0">
      <div className="p-4 border-b flex items-center shrink-0">
        <Layout className="shrink-0 text-gray-500" size={20} />
        <span className="ml-4 font-semibold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Elements</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {components.map((comp) => (
          <button
            key={comp.type}
            onClick={() => handleAddComponent(comp.type)}
            className="flex items-center gap-4 p-2.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-black transition-colors w-full shrink-0"
          >
            <div className="shrink-0">{comp.icon}</div>
            <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{comp.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
