import { ALL_DFAS } from '../compiler/dfa.js';
import { MousePointer2, Info } from 'lucide-react';

/**
 * DFASelector — Sidebar panel to choose which DFA to visualize.
 * Optimized for space efficiency.
 */
export default function DFASelector({ activeDFA, onSelectDFA, selectedToken }) {
  const getRecommendedDFA = () => {
    if (!selectedToken) return null;
    switch (selectedToken.type) {
      case 'KEYWORD': return 'Keyword DFA';
      case 'IDENTIFIER': return 'Identifier DFA';
      case 'CONSTANT': return 'Number DFA';
      case 'OPERATOR': return 'Operator DFA';
      default: return null;
    }
  };

  const recommendedName = getRecommendedDFA();

  return (
    <div className="dfa-selector">
      <div className="dfa-selector-section">
        <div className="dfa-section-header">
          <MousePointer2 size={14} />
          <span>Active DFA</span>
        </div>
        <select
          className="dfa-select-dropdown"
          value={activeDFA?.name || ''}
          onChange={(e) => {
            const dfa = ALL_DFAS.find(d => d.name === e.target.value);
            if (dfa) onSelectDFA(dfa);
          }}
        >
          {ALL_DFAS.map((dfa) => (
            <option key={dfa.name} value={dfa.name}>
              {dfa.shortName} DFA
            </option>
          ))}
        </select>
      </div>

      {activeDFA && (
        <div className="dfa-info-card">
          <div className="dfa-info-header">
            <Info size={12} />
            <span>{activeDFA.shortName} Info</span>
          </div>
          <div className="dfa-info-content">
            <div className="dfa-info-item">
              <span className="dfa-info-label">Pattern</span>
              <code className="dfa-info-value">{activeDFA.pattern}</code>
            </div>
            <div className="dfa-info-item">
              <span className="dfa-info-label">Example</span>
              <span className="dfa-info-value">{activeDFA.examples[0]}, ...</span>
            </div>
          </div>
        </div>
      )}

      <div className="dfa-selector-section">
        <div className="dfa-section-header">
          <span>Other Options</span>
        </div>
        <div className="dfa-chip-grid">
          {ALL_DFAS.map((dfa) => (
            <button
              key={dfa.name}
              className={`dfa-chip ${activeDFA?.name === dfa.name ? 'active' : ''} ${recommendedName === dfa.name ? 'recommended' : ''}`}
              onClick={() => onSelectDFA(dfa)}
            >
              {dfa.shortName}
              {recommendedName === dfa.name && <span className="recommended-dot" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
