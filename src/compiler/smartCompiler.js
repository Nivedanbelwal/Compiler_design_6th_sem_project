/**
 * Smart Compiler Core
 * Simple lexer, parser, static analyzer, and interpreter for the mini-language.
 */

// Token Types
export const TOKEN_TYPES = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  OPERATOR: 'OPERATOR',
  DELIMITER: 'DELIMITER',
  EOF: 'EOF',
  ERROR: 'ERROR',
};

// Tokenizer / Lexer
export function tokenizeSmart(code) {
  const tokens = [];
  let index = 0;
  let line = 1;

  const keywords = ['let', 'print', 'if', 'else', 'while', 'int', 'float', 'double', 'char', 'void', 'main', 'return'];

  while (index < code.length) {
    const char = code[index];

    // Handle C Preprocessor Directives (e.g. #include <stdio.h>)
    if (char === '#') {
      while (index < code.length && code[index] !== '\n') {
        index++;
      }
      continue;
    }

    // Handle Whitespace & Newlines
    if (char === '\n') {
      line++;
      index++;
      continue;
    }
    if (/\s/.test(char)) {
      index++;
      continue;
    }

    // Handle String Literals (e.g. "%d\n")
    if (char === '"') {
      let strVal = '"';
      index++;
      while (index < code.length && code[index] !== '"') {
        if (code[index] === '\\' && code[index + 1] === '"') {
          strVal += '\\"';
          index += 2;
        } else {
          strVal += code[index];
          index++;
        }
      }
      if (index < code.length) {
        strVal += '"';
        index++;
      }
      tokens.push({ type: TOKEN_TYPES.STRING, value: strVal, line });
      continue;
    }

    // Handle Delimiters (including C Semicolon ; and comma ,)
    if (['(', ')', '{', '}', ';', ','].includes(char)) {
      tokens.push({ type: TOKEN_TYPES.DELIMITER, value: char, line });
      index++;
      continue;
    }

    // Handle Operators (==, =, +, -, *, /, <, >)
    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: char, line });
      index++;
      continue;
    }
    if (char === '=') {
      if (code[index + 1] === '=') {
        tokens.push({ type: TOKEN_TYPES.OPERATOR, value: '==', line });
        index += 2;
      } else {
        tokens.push({ type: TOKEN_TYPES.OPERATOR, value: '=', line });
        index++;
      }
      continue;
    }
    if (char === '<' || char === '>') {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: char, line });
      index++;
      continue;
    }

    // Handle Numbers
    if (/[0-9]/.test(char)) {
      let numStr = '';
      while (index < code.length && /[0-9.]/.test(code[index])) {
        numStr += code[index];
        index++;
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: numStr, line });
      continue;
    }

    // Handle Identifiers & Keywords
    if (/[a-zA-Z_]/.test(char)) {
      let identStr = '';
      while (index < code.length && /[a-zA-Z0-9_]/.test(code[index])) {
        identStr += code[index];
        index++;
      }
      if (keywords.includes(identStr)) {
        tokens.push({ type: TOKEN_TYPES.KEYWORD, value: identStr, line });
      } else {
        tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: identStr, line });
      }
      continue;
    }

    // Unrecognized Character
    tokens.push({ type: TOKEN_TYPES.ERROR, value: char, line, error: `Unexpected character: '${char}'` });
    index++;
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: '', line });
  return tokens;
}

