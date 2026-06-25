// src/import-graph/graph-builder.ts
// Build import dependency graph from multiple files

import { parseImports } from './parser';

export interface ImportGraph {
  nodes: Set<string>;
  edges: { from: string; to: string; type: string }[];
}

export function buildImportGraph(files: Map<string, string>): ImportGraph {
  const nodes = new Set<string>();
  const edges: { from: string; to: string; type: string }[] = [];

  for (const [filePath, content] of files) {
    nodes.add(filePath);
    const imports = parseImports(content);
    for (const imp of imports) {
      edges.push({
        from: filePath,
        to: imp.target,
        type: imp.type,
      });
    }
  }

  return { nodes, edges };
}

export function topologicalSort(graph: ImportGraph): string[] {
  const visited = new Set<string>();
  const temp = new Set<string>();
  const result: string[] = [];

  function visit(node: string) {
    if (temp.has(node)) return; // cycle
    if (visited.has(node)) return;
    temp.add(node);
    for (const edge of graph.edges) {
      if (edge.from === node) {
        visit(edge.to);
      }
    }
    temp.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const node of graph.nodes) {
    visit(node);
  }

  return result;
}
