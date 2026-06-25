// Java Recursive Descent Parser with all critical fixes
// Fixes: expression statement ambiguity, new expression parsing, extends clause, type declarations

import type { JavaCompilationUnit, JavaImport, JavaTypeDecl, JavaClass, JavaInterface, JavaEnum, JavaMember, JavaInterfaceMember, JavaField, JavaMethod, JavaConstructor, JavaParam, JavaAnnotation, JavaType, JavaStmt, JavaBlock, JavaExpr, JavaIdent, JavaLiteral, JavaMember as JavaMemberExpr, JavaCall, JavaNew, JavaAssign, JavaBinary, JavaUnary, JavaTernary, JavaArrayExpr, JavaThis, JavaSuper, JavaCast, JavaInstanceOf, JavaLambda, JavaVarDecl, JavaExprStmt, JavaIf, JavaWhile, JavaFor, JavaForEach, JavaReturn, JavaTry, JavaCatch, JavaThrow, JavaBreak, JavaContinue, JavaSwitch, JavaCase, JavaEnumConstant } from '../types/java-ast';

const KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
  'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float',
  'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long',
  'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try',
  'void', 'volatile', 'while', 'true', 'false', 'null'
]);

const TYPE_KEYWORDS = new Set(['boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void']);

interface Token {
  type: 'KEYWORD' | 'IDENTIFIER' | 'STRING' | 'NUMBER' | 'OPERATOR' | 'DELIMITER' | 'EOF';
  value: string;
  line: number;
  column: number;
}

class Tokenizer {
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(private source: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      if (this.pos >= this.source.length) break;

      const tok = this.nextToken();
      if (tok) tokens.push(tok);
    }
    tokens.push({ type: 'EOF', value: '', line: this.line, column: this.column });
    return tokens;
  }

  private skipWhitespace() {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.pos++;
        this.column++;
      } else if (ch === '\n') {
        this.pos++;
        this.line++;
        this.column = 1;
      } else if (ch === '/' && this.source[this.pos + 1] === '/') {
        // Single-line comment
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.pos++;
        }
      } else if (ch === '/' && this.source[this.pos + 1] === '*') {
        // Multi-line comment
        this.pos += 2;
        while (this.pos < this.source.length - 1 && !(this.source[this.pos] === '*' && this.source[this.pos + 1] === '/')) {
          if (this.source[this.pos] === '\n') { this.line++; this.column = 1; }
          this.pos++;
        }
        this.pos += 2;
      } else {
        break;
      }
    }
  }

  private nextToken(): Token | null {
    const ch = this.source[this.pos];
    const startLine = this.line;
    const startCol = this.column;

    // String literals
    if (ch === '"' || ch === "'") {
      return this.readString(ch, startLine, startCol);
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      return this.readNumber(startLine, startCol);
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      return this.readIdentifier(startLine, startCol);
    }

    // @ for annotations
    if (ch === '@') {
      this.pos++;
      this.column++;
      const ident = this.readIdentifier(startLine, startCol);
      return { type: 'IDENTIFIER', value: '@' + ident.value, line: startLine, column: startCol };
    }

    // Multi-char operators
    const twoChar = this.source.substring(this.pos, this.pos + 2);
    const operators2 = ['<=', '>=', '==', '!=', '&&', '||', '++', '--', '->', '::', '<<', '>>', '+=', '-=', '*=', '/=', '%='];
    if (operators2.includes(twoChar)) {
      this.pos += 2;
      this.column += 2;
      return { type: 'OPERATOR', value: twoChar, line: startLine, column: startCol };
    }

    // Single-char operators and delimiters
    const operators1 = new Set(['+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':', '.']);
    const delimiters = new Set(['(', ')', '{', '}', '[', ']', ',', ';']);

    if (operators1.has(ch)) {
      this.pos++;
      this.column++;
      return { type: 'OPERATOR', value: ch, line: startLine, column: startCol };
    }

    if (delimiters.has(ch)) {
      this.pos++;
      this.column++;
      return { type: 'DELIMITER', value: ch, line: startLine, column: startCol };
    }

    // Unknown character - skip
    this.pos++;
    this.column++;
    return null;
  }

  private readString(quote: string, line: number, col: number): Token {
    let value = '';
    this.pos++;
    this.column++;
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        value += '\\' + this.source[this.pos + 1];
        this.pos += 2;
        this.column += 2;
      } else {
        value += this.source[this.pos];
        this.pos++;
        this.column++;
      }
    }
    this.pos++; // closing quote
    this.column++;
    return { type: 'STRING', value: quote + value + quote, line, column: col };
  }

  private readNumber(line: number, col: number): Token {
    let value = '';
    while (this.pos < this.source.length && /[0-9.]/.test(this.source[this.pos])) {
      value += this.source[this.pos];
      this.pos++;
      this.column++;
    }
    return { type: 'NUMBER', value, line, column: col };
  }

  private readIdentifier(line: number, col: number): Token {
    let value = '';
    while (this.pos < this.source.length && /[a-zA-Z0-9_$]/.test(this.source[this.pos])) {
      value += this.source[this.pos];
      this.pos++;
      this.column++;
    }
    const type = KEYWORDS.has(value) ? 'KEYWORD' : 'IDENTIFIER';
    return { type, value, line, column: col };
  }
}

