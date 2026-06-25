// src/rules/selenium/index.ts
// Comprehensive Selenium → Playwright transformation rules
// Covers: WebDriver, Actions, Select, JavascriptExecutor, WebDriverWait, Keys, TakesScreenshot, By

import type { Rule, RuleContext } from '../../types/rule';
import type {
  Node, Identifier, MemberExpression, CallExpression, NewExpression,
  AssignmentExpression, FieldDeclaration, Parameter, TypeReference,
  VariableDeclaration, ExpressionStatement, CompilationUnit, ImportDeclaration,
  ClassDeclaration, MethodDeclaration, Expression, Literal
} from '../../types/uast';

// ─── Helpers ───────────────────────────────────────────────────────────────

function isKind<T extends Node>(node: Node, kind: string): node is T {
  return node.kind === kind;
}

function makeIdent(name: string): Identifier {
  return { kind: 'Identifier', name, loc: { line: 0, column: 0 } };
}

function makeMember(obj: Expression, prop: string): MemberExpression {
  return {
    kind: 'MemberExpression',
    object: obj,
    property: prop,
    computed: false,
    loc: { line: 0, column: 0 }
  };
}

function makeCall(callee: Expression, args: Expression[]): CallExpression {
  return { kind: 'CallExpression', callee, arguments: args, loc: { line: 0, column: 0 } };
}

function makeLiteral(value: string): Literal {
  return { kind: 'Literal', value, raw: JSON.stringify(value), loc: { line: 0, column: 0 } };
}

function isSeleniumImport(name: string): boolean {
  const seleniumPkgs = [
    'org.openqa.selenium',
    'org.openqa.selenium.support',
    'org.openqa.selenium.interactions',
    'org.openqa.selenium.support.ui',
  ];
  return seleniumPkgs.some(p => name.startsWith(p));
}

function isTestNGImport(name: string): boolean {
  return name.startsWith('org.testng');
}

function isJUnitImport(name: string): boolean {
  return name.startsWith('org.junit');
}

// ─── Rule 1: Strip Selenium / TestNG / JUnit imports ─────────────────────────
const stripSeleniumImports: Rule = {
  name: 'strip-selenium-imports',
  description: 'Remove Selenium, TestNG, and JUnit imports',
  priority: 1,
  match(node, ctx) {
    if (!isKind<ImportDeclaration>(node, 'ImportDeclaration')) return false;
    const imp = node as ImportDeclaration;
    return isSeleniumImport(imp.name) || isTestNGImport(imp.name) || isJUnitImport(imp.name);
  },
  transform(node, ctx) {
    return null; // remove
  }
};

// ─── Rule 2: Strip Java util imports that are not needed in TS ────────────────
const stripJavaUtilImports: Rule = {
  name: 'strip-java-util-imports',
  description: 'Remove java.util/java.io imports (TS has built-ins)',
  priority: 2,
  match(node, ctx) {
    if (!isKind<ImportDeclaration>(node, 'ImportDeclaration')) return false;
    const imp = node as ImportDeclaration;
    return imp.name.startsWith('java.') || imp.name.startsWith('javax.');
  },
  transform(node, ctx) {
    return null;
  }
};

// ─── Rule 3: Add Playwright imports ──────────────────────────────────────────
const addPlaywrightImports: Rule = {
  name: 'add-playwright-imports',
  description: 'Add @playwright/test import when methods exist',
  priority: 3,
  match(node, ctx) {
    return isKind<CompilationUnit>(node, 'CompilationUnit');
  },
  transform(node, ctx) {
    const unit = node as CompilationUnit;
    const hasPlaywright = unit.imports.some(i => i.name === '@playwright/test');
    if (hasPlaywright) return unit;
    const newImport: ImportDeclaration = {
      kind: 'ImportDeclaration',
      name: '@playwright/test',
      static: false,
      wildcard: false,
      loc: { line: 0, column: 0 }
    };
    return { ...unit, imports: [newImport, ...unit.imports] };
  }
};

