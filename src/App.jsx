import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play,
  ChevronDown,
  Terminal,
  Trash2,
  Code2,
  Braces,
  FileCode,
  Cpu,
  Scan,
  FlaskConical,
  Zap,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { DEFAULT_CODE, LANGUAGES } from './constants.js';
import { tokenize } from './compiler/lexer.js';
import { IDENTIFIER_DFA, simulateDFA, getDFAForToken, ALL_DFAS } from './compiler/dfa.js';
import { generateTAC } from './compiler/tac.js';
import { optimizeTAC } from './compiler/optimizer.js';
import TokenTable from './components/TokenTable.jsx';
import OutputSummary from './components/OutputSummary.jsx';
import DFAVisualizer from './components/DFAVisualizer.jsx';
import DFASelector from './components/DFASelector.jsx';
import ExecutionTrace from './components/ExecutionTrace.jsx';
import OptimizationFlow from './components/OptimizationFlow.jsx';
import CompilerPlayground from './components/CompilerPlayground.jsx';
import ASTVisualizer from './components/ASTVisualizer.jsx';
import AIExplanationBot from './components/AIExplanationBot.jsx';
import { tokenizeSmart, SmartParser, SmartInterpreter } from './compiler/smartCompiler.js';
import './index.css';

// Map language id to a Lucide icon
const langIconMap = {
  c: Cpu,
  python: FileCode,
  java: Braces,
};

// Default C code for Compiler Lab mode
const COMPILER_LAB_DEFAULT = `#include <stdio.h>

int main() {
    int a = 10;
    int b = 20;
    int c = a + b * 5;
    int d = (a + b) / 2;
    
    return 0;
}`;

