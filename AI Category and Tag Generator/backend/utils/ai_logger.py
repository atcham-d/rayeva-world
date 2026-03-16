import time
from typing import Any
from utils.supabase_client import get_supabase


def log_ai_call(
    module: str,
    prompt: str,
    raw_response: str,
    parsed_output: dict | None = None,
    tokens_used: int | None = None,
    latency_ms: int | None = None,
    status: str = "success",
    error_message: str | None = None,
) -> None:
    """
    Persists every AI prompt + response to the ai_logs table.
    Non-blocking: errors here should never crash the main flow.
    """
    try:
        db = get_supabase()
        db.table("ai_logs").insert({
            "module": module,
            "prompt": prompt,
            "raw_response": raw_response,
            "parsed_output": parsed_output,
            "tokens_used": tokens_used,
            "latency_ms": latency_ms,
            "status": status,
            "error_message": error_message,
        }).execute()
    except Exception as e:
        # Log to stdout so it's visible in server logs without crashing
        print(f"[ai_logger] WARNING: failed to persist log — {e}")
