# Deep Space Analyzer API

FastAPI wrapper around the Deep Space Python analyzer.

## Local development

```bash
cd deep-space-api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The API will be available on `http://localhost:8000`.

- `GET /health` — basic health check
- `POST /analyze` — runs the analyzer

## Render configuration

- Root Directory: `deep-space-api`
- Build Command:

  ```bash
  pip install -r requirements.txt
  ```

- Start Command:

  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

Set `ANALYZER_PATH` if your `deep_dive_analyzer.py` lives somewhere other than `../scripts/deep_dive_analyzer.py`.