// ─── Rule 4: Export public class ─────────────────────────────────────────────
const exportClass: Rule = {
  name: 'export-class',
  description: 'public class → export class, strip extends BaseTest',
  priority: 4,
  match(node, ctx) {
    if (!isKind<ClassDeclaration>(node, 'ClassDeclaration')) return false;
    const cls = node as ClassDeclaration;
    return cls.modifiers.some(m => m.value === 'public');
  },
  transform(node, ctx) {
    const cls = node as ClassDeclaration;
    const newMods = cls.modifiers.filter(m => m.value !== 'public');
    // Strip extends BaseTest / extends TestBase (TestNG base classes)
    const superClass = cls.superClass;
    const isTestNGBase = superClass && ['BaseTest', 'TestBase', 'AbstractTest'].includes(superClass.name);
    return {
      ...cls,
      modifiers: [...newMods, { kind: 'Modifier', value: 'export', loc: { line: 0, column: 0 } }],
      superClass: isTestNGBase ? undefined : superClass,
    };
  }
};

// ─── Rule 5: Map WebDriver field → Page ─────────────────────────────────────
const webDriverFieldToPage: Rule = {
  name: 'webdriver-field-to-page',
  description: 'WebDriver driver → Page page',
  priority: 5,
  match(node, ctx) {
    if (!isKind<FieldDeclaration>(node, 'FieldDeclaration')) return false;
    const field = node as FieldDeclaration;
    return field.type && field.type.kind === 'TypeReference' && field.type.name === 'WebDriver';
  },
  transform(node, ctx) {
    const field = node as FieldDeclaration;
    return {
      ...field,
      type: { kind: 'TypeReference', name: 'Page', loc: { line: 0, column: 0 } },
      name: 'page',
    };
  }
};

// ─── Rule 6: Map WebDriver parameter → Page ──────────────────────────────────
const webDriverParamToPage: Rule = {
  name: 'webdriver-param-to-page',
  description: 'WebDriver param → Page param',
  priority: 6,
  match(node, ctx) {
    if (!isKind<Parameter>(node, 'Parameter')) return false;
    const param = node as Parameter;
    return param.type && param.type.kind === 'TypeReference' && param.type.name === 'WebDriver';
  },
  transform(node, ctx) {
    const param = node as Parameter;
    return {
      ...param,
      type: { kind: 'TypeReference', name: 'Page', loc: { line: 0, column: 0 } },
      name: 'page',
    };
  }
};

// ─── Rule 7: Map driver field assignment → this.page ─────────────────────────
const driverAssignmentTransform: Rule = {
  name: 'driver-assignment-transform',
  description: 'this.driver = driver → this.page = page',
  priority: 7,
  match(node, ctx) {
    if (!isKind<AssignmentExpression>(node, 'AssignmentExpression')) return false;
    const assign = node as AssignmentExpression;
    if (!isKind<MemberExpression>(assign.left, 'MemberExpression')) return false;
    const left = assign.left as MemberExpression;
    if (!isKind<Identifier>(left.object, 'Identifier') || left.object.name !== 'this') return false;
    if (left.property !== 'driver') return false;
    return true;
  },
  transform(node, ctx) {
    const assign = node as AssignmentExpression;
    return {
      ...assign,
      left: makeMember(makeIdent('this'), 'page'),
      right: makeIdent('page')
    };
  }
};

// ─── Rule 8: driver.get(url) → this.page.goto(url) ───────────────────────────
const seleniumNavigationToPlaywright: Rule = {
  name: 'selenium-navigation-to-playwright',
  description: 'driver.get(url) → this.page.goto(url)',
  priority: 8,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'get') return false;
    // Match driver.get, this.driver.get, or this.page.get (already transformed)
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'driver') return true;
    if (isKind<MemberExpression>(obj, 'MemberExpression') && obj.property === 'driver') return true;
    if (isKind<MemberExpression>(obj, 'MemberExpression') && obj.property === 'page') return true;
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    return makeCall(makeMember(makeIdent('this'), 'page'), [
      makeMember(makeIdent('page'), 'goto'),
      ...call.arguments
    ]);
  }
};

