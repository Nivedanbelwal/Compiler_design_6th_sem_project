import { TOKEN_COLORS } from '../compiler/lexer.js';

/**
 * TokenTable — Displays tokenized output in a rich, scrollable table.
 * Color-coded by token type with hover effects and click-to-select.
 */
export default function TokenTable({ tokens, selectedTokenId, onSelectToken }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="token-table-empty">
        <span className="token-table-empty-icon">📋</span>
        <span>Click "Analyze Code" to see tokens here</span>
      </div>
    );
  }

  return (
    <div className="token-table-wrapper">
      <table className="token-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Token</th>
            <th>Type</th>
            <th>Lexeme</th>
            <th>Line</th>
            <th>DFA Status</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr
              key={token.id}
              className={`token-row ${selectedTokenId === token.id ? 'selected' : ''} ${token.type === 'ERROR' ? 'error-row' : ''}`}
              onClick={() => onSelectToken && onSelectToken(token)}
            >
              <td className="token-id">{token.id}</td>
              <td className="token-value" style={{ color: TOKEN_COLORS[token.type] || '#e8e8f0' }}>
                {token.token}
              </td>
              <td>
                <span
                  className="token-type-badge"
                  style={{ '--badge-color': TOKEN_COLORS[token.type] || '#888' }}
                >
                  {token.type}
                </span>
              </td>
              <td className="token-lexeme">{token.lexeme}</td>
              <td className="token-line">{token.line}</td>
              <td className="token-dfa-status">
                {token.dfaStatus === 'Accepted' ? (
                  <span className="dfa-accepted">✓ Accepted</span>
                ) : (
                  <span className="dfa-rejected">✗ Rejected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
