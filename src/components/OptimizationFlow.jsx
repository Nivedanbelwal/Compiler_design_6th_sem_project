import React, { useState, useEffect } from 'react';
import { Zap, ArrowRight, Copy, Check } from 'lucide-react';

/**
 * OptimizationFlow — Displays TAC and Optimized TAC side-by-side with an interactive arrow.
 * Handles structured IR objects.
 */
export default function OptimizationFlow({ tacInstructions, onOptimize, optimizedInstructions }) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      onOptimize();
      setIsOptimizing(false);
    }, 600);
  };

  const copyToClipboard = () => {
    const text = optimizedInstructions.map(instr => instr.toString()).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderInstruction = (instr) => {
    // If it has a toString helper from TACGenerator, use it. 
    // Otherwise, use a default renderer for the optimizer's new objects.
    if (typeof instr.toString === 'function' && instr.toString() !== '[object Object]') {
      return instr.toString();
    }
    
    // Fallback renderer for optimizer-created objects
    switch (instr.type) {
      case 'ASSIGN': return `${instr.target} = ${instr.op1}`;
      case 'ARITH':  return `${instr.target} = ${instr.op1} ${instr.operator} ${instr.op2}`;
      case 'PARAM':  return `param ${instr.op1}`;
      case 'CALL':   return `call ${instr.func}, ${instr.paramCount || 0}`;
      case 'RETURN': return `return ${instr.op1 || ''}`;
      case 'LABEL':  return `${instr.label}:`;
      case 'GOTO':   return `goto ${instr.label}`;
      case 'IF':     return `if ${instr.op1} goto ${instr.label}`;
      default: return JSON.stringify(instr);
    }
  };

  return (
    <div className="opt-flow-container">
      {/* Left Panel: Original TAC */}
      <div className="opt-panel original-tac">
        <div className="opt-panel-header">
          <span>Three Address Code</span>
        </div>
        <div className="opt-panel-body">
          {tacInstructions.length > 0 ? (
            <div className="tac-list">
              {tacInstructions.map((instr, i) => (
                <div key={i} className="tac-line">
                  <span className="tac-line-num">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className="tac-instr">{renderInstruction(instr)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="tac-empty">
              <Zap size={32} className="tac-empty-icon" />
              <span>No TAC generated yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Interactive Arrow */}
      <div className="opt-arrow-container">
        <button 
          className={`opt-arrow-btn ${isOptimizing ? 'spinning' : ''} ${tacInstructions.length === 0 ? 'disabled' : ''}`}
          onClick={handleOptimize}
          disabled={tacInstructions.length === 0}
          title="Optimize Code →"
        >
          {isOptimizing ? <Zap size={20} /> : <ArrowRight size={20} />}
        </button>
        <span className="opt-arrow-label">Optimize</span>
      </div>

      {/* Right Panel: Optimized TAC */}
      <div className="opt-panel optimized-tac">
        <div className="opt-panel-header">
          <span>Optimized Code</span>
          {optimizedInstructions.length > 0 && (
            <button className="tac-copy-btn" onClick={copyToClipboard}>
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          )}
        </div>
        <div className="opt-panel-body">
          {optimizedInstructions.length > 0 ? (
            <div className="tac-list optimized">
              {optimizedInstructions.map((instr, i) => (
                <div key={i} className="tac-line optimized-line">
                  <span className="tac-line-num">{(i + 1).toString().padStart(2, '0')}</span>
                  <span className="tac-instr">{renderInstruction(instr)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="tac-empty">
              <span>{isOptimizing ? 'Optimizing...' : 'Click arrow to optimize'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
