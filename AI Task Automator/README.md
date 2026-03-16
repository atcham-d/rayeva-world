# Module 2 — AI B2B Proposal Generator

Standalone Rayeva module that generates complete B2B procurement proposals with product mix, budget allocation, cost breakdown, and sustainability impact summary.

## Architecture

```
Frontend (React/Vite :5173)
        │  POST /api/proposal/generate
        │  GET  /api/proposal/list
        ▼
Backend (Flask :5002)
  routes/proposal_routes.py     ← HTTP validation only
  services/proposal_service.py  ← AI prompt + business logic
  utils/
    anthropic_client.py         ← Claude API singleton
    supabase_client.py          ← Supabase singleton
    ai_logger.py                ← Prompt/response audit log
        │
        ├── validate_budget()   ← Min ₹5K / Max ₹1Cr guard (pre-AI)
        ▼
  Claude claude-opus-4-5        ← Product mix + impact generation
        │
        ├── _parse_and_validate_proposal()
        │     Recalculates cost_breakdown server-side
        │     Enforces budget ceiling (2% tolerance)
        ▼
  Supabase PostgreSQL
    b2b_proposals table         ← Full proposal records
    ai_logs table               ← Every prompt + response logged
```

## Setup

### 1. Database
Paste `backend/schema.sql` into your Supabase SQL Editor and run it.

### 2. Backend
```bash
cd backend
cp .env.example .env    # Add ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
pip install -r requirements.txt
python app.py           # Runs on :5002
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev             # Runs on :5173
```

## API

### POST `/api/proposal/generate`
```json
{
  "company_name": "Zomato Procurement",
  "budget": 50000,
  "requirements": "Employee welcome kits for 200 staff, plastic-free daily items"
}
```
**Response:**
```json
{
  "proposal_id": "uuid",
  "result": {
    "product_mix": [
      { "product_id": "P003", "product_name": "Recycled Cotton Tote Bags", "quantity": 200, "unit_price": 180, "line_total": 36000, "rationale": "..." }
    ],
    "budget_allocation": { "total_budget": 50000, "allocated": 47200, "remaining": 2800, "utilization_pct": 94.4 },
    "cost_breakdown": { "products_subtotal": 47200, "estimated_gst_18pct": 8496, "estimated_shipping": 0, "grand_total": 55696 },
    "impact_summary": "...",
    "sustainability_highlights": ["plastic-free", "recycled", "locally-sourced"]
  }
}
```

### GET `/api/proposal/list`
Returns last 50 generated proposals.

## Key Design Decisions

- **Product catalog is injected into prompt** — AI can only pick from real catalog items
- **Budget guard is enforced server-side** — AI math is recalculated and clamped, never trusted blindly
- **GST + shipping logic lives in Python** — not delegated to AI
- **Every proposal is fully logged** with prompt, response, tokens, and latency
