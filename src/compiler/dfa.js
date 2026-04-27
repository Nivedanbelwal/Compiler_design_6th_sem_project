// ============================================
// Codeezy — DFA Definitions & Simulator
// ============================================

/**
 * Pre-built DFA definitions for C token types.
 * Each DFA has: states, alphabet description, transitions, startState, acceptStates, metadata.
 */

// ─── Identifier DFA ────────────────────────────────────────
// Pattern: letter (letter | digit)*
export const IDENTIFIER_DFA = {
  name: 'Identifier DFA',
  shortName: 'Identifier',
  pattern: 'letter (letter | digit)*',
  description: 'Recognizes valid C identifiers: must start with a letter or underscore, followed by letters, digits, or underscores.',
  examples: ['x', 'main', 'pi', 'value123', '_count', 'MAX_SIZE'],
  states: [
    { id: 'q0', label: 'q0', x: 150, y: 200, isStart: true, isAccept: false, description: 'Start State' },
    { id: 'q1', label: 'q1', x: 450, y: 200, isStart: false, isAccept: true, description: 'Accept State' },
    { id: 'dead', label: 'qd', x: 300, y: 380, isStart: false, isAccept: false, description: 'Dead State' },
  ],
  transitions: [
    { from: 'q0', to: 'q1', label: 'letter', description: 'Read a letter/underscore' },
    { from: 'q1', to: 'q1', label: 'letter | digit', description: 'Read letter/digit/underscore (loop)', isSelfLoop: true },
    { from: 'q0', to: 'dead', label: 'digit', description: 'Cannot start with digit' },
    { from: 'dead', to: 'dead', label: 'any', description: 'Dead state (trap)', isSelfLoop: true },
  ],
  startState: 'q0',
  acceptStates: ['q1'],
  classify(ch) {
    if (/[a-zA-Z_]/.test(ch)) return 'letter';
    if (/[0-9]/.test(ch)) return 'digit';
    return 'other';
  },
  getTransition(stateId, inputChar) {
    const cls = this.classify(inputChar);
    if (stateId === 'q0') {
      if (cls === 'letter') return 'q1';
      return 'dead';
    }
    if (stateId === 'q1') {
      if (cls === 'letter' || cls === 'digit') return 'q1';
      return 'dead';
    }
    return 'dead';
  },
};

// ─── Number DFA ────────────────────────────────────────────
// Pattern: digit+ (. digit+)?
export const NUMBER_DFA = {
  name: 'Number DFA',
  shortName: 'Number',
  pattern: 'digit+ (. digit+)?',
  description: 'Recognizes integer and floating-point constants. Integers are one or more digits. Floats have a decimal point followed by digits.',
  examples: ['42', '0', '3.14159', '100', '0.5'],
  states: [
    { id: 'q0', label: 'q0', x: 100, y: 200, isStart: true, isAccept: false, description: 'Start State' },
    { id: 'q1', label: 'q1', x: 280, y: 200, isStart: false, isAccept: true, description: 'Integer (Accept)' },
    { id: 'q2', label: 'q2', x: 440, y: 200, isStart: false, isAccept: false, description: 'Decimal Point' },
    { id: 'q3', label: 'q3', x: 600, y: 200, isStart: false, isAccept: true, description: 'Float (Accept)' },
    { id: 'dead', label: 'qd', x: 350, y: 380, isStart: false, isAccept: false, description: 'Dead State' },
  ],
  transitions: [
    { from: 'q0', to: 'q1', label: 'digit', description: 'Read first digit' },
    { from: 'q1', to: 'q1', label: 'digit', description: 'Read more digits', isSelfLoop: true },
    { from: 'q1', to: 'q2', label: '.', description: 'Read decimal point' },
    { from: 'q2', to: 'q3', label: 'digit', description: 'Read digit after decimal' },
    { from: 'q3', to: 'q3', label: 'digit', description: 'Read more decimal digits', isSelfLoop: true },
    { from: 'q0', to: 'dead', label: 'other', description: 'Invalid start' },
    { from: 'dead', to: 'dead', label: 'any', description: 'Dead state (trap)', isSelfLoop: true },
  ],
  startState: 'q0',
  acceptStates: ['q1', 'q3'],
  classify(ch) {
    if (/[0-9]/.test(ch)) return 'digit';
    if (ch === '.') return '.';
    return 'other';
  },
  getTransition(stateId, inputChar) {
    const cls = this.classify(inputChar);
    switch (stateId) {
      case 'q0': return cls === 'digit' ? 'q1' : 'dead';
      case 'q1':
        if (cls === 'digit') return 'q1';
        if (cls === '.') return 'q2';
        return 'dead';
      case 'q2': return cls === 'digit' ? 'q3' : 'dead';
      case 'q3': return cls === 'digit' ? 'q3' : 'dead';
      default: return 'dead';
    }
  },
};