// ─── Rule 9: driver.findElement(By.xxx("...")) → this.page.locator("...") ────
const seleniumFindElementToPlaywright: Rule = {
  name: 'selenium-findElement-to-playwright',
  description: 'driver.findElement(By.id("...")) → this.page.locator("...")',
  priority: 9,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'findElement') return false;
    if (call.arguments.length !== 1) return false;
    const arg = call.arguments[0];
    // Match By.id("..."), By.cssSelector("..."), etc.
    if (isKind<CallExpression>(arg, 'CallExpression')) {
      const argCallee = arg.callee;
      if (isKind<MemberExpression>(argCallee, 'MemberExpression')) {
        const obj = argCallee.object;
        if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'By') return true;
      }
    }
    // Also match field-based: driver.findElement(usernameLocator)
    if (isKind<Identifier>(arg, 'Identifier')) {
      const knownByFields = ctx.metadata.byFields || [];
      if (knownByFields.includes(arg.name)) return true;
    }
    return false;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const arg = call.arguments[0];
    let selector: string | undefined;

    if (isKind<CallExpression>(arg, 'CallExpression') && isKind<MemberExpression>(arg.callee, 'MemberExpression')) {
      const byMethod = (arg.callee as MemberExpression).property;
      const byArg = arg.arguments[0];
      if (isKind<Literal>(byArg, 'Literal')) {
        const val = String(byArg.value);
        switch (byMethod) {
          case 'id': selector = '#' + val; break;
          case 'name': selector = `[name="${val}"]`; break;
          case 'className': selector = '.' + val; break;
          case 'cssSelector': selector = val; break;
          case 'xpath': selector = val; break;
          case 'linkText': selector = `text=${val}`; break;
          case 'partialLinkText': selector = `text=${val}`; break;
          case 'tagName': selector = val; break;
        }
      }
    }

    if (isKind<Identifier>(arg, 'Identifier')) {
      const knownByFields = ctx.metadata.byFields || [];
      if (knownByFields.includes(arg.name)) {
        // Field was converted to Locator — use this.fieldName
        return makeMember(makeIdent('this'), arg.name);
      }
    }

    if (selector) {
      return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'locator'), [makeLiteral(selector)]);
    }

    // Fallback: preserve as page.locator with original arg
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'locator'), [arg]);
  }
};

// ─── Rule 10: driver.findElements(...) → this.page.locator(...).all() ────────
const seleniumFindElementsToPlaywright: Rule = {
  name: 'selenium-findElements-to-playwright',
  description: 'driver.findElements(By...) → this.page.locator(...).all()',
  priority: 10,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'findElements';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const arg = call.arguments[0];
    let selector: string | undefined;

    if (isKind<CallExpression>(arg, 'CallExpression') && isKind<MemberExpression>(arg.callee, 'MemberExpression')) {
      const byMethod = (arg.callee as MemberExpression).property;
      const byArg = arg.arguments[0];
      if (isKind<Literal>(byArg, 'Literal')) {
        const val = String(byArg.value);
        switch (byMethod) {
          case 'id': selector = '#' + val; break;
          case 'name': selector = `[name="${val}"]`; break;
          case 'className': selector = '.' + val; break;
          case 'cssSelector': selector = val; break;
          case 'xpath': selector = val; break;
          case 'linkText': selector = `text=${val}`; break;
          case 'tagName': selector = val; break;
        }
      }
    }

    const locatorCall = selector
      ? makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'locator'), [makeLiteral(selector)])
      : makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'locator'), [arg]);

    return makeCall(makeMember(locatorCall, 'all'), []);
  }
};

// ─── Rule 11: driver.getTitle() → this.page.title() ──────────────────────────
const seleniumGetTitle: Rule = {
  name: 'selenium-getTitle',
  description: 'driver.getTitle() → this.page.title()',
  priority: 11,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'getTitle' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'title'), []);
  }
};

// ─── Rule 12: driver.getCurrentUrl() → this.page.url() ───────────────────────
const seleniumGetCurrentUrl: Rule = {
  name: 'selenium-getCurrentUrl',
  description: 'driver.getCurrentUrl() → this.page.url()',
  priority: 12,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'getCurrentUrl' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'url'), []);
  }
};

// ─── Rule 13: element.sendKeys("...") → element.fill("...") ──────────────────
const seleniumSendKeysToFill: Rule = {
  name: 'selenium-sendKeys-to-fill',
  description: 'element.sendKeys(text) → element.fill(text)',
  priority: 13,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    return callee.property === 'sendKeys';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'fill'), call.arguments);
  }
};

// ─── Rule 14: element.click() → element.click() (same, but marks async) ─────
// No transform needed, but we need to ensure emitter adds await

// ─── Rule 15: element.clear() → element.clear() (same) ─────────────────────
// No transform needed

// ─── Rule 16: element.getText() → element.textContent() ──────────────────────
const seleniumGetText: Rule = {
  name: 'selenium-getText',
  description: 'element.getText() → element.textContent()',
  priority: 16,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'getText' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'textContent'), []);
  }
};

// ─── Rule 17: element.isDisplayed() → element.isVisible() ────────────────────
const seleniumIsDisplayed: Rule = {
  name: 'selenium-isDisplayed',
  description: 'element.isDisplayed() → element.isVisible()',
  priority: 17,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'isDisplayed' && call.arguments.length === 0;
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'isVisible'), []);
  }
};

