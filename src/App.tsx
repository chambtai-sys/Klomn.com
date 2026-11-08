import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Terminal,
  Code2,
  Boxes,
  Cpu,
  BookOpen,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  Database,
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';
import { tokenize } from '../lib/lexer.js';
import { Parser } from '../lib/parser.js';
import { Interpreter } from '../lib/interpreter.js';

interface OutputMessage {
  type: 'stdout' | 'return' | 'error' | 'info' | 'system';
  text: string;
  timestamp: string;
}

interface ReplEntry {
  type: 'input' | 'multiline' | 'stdout' | 'return' | 'error';
  text: string;
}

const PRESETS: Record<string, { title: string; category: string; code: string; desc: string }> = {
  hello: {
    title: 'Hello & Strings',
    category: 'Basics',
    desc: 'Basic printing, string concatenation, and lengths',
    code: `# Welcome to Klomn!
# An elegant, lightweight Python interpreter in pure JavaScript.

greeting = "Hello"
target = "World"
full_message = greeting + ", " + target + "!"

print(full_message)
print("Length of message:", len(full_message))
print("Type of message:", type(full_message))
`
  },
  fibonacci: {
    title: 'Fibonacci Sequence',
    category: 'Algorithms',
    desc: 'Recursive function and iterative calculation',
    code: `# Recursive Fibonacci function
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print("--- First 10 Fibonacci Numbers ---")
results = []
for i in range(10):
    val = fib(i)
    results.append(val)
    print("fib(" + str(i) + ") =", val)

print("Calculated array:", results)
print("Sum of series:", sum(results))
`
  },
  closures: {
    title: 'Closures & Scopes',
    category: 'Functions',
    desc: 'Lexical closures and higher-order factory functions',
    code: `# Klomn supports lexical closures and nested scopes
def make_multiplier(factor):
    def multiplier(number):
        return number * factor
    return multiplier

double = make_multiplier(2)
triple = make_multiplier(3)
times_ten = make_multiplier(10)

print("Double 7:", double(7))
print("Triple 7:", triple(7))
print("Times ten 7:", times_ten(7))

# Higher-order composition
nums = [1, 2, 3, 4, 5]
doubled_nums = []
for n in nums:
    doubled_nums.append(double(n))

print("Original:", nums)
print("Doubled:", doubled_nums)
`
  },
  lists: {
    title: 'List Manipulation',
    category: 'Data Structures',
    desc: 'Subscripts, negative indexing, .append and .pop',
    code: `# Dynamic list operations in Klomn
stack = []
print("Initial stack:", stack)

# Push elements
for i in range(1, 6):
    stack.append(i * 10)
    print("Appended:", i * 10, "-> Stack now:", stack)

print("Last element (negative index):", stack[-1])
print("First element:", stack[0])
print("Stack length:", len(stack))

# Pop elements
popped = stack.pop(-1)
print("Popped last element:", popped)
print("Popped index 1:", stack.pop(1))
print("Remaining stack:", stack)
print("Sum of items:", sum(stack))
`
  },
  primes: {
    title: 'Prime Numbers',
    category: 'Algorithms',
    desc: 'Nested loops, break statement, and conditional checks',
    code: `# Find all prime numbers up to 30
def is_prime(n):
    if n < 2:
        return False
    if n == 2:
        return True
    for divisor in range(2, n):
        if n % divisor == 0:
            return False
    return True

primes = []
for candidate in range(2, 31):
    if is_prime(candidate):
        primes.append(candidate)

print("Primes up to 30:", primes)
print("Total found:", len(primes))
print("Sum of primes:", sum(primes))
`
  },
  conditionals: {
    title: 'Grade Classifier',
    category: 'Control Flow',
    desc: 'if-elif-else branching and augmented assignments',
    code: `# Conditional branching and calculations
def grade_score(score):
    if score >= 90:
        return "A (Excellent)"
    elif score >= 80:
        return "B (Good)"
    elif score >= 70:
        return "C (Satisfactory)"
    elif score >= 60:
        return "D (Pass)"
    else:
        return "F (Needs improvement)"

scores = [95, 82, 74, 61, 45]
for s in scores:
    print("Score " + str(s) + ": " + grade_score(s))
`
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'repl' | 'tests' | 'docs'>('editor');
  const [inspectorTab, setInspectorTab] = useState<'output' | 'vars' | 'ast' | 'tokens'>('output');
  const [code, setCode] = useState<string>(PRESETS.hello.code);
  const [selectedPreset, setSelectedPreset] = useState<string>('hello');
  
  // Execution state
  const [outputs, setOutputs] = useState<OutputMessage[]>([]);
  const [astTree, setAstTree] = useState<any>(null);
  const [tokensList, setTokensList] = useState<any[]>([]);
  const [globalsState, setGlobalsState] = useState<Array<{ name: string; type: string; value: string }>>([]);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // REPL State
  const [replHistory, setReplHistory] = useState<ReplEntry[]>([
    { type: 'stdout', text: 'Klomn Python 1.0.0-beta.1 (Interactive Web REPL)' },
    { type: 'stdout', text: 'Type Python expressions or statements. Multiline blocks auto-detect.' }
  ]);
  const [replInput, setReplInput] = useState<string>('');
  const [replBuffer, setReplBuffer] = useState<string>('');
  const [isMultiline, setIsMultiline] = useState<boolean>(false);
  const [replIndent, setReplIndent] = useState<number>(0);
  const [historyList, setHistoryList] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const replInterpreterRef = useRef<Interpreter | null>(null);
  const replTerminalEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tests state
  const [testResults, setTestResults] = useState<Array<{ name: string; status: 'pending' | 'passed' | 'failed'; error?: string }>>([]);
  const [testsRunning, setTestsRunning] = useState<boolean>(false);

  // Initialize REPL Interpreter
  useEffect(() => {
    replInterpreterRef.current = new Interpreter({
      stdout: (msg: string) => {
        setReplHistory(prev => [...prev, { type: 'stdout', text: String(msg) }]);
      }
    });
  }, []);

  // Auto-scroll REPL terminal
  useEffect(() => {
    if (activeTab === 'repl') {
      replTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replHistory, activeTab]);

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    setCode(PRESETS[key].code);
  };

  const runCode = () => {
    setIsRunning(true);
    const start = performance.now();
    const newOutputs: OutputMessage[] = [];
    const now = new Date().toLocaleTimeString();

    try {
      // 1. Tokenize
      const tokens = tokenize(code);
      setTokensList(tokens);

      // 2. Parse to AST
      const parser = new Parser(tokens);
      const ast = parser.parse();
      setAstTree(ast);

      // 3. Interpret
      const capturedGlobals: Array<{ name: string; type: string; value: string }> = [];
      const interpreter = new Interpreter({
        stdout: (msg: string) => {
          newOutputs.push({
            type: 'stdout',
            text: String(msg),
            timestamp: new Date().toLocaleTimeString()
          });
        }
      });

      const result = interpreter.interpret(ast);
      const elapsed = Math.round((performance.now() - start) * 100) / 100;
      setExecTime(elapsed);

      // Inspect global environment
      if (interpreter.globals && interpreter.globals.vars) {
        for (const [key, val] of interpreter.globals.vars.entries()) {
          let typeStr: string = typeof val;
          let valStr = String(val);

          if (val === null) {
            typeStr = 'NoneType';
            valStr = 'None';
          } else if (typeof val === 'boolean') {
            typeStr = 'bool';
            valStr = val ? 'True' : 'False';
          } else if (Array.isArray(val)) {
            typeStr = 'list';
            valStr = '[' + val.map(x => (typeof x === 'string' ? `'${x}'` : String(x))).join(', ') + ']';
          } else if (typeof val === 'function') {
            typeStr = 'function';
            valStr = `<function ${key}>`;
          } else if (typeof val === 'number') {
            typeStr = Number.isInteger(val) ? 'int' : 'float';
          }

          capturedGlobals.push({ name: key, type: typeStr, value: valStr });
        }
      }
      setGlobalsState(capturedGlobals);

      if (result !== null && result !== undefined) {
        let returnDisplay = String(result);
        if (typeof result === 'boolean') returnDisplay = result ? 'True' : 'False';
        else if (Array.isArray(result)) returnDisplay = JSON.stringify(result);

        newOutputs.push({
          type: 'return',
          text: `Program returned: ${returnDisplay}`,
          timestamp: now
        });
      }

      setOutputs(newOutputs);
      setInspectorTab('output');
    } catch (err: any) {
      const elapsed = Math.round((performance.now() - start) * 100) / 100;
      setExecTime(elapsed);
      newOutputs.push({
        type: 'error',
        text: err.message || String(err),
        timestamp: now
      });
      setOutputs(newOutputs);
      setInspectorTab('output');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReplSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replInput && !isMultiline) return;

    const line = replInput;
    setReplInput('');

    // Push to history
    if (line.trim()) {
      setHistoryList(prev => [...prev, line]);
      setHistoryIndex(-1);
    }

    const trimmed = line.trim();

    if (trimmed === 'exit()' || trimmed === 'quit()') {
      setReplHistory(prev => [
        ...prev,
        { type: 'input', text: line },
        { type: 'stdout', text: 'REPL session ended. Resetting interpreter...' }
      ]);
      replInterpreterRef.current = new Interpreter({
        stdout: (msg: string) => {
          setReplHistory(p => [...p, { type: 'stdout', text: String(msg) }]);
        }
      });
      setIsMultiline(false);
      setReplBuffer('');
      setReplIndent(0);
      return;
    }

    if (!isMultiline) {
      if (trimmed.endsWith(':')) {
        setIsMultiline(true);
        setReplIndent(4);
        setReplBuffer(line + '\n');
        setReplHistory(prev => [...prev, { type: 'input', text: line }]);
        return;
      }

      if (trimmed !== '') {
        setReplHistory(prev => [...prev, { type: 'input', text: line }]);
        executeReplCode(line);
      }
    } else {
      // Inside multiline block
      if (line === '') {
        // Execute block
        setIsMultiline(false);
        const fullBlock = replBuffer;
        setReplBuffer('');
        setReplIndent(0);
        setReplHistory(prev => [...prev, { type: 'multiline', text: '(executing block)' }]);
        executeReplCode(fullBlock);
      } else {
        const nextBuffer = replBuffer + line + '\n';
        setReplBuffer(nextBuffer);
        let nextIndent = replIndent;
        if (trimmed.endsWith(':')) {
          nextIndent += 4;
          setReplIndent(nextIndent);
        }
        setReplHistory(prev => [...prev, { type: 'multiline', text: line }]);
      }
    }
  };

  const executeReplCode = (codeStr: string) => {
    if (!replInterpreterRef.current) return;
    try {
      const tokens = tokenize(codeStr);
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const result = replInterpreterRef.current.interpret(ast);

      if (result !== null && result !== undefined) {
        let display = String(result);
        if (typeof result === 'boolean') display = result ? 'True' : 'False';
        else if (Array.isArray(result)) display = '[' + result.join(', ') + ']';
        setReplHistory(prev => [...prev, { type: 'return', text: display }]);
      }
    } catch (err: any) {
      setReplHistory(prev => [...prev, { type: 'error', text: err.message || String(err) }]);
    }
  };

  const handleReplKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyList.length > 0) {
        const nextIndex = historyIndex === -1 ? historyList.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setReplInput(historyList[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyList.length > 0 && historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < historyList.length) {
          setHistoryIndex(nextIndex);
          setReplInput(historyList[nextIndex]);
        } else {
          setHistoryIndex(-1);
          setReplInput('');
        }
      }
    }
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter to run code
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + '    ' + val.substring(end);
      setCode(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runAllTests = async () => {
    setTestsRunning(true);
    const suites = [
      {
        name: 'Lexer: Math and indentation tokenization',
        fn: () => {
          const codeStr = `x = 5\nif True:\n    y = 10\n`;
          const tokens = tokenize(codeStr);
          const types = tokens.map((t: any) => t.type);
          if (!types.includes('IDENTIFIER') || !types.includes('INDENT') || !types.includes('EOF')) {
            throw new Error('Missing expected token types');
          }
        }
      },
      {
        name: 'Parser: Variables, expressions, and precedence',
        fn: () => {
          const codeStr = `x = 1 + 2 * 3\n`;
          const ast = new Parser(tokenize(codeStr)).parse();
          if (ast.type !== 'Program' || ast.body.length !== 1 || ast.body[0].left.value !== 'x') {
            throw new Error('AST structure mismatch');
          }
        }
      },
      {
        name: 'Interpreter: Variables & Arithmetic evaluation',
        fn: () => {
          const codeStr = `x = 10\ny = 20\nz = x + y * 2\n`;
          const interp = new Interpreter();
          interp.interpret(new Parser(tokenize(codeStr)).parse());
          if (interp.globals.get('x') !== 10 || interp.globals.get('z') !== 50) {
            throw new Error('Variables did not evaluate correctly');
          }
        }
      },
      {
        name: 'Lists: Slicing, negative indices, .append and .pop',
        fn: () => {
          const codeStr = `
items = [1, 2, 3]
items.append(4)
last = items[-1]
first = items[0]
removed = items.pop(1)
length = len(items)
`;
          const interp = new Interpreter();
          interp.interpret(new Parser(tokenize(codeStr)).parse());
          if (interp.globals.get('last') !== 4 || interp.globals.get('removed') !== 2 || interp.globals.get('length') !== 3) {
            throw new Error('List operations failed');
          }
        }
      },
      {
        name: 'Builtins: len, range, str, int, float, type, abs, sum',
        fn: () => {
          const codeStr = `
s = len("hello")
r = range(1, 5)
string_val = str(42) + " lives"
int_val = int("123")
float_val = float("3.14")
type_str = type("hello")
abs_val = abs(-100)
sum_val = sum([1, 2, 3, 4])
`;
          const interp = new Interpreter();
          interp.interpret(new Parser(tokenize(codeStr)).parse());
          if (interp.globals.get('s') !== 5 || interp.globals.get('sum_val') !== 10 || interp.globals.get('int_val') !== 123) {
            throw new Error('Builtins verification failed');
          }
        }
      },
      {
        name: 'Functions: Scoping, closures, return, and parameters',
        fn: () => {
          const codeStr = `
def make_adder(x):
    def adder(y):
        return x + y
    return adder

add5 = make_adder(5)
result = add5(10)
`;
          const interp = new Interpreter();
          interp.interpret(new Parser(tokenize(codeStr)).parse());
          if (interp.globals.get('result') !== 15) {
            throw new Error('Closure calculation failed');
          }
        }
      },
      {
        name: 'Loops: While, For, Break, and Continue control flow',
        fn: () => {
          const codeStr = `
total = 0
for i in range(10):
    if i == 5:
        break
    if i % 2 == 1:
        continue
    total += i
`;
          const interp = new Interpreter();
          interp.interpret(new Parser(tokenize(codeStr)).parse());
          if (interp.globals.get('total') !== 6) {
            throw new Error(`Expected total 6, got ${interp.globals.get('total')}`);
          }
        }
      },
      {
        name: 'Conditionals: if-elif-else branching',
        fn: () => {
          const codeStr = `
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
          const interp = new Interpreter();
          interp.interpret(new Parser(tokenize(codeStr)).parse());
          if (
            interp.globals.get('res1') !== 'negative' ||
            interp.globals.get('res2') !== 'zero' ||
            interp.globals.get('res3') !== 'single digit' ||
            interp.globals.get('res4') !== 'large'
          ) {
            throw new Error('Conditionals branch assertion failed');
          }
        }
      },
      {
        name: 'Stdout: Print capturing and formatting',
        fn: () => {
          const logs: string[] = [];
          const interp = new Interpreter({ stdout: (msg: string) => logs.push(msg) });
          interp.interpret(new Parser(tokenize(`print("hello", "world")\n`)).parse());
          if (logs.length !== 1 || logs[0] !== 'hello world') {
            throw new Error('Print capture failed');
          }
        }
      }
    ];

    const results: Array<{ name: string; status: 'passed' | 'failed'; error?: string }> = [];
    for (const suite of suites) {
      try {
        suite.fn();
        results.push({ name: suite.name, status: 'passed' });
      } catch (err: any) {
        results.push({ name: suite.name, status: 'failed', error: err.message || String(err) });
      }
    }
    setTestResults(results);
    setTestsRunning(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-md shadow-emerald-500/20 text-white font-mono font-bold text-lg">
            🐍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white font-mono text-base">KLOMN</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                v1.0.0-beta.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Zero-dependency Python interpreter in JavaScript</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'editor'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Playground</span>
          </button>
          <button
            onClick={() => setActiveTab('repl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'repl'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live REPL</span>
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'tests'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Test Suite</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'docs'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Specs & Guide</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'editor' && (
            <>
              <button
                onClick={runCode}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm shadow-emerald-500/20 active:scale-95 cursor-pointer"
                title="Execute code (Ctrl+Enter / Cmd+Enter)"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                <span className="hidden md:inline text-[10px] bg-slate-900/20 px-1 py-0.2 rounded font-mono">⌘↵</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Code Editor Panel */}
            <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900/40 min-w-0">
              {/* Editor Bar */}
              <div className="h-10 px-3 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Examples:
                  </span>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 outline-none focus:border-emerald-500"
                  >
                    {Object.entries(PRESETS).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.title} ({item.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800"
                    title="Copy code"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setCode('')}
                    className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1"
                    title="Clear editor"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="text-[11px]">Clear</span>
                  </button>
                </div>
              </div>

              {/* Code TextArea */}
              <div className="flex-1 relative flex overflow-hidden bg-slate-950 font-mono text-xs">
                {/* Line Numbers Column */}
                <div className="w-10 py-3 pr-2 text-right select-none bg-slate-900/30 text-slate-600 border-r border-slate-800/60 font-mono">
                  {code.split('\n').map((_, i) => (
                    <div key={i} className="leading-5 h-5">{i + 1}</div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="# Write your Python code here..."
                  spellCheck={false}
                  className="flex-1 p-3 outline-none resize-none bg-transparent text-emerald-200/90 font-mono text-xs leading-5 whitespace-pre overflow-auto focus:ring-0"
                />
              </div>

              {/* Editor Footer / Info Bar */}
              <div className="h-7 border-t border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-3">
                  <span>Python 3 Subset</span>
                  <span>•</span>
                  <span>{code.split('\n').length} lines</span>
                  <span>•</span>
                  <span>{code.length} chars</span>
                </div>
                {execTime !== null && (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Clock className="w-3 h-3" />
                    <span>Exec: {execTime}ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Runtime Inspector & Output Panel */}
            <div className="w-full md:w-[480px] lg:w-[540px] flex flex-col bg-slate-900/20 shrink-0">
              {/* Inspector Tab Bar */}
              <div className="h-10 px-2 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInspectorTab('output')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      inspectorTab === 'output'
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Console Output</span>
                    {outputs.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                        {outputs.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectorTab('vars')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      inspectorTab === 'vars'
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Variables</span>
                    {globalsState.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300 font-mono">
                        {globalsState.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setInspectorTab('ast')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      inspectorTab === 'ast'
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>AST Tree</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('tokens')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      inspectorTab === 'tokens'
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700/80 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Tokens</span>
                  </button>
                </div>

                {inspectorTab === 'output' && (
                  <button
                    onClick={() => setOutputs([])}
                    className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800"
                  >
                    Clear Output
                  </button>
                )}
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-auto p-3 font-mono text-xs bg-slate-950">
                {/* Console Output Tab */}
                {inspectorTab === 'output' && (
                  <div className="space-y-1.5 min-h-full">
                    {outputs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 text-center">
                        <Terminal className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
                        <p className="font-sans text-sm font-medium text-slate-400">Ready to run</p>
                        <p className="font-sans text-xs text-slate-600 mt-1">
                          Press <span className="text-emerald-400 font-mono">Run Code</span> or <span className="text-emerald-400 font-mono">⌘ + Enter</span> to execute
                        </p>
                      </div>
                    ) : (
                      outputs.map((out, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded border font-mono whitespace-pre-wrap break-all ${
                            out.type === 'stdout'
                              ? 'bg-slate-900/60 border-slate-800 text-slate-100'
                              : out.type === 'return'
                              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                              : out.type === 'error'
                              ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span className="uppercase font-semibold tracking-wider">{out.type}</span>
                            <span>{out.timestamp}</span>
                          </div>
                          <div>{out.text}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Variables State Tab */}
                {inspectorTab === 'vars' && (
                  <div>
                    {globalsState.length === 0 ? (
                      <div className="text-slate-500 text-center py-12 font-sans">
                        Run code to inspect assigned variables and their Python runtime types.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                            <tr>
                              <th className="p-2">Name</th>
                              <th className="p-2">Type</th>
                              <th className="p-2">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {globalsState.map((v, i) => (
                              <tr key={i} className="hover:bg-slate-900/40">
                                <td className="p-2 text-cyan-300 font-bold">{v.name}</td>
                                <td className="p-2 text-emerald-400">{v.type}</td>
                                <td className="p-2 text-slate-300 break-all">{v.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* AST Tree Tab */}
                {inspectorTab === 'ast' && (
                  <div>
                    {astTree ? (
                      <pre className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-emerald-300 overflow-auto max-h-[550px] leading-relaxed">
                        {JSON.stringify(astTree, null, 2)}
                      </pre>
                    ) : (
                      <div className="text-slate-500 text-center py-12 font-sans">
                        Run code to generate and inspect the parsed Abstract Syntax Tree (AST).
                      </div>
                    )}
                  </div>
                )}

                {/* Tokens Tab */}
                {inspectorTab === 'tokens' && (
                  <div>
                    {tokensList.length === 0 ? (
                      <div className="text-slate-500 text-center py-12 font-sans">
                        Run code to view the token stream generated by the Lexer.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px]">
                            <tr>
                              <th className="p-2">Type</th>
                              <th className="p-2">Value</th>
                              <th className="p-2">Line</th>
                              <th className="p-2">Col</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {tokensList.map((tok, i) => (
                              <tr key={i} className="hover:bg-slate-900/40">
                                <td className="p-2 text-purple-300">{tok.type}</td>
                                <td className="p-2 text-amber-300 break-all">
                                  {tok.value === undefined ? '-' : JSON.stringify(tok.value)}
                                </td>
                                <td className="p-2 text-slate-400">{tok.line}</td>
                                <td className="p-2 text-slate-400">{tok.col}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REPL Tab */}
        {activeTab === 'repl' && (
          <div className="flex-1 flex flex-col bg-slate-950 font-mono text-xs">
            {/* REPL Header */}
            <div className="h-10 px-4 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">Interactive Klomn Python REPL</span>
                <span className="text-[11px] text-slate-500 font-sans">(State persists across lines)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setReplHistory([
                      { type: 'stdout', text: 'Klomn Python REPL cleared.' }
                    ]);
                  }}
                  className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 text-xs"
                >
                  Clear Screen
                </button>
                <button
                  onClick={() => {
                    replInterpreterRef.current = new Interpreter({
                      stdout: (msg: string) => {
                        setReplHistory(p => [...p, { type: 'stdout', text: String(msg) }]);
                      }
                    });
                    setReplHistory([
                      { type: 'stdout', text: 'Klomn Python interpreter state reset.' }
                    ]);
                  }}
                  className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 text-xs"
                >
                  Reset State
                </button>
              </div>
            </div>

            {/* REPL Terminal Output */}
            <div className="flex-1 p-4 overflow-auto space-y-1">
              {/* ASCII Banner */}
              <div className="text-emerald-500 select-none pb-2 leading-tight">
{`██╗  ██╗██╗      ██████╗ ███╗   ███╗███╗   ██╗
██║ ██╔╝██║     ██╔═══██╗████╗ ████║████╗  ██║
█████╔╝ ██║     ██║   ██║██╔████╔██║██╔██╗ ██║
██╔═██╗ ██║     ██║   ██║██║╚██╔╝██║██║╚██╗██║
██║  ██╗███████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚████║ [Beta]
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝`}
              </div>

              {replHistory.map((entry, i) => (
                <div key={i} className="leading-5">
                  {entry.type === 'input' && (
                    <div className="text-slate-200 flex">
                      <span className="text-emerald-400 mr-2 font-bold select-none">&gt;&gt;&gt;</span>
                      <span>{entry.text}</span>
                    </div>
                  )}
                  {entry.type === 'multiline' && (
                    <div className="text-slate-300 flex">
                      <span className="text-cyan-400 mr-2 font-bold select-none">...</span>
                      <span>{entry.text}</span>
                    </div>
                  )}
                  {entry.type === 'stdout' && (
                    <div className="text-slate-300">{entry.text}</div>
                  )}
                  {entry.type === 'return' && (
                    <div className="text-emerald-300 font-semibold">{entry.text}</div>
                  )}
                  {entry.type === 'error' && (
                    <div className="text-rose-400">{entry.text}</div>
                  )}
                </div>
              ))}
              <div ref={replTerminalEndRef} />
            </div>

            {/* REPL Prompt Input Form */}
            <form onSubmit={handleReplSubmit} className="border-t border-slate-800 bg-slate-900/90 p-3 flex items-center gap-2">
              <span className="text-emerald-400 font-bold select-none text-sm">
                {isMultiline ? '...' + ' '.repeat(replIndent) : '>>>'}
              </span>
              <input
                type="text"
                autoFocus
                value={replInput}
                onChange={(e) => setReplInput(e.target.value)}
                onKeyDown={handleReplKeyDown}
                placeholder={isMultiline ? 'Continue block or press Enter on empty line to execute' : 'Type Python statement, e.g. x = [1, 2, 3]; print(sum(x))'}
                className="flex-1 bg-transparent text-emerald-200 outline-none text-xs font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="flex-1 p-6 overflow-auto bg-slate-950 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Klomn Automated Verification Suite
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Execute the test suite in-browser to verify tokenizer, parser AST, closures, and runtime behavior.
                  </p>
                </div>
                <button
                  onClick={runAllTests}
                  disabled={testsRunning}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{testsRunning ? 'Running Tests...' : 'Execute Test Suite'}</span>
                </button>
              </div>

              {testResults.length === 0 ? (
                <div className="p-8 border border-slate-800 rounded-xl bg-slate-900/40 text-center">
                  <Cpu className="w-10 h-10 mx-auto text-emerald-500 mb-3" />
                  <h3 className="font-semibold text-white">9 Comprehensive Unit Test Suites</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Click "Execute Test Suite" to run the exact specifications covering tokenization, list methods, loop controls, nested closures, and builtins.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs px-2 text-slate-400 font-mono">
                    <span>
                      Results: {testResults.filter(t => t.status === 'passed').length} / {testResults.length} passed
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {testResults.every(t => t.status === 'passed') ? 'All Tests Passing 100%' : 'Some tests failed'}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {testResults.map((test, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border flex items-start justify-between font-mono text-xs ${
                          test.status === 'passed'
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                            : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {test.status === 'passed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span>{test.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          test.status === 'passed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {test.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documentation Tab */}
        {activeTab === 'docs' && (
          <div className="flex-1 p-6 overflow-auto bg-slate-950 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  Klomn Language & Architecture Specification
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Klomn is an ES-next AST tree-walking interpreter for a core Python subset, designed with zero runtime dependencies.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-xs">
                {/* Card 1 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4" /> Data Types
                  </h3>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    <li><strong className="text-white">int & float:</strong> Numbers (e.g. 42, 3.14, -10)</li>
                    <li><strong className="text-white">str:</strong> Double and single quoted strings</li>
                    <li><strong className="text-white">bool:</strong> <code className="text-cyan-300">True</code> and <code className="text-cyan-300">False</code></li>
                    <li><strong className="text-white">None:</strong> Python's null equivalent</li>
                    <li><strong className="text-white">list:</strong> Dynamic arrays with negative indexing</li>
                  </ul>
                </div>

                {/* Card 2 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4" /> Built-in Functions
                  </h3>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    <li><code className="text-cyan-300">print(*args)</code>: Output to stdout</li>
                    <li><code className="text-cyan-300">len(seq)</code>: Length of strings and lists</li>
                    <li><code className="text-cyan-300">range(start, stop, step)</code>: Generates list range</li>
                    <li><code className="text-cyan-300">str(), int(), float(), type()</code>: Casts & introspection</li>
                    <li><code className="text-cyan-300">abs(num), sum(iterable)</code>: Math helpers</li>
                  </ul>
                </div>

                {/* Card 3 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4" /> Operators & Math
                  </h3>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    <li>Arithmetic: <code className="text-cyan-300">+ - * / % ** //</code></li>
                    <li>Comparison: <code className="text-cyan-300">== != &lt; &lt;= &gt; &gt;=</code></li>
                    <li>Logical: <code className="text-cyan-300">and or not</code></li>
                    <li>Augmented: <code className="text-cyan-300">+= -= *= /=</code></li>
                  </ul>
                </div>

                {/* Card 4 */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <h3 className="font-semibold text-emerald-400 text-sm flex items-center gap-1.5">
                    <ChevronRight className="w-4 h-4" /> Functions & Scoping
                  </h3>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    <li>Full lexical closures (nested scopes)</li>
                    <li>First-class functions (can pass and return functions)</li>
                    <li>Recursive execution support</li>
                    <li>Explicit <code className="text-cyan-300">return</code> statements</li>
                  </ul>
                </div>
              </div>

              {/* CLI documentation */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs space-y-2">
                <h4 className="text-white font-bold font-sans">Command Line Interface (CLI) Usage</h4>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1 text-slate-300">
                  <p><span className="text-emerald-400">klomn</span> : Start interactive terminal REPL</p>
                  <p><span className="text-emerald-400">klomn script.py</span> : Execute a python file</p>
                  <p><span className="text-emerald-400">klomn -c "print(sum(range(5)))"</span> : Execute code one-liner</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
