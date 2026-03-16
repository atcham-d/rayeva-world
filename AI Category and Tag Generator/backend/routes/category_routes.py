from flask import Blueprint, request, jsonify
from services.category_service import generate_category_tags
from utils.supabase_client import get_supabase

category_bp = Blueprint("category", __name__)

@category_bp.route("/categorize", methods=["POST"])
def categorize_product():
    """
    POST /api/category/categorize
    Body: { name, description, price }
    Returns: AI-generated category, tags, and sustainability filters
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    price = data.get("price")

    # Validate inputs
    errors = []
    if not name:
        errors.append("'name' is required")
    if not description:
        errors.append("'description' is required")
    if price is None:
        errors.append("'price' is required")
    elif not isinstance(price, (int, float)) or price < 0:
        errors.append("'price' must be a non-negative number")
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    try:
        ai_result = generate_category_tags(name, description, float(price))
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": "AI generation failed", "details": str(e)}), 500

    # Persist to Supabase
    try:
        db = get_supabase()
        insert_data = {
            "name": name,
            "description": description,
            "price": float(price),
            "primary_category": ai_result["primary_category"],
            "sub_category": ai_result.get("sub_category"),
            "seo_tags": ai_result.get("seo_tags", []),
            "sustainability_filters": ai_result.get("sustainability_filters", []),
            "raw_ai_output": ai_result,
        }
        db_response = db.table("products").insert(insert_data).execute()
        product_id = db_response.data[0]["id"] if db_response.data else None
    except Exception as e:
        # DB failure shouldn't kill the response — return AI result with a warning
        return jsonify({
            "warning": "AI succeeded but database save failed",
            "db_error": str(e),
            "result": ai_result,
        }), 207

    return jsonify({
        "product_id": product_id,
        "result": ai_result,
    }), 201


@category_bp.route("/products", methods=["GET"])
def list_products():
    """GET /api/category/products — fetch all categorized products"""
    try:
        db = get_supabase()
        response = db.table("products").select("*").order("created_at", desc=True).limit(50).execute()
        return jsonify({"products": response.data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
