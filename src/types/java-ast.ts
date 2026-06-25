export interface JavaCompilationUnit {
  kind: 'CompilationUnit';
  package?: string;
  imports: JavaImport[];
  types: JavaTypeDecl[];
  loc: { line: number; column: number };
}

export interface JavaImport {
  kind: 'ImportDeclaration';
  name: string;
  static: boolean;
  wildcard: boolean;
  loc: { line: number; column: number };
}

export type JavaTypeDecl = JavaClass | JavaInterface | JavaEnum;

export interface JavaClass {
  kind: 'ClassDeclaration';
  name: string;
  modifiers: string[];
  annotations: JavaAnnotation[];
  superClass?: string;
  interfaces: string[];
  body: JavaMember[];
  loc: { line: number; column: number };
}

export interface JavaInterface {
  kind: 'InterfaceDeclaration';
  name: string;
  modifiers: string[];
  annotations: JavaAnnotation[];
  superInterfaces: string[];
  body: JavaInterfaceMember[];
  loc: { line: number; column: number };
}

export interface JavaEnum {
  kind: 'EnumDeclaration';
  name: string;
  modifiers: string[];
  annotations: JavaAnnotation[];
  constants: JavaEnumConstant[];
  body: JavaMember[];
  loc: { line: number; column: number };
}

export interface JavaEnumConstant {
  kind: 'EnumConstant';
  name: string;
  arguments: JavaExpr[];
  loc: { line: number; column: number };
}

export type JavaMember = JavaField | JavaMethod | JavaConstructor | JavaClass | JavaEnum;
export type JavaInterfaceMember = JavaMethod | JavaField;

