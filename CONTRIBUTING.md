# Contributing to ScopeGraph

Thank you for your interest in contributing to **ScopeGraph**! We welcome contributions from developers, researchers, and AI tool builders.

ScopeGraph helps engineers and AI agents understand the blast radius and architectural impact of code changes **before** writing code, eliminating hallucinations through deterministic AST code grounding.

---

## Code of Conduct

All contributors are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before participating in our community.

---

## Getting Started

### Prerequisites

- **Python 3.13+**
- **Node.js 20+** and **npm 10+**
- **Docker & Docker Compose** (optional for containerized setup)
- **Git**

### Local Development Setup

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/teehihi/scope-graph.git
   cd scope-graph
   ```

2. **Backend Setup**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r services/api/requirements.txt
   ```

3. **Frontend Setup**:
   ```bash
   cd apps/web
   npm install
   cd ../..
   ```

4. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```

5. **Start Services**:
   - **Backend API**:
     ```bash
     cd services/api && uvicorn app.main:app --reload --port 8000
     ```
   - **Frontend Dashboard**:
     ```bash
     cd apps/web && npm run dev
     ```

---

## Architectural Principles & Standards

When writing code for ScopeGraph, please strictly observe our engineering guidelines:

1. **Deterministic AST Grounding First**:
   Semantic reasoning by LLMs must never replace static code analysis. Facts (file existence, symbol signatures, call hierarchies) originate from AST parsing in the database.
2. **Anti-Hallucination Evidence Gate**:
   Every claim proposed by AI models must be validated against real files and symbols. Claims that fail verification are categorized as `rejected_hallucinations`.
3. **Zero Hardcoded Text (Strict 12-Language i18n Standard)**:
   - Any new user-facing text, button label, tooltip, or notification must be added to `apps/web/src/context/LanguageContext.tsx` across all 12 supported languages (`en`, `vi`, `ja`, `ko`, `zh`, `es`, `fr`, `de`, `hi`, `th`, `it`, `ru`).
   - Run `node scripts/audit_i18n.js` to ensure 100% key parity and verify zero hardcoded strings.
4. **Brand Kit v2 Tokens**:
   - Electric Lime (`#C7F36B`), Graph Blue (`#526BEE`), Ink (`#151923`), Warm White (`#F7F8F5`).

---

## Verification & Testing

Before submitting a Pull Request, verify that all quality gates pass:

```bash
# 1. Run Python backend pytest suite
PYTHONPATH=.:services/api .venv/bin/pytest services/api/tests/ -v

# 2. Run Frontend TypeScript check & production build
cd apps/web && npm run build

# 3. Run Automated 12-Language i18n Parity Audit
node scripts/audit_i18n.js
```

---

## Submitting Pull Requests

1. **Create a branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
2. **Follow Conventional Commits**:
   - `feat(...)`: New feature
   - `fix(...)`: Bug fix
   - `docs(...)`: Documentation changes
   - `test(...)`: Adding or updating tests
   - `refactor(...)`: Code refactoring without behavioral change
3. **Open a Pull Request**:
   - Provide a clear summary of the changes.
   - Reference any relevant issues (e.g., `Closes #123`).
   - Fill out our PR template completely.

---

## Reporting Issues

- For bug reports, use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
- For feature requests, use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
- For security vulnerabilities, please refer to our [Security Policy](SECURITY.md).

Thank you for helping make ScopeGraph better! 🚀