export class JavaParser {
  private tokens: Token[];
  private pos = 0;
  private className = '';

  constructor(source: string) {
    this.tokens = new Tokenizer(source).tokenize();
  }

  parse(): JavaCompilationUnit {
    const loc = { line: 1, column: 1 };
    let pkg: string | undefined;

    if (this.matchKeyword('package')) {
      this.advance();
      const parts: string[] = [];
      while (this.peek().type === 'IDENTIFIER') {
        parts.push(this.advance().value);
        if (this.match('.')) this.advance();
      }
      pkg = parts.join('.');
      this.expect(';');
    }

    const imports: JavaImport[] = [];
    while (this.matchKeyword('import')) {
      imports.push(this.parseImport());
    }

    // CRITICAL FIX: Parse type declarations (class/interface/enum), NOT type references
    const types: JavaTypeDecl[] = [];
    while (!this.match('EOF')) {
      const annotations = this.parseAnnotations();
      const modifiers = this.parseModifiers();
      if (this.matchKeyword('class')) {
        types.push(this.parseClass(modifiers, annotations));
      } else if (this.matchKeyword('interface')) {
        types.push(this.parseInterface(modifiers, annotations));
      } else if (this.matchKeyword('enum')) {
        types.push(this.parseEnum(modifiers, annotations));
      } else {
        throw new Error(`Expected class, interface, or enum at line ${this.peek().line}, got ${this.peek().value}`);
      }
    }

    return { kind: 'CompilationUnit', package: pkg, imports, types, loc };
  }

  private parseImport(): JavaImport {
    const loc = { line: this.peek().line, column: this.peek().column };
    this.advance(); // import
    const static_ = this.matchKeyword('static');
    if (static_) this.advance();

    const parts: string[] = [];
    while (this.peek().type === 'IDENTIFIER') {
      parts.push(this.advance().value);
      if (this.match('.')) this.advance();
    }

    const wildcard = this.match('*');
    if (wildcard) this.advance();

    this.expect(';');
    return { kind: 'ImportDeclaration', name: parts.join('.'), static: static_, wildcard, loc };
  }

  private parseClass(modifiers: string[], annotations: JavaAnnotation[]): JavaClass {
    const loc = { line: this.peek().line, column: this.peek().column };
    this.expect('class');
    const name = this.advance().value;
    this.className = name;

    let superClass: string | undefined;
    if (this.matchKeyword('extends')) {
      this.advance();
      superClass = this.advance().value;
    }

    const interfaces: string[] = [];
    if (this.matchKeyword('implements')) {
      this.advance();
      do {
        interfaces.push(this.advance().value);
      } while (this.consume(','));
    }

    this.expect('{');
    const body: JavaMember[] = [];
    while (!this.match('}') && !this.match('EOF')) {
      body.push(this.parseClassMember());
    }
    this.expect('}');

    return { kind: 'ClassDeclaration', name, modifiers, annotations, superClass, interfaces, body, loc };
  }

  private parseInterface(modifiers: string[], annotations: JavaAnnotation[]): JavaInterface {
    const loc = { line: this.peek().line, column: this.peek().column };
    this.expect('interface');
    const name = this.advance().value;

    const superInterfaces: string[] = [];
    if (this.matchKeyword('extends')) {
      this.advance();
      do {
        superInterfaces.push(this.advance().value);
      } while (this.consume(','));
    }

    this.expect('{');
    const body: JavaInterfaceMember[] = [];
    while (!this.match('}') && !this.match('EOF')) {
      body.push(this.parseInterfaceMember());
    }
    this.expect('}');

    return { kind: 'InterfaceDeclaration', name, modifiers, annotations, superInterfaces, body, loc };
  }

