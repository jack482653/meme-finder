<!--
SYNC IMPACT REPORT
==================
Version change: [unversioned template] → 1.0.0 (initial ratification)
Amendment 1.1.0 (2026-03-26): Principle IV — added 2s p95 exception for
  external-API Raycast extensions (MINOR: material expansion of guidance)

Modified principles: N/A (first version, all principles newly authored)

Added sections:
  - Core Principles (5 principles)
  - Performance Standards
  - Development Workflow
  - Governance

Removed sections: N/A

Templates reviewed:
  - .specify/templates/plan-template.md       ✅ compatible (Constitution Check section aligns)
  - .specify/templates/spec-template.md       ✅ compatible (user stories, acceptance criteria align)
  - .specify/templates/tasks-template.md      ✅ compatible (MVP-first and incremental delivery align)

Follow-up TODOs:
  - None. All placeholders resolved.
-->

# Meme Finder Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

Every line of code MUST be readable, maintainable, and purposeful.

- Functions MUST do one thing; files MUST have a single clear responsibility.
- Code MUST NOT be added unless it serves a current, confirmed requirement (YAGNI).
- Abstractions MUST be introduced only when duplication appears three or more times.
- Dependencies MUST be minimized; each new dependency requires explicit justification.
- Dead code, commented-out blocks, and unused imports MUST be removed before merging.

**Rationale**: Over-engineered code compounds maintenance cost and slows MVP delivery.
Simplicity is a feature.

### II. Testing Standards

Tests MUST be written for every feature before or alongside implementation — never after.

- Each user story MUST have at least one acceptance test that can pass or fail independently.
- Unit tests MUST cover pure logic functions and edge cases.
- Integration tests MUST cover data flow between system boundaries (API ↔ storage, etc.).
- A feature is NOT done until its tests pass in CI.
- Tests MUST be deterministic; flaky tests MUST be fixed or removed immediately.
- Test coverage target: 80% line coverage MINIMUM on new code; 100% on business-critical paths.

**Rationale**: Tests are the safety net that enables fast, confident iteration on an MVP
without regression fear.

### III. User Experience Consistency

The UI and user-facing behavior MUST follow consistent patterns throughout the product.

- Every user-facing interaction MUST have a loading state, an error state, and a success state.
- Error messages MUST be human-readable and actionable (never expose raw stack traces or IDs).
- Identical actions MUST produce identical results regardless of entry point.
- Responsive layout MUST be verified at mobile (375px), tablet (768px), and desktop (1280px).
- Visual design tokens (colors, spacing, typography) MUST be reused from a single source of truth;
  hardcoded values are forbidden.

**Rationale**: Inconsistent UX erodes trust. A small, consistent product beats a large,
unpredictable one at every stage of MVP validation.

### IV. Performance Requirements

The product MUST meet the following baseline performance thresholds at MVP launch:

- Initial page / screen load: MUST be under 3 seconds on a standard 4G connection.
- Search / query results: MUST return within 1 second for typical inputs. **Exception**: Raycast extensions
  (or any client dependent on external third-party APIs) MUST return results within **2 seconds** p95.
- Core user actions (submit, save, navigate): MUST respond within 200ms perceived latency.
- Bundle size (if web): MUST NOT exceed 500 KB (gzipped) for the critical path.
- Performance regressions MUST be caught in CI before merging.

**Rationale**: Slow products lose users before they can validate any other hypothesis.
Establishing baselines early prevents costly retrofits later.

### V. MVP Simplicity (NON-NEGOTIABLE)

The minimum viable product ships first. Scope is the primary risk.

- Every feature MUST be justified against the current user story in the active spec.
- Features not linked to a P1 or P2 user story MUST NOT be implemented in the MVP phase.
- Configuration options, admin panels, and "nice-to-haves" are deferred until post-MVP.
- New complexity MUST be documented in the plan's Complexity Tracking table with explicit
  justification before implementation begins.
- "We might need it later" is NOT a valid justification for adding scope.

**Rationale**: Over-design is the most common cause of stalled MVPs. Ship the simplest
thing that validates the core hypothesis, then iterate.

## Performance Standards

This section captures measurable gates applied during development and review.

| Metric                    | Threshold         | Enforcement         |
|---------------------------|-------------------|---------------------|
| Page load (4G)            | < 3 s             | Lighthouse CI       |
| Search / query response   | < 1 s p95 (< 2 s p95 for external-API extensions) | API integration test |
| Core action response      | < 200 ms perceived| Manual + perf test  |
| Web bundle (gzip)         | < 500 KB          | Bundle analyzer CI  |
| Test coverage (new code)  | ≥ 80 % lines      | Coverage report CI  |

All metrics MUST be verified before a feature is considered done. Regressions MUST be
treated as bugs with P1 priority.

## Development Workflow

- **Branch strategy**: Feature branches off `main`; branch name format `###-feature-name`.
- **Definition of Done**: Code merged to `main` MUST pass all tests, meet coverage thresholds,
  pass linting, and have no unresolved review comments.
- **Review requirement**: Every PR MUST be reviewed by at least one other person before merge.
- **Commit discipline**: Commits MUST be atomic and reference the task ID (e.g., `T012`).
- **Complexity gate**: Any deviation from MVP Simplicity (Principle V) MUST be recorded in
  the Complexity Tracking table in `plan.md` BEFORE implementation begins.
- **No skipping CI**: Hooks and CI checks MUST NOT be bypassed (`--no-verify` is forbidden
  without documented emergency approval).

## Governance

This constitution supersedes all other stated practices. When a conflict arises between
a team convention and a principle here, the constitution wins.

**Amendment procedure**:
1. Propose the change in writing with rationale and affected artifacts.
2. Obtain approval from the project lead (or unanimous team consent if no lead designated).
3. Increment the version (MAJOR/MINOR/PATCH per semantic versioning rules above).
4. Update `LAST_AMENDED_DATE` and propagate changes to dependent templates.

**Versioning policy**:
- MAJOR: Principle removed, renamed, or fundamentally redefined.
- MINOR: New principle or section added; material expansion of existing guidance.
- PATCH: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**: Every PR description MUST include a one-line Constitution Check
confirming no principle is violated, or explicitly documenting the justified exception.

**Version**: 1.1.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-26
