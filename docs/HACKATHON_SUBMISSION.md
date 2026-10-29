# Meta Global AI Developer Hackathon — submission draft

This is a draft. Replace the video link and check the final demo against the measured claims before submitting.

- **Project:** ScopeGraph
- **Tagline:** Understand the impact before you change the code.
- **Track:** Push the Frontier / Developer Tooling
- **Repository:** https://github.com/teehihi/scope-graph
- **Demo video:** pending

## Problem and product

A change request may affect API routes, services, models, and tests. ScopeGraph indexes Python source using AST parsing, stores symbols and dependencies, retrieves relevant context, traverses the dependency graph, and validates proposed file/symbol claims against the index. The report and implementation brief are available through a React dashboard and MCP tools.

The evidence gate proves that a referenced indexed file or symbol exists. It does not by itself prove that the file needs a particular code change; the report distinguishes potential graph connections from supported claims.

## Meta integration status

The architecture implements specialized multi-provider stage routing across Meta model endpoints:
- **Fast Intent Parsing**: Modal Serverless Auto Endpoint running `meta-models/Muse-Spark-Open-816B-A42B`.
- **UI Vision Analysis & Completeness Review**: Baseten Inference running `meta-models/muse-spark-open-1026` / Modal.
- **Deep Impact Reasoning & Implementation Brief**: Official Meta Model API (`https://api.meta.ai/v1/chat/completions`) using `muse-spark-1.3` with documented JSON Schema response format.

Partner inference endpoints are configurable via environment variables (`MODAL_*`, `BASETEN_*`, `META_OFFICIAL_*`). The code default uses a deterministic offline demo provider. Mocked tests, an authorized full-pipeline live smoke, and a three-case live evaluation passed. The local Git-ignored `.env` supplies the credentials; no credential belongs in the repository.

The live stages are requirement interpretation, impact reasoning, completeness review, and brief generation. The static index and evidence validator remain the grounding layer. See [ARCHITECTURE.md](ARCHITECTURE.md) and [EVALUATION.md](EVALUATION.md).

## Evidence available now

The three manually labeled sample cases yielded hybrid macro Recall@8 of 0.758 versus 0.532 for the keyword selection rule. The authorized Meta run yielded macro impact F1 of 0.282 and indirect recall of 0.111; 27/38 accepted impact claims lacked support in the manual labels. The existence gate found no invalid file/symbol reference in those 38 claims. This small result is not production accuracy. Results and denominators are reproducible with `scripts/evaluate_ai_core.py` and documented in [EVALUATION.md](EVALUATION.md).

## Submission checklist

1. Investigate low indirect recall and unsupported impact claims before claiming broad code-impact accuracy.
2. Add the real demo video URL and confirm repository access for reviewers.
3. Record final on-screen counts and provider/model metadata from the actual demo configuration.
