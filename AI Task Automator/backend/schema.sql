

CREATE TABLE IF NOT EXISTS b2b_proposals (
    id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name        TEXT        NOT NULL,
    budget              NUMERIC(12,2) NOT NULL,
    requirements        TEXT,
    -- AI-generated fields
    product_mix         JSONB,
    budget_allocation   JSONB,
    cost_breakdown      JSONB,
    impact_summary      TEXT,
    sustainability_highlights TEXT[],
    raw_ai_output       JSONB,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Prompt + response audit log
CREATE TABLE IF NOT EXISTS ai_logs (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    module          TEXT        NOT NULL DEFAULT 'b2b_proposal',
    prompt          TEXT        NOT NULL,
    raw_response    TEXT        NOT NULL,
    parsed_output   JSONB,
    tokens_used     INTEGER,
    latency_ms      INTEGER,
    status          TEXT        DEFAULT 'success',
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_company ON b2b_proposals(company_name);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON b2b_proposals(created_at DESC);
