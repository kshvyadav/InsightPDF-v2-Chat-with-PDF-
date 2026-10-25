import os
import shutil
from typing import List
import uvicorn
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.graph import stream_rag_sse
from src.indexing import (
    process_and_index_multiple_pdfs,
    get_indexing_status,
    clear_index
)

app = FastAPI(title="InsightPDF")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")
app.mount("/static", StaticFiles(directory="frontend"), name="static")

UPLOAD_DIR = "data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


class ChatRequest(BaseModel):
    query: str


@app.get("/")
async def serve_ui():
    return FileResponse("frontend/index.html")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/status")
async def status():
    state = get_indexing_status()
    message = (
        f"{len(state['files'])} document(s) indexed."
        if state["is_indexed"]
        else "No documents indexed yet."
    )
    return {
        "is_indexed": state["is_indexed"],
        "files": state["files"],
        "total_chunks": state["total_chunks"],
        "last_indexed_at": state["last_indexed_at"],
        "message": message
    }


@app.post("/upload")
async def upload_multiple_pdfs(files: List[UploadFile] = File(...)):
    saved_paths = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue

        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_paths.append(file_path)
        await file.close()

    if not saved_paths:
        raise HTTPException(status_code=400, detail="No valid PDF files found.")

    total_chunks = process_and_index_multiple_pdfs(saved_paths)

    return {
        "status": "success",
        "total_files": len(saved_paths),
        "total_chunks": total_chunks,
        "message": f"{len(saved_paths)} PDF(s) successfully indexed!"
    }


@app.post("/chat-stream")
async def chat_stream_endpoint(request: ChatRequest):
    user_query = request.query.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    return StreamingResponse(
        stream_rag_sse(user_query),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )


@app.post("/clear")
async def clear():
    clear_index()
    return {"status": "success", "message": "Index cleared."}


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)