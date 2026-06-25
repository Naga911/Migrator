// src/import-graph/parser.ts
// Parse import statements from Java source

export interface ImportEdge {
  source: string;
  target: string;
  type: 'direct' | 'wildcard' | 'static';
}

export function parseImports(sourceCode: string): ImportEdge[] {
  const edges: ImportEdge[] = [];
  const lines = sourceCode.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('import ')) continue;

    const isStatic = trimmed.includes(' static ');
    const isWildcard = trimmed.endsWith('.*;');

    // Extract package path
    let path = trimmed.replace(/^import\s+/, '').replace(/;/, '').trim();
    if (isStatic) {
      path = path.replace(/^static\s+/, '').trim();
    }

    edges.push({
      source: '', // filled by caller
      target: path,
      type: isWildcard ? 'wildcard' : (isStatic ? 'static' : 'direct'),
    });
  }

  return edges;
}
