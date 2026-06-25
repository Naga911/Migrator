// src/rules/assertions/index.ts
// JUnit / TestNG assertions → Playwright expect

import type { Rule } from '../../types/rule';
import type { Node, CallExpression, MemberExpression, Identifier, Literal } from '../../types/uast';

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

// Rule 1: Assert.assertEquals(actual, expected) → expect(actual).toBe(expected)
const assertEquals: Rule = {
  name: 'assert-equals',
  description: 'Assert.assertEquals(actual, expected) → expect(actual).toBe(expected)',
  priority: 100,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'assertEquals') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Assert') return true;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Assertions') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const args = call.arguments;
    const actual = args[0];
    const expected = args[1];
    return makeCall(makeMember(makeCall(makeIdent('expect'), [actual]), 'toBe'), [expected]);
  }
};

// Rule 2: Assert.assertTrue(condition) → expect(condition).toBeTruthy()
const assertTrue: Rule = {
  name: 'assert-true',
  description: 'Assert.assertTrue(cond) → expect(cond).toBeTruthy()',
  priority: 101,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'assertTrue') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && (obj.name === 'Assert' || obj.name === 'Assertions')) return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const cond = call.arguments[0];
    return makeCall(makeMember(makeCall(makeIdent('expect'), [cond]), 'toBeTruthy'), []);
  }
};

// Rule 3: Assert.assertFalse(condition) → expect(condition).toBeFalsy()
const assertFalse: Rule = {
  name: 'assert-false',
  description: 'Assert.assertFalse(cond) → expect(cond).toBeFalsy()',
  priority: 102,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'assertFalse') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && (obj.name === 'Assert' || obj.name === 'Assertions')) return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const cond = call.arguments[0];
    return makeCall(makeMember(makeCall(makeIdent('expect'), [cond]), 'toBeFalsy'), []);
  }
};

// Rule 4: Assert.assertNull(obj) → expect(obj).toBeNull()
const assertNull: Rule = {
  name: 'assert-null',
  description: 'Assert.assertNull(obj) → expect(obj).toBeNull()',
  priority: 103,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'assertNull') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Assert') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const arg = call.arguments[0];
    return makeCall(makeMember(makeCall(makeIdent('expect'), [arg]), 'toBeNull'), []);
  }
};

// Rule 5: Assert.assertNotNull(obj) → expect(obj).not.toBeNull()
const assertNotNull: Rule = {
  name: 'assert-not-null',
  description: 'Assert.assertNotNull(obj) → expect(obj).not.toBeNull()',
  priority: 104,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'assertNotNull') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Assert') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const arg = call.arguments[0];
    return makeCall(makeMember(makeMember(makeCall(makeIdent('expect'), [arg]), 'not'), 'toBeNull'), []);
  }
};

// Rule 6: Assert.assertSame(actual, expected) → expect(actual).toBe(expected) (reference equality)
const assertSame: Rule = {
  name: 'assert-same',
  description: 'Assert.assertSame(actual, expected) → expect(actual).toBe(expected)',
  priority: 105,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'assertSame') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Assert') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const args = call.arguments;
    return makeCall(makeMember(makeCall(makeIdent('expect'), [args[0]]), 'toBe'), [args[1]]);
  }
};

// Rule 7: Assert.fail(message) → expect(false).toBe(true) with message
const assertFail: Rule = {
  name: 'assert-fail',
  description: 'Assert.fail(msg) → throw new Error(msg)',
  priority: 106,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'fail') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Assert') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const msg = call.arguments[0] || makeLiteral('Assertion failed');
    return {
      kind: 'ThrowStatement',
      argument: makeCall(makeIdent('Error'), [msg]),
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 8: SoftAssert → Playwright soft expect (expect.soft)
const softAssert: Rule = {
  name: 'soft-assert',
  description: 'softAssert.assertEquals → expect.soft(actual).toBe(expected)',
  priority: 107,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    const softMethods = ['assertEquals', 'assertTrue', 'assertFalse', 'assertNull', 'assertNotNull'];
    if (!softMethods.includes(callee.property)) return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && (obj.name === 'softAssert' || obj.name === 'softAssert')) return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    const method = callee.property;
    const args = call.arguments;
    const expectSoft = makeMember(makeIdent('expect'), 'soft');

    if (method === 'assertEquals') {
      return makeCall(makeMember(makeCall(expectSoft, [args[0]]), 'toBe'), [args[1]]);
    }
    if (method === 'assertTrue') {
      return makeCall(makeMember(makeCall(expectSoft, [args[0]]), 'toBeTruthy'), []);
    }
    if (method === 'assertFalse') {
      return makeCall(makeMember(makeCall(expectSoft, [args[0]]), 'toBeFalsy'), []);
    }
    if (method === 'assertNull') {
      return makeCall(makeMember(makeCall(expectSoft, [args[0]]), 'toBeNull'), []);
    }
    if (method === 'assertNotNull') {
      return makeCall(makeMember(makeMember(makeCall(expectSoft, [args[0]]), 'not'), 'toBeNull'), []);
    }
    return node;
  }
};

export const assertionRules: Rule[] = [
  assertEquals, assertTrue, assertFalse, assertNull, assertNotNull,
  assertSame, assertFail, softAssert,
];
