import type { JavaCompilationUnit, JavaClass, JavaInterface, JavaEnum, JavaMember, JavaField, JavaMethod, JavaConstructor, JavaParam, JavaAnnotation, JavaType, JavaStmt, JavaBlock, JavaExpr, JavaIdent, JavaLiteral, JavaMember as JavaMemberExpr, JavaCall, JavaNew, JavaAssign, JavaBinary, JavaUnary, JavaTernary, JavaArrayExpr, JavaThis, JavaSuper, JavaCast, JavaInstanceOf, JavaLambda, JavaVarDecl, JavaExprStmt, JavaIf, JavaWhile, JavaFor, JavaForEach, JavaReturn, JavaTry, JavaCatch, JavaThrow, JavaBreak, JavaContinue, JavaSwitch, JavaCase, JavaEnumConstant } from '../types/java-ast';
import type { CompilationUnit, ClassDeclaration, InterfaceDeclaration, EnumDeclaration, FieldDeclaration, MethodDeclaration, ConstructorDeclaration, Parameter, Annotation, TypeNode, Statement, Expression, Block, VariableDeclaration, ExpressionStatement, IfStatement, WhileStatement, ForStatement, ForEachStatement, ReturnStatement, TryStatement, CatchClause, ThrowStatement, BreakStatement, ContinueStatement, SwitchStatement, SwitchCase, Identifier, Literal, MemberExpression, CallExpression, NewExpression, AssignmentExpression, BinaryExpression, UnaryExpression, TernaryExpression, ArrayExpression, ThisExpression, SuperExpression, CastExpression, InstanceOfExpression, LambdaExpression } from '../types/uast';

export function buildIR(javaAst: JavaCompilationUnit): CompilationUnit {
  return {
    kind: 'CompilationUnit',
    package: javaAst.package,
    imports: javaAst.imports.map(i => ({
      kind: 'ImportDeclaration',
      name: i.name,
      static: i.static,
      wildcard: i.wildcard,
      loc: i.loc,
    })),
    types: javaAst.types.map(convertTypeDecl),
    loc: javaAst.loc,
  };
}

function convertTypeDecl(td: any): any {
  switch (td.kind) {
    case 'ClassDeclaration': return convertClass(td);
    case 'InterfaceDeclaration': return convertInterface(td);
    case 'EnumDeclaration': return convertEnum(td);
    default: return td;
  }
}

function convertClass(cls: JavaClass): ClassDeclaration {
  return {
    kind: 'ClassDeclaration',
    name: cls.name,
    modifiers: cls.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    annotations: cls.annotations.map(convertAnnotation),
    superClass: cls.superClass ? { kind: 'TypeReference', name: cls.superClass, loc: { line: 0, column: 0 } } : undefined,
    interfaces: cls.interfaces.map(i => ({ kind: 'TypeReference', name: i, loc: { line: 0, column: 0 } })),
    body: cls.body.map(convertMember),
    loc: cls.loc,
  };
}

function convertInterface(intf: JavaInterface): InterfaceDeclaration {
  return {
    kind: 'InterfaceDeclaration',
    name: intf.name,
    modifiers: intf.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    annotations: intf.annotations.map(convertAnnotation),
    superInterfaces: intf.superInterfaces.map(i => ({ kind: 'TypeReference', name: i, loc: { line: 0, column: 0 } })),
    body: intf.body.map(convertInterfaceMember),
    loc: intf.loc,
  };
}

function convertEnum(enm: JavaEnum): EnumDeclaration {
  return {
    kind: 'EnumDeclaration',
    name: enm.name,
    modifiers: enm.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    annotations: enm.annotations.map(convertAnnotation),
    constants: enm.constants.map((c: JavaEnumConstant) => ({
      kind: 'EnumConstant',
      name: c.name,
      arguments: c.arguments.map(convertExpr),
      loc: c.loc,
    })),
    body: enm.body.map(convertMember),
    loc: enm.loc,
  };
}

function convertAnnotation(ann: JavaAnnotation): Annotation {
  const values: Record<string, any> = {};
  for (const [k, v] of Object.entries(ann.values)) {
    if (Array.isArray(v)) {
      values[k] = v.map(convertExpr);
    } else {
      values[k] = convertExpr(v as JavaExpr);
    }
  }
  return { kind: 'Annotation', name: ann.name, values, loc: ann.loc };
}

function convertMember(member: JavaMember): any {
  switch (member.kind) {
    case 'FieldDeclaration': return convertField(member);
    case 'MethodDeclaration': return convertMethod(member);
    case 'ConstructorDeclaration': return convertConstructor(member);
    case 'ClassDeclaration': return convertClass(member);
    case 'EnumDeclaration': return convertEnum(member);
    default: return member;
  }
}

