import { useState } from 'react';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';

export default function AIExplanationBot({ code }) {
  const [explanations, setExplanations] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateExplanation = () => {
    setLoading(true);
    setExplanations([]);

    setTimeout(() => {
      const lines = code.split('\n');
      const results = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const lineNum = index + 1;

        // 1. Variable Assignment (let x = y)
        if (trimmed.startsWith('let ')) {
          const match = trimmed.match(/let\s+([a-zA-Z_]\w*)\s*=\s*(.*)/);
          if (match) {
            const varName = match[1];
            const expr = match[2];
            results.push({
              lineNum,
              text: `Declares variable '${varName}' and assigns it the evaluated result of: '${expr}'.`,
            });
          } else {
            results.push({
              lineNum,
              text: `Declares a new variable using the 'let' keyword.`,
            });
          }
        }
        // 2. Direct Assignment (x = y)
        else if (trimmed.includes('=') && !trimmed.startsWith('if') && !trimmed.startsWith('while')) {
          const parts = trimmed.split('=');
          const varName = parts[0].trim();
          const expr = parts[1].trim();
          results.push({
            lineNum,
            text: `Updates variable '${varName}' with the new value: '${expr}'.`,
          });
        }
        // 3. Print
        else if (trimmed.startsWith('print(')) {
          const match = trimmed.match(/print\((.*)\)/);
          if (match) {
            results.push({
              lineNum,
              text: `Outputs the evaluated value of: '${match[1]}' to standard console output.`,
            });
          } else {
            results.push({
              lineNum,
              text: `Outputs data using the built-in print() routine.`,
            });
          }
        }
        // 4. Conditional (if)
        else if (trimmed.startsWith('if ')) {
          const match = trimmed.match(/if\s*\((.*)\)/);
          const cond = match ? match[1] : 'condition';
          results.push({
            lineNum,
            text: `Evaluates conditional expression '${cond}'. If true, proceeds to the then block.`,
          });
        }
        // 5. Loops (while)
        else if (trimmed.startsWith('while ')) {
          const match = trimmed.match(/while\s*\((.*)\)/);
          const cond = match ? match[1] : 'condition';
          results.push({
            lineNum,
            text: `Begins a while loop. Repeatedly executes the body as long as '${cond}' is true.`,
          });
        }
        // 6. Closures
        else if (trimmed === '}') {
          results.push({
            lineNum,
            text: `Closes the active logical code block.`,
          });
        }
      });

      if (results.length === 0) {
        results.push({
          lineNum: 1,
          text: "Empty file. Write some mini-language code (e.g. `let a = 10` or `print(a)`) to analyze.",
        });
      }

      setExplanations(results);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="ai-bot-panel">
      <div className="ai-bot-header">
        <div className="ai-bot-avatar">
          <Bot size={18} className="ai-bot-icon" />
          <Sparkles size={10} className="ai-sparkle-icon" />
        </div>
        <div className="ai-bot-info">
          <span className="ai-bot-name">AI Compiler Helper</span>
          <span className="ai-bot-desc">Interactive Code Analyst</span>
        </div>
      </div>

      <div className="ai-bot-body">
        {loading ? (
          <div className="ai-bot-loading">
            <div className="loading-spinner-small" />
            <span>Analyzing code structure…</span>
          </div>
        ) : explanations.length === 0 ? (
          <div className="ai-bot-empty">
            <Bot size={28} className="ai-empty-icon" />
            <p>Need help understanding your custom language statements?</p>
            <button className="ai-explain-btn" onClick={generateExplanation}>
              Explain Code
            </button>
          </div>
        ) : (
          <div className="ai-explanations-list">
            {explanations.map((exp, i) => (
              <div key={i} className="ai-explanation-item">
                <span className="ai-line-badge">Line {exp.lineNum}</span>
                <p className="ai-explanation-text">{exp.text}</p>
              </div>
            ))}
            <button className="ai-reexplain-btn" onClick={generateExplanation}>
              <Sparkles size={12} />
              <span>Refresh Explanation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
