import type { Node, CompilationUnit } from '../types/uast';
import type { Rule, RuleContext } from '../types/rule';

export class RuleEngine {
  private rules: Rule[];

  constructor(rules: Rule[]) {
    this.rules = [...rules].sort((a, b) => a.priority - b.priority);
  }

  run(unit: CompilationUnit): CompilationUnit {
    const ctx: RuleContext = { metadata: {} };
    let changed = true;
    let iterations = 0;
    const maxIterations = 50;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      const result = this.visitNode(unit, ctx);
      if (result !== unit) {
        unit = result as CompilationUnit;
        changed = true;
      }
    }

    return unit;
  }

  private visitNode(node: Node, ctx: RuleContext): Node | null {
    // Try each rule
    for (const rule of this.rules) {
      if (rule.match(node, ctx)) {
        const result = rule.transform(node, ctx);
        if (result !== node) {
          // If result is null, node is removed
          if (result === null) return null;
          // Visit children of transformed node
          return this.visitChildren(result, ctx);
        }
      }
    }

    // No rule matched - visit children
    return this.visitChildren(node, ctx);
  }

  private visitChildren(node: Node, ctx: RuleContext): Node {
    const any = node as any;
    const keys = Object.keys(any).filter(k => k !== 'kind' && k !== 'loc');

    for (const key of keys) {
      const val = any[key];
      if (val && typeof val === 'object') {
        if (Array.isArray(val)) {
          const newArr: any[] = [];
          for (const item of val) {
            if (item && typeof item === 'object' && 'kind' in item) {
              const result = this.visitNode(item, ctx);
              if (result !== null) newArr.push(result);
            } else {
              newArr.push(item);
            }
          }
          any[key] = newArr;
        } else if ('kind' in val) {
          const result = this.visitNode(val, ctx);
          if (result !== null) {
            any[key] = result;
          }
        }
      }
    }

    return node;
  }
}