function convertInterfaceMember(member: any): any {
  switch (member.kind) {
    case 'FieldDeclaration': return convertField(member);
    case 'MethodDeclaration': return convertMethod(member);
    default: return member;
  }
}

function convertField(field: JavaField): FieldDeclaration {
  return {
    kind: 'FieldDeclaration',
    name: field.name,
    type: convertType(field.type),
    modifiers: field.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    annotations: field.annotations.map(convertAnnotation),
    initializer: field.initializer ? convertExpr(field.initializer) : undefined,
    loc: field.loc,
  };
}

function convertMethod(method: JavaMethod): MethodDeclaration {
  return {
    kind: 'MethodDeclaration',
    name: method.name,
    returnType: convertType(method.returnType),
    parameters: method.parameters.map(convertParam),
    modifiers: method.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    annotations: method.annotations.map(convertAnnotation),
    body: method.body ? convertBlock(method.body) : undefined,
    loc: method.loc,
  };
}

function convertConstructor(ctor: JavaConstructor): ConstructorDeclaration {
  return {
    kind: 'ConstructorDeclaration',
    parameters: ctor.parameters.map(convertParam),
    modifiers: ctor.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    annotations: ctor.annotations.map(convertAnnotation),
    body: convertBlock(ctor.body),
    loc: ctor.loc,
  };
}

function convertParam(param: JavaParam): Parameter {
  return {
    kind: 'Parameter',
    name: param.name,
    type: convertType(param.type),
    modifiers: param.modifiers.map(m => ({ kind: 'Modifier', value: m, loc: { line: 0, column: 0 } })),
    varargs: param.varargs,
    loc: param.loc,
  };
}

function convertType(type: JavaType): TypeNode {
  switch (type.kind) {
    case 'PrimitiveType': return { kind: 'PrimitiveType', name: type.name, loc: type.loc };
    case 'TypeReference': return {
      kind: 'TypeReference',
      name: type.name,
      typeArguments: type.typeArguments?.map(convertType),
      loc: type.loc,
    };
    case 'ArrayType': return { kind: 'ArrayType', elementType: convertType(type.elementType), loc: type.loc };
    default: return { kind: 'TypeReference', name: 'Object', loc: { line: 0, column: 0 } };
  }
}

function convertBlock(block: JavaBlock): Block {
  return {
    kind: 'Block',
    statements: block.statements.map(convertStmt),
    loc: block.loc,
  };
}

function convertStmt(stmt: JavaStmt): Statement {
  switch (stmt.kind) {
    case 'VariableDeclaration': return {
      kind: 'VariableDeclaration',
      name: stmt.name,
      type: stmt.type ? convertType(stmt.type) : undefined,
      modifiers: [],
      initializer: stmt.initializer ? convertExpr(stmt.initializer) : undefined,
      loc: stmt.loc,
    };
    case 'ExpressionStatement': return {
      kind: 'ExpressionStatement',
      expression: convertExpr(stmt.expression),
      loc: stmt.loc,
    };
    case 'IfStatement': return {
      kind: 'IfStatement',
      condition: convertExpr(stmt.condition),
      thenBranch: convertStmt(stmt.thenBranch),
      elseBranch: stmt.elseBranch ? convertStmt(stmt.elseBranch) : undefined,
      loc: stmt.loc,
    };
    case 'WhileStatement': return {
      kind: 'WhileStatement',
      condition: convertExpr(stmt.condition),
      body: convertStmt(stmt.body),
      loc: stmt.loc,
    };
    case 'ForStatement': return {
      kind: 'ForStatement',
      init: stmt.init ? convertStmt(stmt.init) : undefined,
      condition: stmt.condition ? convertExpr(stmt.condition) : undefined,
      update: stmt.update ? convertExpr(stmt.update) : undefined,
      body: convertStmt(stmt.body),
      loc: stmt.loc,
    };
    case 'ForEachStatement': return {
      kind: 'ForEachStatement',
      variable: {
        kind: 'VariableDeclaration',
        name: stmt.variable.name,
        type: stmt.variable.type ? convertType(stmt.variable.type) : undefined,
        modifiers: [],
        initializer: undefined,
        loc: stmt.variable.loc,
      },
      iterable: convertExpr(stmt.iterable),
      body: convertStmt(stmt.body),
      loc: stmt.loc,
    };
    case 'ReturnStatement': return {
      kind: 'ReturnStatement',
      value: stmt.value ? convertExpr(stmt.value) : undefined,
      loc: stmt.loc,
    };
    case 'TryStatement': return {
      kind: 'TryStatement',
      body: convertBlock(stmt.body),
      catches: stmt.catches.map((c: JavaCatch) => ({
        kind: 'CatchClause',
        parameter: convertParam(c.parameter),
        body: convertBlock(c.body),
        loc: c.loc,
      })),
      finally: stmt.finally ? convertBlock(stmt.finally) : undefined,
      loc: stmt.loc,
    };
    case 'ThrowStatement': return {
      kind: 'ThrowStatement',
      expression: convertExpr(stmt.expression),
      loc: stmt.loc,
    };
    case 'BreakStatement': return {
      kind: 'BreakStatement',
      label: stmt.label,
      loc: stmt.loc,
    };
    case 'ContinueStatement': return {
      kind: 'ContinueStatement',
      label: stmt.label,
      loc: stmt.loc,
    };
    case 'SwitchStatement': return {
      kind: 'SwitchStatement',
      expression: convertExpr(stmt.expression),
      cases: stmt.cases.map((c: JavaCase) => ({
        kind: 'SwitchCase',
        expression: c.expression ? convertExpr(c.expression) : undefined,
        statements: c.statements.map(convertStmt),
        loc: c.loc,
      })),
      loc: stmt.loc,
    };
    case 'Block': return convertBlock(stmt);
    default: return stmt as any;
  }
}

