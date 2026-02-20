# SpEdGalexii RUNBOOK (MVP)

Operational guide for running and verifying the Galaxy UI + Python pipeline in a district environment.

---

## 1. Prerequisites

- Node.js and npm installed
- Python 3 installed
- This repo checked out with the expected folder layout:
  - `input/_CANONICAL/`
  - `input/_REFERENCE/`
  - `ieps/`
  - `output/`
- Python virtualenv set up at `AccommodationsAudit/.venv` with all required packages
- Environment variables configured in `galaxy-iep-accommodations/.env.local` (see `PRODUCT_READINESS.md`):
  - `GALEXII_AUTH_ENABLED`, `GALEXII_AUTH_SECRET`, `GALEXII_ADMIN_PASSWORD`, `GALEXII_CASE_MANAGER_PASSWORD` (for basic auth)
  - `OPENAI_API_KEY` if using AI features (optional)

---

## 2. Starting the app

From `galaxy-iep-accommodations/`:

```bash
npm install
npm run dev
```

App will default to `http://localhost:3000`.

If basic auth is enabled, open `/login` first and sign in with the shared role password.

---

## 3. Smoke tests (fast sanity check)

Purpose: confirm core APIs respond and basic wiring is intact.

1. Ensure `npm run dev` is running on port 3000.
2. In another terminal, from `galaxy-iep-accommodations/` run:

```bash
npm run smoke
```

What it does (current scope):

- Hits `GET /api/preflight?module=goals&scope=all` and asserts:
  - HTTP 200
  - `ok: true` in the JSON body
  - `checks` is an array

If this fails:

- Check that the dev server is running on `http://localhost:3000`.
- Inspect the console output for detailed error messages.
- Verify that `input/_CANONICAL/` exists (preflight expects that folder).

You can override the base URL for smoke tests with:

```bash
SMOKE_BASE_URL="https://your-domain" npm run smoke
```

---

## 4. Common run flow (manual)

1. Place up-to-date exports into `input/_CANONICAL/` and IEP PDFs into `ieps/`.
2. In Galaxy, sign in and go to a module (e.g. Goals Galexii).
3. Run the module from the UI.
4. If it fails:
   - Use the **Preflight checklist** on the card to see missing inputs.
   - Open the run log in the UI to see Python error details.

---

## 5. Cleaning up cached runs (disk space)

Each module run creates a timestamped folder under `output/_runs/` that stores
logs and artifacts for that specific run. Over time, this history can grow
large.

To keep disk usage under control while still preserving recent runs, you can
periodically prune old run folders from `galaxy-iep-accommodations/` with:

```bash
npm run cleanup:runs
```

This keeps the 20 most recent run folders and deletes older ones. It does **not**
touch top-level summary files (like `ARD_Summary_*.pptx` or
`DEEP_DIVE_*.json`) in `output/` or `audit/`.

You can add this as a scheduled task/cron job if desired.

---

## 6. Basic troubleshooting

- **Upload errors**
  - Check file size limits in `src/app/api/upload/route.ts`.
  - Confirm you’re uploading `.csv`, `.xlsx`, `.xls`, or `.pdf` only.

- **Run errors**
  - Use the error message and log tail returned by `/api/run`.
  - Verify required CSVs for the module are present (see preflight checks).

- **Auth issues**
  - Confirm `GALEXII_AUTH_SECRET` is set and at least 16 characters.
  - Confirm role passwords are set and match what you’re entering.

This RUNBOOK is intentionally lightweight; expand it with district-specific steps as you standardize your data exports and deployment process.
