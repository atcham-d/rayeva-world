# Module 1 — AI Auto-Category & Tag Generator

Standalone Rayeva module that auto-assigns product categories, SEO tags, and sustainability filters using Claude AI.

## Architecture

```
Frontend (React/Vite :5173)
        │  POST /api/category/categorize
        │  GET  /api/category/products
        ▼
Backend (Flask :5001)
  routes/category_routes.py     ← HTTP validation only
  services/category_service.py  ← AI prompt + business logic
  utils/
    anthropic_client.py         ← Claude API singleton
    supabase_client.py          ← Supabase singleton
    ai_logger.py                ← Prompt/response audit log
        │
        ▼
  Claude claude-opus-4-5        ← Constrained JSON output
        │
        ▼
  Supabase PostgreSQL
    products table              ← Categorized product records
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
python app.py           # Runs on :5001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev             # Runs on :5173
```

## API

### POST `/api/category/categorize`
```json
{
  "name": "Bamboo Toothbrush",
  "description": "Biodegradable bristles, plastic-free packaging, locally sourced bamboo",
  "price": 149
}
```
**Response:**
```json
{
  "product_id": "uuid",
  "result": {
    "primary_category": "Personal Care & Beauty",
    "sub_category": "Oral Care",
    "seo_tags": ["bamboo-toothbrush", "plastic-free-dental", "eco-oral-care", ...],
    "sustainability_filters": ["plastic-free", "biodegradable", "locally-sourced"],
    "reasoning": "..."
  }
}
```

### GET `/api/category/products`
Returns last 50 categorized products.

## Prompt Design

- Taxonomy is **injected into the prompt** — model can only pick from allowed categories and sustainability filters
- Response is constrained to **JSON only** (no markdown, no preamble)
- Server-side validation sanitizes the output before storing
- Every call is **logged** with prompt, response, token count, and latency
  
