import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * DFAVisualizer — Renders an animated SVG state diagram for a given DFA.
 * Supports play/pause/step/reset controls and highlights active state & transitions.
 */
export default function DFAVisualizer({ dfa, simulationResult, selectedToken }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [speed, setSpeed] = useState(1000); // ms per step
  const intervalRef = useRef(null);
  const svgRef = useRef(null);

  const steps = simulationResult?.steps || [];
  const totalSteps = steps.length;

  // Reset when DFA or simulation changes
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [dfa, simulationResult]);

  // Play/Pause logic
  useEffect(() => {
    if (isPlaying && currentStep < totalSteps - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            clearInterval(intervalRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, totalSteps, currentStep]);

  const handlePlay = () => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  };
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };
  const handleStep = () => {
    setIsPlaying(false);
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  if (!dfa) {
    return (
      <div className="dfa-viz-empty">
        <span className="dfa-viz-empty-icon">🔄</span>
        <span>Select a token to visualize its DFA</span>
      </div>
    );
  }

  // Current step info
  const step = steps[currentStep] || {};
  const activeState = step.toState || dfa.startState;
  const prevState = step.fromState;

  return (
    <div className="dfa-visualizer">
      {/* Header */}
      <div className="dfa-viz-header">
        <div className="dfa-viz-header-left">
          <span className="dfa-viz-label">Input Token:</span>
          <span className="dfa-viz-token">{selectedToken?.lexeme || '—'}</span>
          <span className="dfa-viz-label" style={{ marginLeft: 16 }}>Token Type:</span>
          <span className="dfa-viz-token-type">{selectedToken?.type || '—'}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="dfa-svg-container">
        <svg
          ref={svgRef}
          viewBox="0 0 700 450"
          className="dfa-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#00d68f" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Start arrow */}
          {dfa.states.filter(s => s.isStart).map(s => (
            <g key={`start-${s.id}`}>
              <line
                x1={s.x - 80} y1={s.y}
                x2={s.x - 40} y2={s.y}
                stroke="#888" strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              {showLabels && (
                <text x={s.x - 90} y={s.y - 10} fill="#aaa" fontSize="13" fontFamily="Inter" fontWeight="500">
                  Start
                </text>
              )}
            </g>
          ))}

          {/* Transitions */}
          {dfa.transitions.map((t, i) => {
            const fromState = dfa.states.find(s => s.id === t.from);
            const toState = dfa.states.find(s => s.id === t.to);
            if (!fromState || !toState) return null;

            const isActiveTransition = step.fromState === t.from && step.toState === t.to && currentStep > 0;

            if (t.isSelfLoop) {
              // Self-loop arc
              return (
                <g key={`trans-${i}`}>
                  <path
                    d={`M ${toState.x - 15} ${toState.y - 35} C ${toState.x - 40} ${toState.y - 90}, ${toState.x + 40} ${toState.y - 90}, ${toState.x + 15} ${toState.y - 35}`}
                    fill="none"
                    stroke={isActiveTransition ? '#00d68f' : '#555'}
                    strokeWidth={isActiveTransition ? 2.5 : 1.5}
                    markerEnd={isActiveTransition ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    className={isActiveTransition ? 'transition-active' : ''}
                  />
                  {showLabels && (
                    <text
                      x={toState.x}
                      y={toState.y - 80}
                      fill={isActiveTransition ? '#00d68f' : '#999'}
                      fontSize="12"
                      fontFamily="Inter"
                      textAnchor="middle"
                      fontWeight={isActiveTransition ? '600' : '400'}
                    >
                      {t.label}
                    </text>
                  )}
                </g>
              );
            }

            // Straight or curved transition
            const dx = toState.x - fromState.x;
            const dy = toState.y - fromState.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / dist;
            const uy = dy / dist;
            const startX = fromState.x + ux * 35;
            const startY = fromState.y + uy * 35;
            const endX = toState.x - ux * 38;
            const endY = toState.y - uy * 38;

            // Offset for parallel edges
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const perpX = -uy * 20;
            const perpY = ux * 20;

            return (
              <g key={`trans-${i}`}>
                <path
                  d={`M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY}, ${endX} ${endY}`}
                  fill="none"
                  stroke={isActiveTransition ? '#00d68f' : '#555'}
                  strokeWidth={isActiveTransition ? 2.5 : 1.5}
                  markerEnd={isActiveTransition ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  className={isActiveTransition ? 'transition-active' : ''}
                />
                {showLabels && (
                  <text
                    x={midX + perpX * 1.3}
                    y={midY + perpY * 1.3 - 5}
                    fill={isActiveTransition ? '#00d68f' : '#999'}
                    fontSize="12"
                    fontFamily="Inter"
                    textAnchor="middle"
                    fontWeight={isActiveTransition ? '600' : '400'}
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* States */}
          {dfa.states.map((state) => {
            const isActive = state.id === activeState;
            const isAccept = state.isAccept;

            return (
              <g key={state.id} className={isActive ? 'state-active' : ''}>
                {/* Glow for active state */}
                {isActive && (
                  <circle
                    cx={state.x} cy={state.y} r={38}
                    fill="none"
                    stroke="#00d68f"
                    strokeWidth="2"
                    opacity="0.3"
                    filter="url(#glow)"
                  />
                )}
                {/* Accept state double circle */}
                {isAccept && (
                  <circle
                    cx={state.x} cy={state.y} r={38}
                    fill="none"
                    stroke={isActive ? '#00d68f' : '#555'}
                    strokeWidth="2"
                  />
                )}
                {/* Main circle */}
                <circle
                  cx={state.x} cy={state.y} r={32}
                  fill={isActive ? 'rgba(0, 214, 143, 0.1)' : 'rgba(30, 30, 50, 0.8)'}
                  stroke={isActive ? '#00d68f' : (isAccept ? '#00d68f' : '#555')}
                  strokeWidth={isActive ? 3 : 2}
                />
                {/* State label */}
                <text
                  x={state.x} y={state.y + 5}
                  fill={isActive ? '#00d68f' : '#e8e8f0'}
                  fontSize="16"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {state.label}
                </text>
                {/* State description below */}
                {showLabels && (
                  <text
                    x={state.x} y={state.y + 55}
                    fill="#777"
                    fontSize="11"
                    fontFamily="Inter"
                    textAnchor="middle"
                  >
                    {state.description}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controls */}
      <div className="dfa-controls">
        <div className="dfa-controls-left">
          <button className="dfa-ctrl-btn" onClick={handlePlay} title="Play" disabled={isPlaying}>▶ Play</button>
          <button className="dfa-ctrl-btn" onClick={handlePause} title="Pause" disabled={!isPlaying}>⏸ Pause</button>
          <button className="dfa-ctrl-btn" onClick={handleReset} title="Reset">⏪ Reset</button>
          <button className="dfa-ctrl-btn" onClick={handleStep} title="Step" disabled={currentStep >= totalSteps - 1}>▶▶ Step</button>
        </div>
        <div className="dfa-controls-right">
          <label className="dfa-label-toggle">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            <span>Show Labels</span>
          </label>
        </div>
      </div>

      {/* Timeline */}
      <DFATimeline steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
    </div>
  );
}

/**
 * DFATimeline — Visual progress bar showing DFA state sequence.
 */
function DFATimeline({ steps, currentStep, onStepClick }) {
  if (!steps || steps.length === 0) return null;

  // Extract unique state transitions for the timeline
  const stateSequence = steps
    .filter(s => s.toState)
    .map(s => s.toState);

  return (
    <div className="dfa-timeline">
      <div className="dfa-timeline-track">
        {stateSequence.map((state, i) => {
          const isActive = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={i} className="dfa-timeline-segment" onClick={() => onStepClick(i)}>
              <div className={`dfa-timeline-node ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}>
                {state}
              </div>
              {i < stateSequence.length - 1 && (
                <div className={`dfa-timeline-connector ${isActive ? 'active' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