  private parseEnum(modifiers: string[], annotations: JavaAnnotation[]): JavaEnum {
    const loc = { line: this.peek().line, column: this.peek().column };
    this.expect('enum');
    const name = this.advance().value;

    this.expect('{');
    const constants: JavaEnumConstant[] = [];
    while (!this.match('}') && !this.match('EOF')) {
      if (this.match(';')) {
        this.advance();
        break;
      }
      constants.push(this.parseEnumConstant());
      this.consume(',');
    }

    const body: JavaMember[] = [];
    while (!this.match('}') && !this.match('EOF')) {
      body.push(this.parseClassMember());
    }
    this.expect('}');

    return { kind: 'EnumDeclaration', name, modifiers, annotations, constants, body, loc };
  }

  private parseEnumConstant(): JavaEnumConstant {
    const loc = { line: this.peek().line, column: this.peek().column };
    const name = this.advance().value;
    const args: JavaExpr[] = [];
    if (this.match('(')) {
      this.advance();
      if (!this.match(')')) {
        do { args.push(this.parseExpression()); } while (this.consume(','));
      }
      this.expect(')');
    }
    return { kind: 'EnumConstant', name, arguments: args, loc };
  }

  private parseClassMember(): JavaMember {
    const annotations = this.parseAnnotations();
    const modifiers = this.parseModifiers();

    // Constructor check
    const lookahead = this.peek().value;
    if (lookahead === this.className) {
      const saved = this.pos;
      this.advance(); // class name
      if (this.match('(')) {
        this.pos = saved;
        return this.parseConstructor(modifiers, annotations);
      }
      this.pos = saved;
    }

    // Check for nested class/enum/interface
    if (this.matchKeyword('class')) {
      return this.parseClass(modifiers, annotations);
    }
    if (this.matchKeyword('enum')) {
      return this.parseEnum(modifiers, annotations);
    }
    if (this.matchKeyword('interface')) {
      return this.parseInterface(modifiers, annotations);
    }

    // Method or field - use lookahead
    if (this.isTypeStart()) {
      const saved = this.pos;
      const type = this.parseType();
      const name = this.advance().value;

      if (this.match('(')) {
        // It's a method
        this.pos = saved;
        return this.parseMethod(modifiers, annotations);
      }

      // It's a field
      let initializer: JavaExpr | undefined;
      if (this.consume('=')) {
        initializer = this.parseExpression();
      }
      this.expect(';');
      return { kind: 'FieldDeclaration', name, type, modifiers, annotations, initializer, loc: type.loc };
    }

    throw new Error(`Unexpected class member at line ${this.peek().line}: ${this.peek().value}`);
  }

  private parseInterfaceMember(): JavaInterfaceMember {
    const annotations = this.parseAnnotations();
    const modifiers = this.parseModifiers();

    if (!this.isTypeStart()) {
      throw new Error(`Expected type in interface member at line ${this.peek().line}`);
    }

    const saved = this.pos;
    const type = this.parseType();
    const name = this.advance().value;

    if (this.match('(')) {
      this.pos = saved;
      return this.parseMethod(modifiers, annotations);
    }

    let initializer: JavaExpr | undefined;
    if (this.consume('=')) {
      initializer = this.parseExpression();
    }
    this.expect(';');
    return { kind: 'FieldDeclaration', name, type, modifiers, annotations, initializer, loc: type.loc };
  }

  private parseConstructor(modifiers: string[], annotations: JavaAnnotation[]): JavaConstructor {
    const loc = { line: this.peek().line, column: this.peek().column };
    this.advance(); // class name
    this.expect('(');
    const params = this.parseParameters();
    this.expect(')');
    const body = this.parseBlock();
    return { kind: 'ConstructorDeclaration', parameters: params, modifiers, annotations, body, loc };
  }

  private parseMethod(modifiers: string[], annotations: JavaAnnotation[]): JavaMethod {
    const loc = { line: this.peek().line, column: this.peek().column };
    const returnType = this.parseType();
    const name = this.advance().value;
    this.expect('(');
    const params = this.parseParameters();
    this.expect(')');

    let body: JavaBlock | undefined;
    if (this.match(';')) {
      this.advance();
    } else {
      body = this.parseBlock();
    }

    return { kind: 'MethodDeclaration', name, returnType, parameters: params, modifiers, annotations, body, loc };
  }