// ─── Operator DFA ──────────────────────────────────────────
// Handles single and double-character operators
export const OPERATOR_DFA = {
  name: 'Operator DFA',
  shortName: 'Operator',
  pattern: 'op_char (op_char)?',
  description: 'Recognizes C operators. Single-char: +, -, *, /, =, <, >, !, etc. Multi-char: ==, !=, <=, >=, &&, ||, ++, --, etc.',
  examples: ['+', '-', '==', '!=', '<=', '&&', '||', '++'],
  states: [
    { id: 'q0', label: 'q0', x: 100, y: 200, isStart: true, isAccept: false, description: 'Start State' },
    { id: 'q1', label: 'q1', x: 300, y: 200, isStart: false, isAccept: true, description: 'Single Op (Accept)' },
    { id: 'q2', label: 'q2', x: 500, y: 200, isStart: false, isAccept: true, description: 'Double Op (Accept)' },
    { id: 'dead', label: 'qd', x: 300, y: 380, isStart: false, isAccept: false, description: 'Dead State' },
  ],
  transitions: [
    { from: 'q0', to: 'q1', label: 'op_char', description: 'Read an operator character' },
    { from: 'q1', to: 'q2', label: 'op_char', description: 'Read second operator character' },
    { from: 'q0', to: 'dead', label: 'other', description: 'Not an operator' },
    { from: 'q2', to: 'dead', label: 'any', description: 'Max 2 chars', isSelfLoop: false },
    { from: 'dead', to: 'dead', label: 'any', description: 'Dead state (trap)', isSelfLoop: true },
  ],
  startState: 'q0',
  acceptStates: ['q1', 'q2'],
  classify(ch) {
    if (/[+\-*/%=<>!&|^~?:]/.test(ch)) return 'op_char';
    return 'other';
  },
  getTransition(stateId, inputChar) {
    const cls = this.classify(inputChar);
    switch (stateId) {
      case 'q0': return cls === 'op_char' ? 'q1' : 'dead';
      case 'q1': return cls === 'op_char' ? 'q2' : 'dead';
      case 'q2': return 'dead';
      default: return 'dead';
    }
  },
};

// ─── Keyword DFA ───────────────────────────────────────────
// Essentially: identifier DFA + keyword-check post-match
export const KEYWORD_DFA = {
  name: 'Keyword DFA',
  shortName: 'Keyword',
  pattern: 'letter+ (must match keyword list)',
  description: 'Recognizes C language keywords. First matches an identifier pattern, then checks against the reserved keyword list (int, float, return, if, while, etc.).',
  examples: ['int', 'float', 'return', 'if', 'while', 'for', 'void', 'char'],
  states: [
    { id: 'q0', label: 'q0', x: 100, y: 200, isStart: true, isAccept: false, description: 'Start State' },
    { id: 'q1', label: 'q1', x: 300, y: 200, isStart: false, isAccept: false, description: 'Reading Letters' },
    { id: 'q2', label: 'q2', x: 500, y: 200, isStart: false, isAccept: true, description: 'Keyword Match (Accept)' },
    { id: 'q3', label: 'q3', x: 500, y: 350, isStart: false, isAccept: false, description: 'Not a Keyword (Reject)' },
    { id: 'dead', label: 'qd', x: 100, y: 380, isStart: false, isAccept: false, description: 'Dead State' },
  ],
  transitions: [
    { from: 'q0', to: 'q1', label: 'letter', description: 'Read first letter' },
    { from: 'q1', to: 'q1', label: 'letter', description: 'Continue reading', isSelfLoop: true },
    { from: 'q1', to: 'q2', label: 'end + match', description: 'End of input & keyword matches' },
    { from: 'q1', to: 'q3', label: 'end + no match', description: 'End of input but not a keyword' },
    { from: 'q0', to: 'dead', label: 'digit', description: 'Cannot start with digit' },
    { from: 'dead', to: 'dead', label: 'any', description: 'Dead state', isSelfLoop: true },
  ],
  startState: 'q0',
  acceptStates: ['q2'],
  _keywords: new Set([
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
    'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof',
    'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void',
    'volatile', 'while',
  ]),
  classify(ch) {
    if (/[a-zA-Z_]/.test(ch)) return 'letter';
    if (/[0-9]/.test(ch)) return 'digit';
    return 'other';
  },
  getTransition(stateId, inputChar) {
    const cls = this.classify(inputChar);
    if (stateId === 'q0') {
      return cls === 'letter' ? 'q1' : 'dead';
    }
    if (stateId === 'q1') {
      if (cls === 'letter' || cls === 'digit') return 'q1';
      return 'dead';
    }
    return 'dead';
  },
};

