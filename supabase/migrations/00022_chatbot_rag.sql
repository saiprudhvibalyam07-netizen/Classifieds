-- Phase 2: RAG Knowledge Base & Marketplace Intelligence
-- Adds pgvector support, knowledge base tables, and marketplace integration

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Knowledge documents table
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('faq', 'policy', 'help_center', 'documentation')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge chunks with embeddings
CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  tokens INTEGER DEFAULT 0,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- pgvector index for similarity search
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index for keyword search
ALTER TABLE knowledge_chunks ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX idx_knowledge_chunks_search ON knowledge_chunks USING GIN (search_vector);

-- Marketplace listings cache (public data)
CREATE TABLE marketplace_listings_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  seller_id UUID,
  status TEXT DEFAULT 'active',
  images TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Marketplace categories cache
CREATE TABLE marketplace_categories_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES marketplace_categories_cache(id),
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Public seller profiles cache
CREATE TABLE marketplace_sellers_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 0,
  listing_count INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Embedding cache table
CREATE TABLE embedding_cache (
  text_hash TEXT PRIMARY KEY,
  embedding VECTOR(1536) NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_knowledge_chunks_document ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_sequence ON knowledge_chunks(document_id, sequence);
CREATE INDEX idx_knowledge_documents_source ON knowledge_documents(source_type);
CREATE INDEX idx_marketplace_listings_category ON marketplace_listings_cache(category);
CREATE INDEX idx_marketplace_listings_location ON marketplace_listings_cache(location);
CREATE INDEX idx_marketplace_listings_price ON marketplace_listings_cache(price);

-- RLS policies
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_sellers_cache ENABLE ROW LEVEL SECURITY;

-- Everyone can read knowledge base (public)
CREATE POLICY knowledge_documents_select ON knowledge_documents
  FOR SELECT USING (true);

CREATE POLICY knowledge_chunks_select ON knowledge_chunks
  FOR SELECT USING (true);

CREATE POLICY marketplace_listings_select ON marketplace_listings_cache
  FOR SELECT USING (status = 'active');

CREATE POLICY marketplace_categories_select ON marketplace_categories_cache
  FOR SELECT USING (true);

CREATE POLICY marketplace_sellers_select ON marketplace_sellers_cache
  FOR SELECT USING (true);

-- Admin-only writes
CREATE POLICY knowledge_documents_insert ON knowledge_documents
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
    OR auth.uid() IS NULL
  );

CREATE POLICY knowledge_documents_update ON knowledge_documents
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY knowledge_documents_delete ON knowledge_documents
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Helper function: similarity search
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  filter_source_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  sequence INTEGER,
  tokens INTEGER,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.content,
    kc.sequence,
    kc.tokens,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.embedding IS NOT NULL
    AND (filter_source_type IS NULL OR kc.metadata->>'sourceType' = filter_source_type)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Helper function: hybrid search (vector + full-text)
CREATE OR REPLACE FUNCTION hybrid_search_knowledge(
  query_embedding VECTOR(1536),
  query_text TEXT,
  match_count INTEGER DEFAULT 5,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  sequence INTEGER,
  metadata JSONB,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  vector_score FLOAT;
  text_score FLOAT;
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      kc.id,
      kc.document_id,
      kc.content,
      kc.sequence,
      kc.metadata,
      1 - (kc.embedding <=> query_embedding) AS vector_similarity
    FROM knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      kc.id,
      ts_rank(kc.search_vector, plainto_tsquery('english', query_text)) AS text_rank
    FROM knowledge_chunks kc
    WHERE kc.search_vector @@ plainto_tsquery('english', query_text)
    LIMIT match_count * 2
  )
  SELECT
    vr.id,
    vr.document_id,
    vr.content,
    vr.sequence,
    vr.metadata,
    (semantic_weight * COALESCE(vr.vector_similarity, 0) + keyword_weight * COALESCE(tr.text_rank, 0)) AS score
  FROM vector_results vr
  LEFT JOIN text_results tr ON vr.id = tr.id
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
