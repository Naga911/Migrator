// src/rules/collections/index.ts
// Java Collections → TypeScript/JavaScript equivalents

import type { Rule } from '../../types/rule';
import type { Node, CallExpression, MemberExpression, Identifier, NewExpression, TypeReference } from '../../types/uast';

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

// Rule 1: new ArrayList<>() → []
const newArrayList: Rule = {
  name: 'new-arraylist',
  description: 'new ArrayList<>() → []',
  priority: 200,
  match(node, ctx) {
    if (!isKind<NewExpression>(node, 'NewExpression')) return false;
    const ne = node as NewExpression;
    if (!isKind<Identifier>(ne.callee, 'Identifier')) return false;
    return ne.callee.name === 'ArrayList';
  },
  transform(node, ctx) {
    return { kind: 'ArrayExpression', elements: [], loc: { line: 0, column: 0 } };
  }
};

// Rule 2: new HashMap<>() → new Map()
const newHashMap: Rule = {
  name: 'new-hashmap',
  description: 'new HashMap<>() → new Map()',
  priority: 201,
  match(node, ctx) {
    if (!isKind<NewExpression>(node, 'NewExpression')) return false;
    const ne = node as NewExpression;
    if (!isKind<Identifier>(ne.callee, 'Identifier')) return false;
    return ne.callee.name === 'HashMap';
  },
  transform(node, ctx) {
    return makeCall(makeIdent('Map'), []);
  }
};

// Rule 3: new HashSet<>() → new Set()
const newHashSet: Rule = {
  name: 'new-hashset',
  description: 'new HashSet<>() → new Set()',
  priority: 202,
  match(node, ctx) {
    if (!isKind<NewExpression>(node, 'NewExpression')) return false;
    const ne = node as NewExpression;
    if (!isKind<Identifier>(ne.callee, 'Identifier')) return false;
    return ne.callee.name === 'HashSet';
  },
  transform(node, ctx) {
    return makeCall(makeIdent('Set'), []);
  }
};

// Rule 4: list.add(item) → list.push(item)
const listAdd: Rule = {
  name: 'list-add',
  description: 'list.add(item) → list.push(item)',
  priority: 203,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'add';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'push'), call.arguments);
  }
};

// Rule 5: list.get(index) → list[index]
const listGet: Rule = {
  name: 'list-get',
  description: 'list.get(index) → list[index]',
  priority: 204,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'get' && call.arguments.length === 1;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return {
      kind: 'MemberExpression',
      object: callee.object,
      property: call.arguments[0] as any,
      computed: true,
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 6: list.size() → list.length
const listSize: Rule = {
  name: 'list-size',
  description: 'list.size() → list.length',
  priority: 205,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'size' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeMember(callee.object, 'length');
  }
};

// Rule 7: list.isEmpty() → list.length === 0
const listIsEmpty: Rule = {
  name: 'list-isEmpty',
  description: 'list.isEmpty() → list.length === 0',
  priority: 206,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'isEmpty' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return {
      kind: 'BinaryExpression',
      left: makeMember(callee.object, 'length'),
      operator: '===',
      right: { kind: 'Literal', value: 0, raw: '0', loc: { line: 0, column: 0 } },
      loc: { line: 0, column: 0 }
    };
  }
};

// Rule 8: list.remove(index) → list.splice(index, 1)
const listRemove: Rule = {
  name: 'list-remove',
  description: 'list.remove(index) → list.splice(index, 1)',
  priority: 207,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'remove';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'splice'), [
      call.arguments[0],
      { kind: 'Literal', value: 1, raw: '1', loc: { line: 0, column: 0 } }
    ]);
  }
};

// Rule 9: list.contains(item) → list.includes(item)
const listContains: Rule = {
  name: 'list-contains',
  description: 'list.contains(item) → list.includes(item)',
  priority: 208,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'contains';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'includes'), call.arguments);
  }
};

// Rule 10: Collections.sort(list) → list.sort()
const collectionsSort: Rule = {
  name: 'collections-sort',
  description: 'Collections.sort(list) → list.sort()',
  priority: 209,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'sort') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'Collections') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const list = call.arguments[0];
    return makeCall(makeMember(list, 'sort'), []);
  }
};

