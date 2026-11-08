/**
 * Klomn Parser
 * Parses tokens from the Lexer into an Abstract Syntax Tree (AST).
 */

import { TokenType } from './lexer.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.current = 0;
  }

  peek() {
    return this.tokens[this.current];
  }

  previous() {
    return this.tokens[this.current - 1];
  }

  isAtEnd() {
    return this.peek().type === TokenType.EOF;
  }

  advance() {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  check(type, value = null) {
    if (this.isAtEnd()) return false;
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    return true;
  }

  match(type, value = null) {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  consume(type, message, value = null) {
    if (this.check(type, value)) return this.advance();
    const token = this.peek();
    throw new SyntaxError(`${message} at line ${token.line}, col ${token.col} (got ${token.type} '${token.value}')`);
  }

  // Parses a sequence of statements
  parse() {
    const statements = [];
    while (!this.isAtEnd()) {
      // Ignore blank/newline tokens at global/block levels
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }
      statements.push(this.statement());
    }
    return { type: 'Program', body: statements };
  }

  statement() {
    if (this.match(TokenType.KEYWORD, 'def')) {
      return this.functionDeclaration();
    }
    if (this.match(TokenType.KEYWORD, 'return')) {
      return this.returnStatement();
    }
    if (this.match(TokenType.KEYWORD, 'if')) {
      return this.ifStatement();
    }
    if (this.match(TokenType.KEYWORD, 'while')) {
      return this.whileStatement();
    }
    if (this.match(TokenType.KEYWORD, 'for')) {
      return this.forStatement();
    }
    if (this.match(TokenType.KEYWORD, 'break')) {
      const stmt = { type: 'BreakStatement' };
      this.consume(TokenType.NEWLINE, "Expected newline after 'break'");
      return stmt;
    }
    if (this.match(TokenType.KEYWORD, 'continue')) {
      const stmt = { type: 'ContinueStatement' };
      this.consume(TokenType.NEWLINE, "Expected newline after 'continue'");
      return stmt;
    }
    if (this.match(TokenType.KEYWORD, 'pass')) {
      const stmt = { type: 'PassStatement' };
      this.consume(TokenType.NEWLINE, "Expected newline after 'pass'");
      return stmt;
    }

    return this.expressionStatement();
  }

  functionDeclaration() {
    const name = this.consume(TokenType.IDENTIFIER, "Expected function name").value;
    this.consume(TokenType.DELIMITER, "Expected '(' after function name", '(');

    const params = [];
    if (!this.check(TokenType.DELIMITER, ')')) {
      do {
        params.push(this.consume(TokenType.IDENTIFIER, "Expected parameter name").value);
      } while (this.match(TokenType.DELIMITER, ','));
    }
    this.consume(TokenType.DELIMITER, "Expected ')' after parameters", ')');
    this.consume(TokenType.DELIMITER, "Expected ':' after function signature", ':');
    this.consume(TokenType.NEWLINE, "Expected newline after function header");

    const body = this.block();

    return {
      type: 'FunctionDeclaration',
      name,
      params,
      body
    };
  }

  returnStatement() {
    let value = null;
    if (!this.check(TokenType.NEWLINE)) {
      value = this.expression();
    }
    this.consume(TokenType.NEWLINE, "Expected newline after return statement");
    return {
      type: 'ReturnStatement',
      value
    };
  }

  ifStatement() {
    const test = this.expression();
    this.consume(TokenType.DELIMITER, "Expected ':' after conditional expression", ':');
    this.consume(TokenType.NEWLINE, "Expected newline after condition");
    const consequent = this.block();

    let alternate = null;

    // Check for elif or else
    // Since after a block we've DEDENTed, we might find 'elif' or 'else'
    // but wait! If we had blank lines, they are ignored.
    this.skipNewlines();

    if (this.match(TokenType.KEYWORD, 'elif')) {
      alternate = this.ifStatement(); // Recursively parse elif as an if statement
    } else if (this.match(TokenType.KEYWORD, 'else')) {
      this.consume(TokenType.DELIMITER, "Expected ':' after else", ':');
      this.consume(TokenType.NEWLINE, "Expected newline after else");
      alternate = this.block();
    }

    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate
    };
  }

  whileStatement() {
    const test = this.expression();
    this.consume(TokenType.DELIMITER, "Expected ':' after while condition", ':');
    this.consume(TokenType.NEWLINE, "Expected newline after while condition");
    const body = this.block();

    return {
      type: 'WhileStatement',
      test,
      body
    };
  }

  forStatement() {
    const iterator = this.consume(TokenType.IDENTIFIER, "Expected iterator variable in for loop").value;
    this.consume(TokenType.KEYWORD, "Expected 'in' after iterator", 'in');
    const iterable = this.expression();
    this.consume(TokenType.DELIMITER, "Expected ':' after for statement", ':');
    this.consume(TokenType.NEWLINE, "Expected newline after for header");
    const body = this.block();

    return {
      type: 'ForStatement',
      iterator,
      iterable,
      body
    };
  }

  block() {
    this.consume(TokenType.INDENT, "Expected indented block");
    const body = [];
    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) {
        continue;
      }
      body.push(this.statement());
    }
    this.consume(TokenType.DEDENT, "Expected end of indented block");
    return body;
  }

  expressionStatement() {
    const expr = this.expression();

    // Check for inline assignment
    if (this.match(TokenType.OPERATOR, '=')) {
      if (expr.type !== 'Identifier' && expr.type !== 'MemberExpression') {
        throw new ReferenceError(`Invalid left-hand side in assignment at line ${this.peek().line}`);
      }
      const right = this.expression();
      this.consume(TokenType.NEWLINE, "Expected newline after assignment");
      return {
        type: 'AssignmentStatement',
        left: expr,
        right
      };
    }

    // Check for standard augment operators like +=, -=, *=, /=
    if (this.check(TokenType.OPERATOR)) {
      const op = this.peek().value;
      if (['+=', '-=', '*=', '/='].includes(op)) {
        this.advance(); // consume operator
        if (expr.type !== 'Identifier' && expr.type !== 'MemberExpression') {
          throw new ReferenceError(`Invalid left-hand side in assignment at line ${this.peek().line}`);
        }
        const right = this.expression();
        this.consume(TokenType.NEWLINE, "Expected newline after compound assignment");
        return {
          type: 'AugmentedAssignmentStatement',
          operator: op,
          left: expr,
          right
        };
      }
    }

    this.consume(TokenType.NEWLINE, "Expected newline after expression statement");
    return {
      type: 'ExpressionStatement',
      expression: expr
    };
  }

  expression() {
    return this.logicalOr();
  }

  logicalOr() {
    let expr = this.logicalAnd();
    while (this.match(TokenType.KEYWORD, 'or')) {
      const right = this.logicalAnd();
      expr = {
        type: 'LogicalExpression',
        operator: 'or',
        left: expr,
        right
      };
    }
    return expr;
  }

  logicalAnd() {
    let expr = this.logicalNot();
    while (this.match(TokenType.KEYWORD, 'and')) {
      const right = this.logicalNot();
      expr = {
        type: 'LogicalExpression',
        operator: 'and',
        left: expr,
        right
      };
    }
    return expr;
  }

  logicalNot() {
    if (this.match(TokenType.KEYWORD, 'not')) {
      const argument = this.logicalNot();
      return {
        type: 'UnaryExpression',
        operator: 'not',
        argument
      };
    }
    return this.comparison();
  }

  comparison() {
    let expr = this.additive();
    while (this.check(TokenType.OPERATOR)) {
      const op = this.peek().value;
      if (['==', '!=', '<', '<=', '>', '>='].includes(op)) {
        this.advance(); // consume it
        const right = this.additive();
        expr = {
          type: 'BinaryExpression',
          operator: op,
          left: expr,
          right
        };
      } else {
        break;
      }
    }
    return expr;
  }

  additive() {
    let expr = this.multiplicative();
    while (this.check(TokenType.OPERATOR)) {
      const op = this.peek().value;
      if (op === '+' || op === '-') {
        this.advance();
        const right = this.multiplicative();
        expr = {
          type: 'BinaryExpression',
          operator: op,
          left: expr,
          right
        };
      } else {
        break;
      }
    }
    return expr;
  }

  multiplicative() {
    let expr = this.unary();
    while (this.check(TokenType.OPERATOR)) {
      const op = this.peek().value;
      if (op === '*' || op === '/' || op === '%' || op === '//') {
        this.advance();
        const right = this.unary();
        expr = {
          type: 'BinaryExpression',
          operator: op,
          left: expr,
          right
        };
      } else {
        break;
      }
    }
    return expr;
  }

  unary() {
    if (this.check(TokenType.OPERATOR)) {
      const op = this.peek().value;
      if (op === '-' || op === '+') {
        this.advance();
        const argument = this.unary();
        return {
          type: 'UnaryExpression',
          operator: op,
          argument
        };
      }
    }
    return this.primary();
  }

  primary() {
    if (this.match(TokenType.KEYWORD, 'True')) {
      return { type: 'Literal', value: true };
    }
    if (this.match(TokenType.KEYWORD, 'False')) {
      return { type: 'Literal', value: false };
    }
    if (this.match(TokenType.KEYWORD, 'None')) {
      return { type: 'Literal', value: null };
    }

    if (this.check(TokenType.NUMBER) || this.check(TokenType.STRING)) {
      const token = this.advance();
      return { type: 'Literal', value: token.value };
    }

    if (this.match(TokenType.DELIMITER, '[')) {
      const elements = [];
      if (!this.check(TokenType.DELIMITER, ']')) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.DELIMITER, ','));
      }
      this.consume(TokenType.DELIMITER, "Expected ']' at end of list literal", ']');
      return { type: 'ListLiteral', elements };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      let expr = { type: 'Identifier', value: this.previous().value };
      return this.finishCallOrAccess(expr);
    }

    if (this.match(TokenType.DELIMITER, '(')) {
      const expr = this.expression();
      this.consume(TokenType.DELIMITER, "Expected ')' to close grouped expression", ')');
      return expr;
    }

    const token = this.peek();
    throw new SyntaxError(`Unexpected expression token "${token.value}" at line ${token.line}, col ${token.col}`);
  }

  finishCallOrAccess(expr) {
    while (true) {
      if (this.match(TokenType.DELIMITER, '(')) {
        const args = [];
        if (!this.check(TokenType.DELIMITER, ')')) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.DELIMITER, ','));
        }
        this.consume(TokenType.DELIMITER, "Expected ')' after argument list", ')');
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args
        };
      } else if (this.match(TokenType.DELIMITER, '[')) {
        // Index access, e.g., arr[0]
        const index = this.expression();
        this.consume(TokenType.DELIMITER, "Expected ']' after list index", ']');
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: index,
          computed: true
        };
      } else if (this.match(TokenType.DELIMITER, '.')) {
        // Dot access, e.g., arr.append
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', value: property.value },
          computed: false
        };
      } else {
        break;
      }
    }
    return expr;
  }

  skipNewlines() {
    while (this.match(TokenType.NEWLINE)) {
      // intentionally empty
    }
  }
}
