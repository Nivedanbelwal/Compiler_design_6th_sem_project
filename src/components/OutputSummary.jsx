/**
 * OutputSummary — Shows lexical analysis results summary.
 * Displays token counts, error count, status badge, and type breakdown.
 */
export default function OutputSummary({ stats, errors }) {
  if (!stats) {
    return (
      <div className="output-summary-empty">
        <span className="output-summary-empty-icon">📊</span>
        <span>Analysis output will appear here</span>
      </div>
    );
  }

  const hasErrors = errors && errors.length > 0;
  const typeOrder = ['KEYWORD', 'IDENTIFIER', 'CONSTANT', 'STRING_LITERAL', 'OPERATOR', 'DELIMITER', 'PREPROCESSOR'];
  const typeLabels = {
    KEYWORD: 'Keywords',
    IDENTIFIER: 'Identifiers',
    CONSTANT: 'Constants',
    STRING_LITERAL: 'Strings',
    CHAR_LITERAL: 'Char Literals',
    OPERATOR: 'Operators',
    DELIMITER: 'Delimiters',
    PREPROCESSOR: 'Preprocessor',
    ERROR: 'Errors',
  };

  return (
    <div className="output-summary">
      {/* Status Banner */}
      <div className={`analysis-status ${hasErrors ? 'has-errors' : 'success'}`}>
        <span className="analysis-status-icon">{hasErrors ? '⚠️' : '✓'}</span>
        <span>{hasErrors ? 'Analysis Complete (with errors)' : 'Analysis Complete!'}</span>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Total Tokens</span>
          <span className="stat-value">{stats.totalTokens}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Errors</span>
          <span className={`stat-value ${stats.errors > 0 ? 'stat-error' : ''}`}>{stats.errors}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Status</span>
          <span className={`stat-value ${hasErrors ? 'stat-error' : 'stat-success'}`}>
            {hasErrors ? 'Has Errors' : 'All tokens are valid ✓'}
          </span>
        </div>
      </div>

      {/* Type Breakdown */}
      <div className="type-breakdown">
        <h4 className="type-breakdown-title">Token Types:</h4>
        <ul className="type-breakdown-list">
          {typeOrder.map((type) => {
            const count = stats.byType[type];
            if (!count) return null;
            return (
              <li key={type} className="type-breakdown-item">
                <span className="type-dot" style={{ '--dot-color': getTypeColor(type) }} />
                <span>{typeLabels[type] || type}: {count}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Success/Error Banner */}
      <div className={`analysis-banner ${hasErrors ? 'banner-error' : 'banner-success'}`}>
        {hasErrors ? 'Lexical Analysis has errors ❌' : 'Lexical Analysis Successful 🎉'}
      </div>
    </div>
  );
}

function getTypeColor(type) {
  const colors = {
    KEYWORD: '#6c63ff',
    IDENTIFIER: '#00d68f',
    CONSTANT: '#ff9f43',
    STRING_LITERAL: '#ff9f43',
    OPERATOR: '#e06c75',
    DELIMITER: '#abb2bf',
    PREPROCESSOR: '#c678dd',
    ERROR: '#ff4d6a',
  };
  return colors[type] || '#888';
}
