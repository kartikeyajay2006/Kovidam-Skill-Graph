import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile

from app.services.resume_parser import parse_resume_and_enrich, save_extracted_data_to_json

app = FastAPI(title="Kovidam Skill Graph API")


@app.get("/")
async def root():
    return {"message": "Welcome to Kovidam Skill Graph API"}


@app.post("/resume/extract")
async def extract_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        result = parse_resume_and_enrich(tmp_path)
        saved_json_path = save_extracted_data_to_json(result, file.filename)
        return {
            "filename": file.filename,
            "extracted": result,
            "saved_json_path": saved_json_path,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
