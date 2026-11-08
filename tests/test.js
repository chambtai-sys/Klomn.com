import assert from 'assert';
import { tokenize } from '../lib/lexer.js';
import { Parser } from '../lib/parser.js';
import { Interpreter } from '../lib/interpreter.js';

describe('Klomn Python-Subset Interpreter Suite', () => {

  // Test Lexer
  it('should tokenize basic math and indentation', () => {
    const code = `x = 5\nif True:\n    y = 10\n`;
    const tokens = tokenize(code);
    const types = tokens.map(t => t.type);

    // Check key elements exist in sequence
    assert.ok(types.includes('IDENTIFIER'));
    assert.ok(types.includes('OPERATOR'));
    assert.ok(types.includes('NUMBER'));
    assert.ok(types.includes('INDENT'));
    assert.ok(types.includes('DEDENT'));
    assert.ok(types.includes('EOF'));
  });

  // Test Parser
  it('should parse basic variables and math', () => {
    const code = `x = 1 + 2 * 3\n`;
    const tokens = tokenize(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();

    assert.strictEqual(ast.type, 'Program');
    assert.strictEqual(ast.body.length, 1);
    assert.strictEqual(ast.body[0].type, 'AssignmentStatement');
    assert.strictEqual(ast.body[0].left.value, 'x');
  });

  // Test Interpreter Basics & Variables
  it('should evaluate arithmetic and store variables', () => {
    const code = `
x = 10
y = 20
z = x + y * 2
`;
    const interpreter = new Interpreter();
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    assert.strictEqual(interpreter.globals.get('x'), 10);
    assert.strictEqual(interpreter.globals.get('y'), 20);
    assert.strictEqual(interpreter.globals.get('z'), 50);
  });

  // Test Lists and Methods
  it('should support lists, negative indices, and methods (.append/.pop)', () => {
    const code = `
items = [1, 2, 3]
items.append(4)
last = items[-1]
first = items[0]
removed = items.pop(1)
length = len(items)
`;
    const interpreter = new Interpreter();
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    assert.deepStrictEqual(interpreter.globals.get('items'), [1, 3, 4]);
    assert.strictEqual(interpreter.globals.get('last'), 4);
    assert.strictEqual(interpreter.globals.get('first'), 1);
    assert.strictEqual(interpreter.globals.get('removed'), 2);
    assert.strictEqual(interpreter.globals.get('length'), 3);
  });

  // Test Builtins (len, range, str, int, float, type, abs, sum)
  it('should support core Python builtins', () => {
    const code = `
s = len("hello")
r = range(1, 5)
string_val = str(42) + " lives"
int_val = int("123")
float_val = float("3.14")
type_str = type("hello")
abs_val = abs(-100)
sum_val = sum([1, 2, 3, 4])
`;
    const interpreter = new Interpreter();
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    assert.strictEqual(interpreter.globals.get('s'), 5);
    assert.deepStrictEqual(interpreter.globals.get('r'), [1, 2, 3, 4]);
    assert.strictEqual(interpreter.globals.get('string_val'), '42 lives');
    assert.strictEqual(interpreter.globals.get('int_val'), 123);
    assert.strictEqual(interpreter.globals.get('float_val'), 3.14);
    assert.strictEqual(interpreter.globals.get('type_str'), "<class 'str'>");
    assert.strictEqual(interpreter.globals.get('abs_val'), 100);
    assert.strictEqual(interpreter.globals.get('sum_val'), 10);
  });

  // Test Functions and Scoping
  it('should support functions, parameters, return, and lexical closure scopes', () => {
    const code = `
def make_adder(x):
    def adder(y):
        return x + y
    return adder

add5 = make_adder(5)
result = add5(10)
`;
    const interpreter = new Interpreter();
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    const result = interpreter.globals.get('result');
    assert.strictEqual(result, 15);
  });

  // Test Loop Control Flow (While, For, Break, Continue)
  it('should handle loops with break and continue control flows', () => {
    const code = `
total = 0
for i in range(10):
    if i == 5:
        break
    if i % 2 == 1:
        continue
    total += i
`;
    const interpreter = new Interpreter();
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    assert.strictEqual(interpreter.globals.get('total'), 6); // 0 + 2 + 4 = 6
  });

  // Test Nested Conditionals (if-elif-else)
  it('should support complex conditional branch flows', () => {
    const code = `
def check(val):
    if val < 0:
        return "negative"
    elif val == 0:
        return "zero"
    elif val < 10:
        return "single digit"
    else:
        return "large"

res1 = check(-5)
res2 = check(0)
res3 = check(7)
res4 = check(20)
`;
    const interpreter = new Interpreter();
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    assert.strictEqual(interpreter.globals.get('res1'), 'negative');
    assert.strictEqual(interpreter.globals.get('res2'), 'zero');
    assert.strictEqual(interpreter.globals.get('res3'), 'single digit');
    assert.strictEqual(interpreter.globals.get('res4'), 'large');
  });

  // Test prints capturing
  it('should capture stdout logs via print', () => {
    const outputs = [];
    const interpreter = new Interpreter({
      stdout: (msg) => outputs.push(msg)
    });
    const code = `print("hello", "world")\n`;
    const tokens = tokenize(code);
    const ast = new Parser(tokens).parse();
    interpreter.interpret(ast);

    assert.deepStrictEqual(outputs, ['hello world']);
  });
});

// Minimal runner to execute tests if run directly
function run() {
  const tests = [];
  const describe = (name, fn) => {
    fn();
  };
  const it = (name, fn) => {
    tests.push({ name, fn });
  };

  globalThis.describe = describe;
  globalThis.it = it;
}

run();
