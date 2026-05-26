import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal, AlertTriangle, AlertCircle, Play, Sparkles, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import { tokenizeSmart, SmartParser, SmartInterpreter } from '../compiler/smartCompiler.js';
import ASTVisualizer from './ASTVisualizer.jsx';
import AIExplanationBot from './AIExplanationBot.jsx';

const DEFAULT_SMART_CODE = `let a = 10
let b = 10
let c = a + b
print(c)

if (a < b) {
    print(a)
} else {
    print(c)
}

password = 1234`;

export default function CompilerPlayground() {
  const [code, setCode] = useState(DEFAULT_SMART_CODE);
  const [activeTab, setActiveTab] = useState('output'); // 'errors' | 'warnings' | 'output' | 'ast' | 'symbols'

  // Compilation results
  const [outputLines, setOutputLines] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [symbols, setSymbols] = useState({});
  const [ast, setAst] = useState(null);

  const editorRef = useRef(null);

  // Live compilation function
  const compileAndRun = (currentCode) => {
    try {
      const tokens = tokenizeSmart(currentCode);
      const parser = new SmartParser(tokens);
      const parsedAst = parser.parse();
      setAst(parsedAst);

      // Collect syntax errors and linter warnings
      const parseErrors = parsedAst.errors || [];
      const parseWarnings = parsedAst.warnings || [];

      // Run interpreter
      const interpreter = new SmartInterpreter();
      const runResult = interpreter.execute(parsedAst);

      // Collect runtime errors
      const allErrors = [...parseErrors, ...(runResult?.errors || [])];
      setErrors(allErrors);
      setWarnings(parseWarnings);
      setOutputLines(runResult?.output || []);
      setSymbols(runResult?.variables || {});
    } catch (err) {
      console.error(err);
      setErrors([{ line: 1, message: `System compiler error: ${err.message}` }]);
    }
  };

  // Compile on editor change
  useEffect(() => {
    compileAndRun(code);
  }, [code]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const loadSample = () => {
    setCode(DEFAULT_SMART_CODE);
  };

  const handleClear = () => {
    setCode('');
    setAst(null);
    setOutputLines([]);
    setErrors([]);
    setWarnings([]);
    setSymbols({});
  };

  return (
    <div className="playground-container" id="smart-playground">
      {/* ─── Header Stats Row ─── */}
      <div className="playground-stats-row">
        <div className="stat-card">
          <span className="stat-card-title">Errors</span>
          <span className={`stat-card-value ${errors.length > 0 ? 'text-red' : ''}`}>
            {errors.length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-title">Warnings</span>
          <span className={`stat-card-value ${warnings.length > 0 ? 'text-orange' : ''}`}>
            {warnings.length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-title">Output Lines</span>
          <span className="stat-card-value">{outputLines.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-title">Status</span>
          <span className={`stat-card-value ${errors.length > 0 ? 'text-red' : 'text-green'}`}>
            {errors.length > 0 ? 'Failed' : 'Success'}
          </span>
        </div>
      </div>

      {/* ─── Main Grid Layout ─── */}
      <div className="playground-grid">
        {/* Left Column: Supports & AI Bot */}
        <div className="playground-left-col">
          {/* Badge Supports */}
          <div className="support-badge-card">
            <h4 className="support-card-title">Language Supports</h4>
            <div className="support-badge-wrap">
              <span className="support-badge">let</span>
              <span className="support-badge">print()</span>
              <span className="support-badge">if else</span>
              <span className="support-badge">while</span>
              <span className="support-badge">+ * / &lt; &gt;</span>
            </div>
          </div>

          {/* AI Bot */}
          <AIExplanationBot code={code} />
        </div>

        {/* Center Column: Editor */}
        <div className="playground-center-col">
          <div className="playground-editor-header">
            <span className="editor-file-title">source.smart</span>
            <div className="editor-live-badge">
              <span className="live-pulse-dot" />
              <span>Live Analyze</span>
            </div>
            <div className="editor-header-actions">
              <button className="editor-action-btn run-code-btn" onClick={() => compileAndRun(code)}>
                <Play size={12} fill="currentColor" />
                <span>Run Code</span>
              </button>
              <button className="editor-action-btn" onClick={loadSample}>
                <span>Load Sample</span>
              </button>
              <button className="editor-action-btn clear-btn-editor" onClick={handleClear}>
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="playground-editor-wrap">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorMount}
              theme="vs-dark"
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
        </div>

        {/* Right Column: Tabbed Output Panel */}
        <div className="playground-right-col">
          {/* Tabs Navigation */}
          <div className="playground-tabs-header">
            <button
              className={`playground-tab-btn ${activeTab === 'errors' ? 'active' : ''}`}
              onClick={() => setActiveTab('errors')}
            >
              Errors {errors.length > 0 && <span className="tab-badge-num count-red">{errors.length}</span>}
            </button>
            <button
              className={`playground-tab-btn ${activeTab === 'warnings' ? 'active' : ''}`}
              onClick={() => setActiveTab('warnings')}
            >
              Warnings {warnings.length > 0 && <span className="tab-badge-num count-orange">{warnings.length}</span>}
            </button>
            <button
              className={`playground-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              Output
            </button>
            <button
              className={`playground-tab-btn ${activeTab === 'ast' ? 'active' : ''}`}
              onClick={() => setActiveTab('ast')}
            >
              AST Tree
            </button>
            <button
              className={`playground-tab-btn ${activeTab === 'symbols' ? 'active' : ''}`}
              onClick={() => setActiveTab('symbols')}
            >
              Symbols
            </button>
          </div>

          {/* Tab Body Contents */}
          <div className="playground-tabs-body">
            {/* Tab: Errors */}
            {activeTab === 'errors' && (
              <div className="tab-pane-content pane-errors">
                {errors.length === 0 ? (
                  <div className="tab-pane-empty">
                    <AlertCircle size={28} className="text-green-muted" />
                    <span>No errors detected</span>
                  </div>
                ) : (
                  <div className="error-list">
                    {errors.map((err, i) => (
                      <div key={i} className="error-item-alert">
                        <AlertCircle size={16} className="alert-icon-red" />
                        <div className="error-alert-body">
                          <span className="error-alert-line">Line {err.line}</span>
                          <p className="error-alert-text">{err.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Warnings */}
            {activeTab === 'warnings' && (
              <div className="tab-pane-content pane-warnings">
                {warnings.length === 0 ? (
                  <div className="tab-pane-empty">
                    <ShieldAlert size={28} className="text-green-muted" />
                    <span>No security issues or warnings found</span>
                  </div>
                ) : (
                  <div className="warning-list">
                    {warnings.map((warn, i) => (
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
            )}

            {/* Tab: Output */}
            {activeTab === 'output' && (
              <div className="tab-pane-content pane-output">
                {outputLines.length === 0 ? (
                  <div className="tab-pane-empty">
                    <Terminal size={28} className="text-muted" />
                    <span>No printed outputs yet. Use print() to log variables.</span>
                  </div>
                ) : (
                  <div className="console-outputs">
                    {outputLines.map((line, i) => (
                      <div key={i} className="console-line-bubble">
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: AST Tree */}
            {activeTab === 'ast' && (
              <div className="tab-pane-content pane-ast">
                <ASTVisualizer ast={ast} />
              </div>
            )}

            {/* Tab: Symbols */}
            {activeTab === 'symbols' && (
              <div className="tab-pane-content pane-symbols">
                {Object.keys(symbols).length === 0 ? (
                  <div className="tab-pane-empty">
                    <BarChart2 size={28} className="text-muted" />
                    <span>No active symbols. Assign variables to populate.</span>
                  </div>
                ) : (
                  <div className="symbols-table-wrapper">
                    <h3 className="symbols-table-title">Symbol Table</h3>
                    <table className="symbols-table">
                      <thead>
                        <tr>
                          <th>Variable</th>
                          <th>Value</th>
                          <th>Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(symbols).map(([name, data]) => (
                          <tr key={name}>
                            <td className="symbol-name-col">
                              <span className="symbol-name-badge">{name}</span>
                            </td>
                            <td className="symbol-value-col">{data.value}</td>
                            <td className="symbol-type-col">
                              <span className="symbol-type-badge">{data.type}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
