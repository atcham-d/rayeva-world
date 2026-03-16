from flask import Blueprint, request, jsonify
from services.proposal_service import generate_b2b_proposal
from utils.supabase_client import get_supabase

proposal_bp = Blueprint("proposal", __name__)

@proposal_bp.route("/generate", methods=["POST"])
def generate_proposal():
    """
    POST /api/proposal/generate
    Body: { company_name, budget, requirements }
    Returns: Full B2B procurement proposal
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    company = data.get("company_name", "").strip()
    budget = data.get("budget")
    requirements = data.get("requirements", "").strip()

    errors = []
    if not company:
        errors.append("'company_name' is required")
    if budget is None:
        errors.append("'budget' is required")
    elif not isinstance(budget, (int, float)) or budget <= 0:
        errors.append("'budget' must be a positive number")
    if not requirements:
        errors.append("'requirements' is required — describe your use case")
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    try:
        ai_result = generate_b2b_proposal(company, float(budget), requirements)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": "Proposal generation failed", "details": str(e)}), 500

    # Persist to Supabase
    try:
        db = get_supabase()
        insert_data = {
            "company_name": company,
            "budget": float(budget),
            "requirements": requirements,
            "product_mix": ai_result.get("product_mix"),
            "budget_allocation": ai_result.get("budget_allocation"),
            "cost_breakdown": ai_result.get("cost_breakdown"),
            "impact_summary": ai_result.get("impact_summary"),
            "raw_ai_output": ai_result,
        }
        db_response = db.table("b2b_proposals").insert(insert_data).execute()
        proposal_id = db_response.data[0]["id"] if db_response.data else None
    except Exception as e:
        return jsonify({
            "warning": "AI succeeded but database save failed",
            "db_error": str(e),
            "result": ai_result,
        }), 207

    return jsonify({
        "proposal_id": proposal_id,
        "result": ai_result,
    }), 201


@proposal_bp.route("/list", methods=["GET"])
def list_proposals():
    """GET /api/proposal/list — fetch all generated proposals"""
    try:
        db = get_supabase()
        response = db.table("b2b_proposals").select("*").order("created_at", desc=True).limit(50).execute()
        return jsonify({"proposals": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