// ─── Rule 18: element.isEnabled() → element.isEnabled() (same) ───────────────
// No transform needed

// ─── Rule 19: element.getAttribute("name") → element.getAttribute("name") ──────
// No transform needed

// ─── Rule 20: new Actions(driver) → page (remove, Playwright has built-in) ──
const seleniumActionsRemove: Rule = {
  name: 'selenium-actions-remove',
  description: 'new Actions(driver) → remove (Playwright has built-in mouse/keyboard)',
  priority: 20,
  match(node, ctx) {
    if (!isKind<NewExpression>(node, 'NewExpression')) return false;
    const ne = node as NewExpression;
    if (!isKind<Identifier>(ne.callee, 'Identifier')) return false;
    return ne.callee.name === 'Actions';
  },
  transform(node, ctx) {
    return null; // remove
  }
};

// ─── Rule 21: actions.dragAndDrop(source, target) → page.dragAndDrop(source, target)
const seleniumActionsDragAndDrop: Rule = {
  name: 'selenium-actions-dragAndDrop',
  description: 'actions.dragAndDrop(src, tgt) → page.dragAndDrop(src, tgt)',
  priority: 21,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'dragAndDrop';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    return makeCall(makeMember(makeIdent('page'), 'dragAndDrop'), call.arguments);
  }
};

// ─── Rule 22: actions.doubleClick(element) → page.dblclick(element) ───────────
const seleniumActionsDoubleClick: Rule = {
  name: 'selenium-actions-doubleClick',
  description: 'actions.doubleClick(el) → page.dblclick(el)',
  priority: 22,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'doubleClick';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    return makeCall(makeMember(makeIdent('page'), 'dblclick'), call.arguments);
  }
};

// ─── Rule 23: actions.contextClick(element) → page.click({ button: 'right' }) ──
const seleniumActionsContextClick: Rule = {
  name: 'selenium-actions-contextClick',
  description: 'actions.contextClick(el) → page.click(el, { button: "right" })',
  priority: 23,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'contextClick';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const args = call.arguments;
    // If called on locator: locator.click({ button: 'right' })
    if (args.length === 0) {
      const callee = call.callee as MemberExpression;
      return makeCall(makeMember(callee.object, 'click'), [
        { kind: 'ObjectExpression', properties: [
          { kind: 'Property', key: 'button', value: makeLiteral('right'), loc: { line: 0, column: 0 } }
        ], loc: { line: 0, column: 0 }}
      ]);
    }
    return makeCall(makeMember(makeIdent('page'), 'click'), [
      ...args,
      { kind: 'ObjectExpression', properties: [
        { kind: 'Property', key: 'button', value: makeLiteral('right'), loc: { line: 0, column: 0 } }
      ], loc: { line: 0, column: 0 }}
    ]);
  }
};

// ─── Rule 24: actions.moveToElement(element) → page.hover(element) ────────────
const seleniumActionsMoveToElement: Rule = {
  name: 'selenium-actions-moveToElement',
  description: 'actions.moveToElement(el) → page.hover(el) or el.hover()',
  priority: 24,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'moveToElement';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const args = call.arguments;
    if (args.length === 1) {
      // moveToElement(element) → element.hover()
      return makeCall(makeMember(args[0], 'hover'), []);
    }
    return makeCall(makeMember(makeIdent('page'), 'hover'), args);
  }
};

// ─── Rule 25: actions.clickAndHold().moveByOffset(x,y).release() → mouse down/move/up
// Complex chain — simplify to page.mouse operations
const seleniumActionsChain: Rule = {
  name: 'selenium-actions-chain',
  description: 'actions.clickAndHold()... → page.mouse sequences',
  priority: 25,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    const chainMethods = ['clickAndHold', 'moveByOffset', 'release', 'perform', 'keyDown', 'keyUp', 'sendKeys'];
    return chainMethods.includes(callee.property);
  },
  transform(node, ctx) {
    // Complex chains need special handling — for now, emit as TODO comment
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return {
      kind: 'ExpressionStatement',
      expression: makeCall(makeMember(makeIdent('page'), 'mouse'), []),
      loc: { line: 0, column: 0 }
    };
  }
};

