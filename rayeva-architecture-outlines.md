# Rayeva — Architecture Outlines: Module 3 & Module 4

---

## Module 3: AI Impact Reporting Generator

### What it does
After every order is placed, this module estimates the environmental impact of the purchased products — plastic saved, carbon avoided, and local sourcing footprint — and stores a human-readable impact statement alongside the order.

---

### Data Flow

```
Order Placed (webhook or post-order trigger)
        │
        ▼
impact_service.py
  ├── 1. Fetch order line items from Supabase (orders + order_items tables)
  ├── 2. For each product, look up sustainability_filters from products table
  ├── 3. Run formula-based estimates (pure Python — no AI for the math):
  │       plastic_saved_g    = qty * PLASTIC_WEIGHT_MAP[product_id]
  │       carbon_avoided_kg  = qty * CARBON_FACTOR_MAP[product_id]
  │       local_sourcing_pct = count(locally-sourced items) / total_items * 100
  ├── 4. Call Claude with structured data → generate human-readable narrative
  └── 5. Store impact_report JSON on the order record
```

---

### Folder Structure

```
module3-impact-reporting/
├── backend/
│   ├── app.py
│   ├── schema.sql
│   ├── .env.example
│   ├── requirements.txt
│   ├── routes/
│   │   └── impact_routes.py        # POST /api/impact/generate/<order_id>
│   │                               # GET  /api/impact/<order_id>
│   ├── services/
│   │   ├── impact_service.py       # Orchestrator
│   │   ├── estimation_engine.py    # Pure formula logic (no AI)
│   │   └── narrative_service.py    # Claude call for human-readable output
│   └── utils/
│       ├── anthropic_client.py
│       ├── supabase_client.py
│       └── ai_logger.py
└── frontend/
    └── src/App.jsx                 # Order lookup → impact report display
```

---

### Database Schema

```sql
-- Add to orders table (or create if not exists)
CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID REFERENCES orders(id),
    product_id  TEXT NOT NULL,
    product_name TEXT,
    quantity    INTEGER,
    unit_price  NUMERIC(10,2)
);

-- Impact report stored alongside the order
CREATE TABLE IF NOT EXISTS impact_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID REFERENCES orders(id) UNIQUE,
    plastic_saved_g     NUMERIC,
    carbon_avoided_kg   NUMERIC,
    local_sourcing_pct  NUMERIC,
    impact_statement    TEXT,           -- Claude-generated narrative
    raw_estimates       JSONB,
    raw_ai_output       JSONB,
    created_at          TIMESTAMPTZ DEFAULT now()
);
```

---

### estimation_engine.py (Key Logic)

```python
# Per-product sustainability lookup maps
# These would be seeded from product attributes in a real system
PLASTIC_SAVED_PER_UNIT_G = {
    "P001": 15,   # Bamboo Cutlery replaces ~15g plastic/set
    "P002": 8,    # Beeswax wrap replaces plastic film
    "P003": 5,    # Tote bag avoids single-use bags
    # ...
}

CARBON_AVOIDED_PER_UNIT_KG = {
    "P001": 0.12,
    "P002": 0.05,
    # ...
}

def estimate_impact(order_items: list[dict]) -> dict:
    total_plastic_g = sum(
        item["quantity"] * PLASTIC_SAVED_PER_UNIT_G.get(item["product_id"], 0)
        for item in order_items
    )
    total_carbon_kg = sum(
        item["quantity"] * CARBON_AVOIDED_PER_UNIT_KG.get(item["product_id"], 0)
        for item in order_items
    )
    local_count = count products with "locally-sourced" filter
    local_pct = local_count / len(order_items) * 100

    return {
        "plastic_saved_g": round(total_plastic_g, 2),
        "carbon_avoided_kg": round(total_carbon_kg, 3),
        "local_sourcing_pct": round(local_pct, 1),
    }
```

---

### Prompt Design (narrative_service.py)

```
You are a sustainability analyst for Rayeva.
Given these impact estimates for order #{order_id}:
  - Plastic saved: {plastic_saved_g}g
  - Carbon avoided: {carbon_avoided_kg}kg CO₂e
  - Local sourcing: {local_sourcing_pct}% of items locally sourced
  - Products purchased: {product_names}

Write a 3–4 sentence human-readable impact statement.
Tone: warm, factual, encouraging. No marketing fluff.
Return ONLY the statement text. No JSON, no preamble.
```

---

### API Endpoints

| Method | Endpoint                          | Description                     |
|--------|-----------------------------------|---------------------------------|
| POST   | `/api/impact/generate/<order_id>` | Run impact calc + store report  |
| GET    | `/api/impact/<order_id>`          | Fetch stored report for order   |
| GET    | `/api/impact/list`                | List all impact reports         |

---

### Evaluation Criteria Coverage

| Criteria              | How it's met                                              |
|-----------------------|-----------------------------------------------------------|
| Structured AI Outputs | JSON impact report stored in DB; narrative as plain text  |
| Business Logic        | Estimation engine uses formula maps, not AI for numbers  |
| Clean Architecture    | AI only writes prose; all math is Python-computed        |
| Practical Usefulness  | Report is stored with order, shareable with customers    |
| Creativity & Reasoning| Highlights plastic equivalents (e.g. "= 3 plastic bottles") |

