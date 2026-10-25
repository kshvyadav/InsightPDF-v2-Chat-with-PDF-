import os
import json
from typing import List, TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_ollama import ChatOllama
from dotenv import load_dotenv
from src.indexing import get_active_retriever

load_dotenv()

ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")
llm = ChatOllama(model=ollama_model, base_url=ollama_base_url)

class GraphState(TypedDict):
    question: str
    documents: List[str]
    generation: str

def retrieve_node(state: GraphState):
    question = state["question"]
    active_retriever = get_active_retriever()
    if active_retriever is None:
        return {"documents": []}
    docs = active_retriever.invoke(question)
    return {"documents": [doc.page_content for doc in docs]}

def generate_node(state: GraphState):
    question = state["question"]
    docs = state.get("documents", [])
    context = "\n\n".join(docs) if docs else "No relevant context found."

    prompt_text = f"""You are a helpful assistant. Answer the question using ONLY the provided context.
If the answer is not in the context, say "I don't know based on this document."

Context:
{context}

Question: {question}
Answer:"""

    response = llm.invoke(prompt_text)
    return {"generation": response.content}

workflow = StateGraph(GraphState)
workflow.add_node("retrieve", retrieve_node)
workflow.add_node("generate", generate_node)
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "generate")
workflow.add_edge("generate", END)

app = workflow.compile()

def stream_rag_sse(question: str):
    active_retriever = get_active_retriever()
    if active_retriever is None:
        yield f"data: {json.dumps({'error': 'Please upload a PDF document first!'})}\n\n"
        return

    yield f"data: {json.dumps({'status': 'thinking', 'message': 'Searching documents & applying cross-encoder reranker...'})}\n\n"

    raw_docs = active_retriever.invoke(question)
    sources = []
    doc_contents = []

    for idx, doc in enumerate(raw_docs, 1):
        filename = doc.metadata.get("source_file", "Document")
        page_num = doc.metadata.get("page", 0) + 1 if "page" in doc.metadata else None
        content = doc.page_content.strip()
        doc_contents.append(content)
        sources.append({
            "rank": idx,
            "filename": filename,
            "page": page_num,
            "content": content
        })

    yield f"data: {json.dumps({'sources': sources})}\n\n"

    for chunk, metadata in app.stream(
        {"question": question, "documents": doc_contents},
        stream_mode="messages"
    ):
        if metadata.get("langgraph_node") == "generate":
            token = chunk.content
            if token:
                payload = json.dumps({"token": token})
                yield f"data: {payload}\n\n"

    yield f"data: {json.dumps({'done': True})}\n\n"

def ask_rag(question: str) -> str:
    state = app.invoke({"question": question})
    return state.get("generation", "")
