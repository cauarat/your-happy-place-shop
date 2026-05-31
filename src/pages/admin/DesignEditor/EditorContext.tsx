import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { PageNode, NodeStyles } from './schema';

export type ViewMode = 'desktop' | 'tablet' | 'mobile';

interface EditorState {
  nodes: PageNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  viewMode: ViewMode;
  isEditMode: boolean;
  lastSaved: number;
  history: PageNode[][];
  historyIndex: number;
}

type EditorAction =
  | { type: 'SET_NODES'; payload: PageNode[] }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'HOVER_NODE'; payload: string | null }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_EDIT_MODE'; payload: boolean }
  | { type: 'UPDATE_NODE_STYLE'; payload: { id: string; styles: Partial<NodeStyles>; transient?: boolean } }
  | { type: 'UPDATE_NODE_PROPS'; payload: { id: string; props: Record<string, any> } }
  | { type: 'DUPLICATE_NODE'; payload: string }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialNodes: PageNode[] = [
  {
    id: 'root',
    type: 'Container',
    styles: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      width: '100%'
    },
    children: [
      {
        id: 'header',
        type: 'Container',
        styles: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #eaeaea'
        },
        children: [
          { id: 'logo', type: 'Text', props: { text: 'Villaoro' }, styles: { fontSize: '1.5rem', fontWeight: 'bold' } },
          { id: 'nav', type: 'Container', styles: { display: 'flex', gap: '1.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', alignItems: 'center' }, children: [
            { id: 'nav-1', type: 'Text', props: { text: 'PT' } },
            { id: 'nav-2', type: 'Text', props: { text: 'PESQUISAR' } },
            { id: 'nav-3', type: 'Text', props: { text: 'ENTRAR' } },
            { id: 'nav-4', type: 'Text', props: { text: 'SACOLA (0)' } }
          ]}
        ]
      },
      {
        id: 'subheader',
        type: 'Container',
        styles: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #eaeaea'
        },
        children: [
          { id: 'subheader-text', type: 'Text', props: { text: 'A D I D A S ( 9 )' }, styles: { fontSize: '0.7rem', letterSpacing: '0.5em', fontWeight: '500' } }
        ]
      },
      {
        id: 'main-layout',
        type: 'Container',
        styles: {
          display: 'grid',
          gridTemplateColumns: '150px 1fr 240px',
          minHeight: 'calc(100vh - 200px)'
        },
        children: [
          {
            id: 'sidebar-left',
            type: 'Container',
            styles: {
              borderRight: '1px solid #eaeaea',
              padding: '1.5rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            },
            children: [
              {
                id: 'cat-section',
                type: 'Container',
                styles: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
                children: [
                  { id: 'cat-title', type: 'Text', props: { text: 'CATEGORIAS' }, styles: { fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em' } },
                  { id: 'cat-1', type: 'Text', props: { text: 'VESTUÁRIO' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'cat-2', type: 'Text', props: { text: 'ACESSÓRIOS' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'cat-3', type: 'Text', props: { text: 'CALÇADOS' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'cat-4', type: 'Text', props: { text: 'BOLSAS' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'cat-5', type: 'Text', props: { text: 'JOALHERIA' }, styles: { fontSize: '0.7rem', color: '#666' } }
                ]
              },
              {
                id: 'des-section',
                type: 'Container',
                styles: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
                children: [
                  { id: 'des-title', type: 'Text', props: { text: 'DESIGNERS' }, styles: { fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em' } },
                  { id: 'des-1', type: 'Text', props: { text: 'ADIDAS' }, styles: { fontSize: '0.7rem', fontWeight: 'bold' } },
                  { id: 'des-2', type: 'Text', props: { text: 'BRUNELLO' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'des-3', type: 'Text', props: { text: 'CREED' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'des-4', type: 'Text', props: { text: 'FEAR OF GOD' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'des-5', type: 'Text', props: { text: 'GOLDEN' }, styles: { fontSize: '0.7rem', color: '#666' } },
                  { id: 'des-6', type: 'Text', props: { text: 'HERMES' }, styles: { fontSize: '0.7rem', color: '#666' } }
                ]
              }
            ]
          },
          {
            id: 'product-grid',
            type: 'Container',
            styles: {
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              padding: '1.5rem'
            },
            children: [
              { id: 'prod-1', type: 'ProductCard', props: { designer: 'Adidas', name: 'Yeezy 350 "Earth"', price: 499.00, oldPrice: 599.00, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', category: 'FOOTWEAR' }, styles: {} },
              { id: 'prod-2', type: 'ProductCard', props: { designer: 'Adidas', name: 'Yeezy 350 "Bone"', price: 499.00, oldPrice: 599.00, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', category: 'FOOTWEAR' }, styles: {} },
              { id: 'prod-3', type: 'ProductCard', props: { designer: 'Adidas', name: 'Yeezy 350 "Oreo"', price: 499.00, oldPrice: 599.00, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', category: 'FOOTWEAR' }, styles: {} },
              { id: 'prod-4', type: 'ProductCard', props: { designer: 'Adidas', name: 'Yeezy Boost "Zebra"', price: 499.00, oldPrice: 599.00, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', category: 'FOOTWEAR' }, styles: {} }
            ]
          },
          {
            id: 'sidebar-right',
            type: 'Container',
            styles: {
              borderLeft: '1px solid #eaeaea',
              padding: '1.5rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            },
            children: [
               { id: 'sort-title', type: 'Text', props: { text: 'ORDENAR' }, styles: { fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em' } },
               { id: 'sort-1', type: 'Text', props: { text: 'NOVIDADES' }, styles: { fontSize: '0.7rem', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '0.25rem', width: 'fit-content' } },
               { id: 'sort-2', type: 'Text', props: { text: 'PREÇO: MENOR PARA MAIOR' }, styles: { fontSize: '0.7rem', color: '#666' } },
               { id: 'sort-3', type: 'Text', props: { text: 'PREÇO: MAIOR PARA MENOR' }, styles: { fontSize: '0.7rem', color: '#666' } },
               { id: 'sort-4', type: 'Text', props: { text: 'MAIS AVALIADOS' }, styles: { fontSize: '0.7rem', color: '#666' } }
            ]
          }
        ]
      }
    ]
  }
];

const initialState: EditorState = {
  nodes: initialNodes,
  selectedNodeId: null,
  hoveredNodeId: null,
  viewMode: 'desktop',
  isEditMode: true,
  lastSaved: Date.now(),
  history: [initialNodes],
  historyIndex: 0,
};

const duplicateNodeWithNewIds = (node: PageNode): PageNode => {
  return {
    ...node,
    id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    children: node.children ? node.children.map(duplicateNodeWithNewIds) : undefined
  };
};

const duplicateNodeInTree = (nodes: PageNode[], targetId: string): { nodes: PageNode[], duplicatedId: string | null } => {
  let duplicatedId: string | null = null;
  const newNodes = nodes.flatMap((node) => {
    if (node.id === targetId) {
      const duplicated = duplicateNodeWithNewIds(node);
      duplicatedId = duplicated.id;
      return [node, duplicated];
    }
    if (node.children) {
      const result = duplicateNodeInTree(node.children, targetId);
      if (result.duplicatedId) duplicatedId = result.duplicatedId;
      return [{ ...node, children: result.nodes }];
    }
    return [node];
  });
  return { nodes: newNodes, duplicatedId };
};

const deleteNodeInTree = (nodes: PageNode[], targetId: string): PageNode[] => {
  return nodes.filter(node => node.id !== targetId).map(node => {
    if (node.children) {
      return { ...node, children: deleteNodeInTree(node.children, targetId) };
    }
    return node;
  });
};

const updateNodeInTree = (nodes: PageNode[], id: string, updater: (node: PageNode) => PageNode): PageNode[] => {
  return nodes.map((node) => {
    if (node.id === id) {
      return updater({ ...node });
    }
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, id, updater) };
    }
    return node;
  });
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_NODES': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.payload);
      return {
        ...state,
        nodes: action.payload,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        lastSaved: Date.now()
      };
    }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload };
    case 'HOVER_NODE':
      return { ...state, hoveredNodeId: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_EDIT_MODE':
      return { ...state, isEditMode: action.payload, selectedNodeId: action.payload ? state.selectedNodeId : null };
    case 'UPDATE_NODE_STYLE': {
      const newNodes = updateNodeInTree(state.nodes, action.payload.id, (node) => ({
        ...node,
        styles: { ...node.styles, ...action.payload.styles },
      }));
      
      if (action.payload.transient) {
        return {
          ...state,
          nodes: newNodes,
        };
      }
      
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newNodes);
      return {
        ...state,
        nodes: newNodes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        lastSaved: Date.now()
      };
    }
    case 'UPDATE_NODE_PROPS': {
      const newNodes = updateNodeInTree(state.nodes, action.payload.id, (node) => ({
        ...node,
        props: { ...node.props, ...action.payload.props },
      }));
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newNodes);
      return {
        ...state,
        nodes: newNodes,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        lastSaved: Date.now()
      };
    }
    case 'DUPLICATE_NODE': {
      const result = duplicateNodeInTree(state.nodes, action.payload);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(result.nodes);
      return {
        ...state,
        nodes: result.nodes,
        selectedNodeId: result.duplicatedId || state.selectedNodeId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        lastSaved: Date.now()
      };
    }
    case 'DELETE_NODE': {
      const newNodes = deleteNodeInTree(state.nodes, action.payload);
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newNodes);
      return {
        ...state,
        nodes: newNodes,
        selectedNodeId: state.selectedNodeId === action.payload ? null : state.selectedNodeId,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        lastSaved: Date.now()
      };
    }
    case 'UNDO':
      if (state.historyIndex > 0) {
        return {
          ...state,
          historyIndex: state.historyIndex - 1,
          nodes: state.history[state.historyIndex - 1],
        };
      }
      return state;
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        return {
          ...state,
          historyIndex: state.historyIndex + 1,
          nodes: state.history[state.historyIndex + 1],
        };
      }
      return state;
    default:
      return state;
  }
}

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
} | null>(null);

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
};
