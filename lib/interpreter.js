/**
 * Klomn Interpreter / Runtime
 * A tree-walking interpreter to execute the parsed AST.
 */

export class ReturnException extends Error {
  constructor(value) {
    super('ReturnException');
    this.value = value;
  }
}

export class BreakException extends Error {
  constructor() {
    super('BreakException');
  }
}

export class ContinueException extends Error {
  constructor() {
    super('ContinueException');
  }
}

export class Environment {
  constructor(parent = null) {
    this.vars = new Map();
    this.parent = parent;
  }

  define(name, value) {
    this.vars.set(name, value);
    return value;
  }

  assign(name, value) {
    if (this.vars.has(name)) {
      this.vars.set(name, value);
      return value;
    }
    if (this.parent) {
      return this.parent.assign(name, value);
    }
    // Python behaves such that assignment in a scope is local,
    // unless defined global. Currently, let's treat assignment as establishing
    // a local variable if it doesn't exist, OR modifying an existing one up the chain.
    this.vars.set(name, value);
    return value;
  }

  get(name) {
    if (this.vars.has(name)) {
      return this.vars.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new ReferenceError(`NameError: name '${name}' is not defined`);
  }
}

export class Interpreter {
  constructor(options = {}) {
    this.globals = new Environment();
    this.currentEnv = this.globals;
    this.stdout = options.stdout || console.log;

    this.setupGlobals();
  }

  setupGlobals() {
    // Standard built-in function bindings
    this.globals.define('print', (...args) => {
      const formatted = args.map(arg => {
        if (arg === null) return 'None';
        if (typeof arg === 'boolean') return arg ? 'True' : 'False';
        if (Array.isArray(arg)) {
          return '[' + arg.map(x => (typeof x === 'string' ? `'${x}'` : String(x))).join(', ') + ']';
        }
        return String(arg);
      });
      this.stdout(formatted.join(' '));
      return null;
    });

    this.globals.define('len', (arg) => {
      if (arg === null) {
        throw new TypeError("TypeError: object of type 'NoneType' has no len()");
      }
      if (typeof arg === 'string' || Array.isArray(arg)) {
        return arg.length;
      }
      throw new TypeError(`TypeError: object of type '${typeof arg}' has no len()`);
    });

    this.globals.define('range', (start, stop, step = 1) => {
      if (stop === undefined) {
        stop = start;
        start = 0;
      }
      const result = [];
      if (step > 0) {
        for (let i = start; i < stop; i += step) {
          result.push(i);
        }
      } else if (step < 0) {
        for (let i = start; i > stop; i += step) {
          result.push(i);
        }
      }
      return result;
    });

    this.globals.define('str', (arg) => {
      if (arg === null) return 'None';
      if (arg === true) return 'True';
      if (arg === false) return 'False';
      return String(arg);
    });

    this.globals.define('int', (arg) => {
      const res = parseInt(arg, 10);
      if (isNaN(res)) {
        throw new ValueError(`ValueError: invalid literal for int() with base 10: '${arg}'`);
      }
      return res;
    });

    this.globals.define('float', (arg) => {
      const res = parseFloat(arg);
      if (isNaN(res)) {
        throw new ValueError(`ValueError: invalid literal for float(): '${arg}'`);
      }
      return res;
    });

    this.globals.define('type', (arg) => {
      if (arg === null) return '<class \'NoneType\'>';
      if (typeof arg === 'number') {
        return Number.isInteger(arg) ? '<class \'int\'>' : '<class \'float\'>';
      }
      if (typeof arg === 'string') return '<class \'str\'>';
      if (typeof arg === 'boolean') return '<class \'bool\'>';
      if (Array.isArray(arg)) return '<class \'list\'>';
      if (typeof arg === 'function') return '<class \'function\'>';
      return `<class '${typeof arg}'>`;
    });

    this.globals.define('abs', (arg) => {
      if (typeof arg !== 'number') {
        throw new TypeError(`TypeError: bad operand type for abs(): '${typeof arg}'`);
      }
      return Math.abs(arg);
    });

    this.globals.define('sum', (listVal) => {
      if (!Array.isArray(listVal)) {
        throw new TypeError("TypeError: sum() argument must be an iterable");
      }
      return listVal.reduce((acc, curr) => acc + curr, 0);
    });
  }