// ─── Rule 26: new Select(element) → element (remove wrapper, use selectOption)
const seleniumSelectRemove: Rule = {
  name: 'selenium-select-remove',
  description: 'new Select(element) → element (Playwright has selectOption on locator)',
  priority: 26,
  match(node, ctx) {
    if (!isKind<NewExpression>(node, 'NewExpression')) return false;
    const ne = node as NewExpression;
    if (!isKind<Identifier>(ne.callee, 'Identifier')) return false;
    return ne.callee.name === 'Select';
  },
  transform(node, ctx) {
    const ne = node as NewExpression;
    // Return the element argument (first arg to Select constructor)
    return ne.arguments[0] || makeIdent('element');
  }
};

// ─── Rule 27: select.selectByVisibleText("text") → element.selectOption({ label: "text" })
const seleniumSelectByVisibleText: Rule = {
  name: 'selenium-selectByVisibleText',
  description: 'select.selectByVisibleText(text) → select.selectOption({ label: text })',
  priority: 27,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'selectByVisibleText';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    const arg = call.arguments[0];
    return makeCall(makeMember(callee.object, 'selectOption'), [
      { kind: 'ObjectExpression', properties: [
        { kind: 'Property', key: 'label', value: arg, loc: { line: 0, column: 0 } }
      ], loc: { line: 0, column: 0 }}
    ]);
  }
};

// ─── Rule 28: select.selectByValue("value") → element.selectOption("value")
const seleniumSelectByValue: Rule = {
  name: 'selenium-selectByValue',
  description: 'select.selectByValue(val) → select.selectOption(val)',
  priority: 28,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'selectByValue';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    return makeCall(makeMember(callee.object, 'selectOption'), call.arguments);
  }
};

// ─── Rule 29: select.selectByIndex(2) → element.selectOption({ index: 2 })
const seleniumSelectByIndex: Rule = {
  name: 'selenium-selectByIndex',
  description: 'select.selectByIndex(idx) → select.selectOption({ index: idx })',
  priority: 29,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'selectByIndex';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    const arg = call.arguments[0];
    return makeCall(makeMember(callee.object, 'selectOption'), [
      { kind: 'ObjectExpression', properties: [
        { kind: 'Property', key: 'index', value: arg, loc: { line: 0, column: 0 } }
      ], loc: { line: 0, column: 0 }}
    ]);
  }
};

// ─── Rule 30: js.executeScript("script", args...) → page.evaluate("script", args...)
const seleniumJsExecutor: Rule = {
  name: 'selenium-js-executor',
  description: 'js.executeScript(script, args) → page.evaluate(script, args)',
  priority: 30,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'executeScript' || callee.property === 'executeAsyncScript';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'evaluate'), call.arguments);
  }
};

// ─── Rule 31: new WebDriverWait(driver, timeout) → page.waitForSelector / page.waitForLoadState
// This is a declaration removal — the wait logic is handled by individual wait rules
const seleniumWebDriverWaitRemove: Rule = {
  name: 'selenium-webdriverwait-remove',
  description: 'new WebDriverWait(driver, timeout) → remove (Playwright has built-in waits)',
  priority: 31,
  match(node, ctx) {
    if (!isKind<NewExpression>(node, 'NewExpression')) return false;
    const ne = node as NewExpression;
    if (!isKind<Identifier>(ne.callee, 'Identifier')) return false;
    return ne.callee.name === 'WebDriverWait';
  },
  transform(node, ctx) {
    return null;
  }
};

// ─── Rule 32: wait.until(ExpectedConditions.visibilityOfElementLocated(By...)) → page.waitForSelector
const seleniumExpectedConditions: Rule = {
  name: 'selenium-expected-conditions',
  description: 'ExpectedConditions.visibilityOfElementLocated(By...) → page.waitForSelector',
  priority: 32,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    const ecMethods = [
      'visibilityOfElementLocated', 'presenceOfElementLocated', 'elementToBeClickable',
      'visibilityOf', 'presenceOfAllElementsLocatedBy', 'textToBePresentInElementLocated'
    ];
    return ecMethods.includes(callee.property);
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    const callee = call.callee as MemberExpression;
    const ecMethod = callee.property;
    const arg = call.arguments[0];

    let selector: string | undefined;
    if (isKind<CallExpression>(arg, 'CallExpression') && isKind<MemberExpression>(arg.callee, 'MemberExpression')) {
      const byMethod = (arg.callee as MemberExpression).property;
      const byArg = arg.arguments[0];
      if (isKind<Literal>(byArg, 'Literal')) {
        const val = String(byArg.value);
        switch (byMethod) {
          case 'id': selector = '#' + val; break;
          case 'name': selector = `[name="${val}"]`; break;
          case 'className': selector = '.' + val; break;
          case 'cssSelector': selector = val; break;
          case 'xpath': selector = val; break;
          case 'linkText': selector = `text=${val}`; break;
          case 'tagName': selector = val; break;
        }
      }
    }

    const selExpr = selector ? makeLiteral(selector) : arg;

    if (ecMethod === 'elementToBeClickable') {
      return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'waitForSelector'), [
        selExpr,
        { kind: 'ObjectExpression', properties: [
          { kind: 'Property', key: 'state', value: makeLiteral('visible'), loc: { line: 0, column: 0 } }
        ], loc: { line: 0, column: 0 }}
      ]);
    }

    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'waitForSelector'), [selExpr]);
  }
};

