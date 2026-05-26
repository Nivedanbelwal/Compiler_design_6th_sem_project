import React from 'react';
import { FileCode, AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const TACPanel = ({ instructions, errors }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = instructions.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tac-panel">
      <div className="lab-panel-header">
        <span className="lab-panel-num">5</span>
        <span className="lab-panel-title">Three Address Code</span>
        {instructions.length > 0 && (
          <button className="tac-copy-btn" onClick={handleCopy} title="Copy TAC">
            {copied ? <Check size={14} color="#00d68f" /> : <Copy size={14} />}
          </button>
        )}
      </div>
      <div className="lab-panel-body tac-body">
        {errors.length > 0 && (
          <div className="tac-errors">
            {errors.map((err, i) => (
              <div key={i} className="tac-error-item">
                <AlertCircle size={14} />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {instructions.length === 0 ? (
          <div className="tac-empty">
            <FileCode size={32} className="tac-empty-icon" />
            <span>Click "Generate 3-Address Code" to see the intermediate representation.</span>
            <p className="tac-empty-hint">Supports assignments and arithmetic expressions.</p>
          </div>
        ) : (
          <div className="tac-list">
            {instructions.map((instr, i) => (
              <div key={i} className="tac-line">
                <span className="tac-line-num">{(i + 1).toString().padStart(2, '0')}</span>
                <span className="tac-instr">{instr}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TACPanel;
