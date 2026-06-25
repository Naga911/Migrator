import type { Node, CompilationUnit } from './uast';

export interface RuleContext {
  metadata: Record<string, any>;
  filePath?: string;
}

export interface Rule {
  name: string;
  description: string;
  priority: number;
  match(node: Node, ctx: RuleContext): boolean;
  transform(node: Node, ctx: RuleContext): Node | null;
}

export interface RuleSet {
  name: string;
  rules: Rule[];
}
