# Klomn

```
██╗  ██╗██╗      ██████╗ ███╗   ███╗███╗   ██╗
██║ ██╔╝██║     ██╔═══██╗████╗ ████║████╗  ██║
█████╔╝ ██║     ██║   ██║██╔████╔██║██╔██╗ ██║
██╔═██╗ ██║     ██║   ██║██║╚██╔╝██║██║╚██╗██║
██║  ██╗███████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚████║ [Beta]
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝
```

An elegant, modern, lightweight, and zero-dependency **Skulpt alternative** written in ES-next JavaScript.

Unlike Skulpt which compiles Python into complex, heavy JavaScript generator code, **Klomn** parses Python into an Abstract Syntax Tree (AST) and interprets it using a direct, high-performance tree-walking interpreter. This makes it extremely fast to load, modular, and easy to run anywhere—from browser environments to command-line terminals.

---

## Features

- 🐍 **Python Subset Interpretation**: Direct execution of Python statements, loops, variables, list subscripts, and functions.
- ⚙️ **Modern Design**: Completely written in modern ES modules with zero third-party dependencies.
- 💻 **Interactive REPL & CLI**: Includes a native terminal interface with auto-indents and full multi-line block executions.
- 📊 **Rich Built-in Suite**: Standard functions such as `print`, `len`, `range`, `str`, `int`, `float`, `type`, `abs`, `sum`, and native lists support with `.append` and `.pop`.
- 📁 **Lightweight & Portable**: Fully embeddable directly into web pages or Node.js backends.

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
