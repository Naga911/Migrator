export interface SourceLocation {
  line: number;
  column: number;
}

export interface Node {
  kind: string;
  loc: SourceLocation;
}

export interface CompilationUnit extends Node {
  kind: 'CompilationUnit';
  package?: string;
  imports: ImportDeclaration[];
  types: TypeDeclaration[];
}

export interface ImportDeclaration extends Node {
  kind: 'ImportDeclaration';
  name: string;
  static: boolean;
  wildcard: boolean;
}

export type TypeDeclaration = ClassDeclaration | InterfaceDeclaration | EnumDeclaration;

export interface ClassDeclaration extends Node {
  kind: 'ClassDeclaration';
  name: string;
  modifiers: Modifier[];
  annotations: Annotation[];
  superClass?: TypeReference;
  interfaces: TypeReference[];
  body: ClassMember[];
}

export interface InterfaceDeclaration extends Node {
  kind: 'InterfaceDeclaration';
  name: string;
  modifiers: Modifier[];
  annotations: Annotation[];
  superInterfaces: TypeReference[];
  body: InterfaceMember[];
}

export interface EnumDeclaration extends Node {
  kind: 'EnumDeclaration';
  name: string;
  modifiers: Modifier[];
  annotations: Annotation[];
  constants: EnumConstant[];
  body: ClassMember[];
}

export interface EnumConstant extends Node {
  kind: 'EnumConstant';
  name: string;
  arguments: Expression[];
  body?: ClassMember[];
}

export type ClassMember = FieldDeclaration | MethodDeclaration | ConstructorDeclaration | ClassDeclaration | EnumDeclaration;
export type InterfaceMember = MethodDeclaration | FieldDeclaration;

export interface FieldDeclaration extends Node {
  kind: 'FieldDeclaration';
  name: string;
  type: TypeNode;
  modifiers: Modifier[];
  annotations: Annotation[];
  initializer?: Expression;
}

export interface MethodDeclaration extends Node {
  kind: 'MethodDeclaration';
  name: string;
  returnType: TypeNode;
  parameters: Parameter[];
  modifiers: Modifier[];
  annotations: Annotation[];
  body?: Block;
  typeParameters?: TypeParameter[];
}

export interface ConstructorDeclaration extends Node {
  kind: 'ConstructorDeclaration';
  parameters: Parameter[];
  modifiers: Modifier[];
  annotations: Annotation[];
  body: Block;
}

export interface Parameter extends Node {
  kind: 'Parameter';
  name: string;
  type: TypeNode;
  modifiers: Modifier[];
  varargs?: boolean;
}

export interface TypeParameter extends Node {
  kind: 'TypeParameter';
  name: string;
  bounds?: TypeReference[];
}

export interface Modifier extends Node {
  kind: 'Modifier';
  value: string;
}

export interface Annotation extends Node {
  kind: 'Annotation';
  name: string;
  values: Record<string, Expression | Expression[]>;
}

export type TypeNode = TypeReference | PrimitiveType | ArrayType | UnionType | FunctionType | VoidType;

export interface TypeReference extends Node {
  kind: 'TypeReference';
  name: string;
  typeArguments?: TypeNode[];
}

export interface PrimitiveType extends Node {
  kind: 'PrimitiveType';
  name: string;
}

export interface ArrayType extends Node {
  kind: 'ArrayType';
  elementType: TypeNode;
}

export interface UnionType extends Node {
  kind: 'UnionType';
  types: TypeNode[];
}

export interface FunctionType extends Node {
  kind: 'FunctionType';
  parameters: Parameter[];
  returnType: TypeNode;
}

export interface VoidType extends Node {
  kind: 'VoidType';
}

export interface Block extends Node {
  kind: 'Block';
  statements: Statement[];
}

export type Statement =
  | VariableDeclaration
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | ForStatement
  | ForEachStatement
  | ReturnStatement
  | TryStatement
  | ThrowStatement
  | BreakStatement
  | ContinueStatement
  | SwitchStatement
  | Block;

export interface VariableDeclaration extends Node {
  kind: 'VariableDeclaration';
  name: string;
  type?: TypeNode;
  modifiers: Modifier[];
  initializer?: Expression;
}