  private parseParameters(): JavaParam[] {
    const params: JavaParam[] = [];
    if (this.match(')')) return params;

    do {
      const paramLoc = { line: this.peek().line, column: this.peek().column };
      const paramAnnotations = this.parseAnnotations();
      const paramModifiers = this.parseModifiers();
      const type = this.parseType();
      const varargs = this.consume('...');
      const name = this.advance().value;
      params.push({ kind: 'Parameter', name, type, modifiers: paramModifiers, varargs, loc: paramLoc });
    } while (this.consume(','));

    return params;
  }

  private parseAnnotations(): JavaAnnotation[] {
    const annotations: JavaAnnotation[] = [];
    while (this.peek().type === 'IDENTIFIER' && this.peek().value.startsWith('@')) {
      const loc = { line: this.peek().line, column: this.peek().column };
      const name = this.advance().value.substring(1);
      const values: Record<string, JavaExpr | JavaExpr[]> = {};

      if (this.match('(')) {
        this.advance();
        if (!this.match(')')) {
          // Check for named parameters
          const saved = this.pos;
          if (this.peek().type === 'IDENTIFIER' && this.tokens[this.pos + 1]?.value === '=') {
            do {
              const key = this.advance().value;
              this.expect('=');
              values[key] = this.parseExpression();
            } while (this.consume(','));
          } else {
            // Single unnamed value
            const expr = this.parseExpression();
            values['value'] = expr;
            while (this.consume(',')) {
              const key = this.peek().value;
              if (this.tokens[this.pos + 1]?.value === '=') {
                this.advance();
                this.expect('=');
                values[key] = this.parseExpression();
              } else {
                break;
              }
            }
          }
        }
        this.expect(')');
      }

      annotations.push({ kind: 'Annotation', name, values, loc });
    }
    return annotations;
  }

