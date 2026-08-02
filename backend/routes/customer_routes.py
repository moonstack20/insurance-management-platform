from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db
from models.customer import Customer
from routes.decorators import roles_required
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

customer_bp = Blueprint("customers", __name__)


@customer_bp.route("", methods=["POST"])
@roles_required("admin", "agent")
def create_customer():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    dob = None
    if data.get("dob"):
        try:
            dob = datetime.strptime(data["dob"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "dob must be in YYYY-MM-DD format"}), 400
    customer = Customer(
        name=name,
        dob=dob,
        phone=data.get("phone"),
        address=data.get("address"),
        email=data.get("email"),
        user_id=data.get("user_id"),
    )
    db.session.add(customer)
    db.session.commit()
    return jsonify({"customer": customer.to_dict()}), 201


@customer_bp.route("", methods=["GET"])
@jwt_required()
def list_customers():
    identity = get_jwt_identity()
    role = get_jwt().get("role")

    if role == "customer":
        customers = Customer.query.filter_by(user_id=int(identity)).all()
        return jsonify({"customers": [c.to_dict() for c in customers]}), 200

    search = request.args.get("search", "").strip()
    query = Customer.query
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(like))
            | (Customer.email.ilike(like))
            | (Customer.phone.ilike(like))
        )
    customers = query.order_by(Customer.name.asc()).all()
    return jsonify({"customers": [c.to_dict() for c in customers]}), 200


@customer_bp.route("/<int:customer_id>", methods=["GET"])
@jwt_required()
def get_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "customer not found"}), 404

    identity = get_jwt_identity()
    role = get_jwt().get("role")
    if role == "customer" and customer.user_id != int(identity):
        return jsonify({"error": "forbidden"}), 403

    return jsonify({"customer": customer.to_dict()}), 200


@customer_bp.route("/<int:customer_id>", methods=["PUT"])
@roles_required("admin", "agent")
def update_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "customer not found"}), 404
    data = request.get_json(silent=True) or {}
    if "name" in data:
        if not data["name"].strip():
            return jsonify({"error": "name cannot be empty"}), 400
        customer.name = data["name"].strip()
    if "dob" in data:
        if data["dob"]:
            try:
                customer.dob = datetime.strptime(data["dob"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "dob must be in YYYY-MM-DD format"}), 400
        else:
            customer.dob = None
    if "phone" in data:
        customer.phone = data["phone"]
    if "address" in data:
        customer.address = data["address"]
    if "email" in data:
        customer.email = data["email"]
    db.session.commit()
    return jsonify({"customer": customer.to_dict()}), 200


@customer_bp.route("/<int:customer_id>", methods=["DELETE"])
@roles_required("admin")
def delete_customer(customer_id):
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "customer not found"}), 404
    db.session.delete(customer)
    db.session.commit()
    return jsonify({"message": "customer deleted"}), 200
