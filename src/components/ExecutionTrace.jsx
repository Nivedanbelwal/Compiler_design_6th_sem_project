/**
 * ExecutionTrace — Step-by-step DFA execution trace panel.
 * Shows each processing step with state transitions.
 */
export default function ExecutionTrace({ simulationResult }) {
  if (!simulationResult || !simulationResult.steps || simulationResult.steps.length === 0) {
    return (
      <div className="exec-trace-empty">
        <span>Select a token to see its execution trace</span>
      </div>
    );
  }

  const { steps, accepted } = simulationResult;

  return (
    <div className="exec-trace">
      {/* Educational Explanation Card */}
      <div className="info-banner-card">
        <span className="info-banner-emoji">💡</span>
        <div className="info-banner-body">
          <h4 className="info-banner-title">What is this?</h4>
          <p className="info-banner-text">
            The <strong>Execution Trace</strong> simulates how the Lexer processes the selected token character-by-character through the Deterministic Finite Automaton (DFA). It shows the exact state transitions (e.g., q0 → q1) to prove that the lexeme matches the grammar rules during the Lexical Analysis phase.
          </p>
        </div>
      </div>

      <h3 className="exec-trace-title">Execution Steps</h3>

      <div className="exec-trace-steps">
        {steps.map((step, i) => {
          const isLast = step.isFinal;
          const stepColor = isLast
            ? (accepted ? '#00d68f' : '#ff4d6a')
            : (i === 0 ? '#6c63ff' : '#00cfe8');

          return (
            <div key={i} className={`exec-trace-step ${isLast ? (accepted ? 'step-accepted' : 'step-rejected') : ''}`}>
              <div className="exec-trace-step-header">
                <span className="exec-trace-step-num" style={{ color: stepColor }}>
                  Step {step.step}
                </span>
                <span className="exec-trace-step-action">{step.action}</span>
              </div>
              {step.description && (
                <div className="exec-trace-step-desc">
                  {step.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result Badge */}
      <div className={`exec-trace-result ${accepted ? 'result-accepted' : 'result-rejected'}`}>
        {accepted ? 'Result: Accepted ✓' : 'Result: Rejected ✗'}
      </div>
    </div>
  );
}
