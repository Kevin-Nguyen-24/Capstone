from flask import Flask, jsonify
from flask_cors import CORS

def create_app():
    app = Flask(__name__, template_folder="template", static_folder="static")

    # 🔐 Enable CORS for all domains (or restrict it if needed)
    CORS(app)  # OR: CORS(app, resources={r"/*": {"origins": "*"}})

    # Register blueprints
    from .routes.index_route import index_bp
    from .routes.label_route import label_bp
    from .routes.prescription_routes import prescription_bp

    app.register_blueprint(index_bp)
    app.register_blueprint(label_bp)
    app.register_blueprint(prescription_bp)

    # Error handlers ...
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "error": "Internal server error",
            "message": str(error)
        }), 500

    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({
            "error": "Not found",
            "message": str(error)
        }), 404

    return app