// ─── All DFAs ──────────────────────────────────────────────
export const ALL_DFAS = [IDENTIFIER_DFA, NUMBER_DFA, OPERATOR_DFA, KEYWORD_DFA];

// ─── DFA Simulator ─────────────────────────────────────────
/**
 * Simulate a DFA on the given input string, producing a step-by-step execution trace.
 * @param {Object} dfa - One of the DFA definitions above
 * @param {string} input - The input string to test
 * @returns {{ accepted: boolean, steps: Array, finalState: string }}
 */
export function simulateDFA(dfa, input) {
  const steps = [];
  let currentState = dfa.startState;

  // Step 0: Start
  steps.push({
    step: 0,
    action: `Start at ${currentState}`,
    fromState: null,
    toState: currentState,
    inputChar: null,
    transitionLabel: null,
    description: `Begin in start state ${currentState}`,
  });

  // Process each character
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const prevState = currentState;
    const nextState = dfa.getTransition(currentState, ch);
    const cls = dfa.classify(ch);

    // Find matching transition for label
    const trans = dfa.transitions.find(
      (t) => t.from === prevState && t.to === nextState
    );

    steps.push({
      step: i + 1,
      action: `Read '${ch}'`,
      fromState: prevState,
      toState: nextState,
      inputChar: ch,
      inputClass: cls,
      transitionLabel: trans ? trans.label : cls,
      description: `${prevState} --${trans ? trans.label : cls}--> ${nextState}`,
    });

    currentState = nextState;
  }

  // For Keyword DFA: post-match check
  let finalState = currentState;
  if (dfa.name === 'Keyword DFA' && currentState === 'q1') {
    const isKeyword = dfa._keywords.has(input);
    finalState = isKeyword ? 'q2' : 'q3';
    steps.push({
      step: input.length + 1,
      action: `Keyword check: "${input}"`,
      fromState: currentState,
      toState: finalState,
      inputChar: null,
      transitionLabel: isKeyword ? 'end + match' : 'end + no match',
      description: isKeyword
        ? `"${input}" is a C keyword → Accept`
        : `"${input}" is NOT a keyword → Reject`,
    });
    currentState = finalState;
  }

  // Final step
  const accepted = dfa.acceptStates.includes(currentState);
  steps.push({
    step: steps.length,
    action: 'End of input',
    fromState: currentState,
    toState: currentState,
    inputChar: null,
    transitionLabel: null,
    description: accepted
      ? `Reached accept state ${currentState}`
      : `Ended in non-accept state ${currentState}`,
    isFinal: true,
    accepted,
  });

  return { accepted, steps, finalState: currentState };
}

/**
 * Determine which DFA is most appropriate for a given token.
 * @param {Object} token - A token object from the lexer
 * @returns {Object} The matching DFA definition
 */
export function getDFAForToken(token) {
  switch (token.type) {
    case 'KEYWORD': return KEYWORD_DFA;
    case 'IDENTIFIER': return IDENTIFIER_DFA;
    case 'CONSTANT': return NUMBER_DFA;
    case 'OPERATOR': return OPERATOR_DFA;
    default: return IDENTIFIER_DFA;
  }
}
