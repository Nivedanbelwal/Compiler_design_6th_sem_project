/**
 * Compiler-Grade Optimizer for Three Address Code (TAC)
 * Implements: 
 * 1. Constant Propagation & Folding (Global)
 * 2. If-Else Control Flow Simplification
 * 3. Loop-Safe Liveness Analysis (Backward Data-Flow)
 * 4. Advanced Dead Code Elimination
 * 5. Semantics Preservation for Loops, Jumps, and Function Calls
 */

import { TAC_TYPES } from './tac.js';

export function optimizeTAC(instructions) {
  let currentInstructions = [...instructions];
  let changed = true;
  let iterations = 0;
  const maxIterations = 10; // High enough for complex dependency chains

  while (changed && iterations < maxIterations) {
    changed = false;
    const previous = serialize(currentInstructions);

    // Phase 1: Constant Propagation & Algebraic Simplification
    currentInstructions = propagateAndFold(currentInstructions);

    // Phase 2: Control Flow Simplification (If-Else)
    currentInstructions = simplifyControlFlow(currentInstructions);

    // Phase 3: Dead Code Elimination (Loop-Safe Liveness Analysis)
    currentInstructions = eliminateDeadCode(currentInstructions);

    if (serialize(currentInstructions) !== previous) {
      changed = true;
    }
    iterations++;
  }

  return currentInstructions;
}

/**
 * Helper to check if instructions changed
 */
function serialize(instructions) {
  return instructions.map(i => i.toString()).join('\n');
}

/**
 * Constant Propagation, Variable Copy Propagation, Algebraic Simplification, and CSE
 */
function propagateAndFold(instructions) {
  const constants = {};
  const copies = {};
  const expressions = {};

  return instructions.map(instr => {
    let newInstr = { ...instr };

    // 1. Propagate known constants and variable copies into operands
    if (newInstr.op1) {
      if (constants[newInstr.op1] !== undefined) {
        newInstr.op1 = constants[newInstr.op1];
      } else if (copies[newInstr.op1] !== undefined) {
        newInstr.op1 = copies[newInstr.op1];
      }
    }
    if (newInstr.op2) {
      if (constants[newInstr.op2] !== undefined) {
        newInstr.op2 = constants[newInstr.op2];
      } else if (copies[newInstr.op2] !== undefined) {
        newInstr.op2 = copies[newInstr.op2];
      }
    }

    // 2. Fold Arithmetic & Algebraic Simplifications
    if (newInstr.type === TAC_TYPES.ARITH) {
      const folded = foldArithmetic(newInstr);
      if (folded !== newInstr) newInstr = folded;
    }

    // 3. Common Subexpression Elimination (CSE)
    if (newInstr.type === TAC_TYPES.ARITH) {
      // Commutative operator handling (+ and *)
      let opA = newInstr.op1;
      let opB = newInstr.op2;
      if (['+', '*'].includes(newInstr.operator)) {
        if (opA > opB) {
          const temp = opA;
          opA = opB;
          opB = temp;
        }
      }
      const exprKey = `${opA} ${newInstr.operator} ${opB}`;
      if (expressions[exprKey] !== undefined) {
        // Redundant computation found! Replace with copy assignment
        newInstr = {
          ...newInstr,
          type: TAC_TYPES.ASSIGN,
          op1: expressions[exprKey],
          op2: undefined
        };
      } else {
        // Record expression
        expressions[exprKey] = newInstr.target;
      }
    }

    // 4. Update Tables (Constants, Copies, and Expression invalidation)
    if (newInstr.type === TAC_TYPES.ASSIGN) {
      if (isConstant(newInstr.op1)) {
        constants[newInstr.target] = newInstr.op1;
        delete copies[newInstr.target];
      } else if (isVariable(newInstr.op1)) {
        copies[newInstr.target] = newInstr.op1;
        delete constants[newInstr.target];
      } else {
        delete constants[newInstr.target];
        delete copies[newInstr.target];
      }
    } else if (newInstr.target) {
      // Reassignment to unknown value invalidates constant/copy
      delete constants[newInstr.target];
      delete copies[newInstr.target];
    }

    return newInstr;
  });
}