export default function App() {
  // ─── Shared state ─────────────────────────────────────
  const [mode, setMode] = useState('lab'); // 'runner' | 'lab'

  // ─── Code Runner state ────────────────────────────────
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(DEFAULT_CODE['python']);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [outputHeight, setOutputHeight] = useState(200);
  const editorRef = useRef(null);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // ─── Compiler Lab state ───────────────────────────────
  const [labCode, setLabCode] = useState(COMPILER_LAB_DEFAULT);
  const [tokens, setTokens] = useState([]);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [analysisErrors, setAnalysisErrors] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [activeDFA, setActiveDFA] = useState(IDENTIFIER_DFA);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingTAC, setIsGeneratingTAC] = useState(false);
  const [tacInstructions, setTacInstructions] = useState([]);
  const [optimizedInstructions, setOptimizedInstructions] = useState([]);
  const [tacErrors, setTacErrors] = useState([]);
  const [isTraceExpanded, setIsTraceExpanded] = useState(false);
  const [activeLabTab, setActiveLabTab] = useState('tokens'); // 'tokens' | 'dfa' | 'trace' | 'tac' | 'ast' | 'symbols' | 'warnings' | 'aibot'
  const [smartAst, setSmartAst] = useState(null);
  const [smartSymbols, setSmartSymbols] = useState({});
  const [smartWarnings, setSmartWarnings] = useState([]);
  const labEditorRef = useRef(null);

  // ─── Mode switch handler ──────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
  }, []);

  // ═══════════════════════════════════════════════════════
  //  CODE RUNNER HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleLanguageChange = useCallback((e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(DEFAULT_CODE[newLang]);
  }, []);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    const langMeta = LANGUAGES.find((l) => l.id === language);
    const timestamp = new Date().toLocaleTimeString();

    setOutput((prev) => [
      ...prev,
      { type: 'info', text: `[${timestamp}] Sending ${langMeta.label} code to server...` },
    ]);

    try {
      const response = await fetch('http://localhost:5000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code, input: '' }),
      });

      const data = await response.json();
      const finishTime = new Date().toLocaleTimeString();

      if (data.error && !data.output) {
        setOutput((prev) => [
          ...prev,
          { type: 'error', text: data.error },
          { type: 'info', text: `[${finishTime}] Execution time: ${data.executionTime}ms` },
        ]);
      } else {
        const lines = [];
        if (data.output) {
          lines.push({ type: 'success', text: `[${finishTime}] Execution successful ✓` });
          lines.push({ type: 'default', text: '' });
          data.output.split('\n').forEach((line) => {
            lines.push({ type: 'default', text: line });
          });
        }
        if (data.error) {
          lines.push({ type: 'error', text: data.error });
        }
        lines.push({ type: 'default', text: '' });
        lines.push({ type: 'info', text: `[${finishTime}] Process finished (${data.executionTime}ms)` });
        setOutput((prev) => [...prev, ...lines]);
      }
    } catch (err) {
      const errorTime = new Date().toLocaleTimeString();
      setOutput((prev) => [
        ...prev,
        { type: 'error', text: `[${errorTime}] Connection error: ${err.message}` },
        { type: 'error', text: 'Make sure the backend server is running on port 5000.' },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [language, code]);

  const handleClear = useCallback(() => {
    setOutput([]);
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = outputHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e) => {
      if (!resizingRef.current) return;
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.max(100, Math.min(500, startHeightRef.current + delta));
      setOutputHeight(newHeight);
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [outputHeight]);

  // ═══════════════════════════════════════════════════════
  //  COMPILER LAB HANDLERS
  // ═══════════════════════════════════════════════════════

  const handleAnalyze = useCallback(() => {
    setIsAnalyzing(true);
    // Small delay for visual feedback
    setTimeout(() => {
      const result = tokenize(labCode);
      setTokens(result.tokens);
      setAnalysisStats(result.stats);
      setAnalysisErrors(result.errors);
      const firstValidToken = result.tokens.find(t => t.type !== 'DELIMITER' && t.type !== 'WHITESPACE');
      if (firstValidToken) {
        setSelectedToken(firstValidToken);
        const dfa = getDFAForToken(firstValidToken);
        setActiveDFA(dfa);
        const simResult = simulateDFA(dfa, firstValidToken.lexeme);
        setSimulationResult(simResult);
      } else {
        setSelectedToken(null);
        setSimulationResult(null);
      }

      // Smart C Parser Integration
      try {
        const smartTokens = tokenizeSmart(labCode);
        const parser = new SmartParser(smartTokens);
        const parsedAst = parser.parse();
        setSmartAst(parsedAst);

        const interpreter = new SmartInterpreter();
        const runResult = interpreter.execute(parsedAst);

        setSmartSymbols(runResult?.variables || {});
        setSmartWarnings(parsedAst.warnings || []);
      } catch (err) {
        console.error("Smart compilation failed: ", err);
      }

      setIsAnalyzing(false);
      // Reset TAC when code changes
      setTacInstructions([]);
      setOptimizedInstructions([]);
      setTacErrors([]);
    }, 300);
  }, [labCode]);

  // Trigger C compile and analyze on initial mount
  const mountRef = useRef(false);
  useEffect(() => {
    if (!mountRef.current) {
      mountRef.current = true;
      handleAnalyze();
    }
  }, [handleAnalyze]);

  // Live Debounced C Compiler Analysis (Triggers reactively as the user types!)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const result = tokenize(labCode);
      setTokens(result.tokens);
      setAnalysisStats(result.stats);
      setAnalysisErrors(result.errors);

      const firstValidToken = result.tokens.find(t => t.type !== 'DELIMITER' && t.type !== 'WHITESPACE');
      if (firstValidToken) {
        setSelectedToken(firstValidToken);
        const dfa = getDFAForToken(firstValidToken);
        setActiveDFA(dfa);
        const simResult = simulateDFA(dfa, firstValidToken.lexeme);
        setSimulationResult(simResult);
      }

      try {
        const smartTokens = tokenizeSmart(labCode);
        const parser = new SmartParser(smartTokens);
        const parsedAst = parser.parse();
        setSmartAst(parsedAst);

        const interpreter = new SmartInterpreter();
        const runResult = interpreter.execute(parsedAst);

        setSmartSymbols(runResult?.variables || {});
        setSmartWarnings(parsedAst.warnings || []);
      } catch (err) {
        console.error("Live reactive parsing failed: ", err);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [labCode]);

  const handleGenerateTAC = useCallback(() => {
    setIsGeneratingTAC(true);
    setTimeout(() => {
      const { tokens: latestTokens } = tokenize(labCode);
      const { instructions, errors } = generateTAC(latestTokens);
      setTacInstructions(instructions);
      setOptimizedInstructions([]); // Reset optimized version
      setTacErrors(errors);
      setIsGeneratingTAC(false);
    }, 400);
  }, [labCode]);

  const handleOptimizeTAC = useCallback(() => {
    if (tacInstructions.length === 0) return;
    const optimized = optimizeTAC(tacInstructions);
    setOptimizedInstructions(optimized);
  }, [tacInstructions]);

  const handleSelectToken = useCallback((token) => {
    setSelectedToken(token);
    const dfa = getDFAForToken(token);
    setActiveDFA(dfa);
    const result = simulateDFA(dfa, token.lexeme);
    setSimulationResult(result);
  }, []);

  const handleSelectDFA = useCallback((dfa) => {
    setActiveDFA(dfa);
    if (selectedToken) {
      const result = simulateDFA(dfa, selectedToken.lexeme);
      setSimulationResult(result);
    }
  }, [selectedToken]);

  const handleLabEditorMount = useCallback((editor) => {
    labEditorRef.current = editor;
  }, []);

  const handleLabClear = useCallback(() => {
    setTokens([]);
    setAnalysisStats(null);
    setAnalysisErrors([]);
    setSelectedToken(null);
    setSimulationResult(null);
    setTacInstructions([]);
    setTacErrors([]);
    setSmartAst(null);
    setSmartSymbols({});
    setSmartWarnings([]);
  }, []);

  const toggleTraceExpand = () => setIsTraceExpanded(!isTraceExpanded);

  // ─── Derived ──────────────────────────────────────────
  const currentLang = LANGUAGES.find((l) => l.id === language);
  const LangIcon = langIconMap[language] || Code2;

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className={`app-container ${isTraceExpanded ? 'trace-expanded' : ''}`}>
      {/* ─── Header / Toolbar ─── */}
      <header className="header" id="main-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <Code2 size={18} color="#fff" />
            </div>
            <span className="logo-text">Static Code Analyzer</span>
          </div>

          <div className="header-divider" />

          {/* Mode Switcher */}
          <div className="mode-switcher" id="mode-switcher">
            <button
              className={`mode-btn ${mode === 'runner' ? 'active' : ''}`}
              onClick={() => handleModeChange('runner')}
            >
              <Play size={14} />
              <span>Code Runner</span>
            </button>
            <button
              className={`mode-btn ${mode === 'lab' ? 'active' : ''}`}
              onClick={() => handleModeChange('lab')}
            >
              <FlaskConical size={14} />
              <span>Compiler Lab</span>
            </button>
          </div>

          {/* Language selector (only in runner mode) */}
          {mode === 'runner' && (
            <>
              <div className="header-divider" />
              <div className="language-selector" id="language-selector">
                <select
                  className="language-select"
                  value={language}
                  onChange={handleLanguageChange}
                  id="language-dropdown"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.icon}  {lang.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-chevron" />
              </div>
            </>
          )}

          {mode === 'lab' && (
            <>
              <div className="header-divider" />
              <span className="lab-badge">C Language • Intermediate Code</span>
            </>
          )}
        </div>

        <div className="header-right">
          {/* Status */}
          <div className="status-indicator" id="status-indicator">
            <span className="status-dot" />
            <span>Ready</span>
          </div>

          {mode === 'runner' ? (
            <button
              className="run-btn"
              onClick={handleRun}
              disabled={isRunning}
              id="run-button"
            >
              <span className="btn-icon">
                <Play size={14} fill="currentColor" />
              </span>
              <span>{isRunning ? 'Running…' : 'Run Code'}</span>
            </button>
          ) : (
            <>
              <button
                className="run-btn analyze-btn"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                id="analyze-button"
              >
                <span className="btn-icon">
                  <Scan size={14} />
                </span>
                <span>{isAnalyzing ? 'Analyzing…' : 'Analyze Code'}</span>
              </button>
              <button
                className="run-btn tac-btn"
                onClick={handleGenerateTAC}
                disabled={isGeneratingTAC}
                id="tac-button"
              >
                <span className="btn-icon">
                  <Zap size={14} />
                </span>
                <span>{isGeneratingTAC ? 'Generating…' : 'Generate TAC'}</span>
              </button>
              <button className="clear-btn-header" onClick={handleLabClear} id="clear-lab-btn">
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ─── Content Area ─── */}
      {mode === 'runner' ? (
        /* ═══ CODE RUNNER MODE ═══ */
        <main className="main-content">
          <div className="editor-container" id="code-editor">
            <Editor
              height="100%"
              language={currentLang.monacoId}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorMount}
              theme="vs-dark"
              loading={
                <div className="editor-loading">
                  <div className="loading-spinner" />
                  <span>Loading editor…</span>
                </div>
              }
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'all',
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                formatOnPaste: true,
                tabSize: 4,
                wordWrap: 'on',
                suggest: { showMethods: true, showFunctions: true },
              }}
            />
          </div>

          <div
            className="resize-handle"
            onMouseDown={handleResizeStart}
            id="resize-handle"
          />
          <div
            className="output-panel"
            style={{ height: outputHeight }}
            id="output-panel"
          >
            <div className="output-header">
              <div className="output-header-left">
                <span className="output-icon">
                  <Terminal size={14} />
                </span>
                <span className="output-title">Output</span>
              </div>
              <button className="clear-btn" onClick={handleClear} id="clear-output-btn">
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </div>

            <div className="output-body" id="output-body">
              {output.length === 0 ? (
                <div className="output-empty">
                  <Terminal size={24} className="output-empty-icon" />
                  <span>Click "Run Code" to see output here</span>
                </div>
              ) : (
                output.map((line, i) => (
                  <div key={i} className={`output-line ${line.type}`}>
                    {line.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      ) : (
        /* ═══ COMPILER LAB MODE ═══ */
        <main className="lab-content" id="compiler-lab">
          <div className="lab-split-container">
            {/* Left Side: C Source Code Editor */}
            <div className="lab-split-left">
              <div className="lab-panel lab-source full-height-panel" id="lab-source-panel">
                <div className="lab-panel-header">
                  <span className="lab-panel-num">1</span>
                  <span className="lab-panel-title">Source Code Editor (C Language)</span>
                  <div className="lab-panel-actions">
                    <button className="panel-action-btn" onClick={handleGenerateTAC} title="Generate TAC">
                      <Zap size={14} />
                    </button>
                  </div>
                </div>
                <div className="lab-editor-wrap">
                  <Editor
                    height="100%"
                    language="c"
                    value={labCode}
                    onChange={(value) => setLabCode(value || '')}
                    onMount={handleLabEditorMount}
                    theme="vs-dark"
                    loading={
                      <div className="editor-loading">
                        <div className="loading-spinner" />
                        <span>Loading C Editor…</span>
                      </div>
                    }
                    options={{
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      padding: { top: 12, bottom: 12 },
                      renderLineHighlight: 'all',
                      bracketPairColorization: { enabled: true },
                      tabSize: 4,
                      wordWrap: 'on',
                    }}
                  />
                </div>
                <button
                  className="lab-analyze-inline"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  <Scan size={14} />
                  <span>{isAnalyzing ? 'Analyzing…' : 'Analyze Code'}</span>
                </button>
              </div>
            </div>

            {/* Right Side: Horizontal Movable Bar & Dynamic Visual Output Viewer */}
            <div className="lab-split-right">
              <div className="viewer-panel">
                {/* Horizontal Movable Tab Bar */}
                <div className="horizontal-movable-bar">
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'tokens' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('tokens')}
                  >
                    Tokens
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'dfa' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('dfa')}
                  >
                    DFA Visualization
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'trace' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('trace')}
                  >
                    Execution Trace
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'tac' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('tac')}
                  >
                    Transformation Pipeline (TAC)
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'ast' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('ast')}
                  >
                    AST Tree
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'symbols' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('symbols')}
                  >
                    Symbol Table
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'warnings' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('warnings')}
                  >
                    Warnings & Alerts
                  </button>
                  <button
                    className={`nav-tab-btn ${activeLabTab === 'aibot' ? 'active' : ''}`}
                    onClick={() => setActiveLabTab('aibot')}
                  >
                    ✨ AI Assistant
                  </button>
                </div>

                {/* Viewport for Rendered Output Phase */}
                <div className="viewer-viewport">
                  {activeLabTab === 'tokens' && (
                    <div className="lab-panel lab-tokens full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">2</span>
                        <span className="lab-panel-title">Analyzed Tokens</span>
                        {tokens.length > 0 && <span className="lab-panel-badge">{tokens.length} tokens</span>}
                      </div>
                      <div className="lab-panel-body">
                        <TokenTable
                          tokens={tokens}
                          selectedTokenId={selectedToken?.id}
                          onSelectToken={handleSelectToken}
                        />
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'dfa' && (
                    <div className="lab-panel lab-dfa-viz full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">3</span>
                        <span className="lab-panel-title">DFA State Simulation</span>
                      </div>
                      <div className="dfa-split-container">
                        <DFASelector
                          activeDFA={activeDFA}
                          onSelectDFA={handleSelectDFA}
                          selectedToken={selectedToken}
                        />
                        <div className="lab-panel-body dfa-panel-body">
                          <DFAVisualizer
                            dfa={activeDFA}
                            simulationResult={simulationResult}
                            selectedToken={selectedToken}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'trace' && (
                    <div className="lab-panel lab-trace full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">4</span>
                        <span className="lab-panel-title">DFA Step Execution Trace</span>
                      </div>
                      <div className="lab-panel-body">
                        <ExecutionTrace simulationResult={simulationResult} />
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'tac' && (
                    <div className="lab-panel lab-tac full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">5</span>
                        <span className="lab-panel-title">Intermediate Code Pipeline (TAC)</span>
                      </div>
                      <div className="lab-panel-body">
                        <OptimizationFlow 
                          tacInstructions={tacInstructions} 
                          optimizedInstructions={optimizedInstructions}
                          onOptimize={handleOptimizeTAC}
                        />
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'ast' && (
                    <div className="lab-panel lab-ast full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">6</span>
                        <span className="lab-panel-title">Abstract Syntax Tree (AST) Visualizer</span>
                      </div>
                      <div className="lab-panel-body">
                        <ASTVisualizer ast={smartAst} />
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'symbols' && (
                    <div className="lab-panel lab-symbols full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">7</span>
                        <span className="lab-panel-title">Symbol Table Registry</span>
                      </div>
                      <div className="lab-panel-body" style={{ padding: '20px', overflowY: 'auto' }}>
                        {/* Educational Explanation Card */}
                        <div className="info-banner-card">
                          <span className="info-banner-emoji">📋</span>
                          <div className="info-banner-body">
                            <h4 className="info-banner-title">What is this?</h4>
                            <p className="info-banner-text">
                              The <strong>Symbol Table</strong> is a vital compiler database data structure used to store information about identifiers (such as variable names, types, scopes, and memory locations) encountered in the source code. It is populated during the Lexical/Syntax Analysis phases and checked in Semantic Analysis to ensure identifiers are declared correctly and prevent type conflicts.
                            </p>
                          </div>
                        </div>

                        {Object.keys(smartSymbols).length === 0 ? (
                          <div className="tab-pane-empty" style={{ minHeight: '150px' }}>
                            <span>No active symbols. Analyze C code with variables to populate.</span>
                          </div>
                        ) : (
                          <div className="symbols-table-wrapper" style={{ marginTop: '20px' }}>
                            <table className="symbols-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Type</th>
                                  <th>Scope</th>
                                  <th>Category</th>
                                  <th>Additional Info</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(smartSymbols).map(([name, data]) => {
                                  const nameVal = data.name || name;
                                  const typeVal = data.type || 'int';
                                  const scopeVal = data.scope || 'Local (main)';
                                  const catVal = data.category || 'Variable';
                                  const infoVal = data.additionalInfo || `Value: ${data.value} | Stack allocated`;

                                  // Choose category color dynamically for beautiful contrast
                                  let catColor = 'rgba(255, 159, 67, 0.1)';
                                  let catTextColor = '#ff9f43';
                                  if (catVal === 'Function') {
                                    catColor = 'rgba(108, 99, 255, 0.1)';
                                    catTextColor = '#6c63ff';
                                  } else if (catVal === 'Parameter') {
                                    catColor = 'rgba(0, 207, 232, 0.1)';
                                    catTextColor = '#00cfe8';
                                  }

                                  return (
                                    <tr key={name}>
                                      <td className="symbol-name-col">
                                        <span className="symbol-name-badge">{nameVal}</span>
                                      </td>
                                      <td className="symbol-type-col">
                                        <span className="symbol-type-badge" style={{ background: 'rgba(0, 214, 143, 0.1)', color: '#00d68f', border: '1px solid rgba(0, 214, 143, 0.2)' }}>
                                          {typeVal}
                                        </span>
                                      </td>
                                      <td className="symbol-scope-col">
                                        <span className="symbol-scope-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.8)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                          {scopeVal}
                                        </span>
                                      </td>
                                      <td className="symbol-cat-col">
                                        <span className="symbol-cat-badge" style={{ background: catColor, color: catTextColor, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', border: `1px solid ${catTextColor}30` }}>
                                          {catVal}
                                        </span>
                                      </td>
                                      <td className="symbol-info-col" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                                        {infoVal}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'warnings' && (
                    <div className="lab-panel lab-warnings full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">8</span>
                        <span className="lab-panel-title">Static Audit Alerts & Errors</span>
                      </div>
                      <div className="lab-panel-body" style={{ padding: '20px' }}>
                        {smartWarnings.length === 0 && analysisErrors.length === 0 ? (
                          <div className="tab-pane-empty">
                            <span>No compile warnings or syntax issues found!</span>
                          </div>
                        ) : (
                          <div className="error-list">
                            {analysisErrors.map((err, i) => (
                              <div key={i} className="error-item-alert">
                                <AlertCircle size={16} className="alert-icon-red" />
                                <div className="error-alert-body">
                                  <span className="error-alert-line">Lexer Error</span>
                                  <p className="error-alert-text">{err}</p>
                                </div>
                              </div>
                            ))}
                            {smartWarnings.map((warn, i) => (
                              <div key={i} className="warning-item-alert">
                                <AlertTriangle size={16} className="alert-icon-orange" />
                                <div className="warning-alert-body">
                                  <span className="warning-alert-line">Line {warn.line}</span>
                                  <p className="warning-alert-text">{warn.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeLabTab === 'aibot' && (
                    <div className="lab-panel lab-aibot full-height-panel animate-slide-up">
                      <div className="lab-panel-header">
                        <span className="lab-panel-num">9</span>
                        <span className="lab-panel-title">AI Assistant Bot</span>
                      </div>
                      <div className="lab-panel-body">
                        <AIExplanationBot code={labCode} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ─── Footer ─── */}
      <footer className="footer" id="footer">
        <div className="footer-left">
          {mode === 'runner' ? (
            <>
              <span className="footer-item">
                <LangIcon size={12} />
                <span>{currentLang.label}</span>
              </span>
              <span className="footer-divider" />
              <span className="footer-item">UTF-8</span>
              <span className="footer-divider" />
              <span className="footer-item">Spaces: 4</span>
            </>
          ) : (
            <>
              <span className="footer-item">
                <Cpu size={12} />
                <span>C Language</span>
              </span>
              <span className="footer-divider" />
              <span className="footer-item">Compiler Design Lab</span>
              <span className="footer-divider" />
              <span className="footer-item">
                {tokens.length > 0 ? `${tokens.length} tokens` : 'No analysis'}
              </span>
            </>
          )}
        </div>
        <div className="footer-right">
          <span className="footer-item">Static Code Analyzer v2.1 — Intermediate Code Edition</span>
        </div>
      </footer>
    </div>
  );
}
