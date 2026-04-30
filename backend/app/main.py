import os
import tempfile
from typing import Literal

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
import asyncio

from app.config import load_environment
from app.services.resume_parser import parse_resume_and_enrich, save_extracted_data_to_json

load_environment()

app = FastAPI(title="Kovidam Skill Graph API")

# Limit in-process resume parsing concurrency. Default: 2 at a time.
RESUME_CONCURRENCY = max(1, int(os.getenv("RESUME_CONCURRENCY", "2")))
resume_semaphore = asyncio.Semaphore(RESUME_CONCURRENCY)


@app.get("/")
async def root():
    return {
        "message": "Welcome to Kovidam Skill Graph API",
        "resume_concurrency": RESUME_CONCURRENCY,
    }


async def _process_resume_file(file: UploadFile, role: str):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=f"Only PDF files are supported: {file.filename}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        async with resume_semaphore:
            result = await parse_resume_and_enrich(tmp_path, role=role)

        saved_json_path = save_extracted_data_to_json(result, file.filename)
        return {
            "filename": file.filename,
            "extracted": result,
            "saved_json_path": saved_json_path,
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/resume/extract")
async def extract_resume(
    file: UploadFile = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
):
    try:
        return await _process_resume_file(file, role)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/resume/extract/batch")
async def extract_resume_batch(
    files: list[UploadFile] = File(...),
    role: Literal["job", "internship"] = Form(default="job"),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    tasks = [asyncio.create_task(_process_resume_file(file, role)) for file in files]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    response_items = []
    for file, outcome in zip(files, results):
        if isinstance(outcome, Exception):
            response_items.append({
                "filename": file.filename,
                "ok": False,
                "error": str(outcome),
            })
        else:
            response_items.append({
                "filename": file.filename,
                "ok": True,
                "result": outcome,
            })

    return {
        "count": len(files),
        "resume_concurrency": RESUME_CONCURRENCY,
        "items": response_items,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
