# SLIME786 Release Plan

This is the account-wide rulebook for taking projects from prototype to a sensible release without paying for infrastructure too early.

## Cost rule

**Free/local/demo first. Paid services are deferred until a project reaches Release Candidate and there is a concrete reason to enable them.**

A paid service should only be introduced when all three are true:

1. the core product flow already works without it;
2. real testing shows the service solves a release-blocking problem; and
3. the expected ongoing cost is understood and explicitly approved.

Until then, use local development, existing free tiers, sandbox/test modes, GitHub Actions already included with the account, and deterministic fallbacks where available.

## Maturity model

| Stage | Meaning | Paid services |
| --- | --- | --- |
| Prototype | Core idea works | No |
| Testable | Main user flow works end to end | No |
| Release Candidate | Feature set is intentionally frozen and QA is underway | Only if release-blocking |
| Final / Production | Public release with monitoring, support and recovery plan | Case by case |

## Current project status

| Project | Current stage | Main work before Release Candidate |
| --- | --- | --- |
| GUARD | Testable MVP | real evidence QA, deletion/recovery, action-prep flow, accessibility |
| Handoff | Testable private beta | physical two-device/network matrix, resume/corruption QA, native networking |
| WHY? | Testable MVP | real share-target QA, data export/delete, accessibility, release screenshots |
| Rewind | Prototype / testable locally | real-item validation, export/delete, external-action boundaries |
| Called It. | Testable prototype | multi-user/RLS QA, moderation/abuse flow, resolution testing |
| Life Admin Autopilot | Testable prototype | real-life workflow QA, source-file intake, export/delete, accessibility |
| Iron Vultures | Feature-complete prototype | device/performance QA, final art/audio, accessibility, store package |
| Mo'Fries | Pre-launch venture | final menu/costing/suppliers/allergens/operations before payments |
| Slime's Collectables | Demo storefront | real inventory/photos/conditions, sandbox checkout, fulfilment QA |
| Decision Coin | Paused | no work unless deliberately restarted |

## Account-wide release checklist

Every active product should complete these before being called Final:

- [ ] one obvious main user flow
- [ ] mobile/small-screen QA where relevant
- [ ] desktop/tablet QA where relevant
- [ ] keyboard/screen-reader/contrast/reduced-motion review where relevant
- [ ] useful empty, loading, error and offline states
- [ ] privacy/security wording matches actual behaviour
- [ ] no secrets or production credentials in source
- [ ] dependency/security review
- [ ] backup/recovery or export/delete plan for stored user data
- [ ] release notes/changelog
- [ ] stable version/release label
- [ ] current screenshots/demo media
- [ ] rollback path
- [ ] CI/build checks green

## Paid-service gates

Do **not** pay for these merely to make a prototype look more complete:

- custom domains for every project
- premium analytics
- paid monitoring/logging
- paid CI
- paid databases before free limits are proven insufficient
- production email/SMS
- TURN infrastructure for Handoff before cross-network testing proves it necessary
- app-store developer accounts before a mobile build is release-candidate quality
- live payment processing before inventory/menu/fulfilment is ready
- scaled AI usage before the non-AI/core workflow is validated

## Review cadence

Update each repo's `RELEASE-READINESS.md` when a meaningful milestone lands. Avoid adding new product scope once a repo enters Release Candidate unless a real test exposes a blocker.

_Last reviewed: 24 September 2026._
