import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

def multi_doc_loader(pdf_paths: list[str]):
    all_chunks = []
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    for path in pdf_paths:
        if not os.path.exists(path):
            continue
        loader = PyPDFLoader(path)
        docs = loader.load()
        filename = os.path.basename(path)
        for doc in docs:
            doc.metadata["source_file"] = filename
        chunks = text_splitter.split_documents(docs)
        all_chunks.extend(chunks)

    return all_chunks