// AST Parser
export class SmartParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
    this.warnings = [];
  }

  peek() {
    return this.tokens[this.pos] || { type: TOKEN_TYPES.EOF, value: '', line: 1 };
  }

  next() {
    const token = this.peek();
    if (this.pos < this.tokens.length) {
      this.pos++;
    }
    return token;
  }

  match(type, value = null) {
    const token = this.peek();
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    this.next();
    return true;
  }

  expect(type, value = null, errorMsg = '') {
    const token = this.peek();
    if (token.type === type && (value === null || token.value === value)) {
      return this.next();
    }
    const msg = errorMsg || `Expected ${value || type} at line ${token.line}, got '${token.value}'`;
    this.errors.push({ line: token.line, message: msg });
    // Dummy node for recovery
    return { type, value: '', line: token.line };
  }

  parse() {
    const statements = [];
    while (this.peek().type !== TOKEN_TYPES.EOF) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      } else {
        // Recovery
        this.next();
      }
    }
    return {
      type: 'Program',
      label: 'Program',
      children: statements,
      functions: this.declaredFunctions || [],
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  parseStatement() {
    const token = this.peek();

    // Check for inline tokenizer errors
    if (token.type === TOKEN_TYPES.ERROR) {
      this.errors.push({ line: token.line, message: token.error });
      this.next();
      return null;
    }

    // C Function declaration (e.g. float calculateArea(float radius) or int main())
    if (token.type === TOKEN_TYPES.KEYWORD && ['int', 'void', 'float', 'double', 'char'].includes(token.value)) {
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken && (nextToken.type === TOKEN_TYPES.IDENTIFIER || nextToken.value === 'main')) {
        const nextNextToken = this.tokens[this.pos + 2];
        if (nextNextToken && nextNextToken.value === '(') {
          // Parse function header
          const returnType = this.next().value; // e.g. 'float'
          const funcName = this.next().value;   // e.g. 'calculateArea'
          
          this.expect(TOKEN_TYPES.DELIMITER, '(');
          const params = [];
          while (this.peek().type !== TOKEN_TYPES.DELIMITER || this.peek().value !== ')') {
            if (this.peek().type === TOKEN_TYPES.KEYWORD) {
              const pType = this.next().value;
              const pName = this.expect(TOKEN_TYPES.IDENTIFIER).value;
              params.push({ name: pName, type: pType });
              if (this.peek().value === ',') this.next();
            } else {
              this.next();
            }
          }
          this.expect(TOKEN_TYPES.DELIMITER, ')');
          this.expect(TOKEN_TYPES.DELIMITER, '{');

          if (!this.declaredFunctions) this.declaredFunctions = [];
          this.declaredFunctions.push({
            name: funcName,
            type: returnType,
            params: params
          });
          return null;
        }
      }
    }

    // Skip return statements
    if (token.type === TOKEN_TYPES.KEYWORD && token.value === 'return') {
      this.next(); // return
      this.parseExpression(); // consume return expression
      if (this.peek().type === TOKEN_TYPES.DELIMITER && this.peek().value === ';') {
        this.next(); // semicolon
      }
      return null;
    }

    // 1. Variable declaration (int a = ..., let a = ..., or int a;)
    if (token.type === TOKEN_TYPES.KEYWORD && ['let', 'int', 'float', 'double', 'char'].includes(token.value)) {
      const typeKeyword = this.next().value; // Consume 'let' or C type
      const identToken = this.expect(TOKEN_TYPES.IDENTIFIER, null, 'Expected identifier');
      
      let expr;
      if (this.peek().type === TOKEN_TYPES.OPERATOR && this.peek().value === '=') {
        this.next(); // Consume '='
        expr = this.parseExpression();
      } else {
        // Default uninitialized variables to 0
        expr = { type: 'Number', label: 'Number: 0', value: 0, line: identToken.line };
      }

      // Consume trailing semicolon
      if (this.peek().type === TOKEN_TYPES.DELIMITER && this.peek().value === ';') {
        this.next();
      }

      // Check for hardcoded password warning
      if (identToken.value.toLowerCase().includes('password')) {
        this.warnings.push({
          line: identToken.line,
          message: `Hardcoded password detected in variable: '${identToken.value}'`,
        });
      }

      return {
        type: 'Assign',
        label: `Assign`,
        line: identToken.line,
        dataType: typeKeyword, // Store C type (e.g. 'int', 'float')
        children: [
          { type: 'Var', label: `Var: ${identToken.value}`, value: identToken.value, line: identToken.line },
          expr,
        ],
      };
    }

    // 2. Direct assignment (a = ...)
    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken && nextToken.type === TOKEN_TYPES.OPERATOR && nextToken.value === '=') {
        const identToken = this.next();
        this.next(); // Consume '='
        const expr = this.parseExpression();

        // Consume trailing semicolon
        if (this.peek().type === TOKEN_TYPES.DELIMITER && this.peek().value === ';') {
          this.next();
        }

        if (identToken.value.toLowerCase().includes('password')) {
          this.warnings.push({
            line: identToken.line,
            message: `Hardcoded password detected in variable: '${identToken.value}'`,
          });
        }

        return {
          type: 'Assign',
          label: `Assign`,
          line: identToken.line,
          children: [
            { type: 'Var', label: `Var: ${identToken.value}`, value: identToken.value, line: identToken.line },
            expr,
          ],
        };
      }
    }

    // 3. Print statement (print(...) or printf(...))
    if (token.type === TOKEN_TYPES.KEYWORD && (token.value === 'print' || token.value === 'printf')) {
      const printToken = this.next();
      this.expect(TOKEN_TYPES.DELIMITER, '(', "Expected '(' after print");
      
      const args = [];
      if (this.peek().type !== TOKEN_TYPES.DELIMITER || this.peek().value !== ')') {
        args.push(this.parseExpression());
        while (this.match(TOKEN_TYPES.DELIMITER, ',')) {
          args.push(this.parseExpression());
        }
      }
      this.expect(TOKEN_TYPES.DELIMITER, ')', "Expected ')' after expression");

      // Consume trailing semicolon
      if (this.peek().type === TOKEN_TYPES.DELIMITER && this.peek().value === ';') {
        this.next();
      }

      return {
        type: 'Print',
        label: 'Print',
        line: printToken.line,
        children: args,
      };
    }

    // 4. Conditional (if)
    if (token.type === TOKEN_TYPES.KEYWORD && token.value === 'if') {
      const ifToken = this.next();
      this.expect(TOKEN_TYPES.DELIMITER, '(', "Expected '(' after if");
      const condition = this.parseExpression();
      this.expect(TOKEN_TYPES.DELIMITER, ')', "Expected ')' after condition");

      this.expect(TOKEN_TYPES.DELIMITER, '{', "Expected '{' to start if block");
      const thenStatements = [];
      while (this.peek().type !== TOKEN_TYPES.EOF && this.peek().value !== '}') {
        const stmt = this.parseStatement();
        if (stmt) thenStatements.push(stmt);
      }
      this.expect(TOKEN_TYPES.DELIMITER, '}', "Expected '}' to close if block");

      let elseBlock = null;
      if (this.peek().type === TOKEN_TYPES.KEYWORD && this.peek().value === 'else') {
        this.next(); // Consume 'else'
        this.expect(TOKEN_TYPES.DELIMITER, '{', "Expected '{' to start else block");
        const elseStatements = [];
        while (this.peek().type !== TOKEN_TYPES.EOF && this.peek().value !== '}') {
          const stmt = this.parseStatement();
          if (stmt) elseStatements.push(stmt);
        }
        this.expect(TOKEN_TYPES.DELIMITER, '}', "Expected '}' to close else block");
        elseBlock = {
          type: 'Block',
          label: 'Else Block',
          children: elseStatements,
        };
      }

      return {
        type: 'If',
        label: 'If',
        line: ifToken.line,
        condition,
        thenBranch: {
          type: 'Block',
          label: 'Then Block',
          children: thenStatements,
        },
        elseBranch: elseBlock,
        children: elseBlock 
          ? [condition, { type: 'Block', label: 'Then', children: thenStatements }, elseBlock] 
          : [condition, { type: 'Block', label: 'Then', children: thenStatements }],
      };
    }

    // 5. While loop (while)
    if (token.type === TOKEN_TYPES.KEYWORD && token.value === 'while') {
      const whileToken = this.next();
      this.expect(TOKEN_TYPES.DELIMITER, '(', "Expected '(' after while");
      const condition = this.parseExpression();
      this.expect(TOKEN_TYPES.DELIMITER, ')', "Expected ')' after condition");

      this.expect(TOKEN_TYPES.DELIMITER, '{', "Expected '{' to start while block");
      const bodyStatements = [];
      while (this.peek().type !== TOKEN_TYPES.EOF && this.peek().value !== '}') {
        const stmt = this.parseStatement();
        if (stmt) bodyStatements.push(stmt);
      }
      this.expect(TOKEN_TYPES.DELIMITER, '}', "Expected '}' to close while block");

      return {
        type: 'While',
        label: 'While',
        line: whileToken.line,
        condition,
        body: {
          type: 'Block',
          label: 'Body Block',
          children: bodyStatements,
        },
        children: [condition, { type: 'Block', label: 'Body', children: bodyStatements }],
      };
    }

    // Default: try parsing as an expression to avoid infinite loop
    const expr = this.parseExpression();
    return expr;
  }

  parseExpression() {
    return this.parseLogicalOr();
  }

  parseLogicalOr() {
    let expr = this.parseComparison();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && ['<', '>', '=='].includes(this.peek().value)) {
      const opToken = this.next();
      const right = this.parseComparison();
      expr = {
        type: 'BinOp',
        label: `BinOp: ${opToken.value}`,
        value: opToken.value,
        line: opToken.line,
        children: [expr, right],
      };
    }
    return expr;
  }

  parseComparison() {
    let expr = this.parseAdditive();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && ['+', '-'].includes(this.peek().value)) {
      const opToken = this.next();
      const right = this.parseAdditive();
      expr = {
        type: 'BinOp',
        label: `BinOp: ${opToken.value}`,
        value: opToken.value,
        line: opToken.line,
        children: [expr, right],
      };
    }
    return expr;
  }

  parseAdditive() {
    let expr = this.parsePrimary();
    while (this.peek().type === TOKEN_TYPES.OPERATOR && ['*', '/'].includes(this.peek().value)) {
      const opToken = this.next();
      const right = this.parsePrimary();
      expr = {
        type: 'BinOp',
        label: `BinOp: ${opToken.value}`,
        value: opToken.value,
        line: opToken.line,
        children: [expr, right],
      };
    }
    return expr;
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === TOKEN_TYPES.NUMBER) {
      this.next();
      return {
        type: 'Number',
        label: `Number: ${token.value}`,
        value: Number(token.value),
        line: token.line,
      };
    }

    if (token.type === TOKEN_TYPES.STRING) {
      this.next();
      return {
        type: 'String',
        label: `String: ${token.value}`,
        value: token.value,
        line: token.line,
      };
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      this.next();
      return {
        type: 'Var',
        label: `Var: ${token.value}`,
        value: token.value,
        line: token.line,
      };
    }

    if (token.type === TOKEN_TYPES.DELIMITER && token.value === '(') {
      this.next(); // Consume '('
      const expr = this.parseExpression();
      this.expect(TOKEN_TYPES.DELIMITER, ')', "Expected ')'");
      return expr;
    }

    this.errors.push({ line: token.line, message: `Unexpected token in expression: '${token.value}'` });
    this.next();
    return { type: 'Error', label: 'Error Node', line: token.line };
  }
}