  interpret(programAST) {
    let lastValue = null;
    for (const stmt of programAST.body) {
      lastValue = this.evaluate(stmt);
    }
    return lastValue;
  }

  evaluate(node) {
    if (!node) return null;

    switch (node.type) {
      case 'Program':
        let lastVal = null;
        for (const stmt of node.body) {
          lastVal = this.evaluate(stmt);
        }
        return lastVal;

      case 'ExpressionStatement':
        return this.evaluate(node.expression);

      case 'AssignmentStatement': {
        const val = this.evaluate(node.right);
        this.assignToLeft(node.left, val);
        return val;
      }

      case 'AugmentedAssignmentStatement': {
        const val = this.evaluate(node.right);
        const originalVal = this.evaluate(node.left);
        let newVal;
        switch (node.operator) {
          case '+=': newVal = originalVal + val; break;
          case '-=': newVal = originalVal - val; break;
          case '*=': newVal = originalVal * val; break;
          case '/=': newVal = originalVal / val; break;
          default:
            throw new Error(`Unknown augmented operator: ${node.operator}`);
        }
        this.assignToLeft(node.left, newVal);
        return newVal;
      }

      case 'Literal':
        return node.value;

      case 'ListLiteral':
        return node.elements.map(el => this.evaluate(el));

      case 'Identifier':
        return this.currentEnv.get(node.value);

      case 'UnaryExpression': {
        const arg = this.evaluate(node.argument);
        switch (node.operator) {
          case '-':
            return -arg;
          case '+':
            return +arg;
          case 'not':
            return !arg;
          default:
            throw new Error(`Unknown unary operator: ${node.operator}`);
        }
      }

      case 'BinaryExpression': {
        const left = this.evaluate(node.left);
        const right = this.evaluate(node.right);

        switch (node.operator) {
          // Math
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
          case '**': return Math.pow(left, right);
          case '//': return Math.floor(left / right);

          // Comparisons
          case '==': return left === right;
          case '!=': return left !== right;
          case '<': return left < right;
          case '<=': return left <= right;
          case '>': return left > right;
          case '>=': return left >= right;

          default:
            throw new Error(`Unknown binary operator: ${node.operator}`);
        }
      }

      case 'LogicalExpression': {
        const left = this.evaluate(node.left);
        if (node.operator === 'or') {
          return left || this.evaluate(node.right);
        } else if (node.operator === 'and') {
          return left && this.evaluate(node.right);
        }
        throw new Error(`Unknown logical operator: ${node.operator}`);
      }

      case 'MemberExpression': {
        const obj = this.evaluate(node.object);
        if (node.computed) {
          // List or String indexing, e.g., arr[0]
          const prop = this.evaluate(node.property);
          if (Array.isArray(obj) || typeof obj === 'string') {
            let index = prop;
            if (index < 0) {
              index = obj.length + index; // Support negative indexing, Python style!
            }
            if (index < 0 || index >= obj.length) {
              throw new RangeError("IndexError: list/string index out of range");
            }
            return obj[index];
          }
          throw new TypeError(`TypeError: object of type '${typeof obj}' is not subscriptable`);
        } else {
          // Dot access to methods, e.g. list.append
          const propName = node.property.value;
          if (Array.isArray(obj)) {
            if (propName === 'append') {
              return (item) => {
                obj.push(item);
                return null;
              };
            }
            if (propName === 'pop') {
              return (idx = -1) => {
                if (obj.length === 0) {
                  throw new RangeError("IndexError: pop from empty list");
                }
                const actualIdx = idx < 0 ? obj.length + idx : idx;
                if (actualIdx < 0 || actualIdx >= obj.length) {
                  throw new RangeError("IndexError: pop index out of range");
                }
                return obj.splice(actualIdx, 1)[0];
              };
            }
          }
          throw new TypeError(`TypeError: '${typeof obj}' object has no attribute '${propName}'`);
        }
      }

      case 'CallExpression': {
        const callee = this.evaluate(node.callee);
        const args = node.arguments.map(arg => this.evaluate(arg));

        if (typeof callee !== 'function') {
          throw new TypeError(`TypeError: '${typeof callee}' object is not callable`);
        }
        return callee(...args);
      }

      case 'IfStatement': {
        const condition = this.evaluate(node.test);
        if (condition) {
          return this.executeBlock(node.consequent);
        } else if (node.alternate) {
          if (Array.isArray(node.alternate)) {
            return this.executeBlock(node.alternate);
          } else {
            return this.evaluate(node.alternate); // It's an nested 'elif' IfStatement
          }
        }
        return null;
      }

      case 'WhileStatement': {
        let lastLoopVal = null;
        while (this.evaluate(node.test)) {
          try {
            lastLoopVal = this.executeBlock(node.body);
          } catch (ex) {
            if (ex instanceof BreakException) {
              break;
            } else if (ex instanceof ContinueException) {
              continue;
            } else {
              throw ex;
            }
          }
        }
        return lastLoopVal;
      }

      case 'ForStatement': {
        const iterable = this.evaluate(node.iterable);
        if (!Array.isArray(iterable) && typeof iterable !== 'string') {
          throw new TypeError(`TypeError: '${typeof iterable}' object is not iterable`);
        }

        let lastForVal = null;
        for (const item of iterable) {
          this.currentEnv.define(node.iterator, item);
          try {
            lastForVal = this.executeBlock(node.body);
          } catch (ex) {
            if (ex instanceof BreakException) {
              break;
            } else if (ex instanceof ContinueException) {
              continue;
            } else {
              throw ex;
            }
          }
        }
        return lastForVal;
      }

      case 'BreakStatement':
        throw new BreakException();

      case 'ContinueStatement':
        throw new ContinueException();

      case 'PassStatement':
        return null;

      case 'FunctionDeclaration': {
        const name = node.name;
        const params = node.params;
        const body = node.body;
        const closure = this.currentEnv;

        const func = (...args) => {
          const funcEnv = new Environment(closure);
          for (let i = 0; i < params.length; i++) {
            funcEnv.define(params[i], args[i] !== undefined ? args[i] : null);
          }

          const previousEnv = this.currentEnv;
          this.currentEnv = funcEnv;
          try {
            this.executeBlock(body);
          } catch (ex) {
            this.currentEnv = previousEnv;
            if (ex instanceof ReturnException) {
              return ex.value;
            }
            throw ex;
          }
          this.currentEnv = previousEnv;
          return null;
        };

        this.currentEnv.define(name, func);
        return func;
      }

      case 'ReturnStatement': {
        const val = node.value ? this.evaluate(node.value) : null;
        throw new ReturnException(val);
      }

      default:
        throw new Error(`RuntimeError: unknown AST node type '${node.type}'`);
    }
  }

  assignToLeft(leftNode, value) {
    if (leftNode.type === 'Identifier') {
      this.currentEnv.assign(leftNode.value, value);
    } else if (leftNode.type === 'MemberExpression' && leftNode.computed) {
      const obj = this.evaluate(leftNode.object);
      const prop = this.evaluate(leftNode.property);
      if (Array.isArray(obj)) {
        let index = prop;
        if (index < 0) index = obj.length + index;
        if (index < 0 || index >= obj.length) {
          throw new RangeError("IndexError: list assignment index out of range");
        }
        obj[index] = value;
      } else {
        throw new TypeError(`TypeError: '${typeof obj}' object does not support item assignment`);
      }
    } else {
      throw new ReferenceError("SyntaxError: can't assign to expression");
    }
  }

  executeBlock(statements) {
    let lastValue = null;
    for (const stmt of statements) {
      lastValue = this.evaluate(stmt);
    }
    return lastValue;
  }
}

class ValueError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValueError';
  }
}
