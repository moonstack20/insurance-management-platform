from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from models import db
from extensions import bcrypt, jwt


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Blueprints get registered here as each module is built
    from routes.auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    from routes.customer_routes import customer_bp
    app.register_blueprint(customer_bp, url_prefix="/api/customers")
    from routes.policy_routes import policy_bp
    app.register_blueprint(policy_bp, url_prefix="/api/policies")
    from routes.payment_routes import payment_bp
    app.register_blueprint(payment_bp, url_prefix="/api/payments")
    from routes.claim_routes import claim_bp
    app.register_blueprint(claim_bp, url_prefix="/api/claims")
    from routes.document_routes import document_bp
    app.register_blueprint(document_bp, url_prefix="/api/documents")
    from routes.dashboard_routes import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    from routes.search_routes import search_bp
    app.register_blueprint(search_bp, url_prefix="/api/search")
    from routes.receipt_routes import receipt_bp
    app.register_blueprint(receipt_bp, url_prefix="/api/receipts")
    from routes.notification_routes import notification_bp
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")



    with app.app_context():
        db.create_all()  # no Flask-Migrate for this timeline - direct create

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
