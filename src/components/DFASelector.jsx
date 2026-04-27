import { ALL_DFAS } from '../compiler/dfa.js';

/**
 * DFASelector — Sidebar panel to choose which DFA to visualize.
 * Shows DFA metadata, pattern, examples, and highlights the active one.
 */
export default function DFASelector({ activeDFA, onSelectDFA, selectedToken }) {
  // Determine which DFA matches the selected token
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
      <h3 className="dfa-selector-title">DFA Selector</h3>
      <p className="dfa-selector-subtitle">Choose DFA to visualize</p>

      {/* Active DFA dropdown */}
      <div className="dfa-selector-active">
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

      {/* Active DFA Info */}
      {activeDFA && (
        <div className="dfa-info-card">
          <h4 className="dfa-info-title">DFA for {activeDFA.shortName}s</h4>
          <div className="dfa-info-row">
            <span className="dfa-info-label">Pattern:</span>
            <code className="dfa-info-pattern">{activeDFA.pattern}</code>
          </div>
          <div className="dfa-info-row">
            <span className="dfa-info-label">Example:</span>
            <span className="dfa-info-examples">{activeDFA.examples.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Other DFAs */}
      <div className="dfa-other-list">
        <h4 className="dfa-other-title">Other DFAs</h4>
        {ALL_DFAS.filter(d => d.name !== activeDFA?.name).map((dfa) => (
          <button
            key={dfa.name}
            className={`dfa-other-item ${recommendedName === dfa.name ? 'recommended' : ''}`}
            onClick={() => onSelectDFA(dfa)}
          >
            <span>{dfa.shortName} DFA</span>
            {recommendedName === dfa.name && (
              <span className="dfa-recommended-badge">suggested</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
