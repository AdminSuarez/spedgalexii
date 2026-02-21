import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Deep Space Analyzer API")


class FileRef(BaseModel):
    name: str
    url: str


class AnalyzeRequest(BaseModel):
    studentId: str
    files: List[FileRef]
    assessmentProfile: Optional[str] = None


class AnalyzeResponse(BaseModel):
    analysis: dict
    report: Optional[str] = None


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


def _get_analyzer_path() -> Path:
    env_path = os.getenv("ANALYZER_PATH")
    if env_path:
        p = Path(env_path)
        if p.is_file():
            return p

    # Default: expect analyzer script in ./scripts relative to this file
    return Path(__file__).parent / "scripts" / "deep_dive_analyzer.py"


async def _download_file(client: httpx.AsyncClient, url: str, dest: Path) -> None:
    try:
        async with client.stream("GET", url, timeout=60) as resp:
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Download failed ({resp.status_code}) for {url}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            with dest.open("wb") as f:
                async for chunk in resp.aiter_bytes():
                    f.write(chunk)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Error downloading {url}: {exc}") from exc


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    if not req.studentId.strip():
        raise HTTPException(status_code=400, detail="studentId is required")
    if not req.files:
        raise HTTPException(status_code=400, detail="At least one file is required")

    analyzer_path = _get_analyzer_path()
    if not analyzer_path.exists():
        raise HTTPException(status_code=500, detail=f"Analyzer script not found at {analyzer_path}")

    work_root = Path(tempfile.mkdtemp(prefix="deep-space-"))
    ieps_dir = work_root / "ieps"
    audit_dir = work_root / "audit"

    try:
        async with httpx.AsyncClient() as client:
            for f in req.files:
                safe_name = f.name or f"{req.studentId}.pdf"
                if not safe_name.lower().endswith(".pdf"):
                    safe_name += ".pdf"
                if not safe_name.startswith(req.studentId):
                    safe_name = f"{req.studentId}_" + safe_name
                dest = ieps_dir / safe_name
                await _download_file(client, f.url, dest)

        env = os.environ.copy()
        env["GALEXII_IEP_FOLDER"] = str(ieps_dir)
        env["GALEXII_OUTPUT_FOLDER"] = str(audit_dir)
        if req.assessmentProfile:
            env["GALEXII_ASSESSMENT_PROFILE"] = req.assessmentProfile

        import subprocess

        try:
            completed = subprocess.run(
                ["python3", str(analyzer_path), "--student", req.studentId],
                cwd=str(work_root),
                env=env,
                capture_output=True,
                text=True,
                timeout=120,
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=500, detail="python3 is not available in this environment") from exc
        except subprocess.TimeoutExpired as exc:
            raise HTTPException(status_code=504, detail="Analyzer timed out") from exc

        if completed.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Analyzer failed: {completed.stderr[:4000]}")

        base = f"DEEP_DIVE_{req.studentId}"
        json_path = audit_dir / f"{base}.json"
        md_path = audit_dir / f"{base}_REPORT.md"

        if not json_path.exists():
            raise HTTPException(status_code=500, detail=f"Expected analysis file not found: {json_path}")

        import json

        with json_path.open("r", encoding="utf-8") as jf:
            analysis = json.load(jf)

        report_text: Optional[str] = None
        if md_path.exists():
            report_text = md_path.read_text(encoding="utf-8")

        return AnalyzeResponse(analysis=analysis, report=report_text)

    finally:
        try:
            shutil.rmtree(work_root)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