export interface ExpressionStatement extends Node {
  kind: 'ExpressionStatement';
  expression: Expression;
}

export interface IfStatement extends Node {
  kind: 'IfStatement';
  condition: Expression;
  thenBranch: Statement;
  elseBranch?: Statement;
}

export interface WhileStatement extends Node {
  kind: 'WhileStatement';
  condition: Expression;
  body: Statement;
}

export interface ForStatement extends Node {
  kind: 'ForStatement';
  init?: Statement;
  condition?: Expression;
  update?: Expression;
  body: Statement;
}

export interface ForEachStatement extends Node {
  kind: 'ForEachStatement';
  variable: VariableDeclaration;
  iterable: Expression;
  body: Statement;
}

export interface ReturnStatement extends Node {
  kind: 'ReturnStatement';
  value?: Expression;
}

export interface TryStatement extends Node {
  kind: 'TryStatement';
  body: Block;
  catches: CatchClause[];
  finally?: Block;
}

export interface CatchClause extends Node {
  kind: 'CatchClause';
  parameter: Parameter;
  body: Block;
}

export interface ThrowStatement extends Node {
  kind: 'ThrowStatement';
  expression: Expression;
}

export interface BreakStatement extends Node {
  kind: 'BreakStatement';
  label?: string;
}

export interface ContinueStatement extends Node {
  kind: 'ContinueStatement';
  label?: string;
}

export interface SwitchStatement extends Node {
  kind: 'SwitchStatement';
  expression: Expression;
  cases: SwitchCase[];
}

export interface SwitchCase extends Node {
  kind: 'SwitchCase';
  expression?: Expression;
  statements: Statement[];
}

export type Expression =
  | Identifier
  | Literal
  | MemberExpression
  | CallExpression
  | NewExpression
  | AssignmentExpression
  | BinaryExpression
  | UnaryExpression
  | TernaryExpression
  | ArrayExpression
  | ObjectExpression
  | ArrowFunctionExpression
  | AwaitExpression
  | ThisExpression
  | SuperExpression
  | CastExpression
  | InstanceOfExpression
  | LambdaExpression;

export interface Identifier extends Node {
  kind: 'Identifier';
  name: string;
}

export interface Literal extends Node {
  kind: 'Literal';
  value: string | number | boolean | null;
  raw?: string;
}

export interface MemberExpression extends Node {
  kind: 'MemberExpression';
  object: Expression;
  property: string;
  computed: boolean;
}

export interface CallExpression extends Node {
  kind: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
  typeArguments?: TypeNode[];
}

export interface NewExpression extends Node {
  kind: 'NewExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface AssignmentExpression extends Node {
  kind: 'AssignmentExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface BinaryExpression extends Node {
  kind: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface UnaryExpression extends Node {
  kind: 'UnaryExpression';
  operator: string;
  operand: Expression;
  prefix: boolean;
}

export interface TernaryExpression extends Node {
  kind: 'TernaryExpression';
  condition: Expression;
  thenBranch: Expression;
  elseBranch: Expression;
}

export interface ArrayExpression extends Node {
  kind: 'ArrayExpression';
  elements: Expression[];
}

export interface ObjectExpression extends Node {
  kind: 'ObjectExpression';
  properties: Property[];
}

export interface Property extends Node {
  kind: 'Property';
  key: string;
  value: Expression;
  computed: boolean;
}

export interface ArrowFunctionExpression extends Node {
  kind: 'ArrowFunctionExpression';
  parameters: Parameter[];
  body: Block | Expression;
  async: boolean;
}

export interface AwaitExpression extends Node {
  kind: 'AwaitExpression';
  expression: Expression;
}

export interface ThisExpression extends Node {
  kind: 'ThisExpression';
}

export interface SuperExpression extends Node {
  kind: 'SuperExpression';
}

export interface CastExpression extends Node {
  kind: 'CastExpression';
  type: TypeNode;
  expression: Expression;
}

export interface InstanceOfExpression extends Node {
  kind: 'InstanceOfExpression';
  expression: Expression;
  type: TypeNode;
}

export interface LambdaExpression extends Node {
  kind: 'LambdaExpression';
  parameters: Parameter[];
  body: Block | Expression;
}
