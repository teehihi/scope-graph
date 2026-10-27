# ScopeGraph — three-minute demo script

This script can be used with the **offline demo** provider, the default configuration. Do not call the result “Meta AI output” unless an authorized live provider is configured and the live smoke has passed. Confirm actual index counts and report items on screen before recording.

## 0:00–0:25 — Problem

“Before changing code, developers need to know which files, dependencies, and tests might be affected. ScopeGraph gives a source-grounded impact brief so the team can inspect the likely blast radius.”

## 0:25–0:55 — Index the sample

Click **Load Sample Repo**. Show indexed files, symbols, and graph edges from the UI. “The Python AST parser extracts symbols and relationships from actual source files. The sample is a demonstration fixture; the live counts shown on screen are the evidence.”

## 0:55–1:25 — Explore the graph

Open the graph, select `app/services/user_service.py`, and inspect its source lines. “An edge connects a caller or importer to a dependency. Connected files are candidates for inspection, not automatically confirmed changes.”

## 1:25–2:20 — Analyze a change

Enter “Require email verification before users can change their email address.” Open the report. “The deterministic retriever ranks indexed paths, symbols, metadata, and nearby graph nodes. The configured provider proposes impacts. The evidence gate verifies referenced file and symbol existence and shows source snippets where available. The report distinguishes accepted claims, rejected paths or symbols, and potential graph neighbors. File existence alone does not prove a causal impact.”

If the UI is running in offline mode, say: “This report uses the labeled deterministic offline demo provider.” If a real authorized provider is running, show the report’s provider and model metadata and say their actual values.

## 2:20–2:45 — Brief and MCP

Open the implementation brief. Show the `analyze_change`, `get_relevant_context`, and `suggest_tests` MCP interfaces. “Developers and coding agents can inspect grounded context and test suggestions before editing.”

## 2:45–3:00 — Evidence and close

Show [EVALUATION.md](EVALUATION.md) or the local JSON result. “On three manually labeled offline cases, hybrid retrieval improved Recall@8 over the previous keyword rule. Impact quality remains limited on this small fixture; the team has not yet measured a live Meta run.”
