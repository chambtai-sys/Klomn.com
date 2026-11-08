# Klomn (klomn.com)

```
██╗  ██╗██╗      ██████╗ ███╗   ███╗███╗   ██╗
██║ ██╔╝██║     ██╔═══██╗████╗ ████║████╗  ██║
█████╔╝ ██║     ██║   ██║██╔████╔██║██╔██╗ ██║
██╔═██╗ ██║     ██║   ██║██║╚██╔╝██║██║╚██╗██║
██║  ██╗███████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚████║ [Beta]
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝
```

**klomn.com** is an interactive **Klomn Playground on the web browser**, powered by Klomn: an elegant, modern, lightweight, and zero-dependency **Skulpt alternative** written in ES-next JavaScript.

Unlike Skulpt which compiles Python into complex, heavy JavaScript generator code, **Klomn** parses Python into an Abstract Syntax Tree (AST) and interprets it using a direct, high-performance tree-walking interpreter. This makes it extremely fast to load, modular, and easy to run anywhere—from browser environments to command-line terminals.

👉 **Live Web Playground**: [https://klomn.com](https://klomn.com)

---

## Web Playground (`klomn.com`)

The `klomn.com` repository provides a full-featured, zero-setup browser playground for writing, executing, inspecting, and experimenting with Python code directly in the web browser:

- 🎛️ **Interactive Code Playground**: Write and run Python code in real time with syntax presets (Basics, Fibonacci, Lexical Closures, List Operations, Prime Numbers, and Conditionals).
- 💬 **Live In-Browser REPL**: Interactive prompt (`>>>`) with persistent execution state, keyboard history navigation, and automatic multiline block handling.
- 🔍 **Real-Time Runtime Inspector**:
  - **Console Output**: Tabbed output for standard out (`print`), return values, runtime execution duration, and errors.
  - **Variables State**: Live table showing declared global variables, runtime values, and Python types (`int`, `float`, `str`, `bool`, `list`, `function`, `NoneType`).
  - **AST Viewer**: Interactive, formatted Abstract Syntax Tree representation generated directly from your code.
  - **Token Stream Inspector**: Detailed token table showcasing types, values, line numbers, and column offsets from the lexer.
- 🧪 **Browser Test Suite**: Run the comprehensive automated verification suite right from the browser interface.
- 📖 **Language Specs & Quick Reference**: On-page guide for supported data types, built-in functions, operators, and scoping rules.

### Running the Web Playground Locally

You can run the web playground locally with Vite:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Features

- 🌐 **Browser Playground ([Klomn.com](https://klomn.com))**: Rich web UI featuring an editor, interactive REPL, AST viewer, and variable inspector.
- 🐍 **Python Subset Interpretation**: Direct execution of Python statements, loops, variables, list subscripts, and functions.
- ⚙️ **Modern Design**: Core interpreter completely written in modern ES modules with zero third-party dependencies.
- 💻 **Interactive REPL & CLI**: Includes both a web REPL and a native terminal CLI with auto-indents and full multi-line block execution.
- 📊 **Rich Built-in Suite**: Standard functions such as `print`, `len`, `range`, `str`, `int`, `float`, `type`, `abs`, `sum`, and native list support with `.append` and `.pop`.
- 📁 **Lightweight & Portable**: Fully embeddable directly into web applications or Node.js backends.

---

## Installation

### Globally via npm (Command Line)
```bash
npm install -g .
```

---

## CLI Usage

Start the interactive Python REPL with the beautiful beta ASCII header:
```bash
klomn
```

Execute a local Python script:
```bash
klomn script.py
```

Evaluate a string statement on the spot:
```bash
klomn -c "print(sum([x * 2 for x in range(5)]))"
```

---

## Programmatic API Usage

Klomn can easily be imported into any JavaScript or Node.js environment:

```javascript
import { tokenize } from './lib/lexer.js';
import { Parser } from './lib/parser.js';
import { Interpreter } from './lib/interpreter.js';

const code = `
def greet(name):
    print("Hello, " + name + "!")
    return len(name)

x = greet("Klomn")
`;

// 1. Tokenize
const tokens = tokenize(code);

// 2. Parse to AST
const parser = new Parser(tokens);
const ast = parser.parse();

// 3. Interpret (with custom stdout piping option)
const interpreter = new Interpreter({
  stdout: (message) => console.log("[KLOMN-OUT]:", message)
});

interpreter.interpret(ast);
```

---

## Supported Python Syntax Subset

- **Data Types**: Integers, Floats, Strings, Booleans (`True`/`False`), Lists, and `None`.
- **Operators**: Math (`+`, `-`, `*`, `/`, `%`, `**`, `//`), Comparison (`==`, `!=`, `<`, `<=`, `>`, `>=`), Logical (`and`, `or`, `not`).
- **Assignment**: Plain (`=`) and Compound/Augmented (`+=`, `-=`, `*=`, `/=`).
- **Control Flow**: `if`, `elif`, `else` structures.
- **Loops**: `while` and `for` loops, fully supporting loop controls `break` and `continue`.
- **Functions**: Lexical function scoping, nested closures, parameters, recursion, and `return` statements.
- **Data Structures**: Lists support negative index lookups (e.g., `arr[-1]`), value assignments, and dynamic methods (`append`, `pop`).
- **Builtins**: `print`, `len`, `range`, `str`, `int`, `float`, `type`, `abs`, `sum`.

---

## Testing

Run the automated test suite to ensure syntax robustness and environment sanity:

```bash
npm test
```

---

## License

This project is open-source and licensed under the [MIT License](LICENSE).
