import json
import logging
import time
from typing import Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIProviderResponse:
    def __init__(
        self,
        data: dict[str, Any],
        provider: str,
        model: str,
        latency_seconds: float,
        is_mock_or_demo: bool = False,
        raw_response: str | None = None
    ):
        self.data = data
        self.provider = provider
        self.model = model
        self.latency_seconds = latency_seconds
        self.is_mock_or_demo = is_mock_or_demo
        self.raw_response = raw_response

class BaseMetaAIProvider:
    def interpret_requirement(self, requirement: str) -> AIProviderResponse:
        raise NotImplementedError

    def reason_about_impact(
        self,
        requirement_interpretation: dict[str, Any],
        retrieved_files: list[dict[str, Any]],
        dependency_context: dict[str, Any],
    ) -> AIProviderResponse:
        raise NotImplementedError

    def review_completeness(
        self,
        requirement: str,
        proposed_impact: dict[str, Any],
        repository_context: dict[str, Any],
    ) -> AIProviderResponse:
        raise NotImplementedError

    def generate_implementation_brief(
        self,
        requirement: str,
        validated_impact: dict[str, Any],
    ) -> str:
        raise NotImplementedError

class MetaAIHttpProvider(BaseMetaAIProvider):
    """
    HTTP Provider compatible with Meta Model API and partner inference endpoints
    (Fireworks, Baseten, Together, Groq, or OpenAI-compatible Meta inference proxies).
    """

    def __init__(self, api_key: str, base_url: str, model: str, provider_name: str = "meta_model_api"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.provider_name = provider_name
        self.client = httpx.Client(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=45.0,
        )

    def _call_model(self, system_prompt: str, user_prompt: str, expect_json: bool = True) -> tuple[dict[str, Any] | str, float]:
        start = time.time()
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": settings.META_AI_TEMPERATURE,
            "max_tokens": settings.META_AI_MAX_TOKENS,
        }
        if expect_json:
            payload["response_format"] = {"type": "json_object"}

        response = self.client.post(url, json=payload)
        latency = time.time() - start

        if response.status_code == 401:
            raise ValueError(f"Meta AI authentication failed: Invalid or missing API key for {self.provider_name}")
        elif response.status_code == 429:
            raise ValueError(f"Meta AI rate limit exceeded or quota exhausted on {self.provider_name}")
        elif response.status_code >= 400:
            raise ValueError(f"Meta AI inference failed with status {response.status_code}: {response.text[:200]}")

        resp_json = response.json()
        content = resp_json["choices"][0]["message"]["content"]

        if expect_json:
            try:
                # Strip markdown code blocks if present
                clean_content = content.strip()
                if clean_content.startswith("```json"):
                    clean_content = clean_content[7:]
                if clean_content.startswith("```"):
                    clean_content = clean_content[3:]
                if clean_content.endswith("```"):
                    clean_content = clean_content[:-3]
                parsed = json.loads(clean_content.strip())
                return parsed, latency
            except json.JSONDecodeError as err:
                logger.error("Failed to decode model JSON: %s. Raw: %s", err, content[:300])
                raise ValueError(f"Meta AI returned non-JSON response: {str(err)}")

        return content, latency

    def interpret_requirement(self, requirement: str) -> AIProviderResponse:
        system_prompt = (
            "You are an expert software architect analyzing a feature request for code impact analysis.\n"
            "Respond ONLY with a JSON object containing keys:\n"
            "- 'business_intent': str\n"
            "- 'actors': list[str]\n"
            "- 'existing_behavior': str\n"
            "- 'desired_behavior': str\n"
            "- 'preconditions': list[str]\n"
            "- 'postconditions': list[str]\n"
            "- 'security_implications': list[str]\n"
            "- 'validation_requirements': list[str]\n"
            "- 'affected_layers': list[str] (e.g. ['api', 'service', 'model', 'test'])\n"
            "- 'search_keywords': list[str] (names of functions, models, or tokens likely to be involved)\n"
            "- 'ambiguities': list[str]"
        )
        data, latency = self._call_model(system_prompt, f"Requirement: {requirement}")
        return AIProviderResponse(data=data, provider=self.provider_name, model=self.model, latency_seconds=latency)

    def reason_about_impact(
        self,
        requirement_interpretation: dict[str, Any],
        retrieved_files: list[dict[str, Any]],
        dependency_context: dict[str, Any],
    ) -> AIProviderResponse:
        system_prompt = (
            "You are a principal engineer conducting a code impact analysis.\n"
            "Given a requirement and real indexed repository files with symbols and dependencies,\n"
            "identify which files and symbols are directly or indirectly affected.\n"
            "CRITICAL: Do NOT invent file paths or symbols. Only reference items provided in the repository context.\n"
            "Respond ONLY with a JSON object matching:\n"
            "{\n"
            "  'affected_items': [\n"
            "    {\n"
            "      'file_path': 'exact path from context',\n"
            "      'symbol': 'symbol name or null',\n"
            "      'impact_type': 'direct' | 'indirect',\n"
            "      'category': 'api' | 'service' | 'database' | 'security' | 'test',\n"
            "      'reason': 'clear explanation of why this file/symbol is impacted',\n"
            "      'confidence': 0.0 to 1.0\n"
            "    }\n"
            "  ],\n"
            "  'risks': ['list of potential regression risks'],\n"
            "  'suggested_tests': ['specific tests to update or add'],\n"
            "  'assumptions': ['assumptions made during analysis']\n"
            "}"
        )
        user_prompt = (
            f"Requirement: {json.dumps(requirement_interpretation)}\n\n"
            f"Indexed Files Context: {json.dumps(retrieved_files)}\n\n"
            f"Graph Dependency Context: {json.dumps(dependency_context)}"
        )
        data, latency = self._call_model(system_prompt, user_prompt)
        return AIProviderResponse(data=data, provider=self.provider_name, model=self.model, latency_seconds=latency)

    def review_completeness(
        self,
        requirement: str,
        proposed_impact: dict[str, Any],
        repository_context: dict[str, Any],
    ) -> AIProviderResponse:
        system_prompt = (
            "You are a code review auditor evaluating an impact analysis for omissions.\n"
            "Review whether any indirect dependencies, database schema migrations, auth gates, or tests were missed.\n"
            "Respond ONLY with a JSON object:\n"
            "{\n"
            "  'areas_reviewed': ['api', 'service', 'database', 'auth', 'tests'],\n"
            "  'is_complete': bool,\n"
            "  'potential_gaps': ['gap descriptions'],\n"
            "  'additional_files_to_check': ['file paths from repository to verify']\n"
            "}"
        )
        user_prompt = (
            f"Requirement: {requirement}\n\n"
            f"Proposed Impact: {json.dumps(proposed_impact)}\n\n"
            f"Repository Files: {json.dumps(list(repository_context.keys()))}"
        )
        data, latency = self._call_model(system_prompt, user_prompt)
        return AIProviderResponse(data=data, provider=self.provider_name, model=self.model, latency_seconds=latency)

    def generate_implementation_brief(
        self,
        requirement: str,
        validated_impact: dict[str, Any],
    ) -> str:
        system_prompt = (
            "You are an AI coding assistant architect. Generate a crisp, actionable Implementation Brief\n"
            "formatted in Markdown that a human developer or AI coding agent (like Codex, Claude Code) can immediately execute.\n"
            "Include:\n"
            "1. Goal & Acceptance Criteria\n"
            "2. Grounded Files & Symbols to Inspect (with explicit reasons)\n"
            "3. Required Logic Changes\n"
            "4. API / Schema / Data Migrations\n"
            "5. Recommended Tests\n"
            "6. Regression Risks & Pre-flight Checklist"
        )
        user_prompt = f"Requirement: {requirement}\n\nValidated Impact: {json.dumps(validated_impact, indent=2)}"
        content, _ = self._call_model(system_prompt, user_prompt, expect_json=False)
        return content


