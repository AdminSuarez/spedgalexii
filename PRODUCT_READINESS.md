# SpEdGalexii Product Readiness Checklist

This checklist captures the work needed to make the app production‑ready for **case managers**, **parents**, and **students**.

Use these as living checkboxes in VS Code / Git.

---

## 1. Data Pipeline & Preflight

- [x] Per‑module preflight checks for Goals / PLAAFP / Services (CSV + IEP folder + roster)
- [ ] Extend preflight to Accommodations, Compliance, Assessments (expected exports present)
- [ ] Show preflight status inline on each module page (small explainer text)
- [ ] Add explicit mapping docs for required exports (file name patterns, where to download from Frontline/TestHound)

## 2. Case Manager Experience

- [ ] Orbit Hub: "Upload once, run all" clearly described (inputs list + expected outputs)
- [ ] Each module page shows: last run time, scope, case manager name, and quick stats (e.g., counts of flags)
- [ ] Case‑manager scope: warning when selected case manager has 0 students in `roster.csv`
- [ ] Easy navigation from a case manager view to an individual student (Deep Dive + Copilot)

## 3. Parent & Student Experience

- [ ] Define a parent/student entry point (separate route or mode) that hides raw logs and spreadsheets
- [ ] Single‑student narrative view:
  - [ ] Plain‑language PLAAFP summary
  - [ ] List of current goals (with human‑readable labels)
  - [ ] Key accommodations and services summary
  - [ ] "Last updated" and "who to contact" line
- [ ] Copy review for parent‑facing language (no jargon, clear disclaimers)

## 4. Galexii Copilot (Chat)

- [ ] Handle missing Deep Dive / audit data with friendly messages (not generic errors)
- [ ] Make audience mode (case manager vs parent) clearly affect tone and depth of answers
- [ ] Add a short safety/limitations note near the chat input ("support tool, not legal advice")

## 5. Error Handling & Observability

- [x] Hide raw exit codes in UI in favor of human messages where possible
- [ ] Map common Python failures to user‑facing guidance (missing CSVs, misnamed files, encoding issues)
- [ ] Provide a "See technical log" link for power users instead of dumping logs by default

## 6. Authentication & Roles

> Scope can be lightweight to start, but we should make the distinction explicit.

- [ ] Decide on minimal auth model for first deploy (e.g., single shared campus password; SSO later)
- [ ] Implement role separation: staff vs parent/student (even if via config flag initially)
- [ ] Guard staff‑only routes (audit dashboards, raw logs, configuration views)

## 7. Testing & QA

- [ ] Unit tests for Python extractors (goals, PLAAFP, services) using canned exports
- [ ] Integration tests: call `/api/run` against a tiny test dataset and assert required outputs exist
- [x] Smoke test script: one command that runs basic API checks locally (`npm run smoke`)

## 8. Documentation & Onboarding

- [ ] `RUNBOOK.md` for staff:
  - [ ] Where to download each export from SIS/TestHound/Frontline
  - [ ] How often to refresh data
  - [ ] How to interpret each module’s outputs
- [ ] Quickstart one‑pager for parents/students (web page or PDF)
- [ ] In‑app tooltips or "?" hints on tricky concepts (PLAAFP completeness, TEA rubric language, etc.)

## 9. Deployment & Ops

- [x] Decide deployment target (local install vs hosted) → **Recommended: district self‑host (Node + Python on one box), with optional SaaS path** (see `DEPLOYMENT.md`)
- [x] Document required environment variables and folder layout (`input/`, `output/`, `ieps/`, `audit/`) → see `DEPLOYMENT.md` and `RUNBOOK.md`
- [ ] Provide a simple setup script or `README` section for districts to install and run
- [ ] Basic backup strategy for `output/` and configuration

---

### Recommended Order (ASAP Path)

1. **Finish preflight + module explanations** so case managers never have to read raw logs to know what’s missing.
2. **Tighten case‑manager experience** (last run summary, scope warnings, quick stats on each module page).
3. **Ship a minimal parent/student narrative view** for a single student, read‑only and clearly labeled.
4. **Harden Copilot and error messages** so failures are understandable and safe.
5. **Add runbook + minimal auth/role separation** to support real‑world deployment.

We can iterate through these in small PRs so you always have a shippable, incrementally better app rather than a huge all‑or‑nothing jump.