function convertExpr(expr: JavaExpr): Expression {
  switch (expr.kind) {
    case 'Identifier': return { kind: 'Identifier', name: (expr as JavaIdent).name, loc: expr.loc };
    case 'Literal': return { kind: 'Literal', value: (expr as JavaLiteral).value, raw: (expr as JavaLiteral).raw, loc: expr.loc };
    case 'MemberExpression': return {
      kind: 'MemberExpression',
      object: convertExpr((expr as JavaMemberExpr).object),
      property: (expr as JavaMemberExpr).property,
      computed: (expr as JavaMemberExpr).computed,
      loc: expr.loc,
    };
    case 'CallExpression': return {
      kind: 'CallExpression',
      callee: convertExpr((expr as JavaCall).callee),
      arguments: (expr as JavaCall).arguments.map(convertExpr),
      loc: expr.loc,
    };
    case 'NewExpression': return {
      kind: 'NewExpression',
      callee: convertExpr((expr as JavaNew).callee),
      arguments: (expr as JavaNew).arguments.map(convertExpr),
      loc: expr.loc,
    };
    case 'AssignmentExpression': return {
      kind: 'AssignmentExpression',
      left: convertExpr((expr as JavaAssign).left),
      operator: (expr as JavaAssign).operator,
      right: convertExpr((expr as JavaAssign).right),
      loc: expr.loc,
    };
    case 'BinaryExpression': return {
      kind: 'BinaryExpression',
      left: convertExpr((expr as JavaBinary).left),
      operator: (expr as JavaBinary).operator,
      right: convertExpr((expr as JavaBinary).right),
      loc: expr.loc,
    };
    case 'UnaryExpression': return {
      kind: 'UnaryExpression',
      operator: (expr as JavaUnary).operator,
      operand: convertExpr((expr as JavaUnary).operand),
      prefix: (expr as JavaUnary).prefix,
      loc: expr.loc,
    };
    case 'TernaryExpression': return {
      kind: 'TernaryExpression',
      condition: convertExpr((expr as JavaTernary).condition),
      thenBranch: convertExpr((expr as JavaTernary).thenBranch),
      elseBranch: convertExpr((expr as JavaTernary).elseBranch),
      loc: expr.loc,
    };
    case 'ArrayExpression': return {
      kind: 'ArrayExpression',
      elements: (expr as JavaArrayExpr).elements.map(convertExpr),
      loc: expr.loc,
    };
    case 'ThisExpression': return { kind: 'ThisExpression', loc: expr.loc };
    case 'SuperExpression': return { kind: 'SuperExpression', loc: expr.loc };
    case 'CastExpression': return {
      kind: 'CastExpression',
      type: convertType((expr as JavaCast).type),
      expression: convertExpr((expr as JavaCast).expression),
      loc: expr.loc,
    };
    case 'InstanceOfExpression': return {
      kind: 'InstanceOfExpression',
      expression: convertExpr((expr as JavaInstanceOf).expression),
      type: convertType((expr as JavaInstanceOf).type),
      loc: expr.loc,
    };
    case 'LambdaExpression': return {
      kind: 'LambdaExpression',
      parameters: (expr as JavaLambda).parameters.map(convertParam),
      body: typeof (expr as JavaLambda).body === 'object' && (expr as JavaLambda).body.kind === 'Block'
        ? convertBlock((expr as JavaLambda).body as JavaBlock)
        : convertExpr((expr as JavaLambda).body as JavaExpr),
      loc: expr.loc,
    };
    default: return expr as any;
  }
}
