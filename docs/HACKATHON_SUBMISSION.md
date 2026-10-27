# Meta Global AI Developer Hackathon — Submission Draft

### Project Details
- **Project Name:** ScopeGraph
- **Tagline:** Understand the impact before you change the code.
- **Track:** Push the Frontier / Developer Tooling
- **GitHub Repository:** https://github.com/teehihi/scope-graph
- **Demo Video URL:** [Link to 3-minute demo video]

---

### Project Description & Problem Solved
When developers or AI coding agents receive a new feature request or bug report (e.g. *"Require email verification before users can change their email address"*), identifying which files, API endpoints, database models, and downstream services are affected requires tedious manual search. AI coding agents often hallucinate dependencies or edit incorrect files without holistic repository context.

**ScopeGraph** solves this by uniting deterministic code analysis with Meta AI semantic reasoning. ScopeGraph indexes real source repositories via AST parsing, models multi-layer dependencies in PostgreSQL, uses Meta AI (Llama 3.3 / Muse Spark) to reason about downstream impact, validates every claim with an anti-hallucination evidence gate, and provides an interactive React Flow graph and Model Context Protocol (MCP) server for external coding agents (Claude Code, Cursor, Codex).

---

### How Meta AI Products Were Used
Meta AI acts as the core runtime intelligence engine in ScopeGraph:
1. **Requirement Interpretation:** Converts ambiguous natural-language business specifications into concrete architectural requirements and security preconditions.
2. **Semantic Code Reasoning:** Bridges the gap between business terminology and actual codebase symbols whose names may differ.
3. **Completeness & Gap Auditing:** Performs a critical review pass to catch missed database migrations, authorization gates, and edge cases.
4. **Implementation Brief Generation:** Formulates structured, actionable markdown instructions for coding agents.

The integration is implemented through a flexible provider adapter in `app/ai/provider.py` compatible with the Meta Model API and partner inference endpoints, accompanied by a deterministic offline demonstration mode with transparent labeling.

---

### Why Meta Models Are Important to the Solution
Meta models (specifically Llama 3.3 and Muse Spark) excel at structured instruction following, technical code comprehension, and architectural synthesis. While static AST analysis supplies the ground-truth facts of what exists, Meta AI supplies the forward-looking reasoning of what *must change*. Crucially, ScopeGraph's architecture pairs Meta AI with an Evidence Validation Layer that verifies every model suggestion against indexed AST symbols before presenting it to the user.

---

### Product Feedback on Meta AI Tooling
- **Strengths:** High reasoning fidelity on technical and architectural code impact tasks. Structured JSON mode produces clean, predictable schemas for downstream processing.
- **Recommendations for Improvement:** Standardizing function/tool-calling schemas across Meta Model API and inference partners would streamline cross-provider client adapters. Enhanced token-level attribution or citation support would further bolster evidence-grounded developer tools.