// ─── Rule 33: Keys.ENTER → 'Enter', Keys.TAB → 'Tab', etc. ───────────────────
const seleniumKeys: Rule = {
  name: 'selenium-keys',
  description: 'Keys.XXX → Playwright key string',
  priority: 33,
  match(node, ctx) {
    if (!isKind<MemberExpression>(node, 'MemberExpression')) return false;
    const mem = node as MemberExpression;
    if (!isKind<Identifier>(mem.object, 'Identifier')) return false;
    return mem.object.name === 'Keys';
  },
  transform(node, ctx) {
    const mem = node as MemberExpression;
    const keyMap: Record<string, string> = {
      'ENTER': 'Enter', 'RETURN': 'Enter', 'TAB': 'Tab', 'ESCAPE': 'Escape',
      'BACK_SPACE': 'Backspace', 'SPACE': ' ', 'DELETE': 'Delete',
      'ARROW_UP': 'ArrowUp', 'ARROW_DOWN': 'ArrowDown', 'ARROW_LEFT': 'ArrowLeft', 'ARROW_RIGHT': 'ArrowRight',
      'HOME': 'Home', 'END': 'End', 'PAGE_UP': 'PageUp', 'PAGE_DOWN': 'PageDown',
      'SHIFT': 'Shift', 'CONTROL': 'Control', 'ALT': 'Alt', 'META': 'Meta',
      'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4', 'F5': 'F5', 'F6': 'F6',
      'F7': 'F7', 'F8': 'F8', 'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
    };
    const playwrightKey = keyMap[mem.property] || mem.property;
    return makeLiteral(playwrightKey);
  }
};

// ─── Rule 34: ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE) → page.screenshot({ path: '...' })
const seleniumScreenshot: Rule = {
  name: 'selenium-screenshot',
  description: 'TakesScreenshot.getScreenshotAs → page.screenshot',
  priority: 34,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'getScreenshotAs';
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'screenshot'), [
      { kind: 'ObjectExpression', properties: [
        { kind: 'Property', key: 'path', value: makeLiteral('screenshot.png'), loc: { line: 0, column: 0 } }
      ], loc: { line: 0, column: 0 }}
    ]);
  }
};

// ─── Rule 35: By field → Locator field (tracks field names in metadata) ─────
const byFieldToLocator: Rule = {
  name: 'by-field-to-locator',
  description: 'private By name = By.id("...") → readonly name: Locator',
  priority: 35,
  match(node, ctx) {
    if (!isKind<FieldDeclaration>(node, 'FieldDeclaration')) return false;
    const field = node as FieldDeclaration;
    if (!field.type || field.type.kind !== 'TypeReference') return false;
    if (field.type.name !== 'By') return false;
    return true;
  },
  transform(node, ctx) {
    const field = node as FieldDeclaration;
    const byFields = ctx.metadata.byFields || [];
    byFields.push(field.name);
    ctx.metadata.byFields = byFields;
    return {
      ...field,
      type: { kind: 'TypeReference', name: 'Locator', loc: { line: 0, column: 0 } },
      modifiers: field.modifiers.filter(m => !['private', 'final'].includes(m.value)),
    };
  }
};

// ─── Rule 36: driver.navigate().back() → page.goBack()
const seleniumNavigateBack: Rule = {
  name: 'selenium-navigate-back',
  description: 'driver.navigate().back() → page.goBack()',
  priority: 36,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'back') return false;
    if (!isKind<MemberExpression>(callee.object, 'MemberExpression')) return false;
    const obj = callee.object as MemberExpression;
    return obj.property === 'navigate';
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'goBack'), []);
  }
};

