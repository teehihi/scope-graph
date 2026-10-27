# Meta Global AI Developer Hackathon — submission draft

This is a draft. Replace the video link and verify live provider claims before submitting.

- **Project:** ScopeGraph
- **Tagline:** Understand the impact before you change the code.
- **Track:** Push the Frontier / Developer Tooling
- **Repository:** https://github.com/teehihi/scope-graph
- **Demo video:** pending

## Problem and product

A change request may affect API routes, services, models, and tests. ScopeGraph indexes Python source using AST parsing, stores symbols and dependencies, retrieves relevant context, traverses the dependency graph, and validates proposed file/symbol claims against the index. The report and implementation brief are available through a React dashboard and MCP tools.

The evidence gate proves that a referenced indexed file or symbol exists. It does not by itself prove that the file needs a particular code change; the report distinguishes potential graph connections from supported claims.

## Meta integration status

The adapter is configured for Meta Model API at `https://api.meta.ai/v1/chat/completions` using `muse-spark-1.3` and the documented JSON Schema response format. Partner inference endpoints are configurable. The default local mode uses a deterministic offline demo provider. Mocked HTTP and full-pipeline tests pass, but the team has **not yet run an authorized live Meta request**. Therefore this draft makes no claim about live Meta output, quality, latency, or tool feedback.

The intended live stages are requirement interpretation, impact reasoning, completeness review, and brief generation. The static index and evidence validator remain the grounding layer. See [ARCHITECTURE.md](ARCHITECTURE.md) and [EVALUATION.md](EVALUATION.md).

## Evidence available now

The offline evaluation has three manually labeled cases on the checked-in sample repository. Hybrid retrieval reached macro Recall@8 of 0.758 versus 0.532 for the previous keyword selection rule. Offline impact F1 was 0.343, which is too weak to present as production accuracy. Results and denominators are reproducible with `scripts/evaluate_ai_core.py`. Live evaluation remains pending authorized access and explicit paid-call approval.

## Submission checklist

1. Run the opt-in live smoke and evaluation with an authorized team key; keep credentials out of the repository.
2. Record the actual provider/model identity, token usage, latency, and evaluation result from the live output.
3. Update this draft and the demo narration from observed results only.
4. Add the real demo video URL and confirm repository access for reviewers.