// Rule 11: map.put(key, value) → map.set(key, value)
const mapPut: Rule = {
  name: 'map-put',
  description: 'map.put(key, value) → map.set(key, value)',
  priority: 210,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'put';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'set'), call.arguments);
  }
};

// Rule 12: map.get(key) → map.get(key) (same)
// No transform needed

// Rule 13: map.size() → map.size (same)
// No transform needed

// Rule 14: map.containsKey(key) → map.has(key)
const mapContainsKey: Rule = {
  name: 'map-containsKey',
  description: 'map.containsKey(key) → map.has(key)',
  priority: 211,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'containsKey';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'has'), call.arguments);
  }
};

// Rule 15: map.keySet() → Array.from(map.keys())
const mapKeySet: Rule = {
  name: 'map-keySet',
  description: 'map.keySet() → Array.from(map.keys())',
  priority: 212,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'keySet' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeIdent('Array.from'), [makeCall(makeMember(callee.object, 'keys'), [])]);
  }
};

// Rule 16: map.values() → Array.from(map.values())
const mapValues: Rule = {
  name: 'map-values',
  description: 'map.values() → Array.from(map.values())',
  priority: 213,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'values' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeIdent('Array.from'), [makeCall(makeMember(callee.object, 'values'), [])]);
  }
};

// Rule 17: list.stream().filter(...).collect(Collectors.toList()) → list.filter(...)
const streamFilterCollect: Rule = {
  name: 'stream-filter-collect',
  description: 'list.stream().filter(...).collect(Collectors.toList()) → list.filter(...)',
  priority: 214,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'collect') return false;
    // Check chain: .stream().filter(...).collect(...)
    const streamCall = callee.object;
    if (!isKind<CallExpression>(streamCall, 'CallExpression')) return false;
    const streamCallee = streamCall.callee as MemberExpression;
    if (streamCallee.property !== 'filter') return false;
    const streamObj = streamCallee.object;
    if (!isKind<CallExpression>(streamObj, 'CallExpression')) return false;
    const streamObjCallee = streamObj.callee as MemberExpression;
    if (streamObjCallee.property !== 'stream') return false;
    return true;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const streamCall = (call.callee as MemberExpression).object as CallExpression;
    const filterCall = streamCall.callee as MemberExpression;
    const list = (filterCall.object as CallExpression).callee as MemberExpression;
    const filterArg = streamCall.arguments[0];
    return makeCall(makeMember(list.object, 'filter'), [filterArg]);
  }
};

// Rule 18: List<String> type → string[] type
const listTypeToArray: Rule = {
  name: 'list-type-to-array',
  description: 'List<String> → string[]',
  priority: 215,
  match(node, ctx) {
    if (!isKind<TypeReference>(node, 'TypeReference')) return false;
    const type = node as TypeReference;
    return type.name === 'List' || type.name === 'ArrayList';
  },
  transform(node, ctx) {
    return { kind: 'TypeReference', name: 'any[]', loc: { line: 0, column: 0 } };
  }
};

// Rule 19: Map<K,V> type → Map<K,V> (keep as Map)
const mapTypeKeep: Rule = {
  name: 'map-type-keep',
  description: 'Map<K,V> → Map (keep)',
  priority: 216,
  match(node, ctx) {
    if (!isKind<TypeReference>(node, 'TypeReference')) return false;
    const type = node as TypeReference;
    return type.name === 'Map' || type.name === 'HashMap';
  },
  transform(node, ctx) {
    return { kind: 'TypeReference', name: 'Map', loc: { line: 0, column: 0 } };
  }
};

// Rule 20: Set<T> type → Set<T>
const setTypeKeep: Rule = {
  name: 'set-type-keep',
  description: 'Set<T> → Set (keep)',
  priority: 217,
  match(node, ctx) {
    if (!isKind<TypeReference>(node, 'TypeReference')) return false;
    const type = node as TypeReference;
    return type.name === 'Set' || type.name === 'HashSet';
  },
  transform(node, ctx) {
    return { kind: 'TypeReference', name: 'Set', loc: { line: 0, column: 0 } };
  }
};

export const collectionRules: Rule[] = [
  newArrayList, newHashMap, newHashSet, listAdd, listGet, listSize,
  listIsEmpty, listRemove, listContains, collectionsSort, mapPut,
  mapContainsKey, mapKeySet, mapValues, streamFilterCollect,
  listTypeToArray, mapTypeKeep, setTypeKeep,
];
