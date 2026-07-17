# Retrieval

The initial retrieval boundary is provider-neutral. A production implementation
can combine PostgreSQL full-text search, pgvector embeddings, metadata filters,
and a reranker.

Preserve source identifiers, chunk versions, embedding model/version, and the
retrieval configuration in every AI result. Do not silently alter source text
before storing offsets or citations.
