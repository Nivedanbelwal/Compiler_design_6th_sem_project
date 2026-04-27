// ============================================
// Codeezy — C Language Lexical Analyzer
// ============================================

// C language keywords
const C_KEYWORDS = new Set([
  'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
  'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
  'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof',
  'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
  'volatile', 'while',
]);

// Token types
export const TOKEN_TYPES = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  CONSTANT: 'CONSTANT',
  STRING_LITERAL: 'STRING_LITERAL',
  CHAR_LITERAL: 'CHAR_LITERAL',
  OPERATOR: 'OPERATOR',
  DELIMITER: 'DELIMITER',
  PREPROCESSOR: 'PREPROCESSOR',
  COMMENT: 'COMMENT',
  ERROR: 'ERROR',
};

// Token type display colors (for UI)
export const TOKEN_COLORS = {
  KEYWORD: '#6c63ff',
  IDENTIFIER: '#00d68f',
  CONSTANT: '#ff9f43',
  STRING_LITERAL: '#ff9f43',
  CHAR_LITERAL: '#ff9f43',
  OPERATOR: '#e06c75',
  DELIMITER: '#abb2bf',
  PREPROCESSOR: '#c678dd',
  COMMENT: '#5c6370',
  ERROR: '#ff4d6a',
};

// Multi-character operators (ordered by length — longest first)
const MULTI_OPS = [
  '<<=', '>>=',
  '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '##',
];

// Single-character operators
const SINGLE_OPS = new Set([
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':',
]);

// Delimiters
const DELIMITERS = new Set([
  '(', ')', '{', '}', '[', ']', ';', ',', '.', '#',
]);

/**
 * Tokenize C source code.
 * @param {string} source - The C source code
 * @returns {{ tokens: Array, errors: Array, stats: Object }}
 */
