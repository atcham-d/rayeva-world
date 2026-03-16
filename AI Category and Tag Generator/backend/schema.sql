

CREATE TABLE IF NOT EXISTS products (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT        NOT NULL,
    description     TEXT,
    price           NUMERIC(10,2),
    -- AI-generated fields
    primary_category        TEXT,
    sub_category            TEXT,
    seo_tags                TEXT[],
    sustainability_filters  TEXT[],
    raw_ai_output           JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Prompt + response audit log for all AI calls
CREATE TABLE IF NOT EXISTS ai_logs (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    module          TEXT        NOT NULL DEFAULT 'category_tagger',
    prompt          TEXT        NOT NULL,
    raw_response    TEXT        NOT NULL,
    parsed_output   JSONB,
    tokens_used     INTEGER,
    latency_ms      INTEGER,
    status          TEXT        DEFAULT 'success',
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON products(primary_category);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
