import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from routes.proposal_routes import proposal_bp

def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(proposal_bp, url_prefix="/api/proposal")

    @app.get("/")
    def health():
        return jsonify({
            "status": "ok",
            "module": "Module 2 — AI B2B Proposal Generator",
            "version": "1.0.0",
            "endpoints": [
                "POST /api/proposal/generate",
                "GET  /api/proposal/list",
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
    port = int(os.getenv("FLASK_PORT", 5002))
    app = create_app()
    app.run(debug=os.getenv("FLASK_ENV") == "development", port=port)