export interface JavaField {
  kind: 'FieldDeclaration';
  name: string;
  type: JavaType;
  modifiers: string[];
  annotations: JavaAnnotation[];
  initializer?: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaMethod {
  kind: 'MethodDeclaration';
  name: string;
  returnType: JavaType;
  parameters: JavaParam[];
  modifiers: string[];
  annotations: JavaAnnotation[];
  body?: JavaBlock;
  loc: { line: number; column: number };
}

export interface JavaConstructor {
  kind: 'ConstructorDeclaration';
  parameters: JavaParam[];
  modifiers: string[];
  annotations: JavaAnnotation[];
  body: JavaBlock;
  loc: { line: number; column: number };
}

export interface JavaParam {
  kind: 'Parameter';
  name: string;
  type: JavaType;
  modifiers: string[];
  varargs?: boolean;
  loc: { line: number; column: number };
}

export interface JavaAnnotation {
  kind: 'Annotation';
  name: string;
  values: Record<string, JavaExpr | JavaExpr[]>;
  loc: { line: number; column: number };
}

export type JavaType = JavaTypeRef | JavaPrimitive | JavaArrayType;

export interface JavaTypeRef {
  kind: 'TypeReference';
  name: string;
  typeArguments?: JavaType[];
  loc: { line: number; column: number };
}

export interface JavaPrimitive {
  kind: 'PrimitiveType';
  name: string;
  loc: { line: number; column: number };
}

export interface JavaArrayType {
  kind: 'ArrayType';
  elementType: JavaType;
  loc: { line: number; column: number };
}

export type JavaStmt =
  | JavaVarDecl
  | JavaExprStmt
  | JavaIf
  | JavaWhile
  | JavaFor
  | JavaForEach
  | JavaReturn
  | JavaTry
  | JavaThrow
  | JavaBreak
  | JavaContinue
  | JavaSwitch
  | JavaBlock;

export interface JavaBlock {
  kind: 'Block';
  statements: JavaStmt[];
  loc: { line: number; column: number };
}

export interface JavaVarDecl {
  kind: 'VariableDeclaration';
  name: string;
  type?: JavaType;
  modifiers: string[];
  initializer?: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaExprStmt {
  kind: 'ExpressionStatement';
  expression: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaIf {
  kind: 'IfStatement';
  condition: JavaExpr;
  thenBranch: JavaStmt;
  elseBranch?: JavaStmt;
  loc: { line: number; column: number };
}

export interface JavaWhile {
  kind: 'WhileStatement';
  condition: JavaExpr;
  body: JavaStmt;
  loc: { line: number; column: number };
}

export interface JavaFor {
  kind: 'ForStatement';
  init?: JavaStmt;
  condition?: JavaExpr;
  update?: JavaExpr;
  body: JavaStmt;
  loc: { line: number; column: number };
}

export interface JavaForEach {
  kind: 'ForEachStatement';
  variable: JavaVarDecl;
  iterable: JavaExpr;
  body: JavaStmt;
  loc: { line: number; column: number };
}

export interface JavaReturn {
  kind: 'ReturnStatement';
  value?: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaTry {
  kind: 'TryStatement';
  body: JavaBlock;
  catches: JavaCatch[];
  finally?: JavaBlock;
  loc: { line: number; column: number };
}

export interface JavaCatch {
  kind: 'CatchClause';
  parameter: JavaParam;
  body: JavaBlock;
  loc: { line: number; column: number };
}

export interface JavaThrow {
  kind: 'ThrowStatement';
  expression: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaBreak {
  kind: 'BreakStatement';
  label?: string;
  loc: { line: number; column: number };
}

export interface JavaContinue {
  kind: 'ContinueStatement';
  label?: string;
  loc: { line: number; column: number };
}

export interface JavaSwitch {
  kind: 'SwitchStatement';
  expression: JavaExpr;
  cases: JavaCase[];
  loc: { line: number; column: number };
}

export interface JavaCase {
  kind: 'SwitchCase';
  expression?: JavaExpr;
  statements: JavaStmt[];
  loc: { line: number; column: number };
}

export type JavaExpr =
  | JavaIdent
  | JavaLiteral
  | JavaMember
  | JavaCall
  | JavaNew
  | JavaAssign
  | JavaBinary
  | JavaUnary
  | JavaTernary
  | JavaArrayExpr
  | JavaThis
  | JavaSuper
  | JavaCast
  | JavaInstanceOf
  | JavaLambda;

export interface JavaIdent {
  kind: 'Identifier';
  name: string;
  loc: { line: number; column: number };
}

export interface JavaLiteral {
  kind: 'Literal';
  value: string | number | boolean | null;
  raw?: string;
  loc: { line: number; column: number };
}

export interface JavaMember {
  kind: 'MemberExpression';
  object: JavaExpr;
  property: string;
  computed: boolean;
  loc: { line: number; column: number };
}

export interface JavaCall {
  kind: 'CallExpression';
  callee: JavaExpr;
  arguments: JavaExpr[];
  loc: { line: number; column: number };
}

export interface JavaNew {
  kind: 'NewExpression';
  callee: JavaExpr;
  arguments: JavaExpr[];
  loc: { line: number; column: number };
}

export interface JavaAssign {
  kind: 'AssignmentExpression';
  left: JavaExpr;
  operator: string;
  right: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaBinary {
  kind: 'BinaryExpression';
  left: JavaExpr;
  operator: string;
  right: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaUnary {
  kind: 'UnaryExpression';
  operator: string;
  operand: JavaExpr;
  prefix: boolean;
  loc: { line: number; column: number };
}

export interface JavaTernary {
  kind: 'TernaryExpression';
  condition: JavaExpr;
  thenBranch: JavaExpr;
  elseBranch: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaArrayExpr {
  kind: 'ArrayExpression';
  elements: JavaExpr[];
  loc: { line: number; column: number };
}

export interface JavaThis {
  kind: 'ThisExpression';
  loc: { line: number; column: number };
}

export interface JavaSuper {
  kind: 'SuperExpression';
  loc: { line: number; column: number };
}

export interface JavaCast {
  kind: 'CastExpression';
  type: JavaType;
  expression: JavaExpr;
  loc: { line: number; column: number };
}

export interface JavaInstanceOf {
  kind: 'InstanceOfExpression';
  expression: JavaExpr;
  type: JavaType;
  loc: { line: number; column: number };
}

export interface JavaLambda {
  kind: 'LambdaExpression';
  parameters: JavaParam[];
  body: JavaBlock | JavaExpr;
  loc: { line: number; column: number };
}
