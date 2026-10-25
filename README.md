# 📄 InsightPDF — Advanced Agentic RAG Chat with PDF

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%20%7C%203.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/LangGraph-StateGraph-FF9900?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph" />
  <img src="https://img.shields.io/badge/ChromaDB-VectorStore-000000?style=for-the-badge" alt="ChromaDB" />
  <img src="https://img.shields.io/badge/Ollama-Llama_3.2-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 🌟 Overview

**InsightPDF** is a production-grade **Agentic Retrieval-Augmented Generation (RAG)** application designed for precision document question-answering. It combines **Dense Semantic Embeddings**, **Sparse Keyword Matching (BM25)**, and a **Cross-Encoder Re-ranker** into an **Agentic LangGraph Workflow**, streaming live grounded responses directly to an ultra-modern glassmorphic web console via **Server-Sent Events (SSE)**.

---

## ✨ Key Features

- **📑 Multi-PDF Document Ingestion**: Upload and parse single or multiple PDF documents simultaneously with recursive chunking and source metadata preservation.
- **🔍 Hybrid Search Architecture**: Combines dense vector retrieval (`sentence-transformers/all-MiniLM-L6-v2` via ChromaDB) and lexical keyword matching (`BM25Retriever`) using weighted reciprocal rank fusion (`EnsembleRetriever`).
- **🎯 Cross-Encoder Re-ranking**: Integrates `BAAI/bge-reranker-base` to score and filter top-relevance context chunks, drastically eliminating hallucinations and irrelevant noise.
- **🕸️ Agentic LangGraph Pipeline**: Graph-based state machine (`StateGraph`) structuring retrieval and contextual generation as decoupled, observable graph nodes.
- **⚡ Real-time SSE Token Streaming**: True Server-Sent Events (SSE) streaming delivering token-by-token LLM output with interactive thinking state transitions.
- **🔍 Verifiable Citations**: Expandable citation cards showing ranked source snippets, document filenames, and page numbers for strict auditability.
- **🎨 Glassmorphic Dark UI**: Modern dark console with real-time indexing pipeline progress, active document cards, and responsive interactions.



---

## 📁 Repository Structure

```text
Chat With PDF/
├── Dockerfile            # Container build instructions
├── .dockerignore         # Docker context exclusions
├── main.py               # FastAPI application, static routing & SSE endpoints
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore specification
├── src/                  # Core RAG & LangGraph Engine
│   ├── __init__.py       # Package marker
│   ├── loader.py         # PDF parsing & recursive text chunking
│   ├── vectorstore.py    # Chroma dense + BM25 sparse hybrid retriever
│   ├── reranker.py       # Contextual compression & cross-encoder reranker
│   ├── indexing.py       # Global retriever state & document registry
│   └── graph.py          # LangGraph state machine & SSE streaming generator
├── frontend/             # Frontend Single-Page Interface
│   ├── index.html        # Glassmorphic layout & layout structure
│   ├── style.css         # Custom dark design system
│   └── script.js         # Reactive UI, drag & drop, SSE streaming client
└── data/                 # Directory for indexed PDF files (.gitkeep)
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Python 3.10+** (if running locally without Docker)
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (if running with Docker)
- **[Ollama](https://ollama.ai/)** installed and running on your system.
  
Pull the default language model:
```bash
ollama run llama3.2
```

---

### 2. Local Setup (Without Docker)

#### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/InsightPDF.git
cd InsightPDF
```

#### Step 2: Create a Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 4: Configure Environment Variables
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional)* Customize host, port, or model settings inside `.env`:
```env
HOST=127.0.0.1
PORT=8000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

#### Step 5: Start the Application
```bash
python main.py
```
Or with Uvicorn:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser and navigate to:
```
http://127.0.0.1:8000
```

---

### 3. Docker Setup (Recommended / Quick Run)

If you prefer running the application in an isolated container without setting up a local Python virtual environment:

#### Step 1: Build the Docker Image
Run the following build command in the root project directory:
```bash
docker build -t insight-pdf .
```
> *This packages the application source code and all required dependencies into a lightweight, standalone Docker image.*

#### Step 2: Run the Docker Container
Start the container using the appropriate command for your OS:

- **Windows / macOS:**
  ```bash
  docker run -d -p 8000:8000 -e OLLAMA_BASE_URL="http://host.docker.internal:11434" --name insight-pdf-app insight-pdf
  ```

- **Linux:**
  ```bash
  docker run -d -p 8000:8000 --add-host=host.docker.internal:host-gateway -e OLLAMA_BASE_URL="http://host.docker.internal:11434" --name insight-pdf-app insight-pdf
  ```

> **💡 Note on Ollama Connectivity:** Setting `OLLAMA_BASE_URL="http://host.docker.internal:11434"` allows the Docker container to communicate seamlessly with the local Ollama instance running on your host machine.

#### Step 3: Access the Web UI
Open your browser and navigate to:
```
http://localhost:8000
```

#### 🛠️ Useful Docker Commands:
```bash
# Stream real-time container logs:
docker logs -f insight-pdf-app

# Stop the running container:
docker stop insight-pdf-app

# Restart the stopped container:
docker start insight-pdf-app

# Remove the container:
docker rm -f insight-pdf-app
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the web interface (`index.html`) |
| `GET` | `/health` | Application healthcheck endpoint |
| `GET` | `/status` | Returns index status, active documents count & chunk metadata |
| `POST` | `/upload` | Uploads and indexes multiple PDF files |
| `POST` | `/chat-stream` | Streams RAG answer via Server-Sent Events (`text/event-stream`) |
| `POST` | `/clear` | Clears active index and memory state |

---
