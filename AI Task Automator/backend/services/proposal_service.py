"""
Module 2: AI B2B Proposal Generator
- Suggests a sustainable product mix
- Budget allocation within provided limit
- Estimated cost breakdown
- Impact positioning summary
- Returns structured JSON and stores in Supabase
"""

import json
import time
from typing import Any
from utils.anthropic_client import get_anthropic
from utils.ai_logger import log_ai_call

# ── Business Logic ────────────────────────────────────────────────────────────

PRODUCT_CATALOG = [
    {"id": "P001", "name": "Bamboo Cutlery Set", "unit_price": 299, "category": "Home & Living", "sustainability": ["plastic-free", "biodegradable"]},
    {"id": "P002", "name": "Organic Beeswax Wraps (3-pack)", "unit_price": 450, "category": "Home & Living", "sustainability": ["plastic-free", "compostable", "organic"]},
    {"id": "P003", "name": "Recycled Cotton Tote Bags (bulk)", "unit_price": 180, "category": "Clothing & Apparel", "sustainability": ["recycled", "plastic-free"]},
    {"id": "P004", "name": "Seed Paper Notepads", "unit_price": 120, "category": "Office & Stationery", "sustainability": ["biodegradable", "zero-waste"]},
    {"id": "P005", "name": "Cold-Pressed Moringa Oil (50ml)", "unit_price": 680, "category": "Personal Care & Beauty", "sustainability": ["organic", "natural-ingredients", "locally-sourced"]},
    {"id": "P006", "name": "Compostable Mailer Bags (100-pack)", "unit_price": 850, "category": "Office & Stationery", "sustainability": ["compostable", "plastic-free", "zero-waste"]},
    {"id": "P007", "name": "Stainless Steel Water Bottles", "unit_price": 550, "category": "Health & Wellness", "sustainability": ["plastic-free", "refillable"]},
    {"id": "P008", "name": "Neem Wood Combs (6-pack)", "unit_price": 360, "category": "Personal Care & Beauty", "sustainability": ["plastic-free", "natural-ingredients", "locally-sourced"]},
    {"id": "P009", "name": "Jute Gift Hamper Baskets", "unit_price": 220, "category": "Gifts & Lifestyle", "sustainability": ["biodegradable", "locally-sourced"]},
    {"id": "P010", "name": "Handmade Soy Wax Candles", "unit_price": 390, "category": "Home & Living", "sustainability": ["vegan", "natural-ingredients"]},
]

def validate_budget(budget: float) -> None:
    if budget < 5000:
        raise ValueError("Minimum B2B budget is ₹5,000")
    if budget > 10_000_000:
        raise ValueError("Budget exceeds ₹1 crore — please contact our enterprise team")

# ── Prompt Engineering ────────────────────────────────────────────────────────

def _build_proposal_prompt(company: str, budget: float, requirements: str) -> str:
    return f"""You are a B2B sustainability consultant for Rayeva, helping businesses source eco-friendly products.

Generate a detailed procurement proposal for the following client:

Company: {company}
Budget: ₹{budget:,.2f}
Requirements / Use Case: {requirements}

Available product catalog:
{json.dumps(PRODUCT_CATALOG, indent=2)}

Return ONLY a JSON object with these exact fields:
{{
  "product_mix": [
    {{
      "product_id": "<from catalog>",
      "product_name": "<from catalog>",
      "quantity": <integer>,
      "unit_price": <from catalog>,
      "line_total": <quantity * unit_price>,
      "rationale": "<why this product fits the client>"
    }}
  ],
  "budget_allocation": {{
    "total_budget": {budget},
    "allocated": <sum of all line_totals>,
    "remaining": <budget - allocated>,
    "utilization_pct": <allocated/budget*100 rounded to 1 decimal>
  }},
  "cost_breakdown": {{
    "products_subtotal": <sum of line_totals>,
    "estimated_gst_18pct": <products_subtotal * 0.18>,
    "estimated_shipping": <flat 250 if allocated < 5000 else 0>,
    "grand_total": <products_subtotal + gst + shipping>
  }},
  "impact_summary": "<3-4 sentence paragraph on environmental and business impact of this procurement>",
  "sustainability_highlights": ["<key sustainable attributes of chosen products>"]
}}

Rules:
- Stay within the budget (allocated must not exceed total_budget).
- Choose 3–6 products from the catalog. You may repeat products with different quantities.
- Prioritize products that align with the client's requirements.
- All numeric fields must be numbers, not strings.
- Return ONLY the JSON. No markdown, no preamble.
"""

# ── AI Invocation ─────────────────────────────────────────────────────────────

def generate_b2b_proposal(company: str, budget: float, requirements: str) -> dict[str, Any]:
    validate_budget(budget)

    client = get_anthropic()
    prompt = _build_proposal_prompt(company, budget, requirements)

    start = time.time()
    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        latency_ms = int((time.time() - start) * 1000)
        raw_text = response.content[0].text.strip()
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        parsed = _parse_and_validate_proposal(raw_text, budget)

        log_ai_call(
            module="b2b_proposal",
            prompt=prompt,
            raw_response=raw_text,
            parsed_output=parsed,
            tokens_used=tokens_used,
            latency_ms=latency_ms,
        )
        return parsed

    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        log_ai_call(
            module="b2b_proposal",
            prompt=prompt,
            raw_response="",
            status="error",
            error_message=str(e),
            latency_ms=latency_ms,
        )
        raise

# ── Validation ────────────────────────────────────────────────────────────────

def _parse_and_validate_proposal(raw_text: str, budget: float) -> dict:
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            raise ValueError(f"Could not parse proposal JSON: {raw_text[:200]}")

    # Hard budget guard — recalculate allocated from line items
    allocated = sum(item.get("line_total", 0) for item in data.get("product_mix", []))
    if allocated > budget * 1.02:  # 2% tolerance
        raise ValueError(f"AI exceeded budget: allocated ₹{allocated} vs budget ₹{budget}")

    # Recalculate cost_breakdown server-side (don't blindly trust AI math)
    subtotal = allocated
    gst = round(subtotal * 0.18, 2)
    shipping = 250 if subtotal < 5000 else 0
    data["cost_breakdown"] = {
        "products_subtotal": subtotal,
        "estimated_gst_18pct": gst,
        "estimated_shipping": shipping,
        "grand_total": round(subtotal + gst + shipping, 2),
    }
    data["budget_allocation"]["allocated"] = allocated
    data["budget_allocation"]["remaining"] = round(budget - allocated, 2)
    data["budget_allocation"]["utilization_pct"] = round(allocated / budget * 100, 1)

    return data
