// src/core/emitter.ts
// UAST → TypeScript emitter with Playwright support
// Handles: async/await injection, @playwright/test imports, test() syntax

import type {
  Node, CompilationUnit, ImportDeclaration, ClassDeclaration, InterfaceDeclaration,
  EnumDeclaration, FieldDeclaration, MethodDeclaration, ConstructorDeclaration,
  Parameter, Modifier, Annotation, TypeReference, PrimitiveType, ArrayType,
  Block, VariableDeclaration, ExpressionStatement, IfStatement, WhileStatement,
  ForStatement, ForEachStatement, ReturnStatement, TryStatement, CatchClause,
  ThrowStatement, BreakStatement, ContinueStatement, SwitchStatement, SwitchCase,
  Identifier, Literal, MemberExpression, CallExpression, NewExpression,
  AssignmentExpression, BinaryExpression, UnaryExpression, TernaryExpression,
  ArrayExpression, ObjectExpression, Property, ArrowFunctionExpression,
  AwaitExpression, ThisExpression, SuperExpression, CastExpression,
  InstanceOfExpression, LambdaExpression, Expression, Statement, TypeNode
} from '../types/uast';

export interface EmitterOptions {
  indent?: string;
  lineEnding?: string;
  sourceMap?: boolean;
}

const DEFAULT_OPTIONS: EmitterOptions = {
  indent: '  ',
  lineEnding: '
',
};

export class TypeScriptEmitter {
  private opts: EmitterOptions;
  private indentLevel = 0;
  private output = '';
  private needsAwait = false;

