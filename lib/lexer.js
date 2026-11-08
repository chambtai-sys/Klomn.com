/**
 * Klomn Lexer / Tokenizer
 * Designed to tokenize a subset of Python including numbers, strings, keywords, operators, indentation, and structure.
 */

export const TokenType = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',
  KEYWORD: 'KEYWORD',
  OPERATOR: 'OPERATOR',
  DELIMITER: 'DELIMITER',
  NEWLINE: 'NEWLINE',
  INDENT: 'INDENT',
  DEDENT: 'DEDENT',
  EOF: 'EOF'
};

const KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'while', 'for', 'in',
  'and', 'or', 'not', 'True', 'False', 'None', 'break', 'continue',
  'pass'
]);

const OPERATORS = new Set([
  '+', '-', '*', '/', '%', '**', '//',
  '=', '==', '!=', '<', '<=', '>', '>=',
  '+=', '-=', '*=', '/='
]);

const DELIMITERS = new Set([
  '(', ')', '[', ']', '{', '}', ',', ':', '.'
]);

export class Token {
  constructor(type, value, line, col) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
  }
}

export function tokenize(source) {
  // Normalize line endings to LF and add an ending newline if not present
  let input = source.replace(/\r\n/g, '\n');
  if (!input.endsWith('\n')) {
    input += '\n';
  }

  const tokens = [];
  const lines = input.split('\n');
  const indentStack = [0];

  let lineNum = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    lineNum = i + 1;

    // Check if line is empty or just whitespace / comments
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      // We skip empty or comment-only lines, but we keep NEWLINE if there was previous statement on lines,
      // but standard Python doesn't issue NEWLINE tokens for pure blank/comment lines.
      continue;
    }

    // Calculate line indentation
    let indentCount = 0;
    for (let char of rawLine) {
      if (char === ' ') {
        indentCount++;
      } else if (char === '\t') {
        indentCount += 4; // Treat tab as 4 spaces
      } else {
        break;
      }
    }

    const currentIndent = indentStack[indentStack.length - 1];

    if (indentCount > currentIndent) {
      indentStack.push(indentCount);
      tokens.push(new Token(TokenType.INDENT, indentCount, lineNum, 0));
    } else if (indentCount < currentIndent) {
      while (indentStack.length > 0 && indentStack[indentStack.length - 1] > indentCount) {
        indentStack.pop();
        tokens.push(new Token(TokenType.DEDENT, indentStack[indentStack.length - 1], lineNum, 0));
      }
      if (indentStack[indentStack.length - 1] !== indentCount) {
        throw new Error(`IndentationError: unindent does not match any outer indentation level at line ${lineNum}`);
      }
    }

    // Tokenize the line contents
    let idx = 0;
    // Skip indentation spaces to start parsing actual content
    while (idx < rawLine.length && (rawLine[idx] === ' ' || rawLine[idx] === '\t')) {
      idx++;
    }

    while (idx < rawLine.length) {
      const char = rawLine[idx];

      // Comment
      if (char === '#') {
        break; // Ignore rest of the line
      }

      // Whitespace inside line
      if (char === ' ' || char === '\t') {
        idx++;
        continue;
      }

      // Strings (single or double quote)
      if (char === '"' || char === "'") {
        const quoteType = char;
        let strVal = '';
        const startCol = idx;
        idx++; // skip open quote
        let escaped = false;
        while (idx < rawLine.length) {
          const c = rawLine[idx];
          if (escaped) {
            if (c === 'n') strVal += '\n';
            else if (c === 't') strVal += '\t';
            else strVal += c;
            escaped = false;
          } else if (c === '\\') {
            escaped = true;
          } else if (c === quoteType) {
            break;
          } else {
            strVal += c;
          }
          idx++;
        }
        if (idx >= rawLine.length || rawLine[idx] !== quoteType) {
          throw new SyntaxError(`Unterminated string literal at line ${lineNum}, col ${startCol}`);
        }
        idx++; // skip close quote
        tokens.push(new Token(TokenType.STRING, strVal, lineNum, startCol));
        continue;
      }

      // Numbers (Integers and Floats)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(rawLine[idx + 1]))) {
        const startCol = idx;
        let numStr = '';
        let hasDot = false;
        while (idx < rawLine.length) {
          const c = rawLine[idx];
          if (/[0-9]/.test(c)) {
            numStr += c;
          } else if (c === '.' && !hasDot) {
            hasDot = true;
            numStr += c;
          } else {
            break;
          }
          idx++;
        }
        const val = hasDot ? parseFloat(numStr) : parseInt(numStr, 10);
        tokens.push(new Token(TokenType.NUMBER, val, lineNum, startCol));
        continue;
      }

      // Identifiers & Keywords
      if (/[a-zA-Z_]/.test(char)) {
        const startCol = idx;
        let idStr = '';
        while (idx < rawLine.length && /[a-zA-Z0-9_]/.test(rawLine[idx])) {
          idStr += rawLine[idx];
          idx++;
        }
        if (KEYWORDS.has(idStr)) {
          tokens.push(new Token(TokenType.KEYWORD, idStr, lineNum, startCol));
        } else {
          tokens.push(new Token(TokenType.IDENTIFIER, idStr, lineNum, startCol));
        }
        continue;
      }

      // Operators and Delimiters
      // Check for multi-char operators first
      const twoChar = rawLine.substring(idx, idx + 2);
      const threeChar = rawLine.substring(idx, idx + 3);

      if (threeChar === '//=' || threeChar === '**=') {
        tokens.push(new Token(TokenType.OPERATOR, threeChar, lineNum, idx));
        idx += 3;
        continue;
      }

      if (OPERATORS.has(twoChar)) {
        tokens.push(new Token(TokenType.OPERATOR, twoChar, lineNum, idx));
        idx += 2;
        continue;
      }

      if (OPERATORS.has(char)) {
        tokens.push(new Token(TokenType.OPERATOR, char, lineNum, idx));
        idx++;
        continue;
      }

      if (DELIMITERS.has(char)) {
        tokens.push(new Token(TokenType.DELIMITER, char, lineNum, idx));
        idx++;
        continue;
      }

      throw new SyntaxError(`Unexpected character "${char}" at line ${lineNum}, col ${idx}`);
    }

    // Add NEWLINE at the end of each non-empty, non-comment line
    tokens.push(new Token(TokenType.NEWLINE, '\n', lineNum, rawLine.length));
  }

  // Clear indentation stack at EOF
  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push(new Token(TokenType.DEDENT, indentStack[indentStack.length - 1], lineNum, 0));
  }

  tokens.push(new Token(TokenType.EOF, 'EOF', lineNum, 0));
  return tokens;
}
