import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.category_routes import category_bp

def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(category_bp, url_prefix="/api/category")

    @app.get("/")
    def health():
        return jsonify({
            "status": "ok",
            "module": "Module 1 — AI Auto-Category & Tag Generator",
            "version": "1.0.0",
            "endpoints": [
                "POST /api/category/categorize",
                "GET  /api/category/products",
            ]
        })

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    return app

if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5001))
    app = create_app()
    app.run(debug=os.getenv("FLASK_ENV") == "development", port=port)