  constructor(opts: EmitterOptions = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  emit(unit: CompilationUnit): string {
    this.output = '';
    this.indentLevel = 0;
    this.visit(unit);
    return this.output.trim() + this.opts.lineEnding!;
  }

  private write(text: string) {
    this.output += text;
  }

  private writeLine(text: string = '') {
    this.write(this.indent() + text + this.opts.lineEnding!);
  }

  private indent(): string {
    return this.opts.indent!.repeat(this.indentLevel);
  }

  private withIndent<T>(fn: () => T): T {
    this.indentLevel++;
    const result = fn();
    this.indentLevel--;
    return result;
  }

  // ─── Node dispatch ─────────────────────────────────────────────────────────

  private visit(node: Node): void {
    switch (node.kind) {
      case 'CompilationUnit': this.visitCompilationUnit(node as CompilationUnit); break;
      case 'ImportDeclaration': this.visitImport(node as ImportDeclaration); break;
      case 'ClassDeclaration': this.visitClass(node as ClassDeclaration); break;
      case 'InterfaceDeclaration': this.visitInterface(node as InterfaceDeclaration); break;
      case 'EnumDeclaration': this.visitEnum(node as EnumDeclaration); break;
      case 'EnumConstant': this.visitEnumConstant(node as any); break;
      case 'FieldDeclaration': this.visitField(node as FieldDeclaration); break;
      case 'MethodDeclaration': this.visitMethod(node as MethodDeclaration); break;
      case 'ConstructorDeclaration': this.visitConstructor(node as ConstructorDeclaration); break;
      case 'Parameter': this.visitParameter(node as Parameter); break;
      case 'Block': this.visitBlock(node as Block); break;
      case 'VariableDeclaration': this.visitVariableDecl(node as VariableDeclaration); break;
      case 'ExpressionStatement': this.visitExprStmt(node as ExpressionStatement); break;
      case 'IfStatement': this.visitIf(node as IfStatement); break;
      case 'WhileStatement': this.visitWhile(node as WhileStatement); break;
      case 'ForStatement': this.visitFor(node as ForStatement); break;
      case 'ForEachStatement': this.visitForEach(node as ForEachStatement); break;
      case 'ReturnStatement': this.visitReturn(node as ReturnStatement); break;
      case 'TryStatement': this.visitTry(node as TryStatement); break;
      case 'CatchClause': this.visitCatch(node as CatchClause); break;
      case 'ThrowStatement': this.visitThrow(node as ThrowStatement); break;
      case 'BreakStatement': this.visitBreak(node as BreakStatement); break;
      case 'ContinueStatement': this.visitContinue(node as ContinueStatement); break;
      case 'SwitchStatement': this.visitSwitch(node as SwitchStatement); break;
      case 'SwitchCase': this.visitSwitchCase(node as SwitchCase); break;
      case 'Identifier': this.visitIdentifier(node as Identifier); break;
      case 'Literal': this.visitLiteral(node as Literal); break;
      case 'MemberExpression': this.visitMemberExpr(node as MemberExpression); break;
      case 'CallExpression': this.visitCallExpr(node as CallExpression); break;
      case 'NewExpression': this.visitNewExpr(node as NewExpression); break;
      case 'AssignmentExpression': this.visitAssignExpr(node as AssignmentExpression); break;
      case 'BinaryExpression': this.visitBinaryExpr(node as BinaryExpression); break;
      case 'UnaryExpression': this.visitUnaryExpr(node as UnaryExpression); break;
      case 'TernaryExpression': this.visitTernaryExpr(node as TernaryExpression); break;
      case 'ArrayExpression': this.visitArrayExpr(node as ArrayExpression); break;
      case 'ObjectExpression': this.visitObjectExpr(node as ObjectExpression); break;
      case 'Property': this.visitProperty(node as Property); break;
      case 'ArrowFunctionExpression': this.visitArrowFn(node as ArrowFunctionExpression); break;
      case 'AwaitExpression': this.visitAwait(node as AwaitExpression); break;
      case 'ThisExpression': this.write('this'); break;
      case 'SuperExpression': this.write('super'); break;
      case 'CastExpression': this.visitCast(node as CastExpression); break;
      case 'InstanceOfExpression': this.visitInstanceOf(node as InstanceOfExpression); break;
      case 'LambdaExpression': this.visitLambda(node as LambdaExpression); break;
      case 'Modifier': this.write((node as Modifier).value); break;
      case 'Annotation': break; // Annotations not emitted in TS
      case 'TypeReference': this.visitTypeRef(node as TypeReference); break;
      case 'PrimitiveType': this.visitPrimitiveType(node as PrimitiveType); break;
      case 'ArrayType': this.visitArrayType(node as ArrayType); break;
      case 'VoidType': this.write('void'); break;
      case 'UnionType': this.write((node as any).types.map((t: any) => this.typeToString(t)).join(' | ')); break;
      case 'FunctionType': this.write('Function'); break;
      default:
        // Graceful fallback: emit as comment instead of garbage
        this.writeLine(`/* TODO: unhandled node kind: ${node.kind} */`);
    }
  }

  // ─── Compilation Unit ────────────────────────────────────────────────────

  private visitCompilationUnit(unit: CompilationUnit) {
    // Imports
    for (const imp of unit.imports) {
      this.visit(imp);
    }
    if (unit.imports.length > 0) this.writeLine();

    // Types
    for (const type of unit.types) {
      this.visit(type);
      this.writeLine();
    }
  }

  private visitImport(imp: ImportDeclaration) {
    if (imp.name === '@playwright/test') {
      this.writeLine(`import { test, expect, Page, Locator } from '@playwright/test';`);
    } else if (!imp.static && !imp.wildcard) {
      this.writeLine(`// import { ${imp.name.split('.').pop()} } from '${imp.name}';`);
    } else if (imp.wildcard) {
      this.writeLine(`// import * as ${imp.name.split('.').pop()} from '${imp.name}';`);
    }
  }

  // ─── Class ─────────────────────────────────────────────────────────────────

  private visitClass(cls: ClassDeclaration) {
    const mods = cls.modifiers.map(m => m.value).join(' ');
    const extendsClause = cls.superClass ? ` extends ${this.typeToString(cls.superClass)}` : '';
    const impls = cls.interfaces.length > 0 ? ` implements ${cls.interfaces.map(i => this.typeToString(i)).join(', ')}` : '';

    this.writeLine(`${mods} class ${cls.name}${extendsClause}${impls} {`);

    this.withIndent(() => {
      for (const member of cls.body) {
        this.visit(member);
      }
    });

    this.writeLine('}');
  }

  // ─── Interface ─────────────────────────────────────────────────────────────

  private visitInterface(intf: InterfaceDeclaration) {
    const mods = intf.modifiers.map(m => m.value).join(' ');
    const extendsClause = intf.superInterfaces.length > 0
      ? ` extends ${intf.superInterfaces.map(i => this.typeToString(i)).join(', ')}`
      : '';

    this.writeLine(`${mods} interface ${intf.name}${extendsClause} {`);

    this.withIndent(() => {
      for (const member of intf.body) {
        this.visit(member);
      }
    });

    this.writeLine('}');
  }

  // ─── Enum ────────────────────────────────────────────────────────────────

  private visitEnum(enm: EnumDeclaration) {
    const mods = enm.modifiers.map(m => m.value).join(' ');
    this.writeLine(`${mods} enum ${enm.name} {`);

    this.withIndent(() => {
      for (const c of enm.constants) {
        this.visit(c);
        this.writeLine(',');
      }
      for (const member of enm.body) {
        this.visit(member);
      }
    });

    this.writeLine('}');
  }

  private visitEnumConstant(c: any) {
    this.write(this.indent() + c.name);
    if (c.arguments && c.arguments.length > 0) {
      this.write('(');
      for (let i = 0; i < c.arguments.length; i++) {
        if (i > 0) this.write(', ');
        this.visit(c.arguments[i]);
      }
      this.write(')');
    }
  }

  // ─── Field ───────────────────────────────────────────────────────────────

  private visitField(field: FieldDeclaration) {
    const mods = field.modifiers.map(m => m.value).join(' ');
    const typeStr = field.type ? this.typeToString(field.type) : 'any';
    this.write(this.indent() + (mods ? mods + ' ' : '') + field.name + ': ' + typeStr);
    if (field.initializer) {
      this.write(' = ');
      this.visit(field.initializer);
    }
    this.writeLine(';');
  }

  // ─── Method ────────────────────────────────────────────────────────────────

  private visitMethod(method: MethodDeclaration) {
    const mods = method.modifiers.map(m => m.value).join(' ');
    const asyncPrefix = mods.includes('async') ? 'async ' : '';
    const staticPrefix = mods.includes('static') ? 'static ' : '';
    const access = mods.includes('private') ? 'private ' : '';
    const name = method.name;
    const params = method.parameters.map(p => this.paramToString(p)).join(', ');
    const returnType = method.returnType ? `: ${this.typeToString(method.returnType)}` : '';

    this.writeLine(`${this.indent()}${access}${staticPrefix}${asyncPrefix}${name}(${params})${returnType} {`);

    if (method.body) {
      this.withIndent(() => {
        for (const stmt of method.body.statements) {
          this.visit(stmt);
        }
      });
    }

    this.writeLine(`${this.indent()}}`);
  }

  // ─── Constructor ─────────────────────────────────────────────────────────

  private visitConstructor(ctor: ConstructorDeclaration) {
    const mods = ctor.modifiers.map(m => m.value).join(' ');
    const params = ctor.parameters.map(p => this.paramToString(p)).join(', ');
    this.writeLine(`${this.indent()}${mods ? mods + ' ' : ''}constructor(${params}) {`);

    this.withIndent(() => {
      for (const stmt of ctor.body.statements) {
        this.visit(stmt);
      }
    });

    this.writeLine(`${this.indent()}}`);
  }

  // ─── Parameter ───────────────────────────────────────────────────────────

  private visitParameter(param: Parameter) {
    this.write(param.name);
    if (param.type) {
      this.write(': ' + this.typeToString(param.type));
    }
  }

  private paramToString(param: Parameter): string {
    let result = param.name;
    if (param.type) {
      result += ': ' + this.typeToString(param.type);
    }
    return result;
  }

  // ─── Block ───────────────────────────────────────────────────────────────

  private visitBlock(block: Block) {
    this.writeLine('{');
    this.withIndent(() => {
      for (const stmt of block.statements) {
        this.visit(stmt);
      }
    });
    this.write(this.indent() + '}');
  }

  // ─── Statements ──────────────────────────────────────────────────────────

  private visitVariableDecl(decl: VariableDeclaration) {
    const keyword = decl.modifiers?.some(m => m.value === 'const') ? 'const' : 'let';
    const typeStr = decl.type ? `: ${this.typeToString(decl.type)}` : '';
    this.write(this.indent() + keyword + ' ' + decl.name + typeStr);
    if (decl.initializer) {
      this.write(' = ');
      this.visit(decl.initializer);
    }
    this.writeLine(';');
  }

  private visitExprStmt(stmt: ExpressionStatement) {
    const expr = stmt.expression;

    // Check if this is a Playwright async call that needs await
    if (this.isPlaywrightAsyncCall(expr)) {
      this.write(this.indent() + 'await ');
      this.visit(expr);
      this.writeLine(';');
      return;
    }

    this.write(this.indent());
    this.visit(expr);
    this.writeLine(';');
  }

  private isPlaywrightAsyncCall(expr: Expression): boolean {
    if (expr.kind !== 'CallExpression') return false;
    const call = expr as CallExpression;

    // Check for page.*, locator.*, elementHandle.* async methods
    const asyncMethods = [
      'goto', 'click', 'fill', 'type', 'press', 'hover', 'focus', 'scrollIntoViewIfNeeded',
      'selectOption', 'check', 'uncheck', 'setInputFiles', 'tap', 'dragTo',
      'screenshot', 'pdf', 'close', 'reload', 'goBack', 'goForward',
      'waitForSelector', 'waitForLoadState', 'waitForNavigation', 'waitForURL',
      'waitForEvent', 'waitForTimeout', 'waitForFunction', 'evaluate', 'evaluateHandle',
      'addInitScript', 'route', 'unroute', 'setViewportSize', 'setExtraHTTPHeaders',
      'setDefaultTimeout', 'setDefaultNavigationTimeout',
      'title', 'url', 'content', 'textContent', 'innerText', 'innerHTML',
      'getAttribute', 'inputValue', 'isVisible', 'isHidden', 'isEnabled', 'isDisabled',
      'isEditable', 'isChecked', 'boundingBox', 'all', 'allInnerTexts', 'allTextContents',
      'count', 'nth', 'first', 'last', 'filter', 'frameLocator', 'getByRole',
      'getByText', 'getByLabel', 'getByPlaceholder', 'getByTitle', 'getByTestId',
      'dblclick', 'setChecked', 'dispatchEvent',
    ];

    if (call.callee.kind === 'MemberExpression') {
      const callee = call.callee as MemberExpression;
      if (asyncMethods.includes(callee.property)) {
        return true;
      }
    }

    // Also check for expect().toBeVisible() etc.
    if (call.callee.kind === 'CallExpression') {
      const innerCall = call.callee as CallExpression;
      if (innerCall.callee.kind === 'MemberExpression') {
        const innerCallee = innerCall.callee as MemberExpression;
        if (innerCallee.object.kind === 'CallExpression') {
          const expectCall = innerCallee.object as CallExpression;
          if (expectCall.callee.kind === 'Identifier' && (expectCall.callee as Identifier).name === 'expect') {
            return true; // expect(...).toBeXxx() is not async, but we handle it differently
          }
        }
      }
    }

    return false;
  }

  private visitIf(stmt: IfStatement) {
    this.write(this.indent() + 'if (');
    this.visit(stmt.condition);
    this.write(') ');
    if (stmt.thenBranch.kind === 'Block') {
      this.visitBlock(stmt.thenBranch as Block);
    } else {
      this.writeLine('{');
      this.withIndent(() => this.visit(stmt.thenBranch));
      this.writeLine('}');
    }
    if (stmt.elseBranch) {
      this.writeLine(`${this.indent()}else {`);
      this.withIndent(() => this.visit(stmt.elseBranch!));
      this.writeLine(`${this.indent()}}`);
    }
  }

  private visitWhile(stmt: WhileStatement) {
    this.write(this.indent() + 'while (');
    this.visit(stmt.condition);
    this.writeLine(') {');
    this.withIndent(() => {
      for (const s of stmt.body.statements) {
        this.visit(s);
      }
    });
    this.writeLine(`${this.indent()}}`);
  }

  private visitFor(stmt: ForStatement) {
    this.write(this.indent() + 'for (');
    if (stmt.initializer) {
      if (stmt.initializer.kind === 'VariableDeclaration') {
        const vd = stmt.initializer as VariableDeclaration;
        this.write(`let ${vd.name}`);
        if (vd.initializer) {
          this.write(' = ');
          this.visit(vd.initializer);
        }
      } else {
        this.visit(stmt.initializer as Expression);
      }
    }
    this.write('; ');
    if (stmt.condition) this.visit(stmt.condition);
    this.write('; ');
    if (stmt.update) this.visit(stmt.update);
    this.writeLine(') {');
    this.withIndent(() => {
      for (const s of stmt.body.statements) {
        this.visit(s);
      }
    });
    this.writeLine(`${this.indent()}}`);
  }

  private visitForEach(stmt: ForEachStatement) {
    this.write(this.indent() + 'for (const ');
    this.write(stmt.variable.name);
    this.write(' of ');
    this.visit(stmt.iterable);
    this.writeLine(') {');
    this.withIndent(() => {
      for (const s of stmt.body.statements) {
        this.visit(s);
      }
    });
    this.writeLine(`${this.indent()}}`);
  }

  private visitReturn(stmt: ReturnStatement) {
    this.write(this.indent() + 'return');
    if (stmt.argument) {
      this.write(' ');
      this.visit(stmt.argument);
    }
    this.writeLine(';');
  }

  private visitTry(stmt: TryStatement) {
    this.writeLine(`${this.indent()}try {`);
    this.withIndent(() => {
      for (const s of stmt.block.statements) {
        this.visit(s);
      }
    });
    this.writeLine(`${this.indent()}}`);
    for (const handler of stmt.handlers) {
      this.visit(handler);
    }
    if (stmt.finalizer) {
      this.writeLine(`${this.indent()}finally {`);
      this.withIndent(() => {
        for (const s of stmt.finalizer!.statements) {
          this.visit(s);
        }
      });
      this.writeLine(`${this.indent()}}`);
    }
  }

  private visitCatch(clause: CatchClause) {
    this.write(`${this.indent()}catch (`);
    if (clause.param) {
      this.write(clause.param.name);
      if (clause.param.type) {
        this.write(': ' + this.typeToString(clause.param.type));
      }
    }
    this.writeLine(') {');
    this.withIndent(() => {
      for (const s of clause.body.statements) {
        this.visit(s);
      }
    });
    this.writeLine(`${this.indent()}}`);
  }

  private visitThrow(stmt: ThrowStatement) {
    this.write(this.indent() + 'throw ');
    this.visit(stmt.argument);
    this.writeLine(';');
  }

  private visitBreak(_stmt: BreakStatement) {
    this.writeLine(this.indent() + 'break;');
  }

  private visitContinue(_stmt: ContinueStatement) {
    this.writeLine(this.indent() + 'continue;');
  }

  private visitSwitch(stmt: SwitchStatement) {
    this.write(this.indent() + 'switch (');
    this.visit(stmt.expression);
    this.writeLine(') {');
    this.withIndent(() => {
      for (const c of stmt.cases) {
        this.visit(c);
      }
    });
    this.writeLine(`${this.indent()}}`);
  }

  private visitSwitchCase(c: SwitchCase) {
    if (c.expression) {
      this.write(this.indent() + 'case ');
      this.visit(c.expression);
      this.writeLine(':');
    } else {
      this.writeLine(this.indent() + 'default:');
    }
    this.withIndent(() => {
      for (const s of c.statements) {
        this.visit(s);
      }
    });
  }

  // ─── Expressions ─────────────────────────────────────────────────────────

  private visitIdentifier(node: Identifier) {
    this.write(node.name);
  }

  private visitLiteral(node: Literal) {
    if (typeof node.value === 'string') {
      this.write(JSON.stringify(node.value));
    } else if (typeof node.value === 'boolean') {
      this.write(String(node.value));
    } else if (node.value === null) {
      this.write('null');
    } else if (node.value === undefined) {
      this.write('undefined');
    } else {
      this.write(String(node.value));
    }
  }

  private visitMemberExpr(node: MemberExpression) {
    this.visit(node.object);
    if (node.computed) {
      this.write('[');
      this.visit(node.property as any);
      this.write(']');
    } else {
      this.write('.' + node.property);
    }
  }

  private visitCallExpr(node: CallExpression) {
    // Special handling for expect().toBeXxx() chains
    if (this.isExpectChain(node)) {
      this.emitExpectChain(node);
      return;
    }

    // Special handling for test() calls
    if (this.isTestCall(node)) {
      this.emitTestCall(node);
      return;
    }

    // Special handling for beforeEach/afterEach/beforeAll/afterAll
    if (this.isHookCall(node)) {
      this.emitHookCall(node);
      return;
    }

    this.visit(node.callee);
    this.write('(');
    for (let i = 0; i < node.arguments.length; i++) {
      if (i > 0) this.write(', ');
      this.visit(node.arguments[i]);
    }
    this.write(')');
  }

  private isExpectChain(node: CallExpression): boolean {
    if (node.callee.kind !== 'MemberExpression') return false;
    const callee = node.callee as MemberExpression;
    if (callee.object.kind === 'CallExpression') {
      const inner = callee.object as CallExpression;
      if (inner.callee.kind === 'Identifier' && (inner.callee as Identifier).name === 'expect') {
        return true;
      }
    }
    if (callee.object.kind === 'MemberExpression') {
      const innerObj = callee.object as MemberExpression;
      if (innerObj.object.kind === 'CallExpression') {
        const inner = innerObj.object as CallExpression;
        if (inner.callee.kind === 'Identifier' && (inner.callee as Identifier).name === 'expect') {
          return true;
        }
      }
    }
    return false;
  }

  private emitExpectChain(node: CallExpression) {
    // expect(actual).toBe(expected) or expect(actual).not.toBe(expected)
    let current: any = node;
    const chain: string[] = [];
    let args: Expression[] = [...node.arguments];

    while (current && current.kind === 'CallExpression') {
      if (current.callee.kind === 'MemberExpression') {
        const callee = current.callee as MemberExpression;
        chain.unshift(callee.property);
        if (callee.object.kind === 'CallExpression') {
          current = callee.object;
        } else if (callee.object.kind === 'MemberExpression') {
          // Handle .not chain
          const parent = callee.object as MemberExpression;
          if (parent.property === 'not') {
            chain.unshift('not');
            if (parent.object.kind === 'CallExpression') {
              current = parent.object;
            } else {
              break;
            }
          } else {
            break;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // current should now be the expect() call
    if (current && current.kind === 'CallExpression' && current.callee.kind === 'Identifier') {
      const expectCall = current as CallExpression;
      this.write('expect(');
      this.visit(expectCall.arguments[0]);
      this.write(')');
      for (const prop of chain) {
        this.write('.' + prop);
      }
      if (args.length > 0) {
        this.write('(');
        for (let i = 0; i < args.length; i++) {
          if (i > 0) this.write(', ');
          this.visit(args[i]);
        }
        this.write(')');
      }
    } else {
      // Fallback
      this.visit(node.callee);
      this.write('(');
      for (let i = 0; i < node.arguments.length; i++) {
        if (i > 0) this.write(', ');
        this.visit(node.arguments[i]);
      }
      this.write(')');
    }
  }

  private isTestCall(node: CallExpression): boolean {
    if (node.callee.kind !== 'MemberExpression') return false;
    const callee = node.callee as MemberExpression;
    if (callee.object.kind !== 'Identifier') return false;
    return callee.object.name === 'test' && ['test', 'describe', 'only', 'skip'].includes(callee.property);
  }

  private emitTestCall(node: CallExpression) {
    const callee = node.callee as MemberExpression;
    this.write('test.' + callee.property + '(');
    for (let i = 0; i < node.arguments.length; i++) {
      if (i > 0) this.write(', ');
      this.visit(node.arguments[i]);
    }
    this.write(')');
  }

  private isHookCall(node: CallExpression): boolean {
    if (node.callee.kind !== 'Identifier') return false;
    const hooks = ['beforeEach', 'afterEach', 'beforeAll', 'afterAll'];
    return hooks.includes((node.callee as Identifier).name);
  }

  private emitHookCall(node: CallExpression) {
    this.write((node.callee as Identifier).name + '(');
    for (let i = 0; i < node.arguments.length; i++) {
      if (i > 0) this.write(', ');
      this.visit(node.arguments[i]);
    }
    this.write(')');
  }

  private visitNewExpr(node: NewExpression) {
    this.write('new ');
    this.visit(node.callee);
    this.write('(');
    for (let i = 0; i < node.arguments.length; i++) {
      if (i > 0) this.write(', ');
      this.visit(node.arguments[i]);
    }
    this.write(')');
  }

  private visitAssignExpr(node: AssignmentExpression) {
    this.visit(node.left);
    this.write(' ' + node.operator + ' ');
    this.visit(node.right);
  }

  private visitBinaryExpr(node: BinaryExpression) {
    this.visit(node.left);
    this.write(' ' + node.operator + ' ');
    this.visit(node.right);
  }

  private visitUnaryExpr(node: UnaryExpression) {
    if (node.prefix) {
      this.write(node.operator);
      this.visit(node.operand);
    } else {
      this.visit(node.operand);
      this.write(node.operator);
    }
  }

  private visitTernaryExpr(node: TernaryExpression) {
    this.visit(node.condition);
    this.write(' ? ');
    this.visit(node.thenBranch);
    this.write(' : ');
    this.visit(node.elseBranch);
  }

  private visitArrayExpr(node: ArrayExpression) {
    this.write('[');
    for (let i = 0; i < node.elements.length; i++) {
      if (i > 0) this.write(', ');
      this.visit(node.elements[i]);
    }
    this.write(']');
  }

  private visitObjectExpr(node: ObjectExpression) {
    this.write('{ ');
    for (let i = 0; i < node.properties.length; i++) {
      if (i > 0) this.write(', ');
      this.visit(node.properties[i]);
    }
    this.write(' }');
  }

  private visitProperty(node: Property) {
    this.write(node.key + ': ');
    this.visit(node.value);
  }

  private visitArrowFn(node: ArrowFunctionExpression) {
    const params = node.parameters.map(p => p.name).join(', ');
    const asyncPrefix = node.async ? 'async ' : '';
    this.write(asyncPrefix + '(' + params + ') => ');
    if (node.body.kind === 'Block') {
      this.visitBlock(node.body as Block);
    } else {
      this.visit(node.body as Expression);
    }
  }

  private visitAwait(node: AwaitExpression) {
    this.write('await ');
    this.visit(node.argument);
  }

  private visitCast(node: CastExpression) {
    this.visit(node.expression);
    this.write(' as ');
    this.visitTypeRef(node.type as TypeReference);
  }

  private visitInstanceOf(node: InstanceOfExpression) {
    this.visit(node.expression);
    this.write(' instanceof ');
    this.visitTypeRef(node.type as TypeReference);
  }

  private visitLambda(node: LambdaExpression) {
    const params = node.parameters.map(p => p.name).join(', ');
    this.write('(' + params + ') => ');
    if (node.body.kind === 'Block') {
      this.visitBlock(node.body as Block);
    } else {
      this.visit(node.body as Expression);
    }
  }

  // ─── Types ───────────────────────────────────────────────────────────────

  private typeToString(type: TypeNode): string {
    switch (type.kind) {
      case 'TypeReference':
        const tr = type as TypeReference;
        // Handle Promise<T> specially
        if (tr.name.startsWith('Promise<')) {
          return tr.name;
        }
        // Map Java types
        const typeMap: Record<string, string> = {
          'String': 'string', 'Integer': 'number', 'Long': 'number', 'Double': 'number',
          'Float': 'number', 'Boolean': 'boolean', 'Character': 'string',
          'Object': 'any', 'Class': 'any', 'Exception': 'Error',
          'RuntimeException': 'Error', 'Throwable': 'Error',
          'File': 'string', 'InputStream': 'Buffer', 'OutputStream': 'Buffer',
          'Date': 'Date', 'LocalDate': 'Date', 'LocalDateTime': 'Date',
          'UUID': 'string', 'BigDecimal': 'number',
          'Logger': 'Console', 'LogManager': 'console',
        };
        return typeMap[tr.name] || tr.name;
      case 'PrimitiveType':
        const pt = type as PrimitiveType;
        const primMap: Record<string, string> = {
          'int': 'number', 'long': 'number', 'short': 'number',
          'byte': 'number', 'float': 'number', 'double': 'number',
          'boolean': 'boolean', 'char': 'string',
        };
        return primMap[pt.name] || pt.name;
      case 'ArrayType':
        return this.typeToString((type as ArrayType).elementType) + '[]';
      case 'VoidType':
        return 'void';
      case 'UnionType':
        return (type as any).types.map((t: any) => this.typeToString(t)).join(' | ');
      case 'FunctionType':
        return 'Function';
      default:
        return 'any';
    }
  }

  private visitTypeRef(node: TypeReference) {
    this.write(this.typeToString(node));
  }

  private visitPrimitiveType(node: PrimitiveType) {
    this.write(this.typeToString(node));
  }

  private visitArrayType(node: ArrayType) {
    this.write(this.typeToString(node.elementType) + '[]');
  }
}

export function emitTypeScript(unit: CompilationUnit, opts?: EmitterOptions): string {
  return new TypeScriptEmitter(opts).emit(unit);
}
