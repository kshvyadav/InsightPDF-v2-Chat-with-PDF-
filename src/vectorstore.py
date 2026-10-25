from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

def vectorStore(chunks):
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings
    )
    dense_retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    sparse_retriever = BM25Retriever.from_documents(chunks)
    sparse_retriever.k = 3

    hybrid_retriever = EnsembleRetriever(
        retrievers=[dense_retriever, sparse_retriever],
        weights=[0.6, 0.4]
    )
    return hybrid_retriever
