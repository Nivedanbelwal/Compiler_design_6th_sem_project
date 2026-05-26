<h1 align="center">
  <img src="https://img.icons8.com/fluency/48/source-code.png" width="36" />
  Static Code Analyzer — Compiler Design Lab
</h1>

<p align="center">
  <b>An interactive, visual compiler design platform for learning lexical analysis, DFA simulation, and code execution.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Monaco_Editor-Integrated-007ACC?logo=visualstudiocode&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## 🎯 What is Static Code Analyzer?

Static Code Analyzer is a **web-based Compiler Design Lab** that helps students and developers understand how compilers work — from source code to tokens to DFA state machines. It features **two modes**:

| Mode | Description |
|------|-------------|
| **🧪 Compiler Lab** | Tokenize C code, visualize DFA state machines, inspect token tables, and trace DFA execution step-by-step |
| **▶ Code Runner** | Write and execute C, Python, or Java code with real-time output |

---

## ✨ Features

### 🔬 Compiler Lab Mode
- **C Language Lexer** — Tokenizes C source code into Keywords, Identifiers, Constants, Operators, Delimiters, Preprocessor directives, String/Char literals
- **Token Table** — Color-coded, interactive table showing every token with type, lexeme, line number, and DFA acceptance status
- **DFA Visualization** — SVG-rendered state diagrams with animated transitions, glow effects, and state highlights
- **DFA Simulator** — Step-by-step execution trace showing how each character is processed through the DFA
- **4 Pre-built DFAs**:
  - 🔵 **Identifier DFA** — `letter (letter | digit)*`
  - 🟠 **Number DFA** — `digit+ (. digit+)?`
  - 🔴 **Operator DFA** — `op_char (op_char)?`
  - 🟣 **Keyword DFA** — Identifier + keyword list check
- **Playback Controls** — Play, Pause, Step, Reset with timeline visualization
- **Analysis Summary** — Token count, type breakdown, error detection, success/failure banner

### ▶ Code Runner Mode
- **Multi-language Support** — C (GCC), Python, Java (JDK)
- **Monaco Editor** — VS Code-grade editor with syntax highlighting, autocomplete, bracket matching
- **Real-time Execution** — Send code to backend, get output with execution time
- **Rate Limiting** — 5 executions per minute per IP

### 🎨 Design
- Dark theme with glassmorphism effects and gradient accents
- Smooth micro-animations and transitions
- Responsive 6-panel grid layout
- JetBrains Mono + Inter typography

---

## 🖥️ Screenshots

### Compiler Lab — Token Analysis
```
┌──────────────────┬───────────────────┬──────────────┐
│  1. Source Code   │  2. Token Table   │  DFA Selector│
│     Editor        │     + Scroll      │  + DFA Info  │
├──────────────────┼───────────────────┤              │
│  3. Output        │  4. DFA Visualizer│  Execution   │
│     Summary       │     + Controls    │  Trace       │
└──────────────────┴───────────────────┴──────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **GCC** (for C compilation) — [MinGW](https://www.mingw-w64.org/) on Windows
- **Python** ≥ 3.x (for Python execution)
- **JDK** ≥ 11 (for Java execution)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Nivedanbelwal/Compiler_design_6th_sem_project.git
cd Compiler_design_6th_sem_project

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server
npm install
cd ..
```

### Running the App

```bash
# Terminal 1 — Start the frontend (Vite dev server)
npm run dev

# Terminal 2 — Start the backend (Express API)
cd server
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## 📁 Project Structure

```
Compiler-design/
├── index.html                  # Entry point with SEO meta tags
├── vite.config.js              # Vite configuration
├── package.json                # Frontend dependencies
│
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Main app with mode switcher + layouts
│   ├── constants.js            # Language configs & default code snippets
│   ├── index.css               # Complete design system (~1400 lines)
│   │
│   ├── compiler/               # 🔬 Compiler engines
│   │   ├── lexer.js            # C language tokenizer
│   │   └── dfa.js              # DFA definitions + simulator
│   │
│   └── components/             # 🧩 UI components
│       ├── TokenTable.jsx      # Token display table
│       ├── OutputSummary.jsx   # Analysis stats panel
│       ├── DFAVisualizer.jsx   # SVG DFA state diagram + timeline
│       ├── DFASelector.jsx     # DFA type selector sidebar
│       └── ExecutionTrace.jsx  # Step-by-step DFA trace
│
└── server/
    ├── index.js                # Express API server
    ├── executor.js             # Code execution engine (C/Python/Java)
    └── package.json            # Backend dependencies
```

---

## 🧪 Sample Test Code

Paste this into the Compiler Lab to test all DFA types:

```c
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int num = 10;
    float result = 3.14;

    for (int i = 0; i < num; i++) {
        if (i % 2 == 0) {
            result += i * 1.5;
        }
    }

    printf("Result: %f\n", result);
    return 0;
}
```

**Click on different tokens to see their DFA:**

| Token | DFA | Trace |
|-------|-----|-------|
| `factorial`, `num`, `i` | Identifier | `q0 → q1 (loop) → Accept` |
| `10`, `3.14`, `1.5` | Number | Integer: `q0→q1`, Float: `q0→q1→q2→q3` |
| `<=`, `==`, `+=`, `%` | Operator | Single: `q0→q1`, Double: `q0→q1→q2` |
| `int`, `float`, `for`, `if`, `return` | Keyword | `q0→q1(loop)→q2 (keyword match)` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, Monaco Editor |
| **Styling** | Vanilla CSS (custom design system) |
| **Icons** | Lucide React |
| **Fonts** | Inter, JetBrains Mono (Google Fonts) |
| **Backend** | Node.js, Express 5 |
| **Execution** | GCC, Python, JDK (local compilers) |

---

## 📚 Compiler Design Concepts Covered

- [x] **Lexical Analysis** — Tokenization of source code
- [x] **DFA (Deterministic Finite Automata)** — State machine visualization
- [x] **Token Classification** — Keywords, Identifiers, Constants, Operators, Delimiters
- [x] **DFA Simulation** — Step-by-step character processing

---

## 🔮 Completed Milestones

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ Phase 1 | Editor UI + Code Execution | Complete |
| ✅ Phase 2 | Backend API (C/Python/Java) | Complete |
| ✅ Phase 3 | Lexical Analyzer + Token Table | Complete |
| ✅ Phase 4 | DFA Visualization + Simulator | Complete |

---

## 👨‍💻 Author

**Nivedan Belwal** — [@Nivedanbelwal](https://github.com/Nivedanbelwal)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
