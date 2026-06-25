// src/core/pipeline.ts
// End-to-end transformation pipeline: Java → UAST → TypeScript

import { parseJava } from '../transforms/java-parser';
import { buildIR } from '../ir/builder';
import { RuleEngine } from '../rules/engine';
import { seleniumToPlaywrightRules } from '../rules/selenium';
import { assertionRules } from '../rules/assertions';
import { collectionRules } from '../rules/collections';
import { testConverterRules } from '../rules/test-converter';
import { emitTypeScript } from './emitter';
import type { CompilationUnit } from '../types/uast';

export interface TransformOptions {
  testMode?: boolean;
  sourceMap?: boolean;
  includeAssertions?: boolean;
  includeCollections?: boolean;
}

export function transformJavaToTypeScript(javaSource: string, opts: TransformOptions = {}): string {
  // 1. Parse Java
  const javaAst = parseJava(javaSource);

  // 2. Build IR (Java AST → UAST)
  let uast = buildIR(javaAst);

  // 3. Apply rules
  const rules = [...seleniumToPlaywrightRules];
  if (opts.includeAssertions !== false) {
    rules.push(...assertionRules);
  }
  if (opts.includeCollections !== false) {
    rules.push(...collectionRules);
  }
  if (opts.testMode) {
    rules.push(...testConverterRules);
  }

  const engine = new RuleEngine(rules);
  uast = engine.run(uast);

  // 4. Emit TypeScript
  return emitTypeScript(uast, {
    sourceMap: opts.sourceMap,
  });
}

export function transformUnit(javaSource: string, opts: TransformOptions = {}): CompilationUnit {
  const javaAst = parseJava(javaSource);
  let uast = buildIR(javaAst);
  const rules = [...seleniumToPlaywrightRules];
  if (opts.includeAssertions !== false) rules.push(...assertionRules);
  if (opts.includeCollections !== false) rules.push(...collectionRules);
  if (opts.testMode) rules.push(...testConverterRules);
  const engine = new RuleEngine(rules);
  return engine.run(uast);
}