// ─── Rule 37: driver.navigate().refresh() → page.reload()
const seleniumNavigateRefresh: Rule = {
  name: 'selenium-navigate-refresh',
  description: 'driver.navigate().refresh() → page.reload()',
  priority: 37,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'refresh') return false;
    if (!isKind<MemberExpression>(callee.object, 'MemberExpression')) return false;
    const obj = callee.object as MemberExpression;
    return obj.property === 'navigate';
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'reload'), []);
  }
};

// ─── Rule 38: driver.switchTo().frame() → page.frame()
const seleniumSwitchToFrame: Rule = {
  name: 'selenium-switchTo-frame',
  description: 'driver.switchTo().frame() → page.frame()',
  priority: 38,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'frame') return false;
    if (!isKind<MemberExpression>(callee.object, 'MemberExpression')) return false;
    const obj = callee.object as MemberExpression;
    return obj.property === 'switchTo';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'frame'), call.arguments);
  }
};

// ─── Rule 39: driver.manage().window().maximize() → page.setViewportSize()
const seleniumWindowMaximize: Rule = {
  name: 'selenium-window-maximize',
  description: 'driver.manage().window().maximize() → page.setViewportSize({ width: 1920, height: 1080 })',
  priority: 39,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'maximize') return false;
    if (!isKind<MemberExpression>(callee.object, 'MemberExpression')) return false;
    const obj = callee.object as MemberExpression;
    if (obj.property !== 'window') return false;
    if (!isKind<MemberExpression>(obj.object, 'MemberExpression')) return false;
    const obj2 = obj.object as MemberExpression;
    return obj2.property === 'manage';
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'setViewportSize'), [
      { kind: 'ObjectExpression', properties: [
        { kind: 'Property', key: 'width', value: { kind: 'Literal', value: 1920, raw: '1920', loc: { line: 0, column: 0 } }, loc: { line: 0, column: 0 } },
        { kind: 'Property', key: 'height', value: { kind: 'Literal', value: 1080, raw: '1080', loc: { line: 0, column: 0 } }, loc: { line: 0, column: 0 } }
      ], loc: { line: 0, column: 0 }}
    ]);
  }
};

// ─── Rule 40: driver.manage().timeouts().implicitlyWait(timeout) → page.setDefaultTimeout(timeout)
const seleniumImplicitWait: Rule = {
  name: 'selenium-implicit-wait',
  description: 'driver.manage().timeouts().implicitlyWait → page.setDefaultTimeout',
  priority: 40,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    return callee.property === 'implicitlyWait';
  },
  transform(node, ctx) {
    const call = node as CallExpression;
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'setDefaultTimeout'), call.arguments);
  }
};

// ─── Rule 41: driver.close() → page.close()
const seleniumDriverClose: Rule = {
  name: 'selenium-driver-close',
  description: 'driver.close() → page.close()',
  priority: 41,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'close') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'driver') return true;
    if (isKind<MemberExpression>(obj, 'MemberExpression') && obj.property === 'driver') return true;
    return false;
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeIdent('this'), 'page'), 'close'), []);
  }
};

// ─── Rule 42: driver.quit() → page.context().close()
const seleniumDriverQuit: Rule = {
  name: 'selenium-driver-quit',
  description: 'driver.quit() → page.context().close()',
  priority: 42,
  match(node, ctx) {
    if (!isKind<CallExpression>(node, 'CallExpression')) return false;
    const call = node as CallExpression;
    if (!isKind<MemberExpression>(call.callee, 'MemberExpression')) return false;
    const callee = call.callee as MemberExpression;
    if (callee.property !== 'quit') return false;
    const obj = callee.object;
    if (isKind<Identifier>(obj, 'Identifier') && obj.name === 'driver') return true;
    if (isKind<MemberExpression>(obj, 'MemberExpression') && obj.property === 'driver') return true;
    return false;
  },
  transform(node, ctx) {
    return makeCall(makeMember(makeMember(makeMember(makeIdent('this'), 'page'), 'context'), 'close'), []);
  }
};

// ─── Rule 43: Remove driver parameter references in method bodies (heuristic)
const driverIdentifierToPage: Rule = {
  name: 'driver-identifier-to-page',
  description: 'Bare driver identifier → page (in method args)',
  priority: 43,
  match(node, ctx) {
    if (!isKind<Identifier>(node, 'Identifier')) return false;
    const ident = node as Identifier;
    return ident.name === 'driver';
  },
  transform(node, ctx) {
    return makeIdent('page');
  }
};