---
---

## Module 4: AI WhatsApp Support Bot

### What it does
Receives inbound WhatsApp messages via the Meta Business API webhook, classifies intent, responds using real database data (order status), handles policy questions, escalates refund/priority issues to a human queue, and logs every conversation.

---

### Data Flow

```
User sends WhatsApp message
        │
        ▼
Meta Webhook → POST /api/whatsapp/webhook
        │
        ▼
webhook_handler.py
  ├── 1. Verify webhook signature (X-Hub-Signature-256)
  ├── 2. Parse sender, message_body, timestamp
  ├── 3. intent_classifier.py → Claude classifies intent:
  │       order_status | return_policy | refund_escalation | general
  ├── 4. Route to handler:
  │       order_status      → query orders table by order ID extracted from message
  │       return_policy     → return static policy text (no AI call, fast)
  │       refund_escalation → create escalation ticket + notify human agent
  │       general           → Claude generates contextual response
  ├── 5. whatsapp_sender.py → POST reply to Meta Graph API
  └── 6. Log full conversation turn to whatsapp_conversations table
```

---

### Folder Structure

```
module4-whatsapp-bot/
├── backend/
│   ├── app.py
│   ├── schema.sql
│   ├── .env.example
│   ├── requirements.txt
│   ├── routes/
│   │   └── whatsapp_routes.py      # GET  /api/whatsapp/webhook (verification)
│   │                               # POST /api/whatsapp/webhook (messages)
│   ├── services/
│   │   ├── webhook_handler.py      # Main orchestrator
│   │   ├── intent_classifier.py    # Claude intent detection
│   │   ├── order_lookup.py         # Supabase query for order status
│   │   ├── policy_handler.py       # Static policy responses (no AI)
│   │   ├── escalation_handler.py   # Creates escalation ticket
│   │   └── whatsapp_sender.py      # Meta Graph API sender
│   └── utils/
│       ├── anthropic_client.py
│       ├── supabase_client.py
│       └── ai_logger.py
└── frontend/
    └── src/App.jsx                 # Conversation log dashboard
```

---

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number    TEXT NOT NULL,
    wa_message_id   TEXT,
    direction       TEXT CHECK (direction IN ('inbound', 'outbound')),
    message_body    TEXT NOT NULL,
    intent          TEXT,   -- 'order_status' | 'return_policy' | 'refund_escalation' | 'general'
    response_body   TEXT,
    escalated       BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escalations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number    TEXT NOT NULL,
    reason          TEXT,
    original_message TEXT,
    status          TEXT DEFAULT 'open',  -- 'open' | 'resolved'
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

### intent_classifier.py (Key Logic)

```python
INTENT_PROMPT = """
Classify this WhatsApp message into exactly one intent:
- order_status     (asking about delivery, tracking, where is my order)
- return_policy    (asking about returns, exchanges, refunds policy)
- refund_escalation (demanding refund, angry about order, high-priority complaint)
- general          (anything else)

Message: "{message}"

Return ONLY a JSON object: {{ "intent": "<intent>", "order_id": "<extracted or null>" }}
"""
```

Intent is classified first (small, fast call). Then the appropriate handler fires. The AI is only used for `general` responses — `return_policy` is a static template, `order_status` is a DB lookup + template fill, `refund_escalation` is rule-based.

---

### whatsapp_sender.py

```python
import httpx, os

async def send_message(to: str, body: str) -> None:
    url = f"https://graph.facebook.com/v19.0/{os.getenv('WA_PHONE_NUMBER_ID')}/messages"
    headers = {
        "Authorization": f"Bearer {os.getenv('WA_ACCESS_TOKEN')}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": { "body": body }
    }
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)
```

---

### .env additions (beyond standard)

```env
WA_PHONE_NUMBER_ID=your_meta_phone_number_id
WA_ACCESS_TOKEN=your_meta_access_token
WA_VERIFY_TOKEN=your_custom_webhook_verify_token
```

---

### API Endpoints

| Method | Endpoint                       | Description                              |
|--------|--------------------------------|------------------------------------------|
| GET    | `/api/whatsapp/webhook`        | Meta webhook verification (token check) |
| POST   | `/api/whatsapp/webhook`        | Receive inbound messages                 |
| GET    | `/api/whatsapp/conversations`  | List all logged conversations            |
| GET    | `/api/whatsapp/escalations`    | List open escalation tickets             |

---

### Escalation Logic

```
if intent == "refund_escalation":
    1. Insert row into escalations table (status='open')
    2. Reply to user: "We've flagged this for our team. You'll hear back in 2-4 hours."
    3. (Optional) Send internal Slack/email alert via webhook
    4. Log conversation with escalated=true
```

---

### Evaluation Criteria Coverage

| Criteria              | How it's met                                               |
|-----------------------|------------------------------------------------------------|
| Structured AI Outputs | Intent classified as JSON; all conversations logged in DB  |
| Business Logic        | Order lookup uses real DB data; escalation is rule-based  |
| Clean Architecture    | AI only used for intent + general; all other paths are static |
| Practical Usefulness  | Works with real WhatsApp Business API                      |
| Creativity & Reasoning| Escalation + human handoff logic; stateful conversation log |
