#!/usr/bin/env node

/**
 * Klomn CLI and REPL
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { tokenize } from '../lib/lexer.js';
import { Parser } from '../lib/parser.js';
import { Interpreter } from '../lib/interpreter.js';

const VERSION = "1.0.0-beta.1";

const ASCII_LOGO = `
██╗  ██╗██╗      ██████╗ ███╗   ███╗███╗   ██╗
██║ ██╔╝██║     ██╔═══██╗████╗ ████║████╗  ██║
█████╔╝ ██║     ██║   ██║██╔████╔██║██╔██╗ ██║
██╔═██╗ ██║     ██║   ██║██║╚██╔╝██║██║╚██╗██║
██║  ██╗███████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚████║ [Beta]
╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝ v${VERSION}
`;

function printHelp() {
  console.log(ASCII_LOGO);
  console.log("Usage:");
  console.log("  klomn                   Start the interactive REPL");
  console.log("  klomn <filename.py>     Execute a Python file");
  console.log("  klomn -c \"<code>\"       Execute code from string");
  console.log("  klomn -h, --help        Show this help message");
  console.log("  klomn -v, --version     Show version information");
}

function runCode(code, interpreter) {
  try {
    const tokens = tokenize(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return interpreter.interpret(ast);
  } catch (err) {
    console.error(err.message || err);
    return null;
  }
}

function startREPL() {
  console.log(ASCII_LOGO);
  console.log("Klomn Interactive Python REPL. Type 'exit()' or 'quit()' to exit.\n");

  const interpreter = new Interpreter();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '>>> '
  });

  let buffer = '';
  let inMultiline = false;
  let indentLevel = 0;

  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();

    if (trimmed === 'exit()' || trimmed === 'quit()') {
      rl.close();
      return;
    }

    // Keep track of multiline indentation
    if (!inMultiline) {
      if (trimmed.endsWith(':')) {
        inMultiline = true;
        indentLevel = 4;
        buffer = line + '\n';
        rl.setPrompt('... ' + ' '.repeat(indentLevel));
        rl.prompt();
        return;
      }

      if (line.trim() !== '') {
        runCode(line, interpreter);
      }
      rl.setPrompt('>>> ');
      rl.prompt();
    } else {
      // We are inside a multiline block (e.g. function body or loop body)
      if (line === '') {
        // Empty line to signal execution of the multiline block
        inMultiline = false;
        runCode(buffer, interpreter);
        buffer = '';
        indentLevel = 0;
        rl.setPrompt('>>> ');
        rl.prompt();
      } else {
        // Keep accumulating
        buffer += line + '\n';
        // Simple automatic indent helper
        if (trimmed.endsWith(':')) {
          indentLevel += 4;
        }
        rl.setPrompt('... ' + ' '.repeat(indentLevel));
        rl.prompt();
      }
    }
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    startREPL();
    return;
  }

  const firstArg = args[0];

  if (firstArg === '-h' || firstArg === '--help') {
    printHelp();
    return;
  }

  if (firstArg === '-v' || firstArg === '--version') {
    console.log(`Klomn version ${VERSION}`);
    return;
  }

  if (firstArg === '-c') {
    const code = args[1];
    if (!code) {
      console.error("Error: -c requires a code string argument");
      process.exit(1);
    }
    const interpreter = new Interpreter();
    runCode(code, interpreter);
    return;
  }

  // Otherwise treat as filename
  const filePath = path.resolve(firstArg);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found '${firstArg}'`);
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, 'utf8');
  const interpreter = new Interpreter();
  runCode(code, interpreter);
}

main();
