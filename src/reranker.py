from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

def cross_encoder(hybrid_retriever, top_n: int = 3):
    rerank_model = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-base")
    compressor = CrossEncoderReranker(model=rerank_model, top_n=top_n)
    final_retriever = ContextualCompressionRetriever(
        base_compressor=compressor,
        base_retriever=hybrid_retriever
    )
    return final_retriever