class OfflineDemoProvider(BaseMetaAIProvider):
    """
    Deterministic offline provider used when running locally without an external API key.
    Grounds its analysis in the actual indexed symbols, AST parser results, and graph dependencies.
    Transparently labels itself to adhere to non-negotiable hackathon integrity requirements.
    """

    def interpret_requirement(self, requirement: str) -> AIProviderResponse:
        req_lower = requirement.lower()
        keywords = []
        for word in ["email", "verification", "verify", "token", "user", "auth", "login", "password", "update"]:
            if word in req_lower:
                keywords.append(word)

        data = {
            "business_intent": requirement,
            "actors": ["authenticated user", "unverified user", "notification service"],
            "existing_behavior": "User profile or email update occurs directly without verification confirmation step.",
            "desired_behavior": "Require two-step confirmation or verification token before final email mutation.",
            "preconditions": ["User must be authenticated", "New email must be unique and properly formatted"],
            "postconditions": ["Verification token dispatched to new email", "Email changed only after token confirmed"],
            "security_implications": ["Prevent unauthorized account takeover", "Token expiration and single-use enforcement"],
            "validation_requirements": ["Valid email format", "Signature verification on token", "Expiration check"],
            "affected_layers": ["api", "service", "model", "test"],
            "search_keywords": keywords or ["user", "email"],
            "ambiguities": ["Should old email also receive notification of pending change?"]
        }
        return AIProviderResponse(
            data=data,
            provider="offline_demo",
            model="deterministic-semantic-matcher",
            latency_seconds=0.05,
            is_mock_or_demo=True,
        )

    def reason_about_impact(
        self,
        requirement_interpretation: dict[str, Any],
        retrieved_files: list[dict[str, Any]],
        dependency_context: dict[str, Any],
    ) -> AIProviderResponse:
        keywords = set(requirement_interpretation.get("search_keywords", ["email", "user"]))
        affected_items = []
        suggested_tests = []

        for f in retrieved_files:
            path = f["path"]
            symbols = f.get("symbols", [])
            matched_syms = [s for s in symbols if any(k in s["name"].lower() for k in keywords)]

            # Check direct match
            if any(k in path.lower() for k in keywords) or matched_syms:
                is_direct = any(k in path.lower() for k in ["users.py", "user_service.py", "email", "verification"])
                category = "api" if "api" in path else ("service" if "service" in path else ("model" if "model" in path else "test"))

                if "test" in path:
                    suggested_tests.append(f"Update test suite in {path} to verify token generation and confirmation flow")
                    category = "test"

                reason = (
                    f"Direct target for changes: contains {', '.join([s['name'] for s in matched_syms[:3]])}"
                    if is_direct else
                    f"Connected dependency handling user/email lifecycle ({path})"
                )

                affected_items.append({
                    "file_path": path,
                    "symbol": matched_syms[0]["name"] if matched_syms else None,
                    "impact_type": "direct" if is_direct else "indirect",
                    "category": category,
                    "reason": reason,
                    "confidence": 0.95 if is_direct else 0.80,
                })

        # Add downstream dependents from dependency context
        for downstream_path in dependency_context.get("downstream", []):
            if not any(item["file_path"] == downstream_path for item in affected_items):
                affected_items.append({
                    "file_path": downstream_path,
                    "symbol": None,
                    "impact_type": "indirect",
                    "category": "service",
                    "reason": "Direct caller of affected service layer in dependency graph",
                    "confidence": 0.75,
                })

        risks = [
            "Users may be locked out if verification token email delivery fails",
            "Race condition or replay attack if verification tokens are not invalidated after single use",
            "Legacy client applications might expect immediate email mutation without pending state"
        ]

        if not suggested_tests:
            suggested_tests = [
                "Test requesting email change triggers token generation and dispatch",
                "Test confirming with valid token updates user email",
                "Test confirming with expired or reused token returns 400 error"
            ]

        data = {
            "affected_items": affected_items,
            "risks": risks,
            "suggested_tests": suggested_tests,
            "assumptions": [
                "Transactional email provider is configured",
                "Database supports adding pending_email field or VerificationToken table"
            ]
        }
        return AIProviderResponse(
            data=data,
            provider="offline_demo",
            model="deterministic-semantic-matcher",
            latency_seconds=0.08,
            is_mock_or_demo=True,
        )

    def review_completeness(
        self,
        requirement: str,
        proposed_impact: dict[str, Any],
        repository_context: dict[str, Any],
    ) -> AIProviderResponse:
        affected_files = [item["file_path"] for item in proposed_impact.get("affected_items", [])]
        has_test = any("test" in p for p in affected_files)
        has_api = any("api" in p for p in affected_files)
        has_service = any("service" in p for p in affected_files)
        has_model = any("model" in p for p in affected_files)

        potential_gaps = []
        if not has_test:
            potential_gaps.append("No automated test files were identified for update")
        if not has_model:
            potential_gaps.append("Check if database schema requires a pending_email or token migration")

        data = {
            "areas_reviewed": ["api", "service", "database_models", "security", "automated_tests"],
            "is_complete": len(potential_gaps) == 0,
            "potential_gaps": potential_gaps,
            "additional_files_to_check": [p for p in repository_context if "config" in p or "security" in p]
        }
        return AIProviderResponse(
            data=data,
            provider="offline_demo",
            model="deterministic-semantic-matcher",
            latency_seconds=0.02,
            is_mock_or_demo=True,
        )

    def generate_implementation_brief(
        self,
        requirement: str,
        validated_impact: dict[str, Any],
    ) -> str:
        affected_items = validated_impact.get("affected_items", [])
        direct_items = [i for i in affected_items if i.get("impact_type") == "direct"]
        indirect_items = [i for i in affected_items if i.get("impact_type") == "indirect"]
        tests = validated_impact.get("suggested_tests", [])
        risks = validated_impact.get("risks", [])

        lines = [
            f"# ScopeGraph Implementation Brief",
            f"**Requirement:** {requirement}",
            f"**Generated By:** ScopeGraph Code Impact Engine (Offline Demo Mode)",
            f"",
            f"## 1. Executive Summary",
            f"The proposed change requires modifying the user email update flow from an immediate direct mutation to a two-step tokenized confirmation process.",
            f"",
            f"## 2. Grounded Files to Inspect & Modify",
            f"### Direct Impact Files:",
        ]

        for item in direct_items:
            sym_text = f" (`{item['symbol']}`)" if item.get('symbol') else ""
            lines.append(f"- **`{item['file_path']}`**{sym_text}: {item['reason']}")

        if indirect_items:
            lines.append(f"### Downstream / Indirect Impact Files:")
            for item in indirect_items:
                sym_text = f" (`{item['symbol']}`)" if item.get('symbol') else ""
                lines.append(f"- **`{item['file_path']}`**{sym_text}: {item['reason']}")

        lines.extend([
            f"",
            f"## 3. Required Engineering Steps",
            f"1. **Service Layer (`app/services/user_service.py`):** Update `update_user_email` to request email change instead of directly mutating `user.email`. Create verification token via `verification_service`.",
            f"2. **API Layer (`app/api/users.py`):** Update endpoint documentation and response schema to notify the caller that a confirmation email has been dispatched.",
            f"3. **Verification Confirmation (`app/api/verification.py`):** Handle `email_change` token type to swap `user.email` upon successful token verification.",
            f"4. **Security Notice (`app/services/notification_service.py`):** Ensure alert email is sent to the previous address.",
            f"",
            f"## 4. Recommended Test Coverage",
        ])

        for t in tests:
            lines.append(f"- [ ] {t}")

        lines.extend([
            f"",
            f"## 5. Potential Regression Risks",
        ])
        for r in risks:
            lines.append(f"- ⚠️ {r}")

        lines.extend([
            f"",
            f"## 6. Pre-flight Verification Checklist",
            f"- Verify all database foreign keys cascade properly.",
            f"- Verify tokens have an explicit TTL and cannot be reused (`is_used == True`).",
            f"- Run automated test suite: `pytest` before submitting pull request.",
        ])

        return "\n".join(lines)


def get_ai_provider() -> BaseMetaAIProvider:
    """
    Factory that instantiates the active provider based on configuration.
    """
    provider_type = settings.META_AI_PROVIDER.lower().strip()
    api_key = settings.META_AI_API_KEY.strip()

    if api_key and provider_type not in ("offline_demo", "none"):
        logger.info("Initializing Meta AI HTTP Provider (%s, model=%s)", provider_type, settings.META_AI_MODEL)
        return MetaAIHttpProvider(
            api_key=api_key,
            base_url=settings.META_AI_BASE_URL,
            model=settings.META_AI_MODEL,
            provider_name=provider_type,
        )

    logger.info("Running ScopeGraph with OfflineDemoProvider (no external API key configured)")
    return OfflineDemoProvider()
