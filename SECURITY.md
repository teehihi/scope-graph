# Security Policy

The ScopeGraph team takes security seriously. This document outlines how to report vulnerabilities and our commitments to resolving security issues.

---

## Supported Versions

We release patches and security fixes for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability in ScopeGraph, please report it privately rather than creating a public GitHub issue.

### How to Report

1. **Email us directly**: Send an email to [tee21052005@gmail.com](mailto:tee21052005@gmail.com) with the subject `[SECURITY] ScopeGraph Vulnerability Report`.
2. **Include in your report**:
   - A detailed description of the vulnerability.
   - Exact steps or proof-of-concept (PoC) code to reproduce the issue.
   - The affected component (e.g., AST Parser, Zip-Slip Sandboxing, API Route, MCP Server, Frontend).
   - Any potential impact on confidentiality, integrity, or system availability.

### Response Timelines

- **Initial Acknowledgement**: Within **48 hours** of receiving your report.
- **Triage & Assessment**: Within **5 business days**, we will confirm the issue and provide an estimated timeline for remediation.
- **Fix & Public Disclosure**: We will coordinate with you on a mutually agreed timeline before publicly disclosing the vulnerability or publishing release notes.

---

## Core Security Protections in ScopeGraph

ScopeGraph includes built-in security features designed to protect developer environments:

- **Zip-Slip Attack Prevention**: Strict canonical path validation (`services/api/app/core/security.py`) ensures extracted archive entries cannot traverse outside their sandboxed workspace directory.
- **Resource Quotas & File Caps**: Default quotas limit max uploaded archive size (25MB), max extraction size (100MB), max file count (500 files), and max individual file size (500KB) to prevent resource exhaustion attacks.
- **Zero Raw Secret Exposure**: Sensitive environment variables (e.g., Meta AI API keys, GitHub OAuth client secrets) are masked or stripped before payloads are delivered to the frontend or MCP consumers.
- **Anti-Hallucination Evidence Gate**: Untrusted AI model output is strictly validated against parsed AST facts before presentation, preventing injected malicious code references.

---

## Recognition

We value the responsible disclosure of security issues and are happy to acknowledge security researchers in our release notes (upon request).