function foldArithmetic(instr) {
  const { op1, op2, operator } = instr;
  const val1 = parseFloat(op1);
  const val2 = parseFloat(op2);
  const is1Num = !isNaN(val1) && isFinite(op1);
  const is2Num = !isNaN(val2) && isFinite(op2);

  // Constant Folding
  if (is1Num && is2Num) {
    let result;
    switch (operator) {
      case '+': result = val1 + val2; break;
      case '-': result = val1 - val2; break;
      case '*': result = val1 * val2; break;
      case '/': result = val2 !== 0 ? val1 / val2 : 0; break;
      case '<': result = val1 < val2 ? '1' : '0'; break;
      case '>': result = val1 > val2 ? '1' : '0'; break;
      case '==': result = val1 == val2 ? '1' : '0'; break;
      case '!=': result = val1 != val2 ? '1' : '0'; break;
      default: return instr;
    }
    return { ...instr, type: TAC_TYPES.ASSIGN, op1: result.toString() };
  }

  // Algebraic Simplification
  if (operator === '+' && op2 === '0') return { ...instr, type: TAC_TYPES.ASSIGN, op1: op1 };
  if (operator === '+' && op1 === '0') return { ...instr, type: TAC_TYPES.ASSIGN, op1: op2 };
  if (operator === '*' && op2 === '1') return { ...instr, type: TAC_TYPES.ASSIGN, op1: op1 };
  if (operator === '*' && op1 === '1') return { ...instr, type: TAC_TYPES.ASSIGN, op1: op2 };
  if (operator === '*' && (op1 === '0' || op2 === '0')) return { ...instr, type: TAC_TYPES.ASSIGN, op1: '0' };

  return instr;
}

/**
 * Simplifies jumps based on constant conditions
 */
function simplifyControlFlow(instructions) {
  return instructions.map(instr => {
    if (instr.type === TAC_TYPES.IF && isConstant(instr.op1)) {
      const val = parseFloat(instr.op1);
      const isZero = val === 0;
      
      // ifFalse condition goto L
      if (instr.operator === '==' && instr.op2 === '0') {
        if (isZero) return { ...instr, type: TAC_TYPES.GOTO }; // 0 == 0 is always true
        return { type: 'NOP', toString: () => '// redundant branch' }; // 5 == 0 is always false
      }
      
      // if condition goto L
      if (!isZero) return { ...instr, type: TAC_TYPES.GOTO };
      return { type: 'NOP', toString: () => '// redundant branch' };
    }
    return instr;
  });
}

/**
 * Loop-Safe Backward Liveness Analysis
 */
function eliminateDeadCode(instructions) {
  const globallyLive = new Set();
  
  // Pass 1: Global Usage Scan (Conservative for loops)
  instructions.forEach(instr => {
    if (instr.type === TAC_TYPES.IF || instr.type === TAC_TYPES.PARAM || instr.type === TAC_TYPES.RETURN || instr.type === TAC_TYPES.CALL) {
      if (isVariable(instr.op1)) globallyLive.add(instr.op1);
      if (isVariable(instr.op2)) globallyLive.add(instr.op2);
    }
    if (instr.type === TAC_TYPES.ARITH && ['<', '>', '==', '!=', '<=', '>='].includes(instr.operator)) {
      if (isVariable(instr.op1)) globallyLive.add(instr.op1);
      if (isVariable(instr.op2)) globallyLive.add(instr.op2);
    }
  });

  const live = new Set(globallyLive);
  const toRemove = new Set();

  // Pass 2: Backward pass for liveness
  for (let i = instructions.length - 1; i >= 0; i--) {
    const instr = instructions[i];
    if (instr.type === 'NOP') {
      toRemove.add(i);
      continue;
    }

    const usedInThisInstr = [];
    if (instr.op1 && isVariable(instr.op1)) usedInThisInstr.push(instr.op1);
    if (instr.op2 && isVariable(instr.op2)) usedInThisInstr.push(instr.op2);

    if (instr.target) {
      const isLive = live.has(instr.target);
      const isEssential = hasSideEffect(instr);

      if (!isLive && !isEssential) {
        toRemove.add(i);
      } else {
        // Variable is defined, so it's born here
        if (!globallyLive.has(instr.target)) {
          live.delete(instr.target);
        }
      }
    }

    // Mark operands as live
    usedInThisInstr.forEach(v => live.add(v));
  }

  return instructions.filter((instr, index) => {
    if (hasSideEffect(instr)) return true;
    return !toRemove.has(index);
  });
}

function hasSideEffect(instr) {
  return (
    instr.type === TAC_TYPES.CALL ||
    instr.type === TAC_TYPES.PARAM ||
    instr.type === TAC_TYPES.GOTO ||
    instr.type === TAC_TYPES.IF ||
    instr.type === TAC_TYPES.LABEL ||
    instr.type === TAC_TYPES.RETURN
  );
}

function isVariable(val) {
  if (val === undefined || val === null || val === '') return false;
  const s = String(val);
  return isNaN(parseFloat(s)) && !s.startsWith('"');
}

function isConstant(val) {
  if (val === undefined || val === null) return false;
  return !isNaN(parseFloat(val)) && isFinite(val);
}
