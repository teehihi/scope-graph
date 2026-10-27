# ScopeGraph — 3-Minute Demo Video Script

**Target Video Duration:** 2 minutes 50 seconds – 3 minutes  
**Goal:** Deliver a crisp, compelling demonstration of ScopeGraph for judges of the Meta Global AI Developer Hackathon.

---

### Segment 1: The Problem & Vision (0:00 – 0:25)
- **Speaker:** "Every software developer and coding agent faces the same challenge when receiving a requirement like *'Require email verification before users can change their email address'*: What will break? Which API endpoints, service layers, database models, and tests must change? Guessing leads to regressions, and coding agents hallucinate or edit the wrong files. Meet **ScopeGraph** — Understand the impact before you change the code."

### Segment 2: 1-Click Import & Real Repository Indexing (0:25 – 0:50)
- **Visual:** Click **Load Sample Repo** in the navigation bar.
- **Speaker:** "ScopeGraph indexes real source code. In one click, our engine safely unpacks the repository, runs AST parsing, and deterministically identifies classes, functions, FastAPI routes, and SQLAlchemy models. In less than a second, we see 11 files, 15 symbols, and 7 dependency edges persisted in PostgreSQL."

### Segment 3: Interactive Dependency Graph & Evidence Inspection (0:50 – 1:25)
- **Visual:** Explore the React Flow graph canvas. Click layer filters (`API Routes`, `Services`, `Data Models`, `Tests`). Click `app/services/user_service.py` node to open the Evidence Drawer.
- **Speaker:** "The codebase is organized by architectural layer. When we select `user_service.py`, the Evidence Drawer surfaces exact line numbers and source code snippets directly from the workspace. These are verified facts, not AI hallucinations."

### Segment 4: Natural-Language Impact Reasoning with Meta AI (1:25 – 2:15)
- **Visual:** Type or select preset: *"Require email verification before users can change their email address."* Click **Analyze Impact**.
- **Speaker:** "Now we bring in Meta AI. Our orchestrator sends the requirement along with retrieved AST symbols to Meta Llama 3.3. Meta AI reasons about the change: it identifies that `user_service.py` and `users.py` are directly impacted, while `verification_service.py` and `verification.py` are downstream dependencies. The graph instantly updates with color-coded badges: red for direct changes, amber for indirect dependents. Our Evidence Validator checks every claim against the index, filtering out any hallucinated filenames."

### Segment 5: Actionable Implementation Brief & MCP for Agents (2:15 – 2:45)
- **Visual:** Switch to the **Coding Agent Brief** tab. Show markdown checklist. Click **Copy Brief for Agent**. Show the MCP CLI command or integration.
- **Speaker:** "For developers, ScopeGraph provides regression risks and suggested tests. For coding agents like Claude Code or Codex, ScopeGraph generates an actionable implementation brief ready to paste, or serves it directly via our Model Context Protocol (MCP) server through `analyze_change` and `get_relevant_context`."

### Segment 6: Architecture & Closing (2:45 – 3:00)
- **Visual:** Show Docker Compose terminal or clean test suite run.
- **Speaker:** "Powered by FastAPI, PostgreSQL, Redis RQ, React Flow, and Meta AI. ScopeGraph bridges deterministic static analysis and semantic intelligence to push the frontier of developer tools. Thank you!"