// Interpreter / Environment Runtime
export class SmartInterpreter {
  constructor() {
    this.variables = {}; // variable Name -> { value, type }
    this.output = [];
    this.errors = [];
  }

  execute(ast) {
    if (!ast || ast.type !== 'Program') return;
    
    // Clear state
    this.variables = {};
    this.output = [];
    this.errors = [];

    // Pre-populate compiler errors if any exist
    if (ast.errors && ast.errors.length > 0) {
      this.errors = [...ast.errors];
      return { output: [], variables: {}, errors: this.errors };
    }

    // Always register C entry point function
    this.variables['main'] = {
      name: 'main',
      type: 'int',
      scope: 'Global',
      category: 'Function',
      value: '-',
      additionalInfo: 'Returns int | Entry Point',
    };

    // Dynamically register custom parsed functions and parameters
    if (ast.functions) {
      ast.functions.forEach(func => {
        // Register the function
        this.variables[func.name] = {
          name: func.name,
          type: func.type,
          scope: 'Global',
          category: 'Function',
          value: '-',
          additionalInfo: `Returns ${func.type} | User defined`,
        };

        // Register each parameter
        func.params.forEach(p => {
          this.variables[p.name] = {
            name: p.name,
            type: p.type,
            scope: `Local (${func.name})`,
            category: 'Parameter',
            value: '-',
            additionalInfo: `Scope: ${func.name} | Parameter`,
          };
        });
      });
    }

    try {
      this.executeBlock(ast.children);
    } catch (e) {
      this.errors.push({ line: 1, message: `Runtime error: ${e.message}` });
    }

    return {
      output: this.output,
      variables: this.variables,
      errors: this.errors,
    };
  }

