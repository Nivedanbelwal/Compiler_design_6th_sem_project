import { useState, useRef, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { DEFAULT_CODE, LANGUAGES } from './constants.js';
import { tokenize } from './compiler/lexer.js';
import { IDENTIFIER_DFA, simulateDFA, getDFAForToken, ALL_DFAS } from './compiler/dfa.js';
import TokenTable from './components/TokenTable.jsx';
import OutputSummary from './components/OutputSummary.jsx';
import DFAVisualizer from './components/DFAVisualizer.jsx';
import DFASelector from './components/DFASelector.jsx';
import ExecutionTrace from './components/ExecutionTrace.jsx';
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
    int x = 42;
    float pi = 3.14159;

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
      setSelectedToken(null);
      setSimulationResult(null);
      setIsAnalyzing(false);
    }, 300);
  }, [labCode]);

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
  }, []);

  // ─── Derived ──────────────────────────────────────────
  const currentLang = LANGUAGES.find((l) => l.id === language);
  const LangIcon = langIconMap[language] || Code2;

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="app-container">
      {/* ─── Header / Toolbar ─── */}
      <header className="header" id="main-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <Code2 size={18} color="#fff" />
            </div>
            <span className="logo-text">Codeezy</span>
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
              <span className="lab-badge">C Language • Lexical Analysis</span>
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
          {/* Row 1: Source + Tokens + DFA Selector */}
          <div className="lab-grid">
            {/* Panel 1: Source Code Editor */}
            <div className="lab-panel lab-source" id="lab-source-panel">
              <div className="lab-panel-header">
                <span className="lab-panel-num">1</span>
                <span className="lab-panel-title">Source Code</span>
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
                      <span>Loading…</span>
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

            {/* Panel 2: Token Table */}
            <div className="lab-panel lab-tokens" id="lab-tokens-panel">
              <div className="lab-panel-header">
                <span className="lab-panel-num">2</span>
                <span className="lab-panel-title">Tokens</span>
                {tokens.length > 0 && (
                  <span className="lab-panel-badge">{tokens.length} tokens</span>
                )}
              </div>
              <div className="lab-panel-body">
                <TokenTable
                  tokens={tokens}
                  selectedTokenId={selectedToken?.id}
                  onSelectToken={handleSelectToken}
                />
              </div>
            </div>

            {/* Panel: DFA Selector */}
            <div className="lab-panel lab-dfa-selector" id="lab-dfa-selector-panel">
              <DFASelector
                activeDFA={activeDFA}
                onSelectDFA={handleSelectDFA}
                selectedToken={selectedToken}
              />
            </div>

            {/* Panel 3: Output Summary */}
            <div className="lab-panel lab-output" id="lab-output-panel">
              <div className="lab-panel-header">
                <span className="lab-panel-num">3</span>
                <span className="lab-panel-title">Output</span>
              </div>
              <div className="lab-panel-body">
                <OutputSummary stats={analysisStats} errors={analysisErrors} />
              </div>
            </div>

            {/* Panel 4: DFA Visualization */}
            <div className="lab-panel lab-dfa-viz" id="lab-dfa-viz-panel">
              <div className="lab-panel-header">
                <span className="lab-panel-num">4</span>
                <span className="lab-panel-title">DFA Visualization</span>
              </div>
              <div className="lab-panel-body dfa-panel-body">
                <DFAVisualizer
                  dfa={activeDFA}
                  simulationResult={simulationResult}
                  selectedToken={selectedToken}
                />
              </div>
            </div>

            {/* Panel: Execution Trace */}
            <div className="lab-panel lab-trace" id="lab-trace-panel">
              <ExecutionTrace simulationResult={simulationResult} />
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
          <span className="footer-item">Codeezy v2.0</span>
        </div>
      </footer>
    </div>
  );
}