export function tokenize(source) {
  const tokens = [];
  const errors = [];
  let pos = 0;
  let line = 1;
  let col = 1;
  let tokenId = 1;

  const length = source.length;

  function peek(offset = 0) {
    return pos + offset < length ? source[pos + offset] : '\0';
  }

  function advance() {
    const ch = source[pos];
    pos++;
    if (ch === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function addToken(type, lexeme, startLine, startCol) {
    tokens.push({
      id: tokenId++,
      type,
      token: lexeme,
      lexeme,
      line: startLine,
      column: startCol,
      dfaStatus: type !== TOKEN_TYPES.ERROR ? 'Accepted' : 'Rejected',
    });
  }

  function addError(message, startLine, startCol, lexeme) {
    const err = { message, line: startLine, column: startCol, lexeme };
    errors.push(err);
    tokens.push({
      id: tokenId++,
      type: TOKEN_TYPES.ERROR,
      token: lexeme,
      lexeme,
      line: startLine,
      column: startCol,
      dfaStatus: 'Rejected',
      errorMessage: message,
    });
  }

  function isAlpha(ch) {
    return /[a-zA-Z_]/.test(ch);
  }

  function isDigit(ch) {
    return /[0-9]/.test(ch);
  }

  function isAlphaNum(ch) {
    return /[a-zA-Z0-9_]/.test(ch);
  }

  function isWhitespace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  }

  // ─── Main tokenization loop ──────────────────────────────
  while (pos < length) {
    const ch = peek();

    // Skip whitespace
    if (isWhitespace(ch)) {
      advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // ─── Comments ────────────────────────────────────────
    if (ch === '/' && peek(1) === '/') {
      // Single-line comment
      let lexeme = '';
      while (pos < length && peek() !== '\n') {
        lexeme += advance();
      }
      // Don't add comments as tokens (skip them)
      continue;
    }

    if (ch === '/' && peek(1) === '*') {
      // Multi-line comment
      let lexeme = '';
      lexeme += advance(); // /
      lexeme += advance(); // *
      let closed = false;
      while (pos < length) {
        if (peek() === '*' && peek(1) === '/') {
          lexeme += advance(); // *
          lexeme += advance(); // /
          closed = true;
          break;
        }
        lexeme += advance();
      }
      if (!closed) {
        addError('Unterminated comment', startLine, startCol, lexeme);
      }
      continue;
    }

    // ─── Preprocessor Directives ─────────────────────────
    if (ch === '#') {
      let lexeme = '';
      while (pos < length && peek() !== '\n') {
        lexeme += advance();
      }
      addToken(TOKEN_TYPES.PREPROCESSOR, lexeme.trim(), startLine, startCol);
      continue;
    }

    // ─── String Literals ─────────────────────────────────
    if (ch === '"') {
      let lexeme = '';
      lexeme += advance(); // opening "
      let closed = false;
      while (pos < length) {
        const c = peek();
        if (c === '\\') {
          lexeme += advance(); // backslash
          if (pos < length) lexeme += advance(); // escaped char
          continue;
        }
        if (c === '"') {
          lexeme += advance(); // closing "
          closed = true;
          break;
        }
        if (c === '\n') {
          break; // string can't span lines in C
        }
        lexeme += advance();
      }
      if (closed) {
        addToken(TOKEN_TYPES.STRING_LITERAL, lexeme, startLine, startCol);
      } else {
        addError('Unterminated string literal', startLine, startCol, lexeme);
      }
      continue;
    }

    // ─── Character Literals ──────────────────────────────
    if (ch === '\'') {
      let lexeme = '';
      lexeme += advance(); // opening '
      let closed = false;
      while (pos < length) {
        const c = peek();
        if (c === '\\') {
          lexeme += advance();
          if (pos < length) lexeme += advance();
          continue;
        }
        if (c === '\'') {
          lexeme += advance();
          closed = true;
          break;
        }
        if (c === '\n') break;
        lexeme += advance();
      }
      if (closed) {
        addToken(TOKEN_TYPES.CHAR_LITERAL, lexeme, startLine, startCol);
      } else {
        addError('Unterminated char literal', startLine, startCol, lexeme);
      }
      continue;
    }

    // ─── Numbers (integers and floats) ──────────────────
    if (isDigit(ch) || (ch === '.' && isDigit(peek(1)))) {
      let lexeme = '';
      let isFloat = false;

      // Handle hex: 0x...
      if (ch === '0' && (peek(1) === 'x' || peek(1) === 'X')) {
        lexeme += advance(); // 0
        lexeme += advance(); // x
        while (pos < length && /[0-9a-fA-F]/.test(peek())) {
          lexeme += advance();
        }
        addToken(TOKEN_TYPES.CONSTANT, lexeme, startLine, startCol);
        continue;
      }

      // Integer or float
      while (pos < length && isDigit(peek())) {
        lexeme += advance();
      }
      if (peek() === '.' && isDigit(peek(1))) {
        isFloat = true;
        lexeme += advance(); // .
        while (pos < length && isDigit(peek())) {
          lexeme += advance();
        }
      }
      // Scientific notation
      if (peek() === 'e' || peek() === 'E') {
        isFloat = true;
        lexeme += advance();
        if (peek() === '+' || peek() === '-') lexeme += advance();
        while (pos < length && isDigit(peek())) {
          lexeme += advance();
        }
      }
      // Suffix: f, l, u, etc.
      if (/[fFlLuU]/.test(peek())) {
        lexeme += advance();
      }

      addToken(TOKEN_TYPES.CONSTANT, lexeme, startLine, startCol);
      continue;
    }

    // ─── Identifiers and Keywords ──────────────────────
    if (isAlpha(ch)) {
      let lexeme = '';
      while (pos < length && isAlphaNum(peek())) {
        lexeme += advance();
      }
      const type = C_KEYWORDS.has(lexeme)
        ? TOKEN_TYPES.KEYWORD
        : TOKEN_TYPES.IDENTIFIER;
      addToken(type, lexeme, startLine, startCol);
      continue;
    }

    // ─── Multi-character Operators ──────────────────────
    let matchedOp = null;
    for (const op of MULTI_OPS) {
      let match = true;
      for (let i = 0; i < op.length; i++) {
        if (peek(i) !== op[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        matchedOp = op;
        break;
      }
    }
    if (matchedOp) {
      for (let i = 0; i < matchedOp.length; i++) advance();
      addToken(TOKEN_TYPES.OPERATOR, matchedOp, startLine, startCol);
      continue;
    }

    // ─── Single-character Operators ─────────────────────
    if (SINGLE_OPS.has(ch)) {
      advance();
      addToken(TOKEN_TYPES.OPERATOR, ch, startLine, startCol);
      continue;
    }

    // ─── Delimiters ─────────────────────────────────────
    if (DELIMITERS.has(ch)) {
      advance();
      addToken(TOKEN_TYPES.DELIMITER, ch, startLine, startCol);
      continue;
    }

    // ─── Unknown character ──────────────────────────────
    const unknownChar = advance();
    addError(`Unexpected character: '${unknownChar}'`, startLine, startCol, unknownChar);
  }

  // ─── Compute statistics ────────────────────────────────
  const stats = {
    totalTokens: tokens.length,
    errors: errors.length,
    byType: {},
  };
  for (const t of tokens) {
    stats.byType[t.type] = (stats.byType[t.type] || 0) + 1;
  }

  return { tokens, errors, stats };
}

export { C_KEYWORDS };