  private parseModifiers(): string[] {
    const modifiers: string[] = [];
    while (this.peek().type === 'KEYWORD' &&
      ['public', 'private', 'protected', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient', 'native', 'strictfp'].includes(this.peek().value)) {
      modifiers.push(this.advance().value);
    }
    return modifiers;
  }

  private parseType(): JavaType {
    const loc = { line: this.peek().line, column: this.peek().column };
    let name: string;

    if (this.peek().type === 'KEYWORD' && TYPE_KEYWORDS.has(this.peek().value)) {
      name = this.advance().value;
    } else if (this.peek().type === 'IDENTIFIER') {
      name = this.advance().value;
    } else {
      throw new Error(`Expected type at line ${this.peek().line}, got ${this.peek().type}:${this.peek().value}`);
    }

    // Type arguments (generics)
    const typeArguments: JavaType[] = [];
    if (this.match('<')) {
      this.advance();
      if (!this.match('>')) {
        do { typeArguments.push(this.parseType()); } while (this.consume(','));
      }
      this.expect('>');
    }

    let result: JavaType = { kind: 'TypeReference', name, typeArguments: typeArguments.length ? typeArguments : undefined, loc };

    // Array type
    while (this.consume('[')) {
      this.expect(']');
      result = { kind: 'ArrayType', elementType: result, loc };
    }

    return result;
  }

  private isTypeStart(): boolean {
    const tok = this.peek();
    if (tok.type === 'KEYWORD' && TYPE_KEYWORDS.has(tok.value)) return true;
    return tok.type === 'IDENTIFIER';
  }

  private parseBlock(): JavaBlock {
    const loc = { line: this.peek().line, column: this.peek().column };
    this.expect('{');
    const statements: JavaStmt[] = [];
    while (!this.match('}') && !this.match('EOF')) {
      statements.push(this.parseStatement());
    }
    this.expect('}');
    return { kind: 'Block', statements, loc };
  }

  private parseStatement(): JavaStmt {
    const loc = { line: this.peek().line, column: this.peek().column };

    if (this.matchKeyword('if')) return this.parseIf(loc);
    if (this.matchKeyword('while')) return this.parseWhile(loc);
    if (this.matchKeyword('for')) return this.parseFor(loc);
    if (this.matchKeyword('return')) return this.parseReturn(loc);
    if (this.matchKeyword('try')) return this.parseTry(loc);
    if (this.matchKeyword('throw')) return this.parseThrow(loc);
    if (this.matchKeyword('break')) return this.parseBreak(loc);
    if (this.matchKeyword('continue')) return this.parseContinue(loc);
    if (this.matchKeyword('switch')) return this.parseSwitch(loc);
    if (this.match('{')) return this.parseBlock();

    // CRITICAL FIX: Expression statement vs variable declaration ambiguity
    if (this.isTypeStart()) {
      const saved = this.pos;
      const type = this.parseType();

      // After type, must be an identifier (variable name)
      if (this.peek().type === 'IDENTIFIER') {
        const name = this.advance().value;
        const nextTok = this.peek().value;

        // If followed by = , ; or , it's definitely a variable declaration
        if (nextTok === '=' || nextTok === ',' || nextTok === ';') {
          let initializer: JavaExpr | undefined;
          if (this.consume('=')) {
            initializer = this.parseExpression();
          }
          // Handle multiple declarations
          while (this.consume(',')) {
            // Skip additional declarations for now - parse them as separate
            this.advance(); // name
            if (this.consume('=')) this.parseExpression();
          }
          this.expect(';');
          return { kind: 'VariableDeclaration', name, type, modifiers: [], initializer, loc };
        }

        // If followed by ( it's a method call expression like driver.findElement(...)
        // where driver was misidentified as a type. Restore and parse as expression.
        if (nextTok === '(') {
          this.pos = saved;
          const expr = this.parseExpression();
          this.expect(';');
          return { kind: 'ExpressionStatement', expression: expr, loc };
        }
      }

      // Not a valid variable declaration pattern - restore and parse as expression
      this.pos = saved;
    }

    // Default: expression statement
    const expr = this.parseExpression();
    this.expect(';');
    return { kind: 'ExpressionStatement', expression: expr, loc };
  }

  private parseIf(loc: { line: number; column: number }): JavaIf {
    this.advance(); // if
    this.expect('(');
    const condition = this.parseExpression();
    this.expect(')');
    const thenBranch = this.parseStatement();
    let elseBranch: JavaStmt | undefined;
    if (this.matchKeyword('else')) {
      this.advance();
      elseBranch = this.parseStatement();
    }
    return { kind: 'IfStatement', condition, thenBranch, elseBranch, loc };
  }

  private parseWhile(loc: { line: number; column: number }): JavaWhile {
    this.advance(); // while
    this.expect('(');
    const condition = this.parseExpression();
    this.expect(')');
    const body = this.parseStatement();
    return { kind: 'WhileStatement', condition, body, loc };
  }

  private parseFor(loc: { line: number; column: number }): JavaFor | JavaForEach {
    this.advance(); // for
    this.expect('(');

    // Check for enhanced for: for (Type var : iterable)
    const saved = this.pos;
    if (this.isTypeStart()) {
      const type = this.parseType();
      if (this.peek().type === 'IDENTIFIER') {
        const varName = this.advance().value;
        if (this.match(':')) {
          this.advance();
          const iterable = this.parseExpression();
          this.expect(')');
          const body = this.parseStatement();
          return {
            kind: 'ForEachStatement',
            variable: { kind: 'VariableDeclaration', name: varName, type, modifiers: [], loc: type.loc },
            iterable,
            body,
            loc
          };
        }
      }
    }
    this.pos = saved;

    // Regular for
    let init: JavaStmt | undefined;
    if (!this.match(';')) {
      init = this.parseForInit();
    }
    this.expect(';');
    let condition: JavaExpr | undefined;
    if (!this.match(';')) {
      condition = this.parseExpression();
    }
    this.expect(';');
    let update: JavaExpr | undefined;
    if (!this.match(')')) {
      update = this.parseExpression();
    }
    this.expect(')');
    const body = this.parseStatement();
    return { kind: 'ForStatement', init, condition, update, body, loc };
  }

  private parseForInit(): JavaStmt {
    const loc = { line: this.peek().line, column: this.peek().column };
    if (this.isTypeStart()) {
      const type = this.parseType();
      const name = this.advance().value;
      let initializer: JavaExpr | undefined;
      if (this.consume('=')) {
        initializer = this.parseExpression();
      }
      return { kind: 'VariableDeclaration', name, type, modifiers: [], initializer, loc };
    }
    const expr = this.parseExpression();
    return { kind: 'ExpressionStatement', expression: expr, loc };
  }

  private parseReturn(loc: { line: number; column: number }): JavaReturn {
    this.advance(); // return
    let value: JavaExpr | undefined;
    if (!this.match(';')) {
      value = this.parseExpression();
    }
    this.expect(';');
    return { kind: 'ReturnStatement', value, loc };
  }

  private parseTry(loc: { line: number; column: number }): JavaTry {
    this.advance(); // try
    const body = this.parseBlock();
    const catches: JavaCatch[] = [];
    while (this.matchKeyword('catch')) {
      this.advance();
      this.expect('(');
      const paramAnnotations = this.parseAnnotations();
      const paramModifiers = this.parseModifiers();
      const paramType = this.parseType();
      const paramName = this.advance().value;
      this.expect(')');
      const catchBody = this.parseBlock();
      catches.push({
        kind: 'CatchClause',
        parameter: { kind: 'Parameter', name: paramName, type: paramType, modifiers: paramModifiers, loc: paramType.loc },
        body: catchBody,
        loc: paramType.loc
      });
    }
    let finally_: JavaBlock | undefined;
    if (this.matchKeyword('finally')) {
      this.advance();
      finally_ = this.parseBlock();
    }
    return { kind: 'TryStatement', body, catches, finally: finally_, loc };
  }

  private parseThrow(loc: { line: number; column: number }): JavaThrow {
    this.advance(); // throw
    const expression = this.parseExpression();
    this.expect(';');
    return { kind: 'ThrowStatement', expression, loc };
  }

  private parseBreak(loc: { line: number; column: number }): JavaBreak {
    this.advance(); // break
    let label: string | undefined;
    if (this.peek().type === 'IDENTIFIER') {
      label = this.advance().value;
    }
    this.expect(';');
    return { kind: 'BreakStatement', label, loc };
  }

  private parseContinue(loc: { line: number; column: number }): JavaContinue {
    this.advance(); // continue
    let label: string | undefined;
    if (this.peek().type === 'IDENTIFIER') {
      label = this.advance().value;
    }
    this.expect(';');
    return { kind: 'ContinueStatement', label, loc };
  }

  private parseSwitch(loc: { line: number; column: number }): JavaSwitch {
    this.advance(); // switch
    this.expect('(');
    const expression = this.parseExpression();
    this.expect(')');
    this.expect('{');
    const cases: JavaCase[] = [];
    while (!this.match('}') && !this.match('EOF')) {
      const caseLoc = { line: this.peek().line, column: this.peek().column };
      if (this.matchKeyword('case')) {
        this.advance();
        const expr = this.parseExpression();
        this.expect(':');
        const stmts: JavaStmt[] = [];
        while (!this.match('case') && !this.matchKeyword('default') && !this.match('}') && !this.match('EOF')) {
          stmts.push(this.parseStatement());
        }
        cases.push({ kind: 'SwitchCase', expression: expr, statements: stmts, loc: caseLoc });
      } else if (this.matchKeyword('default')) {
        this.advance();
        this.expect(':');
        const stmts: JavaStmt[] = [];
        while (!this.match('case') && !this.matchKeyword('default') && !this.match('}') && !this.match('EOF')) {
          stmts.push(this.parseStatement());
        }
        cases.push({ kind: 'SwitchCase', statements: stmts, loc: caseLoc });
      } else {
        break;
      }
    }
    this.expect('}');
    return { kind: 'SwitchStatement', expression, cases, loc };
  }

  // Expression parsing
  private parseExpression(): JavaExpr {
    return this.parseAssignment();
  }

  private parseAssignment(): JavaExpr {
    let expr = this.parseTernary();
    if (this.peek().type === 'OPERATOR' && ['=', '+=', '-=', '*=', '/=', '%='].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAssignment();
      return { kind: 'AssignmentExpression', left: expr, operator: op, right, loc: expr.loc };
    }
    return expr;
  }

  private parseTernary(): JavaExpr {
    let expr = this.parseOr();
    if (this.consume('?')) {
      const thenBranch = this.parseExpression();
      this.expect(':');
      const elseBranch = this.parseTernary();
      return { kind: 'TernaryExpression', condition: expr, thenBranch, elseBranch, loc: expr.loc };
    }
    return expr;
  }

  private parseOr(): JavaExpr {
    let expr = this.parseAnd();
    while (this.consume('||')) {
      const right = this.parseAnd();
      expr = { kind: 'BinaryExpression', left: expr, operator: '||', right, loc: expr.loc };
    }
    return expr;
  }

  private parseAnd(): JavaExpr {
    let expr = this.parseBitOr();
    while (this.consume('&&')) {
      const right = this.parseBitOr();
      expr = { kind: 'BinaryExpression', left: expr, operator: '&&', right, loc: expr.loc };
    }
    return expr;
  }

  private parseBitOr(): JavaExpr {
    let expr = this.parseBitXor();
    while (this.consume('|')) {
      const right = this.parseBitXor();
      expr = { kind: 'BinaryExpression', left: expr, operator: '|', right, loc: expr.loc };
    }
    return expr;
  }

  private parseBitXor(): JavaExpr {
    let expr = this.parseBitAnd();
    while (this.consume('^')) {
      const right = this.parseBitAnd();
      expr = { kind: 'BinaryExpression', left: expr, operator: '^', right, loc: expr.loc };
    }
    return expr;
  }

  private parseBitAnd(): JavaExpr {
    let expr = this.parseEquality();
    while (this.consume('&')) {
      const right = this.parseEquality();
      expr = { kind: 'BinaryExpression', left: expr, operator: '&', right, loc: expr.loc };
    }
    return expr;
  }

  private parseEquality(): JavaExpr {
    let expr = this.parseRelational();
    while (true) {
      if (this.consume('==') || this.consume('!=')) {
        const op = this.tokens[this.pos - 1].value;
        const right = this.parseRelational();
        expr = { kind: 'BinaryExpression', left: expr, operator: op, right, loc: expr.loc };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseRelational(): JavaExpr {
    let expr = this.parseShift();
    while (true) {
      if (this.consume('<=') || this.consume('>=') || this.consume('<') || this.consume('>')) {
        const op = this.tokens[this.pos - 1].value;
        const right = this.parseShift();
        expr = { kind: 'BinaryExpression', left: expr, operator: op, right, loc: expr.loc };
      } else if (this.matchKeyword('instanceof')) {
        this.advance();
        const type = this.parseType();
        expr = { kind: 'InstanceOfExpression', expression: expr, type, loc: expr.loc };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseShift(): JavaExpr {
    let expr = this.parseAdditive();
    while (true) {
      if (this.consume('<<') || this.consume('>>') || this.consume('>>>')) {
        const op = this.tokens[this.pos - 1].value;
        const right = this.parseAdditive();
        expr = { kind: 'BinaryExpression', left: expr, operator: op, right, loc: expr.loc };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseAdditive(): JavaExpr {
    let expr = this.parseMultiplicative();
    while (true) {
      if (this.consume('+') || this.consume('-')) {
        const op = this.tokens[this.pos - 1].value;
        const right = this.parseMultiplicative();
        expr = { kind: 'BinaryExpression', left: expr, operator: op, right, loc: expr.loc };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseMultiplicative(): JavaExpr {
    let expr = this.parseUnary();
    while (true) {
      if (this.consume('*') || this.consume('/') || this.consume('%')) {
        const op = this.tokens[this.pos - 1].value;
        const right = this.parseUnary();
        expr = { kind: 'BinaryExpression', left: expr, operator: op, right, loc: expr.loc };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseUnary(): JavaExpr {
    if (this.consume('!') || this.consume('~') || this.consume('+') || this.consume('-')) {
      const op = this.tokens[this.pos - 1].value;
      const operand = this.parseUnary();
      return { kind: 'UnaryExpression', operator: op, operand, prefix: true, loc: operand.loc };
    }
    if (this.consume('++') || this.consume('--')) {
      const op = this.tokens[this.pos - 1].value;
      const operand = this.parseUnary();
      return { kind: 'UnaryExpression', operator: op, operand, prefix: true, loc: operand.loc };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): JavaExpr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match('(')) {
        this.advance();
        const args: JavaExpr[] = [];
        if (!this.match(')')) {
          do { args.push(this.parseExpression()); } while (this.consume(','));
        }
        this.expect(')');
        expr = { kind: 'CallExpression', callee: expr, arguments: args, loc: expr.loc };
      } else if (this.consume('.')) {
        const prop = this.advance().value;
        expr = { kind: 'MemberExpression', object: expr, property: prop, computed: false, loc: expr.loc };
      } else if (this.match('[')) {
        this.advance();
        const index = this.parseExpression();
        this.expect(']');
        expr = { kind: 'MemberExpression', object: expr, property: '', computed: true, loc: expr.loc };
      } else if (this.match('++') || this.match('--')) {
        const op = this.advance().value;
        expr = { kind: 'UnaryExpression', operator: op, operand: expr, prefix: false, loc: expr.loc };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): JavaExpr {
    const loc = { line: this.peek().line, column: this.peek().column };
    const tok = this.peek();

    if (tok.type === 'STRING') {
      this.advance();
      return { kind: 'Literal', value: tok.value.slice(1, -1), raw: tok.value, loc };
    }

    if (tok.type === 'NUMBER') {
      this.advance();
      return { kind: 'Literal', value: parseFloat(tok.value), raw: tok.value, loc };
    }

    if (tok.value === 'true' || tok.value === 'false') {
      this.advance();
      return { kind: 'Literal', value: tok.value === 'true', raw: tok.value, loc };
    }

    if (tok.value === 'null') {
      this.advance();
      return { kind: 'Literal', value: null, raw: 'null', loc };
    }

    if (tok.value === 'this') {
      this.advance();
      return { kind: 'ThisExpression', loc };
    }

    if (tok.value === 'super') {
      this.advance();
      return { kind: 'SuperExpression', loc };
    }

    // CRITICAL FIX: new expression - parse callee as primary + member access only
    if (tok.value === 'new') {
      this.advance();
      // Parse type reference (may include generics)
      let callee: JavaExpr;
      if (this.peek().type === 'IDENTIFIER') {
        let name = this.advance().value;
        // Handle qualified names like new java.util.ArrayList()
        while (this.consume('.')) {
          const prop = this.advance().value;
          name = name + '.' + prop;
        }
        callee = { kind: 'Identifier', name, loc };
      } else {
        throw new Error(`Expected type after new at line ${tok.line}`);
      }

      // Type arguments for generics
      if (this.match('<')) {
        this.advance();
        if (!this.match('>')) {
          while (!this.match('>') && !this.match('EOF')) this.advance();
        }
        if (this.match('>')) this.advance();
      }

      this.expect('(');
      const args: JavaExpr[] = [];
      if (!this.match(')')) {
        do { args.push(this.parseExpression()); } while (this.consume(','));
      }
      this.expect(')');
      return { kind: 'NewExpression', callee, arguments: args, loc };
    }

    // Cast expression: (Type) expr
    if (tok.value === '(') {
      const saved = this.pos;
      this.advance(); // (
      if (this.isTypeStart()) {
        const type = this.parseType();
        if (this.match(')')) {
          this.advance();
          const expression = this.parseUnary();
          return { kind: 'CastExpression', type, expression, loc };
        }
      }
      this.pos = saved;
    }

    // Lambda expression
    if (tok.value === '(' || (tok.type === 'IDENTIFIER' && this.tokens[this.pos + 1]?.value === '->')) {
      const saved = this.pos;
      try {
        if (tok.value === '(') {
          this.advance();
          const params: JavaParam[] = [];
          if (!this.match(')')) {
            do {
              const pLoc = { line: this.peek().line, column: this.peek().column };
              if (this.peek().type === 'IDENTIFIER') {
                const name = this.advance().value;
                params.push({ kind: 'Parameter', name, type: { kind: 'TypeReference', name: 'Object', loc: pLoc }, modifiers: [], loc: pLoc });
              }
            } while (this.consume(','));
          }
          this.expect(')');
          if (this.consume('->')) {
            let body: JavaBlock | JavaExpr;
            if (this.match('{')) {
              body = this.parseBlock();
            } else {
              body = this.parseExpression();
            }
            return { kind: 'LambdaExpression', parameters: params, body, loc };
          }
        }
      } catch {
        // Not a lambda
      }
      this.pos = saved;
    }

    // Parenthesized expression
    if (tok.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.expect(')');
      return expr;
    }

    // Array initializer
    if (tok.value === '{') {
      this.advance();
      const elements: JavaExpr[] = [];
      if (!this.match('}')) {
        do { elements.push(this.parseExpression()); } while (this.consume(','));
      }
      this.expect('}');
      return { kind: 'ArrayExpression', elements, loc };
    }

    if (tok.type === 'IDENTIFIER') {
      this.advance();
      return { kind: 'Identifier', name: tok.value, loc };
    }

    throw new Error(`Unexpected token in expression at line ${tok.line}: ${tok.type} ${tok.value}`);
  }

  // Utility methods
  private peek(): Token {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private match(value: string): boolean {
    return this.peek().value === value;
  }

  private matchKeyword(value: string): boolean {
    const tok = this.peek();
    return tok.type === 'KEYWORD' && tok.value === value;
  }

  private consume(value: string): boolean {
    if (this.match(value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(value: string): Token {
    if (!this.match(value)) {
      const tok = this.peek();
      throw new Error(`Expected '${value}' but got '${tok.value}' at line ${tok.line}`);
    }
    return this.advance();
  }
}

export function parseJava(source: string): JavaCompilationUnit {
  return new JavaParser(source).parse();
}
