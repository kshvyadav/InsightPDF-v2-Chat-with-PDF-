import os
from datetime import datetime
from src.loader import multi_doc_loader
from src.vectorstore import vectorStore
from src.reranker import cross_encoder

CURRENT_RETRIEVER = None
INDEX_STATE = {
    "is_indexed": False,
    "files": [],
    "total_chunks": 0,
    "last_indexed_at": None
}

def process_and_index_multiple_pdfs(file_paths: list[str]):
    global CURRENT_RETRIEVER, INDEX_STATE

    chunks = multi_doc_loader(file_paths)
    if not chunks:
        return 0

    hybrid_retriever = vectorStore(chunks)
    CURRENT_RETRIEVER = cross_encoder(hybrid_retriever)

    INDEX_STATE["is_indexed"] = True
    INDEX_STATE["files"] = [os.path.basename(p) for p in file_paths]
    INDEX_STATE["total_chunks"] = len(chunks)
    INDEX_STATE["last_indexed_at"] = datetime.now().isoformat()
    return len(chunks)

def get_active_retriever():
    return CURRENT_RETRIEVER

def get_indexing_status():
    return INDEX_STATE

def clear_index():
    global CURRENT_RETRIEVER, INDEX_STATE
    CURRENT_RETRIEVER = None
    INDEX_STATE = {
        "is_indexed": False,
        "files": [],
        "total_chunks": 0,
        "last_indexed_at": None
    }
