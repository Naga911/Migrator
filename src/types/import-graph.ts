export interface ImportNode {
  id: string;
  filePath: string;
  package?: string;
}

export interface ImportEdge {
  from: string;
  to: string;
  type: 'explicit' | 'wildcard' | 'static';
  symbol?: string;
}

export interface ImportGraph {
  nodes: Map<string, ImportNode>;
  edges: ImportEdge[];
}