  executeBlock(statements) {
    for (const stmt of statements) {
      this.executeStatement(stmt);
    }
  }

  executeStatement(node) {
    if (!node) return;

    switch (node.type) {
      case 'Assign': {
        const varNode = node.children[0];
        const valNode = node.children[1];
        const value = this.evaluate(valNode);
        
        let declaredType = node.dataType || 'int';
        if (declaredType === 'let') {
          declaredType = typeof value === 'number' ? 'int' : 'string';
        }

        this.variables[varNode.value] = {
          name: varNode.value,
          type: declaredType,
          scope: 'Local (main)',
          category: 'Variable',
          value: value,
          additionalInfo: `Value: ${value} | Stack allocated`,
        };
        break;
      }
      case 'Print': {
        const val = this.evaluate(node.children[0]);
        this.output.push(val === undefined ? 'undefined' : val.toString());
        break;
      }
      case 'If': {
        const cond = this.evaluate(node.condition);
        if (cond) {
          this.executeBlock(node.thenBranch.children);
        } else if (node.elseBranch) {
          this.executeBlock(node.elseBranch.children);
        }
        break;
      }
      case 'While': {
        let limit = 0; // Infinite loop protection
        while (this.evaluate(node.condition)) {
          limit++;
          if (limit > 1000) {
            throw new Error('Infinite loop detected (exceeded 1000 iterations)');
          }
          this.executeBlock(node.body.children);
        }
        break;
      }
      default:
        this.evaluate(node);
    }
  }

  evaluate(node) {
    if (!node) return 0;

    switch (node.type) {
      case 'Number':
        return node.value;
      case 'String':
        return node.value;
      case 'Var':
        if (!(node.value in this.variables)) {
          this.errors.push({ line: node.line, message: `Undefined variable: '${node.value}'` });
          return 0;
        }
        return this.variables[node.value].value;
      case 'BinOp': {
        const left = this.evaluate(node.children[0]);
        const right = this.evaluate(node.children[1]);
        switch (node.value) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return right !== 0 ? left / right : 0;
          case '<': return left < right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '==': return left === right ? 1 : 0;
          default: return 0;
        }
      }
      default:
        return 0;
    }
  }
}
