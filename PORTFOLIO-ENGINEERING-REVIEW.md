# Portfolio engineering review — 12 October 2026

Scope: 21 repositories accessible under `slime786`. Review evidence: default-branch Git trees, README files, selected manifests, CI workflows, and selected implementations. This is a **triage review, not an exhaustive code audit**. No claims of passing tests or production certification are implied.

## Seven-project commercial focus

These are seven **parallel engineering and validation tracks**, not seven simultaneous full launches. This selection is a prioritisation hypothesis, not a revenue forecast. Keep other repos on maintenance until demand requires more investment.

| Project / repository | First externally measurable milestone | Technical milestone | Operating lane |
| --- | --- | --- | --- |
| [LocalLaunch Studio](https://github.com/slime786/website-business) | One paid, scope-controlled customer website | Production-ready tested enquiry workflow and privacy/terms | Lead: revenue |
| [Somavexa](https://github.com/slime786/Somavexa) | 10–20 learner tests, repeat use and willingness-to-pay evidence | Core upper-limb learning flow with passing deterministic scoring tests | Lead: SaaS validation |
| [WorthState Battery](https://github.com/slime786/worthstate-battery) | Prospective design partner and permission to assess historical battery data | Versioned battery evidence/valuation contract and golden tests | Discovery |
| [GUARD](https://github.com/slime786/guard-mvp) | Real users verifying financially meaningful opportunities | Review authentication, evidence isolation and approval gates | Controlled validation |
| [SomaMirror](https://github.com/slime786/SomaMirror) | Research/lab user agrees to assess a narrow data-to-visualisation workflow | Data provenance and measured/reference/inferred separation tests | Discovery |
| [Multi-Agent OS](https://github.com/slime786/Multi-Agent-Vertical-Agent-OS) | One organisation with a specific paid automation need | Tighten per-tool authorisation, audit and task reliability | Discovery / reusable infrastructure |
| [NervaLocus](https://github.com/slime786/NervaLocus) | Neuroanatomy educator reviews a clearly non-diagnostic prototype | Create first runnable anatomical overlap fixture and repeatable tests | Research prototype |

### Parallel execution policy

- Maintain separate branches, pull requests, issue tracking, test commands and release gates per repository. Never combine changes to different applications into a single unreviewable release.
- Run **two delivery lanes** (LocalLaunch and Somavexa) plus **five bounded discovery/prototype lanes**. Do not treat all seven as equal ongoing feature-development commitments.
- Batch safe read-only reviews, test preparation and independent PRs in one active working session when feasible. This plan does **not** mean an assistant will execute work unattended between sessions.
- Prioritise demonstrated paid demand, validated user outcomes and independently passing CI over more planning documents.
- Keep clinical diagnosis, claims of efficacy, financial consequential actions and automated external writes outside prototype authorisation boundaries.

## Shared engineering protocol

When reviewing or changing a repository:

1. Read its README, CONTRIBUTING, SECURITY, AGENTS, package/build manifests, existing tests and CI. Preserve existing repository-specific instructions.
2. State the user-visible behavior and trust boundaries; diagram input, validation, authorization, persistence and outgoing effects.
3. Reproduce issues using a minimal test; separate observed defects from hypotheses.
4. Prefer minimal, reversible changes with no public API or schema breaking changes unless expressly requested.
5. Validate access control on the server, avoid leaking credentials/PII, and require deterministic permission/financial/scoring logic. Treat model output as untrusted.
6. Run existing lint, typecheck, test and build commands when available, and report exactly which succeeded or could not run.
7. For each finding document severity, location, evidence, impact, recommended fix and verification plan.
8. Submit changes as reviewable PRs, not direct commits to main; require green CI before merging. Never claim prototype features or mocked services are live.
9. In final responses use: Summary; copy-paste-ready code or patch; architectural/security impact; tests and next steps.

## Repository-by-repository backlog

| Repository | Maturity signal | Priority | Next engineering deliverable |
| --- | --- | --- | --- |
| [guard-mvp](https://github.com/slime786/guard-mvp) | Auth, evidence, AI investigation, financial workflows, tests/CI | P0 | Trace evidence upload and approval functions end to end, verify RLS/authorization and deletion, adversarial tests |
| [Multi-Agent-Vertical-Agent-OS](https://github.com/slime786/Multi-Agent-Vertical-Agent-OS) | FastAPI + agent orchestrator, policy checks, tests/CI | P0 | Auth/tool permission audit, webhook replay tests, review-gate bypass checks, backpressure and failure isolation |
| [handoff](https://github.com/slime786/handoff) | Browser + Android transfer protocol, tests/CI | P0 | Stress-test receiver against concurrent chunks, retries, aborted sinks and malformed offers; mobile/WebRTC cross-device QA |
| [Somavexa](https://github.com/slime786/Somavexa) | 3D curriculum, AI tutoring, CI; no tracked test suite before review | P0 | Deterministic scoring tests and CI; then API request-validation and AI response-boundary tests |
| [SomaMirror](https://github.com/slime786/SomaMirror) | Proteomic twin domain, provenance, migrations and tests | P1 | Verify measured/reference/inferred separation, RLS, import edge cases and provenance versioning |
| [context-lease-mcp](https://github.com/slime786/context-lease-mcp) | Local and hosted MCP server, tests/CI | P1 | OAuth/audience isolation tests, lease expiry and concurrent storage tests, log redaction and public hosting gates |
| [Claim-Window](https://github.com/slime786/Claim-Window) | Purchase-window MCP server, tests/CI | P1 | Tenant isolation, timezone/date semantics, inferred-vs-confirmed sources and data retention tests |
| [why-app](https://github.com/slime786/why-app) | Expo/SQLite/share targets, tests/CI | P1 | Validate share intent and notification lifecycles, malformed input, SQLite migrations and Android release reliability |
| [rewind-app](https://github.com/slime786/rewind-app) | Expo/SQLite/reminders, tests/CI | P1 | Timezone/deadline boundary cases, restore/export fidelity and background notification behavior |
| [mofries-business](https://github.com/slime786/mofries-business) | Ordering preview, business data and Supabase schema | P1 | Checkout/readiness interlock and database permissions; verify menu, allergens and prices before live traffic |
| [slime786](https://github.com/slime786/slime786) | Public portfolio + canonical collectables shop, smoke tests | P1 | Audit order/payment integration, verify public redirect stability, accessibility and deploy smoke tests |
| [slimes-collectables](https://github.com/slime786/slimes-collectables) | Secondary historical copy | P3 | Keep deployment disabled; add explicit sync/deprecation policy; avoid divergent checkout implementation |
| [NervaLocus](https://github.com/slime786/NervaLocus) | README-only medical-anatomy prototype | P3 | Define non-diagnostic requirements, anatomical dataset contracts, fixtures and testable minimal slice |
| [WRECKSTORM](https://github.com/slime786/WRECKSTORM) | Godot game prototype with build workflow | P2 | Gameplay smoke/regression test plan, reproducible exports and performance profiling |
| [WorthState](https://github.com/slime786/WorthState) | Platform strategy and engineering constitution | P2 | Map common contracts, integration ADRs and service-boundary decision records before new shared APIs |
| [worthstate-core](https://github.com/slime786/worthstate-core) | Python foundation with CI/test | P2 | Validate evidence provenance and immutable domain models; add boundary/property tests |
| [worthstate-battery](https://github.com/slime786/worthstate-battery) | Python domain foundation with CI/test | P2 | Validate units, uncertainty and financial reproducibility against golden test cases |
| [worthstate-design](https://github.com/slime786/worthstate-design) | Minimal TypeScript design package and CI | P3 | Accessibility/component contract tests and versioned token/interface conventions |
| [worthstate-infra](https://github.com/slime786/worthstate-infra) | IaC/security policy foundation | P2 | Secure plan/review pipeline and provider/data-residency decision before production Terraform |
| [website-business](https://github.com/slime786/website-business) | Static no-backend prelaunch preview, CI | P2 | Security headers, form activation contract, accessibility and live privacy disclosures before launch |
| [decision-coin](https://github.com/slime786/decision-coin) | Paused README-only experiment | P3 | No code changes until product requirements justify revival |

## Progress and validation status

- **Completed**: inventory of 21 default-branch file trees, primary manifests and selected source/release workflows; engineering priority matrix.
- **Proposed**: Somavexa PR #44 adds mastery regression tests, typecheck and test CI gates. Merge only after workflow validation.
- **Not yet completed**: full source-level security review of every repository, execution of each test suite, fixes for all identified risks, end-to-end deployment validation.
- Security/performance items above are *investigation targets*, not confirmed exploitable vulnerabilities unless separately demonstrated.

## Definition of done for each repository

- User workflows and key data/authorization boundaries documented.
- Every finding separated into confirmed, unverified, or accepted risk.
- Automated tests cover main behavior and representative failure paths.
- CI runs supported lint/typecheck/tests/build with reproducible dependency installation.
- Dependencies, sensitive data handling and release exposure evaluated.
- Changes supplied as minimal PRs with rollback notes and passing validation; no implicit merge or deployment.
