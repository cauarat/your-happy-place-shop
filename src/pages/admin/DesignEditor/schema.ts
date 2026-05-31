export type NodeType = 'Container' | 'Text' | 'Image' | 'Button' | 'ProductCard';

export interface NodeStyles {
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  display?: string;
  flexDirection?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
  gridTemplateColumns?: string;
  boxShadow?: string;
  opacity?: number;
}

export interface PageNode {
  id: string;
  type: NodeType;
  props?: Record<string, any>;
  styles?: NodeStyles;
  children?: PageNode[];
}
