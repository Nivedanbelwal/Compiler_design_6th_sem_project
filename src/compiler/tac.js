/**
 * Three Address Code (TAC) Generator for C-like expressions.
 * Supports: Assignments, Arithmetic, Function Calls, and Returns.
 * Returns a structured IR for advanced optimization.
 */

import { TOKEN_TYPES } from './lexer.js';

export const TAC_TYPES = {
  ASSIGN: 'ASSIGN',      // target = op1
  ARITH: 'ARITH',        // target = op1 op op2
  CALL: 'CALL',          // call func, n (n = number of params)
  PARAM: 'PARAM',        // param op1
  RETURN: 'RETURN',      // return op1
  LABEL: 'LABEL',        // L1:
  GOTO: 'GOTO',          // goto L1
  IF: 'IF',              // if op1 goto L1
};

class TACGenerator {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== 'COMMENT' && t.type !== 'PREPROCESSOR');
    this.pos = 0;
    this.tempCount = 1;
    this.labelCount = 1;
    this.instructions = [];
    this.errors = [];
  }

  peek() {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  advance() {
    return this.tokens[this.pos++];
  }

  match(type, lexeme = null) {
    const token = this.peek();
    if (!token) return false;
    if (token.type !== type) return false;
    if (lexeme && token.lexeme !== lexeme) return false;
    this.advance();
    return true;
  }

  newTemp() {
    return `t${this.tempCount++}`;
  }

  newLabel() {
    return `L${this.labelCount++}`;
  }

  emit(type, data) {
    const instr = { type, ...data };
    instr.toString = function() {
      switch (this.type) {
        case TAC_TYPES.ASSIGN: return `${this.target} = ${this.op1}`;
        case TAC_TYPES.ARITH:  return `${this.target} = ${this.op1} ${this.operator} ${this.op2}`;
        case TAC_TYPES.PARAM:  return `param ${this.op1}`;
        case TAC_TYPES.CALL:   return `call ${this.func}, ${this.paramCount || 0}`;
        case TAC_TYPES.RETURN: return `return ${this.op1 || ''}`;
        case TAC_TYPES.LABEL:  return `${this.label}:`;
        case TAC_TYPES.GOTO:   return `goto ${this.label}`;
        case TAC_TYPES.IF: {
          if (this.operator === '==' && this.op2 === '0') {
            return `ifFalse ${this.op1} goto ${this.label}`;
          }
          return `if ${this.op1} ${this.operator || ''} ${this.op2 || ''} goto ${this.label}`;
        }
        default: return 'unknown';
      }
    };
    this.instructions.push(instr);
  }

  generate() {
    try {
      while (this.peek()) {
        this.parseStatement();
      }
      // Ensure the last instruction is a return if not present
      if (this.instructions.length > 0 && this.instructions[this.instructions.length - 1].type !== TAC_TYPES.RETURN) {
        // Only if it's main or top level
      }
    } catch (e) {
      this.errors.push(e.message);
    }
    
    // Final Validation
    const validationErrors = this.validateTAC(this.instructions);
    this.errors.push(...validationErrors);
    
    return { instructions: this.instructions, errors: this.errors };
  }

  /**
   * Validates that all GOTO and IF targets exist in the instruction set.
   */
  validateTAC(instructions) {
    const labels = new Set();
    const errors = [];
    
    // 1. Collect all defined labels
    instructions.forEach(instr => {
      if (instr.type === TAC_TYPES.LABEL) {
        labels.add(instr.label);
      }
    });
    
    // 2. Check all jump targets
    instructions.forEach(instr => {
      if (instr.type === TAC_TYPES.GOTO || instr.type === TAC_TYPES.IF) {
        if (!labels.has(instr.label)) {
          errors.push(`Error: Missing label definition for "${instr.label}"`);
        }
      }
    });
    
    return errors;
  }

  parseStatement() {
    const token = this.peek();
    if (!token) return;

    if (this.match(TOKEN_TYPES.KEYWORD, 'while')) {
      this.parseWhile();
      return;
    }

    if (this.match(TOKEN_TYPES.KEYWORD, 'if')) {
      this.parseIf();
      return;
    }

    if (this.match(TOKEN_TYPES.KEYWORD, 'int') || 
        this.match(TOKEN_TYPES.KEYWORD, 'float') || 
        this.match(TOKEN_TYPES.KEYWORD, 'char') || 
        this.match(TOKEN_TYPES.KEYWORD, 'void')) {
      
      const next = this.peek();
      if (next && next.lexeme === 'main') {
        this.advance();
        if (this.match(TOKEN_TYPES.DELIMITER, '(')) {
          while (this.peek() && this.peek().lexeme !== ')') this.advance();
          this.match(TOKEN_TYPES.DELIMITER, ')');
        }
        this.match(TOKEN_TYPES.DELIMITER, '{');
        return;
      }
      
      this.parseAssignment();
      return;
    }

    if (token.lexeme === '}' || token.lexeme === '{') {
      this.advance();
      return;
    }

    if (token.lexeme === 'return') {
      this.advance();
      const val = this.parseExpression();
      this.emit(TAC_TYPES.RETURN, { op1: val });
      this.match(TOKEN_TYPES.DELIMITER, ';');
      return;
    }

    if (token.type === TOKEN_TYPES.IDENTIFIER) {
      const next = this.tokens[this.pos + 1];
      if (next && next.lexeme === '(') {
        this.parseCall();
      } else {
        this.parseAssignment();
      }
    } else {
      this.advance();
    }
  }

  parseIf() {
    const elseLabel = this.newLabel();
    const endLabel = this.newLabel();

    this.match(TOKEN_TYPES.DELIMITER, '(');
    const cond = this.parseExpression();
    // ifFalse cond goto elseLabel
    this.emit(TAC_TYPES.IF, { op1: cond, operator: '==', op2: '0', label: elseLabel });
    this.match(TOKEN_TYPES.DELIMITER, ')');

    this.parseBlockOrStatement();

    if (this.match(TOKEN_TYPES.KEYWORD, 'else')) {
      this.emit(TAC_TYPES.GOTO, { label: endLabel });
      this.emit(TAC_TYPES.LABEL, { label: elseLabel });
      this.parseBlockOrStatement();
      this.emit(TAC_TYPES.LABEL, { label: endLabel });
    } else {
      this.emit(TAC_TYPES.LABEL, { label: elseLabel });
    }
  }

  parseWhile() {
    const startLabel = this.newLabel();
    const endLabel = this.newLabel();

    this.emit(TAC_TYPES.LABEL, { label: startLabel });
    
    this.match(TOKEN_TYPES.DELIMITER, '(');
    const cond = this.parseExpression();
    this.emit(TAC_TYPES.IF, { op1: cond, operator: '==', op2: '0', label: endLabel });
    this.match(TOKEN_TYPES.DELIMITER, ')');

    this.parseBlockOrStatement();

    this.emit(TAC_TYPES.GOTO, { label: startLabel });
    this.emit(TAC_TYPES.LABEL, { label: endLabel });
  }

  parseBlockOrStatement() {
    if (this.match(TOKEN_TYPES.DELIMITER, '{')) {
      while (this.peek() && this.peek().lexeme !== '}') {
        this.parseStatement();
      }
      this.match(TOKEN_TYPES.DELIMITER, '}');
    } else {
      this.parseStatement();
    }
  }

  parseCall() {
    const func = this.advance().lexeme;
    this.match(TOKEN_TYPES.DELIMITER, '(');
    const params = [];
    if (this.peek() && this.peek().lexeme !== ')') {
      params.push(this.parseExpression());
      while (this.match(TOKEN_TYPES.DELIMITER, ',')) {
        params.push(this.parseExpression());
      }
    }
    this.match(TOKEN_TYPES.DELIMITER, ')');
    this.match(TOKEN_TYPES.DELIMITER, ';');
    params.filter(p => p !== '').forEach(p => this.emit(TAC_TYPES.PARAM, { op1: p }));
    this.emit(TAC_TYPES.CALL, { func, paramCount: params.filter(p => p !== '').length });
  }

  parseAssignment() {
    const target = this.peek();
    if (!target || target.type !== TOKEN_TYPES.IDENTIFIER) {
      this.advance();
      return;
    }
    this.advance();
    if (this.match(TOKEN_TYPES.OPERATOR, '=')) {
      const rhs = this.parseExpression();
      this.emit(TAC_TYPES.ASSIGN, { target: target.lexeme, op1: rhs });
      this.match(TOKEN_TYPES.DELIMITER, ';');
    } else {
      this.match(TOKEN_TYPES.DELIMITER, ';');
    }
  }

  parseExpression() {
    return this.parseRelational();
  }

  parseRelational() {
    let left = this.parseAdditive();
    const relOps = ['<', '>', '<=', '>=', '==', '!='];
    const next = this.peek();
    if (next && relOps.includes(next.lexeme)) {
      const op = this.advance().lexeme;
      const right = this.parseAdditive();
      const temp = this.newTemp();
      this.emit(TAC_TYPES.ARITH, { target: temp, op1: left, op2: right, operator: op });
      return temp;
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.peek() && (this.peek().lexeme === '+' || this.peek().lexeme === '-')) {
      const op = this.advance().lexeme;
      const right = this.parseMultiplicative();
      const temp = this.newTemp();
      this.emit(TAC_TYPES.ARITH, { target: temp, op1: left, op2: right, operator: op });
      left = temp;
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parsePrimary();
    while (this.peek() && (this.peek().lexeme === '*' || this.peek().lexeme === '/')) {
      const op = this.advance().lexeme;
      const right = this.parsePrimary();
      const temp = this.newTemp();
      this.emit(TAC_TYPES.ARITH, { target: temp, op1: left, op2: right, operator: op });
      left = temp;
    }
    return left;
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) return '';
    if (this.match(TOKEN_TYPES.DELIMITER, '(')) {
      const expr = this.parseExpression();
      this.match(TOKEN_TYPES.DELIMITER, ')');
      return expr;
    }
    if (token.type === TOKEN_TYPES.CONSTANT || token.type === TOKEN_TYPES.IDENTIFIER || token.type === TOKEN_TYPES.STRING_LITERAL) {
      this.advance();
      return token.lexeme;
    }
    this.advance();
    return '';
  }
}

export function generateTAC(tokens) {
  const gen = new TACGenerator(tokens);
  return gen.generate();
}
