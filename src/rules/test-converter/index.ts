// src/rules/test-converter/index.ts
// TestNG / JUnit → Playwright test conversion

import type { Rule } from '../../types/rule';
import type {
  Node, MethodDeclaration, Annotation, CompilationUnit, ImportDeclaration,
  ClassDeclaration, ExpressionStatement, CallExpression, MemberExpression,
  Identifier, Literal, Block, VariableDeclaration
} from '../../types/uast';

function isKind<T extends Node>(node: Node, kind: string): node is T {
  return node.kind === kind;
}

function makeIdent(name: string): Identifier {
  return { kind: 'Identifier', name, loc: { line: 0, column: 0 } };
}

function makeMember(obj: any, prop: string): MemberExpression {
  return { kind: 'MemberExpression', object: obj, property: prop, computed: false, loc: { line: 0, column: 0 } };
}

function makeCall(callee: any, args: any[]): CallExpression {
  return { kind: 'CallExpression', callee, arguments: args, loc: { line: 0, column: 0 } };
}

function makeLiteral(value: any): Literal {
  return { kind: 'Literal', value, raw: JSON.stringify(value), loc: { line: 0, column: 0 } };
}

// Rule 1: @Test method → test('name', async () => { ... })
const testMethodToPlaywright: Rule = {
  name: 'test-method-to-playwright',
  description: '@Test method → test() block',
  priority: 300,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'Test');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testName = makeLiteral(method.name);
    const testBody: Block = method.body || { kind: 'Block', statements: [], loc: { line: 0, column: 0 } };

    // Convert method body statements to test block
    // Prepend page fixture if needed
    const hasPageFixture = testBody.statements.some(s => {
      if (isKind<VariableDeclaration>(s, 'VariableDeclaration')) {
        return (s as VariableDeclaration).name === 'page';
      }
      return false;
    });

    const statements = [...testBody.statements];

    // Wrap in test() call
    const testCall = makeCall(makeMember(makeIdent('test'), 'test'), [
      testName,
      {
        kind: 'ArrowFunctionExpression',
        parameters: [makeIdent('page')],
        body: { kind: 'Block', statements, loc: { line: 0, column: 0 } },
        async: true,
        loc: { line: 0, column: 0 }
      }
    ]);

    return {
      kind: 'ExpressionStatement',
      expression: testCall,
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 2: @BeforeMethod → beforeEach
const beforeMethodToBeforeEach: Rule = {
  name: 'before-method-to-beforeEach',
  description: '@BeforeMethod → beforeEach',
  priority: 301,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'BeforeMethod' || a.name === 'Before');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testBody = method.body || { kind: 'Block', statements: [], loc: { line: 0, column: 0 } };

    return {
      kind: 'ExpressionStatement',
      expression: makeCall(makeIdent('beforeEach'), [
        {
          kind: 'ArrowFunctionExpression',
          parameters: [makeIdent('page')],
          body: testBody,
          async: true,
          loc: { line: 0, column: 0 }
        }
      ]),
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 3: @AfterMethod → afterEach
const afterMethodToAfterEach: Rule = {
  name: 'after-method-to-afterEach',
  description: '@AfterMethod → afterEach',
  priority: 302,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'AfterMethod' || a.name === 'After');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testBody = method.body || { kind: 'Block', statements: [], loc: { line: 0, column: 0 } };

    return {
      kind: 'ExpressionStatement',
      expression: makeCall(makeIdent('afterEach'), [
        {
          kind: 'ArrowFunctionExpression',
          parameters: [makeIdent('page')],
          body: testBody,
          async: true,
          loc: { line: 0, column: 0 }
        }
      ]),
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 4: @BeforeClass → beforeAll
const beforeClassToBeforeAll: Rule = {
  name: 'before-class-to-beforeAll',
  description: '@BeforeClass → beforeAll',
  priority: 303,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'BeforeClass' || a.name === 'BeforeAll');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testBody = method.body || { kind: 'Block', statements: [], loc: { line: 0, column: 0 } };

    return {
      kind: 'ExpressionStatement',
      expression: makeCall(makeIdent('beforeAll'), [
        {
          kind: 'ArrowFunctionExpression',
          parameters: [],
          body: testBody,
          async: true,
          loc: { line: 0, column: 0 }
        }
      ]),
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 5: @AfterClass → afterAll
const afterClassToAfterAll: Rule = {
  name: 'after-class-to-afterAll',
  description: '@AfterClass → afterAll',
  priority: 304,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'AfterClass' || a.name === 'AfterAll');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testBody = method.body || { kind: 'Block', statements: [], loc: { line: 0, column: 0 } };

    return {
      kind: 'ExpressionStatement',
      expression: makeCall(makeIdent('afterAll'), [
        {
          kind: 'ArrowFunctionExpression',
          parameters: [],
          body: testBody,
          async: true,
          loc: { line: 0, column: 0 }
        }
      ]),
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 6: @DataProvider → export const testData = [...]
const dataProviderToExport: Rule = {
  name: 'data-provider-to-export',
  description: '@DataProvider → export const testData',
  priority: 305,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'DataProvider');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testBody = method.body || { kind: 'Block', statements: [], loc: { line: 0, column: 0 } };

    // Extract return statement value
    const returnStmt = testBody.statements.find(s => s.kind === 'ReturnStatement');
    let dataValue: any = { kind: 'ArrayExpression', elements: [], loc: { line: 0, column: 0 } };
    if (returnStmt && (returnStmt as any).argument) {
      dataValue = (returnStmt as any).argument;
    }

    return {
      kind: 'VariableDeclaration',
      name: method.name + 'Data',
      type: { kind: 'TypeReference', name: 'any[]', loc: { line: 0, column: 0 } },
      initializer: dataValue,
      modifiers: [{ kind: 'Modifier', value: 'export', loc: { line: 0, column: 0 } }],
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 7: @Parameters({"username", "password"}) → destructured params
const parametersToDestructuring: Rule = {
  name: 'parameters-to-destructuring',
  description: '@Parameters → fixture params',
  priority: 306,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'Parameters');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    // Extract parameter names from annotation
    const paramAnnotation = method.annotations.find(a => a.name === 'Parameters');
    const paramNames: string[] = [];
    if (paramAnnotation && paramAnnotation.values && paramAnnotation.values.value) {
      const val = paramAnnotation.values.value;
      if (Array.isArray(val)) {
        val.forEach((v: any) => {
          if (v.kind === 'Literal') paramNames.push(String(v.value));
        });
      }
    }

    // Add params to method parameters
    const newParams = [...method.parameters];
    paramNames.forEach(name => {
      newParams.push({
        kind: 'Parameter',
        name,
        type: { kind: 'TypeReference', name: 'string', loc: { line: 0, column: 0 } },
        loc: { line: 0, column: 0 }
      });
    });

    return {
      ...method,
      parameters: newParams,
      annotations: method.annotations.filter(a => a.name !== 'Parameters')
    };
  }
};

// Rule 8: Strip @Test, @BeforeMethod, @AfterMethod, @BeforeClass, @AfterClass, @DataProvider, @Parameters annotations from methods
const stripTestAnnotations: Rule = {
  name: 'strip-test-annotations',
  description: 'Remove TestNG annotations from methods after conversion',
  priority: 307,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    const testAnnotations = ['Test', 'BeforeMethod', 'AfterMethod', 'BeforeClass', 'AfterClass', 'DataProvider', 'Parameters', 'Before', 'After'];
    return method.annotations.some(a => testAnnotations.includes(a.name));
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const testAnnotations = ['Test', 'BeforeMethod', 'AfterMethod', 'BeforeClass', 'AfterClass', 'DataProvider', 'Parameters', 'Before', 'After'];
    return {
      ...method,
      annotations: method.annotations.filter(a => !testAnnotations.includes(a.name))
    };
  }
};

export const testConverterRules: Rule[] = [
  testMethodToPlaywright,
  beforeMethodToBeforeEach,
  afterMethodToAfterEach,
  beforeClassToBeforeAll,
  afterClassToAfterAll,
  dataProviderToExport,
  parametersToDestructuring,
  stripTestAnnotations,
];