// ─── Rule 44: Add async modifier to public methods ───────────────────────────
const addAsyncModifier: Rule = {
  name: 'add-async-modifier',
  description: 'Add async to public/export methods',
  priority: 44,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    const mods = method.modifiers.map(m => m.value);
    return (mods.includes('public') || mods.includes('export')) && !mods.includes('async');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    return {
      ...method,
      modifiers: [...method.modifiers, { kind: 'Modifier', value: 'async', loc: { line: 0, column: 0 } }]
    };
  }
};

// ─── Rule 45: Remove public modifier from methods ────────────────────────────
const removePublicModifier: Rule = {
  name: 'remove-public-modifier',
  description: 'Remove public from method modifiers',
  priority: 45,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.modifiers.some(m => m.value === 'public');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    return {
      ...method,
      modifiers: method.modifiers.filter(m => m.value !== 'public')
    };
  }
};

// ─── Rule 46: Wrap return types in Promise<...> ──────────────────────────────
const returnTypeToPromise: Rule = {
  name: 'return-type-to-promise',
  description: 'T → Promise<T> for async methods',
  priority: 46,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    if (!method.returnType) return false;
    if (method.returnType.kind === 'VoidType') return true;
    if (method.returnType.kind === 'TypeReference' || method.returnType.kind === 'PrimitiveType') return true;
    return false;
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    const rt = method.returnType!;
    const innerType = rt.kind === 'VoidType'
      ? 'void'
      : (rt as TypeReference | any).name || 'any';
    return {
      ...method,
      returnType: {
        kind: 'TypeReference',
        name: `Promise<${innerType}>`,
        loc: { line: 0, column: 0 }
      }
    };
  }
};

// ─── Rule 47: Strip @Override annotations ──────────────────────────────────────
const stripOverrideAnnotation: Rule = {
  name: 'strip-override',
  description: 'Remove @Override annotations',
  priority: 47,
  match(node, ctx) {
    if (!isKind<MethodDeclaration>(node, 'MethodDeclaration')) return false;
    const method = node as MethodDeclaration;
    return method.annotations.some(a => a.name === 'Override');
  },
  transform(node, ctx) {
    const method = node as MethodDeclaration;
    return {
      ...method,
      annotations: method.annotations.filter(a => a.name !== 'Override')
    };
  }
};

// ─── Rule 48: Strip @FindBy annotations ───────────────────────────────────────
const stripFindByAnnotation: Rule = {
  name: 'strip-findby',
  description: 'Remove @FindBy annotations (converted to locators)',
  priority: 48,
  match(node, ctx) {
    if (!isKind<FieldDeclaration>(node, 'FieldDeclaration')) return false;
    const field = node as FieldDeclaration;
    return field.annotations.some(a => a.name === 'FindBy');
  },
  transform(node, ctx) {
    const field = node as FieldDeclaration;
    return {
      ...field,
      annotations: field.annotations.filter(a => a.name !== 'FindBy')
    };
  }
};

// ─── Export all rules ──────────────────────────────────────────────────────────
export const seleniumToPlaywrightRules: Rule[] = [
  stripSeleniumImports,
  stripJavaUtilImports,
  addPlaywrightImports,
  exportClass,
  webDriverFieldToPage,
  webDriverParamToPage,
  driverAssignmentTransform,
  seleniumNavigationToPlaywright,
  seleniumFindElementToPlaywright,
  seleniumFindElementsToPlaywright,
  seleniumGetTitle,
  seleniumGetCurrentUrl,
  seleniumSendKeysToFill,
  seleniumGetText,
  seleniumIsDisplayed,
  seleniumActionsRemove,
  seleniumActionsDragAndDrop,
  seleniumActionsDoubleClick,
  seleniumActionsContextClick,
  seleniumActionsMoveToElement,
  seleniumActionsChain,
  seleniumSelectRemove,
  seleniumSelectByVisibleText,
  seleniumSelectByValue,
  seleniumSelectByIndex,
  seleniumJsExecutor,
  seleniumWebDriverWaitRemove,
  seleniumExpectedConditions,
  seleniumKeys,
  seleniumScreenshot,
  byFieldToLocator,
  seleniumNavigateBack,
  seleniumNavigateRefresh,
  seleniumSwitchToFrame,
  seleniumWindowMaximize,
  seleniumImplicitWait,
  seleniumDriverClose,
  seleniumDriverQuit,
  driverIdentifierToPage,
  addAsyncModifier,
  removePublicModifier,
  returnTypeToPromise,
  stripOverrideAnnotation,
  stripFindByAnnotation,
];
