"""
Module 1: AI Auto-Category & Tag Generator
- Assigns primary category from predefined list
- Suggests sub-category
- Generates 5–10 SEO tags
- Suggests sustainability filters
- Returns structured JSON and stores in Supabase
"""

import json
import time
from typing import Any
from utils.anthropic_client import get_anthropic
from utils.ai_logger import log_ai_call

# ── Business Logic: predefined taxonomy ──────────────────────────────────────

PRIMARY_CATEGORIES = [
    "Food & Beverage",
    "Personal Care & Beauty",
    "Home & Living",
    "Clothing & Apparel",
    "Office & Stationery",
    "Electronics & Accessories",
    "Health & Wellness",
    "Baby & Kids",
    "Outdoor & Garden",
    "Gifts & Lifestyle",
]

SUSTAINABILITY_FILTERS = [
    "plastic-free",
    "compostable",
    "vegan",
    "recycled",
    "zero-waste",
    "organic",
    "fair-trade",
    "biodegradable",
    "upcycled",
    "locally-sourced",
    "cruelty-free",
    "carbon-neutral",
    "refillable",
    "natural-ingredients",
]

# ── Prompt Engineering ────────────────────────────────────────────────────────

def _build_prompt(name: str, description: str, price: float) -> str:
    return f"""You are an AI catalog assistant for Rayeva, a B2B sustainable commerce platform.

Given the product below, return a structured JSON object with EXACTLY these fields:

Product Name: {name}
Description: {description}
Price: ₹{price}

Required JSON output:
{{
  "primary_category": "<one from the list below>",
  "sub_category": "<a specific sub-category>",
  "seo_tags": ["<5 to 10 relevant SEO tags>"],
  "sustainability_filters": ["<applicable filters from the list below>"],
  "reasoning": "<1-2 sentences explaining your choices>"
}}

Allowed primary categories:
{json.dumps(PRIMARY_CATEGORIES, indent=2)}

Allowed sustainability filters (pick only applicable ones):
{json.dumps(SUSTAINABILITY_FILTERS, indent=2)}

Rules:
- primary_category MUST be one of the allowed values above, verbatim.
- sustainability_filters MUST only contain values from the allowed list.
- seo_tags should be lowercase, hyphenated where needed, e.g. "eco-friendly-mug".
- Return ONLY the JSON object. No markdown, no explanation outside the JSON.
"""

# ── AI Invocation ─────────────────────────────────────────────────────────────

def generate_category_tags(name: str, description: str, price: float) -> dict[str, Any]:
    """
    Calls Claude to generate category, sub-category, SEO tags, and sustainability filters.
    Logs the prompt/response and returns the parsed structured output.
    """
    client = get_anthropic()
    prompt = _build_prompt(name, description, price)
    
    start = time.time()
    try:
        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        latency_ms = int((time.time() - start) * 1000)
        raw_text = response.content[0].text.strip()
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        # Parse and validate JSON
        parsed = _parse_and_validate(raw_text)

        log_ai_call(
            module="category_tagger",
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
            module="category_tagger",
            prompt=prompt,
            raw_response="",
            status="error",
            error_message=str(e),
            latency_ms=latency_ms,
        )
        raise

# ── Validation ────────────────────────────────────────────────────────────────

def _parse_and_validate(raw_text: str) -> dict:
    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        # Attempt to extract JSON block if model added surrounding text
        import re
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            raise ValueError(f"Could not parse JSON from AI response: {raw_text[:200]}")

    # Enforce category constraint
    if data.get("primary_category") not in PRIMARY_CATEGORIES:
        # Fuzzy fallback: pick closest allowed category
        data["primary_category"] = "Gifts & Lifestyle"

    # Sanitize sustainability filters
    data["sustainability_filters"] = [
        f for f in data.get("sustainability_filters", [])
        if f in SUSTAINABILITY_FILTERS
    ]

    # Ensure seo_tags is a list of 5–10
    tags = data.get("seo_tags", [])
    data["seo_tags"] = tags[:10] if len(tags) >= 5 else tags

    return data
